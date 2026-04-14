import { useCallback, useMemo, useState } from "react";
import { LandingScreen } from "./components/LandingScreen";
import { BlueprintWizard } from "./components/BlueprintWizard";
import { Blueprint } from "./components/Blueprint";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { BlueprintProvider } from "./context/BlueprintContext";
import { useBlueprint } from "./hooks/useBlueprint";
import { useDragScroll } from "./lib/useDragScroll";
import { downloadBlueprintHtml } from "./lib/exportHtml";
import { allStagesOrdered, stagesWithMotivationScores, motivationMapForSwimlane } from "./utils/dataUtils";

type Route = "landing" | "wizard" | "editor";

function AppContent() {
  const { state, loadBlueprint, reset, setEditMode } = useBlueprint();
  const { blueprint, fileName, touchpointMedia, editMode } = state;
  const dragRef = useDragScroll<HTMLElement>();
  const [route, setRoute] = useState<Route>("landing");

  // When a blueprint loads (from upload or wizard), switch to editor
  const handleBlueprintLoaded = useCallback(
    (data: Parameters<typeof loadBlueprint>[0], name: string) => {
      loadBlueprint(data, name);
      setRoute("editor");
    },
    [loadBlueprint],
  );

  const handleReset = useCallback(() => {
    reset();
    setRoute("landing");
  }, [reset]);

  // Export
  const exportData = useMemo(() => {
    if (!blueprint) return null;
    const orderedStages = allStagesOrdered(blueprint);
    const mmSwimlane = blueprint.swimlanes.find((s) => s.type === "motivation_map");
    const mm = mmSwimlane ? motivationMapForSwimlane(blueprint, mmSwimlane.id) : undefined;
    return { ...blueprint, journeyStages: stagesWithMotivationScores(orderedStages, mm) };
  }, [blueprint]);

  const handleDownload = useCallback(() => {
    if (exportData)
      downloadBlueprintHtml(exportData as any, touchpointMedia, fileName ?? "Service Blueprint");
  }, [exportData, touchpointMedia, fileName]);

  // ── Landing ──
  if (route === "landing") {
    return (
      <LandingScreen
        onLoaded={handleBlueprintLoaded}
        onBuild={() => setRoute("wizard")}
      />
    );
  }

  // ── Wizard ──
  if (route === "wizard") {
    return (
      <BlueprintWizard
        onComplete={handleBlueprintLoaded}
        onCancel={() => setRoute("landing")}
      />
    );
  }

  // ── Editor ──
  return (
    <div className="flex h-screen flex-col bg-neutral-sand-50">
      <TopNav
        fileName={fileName}
        editMode={editMode}
        onToggleEditMode={() => setEditMode(!editMode)}
        onSave={() => setEditMode(false)}
        onDownload={handleDownload}
        onHome={handleReset}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onDownload={handleDownload}
          onHome={handleReset}
          editMode={editMode}
          onToggleEditMode={() => setEditMode(!editMode)}
        />

        <main ref={dragRef} className="flex-1 overflow-auto">
          <div className="w-fit min-w-full px-4 py-4 sm:px-6">
            {blueprint && (
              <ErrorBoundary>
                <Blueprint />
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BlueprintProvider>
      <AppContent />
    </BlueprintProvider>
  );
}

export default App;
