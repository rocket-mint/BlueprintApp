import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { GridColumn } from "../lib/blueprintLayout";
import type { MotivationMap as MotivationMapData, MotivationDataPoint } from "../types/blueprint";

export const MM_VIEW_W = 1200;
export const MM_VIEW_H = 200;
export const MM_M = { top: 20, right: 16, bottom: 20, left: 8 } as const;
export const MM_LEVELS: ReadonlyArray<{ label: string; value: number; weight: 300 | 400 }> = [
  { label: "High motivation / pressure", value: 1.0,  weight: 300 },
  { label: "Strong intent / commitment", value: 0.67, weight: 300 },
  { label: "Neutral",                    value: 0.33, weight: 400 },
  { label: "Low motivation / passive",   value: 0.0,  weight: 300 },
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function catmullRomPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function scoresForColumn(col: GridColumn, mm: MotivationMapData | undefined): MotivationDataPoint[] {
  if (!mm) return [{ score: 0.33 }];
  if (col.phase) {
    const byPhase = mm.stageScores[col.phase.id];
    if (byPhase && byPhase.length > 0) return byPhase;
  }
  const byStage = mm.stageScores[col.stageId];
  if (byStage && byStage.length > 0) return byStage;
  return [{ score: 0.33 }];
}

interface PlottedPoint {
  x: number;
  y: number;
  data: MotivationDataPoint;
  /** Index into the flat array — used for drag updates */
  flatIndex: number;
  /** Which column this point came from */
  colIndex: number;
  /** Index within that column's scores array */
  scoreIndex: number;
}

interface Props {
  columns: GridColumn[];
  meta: MotivationMapData | undefined;
  editMode?: boolean;
  onUpdateScore?: (colIndex: number, scoreIndex: number, newScore: number) => void;
  onEditPoint?: (colIndex: number, scoreIndex: number) => void;
  onAddPoint?: (colIndex: number, score: number) => void;
}

export function MotivationMap({ columns, meta, editMode, onUpdateScore, onEditPoint, onAddPoint }: Props) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const innerW = MM_VIEW_W - MM_M.left - MM_M.right;
  const innerH = MM_VIEW_H - MM_M.top - MM_M.bottom;
  const baseY = MM_M.top + innerH;

  const points = useMemo<PlottedPoint[]>(() => {
    const flat: Array<MotivationDataPoint & { colIndex: number; scoreIndex: number }> = [];
    for (let ci = 0; ci < columns.length; ci++) {
      const pts = scoresForColumn(columns[ci], meta);
      for (let si = 0; si < pts.length; si++) {
        flat.push({ ...pts[si], colIndex: ci, scoreIndex: si });
      }
    }
    if (flat.length === 0) return [];
    const yFor = (v: number) => MM_M.top + (1 - v) * innerH;
    if (flat.length === 1) {
      return [{ x: MM_M.left + innerW / 2, y: yFor(clamp01(flat[0].score)), data: flat[0], flatIndex: 0, colIndex: flat[0].colIndex, scoreIndex: flat[0].scoreIndex }];
    }
    return flat.map((dp, idx) => ({
      x: MM_M.left + (idx / (flat.length - 1)) * innerW,
      y: yFor(clamp01(dp.score)),
      data: dp,
      flatIndex: idx,
      colIndex: dp.colIndex,
      scoreIndex: dp.scoreIndex,
    }));
  }, [columns, meta, innerW, innerH]);

  // Convert SVG Y coordinate to score (0..1)
  const yToScore = useCallback((svgY: number) => {
    return clamp01(1 - (svgY - MM_M.top) / innerH);
  }, [innerH]);

  // Convert mouse event to SVG Y
  const eventToSvgY = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    return (relY / rect.height) * MM_VIEW_H;
  }, []);

  // Convert mouse event to SVG X
  const eventToSvgX = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    return (relX / rect.width) * MM_VIEW_W;
  }, []);

  // Find closest column index from SVG X coordinate
  const xToColIndex = useCallback((svgX: number) => {
    if (columns.length <= 1) return 0;
    const fraction = (svgX - MM_M.left) / innerW;
    return Math.max(0, Math.min(columns.length - 1, Math.round(fraction * (columns.length - 1))));
  }, [columns.length, innerW]);

  // Click on empty chart space to add a new point
  const handleChartClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!editMode || !onAddPoint) return;
    // Don't add if clicking on a circle
    if ((e.target as Element).tagName === "circle") return;
    const svgX = eventToSvgX(e);
    const svgY = eventToSvgY(e);
    const colIndex = xToColIndex(svgX);
    const score = yToScore(svgY);
    onAddPoint(colIndex, Math.round(score * 100) / 100);
  }, [editMode, onAddPoint, eventToSvgX, eventToSvgY, xToColIndex, yToScore]);

  // Drag handlers
  const handlePointerDown = useCallback((i: number, e: React.PointerEvent) => {
    if (!editMode || !onUpdateScore) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(i);
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [editMode, onUpdateScore]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !onUpdateScore) return;
    const pt = points[dragging];
    if (!pt) return;
    const svgY = eventToSvgY(e);
    const newScore = yToScore(svgY);
    onUpdateScore(pt.colIndex, pt.scoreIndex, Math.round(newScore * 100) / 100);
  }, [dragging, points, onUpdateScore, eventToSvgY, yToScore]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (columns.length === 0 || points.length === 0) return null;

  const coords = points.map((p) => [p.x, p.y] as const);
  const linePath = catmullRomPath(coords);
  const areaPath =
    coords.length >= 2
      ? `${linePath} L ${coords[coords.length - 1][0].toFixed(2)} ${baseY} L ${coords[0][0].toFixed(2)} ${baseY} Z`
      : "";

  const hoveredPoint = hovered !== null && dragging === null ? points[hovered] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MM_VIEW_W} ${MM_VIEW_H}`}
        className={`block h-auto w-full ${editMode ? "cursor-crosshair" : ""}`}
        role="img"
        aria-label="Motivation map curve"
        onClick={handleChartClick}
        onPointerMove={dragging !== null ? handlePointerMove : undefined}
        onPointerUp={dragging !== null ? handlePointerUp : undefined}
        onPointerCancel={dragging !== null ? handlePointerUp : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8073ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8073ff" stopOpacity="0.04" />
          </linearGradient>
          <filter id={`${gradientId}-shadow`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Gridlines */}
        {MM_LEVELS.map((lvl) => {
          const y = MM_M.top + (1 - lvl.value) * innerH;
          return (
            <line
              key={lvl.label}
              x1={MM_M.left}
              x2={MM_VIEW_W - MM_M.right}
              y1={y}
              y2={y}
              stroke="#c1c7d0"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        <path
          d={linePath}
          fill="none"
          stroke="#8073ff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${gradientId}-shadow)`}
        />

        {/* Data point dots */}
        {points.map((pt, i) => {
          const isActive = hovered === i || dragging === i;
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 10 : 7}
              fill={dragging === i ? "#5a4fcf" : isActive ? "#6c5ce7" : "#8073ff"}
              stroke={isActive ? "white" : "none"}
              strokeWidth={isActive ? 2.5 : 0}
              className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
              style={{ transition: dragging === i ? "none" : "all 150ms" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={(e) => handlePointerDown(i, e)}
              onClick={(e) => {
                if (editMode && onEditPoint) {
                  e.stopPropagation();
                  onEditPoint(pt.colIndex, pt.scoreIndex);
                }
              }}
            />
          );
        })}
      </svg>

      {/* Hover card (view mode) */}
      {hoveredPoint && (hoveredPoint.data.title || hoveredPoint.data.description) && !editMode && (
        <div
          className="pointer-events-none absolute z-20 w-[200px] rounded-lg border-2 border-[#8073ff] bg-white p-3 shadow-lg"
          style={{
            left: `${(hoveredPoint.x / MM_VIEW_W) * 100}%`,
            top: `${(hoveredPoint.y / MM_VIEW_H) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          {hoveredPoint.data.title && (
            <div className="text-[12px] font-bold leading-tight text-brand-navy-1000">
              {hoveredPoint.data.title}
            </div>
          )}
          {hoveredPoint.data.description && (
            <p className="mt-1 text-[11px] leading-snug text-neutral-gray-600">
              {hoveredPoint.data.description}
            </p>
          )}
          <div className="mt-1.5 text-[10px] font-semibold text-brand-purple-500">
            Score: {Math.round(hoveredPoint.data.score * 100)}%
          </div>
        </div>
      )}

      {/* Score tooltip while dragging */}
      {dragging !== null && points[dragging] && (
        <div
          className="pointer-events-none absolute z-20 rounded bg-brand-navy-900 px-2 py-1 text-[11px] font-bold text-white shadow"
          style={{
            left: `${(points[dragging].x / MM_VIEW_W) * 100}%`,
            top: `${(points[dragging].y / MM_VIEW_H) * 100}%`,
            transform: "translate(-50%, -140%)",
          }}
        >
          {Math.round(points[dragging].data.score * 100)}%
        </div>
      )}

      {/* Edit mode hint */}
      {editMode && dragging === null && hovered !== null && (
        <div
          className="pointer-events-none absolute z-20 rounded bg-brand-navy-900/80 px-2 py-1 text-[10px] text-white shadow"
          style={{
            left: `${(points[hovered].x / MM_VIEW_W) * 100}%`,
            top: `${(points[hovered].y / MM_VIEW_H) * 100}%`,
            transform: "translate(-50%, 20px)",
          }}
        >
          Drag to adjust · Click to edit
        </div>
      )}
    </div>
  );
}
