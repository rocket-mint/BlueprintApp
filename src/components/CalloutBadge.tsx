// CalloutBadge — small colored badge for callouts shown in swimlane cells.

import React from "react";
import type { Callout, CalloutType } from "../types/blueprint";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import { useBlueprint } from "../hooks/useBlueprint";
import { DeleteButton } from "./EditControls";

function renderMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, li) => {
    const isBullet = line.startsWith("- ");
    const content = isBullet ? line.slice(2) : line;

    // Parse inline bold/italic
    const parts: React.ReactNode[] = [];
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      if (m.index > last) parts.push(content.slice(last, m.index));
      if (m[2] !== undefined) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3] !== undefined) parts.push(<em key={m.index}>{m[3]}</em>);
      last = m.index + m[0].length;
    }
    if (last < content.length) parts.push(content.slice(last));

    if (isBullet) {
      return <li key={li} className="ml-3 list-disc">{parts}</li>;
    }
    return line === "" ? <br key={li} /> : <p key={li} className="leading-snug">{parts}</p>;
  });
}

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


interface Props {
  callout: Callout;
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}

export function CalloutBadge({ callout, editMode, onEditEntity, onDeleteEntity }: Props) {
  const { state } = useBlueprint();
  const isEditing = state.editingEntity?.id === callout.id;
  const style = CALLOUT_STYLES[callout.type] ?? CALLOUT_STYLES.note;

  const hasCustomBg = Boolean(callout.bgColor);
  const hasCustomBorder = Boolean(callout.borderColor);
  const bgClass = hasCustomBg ? "" : style.bg;
  const borderClass = isEditing
    ? "ring-2 ring-brand-cyan-500 border-brand-cyan-500"
    : hasCustomBorder
      ? ""
      : style.border;
  const customStyle: React.CSSProperties = {};
  if (hasCustomBg) customStyle.backgroundColor = callout.bgColor;
  if (hasCustomBorder && !isEditing) customStyle.borderColor = callout.borderColor;

  return (
    <div
      className={`group/co flex w-[300px] shrink-0 items-start gap-1.5 rounded-md border p-1.5 ${bgClass} ${borderClass}`}
      style={customStyle}
      title={callout.description ?? undefined}
    >
      <span className={`shrink-0 text-[11px] leading-none ${style.icon}`}>
        {CALLOUT_ICONS[callout.type]}
      </span>
      <div className="min-w-0 flex-1 break-words">
        {callout.label && (
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>
            {callout.label}
          </div>
        )}
        {callout.title && (
          <div className="text-[12px] font-medium leading-tight text-brand-navy-900">
            {callout.title}
          </div>
        )}
        {callout.description && (
          <div className="mt-0.5 text-[11px] text-neutral-gray-600 [&_li]:ml-3 [&_li]:list-disc [&_ul]:pl-1">
            {renderMarkdown(callout.description)}
          </div>
        )}
      </div>
      {editMode && onEditEntity && (
        <div className="flex shrink-0 gap-0.5 self-center opacity-0 transition-opacity group-hover/co:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditEntity({ type: "callout", id: callout.id }); }}
            title="Edit callout"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500 transition-colors hover:bg-brand-cyan-500 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          {onDeleteEntity && <DeleteButton type="callout" id={callout.id} onConfirm={onDeleteEntity} />}
        </div>
      )}
    </div>
  );
}
