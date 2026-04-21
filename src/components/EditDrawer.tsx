// EditDrawer — slide-in side panel for editing blueprint entities.
//
// Opens from the right when editingEntity is set. Shows form fields
// appropriate to the entity type, with Save/Cancel/Delete actions.

import { useCallback, useEffect, useRef, useState } from "react";
import { useBlueprint } from "../hooks/useBlueprint";
import type { EditableEntityType } from "../context/BlueprintContext";
import type {
  Section,
  JourneyStage,
  Phase,
  Swimlane,
  Touchpoint,
  Callout,
  CalloutType,
  MotivationMap as MotivationMapData,
  MotivationDataPoint,
  StageGroup,
} from "../types/blueprint";
import { slugify } from "../utils/idGenerator";

// ---------------------------------------------------------------------------
// Shared form helpers
// ---------------------------------------------------------------------------

// Preset palette — backgrounds and text colors
const BG_PRESETS = [
  "#0F1724", "#1E3A5F", "#0891B2", "#0D9488", "#059669",
  "#D97706", "#EA580C", "#DC2626", "#7C3AED", "#DB2777",
  "#374151", "#6B7280", "#D1D5DB", "#F3F4F6", "#FFFFFF",
];
const TEXT_PRESETS = ["#FFFFFF", "#F9FAFB", "#0F1724", "#000000"];

function ColorPicker({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray-500">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onChange(color)}
            className="h-6 w-6 shrink-0 rounded-md border transition hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value === color ? "#0891B2" : color === "#FFFFFF" ? "#D1D5DB" : color,
              boxShadow: value === color ? "0 0 0 2px #0891B2" : undefined,
            }}
          />
        ))}
        {/* Custom color input */}
        <div className="relative">
          <input
            type="color"
            value={value || presets[0]}
            onChange={(e) => onChange(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-md border border-neutral-gray-200 p-0"
            title="Custom colour"
          />
        </div>
      </div>
    </div>
  );
}

