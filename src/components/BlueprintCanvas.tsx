// BlueprintCanvas — top-level layout renderer.
//
// Each section is a standalone white card. Inside each card, ALL rows
// (stage headers, phase headers, swimlane rows, motivation map) share ONE
// CSS Grid so columns align and expand together.

import React, { useMemo } from "react";
import type {
  Blueprint,
  JourneyStage,
  Section,
  Touchpoint,
  Callout,
  Swimlane,
  MotivationMap as MotivationMapData,
} from "../types/blueprint";
import type { Media } from "./MediaModal";
import { SwimlaneCell } from "./SwimlaneCell";
import { MotivationMap, MM_LEVELS, MM_VIEW_H, MM_M } from "./MotivationMap";
import { InsightsSection } from "./InsightsSection";
import { EditButton, DeleteButton, AddButton } from "./EditControls";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import {
  gridTemplateFor,
  minWidthFor,
  type GridColumn,
} from "../lib/blueprintLayout";
import { stagesForSection } from "../utils/dataUtils";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MM_INNER_H = MM_VIEW_H - MM_M.top - MM_M.bottom;
function gridlineTopPercent(value: number): number {
  return ((MM_M.top + (1 - value) * MM_INNER_H) / MM_VIEW_H) * 100;
}

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

function touchpointsForColumn(
  touchpoints: Touchpoint[],
  swimlaneId: string,
  col: GridColumn,
  phaseId?: string,
): Touchpoint[] {
  const result: Touchpoint[] = [];
  for (const tp of touchpoints) {
    if (tp.swimlaneId !== swimlaneId || tp.stageId !== col.stageId) continue;
    // If swimlane belongs to a phase, only show touchpoints with that phaseId
    if (phaseId) {
      if (tp.phaseIds.includes(phaseId)) result.push(tp);
    } else {
      result.push(tp);
    }
  }
  return result.sort((a, b) => a.order - b.order);
}

