// Standalone HTML exporter for the swimlane-based blueprint.
//
// Strategy:
// 1. Capture every CSS rule from the running document (Vite injects Tailwind's
//    JIT output as <style> tags, all same-origin, so cssRules is accessible).
// 2. Embed BlueprintData + touchpoint media overrides as JSON globals.
// 3. Inline a vanilla-JS viewer that re-renders the blueprint from that data
//    and reproduces interactions (drag-to-pan, click touchpoint to view media,
//    Esc/background to close modal). Read-only — no upload, no media edit.
//
// Tailwind classes referenced inside VIEWER_SCRIPT as string literals are
// scanned by the `src/**/*.{ts,tsx}` content glob in tailwind.config.js, so
// they end up in the captured CSS automatically.

import type { BlueprintData } from "../types";
import type { Media } from "../components/MediaModal";

function captureCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet — cannot read. Skip.
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      out.push(rule.cssText);
    }
  }
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

// Embed JSON safely inside a <script> block by escaping closing tags and
// line separators that would break out of the script element.
function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function downloadFileName(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "").trim() || "service-blueprint";
  return `${base}.html`;
}

// Vanilla viewer script. Mirrors the React components but renders to a single
// #root div via innerHTML, with full re-render on every state change. Plain
// string concatenation (no template literals) so this can be embedded inside
// a TypeScript template literal without ${...} collisions.
const VIEWER_SCRIPT = `
(function () {
  var DATA = window.__BLUEPRINT_DATA__;
  var MEDIA = window.__BLUEPRINT_MEDIA__ || {};
  var TITLE = window.__BLUEPRINT_TITLE__ || "Service Blueprint";

  // Layout constants — must mirror src/lib/blueprintLayout.ts
  var LABEL_COL_W = 150;
  var MIN_STAGE_W = 180;
  var STAGE_GAP = 14;
  var SECTION_PADDING_X = 16;

  // ----- State -----
  var modalTpId = null;
  var collapsedSwimlanes = {}; // id -> true

  function chevronSvg(open) {
    var rot = open ? ' style="transform: rotate(90deg)"' : '';
    return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"' + rot + '><polyline points="3,2 7,5 3,8"/></svg>';
  }

  // ----- Lookups -----
  var stageById = {};
  for (var i = 0; i < DATA.journeyStages.length; i++) {
    stageById[DATA.journeyStages[i].id] = DATA.journeyStages[i];
  }
  var tpById = {};
  for (var j = 0; j < DATA.touchpoints.length; j++) {
    tpById[DATA.touchpoints[j].id] = DATA.touchpoints[j];
  }
  var mmBySwimlane = {};
  for (var k = 0; k < (DATA.motivationMaps || []).length; k++) {
    mmBySwimlane[DATA.motivationMaps[k].swimlaneId] = DATA.motivationMaps[k];
  }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function effectiveMedia(tp) {
    var ov = MEDIA[tp.id] || {};
    return {
      image: ov.image || tp.imageUrl || "",
      link: ov.link || tp.linkUrl || ""
    };
  }

  function gridStyleStr(stageCount) {
    return "display: grid; grid-template-columns: " + LABEL_COL_W + "px repeat(" + stageCount + ", minmax(" + MIN_STAGE_W + "px, 1fr)); gap: " + STAGE_GAP + "px;";
  }
  function minWidth(stageCount) {
    return LABEL_COL_W + stageCount * MIN_STAGE_W + stageCount * STAGE_GAP + 2 * SECTION_PADDING_X;
  }

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function catmullRomPath(pts) {
    if (pts.length === 0) return "";
    if (pts.length === 1) return "M " + pts[0][0] + " " + pts[0][1];
    var d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C " + c1x.toFixed(2) + " " + c1y.toFixed(2) + ", " + c2x.toFixed(2) + " " + c2y.toFixed(2) + ", " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
    }
    return d;
  }

  // ----- Render helpers -----

  function renderStageHeaderRow(stages) {
    var cells = ''
      + '<div class="flex items-center justify-end pr-2">'
      +   '<span class="text-[9px] font-medium uppercase tracking-[0.12em] text-neutral-gray-500">Journey Stage</span>'
      + '</div>';
    for (var i = 0; i < stages.length; i++) {
      var s = stages[i];
      cells += '<div class="flex items-center rounded bg-brand-navy-1000 px-2.5 py-1.5 text-white"'
        + (s.description ? ' title="' + esc(s.description) + '"' : '')
        + '><span class="text-[10px] font-bold leading-tight">' + esc(s.name) + '</span></div>';
    }
    return '<div style="' + gridStyleStr(stages.length) + '">' + cells + '</div>';
  }

  function renderTouchpointCard(tp) {
    var media = effectiveMedia(tp);
    var hasMedia = !!(media.image || media.link);
    var openAttrs = hasMedia
      ? ' data-action="open-tp" data-id="' + esc(tp.id) + '" style="cursor: pointer"'
      : '';
    var imgBlock = '';
    if (media.image) {
      imgBlock = '<img src="' + esc(media.image) + '" alt="' + esc(tp.name) + '" loading="lazy" class="mb-2 h-16 w-full rounded-md border border-neutral-gray-200 object-cover">';
    }
    // Eye icon that fades in on hover for cards with media — signals that
    // the card is clickable to view its image / link in a modal.
    var viewHint = hasMedia
      ? '<span class="pointer-events-none absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-brand-cyan-500 opacity-0 shadow ring-1 ring-neutral-gray-200 transition-opacity group-hover/tp:opacity-100">'
        +   '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
        +     '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
        +     '<circle cx="12" cy="12" r="3"/>'
        +   '</svg>'
        + '</span>'
      : '';
    return ''
      + '<div class="group/tp relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border border-neutral-gray-200 bg-white p-2.5 shadow-[0_2px_6px_0_rgba(15,23,36,0.05)] transition-shadow hover:shadow-[0_4px_12px_0_rgba(15,23,36,0.08)]"' + openAttrs + '>'
      +   viewHint
      +   imgBlock
      +   (tp.channelType ? '<span class="text-[9px] font-semibold uppercase tracking-wider text-brand-cyan-500">' + esc(tp.channelType) + '</span>' : '')
      +   '<div class="break-words text-[11px] font-bold leading-tight text-brand-navy-900">' + esc(tp.name) + '</div>'
      +   (tp.description ? '<p class="break-words text-[10px] leading-snug text-neutral-gray-600">' + esc(tp.description) + '</p>' : '')
      + '</div>';
  }

  function renderMomentsSwimlane(sl) {
    // Count and group this swimlane's touchpoints
    var tpsByStage = {};
    var tpCount = 0;
    for (var i = 0; i < DATA.touchpoints.length; i++) {
      var tp = DATA.touchpoints[i];
      if (tp.swimlaneId !== sl.id) continue;
      tpCount++;
      if (!tpsByStage[tp.stageId]) tpsByStage[tp.stageId] = [];
      tpsByStage[tp.stageId].push(tp);
    }
    var keys = Object.keys(tpsByStage);
    for (var ki = 0; ki < keys.length; ki++) {
      tpsByStage[keys[ki]].sort(function (a, b) { return a.order - b.order; });
    }

    // ----- Collapsed: thin clickable bar -----
    if (collapsedSwimlanes[sl.id]) {
      return ''
        + '<section class="rounded-2xl bg-white shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">'
        +   '<button type="button" data-action="toggle-swimlane" data-id="' + esc(sl.id) + '" '
        +     'title="Expand ' + esc(sl.name) + '" '
        +     'class="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-neutral-gray-700 hover:bg-neutral-gray-50">'
        +     chevronSvg(false)
        +     '<span class="text-[13px] font-bold leading-tight text-brand-navy-900">' + esc(sl.name) + '</span>'
        +     '<span class="ml-auto text-[10px] font-medium uppercase tracking-wider text-neutral-gray-500">'
        +       tpCount + ' touchpoint' + (tpCount === 1 ? '' : 's')
        +     '</span>'
        +   '</button>'
        + '</section>';
    }

    // ----- Expanded: full grid -----
    var titleCell = ''
      + '<div class="flex items-start justify-end pr-2 pt-0.5">'
      +   '<button type="button" data-action="toggle-swimlane" data-id="' + esc(sl.id) + '" '
      +     'title="Collapse ' + esc(sl.name) + '" '
      +     'class="flex items-start gap-1 rounded text-right hover:opacity-70">'
      +     '<span class="mt-0.5 text-neutral-gray-500">' + chevronSvg(true) + '</span>'
      +     '<span class="text-[13px] font-bold leading-tight text-brand-navy-900">' + esc(sl.name) + '</span>'
      +   '</button>'
      + '</div>';

    var contentCells = titleCell;
    for (var j = 0; j < DATA.journeyStages.length; j++) {
      var s = DATA.journeyStages[j];
      var cards = tpsByStage[s.id] || [];
      var col = '';
      if (cards.length === 0) {
        col = '<div class="flex h-full min-h-[60px] items-center justify-center rounded-lg border border-dashed border-neutral-gray-200 text-[10px] text-neutral-gray-300">—</div>';
      } else {
        for (var c = 0; c < cards.length; c++) col += renderTouchpointCard(cards[c]);
      }
      contentCells += '<div class="flex min-w-0 flex-col gap-2">' + col + '</div>';
    }

    return ''
      + '<section class="rounded-2xl bg-white p-4 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">'
      +   renderStageHeaderRow(DATA.journeyStages)
      +   '<div class="mt-2" style="' + gridStyleStr(DATA.journeyStages.length) + '">' + contentCells + '</div>'
      +   (sl.description ? '<p class="mt-2 max-w-3xl text-[11px] text-neutral-gray-500">' + esc(sl.description) + '</p>' : '')
      + '</section>';
  }

  // ----- Motivation map constants — must mirror src/components/MotivationMap.tsx
  var MM_VW = 1200, MM_VH = 200;
  var MM_MTOP = 20, MM_MRIGHT = 16, MM_MBOTTOM = 20, MM_MLEFT = 8;
  var MM_INNER_H = MM_VH - MM_MTOP - MM_MBOTTOM;
  var MM_LEVELS = [
    { label: 'High motivation / pressure', value: 1.0,  weight: 300 },
    { label: 'Strong intent / commitment', value: 0.67, weight: 300 },
    { label: 'Neutral',                    value: 0.33, weight: 400 },
    { label: 'Low motivation / passive',   value: 0.0,  weight: 300 }
  ];
  function gridlineTopPercent(v) {
    return ((MM_MTOP + (1 - v) * MM_INNER_H) / MM_VH) * 100;
  }

  function renderMotivationSvg(stages) {
    if (stages.length === 0) return '';
    var VW = MM_VW, VH = MM_VH;
    var Mtop = MM_MTOP, Mright = MM_MRIGHT, Mbottom = MM_MBOTTOM, Mleft = MM_MLEFT;
    var innerW = VW - Mleft - Mright;
    var innerH = VH - Mtop - Mbottom;
    var baseY = Mtop + innerH;

    // Flatten every score across every stage. Empty-stage = single neutral
    // placeholder so the curve stays continuous.
    var flat = [];
    for (var si = 0; si < stages.length; si++) {
      var arr = stages[si].motivationScores || [];
      if (arr.length === 0) flat.push(0.33);
      else for (var ai = 0; ai < arr.length; ai++) flat.push(clamp01(arr[ai]));
    }
    if (flat.length === 0) return '';

    var pts = [];
    for (var i = 0; i < flat.length; i++) {
      var x = flat.length === 1 ? Mleft + innerW / 2 : Mleft + (i / (flat.length - 1)) * innerW;
      var y = Mtop + (1 - flat[i]) * innerH;
      pts.push([x, y]);
    }
    var linePath = catmullRomPath(pts);
    var areaPath = pts.length >= 2
      ? linePath + ' L ' + pts[pts.length - 1][0].toFixed(2) + ' ' + baseY + ' L ' + pts[0][0].toFixed(2) + ' ' + baseY + ' Z'
      : '';
    var gid = 'mm-grad-' + Math.random().toString(36).slice(2, 8);

    var grid = '';
    for (var li = 0; li < MM_LEVELS.length; li++) {
      var lvl = MM_LEVELS[li];
      var ly = Mtop + (1 - lvl.value) * innerH;
      grid += '<line x1="' + Mleft + '" x2="' + (VW - Mright) + '" y1="' + ly + '" y2="' + ly + '" stroke="#c1c7d0" stroke-dasharray="4 4" stroke-width="1"/>';
    }

    var dots = '';
    for (var pi = 0; pi < pts.length; pi++) {
      dots += '<circle cx="' + pts[pi][0].toFixed(2) + '" cy="' + pts[pi][1].toFixed(2) + '" r="3" fill="#8073ff"/>';
    }

    return ''
      + '<div class="overflow-hidden rounded-xl border border-neutral-gray-200 bg-brand-blue-50">'
      +   '<svg viewBox="0 0 ' + VW + ' ' + VH + '" class="block h-auto w-full" role="img" aria-label="Motivation map curve">'
      +     '<defs>'
      +       '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      +         '<stop offset="0%" stop-color="#8073ff" stop-opacity="0.45"/>'
      +         '<stop offset="100%" stop-color="#8073ff" stop-opacity="0.04"/>'
      +       '</linearGradient>'
      +       '<filter id="' + gid + '-shadow" x="-20%" y="-50%" width="140%" height="200%">'
      +         '<feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>'
      +         '<feOffset dx="0" dy="2" result="offsetblur"/>'
      +         '<feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>'
      +         '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>'
      +       '</filter>'
      +     '</defs>'
      +     grid
      +     (areaPath ? '<path d="' + areaPath + '" fill="url(#' + gid + ')"/>' : '')
      +     '<path d="' + linePath + '" fill="none" stroke="#8073ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + gid + '-shadow)"/>'
      +     dots
      +   '</svg>'
      + '</div>';
  }

  function metaTile(label, value) {
    return ''
      + '<div class="rounded-lg border border-neutral-gray-200 bg-neutral-gray-50 p-2.5">'
      +   '<div class="text-[9px] font-semibold uppercase tracking-wider text-brand-cyan-500">' + esc(label) + '</div>'
      +   '<p class="mt-0.5 text-[11px] leading-snug text-neutral-gray-700">' + esc(value) + '</p>'
      + '</div>';
  }

  function renderMotivationMapSwimlane(sl) {
    var meta = mmBySwimlane[sl.id];
    var title = (meta && meta.title) || sl.name;
    var svgHtml = renderMotivationSvg(DATA.journeyStages);

    // Y-axis labels in HTML, positioned absolutely at the gridline percentages.
    var labels = '';
    for (var li = 0; li < MM_LEVELS.length; li++) {
      var lvl = MM_LEVELS[li];
      var top = gridlineTopPercent(lvl.value).toFixed(2);
      labels += '<div class="pointer-events-none absolute right-2 -translate-y-1/2 text-right text-[10px] font-medium leading-tight text-brand-navy-900" '
        + 'style="top: ' + top + '%; max-width: calc(100% - 8px);">'
        + esc(lvl.label)
        + '</div>';
    }

    var chartRow = ''
      + '<div class="relative pr-2">'
      +   '<h3 class="text-right text-[13px] font-bold leading-tight text-brand-navy-900">' + esc(title) + '</h3>'
      +   labels
      + '</div>'
      + '<div style="grid-column: span ' + DATA.journeyStages.length + '" class="min-w-0">'
      +   svgHtml
      + '</div>';

    var metaRow = '';
    if (meta && (meta.drivers || meta.triggers || meta.insights)) {
      var tiles = '';
      if (meta.drivers) tiles += metaTile('Key drivers', meta.drivers);
      if (meta.triggers) tiles += metaTile('Emotional triggers', meta.triggers);
      if (meta.insights) tiles += metaTile('Key insights', meta.insights);
      metaRow = ''
        + '<div class="mt-2" style="' + gridStyleStr(DATA.journeyStages.length) + '">'
        +   '<div></div>'
        +   '<div style="grid-column: span ' + DATA.journeyStages.length + '" class="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">'
        +     tiles
        +   '</div>'
        + '</div>';
    }

    return ''
      + '<section class="rounded-2xl bg-white p-4 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">'
      +   renderStageHeaderRow(DATA.journeyStages)
      +   '<div class="mt-2" style="' + gridStyleStr(DATA.journeyStages.length) + '">' + chartRow + '</div>'
      +   metaRow
      + '</section>';
  }

  function renderInsightCard(ins) {
    return ''
      + '<div class="flex flex-col gap-1 rounded-lg border border-neutral-gray-200 bg-neutral-gray-50 p-2.5">'
      +   (ins.dataPoint ? '<div class="text-lg font-bold leading-none text-brand-cyan-500">' + esc(ins.dataPoint) + '</div>' : '')
      +   '<div class="text-[11px] font-bold leading-tight text-brand-navy-900">' + esc(ins.title) + '</div>'
      +   (ins.text ? '<p class="text-[10px] leading-snug text-neutral-gray-700">' + esc(ins.text) + '</p>' : '')
      +   (ins.quote ? '<p class="text-[9px] italic leading-snug text-neutral-gray-500">"' + esc(ins.quote) + '"</p>' : '')
      +   (ins.dataSource ? '<p class="text-[9px] text-neutral-gray-500">Source: ' + esc(ins.dataSource) + '</p>' : '')
      + '</div>';
  }

  function renderInsightsSection() {
    if (!DATA.insights || DATA.insights.length === 0) return '';
    var byStage = {};
    for (var i = 0; i < DATA.insights.length; i++) {
      var ins = DATA.insights[i];
      if (!byStage[ins.stageId]) byStage[ins.stageId] = [];
      byStage[ins.stageId].push(ins);
    }
    var cells = ''
      + '<div class="flex items-start justify-end pr-2 pt-0.5">'
      +   '<h3 class="text-right text-[13px] font-bold leading-tight text-brand-navy-900">Insights</h3>'
      + '</div>';
    for (var j = 0; j < DATA.journeyStages.length; j++) {
      var s = DATA.journeyStages[j];
      var items = byStage[s.id] || [];
      var col = '';
      if (items.length === 0) {
        col = '<div class="flex h-full min-h-[60px] items-center justify-center rounded-lg border border-dashed border-neutral-gray-200 text-[10px] text-neutral-gray-300">—</div>';
      } else {
        for (var k = 0; k < items.length; k++) col += renderInsightCard(items[k]);
      }
      cells += '<div class="flex min-w-0 flex-col gap-2">' + col + '</div>';
    }
    return ''
      + '<section class="rounded-2xl bg-white p-4 shadow-[0_2px_10px_0_rgba(15,23,36,0.05)]">'
      +   '<div style="' + gridStyleStr(DATA.journeyStages.length) + '">' + cells + '</div>'
      + '</section>';
  }

  // Sidebar — mirrors src/components/Sidebar.tsx, with copy slightly adjusted
  // for the read-only export context (no media editing affordance).
  function renderSidebar() {
    function section(title, body) {
      return ''
        + '<div class="flex flex-col gap-1.5">'
        +   '<h3 class="text-[11px] font-bold uppercase tracking-wider text-brand-navy-900">' + title + '</h3>'
        +   '<div class="text-[11px] leading-relaxed text-brand-navy-900/80">' + body + '</div>'
        + '</div>';
    }
    var keySwatch = function (cls, label) {
      return '<li class="flex items-center gap-2"><span class="h-2.5 w-2.5 shrink-0 rounded-sm ' + cls + '"></span>' + label + '</li>';
    };
    var keyList = ''
      + '<ul class="flex flex-col gap-1.5 text-[11px] text-brand-navy-900/80">'
      +   keySwatch('bg-brand-navy-1000', 'Journey stage')
      +   keySwatch('border border-neutral-gray-300 bg-white', 'Touchpoint card')
      +   keySwatch('bg-brand-purple-500', 'Motivation curve')
      +   keySwatch('bg-brand-cyan-500', 'Insight')
      + '</ul>';

    return ''
      + '<aside role="complementary" aria-label="Journey map context" '
      +   'class="sticky top-0 z-10 flex h-screen w-[250px] shrink-0 flex-col self-start overflow-y-auto border-r border-brand-navy-900/10 bg-brand-blue-100 px-5 pb-6 pt-8">'
      +   '<div class="mb-5">'
      +     '<div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-navy-900/60">appfolio</div>'
      +     '<h2 class="mt-1 text-xl font-bold leading-tight text-brand-navy-900">Future Journey Map</h2>'
      +   '</div>'
      +   '<p class="mb-5 text-xs leading-relaxed text-brand-navy-900/80">'
      +     'The modern customer journey is composed of multiple, overlapping touchpoints and interactions that are not as clearly defined as traditional marketing funnels.'
      +   '</p>'
      +   '<div class="flex flex-col gap-4">'
      +     section('How to use', 'Drag horizontally anywhere on the blueprint to pan across the journey. Click a swimlane title to collapse or expand it. Click any touchpoint with attached media to view it.')
      +     section('Subject to change', 'This map is a living artifact. As research and design iterate, the stages, swimlanes, and touchpoints will evolve.')
      +     '<div class="flex flex-col gap-1.5">'
      +       '<h3 class="text-[11px] font-bold uppercase tracking-wider text-brand-navy-900">Key</h3>'
      +       keyList
      +     '</div>'
      +   '</div>'
      + '</aside>';
  }

  function renderModal() {
    if (!modalTpId) return '';
    var tp = tpById[modalTpId];
    if (!tp) return '';
    var stage = stageById[tp.stageId];
    var stageName = stage ? stage.name : '';
    var media = effectiveMedia(tp);
    var imgPart = media.image
      ? '<img src="' + esc(media.image) + '" alt="' + esc(tp.name) + '" class="h-40 w-full rounded-lg border border-neutral-gray-200 object-cover">'
      : '<div class="grid h-40 place-items-center rounded-lg border-2 border-dashed border-neutral-gray-300 bg-neutral-gray-50 text-sm text-neutral-gray-400">No image</div>';
    var linkPart = media.link
      ? '<a href="' + esc(media.link) + '" target="_blank" rel="noopener noreferrer" class="block truncate rounded-md border border-neutral-gray-200 bg-neutral-gray-50 px-3 py-2 text-sm text-neutral-gray-700 hover:bg-neutral-gray-100">' + esc(media.link) + '</a>'
      : '';
    return ''
      + '<div data-action="close-modal-bg" role="dialog" aria-modal="true" class="fixed inset-0 z-50 grid place-items-center bg-brand-navy-900/50 p-4">'
      +   '<div class="w-full max-w-md rounded-xl bg-white shadow-xl">'
      +     '<div class="flex items-center justify-between rounded-t-xl border-b-4 px-5 py-4" style="border-color: #00b0ca">'
      +       '<div>'
      +         '<div class="text-[10px] font-semibold uppercase tracking-wider" style="color: #00b0ca">Touchpoint · ' + esc(stageName) + '</div>'
      +         '<h3 class="text-lg font-bold text-brand-navy-900">' + esc(tp.name) + '</h3>'
      +       '</div>'
      +       '<button type="button" data-action="close-modal" aria-label="Close" class="grid h-8 w-8 place-items-center rounded-md text-neutral-gray-500 hover:bg-neutral-gray-100">'
      +         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      +       '</button>'
      +     '</div>'
      +     '<div class="flex flex-col gap-4 p-5">'
      +       imgPart
      +       linkPart
      +       (tp.description ? '<p class="text-sm text-neutral-gray-700">' + esc(tp.description) + '</p>' : '')
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  function render() {
    var swimlaneHtml = '';
    for (var i = 0; i < DATA.swimlanes.length; i++) {
      var sl = DATA.swimlanes[i];
      swimlaneHtml += sl.type === 'motivation_map'
        ? renderMotivationMapSwimlane(sl)
        : renderMomentsSwimlane(sl);
    }

    var html = ''
      + '<div class="flex min-h-screen bg-neutral-sand-50">'
      +   renderSidebar()
      +   '<main class="flex min-w-0 flex-1 flex-col">'
      +     '<div class="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">'
      +       '<div class="overflow-x-auto rounded-2xl bg-neutral-sand-50 p-2 sm:p-3">'
      +         '<div style="min-width: ' + minWidth(DATA.journeyStages.length) + 'px" class="flex flex-col gap-2">'
      +           swimlaneHtml
      +           renderInsightsSection()
      +         '</div>'
      +       '</div>'
      +     '</div>'
      +   '</main>'
      + '</div>'
      + renderModal();

    document.getElementById('root').innerHTML = html;
  }

  // ----- Click delegation -----
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    if (action === 'open-tp') {
      modalTpId = id;
      render();
    } else if (action === 'close-modal') {
      modalTpId = null;
      render();
    } else if (action === 'close-modal-bg') {
      if (e.target === el) {
        modalTpId = null;
        render();
      }
    } else if (action === 'toggle-swimlane') {
      if (collapsedSwimlanes[id]) delete collapsedSwimlanes[id];
      else collapsedSwimlanes[id] = true;
      render();
    } else if (action === 'collapse-all') {
      for (var i = 0; i < DATA.swimlanes.length; i++) {
        if (DATA.swimlanes[i].type === 'moments') {
          collapsedSwimlanes[DATA.swimlanes[i].id] = true;
        }
      }
      render();
    } else if (action === 'expand-all') {
      collapsedSwimlanes = {};
      render();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalTpId) {
      modalTpId = null;
      render();
    }
  });

  // ----- Click-and-drag panning (horizontal on the container, vertical on window) -----
  (function () {
    var dragEl = null;
    var startX = 0;
    var startY = 0;
    var startScroll = 0;
    var startWinY = 0;
    var moved = 0;
    var capturedPointerId = null;

    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var t = e.target;
      if (!t || t.closest('button, a, input, select, textarea, label, [data-action]')) return;
      var scroller = t.closest('.overflow-x-auto');
      if (!scroller) return;
      dragEl = scroller;
      startX = e.clientX;
      startY = e.clientY;
      startScroll = scroller.scrollLeft;
      startWinY = window.scrollY;
      moved = 0;
      capturedPointerId = e.pointerId;
      scroller.style.cursor = 'grabbing';
      scroller.style.userSelect = 'none';
      try { scroller.setPointerCapture(e.pointerId); } catch (err) {}
    });

    document.addEventListener('pointermove', function (e) {
      if (!dragEl) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > moved) moved = dist;
      dragEl.scrollLeft = startScroll - dx;
      window.scrollTo(window.scrollX, startWinY - dy);
    });

    function endDrag(e) {
      if (!dragEl) return;
      var was = dragEl;
      dragEl.style.cursor = 'grab';
      dragEl.style.userSelect = '';
      if (capturedPointerId !== null) {
        try { dragEl.releasePointerCapture(capturedPointerId); } catch (err) {}
        capturedPointerId = null;
      }
      dragEl = null;
      if (moved > 5) {
        var suppress = function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          was.removeEventListener('click', suppress, true);
        };
        was.addEventListener('click', suppress, true);
        setTimeout(function () { was.removeEventListener('click', suppress, true); }, 0);
      }
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
  })();

  render();
})();
`;

export function downloadBlueprintHtml(
  data: BlueprintData,
  mediaOverrides: Record<string, Media>,
  fileName: string,
): void {
  const css = captureCss();
  const title = escapeHtml(fileName || "Service Blueprint");

  const html =
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    "  <title>Service Blueprint — " + title + "</title>\n" +
    "  <style>\n" + css + "\n  </style>\n" +
    "  <style>.overflow-x-auto { cursor: grab; }</style>\n" +
    "</head>\n" +
    '<body class="min-h-screen bg-neutral-sand-50">\n' +
    '  <div id="root"></div>\n' +
    "  <script>\n" +
    "    window.__BLUEPRINT_DATA__ = " + safeJsonForScript(data) + ";\n" +
    "    window.__BLUEPRINT_MEDIA__ = " + safeJsonForScript(mediaOverrides) + ";\n" +
    "    window.__BLUEPRINT_TITLE__ = " + safeJsonForScript(fileName || "Service Blueprint") + ";\n" +
    "  </script>\n" +
    "  <script>" + VIEWER_SCRIPT + "</script>\n" +
    "</body>\n" +
    "</html>\n";

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
