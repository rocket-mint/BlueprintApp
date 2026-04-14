import { useEffect, useRef, useState } from "react";

export interface Media {
  image?: string; // data URL or remote URL
  link?: string;  // optional hyperlink
}

interface Props {
  title: string;
  subtitle?: string;
  /** Brand accent for the header border + Save button. Defaults to brand cyan. */
  accentHex?: string;
  initial: Media | undefined;
  onSave: (media: Media) => void;
  onRemove: () => void;
  onClose: () => void;
}

const DEFAULT_ACCENT = "#00b0ca";

export function MediaModal({ title, subtitle, accentHex, initial, onSave, onRemove, onClose }: Props) {
  const accent = accentHex ?? DEFAULT_ACCENT;
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [link, setLink] = useState<string>(initial?.link ?? "");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, GIF, SVG, …)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : undefined);
      setError(null);
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsDataURL(file);
  };

  const validLink =
    link.trim() === "" || /^https?:\/\//i.test(link.trim()) || link.trim().startsWith("/");

  const handleSave = () => {
    if (!validLink) {
      setError("Link must start with http://, https://, or /");
      return;
    }
    onSave({ image, link: link.trim() || undefined });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-brand-navy-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-xl border-b-4 px-5 py-4"
          style={{ borderColor: accent }}
        >
          <div>
            {subtitle && (
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: accent }}
              >
                {subtitle}
              </div>
            )}
            <h3 id="media-modal-title" className="text-lg font-bold text-brand-navy-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-gray-500 hover:bg-neutral-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Image picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-gray-500">
              Image
            </label>
            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Preview"
                  className="h-40 w-full rounded-lg border border-neutral-gray-200 object-cover"
                />
                <button
                  onClick={() => setImage(undefined)}
                  className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-gray-700 shadow hover:bg-white"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="grid h-40 place-items-center rounded-lg border-2 border-dashed border-neutral-gray-300 bg-neutral-gray-50 text-sm text-neutral-gray-600 hover:border-brand-cyan-500 hover:bg-brand-blue-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Click to upload an image</span>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Link input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="media-modal-link"
              className="text-xs font-semibold uppercase tracking-wider text-neutral-gray-500"
            >
              Hyperlink <span className="font-normal normal-case text-neutral-gray-400">(optional)</span>
            </label>
            <input
              id="media-modal-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-md border border-neutral-gray-200 bg-white px-3 py-2 text-sm text-neutral-gray-900 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
            />
          </div>

          {error && (
            <div className="rounded-md border border-semantic-error/30 bg-semantic-error/5 px-3 py-2 text-xs text-semantic-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-xl border-t border-neutral-gray-100 bg-neutral-gray-50 px-5 py-3">
          {initial?.image || initial?.link ? (
            <button
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="text-xs font-semibold text-semantic-error hover:underline"
            >
              Remove media
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-neutral-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-gray-700 hover:bg-neutral-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
