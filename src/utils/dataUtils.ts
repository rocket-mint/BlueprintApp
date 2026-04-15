// Data transformation and query utilities for the blueprint data model.

import type {
  Blueprint,
  Section,
  JourneyStage,
  Phase,
  Swimlane,
  Touchpoint,
  Callout,
  Insight,
  MotivationMap,
} from "../types/blueprint";

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get stages belonging to a section, sorted by order. */
export function stagesForSection(bp: Blueprint, sectionId: string): JourneyStage[] {
  return bp.journeyStages
    .filter((s) => s.sectionId === sectionId)
    .sort((a, b) => a.order - b.order);
}

/** Get phases belonging to a stage, sorted by order. */
export function phasesForStage(bp: Blueprint, stageId: string): Phase[] {
  return bp.phases
    .filter((p) => p.stageId === stageId)
    .sort((a, b) => a.order - b.order);
}

/** Get touchpoints for a given stage + swimlane, sorted by order. */
export function touchpointsForCell(
  bp: Blueprint,
  stageId: string,
  swimlaneId: string,
): Touchpoint[] {
  return bp.touchpoints
    .filter((t) => t.stageId === stageId && t.swimlaneId === swimlaneId)
    .sort((a, b) => a.order - b.order);
}

/** Get touchpoints for a specific phase + swimlane. */
export function touchpointsForPhase(
  bp: Blueprint,
  phaseId: string,
  swimlaneId: string,
): Touchpoint[] {
  return bp.touchpoints
    .filter((t) => t.phaseId === phaseId && t.swimlaneId === swimlaneId)
    .sort((a, b) => a.order - b.order);
}

/** Get callouts for a stage, optionally filtered by swimlane. */
export function calloutsForStage(
  bp: Blueprint,
  stageId: string,
  swimlaneId?: string,
): Callout[] {
  return bp.callouts
    .filter((c) => c.stageId === stageId && (!swimlaneId || c.swimlaneId === swimlaneId))
    .sort((a, b) => a.order - b.order);
}

/** Get insights for a stage. */
export function insightsForStage(bp: Blueprint, stageId: string): Insight[] {
  return bp.insights.filter((i) => i.stageId === stageId);
}

/** Get motivation map for a swimlane. */
export function motivationMapForSwimlane(
  bp: Blueprint,
  swimlaneId: string,
): MotivationMap | undefined {
  return bp.motivationMaps.find((m) => m.swimlaneId === swimlaneId);
}

/** Get all "moments" swimlanes. */
export function momentsSwimlanes(bp: Blueprint): Swimlane[] {
  return bp.swimlanes.filter((s) => s.type === "moments").sort((a, b) => a.order - b.order);
}

/** Get all "motivation_map" swimlanes. */
export function motivationMapSwimlanes(bp: Blueprint): Swimlane[] {
  return bp.swimlanes.filter((s) => s.type === "motivation_map").sort((a, b) => a.order - b.order);
}

/** Get all stages across all sections, in section order then stage order. */
export function allStagesOrdered(bp: Blueprint): JourneyStage[] {
  const sectionOrder = new Map(bp.sections.map((s) => [s.id, s.order]));
  return [...bp.journeyStages].sort((a, b) => {
    const sa = sectionOrder.get(a.sectionId) ?? 0;
    const sb = sectionOrder.get(b.sectionId) ?? 0;
    return sa !== sb ? sa - sb : a.order - b.order;
  });
}

// ---------------------------------------------------------------------------
// Lookup map builders
// ---------------------------------------------------------------------------

export function buildLookup<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

/** Build a case-insensitive lookup that maps both ID and name to the canonical ID. */
export function buildKeyLookup(items: Array<{ id: string; name: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id.toLowerCase(), item.id);
    map.set(item.name.toLowerCase(), item.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Motivation scores — compat bridge for MotivationMap component
// ---------------------------------------------------------------------------

/**
 * Convert the new MotivationMap.stageScores into the flat motivationScores
 * array that the existing MotivationMap SVG component expects on each stage.
 * Returns a new array of stages with motivationScores populated.
 */
export function stagesWithMotivationScores(
  stages: JourneyStage[],
  mm: MotivationMap | undefined,
): Array<JourneyStage & { motivationScores: number[] }> {
  return stages.map((s) => ({
    ...s,
    motivationScores: (mm?.stageScores[s.id] ?? [{ score: 0.33 }]).map((p) => p.score),
  }));
}

// ---------------------------------------------------------------------------
// Empty blueprint factory
// ---------------------------------------------------------------------------

export function createEmptyBlueprint(): Blueprint {
  return {
    sections: [],
    stageGroups: [],
    journeyStages: [],
    phases: [],
    swimlanes: [],
    touchpoints: [],
    callouts: [],
    insights: [],
    motivationMaps: [],
  };
}

// ---------------------------------------------------------------------------
// Entity finders
// ---------------------------------------------------------------------------

export function findSection(bp: Blueprint, id: string): Section | undefined {
  return bp.sections.find((s) => s.id === id);
}

export function findStage(bp: Blueprint, id: string): JourneyStage | undefined {
  return bp.journeyStages.find((s) => s.id === id);
}

export function findPhase(bp: Blueprint, id: string): Phase | undefined {
  return bp.phases.find((p) => p.id === id);
}

export function findSwimlane(bp: Blueprint, id: string): Swimlane | undefined {
  return bp.swimlanes.find((s) => s.id === id);
}

export function findTouchpoint(bp: Blueprint, id: string): Touchpoint | undefined {
  return bp.touchpoints.find((t) => t.id === id);
}
