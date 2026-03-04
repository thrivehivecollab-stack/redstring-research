import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const tipsRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

const submitTipSchema = z.object({
  investigationId: z.string().optional(),
  tipperName: z.string().optional(),
  tipperEmail: z.string().email().optional(),
  tipperHandle: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  attachmentUrls: z.array(z.string().url()).optional(),
  relatedNodeIds: z.array(z.string()).optional(),
});

const updateTipSchema = z.object({
  status: z.enum(["unread", "read", "investigating", "verified", "dismissed", "merged"]).optional(),
  investigatorNotes: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  senderName: z.string().optional(),
});

// POST /api/tips/submit/:recipientId — Public (no auth): submit a tip to an investigator
tipsRouter.post(
  "/submit/:recipientId",
  zValidator("json", submitTipSchema),
  async (c) => {
    const recipientId = c.req.param("recipientId");

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) return notFound(c);

    const data = c.req.valid("json");

    // If caller is authenticated, record their user ID
    const authUser = c.get("user");

    const tip = await prisma.tip.create({
      data: {
        investigationId: data.investigationId,
        recipientId,
        tipperUserId: authUser?.id ?? undefined,
        tipperName: data.isAnonymous ? null : (data.tipperName ?? null),
        tipperEmail: data.isAnonymous ? null : (data.tipperEmail ?? null),
        tipperHandle: data.isAnonymous ? null : (data.tipperHandle ?? null),
        isAnonymous: data.isAnonymous,
        subject: data.subject,
        content: data.content,
        attachmentUrls: data.attachmentUrls ? JSON.stringify(data.attachmentUrls) : null,
        relatedNodeIds: data.relatedNodeIds ? JSON.stringify(data.relatedNodeIds) : null,
        aiVettingStatus: "pending",
        status: "unread",
      },
    });

    return c.json({ data: tip }, 201);
  }
);

// GET /api/tips — Investigator: get their tip inbox
tipsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const statusFilter = c.req.query("status");

  const tips = await prisma.tip.findMany({
    where: {
      recipientId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tipper: { select: { id: true, name: true, image: true, username: true } },
      _count: { select: { messages: true } },
    },
  });

  return c.json({ data: tips });
});

// GET /api/tips/profile/:userId — Public: investigator's tip submission page info
tipsRouter.get("/profile/:userId", async (c) => {
  const userId = c.req.param("userId");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, username: true },
  });

  if (!user) return notFound(c);

  // Count tips received to show activity
  const tipCount = await prisma.tip.count({ where: { recipientId: userId } });

  return c.json({
    data: {
      investigator: user,
      tipCount,
    },
  });
});

// GET /api/tips/:id — Get tip detail with messages
tipsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const tip = await prisma.tip.findUnique({
    where: { id: c.req.param("id") },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      tipper: { select: { id: true, name: true, image: true, username: true } },
    },
  });

  if (!tip) return notFound(c);
  if (tip.recipientId !== user.id) return forbidden(c);

  // Mark as read if currently unread
  if (tip.status === "unread") {
    await prisma.tip.update({ where: { id: tip.id }, data: { status: "read" } });
    tip.status = "read";
  }

  return c.json({ data: tip });
});

// PATCH /api/tips/:id — Update tip status/notes
tipsRouter.patch(
  "/:id",
  zValidator("json", updateTipSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const tip = await prisma.tip.findUnique({ where: { id: c.req.param("id") } });
    if (!tip) return notFound(c);
    if (tip.recipientId !== user.id) return forbidden(c);

    const data = c.req.valid("json");

    const updated = await prisma.tip.update({
      where: { id: tip.id },
      data,
    });

    return c.json({ data: updated });
  }
);

