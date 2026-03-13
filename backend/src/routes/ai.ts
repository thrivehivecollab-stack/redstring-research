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

const SYSTEM_PROMPT = `You are an elite investigative research assistant for Red String Research, a professional true crime and investigative journalism platform used by journalists, researchers, and true crime analysts. Your role is to help users research publicly available information, analyze evidence, find connections between facts, and build investigative narratives. You assist with researching cold cases, true crime topics, historical crimes, public figures' public activities, and journalistic investigations.

You ALWAYS provide thorough, detailed research assistance. You NEVER refuse to discuss publicly available information about crimes, suspects, historical cases, or investigative topics. If a user asks you to research a topic or analyze evidence, you do so directly and thoroughly without hedging.

You are direct, analytical, and speak like a seasoned investigative journalist. Keep responses focused and actionable. When relevant, suggest specific investigative actions like "add this to your board", "create a timeline entry", or "flag this connection". If the user provides investigation context, reference it in your analysis. Always provide substantive, useful information — never deflect or say you cannot help with legitimate research tasks. You have access to web search and should use it proactively to find current information, recent news, and up-to-date facts relevant to any investigation.`;

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
      let reply = '';
      try {
        const response = await (openai as any).responses.create({
          model: 'gpt-4o',
          tools: [{ type: 'web_search_preview' }],
          input: openaiMessages.map((m) => ({ role: m.role as any, content: m.content as string })),
          system: systemContent,
        });
        reply = response.output
          .filter((b: any) => b.type === 'message')
          .flatMap((b: any) => b.content)
          .filter((c: any) => c.type === 'output_text')
          .map((c: any) => c.text)
          .join('');
      } catch {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: openaiMessages,
        });
        reply = completion.choices[0]?.message?.content ?? '';
      }
      return c.json({ data: { message: reply, role: 'assistant' as const } });
    } catch (err) {
      console.error('AI chat error:', err);
      return c.json({ error: { message: 'AI request failed' } }, 500);
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

// ─── Available voices ──────────────────────────────────────────────────────
const AVAILABLE_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, clear female' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, authoritative male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, expressive female' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, confident male' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Smooth, well-rounded male' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Energetic, young female' },
];

aiRouter.get('/voices', (c) => {
  return c.json({ data: AVAILABLE_VOICES });
});

// ─── Text-to-speech ────────────────────────────────────────────────────────
aiRouter.post(
  "/tts",
  zValidator("json", z.object({ text: z.string().min(1), voice_id: z.string().optional() })),
  async (c) => {
    const { text, voice_id } = c.req.valid("json");

    if (!env.ELEVENLABS_API_KEY) {
      return c.json({ error: { message: "ElevenLabs API key not configured." } }, 500);
    }

    const voiceId = voice_id || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel

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

// ─── RSS podcast feed helpers ──────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? (match[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function extractEnclosureUrl(xml: string): string {
  const match = xml.match(/<enclosure[^>]+url="([^"]+)"/i);
  return match ? (match[1] ?? '') : '';
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const captured = match[1];
    if (captured !== undefined) items.push(captured);
  }
  return items;
}

