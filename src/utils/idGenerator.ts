// ID generation utilities for blueprint entities.

let counter = 0;

/** Generate a unique ID with an optional prefix. */
export function generateId(prefix = "id"): string {
  counter++;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Slugify a display name into a URL/ID-safe string. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Generate a section ID. */
export const sectionId = () => generateId("sec");

/** Generate a stage ID. */
export const stageId = () => generateId("stg");

/** Generate a phase ID. */
export const phaseId = () => generateId("phs");

/** Generate a swimlane ID. */
export const swimlaneId = () => generateId("sl");

/** Generate a touchpoint ID. */
export const touchpointId = () => generateId("tp");

/** Generate a callout ID. */
export const calloutId = () => generateId("co");

/** Generate a motivation map ID. */
export const motivationMapId = () => generateId("mm");
