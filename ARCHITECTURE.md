# Blueprint App — Architecture Reference

## Stack

React 19 + TypeScript + Vite + Tailwind CSS. State managed via `useReducer` + React Context (`BlueprintContext`). No external state library.

---

## Data Hierarchy

```
Blueprint
└── Section[]               — top-level grouping (e.g. "Pre-Purchase", "Onboarding")
    └── JourneyStage[]      — discrete stage in the journey (columns in the grid)
        └── Phase[]         — sub-step within a stage (subdivides a stage column)
            └── Swimlane[]  — horizontal row (type: "moments" | "motivation_map")
                └── Touchpoint[]   — specific interaction card in a cell
                └── Callout[]      — annotation badge (pain point, opportunity, etc.)
```

Insights and MotivationMaps sit alongside this hierarchy (stage-level).

---

## Key Types (`src/types/blueprint.ts`)

| Type | Key fields | Notes |
|------|-----------|-------|
| `Section` | `id, name, order, stageLabel?` | Groups stages; `stageLabel` overrides the "Stage" row header |
| `JourneyStage` | `id, name, sectionId, order` | One grid column per stage |
| `Phase` | `id, name, stageId, groupId?, groupLabel?, order` | Phases sharing a `groupId` form a **phase group** row. `groupLabel` stored on all phases in the group |
| `Swimlane` | `id, name, type, sectionId, phaseId?, order` | `phaseId` = the group's first phase ID; absent = orphan (stage-level) |
| `Touchpoint` | `id, stageId, swimlaneId, phaseId?, order` | `phaseId` set → lives in a phase sub-cell; absent → stage-level cell |
| `Callout` | `id, stageId, swimlaneId?, phaseId?, type` | Same phase logic as Touchpoint |
| `MotivationMap` | `swimlaneId, stageScores: Record<stageId\|phaseId, DataPoint[]>` | Keyed by phaseId when phases exist, stageId otherwise |

---

## Grid Layout (`src/components/BlueprintCanvas.tsx`)

Each **Section** renders as an independent white card containing a single CSS Grid. All rows (`display: contents`) share the same grid template so columns align:

```
[label col 190px] [stage col 1] [stage col 2] ... [stage col N] [auto — edit buttons]
```

### Phase groups

When a section has phase groups, each stage column is **not subdivided at the grid level**. Instead, the phase header row and swimlane rows both use **flexbox within the stage cell** to show N side-by-side sub-cells (one per phase). This keeps the grid column count equal to stage count regardless of phase count.

### Row types rendered (in order)

1. **Stage header row** — one cell per stage (spans `display: contents`)
2. For each `SectionItem` (sorted by `order`):
   - **Orphan swimlane** — `Swimlane` with no `phaseId`; one cell per stage
   - **Phase group** — phases header row (flex sub-cells), then its swimlanes below
3. `+ Add Phase Group` button (edit mode)

### `SectionItem` ordering

Orphan swimlanes and phase groups are merged into a single sorted array (`sectionItems`) by `order`. This enables true interleaving of swimlanes and phase groups.

---

## Column Filtering Logic

```ts
touchpointsForColumn(touchpoints, swimlaneId, col, phaseId?)
```

- **phaseId provided** (phase-group cell) → match `tp.phaseId === phaseId`
- **no phaseId** (orphan swimlane cell) → match `tp.stageId === col.stageId`

Callouts follow the same logic. A callout with no `phaseId` shows in **all** phase cells of its stage.

---

## State Management (`src/context/BlueprintContext.tsx`)

Single `useReducer` with typed actions:

```
ADD_SECTION / UPDATE_SECTION / DELETE_SECTION
ADD_STAGE   / UPDATE_STAGE   / DELETE_STAGE
ADD_PHASE   / UPDATE_PHASE   / DELETE_PHASE
ADD_SWIMLANE / UPDATE_SWIMLANE / DELETE_SWIMLANE
ADD_TOUCHPOINT / UPDATE_TOUCHPOINT / DELETE_TOUCHPOINT
ADD_CALLOUT / UPDATE_CALLOUT / DELETE_CALLOUT
ADD_INSIGHT / UPDATE_INSIGHT / DELETE_INSIGHT
ADD_MOTIVATION_MAP / UPDATE_MOTIVATION_MAP
LOAD_BLUEPRINT      — replaces entire blueprint + touchpointMedia
BATCH_REORDER       — atomic swimlane/phase order update (drag-and-drop)
```

Media (images) for touchpoints lives in `touchpointMedia: Record<touchpointId, Media>` in context state — separate from the blueprint JSON so it doesn't bloat the data model.

---

## File Format (`.bp`)

A `.bp` file is a ZIP archive (via JSZip):

```
blueprint.json   — full Blueprint + touchpointMedia as inline data URLs
metadata.json    — fileName, appVersion, savedAt
```

Save uses `showSaveFilePicker` (native OS dialog) with fallback to blob download. Load parses the ZIP and calls `LOAD_BLUEPRINT`.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/types/blueprint.ts` | All domain types |
| `src/context/BlueprintContext.tsx` | Reducer, context, actions |
| `src/components/BlueprintCanvas.tsx` | Grid renderer, drag-reorder, all row types |
| `src/components/EditDrawer.tsx` | All entity create/edit forms |
| `src/components/SwimlaneCell.tsx` | Renders touchpoints + callouts in a cell |
| `src/lib/blueprintLayout.ts` | Grid CSS constants (`LABEL_COL_W`, `MIN_COL_W`) |
| `src/utils/blueprintFile.ts` | Save / load `.bp` files |
| `src/utils/sampleBlueprint.ts` | Default blueprint shown on first load |