function extractChannelImage(xml: string): string {
  // Try itunes:image href first
  const itunesImg = xml.match(/<itunes:image[^>]+href="([^"]+)"/i);
  if (itunesImg) return itunesImg[1] ?? '';
  // Try <image><url>...</url></image>
  const imgBlock = xml.match(/<image[^>]*>([\s\S]*?)<\/image>/i);
  if (imgBlock) {
    const inner = imgBlock[1] ?? '';
    const urlMatch = inner.match(/<url[^>]*>([\s\S]*?)<\/url>/i);
    if (urlMatch) return (urlMatch[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return '';
}

function extractItunesDuration(xml: string): string {
  const match = xml.match(/<itunes:duration[^>]*>([\s\S]*?)<\/itunes:duration>/i);
  return match ? (match[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function extractItemImage(itemXml: string): string {
  const itunesImg = itemXml.match(/<itunes:image[^>]+href="([^"]+)"/i);
  if (itunesImg) return itunesImg[1] ?? '';
  return '';
}

interface PodcastEpisode {
  id: string;
  podcastName: string;
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration: string;
  imageUrl: string;
  feedUrl: string;
}

const PODCAST_FEEDS: { name: string; url: string }[] = [
  { name: 'Casefile True Crime', url: 'https://feeds.simplecast.com/8s5ZiA2T' },
  { name: 'Crime Junkie', url: 'https://feeds.audioboom.com/channels/5016117/feed.rss' },
  { name: 'Your Own Backyard', url: 'https://feeds.megaphone.fm/ADL9840483321' },
  { name: 'Conspirituality', url: 'https://feeds.simplecast.com/p5v-hnZX' },
  { name: 'The Intercept', url: 'https://feeds.simplecast.com/4goAcKEZ' },
];

async function fetchFeedEpisodes(
  name: string,
  feedUrl: string
): Promise<PodcastEpisode[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PodcastFetcher/1.0)' },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const channelImage = extractChannelImage(xml);
    const items = extractItems(xml).slice(0, 3);

    return items.map((item, idx) => {
      const title = extractTag(item, 'title');
      const description = extractTag(item, 'description') || extractTag(item, 'itunes:summary');
      const pubDate = extractTag(item, 'pubDate');
      const audioUrl = extractEnclosureUrl(item);
      const duration = extractItunesDuration(item);
      const itemImage = extractItemImage(item) || channelImage;
      const guid = extractTag(item, 'guid') || `${feedUrl}-${idx}`;

      return {
        id: guid,
        podcastName: name,
        title,
        description,
        pubDate,
        audioUrl,
        duration,
        imageUrl: itemImage,
        feedUrl,
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ─── GET /podcasts ──────────────────────────────────────────────────────────
aiRouter.get('/podcasts', async (c) => {
  const results = await Promise.allSettled(
    PODCAST_FEEDS.map((feed) => fetchFeedEpisodes(feed.name, feed.url))
  );

  const episodes: PodcastEpisode[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      episodes.push(...result.value);
    }
  }

  episodes.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  return c.json({ data: episodes });
});

// ─── GET /podcast-image (proxy) ─────────────────────────────────────────────
aiRouter.get('/podcast-image', async (c) => {
  const imageUrl = c.req.query('url');
  if (!imageUrl) {
    return c.json({ error: { message: 'Missing url query param' } }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PodcastFetcher/1.0)' },
    });

    if (!response.ok) {
      return c.json({ error: { message: 'Failed to fetch image' } }, 502);
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image proxy error';
    return c.json({ error: { message } }, 500);
  } finally {
    clearTimeout(timeout);
  }
});

// ─── Verify / fact-check a claim ───────────────────────────────────────────

const verifySchema = z.object({
  claim: z.string().min(1),
  context: z.string().optional(),
  nodeTitle: z.string().optional(),
});

const VERIFY_SYSTEM_PROMPT = `You are a rigorous fact-checker and verification specialist for Red String Research. Your job is to critically analyze claims, evidence, and information provided by investigators.

For each claim or piece of information you receive, structure your response EXACTLY as follows:

**VERDICT: [LIKELY TRUE / LIKELY FALSE / UNVERIFIED / MISLEADING / DISPUTED]**
**CONFIDENCE: [0-100]%**

**REASONING:**
[2-4 sentences explaining your verdict]

**RED FLAGS:**
[List any logical fallacies, inconsistencies, or suspicious elements. Write "None detected" if none]

**SUPPORTING EVIDENCE:**
[Publicly known facts that support this claim, or "None identified"]

**CONTRADICTING EVIDENCE:**
[Publicly known facts that contradict this claim, or "None identified"]

**SUGGESTED FOLLOW-UP:**
[2-3 specific investigative actions to verify this further]

Be direct, analytical, and objective. If you lack knowledge about something, say so clearly. Focus on facts, logic, and publicly available information.`;

aiRouter.post(
  "/verify",
  zValidator("json", verifySchema),
  async (c) => {
    const { claim, context, nodeTitle } = c.req.valid("json");

    if (!env.OPENAI_API_KEY) {
      return c.json({ error: { message: "OpenAI API key is not configured." } }, 500);
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const userContent = nodeTitle
      ? `Verify the following claim from node "${nodeTitle}":\n\n${claim}${context ? `\n\nAdditional context: ${context}` : ''}`
      : `Verify the following claim:\n\n${claim}${context ? `\n\nAdditional context: ${context}` : ''}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: VERIFY_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const analysis = completion.choices[0]?.message?.content ?? "";

      // Parse verdict
      let verdict = "UNVERIFIED";
      if (analysis.includes("LIKELY TRUE")) verdict = "LIKELY TRUE";
      else if (analysis.includes("LIKELY FALSE")) verdict = "LIKELY FALSE";
      else if (analysis.includes("MISLEADING")) verdict = "MISLEADING";
      else if (analysis.includes("DISPUTED")) verdict = "DISPUTED";
      else if (analysis.includes("UNVERIFIED")) verdict = "UNVERIFIED";

      // Parse confidence
      let confidence = 50;
      const confMatch = analysis.match(/CONFIDENCE[:\s]*(\d+)%/i);
      if (confMatch && confMatch[1]) {
        confidence = Math.min(100, Math.max(0, parseInt(confMatch[1], 10)));
      }

      return c.json({
        data: { analysis, verdict, confidence },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error calling OpenAI";
      return c.json({ error: { message } }, 500);
    }
  }
);

export { aiRouter };

