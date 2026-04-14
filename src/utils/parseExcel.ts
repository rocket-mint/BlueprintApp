// Excel parser for the 8-sheet blueprint structure.
//
// Sheets:
//   1. Sections         -> Section[]
//   2. Journey Stages   -> JourneyStage[]
//   3. Phases           -> Phase[]
//   4. Swimlanes        -> Swimlane[]
//   5. Touchpoints      -> Touchpoint[]
//   6. Callouts         -> Callout[]
//   7. Insights         -> Insight[]
//   8. Motivation Maps  -> MotivationMap[]

import * as XLSX from "xlsx";
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
  MotivationDataPoint,
  SwimlaneType,
  CalloutType,
} from "../types/blueprint";
import { slugify } from "./idGenerator";
import { buildKeyLookup } from "./dataUtils";

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function readSheet(wb: XLSX.WorkBook, candidates: string[]): Row[] | null {
  const name = wb.SheetNames.find((n) =>
    candidates.some((c) => n.toLowerCase().trim() === c.toLowerCase()),
  );
  if (!name) return null;
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: "" });
}

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
// Motivation score parsing (kept from original)
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
 * Falls back to plain numbers when no `|` is present.
 */
function parseMotivationDataPoints(v: unknown): MotivationDataPoint[] {
  if (v == null || v === "") return [];
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = parseMotivationScore(v);
    return n === undefined ? [] : [{ score: n }];
  }
  const raw = String(v).trim();
  if (!raw) return [];

  // Detect rich format (contains `|`)
  if (raw.includes("|")) {
    const out: MotivationDataPoint[] = [];
    for (const part of raw.split(/[,;]/)) {
      const segments = part.split("|").map((s) => s.trim());
      const score = parseMotivationScore(segments[0]);
      if (score !== undefined) {
        out.push({
          score,
          title: segments[1] || undefined,
          description: segments[2] || undefined,
        });
      }
    }
    return out;
  }

  // Plain format — just numbers
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
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "motivation_map" || s === "motivation" || s === "motivationmap") {
    return "motivation_map";
  }
  return "moments";
}

