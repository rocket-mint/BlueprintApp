// Excel parser for the 7-sheet blueprint structure.
//
// Sheets:
//   1. Sections         -> Section[]
//   2. Journey Stages   -> JourneyStage[]
//   3. Phases           -> Phase[]
//   4. Swimlanes        -> Swimlane[]
//   5. Touchpoints      -> Touchpoint[]
//   6. Callouts         -> Callout[]
//   7. Motivation Maps  -> MotivationMap[]

import ExcelJS from "exceljs";
import type {
  Blueprint,
  Section,
  JourneyStage,
  Phase,
  Swimlane,
  Touchpoint,
  Callout,
  MotivationMap,
  MotivationDataPoint,
  SwimlaneType,
  CalloutType,
} from "../types/blueprint";
import { slugify } from "./idGenerator";
import { buildKeyLookup } from "./dataUtils";

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// ExcelJS helpers — convert worksheet rows to plain objects (like sheet_to_json)
// ---------------------------------------------------------------------------

/** Unwrap an ExcelJS CellValue to a plain JS primitive. */
function cellToValue(val: ExcelJS.CellValue): unknown {
  if (val == null) return "";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") {
    // Formula result
    if ("result" in val) return cellToValue((val as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    // Rich text
    if ("richText" in val) return (val as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
    // Hyperlink
    if ("text" in val) return String((val as ExcelJS.CellHyperlinkValue).text ?? "");
    // Error cell
    if ("error" in val) return "";
  }
  return String(val);
}

/** Convert a worksheet to an array of header-keyed row objects. */
function worksheetToJson(ws: ExcelJS.Worksheet): Row[] {
  const result: Row[] = [];
  let headers: string[] = [];
  let headerFound = false;

  ws.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed; slice off the leading undefined at index 0
    const vals = (row.values as ExcelJS.CellValue[]).slice(1);

    if (!headerFound) {
      headers = vals.map((v) => String(cellToValue(v) ?? "").trim());
      headerFound = true;
      return;
    }

    const obj: Row = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = cellToValue(vals[i] ?? null) ?? "";
    }
    result.push(obj);
  });

  return result;
}

function readSheet(wb: ExcelJS.Workbook, candidates: string[]): Row[] | null {
  const ws = wb.worksheets.find((w) =>
    candidates.some((c) => w.name.toLowerCase().trim() === c.toLowerCase()),
  );
  if (!ws) return null;
  return worksheetToJson(ws);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Parse a comma/semicolon-separated list of strings, trimmed and filtered. */
function parseList(v: unknown): string[] {
  if (v == null || v === "") return [];
  return String(v)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Motivation score parsing
// ---------------------------------------------------------------------------

function parseMotivationScore(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v <= 1) return clamp01(v);
    if (v <= 3) return clamp01(v / 3);
    if (v <= 100) return clamp01(v / 100);
    return clamp01(v);
  }
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  const n = Number(s);
  if (Number.isFinite(n)) return parseMotivationScore(n);
  if (s.includes("high")) return 1;
  if (s.includes("strong") || s.includes("intent") || s.includes("commit")) return 0.67;
  if (s.includes("neutral")) return 0.33;
  if (s.includes("low") || s.includes("passive")) return 0;
  return undefined;
}

/**
 * Parse a cell value into MotivationDataPoint[].
 * Supports two formats:
 *   Plain:  "0.30, 0.45"
 *   Rich:   "0.30|Title|Description, 0.45|Title|Desc"
 */
function parseMotivationDataPoints(v: unknown): MotivationDataPoint[] {
  if (v == null || v === "") return [];
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = parseMotivationScore(v);
    return n === undefined ? [] : [{ score: n }];
  }
  const raw = String(v).trim();
  if (!raw) return [];

  if (raw.includes("|")) {
    const out: MotivationDataPoint[] = [];
    for (const part of raw.split(/[,;]/)) {
      const segments = part.split("|").map((s) => s.trim());
      const score = parseMotivationScore(segments[0]);
      if (score !== undefined) {
        out.push({ score, title: segments[1] || undefined, description: segments[2] || undefined });
      }
    }
    return out;
  }

  const out: MotivationDataPoint[] = [];
  for (const part of raw.split(/[,;]/)) {
    const n = parseMotivationScore(part.trim());
    if (n !== undefined) out.push({ score: n });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Type parsers
// ---------------------------------------------------------------------------

function parseSwimlaneType(v: unknown): SwimlaneType {
  const s = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "motivation_map" || s === "motivation" || s === "motivationmap") return "motivation_map";
  return "moments";
}

