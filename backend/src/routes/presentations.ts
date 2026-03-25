import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { HonoVariables } from "../types";

const presentationsRouter = new Hono<{ Variables: HonoVariables }>();

const NodeSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
}).passthrough();

const StringSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  fromNodeId: z.string().optional(),
  toNodeId: z.string().optional(),
}).passthrough();

const GenerateSchema = z.object({
  investigationId: z.string().min(1),
  title: z.string().min(1),
  nodes: z.array(NodeSchema),
  strings: z.array(StringSchema),
});

type SlideNode = z.infer<typeof NodeSchema>;
type SlideString = z.infer<typeof StringSchema>;

interface CoverSlide {
  id: "cover";
  type: "cover";
  title: string;
  subtitle: string;
  date: string;
}

interface SummarySlide {
  id: "summary";
  type: "summary";
  content: string;
}

interface NodeSlide {
  id: string;
  type: "node";
  nodeId: string;
  title: string;
  description: string;
  nodeType: string;
  date: string;
  source: string;
}

interface TimelineSlide {
  id: "timeline";
  type: "timeline";
  events: Array<{ nodeId: string; title: string; date: string }>;
}

interface SourcesSlide {
  id: "sources";
  type: "sources";
  sources: Array<{ nodeId: string; title: string; source: string }>;
}

interface FinalSlide {
  id: "final";
  type: "final";
  tipUrl: string;
}

type Slide =
  | CoverSlide
  | SummarySlide
  | NodeSlide
  | TimelineSlide
  | SourcesSlide
  | FinalSlide;

// POST /api/presentation/generate
presentationsRouter.post(
  "/generate",
  zValidator("json", GenerateSchema),
  async (c) => {
    const { investigationId, title, nodes, strings } = c.req.valid("json");

    // Limit to 20 nodes for performance
    const limitedNodes = nodes.slice(0, 20);

    // Build cover slide
    const coverSlide: CoverSlide = {
      id: "cover",
      type: "cover",
      title,
      subtitle: `${limitedNodes.length} node${limitedNodes.length !== 1 ? "s" : ""} · ${strings.length} connection${strings.length !== 1 ? "s" : ""}`,
      date: new Date().toISOString(),
    };

    // Build summary — 2-3 sentence narrative from node titles
    const nodeTitles = limitedNodes
      .filter((n) => n.title)
      .slice(0, 5)
      .map((n) => n.title as string);

    let summaryContent: string;
    if (nodeTitles.length === 0) {
      summaryContent = "This investigation contains no titled nodes.";
    } else if (nodeTitles.length === 1) {
      summaryContent = `This investigation focuses on ${nodeTitles[0]}. It contains ${limitedNodes.length} total node${limitedNodes.length !== 1 ? "s" : ""}.`;
    } else {
      const listed = nodeTitles.slice(0, -1).join(", ");
      const last = nodeTitles[nodeTitles.length - 1];
      summaryContent = `This investigation explores key elements including ${listed} and ${last}. It contains ${limitedNodes.length} node${limitedNodes.length !== 1 ? "s" : ""} connected by ${strings.length} relationship${strings.length !== 1 ? "s" : ""}. Review the following slides for a detailed breakdown of each element.`;
    }

    const summarySlide: SummarySlide = {
      id: "summary",
      type: "summary",
      content: summaryContent,
    };

    // Build one slide per node
    const nodeSlides: NodeSlide[] = limitedNodes.map((node) => ({
      id: `node-${node.id}`,
      type: "node",
      nodeId: node.id,
      title: node.title ?? "Untitled Node",
      description: node.description ?? "",
      nodeType: node.type ?? "unknown",
      date: node.date ?? "",
      source: node.source ?? "",
    }));

    // Build timeline slide — nodes that have a date, sorted
    const timelineEvents = limitedNodes
      .filter((n) => n.date)
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      })
      .map((n) => ({
        nodeId: n.id,
        title: n.title ?? "Untitled",
        date: n.date as string,
      }));

    const timelineSlide: TimelineSlide = {
      id: "timeline",
      type: "timeline",
      events: timelineEvents,
    };

    // Build sources slide — nodes that have a source
    const sourcesEntries = limitedNodes
      .filter((n) => n.source)
      .map((n) => ({
        nodeId: n.id,
        title: n.title ?? "Untitled",
        source: n.source as string,
      }));

    const sourcesSlide: SourcesSlide = {
      id: "sources",
      type: "sources",
      sources: sourcesEntries,
    };

    // Final slide with tip URL
    const finalSlide: FinalSlide = {
      id: "final",
      type: "final",
      tipUrl: `/tip/${investigationId}`,
    };

    const slides: Slide[] = [
      coverSlide,
      summarySlide,
      ...nodeSlides,
      timelineSlide,
      sourcesSlide,
      finalSlide,
    ];

    return c.json({
      data: {
        slides,
        generatedAt: new Date().toISOString(),
        investigationId,
      },
    });
  }
);

export default presentationsRouter;
