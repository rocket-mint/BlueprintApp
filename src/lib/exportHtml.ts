// Standalone HTML exporter for the blueprint.
//
// Strategy: DOM capture.
// The blueprint is already rendered correctly by React in the live page.
// We deep-clone the live DOM, replace MotivationMap SVGs with responsive
// pre-built versions, capture all Tailwind CSS from the page stylesheets,
// and bundle everything into a self-contained HTML file.
//
// Interactivity added via a small vanilla JS IIFE:
//   - Drag-to-pan the blueprint canvas
//   - Motivation map dot tooltips (data-mm-* attributes)
//   - Touchpoint hover cards (data-tp-id + embedded JSON)

import type { Blueprint } from "../types/blueprint";
import type { Media } from "../components/MediaModal";

// ---------------------------------------------------------------------------
// CSS capture
// ---------------------------------------------------------------------------

function captureCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) out.push(rule.cssText);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ---------------------------------------------------------------------------
// Pre-render responsive motivation map SVG (TypeScript side, no DOM).
// viewBox + preserveAspectRatio="none" means it scales to any container width.
// Each dot carries data-mm-* attributes for the tooltip interaction script.
// ---------------------------------------------------------------------------

/**
 * Builds the motivation map as a relative-positioned container with:
 *  - An SVG for gridlines + fill + line (uses preserveAspectRatio="none" safely
 *    because only paths/lines are inside — no circles to distort)
 *  - Absolutely-positioned <div> dots overlaid on top, so they stay perfectly
 *    circular regardless of container width.
 */
