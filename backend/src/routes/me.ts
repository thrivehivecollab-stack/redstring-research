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

// DELETE /api/me/account — Hard-delete all user data
meRouter.delete(
  "/account",
  zValidator("json", z.object({ confirmText: z.string() })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { confirmText } = c.req.valid("json");
    if (confirmText !== "DELETE") {
      return c.json({ error: { message: "Type DELETE to confirm" } }, 400);
    }

    const userId = user.id;

    // Step 1: delete TipMessages for tips where user is tipper or recipient
    const userTips = await prisma.tip.findMany({
      where: { OR: [{ tipperUserId: userId }, { recipientId: userId }] },
      select: { id: true },
    });
    const tipIds = userTips.map((t) => t.id);

    await prisma.$transaction(async (tx) => {
      // 1. TipMessage
      if (tipIds.length > 0) {
        await tx.tipMessage.deleteMany({ where: { tipId: { in: tipIds } } });
      }

      // 2. Tip
      await tx.tip.deleteMany({
        where: { OR: [{ tipperUserId: userId }, { recipientId: userId }] },
      });

      // 3. DataRequest
      await tx.dataRequest.deleteMany({ where: { requesterId: userId } });

      // 4. AuditLog
      await tx.auditLog.deleteMany({ where: { userId } });

      // 5. NodeContribution
      await tx.nodeContribution.deleteMany({ where: { contributorId: userId } });

      // 6. CollabMember
      await tx.collabMember.deleteMany({ where: { userId } });

      // 7. CollabInvite
      await tx.collabInvite.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });

      // 8. CollabSession (owned by user) — cascades PendingNode, NodeContribution,
      //    CollabMember, CollabInvite, AuditLog remaining for those sessions
      await tx.collabSession.deleteMany({ where: { ownerId: userId } });

      // 9. NodeSource
      await tx.nodeSource.deleteMany({ where: { ownerId: userId } });

      // 10. ShareLog
      await tx.shareLog.deleteMany({ where: { userId } });

      // 11. OwnerNotification
      await tx.ownerNotification.deleteMany({
        where: { OR: [{ ownerId: userId }, { triggeredByUserId: userId }] },
      });

      // 12. InvestigationPermissions (cascades UserPermissionOverride)
      await tx.investigationPermissions.deleteMany({ where: { ownerId: userId } });

      // 13. PushToken
      await tx.pushToken.deleteMany({ where: { userId } });

      // 14. UserPublicKey
      await tx.userPublicKey.deleteMany({ where: { userId } });

      // 15. Session (Better Auth — cascade handled)
      await tx.session.deleteMany({ where: { userId } });

      // 16. Account (Better Auth — cascade handled)
      await tx.account.deleteMany({ where: { userId } });

      // 17. User
      await tx.user.delete({ where: { id: userId } });
    });

    return c.json({ data: { message: "Account permanently deleted" } });
  }
);

export { meRouter };
