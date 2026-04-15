// Shared grid metrics so every row (section header, stage header, swimlane,
// insights) lines up column-by-column. Constants in pixels.
//
// A "grid column" is either a phase (if the stage has phases) or a bare stage
// (if it has none). Stages with N phases span N columns; stages with 0 phases
// get 1 column. This lets phases lay out horizontally with the stage header
// stretching above them.

import type { Section, JourneyStage, Phase } from "../types/blueprint";

export const LABEL_COL_W = 190;
export const MIN_COL_W = 180;
export const COL_GAP = 14;
/** Horizontal padding on section cards (mirrors `sm:px-10`). */
export const SECTION_PADDING_X = 40;

// ---------------------------------------------------------------------------
// GridColumn — one logical column in the blueprint grid
// ---------------------------------------------------------------------------

export interface GridColumn {
  /** The stage this column belongs to. */
  stageId: string;
  /** The phase this column represents, or null for a phaseless stage. */
  phase: Phase | null;
}

/**
 * Build the list of grid columns for a set of stages + phases.
 * Each stage contributes max(1, phases.length) columns.
 */
export function buildGridColumns(
  stages: JourneyStage[],
  phasesByStage: Map<string, Phase[]>,
): GridColumn[] {
  const cols: GridColumn[] = [];
  for (const stage of stages) {
    const phases = phasesByStage.get(stage.id);
    if (phases && phases.length > 0) {
      for (const phase of phases) {
        cols.push({ stageId: stage.id, phase });
      }
    } else {
      cols.push({ stageId: stage.id, phase: null });
    }
  }
  return cols;
}

/**
 * How many grid columns a stage spans (= number of phases, or 1 if none).
 */
export function stageSpan(phasesByStage: Map<string, Phase[]>, stageId: string): number {
  const phases = phasesByStage.get(stageId);
  return phases && phases.length > 0 ? phases.length : 1;
}

// ---------------------------------------------------------------------------
// Grid CSS
// ---------------------------------------------------------------------------

export function gridTemplateFor(colCount: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `${LABEL_COL_W}px repeat(${colCount}, minmax(${MIN_COL_W}px, max-content))`,
    gap: `${COL_GAP}px`,
  };
}

/**
 * Minimum width for a grid with the given number of content columns.
 */
export function minWidthFor(colCount: number): number {
  return (
    LABEL_COL_W +
    colCount * MIN_COL_W +
    colCount * COL_GAP +
    2 * SECTION_PADDING_X
  );
}

// ---------------------------------------------------------------------------
// Section-aware helpers
// ---------------------------------------------------------------------------

export interface SectionSpan {
  section: Section;
  stageCount: number;
}

export function sectionSpans(
  sections: Section[],
  stages: JourneyStage[],
): SectionSpan[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  return sorted.map((section) => ({
    section,
    stageCount: stages.filter((s) => s.sectionId === section.id).length,
  })).filter((s) => s.stageCount > 0);
}
