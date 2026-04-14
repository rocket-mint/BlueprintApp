interface TopNavProps {
  fileName?: string | null;
  editMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onDownload: () => void;
  onHome: () => void;
}

export function TopNav({ fileName, editMode, onToggleEditMode, onSave, onDownload, onHome }: TopNavProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b px-5 transition-colors duration-200 ${
        editMode
          ? "border-brand-purple-500/30 bg-brand-purple-500/10"
          : "border-neutral-gray-200 bg-white"
      }`}
    >
      {/* Left — logo + file name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-70"
          title="Back to home"
        >
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${editMode ? "text-brand-purple-700" : "text-brand-navy-900/50"}`}>
            Just A
          </span>
          <span className={`text-sm font-semibold ${editMode ? "text-brand-purple-900" : "text-brand-navy-1000"}`}>
            Service Blueprint
          </span>
        </button>

        {fileName && (
          <>
            <span className="text-neutral-gray-300">/</span>
            <span className="truncate text-sm text-neutral-gray-500">{fileName}</span>
          </>
        )}

        {editMode && (
          <span className="ml-1 rounded-full bg-brand-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Editing
          </span>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex shrink-0 items-center gap-2">
        {editMode ? (
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
        ) : (
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
