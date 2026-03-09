"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { KnowledgeGraph } from "@script/types";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { drag as d3Drag } from "d3-drag";
import "d3-transition";

interface KnowledgeGraphPanelProps {
  projectId: string;
  editor: Editor | null;
}

// d3 node type
interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  description: string;
}

// d3 link type
interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type?: string | null;
  description?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  character: "#60a5fa",
  location: "#34d399",
  object: "#fbbf24",
  event: "#f472b6",
  concept: "#a78bfa",
  organization: "#fb923c",
};

function getColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] || "#94a3b8";
}

function GraphVisualization({ data }: { data: KnowledgeGraph }) {
  const t = useTranslations("KnowledgeGraph");
  const tc = useTranslations("Common");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const resetZoom = useCallback(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const zoomBehavior = (svg.node() as SVGSVGElement & { __zoom_behavior?: ReturnType<typeof d3Zoom> }).__zoom_behavior;
    if (zoomBehavior) {
      svg.transition().duration(500).call(zoomBehavior.transform as never, zoomIdentity);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Build nodes
    const nodes: GraphNode[] = data.entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      description: e.description,
    }));

    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    // Build links
    const links: GraphLink[] = data.relationships
      .filter((r) => nodeById.has(r.from) && nodeById.has(r.to))
      .map((r) => ({
        source: r.from,
        target: r.to,
        type: r.type,
        description: r.description,
      }));

    // Clear previous
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    // Create group for zoom
    const g = svg.append("g");

    // Zoom behavior
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);
    (svg.node() as SVGSVGElement & { __zoom_behavior?: unknown }).__zoom_behavior = zoomBehavior;

    // Simulation
    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(40));

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // Link labels
    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .text((d) => d.type ?? "")
      .attr("font-size", "9px")
      .attr("fill", "#6b7280")
      .attr("text-anchor", "middle")
      .attr("dy", -4);

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelectedNode(d);
      });

    // Drag behavior
    const dragBehavior = d3Drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(dragBehavior);

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => (d.type.toLowerCase() === "character" ? 16 : 12))
      .attr("fill", (d) => getColor(d.type))
      .attr("stroke", "#1f2937")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    // Node labels
    node
      .append("text")
      .text((d) => d.name)
      .attr("font-size", "11px")
      .attr("fill", "#e5e7eb")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.type.toLowerCase() === "character" ? 28 : 24));

    // Events panel
    if (data.events.length > 0) {
      const eventsGroup = g.append("g").attr("transform", `translate(20, 20)`);
      eventsGroup
        .append("text")
        .text(t("events"))
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", "#9ca3af");
      data.events.slice(0, 8).forEach((event, i) => {
        eventsGroup
          .append("text")
          .text(`${event.name}`)
          .attr("y", 16 + i * 14)
          .attr("font-size", "9px")
          .attr("fill", "#6b7280");
      });
    }

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      linkLabel
        .attr("x", (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node.attr("transform", (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, t]);

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ background: "transparent" }}
      />

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button
          onClick={() => {
            if (!svgRef.current) return;
            const svg = select(svgRef.current);
            const zoomBehavior = (svg.node() as SVGSVGElement & { __zoom_behavior?: ReturnType<typeof d3Zoom> }).__zoom_behavior;
            if (zoomBehavior) svg.transition().call(zoomBehavior.scaleBy as never, 1.3);
          }}
          className="rounded bg-muted/80 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (!svgRef.current) return;
            const svg = select(svgRef.current);
            const zoomBehavior = (svg.node() as SVGSVGElement & { __zoom_behavior?: ReturnType<typeof d3Zoom> }).__zoom_behavior;
            if (zoomBehavior) svg.transition().call(zoomBehavior.scaleBy as never, 0.7);
          }}
          className="rounded bg-muted/80 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetZoom}
          className="rounded bg-muted/80 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] capitalize text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 right-3 max-w-[240px] rounded-lg border border-border bg-background/95 p-3 backdrop-blur"
        >
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: getColor(selectedNode.type) }}
            />
            <span className="text-sm font-medium text-foreground">{selectedNode.name}</span>
          </div>
          <span className="text-[10px] uppercase text-muted-foreground">{selectedNode.type}</span>
          {selectedNode.description && (
            <p className="mt-1 text-xs text-muted-foreground">{selectedNode.description}</p>
          )}
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {tc("close")}
          </button>
        </motion.div>
      )}
    </div>
  );
}

export function KnowledgeGraphPanel({ projectId, editor }: KnowledgeGraphPanelProps) {
  const t = useTranslations("KnowledgeGraph");
  const trpc = useTRPC();
  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);

  // Load saved graph from project
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  // Initialize from saved data
  const savedGraph = useMemo(() => {
    const kg = (project as Record<string, unknown> | undefined)?.knowledgeGraph;
    if (kg && typeof kg === "object" && "entities" in (kg as Record<string, unknown>)) {
      return kg as unknown as KnowledgeGraph;
    }
    return null;
  }, [project]);

  useEffect(() => {
    if (savedGraph && !graphData) {
      setGraphData(savedGraph);
    }
  }, [savedGraph, graphData]);

  const mutation = useMutation(
    trpc.ai.extractKnowledgeGraph.mutationOptions({
      onSuccess: (data) => {
        setGraphData(data);
        toast.success(
          t("graphBuilt", {
            entities: data.entities.length,
            relationships: data.relationships.length,
          })
        );
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleExtract = () => {
    if (!editor) {
      toast.error(t("editorNotReady"));
      return;
    }
    const text = editor.state.doc.textBetween(
      0,
      Math.min(editor.state.doc.content.size, 100000),
      "\n"
    );
    if (!text.trim()) {
      toast.error(t("noText"));
      return;
    }
    mutation.mutate({ projectId, text });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <button
          onClick={handleExtract}
          disabled={mutation.isPending || !editor}
          className="flex items-center gap-1.5 rounded-md bg-ai-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ai-accent/80 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("extracting")}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {graphData ? t("regenerateGraph") : t("extractGraph")}
            </>
          )}
        </button>
      </div>

      {/* Graph or empty state */}
      <div className="flex-1 overflow-hidden">
        {graphData ? (
          <GraphVisualization data={graphData} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("emptyState")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {t("emptyStateHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
