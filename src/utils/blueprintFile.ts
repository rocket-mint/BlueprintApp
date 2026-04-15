// blueprintFile.ts — save and load .bp project files.
//
// A .bp file is a ZIP archive containing:
//   blueprint.json  — all blueprint data + embedded touchpointMedia
//   metadata.json   — file info (name, version, date)
//
// Images (data URLs) are stored inline in blueprint.json so the file is
// fully self-contained. JSZip's DEFLATE compression keeps sizes reasonable.

import JSZip from "jszip";
import type { Blueprint } from "../types/blueprint";
import type { Media } from "../components/MediaModal";
import { migrateBlueprint } from "./blueprintMigration";

const APP_VERSION = "1.0.0";
const FORMAT_VERSION = 2;

// ---------------------------------------------------------------------------
// Internal shape stored inside blueprint.json
// ---------------------------------------------------------------------------

interface BpFileContent {
  version: typeof FORMAT_VERSION;
  name: string;
  savedAt: string;
  blueprint: Blueprint;
  touchpointMedia: Record<string, Media>;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/**
 * Serialise the current blueprint state to a .bp file and trigger a download.
 */
export async function saveBlueprintFile(
  blueprint: Blueprint,
  touchpointMedia: Record<string, Media>,
  fileName: string,
): Promise<void> {
  const zip = new JSZip();

  const content: BpFileContent = {
    version: FORMAT_VERSION,
    name: fileName,
    savedAt: new Date().toISOString(),
    blueprint,
    touchpointMedia,
  };

  zip.file("blueprint.json", JSON.stringify(content, null, 2));

  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        fileName: `${sanitizeName(fileName)}.bp`,
        appVersion: APP_VERSION,
        savedAt: content.savedAt,
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const safeName = `${sanitizeName(fileName)}.bp`;

  // Use native Save As dialog when available (Chrome/Edge 86+), fall back to blob download.
  if (typeof (window as any).showSaveFilePicker === "function") {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: safeName,
        types: [{ description: "Blueprint Project File", accept: { "application/octet-stream": [".bp"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the dialog — not an error
      if (err.name === "AbortError") return;
      // Any other failure: fall through to blob download
    }
  }

  triggerDownload(blob, safeName);
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export interface LoadedBlueprintFile {
  blueprint: Blueprint;
  fileName: string;
  touchpointMedia: Record<string, Media>;
}

/**
 * Parse a .bp file and return the contained blueprint state.
 * Throws a descriptive Error on any failure so the caller can show it to the user.
 */
export async function loadBlueprintFile(file: File): Promise<LoadedBlueprintFile> {
  if (!/\.bp$/i.test(file.name)) {
    throw new Error("Please select a .bp file.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("Could not read the file. Make sure it is a valid .bp project file.");
  }

  const jsonFile = zip.file("blueprint.json");
  if (!jsonFile) {
    throw new Error("Invalid .bp file: blueprint.json is missing.");
  }

  let content: BpFileContent;
  try {
    const text = await jsonFile.async("text");
    content = JSON.parse(text) as BpFileContent;
  } catch {
    throw new Error("Invalid .bp file: blueprint.json could not be parsed.");
  }

  if (!content.blueprint) {
    throw new Error("Invalid .bp file: blueprint data is missing.");
  }

  return {
    blueprint: migrateBlueprint(content.blueprint),
    fileName: content.name || file.name.replace(/\.bp$/i, ""),
    touchpointMedia: content.touchpointMedia ?? {},
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeName(name: string): string {
  return name.replace(/\.bp$/i, "").replace(/[/\\?%*:|"<>]/g, "_").trim() || "blueprint";
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
