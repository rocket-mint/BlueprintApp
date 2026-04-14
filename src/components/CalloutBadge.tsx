// CalloutBadge — small colored badge for callouts shown in swimlane cells.

import type { Callout, CalloutType } from "../types/blueprint";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import { DeleteButton } from "./EditControls";

const CALLOUT_STYLES: Record<CalloutType, { bg: string; border: string; icon: string; text: string }> = {
  pain_point:  { bg: "bg-semantic-error/10",   border: "border-semantic-error/30",   icon: "text-semantic-error",   text: "text-semantic-error" },
  opportunity: { bg: "bg-semantic-success/10",  border: "border-semantic-success/30", icon: "text-semantic-success", text: "text-semantic-success" },
  highlight:   { bg: "bg-semantic-warning/10",  border: "border-semantic-warning/30", icon: "text-semantic-warning", text: "text-semantic-warning" },
  question:    { bg: "bg-brand-purple-500/10",  border: "border-brand-purple-500/30", icon: "text-brand-purple-500", text: "text-brand-purple-500" },
  note:        { bg: "bg-neutral-gray-100",     border: "border-neutral-gray-300",    icon: "text-neutral-gray-500", text: "text-neutral-gray-600" },
};

const CALLOUT_ICONS: Record<CalloutType, string> = {
  pain_point:  "\u26a0",  // ⚠
  opportunity: "\u2728",  // ✨
  highlight:   "\u2605",  // ★
  question:    "?",
  note:        "\u2022",  // •
};

const CALLOUT_LABELS: Record<CalloutType, string> = {
  pain_point:  "Pain Point",
  opportunity: "Opportunity",
  highlight:   "Highlight",
  question:    "Question",
  note:        "Note",
};

interface Props {
  callout: Callout;
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}

export function CalloutBadge({ callout, editMode, onEditEntity, onDeleteEntity }: Props) {
  const style = CALLOUT_STYLES[callout.type] ?? CALLOUT_STYLES.note;

  return (
    <div
      className={`group/co flex items-start gap-1.5 rounded-md border p-1.5 ${style.bg} ${style.border}`}
      title={callout.description ?? undefined}
    >
      <span className={`shrink-0 text-[11px] leading-none ${style.icon}`}>
        {CALLOUT_ICONS[callout.type]}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>
          {CALLOUT_LABELS[callout.type]}
        </div>
        <div className="text-[11px] font-medium leading-tight text-brand-navy-900">
          {callout.title}
        </div>
        {callout.description && (
          <p className="mt-0.5 text-[10px] leading-snug text-neutral-gray-600">
            {callout.description}
          </p>
        )}
      </div>
      {editMode && onEditEntity && (
        <div className="flex shrink-0 gap-0.5 self-center opacity-0 transition-opacity group-hover/co:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditEntity({ type: "callout", id: callout.id }); }}
            title="Edit callout"
            className="text-neutral-gray-400 hover:text-brand-cyan-500"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          {onDeleteEntity && <DeleteButton type="callout" id={callout.id} onConfirm={onDeleteEntity} />}
        </div>
      )}
    </div>
  );
}
