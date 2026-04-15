// Shared edit-mode buttons: pencil (edit), plus (add), delete (trash).

import { useState } from "react";
import type { EditableEntityType, EditingEntity } from "../context/BlueprintContext";

export function EditButton({
  type,
  id,
  onClick,
}: {
  type: EditableEntityType;
  id: string;
  onClick: (entity: EditingEntity) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick({ type, id });
      }}
      title={`Edit ${type}`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500 transition-colors hover:bg-brand-cyan-500 hover:text-white"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </button>
  );
}

const TYPE_LABELS: Record<EditableEntityType, string> = {
  section: "Section",
  stage: "Stage",
  stage_group: "Stage Group",
  phase: "Phase",
  swimlane: "Swimlane",
  touchpoint: "Touchpoint",
  callout: "Callout",
  insight: "Insight",
  motivation_point: "Data Point",
};

export function DeleteButton({
  type,
  id,
  onConfirm,
}: {
  type: EditableEntityType;
  id: string;
  onConfirm: (type: EditableEntityType, id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        title={`Delete ${type}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-semantic-error/10 text-semantic-error transition-colors hover:bg-semantic-error hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
      {showModal && (
        <ConfirmDeleteModal
          type={type}
          id={id}
          onConfirm={() => { onConfirm(type, id); setShowModal(false); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function ConfirmDeleteModal({
  type,
  id,
  onConfirm,
  onCancel,
}: {
  type: EditableEntityType;
  id: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-navy-900/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-brand-navy-1000">
          Delete {TYPE_LABELS[type]}?
        </h3>
        <p className="mt-2 text-sm text-neutral-gray-600">
          Are you sure you want to delete <span className="font-semibold">{id}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-neutral-gray-200 bg-white px-4 py-2 text-sm font-medium text-neutral-gray-700 hover:bg-neutral-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-semantic-error px-4 py-2 text-sm font-semibold text-white hover:bg-semantic-error/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddButton({
  type,
  label,
  parentId,
  onClick,
}: {
  type: EditableEntityType;
  label: string;
  parentId?: string;
  onClick: (entity: EditingEntity) => void;
}) {
  const id = `new_${type}_${Date.now().toString(36)}`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick({ type, id, parentId, isNew: true });
      }}
      title={`Add ${type}`}
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-brand-cyan-500/40 bg-brand-cyan-500/5 px-2 py-1 text-[10px] font-medium text-brand-cyan-600 transition hover:border-brand-cyan-500 hover:bg-brand-cyan-500/10"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}
