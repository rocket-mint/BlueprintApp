import { useState } from "react";
import type { Touchpoint } from "../types/blueprint";
import type { Media } from "./MediaModal";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import { useBlueprint } from "../hooks/useBlueprint";
import { DeleteButton } from "./EditControls";

interface Props {
  tp: Touchpoint;
  override?: Media;
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}

export function TouchpointCard({ tp, override, editMode, onEditEntity, onDeleteEntity }: Props) {
  const { state } = useBlueprint();
  const isEditing = state.editingEntity?.id === tp.id;
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasHoverCard = Boolean(tp.hoverTitle || tp.hoverDescription);

  const effectiveImage = override?.image ?? tp.imageUrl ?? "";
  const effectiveLink = override?.link ?? tp.linkUrl ?? "";
  const showImage = Boolean(effectiveImage) && !imgError;

  const imageBlock = showImage ? (
    <img
      src={effectiveImage}
      alt={tp.name}
      onError={() => setImgError(true)}
      loading="lazy"
      className="mb-2 max-h-48 w-full rounded-md border border-neutral-gray-200 bg-neutral-gray-50 object-contain"
    />
  ) : null;

  const titleOnly = !showImage && !tp.channelType && !tp.description && !tp.customNotes && !effectiveLink;

  return (
    <div
      data-tp-id={tp.id}
      className={`group/tp relative flex h-full min-h-[80px] ${showImage ? "min-w-[260px]" : "min-w-0"} flex-col gap-1 overflow-visible rounded-[10px] border-2 bg-white p-3.5 shadow-[0_2px_6px_0_rgba(15,23,36,0.06)] transition-shadow hover:shadow-[0_4px_12px_0_rgba(15,23,36,0.1)] ${titleOnly ? "items-center justify-center text-center" : ""} ${isEditing ? "border-brand-cyan-500 ring-2 ring-brand-cyan-500" : "border-neutral-gray-200"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Edit + delete — top right, appears on hover in edit mode */}
      {editMode && onEditEntity && (
        <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover/tp:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditEntity({ type: "touchpoint", id: tp.id }); }}
            title="Edit touchpoint"
            className="grid h-8 w-8 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500 shadow ring-1 ring-brand-cyan-500/30 hover:bg-brand-cyan-500 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          {onDeleteEntity && <DeleteButton type="touchpoint" id={tp.id} onConfirm={onDeleteEntity} />}
        </div>
      )}

      {imageBlock}

      {tp.channelType && (
        <span className="text-[12px] font-semibold uppercase tracking-wider text-brand-cyan-500">
          {tp.channelType}
        </span>
      )}
      <div className="break-words text-[13px] font-bold leading-tight text-brand-navy-900">
        {tp.name}
      </div>
      {tp.description && (
        <p className="break-words text-[12px] leading-snug text-neutral-gray-600">
          {tp.description}
        </p>
      )}
      {tp.customNotes && (
        <p className="break-words text-[12px] italic leading-snug text-neutral-gray-500">
          {tp.customNotes}
        </p>
      )}
      {effectiveLink && !showImage && !tp.ctaText && (
        <a
          href={effectiveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[12px] text-brand-cyan-500 underline"
          title={effectiveLink}
        >
          {effectiveLink}
        </a>
      )}

      {/* CTA button — shown when a link + CTA text are set */}
      {effectiveLink && tp.ctaText && (
        <a
          href={effectiveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-end gap-2 rounded-xl px-1 py-1.5 text-brand-navy-900 transition-colors hover:text-brand-cyan-500"
        >
          <span className="text-[14px] font-bold leading-tight">{tp.ctaText}</span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-current">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </a>
      )}

      {/* Hover card */}
      {hovered && hasHoverCard && !editMode && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-[200px] -translate-x-1/2 rounded-lg border-2 border-brand-cyan-500/30 bg-white p-3 shadow-lg">
          {tp.hoverTitle && (
            <div className="text-[12px] font-bold leading-tight text-brand-navy-1000">{tp.hoverTitle}</div>
          )}
          {tp.hoverDescription && (
            <p className="mt-1 text-[11px] leading-snug text-neutral-gray-600">{tp.hoverDescription}</p>
          )}
        </div>
      )}
    </div>
  );
}
