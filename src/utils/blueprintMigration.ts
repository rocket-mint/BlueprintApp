// blueprintMigration.ts — forward-compatibility migrations for .bp files.
//
// Migration history:
//   v1 → v2  Touchpoint.phaseIds[] → phaseId? (single) + Callout.phaseId? (single)
//   v2 → v3  Callout.phaseId? (single string) → phaseIds? (string[], empty = all phases)

import type { Blueprint, Touchpoint, Callout, MotivationDataPoint, MotivationMap } from "../types/blueprint";

// ---------------------------------------------------------------------------
// Old v1 shapes (only the fields that changed)
// ---------------------------------------------------------------------------

interface V1Touchpoint extends Omit<Touchpoint, "phaseId"> {
  phaseIds?: string[];
  phaseId?: string;
}

// V1 callouts had phaseIds[] (only first was used); v2 had phaseId string;
// v3 uses phaseIds[] again but with proper multi-select semantics.
interface V1Callout {
  [key: string]: unknown;
  phaseIds?: string[];
  phaseId?: string;
}

interface V1Blueprint extends Omit<Blueprint, "touchpoints" | "callouts"> {
  touchpoints: V1Touchpoint[];
  callouts: V1Callout[];
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Returns true when the raw parsed blueprint looks like a v1 file. */
function isV1(raw: unknown): raw is V1Blueprint {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;
  // A v1 file has phaseIds arrays on touchpoints.
  const tps = b.touchpoints;
  if (Array.isArray(tps) && tps.length > 0) {
    return Array.isArray((tps[0] as Record<string, unknown>).phaseIds);
  }
  return false;
}

// ---------------------------------------------------------------------------
// v1 → current
// ---------------------------------------------------------------------------

function migrateV1(raw: V1Blueprint): Blueprint {
  return {
    ...(raw as unknown as Blueprint),
    touchpoints: raw.touchpoints.map((tp) => {
      const { phaseIds, phaseId, ...rest } = tp;
      return {
        ...rest,
        phaseId: phaseId ?? (phaseIds && phaseIds.length > 0 ? phaseIds[0] : undefined),
      } as Touchpoint;
    }),
    // V1 callouts: phaseIds[] meant "belongs to phase X" (only first used).
    // Convert to current phaseIds[] (multi-select, empty = all phases).
    callouts: raw.callouts.map((c) => {
      const { phaseIds: oldIds, phaseId: oldId, ...rest } = c;
      const resolved = oldId ?? (oldIds && oldIds.length > 0 ? oldIds[0] : undefined);
      return {
        ...rest,
        phaseIds: resolved ? [resolved] : undefined,
      } as unknown as Callout;
    }),
  };
}

// ---------------------------------------------------------------------------
// v2 normaliser — files saved when Callout had phaseId: string (singular)
// ---------------------------------------------------------------------------

function normaliseCalloutPhaseIds(bp: Blueprint): Blueprint {
  const needsNorm = bp.callouts.some(
    (c) => typeof (c as unknown as Record<string, unknown>).phaseId === "string",
  );
  if (!needsNorm) return bp;
  return {
    ...bp,
    callouts: bp.callouts.map((c) => {
      const raw = c as unknown as Record<string, unknown>;
      if (typeof raw.phaseId === "string") {
        const { phaseId, ...rest } = raw;
        return { ...rest, phaseIds: phaseId ? [phaseId as string] : undefined } as unknown as Callout;
      }
      return c;
    }),
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// stageScores → points migration (flat free-position model)
// ---------------------------------------------------------------------------

function migrateStageScores(bp: Blueprint): Blueprint {
  const needsMigration = bp.motivationMaps.some(
    (mm) => {
      const raw = mm as unknown as Record<string, unknown>;
      return typeof raw.stageScores === "object" && raw.stageScores !== null && !Array.isArray(raw.points);
    }
  );
  if (!needsMigration) return bp;

  return {
    ...bp,
    motivationMaps: bp.motivationMaps.map((mm) => {
      const raw = mm as unknown as Record<string, unknown>;
      if (typeof raw.stageScores !== "object" || raw.stageScores === null || Array.isArray(raw.points)) {
        return mm;
      }
      const stageScores = raw.stageScores as Record<string, Array<Record<string, unknown>>>;
      const keys = Object.keys(stageScores);
      const points: MotivationDataPoint[] = [];

      keys.forEach((key, keyIdx) => {
        const keyPts = stageScores[key] ?? [];
        const keyCenter = keys.length === 1 ? 0.5 : keyIdx / (keys.length - 1);
        const segW = keys.length <= 1 ? 1 : 1 / (keys.length - 1);

        keyPts.forEach((pt, ptIdx) => {
          let x: number;
          if (typeof pt.xOffset === "number") {
            x = keyCenter + ((pt.xOffset - 50) / 50) * segW;
          } else if (keyPts.length === 1) {
            x = keyCenter;
          } else {
            const spread = segW * 0.6;
            x = keyCenter - spread / 2 + (ptIdx / (keyPts.length - 1)) * spread;
          }
          x = Math.max(0, Math.min(1, x));
          points.push({
            score: typeof pt.score === "number" ? pt.score : 0.5,
            x,
            title: typeof pt.title === "string" ? pt.title : undefined,
            description: typeof pt.description === "string" ? pt.description : undefined,
          });
        });
      });

      points.sort((a, b) => a.x - b.x);
      const { stageScores: _removed, ...rest } = raw;
      return { ...rest, points } as unknown as MotivationMap;
    }),
  };
}

/**
 * Apply any necessary migrations to a raw parsed blueprint object so it
 * conforms to the current Blueprint type. Safe to call on already-current data.
 */
export function migrateBlueprint(raw: unknown): Blueprint {
  let bp = isV1(raw) ? migrateV1(raw as V1Blueprint) : (raw as Blueprint);
  // Ensure stageGroups exists for files saved before this field was added
  if (!Array.isArray((bp as unknown as Record<string, unknown>).stageGroups)) {
    bp = { ...bp, stageGroups: [] };
  }
  // Normalise callout phaseId string → phaseIds array (v2 files)
  bp = normaliseCalloutPhaseIds(bp);
  // Migrate stageScores → flat points array
  bp = migrateStageScores(bp);
  return bp;
}
