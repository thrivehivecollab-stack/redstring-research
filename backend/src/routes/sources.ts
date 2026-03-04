import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const sourcesRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

const createSourceSchema = z.object({
  investigationId: z.string().min(1),
  nodeId: z.string().min(1),
  sourceType: z.enum(["url", "x_user", "tiktok_user", "instagram_user", "person", "document", "tip", "other"]),
  sourceName: z.string().min(1),
  sourceHandle: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceProfileUrl: z.string().url().optional(),
  platform: z.enum(["x", "tiktok", "instagram", "youtube", "facebook", "website", "podcast", "other"]).optional(),
  contentType: z.enum(["article", "video", "testimony", "tip", "hypothesis", "evidence", "document"]).optional(),
  contentSummary: z.string().optional(),
  secondarySourceName: z.string().optional(),
  secondarySourceUrl: z.string().url().optional(),
  credibility: z.enum(["primary", "secondary", "unverified", "disputed", "confirmed"]).default("unverified"),
});

const updateSourceSchema = z.object({
  sourceName: z.string().min(1).optional(),
  sourceHandle: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceProfileUrl: z.string().url().optional(),
  platform: z.enum(["x", "tiktok", "instagram", "youtube", "facebook", "website", "podcast", "other"]).optional(),
  contentType: z.enum(["article", "video", "testimony", "tip", "hypothesis", "evidence", "document"]).optional(),
  contentSummary: z.string().optional(),
  secondarySourceName: z.string().optional(),
  secondarySourceUrl: z.string().url().optional(),
  credibility: z.enum(["primary", "secondary", "unverified", "disputed", "confirmed"]).optional(),
});

// POST /api/sources — Add a source to a node
sourcesRouter.post(
  "/",
  zValidator("json", createSourceSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const data = c.req.valid("json");

    const source = await prisma.nodeSource.create({
      data: {
        investigationId: data.investigationId,
        nodeId: data.nodeId,
        ownerId: user.id,
        sourceType: data.sourceType,
        sourceName: data.sourceName,
        sourceHandle: data.sourceHandle,
        sourceUrl: data.sourceUrl,
        sourceProfileUrl: data.sourceProfileUrl,
        platform: data.platform,
        contentType: data.contentType,
        contentSummary: data.contentSummary,
        secondarySourceName: data.secondarySourceName,
        secondarySourceUrl: data.secondarySourceUrl,
        credibility: data.credibility,
      },
    });

    return c.json({ data: source }, 201);
  }
);

// GET /api/sources/investigation/:invId — Get ALL sources for an investigation
sourcesRouter.get("/investigation/:invId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const sources = await prisma.nodeSource.findMany({
    where: {
      investigationId: c.req.param("invId"),
      ownerId: user.id,
    },
    orderBy: { addedAt: "desc" },
  });

  return c.json({ data: sources });
});

// GET /api/sources/investigation/:invId/stats — Stats for an investigation
sourcesRouter.get("/investigation/:invId/stats", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const sources = await prisma.nodeSource.findMany({
    where: {
      investigationId: c.req.param("invId"),
      ownerId: user.id,
    },
  });

  const totalSources = sources.length;

  // Unique nodes that have at least one source
  const nodeSet = new Set(sources.map((s) => s.nodeId));
  const totalNodes = nodeSet.size;

  // Unique contributors by sourceName
  const contributorSet = new Set(sources.map((s) => s.sourceName));
  const totalContributors = contributorSet.size;

  // Group by platform
  const platformMap = new Map<string, number>();
  for (const s of sources) {
    const p = s.platform ?? "other";
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
  }
  const byPlatform = Array.from(platformMap.entries()).map(([platform, count]) => ({ platform, count }));

  // Group by credibility
  const credMap = new Map<string, number>();
  for (const s of sources) {
    credMap.set(s.credibility, (credMap.get(s.credibility) ?? 0) + 1);
  }
  const byCredibility = Array.from(credMap.entries()).map(([credibility, count]) => ({ credibility, count }));

  // Top contributors
  const contributorData = new Map<string, { sourceName: string; sourceHandle: string | null; count: number; platform: string | null }>();
  for (const s of sources) {
    const key = s.sourceName;
    if (!contributorData.has(key)) {
      contributorData.set(key, { sourceName: s.sourceName, sourceHandle: s.sourceHandle, count: 0, platform: s.platform });
    }
    contributorData.get(key)!.count += 1;
  }
  const topContributors = Array.from(contributorData.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => ({
      sourceName: c.sourceName,
      sourceHandle: c.sourceHandle ?? "",
      count: c.count,
      platform: c.platform ?? "other",
    }));

  // Research effort score
  const verifiedCount = sources.filter((s) => s.credibility === "confirmed" || s.credibility === "primary").length;
  const rawScore = totalSources * 2 + totalContributors * 5 + verifiedCount * 10;
  const score = Math.min(100, rawScore);

  let label: string;
  if (score < 15) label = "Early Research";
  else if (score < 35) label = "Growing";
  else if (score < 55) label = "Solid";
  else if (score < 80) label = "Thorough";
  else label = "Exhaustive";

  return c.json({
    data: {
      totalSources,
      totalNodes,
      totalContributors,
      byPlatform,
      byCredibility,
      topContributors,
      researchEffort: { score, label },
    },
  });
});

// GET /api/sources/node/:nodeId — Get sources for a specific node
sourcesRouter.get("/node/:nodeId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const sources = await prisma.nodeSource.findMany({
    where: {
      nodeId: c.req.param("nodeId"),
      ownerId: user.id,
    },
    orderBy: { addedAt: "desc" },
  });

  return c.json({ data: sources });
});

// PATCH /api/sources/:id — Update source
sourcesRouter.patch(
  "/:id",
  zValidator("json", updateSourceSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const source = await prisma.nodeSource.findUnique({ where: { id: c.req.param("id") } });
    if (!source) return notFound(c);
    if (source.ownerId !== user.id) return forbidden(c);

    const data = c.req.valid("json");

    const updated = await prisma.nodeSource.update({
      where: { id: source.id },
      data,
    });

    return c.json({ data: updated });
  }
);

// DELETE /api/sources/:id — Remove a source
sourcesRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const source = await prisma.nodeSource.findUnique({ where: { id: c.req.param("id") } });
  if (!source) return notFound(c);
  if (source.ownerId !== user.id) return forbidden(c);

  await prisma.nodeSource.delete({ where: { id: source.id } });

  return c.body(null, 204);
});

// POST /api/sources/:id/verify — Mark a source as verified
sourcesRouter.post("/:id/verify", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const source = await prisma.nodeSource.findUnique({ where: { id: c.req.param("id") } });
  if (!source) return notFound(c);
  if (source.ownerId !== user.id) return forbidden(c);

  const updated = await prisma.nodeSource.update({
    where: { id: source.id },
    data: {
      credibility: "confirmed",
      verifiedAt: new Date(),
      verifiedBy: user.id,
    },
  });

  return c.json({ data: updated });
});

export { sourcesRouter };
