import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const keysRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

// POST /api/keys/public - store or update user's RSA public key
keysRouter.post(
  "/public",
  zValidator("json", z.object({ publicKey: z.string().min(1) })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const { publicKey } = c.req.valid("json");

    const record = await prisma.userPublicKey.upsert({
      where: { userId: user.id },
      update: { publicKey },
      create: { userId: user.id, publicKey },
    });

    return c.json({ data: { userId: record.userId, publicKey: record.publicKey } }, 201);
  }
);

// GET /api/keys/public/:userId - get a user's public key
keysRouter.get("/public/:userId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const record = await prisma.userPublicKey.findUnique({
    where: { userId: c.req.param("userId") },
  });

  if (!record) return notFound(c);

  return c.json({ data: { userId: record.userId, publicKey: record.publicKey } });
});

export { keysRouter };
