import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";
import { checkRateLimit, getClientIp } from '../lib/rateLimit';

interface BroadcastMeta {
  id: string;
  investigationId: string;
  hostId: string;
  hostName: string;
  title: string;
  description: string;
  startedAt: number;
  viewerCount: number;
  lastSnapshot: string | null;
  lastThumb: string | null;
}

interface BroadcastRoom {
  meta: BroadcastMeta;
  hostSocket: WebSocket | null;
  viewers: Map<string, WebSocket>;
}

const rooms = new Map<string, BroadcastRoom>();

function generateBroadcastId(): string {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

function broadcastToViewers(room: BroadcastRoom, message: object) {
  const payload = JSON.stringify(message);
  for (const [, ws] of room.viewers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function sendToHost(room: BroadcastRoom, message: object) {
  if (room.hostSocket?.readyState === WebSocket.OPEN) {
    room.hostSocket.send(JSON.stringify(message));
  }
}

const broadcastRouter = new Hono<{ Variables: HonoVariables }>();

broadcastRouter.get("/live", (c) => {
  const list: BroadcastMeta[] = [];
  for (const [, room] of rooms) {
    if (room.hostSocket?.readyState === WebSocket.OPEN) {
      list.push({ ...room.meta, viewerCount: room.viewers.size });
    }
  }
  return c.json({ data: list });
});

broadcastRouter.get("/:id", (c) => {
  const ip = getClientIp(c.req.raw);
  if (!checkRateLimit(`broadcast-lookup:${ip}`, 30, 60_000)) {
    return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
  }

  const room = rooms.get(c.req.param("id"));
  if (!room || room.hostSocket?.readyState !== WebSocket.OPEN) {
    return c.json({ error: { message: "Broadcast not found or ended" } }, 404);
  }
  return c.json({ data: { ...room.meta, viewerCount: room.viewers.size } });
});

broadcastRouter.post(
  "/start",
  zValidator("json", z.object({
    investigationId: z.string(),
    title: z.string().min(1).max(100),
    description: z.string().max(300).optional().default(""),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
    const { investigationId, title, description } = c.req.valid("json");
    const broadcastId = generateBroadcastId();
    const meta: BroadcastMeta = {
      id: broadcastId,
      investigationId,
      hostId: user.id,
      hostName: user.name,
      title,
      description,
      startedAt: Date.now(),
      viewerCount: 0,
      lastSnapshot: null,
      lastThumb: null,
    };
    rooms.set(broadcastId, { meta, hostSocket: null, viewers: new Map() });
    return c.json({ data: { broadcastId } }, 201);
  }
);

broadcastRouter.post("/:id/end", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  const room = rooms.get(c.req.param("id"));
  if (!room) return c.json({ error: { message: "Not found" } }, 404);
  if (room.meta.hostId !== user.id) return c.json({ error: { message: "Forbidden" } }, 403);
  broadcastToViewers(room, { type: "stream_ended" });
  for (const [, ws] of room.viewers) {
    ws.close(1000, "Broadcast ended");
  }
  rooms.delete(c.req.param("id"));
  return c.json({ data: { ended: true } });
});

broadcastRouter.get("/:id/host-ws", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  const room = rooms.get(c.req.param("id"));
  if (!room) return c.json({ error: { message: "Broadcast not found" } }, 404);
  if (room.meta.hostId !== user.id) return c.json({ error: { message: "Forbidden" } }, 403);
  const { response, socket } = (Bun as any).upgradeWebSocket(c.req.raw);
  socket.onopen = () => {
    room.hostSocket = socket;
    socket.send(JSON.stringify({ type: "host_connected", broadcastId: room.meta.id, viewerCount: room.viewers.size }));
  };
  socket.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string);
      switch (msg.type) {
        case "snapshot": {
          room.meta.lastSnapshot = msg.snapshot;
          room.meta.lastThumb = msg.thumb ?? null;
          broadcastToViewers(room, { type: "snapshot", snapshot: msg.snapshot, thumb: msg.thumb, ts: Date.now() });
          break;
        }
        case "host_message": {
          broadcastToViewers(room, { type: "host_message", text: msg.text, hostName: room.meta.hostName, ts: Date.now() });
          break;
        }
        case "ping": {
          socket.send(JSON.stringify({ type: "pong", viewerCount: room.viewers.size }));
          break;
        }
      }
    } catch { }
  };
  socket.onclose = () => {
    room.hostSocket = null;
    broadcastToViewers(room, { type: "stream_ended" });
    rooms.delete(room.meta.id);
  };
  return response;
});

broadcastRouter.get("/:id/view-ws", async (c) => {
  const ip = getClientIp(c.req.raw);
  if (!checkRateLimit(`broadcast-view:${ip}`, 10, 60_000)) {
    return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
  }

  const room = rooms.get(c.req.param("id"));
  if (!room || room.hostSocket?.readyState !== WebSocket.OPEN) {
    return c.json({ error: { message: "Broadcast not available" } }, 404);
  }
  const viewerId = Math.random().toString(36).slice(2);
  const { response, socket } = (Bun as any).upgradeWebSocket(c.req.raw);
  socket.onopen = () => {
    room.viewers.set(viewerId, socket);
    socket.send(JSON.stringify({ type: "joined", broadcastId: room.meta.id, meta: { ...room.meta, viewerCount: room.viewers.size }, snapshot: room.meta.lastSnapshot, thumb: room.meta.lastThumb }));
    sendToHost(room, { type: "viewer_joined", viewerCount: room.viewers.size });
  };
  socket.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "reaction") {
        broadcastToViewers(room, { type: "reaction", emoji: msg.emoji, ts: Date.now() });
        sendToHost(room, { type: "reaction", emoji: msg.emoji });
      }
    } catch { }
  };
  socket.onclose = () => {
    room.viewers.delete(viewerId);
    sendToHost(room, { type: "viewer_left", viewerCount: room.viewers.size });
  };
  return response;
});

export { broadcastRouter };