function calloutsForColumn(
  callouts: Callout[],
  swimlaneId: string,
  col: GridColumn,
  phaseId?: string,
): Callout[] {
  const result: Callout[] = [];
  for (const c of callouts) {
    if (c.swimlaneId && c.swimlaneId !== swimlaneId) continue;
    if (c.stageId !== col.stageId) continue;
    if (phaseId) {
      if (c.phaseIds.length === 0 || c.phaseIds.includes(phaseId)) result.push(c);
    } else {
      result.push(c);
    }
  }
  return result.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  blueprint: Blueprint;
  stages: JourneyStage[];
  touchpointMedia: Record<string, Media>;
  collapsedSwimlanes: Set<string>;
  collapsedSections: Set<string>;
  editMode: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onUpdateMotivationMap?: (id: string, stageScores: MotivationMapData["stageScores"]) => void;
  onToggleCollapse: (id: string) => void;
  onToggleSectionCollapse: (id: string) => void;
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
  onToggleCollapse,
  onToggleSectionCollapse,
}: {
  section: Section;
  sectionStages: JourneyStage[];
  blueprint: Blueprint;
  touchpointMedia: Record<string, Media>;
  collapsedSwimlanes: Set<string>;
  collapsed: boolean;
  editMode: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onUpdateMotivationMap?: (id: string, stageScores: MotivationMapData["stageScores"]) => void;
  onToggleCollapse: (id: string) => void;
  onToggleSectionCollapse: (id: string) => void;
}) {
  // One grid column per stage
  const gridColumns = useMemo<GridColumn[]>(
    () => sectionStages.map((s) => ({ stageId: s.id, phase: null })),
    [sectionStages],
  );

  // When in edit mode, add one extra narrow column for the "+ Stage" button
  const gridColCount = editMode ? gridColumns.length + 1 : gridColumns.length;
  const grid: React.CSSProperties = editMode
    ? {
        display: "grid",
        gridTemplateColumns: `150px repeat(${gridColumns.length}, minmax(180px, max-content)) auto`,
        gap: "14px",
      }
    : gridTemplateFor(gridColumns.length);
  const sectionMinWidth = minWidthFor(gridColumns.length);
  const totalCols = gridColCount + 1;

  // All swimlanes in order (moments + motivation_map mixed together)
  const swimlanes = blueprint.swimlanes
    .filter((s) => s.sectionId === section.id)
    .sort((a, b) => a.order - b.order);

  // Motivation map lookup
  const motivationMapByLane = useMemo(() => {
    const m = new Map<string, MotivationMapData>();
    for (const mm of blueprint.motivationMaps) m.set(mm.swimlaneId, mm);
    return m;
  }, [blueprint.motivationMaps]);

  // ── Collapsed ──
  if (collapsed) {
    return (
      <section className="rounded-[20px] bg-white shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">
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
      className="rounded-[20px] bg-white px-6 py-10 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)] sm:px-10 sm:py-12"
      style={{ minWidth: sectionMinWidth }}
    >
      {/* Section title */}
      <div className="group mb-8 flex items-start gap-3">
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
        {editMode && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <EditButton type="section" id={section.id} onClick={onEditEntity} />
            <DeleteButton type="section" id={section.id} onConfirm={onDeleteEntity} />
          </div>
        )}
      </div>

      {/* ══ Single grid ══ */}
      <div style={grid}>

        {/* ── Stage headers ── */}
        <div style={{ display: "contents" }}>
          <div className="flex items-center pr-2">
            <span className="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">
              Stage
            </span>
          </div>
          {sectionStages.map((s) => (
            <div
              key={s.id}
              className="group flex items-center justify-center rounded-md bg-neutral-gray-200 px-4 py-3"
              title={s.description ?? undefined}
            >
              <span className="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight text-brand-navy-1000">
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

        {/* ── PhaseGroups ── */}
        {(() => {
          // Group phases by groupId
          const sectionPhases = blueprint.phases
            .filter((p) => sectionStages.some((s) => s.id === p.stageId))
            .sort((a, b) => a.order - b.order);

          const groupIds = [...new Set(sectionPhases.map((p) => p.groupId ?? p.id))];

          // Group swimlanes by phaseId (which references groupId)
          const swimlanesByGroup = new Map<string, typeof swimlanes>();
          const orphanSwimlanes: typeof swimlanes = [];
          for (const sl of swimlanes) {
            if (sl.phaseId) {
              const arr = swimlanesByGroup.get(sl.phaseId) ?? [];
              arr.push(sl);
              swimlanesByGroup.set(sl.phaseId, arr);
            } else {
              orphanSwimlanes.push(sl);
            }
          }

          const renderSwimlane = (sl: Swimlane) => {
            const isCollapsed = collapsedSwimlanes.has(sl.id);
            if (isCollapsed) {
              return (
                <div key={sl.id} style={{ gridColumn: `1 / ${totalCols + 1}` }}>
                  <button
                    type="button"
                    onClick={() => onToggleCollapse(sl.id)}
                    title={`Expand ${sl.name}`}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl border border-neutral-gray-100 px-4 py-2 text-left text-neutral-gray-700 transition-colors hover:bg-neutral-gray-50"
                  >
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
                  onToggleCollapse={() => onToggleCollapse(sl.id)}
                  onUpdateMotivationScore={(colIndex, scoreIndex, newScore) => {
                    const mm = motivationMapByLane.get(sl.id);
                    if (!mm || !onUpdateMotivationMap) return;
                    const col = gridColumns[colIndex];
                    const key = col.phase?.id ?? col.stageId;
                    const scores = [...(mm.stageScores[key] ?? [{ score: 0.33 }])];
                    if (scoreIndex < scores.length) {
                      scores[scoreIndex] = { ...scores[scoreIndex], score: newScore };
                    }
                    onUpdateMotivationMap(mm.id, { ...mm.stageScores, [key]: scores });
                  }}
                  onEditMotivationPoint={(colIndex, scoreIndex) => {
                    const mm = motivationMapByLane.get(sl.id);
                    if (!mm) return;
                    const col = gridColumns[colIndex];
                    const key = col.phase?.id ?? col.stageId;
                    onEditEntity({ type: "motivation_point", id: mm.id, parentId: `${key}:${scoreIndex}` });
                  }}
                  onAddMotivationPoint={(colIndex, score) => {
                    const mm = motivationMapByLane.get(sl.id);
                    if (!mm) return;
                    const col = gridColumns[colIndex];
                    const key = col.phase?.id ?? col.stageId;
                    const existingCount = (mm.stageScores[key] ?? []).length;
                    onEditEntity({ type: "motivation_point", id: mm.id, parentId: `${key}:${existingCount}:${score}`, isNew: true });
                  }}
                />
              );
            }
            return (
              <MomentsGridRow
                key={sl.id}
                swimlane={sl}
                gridColumns={gridColumns}
                touchpoints={blueprint.touchpoints}
                callouts={blueprint.callouts}
                touchpointMedia={touchpointMedia}
                editMode={editMode}
                onEditEntity={onEditEntity}
                onDeleteEntity={onDeleteEntity}
                onToggleCollapse={() => onToggleCollapse(sl.id)}
              />
            );
          };

          return (
            <>
              {groupIds.map((gid) => {
                const groupPhases = sectionPhases.filter((p) => (p.groupId ?? p.id) === gid);
                const groupSwimlanes = swimlanesByGroup.get(gid) ?? [];

                return (
                  <React.Fragment key={gid}>
                    {/* PhaseRow — one cell per stage, aligned to grid columns */}
                    <div style={{ display: "contents" }}>
                      <div className="flex items-center pr-2 pt-3" style={{ gridColumn: 1 }}>
                        <span className="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">
                          Phase
                        </span>
                      </div>
                      {sectionStages.map((s) => {
                        const stagePhases = groupPhases.filter((p) => p.stageId === s.id);
                        return (
                          <div key={s.id} className="flex items-stretch gap-1.5 pt-3">
                            {stagePhases.map((phase) => (
                              <div
                                key={phase.id}
                                className="group flex flex-1 items-center justify-center rounded-md bg-brand-navy-900 px-4 py-3"
                                title={phase.description ?? undefined}
                              >
                                <span className="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight text-white">
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
                              <AddButton type="phase" label="Phase" parentId={`${s.id}:${gid}`} onClick={onEditEntity} />
                            )}
                          </div>
                        );
                      })}
                      {editMode && <div />}
                    </div>

                    {/* Swimlanes for this phase group */}
                    {groupSwimlanes.map((sl) => renderSwimlane(sl))}

                    {/* + Swimlane */}
                    {editMode && (
                      <div style={{ gridColumn: `1 / ${totalCols + 1}` }} className="pt-1">
                        <AddButton type="swimlane" label="Swimlane" parentId={`${section.id}:${gid}`} onClick={onEditEntity} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Orphan swimlanes (no phase group) */}
              {orphanSwimlanes.map((sl) => renderSwimlane(sl))}

              {/* + Add Phase Group */}
              {editMode && (
                <div style={{ gridColumn: `1 / ${totalCols + 1}` }} className="flex gap-2 pt-3">
                  <AddButton type="phase" label="Phase Group" parentId={section.id} onClick={onEditEntity} />
                </div>
              )}
            </>
          );
        })()}
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
  onEditEntity,
  onDeleteEntity,
  onToggleCollapse,
}: {
  swimlane: Swimlane;
  gridColumns: GridColumn[];
  touchpoints: Touchpoint[];
  callouts: Callout[];
  touchpointMedia: Record<string, Media>;
  editMode: boolean;
  onEditEntity: (entity: EditingEntity) => void;
  onDeleteEntity: (type: EditableEntityType, id: string) => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div style={{ display: "contents" }}>
      <div className="group flex items-start gap-1 pr-2 pt-3" style={{ gridColumn: 1 }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={`Collapse ${swimlane.name}`}
          className="flex flex-1 items-start gap-1 rounded text-left transition-opacity hover:opacity-70"
        >
          <span className="mt-0.5 text-neutral-gray-500"><Chevron open size={10} /></span>
          <span className="whitespace-nowrap text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">
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
      {gridColumns.map((col, i) => (
        <div key={i} className="flex flex-col gap-1 overflow-visible pt-2">
          <SwimlaneCell
            touchpoints={touchpointsForColumn(touchpoints, swimlane.id, col, swimlane.phaseId)}
            callouts={calloutsForColumn(callouts, swimlane.id, col, swimlane.phaseId)}
            touchpointMedia={touchpointMedia}
            editMode={editMode}
            onEditEntity={onEditEntity}
            onDeleteEntity={onDeleteEntity}
          />
          {editMode && (
            <div className="flex gap-1">
              <AddButton
                type="touchpoint"
                label="Touchpoint"
                parentId={`${col.stageId}:${swimlane.id}:${swimlane.phaseId ?? ""}`}
                onClick={onEditEntity}
              />
              <AddButton
                type="callout"
                label="Callout"
                parentId={col.stageId}
                onClick={onEditEntity}
              />
            </div>
          )}
        </div>
      ))}
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
  onToggleCollapse,
  onUpdateMotivationScore,
  onEditMotivationPoint,
  onAddMotivationPoint,
}: {
  swimlane: Swimlane;
  gridColumns: GridColumn[];
  meta: MotivationMapData | undefined;
  editMode?: boolean;
  onToggleCollapse: () => void;
  onUpdateMotivationScore?: (colIndex: number, scoreIndex: number, newScore: number) => void;
  onEditMotivationPoint?: (colIndex: number, scoreIndex: number) => void;
  onAddMotivationPoint?: (colIndex: number, score: number) => void;
}) {
  const title = meta?.title || swimlane.name;

  return (
    <>
      {/* Chart row */}
      <div style={{ display: "contents" }}>
        {/* Label + Y-axis labels */}
        <div className="relative pr-2 pt-3" style={{ gridColumn: 1 }}>
          {/* Title — aligned with other swimlane titles */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={`Collapse ${swimlane.name}`}
            className="mb-6 flex items-start gap-1 rounded text-left transition-opacity hover:opacity-70"
          >
            <span className="mt-0.5 text-neutral-gray-500"><Chevron open size={10} /></span>
            <span className="whitespace-nowrap text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">
              {title}
            </span>
          </button>
          {/* Y-axis labels — positioned relative to the chart */}
          {MM_LEVELS.map((lvl) => (
            <div
              key={lvl.label}
              className="pointer-events-none absolute right-2 -translate-y-1/2 text-right text-[9px] font-medium leading-tight text-neutral-gray-500"
              style={{
                top: `calc(${gridlineTopPercent(lvl.value)}% + 2.5rem)`,
                maxWidth: "calc(100% - 8px)",
              }}
            >
              {lvl.label}
            </div>
          ))}
        </div>

        {/* SVG spanning all columns */}
        <div
          style={{ gridColumn: `span ${gridColumns.length}` }}
          className="min-w-0 pt-2"
        >
          <MotivationMap
            columns={gridColumns}
            meta={meta}
            editMode={editMode}
            onUpdateScore={onUpdateMotivationScore}
            onEditPoint={onEditMotivationPoint}
            onAddPoint={onAddMotivationPoint}
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
            {meta?.drivers && <MetaTile label="Key drivers" value={meta.drivers} />}
            {meta?.triggers && <MetaTile label="Emotional triggers" value={meta.triggers} />}
            {meta?.insights && <MetaTile label="Key insights" value={meta.insights} />}
          </div>
        </div>
      )}
    </>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-gray-200 bg-neutral-gray-50 p-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-brand-cyan-500">
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
  stages,
  touchpointMedia,
  collapsedSwimlanes,
  collapsedSections,
  editMode,
  onEditEntity,
  onDeleteEntity,
  onUpdateMotivationMap,
  onToggleCollapse,
  onToggleSectionCollapse,
}: Props) {
  const { sections, insights } = blueprint;

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Section cards */}
      {sortedSections.map((section) => {
        const sectionStages = stagesForSection(blueprint, section.id);
        if (sectionStages.length === 0) return null;
        return (
          <SectionCard
            key={section.id}
            section={section}
            sectionStages={sectionStages}
            blueprint={blueprint}
            touchpointMedia={touchpointMedia}
            collapsedSwimlanes={collapsedSwimlanes}
            collapsed={collapsedSections.has(section.id)}
            editMode={editMode}
            onEditEntity={onEditEntity}
            onDeleteEntity={onDeleteEntity}
            onUpdateMotivationMap={onUpdateMotivationMap}
            onToggleCollapse={onToggleCollapse}
            onToggleSectionCollapse={onToggleSectionCollapse}
          />
        );
      })}

      {/* + Section */}
      {editMode && (
        <AddButton type="section" label="Section" onClick={onEditEntity} />
      )}

      {/* Insights — global, all stages */}
      <div style={{ minWidth: minWidthFor(stages.length) }}>
        <InsightsSection stages={stages} insights={insights} editMode={editMode} onEditEntity={onEditEntity} onDeleteEntity={onDeleteEntity} />
      </div>
    </div>
  );
}
