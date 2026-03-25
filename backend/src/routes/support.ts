import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

export const supportRouter = new Hono<{ Variables: HonoVariables }>();

async function sendPushToOwner(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const ownerId = process.env.OWNER_PUSH_USER_ID;
    if (!ownerId) return;
    const tokens = await prisma.pushToken.findMany({ where: { userId: ownerId } });
    await Promise.all(tokens.map(t =>
      fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: t.token, title, body, data: data ?? {} }),
      }).catch(() => null)
    ));
  } catch { /* fire and forget */ }
}

// POST /api/support/faq-feedback
supportRouter.post("/faq-feedback", zValidator("json", z.object({
  faqItemId: z.string(),
  helpful: z.boolean(),
})), async (c) => {
  const user = c.get("user");
  const { faqItemId, helpful } = c.req.valid("json");
  await prisma.faqFeedback.create({
    data: {
      userId: user?.id ?? null,
      faqItemId,
      helpful,
    },
  });
  return c.json({ data: { success: true } });
});

// POST /api/support/bug-report
supportRouter.post("/bug-report", zValidator("json", z.object({
  description: z.string().min(1),
  screen: z.string().optional(),
  steps: z.string().optional(),
  screenshotUrl: z.string().optional(),
  appVersion: z.string().optional(),
  deviceType: z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  const { description, screen, steps, screenshotUrl, appVersion, deviceType } = c.req.valid("json");

  const report = await prisma.bugReport.create({
    data: {
      userId: user.id,
      description,
      screen: screen ?? null,
      steps: steps ?? null,
      screenshotUrl: screenshotUrl ?? null,
      appVersion: appVersion ?? null,
      deviceType: deviceType ?? null,
    },
  });

  await sendPushToOwner(
    "Bug Report",
    `${user.name ?? user.email ?? "User"}: ${description.slice(0, 100)}`,
    { bugReportId: report.id }
  );

  return c.json({ data: { success: true, id: report.id } });
});

// GET /api/support/conversations — get or create conversation for current user
supportRouter.get("/conversations", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  let conv = await prisma.supportConversation.findFirst({
    where: { userId: user.id, escalated: false },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv) {
    conv = await prisma.supportConversation.create({
      data: { userId: user.id },
      include: { messages: true },
    });
  }

  return c.json({ data: conv });
});

// POST /api/support/conversations/:id/messages — send a message and get AI response
supportRouter.post("/conversations/:id/messages", zValidator("json", z.object({
  content: z.string().min(1),
})), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const convId = c.req.param("id");
  const { content } = c.req.valid("json");

  const conv = await prisma.supportConversation.findUnique({
    where: { id: convId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv || conv.userId !== user.id) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  // Save user message
  await prisma.supportMessage.create({
    data: { conversationId: convId, role: "user", content },
  });

  const userMessageCount = conv.messages.filter(m => m.role === "user").length + 1;

  // Check if should escalate (3 user exchanges without resolution)
  const shouldEscalate = userMessageCount >= 3 && !conv.escalated;

  const SYSTEM_PROMPT = `You are Jess's AI support assistant for Red String Research, a citizen investigation platform.

RED STRING RESEARCH — FULL FEATURE LIST:
- Mind map canvas for building investigations with nodes and connections
- Node types: Person, Place, Event, Document, Media, Hypothesis, Evidence, Note
- Red string connections between nodes with labels
- Canvas controls: zoom, pan, select, multi-select
- AI Canvas Control: voice and text commands to add/edit nodes via AI
- AI Research Assistant: ask questions about your investigation
- Automatic tagging and connection suggestions (AutomationEngine)
- Tip Inbox: receive anonymous tips from the public via a shareable link
- Public tip form at /tip/[username] with E2E encryption
- Collaboration: invite others as Viewer, Annotator, Contributor, or Co-Investigator
- War Room: live video collaboration via Daily.co
- Live Streaming to YouTube, Twitch, TikTok
- Chain of Custody tracking for evidence nodes
- Source attribution per node
- Export: PDF, Timeline, Presentation
- Sharing with watermarks
- Investigation permissions per role
- App Lock with PIN and biometrics
- Screenshot protection mode
- Push notifications for tips and collaboration events
- Dark corkboard aesthetic

PRICING TIERS:
- FREE: 3 investigations, 25 nodes each, basic features
- RESEARCHER ($9.99/mo or $79.99/yr): More investigations, 200 nodes, color tags, priority support
- INVESTIGATOR ($19.99/mo or $159.99/yr): Unlimited investigations, unlimited nodes, collaboration features, early access
- PROFESSIONAL ($49.99/mo or $399.99/yr): Everything, plus advanced AI, export, live streaming
- LIFETIME ($299.99 one-time): Permanent Professional access
- BETA FOUNDING MEMBER ($7.99/mo): Early adopter rate, locked forever, TestFlight only

COMMON TROUBLESHOOTING:
- If nodes won't save: check internet connection, try force-closing and reopening the app
- If collaboration not working: ensure both users are on Investigator tier or above
- If tips not received: check tip form URL at your username, ensure push notifications enabled
- If AI features slow: normal during high load, retry after 30 seconds
- If app lock won't open: use Face ID / Touch ID or enter PIN, contact support if locked out
- For billing issues: manage subscriptions in iOS Settings > Apple ID > Subscriptions

SECURITY MODEL:
- Tips are E2E encrypted with RSA public keys
- No raw IPs stored
- App lock prevents unauthorized access
- Screenshot protection mode available

Be helpful, concise, and friendly. If the issue seems complex or you've tried 3 times without resolution, acknowledge this.`;

  const groqApiKey = process.env.GROQ_API_KEY;
  let aiResponse = "";

  if (groqApiKey) {
    try {
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conv.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content },
      ];

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json() as { choices: { message: { content: string } }[] };
        aiResponse = data.choices[0]?.message?.content ?? "I'm having trouble right now. Please try again in a moment.";
      } else {
        aiResponse = "I'm having trouble connecting right now. Please try again in a moment, or report this as a bug.";
      }
    } catch {
      aiResponse = "I'm having trouble connecting right now. Please try again in a moment.";
    }
  } else {
    aiResponse = "AI support is not configured yet. Please use the bug report button to contact Jess directly.";
  }

  // Handle escalation after 3 exchanges
  let escalated = false;
  if (shouldEscalate) {
    const allMessages = [...conv.messages, { role: "user", content }, { role: "assistant", content: aiResponse }];
    const transcript = allMessages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");

    await prisma.supportConversation.update({
      where: { id: convId },
      data: { escalated: true, escalatedAt: new Date() },
    });

    await sendPushToOwner(
      "Support Escalation",
      `${user.name ?? user.email ?? "User"} needs help after 3 exchanges`,
      { conversationId: convId, transcript: transcript.slice(0, 500) }
    );

    aiResponse += "\n\nI've escalated this to Jess — you'll hear back within 24 hours.";
    escalated = true;
  }

  // Save AI message
  const assistantMessage = await prisma.supportMessage.create({
    data: { conversationId: convId, role: "assistant", content: aiResponse },
  });

  return c.json({ data: { message: assistantMessage, escalated } });
});
