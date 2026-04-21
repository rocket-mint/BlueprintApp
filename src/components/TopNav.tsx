interface TopNavProps {
  fileName?: string | null;
  editMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancel: () => void;
  onSaveBp: () => void;
  onDownload: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function TopNav({
  editMode,
  onToggleEditMode,
  onSave,
  onCancel,
  onSaveBp,
  onDownload,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: TopNavProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b px-5 transition-colors duration-200 ${
        editMode
          ? "border-brand-purple-500/30 bg-brand-purple-500/10"
          : "border-neutral-gray-200 bg-white"
      }`}
    >
      {/* Left spacer — balances the right action group so the tip stays centered */}
      <div className="flex-1" />

      {/* Center — pan tip */}
      <div className="shrink-0 text-sm text-neutral-gray-600">
        🖐️ Hold SPACE and click-drag to pan around
      </div>

      {/* Right — actions */}
      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        {/* Zoom cluster */}
        <div className="flex items-center gap-1 rounded-md border border-neutral-gray-200 bg-white px-1 py-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="rounded px-2 py-1 text-sm text-neutral-gray-700 hover:bg-neutral-gray-50"
          >
            −
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            aria-label="Reset zoom"
            className="min-w-[44px] rounded px-1 py-1 text-xs font-semibold tabular-nums text-neutral-gray-700 hover:bg-neutral-gray-50"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="rounded px-2 py-1 text-sm text-neutral-gray-700 hover:bg-neutral-gray-50"
          >
            +
          </button>
        </div>

        {editMode ? (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-gray-600 transition hover:bg-neutral-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-purple-600"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Save & Exit
            </button>
          </>
        ) : (
          <>
          <button
            type="button"
            onClick={onToggleEditMode}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-gray-700 transition hover:bg-neutral-gray-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            onClick={onSaveBp}
            title="Save as .bp project file"
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-gray-700 transition hover:bg-neutral-gray-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          </>
        )}

        <button
          type="button"
          onClick={onDownload}
          title="Download as HTML"
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-cyan-500 bg-brand-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-blue-500 hover:bg-brand-blue-500"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
    </header>
  );
}
