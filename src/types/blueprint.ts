// New hierarchical domain model for the blueprint editor.
//
// Hierarchy: Blueprint > Section > JourneyStage > Phase > Swimlane > Touchpoint
//
// Excel structure is 8 sheets:
//   1. Sections         -> Section[]
//   2. Journey Stages   -> JourneyStage[]
//   3. Phases           -> Phase[]
//   4. Swimlanes        -> Swimlane[]
//   5. Touchpoints      -> Touchpoint[]
//   6. Callouts         -> Callout[]
//   7. Insights         -> Insight[]
//   8. Motivation Maps  -> MotivationMap[]

// ---------------------------------------------------------------------------
// Section — top-level grouping of stages (e.g. "Pre-Purchase", "Onboarding")
// ---------------------------------------------------------------------------
export interface Section {
  id: string;
  name: string;
  description?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// JourneyStage — a discrete phase of the customer journey within a section
// ---------------------------------------------------------------------------
export interface JourneyStage {
  id: string;
  name: string;
  sectionId: string;
  description?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Phase — sub-step within a stage (e.g. "Initial contact", "Follow-up")
// A stage may have zero or more phases. When phases exist, touchpoints
// reference phaseIds instead of stageId directly.
// ---------------------------------------------------------------------------
export interface Phase {
  id: string;
  name: string;
  stageId: string;
  /** Phases with the same groupId form a PhaseRow (one per stage). */
  groupId?: string;
  description?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Swimlane — horizontal row in the blueprint, either "moments" or
// "motivation_map"
// ---------------------------------------------------------------------------
export type SwimlaneType = "moments" | "motivation_map";

export interface Swimlane {
  id: string;
  name: string;
  type: SwimlaneType;
  sectionId: string;
  /** Phase this swimlane belongs to. Swimlanes render under their phase row. */
  phaseId?: string;
  description?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Touchpoint — specific interaction in a stage/phase + swimlane cell
// ---------------------------------------------------------------------------
export interface Touchpoint {
  id: string;
  name: string;
  channelType?: string;
  stageId: string;
  swimlaneId: string;
  /** Optional phase IDs (comma-separated in Excel). Empty = stage-level. */
  phaseIds: string[];
  description?: string;
  iconColor?: string;
  order: number;
  /** Optional Excel-provided image URL — overridden by per-touchpoint Media. */
  imageUrl?: string;
  /** Optional Excel-provided link — overridden by per-touchpoint Media. */
  linkUrl?: string;
  /** User-uploaded photos (data URLs or remote URLs). */
  photos: string[];
  /** Additional links beyond the primary linkUrl. */
  links: string[];
  /** Free-form notes added in the UI. */
  customNotes?: string;
  /** Hover card title — shown when hovering the touchpoint. */
  hoverTitle?: string;
  /** Hover card description — shown when hovering the touchpoint. */
  hoverDescription?: string;
}

// ---------------------------------------------------------------------------
// Callout — annotated highlight on a specific stage/phase/swimlane cell
// ---------------------------------------------------------------------------
export type CalloutType = "pain_point" | "opportunity" | "highlight" | "question" | "note";

export interface Callout {
  id: string;
  stageId: string;
  swimlaneId?: string;
  phaseIds: string[];
  type: CalloutType;
  title: string;
  description?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Insight — research finding / data point per stage
// ---------------------------------------------------------------------------
export interface Insight {
  id: string;
  stageId: string;
  title: string;
  text: string;
  dataPoint?: string;
  dataSource?: string;
  quote?: string;
}

// ---------------------------------------------------------------------------
// MotivationDataPoint — a single inflection point on the motivation curve
// ---------------------------------------------------------------------------
export interface MotivationDataPoint {
  score: number;
  title?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// MotivationMap — motivation curve data + metadata per motivation_map swimlane
// ---------------------------------------------------------------------------
export interface MotivationMap {
  id: string;
  swimlaneId: string;
  title?: string;
  /** Data points keyed by stageId or phaseId. Each value is an array of
   *  inflection points (score 0..1, with optional title + description).
   *  When a stage has phases, points should be keyed by phaseId; otherwise
   *  by stageId. Both are checked at lookup time. */
  stageScores: Record<string, MotivationDataPoint[]>;
  drivers?: string;
  triggers?: string;
  insights?: string;
  visual?: string;
}

// ---------------------------------------------------------------------------
// Blueprint — complete data structure
// ---------------------------------------------------------------------------
export interface Blueprint {
  sections: Section[];
  journeyStages: JourneyStage[];
  phases: Phase[];
  swimlanes: Swimlane[];
  touchpoints: Touchpoint[];
  callouts: Callout[];
  insights: Insight[];
  motivationMaps: MotivationMap[];
}

// ---------------------------------------------------------------------------
// Legacy compat — re-export old names so existing code keeps compiling
// while we migrate. The old BlueprintData and MotivationMapMeta are gone;
// components should import from this file.
// ---------------------------------------------------------------------------

/** @deprecated Use Blueprint instead */
export type BlueprintData = Blueprint;

/** @deprecated Use MotivationMap instead */
export type MotivationMapMeta = MotivationMap;
