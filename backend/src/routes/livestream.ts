import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "../env";
import type { HonoVariables } from "../types";

const livestreamRouter = new Hono<{ Variables: HonoVariables }>();

function getMuxAuth(): string {
  const tokenId = env.MUX_TOKEN_ID ?? "";
  const tokenSecret = env.MUX_TOKEN_SECRET ?? "";
  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`;
}

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}

function muxUnavailable(c: any) {
  return c.json(
    { error: { message: "Mux credentials not configured", code: "MUX_NOT_CONFIGURED" } },
    503
  );
}

// POST /api/livestream/create — Create a Mux live stream
livestreamRouter.post(
  "/create",
  zValidator("json", z.object({ title: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) return muxUnavailable(c);

    const response = await fetch("https://api.mux.com/video/v1/live-streams", {
      method: "POST",
      headers: {
        Authorization: getMuxAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playback_policy: ["public"],
        new_asset_settings: { playback_policy: ["public"] },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mux create stream error:", errorText);
      return c.json(
        { error: { message: "Failed to create live stream", code: "MUX_ERROR" } },
        502
      );
    }

    const result = (await response.json()) as {
      data: {
        id: string;
        stream_key: string;
        playback_ids?: Array<{ id: string }>;
      };
    };

    const streamData = result.data;
    const playbackId = streamData.playback_ids?.[0]?.id ?? null;

    return c.json({
      data: {
        streamId: streamData.id,
        streamKey: streamData.stream_key,
        rtmpUrl: "rtmps://global-live.mux.com:443/app",
        playbackId,
      },
    });
  }
);

// GET /api/livestream/:id/status — Poll Mux for stream status and viewer count
livestreamRouter.get("/:id/status", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) return muxUnavailable(c);

  const streamId = c.req.param("id");

  const response = await fetch(`https://api.mux.com/video/v1/live-streams/${streamId}`, {
    method: "GET",
    headers: {
      Authorization: getMuxAuth(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mux get stream error:", errorText);
    return c.json(
      { error: { message: "Failed to get stream status", code: "MUX_ERROR" } },
      502
    );
  }

  const result = (await response.json()) as {
    data: {
      status: string;
      viewer_count?: number;
    };
  };

  return c.json({
    data: {
      status: result.data.status,
      viewerCount: result.data.viewer_count ?? 0,
    },
  });
});

// POST /api/livestream/:id/end — End a Mux live stream
livestreamRouter.post("/:id/end", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) return muxUnavailable(c);

  const streamId = c.req.param("id");

  const response = await fetch(`https://api.mux.com/video/v1/live-streams/${streamId}`, {
    method: "DELETE",
    headers: {
      Authorization: getMuxAuth(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mux delete stream error:", errorText);
    return c.json(
      { error: { message: "Failed to end live stream", code: "MUX_ERROR" } },
      502
    );
  }

  return c.json({ data: { success: true } });
});

export { livestreamRouter };