function PillPreview({ name, bgColor, textColor, defaultBg }: { name: string; bgColor: string; textColor: string; defaultBg: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray-500">Preview</label>
      <div
        className="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-[14px] font-bold"
        style={{ backgroundColor: bgColor || defaultBg, color: textColor || "#FFFFFF" }}
      >
        {name || "Stage name"}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Preview"
            className="h-28 w-full rounded-md border border-neutral-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1.5 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-gray-700 shadow hover:bg-white"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`grid h-28 cursor-pointer place-items-center rounded-md border-2 border-dashed text-xs transition ${
            dragging
              ? "border-brand-cyan-500 bg-brand-cyan-500/5 text-brand-cyan-500"
              : "border-neutral-gray-300 bg-neutral-gray-50 text-neutral-gray-500 hover:border-brand-cyan-500"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Drop image or click to upload</span>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity type labels
// ---------------------------------------------------------------------------
const TYPE_LABELS: Record<EditableEntityType, string> = {
  section: "Section",
  stage: "Stage",
  stage_group: "Stage Group",
  phase: "Phase",
  swimlane: "Swimlane",
  touchpoint: "Touchpoint",
  callout: "Callout",
  motivation_point: "Data Point",
};

// ---------------------------------------------------------------------------
// EditDrawer
// ---------------------------------------------------------------------------
export function EditDrawer() {
  const { state, dispatch, setEditingEntity } = useBlueprint();
  const { blueprint, editingEntity } = state;

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingEntity(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setEditingEntity]);

  // Reset delete confirmation when entity changes
  useEffect(() => setConfirmDelete(false), [editingEntity?.id]);

  if (!editingEntity || !blueprint) return null;

  const { type, id, isNew } = editingEntity;
  const parentParts = (editingEntity.parentId ?? "").split(":");
  const isNewPhaseGroup = type === "phase" && isNew && !parentParts[1];
  const label = isNewPhaseGroup ? "Phase Group" : TYPE_LABELS[type];

  const close = () => setEditingEntity(null);


  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const deleteType = `DELETE_${type.toUpperCase()}` as Action["type"];
    dispatch({ type: deleteType, id } as any);
    close();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[360px] animate-[slideIn_150ms_ease-out] flex-col border-l border-neutral-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-gray-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-cyan-500">
            {isNew ? `Add ${label}` : `Edit ${label}`}
          </div>
        </div>
        <button
          onClick={close}
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-gray-500 hover:bg-neutral-gray-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {type === "section" && <SectionForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} onClose={close} />}
        {type === "stage" && <StageForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "phase" && <PhaseForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "swimlane" && <SwimlaneForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "touchpoint" && <TouchpointForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "callout" && <CalloutForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "motivation_point" && <MotivationPointForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "stage_group" && <StageGroupForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
      </div>

      {/* Footer — delete (not for motivation points, they handle their own) */}
      {!isNew && type !== "motivation_point" && (
        <div className="border-t border-neutral-gray-100 px-5 py-3">
          <button
            onClick={handleDelete}
            className={`w-full rounded-md px-3 py-2 text-xs font-semibold transition ${
              confirmDelete
                ? "bg-semantic-error text-white"
                : "text-semantic-error hover:bg-semantic-error/5"
            }`}
          >
            {confirmDelete ? `Confirm delete ${label.toLowerCase()}` : `Delete ${label.toLowerCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity-specific forms
// ---------------------------------------------------------------------------

type FormProps = {
  id: string;
  bp: NonNullable<BlueprintState["blueprint"]>;
  dispatch: React.Dispatch<any>;
  isNew?: boolean;
  parentId?: string;
  onClose: () => void;
};

type BlueprintState = import("../context/BlueprintContext").BlueprintState;
type Action = Parameters<typeof import("../context/BlueprintContext").BlueprintContext extends React.Context<infer V> ? V extends { dispatch: React.Dispatch<infer A> } ? (a: A) => void : never : never>[0];

// ── Section ──
function SectionForm({ id, bp, dispatch, isNew, onClose }: FormProps) {
  const existing = bp.sections.find((s) => s.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({ type: "ADD_SECTION", section: { id: newId, name: name.trim(), description: description.trim() || undefined, order: bp.sections.length + 1 } as Section });
    } else {
      dispatch({ type: "UPDATE_SECTION", id, changes: { name: name.trim(), description: description.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Section name" /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

// ── Stage ──
const STAGE_DEFAULT_BG = "#E5E7EB";
const STAGE_DEFAULT_TEXT = "#0F1724";

function StageForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.journeyStages.find((s) => s.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sectionId, setSectionId] = useState(existing?.sectionId ?? parentId ?? bp.sections[0]?.id ?? "");
  const [stageGroupId, setStageGroupId] = useState(existing?.stageGroupId ?? "");
  const [bgColor, setBgColor] = useState(existing?.bgColor ?? STAGE_DEFAULT_BG);
  const [textColor, setTextColor] = useState(existing?.textColor ?? STAGE_DEFAULT_TEXT);

  // Compute available groups for this section
  const sectionGroups = (bp.stageGroups ?? []).filter((g) => g.sectionId === sectionId);

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({ type: "ADD_STAGE", stage: { id: newId, name: name.trim(), sectionId, stageGroupId: stageGroupId || undefined, description: description.trim() || undefined, bgColor, textColor, order: bp.journeyStages.length + 1 } as JourneyStage });
    } else {
      dispatch({ type: "UPDATE_STAGE", id, changes: { name: name.trim(), sectionId, stageGroupId: stageGroupId || undefined, description: description.trim() || undefined, bgColor, textColor } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Stage name" /></Field>
      <Field label="Section">
        <SelectInput value={sectionId} onChange={(v) => { setSectionId(v); setStageGroupId(""); }} options={bp.sections.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      {sectionGroups.length > 0 && (
        <Field label="Stage Group">
          <SelectInput
            value={stageGroupId}
            onChange={setStageGroupId}
            options={[
              { value: "", label: "(No group)" },
              ...sectionGroups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </Field>
      )}
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <ColorPicker label="Background colour" value={bgColor} onChange={setBgColor} presets={BG_PRESETS} />
      <ColorPicker label="Text colour" value={textColor} onChange={setTextColor} presets={TEXT_PRESETS} />
      <PillPreview name={name} bgColor={bgColor} textColor={textColor} defaultBg={STAGE_DEFAULT_BG} />
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

const PHASE_DEFAULT_BG = "#0F1724";
const PHASE_DEFAULT_TEXT = "#FFFFFF";

// ── Phase ──
function PhaseForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.phases.find((p) => p.id === id);
  // parentId format: "stageId:groupId"
  const parentParts = (parentId ?? "").split(":");
  const parentStage = parentParts[0] || "";
  const parentGroup = parentParts[1] || "";
  // New group = isNew with no parentGroup; new phase = isNew with parentGroup
  const isNewGroup = isNew && !parentGroup;
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [stageId, setStageId] = useState(existing?.stageId ?? (parentStage || (bp.journeyStages[0]?.id ?? "")));
  const [bgColor, setBgColor] = useState(existing?.bgColor ?? PHASE_DEFAULT_BG);
  const [textColor, setTextColor] = useState(existing?.textColor ?? PHASE_DEFAULT_TEXT);
  const [applyToAll, setApplyToAll] = useState(false);

  const save = () => {
    if (!name.trim()) return;
    const groupId = existing?.groupId ?? (parentGroup || undefined);
    if (isNew) {
      const newId = slugify(name) || id;
      // Inherit the group's current order so it stays in its reordered position.
      // For a new group, place it at the end.
      let order: number;
      if (groupId) {
        // Place after the last existing phase in the same stage+group so it appends correctly.
        const stageGroupPhases = bp.phases.filter(
          (p) => p.stageId === stageId && (p.groupId ?? p.id) === groupId,
        );
        order = stageGroupPhases.length > 0
          ? Math.max(...stageGroupPhases.map((p) => p.order)) + 1
          : (bp.phases.length > 0 ? Math.max(...bp.phases.map((p) => p.order)) + 1 : 0);
      } else {
        order = bp.phases.length > 0 ? Math.max(...bp.phases.map((p) => p.order)) + 100 : 0;
      }
      // For a new group, the title becomes the groupLabel; the phase name defaults to the title too.
      const groupLabel = isNewGroup ? name.trim() : undefined;
      const newGroupId = isNewGroup ? newId : groupId;
      dispatch({ type: "ADD_PHASE", phase: { id: newId, name: name.trim(), stageId, groupId: newGroupId, groupLabel, description: description.trim() || undefined, bgColor, textColor, order } as Phase });
    } else {
      dispatch({ type: "UPDATE_PHASE", id, changes: { name: name.trim(), stageId, description: description.trim() || undefined, bgColor, textColor } });
    }
    if (applyToAll) {
      const gid = isNew ? (slugify(name) || id) : (existing?.groupId ?? (parentGroup || undefined));
      const otherPhases = bp.phases.filter((p) => {
        if (p.id === (isNew ? (slugify(name) || id) : id)) return false;
        if (gid) return (p.groupId ?? p.id) === gid;
        return true; // no group — apply to all phases
      });
      for (const p of otherPhases) {
        dispatch({ type: "UPDATE_PHASE", id: p.id, changes: { bgColor, textColor } });
      }
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label={isNewGroup ? "Group Title" : "Name"}>
        <TextInput value={name} onChange={setName} placeholder={isNewGroup ? "Phase group title" : "Phase name"} />
      </Field>
      <Field label="Stage">
        <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <ColorPicker label="Background colour" value={bgColor} onChange={setBgColor} presets={BG_PRESETS} />
      <ColorPicker label="Text colour" value={textColor} onChange={setTextColor} presets={TEXT_PRESETS} />
      <PillPreview name={name} bgColor={bgColor} textColor={textColor} defaultBg={PHASE_DEFAULT_BG} />
      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-gray-50">
        <input
          type="checkbox"
          className="accent-brand-cyan-500"
          checked={applyToAll}
          onChange={() => setApplyToAll(!applyToAll)}
        />
        <span className="text-brand-navy-1000">Apply colours to all phases</span>
      </label>
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

// ── Swimlane ──
function SwimlaneForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.swimlanes.find((s) => s.id === id);
  // parentId format: "sectionId:phaseId"
  const parentParts = (parentId ?? "").split(":");
  const parentSection = parentParts[0] || "";
  const parentPhase = parentParts[1] || "";
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [type, setType] = useState<string>(existing?.type ?? "moments");
  const [sectionId] = useState(existing?.sectionId ?? (parentSection || (bp.sections[0]?.id ?? "")));
  const [phaseId, setPhaseId] = useState(existing?.phaseId ?? parentPhase ?? "");

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      // Append after existing swimlanes in the same group (or orphan pool) so
      // reordered positions are preserved.
      const peers = bp.swimlanes.filter((sl) =>
        sl.sectionId === sectionId && (phaseId ? sl.phaseId === phaseId : !sl.phaseId),
      );
      const order = peers.length > 0 ? Math.max(...peers.map((sl) => sl.order)) + 10 : 0;
      dispatch({ type: "ADD_SWIMLANE", swimlane: { id: newId, name: name.trim(), type: type as Swimlane["type"], sectionId, phaseId: phaseId || undefined, description: description.trim() || undefined, order } as Swimlane });
    } else {
      dispatch({ type: "UPDATE_SWIMLANE", id, changes: { name: name.trim(), type: type as Swimlane["type"], sectionId, phaseId: phaseId || undefined, description: description.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Swimlane name" /></Field>
      <Field label="Phase group">
        {(() => {
          // Deduplicate phases by groupId — one option per phase group
          const seen = new Set<string>();
          const groupOptions: Array<{ value: string; label: string }> = [];
          for (const p of bp.phases) {
            const gid = p.groupId ?? p.id;
            if (!seen.has(gid)) {
              seen.add(gid);
              // Use the first phase's name as the group label
              groupOptions.push({ value: gid, label: p.name + (p.groupId ? " (group)" : "") });
            }
          }
          return (
            <SelectInput
              value={phaseId}
              onChange={setPhaseId}
              options={[{ value: "", label: "(No phase group)" }, ...groupOptions]}
            />
          );
        })()}
      </Field>
      <Field label="Type">
        <SelectInput value={type} onChange={setType} options={[{ value: "moments", label: "Moments (touchpoints)" }, { value: "motivation_map", label: "Motivation Map" }]} />
      </Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

// ── Touchpoint ──
function TouchpointForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.touchpoints.find((t) => t.id === id);
  // parentId format: "stageId:swimlaneId:phaseId"
  const parentParts = (parentId ?? "").split(":");
  const parentStage = parentParts[0] || "";
  const parentSwimlane = parentParts[1] || "";
  const parentPhase = parentParts[2] || "";
  const [tab, setTab] = useState<"details" | "hover">("details");
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [channelType, setChannelType] = useState(existing?.channelType ?? "");
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(existing?.linkUrl ?? "");
  const [ctaText, setCtaText] = useState(existing?.ctaText ?? "");
  const [customNotes, setCustomNotes] = useState(existing?.customNotes ?? "");
  const [hoverTitle, setHoverTitle] = useState(existing?.hoverTitle ?? "");
  const [hoverDescription, setHoverDescription] = useState(existing?.hoverDescription ?? "");
  // When editing in a phase-group context, stageId is derived from the phase — not user-selectable
  const phaseStageId = parentPhase ? (bp.phases.find((p) => p.id === parentPhase)?.stageId ?? parentStage) : "";
  const [stageId, setStageId] = useState(existing?.stageId ?? (phaseStageId || parentStage || (bp.journeyStages[0]?.id ?? "")));
  const [swimlaneId] = useState(existing?.swimlaneId ?? (parentSwimlane || (bp.swimlanes[0]?.id ?? "")));

  const save = () => {
    if (!name.trim()) return;
    const commonFields = {
      name: name.trim(), stageId, swimlaneId,
      channelType: channelType.trim() || undefined,
      description: description.trim() || undefined,
      imageUrl: imageUrl || undefined,
      linkUrl: linkUrl.trim() || undefined,
      ctaText: ctaText.trim() || undefined,
      customNotes: customNotes.trim() || undefined,
      hoverTitle: hoverTitle.trim() || undefined,
      hoverDescription: hoverDescription.trim() || undefined,
    };
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({
        type: "ADD_TOUCHPOINT",
        touchpoint: {
          id: newId, ...commonFields,
          phaseId: parentPhase || undefined,
          photos: [], links: [],
          order: bp.touchpoints.length + 1,
        } as Touchpoint,
      });
    } else {
      dispatch({ type: "UPDATE_TOUCHPOINT", id, changes: commonFields });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-neutral-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => setTab("details")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            tab === "details" ? "bg-white text-brand-navy-1000 shadow-sm" : "text-neutral-gray-500 hover:text-brand-navy-1000"
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setTab("hover")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            tab === "hover" ? "bg-white text-brand-navy-1000 shadow-sm" : "text-neutral-gray-500 hover:text-brand-navy-1000"
          }`}
        >
          Hover Card
        </button>
      </div>

      {tab === "details" && (
        <>
          <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Touchpoint name" /></Field>
          <Field label="Channel Type"><TextInput value={channelType} onChange={setChannelType} placeholder="e.g. Email, Web, Phone" /></Field>
          {!(parentPhase || existing?.phaseId) && (
            <Field label="Stage">
              <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
          )}
          <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
          <Field label="Image"><ImageUpload value={imageUrl} onChange={setImageUrl} /></Field>
          <Field label="Hyperlink"><TextInput value={linkUrl} onChange={setLinkUrl} placeholder="https://example.com" /></Field>
          {linkUrl.trim() && (
            <Field label="CTA Button Text"><TextInput value={ctaText} onChange={setCtaText} placeholder="e.g. View Prototype" /></Field>
          )}
          <Field label="Quotes"><TextArea value={customNotes} onChange={setCustomNotes} placeholder="Custom notes" rows={2} /></Field>
        </>
      )}

      {tab === "hover" && (
        <>
          <p className="text-xs text-neutral-gray-500">
            This card appears when someone hovers over the touchpoint.
          </p>
          <Field label="Title"><TextInput value={hoverTitle} onChange={setHoverTitle} placeholder="Hover card title" /></Field>
          <Field label="Description"><TextArea value={hoverDescription} onChange={setHoverDescription} placeholder="Hover card description" /></Field>
          {(hoverTitle || hoverDescription) && (
            <div className="rounded-lg border-2 border-brand-cyan-500/30 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-gray-400">Preview</div>
              {hoverTitle && <div className="mt-1 text-[12px] font-bold text-brand-navy-1000">{hoverTitle}</div>}
              {hoverDescription && <p className="mt-0.5 text-[11px] text-neutral-gray-600">{hoverDescription}</p>}
            </div>
          )}
        </>
      )}

      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

// ── Callout ──
function CalloutForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.callouts.find((c) => c.id === id);
  // parentId format: "stageId:swimlaneId"
  const parentParts = (parentId ?? "").split(":");
  const parentStage = parentParts[0] || "";
  const parentSwimlane = parentParts[1] || "";
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [calloutType, setCalloutType] = useState<CalloutType>(existing?.type ?? "note");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [stageId, setStageId] = useState(existing?.stageId ?? parentStage ?? bp.journeyStages[0]?.id ?? "");
  const [swimlaneId] = useState(existing?.swimlaneId ?? parentSwimlane ?? "");
  const [showStageTitle, setShowStageTitle] = useState(existing?.showStageTitle ?? true);
  const [phaseIds, setPhaseIds] = useState<string[]>(existing?.phaseIds ?? []);

  // If the swimlane is a phase-group lane, find available phases for current stage + group
  const swimlane = bp.swimlanes.find((s) => s.id === swimlaneId);
  const phaseGroupId = swimlane?.phaseId ?? "";
  const availablePhases = phaseGroupId
    ? bp.phases
        .filter((p) => p.stageId === stageId && (p.groupId ?? p.id) === phaseGroupId)
        .sort((a, b) => a.order - b.order)
    : [];

  function togglePhase(pid: string) {
    setPhaseIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  }

  const save = () => {
    const resolvedPhaseIds = phaseIds.length > 0 ? phaseIds : undefined;
    if (isNew) {
      const newId = slugify(title) || id;
      dispatch({
        type: "ADD_CALLOUT",
        callout: { id: newId, stageId, swimlaneId: swimlaneId || undefined, type: calloutType, label: label.trim() || undefined, title: title.trim(), description: description.trim() || undefined, phaseIds: resolvedPhaseIds, showStageTitle: showStageTitle === false ? false : undefined, order: bp.callouts.length + 1 } as Callout,
      });
    } else {
      dispatch({ type: "UPDATE_CALLOUT", id, changes: { title: title.trim(), type: calloutType, label: label.trim() || undefined, stageId, swimlaneId: swimlaneId || undefined, description: description.trim() || undefined, phaseIds: resolvedPhaseIds, showStageTitle: showStageTitle === false ? false : undefined } });
    }
    onClose();
  };

  const typeOptions: Array<{ value: CalloutType; label: string }> = [
    { value: "pain_point", label: "Pain Point" },
    { value: "opportunity", label: "Opportunity" },
    { value: "highlight", label: "Highlight" },
    { value: "question", label: "Question" },
    { value: "note", label: "Note" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="Callout title" /></Field>
      <Field label="Type">
        <SelectInput value={calloutType} onChange={(v) => setCalloutType(v as CalloutType)} options={typeOptions} />
      </Field>
      <Field label="Label"><TextInput value={label} onChange={setLabel} placeholder={typeOptions.find((o) => o.value === calloutType)?.label ?? "Label"} /></Field>
      <Field label="Stage">
        <SelectInput value={stageId} onChange={(v) => { setStageId(v); setPhaseIds([]); }} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      {availablePhases.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray-500">
            Appears in
          </label>
          {availablePhases.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-gray-50">
              <input
                type="checkbox"
                className="accent-brand-cyan-500"
                checked={phaseIds.length === 0 || phaseIds.includes(p.id)}
                onChange={() => {
                  if (phaseIds.length === 0) {
                    // Was spanning all — switch to all except this one
                    setPhaseIds(availablePhases.filter((ap) => ap.id !== p.id).map((ap) => ap.id));
                  } else {
                    togglePhase(p.id);
                  }
                }}
              />
              <span className="text-brand-navy-1000">{p.name}</span>
            </label>
          ))}
        </div>
      )}
      <Field label="Description">
        <MarkdownEditor value={description} onChange={setDescription} placeholder="Supports **bold**, *italic*, and - bullet lists" />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 hover:bg-neutral-gray-50">
        <input
          type="checkbox"
          className="accent-brand-cyan-500"
          checked={showStageTitle}
          onChange={(e) => setShowStageTitle(e.target.checked)}
        />
        <span className="text-[13px] text-brand-navy-900">Show stage title above callouts</span>
      </label>
      <SaveButton onSave={save} disabled={false} />
    </div>
  );
}

// ── Save button ──
// ── Motivation Point ──
// parentId formats:
//   Edit existing : "${index}"                          (index in mm.points)
//   Add (mm exists): "new:${x}:${score}"
//   Add (no mm yet): "new:${x}:${score}:${swimlaneId}"
function MotivationPointForm({ id, bp, dispatch, isNew: _isNew, parentId, onClose }: FormProps) {
  const parts = (parentId ?? "").split(":");
  const isAdd = parts[0] === "new";
  const pointIndex = isAdd ? -1 : parseInt(parts[0] ?? "0", 10);
  const initialX = isAdd ? parseFloat(parts[1] ?? "0.5") : undefined;
  const initialScore = isAdd ? parseFloat(parts[2] ?? "0.5") : undefined;
  const autoCreateSwimlaneId = isAdd ? (parts[3] ?? "") : "";

  const mm = bp.motivationMaps.find((m) => m.id === id);
  const existing = !isAdd && mm ? mm.points[pointIndex] : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [score, setScore] = useState(String(Math.round((existing?.score ?? initialScore ?? 0.5) * 100)));
  const [xPos, setXPos] = useState(String(Math.round((existing?.x ?? initialX ?? 0.5) * 100)));

  const liveUpdatePoint = (newScore: string, newX: string) => {
    if (!mm || isAdd) return;
    const s = Math.max(0, Math.min(100, parseInt(newScore, 10) || 50)) / 100;
    const x = Math.max(0, Math.min(100, parseInt(newX, 10) || 50)) / 100;
    const updatedPoints = mm.points.map((p, i) =>
      i === pointIndex ? { ...p, score: s, x } : p,
    );
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { points: updatedPoints } });
  };

  const save = () => {
    const newScore = Math.max(0, Math.min(100, parseInt(score, 10) || 50)) / 100;
    const newX = Math.max(0, Math.min(100, parseInt(xPos, 10) || 50)) / 100;
    const point: MotivationDataPoint = {
      score: newScore,
      x: newX,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
    };

    if (!mm) {
      if (!autoCreateSwimlaneId) return;
      const newMm: MotivationMapData = { id, swimlaneId: autoCreateSwimlaneId, points: [point] };
      dispatch({ type: "ADD_MOTIVATION_MAP", motivationMap: newMm });
      onClose();
      return;
    }

    const updatedPoints = [...mm.points];
    if (isAdd) {
      updatedPoints.push(point);
    } else {
      updatedPoints[pointIndex] = { ...updatedPoints[pointIndex], ...point };
    }
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { points: updatedPoints } });
    onClose();
  };

  const handleDelete = () => {
    if (!mm || isAdd) return;
    const updatedPoints = mm.points.filter((_, i) => i !== pointIndex);
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { points: updatedPoints } });
    onClose();
  };

  const handleDeletePoint = (idx: number) => {
    if (!mm) return;
    const updatedPoints = mm.points.filter((_, i) => i !== idx);
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { points: updatedPoints } });
  };

  const handleUpdatePoint = (idx: number, changes: Partial<MotivationDataPoint>) => {
    if (!mm) return;
    const updatedPoints = mm.points.map((p, i) => i === idx ? { ...p, ...changes } : p);
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { points: updatedPoints } });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Current point editor */}
      <div className="rounded-lg bg-brand-purple-500/10 p-3">
        <div className="text-[11px] font-semibold text-brand-purple-500">Score: {score}%</div>
        <input
          type="range" min="0" max="100" value={score}
          onChange={(e) => { setScore(e.target.value); liveUpdatePoint(e.target.value, xPos); }}
          className="mt-1 w-full accent-brand-purple-500"
        />
        <div className="mt-2 text-[11px] font-semibold text-brand-purple-500">
          Position: {xPos}%
        </div>
        <input
          type="range" min="0" max="100" value={xPos}
          onChange={(e) => { setXPos(e.target.value); liveUpdatePoint(score, e.target.value); }}
          className="mt-1 w-full accent-brand-purple-500"
        />
      </div>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="Data point title" /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="What happens at this point?" /></Field>

      <SaveButton onSave={save} disabled={false} />

      {!isAdd && existing && (
        <button
          type="button"
          onClick={handleDelete}
          className="w-full rounded-md px-3 py-2 text-xs font-semibold text-semantic-error transition hover:bg-semantic-error/5"
        >
          Remove this point
        </button>
      )}

      {/* All data points list */}
      {mm && mm.points.length > 0 && (
        <div className="border-t border-neutral-gray-200 pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray-500">
            All Data Points
          </div>
          <div className="flex flex-col gap-2">
            {mm.points.map((pt, idx) => {
              const isActive = !isAdd && idx === pointIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${isActive ? "border-brand-purple-500 bg-brand-purple-500/5" : "border-neutral-gray-200"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-bold text-brand-navy-1000">
                        {pt.title || "Untitled"}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-brand-purple-500">
                        {Math.round(pt.score * 100)}%
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(pt.score * 100)}
                      onChange={(e) => handleUpdatePoint(idx, { score: parseInt(e.target.value, 10) / 100 })}
                      className="mt-1 w-full accent-brand-purple-500"
                    />
                    <div className="mt-1 text-[10px] text-neutral-gray-400">Position: {Math.round(pt.x * 100)}%</div>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(pt.x * 100)}
                      onChange={(e) => handleUpdatePoint(idx, { x: parseInt(e.target.value, 10) / 100 })}
                      className="w-full accent-brand-purple-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePoint(idx)}
                    className="shrink-0 text-neutral-gray-400 hover:text-semantic-error"
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stage Group ──
const STAGE_GROUP_DEFAULT_BG = "#E5E7EB";
const STAGE_GROUP_DEFAULT_TEXT = "#0F1724";

function StageGroupForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = (bp.stageGroups ?? []).find((g) => g.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [sectionId, setSectionId] = useState(existing?.sectionId ?? parentId ?? bp.sections[0]?.id ?? "");
  const [bgColor, setBgColor] = useState(existing?.bgColor ?? STAGE_GROUP_DEFAULT_BG);
  const [textColor, setTextColor] = useState(existing?.textColor ?? STAGE_GROUP_DEFAULT_TEXT);
  const [applyToStages, setApplyToStages] = useState(false);

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({
        type: "ADD_STAGE_GROUP",
        stageGroup: {
          id: newId,
          name: name.trim(),
          sectionId,
          bgColor,
          textColor,
          order: (bp.stageGroups?.length ?? 0) + 1,
        } as StageGroup,
      });
    } else {
      dispatch({ type: "UPDATE_STAGE_GROUP", id, changes: { name: name.trim(), sectionId, bgColor, textColor } });
    }
    // Apply colors to all stage groups in the same section
    if (applyToStages) {
      const otherGroups = (bp.stageGroups ?? []).filter((g) => g.sectionId === sectionId && g.id !== (isNew ? (slugify(name) || id) : id));
      for (const g of otherGroups) {
        dispatch({ type: "UPDATE_STAGE_GROUP", id: g.id, changes: { bgColor, textColor } });
      }
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name">
        <TextInput value={name} onChange={setName} placeholder='Group name (e.g. "Evaluate", "Buy")' />
      </Field>
      <Field label="Section">
        <SelectInput
          value={sectionId}
          onChange={setSectionId}
          options={bp.sections.map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>
      <ColorPicker label="Background colour" value={bgColor} onChange={setBgColor} presets={BG_PRESETS} />
      <ColorPicker label="Text colour" value={textColor} onChange={setTextColor} presets={TEXT_PRESETS} />
      <PillPreview name={name} bgColor={bgColor} textColor={textColor} defaultBg={STAGE_GROUP_DEFAULT_BG} />
      {!isNew && (
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-gray-50">
          <input
            type="checkbox"
            className="accent-brand-cyan-500"
            checked={applyToStages}
            onChange={() => setApplyToStages(!applyToStages)}
          />
          <span className="text-brand-navy-1000">Apply colours to all stage groups</span>
        </label>
      )}
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

function MarkdownEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const selected = v.slice(s, e);
    const replacement = `${before}${selected || "text"}${after}`;
    const next = v.slice(0, s) + replacement + v.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = s + before.length;
      el.selectionEnd = s + before.length + (selected || "text").length;
    });
  }

  function insertBullet() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, value: v } = el;
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    const line = v.slice(lineStart, s);
    const prefix = line.startsWith("- ") ? "" : "- ";
    const next = v.slice(0, lineStart) + prefix + v.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + prefix.length;
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[
          { label: "B", title: "Bold", action: () => wrap("**", "**"), className: "font-bold" },
          { label: "I", title: "Italic", action: () => wrap("*", "*"), className: "italic" },
          { label: "•", title: "Bullet", action: insertBullet, className: "" },
        ].map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
            className={`h-7 w-7 rounded border border-neutral-gray-200 bg-white text-[13px] text-brand-navy-1000 transition hover:bg-neutral-gray-100 ${btn.className}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 font-mono text-sm text-brand-navy-1000 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
      />
    </div>
  );
}

function SaveButton({ onSave, disabled }: { onSave: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      className="mt-2 w-full rounded-md bg-brand-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-500 disabled:opacity-40"
    >
      Save
    </button>
  );
}
