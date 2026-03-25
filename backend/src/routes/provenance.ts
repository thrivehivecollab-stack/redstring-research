import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const provenanceRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

// GET /api/provenance/node/:nodeId — get full provenance data for a node
provenanceRouter.get("/node/:nodeId", async (c) => {
  const nodeId = c.req.param("nodeId");

  const [contributions, auditLogs, sources, shareLogs] = await Promise.all([
    // NodeContribution rows for this nodeId, joining contributor User
    prisma.nodeContribution.findMany({
      where: { nodeId },
      include: {
        contributor: { select: { id: true, name: true } },
      },
      orderBy: { contributedAt: "desc" },
    }),

    // AuditLog rows whose details JSON string contains the nodeId
    prisma.auditLog.findMany({
      where: {
        details: { contains: nodeId },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // NodeSource rows for this nodeId
    prisma.nodeSource.findMany({
      where: { nodeId },
      orderBy: { addedAt: "desc" },
    }),

    // ShareLog rows where itemId = nodeId
    prisma.shareLog.findMany({
      where: { itemId: nodeId },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  return c.json({
    data: {
      nodeId,
      contributions: contributions.map((contrib) => ({
        id: contrib.id,
        contributorId: contrib.contributorId,
        contributorName: contrib.contributor.name,
        nodeTitle: contrib.nodeTitle,
        contributedAt: contrib.contributedAt.toISOString(),
        collabSessionId: contrib.collabSessionId,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        userName: log.user.name,
        details: log.details ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
      sources: sources.map((src) => ({
        id: src.id,
        sourceType: src.sourceType,
        sourceName: src.sourceName,
        sourceUrl: src.sourceUrl ?? null,
        secondarySourceName: src.secondarySourceName ?? null,
        secondarySourceUrl: src.secondarySourceUrl ?? null,
        credibility: src.credibility,
        verifiedBy: src.verifiedBy ?? null,
        verifiedAt: src.verifiedAt ? src.verifiedAt.toISOString() : null,
        addedAt: src.addedAt.toISOString(),
      })),
      shareLogs: shareLogs.map((sl) => ({
        id: sl.id,
        userId: sl.userId,
        userName: sl.userName,
        destination: sl.destination,
        itemType: sl.itemType,
        timestamp: sl.timestamp.toISOString(),
      })),
    },
  });
});

// POST /api/provenance/node/:nodeId/verify-source — mark a source as verified (auth required)
provenanceRouter.post(
  "/node/:nodeId/verify-source",
  zValidator(
    "json",
    z.object({
      sourceId: z.string().min(1),
      investigationId: z.string().min(1),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const { sourceId } = c.req.valid("json");

    const source = await prisma.nodeSource.findUnique({ where: { id: sourceId } });
    if (!source) return notFound(c);

    const updated = await prisma.nodeSource.update({
      where: { id: sourceId },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.id,
      },
    });

    return c.json({ data: updated });
  }
);

export { provenanceRouter };
