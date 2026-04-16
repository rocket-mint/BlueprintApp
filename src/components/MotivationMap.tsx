import { useCallback, useId, useMemo, useRef, useState, useEffect } from "react";
import type { MotivationDataPoint } from "../types/blueprint";

export const MM_VIEW_W = 1200;
export const MM_VIEW_H = 200;
export const MM_M = { top: 20, right: 16, bottom: 20, left: 8 } as const;
export const MM_LEVELS: ReadonlyArray<{ label: string; value: number; weight: 300 | 400 }> = [
  { label: "High",   value: 1.0, weight: 300 },
  { label: "Medium", value: 0.5, weight: 400 },
  { label: "Low",    value: 0.0, weight: 300 },
];

const MAP_HEIGHT = 200;
const PURPLE = "#8073ff";
const PURPLE_LIGHT = "#6c5ce7";
export const MM_Y_AXIS_W = 48;
const Y_AXIS_W = MM_Y_AXIS_W;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const INNER_H = MAP_HEIGHT - PAD_TOP - PAD_BOTTOM;
const DOT_R = 7;
const DOT_R_HOVER = 10;
export const MM_PAD_X = 16;
const PAD_X = MM_PAD_X;

function catmullRomPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function scoreToY(score: number): number {
  return PAD_TOP + (1 - Math.max(0, Math.min(1, score))) * INNER_H;
}

function yToScore(y: number): number {
  return Math.max(0, Math.min(1, 1 - (y - PAD_TOP) / INNER_H));
}

interface DragState {
  origIndex: number; // index in original (unsorted) points array
  x: number;
  score: number;
}

interface Props {
  points: MotivationDataPoint[];
  editMode?: boolean;
  onDragPoint?: (index: number, x: number, score: number) => void;
  onEditPoint?: (index: number) => void;
  onAddPoint?: (x: number, score: number) => void;
}