// POST /api/tips/:id/vet — Trigger AI vetting of a tip
tipsRouter.post("/:id/vet", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const tip = await prisma.tip.findUnique({ where: { id: c.req.param("id") } });
  if (!tip) return notFound(c);
  if (tip.recipientId !== user.id) return forbidden(c);

  // Mark as processing
  await prisma.tip.update({ where: { id: tip.id }, data: { aiVettingStatus: "processing" } });

  try {
    const investigationTitle = tip.investigationId
      ? `Investigation ID: ${tip.investigationId}`
      : "General tip (no specific investigation)";

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: `You are an expert investigative journalist and fact-checker. Analyze this tip submitted to an investigator and provide a structured assessment.

TIP SUBJECT: ${tip.subject}
TIP CONTENT: ${tip.content}
INVESTIGATION CONTEXT: ${investigationTitle}

Respond with ONLY a valid JSON object:
{
  "credibilityScore": <0-100 integer>,
  "summary": "<2-3 sentence overall assessment>",
  "keyFindings": ["<claim 1>", "<claim 2>", "<claim 3>"],
  "redFlags": ["<concern 1>", "<concern 2>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "suggestedTags": ["<tag1>", "<tag2>"],
  "recommendedActions": ["<action 1>", "<action 2>"],
  "suggestedQuestions": ["<question to ask tipper 1>", "<question 2>"]
}`,
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.text();
      console.error("OpenAI API error:", errorBody);
      await prisma.tip.update({ where: { id: tip.id }, data: { aiVettingStatus: "failed" } });
      return c.json({ error: { message: "AI vetting failed", code: "AI_ERROR" } }, 502);
    }

    const result = (await openAiResponse.json()) as {
      output: Array<{ content: Array<{ text: string }> }>;
    };

    const rawText = result?.output?.[0]?.content?.[0]?.text ?? "";

    // Parse JSON from AI response — strip potential markdown fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await prisma.tip.update({ where: { id: tip.id }, data: { aiVettingStatus: "failed" } });
      return c.json({ error: { message: "AI returned invalid response", code: "AI_PARSE_ERROR" } }, 502);
    }

    const aiData = JSON.parse(jsonMatch[0]) as {
      credibilityScore: number;
      summary: string;
      keyFindings: string[];
      redFlags: string[];
      strengths: string[];
      suggestedTags: string[];
      recommendedActions: string[];
      suggestedQuestions: string[];
    };

    const updated = await prisma.tip.update({
      where: { id: tip.id },
      data: {
        aiVettingStatus: "complete",
        aiVettingSummary: aiData.summary,
        aiKeyFindings: JSON.stringify(aiData.keyFindings ?? []),
        aiCredibilityScore: aiData.credibilityScore,
        aiSuggestedTags: JSON.stringify(aiData.suggestedTags ?? []),
        aiRelatedNodes: null, // not inferred here without graph context
      },
    });

    return c.json({
      data: {
        tip: updated,
        analysis: {
          credibilityScore: aiData.credibilityScore,
          summary: aiData.summary,
          keyFindings: aiData.keyFindings,
          redFlags: aiData.redFlags,
          strengths: aiData.strengths,
          suggestedTags: aiData.suggestedTags,
          recommendedActions: aiData.recommendedActions,
          suggestedQuestions: aiData.suggestedQuestions,
        },
      },
    });
  } catch (err) {
    console.error("AI vetting error:", err);
    await prisma.tip.update({ where: { id: tip.id }, data: { aiVettingStatus: "failed" } });
    return c.json({ error: { message: "AI vetting failed", code: "AI_ERROR" } }, 502);
  }
});

// POST /api/tips/:id/messages — Send a message in the tip thread
tipsRouter.post(
  "/:id/messages",
  zValidator("json", sendMessageSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const tip = await prisma.tip.findUnique({ where: { id: c.req.param("id") } });
    if (!tip) return notFound(c);
    if (tip.recipientId !== user.id) return forbidden(c);

    const { content, senderName } = c.req.valid("json");

    const message = await prisma.tipMessage.create({
      data: {
        tipId: tip.id,
        senderId: user.id,
        senderName: senderName ?? user.name,
        isFromInvestigator: true,
        content,
      },
    });

    return c.json({ data: message }, 201);
  }
);

// GET /api/tips/:id/messages — Get message thread
tipsRouter.get("/:id/messages", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const tip = await prisma.tip.findUnique({ where: { id: c.req.param("id") } });
  if (!tip) return notFound(c);
  if (tip.recipientId !== user.id) return forbidden(c);

  const messages = await prisma.tipMessage.findMany({
    where: { tipId: tip.id },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ data: messages });
});

// POST /api/tips/:id/merge — Convert tip to a canvas node
tipsRouter.post("/:id/merge", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const tip = await prisma.tip.findUnique({ where: { id: c.req.param("id") } });
  if (!tip) return notFound(c);
  if (tip.recipientId !== user.id) return forbidden(c);

  // Parse AI suggested tags if available
  let parsedAiTags: string[] = [];
  if (tip.aiSuggestedTags) {
    try {
      parsedAiTags = JSON.parse(tip.aiSuggestedTags) as string[];
    } catch {
      parsedAiTags = [];
    }
  }

  const tags = parsedAiTags.map((label) => ({
    id: createId(),
    label,
    color: "amber",
  }));

  const nodeId = createId();

  // Update tip as merged
  await prisma.tip.update({
    where: { id: tip.id },
    data: { status: "merged", mergedToNodeId: nodeId },
  });

  const suggestedNode = {
    id: nodeId,
    type: "note",
    title: tip.subject,
    content: tip.content,
    tags,
    source: {
      sourceType: "tip",
      sourceName: tip.tipperName ?? "Anonymous",
      sourceHandle: tip.tipperHandle ?? null,
      contentType: "tip",
      contentSummary: `Tip submitted ${tip.createdAt.toISOString()}`,
    },
  };

  return c.json({ data: { suggestedNode } });
});

export { tipsRouter };
