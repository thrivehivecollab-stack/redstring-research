import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const ownerNotificationsRouter = new Hono<{ Variables: HonoVariables }>();

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

// POST /api/owner-notifications - log a notification event
ownerNotificationsRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      investigationId: z.string().min(1),
      ownerId: z.string().min(1),
      triggeredByUserId: z.string().optional(),
      triggeredByUserName: z.string().optional(),
      eventType: z.enum([
        "viewed",
        "downloaded",
        "exported",
        "shared",
        "screenshot",
        "tip_submitted",
        "joined",
        "left",
        "presentation_viewed",
        "timeline_viewed",
      ]),
      details: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const body = c.req.valid("json");

    const notification = await prisma.ownerNotification.create({
      data: {
        investigationId: body.investigationId,
        ownerId: body.ownerId,
        triggeredByUserId: body.triggeredByUserId,
        triggeredByUserName: body.triggeredByUserName,
        eventType: body.eventType,
        details: body.details,
      },
    });

    // Fire-and-forget push notification to owner
    void (async () => {
      const pushTokens = await prisma.pushToken.findMany({
        where: { userId: body.ownerId },
      });

      const displayName = body.triggeredByUserName ?? user.name;
      for (const pt of pushTokens) {
        await sendExpoNotification(
          pt.token,
          "Red String Alert",
          `${displayName} ${body.eventType.replace(/_/g, " ")} in "${body.investigationId}"`,
          { investigationId: body.investigationId, eventType: body.eventType }
        );
      }
    })();

    return c.json({ data: notification }, 201);
  }
);

// GET /api/owner-notifications/:investigationId - get notifications for investigation
ownerNotificationsRouter.get("/:investigationId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const investigationId = c.req.param("investigationId");

  const permissions = await prisma.investigationPermissions.findUnique({
    where: { investigationId },
  });

  if (!permissions) return notFound(c);
  if (permissions.ownerId !== user.id) return forbidden(c);

  const notifications = await prisma.ownerNotification.findMany({
    where: { investigationId },
    orderBy: { timestamp: "desc" },
  });

  return c.json({ data: notifications });
});

export { ownerNotificationsRouter };
