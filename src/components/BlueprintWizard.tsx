// BlueprintWizard — step-by-step builder to create a blank blueprint structure.
//
// Steps:
//   1. Blueprint name + sections
//   2. Stages per section
//   3. Phases per stage (optional)
//   4. Swimlanes
//
// On finish, produces a Blueprint object and calls onComplete.

import { useState, useCallback } from "react";
import type { Blueprint, Section, JourneyStage, Phase, Swimlane } from "../types/blueprint";
import { slugify } from "../utils/idGenerator";

interface Props {
  onComplete: (blueprint: Blueprint, name: string) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Editable row helpers
// ---------------------------------------------------------------------------

interface NameRow {
  id: string;
  name: string;
  description: string;
  /** Only used for swimlane rows. */
  isMotivationMap?: boolean;
}

let _rowCounter = 0;
function emptyRow(prefix: string): NameRow {
  _rowCounter++;
  return { id: `${prefix}_${_rowCounter}`, name: "", description: "" };
}

function RowInput({
  row,
  placeholder,
  onChangeName,
  onChangeDesc,
  onRemove,
}: {
  row: NameRow;
  placeholder: string;
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
        />
        <input
          type="text"
          value={row.description}
          onChange={(e) => onChangeDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-neutral-gray-100 bg-neutral-gray-50 px-3 py-1.5 text-xs text-neutral-gray-600 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 shrink-0 text-neutral-gray-400 transition hover:text-semantic-error"
        title="Remove"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-brand-cyan-500/40 bg-brand-cyan-500/5 px-3 py-1.5 text-xs font-medium text-brand-cyan-600 transition hover:border-brand-cyan-500 hover:bg-brand-cyan-500/10"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

function SwimlaneRowInput({
  row,
  placeholder,
  onChangeName,
  onChangeDesc,
  onToggleType,
  onRemove,
}: {
  row: NameRow;
  placeholder: string;
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onToggleType: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
        />
        <input
          type="text"
          value={row.description}
          onChange={(e) => onChangeDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-neutral-gray-100 bg-neutral-gray-50 px-3 py-1.5 text-xs text-neutral-gray-600 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
        />
        <label className="mt-0.5 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={row.isMotivationMap ?? false}
            onChange={onToggleType}
            className="h-3.5 w-3.5 rounded border-neutral-gray-300 text-brand-purple-500 accent-brand-purple-500"
          />
          <span className={`text-[11px] font-medium ${row.isMotivationMap ? "text-brand-purple-500" : "text-neutral-gray-500"}`}>
            Motivation Map
          </span>
        </label>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 shrink-0 text-neutral-gray-400 transition hover:text-semantic-error"
        title="Remove"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------
const STEPS = ["Sections", "Stages", "Phase Groups", "Swimlanes"] as const;

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
              i <= current
                ? "bg-brand-cyan-500 text-white"
                : "bg-neutral-gray-200 text-neutral-gray-500"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs font-medium ${
              i <= current ? "text-brand-navy-1000" : "text-neutral-gray-400"
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-6 ${i < current ? "bg-brand-cyan-500" : "bg-neutral-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------
export function BlueprintWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [blueprintName, setBlueprintName] = useState("My Blueprint");

  // Step 1: Sections
  const [sections, setSections] = useState<NameRow[]>(() => [
    { ...emptyRow("sec"), name: "Front Stage" },
  ]);

  // Step 2: Stages (keyed by section id)
  const [stagesBySection, setStagesBySection] = useState<Record<string, NameRow[]>>({});

  // Step 3: Phase Groups per section. Each group has multiple phase names per stage.
  interface PhaseGroupRow { id: string; stages: Record<string, string[]>; }
  const [phaseGroupsBySection, setPhaseGroupsBySection] = useState<Record<string, PhaseGroupRow[]>>({});

  // Step 4: Swimlanes (keyed by phase group id)
  const [swimlanesByGroup, setSwimlanesByGroup] = useState<Record<string, NameRow[]>>({});

  // Ensure stagesBySection has entries for all current sections
  const ensureStages = useCallback(() => {
    setStagesBySection((prev) => {
      const next = { ...prev };
      for (const sec of sections) {
        if (!next[sec.id]) next[sec.id] = [emptyRow("stg")];
      }
      return next;
    });
  }, [sections]);

  // Ensure phaseGroupsBySection has at least one empty group per section
  const ensurePhaseGroups = useCallback(() => {
    setPhaseGroupsBySection((prev) => {
      const next = { ...prev };
      for (const sec of sections) {
        if (!next[sec.id] || next[sec.id].length === 0) {
          next[sec.id] = [{ id: emptyRow("pg").id, stages: {} }];
        }
      }
      return next;
    });
  }, [sections]);

  // Ensure swimlanesByGroup has default swimlanes for each group
  const ensureSwimlanes = useCallback(() => {
    setSwimlanesByGroup((prev) => {
      const next = { ...prev };
      for (const groups of Object.values(phaseGroupsBySection)) {
        for (const g of groups) {
          if (!next[g.id]) {
            next[g.id] = [
              { ...emptyRow("sl"), name: "Doing - Online" },
              { ...emptyRow("sl"), name: "Motivation Map", isMotivationMap: true },
              { ...emptyRow("sl"), name: "Doing - Offline" },
            ];
          }
        }
      }
      return next;
    });
  }, [phaseGroupsBySection]);

  const updateRow = <T extends NameRow>(
    list: T[],
    index: number,
    field: "name" | "description",
    value: string,
  ): T[] => list.map((r, i) => (i === index ? { ...r, [field]: value } : r));

  const removeRow = <T extends NameRow>(list: T[], index: number): T[] =>
    list.filter((_, i) => i !== index);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const canNext = (): boolean => {
    if (step === 0) return sections.some((s) => s.name.trim());
    if (step === 1) return Object.values(stagesBySection).some((arr) => arr.some((s) => s.name.trim()));
    if (step === 2) return true; // phases are optional
    if (step === 3) return Object.values(swimlanesByGroup).some((arr) => arr.some((s) => s.name.trim()));
    return false;
  };

  const goNext = () => {
    if (step === 0) { ensureStages(); setStep(1); }
    else if (step === 1) { ensurePhaseGroups(); setStep(2); }
    else if (step === 2) { ensureSwimlanes(); setStep(3); }
    else if (step === 3) finish();
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else onCancel();
  };

  // ---------------------------------------------------------------------------
  // Finish: build Blueprint
  // ---------------------------------------------------------------------------
  const finish = () => {
    const bpSections: Section[] = sections
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        id: slugify(s.name) || s.id,
        name: s.name.trim(),
        description: s.description.trim() || undefined,
        order: i + 1,
      }));

    const bpStages: JourneyStage[] = [];
    const bpPhases: Phase[] = [];
    const bpSwimlanes: Swimlane[] = [];
    let stageOrder = 1;
    let phaseOrder = 1;
    let swimlaneOrder = 1;

    for (const sec of bpSections) {
      const origSec = sections.find((s) => (slugify(s.name) || s.id) === sec.id);

      // Stages
      const stages = stagesBySection[origSec?.id ?? ""] ?? [];
      const stageIdMap = new Map<string, string>(); // origId → bpId
      for (const stg of stages) {
        if (!stg.name.trim()) continue;
        const stageId = slugify(stg.name) || stg.id;
        stageIdMap.set(stg.id, stageId);
        bpStages.push({
          id: stageId,
          name: stg.name.trim(),
          sectionId: sec.id,
          description: stg.description.trim() || undefined,
          order: stageOrder++,
        });
      }

      // Phase groups → phases + swimlanes
      const groups = phaseGroupsBySection[origSec?.id ?? ""] ?? [];
      for (const group of groups) {
        const groupId = group.id;
        // Create phases — multiple per stage allowed
        for (const [origStgId, stageId] of stageIdMap) {
          const phaseNames = group.stages[origStgId] ?? [];
          for (const phaseName of phaseNames) {
            if (!phaseName.trim()) continue;
            bpPhases.push({
              id: `${groupId}_${stageId}_${phaseOrder}`,
              name: phaseName.trim(),
              stageId,
              groupId,
              order: phaseOrder++,
            });
          }
        }

        // Swimlanes for this group
        const sls = swimlanesByGroup[groupId] ?? [];
        for (const sl of sls) {
          if (!sl.name.trim()) continue;
          bpSwimlanes.push({
            id: slugify(sl.name + "_" + groupId) || sl.id,
            name: sl.name.trim(),
            type: sl.isMotivationMap ? "motivation_map" as const : "moments" as const,
            sectionId: sec.id,
            phaseId: groupId,
            description: sl.description.trim() || undefined,
            order: swimlaneOrder++,
          });
        }
      }
    }

    const blueprint: Blueprint = {
      sections: bpSections,
      journeyStages: bpStages,
      phases: bpPhases,
      swimlanes: bpSwimlanes,
      touchpoints: [],
      callouts: [],
      insights: [],
      motivationMaps: [],
    };

    onComplete(blueprint, blueprintName.trim() || "My Blueprint");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-start justify-center bg-neutral-sand-50 px-10 py-12">
      <div className="flex w-full max-w-7xl gap-16">

        {/* Left column: sticky preview */}
        <div className="hidden w-[320px] shrink-0 lg:block">
          <div className="sticky top-12">
            {step > 0 ? (
              <StructurePreview
                sections={sections}
                stagesBySection={stagesBySection}
                phaseGroupsBySection={phaseGroupsBySection}
                swimlanesByGroup={swimlanesByGroup}
                currentStep={step}
              />
            ) : (
              <div className="rounded-[20px] border border-neutral-gray-100 bg-neutral-gray-50 p-5 text-center text-xs text-neutral-gray-400">
                Preview will appear after adding sections
              </div>
            )}
          </div>
        </div>

        {/* Right column: wizard form */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-brand-navy-1000">New Blueprint</h1>
            <div className="mt-4">
              <StepBar current={step} />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-[20px] bg-white p-8 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">

          {/* Step 0: Sections */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-gray-500">
                  Blueprint Name
                </label>
                <input
                  type="text"
                  value={blueprintName}
                  onChange={(e) => setBlueprintName(e.target.value)}
                  placeholder="e.g. Customer Onboarding Journey"
                  className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                />
              </div>
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-neutral-gray-500">
                  Sections
                </label>
                <div className="flex flex-col gap-3">
                  {sections.map((row, i) => (
                    <RowInput
                      key={row.id}
                      row={row}
                      placeholder={`Section ${i + 1} name`}
                      onChangeName={(v) => setSections(updateRow(sections, i, "name", v))}
                      onChangeDesc={(v) => setSections(updateRow(sections, i, "description", v))}
                      onRemove={() => setSections(removeRow(sections, i))}
                    />
                  ))}
                  <AddButton
                    label="Add section"
                    onClick={() => setSections([...sections, emptyRow("sec")])}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Stages per section */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {sections.filter((s) => s.name.trim()).map((sec) => (
                <div key={sec.id}>
                  <label className="mb-3 block text-sm font-bold text-brand-navy-1000">
                    {sec.name} <span className="font-normal text-neutral-gray-500">— stages</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    {(stagesBySection[sec.id] ?? []).map((row, i) => (
                      <RowInput
                        key={row.id}
                        row={row}
                        placeholder={`Stage ${i + 1}`}
                        onChangeName={(v) =>
                          setStagesBySection((prev) => ({
                            ...prev,
                            [sec.id]: updateRow(prev[sec.id] ?? [], i, "name", v),
                          }))
                        }
                        onChangeDesc={(v) =>
                          setStagesBySection((prev) => ({
                            ...prev,
                            [sec.id]: updateRow(prev[sec.id] ?? [], i, "description", v),
                          }))
                        }
                        onRemove={() =>
                          setStagesBySection((prev) => ({
                            ...prev,
                            [sec.id]: removeRow(prev[sec.id] ?? [], i),
                          }))
                        }
                      />
                    ))}
                    <AddButton
                      label="Add stage"
                      onClick={() =>
                        setStagesBySection((prev) => ({
                          ...prev,
                          [sec.id]: [...(prev[sec.id] ?? []), emptyRow("stg")],
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Phase Groups per section */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <p className="text-sm text-neutral-gray-600">
                Each phase group has a phase name per stage. Swimlanes will be added to each group in the next step.
              </p>
              {sections.filter((s) => s.name.trim()).map((sec) => {
                const stages = (stagesBySection[sec.id] ?? []).filter((s) => s.name.trim());
                if (stages.length === 0) return null;
                const groups = phaseGroupsBySection[sec.id] ?? [];
                return (
                  <div key={sec.id}>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-gray-400">
                      {sec.name}
                    </div>
                    {groups.map((group, gi) => (
                      <div key={group.id} className="mb-4 rounded-lg border border-neutral-gray-100 bg-neutral-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-navy-1000">Phase Group {gi + 1}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPhaseGroupsBySection((prev) => ({
                                ...prev,
                                [sec.id]: (prev[sec.id] ?? []).filter((_, j) => j !== gi),
                              }))
                            }
                            className="text-neutral-gray-400 hover:text-semantic-error"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col gap-3">
                          {stages.map((stg) => {
                            const phaseNames = group.stages[stg.id] ?? [];
                            return (
                              <div key={stg.id}>
                                <span className="mb-1 block text-[11px] font-medium text-neutral-gray-500">{stg.name}</span>
                                <div className="flex flex-col gap-1 pl-2">
                                  {phaseNames.map((pName, pi) => (
                                    <div key={pi} className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={pName}
                                        onChange={(e) =>
                                          setPhaseGroupsBySection((prev) => ({
                                            ...prev,
                                            [sec.id]: (prev[sec.id] ?? []).map((g, j) =>
                                              j === gi ? { ...g, stages: { ...g.stages, [stg.id]: g.stages[stg.id].map((n: string, k: number) => k === pi ? e.target.value : n) } } : g,
                                            ),
                                          }))
                                        }
                                        placeholder={`Phase ${pi + 1}`}
                                        className="flex-1 rounded-md border border-neutral-gray-200 bg-white px-2.5 py-1.5 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPhaseGroupsBySection((prev) => ({
                                            ...prev,
                                            [sec.id]: (prev[sec.id] ?? []).map((g, j) =>
                                              j === gi ? { ...g, stages: { ...g.stages, [stg.id]: g.stages[stg.id].filter((_: string, k: number) => k !== pi) } } : g,
                                            ),
                                          }))
                                        }
                                        className="shrink-0 text-neutral-gray-400 hover:text-semantic-error"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPhaseGroupsBySection((prev) => ({
                                        ...prev,
                                        [sec.id]: (prev[sec.id] ?? []).map((g, j) =>
                                          j === gi ? { ...g, stages: { ...g.stages, [stg.id]: [...(g.stages[stg.id] ?? []), ""] } } : g,
                                        ),
                                      }))
                                    }
                                    className="self-start text-[10px] font-medium text-brand-cyan-600 hover:text-brand-cyan-500"
                                  >
                                    + phase
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <AddButton
                      label="Add Phase Group"
                      onClick={() =>
                        setPhaseGroupsBySection((prev) => ({
                          ...prev,
                          [sec.id]: [...(prev[sec.id] ?? []), { id: emptyRow("pg").id, stages: {} }],
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3: Swimlanes per phase group */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <p className="text-sm text-neutral-gray-600">
                Add swimlanes to each phase group. Check the box for motivation maps.
              </p>
              {sections.filter((s) => s.name.trim()).flatMap((sec) => {
                const groups = phaseGroupsBySection[sec.id] ?? [];
                return groups.map((group, gi) => (
                <div key={group.id}>
                  <label className="mb-3 block text-sm font-bold text-brand-navy-1000">
                    {sec.name} — Phase Group {gi + 1}
                  </label>
                  <div className="flex flex-col gap-3">
                    {(swimlanesByGroup[group.id] ?? []).map((row, i) => (
                      <SwimlaneRowInput
                        key={row.id}
                        row={row}
                        placeholder={`Swimlane ${i + 1}`}
                        onChangeName={(v) =>
                          setSwimlanesByGroup((prev) => ({
                            ...prev,
                            [group.id]: updateRow(prev[group.id] ?? [], i, "name", v),
                          }))
                        }
                        onChangeDesc={(v) =>
                          setSwimlanesByGroup((prev) => ({
                            ...prev,
                            [group.id]: updateRow(prev[group.id] ?? [], i, "description", v),
                          }))
                        }
                        onToggleType={() =>
                          setSwimlanesByGroup((prev) => ({
                            ...prev,
                            [group.id]: (prev[group.id] ?? []).map((r, j) =>
                              j === i ? { ...r, isMotivationMap: !r.isMotivationMap } : r,
                            ),
                          }))
                        }
                        onRemove={() =>
                          setSwimlanesByGroup((prev) => ({
                            ...prev,
                            [group.id]: removeRow(prev[group.id] ?? [], i),
                          }))
                        }
                      />
                    ))}
                    <AddButton
                      label="Add swimlane"
                      onClick={() =>
                        setSwimlanesByGroup((prev) => ({
                          ...prev,
                          [group.id]: [...(prev[group.id] ?? []), emptyRow("sl")],
                        }))
                      }
                    />
                  </div>
                </div>
                ));
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="rounded-md border border-neutral-gray-200 bg-white px-4 py-2 text-sm font-medium text-neutral-gray-700 hover:bg-neutral-gray-50"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext()}
            className="rounded-md bg-brand-cyan-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-500 disabled:opacity-40 disabled:hover:bg-brand-cyan-500"
          >
            {step === 3 ? "Create Blueprint" : "Next"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StructurePreview — mini visual of the blueprint structure so far
// ---------------------------------------------------------------------------
function StructurePreview({
  sections,
  stagesBySection,
  phaseGroupsBySection,
  swimlanesByGroup,
  currentStep,
}: {
  sections: NameRow[];
  stagesBySection: Record<string, NameRow[]>;
  phaseGroupsBySection: Record<string, Array<{ id: string; stages: Record<string, string[]> }>>;
  swimlanesByGroup: Record<string, NameRow[]>;
  currentStep: number;
}) {
  const validSections = sections.filter((s) => s.name.trim());
  if (validSections.length === 0) return null;

  return (
    <div className="max-w-[320px] overflow-hidden rounded-[20px] border border-neutral-gray-100 bg-neutral-gray-50 p-5">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-gray-400">
        Preview
      </div>

      <div className="flex flex-col gap-3">
        {validSections.map((sec) => {
          const stages = (stagesBySection[sec.id] ?? []).filter((s) => s.name.trim());
          const groups = phaseGroupsBySection[sec.id] ?? [];
          return (
            <div key={sec.id} className="overflow-hidden rounded-lg bg-white p-3 shadow-sm">
              <div className="mb-2 truncate text-[12px] font-bold text-brand-navy-1000">
                {sec.name}
              </div>
              {/* Stages */}
              {stages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {stages.map((stg) => (
                    <div key={stg.id} className="truncate rounded-md bg-neutral-gray-200 px-2.5 py-1 text-[10px] font-bold text-brand-navy-1000">
                      {stg.name}
                    </div>
                  ))}
                </div>
              )}
              {/* Phase groups */}
              {currentStep >= 2 && groups.map((g, gi) => {
                const phaseNames = stages.flatMap((stg) => (g.stages[stg.id] ?? []).filter(Boolean));
                const groupSwimlanes = (swimlanesByGroup[g.id] ?? []).filter((s) => s.name.trim());
                return (
                  <div key={g.id} className="mt-1.5 border-t border-neutral-gray-100 pt-1.5">
                    <div className="flex flex-wrap gap-1">
                      {phaseNames.length > 0 ? phaseNames.map((name, i) => (
                        <div key={i} className="truncate rounded bg-brand-navy-900 px-2 py-0.5 text-[9px] font-medium text-white">
                          {name}
                        </div>
                      )) : (
                        <span className="text-[9px] text-neutral-gray-400">Group {gi + 1}</span>
                      )}
                    </div>
                    {currentStep >= 3 && groupSwimlanes.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {groupSwimlanes.map((sl) => (
                          <div key={sl.id} className={`truncate rounded px-2 py-0.5 text-[9px] font-medium ${sl.isMotivationMap ? "bg-brand-purple-500/15 text-brand-purple-500" : "border border-neutral-gray-200 bg-white text-neutral-gray-600"}`}>
                            {sl.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
