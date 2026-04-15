import type { Touchpoint, Callout } from "../types/blueprint";
import type { Media } from "./MediaModal";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import { TouchpointCard } from "./TouchpointCard";
import { CalloutBadge } from "./CalloutBadge";

interface Props {
  touchpoints: Touchpoint[];
  callouts: Callout[];
  touchpointMedia: Record<string, Media>;
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}

export function SwimlaneCell({
  touchpoints,
  callouts,
  touchpointMedia,
  editMode,
  onEditEntity,
  onDeleteEntity,
}: Props) {
  const isEmpty = touchpoints.length === 0 && callouts.length === 0;

  if (isEmpty) {
    if (!editMode) return <div className="min-h-[60px]" />;
    return (
      <div className="flex h-full min-h-[60px] items-center justify-center rounded-xl border border-dashed border-neutral-gray-200 text-[10px] text-neutral-gray-300">
        —
      </div>
    );
  }

  // Callouts are capped to the combined width of the touchpoints they sit beside.
  const CARD_W = 176;
  const CARD_GAP = 8;
  const calloutWidth =
    touchpoints.length > 0
      ? touchpoints.length * CARD_W + (touchpoints.length - 1) * CARD_GAP
      : undefined; // no touchpoints → callouts fill available width

  return (
    <div className="flex flex-col gap-2 overflow-visible">
      <div className="flex items-stretch gap-2 overflow-visible">
        {touchpoints.map((tp) => (
          <div key={tp.id} className="w-[176px] shrink-0 overflow-visible [&:hover]:z-20">
            <TouchpointCard
              tp={tp}
              override={touchpointMedia[tp.id]}
              editMode={editMode}
              onEditEntity={onEditEntity}
              onDeleteEntity={onDeleteEntity}
            />
          </div>
        ))}
      </div>

      {callouts.length > 0 && (
        <div
          style={calloutWidth !== undefined ? { width: calloutWidth } : undefined}
          className={`flex flex-col gap-1${calloutWidth === undefined ? " w-full" : ""}`}
        >
          {callouts.map((c) => (
            <CalloutBadge key={c.id} callout={c} editMode={editMode} onEditEntity={onEditEntity} onDeleteEntity={onDeleteEntity} />
          ))}
        </div>
      )}
    </div>
  );
}
