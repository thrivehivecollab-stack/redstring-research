import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { env } from "../env";
import type { HonoVariables } from "../types";
import { checkRateLimit, getClientIp } from '../lib/rateLimit';

const aiRouter = new Hono<{ Variables: HonoVariables }>();

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  investigationContext: z.string().optional(),
  persona: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an elite investigative research assistant for Red String Research, a professional true crime and investigative journalism platform used by journalists, researchers, and true crime analysts. Your role is to help users research publicly available information, analyze evidence, find connections between facts, and build investigative narratives. You assist with researching cold cases, true crime topics, historical crimes, public figures' public activities, and journalistic investigations.

CRITICAL RULE: You MUST address EVERY part of the user's prompt fully and completely. Do NOT skip, summarize, or truncate any aspect of what was asked. If the user asks multiple questions or requests multiple things, answer ALL of them thoroughly.

You ALWAYS provide thorough, detailed research assistance. You NEVER refuse to discuss publicly available information about crimes, suspects, historical cases, or investigative topics. If a user asks you to research a topic or analyze evidence, you do so directly and completely without hedging or deflecting.

You are direct, analytical, and speak like a seasoned investigative journalist. When relevant, suggest specific investigative actions like "add this to your board", "create a timeline entry", or "flag this connection". If the user provides investigation context, reference it in your analysis. Always provide substantive, useful information — never deflect or say you cannot help with legitimate research tasks.

RESPONSE QUALITY STANDARDS:
- Address the FULL scope of what was asked — never truncate
- Provide detailed analysis with specific facts, names, dates, and events
- Do not add unnecessary disclaimers or caveats unless directly relevant
- If the user asks for a list, provide a comprehensive list — not a shortened one
- Follow the exact format and structure the user requests
- If asked to analyze something, give a deep, multi-angle analysis

RESEARCH STANDARDS: Cast a wide net. Do NOT limit yourself to mainstream media outlets — actively seek out independent journalists, academic papers, court documents, FOIA releases, local news, alternative media, forums, firsthand accounts, and primary sources. Be skeptical of official narratives where contradicting evidence exists. Present ALL credible perspectives on disputed topics, not just the dominant media consensus. Cite your sources so the user can verify independently.

