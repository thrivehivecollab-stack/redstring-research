import { Hono } from "hono";
import { prisma } from "../prisma";
import { env } from "../env";
import type { HonoVariables } from "../types";

export const warRoomRouter = new Hono<{ Variables: HonoVariables }>();

/** Generate a random 8-char alphanumeric slug */
function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}
function dailyNotConfigured(c: any) {
  return c.json(
    {
      error: {
        message:
          "War Room requires Daily.co setup — contact your admin to configure DAILY_API_KEY",
        code: "DAILY_NOT_CONFIGURED",
      },
    },
    503
  );
}

// POST /api/warroom/rooms — create a new Daily.co room
warRoomRouter.post("/rooms", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  if (!env.DAILY_API_KEY) return dailyNotConfigured(c);

  const body = await c.req.json().catch(() => ({}));
  const title = (body.title as string) ?? "War Room";
  const sessionId = body.sessionId as string | undefined;

  const roomName = `rs-${generateSlug()}`;
  const exp = Math.floor(Date.now() / 1000) + 7200; // 2 hours

  // Create room on Daily.co
  const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        max_participants: 12,
        enable_screenshare: true,
        enable_chat: true,
        exp,
      },
    }),
  });

  if (!dailyRes.ok) {
    const errText = await dailyRes.text();
    console.error("[WarRoom] Daily.co create room failed:", errText);
    return c.json({ error: { message: "Failed to create Daily.co room", code: "DAILY_ERROR" } }, 502);
  }

  const dailyRoom = (await dailyRes.json()) as { name: string; url: string };

  const warRoom = await prisma.warRoom.create({
    data: {
      dailyRoomName: dailyRoom.name,
      dailyRoomUrl: dailyRoom.url,
      sessionId: sessionId ?? null,
      ownerId: user.id,
      title,
      status: "active",
    },
  });

  return c.json({
    data: {
      roomUrl: warRoom.dailyRoomUrl,
      roomName: warRoom.dailyRoomName,
      warRoomId: warRoom.id,
    },
  });
});

// GET /api/warroom/rooms/session/:sessionId — get active room for a collab session
warRoomRouter.get("/rooms/session/:sessionId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const sessionId = c.req.param("sessionId");
  const warRoom = await prisma.warRoom.findFirst({
    where: { sessionId, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  if (!warRoom) return c.json({ data: null });

  return c.json({
    data: {
      id: warRoom.id,
      dailyRoomName: warRoom.dailyRoomName,
      dailyRoomUrl: warRoom.dailyRoomUrl,
      sessionId: warRoom.sessionId,
      ownerId: warRoom.ownerId,
      title: warRoom.title,
      status: warRoom.status,
      createdAt: warRoom.createdAt,
      isOwner: warRoom.ownerId === user.id,
    },
  });
});

// GET /api/warroom/rooms/:id — get room details
warRoomRouter.get("/rooms/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const id = c.req.param("id");
  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);

  return c.json({
    data: {
      id: warRoom.id,
      dailyRoomName: warRoom.dailyRoomName,
      dailyRoomUrl: warRoom.dailyRoomUrl,
      sessionId: warRoom.sessionId,
      ownerId: warRoom.ownerId,
      title: warRoom.title,
      status: warRoom.status,
      createdAt: warRoom.createdAt,
      isOwner: warRoom.ownerId === user.id,
    },
  });
});

// POST /api/warroom/rooms/:id/token — get a meeting token for a participant
warRoomRouter.post("/rooms/:id/token", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);
  if (!env.DAILY_API_KEY) return dailyNotConfigured(c);

  const id = c.req.param("id");
  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);
  if (warRoom.status === "ended") {
    return c.json({ error: { message: "Room has ended", code: "ROOM_ENDED" } }, 410);
  }

  const userName = user.name ?? (user as any).username ?? "Investigator";
  const isOwner = warRoom.ownerId === user.id;

  const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: warRoom.dailyRoomName,
        user_name: userName,
        is_owner: isOwner,
        enable_screenshare: true,
      },
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[WarRoom] Daily.co token failed:", errText);
    return c.json({ error: { message: "Failed to generate meeting token", code: "DAILY_ERROR" } }, 502);
  }

  const tokenData = (await tokenRes.json()) as { token: string };
  return c.json({ data: { token: tokenData.token } });
});

// POST /api/warroom/rooms/:id/end — owner ends the room
warRoomRouter.post("/rooms/:id/end", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const id = c.req.param("id");
  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);
  if (warRoom.ownerId !== user.id) return forbidden(c);

  if (env.DAILY_API_KEY) {
    await fetch(`https://api.daily.co/v1/rooms/${warRoom.dailyRoomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.DAILY_API_KEY}` },
    }).catch((err) => console.error("[WarRoom] Daily.co delete room failed:", err));
  }

  await prisma.warRoom.update({ where: { id }, data: { status: "ended" } });

  return c.json({ data: { success: true } });
});

// POST /api/warroom/rooms/:id/data-request — request a node from the owner
warRoomRouter.post("/rooms/:id/data-request", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const id = c.req.param("id");
  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);

  const body = await c.req.json().catch(() => ({}));
  const { nodeId, nodeTitle, nodeSnapshot } = body as {
    nodeId?: string;
    nodeTitle?: string;
    nodeSnapshot?: string;
  };

  if (!nodeId || !nodeTitle) {
    return c.json({ error: { message: "nodeId and nodeTitle are required", code: "INVALID_INPUT" } }, 400);
  }

  const dataRequest = await prisma.dataRequest.create({
    data: {
      warRoomId: id,
      requesterId: user.id,
      nodeId,
      nodeTitle,
      nodeSnapshot: nodeSnapshot ?? "{}",
      status: "pending",
    },
  });

  return c.json({
    data: {
      id: dataRequest.id,
      warRoomId: dataRequest.warRoomId,
      requesterId: dataRequest.requesterId,
      nodeId: dataRequest.nodeId,
      nodeTitle: dataRequest.nodeTitle,
      status: dataRequest.status,
      createdAt: dataRequest.createdAt,
    },
  });
});

// GET /api/warroom/rooms/:id/data-requests — list all data requests for this room
warRoomRouter.get("/rooms/:id/data-requests", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const id = c.req.param("id");
  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);

  const requests = await prisma.dataRequest.findMany({
    where: { warRoomId: id },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: requests });
});

// POST /api/warroom/rooms/:id/data-request/:reqId/approve — owner approves a request
warRoomRouter.post("/rooms/:id/data-request/:reqId/approve", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const id = c.req.param("id");
  const reqId = c.req.param("reqId");

  const warRoom = await prisma.warRoom.findUnique({ where: { id } });
  if (!warRoom) return notFound(c);
  if (warRoom.ownerId !== user.id) return forbidden(c);

  const req = await prisma.dataRequest.findUnique({ where: { id: reqId } });
  if (!req) return notFound(c);

  const updated = await prisma.dataRequest.update({
    where: { id: reqId },
    data: { status: "approved" },
  });

  return c.json({
    data: {
      id: updated.id,
      status: updated.status,
      nodeSnapshot: updated.nodeSnapshot,
      requesterId: updated.requesterId,
    },
  });
});
