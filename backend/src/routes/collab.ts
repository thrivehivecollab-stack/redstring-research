import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const collabRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

// POST /api/collab/sessions — create a new collab session
collabRouter.post(
  "/sessions",
  zValidator("json", z.object({
    investigationId: z.string(),
    title: z.string().min(1),
    description: z.string().optional(),
    originalSnapshot: z.string().optional().default("{}"),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const { investigationId, title, description, originalSnapshot } = c.req.valid("json");
    const session = await prisma.collabSession.create({
      data: { investigationId, ownerId: user.id, title, description, originalSnapshot },
    });
    // Add owner as co_investigator member
    await prisma.collabMember.create({
      data: { collabSessionId: session.id, userId: user.id, permission: "co_investigator", joinedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { collabSessionId: session.id, userId: user.id, action: "created" },
    });
    return c.json({ data: session }, 201);
  }
);

// GET /api/collab/sessions — list sessions I own or am member of
collabRouter.get("/sessions", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const memberships = await prisma.collabMember.findMany({
    where: { userId: user.id },
    include: { collabSession: true },
  });
  const sessions = memberships.map((m) => ({
    ...m.collabSession,
    myPermission: m.permission,
    isOwner: m.collabSession.ownerId === user.id,
  }));
  return c.json({ data: sessions });
});

// GET /api/collab/sessions/:id — session details + members
collabRouter.get("/sessions/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const session = await prisma.collabSession.findUnique({
    where: { id: c.req.param("id") },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true, username: true } } } },
    },
  });
  if (!session) return notFound(c);
  const membership = session.members.find((m) => m.userId === user.id);
  if (!membership) return forbidden(c);
  await prisma.auditLog.create({
    data: { collabSessionId: session.id, userId: user.id, action: "viewed" },
  });
  return c.json({ data: { ...session, myPermission: membership.permission, isOwner: session.ownerId === user.id } });
});

// DELETE /api/collab/sessions/:id — owner only
collabRouter.delete("/sessions/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
  if (!session) return notFound(c);
  if (session.ownerId !== user.id) return forbidden(c);
  await prisma.collabSession.delete({ where: { id: session.id } });
  return c.body(null, 204);
});

// POST /api/collab/sessions/:id/invite — send invite by email or generate link
collabRouter.post(
  "/sessions/:id/invite",
  zValidator("json", z.object({
    email: z.string().email().optional(),
    permission: z.enum(["viewer", "annotator", "contributor", "co_investigator"]).default("viewer"),
    message: z.string().optional(),
    expiresInHours: z.number().positive().optional(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
    if (!session) return notFound(c);
    if (session.ownerId !== user.id) return forbidden(c);
    const { email, permission, message, expiresInHours } = c.req.valid("json");
    let receiverId: string | undefined;
    if (email) {
      const receiver = await prisma.user.findUnique({ where: { email } });
      if (!receiver) return c.json({ error: { message: "User not found with that email", code: "USER_NOT_FOUND" } }, 404);
      receiverId = receiver.id;
    }
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600 * 1000) : undefined;
    const invite = await prisma.collabInvite.create({
      data: { collabSessionId: session.id, senderId: user.id, receiverId, permission, message, expiresAt },
    });
    await prisma.auditLog.create({
      data: { collabSessionId: session.id, userId: user.id, action: "invited", details: JSON.stringify({ inviteCode: invite.inviteCode, email }) },
    });
    return c.json({ data: invite }, 201);
  }
);

// GET /api/collab/invite/:code — get invite info
collabRouter.get("/invite/:code", async (c) => {
  const invite = await prisma.collabInvite.findUnique({
    where: { inviteCode: c.req.param("code") },
    include: { collabSession: { select: { id: true, title: true, description: true, ownerId: true } }, sender: { select: { id: true, name: true, image: true } } },
  });
  if (!invite) return notFound(c);
  if (invite.acceptedAt) return c.json({ error: { message: "Invite already accepted", code: "INVITE_USED" } }, 410);
  if (invite.expiresAt && invite.expiresAt < new Date()) return c.json({ error: { message: "Invite expired", code: "INVITE_EXPIRED" } }, 410);
  return c.json({ data: invite });
});

// POST /api/collab/invite/:code/accept — accept invite
collabRouter.post("/invite/:code/accept", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const invite = await prisma.collabInvite.findUnique({ where: { inviteCode: c.req.param("code") } });
  if (!invite) return notFound(c);
  if (invite.acceptedAt) return c.json({ error: { message: "Invite already accepted", code: "INVITE_USED" } }, 410);
  if (invite.expiresAt && invite.expiresAt < new Date()) return c.json({ error: { message: "Invite expired", code: "INVITE_EXPIRED" } }, 410);
  if (invite.receiverId && invite.receiverId !== user.id) return forbidden(c);
  // Upsert member
  const member = await prisma.collabMember.upsert({
    where: { collabSessionId_userId: { collabSessionId: invite.collabSessionId, userId: user.id } },
    update: { permission: invite.permission, joinedAt: new Date() },
    create: { collabSessionId: invite.collabSessionId, userId: user.id, permission: invite.permission, joinedAt: new Date() },
  });
  await prisma.collabInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await prisma.auditLog.create({
    data: { collabSessionId: invite.collabSessionId, userId: user.id, action: "joined" },
  });
  return c.json({ data: member });
});

// GET /api/collab/sessions/:id/pending — owner lists pending nodes
collabRouter.get("/sessions/:id/pending", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
  if (!session) return notFound(c);
  if (session.ownerId !== user.id) return forbidden(c);
  const pending = await prisma.pendingNode.findMany({
    where: { collabSessionId: session.id },
    orderBy: { createdAt: "asc" },
  });
  return c.json({ data: pending });
});

