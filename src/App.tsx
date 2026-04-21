import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LandingScreen } from "./components/LandingScreen";
import { Blueprint } from "./components/Blueprint";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { BlueprintProvider } from "./context/BlueprintContext";
import { useBlueprint } from "./hooks/useBlueprint";
import { useDragScroll } from "./lib/useDragScroll";
import { downloadBlueprintHtml } from "./lib/exportHtml";
import { zoomIn, zoomOut } from "./lib/zoomLevels";
import { saveBlueprintFile } from "./utils/blueprintFile";
import type { Media } from "./components/MediaModal";
import { allStagesOrdered } from "./utils/dataUtils";

type Route = "landing" | "editor";

function AppContent() {
  const { state, loadBlueprint, setEditMode, setZoom } = useBlueprint();
  const { blueprint, fileName, touchpointMedia, editMode, zoom } = state;
  const dragRef = useDragScroll<HTMLElement>();
  const [route, setRoute] = useState<Route>("landing");

  // ── Zoom keyboard shortcuts (Ctrl/Cmd +, -, 0) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom(zoomIn(zoom));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom(zoomOut(zoom));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, setZoom]);
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
        zoom={zoom}
        onZoomIn={() => setZoom(zoomIn(zoom))}
        onZoomOut={() => setZoom(zoomOut(zoom))}
        onZoomReset={() => setZoom(1)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar editMode={editMode} />

        <main
          ref={dragRef}
          id="bp-export-main"
          className="flex-1 overflow-auto"
          style={{ zoom }}
        >
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
