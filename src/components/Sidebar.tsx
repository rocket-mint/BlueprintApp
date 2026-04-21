// Always-visible left sidebar. Sticky 250px column inside the top-level flex
// row in App.tsx, scrolls with the page until pinned to top:0 of the viewport.
import { useEffect, useRef, useState } from "react";
import type { SidebarKeyItem } from "../types/blueprint";
import { useBlueprint } from "../hooks/useBlueprint";

interface SidebarProps {
  editMode?: boolean;
}

type KeyItem = SidebarKeyItem;

const DEFAULTS = {
  title: "Future Journey Map",
  intro: "The modern customer journey is composed of multiple, overlapping touchpoints and interactions that are not as clearly defined as traditional marketing funnels.",
  howToUse: "Drag horizontally anywhere on the blueprint to pan across the journey. Click a swimlane title to collapse or expand it. Click any touchpoint card's pencil icon to attach an image or link reference.",
};

const DEFAULT_KEY_ITEMS: KeyItem[] = [
  { label: "Journey stage",    bg: "#0f1724", border: "" },
  { label: "Touchpoint card",  bg: "#ffffff", border: "#d1d5db" },
  { label: "Motivation curve", bg: "#8073ff", border: "" },
  { label: "Callout",          bg: "#f59e0b", border: "" },
];

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

/**
 * Minimal rich-text editor: bold, italic, bullet list via execCommand.
 *
 * Uncontrolled: sets innerHTML ONCE on mount from `initialValue` and lets the
 * browser's contenteditable manage the DOM afterward. React never touches the
 * contenteditable's children again. Parent reads the current HTML on demand
 * via the `ref.current.getHtml()` method.
 */
export interface RichTextHandle {
  getHtml(): string;
}

const RichTextEditor = ({
  initialValue,
  handleRef,
  className = "",
  placeholder = "",
}: {
  initialValue: string;
  handleRef: React.MutableRefObject<RichTextHandle | null>;
  className?: string;
  placeholder?: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Set initial HTML once on mount. Empty deps — never re-run.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue;
    }
    handleRef.current = {
      getHtml: () => editorRef.current?.innerHTML ?? "",
    };
    return () => {
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
  }

  const ToolBtn = ({ cmd, arg, title, children }: {
    cmd: string; arg?: string; title: string; children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, arg); }}
      className="grid h-6 w-6 place-items-center rounded text-[12px] font-semibold text-brand-navy-900/70 hover:bg-brand-purple-100 hover:text-brand-purple-600"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded border border-brand-purple-300 bg-white/70 focus-within:border-brand-purple-500 focus-within:ring-1 focus-within:ring-brand-purple-500/30">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-brand-purple-200 px-1 py-0.5">
        <ToolBtn cmd="bold" title="Bold"><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic" title="Italic"><em>I</em></ToolBtn>
        <ToolBtn cmd="insertUnorderedList" title="Bullet list">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="9" y1="6" x2="20" y2="6"/>
            <line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
        </ToolBtn>
      </div>
      {/* Editable area — no children in JSX; innerHTML set via ref on mount */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`min-h-[80px] px-2 py-1 text-brand-navy-900 outline-none [&_ul]:ml-4 [&_ul]:list-disc ${className}`}
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
};

/** Color swatch that doubles as a color-picker trigger in edit mode */
function KeySwatch({
  bg,
  border,
  editMode,
  onChange,
}: {
  bg: string;
  border: string;
  editMode?: boolean;
  onChange?: (color: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const swatch = (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{
        background: bg,
        border: border ? `1px solid ${border}` : undefined,
      }}
    />
  );

  if (!editMode) return swatch;

  return (
    <label
      className="relative shrink-0 cursor-pointer"
      title="Click to change color"
    >
      {swatch}
      <input
        ref={inputRef}
        type="color"
        value={bg}
        onChange={(e) => onChange?.(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ padding: 0, border: 0 }}
      />
    </label>
  );
}

/** Logo slot shown at the top of the sidebar. In edit mode, lets user
 *  upload or remove an image. In view mode, shows the image if set, else
 *  nothing. Constrained to sidebar width via max-w-full + max-h-20. */
function LogoEditor({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // allow re-selecting same file
        }}
      />
      {value ? (
        <div className="group relative">
          <img
            src={value}
            alt=""
            className="block max-h-20 w-auto max-w-full cursor-pointer rounded object-contain"
            onClick={() => fileInputRef.current?.click()}
            title="Click to replace logo"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Remove logo"
            className="absolute right-0 top-0 grid h-5 w-5 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-white text-neutral-gray-500 shadow ring-1 ring-neutral-gray-200 opacity-0 transition-opacity hover:text-semantic-error group-hover:opacity-100"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-brand-navy-900/25 px-2 py-3 text-[11px] text-brand-navy-900/50 transition-colors hover:border-brand-purple-400 hover:text-brand-purple-500"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Add logo
        </button>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-semantic-error">{error}</p>
      )}
    </div>
  );
}

