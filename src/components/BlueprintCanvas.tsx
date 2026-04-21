// BlueprintCanvas — top-level layout renderer.
//
// Each section is a standalone white card. Inside each card, ALL rows
// (stage headers, phase headers, swimlane rows, motivation map) share ONE
// CSS Grid so columns align and expand together.

import React, { useMemo, useRef, useState } from "react";
import type {
  Blueprint,
  JourneyStage,
  Phase,
  Section,
  StageGroup,
  Touchpoint,
  Callout,
  Swimlane,
  MotivationMap as MotivationMapData,
} from "../types/blueprint";
import type { Media } from "./MediaModal";
import { TouchpointCard } from "./TouchpointCard";
import { CalloutBadge } from "./CalloutBadge";
import { MotivationMap } from "./MotivationMap";
import { EditButton, DeleteButton, AddButton } from "./EditControls";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import {
  gridTemplateFor,
  minWidthFor,
  LABEL_COL_W,
  type GridColumn,
} from "../lib/blueprintLayout";
import { stagesForSection } from "../utils/dataUtils";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------


function Chevron({ open, size = 14 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <polyline points="3,2 7,5 3,8" />
    </svg>
  );
}

/** Six-dot grip icon shown on draggable rows in edit mode. */
function GripHandle({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="shrink-0 cursor-grab touch-none select-none px-0.5 text-neutral-gray-300 hover:text-neutral-gray-500 active:cursor-grabbing"
      title="Drag to reorder"
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="3"  r="1.3" />
        <circle cx="7" cy="3"  r="1.3" />
        <circle cx="3" cy="8"  r="1.3" />
        <circle cx="7" cy="8"  r="1.3" />
        <circle cx="3" cy="13" r="1.3" />
        <circle cx="7" cy="13" r="1.3" />
      </svg>
    </div>
  );
}

