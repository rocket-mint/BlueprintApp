import { useCallback, useRef, useState } from "react";
import { parseExcel } from "../utils/parseExcel";
import { migrateBlueprint } from "../utils/blueprintMigration";
import type { Blueprint } from "../types/blueprint";

interface Props {
  onLoaded: (data: Blueprint, fileName: string) => void;
  onError: (msg: string) => void;
}

export function FileUpload({ onLoaded, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        onError("Please upload an .xlsx or .xls file");
        return;
      }
      setLoading(true);
      try {
        const raw = await parseExcel(file);
        const data = migrateBlueprint(raw);
        onLoaded(data, file.name);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setLoading(false);
      }
    },
    [onLoaded, onError]
  );

  return (
    <div
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
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition ${
        dragging
          ? "border-brand-cyan-500 bg-brand-cyan-500/5"
          : "border-neutral-gray-300 bg-white hover:border-brand-cyan-500 hover:bg-brand-blue-50"
      }`}
    >
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
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-cyan-500/10 text-brand-cyan-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-brand-navy-900">
          {loading ? "Parsing…" : "Upload journey data"}
        </p>
        <p className="text-sm text-neutral-gray-600">
          Drag & drop an .xlsx file, or click to browse
        </p>
        <p className="text-xs text-neutral-gray-500">
          Sheets: Sections · Journey Stages · Phases · Swimlanes · Touchpoints · Callouts · Motivation Maps
        </p>
      </div>
    </div>
  );
}
