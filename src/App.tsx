import { useCallback, useMemo, useRef, useState } from "react";
import { LandingScreen } from "./components/LandingScreen";
import { Blueprint } from "./components/Blueprint";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { BlueprintProvider } from "./context/BlueprintContext";
import { useBlueprint } from "./hooks/useBlueprint";
import { useDragScroll } from "./lib/useDragScroll";
import { downloadBlueprintHtml } from "./lib/exportHtml";
import { saveBlueprintFile } from "./utils/blueprintFile";
import type { Media } from "./components/MediaModal";
import { allStagesOrdered } from "./utils/dataUtils";

type Route = "landing" | "editor";

function AppContent() {
  const { state, loadBlueprint, reset, setEditMode } = useBlueprint();
  const { blueprint, fileName, touchpointMedia, editMode } = state;
  const dragRef = useDragScroll<HTMLElement>();
  const [route, setRoute] = useState<Route>("landing");
  // Snapshot taken when entering edit mode — restored on cancel
  const blueprintSnapshot = useRef<typeof blueprint>(null);

  // When a blueprint loads (from any source), switch to editor
  const handleBlueprintLoaded = useCallback(
    (data: Parameters<typeof loadBlueprint>[0], name: string, touchpointMedia?: Record<string, Media>) => {
      loadBlueprint(data, name, touchpointMedia);
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
    return { ...blueprint, journeyStages: orderedStages };
  }, [blueprint]);

  const handleDownload = useCallback(() => {
    if (exportData)
      downloadBlueprintHtml(exportData as any, touchpointMedia, fileName ?? "Service Blueprint");
  }, [exportData, touchpointMedia, fileName]);

  const handleSaveBp = useCallback(() => {
    if (!blueprint) return;
    saveBlueprintFile(blueprint, touchpointMedia, fileName ?? "blueprint");
  }, [blueprint, touchpointMedia, fileName]);

  // ── Landing ──
  if (route === "landing") {
    return <LandingScreen onLoaded={handleBlueprintLoaded} />;
  }

  // ── Editor ──
  return (
    <div className="flex h-screen flex-col bg-neutral-sand-50">
      <TopNav
        fileName={fileName}
        editMode={editMode}
        onToggleEditMode={() => {
          if (!editMode) blueprintSnapshot.current = blueprint;
          setEditMode(!editMode);
        }}
        onSave={() => {
          blueprintSnapshot.current = null;
          setEditMode(false);
        }}
        onCancel={() => {
          if (blueprintSnapshot.current && fileName) {
            loadBlueprint(blueprintSnapshot.current, fileName);
          }
          blueprintSnapshot.current = null;
          setEditMode(false);
        }}
        onSaveBp={handleSaveBp}
        onDownload={handleDownload}
        onHome={handleReset}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar editMode={editMode} />

        <main ref={dragRef} id="bp-export-main" className="flex-1 overflow-auto">
          <div className="w-max min-w-full px-4 py-4 sm:px-6">
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