export function MotivationMap({ points, editMode, onDragPoint, onEditPoint, onAddPoint }: Props) {
  const gradientId = useId();
  const clipId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null); // origIndex
  const [dragging, setDragging] = useState<DragState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chartLeft = Y_AXIS_W + PAD_X;
  const chartW = Math.max(0, containerW - Y_AXIS_W - PAD_X * 2);

  // Effective points — override dragged point's position
  const effectivePoints = useMemo(() => {
    if (!dragging) return points;
    return points.map((p, i) =>
      i === dragging.origIndex ? { ...p, x: dragging.x, score: dragging.score } : p,
    );
  }, [points, dragging]);

  // Sorted by x for path rendering, preserving original index
  const sortedDots = useMemo(() => {
    return effectivePoints
      .map((p, origIndex) => ({ ...p, origIndex }))
      .sort((a, b) => a.x - b.x);
  }, [effectivePoints]);

  const svgPoints = useMemo(() => {
    if (sortedDots.length === 0 || chartW <= 0) {
      return { line: "", area: "", coords: [] as Array<readonly [number, number]> };
    }
    const coords: Array<readonly [number, number]> = sortedDots.map((d) => [
      chartLeft + d.x * chartW,
      scoreToY(d.score),
    ] as const);
    const line = catmullRomPath(coords);
    const area = `${line} L ${coords[coords.length - 1][0].toFixed(1)},${MAP_HEIGHT - PAD_BOTTOM} L ${coords[0][0].toFixed(1)},${MAP_HEIGHT - PAD_BOTTOM} Z`;
    return { line, area, coords };
  }, [sortedDots, chartLeft, chartW]);

  // ── Pointer drag handlers ──

  const getSvgPos = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - chartLeft) / chartW;
    const rawY = e.clientY - rect.top;
    return {
      x: Math.max(0, Math.min(1, rawX)),
      score: yToScore(rawY),
    };
  }, [chartLeft, chartW]);

  const handleDotPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, origIndex: number) => {
      if (!editMode) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = effectivePoints[origIndex];
      setDragging({ origIndex, x: pt.x, score: pt.score });
    },
    [editMode, effectivePoints],
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const pos = getSvgPos(e);
      if (!pos) return;
      setDragging((prev) => prev ? { ...prev, x: pos.x, score: pos.score } : null);
    },
    [dragging, getSvgPos],
  );

  const handleSvgPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      onDragPoint?.(dragging.origIndex, dragging.x, dragging.score);
      setDragging(null);
    },
    [dragging, onDragPoint],
  );

  // Click on SVG background → add point
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!editMode || !onAddPoint) return;
      if ((e.target as Element).closest("[data-dot]")) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - chartLeft) / chartW;
      const rawY = e.clientY - rect.top;
      const x = Math.max(0, Math.min(1, rawX));
      const score = yToScore(rawY);
      onAddPoint(Math.round(x * 1000) / 1000, Math.round(score * 100) / 100);
    },
    [editMode, onAddPoint, chartLeft, chartW],
  );

  const handleDotClick = useCallback(
    (e: React.MouseEvent, origIndex: number) => {
      if (!editMode || !onEditPoint) return;
      e.stopPropagation();
      // Only fire if not a drag (pointer didn't move much)
      onEditPoint(origIndex);
    },
    [editMode, onEditPoint],
  );

  if (containerW === 0 && points.length === 0) {
    // Nothing to render yet — return the container so ResizeObserver can measure
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: MAP_HEIGHT }}>
      {/* Y-axis labels */}
      <div
        className="absolute left-0 top-0 flex flex-col justify-between text-right"
        style={{ width: Y_AXIS_W, height: MAP_HEIGHT, paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
      >
        <span className="pr-2 text-[13px] font-semibold uppercase text-neutral-gray-500">High</span>
        <span className="pr-2 text-[13px] font-semibold uppercase text-neutral-gray-500">Medium</span>
        <span className="pr-2 text-[13px] font-semibold uppercase text-neutral-gray-500">Low</span>
      </div>

      {/* SVG overlay */}
      <svg
        ref={svgRef}
        className={`absolute inset-0 ${editMode ? "cursor-crosshair" : ""}`}
        width={containerW || "100%"}
        height={MAP_HEIGHT}
        onClick={handleSvgClick}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PURPLE} stopOpacity={0.3} />
            <stop offset="100%" stopColor={PURPLE} stopOpacity={0.03} />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={Y_AXIS_W} y={0} width={Math.max(0, containerW - Y_AXIS_W)} height={MAP_HEIGHT} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Horizontal gridlines */}
          {MM_LEVELS.map((lvl) => {
            const y = scoreToY(lvl.value);
            return (
              <line
                key={lvl.label}
                x1={Y_AXIS_W}
                x2={containerW}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Gradient fill */}
          {svgPoints.area && (
            <path d={svgPoints.area} fill={`url(#${gradientId})`} />
          )}

          {/* Line */}
          {svgPoints.line && (
            <path
              d={svgPoints.line}
              fill="none"
              stroke={PURPLE}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots — rendered in sorted order so hover z-order is predictable */}
          {sortedDots.map((dot, si) => {
            const cx = svgPoints.coords[si]?.[0] ?? chartLeft + dot.x * chartW;
            const cy = svgPoints.coords[si]?.[1] ?? scoreToY(dot.score);
            const isDragging = dragging?.origIndex === dot.origIndex;
            const isHovered = hoveredDot === dot.origIndex && !isDragging;
            const r = isHovered || isDragging ? DOT_R_HOVER : DOT_R;
            return (
              <circle
                key={dot.origIndex}
                data-dot="true"
                cx={cx}
                cy={cy}
                r={r}
                fill={isDragging || isHovered ? PURPLE_LIGHT : PURPLE}
                stroke="white"
                strokeWidth={2}
                style={{
                  cursor: editMode ? (isDragging ? "grabbing" : "grab") : "default",
                  transition: isDragging ? "none" : "r 150ms, fill 150ms",
                }}
                onMouseEnter={() => setHoveredDot(dot.origIndex)}
                onMouseLeave={() => setHoveredDot(null)}
                onPointerDown={(e) => handleDotPointerDown(e, dot.origIndex)}
                onClick={(e) => handleDotClick(e, dot.origIndex)}
              />
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredDot !== null && !dragging && (() => {
        const dot = sortedDots.find((d) => d.origIndex === hoveredDot);
        if (!dot) return null;
        const si = sortedDots.indexOf(dot);
        const coord = svgPoints.coords[si];
        if (!coord) return null;
        return (
          <div
            className="pointer-events-none absolute z-20 min-w-[120px] rounded-lg border-2 bg-white px-3 py-2 shadow-lg"
            style={{
              borderColor: PURPLE,
              left: coord[0],
              top: coord[1],
              transform: "translate(-50%, -110%)",
            }}
          >
            {dot.title && (
              <div className="text-[14px] font-bold text-brand-navy-1000">{dot.title}</div>
            )}
            <div className="text-[13px] font-semibold text-brand-purple-500">
              {Math.round(dot.score * 100)}%
            </div>
            {dot.description && (
              <p className="mt-0.5 text-[12px] leading-snug text-neutral-gray-600">{dot.description}</p>
            )}
            {editMode && (
              <p className="mt-1 text-[11px] text-neutral-gray-400">Drag to move · Click to edit</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