function parseCalloutType(v: unknown): CalloutType {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
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
  const wb = XLSX.read(buf, { type: "array" });

  // Read all sheets (with fallback name variants)
  const sectionsRaw = readSheet(wb, ["Sections", "Section"]) ?? [];
  const stagesRaw = readSheet(wb, ["Journey Stages", "Stages"]) ?? [];
  const phasesRaw = readSheet(wb, ["Phases", "Phase"]) ?? [];
  const swimlanesRaw = readSheet(wb, ["Swimlanes", "Swim Lanes"]) ?? [];
  const touchpointsRaw = readSheet(wb, ["Touchpoints", "Touchpoint"]) ?? [];
  const calloutsRaw = readSheet(wb, ["Callouts", "Callout"]) ?? [];
  const insightsRaw = readSheet(wb, ["Insights", "Insight"]) ?? [];
  const motivationMapsRaw = readSheet(wb, ["Motivation Maps", "Motivation Map"]) ?? [];

  if (stagesRaw.length === 0) {
    throw new Error("Missing or empty 'Journey Stages' sheet");
  }
  if (swimlanesRaw.length === 0) {
    throw new Error("Missing or empty 'Swimlanes' sheet");
  }

  // ---- Sections ----
  // If no Sections sheet, create a default section so stages have a parent.
  let sections: Section[];
  if (sectionsRaw.length > 0) {
    sections = sectionsRaw
      .map((r, i) => {
        const name = str(r["Section Name"] ?? r["Name"] ?? r["name"]);
        const explicitId = str(r["Section ID"] ?? r["id"]);
        const id = explicitId || (name ? slugify(name) : `section_${i + 1}`);
        return {
          id,
          name,
          description: str(r["Description"]) || undefined,
          order: num(r["Order"], i + 1),
        };
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
      // Resolve section by ID or name; fall back to first section
      const sectionId = rawSectionId
        ? (buildKeyLookup(sections).get(rawSectionId.toLowerCase()) ?? sections[0]?.id ?? "default")
        : (sections[0]?.id ?? "default");
      return {
        id,
        name,
        sectionId,
        description: str(r["Description"]) || undefined,
        order: num(r["Order"], i + 1),
      };
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
      const sectionId = rawSectionId
        ? resolveSection(rawSectionId)
        : "";
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

  // If no swimlane has a sectionId, duplicate them into every section
  if (rawSwimlanes.every((s) => !s.sectionId)) {
    swimlanes = [];
    let order = 1;
    for (const sec of sections) {
      for (const sl of rawSwimlanes) {
        swimlanes.push({
          ...sl,
          id: `${sl.id}_${sec.id}`,
          sectionId: sec.id,
          order: order++,
        });
      }
    }
  } else {
    swimlanes = rawSwimlanes.map((sl) => ({
      ...sl,
      sectionId: sl.sectionId || sections[0]?.id || "default",
    }));
  }

  // Build lookup maps for touchpoints / callouts / insights references
  const swimlaneKeyLookup = buildKeyLookup(swimlanes);
  const phaseKeyLookup = buildKeyLookup(phases);

  const resolveSwimlane = (v: unknown): string => {
    const key = str(v).toLowerCase();
    return swimlaneKeyLookup.get(key) ?? str(v);
  };
  const resolvePhaseIds = (v: unknown): string[] => {
    const parts = parseList(v);
    return parts
      .map((p) => phaseKeyLookup.get(p.toLowerCase()) ?? p)
      .filter(Boolean);
  };

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
        phaseIds: resolvePhaseIds(r["Phase IDs"] ?? r["Phase ID"] ?? r["Phases"]),
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
        phaseIds: resolvePhaseIds(r["Phase IDs"] ?? r["Phase ID"] ?? r["Phases"]),
        type: parseCalloutType(r["Type"] ?? r["Callout Type"]),
        title: str(r["Callout Title"] ?? r["Title"]),
        description: str(r["Description"]) || undefined,
        order: num(r["Order"], i + 1),
      };
    })
    .filter((c) => c.id && c.stageId && c.title)
    .sort((a, b) => a.order - b.order);

  // ---- Insights ----
  const insights: Insight[] = insightsRaw
    .map((r, i) => {
      const explicitId = str(r["Insight ID"] ?? r["id"]);
      const id = explicitId || `insight_${i + 1}`;
      return {
        id,
        stageId: resolveStage(r["Journey Stage"] ?? r["Stage"]),
        title: str(r["Insight Title"] ?? r["Title"]),
        text: str(r["Insight Text"] ?? r["Text"]),
        dataPoint: str(r["Data Point"]) || undefined,
        dataSource: str(r["Data Source"]) || undefined,
        quote: str(r["Quote/Customer Voice"] ?? r["Quote"]) || undefined,
      };
    })
    .filter((ins) => ins.id && ins.stageId && ins.title);

  // ---- Fallback: extract motivation scores from Stages sheet ----
  // The old format stored "Motivation Score" on each stage row. We parse
  // them here so they can be injected into MotivationMap.stageScores when
  // the Motivation Maps sheet doesn't have per-stage columns.
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
  // Supports per-stage columns with plain numbers or rich "score|title|desc" format.
  const motivationMaps: MotivationMap[] = motivationMapsRaw
    .map((r, i) => {
      const explicitId = str(r["Map ID"] ?? r["id"]);
      const id = explicitId || `mm_${i + 1}`;
      const slId = resolveSwimlane(r["Swimlane ID"] ?? r["Swimlane"]);

      const stageScores: Record<string, MotivationDataPoint[]> = {};

      // First, try per-stage columns (column name matches stage ID or name)
      for (const stage of journeyStages) {
        const colVal = r[stage.id] ?? r[stage.name];
        if (colVal != null && colVal !== "") {
          stageScores[stage.id] = parseMotivationDataPoints(colVal);
        }
      }

      // If no per-stage columns found, try a "Scores" column
      if (Object.keys(stageScores).length === 0) {
        const rawScores = str(r["Scores"] ?? r["Motivation Scores"] ?? r["Motivation Score"]);
        if (rawScores) {
          const points = parseMotivationDataPoints(rawScores);
          if (points.length > 0) {
            // Distribute across stages in order
            journeyStages.forEach((stage, idx) => {
              if (idx < points.length) stageScores[stage.id] = [points[idx]];
            });
          }
        }
      }

      // Final fallback: use scores from the Stages sheet
      if (Object.keys(stageScores).length === 0) {
        Object.assign(stageScores, stageScoresFromStagesSheet);
      }

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

  // If no motivation map rows were parsed but we have scores from the stages
  // sheet and a motivation_map swimlane, auto-create a motivation map entry.
  if (motivationMaps.length === 0 && Object.keys(stageScoresFromStagesSheet).length > 0) {
    const mmSwimlane = swimlanes.find((s) => s.type === "motivation_map");
    if (mmSwimlane) {
      motivationMaps.push({
        id: "mm_auto",
        swimlaneId: mmSwimlane.id,
        title: "Motivation Map",
        stageScores: { ...stageScoresFromStagesSheet },
      });
    }
  }

  return {
    sections,
    journeyStages,
    phases,
    swimlanes,
    touchpoints,
    callouts,
    insights,
    motivationMaps,
  };
}
