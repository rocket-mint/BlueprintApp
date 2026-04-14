// Smoke-test: read an .xlsx and dump what the new parser would produce.
// Mirrors src/lib/parseExcel.ts (without the File API).
//
// Usage: node scripts/test-parser.mjs <path-to-xlsx>

import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/test-parser.mjs <xlsx>");
  process.exit(1);
}

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: "buffer" });

console.log("Sheet names in workbook:");
for (const n of wb.SheetNames) console.log("  - " + JSON.stringify(n));
console.log();

const str = (v) => (v == null ? "" : String(v).trim());
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function readSheet(cands) {
  const name = wb.SheetNames.find((n) =>
    cands.some((c) => n.toLowerCase().trim() === c.toLowerCase()),
  );
  if (!name) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
}

function parseSwimlaneType(v) {
  const s = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "motivation_map" || s === "motivation" || s === "motivationmap") return "motivation_map";
  return "moments";
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));
function parseMotivationScore(v) {
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

const stagesRaw = readSheet(["Journey Stages", "Stages"]) ?? [];
const swimlanesRaw = readSheet(["Swimlanes", "Swim Lanes"]) ?? [];
const touchpointsRaw = readSheet(["Touchpoints"]) ?? [];
const motivationMapsRaw = readSheet(["Motivation Map", "Motivation Maps"]) ?? [];
const insightsRaw = readSheet(["Insights"]) ?? [];

console.log("Raw row counts:");
console.log("  Journey Stages: " + stagesRaw.length);
console.log("  Swimlanes:      " + swimlanesRaw.length);
console.log("  Touchpoints:    " + touchpointsRaw.length);
console.log("  Motivation Map: " + motivationMapsRaw.length);
console.log("  Insights:       " + insightsRaw.length);
console.log();

if (stagesRaw[0]) {
  console.log("First Journey Stages row keys: " + Object.keys(stagesRaw[0]).join(", "));
}
if (swimlanesRaw[0]) {
  console.log("First Swimlanes row keys:      " + Object.keys(swimlanesRaw[0]).join(", "));
}
if (touchpointsRaw[0]) {
  console.log("First Touchpoints row keys:    " + Object.keys(touchpointsRaw[0]).join(", "));
}
console.log();

const journeyStages = stagesRaw
  .map((r, i) => {
    const name = str(r["Stage Name"] ?? r["Name"] ?? r["name"]);
    const explicitId = str(r["Stage ID"] ?? r["id"]);
    const id = explicitId || (name ? slugify(name) : "stage_" + (i + 1));
    return {
      id,
      name,
      motivationScore: parseMotivationScore(r["Motivation Score"] ?? r["Motivation"]),
      order: num(r["Order"], i + 1),
    };
  })
  .filter((s) => s.id && s.name)
  .sort((a, b) => a.order - b.order);

const swimlanes = swimlanesRaw
  .map((r, i) => {
    const explicitId = str(r["Swimlane ID"] ?? r["id"]);
    const name = str(r["Swimlane Name"] ?? r["Name"]);
    const id = explicitId || "swimlane_" + (i + 1);
    return { id, name, type: parseSwimlaneType(r["Type"]), order: num(r["Order"], i + 1) };
  })
  .filter((s) => s.id && s.name)
  .sort((a, b) => a.order - b.order);

const stageByKey = new Map();
for (const s of journeyStages) {
  stageByKey.set(s.id.toLowerCase(), s.id);
  stageByKey.set(s.name.toLowerCase(), s.id);
}
const swimlaneByKey = new Map();
for (const s of swimlanes) {
  swimlaneByKey.set(s.id.toLowerCase(), s.id);
  swimlaneByKey.set(s.name.toLowerCase(), s.id);
}
const resolveStage = (v) => stageByKey.get(str(v).toLowerCase()) ?? str(v);
const resolveSwimlane = (v) => swimlaneByKey.get(str(v).toLowerCase()) ?? str(v);

const touchpoints = touchpointsRaw
  .map((r, i) => ({
    id: str(r["Touchpoint ID"]) || "tp_" + (i + 1),
    name: str(r["Touchpoint Name"] ?? r["Name"]),
    stageId: resolveStage(r["Journey Stage"] ?? r["Stage"]),
    swimlaneId: resolveSwimlane(r["Swimlane ID"] ?? r["Swimlane"]),
    order: num(r["Order"], i + 1),
  }))
  .filter((t) => t.id && t.name && t.stageId && t.swimlaneId)
  .sort((a, b) => a.order - b.order);

const insights = insightsRaw
  .map((r, i) => ({
    id: str(r["Insight ID"]) || "insight_" + (i + 1),
    stageId: resolveStage(r["Journey Stage"] ?? r["Stage"]),
    title: str(r["Insight Title"] ?? r["Title"]),
  }))
  .filter((i) => i.id && i.stageId && i.title);

console.log("After filtering:");
console.log("  journeyStages: " + journeyStages.length);
console.log("  swimlanes:     " + swimlanes.length + "  (" + swimlanes.map(s => s.id + ":" + s.type).join(", ") + ")");
console.log("  touchpoints:   " + touchpoints.length);
console.log("  insights:      " + insights.length);
console.log();

// Check that touchpoints reference real stages and swimlanes
const stageIds = new Set(journeyStages.map((s) => s.id));
const swimlaneIds = new Set(swimlanes.map((s) => s.id));
const orphanStage = touchpoints.filter((t) => !stageIds.has(t.stageId));
const orphanSwimlane = touchpoints.filter((t) => !swimlaneIds.has(t.swimlaneId));
console.log("Touchpoints with unresolved stageId:    " + orphanStage.length);
console.log("Touchpoints with unresolved swimlaneId: " + orphanSwimlane.length);
if (orphanStage.length) console.log("  examples:", orphanStage.slice(0, 3));
if (orphanSwimlane.length) console.log("  examples:", orphanSwimlane.slice(0, 3));
