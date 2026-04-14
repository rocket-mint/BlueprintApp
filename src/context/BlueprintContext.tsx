import { createContext, useCallback, useMemo, useReducer, type ReactNode } from "react";
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
import type { Media } from "../components/MediaModal";
import { createEmptyBlueprint } from "../utils/dataUtils";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

/** Entity types that can be edited in the drawer. */
export type EditableEntityType = "section" | "stage" | "phase" | "swimlane" | "touchpoint" | "callout" | "insight" | "motivation_point";

/** Describes the entity currently open in the edit drawer. */
export interface EditingEntity {
  type: EditableEntityType;
  id: string;
  /** When adding a new entity, this provides the parent context. */
  parentId?: string;
  isNew?: boolean;
}

export interface BlueprintState {
  blueprint: Blueprint | null;
  fileName: string | null;
  touchpointMedia: Record<string, Media>;
  collapsedSwimlanes: Set<string>;
  collapsedSections: Set<string>;
  editingTouchpoint: Touchpoint | null;
  /** Whether the blueprint is in edit mode (shows pencil/add/delete buttons). */
  editMode: boolean;
  /** The entity currently being edited in the drawer, or null. */
  editingEntity: EditingEntity | null;
}

const initialState: BlueprintState = {
  blueprint: null,
  fileName: null,
  touchpointMedia: {},
  collapsedSwimlanes: new Set(),
  collapsedSections: new Set(),
  editingTouchpoint: null,
  editMode: false,
  editingEntity: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "LOAD_BLUEPRINT"; blueprint: Blueprint; fileName: string }
  | { type: "RESET" }
  // CRUD — sections
  | { type: "ADD_SECTION"; section: Section }
  | { type: "UPDATE_SECTION"; id: string; changes: Partial<Omit<Section, "id">> }
  | { type: "DELETE_SECTION"; id: string }
  // CRUD — stages
  | { type: "ADD_STAGE"; stage: JourneyStage }
  | { type: "UPDATE_STAGE"; id: string; changes: Partial<Omit<JourneyStage, "id">> }
  | { type: "DELETE_STAGE"; id: string }
  // CRUD — phases
  | { type: "ADD_PHASE"; phase: Phase }
  | { type: "UPDATE_PHASE"; id: string; changes: Partial<Omit<Phase, "id">> }
  | { type: "DELETE_PHASE"; id: string }
  // CRUD — swimlanes
  | { type: "ADD_SWIMLANE"; swimlane: Swimlane }
  | { type: "UPDATE_SWIMLANE"; id: string; changes: Partial<Omit<Swimlane, "id">> }
  | { type: "DELETE_SWIMLANE"; id: string }
  // CRUD — touchpoints
  | { type: "ADD_TOUCHPOINT"; touchpoint: Touchpoint }
  | { type: "UPDATE_TOUCHPOINT"; id: string; changes: Partial<Omit<Touchpoint, "id">> }
  | { type: "DELETE_TOUCHPOINT"; id: string }
  // CRUD — callouts
  | { type: "ADD_CALLOUT"; callout: Callout }
  | { type: "UPDATE_CALLOUT"; id: string; changes: Partial<Omit<Callout, "id">> }
  | { type: "DELETE_CALLOUT"; id: string }
  // CRUD — insights
  | { type: "ADD_INSIGHT"; insight: Insight }
  | { type: "UPDATE_INSIGHT"; id: string; changes: Partial<Omit<Insight, "id">> }
  | { type: "DELETE_INSIGHT"; id: string }
  // CRUD — motivation maps
  | { type: "ADD_MOTIVATION_MAP"; motivationMap: MotivationMap }
  | { type: "UPDATE_MOTIVATION_MAP"; id: string; changes: Partial<Omit<MotivationMap, "id">> }
  | { type: "DELETE_MOTIVATION_MAP"; id: string }
  // UI state
  | { type: "SET_TOUCHPOINT_MEDIA"; touchpointId: string; media: Media }
  | { type: "REMOVE_TOUCHPOINT_MEDIA"; touchpointId: string }
  | { type: "SET_EDITING_TOUCHPOINT"; touchpoint: Touchpoint | null }
  | { type: "TOGGLE_SWIMLANE_COLLAPSE"; id: string }
  | { type: "COLLAPSE_ALL_SWIMLANES" }
  | { type: "EXPAND_ALL_SWIMLANES" }
  | { type: "TOGGLE_SECTION_COLLAPSE"; id: string }
  | { type: "COLLAPSE_ALL_SECTIONS" }
  | { type: "EXPAND_ALL_SECTIONS" }
  // Edit mode
  | { type: "SET_EDIT_MODE"; on: boolean }
  | { type: "SET_EDITING_ENTITY"; entity: EditingEntity | null };

