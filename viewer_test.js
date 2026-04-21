
(function () {
  var DATA    = window.__BLUEPRINT_DATA__;
  var MEDIA   = window.__BLUEPRINT_MEDIA__   || {};
  var TITLE   = window.__BLUEPRINT_TITLE__   || "Service Blueprint";
  var MM_SVGS = window.__BLUEPRINT_MM_SVGS__ || {};

  // Layout constants — mirror src/lib/blueprintLayout.ts + BlueprintCanvas
  var LABEL_COL_W   = 150;
  var MIN_STAGE_W   = 180;
  var STAGE_GAP     = 14;
  var CARD_W        = 176;
  var CARD_GAP      = 8;

  // ── State ──
  var modalTpId        = null;
  var collapsedLanes   = {};

  // ── Lookups ──
  var stageById      = {};
  var phaseById      = {};
  var stageGroupById = {};
  var mmBySwimlane   = {};
  var tpById         = {};

  var i;
  for (i = 0; i < DATA.sections.length; i++)          {}
  for (i = 0; i < DATA.journeyStages.length; i++)     { stageById[DATA.journeyStages[i].id] = DATA.journeyStages[i]; }
  for (i = 0; i < (DATA.phases||[]).length; i++)       { phaseById[DATA.phases[i].id] = DATA.phases[i]; }
  for (i = 0; i < (DATA.stageGroups||[]).length; i++) { stageGroupById[DATA.stageGroups[i].id] = DATA.stageGroups[i]; }
  for (i = 0; i < (DATA.motivationMaps||[]).length; i++){ mmBySwimlane[DATA.motivationMaps[i].swimlaneId] = DATA.motivationMaps[i]; }
  for (i = 0; i < DATA.touchpoints.length; i++)        { tpById[DATA.touchpoints[i].id] = DATA.touchpoints[i]; }

  // ── Utilities ──
  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  // Mirror of CalloutBadge.tsx renderMarkdown — handles bullets, bold, italic, newlines.
  function renderMarkdown(text) {
    if (!text) return "";
    var lines = String(text).split("\\n");
    var html = "";
    var inList = false;
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var isBullet = line.slice(0, 2) === "- ";
      var content = isBullet ? line.slice(2) : line;

      // Inline bold / italic
      var formatted = content
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");

      if (isBullet) {
        if (!inList) { html += '<ul style="margin:2px 0 2px 12px;padding:0;list-style:disc">'; inList = true; }
        html += '<li style="margin:1px 0">' + formatted + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line === "") {
          html += '<br>';
        } else {
          html += '<p style="margin:1px 0;line-height:1.4">' + formatted + '</p>';
        }
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  function sortBy(arr, key) {
    return arr.slice().sort(function (a, b) { return (a[key] || 0) - (b[key] || 0); });
  }

  function stagesForSection(sectionId) {
    return sortBy(DATA.journeyStages.filter(function (s) { return s.sectionId === sectionId; }), "order");
  }
  function swimlanesForSection(sectionId) {
    return sortBy(DATA.swimlanes.filter(function (sl) { return sl.sectionId === sectionId; }), "order");
  }
  function phasesForSection(sectionId) {
    var stageIds = stagesForSection(sectionId).map(function (s) { return s.id; });
    return sortBy((DATA.phases || []).filter(function (p) { return stageIds.indexOf(p.stageId) >= 0; }), "order");
  }

  function phaseGid(phase) { return phase.groupId || phase.id; }

  function computePhaseMinWidths(sectionId) {
    var widths = {};
    var sectionPhases    = phasesForSection(sectionId);
    var sectionSwimlanes = swimlanesForSection(sectionId);
    for (var pi = 0; pi < sectionPhases.length; pi++) {
      var phase = sectionPhases[pi];
      var gid   = phaseGid(phase);
      var groupSlIds = sectionSwimlanes
        .filter(function (sl) { return sl.phaseId === gid; })
        .map(function (sl) { return sl.id; });
      var maxCount = 1;
      for (var si = 0; si < groupSlIds.length; si++) {
        var cnt = DATA.touchpoints.filter(function (tp) {
          return tp.phaseId === phase.id && tp.swimlaneId === groupSlIds[si];
        }).length;
        if (cnt > maxCount) maxCount = cnt;
      }
      widths[phase.id] = maxCount * CARD_W + (maxCount - 1) * CARD_GAP;
    }
    return widths;
  }

  // ── Grid style helpers ──
  function gridStyle(stageCount) {
    return "display:grid;grid-template-columns:" + LABEL_COL_W + "px repeat(" + stageCount + ",minmax(" + MIN_STAGE_W + "px,max-content));gap:" + STAGE_GAP + "px;";
  }

  function chevronSvg(open) {
    var rot = open ? ' style="transform:rotate(90deg)"' : "";
    return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"' + rot + '><polyline points="3,2 7,5 3,8"/></svg>';
  }

  // ── Callout helpers ──
  var CALLOUT_STYLES = {
    pain_point:  { bg: "bg-semantic-error/10",   border: "border-semantic-error/30",   icon: "text-semantic-error",   text: "text-semantic-error",   sym: "\\u26a0", label: "Pain Point"  },
    opportunity: { bg: "bg-semantic-success/10",  border: "border-semantic-success/30", icon: "text-semantic-success", text: "text-semantic-success", sym: "\\u2728", label: "Opportunity" },
    highlight:   { bg: "bg-semantic-warning/10",  border: "border-semantic-warning/30", icon: "text-semantic-warning", text: "text-semantic-warning", sym: "\\u2605", label: "Highlight"   },
    question:    { bg: "bg-brand-purple-500/10",  border: "border-brand-purple-500/30", icon: "text-brand-purple-500", text: "text-brand-purple-500", sym: "?",       label: "Question"    },
    note:        { bg: "bg-neutral-gray-100",     border: "border-neutral-gray-300",    icon: "text-neutral-gray-500", text: "text-neutral-gray-600", sym: "\\u2022", label: "Note"        }
  };

  function renderCalloutBadge(c) {
    var st = CALLOUT_STYLES[c.type] || CALLOUT_STYLES.note;
    return ''
      + '<div style="display:flex;width:100%;align-items:flex-start;gap:6px;border-radius:6px;border:1px solid;padding:6px;box-sizing:border-box" class="' + st.bg + ' ' + st.border + '">'
      +   '<span style="flex-shrink:0;font-size:11px;line-height:1;margin-top:1px" class="' + st.icon + '">' + st.sym + '</span>'
      +   '<div style="min-width:0;flex:1;word-break:break-word">'
      +     (c.label ? '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px" class="' + st.text + '">' + esc(c.label) + '</div>' : '')
      +     (c.title ? '<div style="font-size:12px;font-weight:500;line-height:1.3;margin-bottom:2px;color:#0f1724">' + esc(c.title) + '</div>' : '')
      +     (c.description ? '<div style="font-size:11px;color:#4b5563">' + renderMarkdown(c.description) + '</div>' : '')
      +   '</div>'
      + '</div>';
  }

  function calloutsForPhase(swimlaneId, stageId, phaseId) {
    // Single-phase callouts only (phaseIds.length === 1)
    return (DATA.callouts || []).filter(function (c) {
      return c.swimlaneId === swimlaneId && c.stageId === stageId
        && c.phaseIds && c.phaseIds.length === 1 && c.phaseIds[0] === phaseId;
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function multiPhaseCallouts(swimlaneId, stageId) {
    return (DATA.callouts || []).filter(function (c) {
      return c.swimlaneId === swimlaneId && c.stageId === stageId
        && c.phaseIds && c.phaseIds.length > 1;
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function spanningCallouts(swimlaneId, stageId) {
    return (DATA.callouts || []).filter(function (c) {
      return c.swimlaneId === swimlaneId && c.stageId === stageId
        && (!c.phaseIds || c.phaseIds.length === 0);
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function orphanCallouts(swimlaneId, stageId) {
    // For orphan (stage-level) swimlanes — no phase filtering
    return (DATA.callouts || []).filter(function (c) {
      return c.swimlaneId === swimlaneId && c.stageId === stageId;
    }).sort(function (a, b) { return a.order - b.order; });
  }

  // ── Touchpoint card ──
  function effectiveMedia(tp) {
    var ov = MEDIA[tp.id] || {};
    return { image: ov.image || tp.imageUrl || "", link: ov.link || tp.linkUrl || "" };
  }

  function renderTouchpointCard(tp) {
    var media    = effectiveMedia(tp);
    var hasMedia = !!(media.image || media.link || tp.customNotes || tp.hoverTitle);
    var openAttrs = hasMedia
      ? ' data-action="open-tp" data-id="' + esc(tp.id) + '" style="cursor:pointer"' : "";
    var imgBlock = media.image
      ? '<img src="' + esc(media.image) + '" alt="' + esc(tp.name) + '" loading="lazy" class="mb-2 h-16 w-full rounded-md border border-neutral-gray-200 object-cover">'
      : "";
    var viewHint = hasMedia
      ? '<span class="pointer-events-none absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-brand-cyan-500 opacity-0 shadow ring-1 ring-neutral-gray-200 transition-opacity group-hover/tp:opacity-100">'
        + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        + '</svg></span>'
      : "";
    return ''
      + '<div class="group/tp relative flex min-w-0 w-[176px] shrink-0 flex-col gap-1 overflow-hidden rounded-lg border border-neutral-gray-200 bg-white p-2.5 shadow-[0_2px_6px_0_rgba(15,23,36,0.05)] transition-shadow hover:shadow-[0_4px_12px_0_rgba(15,23,36,0.08)]"' + openAttrs + '>'
      +   viewHint + imgBlock
      +   (tp.channelType ? '<span class="text-[9px] font-semibold uppercase tracking-wider text-brand-cyan-500">' + esc(tp.channelType) + '</span>' : "")
      +   '<div class="break-words text-[11px] font-bold leading-tight text-brand-navy-900">' + esc(tp.name) + '</div>'
      +   (tp.description ? '<p class="break-words text-[10px] leading-snug text-neutral-gray-600">' + esc(tp.description) + '</p>' : "")
      + '</div>';
  }

  // ── SwimlaneCell ──
  function renderSwimlaneCell(tps, callouts) {
    if (tps.length === 0 && callouts.length === 0) {
      return '<div class="min-h-[60px]"></div>';
    }
    var calloutW = tps.length > 0 ? (tps.length * CARD_W + (tps.length - 1) * CARD_GAP) : undefined;
    var html = '<div class="flex flex-col gap-2 overflow-visible">';
    if (tps.length > 0) {
      html += '<div class="flex items-stretch gap-2 overflow-visible">';
      for (var i = 0; i < tps.length; i++) html += renderTouchpointCard(tps[i]);
      html += '</div>';
    }
    if (callouts.length > 0) {
      var wStyle = calloutW !== undefined ? ' style="width:' + calloutW + 'px"' : ' class="w-full"';
      html += '<div' + wStyle + ' class="flex flex-col gap-1">';
      for (var j = 0; j < callouts.length; j++) html += renderCalloutBadge(callouts[j]);
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── Stage group header row ──
  function renderStageGroupRow(stages, stageGroups, stageGroupLabel) {
    // Build contiguous spans
    var groupMap = {};
    for (var gi = 0; gi < stageGroups.length; gi++) groupMap[stageGroups[gi].id] = stageGroups[gi];
    var spans = [];
    var cur = null;
    for (var si = 0; si < stages.length; si++) {
      var s  = stages[si];
      var grp = s.stageGroupId ? (groupMap[s.stageGroupId] || null) : null;
      var gid = grp ? grp.id : "__none__";
      if (cur && cur.gid === gid) {
        cur.count++;
      } else {
        if (cur) spans.push(cur);
        cur = { gid: gid, group: grp, count: 1 };
      }
    }
    if (cur) spans.push(cur);

    var html = '<div style="display:contents">';
    html += '<div style="grid-column:1" class="flex items-center pr-2">'
      + '<span class="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">' + esc(stageGroupLabel || "Group") + '</span>'
      + '</div>';
    for (var spi = 0; spi < spans.length; spi++) {
      var span = spans[spi];
      if (span.group) {
        html += '<div style="grid-column:span ' + span.count + '" class="flex items-center justify-center rounded-md bg-neutral-gray-200 px-4 py-3">'
          + '<span class="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight text-brand-navy-1000">' + esc(span.group.name) + '</span>'
          + '</div>';
      } else {
        html += '<div style="grid-column:span ' + span.count + '"></div>';
      }
    }
    html += '</div>';
    return html;
  }

  // ── Stage header row ──
  function renderStageHeaderRow(stages, stageLabel) {
    var html = '<div style="display:contents">';
    html += '<div class="flex items-center pr-2">'
      + '<span class="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">' + esc(stageLabel || "Stage") + '</span>'
      + '</div>';
    for (var i = 0; i < stages.length; i++) {
      var s = stages[i];
      var bg  = s.bgColor   || "#E5E7EB";
      var col = s.textColor || "#0F1724";
      html += '<div class="group flex items-center justify-center rounded-md px-4 py-3"'
        + ' style="background-color:' + esc(bg) + ';color:' + esc(col) + '"'
        + (s.description ? ' title="' + esc(s.description) + '"' : "") + '>'
        + '<span class="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight">' + esc(s.name) + '</span>'
        + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── Phase group header row (label + pills per stage) ──
  function renderPhaseGroupHeader(groupLabel, groupPhases, stages, phaseMinWidths) {
    var html = '<div style="display:contents">';
    // Col 1: label
    html += '<div class="flex items-center gap-1 pr-2 pt-3">'
      + '<span class="whitespace-nowrap text-[14px] font-bold capitalize text-brand-navy-1000">' + esc(groupLabel || "Phase") + '</span>'
      + '</div>';
    // One cell per stage
    for (var si = 0; si < stages.length; si++) {
      var stage = stages[si];
      var stagePhases = groupPhases.filter(function (p) { return p.stageId === stage.id; });
      html += '<div class="flex items-stretch gap-1.5 pt-3">';
      for (var pi = 0; pi < stagePhases.length; pi++) {
        var phase = stagePhases[pi];
        var bg  = phase.bgColor   || "#0F1724";
        var col = phase.textColor || "#FFFFFF";
        var w   = phaseMinWidths[phase.id] || CARD_W;
        html += '<div class="flex items-center justify-center rounded-md px-4 py-3"'
          + ' style="flex:0 0 auto;min-width:' + w + 'px;background-color:' + esc(bg) + ';color:' + esc(col) + '"'
          + (phase.description ? ' title="' + esc(phase.description) + '"' : "") + '>'
          + '<span class="flex-1 whitespace-nowrap text-center text-[14px] font-bold leading-tight">' + esc(phase.name) + '</span>'
          + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── Orphan swimlane row ──
  function renderOrphanSwimlaneRow(sl, stages) {
    if (collapsedLanes[sl.id]) {
      var tpCount = DATA.touchpoints.filter(function (tp) { return tp.swimlaneId === sl.id; }).length;
      return ''
        + '<div style="display:contents">'
        + '<div style="grid-column:1 / -1" class="mt-1">'
        + '<button type="button" data-action="toggle-lane" data-id="' + esc(sl.id) + '"'
        + ' class="flex w-full items-center gap-2 rounded-xl border border-neutral-gray-100 px-4 py-2 text-left text-neutral-gray-700 hover:bg-neutral-gray-50">'
        + chevronSvg(false)
        + '<span class="text-[14px] font-bold leading-tight text-brand-navy-1000">' + esc(sl.name) + '</span>'
        + '<span class="ml-auto text-[10px] font-medium uppercase tracking-wider text-neutral-gray-500">' + tpCount + ' touchpoint' + (tpCount === 1 ? "" : "s") + '</span>'
        + '</button></div></div>';
    }

    var html = '<div style="display:contents">';
    // Label
    html += '<div class="group flex items-start gap-1 pr-2 pt-3">'
      + '<button type="button" data-action="toggle-lane" data-id="' + esc(sl.id) + '"'
      + ' class="flex flex-1 items-start gap-1 rounded text-left hover:opacity-70">'
      + '<span class="mt-0.5 text-neutral-gray-500">' + chevronSvg(true) + '</span>'
      + '<span class="text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">' + esc(sl.name) + '</span>'
      + '</button></div>';
    // Stage cells
    for (var si = 0; si < stages.length; si++) {
      var stage = stages[si];
      var tps = DATA.touchpoints.filter(function (tp) {
        return tp.swimlaneId === sl.id && tp.stageId === stage.id && !tp.phaseId;
      }).sort(function (a, b) { return a.order - b.order; });
      var calls = orphanCallouts(sl.id, stage.id);
      html += '<div class="flex flex-col gap-1 overflow-visible pt-2">' + renderSwimlaneCell(tps, calls) + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── Phase-group swimlane row ──
  function renderPhaseGroupSwimlaneRow(sl, stages, groupPhases, phaseMinWidths) {
    if (collapsedLanes[sl.id]) {
      var tpCount = DATA.touchpoints.filter(function (tp) { return tp.swimlaneId === sl.id; }).length;
      return ''
        + '<div style="display:contents">'
        + '<div style="grid-column:1 / -1" class="mt-1">'
        + '<button type="button" data-action="toggle-lane" data-id="' + esc(sl.id) + '"'
        + ' class="flex w-full items-center gap-2 rounded-xl border border-neutral-gray-100 px-4 py-2 text-left text-neutral-gray-700 hover:bg-neutral-gray-50">'
        + chevronSvg(false)
        + '<span class="text-[14px] font-bold leading-tight text-brand-navy-1000">' + esc(sl.name) + '</span>'
        + '<span class="ml-auto text-[10px] font-medium uppercase tracking-wider text-neutral-gray-500">' + tpCount + ' touchpoint' + (tpCount === 1 ? "" : "s") + '</span>'
        + '</button></div></div>';
    }

    var html = '<div style="display:contents">';
    // Label
    html += '<div class="group flex items-start gap-1 pr-2 pt-3">'
      + '<button type="button" data-action="toggle-lane" data-id="' + esc(sl.id) + '"'
      + ' class="flex flex-1 items-start gap-1 rounded text-left hover:opacity-70">'
      + '<span class="mt-0.5 text-neutral-gray-500">' + chevronSvg(true) + '</span>'
      + '<span class="text-[14px] font-bold capitalize leading-tight text-brand-navy-1000">' + esc(sl.name) + '</span>'
      + '</button></div>';

    // One cell per stage
    for (var si = 0; si < stages.length; si++) {
      var stage = stages[si];
      var stagePhases = groupPhases.filter(function (p) { return p.stageId === stage.id; });

      if (stagePhases.length === 0) {
        html += '<div class="pt-2"></div>';
        continue;
      }

      var spanning  = spanningCallouts(sl.id, stage.id);
      var multiPh   = multiPhaseCallouts(sl.id, stage.id);

      html += '<div class="flex min-w-0 flex-col gap-1 pt-2">';

      // Sub-cells row
      html += '<div class="flex gap-1.5">';
      for (var pi = 0; pi < stagePhases.length; pi++) {
        var phase = stagePhases[pi];
        var w     = phaseMinWidths[phase.id] || CARD_W;
        var tps   = DATA.touchpoints.filter(function (tp) {
          return tp.swimlaneId === sl.id && tp.phaseId === phase.id;
        }).sort(function (a, b) { return a.order - b.order; });
        var phaseCalls = calloutsForPhase(sl.id, stage.id, phase.id);
        html += '<div style="flex:0 0 auto;min-width:' + w + 'px" class="flex flex-col gap-1 overflow-visible">'
          + renderSwimlaneCell(tps, phaseCalls)
          + '</div>';
      }
      html += '</div>'; // sub-cells row

      // Multi-phase callouts (positioned spanning strip)
      if (multiPh.length > 0) {
        html += '<div class="relative flex flex-col gap-1">';
        for (var mi = 0; mi < multiPh.length; mi++) {
          var mc = multiPh[mi];
          var matched = mc.phaseIds || [];
          var firstIdx = -1, lastIdx = -1;
          for (var pi2 = 0; pi2 < stagePhases.length; pi2++) {
            if (matched.indexOf(stagePhases[pi2].id) >= 0) {
              if (firstIdx === -1) firstIdx = pi2;
              lastIdx = pi2;
            }
          }
          if (firstIdx === -1) continue;
          var offsetLeft = 0;
          for (var ki = 0; ki < firstIdx; ki++) {
            offsetLeft += (phaseMinWidths[stagePhases[ki].id] || CARD_W) + CARD_GAP;
          }
          var spanWidth = 0;
          for (var ki2 = firstIdx; ki2 <= lastIdx; ki2++) {
            spanWidth += (phaseMinWidths[stagePhases[ki2].id] || CARD_W);
            if (ki2 > firstIdx) spanWidth += CARD_GAP;
          }
          html += '<div style="margin-left:' + offsetLeft + 'px;width:' + spanWidth + 'px">'
            + renderCalloutBadge(mc) + '</div>';
        }
        html += '</div>';
      }

      // Spanning callouts
      if (spanning.length > 0) {
        html += '<div class="flex w-full flex-col gap-1">';
        for (var spi = 0; spi < spanning.length; spi++) html += renderCalloutBadge(spanning[spi]);
        html += '</div>';
      }

      html += '</div>'; // stage cell
    }

    html += '</div>'; // display:contents
    return html;
  }

  // ── Motivation map (uses pre-rendered SVGs from window.__BLUEPRINT_MM_SVGS__) ──
  function renderMotivationSwimlane(sl, stages) {
    var meta  = mmBySwimlane[sl.id];
    var title = (meta && meta.title) || sl.name;
    var preSvg = MM_SVGS[sl.id] || "";

    // Y-axis labels live in the label column (not inside the SVG) so they
    // never stretch with preserveAspectRatio="none".
    // Values mirror React MotivationMap: High=10%, Medium=50%, Low=90%
    var yLevels = [
      { label: "High",   pct: 10 },
      { label: "Medium", pct: 50 },
      { label: "Low",    pct: 90 }
    ];
    var yLabels = "";
    for (var li = 0; li < yLevels.length; li++) {
      yLabels += '<div style="position:absolute;right:8px;top:' + yLevels[li].pct + '%;'
        + 'transform:translateY(-50%);font-size:10px;font-weight:500;text-align:right;'
        + 'line-height:1.2;color:#0f1724;pointer-events:none;max-width:calc(100% - 8px)">'
        + esc(yLevels[li].label) + '</div>';
    }

    var chartLabelCell = '<div style="position:relative;padding-right:8px;padding-top:12px">'
      + '<h3 style="text-align:right;font-size:14px;font-weight:700;line-height:1.25;color:#0f1724;margin:0 0 4px">' + esc(title) + '</h3>'
      + yLabels + '</div>';

    var chartContentCell = '<div style="grid-column:span ' + stages.length + ';min-width:0;padding-top:12px">'
      + '<div style="overflow:hidden;border-radius:12px;border:1px solid #e5e7eb;background:#eff6ff">'
      + (preSvg || '<div style="height:200px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9ca3af">No data</div>')
      + '</div></div>';

    var metaRow = "";
    if (meta && (meta.drivers || meta.triggers || meta.insights)) {
      var tiles = "";
      if (meta.drivers)  tiles += '<div style="border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;padding:10px"><div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#00b0ca">Key drivers</div><p style="margin:2px 0 0;font-size:11px;line-height:1.5;color:#374151">' + esc(meta.drivers) + '</p></div>';
      if (meta.triggers) tiles += '<div style="border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;padding:10px"><div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#00b0ca">Emotional triggers</div><p style="margin:2px 0 0;font-size:11px;line-height:1.5;color:#374151">' + esc(meta.triggers) + '</p></div>';
      if (meta.insights) tiles += '<div style="border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;padding:10px"><div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#00b0ca">Key insights</div><p style="margin:2px 0 0;font-size:11px;line-height:1.5;color:#374151">' + esc(meta.insights) + '</p></div>';
      metaRow = '<div style="display:contents"><div></div>'
        + '<div style="grid-column:span ' + stages.length + ';display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:8px">'
        + tiles + '</div></div>';
    }

    return '<div style="display:contents">' + chartLabelCell + chartContentCell + '</div>' + metaRow;
  }

  // ── Section ──
  function renderSection(section) {
    var stages = stagesForSection(section.id);
    if (stages.length === 0) return "";

    var sectionPhases    = phasesForSection(section.id);
    var sectionSwimlanes = swimlanesForSection(section.id);
    var phaseMinWidths   = computePhaseMinWidths(section.id);
    var stageGroups      = (DATA.stageGroups || []).filter(function (g) { return g.sectionId === section.id; });
    var hasStageGroups   = stages.some(function (s) { return s.stageGroupId; });

    // Build phase-to-group map
    var phaseToGroup = {};
    for (var pi = 0; pi < sectionPhases.length; pi++) {
      phaseToGroup[sectionPhases[pi].id] = phaseGid(sectionPhases[pi]);
    }

    // Unique group IDs in order
    var groupIds = [];
    var seenGid  = {};
    for (var pi2 = 0; pi2 < sectionPhases.length; pi2++) {
      var gid = phaseGid(sectionPhases[pi2]);
      if (!seenGid[gid]) { seenGid[gid] = true; groupIds.push(gid); }
    }

    // Split swimlanes: orphans vs phase-group
    var byGroup = {};
    var orphans = [];
    for (var sli = 0; sli < sectionSwimlanes.length; sli++) {
      var sl = sectionSwimlanes[sli];
      if (sl.phaseId) {
        var gid2 = phaseToGroup[sl.phaseId] || sl.phaseId;
        if (!byGroup[gid2]) byGroup[gid2] = [];
        byGroup[gid2].push(sl);
      } else {
        orphans.push(sl);
      }
    }

    // Build sorted items list
    var items = [];
    for (var oi = 0; oi < orphans.length; oi++) {
      items.push({ kind: "swimlane", order: orphans[oi].order, sl: orphans[oi] });
    }
    for (var gi = 0; gi < groupIds.length; gi++) {
      var gid3 = groupIds[gi];
      var gPhases = sectionPhases.filter(function (p) { return phaseGid(p) === gid3; });
      var minOrd  = gPhases.reduce(function (m, p) { return Math.min(m, p.order); }, Infinity);
      items.push({ kind: "group", order: minOrd, groupId: gid3, phases: gPhases });
    }
    items.sort(function (a, b) { return a.order - b.order; });

    var html = '<section style="border-radius:20px;background:#ffffff;padding:40px 24px;box-shadow:0 2px 10px 0 rgba(15,23,36,0.05);min-width:max-content">';

    // Section title
    html += '<div style="margin-bottom:32px">'
      + '<h2 style="margin:0;font-size:22px;font-weight:300;line-height:1.25;color:#0f1724">' + esc(section.name) + '</h2>'
      + (section.description ? '<p style="margin:4px 0 0;font-size:14px;color:#6b7280">' + esc(section.description) + '</p>' : "")
      + '</div>';

    // Grid
    html += '<div style="' + gridStyle(stages.length) + '">';

    if (hasStageGroups) html += renderStageGroupRow(stages, stageGroups, section.stageGroupLabel);
    html += renderStageHeaderRow(stages, section.stageLabel);

    // Render items
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      if (item.kind === "swimlane") {
        if (item.sl.type === "motivation_map") {
          html += renderMotivationSwimlane(item.sl, stages);
        } else {
          html += renderOrphanSwimlaneRow(item.sl, stages);
        }
      } else {
        var groupPhases    = item.phases;
        var groupSwimlanes = byGroup[item.groupId] || [];
        var groupLabel     = (groupPhases[0] && groupPhases[0].groupLabel) || "Phase";
        html += renderPhaseGroupHeader(groupLabel, groupPhases, stages, phaseMinWidths);
        for (var gsi = 0; gsi < groupSwimlanes.length; gsi++) {
          var gsl = groupSwimlanes[gsi];
          if (gsl.type === "motivation_map") {
            html += renderMotivationSwimlane(gsl, stages);
          } else {
            html += renderPhaseGroupSwimlaneRow(gsl, stages, groupPhases, phaseMinWidths);
          }
        }
      }
    }

    html += '</div>'; // grid
    html += '</section>';
    return html;
  }

  // ── Modal ──
  function renderModal() {
    if (!modalTpId) return "";
    var tp = tpById[modalTpId];
    if (!tp) return "";
    var stage     = stageById[tp.stageId];
    var stageName = stage ? stage.name : "";
    var media     = effectiveMedia(tp);
    var imgPart   = media.image
      ? '<img src="' + esc(media.image) + '" alt="' + esc(tp.name) + '" class="h-40 w-full rounded-lg border border-neutral-gray-200 object-cover">'
      : '<div class="grid h-40 place-items-center rounded-lg border-2 border-dashed border-neutral-gray-300 bg-neutral-gray-50 text-sm text-neutral-gray-400">No image</div>';
    var linkPart  = media.link
      ? '<a href="' + esc(media.link) + '" target="_blank" rel="noopener noreferrer" class="block truncate rounded-md border border-neutral-gray-200 bg-neutral-gray-50 px-3 py-2 text-sm text-neutral-gray-700 hover:bg-neutral-gray-100">' + esc(media.link) + '</a>'
      : "";
    return ''
      + '<div data-action="close-modal-bg" role="dialog" aria-modal="true" class="fixed inset-0 z-50 grid place-items-center bg-brand-navy-900/50 p-4">'
      + '<div class="w-full max-w-md rounded-xl bg-white shadow-xl">'
      + '<div class="flex items-center justify-between rounded-t-xl border-b-4 px-5 py-4" style="border-color:#00b0ca">'
      + '<div>'
      + '<div class="text-[10px] font-semibold uppercase tracking-wider" style="color:#00b0ca">Touchpoint \u00b7 ' + esc(stageName) + '</div>'
      + '<h3 class="text-lg font-bold text-brand-navy-900">' + esc(tp.name) + '</h3>'
      + '</div>'
      + '<button type="button" data-action="close-modal" aria-label="Close" class="grid h-8 w-8 place-items-center rounded-md text-neutral-gray-500 hover:bg-neutral-gray-100">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '</button>'
      + '</div>'
      + '<div class="flex flex-col gap-4 p-5">'
      + imgPart + linkPart
      + (tp.hoverTitle ? '<div><div class="text-[10px] font-semibold uppercase tracking-wider text-brand-cyan-500">Summary</div><p class="text-sm font-semibold text-brand-navy-900">' + esc(tp.hoverTitle) + '</p>' + (tp.hoverDescription ? '<p class="text-sm text-neutral-gray-700">' + esc(tp.hoverDescription) + '</p>' : "") + '</div>' : "")
      + (tp.description && !tp.hoverTitle ? '<p class="text-sm text-neutral-gray-700">' + esc(tp.description) + '</p>' : "")
      + (tp.customNotes ? '<div class="rounded-md bg-neutral-gray-50 p-3 text-sm text-neutral-gray-700">' + esc(tp.customNotes) + '</div>' : "")
      + '</div>'
      + '</div></div>';
  }

  // ── Sidebar ──
  function renderSidebarSection(title, body) {
    return ''
      + '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">'
      + '<h3 style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#0f1724">' + esc(title) + '</h3>'
      + '<div style="font-size:11px;line-height:1.6;color:rgba(15,23,36,0.7)">' + esc(body) + '</div>'
      + '</div>';
  }

  function renderSidebar() {
    var keyItems = [
      { label: "Journey stage",    bg: "#0f1724",  border: "none" },
      { label: "Touchpoint card",  bg: "#ffffff",  border: "1px solid #d1d5db" },
      { label: "Motivation curve", bg: "#8073ff",  border: "none" },
      { label: "Callout",          bg: "#f59e0b",  border: "none" }
    ];
    var keyHtml = '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px">';
    for (var ki = 0; ki < keyItems.length; ki++) {
      keyHtml += '<li style="display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(15,23,36,0.75)">'
        + '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;flex-shrink:0;background:' + keyItems[ki].bg + ';border:' + keyItems[ki].border + '"></span>'
        + esc(keyItems[ki].label) + '</li>';
    }
    keyHtml += '</ul>';

    return ''
      + '<aside style="position:sticky;top:0;z-index:10;display:flex;flex-direction:column;width:250px;flex-shrink:0;height:100vh;overflow-y:auto;border-right:1px solid rgba(15,23,36,0.1);background:#dce8f0;padding:32px 20px 24px;box-sizing:border-box">'
      + '<div style="margin-bottom:20px">'
      + '<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:rgba(15,23,36,0.5);margin-bottom:4px">Just A</div>'
      + '<h2 style="margin:0;font-size:20px;font-weight:700;line-height:1.25;color:#0f1724">' + esc(TITLE) + '</h2>'
      + '</div>'
      + '<p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:rgba(15,23,36,0.75)">The modern customer journey is composed of multiple, overlapping touchpoints and interactions that are not as clearly defined as traditional marketing funnels.</p>'
      + renderSidebarSection("How to use", "Drag horizontally on the blueprint to pan across the journey. Click any touchpoint card to see details.")
      + renderSidebarSection("Subject to change", "This map is a living artifact. As research and design iterate, the stages, swimlanes, and touchpoints will evolve.")
      + '<div>'
      + '<h3 style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#0f1724">Key</h3>'
      + keyHtml
      + '</div>'
      + '</aside>';
  }

  // ── Main render ──
  function render() {
    var html = ''
      + '<div style="display:flex;min-height:100vh">'
      + renderSidebar()
      + '<div data-scroller style="flex:1;min-width:0;display:flex;flex-direction:column;overflow-x:auto;cursor:grab">'
      + '<header style="position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:16px;border-bottom:1px solid #e5e7eb;background:#fff;padding:12px 24px;flex-shrink:0">'
      + '<span style="font-size:15px;font-weight:700;color:#0f1724">' + esc(TITLE) + '</span>'
      + '<span style="margin-left:auto;font-size:11px;color:#6b7280">Service Blueprint \u2014 Read only</span>'
      + '</header>'
      + '<main style="flex:1;padding:24px 32px">'
      + '<div style="display:flex;flex-direction:column;gap:24px;min-width:max-content">';

    var sections = sortBy(DATA.sections, "order");
    for (var i = 0; i < sections.length; i++) html += renderSection(sections[i]);

    html += '</div></main></div></div>' + renderModal();
    document.getElementById("root").innerHTML = html;
  }

  // ── Event delegation ──
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id     = el.getAttribute("data-id");
    if (action === "open-tp") {
      modalTpId = id; render();
    } else if (action === "close-modal" || (action === "close-modal-bg" && e.target === el)) {
      modalTpId = null; render();
    } else if (action === "toggle-lane") {
      if (collapsedLanes[id]) delete collapsedLanes[id]; else collapsedLanes[id] = true;
      render();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalTpId) { modalTpId = null; render(); }
  });

  // ── Drag-to-pan ──
  (function () {
    var dragEl = null, startX = 0, startScroll = 0, moved = 0, capturedId = null;
    document.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      var t = e.target;
      if (!t || t.closest("button,a,input,select,textarea,[data-action]")) return;
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
    function endDrag(e) {
      if (!dragEl) return;
      var was = dragEl;
      dragEl.style.cursor = "grab"; dragEl.style.userSelect = "";
      if (capturedId !== null) { try { dragEl.releasePointerCapture(capturedId); } catch (err) {} capturedId = null; }
      dragEl = null;
      if (moved > 5) {
        var suppress = function (ev) { ev.stopPropagation(); ev.preventDefault(); was.removeEventListener("click", suppress, true); };
        was.addEventListener("click", suppress, true);
        setTimeout(function () { was.removeEventListener("click", suppress, true); }, 0);
      }
    }
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  })();

  // ── Motivation map dot tooltips ──
  (function () {
    var tip = null;
    function ensureTip() {
      if (!tip) {
        tip = document.createElement("div");
        tip.style.cssText = "display:none;position:fixed;z-index:200;pointer-events:none;"
          + "min-width:120px;border-radius:8px;border:2px solid #8073ff;background:#ffffff;"
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
      var titleVal = el.getAttribute("data-mm-title");
      var descVal  = el.getAttribute("data-mm-desc");
      var html = "";
      if (titleVal) html += '<div style="font-size:13px;font-weight:700;color:#0f1724;margin-bottom:2px">' + esc(titleVal) + '</div>';
      html += '<div style="font-size:12px;font-weight:600;color:#8073ff">' + score + '%</div>';
      if (descVal) html += '<p style="margin:3px 0 0;font-size:11px;color:#4b5563;line-height:1.4">' + esc(descVal) + '</p>';
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
      if (!el || !el.getAttribute) return;
      if (el.getAttribute("data-mm-score") !== null && tip) tip.style.display = "none";
    });
  })();

  render();
})();
