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

export { aiRouter };
