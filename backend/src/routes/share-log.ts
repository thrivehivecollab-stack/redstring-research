import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const shareLogRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

async function sendExpoNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, data }),
    });
  } catch {
    // fire-and-forget — ignore errors
  }
}

// POST /api/share-log - log a share event
shareLogRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      investigationId: z.string().min(1),
      itemType: z.enum(["node", "string", "chat", "dossier", "timeline", "presentation"]),
      itemId: z.string().optional(),
      destination: z.enum(["native_share", "google_drive", "icloud", "email"]),
      watermarkId: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const { investigationId, itemType, itemId, destination, watermarkId } = c.req.valid("json");

    const log = await prisma.shareLog.create({
      data: {
        investigationId,
        userId: user.id,
        userName: user.name,
        itemType,
        itemId,
        destination,
        watermarkId,
      },
    });

    // Fire-and-forget push notification to owner
    void (async () => {
      const permissions = await prisma.investigationPermissions.findUnique({
        where: { investigationId },
      });
      if (!permissions || permissions.ownerId === user.id) return;

      const pushTokens = await prisma.pushToken.findMany({
        where: { userId: permissions.ownerId },
      });

      for (const pt of pushTokens) {
        await sendExpoNotification(
          pt.token,
          "Red String Alert",
          `${user.name} shared a ${itemType} from "${investigationId}"`,
          { investigationId, eventType: "shared" }
        );
      }
    })();

    return c.json({ data: { id: log.id, watermarkId: log.watermarkId } }, 201);
  }
);

// GET /api/share-log/:investigationId - list share events for owner
shareLogRouter.get("/:investigationId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const investigationId = c.req.param("investigationId");

  const permissions = await prisma.investigationPermissions.findUnique({
    where: { investigationId },
  });

  if (!permissions) return notFound(c);
  if (permissions.ownerId !== user.id) return forbidden(c);

  const logs = await prisma.shareLog.findMany({
    where: { investigationId },
    orderBy: { timestamp: "desc" },
  });

  return c.json({ data: logs });
});

export { shareLogRouter };