function parseCalloutType(v: unknown): CalloutType {
  const s = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const valid: CalloutType[] = ["pain_point", "opportunity", "highlight", "question", "note"];
  if (valid.includes(s as CalloutType)) return s as CalloutType;
  if (s.includes("pain")) return "pain_point";
  if (s.includes("opp")) return "opportunity";
  if (s.includes("high")) return "highlight";
  if (s.includes("quest")) return "question";
  return "note";
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export async function parseExcel(file: File): Promise<Blueprint> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  // Read all sheets (with fallback name variants)
  const sectionsRaw = readSheet(wb, ["Sections", "Section"]) ?? [];
  const stagesRaw = readSheet(wb, ["Journey Stages", "Stages"]) ?? [];
  const phasesRaw = readSheet(wb, ["Phases", "Phase"]) ?? [];
  const swimlanesRaw = readSheet(wb, ["Swimlanes", "Swim Lanes"]) ?? [];
  const touchpointsRaw = readSheet(wb, ["Touchpoints", "Touchpoint"]) ?? [];
  const calloutsRaw = readSheet(wb, ["Callouts", "Callout"]) ?? [];
  const motivationMapsRaw = readSheet(wb, ["Motivation Maps", "Motivation Map"]) ?? [];

  if (stagesRaw.length === 0) throw new Error("Missing or empty 'Journey Stages' sheet");
  if (swimlanesRaw.length === 0) throw new Error("Missing or empty 'Swimlanes' sheet");

  // ---- Sections ----
  let sections: Section[];
  if (sectionsRaw.length > 0) {
    sections = sectionsRaw
      .map((r, i) => {
        const name = str(r["Section Name"] ?? r["Name"] ?? r["name"]);
        const explicitId = str(r["Section ID"] ?? r["id"]);
        const id = explicitId || (name ? slugify(name) : `section_${i + 1}`);
        return { id, name, description: str(r["Description"]) || undefined, order: num(r["Order"], i + 1) };
      })
      .filter((s) => s.id && s.name)
      .sort((a, b) => a.order - b.order);
  } else {
    sections = [{ id: "default", name: "Journey", order: 1 }];
  }

  // ---- Journey Stages ----
  const journeyStages: JourneyStage[] = stagesRaw
    .map((r, i) => {
      const name = str(r["Stage Name"] ?? r["Name"] ?? r["name"]);
      const explicitId = str(r["Stage ID"] ?? r["id"]);
      const id = explicitId || (name ? slugify(name) : `stage_${i + 1}`);
      const rawSectionId = str(r["Section ID"] ?? r["Section"] ?? r["section"]);
      const sectionId = rawSectionId
        ? (buildKeyLookup(sections).get(rawSectionId.toLowerCase()) ?? sections[0]?.id ?? "default")
        : (sections[0]?.id ?? "default");
      return { id, name, sectionId, description: str(r["Description"]) || undefined, order: num(r["Order"], i + 1) };
    })
    .filter((s) => s.id && s.name)
    .sort((a, b) => a.order - b.order);

  // ---- Phases ----
  const stageKeyLookup = buildKeyLookup(journeyStages);
  const resolveStage = (v: unknown): string => {
    const key = str(v).toLowerCase();
    return stageKeyLookup.get(key) ?? str(v);
  };

  const phases: Phase[] = phasesRaw
    .map((r, i) => {
      const name = str(r["Phase Name"] ?? r["Name"] ?? r["name"]);
      const explicitId = str(r["Phase ID"] ?? r["id"]);
      const id = explicitId || (name ? slugify(name) : `phase_${i + 1}`);
      return {
        id,
        name,
        stageId: resolveStage(r["Stage ID"] ?? r["Journey Stage"] ?? r["Stage"]),
        description: str(r["Description"]) || undefined,
        order: num(r["Order"], i + 1),
      };
    })
    .filter((p) => p.id && p.name && p.stageId)
    .sort((a, b) => a.order - b.order);

  // ---- Swimlanes ----
  const sectionKeyLookup = buildKeyLookup(sections);
  const resolveSection = (v: unknown): string => {
    const key = str(v).toLowerCase();
    return sectionKeyLookup.get(key) ?? str(v);
  };

  let swimlanes: Swimlane[];
  const rawSwimlanes = swimlanesRaw
    .map((r, i) => {
      const explicitId = str(r["Swimlane ID"] ?? r["id"]);
      const name = str(r["Swimlane Name"] ?? r["Name"] ?? r["name"]);
      const id = explicitId || (name ? slugify(name) : `swimlane_${i + 1}`);
      const rawSectionId = str(r["Section ID"] ?? r["Section"] ?? r["section"]);
      const sectionId = rawSectionId ? resolveSection(rawSectionId) : "";
      const rawPhaseId = str(r["Phase ID"] ?? r["Phase"] ?? r["phase"]);
      return {
        id,
        name,
        type: parseSwimlaneType(r["Type"] ?? r["type"]),
        sectionId,
        phaseId: rawPhaseId || undefined,
        description: str(r["Description"]) || undefined,
        order: num(r["Order"], i + 1),
      };
    })
    .filter((s) => s.id && s.name)
    .sort((a, b) => a.order - b.order);

  if (rawSwimlanes.every((s) => !s.sectionId)) {
    swimlanes = [];
    let order = 1;
    for (const sec of sections) {
      for (const sl of rawSwimlanes) {
        swimlanes.push({ ...sl, id: `${sl.id}_${sec.id}`, sectionId: sec.id, order: order++ });
      }
    }
  } else {
    swimlanes = rawSwimlanes.map((sl) => ({
      ...sl,
      sectionId: sl.sectionId || sections[0]?.id || "default",
    }));
  }

  // Build lookup maps
  const swimlaneKeyLookup = buildKeyLookup(swimlanes);
  const phaseKeyLookup = buildKeyLookup(phases);

  const resolveSwimlane = (v: unknown): string => {
    const key = str(v).toLowerCase();
    return swimlaneKeyLookup.get(key) ?? str(v);
  };
  const resolvePhaseIds = (v: unknown): string[] =>
    parseList(v)
      .map((p) => phaseKeyLookup.get(p.toLowerCase()) ?? p)
      .filter(Boolean);
  const resolvePhaseId = (v: unknown): string | undefined => resolvePhaseIds(v)[0] || undefined;

  // ---- Touchpoints ----
  const touchpoints: Touchpoint[] = touchpointsRaw
    .map((r, i) => {
      const explicitId = str(r["Touchpoint ID"] ?? r["id"]);
      const id = explicitId || `tp_${i + 1}`;
      return {
        id,
        name: str(r["Touchpoint Name"] ?? r["Name"] ?? r["name"]),
        channelType: str(r["Channel Type"]) || undefined,
        stageId: resolveStage(r["Journey Stage"] ?? r["Stage"] ?? r["Stage ID"]),
        swimlaneId: resolveSwimlane(r["Swimlane ID"] ?? r["Swimlane"]),
        phaseId: resolvePhaseId(r["Phase IDs"] ?? r["Phase ID"] ?? r["Phases"]),
        description: str(r["Description"]) || undefined,
        iconColor: str(r["Icon/Color"] ?? r["Color"]) || undefined,
        order: num(r["Order"], i + 1),
        imageUrl: str(r["Image URL"] ?? r["Image"] ?? r["image"]) || undefined,
        linkUrl: str(r["Link URL"] ?? r["Link"] ?? r["URL"] ?? r["link"]) || undefined,
        photos: parseList(r["Photos"] ?? r["Photo URLs"]),
        links: parseList(r["Links"] ?? r["Additional Links"]),
        customNotes: str(r["Custom Notes"] ?? r["Notes"]) || undefined,
      };
    })
    .filter((t) => t.id && t.name && t.stageId && t.swimlaneId)
    .sort((a, b) => a.order - b.order);

  // ---- Callouts ----
  const callouts: Callout[] = calloutsRaw
    .map((r, i) => {
      const explicitId = str(r["Callout ID"] ?? r["id"]);
      const id = explicitId || `callout_${i + 1}`;
      return {
        id,
        stageId: resolveStage(r["Journey Stage"] ?? r["Stage"] ?? r["Stage ID"]),
        swimlaneId: resolveSwimlane(r["Swimlane ID"] ?? r["Swimlane"]) || undefined,
        phaseId: resolvePhaseId(r["Phase IDs"] ?? r["Phase ID"] ?? r["Phases"]),
        type: parseCalloutType(r["Type"] ?? r["Callout Type"]),
        title: str(r["Callout Title"] ?? r["Title"]),
        description: str(r["Description"]) || undefined,
        order: num(r["Order"], i + 1),
      };
    })
    .filter((c) => c.id && c.stageId && c.title)
    .sort((a, b) => a.order - b.order);

  // ---- Fallback: motivation scores from Stages sheet ----
  const stageScoresFromStagesSheet: Record<string, MotivationDataPoint[]> = {};
  for (let i = 0; i < stagesRaw.length; i++) {
    const r = stagesRaw[i];
    const stage = journeyStages[i];
    if (!stage) continue;
    const raw = r["Motivation Score"] ?? r["Motivation Scores"] ?? r["Motivation"] ?? r["motivation"];
    const points = parseMotivationDataPoints(raw);
    if (points.length > 0) stageScoresFromStagesSheet[stage.id] = points;
  }

  // ---- Motivation Maps ----
  const motivationMaps: MotivationMap[] = motivationMapsRaw
    .map((r, i) => {
      const explicitId = str(r["Map ID"] ?? r["id"]);
      const id = explicitId || `mm_${i + 1}`;
      const slId = resolveSwimlane(r["Swimlane ID"] ?? r["Swimlane"]);

      const stageScores: Record<string, MotivationDataPoint[]> = {};
      for (const stage of journeyStages) {
        const colVal = r[stage.id] ?? r[stage.name];
        if (colVal != null && colVal !== "") stageScores[stage.id] = parseMotivationDataPoints(colVal);
      }

      if (Object.keys(stageScores).length === 0) {
        const rawScores = str(r["Scores"] ?? r["Motivation Scores"] ?? r["Motivation Score"]);
        if (rawScores) {
          const points = parseMotivationDataPoints(rawScores);
          if (points.length > 0) {
            journeyStages.forEach((stage, idx) => {
              if (idx < points.length) stageScores[stage.id] = [points[idx]];
            });
          }
        }
      }

      if (Object.keys(stageScores).length === 0) Object.assign(stageScores, stageScoresFromStagesSheet);

      return {
        id,
        swimlaneId: slId,
        title: str(r["Map Title"] ?? r["Title"]) || undefined,
        stageScores,
        drivers: str(r["Key Drivers"] ?? r["Drivers"]) || undefined,
        triggers: str(r["Emotional Triggers"] ?? r["Triggers"]) || undefined,
        insights: str(r["Key Insights"] ?? r["Insights"]) || undefined,
        visual: str(r["Visual/Color"] ?? r["Color"]) || undefined,
      };
    })
    .filter((m) => m.swimlaneId);

  if (motivationMaps.length === 0 && Object.keys(stageScoresFromStagesSheet).length > 0) {
    const mmSwimlane = swimlanes.find((s) => s.type === "motivation_map");
    if (mmSwimlane) {
      motivationMaps.push({ id: "mm_auto", swimlaneId: mmSwimlane.id, title: "Motivation Map", stageScores: { ...stageScoresFromStagesSheet } });
    }
  }

  return {
    sections,
    stageGroups: [],
    journeyStages,
    phases,
    swimlanes,
    touchpoints,
    callouts,
    motivationMaps,
  };
}