function buildMmHtml(
  points: Array<{ x: number; score: number; title?: string; description?: string }>,
  _gradientId: string,
): string {
  // Base64-encode the points JSON to completely avoid HTML attribute encoding issues.
  // The interaction script decodes with atob() then JSON.parse().
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(points))));
  return (
    `<div data-mm-render style="position:relative;width:100%;height:200px;` +
    `background:#eff6ff;border-radius:12px;overflow:hidden" ` +
    `data-mm-b64="${b64}">` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// Interaction script — injected as a plain IIFE into the exported HTML.
// Handles: drag-to-pan, motivation map tooltips, touchpoint hover cards.
// Uses string concatenation to avoid conflicting with TS template literals.
// ---------------------------------------------------------------------------

const INTERACTION_SCRIPT = `
(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── Motivation map: render paths at actual width + dot tooltips ──
  (function () {
    var PURPLE = "#8073ff";

    function clamp(n) { return Math.max(0, Math.min(1, n)); }

    function catmullRom(pts) {
      if (!pts.length) return "";
      if (pts.length === 1) return "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      var d = "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[i + 2] || p2;
        var c1x = p1[0] + (p2[0] - p0[0]) / 6;
        var c1y = p1[1] + (p2[1] - p0[1]) / 6;
        var c2x = p2[0] - (p3[0] - p1[0]) / 6;
        var c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + "," + c2x.toFixed(1) + " " + c2y.toFixed(1) + "," + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
      }
      return d;
    }

    function renderMm(el) {
      // Retry until the element has a real width (layout not yet done = clientWidth 0)
      var W = el.clientWidth;
      if (!W) { setTimeout(function () { renderMm(el); }, 30); return; }

      var b64 = el.getAttribute("data-mm-b64");
      if (!b64) return;
      var points;
      try { points = JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch (e) { return; }
      if (!points || !points.length) return;
      var H = 200;
      var ML = 8, MR = 16, MT = 20, MB = 20;
      var IW = W - ML - MR;
      var IH = H - MT - MB;
      var DOT_D = 14;

      var sorted = points.slice().sort(function (a, b) { return a.x - b.x; });
      var coords = sorted.map(function (p) {
        return [ML + clamp(p.x) * IW, MT + (1 - clamp(p.score)) * IH];
      });

      var gid = "mmg" + Math.random().toString(36).slice(2);
      var linePath = catmullRom(coords);
      var baseY = (MT + IH).toFixed(1);
      var areaPath = coords.length >= 2
        ? linePath + " L " + coords[coords.length - 1][0].toFixed(1) + " " + baseY + " L " + coords[0][0].toFixed(1) + " " + baseY + " Z"
        : "";

      var gridlines = [1.0, 0.5, 0.0].map(function (v) {
        var y = (MT + (1 - v) * IH).toFixed(1);
        return '<line x1="' + ML + '" x2="' + (W - MR) + '" y1="' + y + '" y2="' + y + '" stroke="#e5e7eb" stroke-dasharray="4 4" stroke-width="1"/>';
      }).join("");

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'
        + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="' + PURPLE + '" stop-opacity="0.3"/>'
        + '<stop offset="100%" stop-color="' + PURPLE + '" stop-opacity="0.03"/>'
        + '</linearGradient></defs>'
        + gridlines
        + (areaPath ? '<path d="' + areaPath + '" fill="url(#' + gid + ')"/>' : "")
        + (linePath ? '<path d="' + linePath + '" fill="none" stroke="' + PURPLE + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : "")
        + '</svg>';

      var dots = sorted.map(function (pt, i) {
        var lp = ((coords[i][0] / W) * 100).toFixed(3);
        var tp = ((coords[i][1] / H) * 100).toFixed(3);
        var score = Math.round(clamp(pt.score) * 100);
        var da = 'data-mm-score="' + score + '"'
          + (pt.title ? ' data-mm-title="' + esc(pt.title) + '"' : "")
          + (pt.description ? ' data-mm-desc="' + esc(pt.description) + '"' : "");
        return '<div ' + da + ' style="position:absolute;left:' + lp + '%;top:' + tp + '%;'
          + 'transform:translate(-50%,-50%);width:' + DOT_D + 'px;height:' + DOT_D + 'px;'
          + 'border-radius:50%;background:' + PURPLE + ';border:2px solid white;'
          + 'box-shadow:0 1px 4px rgba(0,0,0,0.15);z-index:1;cursor:default;transition:transform 120ms"'
          + ' onmouseover="this.style.transform=\'translate(-50%,-50%) scale(1.35)\'"'
          + ' onmouseout="this.style.transform=\'translate(-50%,-50%) scale(1)\'"></div>';
      }).join("");

      el.innerHTML = svg + dots;
    }

    // Kick off rendering — each renderMm call retries until clientWidth > 0.
    function renderAll() {
      document.querySelectorAll("[data-mm-render]").forEach(renderMm);
    }
    renderAll();
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAll, 100);
    });

    // Tooltip
    var tip = null;
    function ensureTip() {
      if (!tip) {
        tip = document.createElement("div");
        tip.style.cssText = "display:none;position:fixed;z-index:9999;pointer-events:none;"
          + "min-width:120px;border-radius:8px;border:2px solid #8073ff;background:#fff;"
          + "padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.12)";
        document.body.appendChild(tip);
      }
      return tip;
    }
    document.addEventListener("mouseover", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var score = el.getAttribute("data-mm-score");
      if (score === null) return;
      var t = ensureTip();
      var tv = el.getAttribute("data-mm-title");
      var dv = el.getAttribute("data-mm-desc");
      var html = "";
      if (tv) html += '<div style="font-size:13px;font-weight:700;color:#0f1724;margin-bottom:2px">' + esc(tv) + '</div>';
      html += '<div style="font-size:12px;font-weight:600;color:#8073ff">' + score + '%</div>';
      if (dv) html += '<p style="margin:3px 0 0;font-size:11px;color:#4b5563;line-height:1.4">' + esc(dv) + '</p>';
      t.innerHTML = html;
      t.style.display = "block";
    });
    document.addEventListener("mousemove", function (e) {
      if (!tip || tip.style.display === "none") return;
      tip.style.left = (e.clientX - tip.offsetWidth / 2) + "px";
      tip.style.top  = (e.clientY - tip.offsetHeight - 14) + "px";
    });
    document.addEventListener("mouseout", function (e) {
      var el = e.target;
      if (el && el.getAttribute && el.getAttribute("data-mm-score") !== null && tip) tip.style.display = "none";
    });
  })();

  // ── Swimlane collapse ──
  // window.__slToggle is called via inline onclick set during HTML export.
  var __slCollapsed = {};
  window.__slToggle = function (btn, slId) {
    var cells = document.querySelectorAll("[data-sl-cell]");
    var matches = [];
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].getAttribute("data-sl-cell") === slId) matches.push(cells[i]);
    }
    if (!matches.length) return;
    var chevron = btn.querySelector("svg");
    if (__slCollapsed[slId]) {
      matches.forEach(function (c) { c.style.display = ""; });
      if (chevron) chevron.style.transform = "rotate(90deg)";
      __slCollapsed[slId] = false;
    } else {
      matches.forEach(function (c) { c.style.display = "none"; });
      if (chevron) chevron.style.transform = "";
      __slCollapsed[slId] = true;
    }
  };

  // ── Touchpoint hover cards ──
  (function () {
    var TP = window.__BP_TP_DATA__ || {};
    var card = null;
    function ensureCard() {
      if (!card) {
        card = document.createElement("div");
        card.style.cssText = "display:none;position:fixed;z-index:9998;pointer-events:none;"
          + "width:200px;border-radius:8px;border:2px solid rgba(0,176,202,0.4);background:#fff;"
          + "padding:10px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.12)";
        document.body.appendChild(card);
      }
      return card;
    }
    document.addEventListener("mouseover", function (e) {
      var el = e.target && e.target.closest ? e.target.closest("[data-tp-id]") : null;
      if (!el) return;
      var tp = TP[el.getAttribute("data-tp-id")];
      if (!tp || (!tp.hoverTitle && !tp.hoverDescription)) return;
      var c = ensureCard();
      var html = "";
      if (tp.hoverTitle) html += '<div style="font-size:12px;font-weight:700;color:#0f1724;line-height:1.3">' + esc(tp.hoverTitle) + '</div>';
      if (tp.hoverDescription) html += '<p style="margin:4px 0 0;font-size:11px;line-height:1.4;color:#4b5563">' + esc(tp.hoverDescription) + '</p>';
      c.innerHTML = html;
      c.style.display = "block";
      var rect = el.getBoundingClientRect();
      c.style.left = Math.max(4, rect.left + rect.width / 2 - 100) + "px";
      c.style.top  = (rect.top - c.offsetHeight - 8) + "px";
    });
    document.addEventListener("mouseout", function (e) {
      if (!card) return;
      var el = e.target && e.target.closest ? e.target.closest("[data-tp-id]") : null;
      if (el) card.style.display = "none";
    });
  })();

  // ── Drag-to-pan ──
  (function () {
    var dragEl = null, startX = 0, startScroll = 0, moved = 0, capturedId = null;
    document.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      var t = e.target;
      if (!t || t.closest("button,a,input,select,textarea,label")) return;
      var scroller = t.closest("[data-scroller]");
      if (!scroller) return;
      dragEl = scroller; startX = e.clientX; startScroll = scroller.scrollLeft; moved = 0; capturedId = e.pointerId;
      scroller.style.cursor = "grabbing"; scroller.style.userSelect = "none";
      try { scroller.setPointerCapture(e.pointerId); } catch (err) {}
    });
    document.addEventListener("pointermove", function (e) {
      if (!dragEl) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > moved) moved = Math.abs(dx);
      dragEl.scrollLeft = startScroll - dx;
    });
    function endDrag() {
      if (!dragEl) return;
      dragEl.style.cursor = "grab"; dragEl.style.userSelect = "";
      if (capturedId !== null) { try { dragEl.releasePointerCapture(capturedId); } catch (err) {} capturedId = null; }
      dragEl = null;
    }
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  })();
})();
`;

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function downloadBlueprintHtml(
  data: Blueprint,
  _mediaOverrides: Record<string, Media>,
  fileName: string,
): void {
  // ── 1. Find live DOM elements ──
  const mainEl = document.getElementById("bp-export-main");
  const sidebarEl = document.querySelector<HTMLElement>('aside[aria-label="Journey map context"]');

  if (!mainEl) {
    // Blueprint not mounted — shouldn't happen in normal flow
    alert("Export failed: blueprint not found. Please try again.");
    return;
  }

  // ── 2. Capture CSS from the running page ──
  const css = captureCss();
  const safeTitle = escapeHtml(fileName || "Service Blueprint");

  // ── 3. Pre-build responsive MotivationMap SVGs ──
  const mmHtmls: Record<string, string> = {};
  for (const mm of data.motivationMaps ?? []) {
    const gradientId = `mmg_${mm.swimlaneId.replace(/[^a-z0-9]/gi, "_")}`;
    mmHtmls[mm.swimlaneId] = buildMmHtml(mm.points ?? [], gradientId);
  }

  // ── 4. Clone main content and patch MotivationMaps + collapse buttons ──
  const mainClone = mainEl.cloneNode(true) as HTMLElement;

  // Replace live MotivationMap containers with a data-mm-render placeholder.
  // The interaction script reads data-mm-b64 and renders at actual container width.
  mainClone.querySelectorAll<HTMLElement>("[data-mm-container]").forEach((el) => {
    const swimlaneId = el.getAttribute("data-mm-container");
    if (!swimlaneId || !mmHtmls[swimlaneId]) return;
    el.style.height = "200px";
    el.style.position = "relative";
    el.innerHTML = mmHtmls[swimlaneId];
  });

  // Wire up collapse buttons via inline onclick — more reliable than event delegation
  // because it doesn't depend on CSS.escape or attribute query edge cases.
  mainClone.querySelectorAll<HTMLElement>("[data-collapse-for]").forEach((btn) => {
    const slId = btn.getAttribute("data-collapse-for");
    if (!slId) return;
    btn.setAttribute("onclick", `window.__slToggle(this,'${slId.replace(/'/g, "\\'")}')`);
  });

  // ── 5. Clone sidebar ──
  const sidebarHtml = sidebarEl
    ? (sidebarEl.cloneNode(true) as HTMLElement).outerHTML
    : "";

  // ── 6. Build touchpoint hover-card data ──
  const tpData: Record<string, { hoverTitle?: string; hoverDescription?: string }> = {};
  for (const tp of data.touchpoints ?? []) {
    if (tp.hoverTitle || tp.hoverDescription) {
      tpData[tp.id] = { hoverTitle: tp.hoverTitle, hoverDescription: tp.hoverDescription };
    }
  }

  // ── 7. Assemble HTML ──
  const html =
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    `  <title>Service Blueprint \u2014 ${safeTitle}</title>\n` +
    "  <style>\n" + css + "\n  </style>\n" +
    "  <style>*{box-sizing:border-box}body{margin:0;padding:0;overflow:hidden;background:#f5f0eb}" +
    "[data-scroller]{cursor:grab}[data-scroller]:active{cursor:grabbing}</style>\n" +
    "</head>\n" +
    '<body>\n' +
    '  <div style="display:flex;height:100vh;overflow:hidden;background:#f5f0eb">\n' +
    (sidebarHtml ? "    " + sidebarHtml + "\n" : "") +
    '    <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">\n' +
    '      <header style="flex-shrink:0;display:flex;align-items:center;gap:16px;' +
    'border-bottom:1px solid #e5e7eb;background:#fff;padding:12px 24px;z-index:40">\n' +
    `        <span style="font-size:15px;font-weight:700;color:#0f1724">${safeTitle}</span>\n` +
    '        <span style="margin-left:auto;font-size:11px;color:#6b7280">Service Blueprint \u2014 Read only</span>\n' +
    '      </header>\n' +
    '      <div data-scroller style="flex:1;min-width:0;overflow:auto;cursor:grab">\n' +
    "        " + mainClone.innerHTML + "\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    '  <script>window.__BP_TP_DATA__ = ' + safeJsonForScript(tpData) + ';</script>\n' +
    "  <script>" + INTERACTION_SCRIPT + "</script>\n" +
    "</body>\n" +
    "</html>\n";

  // ── 8. Trigger download ──
  const safeName = (fileName || "blueprint")
    .replace(/\.html$/i, "")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim() || "blueprint";

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = safeName + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
