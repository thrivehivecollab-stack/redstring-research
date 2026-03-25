import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const meRouter = new Hono<{ Variables: HonoVariables }>();

// Auth guard helper
function requireAuth(c: { get: (k: "user") => HonoVariables["user"] | undefined }) {
  const user = c.get("user");
  if (!user) return null;
  return user;
}

// GET /api/me — current user profile
meRouter.get("/", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }
  return c.json({ data: user });
});

// POST /api/me/profile — update name and username
meRouter.post(
  "/profile",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }
    const { name, username } = c.req.valid("json");

    // Check username uniqueness if provided
    if (username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== user.id) {
        return c.json({ error: { message: "Username already taken", code: "USERNAME_TAKEN" } }, 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(username !== undefined ? { username } : {}),
      },
    });

    return c.json({ data: updated });
  }
);

// POST /api/me/push-token — Save or update a push notification token
meRouter.post(
  "/push-token",
  zValidator("json", z.object({ token: z.string().min(1), platform: z.string().min(1) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { token, platform } = c.req.valid("json");

    await prisma.pushToken.upsert({
      where: { token },
      create: { userId: user.id, token, platform },
      update: { userId: user.id, platform },
    });

    return c.json({ data: { success: true } });
  }
);

// DELETE /api/me/push-token — Remove a push notification token
meRouter.delete(
  "/push-token",
  zValidator("json", z.object({ token: z.string().min(1) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { token } = c.req.valid("json");

    await prisma.pushToken.deleteMany({
      where: { token, userId: user.id },
    });

    return c.json({ data: { success: true } });
  }
);

export { meRouter };
