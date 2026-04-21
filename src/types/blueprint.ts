// Hierarchical domain model for the blueprint editor.
//
// Hierarchy: Blueprint > Section > JourneyStage > Phase > Swimlane > Touchpoint
//
// Top-level collections on a Blueprint:
//   - sections, stageGroups, journeyStages, phases, swimlanes,
//     touchpoints, callouts, motivationMaps, sidebar

// ---------------------------------------------------------------------------
// Section — top-level grouping of stages (e.g. "Pre-Purchase", "Onboarding")
// ---------------------------------------------------------------------------
export interface Section {
  id: string;
  name: string;
  description?: string;
  /** Custom label for the stage row (defaults to "Stage"). */
  stageLabel?: string;
  /** Custom label for the stage group row (defaults to "Group"). */
  stageGroupLabel?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// StageGroup — optional label that clusters stages within a section
// (e.g. "Evaluate", "Buy", "Set Up" grouping multiple stage columns)
// ---------------------------------------------------------------------------
export interface StageGroup {
  id: string;
  name: string;
  sectionId: string;
  /** Custom background color for the stage group pill (CSS color string). */
  bgColor?: string;
  /** Custom text color for the stage group pill (CSS color string). */
  textColor?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// JourneyStage — a discrete phase of the customer journey within a section
// ---------------------------------------------------------------------------
export interface JourneyStage {
  id: string;
  name: string;
  sectionId: string;
  stageGroupId?: string;
  description?: string;
  /** Custom background color for the stage pill (CSS color string). */
  bgColor?: string;
  /** Custom text color for the stage pill (CSS color string). */
  textColor?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Phase — sub-step within a stage (e.g. "Initial contact", "Follow-up")
// A stage may have zero or more phases. When phases exist, touchpoints
// reference phaseId instead of stageId directly.
// ---------------------------------------------------------------------------
export interface Phase {
  id: string;
  name: string;
  stageId: string;
  /** Phases with the same groupId form a PhaseRow (one per stage). */
  groupId?: string;
  /** Custom label for the phase group row (defaults to "Phase"). Stored on all phases in the group. */
  groupLabel?: string;
  description?: string;
  /** Custom background color for the phase pill (CSS color string). */
  bgColor?: string;
  /** Custom text color for the phase pill (CSS color string). */
  textColor?: string;
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
  /** Phase this touchpoint belongs to. Undefined for orphan (stage-level) swimlane touchpoints. */
  phaseId?: string;
  description?: string;
  iconColor?: string;
  order: number;
  /** Optional default image URL — overridden by per-touchpoint Media. */
  imageUrl?: string;
  /** Optional default link — overridden by per-touchpoint Media. */
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
  /** CTA button label shown at the bottom of the card when a link is present. */
  ctaText?: string;
}

// ---------------------------------------------------------------------------
// Callout — annotated highlight on a specific stage/phase/swimlane cell
// ---------------------------------------------------------------------------
export type CalloutType = "pain_point" | "opportunity" | "highlight" | "question" | "note";

export interface Callout {
  id: string;
  stageId: string;
  swimlaneId?: string;
  /** Which phase sub-cells to display in. Empty / absent = span ALL phases in the stage. */
  phaseIds?: string[];
  type: CalloutType;
  /** Custom label overriding the default type name (e.g. "Pain Point"). */
  label?: string;
  title: string;
  description?: string;
  /** When true, the stage/phase title is shown as a header inside the badge. Defaults to false. */
  showStageTitle?: boolean;
  /** Custom background color for the callout badge (CSS color string). Overrides the type default. */
  bgColor?: string;
  /** Custom border color for the callout badge (CSS color string). Overrides the type default. */
  borderColor?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// MotivationDataPoint — a single inflection point on the motivation curve
// ---------------------------------------------------------------------------
export interface MotivationDataPoint {
  /** Vertical position: 0 = Low, 1 = High. */
  score: number;
  /** Horizontal position: 0–1 fraction of chart width (left to right). */
  x: number;
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
  /** Free-positioned inflection points. Rendered in x-sorted order. */
  points: MotivationDataPoint[];
  drivers?: string;
  triggers?: string;
  insights?: string;
  visual?: string;
}

// ---------------------------------------------------------------------------
// SidebarKeyItem — single entry in the Key legend
// ---------------------------------------------------------------------------
export interface SidebarKeyItem {
  label: string;
  /** Hex color string for the swatch fill. */
  bg: string;
  /** Hex color string for the swatch border. Empty string for no border. */
  border: string;
}

// ---------------------------------------------------------------------------
// SidebarConfig — editable sidebar content saved per-file
// ---------------------------------------------------------------------------
export interface SidebarConfig {
  /** Optional logo image (data URL or remote URL). Shown at top of sidebar. */
  logo?: string;
  /** Sidebar title (e.g. "Future Journey Map"). */
  title?: string;
  /** Intro paragraph — rich HTML (bold, italic, bullet lists). */
  intro?: string;
  /** How-to-use paragraph — rich HTML. */
  howToUse?: string;
  /** Key legend items. */
  keyItems?: SidebarKeyItem[];
}

// ---------------------------------------------------------------------------
// Blueprint — complete data structure
// ---------------------------------------------------------------------------
export interface Blueprint {
  sections: Section[];
  stageGroups: StageGroup[];
  journeyStages: JourneyStage[];
  phases: Phase[];
  swimlanes: Swimlane[];
  touchpoints: Touchpoint[];
  callouts: Callout[];
  motivationMaps: MotivationMap[];
  /** Sidebar content (title, intro, how-to-use, key legend, logo). */
  sidebar?: SidebarConfig;
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