export function Sidebar({ editMode }: SidebarProps) {
  const { state, dispatch } = useBlueprint();
  const sidebarCfg = state.blueprint?.sidebar;

  // Committed ("saved") values — what view mode shows. Sourced from bp.sidebar
  // with falls back to defaults so files saved before this field show sensibly.
  const title = sidebarCfg?.title ?? DEFAULTS.title;
  const intro = sidebarCfg?.intro ?? DEFAULTS.intro;
  const howToUse = sidebarCfg?.howToUse ?? DEFAULTS.howToUse;
  const keyItems = sidebarCfg?.keyItems ?? DEFAULT_KEY_ITEMS;
  const logo = sidebarCfg?.logo;

  // Draft values — what the edit mode inputs bind to. Seeded from committed
  // values whenever the user enters edit mode. Committed on "Save changes".
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftKeyItems, setDraftKeyItems] = useState<KeyItem[]>(keyItems);
  const [draftLogo, setDraftLogo] = useState<string | undefined>(logo);
  const introRef = useRef<RichTextHandle | null>(null);
  const howToUseRef = useRef<RichTextHandle | null>(null);
  // Bump this key whenever we enter edit mode — forces RichTextEditor to
  // remount so its initial innerHTML reflects the current committed value.
  const [editSessionKey, setEditSessionKey] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (editMode) {
      setDraftTitle(title);
      setDraftKeyItems(keyItems);
      setDraftLogo(logo);
      setEditSessionKey((k) => k + 1);
      setJustSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  function updateItem(i: number, patch: Partial<KeyItem>) {
    setDraftKeyItems((prev) => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }

  function removeItem(i: number) {
    setDraftKeyItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addItem() {
    setDraftKeyItems((prev) => [...prev, { label: "New item", bg: "#6b7280", border: "" }]);
  }

  function saveChanges() {
    dispatch({
      type: "UPDATE_SIDEBAR",
      changes: {
        title: draftTitle,
        intro: introRef.current?.getHtml() ?? intro,
        howToUse: howToUseRef.current?.getHtml() ?? howToUse,
        keyItems: draftKeyItems,
        logo: draftLogo,
      },
    });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1500);
  }

  return (
    <aside
      role="complementary"
      aria-label="Journey map context"
      className="sticky top-0 z-10 flex h-full w-[250px] shrink-0 flex-col self-start overflow-y-auto border-r border-brand-navy-900/10 bg-brand-blue-100 px-5 pb-6 pt-8"
    >
      {/* Logo slot */}
      {editMode ? (
        <LogoEditor value={draftLogo} onChange={setDraftLogo} />
      ) : (
        logo && (
          <img
            src={logo}
            alt=""
            className="mb-4 block max-h-20 w-auto max-w-full object-contain"
          />
        )
      )}

      {/* Title */}
      <div className="mb-5">
        {editMode ? (
          <EditableText
            value={draftTitle}
            onChange={setDraftTitle}
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
        <div className="mb-5">
          <RichTextEditor
            key={`intro-${editSessionKey}`}
            initialValue={intro}
            handleRef={introRef}
            className="text-xs leading-relaxed"
            placeholder="Introduction text"
          />
        </div>
      ) : (
        <p
          className="mb-5 text-xs leading-relaxed text-brand-navy-900/80 [&_ul]:ml-4 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      )}

      <div className="flex flex-col gap-4">
        <Section title="How to use">
          {editMode ? (
            <RichTextEditor
              key={`how-${editSessionKey}`}
              initialValue={howToUse}
              handleRef={howToUseRef}
              className="text-[11px] leading-relaxed"
              placeholder="How to use instructions"
            />
          ) : (
            <span
              className="[&_ul]:ml-4 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: howToUse }}
            />
          )}
        </Section>

        <Section title="Key">
          <ul className="flex flex-col gap-1.5">
            {(editMode ? draftKeyItems : keyItems).map((item, i) => (
              <li key={i} className="group flex items-center gap-2">
                <KeySwatch
                  bg={item.bg}
                  border={item.border}
                  editMode={editMode}
                  onChange={(color) => updateItem(i, { bg: color })}
                />
                {editMode ? (
                  <>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(i, { label: e.target.value })}
                      className="flex-1 rounded border border-brand-purple-300 bg-white/70 px-1.5 py-0.5 text-[11px] text-brand-navy-900 outline-none focus:border-brand-purple-500 focus:ring-1 focus:ring-brand-purple-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      title="Remove item"
                      className="shrink-0 text-neutral-gray-400 opacity-0 transition-opacity hover:text-semantic-error group-hover:opacity-100"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-brand-navy-900/80">{item.label}</span>
                )}
              </li>
            ))}
          </ul>

          {editMode && (
            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex w-full items-center gap-1.5 rounded border border-dashed border-brand-navy-900/25 px-2 py-1 text-[11px] text-brand-navy-900/50 transition-colors hover:border-brand-purple-400 hover:text-brand-purple-500"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add item
            </button>
          )}
        </Section>
      </div>

      {editMode && (
        <div className="mt-5 pt-4 border-t border-brand-navy-900/10">
          <button
            type="button"
            onClick={saveChanges}
            className={`w-full rounded-md px-4 py-2 text-xs font-semibold text-white transition ${
              justSaved
                ? "bg-semantic-success"
                : "bg-brand-purple-500 hover:bg-brand-purple-600"
            }`}
          >
            {justSaved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
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
