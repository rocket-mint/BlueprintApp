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
  Insight,
  CalloutType,
  MotivationMap as MotivationMapData,
} from "../types/blueprint";
import { slugify } from "../utils/idGenerator";

// ---------------------------------------------------------------------------
// Shared form helpers
// ---------------------------------------------------------------------------

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
  phase: "Phase",
  swimlane: "Swimlane",
  touchpoint: "Touchpoint",
  callout: "Callout",
  insight: "Insight",
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
  const label = TYPE_LABELS[type];

  const close = () => setEditingEntity(null);

  const getOrder = (): number | undefined => {
    const lists: Record<string, Array<{ id: string; order?: number }>> = {
      section: blueprint.sections,
      stage: blueprint.journeyStages,
      phase: blueprint.phases,
      swimlane: blueprint.swimlanes,
      touchpoint: blueprint.touchpoints,
      callout: blueprint.callouts,
      insight: blueprint.insights as Array<{ id: string }>,
    };
    return (lists[type]?.find((e) => e.id === id) as { order?: number } | undefined)?.order;
  };

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
          {type !== "motivation_point" && (
            <div className="truncate text-sm font-bold text-brand-navy-1000">{id}</div>
          )}
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
        {type === "insight" && <InsightForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
        {type === "motivation_point" && <MotivationPointForm key={id} id={id} bp={blueprint} dispatch={dispatch} isNew={isNew} parentId={editingEntity.parentId} onClose={close} />}
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
function StageForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.journeyStages.find((s) => s.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sectionId, setSectionId] = useState(existing?.sectionId ?? parentId ?? bp.sections[0]?.id ?? "");

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({ type: "ADD_STAGE", stage: { id: newId, name: name.trim(), sectionId, description: description.trim() || undefined, order: bp.journeyStages.length + 1 } as JourneyStage });
    } else {
      dispatch({ type: "UPDATE_STAGE", id, changes: { name: name.trim(), sectionId, description: description.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Stage name" /></Field>
      <Field label="Section">
        <SelectInput value={sectionId} onChange={setSectionId} options={bp.sections.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <SaveButton onSave={save} disabled={!name.trim()} />
    </div>
  );
}

// ── Phase ──
function PhaseForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.phases.find((p) => p.id === id);
  // parentId format: "stageId:groupId"
  const parentParts = (parentId ?? "").split(":");
  const parentStage = parentParts[0] || "";
  const parentGroup = parentParts[1] || "";
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [stageId, setStageId] = useState(existing?.stageId ?? (parentStage || (bp.journeyStages[0]?.id ?? "")));

  const save = () => {
    if (!name.trim()) return;
    const groupId = existing?.groupId ?? (parentGroup || undefined);
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({ type: "ADD_PHASE", phase: { id: newId, name: name.trim(), stageId, groupId, description: description.trim() || undefined, order: bp.phases.length + 1 } as Phase });
    } else {
      dispatch({ type: "UPDATE_PHASE", id, changes: { name: name.trim(), stageId, description: description.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Phase name" /></Field>
      <Field label="Stage">
        <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
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
  const [sectionId, setSectionId] = useState(existing?.sectionId ?? (parentSection || (bp.sections[0]?.id ?? "")));
  const [phaseId, setPhaseId] = useState(existing?.phaseId ?? parentPhase ?? "");

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      const newId = slugify(name) || id;
      dispatch({ type: "ADD_SWIMLANE", swimlane: { id: newId, name: name.trim(), type: type as Swimlane["type"], sectionId, phaseId: phaseId || undefined, description: description.trim() || undefined, order: bp.swimlanes.length + 1 } as Swimlane });
    } else {
      dispatch({ type: "UPDATE_SWIMLANE", id, changes: { name: name.trim(), type: type as Swimlane["type"], sectionId, phaseId: phaseId || undefined, description: description.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Swimlane name" /></Field>
      <Field label="Section">
        <SelectInput value={sectionId} onChange={setSectionId} options={bp.sections.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
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
  const [customNotes, setCustomNotes] = useState(existing?.customNotes ?? "");
  const [hoverTitle, setHoverTitle] = useState(existing?.hoverTitle ?? "");
  const [hoverDescription, setHoverDescription] = useState(existing?.hoverDescription ?? "");
  const [stageId, setStageId] = useState(existing?.stageId ?? (parentStage || (bp.journeyStages[0]?.id ?? "")));
  const [swimlaneId, setSwimlaneId] = useState(existing?.swimlaneId ?? (parentSwimlane || (bp.swimlanes[0]?.id ?? "")));

  const save = () => {
    if (!name.trim()) return;
    const commonFields = {
      name: name.trim(), stageId, swimlaneId,
      channelType: channelType.trim() || undefined,
      description: description.trim() || undefined,
      imageUrl: imageUrl || undefined,
      linkUrl: linkUrl.trim() || undefined,
      customNotes: customNotes.trim() || undefined,
      hoverTitle: hoverTitle.trim() || undefined,
      hoverDescription: hoverDescription.trim() || undefined,
    };
    if (isNew) {
      const newId = slugify(name) || id;
      const phaseIds = parentPhase ? [parentPhase] : [];
      dispatch({
        type: "ADD_TOUCHPOINT",
        touchpoint: {
          id: newId, ...commonFields,
          phaseIds, photos: [], links: [],
          order: bp.touchpoints.length + 1,
        } as Touchpoint,
      });
    } else {
      dispatch({ type: "UPDATE_TOUCHPOINT", id, changes: commonFields });
    }
    onClose();
  };

  const momentsSwimlanes = bp.swimlanes.filter((s) => s.type === "moments");

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
          <Field label="Stage">
            <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Swimlane">
            <SelectInput value={swimlaneId} onChange={setSwimlaneId} options={momentsSwimlanes.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
          <Field label="Image"><ImageUpload value={imageUrl} onChange={setImageUrl} /></Field>
          <Field label="Hyperlink"><TextInput value={linkUrl} onChange={setLinkUrl} placeholder="https://example.com" /></Field>
          <Field label="Notes"><TextArea value={customNotes} onChange={setCustomNotes} placeholder="Custom notes" rows={2} /></Field>
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
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [calloutType, setCalloutType] = useState<CalloutType>(existing?.type ?? "note");
  const [stageId, setStageId] = useState(existing?.stageId ?? parentId ?? bp.journeyStages[0]?.id ?? "");

  const save = () => {
    if (!title.trim()) return;
    if (isNew) {
      const newId = slugify(title) || id;
      dispatch({
        type: "ADD_CALLOUT",
        callout: { id: newId, stageId, type: calloutType, title: title.trim(), description: description.trim() || undefined, phaseIds: [], order: bp.callouts.length + 1 } as Callout,
      });
    } else {
      dispatch({ type: "UPDATE_CALLOUT", id, changes: { title: title.trim(), type: calloutType, stageId, description: description.trim() || undefined } });
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
      <Field label="Stage">
        <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="Optional description" /></Field>
      <SaveButton onSave={save} disabled={!title.trim()} />
    </div>
  );
}

// ── Insight ──
function InsightForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  const existing = bp.insights.find((i) => i.id === id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [text, setText] = useState(existing?.text ?? "");
  const [dataPoint, setDataPoint] = useState(existing?.dataPoint ?? "");
  const [dataSource, setDataSource] = useState(existing?.dataSource ?? "");
  const [quote, setQuote] = useState(existing?.quote ?? "");
  const [stageId, setStageId] = useState(existing?.stageId ?? parentId ?? bp.journeyStages[0]?.id ?? "");

  const save = () => {
    if (!title.trim()) return;
    if (isNew) {
      const newId = slugify(title) || id;
      dispatch({
        type: "ADD_INSIGHT",
        insight: { id: newId, stageId, title: title.trim(), text: text.trim(), dataPoint: dataPoint.trim() || undefined, dataSource: dataSource.trim() || undefined, quote: quote.trim() || undefined } as Insight,
      });
    } else {
      dispatch({ type: "UPDATE_INSIGHT", id, changes: { title: title.trim(), text: text.trim(), stageId, dataPoint: dataPoint.trim() || undefined, dataSource: dataSource.trim() || undefined, quote: quote.trim() || undefined } });
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="Insight title" /></Field>
      <Field label="Stage">
        <SelectInput value={stageId} onChange={setStageId} options={bp.journeyStages.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Text"><TextArea value={text} onChange={setText} placeholder="Insight text" /></Field>
      <Field label="Data Point"><TextInput value={dataPoint} onChange={setDataPoint} placeholder="e.g. 73%" /></Field>
      <Field label="Data Source"><TextInput value={dataSource} onChange={setDataSource} placeholder="e.g. GA4, Q1 2026" /></Field>
      <Field label="Quote"><TextArea value={quote} onChange={setQuote} placeholder="Customer voice quote" rows={2} /></Field>
      <SaveButton onSave={save} disabled={!title.trim()} />
    </div>
  );
}

// ── Save button ──
// ── Motivation Point (hover card for a single data point) ──
function MotivationPointForm({ id, bp, dispatch, isNew, parentId, onClose }: FormProps) {
  // id = motivation map ID
  // parentId = "stageKey:scoreIndex[:score[:swimlaneId]]"
  //   score    — pre-filled from click position (new points)
  //   swimlaneId — present only when the motivation map doesn't exist yet and must be created on save
  const parentParts = (parentId ?? "").split(":");
  const stageKey = parentParts[0] || "";
  const scoreIndex = parseInt(parentParts[1] ?? "0", 10);
  const initialScore = parentParts[2] ? parseFloat(parentParts[2]) : undefined;
  const swimlaneId = parentParts[3] || "";  // non-empty means we must auto-create the map

  const mm = bp.motivationMaps.find((m) => m.id === id);
  const points = mm?.stageScores[stageKey] ?? [];
  const existing = points[scoreIndex];

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [score, setScore] = useState(String(Math.round((initialScore ?? existing?.score ?? 0.5) * 100)));

  const save = () => {
    const newScore = Math.max(0, Math.min(100, parseInt(score, 10) || 50)) / 100;

    // If the motivation map doesn't exist yet (wizard-created blueprints), create it first.
    let targetMm: MotivationMapData | undefined = mm;
    if (!targetMm) {
      if (!swimlaneId) return;
      const newMm: MotivationMapData = { id, swimlaneId, stageScores: {} };
      dispatch({ type: "ADD_MOTIVATION_MAP", motivationMap: newMm });
      targetMm = newMm;
    }

    const updatedPoints = [...(targetMm.stageScores[stageKey] ?? [])];
    if (isNew || scoreIndex >= updatedPoints.length) {
      updatedPoints.push({ score: newScore, title: title.trim() || undefined, description: description.trim() || undefined });
    } else {
      updatedPoints[scoreIndex] = { ...updatedPoints[scoreIndex], score: newScore, title: title.trim() || undefined, description: description.trim() || undefined };
    }

    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: targetMm.id, changes: { stageScores: { ...targetMm.stageScores, [stageKey]: updatedPoints } } });
    onClose();
  };

  const handleDelete = () => {
    if (!mm) return;
    const updatedPoints = [...(mm.stageScores[stageKey] ?? [])];
    updatedPoints.splice(scoreIndex, 1);
    dispatch({ type: "UPDATE_MOTIVATION_MAP", id: mm.id, changes: { stageScores: { ...mm.stageScores, [stageKey]: updatedPoints } } });
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-brand-purple-500/10 p-3">
        <div className="text-[11px] font-semibold text-brand-purple-500">
          Score: {score}%
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1 w-full accent-brand-purple-500"
        />
      </div>
      <p className="text-xs text-neutral-gray-500">
        The hover card appears when someone hovers over this data point.
      </p>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="Data point title" /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} placeholder="What happens at this point?" /></Field>

      {(title || description) && (
        <div className="rounded-lg border-2 border-brand-purple-500/30 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-gray-400">Preview</div>
          {title && <div className="mt-1 text-[12px] font-bold text-brand-navy-1000">{title}</div>}
          {description && <p className="mt-0.5 text-[11px] text-neutral-gray-600">{description}</p>}
          <div className="mt-1 text-[10px] font-semibold text-brand-purple-500">Score: {score}%</div>
        </div>
      )}

      <SaveButton onSave={save} disabled={false} />

      {!isNew && existing && (
        <button
          type="button"
          onClick={handleDelete}
          className="w-full rounded-md px-3 py-2 text-xs font-semibold text-semantic-error transition hover:bg-semantic-error/5"
        >
          Remove data point
        </button>
      )}
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
