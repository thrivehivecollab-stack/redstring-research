import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

export const featureRequestsRouter = new Hono<{ Variables: HonoVariables }>();

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

// GET /api/feature-requests
featureRequestsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const requests = await prisma.featureRequest.findMany({
    orderBy: [
      { pinned: "desc" },
      { voteCount: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      votes: { where: { userId: user.id }, select: { id: true } },
    },
  });

  const data = requests.map(r => ({
    ...r,
    hasVoted: r.votes.length > 0,
    votes: undefined,
  }));

  return c.json({ data });
});

// POST /api/feature-requests
featureRequestsRouter.post("/", zValidator("json", z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  tier: z.enum(["free", "researcher", "investigator", "professional"]).optional(),
})), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { title, description, tier } = c.req.valid("json");

  const request = await prisma.featureRequest.create({
    data: {
      userId: user.id,
      username: user.name ?? user.email ?? "Anonymous",
      title,
      description: description ?? null,
      tier: tier ?? null,
    },
  });

  await sendPushToOwner(
    "Feature Request",
    `${user.name ?? user.email ?? "User"}: ${title}`,
    { featureRequestId: request.id }
  );

  return c.json({ data: request }, 201);
});

// POST /api/feature-requests/:id/vote — toggle vote
featureRequestsRouter.post("/:id/vote", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const id = c.req.param("id");
  const existing = await prisma.featureVote.findUnique({
    where: { featureRequestId_userId: { featureRequestId: id, userId: user.id } },
  });

  if (existing) {
    // Remove vote
    await prisma.featureVote.delete({ where: { id: existing.id } });
    await prisma.featureRequest.update({
      where: { id },
      data: { voteCount: { decrement: 1 } },
    });
    return c.json({ data: { voted: false } });
  } else {
    // Add vote
    await prisma.featureVote.create({
      data: { featureRequestId: id, userId: user.id },
    });
    await prisma.featureRequest.update({
      where: { id },
      data: { voteCount: { increment: 1 } },
    });
    return c.json({ data: { voted: true } });
  }
});

// PATCH /api/feature-requests/:id — owner only (status, pin, comment)
featureRequestsRouter.patch("/:id", zValidator("json", z.object({
  status: z.enum(["submitted", "under_review", "planned", "in_progress", "shipped"]).optional(),
  pinned: z.boolean().optional(),
  ownerComment: z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  // Owner check — only the OWNER_PUSH_USER_ID can update
  const ownerId = process.env.OWNER_PUSH_USER_ID;
  if (user.id !== ownerId) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const id = c.req.param("id");
  const { status, pinned, ownerComment } = c.req.valid("json");

  const updated = await prisma.featureRequest.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(pinned !== undefined && { pinned }),
      ...(ownerComment !== undefined && { ownerComment }),
    },
  });

  // If shipped, notify all voters
  if (status === "shipped") {
    const votes = await prisma.featureVote.findMany({ where: { featureRequestId: id } });
    const voterIds = [...new Set(votes.map(v => v.userId))];
    await Promise.all(voterIds.map(async (voterId) => {
      const tokens = await prisma.pushToken.findMany({ where: { userId: voterId } });
      await Promise.all(tokens.map(t =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: t.token,
            title: "A feature you requested just launched!",
            body: updated.title,
            data: { featureRequestId: id },
          }),
        }).catch(() => null)
      ));
    }));
  }

  return c.json({ data: updated });
});
