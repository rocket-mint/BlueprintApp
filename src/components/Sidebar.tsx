// Always-visible left sidebar. Sticky 250px column inside the top-level flex
// row in App.tsx, scrolls with the page until pinned to top:0 of the viewport.
import { useState } from "react";

interface SidebarProps {
  editMode?: boolean;
}

const DEFAULTS = {
  title: "Future Journey Map",
  intro: "The modern customer journey is composed of multiple, overlapping touchpoints and interactions that are not as clearly defined as traditional marketing funnels.",
  howToUse: "Drag horizontally anywhere on the blueprint to pan across the journey. Click a swimlane title to collapse or expand it. Click any touchpoint card's pencil icon to attach an image or link reference.",
  subjectToChange: "This map is a living artifact. As research and design iterate, the stages, swimlanes, and touchpoints will evolve.",
};

function EditableText({
  value,
  onChange,
  multiline = false,
  className = "",
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const base = `w-full rounded border border-brand-purple-300 bg-white/70 px-2 py-1 text-brand-navy-900 outline-none focus:border-brand-purple-500 focus:ring-1 focus:ring-brand-purple-500/30 ${className}`;
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={base}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={base}
    />
  );
}

export function Sidebar({ editMode }: SidebarProps) {
  const [title, setTitle] = useState(DEFAULTS.title);
  const [intro, setIntro] = useState(DEFAULTS.intro);
  const [howToUse, setHowToUse] = useState(DEFAULTS.howToUse);
  const [subjectToChange, setSubjectToChange] = useState(DEFAULTS.subjectToChange);
  const [keyLabels, setKeyLabels] = useState([
    "Journey stage",
    "Touchpoint card",
    "Motivation curve",
    "Insight",
    "Callout",
  ]);

  const keyColors = [
    "bg-brand-navy-1000",
    "border border-neutral-gray-300 bg-white",
    "bg-brand-purple-500",
    "bg-brand-cyan-500",
    "bg-semantic-warning",
  ];

  return (
    <aside
      role="complementary"
      aria-label="Journey map context"
      className="sticky top-0 z-10 flex h-full w-[250px] shrink-0 flex-col self-start overflow-y-auto border-r border-brand-navy-900/10 bg-brand-blue-100 px-5 pb-6 pt-8"
    >
      {/* Brand + title */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-navy-900/60">
          Just A
        </div>
        {editMode ? (
          <EditableText
            value={title}
            onChange={setTitle}
            className="mt-1 text-xl font-bold leading-tight"
            placeholder="Map title"
          />
        ) : (
          <h2 className="mt-1 text-xl font-bold leading-tight text-brand-navy-900">
            {title}
          </h2>
        )}
      </div>

      {editMode ? (
        <EditableText
          value={intro}
          onChange={setIntro}
          multiline
          className="mb-5 text-xs leading-relaxed"
          placeholder="Introduction text"
        />
      ) : (
        <p className="mb-5 text-xs leading-relaxed text-brand-navy-900/80">{intro}</p>
      )}

      <div className="flex flex-col gap-4">
        <Section title="How to use">
          {editMode ? (
            <EditableText
              value={howToUse}
              onChange={setHowToUse}
              multiline
              className="text-[11px] leading-relaxed"
              placeholder="How to use instructions"
            />
          ) : (
            howToUse
          )}
        </Section>

        <Section title="Subject to change">
          {editMode ? (
            <EditableText
              value={subjectToChange}
              onChange={setSubjectToChange}
              multiline
              className="text-[11px] leading-relaxed"
              placeholder="Subject to change text"
            />
          ) : (
            subjectToChange
          )}
        </Section>

        <Section title="Key">
          <ul className="flex flex-col gap-1.5 text-[11px] text-brand-navy-900/80">
            {keyLabels.map((label, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${keyColors[i]}`} />
                {editMode ? (
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => {
                      const next = [...keyLabels];
                      next[i] = e.target.value;
                      setKeyLabels(next);
                    }}
                    className="flex-1 rounded border border-brand-purple-300 bg-white/70 px-1.5 py-0.5 text-[11px] text-brand-navy-900 outline-none focus:border-brand-purple-500 focus:ring-1 focus:ring-brand-purple-500/30"
                  />
                ) : (
                  label
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>

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
