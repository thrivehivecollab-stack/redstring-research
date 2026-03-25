import { Hono } from "hono";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const auditLogsRouter = new Hono<{ Variables: HonoVariables }>();

// GET /api/audit-logs/investigation/:investigationId
// Returns all audit logs for a given investigationId (via CollabSession)
auditLogsRouter.get("/investigation/:investigationId", async (c) => {
  const investigationId = c.req.param("investigationId");

  const logs = await prisma.auditLog.findMany({
    where: {
      collabSession: { investigationId },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = logs.map((log) => ({
    id: log.id,
    action: log.action,
    details: log.details,
    createdAt: log.createdAt,
    userId: log.userId,
    userName: log.user.name,
    collabSessionId: log.collabSessionId,
  }));

  return c.json({ data });
});

// GET /api/audit-logs/investigation/:investigationId/members
// Returns distinct users who appear in audit logs for this investigation
auditLogsRouter.get("/investigation/:investigationId/members", async (c) => {
  const investigationId = c.req.param("investigationId");

  const logs = await prisma.auditLog.findMany({
    where: {
      collabSession: { investigationId },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    distinct: ["userId"],
  });

  const data = logs.map((log) => ({
    userId: log.userId,
    userName: log.user.name,
  }));

  return c.json({ data });
});

export default auditLogsRouter;
