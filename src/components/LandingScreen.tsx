import { useCallback, useRef, useState } from "react";
import { parseExcel } from "../utils/parseExcel";
import type { Blueprint } from "../types/blueprint";

interface Props {
  onLoaded: (data: Blueprint, fileName: string) => void;
  onBuild: () => void;
}

export function LandingScreen({ onLoaded, onBuild }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please upload an .xlsx or .xls file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await parseExcel(file);
      onLoaded(data, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-sand-50 px-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-12">
        {/* Branding */}
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-navy-900/50">
            concentrix
          </div>
          <h1 className="mt-2 text-4xl font-light leading-tight text-brand-navy-1000 sm:text-5xl">
            Service Blueprint Editor
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-neutral-gray-600">
            Map customer journeys across stages, phases, and swimlanes.
            Upload an existing blueprint or start from scratch.
          </p>
        </div>

        {/* Two entry cards */}
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Upload Excel — triggers file picker or accepts drag-and-drop */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`group flex flex-col items-center gap-5 rounded-[20px] border-2 px-8 py-10 text-center transition-all disabled:opacity-60 ${
              dragging
                ? "border-brand-cyan-500 bg-brand-cyan-500/5 shadow-lg"
                : "border-neutral-gray-200 bg-white hover:border-brand-cyan-500 hover:shadow-lg"
            }`}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500 transition-colors group-hover:bg-brand-cyan-500 group-hover:text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-navy-1000">
                {loading ? "Parsing..." : "Upload Excel"}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-gray-600">
                Import an existing blueprint from a structured .xlsx file
              </p>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {/* Start Building */}
          <button
            type="button"
            onClick={onBuild}
            className="group flex flex-col items-center gap-5 rounded-[20px] border-2 border-neutral-gray-200 bg-white px-8 py-10 text-center transition-all hover:border-brand-purple-500 hover:shadow-lg"
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-purple-500/10 text-brand-purple-500 transition-colors group-hover:bg-brand-purple-500 group-hover:text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-navy-1000">Start Building</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-gray-600">
                Create a new blueprint from scratch with the interactive wizard
              </p>
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-md rounded-md border border-semantic-error/30 bg-semantic-error/5 px-4 py-3 text-center text-sm text-semantic-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