// ---------------------------------------------------------------------------
// Reducer helpers
// ---------------------------------------------------------------------------

function updateList<T extends { id: string }>(
  list: T[],
  id: string,
  changes: Partial<Omit<T, "id">>,
): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

function deleteFromList<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}

/** Ensure a blueprint exists; return a fresh empty one if null. */
function ensureBp(bp: Blueprint | null): Blueprint {
  return bp ?? createEmptyBlueprint();
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: BlueprintState, action: Action): BlueprintState {
  switch (action.type) {
    case "LOAD_BLUEPRINT":
      return {
        ...initialState,
        blueprint: action.blueprint,
        fileName: action.fileName,
      };

    case "RESET":
      return initialState;

    // --- Sections ---
    case "ADD_SECTION": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, sections: [...bp.sections, action.section] } };
    }
    case "UPDATE_SECTION": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, sections: updateList(bp.sections, action.id, action.changes) } };
    }
    case "DELETE_SECTION": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, sections: deleteFromList(bp.sections, action.id) } };
    }

    // --- Stages ---
    case "ADD_STAGE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, journeyStages: [...bp.journeyStages, action.stage] } };
    }
    case "UPDATE_STAGE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, journeyStages: updateList(bp.journeyStages, action.id, action.changes) } };
    }
    case "DELETE_STAGE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, journeyStages: deleteFromList(bp.journeyStages, action.id) } };
    }

    // --- Phases ---
    case "ADD_PHASE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, phases: [...bp.phases, action.phase] } };
    }
    case "UPDATE_PHASE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, phases: updateList(bp.phases, action.id, action.changes) } };
    }
    case "DELETE_PHASE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, phases: deleteFromList(bp.phases, action.id) } };
    }

    // --- Swimlanes ---
    case "ADD_SWIMLANE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, swimlanes: [...bp.swimlanes, action.swimlane] } };
    }
    case "UPDATE_SWIMLANE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, swimlanes: updateList(bp.swimlanes, action.id, action.changes) } };
    }
    case "DELETE_SWIMLANE": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, swimlanes: deleteFromList(bp.swimlanes, action.id) } };
    }

    // --- Touchpoints ---
    case "ADD_TOUCHPOINT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, touchpoints: [...bp.touchpoints, action.touchpoint] } };
    }
    case "UPDATE_TOUCHPOINT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, touchpoints: updateList(bp.touchpoints, action.id, action.changes) } };
    }
    case "DELETE_TOUCHPOINT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, touchpoints: deleteFromList(bp.touchpoints, action.id) } };
    }

    // --- Callouts ---
    case "ADD_CALLOUT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, callouts: [...bp.callouts, action.callout] } };
    }
    case "UPDATE_CALLOUT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, callouts: updateList(bp.callouts, action.id, action.changes) } };
    }
    case "DELETE_CALLOUT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, callouts: deleteFromList(bp.callouts, action.id) } };
    }

    // --- Insights ---
    case "ADD_INSIGHT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, insights: [...bp.insights, action.insight] } };
    }
    case "UPDATE_INSIGHT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, insights: updateList(bp.insights, action.id, action.changes) } };
    }
    case "DELETE_INSIGHT": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, insights: deleteFromList(bp.insights, action.id) } };
    }

    // --- Motivation Maps ---
    case "ADD_MOTIVATION_MAP": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, motivationMaps: [...bp.motivationMaps, action.motivationMap] } };
    }
    case "UPDATE_MOTIVATION_MAP": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, motivationMaps: updateList(bp.motivationMaps, action.id, action.changes) } };
    }
    case "DELETE_MOTIVATION_MAP": {
      const bp = ensureBp(state.blueprint);
      return { ...state, blueprint: { ...bp, motivationMaps: deleteFromList(bp.motivationMaps, action.id) } };
    }

    // --- UI state ---
    case "SET_TOUCHPOINT_MEDIA":
      return {
        ...state,
        touchpointMedia: { ...state.touchpointMedia, [action.touchpointId]: action.media },
      };

    case "REMOVE_TOUCHPOINT_MEDIA": {
      const next = { ...state.touchpointMedia };
      delete next[action.touchpointId];
      return { ...state, touchpointMedia: next };
    }

    case "SET_EDITING_TOUCHPOINT":
      return { ...state, editingTouchpoint: action.touchpoint };

    case "TOGGLE_SWIMLANE_COLLAPSE": {
      const next = new Set(state.collapsedSwimlanes);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, collapsedSwimlanes: next };
    }

    case "COLLAPSE_ALL_SWIMLANES": {
      const bp = state.blueprint;
      if (!bp) return state;
      const ids = bp.swimlanes.filter((s) => s.type === "moments").map((s) => s.id);
      return { ...state, collapsedSwimlanes: new Set(ids) };
    }

    case "EXPAND_ALL_SWIMLANES":
      return { ...state, collapsedSwimlanes: new Set() };

    case "TOGGLE_SECTION_COLLAPSE": {
      const next = new Set(state.collapsedSections);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, collapsedSections: next };
    }

    case "COLLAPSE_ALL_SECTIONS": {
      const bp = state.blueprint;
      if (!bp) return state;
      return { ...state, collapsedSections: new Set(bp.sections.map((s) => s.id)) };
    }

    case "EXPAND_ALL_SECTIONS":
      return { ...state, collapsedSections: new Set() };

    case "SET_EDIT_MODE":
      return { ...state, editMode: action.on, editingEntity: action.on ? state.editingEntity : null };

    case "SET_EDITING_ENTITY":
      return { ...state, editingEntity: action.entity };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface BlueprintContextValue {
  state: BlueprintState;
  dispatch: React.Dispatch<Action>;

  // Convenience action creators
  loadBlueprint: (blueprint: Blueprint, fileName: string) => void;
  reset: () => void;

  // Touchpoint media
  setTouchpointMedia: (touchpointId: string, media: Media) => void;
  removeTouchpointMedia: (touchpointId: string) => void;
  setEditingTouchpoint: (tp: Touchpoint | null) => void;

  // Swimlane collapse
  toggleSwimlaneCollapse: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;

  // Section collapse
  toggleSectionCollapse: (id: string) => void;
  collapseAllSections: () => void;
  expandAllSections: () => void;

  // Edit mode
  setEditMode: (on: boolean) => void;
  setEditingEntity: (entity: EditingEntity | null) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const BlueprintContext = createContext<BlueprintContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BlueprintProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadBlueprint = useCallback(
    (blueprint: Blueprint, fileName: string) =>
      dispatch({ type: "LOAD_BLUEPRINT", blueprint, fileName }),
    [],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const setTouchpointMedia = useCallback(
    (touchpointId: string, media: Media) =>
      dispatch({ type: "SET_TOUCHPOINT_MEDIA", touchpointId, media }),
    [],
  );

  const removeTouchpointMedia = useCallback(
    (touchpointId: string) => dispatch({ type: "REMOVE_TOUCHPOINT_MEDIA", touchpointId }),
    [],
  );

  const setEditingTouchpoint = useCallback(
    (tp: Touchpoint | null) => dispatch({ type: "SET_EDITING_TOUCHPOINT", touchpoint: tp }),
    [],
  );

  const toggleSwimlaneCollapse = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_SWIMLANE_COLLAPSE", id }),
    [],
  );

  const collapseAll = useCallback(() => dispatch({ type: "COLLAPSE_ALL_SWIMLANES" }), []);
  const expandAll = useCallback(() => dispatch({ type: "EXPAND_ALL_SWIMLANES" }), []);

  const toggleSectionCollapse = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_SECTION_COLLAPSE", id }),
    [],
  );
  const collapseAllSections = useCallback(() => dispatch({ type: "COLLAPSE_ALL_SECTIONS" }), []);
  const expandAllSections = useCallback(() => dispatch({ type: "EXPAND_ALL_SECTIONS" }), []);

  const setEditMode = useCallback((on: boolean) => dispatch({ type: "SET_EDIT_MODE", on }), []);
  const setEditingEntity = useCallback(
    (entity: EditingEntity | null) => dispatch({ type: "SET_EDITING_ENTITY", entity }),
    [],
  );

  const value = useMemo<BlueprintContextValue>(
    () => ({
      state,
      dispatch,
      loadBlueprint,
      reset,
      setTouchpointMedia,
      removeTouchpointMedia,
      setEditingTouchpoint,
      toggleSwimlaneCollapse,
      collapseAll,
      expandAll,
      toggleSectionCollapse,
      collapseAllSections,
      expandAllSections,
      setEditMode,
      setEditingEntity,
    }),
    [
      state,
      loadBlueprint,
      reset,
      setTouchpointMedia,
      removeTouchpointMedia,
      setEditingTouchpoint,
      toggleSwimlaneCollapse,
      collapseAll,
      expandAll,
      toggleSectionCollapse,
      collapseAllSections,
      expandAllSections,
      setEditMode,
      setEditingEntity,
    ],
  );

  return <BlueprintContext.Provider value={value}>{children}</BlueprintContext.Provider>;
}