// POST /api/collab/sessions/:id/pending — contributor submits a node
collabRouter.post(
  "/sessions/:id/pending",
  zValidator("json", z.object({ nodeData: z.string() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
    if (!session) return notFound(c);
    const membership = await prisma.collabMember.findUnique({
      where: { collabSessionId_userId: { collabSessionId: session.id, userId: user.id } },
    });
    if (!membership || !["contributor", "co_investigator"].includes(membership.permission)) return forbidden(c);
    const { nodeData } = c.req.valid("json");
    const node = await prisma.pendingNode.create({
      data: { collabSessionId: session.id, contributorId: user.id, nodeData },
    });
    await prisma.auditLog.create({
      data: { collabSessionId: session.id, userId: user.id, action: "added_node", details: JSON.stringify({ pendingNodeId: node.id }) },
    });
    return c.json({ data: node }, 201);
  }
);

// POST /api/collab/sessions/:id/pending/:nodeId/approve
collabRouter.post("/sessions/:id/pending/:nodeId/approve",
  zValidator("json", z.object({ nodeId: z.string(), nodeTitle: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
    if (!session) return notFound(c);
    if (session.ownerId !== user.id) return forbidden(c);
    const pending = await prisma.pendingNode.findUnique({ where: { id: c.req.param("nodeId") } });
    if (!pending || pending.collabSessionId !== session.id) return notFound(c);
    const { nodeId, nodeTitle } = c.req.valid("json");
    await prisma.pendingNode.update({ where: { id: pending.id }, data: { status: "approved", reviewedAt: new Date() } });
    await prisma.nodeContribution.create({
      data: { collabSessionId: session.id, contributorId: pending.contributorId, nodeId, nodeTitle: nodeTitle ?? nodeId },
    });
    await prisma.auditLog.create({
      data: { collabSessionId: session.id, userId: user.id, action: "approved_node", details: JSON.stringify({ pendingNodeId: pending.id }) },
    });
    return c.json({ data: { approved: true } });
  }
);

// POST /api/collab/sessions/:id/pending/:nodeId/reject
collabRouter.post("/sessions/:id/pending/:nodeId/reject",
  zValidator("json", z.object({ reviewNote: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
    if (!session) return notFound(c);
    if (session.ownerId !== user.id) return forbidden(c);
    const pending = await prisma.pendingNode.findUnique({ where: { id: c.req.param("nodeId") } });
    if (!pending || pending.collabSessionId !== session.id) return notFound(c);
    const { reviewNote } = c.req.valid("json");
    const updated = await prisma.pendingNode.update({
      where: { id: pending.id },
      data: { status: "rejected", reviewedAt: new Date(), reviewNote },
    });
    await prisma.auditLog.create({
      data: { collabSessionId: session.id, userId: user.id, action: "rejected_node", details: JSON.stringify({ pendingNodeId: pending.id }) },
    });
    return c.json({ data: updated });
  }
);

// GET /api/collab/sessions/:id/contributions
collabRouter.get("/sessions/:id/contributions", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
  if (!session) return notFound(c);
  const membership = await prisma.collabMember.findUnique({
    where: { collabSessionId_userId: { collabSessionId: session.id, userId: user.id } },
  });
  if (!membership) return forbidden(c);
  const contributions = await prisma.nodeContribution.findMany({
    where: { collabSessionId: session.id },
    include: { contributor: { select: { id: true, name: true, image: true, username: true } } },
    orderBy: { contributedAt: "desc" },
  });
  return c.json({ data: contributions });
});

// GET /api/collab/sessions/:id/audit — owner only
collabRouter.get("/sessions/:id/audit", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
  if (!session) return notFound(c);
  if (session.ownerId !== user.id) return forbidden(c);
  const logs = await prisma.auditLog.findMany({
    where: { collabSessionId: session.id },
    include: { user: { select: { id: true, name: true, image: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: logs });
});

// POST /api/collab/sessions/:id/snapshot — owner updates investigation snapshot
collabRouter.post(
  "/sessions/:id/snapshot",
  zValidator("json", z.object({ snapshot: z.string() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const session = await prisma.collabSession.findUnique({ where: { id: c.req.param("id") } });
    if (!session) return notFound(c);
    if (session.ownerId !== user.id) return forbidden(c);
    const { snapshot } = c.req.valid("json");
    const updated = await prisma.collabSession.update({
      where: { id: session.id },
      data: { originalSnapshot: snapshot },
    });
    return c.json({ data: updated });
  }
);

export { collabRouter };
