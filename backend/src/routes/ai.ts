import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import OpenAI from "openai";
import { env } from "../env";
import type { HonoVariables } from "../types";

const aiRouter = new Hono<{ Variables: HonoVariables }>();

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  investigationContext: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an elite investigative research assistant for Red String Research, a professional investigation platform. You help investigators analyze evidence, find connections, research topics, and build narratives. You are direct, analytical, and speak like a seasoned investigator. Keep responses focused and actionable. When relevant, suggest specific investigative actions like "add this to your board", "create a timeline entry", or "flag this connection". If the user provides investigation context, reference it in your analysis.`;

aiRouter.post(
  "/chat",
  zValidator("json", chatSchema),
  async (c) => {
    const { messages, investigationContext } = c.req.valid("json");

    if (!env.OPENAI_API_KEY) {
      return c.json(
        { error: { message: "OpenAI API key is not configured." } },
        500
      );
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const systemContent = investigationContext
      ? `${SYSTEM_PROMPT}\n\nCurrent investigation context:\n${investigationContext}`
      : SYSTEM_PROMPT;

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...messages.map(
        (m): OpenAI.Chat.ChatCompletionMessageParam => ({
          role: m.role,
          content: m.content,
        })
      ),
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openaiMessages,
      });

      const reply = completion.choices[0]?.message?.content ?? "";

      return c.json({
        data: {
          message: reply,
          role: "assistant" as const,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error calling OpenAI";
      return c.json({ error: { message } }, 500);
    }
  }
);

// ─── Transcribe audio ──────────────────────────────────────────────────────
aiRouter.post("/transcribe", async (c) => {
  if (!env.OPENAI_API_KEY) {
    return c.json({ error: { message: "OpenAI API key not configured." } }, 500);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: { message: "No audio file provided." } }, 400);
  }

  const apiForm = new FormData();
  apiForm.append("file", file);
  apiForm.append("model", "gpt-4o-mini-transcribe");
  apiForm.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: apiForm,
  });

  if (!response.ok) {
    const err = await response.text();
    return c.json({ error: { message: err } }, 500);
  }

  const result = (await response.json()) as { text: string };
  return c.json({ data: { text: result.text } });
});

// ─── Text-to-speech ────────────────────────────────────────────────────────
aiRouter.post(
  "/tts",
  zValidator("json", z.object({ text: z.string().min(1) })),
  async (c) => {
    const { text } = c.req.valid("json");

    if (!env.ELEVENLABS_API_KEY) {
      return c.json({ error: { message: "ElevenLabs API key not configured." } }, 500);
    }

    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: { message: err } }, 500);
    }

    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  }
);

export { aiRouter };
