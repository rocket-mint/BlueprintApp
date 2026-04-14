import { useMemo } from "react";
import { BlueprintCanvas } from "./BlueprintCanvas";
import { EditDrawer } from "./EditDrawer";
import { useBlueprint } from "../hooks/useBlueprint";
import { allStagesOrdered } from "../utils/dataUtils";

export function Blueprint() {
  const {
    state,
    dispatch,
    setEditingEntity,
    toggleSwimlaneCollapse,
    toggleSectionCollapse,
  } = useBlueprint();

  const {
    blueprint,
    touchpointMedia,
    collapsedSwimlanes,
    collapsedSections,
    editMode,
  } = state;

  const swimlanes = blueprint?.swimlanes ?? [];

  const orderedStages = useMemo(
    () => (blueprint ? allStagesOrdered(blueprint) : []),
    [blueprint],
  );

  if (!blueprint || orderedStages.length === 0 || swimlanes.length === 0) {
    return (
      <div className="rounded-[40px] border border-neutral-gray-200 bg-white p-10 text-center text-neutral-gray-500">
        No journey stages or swimlanes found in the uploaded file.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-neutral-sand-50 p-2 sm:p-3">
        <BlueprintCanvas
          blueprint={blueprint}
          stages={orderedStages}
          touchpointMedia={touchpointMedia}
          collapsedSwimlanes={collapsedSwimlanes}
          collapsedSections={collapsedSections}
          editMode={editMode}
          onEditEntity={(entity) => setEditingEntity(entity)}
          onDeleteEntity={(type, id) => dispatch({ type: `DELETE_${type.toUpperCase()}`, id } as any)}
          onUpdateMotivationMap={(id, stageScores) => dispatch({ type: "UPDATE_MOTIVATION_MAP", id, changes: { stageScores } })}
          onToggleCollapse={(id) => toggleSwimlaneCollapse(id)}
          onToggleSectionCollapse={(id) => toggleSectionCollapse(id)}
        />
      </div>

      <EditDrawer />
    </div>
  );
}