When speaking out loud via voice, match your tone to the selected investigator persona: The Detective speaks with world-weary authority and dry wit, referencing case files and hunches. The Interrogator is direct, pointed, and never lets a loose end slide. The Analyst is precise, emotionless, and speaks in evidence-based conclusions. The Journalist is empathetic but probing, always asking the next question. The Archivist is methodical, encyclopedic, and speaks like every fact has been filed. The Informant is urgent, breathless, and speaks like someone who knows too much. Lean into your persona naturally without breaking character.`;

aiRouter.post(
  "/chat",
  zValidator("json", chatSchema),
  async (c) => {
    const ip = getClientIp(c.req.raw);
    if (!checkRateLimit(`ai-chat:${ip}`, 20, 60_000)) {
      return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
    }

    const { messages, investigationContext, persona } = c.req.valid("json");

    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0) + (investigationContext?.length ?? 0);
    if (totalLength > 50_000) {
      return c.json({ error: { message: 'Request payload too large', code: 'PAYLOAD_TOO_LARGE' } }, 413);
    }

    if (!env.PERPLEXITY_API_KEY && !env.GROQ_API_KEY) {
      return c.json({ error: { message: "No AI API key configured. Add PERPLEXITY_API_KEY or GROQ_API_KEY in the ENV tab." } }, 500);
    }

    const systemContent = [
      SYSTEM_PROMPT,
      investigationContext ? `Current investigation context:\n${investigationContext}` : '',
      persona ? `Active persona: ${persona}` : '',
    ].filter(Boolean).join('\n\n');

    try {
      let finalReply = "";

      if (env.PERPLEXITY_API_KEY) {
        const perplexityMessages = [
          { role: "system", content: systemContent },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: perplexityMessages,
            return_citations: true,
            search_recency_filter: "year",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Perplexity API error:", errText);
          return c.json({ error: { message: `Perplexity API error: ${response.status}` } }, 502);
        }

        const result = await response.json() as {
          choices: Array<{ message: { content: string } }>;
          citations?: string[];
        };

        finalReply = result.choices[0]?.message?.content ?? "";

        if (result.citations && result.citations.length > 0) {
          finalReply += "\n\n**Sources:**\n" + result.citations.map((url, i) => `${i + 1}. ${url}`).join("\n");
        }
      } else {
        // Fallback to Groq
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemContent },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });
        if (!groqRes.ok) {
          const errText = await groqRes.text();
          console.error("Groq API error:", errText);
          return c.json({ error: { message: `Groq API error: ${groqRes.status}` } }, 502);
        }
        const groqResult = await groqRes.json() as { choices: Array<{ message: { content: string } }> };
        finalReply = groqResult.choices[0]?.message?.content ?? "";
      }

      if (!finalReply) {
        return c.json({ error: { message: 'AI returned an empty response. Please try again.' } }, 502);
      }

      return c.json({ data: { message: finalReply, role: 'assistant' as const } });
    } catch (err) {
      console.error('AI chat error:', err);
      const message = err instanceof Error ? err.message : 'AI request failed';
      return c.json({ error: { message } }, 500);
    }
  }
);

// ─── Transcribe audio ──────────────────────────────────────────────────────
aiRouter.post("/transcribe", async (c) => {
  if (!env.GROQ_API_KEY) {
    return c.json({ error: { message: "Groq API key not configured." } }, 500);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: { message: "No audio file provided." } }, 400);
  }

  const apiForm = new FormData();
  apiForm.append("file", file);
  apiForm.append("model", "whisper-large-v3");
  apiForm.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
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
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Clear, authoritative female — cool and precise', persona: 'archivist', stability: 0.32, similarity_boost: 0.87, style: 0.45, speed: 0.94 },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Confident, commanding female — sharp and analytical', persona: 'analyst', stability: 0.35, similarity_boost: 0.87, style: 0.48, speed: 0.98 },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Warm, expressive female — sharp and empathetic', persona: 'journalist', stability: 0.28, similarity_boost: 0.88, style: 0.58, speed: 1.0 },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Smooth, measured male — calm and clinical', persona: 'interrogator', stability: 0.28, similarity_boost: 0.90, style: 0.62, speed: 0.96 },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Urgent, hushed female — wired and reactive', persona: 'informant', stability: 0.25, similarity_boost: 0.90, style: 0.68, speed: 1.05 },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, commanding male — seasoned investigator', persona: 'detective', stability: 0.30, similarity_boost: 0.88, style: 0.55, speed: 0.92 },
];

aiRouter.get('/voices', (c) => {
  return c.json({ data: AVAILABLE_VOICES });
});

// ─── Text-to-speech ────────────────────────────────────────────────────────
aiRouter.post(
  "/tts",
  zValidator("json", z.object({ text: z.string().min(1), voice_id: z.string().optional() })),
  async (c) => {
    const ip = getClientIp(c.req.raw);
    if (!checkRateLimit(`ai-tts:${ip}`, 10, 60_000)) {
      return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
    }

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
        body: JSON.stringify((() => {
          const voiceConfig = AVAILABLE_VOICES.find((v) => v.id === voiceId) ?? AVAILABLE_VOICES[0]!;
          return {
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: voiceConfig.stability,
              similarity_boost: voiceConfig.similarity_boost,
              style: voiceConfig.style ?? 0.3,
              use_speaker_boost: true,
              speed: voiceConfig.speed ?? 1.0,
            },
          };
        })()),
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

  // Only allow fetching images from known podcast CDN domains
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return c.json({ error: { message: 'Invalid URL' } }, 400);
  }
  const allowedHosts = [
    'cdn.simplecast.com', 'feeds.simplecast.com', 'static.simplecast.com',
    'i.cloudup.com', 'audioboom.com', 'megaphone.fm', 'd3t3ozftmdmh3i.cloudfront.net',
    'images.transistor.fm', 'ssl-static.libsyn.com', 'media.rss.com',
    'i1.sndcdn.com', 'i.scdn.co', 'podtrac.com', 'is1-ssl.mzstatic.com',
    'artwork.captivate.fm', 'storage.googleapis.com', 'podcastartwork.s3.amazonaws.com',
  ];
  if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`))) {
    return c.json({ error: { message: 'Image host not allowed' } }, 403);
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
    const ip = getClientIp(c.req.raw);
    if (!checkRateLimit(`ai-verify:${ip}`, 10, 60_000)) {
      return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
    }

    const { claim, context, nodeTitle } = c.req.valid("json");

    if (!env.PERPLEXITY_API_KEY && !env.GROQ_API_KEY) {
      return c.json({ error: { message: "No AI API key configured for verification." } }, 500);
    }

    const userContent = nodeTitle
      ? `Verify the following claim from node "${nodeTitle}":\n\n${claim}${context ? `\n\nAdditional context: ${context}` : ''}`
      : `Verify the following claim:\n\n${claim}${context ? `\n\nAdditional context: ${context}` : ''}`;

    try {
      let analysis = "";

      if (env.PERPLEXITY_API_KEY) {
        // Use Perplexity sonar-reasoning for live-search fact checking with broad source coverage
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-reasoning",
            messages: [
              { role: "system", content: VERIFY_SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            return_citations: true,
            search_recency_filter: "year",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Perplexity verify error: ${errText}`);
        }

        const result = await response.json() as {
          choices: Array<{ message: { content: string } }>;
          citations?: string[];
        };

        analysis = result.choices[0]?.message?.content ?? "";

        // Strip <think>...</think> reasoning block if present (sonar-reasoning exposes it)
        analysis = analysis.replace(/<think>[\s\S]*?<\/think>\s*/i, "").trim();

        if (result.citations && result.citations.length > 0) {
          analysis += "\n\n**Sources Checked:**\n" + result.citations.map((url, i) => `${i + 1}. ${url}`).join("\n");
        }
      } else {
        // Fallback to Groq
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: VERIFY_SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
          }),
        });
        if (!groqRes.ok) {
          const errText = await groqRes.text();
          throw new Error(`Groq API error: ${errText}`);
        }
        const groqResult = await groqRes.json() as { choices: Array<{ message: { content: string } }> };
        analysis = groqResult.choices[0]?.message?.content ?? "";
      }

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
      const message = err instanceof Error ? err.message : "Unknown error during verification";
      return c.json({ error: { message } }, 500);
    }
  }
);

export { aiRouter };
