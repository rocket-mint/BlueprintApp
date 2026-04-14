// Always-visible left sidebar. Sticky 250px column inside the top-level flex
// row in App.tsx, scrolls with the page until pinned to top:0 of the viewport.
interface SidebarProps {
  onDownload?: () => void;
  onHome?: () => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
}

export function Sidebar({ onDownload, onHome, editMode, onToggleEditMode }: SidebarProps) {
  return (
    <aside
      role="complementary"
      aria-label="Journey map context"
      className="sticky top-0 z-10 flex h-screen w-[250px] shrink-0 flex-col self-start overflow-y-auto border-r border-brand-navy-900/10 bg-brand-blue-100 px-5 pb-6 pt-8"
    >
      {/* Brand + title */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-navy-900/60">
          concentrix
        </div>
        <h2 className="mt-1 text-xl font-bold leading-tight text-brand-navy-900">
          Future Journey Map
        </h2>
      </div>

      <p className="mb-5 text-xs leading-relaxed text-brand-navy-900/80">
        The modern customer journey is composed of multiple, overlapping
        touchpoints and interactions that are not as clearly defined as
        traditional marketing funnels.
      </p>

      <div className="flex flex-col gap-4">
        <Section title="How to use">
          Drag horizontally anywhere on the blueprint to pan across the journey.
          Click a swimlane title to collapse or expand it. Click any touchpoint
          card&apos;s pencil icon to attach an image or link reference.
        </Section>

        <Section title="Subject to change">
          This map is a living artifact. As research and design iterate, the
          stages, swimlanes, and touchpoints will evolve.
        </Section>

        <Section title="Key">
          <ul className="flex flex-col gap-1.5 text-[11px] text-brand-navy-900/80">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand-navy-1000" />
              Journey stage
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-neutral-gray-300 bg-white" />
              Touchpoint card
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand-purple-500" />
              Motivation curve
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand-cyan-500" />
              Insight
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-semantic-warning" />
              Callout
            </li>
          </ul>
        </Section>
      </div>

      {/* Spacer to push download button to bottom */}
      <div className="flex-1" />

      {onToggleEditMode && (
        <button
          type="button"
          onClick={onToggleEditMode}
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
            editMode
              ? "border-2 border-brand-purple-500 bg-brand-purple-500/10 text-brand-purple-500"
              : "border border-neutral-gray-200 bg-white text-neutral-gray-700 hover:bg-neutral-gray-50"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          {editMode ? "Editing" : "Edit Mode"}
        </button>
      )}

      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          title="Download a self-contained, read-only HTML copy of this blueprint"
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand-cyan-500 bg-brand-cyan-500 px-3 py-2 text-xs font-semibold text-white hover:border-brand-blue-500 hover:bg-brand-blue-500"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download as HTML
        </button>
      )}

      {onHome && (
        <button
          type="button"
          onClick={onHome}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-xs font-medium text-neutral-gray-700 hover:bg-neutral-gray-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </button>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-brand-navy-900">
        {title}
      </h3>
      <div className="text-[11px] leading-relaxed text-brand-navy-900/80">
        {children}
      </div>
    </div>
  );
}