function touchpointsForColumn(
  touchpoints: Touchpoint[],
  swimlaneId: string,
  col: GridColumn,
  phaseId?: string,
): Touchpoint[] {
  const result: Touchpoint[] = [];
  for (const tp of touchpoints) {
    if (tp.swimlaneId !== swimlaneId) continue;
    if (phaseId) {
      // Phase-group cell: match by individual phaseId
      if (tp.phaseId === phaseId) result.push(tp);
    } else {
      // Orphan swimlane cell: match by stageId
      if (tp.stageId === col.stageId) result.push(tp);
    }
  }
  return result.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Drag types
// ---------------------------------------------------------------------------

interface DragRowProps {
  isDragTarget: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
}

/** A section-level row — either an orphan swimlane or a phase group. */
type SectionItem =
  | { kind: "swimlane"; id: string; order: number; swimlane: Swimlane }
  | { kind: "group";    id: string; order: number; phases: Phase[] };

interface ReorderUpdate {
  swimlaneOrders?: Array<{ id: string; order: number }>;
  phaseOrders?: Array<{ id: string; order: number }>;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  blueprint: Blueprint;
  touchpointMedia: Record<string, Media>;
  collapsedSwimlanes: Set<string>;
  collapsedSections: Set<string>;
  collapsedPhaseGroups: Set<string>;
  editMode: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onUpdateMotivationMap?: (id: string, points: MotivationMapData["points"]) => void;
  onAddMotivationMap?: (mm: MotivationMapData) => void;
  onUpdateSection?: (id: string, changes: { name?: string; description?: string; stageLabel?: string; stageGroupLabel?: string }) => void;
  onUpdatePhaseGroupLabel?: (groupId: string, label: string, phases: Phase[]) => void;
  onReorderRows?: (update: ReorderUpdate) => void;
  onToggleCollapse: (id: string) => void;
  onToggleSectionCollapse: (id: string) => void;
  onTogglePhaseGroupCollapse: (id: string) => void;
  editingEntityId?: string | null;
}

// ---------------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------------
function SectionCard({
  section,
  sectionStages,
  blueprint,
  touchpointMedia,
  collapsedSwimlanes,
  collapsed,
  editMode,
  onEditEntity,
  onDeleteEntity,
  onUpdateMotivationMap,
  onAddMotivationMap,
  onUpdateSection,
  onUpdatePhaseGroupLabel,
  onReorderRows,
  onToggleCollapse,
  onToggleSectionCollapse,
  onTogglePhaseGroupCollapse,
  collapsedPhaseGroups,
  editingEntityId,
}: {
  section: Section;
  sectionStages: JourneyStage[];
  blueprint: Blueprint;
  touchpointMedia: Record<string, Media>;
  collapsedSwimlanes: Set<string>;
  collapsed: boolean;
  collapsedPhaseGroups: Set<string>;
  editMode: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onUpdateMotivationMap?: (id: string, points: MotivationMapData["points"]) => void;
  onAddMotivationMap?: (mm: MotivationMapData) => void;
  onUpdateSection?: (id: string, changes: { name?: string; description?: string; stageLabel?: string; stageGroupLabel?: string }) => void;
  onUpdatePhaseGroupLabel?: (groupId: string, label: string, phases: Phase[]) => void;
  onReorderRows?: (update: ReorderUpdate) => void;
  onToggleCollapse: (id: string) => void;
  onToggleSectionCollapse: (id: string) => void;
  onTogglePhaseGroupCollapse: (id: string) => void;
  editingEntityId?: string | null;
}) {
  // ── Grid layout ──
  const gridColumns = useMemo<GridColumn[]>(
    () => sectionStages.map((s) => ({ stageId: s.id, phase: null })),
    [sectionStages],
  );
  const gridColCount = editMode ? gridColumns.length + 1 : gridColumns.length;

  const grid: React.CSSProperties = editMode
    ? {
        display: "grid",
        gridTemplateColumns: `${LABEL_COL_W}px repeat(${gridColumns.length}, minmax(180px, max-content)) auto`,
        gap: "14px",
      }
    : gridTemplateFor(gridColumns.length);
  const sectionMinWidth = minWidthFor(gridColumns.length);
  const totalCols = gridColCount + 1;

  // ── Stage group spans ──
  const sectionStageGroups = useMemo(
    () => (blueprint.stageGroups ?? []).filter((g) => g.sectionId === section.id),
    [blueprint.stageGroups, section.id],
  );
  const hasStageGroups = sectionStageGroups.length > 0 ||
    sectionStages.some((s) => s.stageGroupId);

  // Build contiguous spans for the group header row
  const groupSpans = useMemo(() => {
    const groupMap = new Map((blueprint.stageGroups ?? []).map((g) => [g.id, g]));
    const spans: Array<{ group: StageGroup | null; count: number; startIndex: number }> = [];
    let current: { group: StageGroup | null; count: number; startIndex: number } | null = null;
    sectionStages.forEach((stage, i) => {
      const group = stage.stageGroupId ? (groupMap.get(stage.stageGroupId) ?? null) : null;
      if (current && current.group?.id === (group?.id ?? null) && (current.group === null) === (group === null)) {
        current.count++;
      } else {
        if (current) spans.push(current);
        current = { group, count: 1, startIndex: i };
      }
    });
    if (current) spans.push(current);
    return spans;
  }, [sectionStages, blueprint.stageGroups]);

  // ── Motivation map lookup ──
  const motivationMapByLane = useMemo(() => {
    const m = new Map<string, MotivationMapData>();
    for (const mm of blueprint.motivationMaps) m.set(mm.swimlaneId, mm);
    return m;
  }, [blueprint.motivationMaps]);

  // ── Derived data ──
  const swimlanes = useMemo(
    () =>
      blueprint.swimlanes
        .filter((s) => s.sectionId === section.id)
        .sort((a, b) => a.order - b.order),
    [blueprint.swimlanes, section.id],
  );

  const sectionPhases = useMemo(
    () =>
      blueprint.phases
        .filter((p) => sectionStages.some((s) => s.id === p.stageId))
        .sort((a, b) => a.order - b.order),
    [blueprint.phases, sectionStages],
  );

  const groupIds = useMemo(
    () => [...new Set(sectionPhases.map((p) => p.groupId ?? p.id))],
    [sectionPhases],
  );

  const phaseToGroup = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of sectionPhases) m.set(p.id, p.groupId ?? p.id);
    return m;
  }, [sectionPhases]);

  // Per-phase minimum pixel width, driven by the max touchpoint count for that phase
  // across all swimlanes in its group. Both phase pills and sub-cells use this width
  // so they are guaranteed to align.
  const CARD_W = 176;
  const CARD_GAP = 8;
  const phaseMinWidths = useMemo(() => {
    const widths = new Map<string, number>();
    for (const phase of sectionPhases) {
      const groupId = phase.groupId ?? phase.id;
      const groupSwimlaneIds = swimlanes
        .filter((sl) => sl.phaseId === groupId)
        .map((sl) => sl.id);
      const countsPerSwimlane = groupSwimlaneIds.map(
        (slId) =>
          blueprint.touchpoints.filter(
            (tp) => tp.phaseId === phase.id && tp.swimlaneId === slId,
          ).length,
      );
      const maxCount = Math.max(1, ...countsPerSwimlane);
      widths.set(phase.id, maxCount * CARD_W + (maxCount - 1) * CARD_GAP);
    }
    return widths;
  }, [sectionPhases, swimlanes, blueprint.touchpoints]);

  const { byGroup, orphanSwimlanes } = useMemo(() => {
    const byGroup = new Map<string, Swimlane[]>();
    const orphanSwimlanes: Swimlane[] = [];
    for (const sl of swimlanes) {
      if (sl.phaseId) {
        const gid = phaseToGroup.get(sl.phaseId) ?? sl.phaseId;
        const arr = byGroup.get(gid) ?? [];
        arr.push(sl);
        byGroup.set(gid, arr);
      } else {
        orphanSwimlanes.push(sl);
      }
    }
    return { byGroup, orphanSwimlanes };
  }, [swimlanes, phaseToGroup]);

  // ── Merged ordered section items (orphan swimlanes + phase groups) ──
  const sectionItems = useMemo((): SectionItem[] => {
    const items: SectionItem[] = [
      ...orphanSwimlanes.map((sl) => ({
        kind: "swimlane" as const,
        id: sl.id,
        order: sl.order,
        swimlane: sl,
      })),
      ...groupIds.map((gid) => {
        const phases = sectionPhases.filter((p) => (p.groupId ?? p.id) === gid);
        const minOrder = phases.length ? Math.min(...phases.map((p) => p.order)) : 0;
        return { kind: "group" as const, id: gid, order: minOrder, phases };
      }),
    ];
    return items.sort((a, b) => a.order - b.order);
  }, [orphanSwimlanes, groupIds, sectionPhases]);

  // ── Drag state ──
  const [sectionDragId, setSectionDragId]         = useState<string | null>(null);
  const [sectionDragOverId, setSectionDragOverId]   = useState<string | null>(null);
  const [groupDragSl, setGroupDragSl]             = useState<{ gid: string; slId: string } | null>(null);
  const [groupDragOverSlId, setGroupDragOverSlId]   = useState<string | null>(null);

  // ── Post-drop highlight ──
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashMoved(id: string) {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setJustMovedId(id);
    highlightTimer.current = setTimeout(() => setJustMovedId(null), 1400);
  }

  // ── Section-level reorder ──
  function handleSectionDrop(targetId: string) {
    const dragged = sectionDragId;
    setSectionDragId(null);
    setSectionDragOverId(null);
    if (!dragged || dragged === targetId || !onReorderRows) return;

    const next = [...sectionItems];
    const from = next.findIndex((i) => i.id === dragged);
    const to   = next.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const swimlaneOrders: Array<{ id: string; order: number }> = [];
    const phaseOrders: Array<{ id: string; order: number }>    = [];
    next.forEach((item, i) => {
      if (item.kind === "swimlane") {
        swimlaneOrders.push({ id: item.id, order: i * 100 });
      } else {
        item.phases.forEach((p) => phaseOrders.push({ id: p.id, order: i * 100 }));
      }
    });
    onReorderRows({ swimlaneOrders, phaseOrders });
    flashMoved(dragged);
  }

  // ── Group-swimlane reorder ──
  function handleGroupSwimlaneDrop(gid: string, targetSlId: string) {
    const dragged = groupDragSl;
    setGroupDragSl(null);
    setGroupDragOverSlId(null);
    if (!dragged || dragged.gid !== gid || dragged.slId === targetSlId || !onReorderRows) return;

    const lanes = [...(byGroup.get(gid) ?? [])];
    const from  = lanes.findIndex((sl) => sl.id === dragged.slId);
    const to    = lanes.findIndex((sl) => sl.id === targetSlId);
    if (from === -1 || to === -1) return;
    const [moved] = lanes.splice(from, 1);
    lanes.splice(to, 0, moved);
    onReorderRows({ swimlaneOrders: lanes.map((sl, i) => ({ id: sl.id, order: i * 10 })) });
    flashMoved(dragged.slId);
  }

  // ── Swimlane renderer ──
  function renderSwimlane(sl: Swimlane, dragProps?: DragRowProps, isJustMoved = false) {
    const isCollapsed = collapsedSwimlanes.has(sl.id);
    const dropClass = dragProps?.isDragTarget ? "border-b-2 border-brand-cyan-500" : "";
    const movedClass = isJustMoved
      ? "ring-2 ring-brand-cyan-400 bg-brand-cyan-50/60 transition-all duration-700"
      : "transition-all duration-700";

    if (isCollapsed) {
      return (
        <div
          key={sl.id}
          style={{ gridColumn: `1 / ${totalCols + 1}` }}
          className={dropClass}
          onDragOver={dragProps?.onDragOver}
          onDrop={dragProps ? () => dragProps.onDrop() : undefined}
          onDragLeave={dragProps?.onDragLeave}
        >
          <button
            type="button"
            onClick={() => onToggleCollapse(sl.id)}
            title={`Expand ${sl.name}`}
            className={`mt-1 flex w-full items-center gap-2 rounded-xl border border-neutral-gray-100 px-4 py-2 text-left text-neutral-gray-700 hover:bg-neutral-gray-50 ${movedClass} ${editingEntityId === sl.id ? "ring-2 ring-brand-cyan-500" : ""}`}
          >
            {dragProps && (
              <GripHandle onDragStart={dragProps.onDragStart} onDragEnd={dragProps.onDragEnd} />
            )}
            <Chevron open={false} size={10} />
            <span className="text-[14px] font-bold leading-tight text-brand-navy-1000">{sl.name}</span>
          </button>
        </div>
      );
    }

    if (sl.type === "motivation_map") {
      return (
        <MotivationMapGridRow
          key={sl.id}
          swimlane={sl}
          gridColumns={gridColumns}
          meta={motivationMapByLane.get(sl.id)}
          editMode={editMode}
          isJustMoved={isJustMoved}
          onToggleCollapse={() => onToggleCollapse(sl.id)}
          onDragMotivationPoint={(index, newX, newScore) => {
            const mm = motivationMapByLane.get(sl.id);
            if (!mm || !onUpdateMotivationMap) return;
            const newPoints = mm.points.map((p, i) =>
              i === index ? { ...p, x: newX, score: newScore } : p,
            );
            onUpdateMotivationMap(mm.id, newPoints);
          }}
          onEditMotivationPoint={(index) => {
            const mm = motivationMapByLane.get(sl.id);
            if (!mm) return;
            onEditEntity({ type: "motivation_point", id: mm.id, parentId: `${index}` });
          }}
          onAddMotivationPoint={(x, score) => {
            const mm = motivationMapByLane.get(sl.id);
            const newPoint = { x, score };
            if (!mm) {
              const newId = `mm-${sl.id}`;
              onAddMotivationMap?.({ id: newId, swimlaneId: sl.id, points: [newPoint] });
            } else {
              onUpdateMotivationMap?.(mm.id, [...mm.points, newPoint]);
            }
          }}
          onEditEntity={onEditEntity}
          onDeleteEntity={onDeleteEntity}
          dragProps={dragProps}
          editingEntityId={editingEntityId}
        />
      );
    }

    // For phase-group swimlanes, pass the group's phases so cells subdivide per phase.
    const groupPhases = sl.phaseId
      ? sectionPhases.filter((p) => (p.groupId ?? p.id) === sl.phaseId)
      : undefined;

    // True if any column in this swimlane has at least one touchpoint.
    const rowHasTouchpoints = gridColumns.some((col) => {
      if (groupPhases) {
        const stagePhases = groupPhases.filter((p) => p.stageId === col.stageId);
        return stagePhases.some(
          (phase) => touchpointsForColumn(blueprint.touchpoints, sl.id, col, phase.id).length > 0,
        );
      }
      return touchpointsForColumn(blueprint.touchpoints, sl.id, col, undefined).length > 0;
    });

    return (
      <MomentsGridRow
        key={sl.id}
        swimlane={sl}
        gridColumns={gridColumns}
        touchpoints={blueprint.touchpoints}
        callouts={blueprint.callouts}
        touchpointMedia={touchpointMedia}
        editMode={editMode}
        isJustMoved={isJustMoved}
        onEditEntity={onEditEntity}
        onDeleteEntity={onDeleteEntity}
        onToggleCollapse={() => onToggleCollapse(sl.id)}
        dragProps={dragProps}
        groupPhases={groupPhases}
        phaseMinWidths={phaseMinWidths}
        editingEntityId={editingEntityId}
        rowHasTouchpoints={rowHasTouchpoints}
        stages={sectionStages}
      />
    );
  }

  // ── Collapsed section ──
  if (collapsed) {
    return (
      <section className={`rounded-[20px] bg-white shadow-[0_2px_10px_0_rgba(15,23,36,0.05)] ${editingEntityId === section.id ? "ring-2 ring-brand-cyan-500" : ""}`}>
        <button
          type="button"
          onClick={() => onToggleSectionCollapse(section.id)}
          title={`Expand ${section.name}`}
          className="flex w-full items-center gap-3 rounded-[20px] px-10 py-5 text-left transition-colors hover:bg-neutral-gray-50"
        >
          <Chevron open={false} />
          <span className="text-xl font-light text-brand-navy-1000">{section.name}</span>
          {section.description && (
            <span className="text-sm text-neutral-gray-600">— {section.description}</span>
          )}
          <span className="ml-auto whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-neutral-gray-500">
            {sectionStages.length} stage{sectionStages.length === 1 ? "" : "s"}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section
      className={`rounded-[20px] bg-white px-6 py-10 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)] sm:px-10 sm:py-12 ${editingEntityId === section.id ? "ring-2 ring-brand-cyan-500" : ""}`}
      style={{ minWidth: sectionMinWidth }}
    >
      {/* Section title */}
      <div className="group mb-8 flex items-start gap-3">
        {editMode ? (
          <div className="flex flex-1 flex-col gap-1.5">
            <input
              type="text"
              value={section.name}
              onChange={(e) => onUpdateSection?.(section.id, { name: e.target.value })}
              placeholder="Section name"
              className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-1.5 text-xl font-light text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 sm:text-2xl"
            />
            <input
              type="text"
              value={section.description ?? ""}
              onChange={(e) => onUpdateSection?.(section.id, { description: e.target.value })}
              placeholder="Section description (optional)"
              className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-gray-600 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onToggleSectionCollapse(section.id)}
            className="flex flex-1 items-start gap-3 text-left transition-opacity hover:opacity-80"
            title={`Collapse ${section.name}`}
          >
            <span className="mt-2 text-neutral-gray-500"><Chevron open /></span>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-light leading-tight text-brand-navy-1000 sm:text-2xl">
                {section.name}
              </h2>
              {section.description && (
                <p className="text-sm text-neutral-gray-600">{section.description}</p>
              )}
            </div>
          </button>
        )}
        {editMode && (
          <div className="flex shrink-0 gap-0.5">
            <DeleteButton type="section" id={section.id} onConfirm={onDeleteEntity} />
          </div>
        )}
      </div>

      {/* ══ Single grid ══ */}
      <div style={grid}>

        {/* ── Stage Group headers (shown when any stage group exists in section) ── */}
        {hasStageGroups && (
          <div style={{ display: "contents" }}>
            {/* Col 1: label */}
            <div style={{ gridColumn: 1 }} className="flex items-center justify-end pr-2">
              {editMode ? (
                <input
                  type="text"
                  value={section.stageGroupLabel ?? "Group"}
                  onChange={(e) => onUpdateSection?.(section.id, { stageGroupLabel: e.target.value })}
                  className="w-full rounded-md border border-neutral-gray-200 bg-white px-2 py-1 text-[14px] font-bold capitalize text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                  placeholder="Group"
                />
              ) : (
                <span className="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">
                  {section.stageGroupLabel || "Group"}
                </span>
              )}
            </div>
            {/* Spanning cells — one per contiguous run of same group (or null = ungrouped) */}
            {groupSpans.map((span, i) => {
              // Grid cols: label=1, stages start at 2
              const startCol = span.startIndex + 2;
              const endCol = startCol + span.count;
              return (
                <div
                  key={`span-${i}`}
                  style={{ gridColumn: `${startCol} / ${endCol}`, ...(span.group ? { backgroundColor: span.group.bgColor || "#E5E7EB", color: span.group.textColor || "#0F1724" } : {}) }}
                  className={span.group
                    ? "group/sg flex items-center justify-center rounded-md px-4 py-3"
                    : ""}
                >
                  {span.group && (
                    <>
                      <span className="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight">
                        {span.group.name}
                      </span>
                      {editMode && (
                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/sg:opacity-100">
                          <EditButton type="stage_group" id={span.group.id} onClick={onEditEntity} />
                          <DeleteButton type="stage_group" id={span.group.id} onConfirm={onDeleteEntity} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {/* Edit column — unassigned groups + add button in the last column */}
            {editMode && (() => {
              const assignedGroupIds = new Set(groupSpans.filter((s) => s.group).map((s) => s.group!.id));
              const unassigned = sectionStageGroups.filter((g) => !assignedGroupIds.has(g.id));
              return (
                <div style={{ gridColumn: sectionStages.length + 2 }} className="flex items-center gap-1.5">
                  {unassigned.map((g) => (
                    <div
                      key={g.id}
                      className="group/sg flex items-center gap-2 rounded-md border border-dashed px-4 py-3"
                      style={{ backgroundColor: g.bgColor || "#E5E7EB", color: g.textColor || "#0F1724", borderColor: g.textColor || "#0F1724" }}
                    >
                      <span className="whitespace-nowrap text-[14px] font-bold leading-tight">
                        {g.name}
                      </span>
                      <div className="flex shrink-0 gap-0.5">
                        <EditButton type="stage_group" id={g.id} onClick={onEditEntity} />
                        <DeleteButton type="stage_group" id={g.id} onConfirm={onDeleteEntity} />
                      </div>
                    </div>
                  ))}
                  <AddButton type="stage_group" label="Stage" parentId={section.id} onClick={onEditEntity} />
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Stage headers ── */}
        <div style={{ display: "contents" }}>
          <div className="flex items-center justify-end pr-2">
            {editMode ? (
              <input
                type="text"
                value={section.stageLabel ?? "Stage"}
                onChange={(e) => onUpdateSection?.(section.id, { stageLabel: e.target.value })}
                className="w-full rounded-md border border-neutral-gray-200 bg-white px-2 py-1 text-[14px] font-bold capitalize text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                placeholder="Stage"
              />
            ) : (
              <span className="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">
                {section.stageLabel || "Stage"}
              </span>
            )}
          </div>
          {sectionStages.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center justify-center rounded-md px-4 py-3 ${editingEntityId === s.id ? "ring-2 ring-brand-cyan-500" : ""}`}
              style={{ backgroundColor: s.bgColor || "#E5E7EB", color: s.textColor || "#0F1724" }}
              title={s.description ?? undefined}
            >
              <span className="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight">
                {s.name}
              </span>
              {editMode && (
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <EditButton type="stage" id={s.id} onClick={onEditEntity} />
                  <DeleteButton type="stage" id={s.id} onConfirm={onDeleteEntity} />
                </div>
              )}
            </div>
          ))}
          {editMode && (
            <div className="flex items-center">
              <AddButton type="stage" label="Stage" parentId={section.id} onClick={onEditEntity} />
            </div>
          )}
        </div>

        {/* ── Section items in merged order (orphan swimlanes + phase groups) ── */}
        {sectionItems.map((item) => {
          if (item.kind === "swimlane") {
            // Section-level orphan swimlane — draggable among section items
            const dragProps: DragRowProps | undefined = editMode && !groupDragSl
              ? {
                  isDragTarget: sectionDragOverId === item.id,
                  onDragStart: (e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.id);
                    setSectionDragId(item.id);
                  },
                  onDragOver: (e) => {
                    e.preventDefault();
                    if (sectionDragId) setSectionDragOverId(item.id);
                  },
                  onDrop: () => handleSectionDrop(item.id),
                  onDragLeave: () => setSectionDragOverId((prev) => prev === item.id ? null : prev),
                  onDragEnd: () => { setSectionDragId(null); setSectionDragOverId(null); },
                }
              : undefined;
            return renderSwimlane(item.swimlane, dragProps, justMovedId === item.id);
          }

          // Phase group — draggable as a whole among section items;
          // swimlanes within the group are independently reorderable.
          const groupSwimlanes  = byGroup.get(item.id) ?? [];
          const isGroupDragTarget = editMode && !!sectionDragId && sectionDragOverId === item.id;
          const isGroupJustMoved  = justMovedId === item.id;

          return (
            <React.Fragment key={item.id}>
              {/* PhaseRow */}
              <div style={{ display: "contents" }}>
                {/* Column-1 label — drag handle for the whole group */}
                <div
                  style={{ gridColumn: 1 }}
                  className={[
                    "flex items-center justify-end gap-1 pr-2 pt-3 rounded-md transition-all duration-700",
                    isGroupDragTarget ? "border-b-2 border-brand-cyan-500" : "",
                    isGroupJustMoved  ? "ring-2 ring-brand-cyan-400 bg-brand-cyan-50/60" : "",
                  ].join(" ")}
                  onDragOver={editMode && sectionDragId ? (e) => { e.preventDefault(); setSectionDragOverId(item.id); } : undefined}
                  onDrop={editMode ? () => handleSectionDrop(item.id) : undefined}
                  onDragLeave={editMode ? () => setSectionDragOverId((prev) => prev === item.id ? null : prev) : undefined}
                >
                  {editMode && (
                    <GripHandle
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", item.id);
                        setSectionDragId(item.id);
                      }}
                      onDragEnd={() => { setSectionDragId(null); setSectionDragOverId(null); }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onTogglePhaseGroupCollapse(item.id)}
                    className="flex shrink-0 items-center justify-center rounded p-0.5 text-neutral-gray-500 hover:bg-neutral-gray-100 hover:text-brand-navy-1000"
                    aria-label={collapsedPhaseGroups.has(item.id) ? "Expand phase group" : "Collapse phase group"}
                    title={collapsedPhaseGroups.has(item.id) ? "Expand phase group" : "Collapse phase group"}
                  >
                    <Chevron open={!collapsedPhaseGroups.has(item.id)} size={14} />
                  </button>
                  {editMode ? (
                    <>
                      <input
                        type="text"
                        value={item.phases[0]?.groupLabel ?? "Phase"}
                        onChange={(e) => onUpdatePhaseGroupLabel?.(item.id, e.target.value, item.phases)}
                        className="w-full rounded-md border border-neutral-gray-200 bg-white px-2 py-1 text-[14px] font-bold capitalize text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                        placeholder="Phase"
                      />
                      <div className="flex shrink-0 gap-0.5">
                        <EditButton type="phase" id={item.phases[0]?.id ?? item.id} onClick={onEditEntity} />
                        <DeleteButton type="phase" id={item.phases[0]?.id ?? item.id} onConfirm={(type, _id) => {
                          // Delete all phases in the group
                          for (const p of item.phases) {
                            onDeleteEntity(type, p.id);
                          }
                        }} />
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTogglePhaseGroupCollapse(item.id)}
                      className="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000 hover:text-brand-cyan-700 cursor-pointer bg-transparent border-none p-0"
                    >
                      {item.phases[0]?.groupLabel || "Phase"}
                    </button>
                  )}
                </div>

                {!collapsedPhaseGroups.has(item.id) && sectionStages.map((s) => {
                  const stagePhases = item.phases.filter((p) => p.stageId === s.id);
                  return (
                    <div key={s.id} className="flex items-stretch gap-1.5 pt-3">
                      {stagePhases.map((phase) => (
                        <div
                          key={phase.id}
                          style={{ flex: "0 0 auto", minWidth: phaseMinWidths.get(phase.id) ?? CARD_W, backgroundColor: phase.bgColor || "#0F1724", color: phase.textColor || "#FFFFFF" }}
                          className={`group flex items-center justify-center rounded-md px-4 py-3 ${editingEntityId === phase.id ? "ring-2 ring-brand-cyan-500" : ""}`}
                          title={phase.description ?? undefined}
                        >
                          <span className="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight">
                            {phase.name}
                          </span>
                          {editMode && (
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <EditButton type="phase" id={phase.id} onClick={onEditEntity} />
                              <DeleteButton type="phase" id={phase.id} onConfirm={onDeleteEntity} />
                            </div>
                          )}
                        </div>
                      ))}
                      {stagePhases.length === 0 && !editMode && <div />}
                      {editMode && (
                        <AddButton type="phase" label="Phase" parentId={`${s.id}:${item.id}`} onClick={onEditEntity} />
                      )}
                    </div>
                  );
                })}
                {!collapsedPhaseGroups.has(item.id) && editMode && <div />}
                {collapsedPhaseGroups.has(item.id) && (
                  <div
                    style={{ gridColumn: `2 / ${totalCols + 1}` }}
                    className="flex items-center pt-3 text-[12px] text-neutral-gray-400 italic"
                  >
                    {item.phases.length} phase{item.phases.length !== 1 ? "s" : ""}, {groupSwimlanes.length} swimlane{groupSwimlanes.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Swimlanes within this group — reorderable among each other */}
              {!collapsedPhaseGroups.has(item.id) && groupSwimlanes.map((sl) => {
                const isJustMovedSl = justMovedId === sl.id;
                const dragProps: DragRowProps | undefined = editMode && !sectionDragId
                  ? {
                      isDragTarget: groupDragOverSlId === sl.id,
                      onDragStart: (e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", sl.id);
                        setGroupDragSl({ gid: item.id, slId: sl.id });
                      },
                      onDragOver: (e) => {
                        e.preventDefault();
                        if (groupDragSl?.gid === item.id) setGroupDragOverSlId(sl.id);
                      },
                      onDrop: () => handleGroupSwimlaneDrop(item.id, sl.id),
                      onDragLeave: () => setGroupDragOverSlId((prev) => prev === sl.id ? null : prev),
                      onDragEnd: () => { setGroupDragSl(null); setGroupDragOverSlId(null); },
                    }
                  : undefined;
                return renderSwimlane(sl, dragProps, isJustMovedSl);
              })}

              {/* + Swimlane */}
              {!collapsedPhaseGroups.has(item.id) && editMode && (
                <div style={{ gridColumn: `1 / ${totalCols + 1}` }} className="pt-1">
                  <AddButton type="swimlane" label="Swimlane" parentId={`${section.id}:${item.id}`} onClick={onEditEntity} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* + Add Phase Group / Swimlane */}
        {editMode && (
          <div style={{ gridColumn: `1 / ${totalCols + 1}` }} className="flex gap-2 pt-3">
            <AddButton type="phase" label="Phase Group" parentId={sectionStages[0]?.id ?? ""} onClick={onEditEntity} />
            <AddButton type="swimlane" label="Swimlane" parentId={section.id} onClick={onEditEntity} />
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MomentsGridRow — a "moments" swimlane as a display:contents grid row
// ---------------------------------------------------------------------------
function MomentsGridRow({
  swimlane,
  gridColumns,
  touchpoints,
  callouts,
  touchpointMedia,
  editMode,
  isJustMoved,
  onEditEntity,
  onDeleteEntity,
  onToggleCollapse,
  dragProps,
  groupPhases,
  phaseMinWidths,
  editingEntityId,
  rowHasTouchpoints,
  stages,
}: {
  swimlane: Swimlane;
  gridColumns: GridColumn[];
  touchpoints: Touchpoint[];
  callouts: Callout[];
  touchpointMedia: Record<string, Media>;
  editMode: boolean;
  isJustMoved?: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onToggleCollapse: () => void;
  dragProps?: DragRowProps;
  /** Phases belonging to this swimlane's phase group, sorted by order. When provided,
   *  each stage cell is subdivided into per-phase sub-cells. */
  groupPhases?: Phase[];
  /** Per-phase minimum pixel widths — must match the phase header row so pills and sub-cells align. */
  phaseMinWidths?: Map<string, number>;
  editingEntityId?: string | null;
  /** True if any column in this swimlane row has at least one touchpoint. */
  rowHasTouchpoints: boolean;
  /** Stage list used to label callout groups in the callout strip. */
  stages: JourneyStage[];
}) {
  return (
    <div style={{ display: "contents" }} data-sl-row={swimlane.id}>
      <div
        className={[
          "group flex items-start justify-end gap-1 pr-2 pt-3 rounded-md transition-all duration-700",
          dragProps?.isDragTarget ? "border-b-2 border-brand-cyan-500" : "",
          isJustMoved ? "ring-2 ring-brand-cyan-400 bg-brand-cyan-50/60" : "",
          editingEntityId === swimlane.id ? "ring-2 ring-brand-cyan-500" : "",
        ].join(" ")}
        style={{ gridColumn: 1 }}
        onDragOver={dragProps?.onDragOver}
        onDrop={dragProps ? () => dragProps.onDrop() : undefined}
        onDragLeave={dragProps?.onDragLeave}
      >
        {dragProps && (
          <GripHandle onDragStart={dragProps.onDragStart} onDragEnd={dragProps.onDragEnd} />
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          data-collapse-for={swimlane.id}
          title={`Collapse ${swimlane.name}`}
          className="flex flex-1 items-start justify-end gap-1 rounded text-right transition-opacity hover:opacity-70"
        >
          <span className="mt-0.5 text-neutral-gray-500"><Chevron open size={10} /></span>
          <span className="text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">
            {swimlane.name}
          </span>
        </button>
        {editMode && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <EditButton type="swimlane" id={swimlane.id} onClick={onEditEntity} />
            <DeleteButton type="swimlane" id={swimlane.id} onConfirm={onDeleteEntity} />
          </div>
        )}
      </div>
      {gridColumns.map((col, i) => {
        // Phase-group swimlane: subdivide this stage cell into per-phase sub-cells,
        // matching the layout of the phase header row above.
        const stagePhases = groupPhases?.filter((p) => p.stageId === col.stageId);

        if (stagePhases && stagePhases.length > 0) {
          // Collect all touchpoints across phases into one flat row
          const allPhaseTouchpoints = stagePhases.flatMap((phase) =>
            touchpointsForColumn(touchpoints, swimlane.id, col, phase.id),
          );

          return (
            <div key={i} data-sl-cell={swimlane.id} className="flex min-w-0 flex-col gap-2 pt-2">
              {/* Touchpoints — grouped by phase, + button after each phase's last touchpoint */}
              <div className="flex items-stretch justify-center gap-2 overflow-visible">
                {stagePhases.map((phase) => {
                  const phaseTps = touchpointsForColumn(touchpoints, swimlane.id, col, phase.id);
                  return (
                    <React.Fragment key={phase.id}>
                      {phaseTps.map((tp) => (
                        <div key={tp.id} className="w-[176px] shrink-0 overflow-visible [&:hover]:z-20">
                          <TouchpointCard
                            tp={tp}
                            override={touchpointMedia[tp.id]}
                            editMode={editMode}
                            onEditEntity={onEditEntity}
                            onDeleteEntity={onDeleteEntity}
                          />
                        </div>
                      ))}
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => onEditEntity({ type: "touchpoint", id: `new_touchpoint_${Date.now().toString(36)}`, parentId: `${col.stageId}:${swimlane.id}:${phase.id}`, isNew: true })}
                          title={`Add touchpoint to ${phase.name}`}
                          className="flex min-h-[80px] w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-brand-cyan-500/40 bg-brand-cyan-500/5 text-lg font-bold text-brand-cyan-500 transition hover:border-brand-cyan-500 hover:bg-brand-cyan-500/10"
                        >
                          +
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
                {allPhaseTouchpoints.length === 0 && !editMode && rowHasTouchpoints && (
                  <div className="min-h-[60px]" />
                )}
              </div>
              {editMode && (
                <AddButton
                  type="callout"
                  label="Callout"
                  parentId={`${col.stageId}:${swimlane.id}`}
                  onClick={onEditEntity}
                />
              )}
            </div>
          );
        }

        // Phase-group swimlane but no phases exist for this stage → empty cell
        if (groupPhases) {
          return <div key={i} data-sl-cell={swimlane.id} className="pt-2" />;
        }

        // Orphan swimlane: single cell, no phase filter
        {
          const colTouchpoints = touchpointsForColumn(touchpoints, swimlane.id, col, undefined);
          return (
            <div key={i} data-sl-cell={swimlane.id} className="flex flex-col gap-2 overflow-visible pt-2">
              {/* Touchpoints row with inline + button */}
              <div className="flex items-stretch justify-center gap-2 overflow-visible">
                {colTouchpoints.map((tp) => (
                  <div key={tp.id} className="w-[176px] shrink-0 overflow-visible [&:hover]:z-20">
                    <TouchpointCard
                      tp={tp}
                      override={touchpointMedia[tp.id]}
                      editMode={editMode}
                      onEditEntity={onEditEntity}
                      onDeleteEntity={onDeleteEntity}
                    />
                  </div>
                ))}
                {editMode && (
                  <button
                    type="button"
                    onClick={() => onEditEntity({ type: "touchpoint", id: `new_touchpoint_${Date.now().toString(36)}`, parentId: `${col.stageId}:${swimlane.id}:`, isNew: true })}
                    title="Add touchpoint"
                    className="flex h-full min-h-[80px] w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-brand-cyan-500/40 bg-brand-cyan-500/5 text-lg font-bold text-brand-cyan-500 transition hover:border-brand-cyan-500 hover:bg-brand-cyan-500/10"
                  >
                    +
                  </button>
                )}
                {colTouchpoints.length === 0 && !editMode && rowHasTouchpoints && (
                  <div className="min-h-[60px]" />
                )}
              </div>
              {editMode && (
                <AddButton
                  type="callout"
                  label="Callout"
                  parentId={`${col.stageId}:${swimlane.id}`}
                  onClick={onEditEntity}
                />
              )}
            </div>
          );
        }
      })}

      {/* ── Unified callout strip ─────────────────────────────────────────────
          Uses CSS subgrid so each stage group is pinned directly under its
          stage column(s). Every badge is w-[220px]; narrow columns overflow
          with overflow-visible which is fine. */}
      {(() => {
        const swimlaneCallouts = callouts.filter((c) => c.swimlaneId === swimlane.id);
        if (swimlaneCallouts.length === 0) return null;

        // Build per-stage metadata: name + how many grid columns it spans
        const stageNameMap = new Map(stages.map((s) => [s.id, s.name]));
        const seenStages = new Set<string>();
        const stageOrder: Array<{ stageId: string; span: number }> = [];
        for (const col of gridColumns) {
          if (!seenStages.has(col.stageId)) {
            seenStages.add(col.stageId);
            stageOrder.push({ stageId: col.stageId, span: 1 });
          } else {
            stageOrder[stageOrder.length - 1].span++;
          }
        }

        return (
          <div
            data-sl-cell={swimlane.id}
            style={{
              gridColumn: `2 / ${gridColumns.length + 2}`,
              display: "grid",
              gridTemplateColumns: "subgrid",
              alignItems: "start",
            }}
            className="pb-3 pt-1"
          >
            {stageOrder.map(({ stageId, span }) => {
              const items = swimlaneCallouts
                .filter((c) => c.stageId === stageId)
                .sort((a, b) => a.order - b.order);

              // Always render a placeholder cell to keep subgrid columns aligned
              if (items.length === 0) {
                return <div key={stageId} style={{ gridColumn: `span ${span}` }} />;
              }

              return (
                <div
                  key={stageId}
                  style={{ gridColumn: `span ${span}`, contain: "inline-size" }}
                  className="flex flex-col items-center gap-1.5 overflow-visible"
                >
                  {items[0]?.showStageTitle !== false && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-gray-400">
                      {stageNameMap.get(stageId)}
                    </span>
                  )}
                  <div className="flex flex-row flex-wrap justify-center gap-2 overflow-visible">
                    {items.map((c) => (
                      <CalloutBadge
                        key={c.id}
                        callout={c}
                        editMode={editMode}
                        onEditEntity={onEditEntity}
                        onDeleteEntity={onDeleteEntity}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MotivationMapGridRow — motivation curve as a display:contents grid row
// ---------------------------------------------------------------------------
function MotivationMapGridRow({
  swimlane,
  gridColumns,
  meta,
  editMode,
  isJustMoved,
  onToggleCollapse,
  onDragMotivationPoint,
  onEditMotivationPoint,
  onAddMotivationPoint,
  onEditEntity,
  onDeleteEntity,
  dragProps,
  editingEntityId,
}: {
  swimlane: Swimlane;
  gridColumns: GridColumn[];
  meta: MotivationMapData | undefined;
  editMode?: boolean;
  isJustMoved?: boolean;
  onToggleCollapse: () => void;
  onDragMotivationPoint?: (index: number, x: number, score: number) => void;
  onEditMotivationPoint?: (index: number) => void;
  onAddMotivationPoint?: (x: number, score: number) => void;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  dragProps?: DragRowProps;
  editingEntityId?: string | null;
}) {
  const title = meta?.title || swimlane.name;

  return (
    <>
      {/* Chart row */}
      <div style={{ display: "contents" }} data-sl-row={swimlane.id}>
        {/* Label */}
        <div
          className={[
            "group relative pr-2 pt-3 rounded-md transition-all duration-700",
            dragProps?.isDragTarget ? "border-b-2 border-brand-cyan-500" : "",
            isJustMoved ? "ring-2 ring-brand-cyan-400 bg-brand-cyan-50/60" : "",
            editingEntityId === swimlane.id ? "ring-2 ring-brand-cyan-500" : "",
          ].join(" ")}
          style={{ gridColumn: 1 }}
          onDragOver={dragProps?.onDragOver}
          onDrop={dragProps ? () => dragProps.onDrop() : undefined}
          onDragLeave={dragProps?.onDragLeave}
        >
          {/* Grip + collapse button */}
          <div className="flex items-start justify-end gap-1">
            {dragProps && (
              <GripHandle onDragStart={dragProps.onDragStart} onDragEnd={dragProps.onDragEnd} />
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              data-collapse-for={swimlane.id}
              title={`Collapse ${swimlane.name}`}
              className="flex items-start justify-end gap-1 rounded text-right transition-opacity hover:opacity-70"
            >
              <span className="mt-0.5 text-neutral-gray-500"><Chevron open size={10} /></span>
              <span className="text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">
                {title}
              </span>
            </button>
            {editMode && (
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <EditButton type="swimlane" id={swimlane.id} onClick={onEditEntity} />
                <DeleteButton type="swimlane" id={swimlane.id} onConfirm={onDeleteEntity} />
              </div>
            )}
          </div>
        </div>

        {/* SVG spanning all columns */}
        <div
          data-sl-cell={swimlane.id}
          style={{ gridColumn: `span ${gridColumns.length}` }}
          className="min-w-0 pt-2"
        >
          <MotivationMap
            points={meta?.points ?? []}
            editMode={editMode}
            onDragPoint={onDragMotivationPoint}
            onEditPoint={onEditMotivationPoint}
            onAddPoint={onAddMotivationPoint}
            swimlaneId={swimlane.id}
          />
        </div>
      </div>

      {/* Meta tiles row (if any) */}
      {(meta?.drivers || meta?.triggers || meta?.insights) && (
        <div style={{ display: "contents" }}>
          <div style={{ gridColumn: 1 }} />
          <div
            style={{ gridColumn: `span ${gridColumns.length}` }}
            className="grid min-w-0 grid-cols-1 gap-2 pb-2 sm:grid-cols-3"
          >
            {meta?.drivers  && <MetaTile label="Key drivers"        value={meta.drivers}  />}
            {meta?.triggers && <MetaTile label="Emotional triggers" value={meta.triggers} />}
            {meta?.insights && <MetaTile label="Key insights"       value={meta.insights} />}
          </div>
        </div>
      )}
    </>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-gray-200 bg-neutral-gray-50 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-cyan-500">
        {label}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-neutral-gray-700">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlueprintCanvas
// ---------------------------------------------------------------------------
export function BlueprintCanvas({
  blueprint,
  touchpointMedia,
  collapsedSwimlanes,
  collapsedSections,
  collapsedPhaseGroups,
  editMode,
  onEditEntity,
  onDeleteEntity,
  onUpdateMotivationMap,
  onAddMotivationMap,
  onUpdateSection,
  onUpdatePhaseGroupLabel,
  onReorderRows,
  onToggleCollapse,
  onToggleSectionCollapse,
  onTogglePhaseGroupCollapse,
  editingEntityId,
}: Props) {
  const { sections } = blueprint;

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );

  return (
    <div className="flex w-max min-w-full flex-col gap-4">
      {/* Section cards */}
      {sortedSections.map((section) => {
        const sectionStages = stagesForSection(blueprint, section.id);
        if (sectionStages.length === 0 && !editMode) return null;
        if (sectionStages.length === 0 && editMode) {
          // New/empty section — render a placeholder so the user can add stages
          return (
            <section
              key={section.id}
              className={`w-max min-w-full rounded-2xl bg-white p-4 shadow-sm ${editingEntityId === section.id ? "ring-2 ring-brand-cyan-500" : "ring-1 ring-neutral-gray-100"}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSectionCollapse(section.id)}
                  className="flex shrink-0 items-center justify-center rounded p-0.5 text-neutral-gray-500 hover:bg-neutral-gray-100 hover:text-brand-navy-1000"
                >
                  <Chevron open={!collapsedSections.has(section.id)} size={14} />
                </button>
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => onUpdateSection?.(section.id, { name: e.target.value })}
                  className="rounded-md border border-neutral-gray-200 bg-white px-3 py-1 text-lg font-bold text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                  placeholder="Section name"
                />
                <DeleteButton type="section" id={section.id} onConfirm={onDeleteEntity} />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-gray-300 bg-neutral-gray-50 px-4 py-6 text-sm text-neutral-gray-500">
                <span>This section has no stages yet.</span>
                <AddButton type="stage" label="Stage" parentId={section.id} onClick={onEditEntity} />
              </div>
            </section>
          );
        }
        return (
          <SectionCard
            key={section.id}
            section={section}
            sectionStages={sectionStages}
            blueprint={blueprint}
            touchpointMedia={touchpointMedia}
            collapsedSwimlanes={collapsedSwimlanes}
            collapsed={collapsedSections.has(section.id)}
            collapsedPhaseGroups={collapsedPhaseGroups}
            editMode={editMode}
            onEditEntity={onEditEntity}
            onDeleteEntity={onDeleteEntity}
            onUpdateMotivationMap={onUpdateMotivationMap}
            onAddMotivationMap={onAddMotivationMap}
            onUpdateSection={onUpdateSection}
            onUpdatePhaseGroupLabel={onUpdatePhaseGroupLabel}
            onReorderRows={onReorderRows}
            onToggleCollapse={onToggleCollapse}
            onToggleSectionCollapse={onToggleSectionCollapse}
            onTogglePhaseGroupCollapse={onTogglePhaseGroupCollapse}
            editingEntityId={editingEntityId}
          />
        );
      })}

      {/* + Section */}
      {editMode && (
        <AddButton type="section" label="Section" onClick={onEditEntity} />
      )}

    </div>
  );
}
