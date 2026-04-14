import { useMemo } from "react";
import type { Insight, JourneyStage } from "../types/blueprint";
import type { EditingEntity, EditableEntityType } from "../context/BlueprintContext";
import { DeleteButton } from "./EditControls";
import { gridTemplateFor } from "../lib/blueprintLayout";

interface Props {
  stages: JourneyStage[];
  insights: Insight[];
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}

export function InsightsSection({ stages, insights, editMode, onEditEntity, onDeleteEntity }: Props) {
  const byStage = useMemo(() => {
    const m = new Map<string, Insight[]>();
    for (const i of insights) {
      const arr = m.get(i.stageId) ?? [];
      arr.push(i);
      m.set(i.stageId, arr);
    }
    return m;
  }, [insights]);

  if (insights.length === 0 && !editMode) return null;

  const grid = gridTemplateFor(stages.length);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">
      <div style={grid}>
        <div className="flex items-start justify-end pr-2 pt-0.5">
          <h3 className="text-right text-[16px] font-bold leading-tight text-brand-navy-900">
            Insights
          </h3>
        </div>
        {stages.map((s) => {
          const items = byStage.get(s.id) ?? [];
          return (
            <div key={s.id} className="flex min-w-0 flex-col gap-2">
              {items.length === 0 ? (
                <div className="flex h-full min-h-[60px] items-center justify-center rounded-xl border border-dashed border-neutral-gray-200 text-[10px] text-neutral-gray-300">
                  —
                </div>
              ) : (
                items.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    editMode={editMode}
                    onEditEntity={onEditEntity}
                    onDeleteEntity={onDeleteEntity}
                  />
                ))
              )}
              {editMode && onEditEntity && (
                <button
                  type="button"
                  onClick={() => onEditEntity({ type: "insight", id: `new_ins_${Date.now().toString(36)}`, parentId: s.id, isNew: true })}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-brand-cyan-500/40 bg-brand-cyan-500/5 px-2 py-1 text-[10px] font-medium text-brand-cyan-600 transition hover:border-brand-cyan-500 hover:bg-brand-cyan-500/10"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Insight
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightCard({
  insight,
  editMode,
  onEditEntity,
  onDeleteEntity,
}: {
  insight: Insight;
  editMode?: boolean;
  onEditEntity?: (entity: EditingEntity) => void;
  onDeleteEntity?: (type: EditableEntityType, id: string) => void;
}) {
  return (
    <div className="group/ins relative flex flex-col gap-1 rounded-lg border border-neutral-gray-200 bg-neutral-gray-50 p-2.5">
      {editMode && onEditEntity && (
        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover/ins:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditEntity({ type: "insight", id: insight.id }); }}
            title="Edit insight"
            className="grid h-5 w-5 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500 hover:bg-brand-cyan-500 hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          {onDeleteEntity && <DeleteButton type="insight" id={insight.id} onConfirm={onDeleteEntity} />}
        </div>
      )}
      {insight.dataPoint && (
        <div className="text-lg font-bold leading-none text-brand-cyan-500">
          {insight.dataPoint}
        </div>
      )}
      <div className="text-[11px] font-bold leading-tight text-brand-navy-900">
        {insight.title}
      </div>
      {insight.text && (
        <p className="text-[10px] leading-snug text-neutral-gray-700">{insight.text}</p>
      )}
      {insight.quote && (
        <p className="text-[9px] italic leading-snug text-neutral-gray-500">"{insight.quote}"</p>
      )}
      {insight.dataSource && (
        <p className="text-[9px] text-neutral-gray-500">Source: {insight.dataSource}</p>
      )}
    </div>
  );
}
