// Data validators for blueprint entities.

import type {
  Blueprint,
  Section,
  JourneyStage,
  Phase,
  Swimlane,
  Touchpoint,
  Callout,
  MotivationMap,
} from "../types/blueprint";

export interface ValidationError {
  entity: string;
  id: string;
  field: string;
  message: string;
}

function requiredStr(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSection(s: Section): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(s.id)) errors.push({ entity: "Section", id: s.id, field: "id", message: "ID is required" });
  if (!requiredStr(s.name)) errors.push({ entity: "Section", id: s.id, field: "name", message: "Name is required" });
  return errors;
}

export function validateStage(s: JourneyStage, sectionIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(s.id)) errors.push({ entity: "Stage", id: s.id, field: "id", message: "ID is required" });
  if (!requiredStr(s.name)) errors.push({ entity: "Stage", id: s.id, field: "name", message: "Name is required" });
  if (!sectionIds.has(s.sectionId)) errors.push({ entity: "Stage", id: s.id, field: "sectionId", message: `Unknown section: ${s.sectionId}` });
  return errors;
}

export function validatePhase(p: Phase, stageIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(p.id)) errors.push({ entity: "Phase", id: p.id, field: "id", message: "ID is required" });
  if (!requiredStr(p.name)) errors.push({ entity: "Phase", id: p.id, field: "name", message: "Name is required" });
  if (!stageIds.has(p.stageId)) errors.push({ entity: "Phase", id: p.id, field: "stageId", message: `Unknown stage: ${p.stageId}` });
  return errors;
}

export function validateSwimlane(s: Swimlane): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(s.id)) errors.push({ entity: "Swimlane", id: s.id, field: "id", message: "ID is required" });
  if (!requiredStr(s.name)) errors.push({ entity: "Swimlane", id: s.id, field: "name", message: "Name is required" });
  if (s.type !== "moments" && s.type !== "motivation_map") {
    errors.push({ entity: "Swimlane", id: s.id, field: "type", message: `Invalid type: ${s.type}` });
  }
  return errors;
}

export function validateTouchpoint(t: Touchpoint, stageIds: Set<string>, swimlaneIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(t.id)) errors.push({ entity: "Touchpoint", id: t.id, field: "id", message: "ID is required" });
  if (!requiredStr(t.name)) errors.push({ entity: "Touchpoint", id: t.id, field: "name", message: "Name is required" });
  if (!stageIds.has(t.stageId)) errors.push({ entity: "Touchpoint", id: t.id, field: "stageId", message: `Unknown stage: ${t.stageId}` });
  if (!swimlaneIds.has(t.swimlaneId)) errors.push({ entity: "Touchpoint", id: t.id, field: "swimlaneId", message: `Unknown swimlane: ${t.swimlaneId}` });
  return errors;
}

export function validateCallout(c: Callout, stageIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(c.id)) errors.push({ entity: "Callout", id: c.id, field: "id", message: "ID is required" });
  if (!requiredStr(c.title)) errors.push({ entity: "Callout", id: c.id, field: "title", message: "Title is required" });
  if (!stageIds.has(c.stageId)) errors.push({ entity: "Callout", id: c.id, field: "stageId", message: `Unknown stage: ${c.stageId}` });
  return errors;
}

export function validateMotivationMap(m: MotivationMap, swimlaneIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!requiredStr(m.id)) errors.push({ entity: "MotivationMap", id: m.id, field: "id", message: "ID is required" });
  if (!swimlaneIds.has(m.swimlaneId)) errors.push({ entity: "MotivationMap", id: m.id, field: "swimlaneId", message: `Unknown swimlane: ${m.swimlaneId}` });
  return errors;
}

/** Validate an entire blueprint and return all errors. */
export function validateBlueprint(bp: Blueprint): ValidationError[] {
  const errors: ValidationError[] = [];

  const sectionIds = new Set(bp.sections.map((s) => s.id));
  const stageIds = new Set(bp.journeyStages.map((s) => s.id));
  const swimlaneIds = new Set(bp.swimlanes.map((s) => s.id));

  for (const s of bp.sections) errors.push(...validateSection(s));
  for (const s of bp.journeyStages) errors.push(...validateStage(s, sectionIds));
  for (const p of bp.phases) errors.push(...validatePhase(p, stageIds));
  for (const s of bp.swimlanes) errors.push(...validateSwimlane(s));
  for (const t of bp.touchpoints) errors.push(...validateTouchpoint(t, stageIds, swimlaneIds));
  for (const c of bp.callouts) errors.push(...validateCallout(c, stageIds));
  for (const m of bp.motivationMaps) errors.push(...validateMotivationMap(m, swimlaneIds));

  return errors;
}
