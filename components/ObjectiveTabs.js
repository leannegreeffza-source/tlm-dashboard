'use client';

/* ============================================================
   ObjectiveTabs.js — Custom Report Builder (v2)
   ------------------------------------------------------------
   Pulls data directly from LinkedIn via /api/analytics.
   Optional upload for Professional Demographics (the one
   breakdown the API doesn't expose).

   Single page (no wizard) — Scope/Filters → Configure → Report.

   Uses existing app routes:
     - GET  /api/accounts
     - POST /api/campaigngroups  { accountIds }
     - POST /api/campaigns       { accountIds }
     - POST /api/ads             { campaignIds }
     - POST /api/analytics       { accountIds, [campaignIds, adIds, ...], currentRange, previousRange, exchangeRate }
     - POST /api/ai-recommendations { prompt }

   Dependencies (already in package.json): xlsx, lucide-react
   ============================================================ */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import {
  Upload, Settings, Sparkles, Download, Copy,
  ChevronDown, RefreshCw, CheckCircle2, AlertCircle,
  TrendingUp, Layers, Edit3, Loader2, Calendar, Filter,
  Search, Users, BarChart3,
} from 'lucide-react';

/* ====================================================================
   1. CONSTANTS — objectives, metrics, benchmark presets, breakdowns
   ==================================================================== */

const OBJECTIVES = {
  engagement: { label: 'Engagement',       metrics: ['ctr','engagementRate','cpm','cpc','frequency','reach'],          description: 'CTR, Engagement Rate, CPM, CPC, Frequency' },
  website:    { label: 'Website Visits',   metrics: ['ctr','cpc','cpm','clicks','frequency','reach'],                  description: 'CTR, CPC, Clicks' },
  leads:      { label: 'Lead Generation',  metrics: ['ctr','leads','cpl','engagementRate','frequency','cpm'],          description: 'Leads, CPL, Engagement Rate' },
  video:      { label: 'Video Views',      metrics: ['videoViewRate','videoCompletionRate','cpm','ctr','engagementRate','frequency'], description: 'Video View Rate, Completion Rate' },
  awareness:  { label: 'Awareness / Brand',metrics: ['cpm','reach','frequency','impressions','ctr','engagementRate'],  description: 'CPM, Reach, Frequency' },
  combined:   { label: 'Combined',         metrics: ['ctr','engagementRate','cpm','cpc'],                              description: 'Custom — pick the metrics you want below' },
};

// Default custom mix for "Combined" objective (sensible starting point — user can change)
const DEFAULT_COMBINED_METRICS = ['ctr','engagementRate','cpm','cpc'];

// All metric IDs the user can pick in Combined mode (filters out non-metric/derived ones)
const PICKABLE_METRICS = [
  'impressions','clicks','ctr','engagements','engagementRate','spend',
  'cpm','cpc','reach','frequency','videoViewRate','videoCompletionRate','leads','cpl',
];

const METRIC_DEFS = {
  impressions:         { label: 'Impressions',           format: 'num', higherIsBetter: true  },
  clicks:              { label: 'Clicks',                format: 'num', higherIsBetter: true  },
  ctr:                 { label: 'CTR',                   format: 'pct', higherIsBetter: true  },
  engagements:         { label: 'Engagements',           format: 'num', higherIsBetter: true  },
  engagementRate:      { label: 'Engagement Rate',       format: 'pct', higherIsBetter: true  },
  spend:               { label: 'Spend',                 format: 'cur', higherIsBetter: null  },
  cpm:                 { label: 'CPM',                   format: 'cur', higherIsBetter: false },
  cpc:                 { label: 'CPC',                   format: 'cur', higherIsBetter: false },
  reach:               { label: 'Reach',                 format: 'num', higherIsBetter: true  },
  frequency:           { label: 'Frequency',             format: 'dec', higherIsBetter: null  },
  videoViewRate:       { label: 'Video View Rate',       format: 'pct', higherIsBetter: true  },
  videoCompletionRate: { label: 'Video Completion Rate', format: 'pct', higherIsBetter: true  },
  leads:               { label: 'Leads',                 format: 'num', higherIsBetter: true  },
  cpl:                 { label: 'Cost per Lead',         format: 'cur', higherIsBetter: false },
};

const BENCHMARK_PRESETS = {
  'sa-median':       { label: 'South Africa (Median)', values: { ctr:0.0057, engagementRate:0.0088, cpm:4.76, cpc:1.61, videoViewRate:0.311, videoCompletionRate:0.012 } },
  'linkedin-global': { label: 'LinkedIn Global',       values: { ctr:0.0044, engagementRate:0.0054, cpm:4.76, cpc:1.61, videoViewRate:0.311, videoCompletionRate:0.012 } },
  'africa':          { label: 'Africa',                values: { ctr:0.0052, engagementRate:0.0095, cpm:3.50, cpc:1.20, videoViewRate:0.30,  videoCompletionRate:0.012 } },
  'europe':          { label: 'Europe',                values: { ctr:0.0052, engagementRate:0.0095, cpm:5.50, cpc:1.85 } },
  'custom':          { label: 'Custom',                values: {} },
};

const BREAKDOWNS = [
  { id: 'campaign', label: 'By Campaign' },
  { id: 'ad',       label: 'By Ad' },
  { id: 'date',     label: 'By Date (current vs previous)' },
];

/* ====================================================================
   2. HELPERS — date math, formatting, rating
   ==================================================================== */

function today()    { return new Date().toISOString().split('T')[0]; }
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().split('T')[0]; }
function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
function lastMonth() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1);
  const start = d.toISOString().split('T')[0];
  const last  = new Date(d.getFullYear(), d.getMonth()+1, 0);
  return { start, end: last.toISOString().split('T')[0] };
}
function thisQuarter() {
  const d = new Date(); const q = Math.floor(d.getMonth()/3);
  return { start: new Date(d.getFullYear(), q*3, 1).toISOString().split('T')[0], end: today() };
}
function lastQuarter() {
  const d = new Date(); const q = Math.floor(d.getMonth()/3) - 1;
  const y  = q < 0 ? d.getFullYear() - 1 : d.getFullYear();
  const qq = (q + 4) % 4;
  return {
    start: new Date(y, qq*3, 1).toISOString().split('T')[0],
    end:   new Date(y, qq*3+3, 0).toISOString().split('T')[0],
  };
}

function previousRangeFor(start, end) {
  const s = new Date(start + 'T00:00:00').getTime();
  const e = new Date(end   + 'T00:00:00').getTime();
  const span = Math.max(e - s, 86400000);
  return {
    start: new Date(s - span - 86400000).toISOString().split('T')[0],
    end:   new Date(s - 86400000).toISOString().split('T')[0],
  };
}

function fmtMetric(metric, value, currency = '$') {
  if (value == null || (typeof value === 'number' && !isFinite(value))) return '—';
  const def = METRIC_DEFS[metric];
  const fmt = def?.format || 'num';
  switch (fmt) {
    case 'pct': return `${(value * 100).toFixed(2)}%`;
    case 'cur': return `${currency}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    case 'dec': return value.toFixed(2);
    default:    return Math.round(value).toLocaleString();
  }
}

function fmtDelta(curr, prev, metric) {
  if (curr == null || prev == null || prev === 0) return null;
  const diff = curr - prev;
  const pct  = (diff / Math.abs(prev)) * 100;
  const better = METRIC_DEFS[metric]?.higherIsBetter;
  let direction = 'flat';
  if (Math.abs(pct) >= 1) direction = pct > 0 ? 'up' : 'down';
  let good = null;
  if (better === true)  good = pct > 0;
  if (better === false) good = pct < 0;
  return { pct, direction, good, diff };
}

function rateValue(metric, value, benchmark) {
  if (value == null || benchmark == null) return null;
  const better = METRIC_DEFS[metric]?.higherIsBetter;
  if (better === null) return null;
  const ratio = value / benchmark;
  const TOL = 0.05;
  if (better) {
    if (ratio >= 1 + TOL) return 'above';
    if (ratio <= 1 - TOL) return 'below';
    return 'meets';
  } else {
    if (ratio <= 1 - TOL) return 'above';
    if (ratio >= 1 + TOL) return 'below';
    return 'meets';
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ====================================================================
   3. NORMALISATION
   ------------------------------------------------------------
   /api/analytics returns rates as percent NUMBERS (2.27 == 2.27%).
   Internally we use ratios so all maths shares a single unit.
   ==================================================================== */

function normalizePeriod(p) {
  if (!p) return null;
  return {
    impressions: p.impressions || 0,
    clicks:      p.clicks      || 0,
    spend:       p.spent       || p.spend || 0,
    engagements: p.engagements || 0,
    reach:       p.reach       || p.totalReach || 0,
    leads:       p.leads       || 0,
    ctr:            p.ctr != null ? p.ctr / 100 : (p.impressions ? (p.clicks||0)/p.impressions : null),
    engagementRate: p.engagementRate != null ? p.engagementRate / 100 : (p.impressions ? (p.engagements||0)/p.impressions : null),
    cpm:            p.impressions ? ((p.spent||p.spend||0) / p.impressions) * 1000 : null,
    cpc:            p.clicks ? (p.spent||p.spend||0) / p.clicks : null,
    frequency:      p.frequency != null ? p.frequency : (p.reach ? p.impressions / p.reach : null),
    cpl:            p.leads ? (p.spent||p.spend||0) / p.leads : null,
    videoViewRate:        p.videoViewRate       != null ? (p.videoViewRate>1 ? p.videoViewRate/100 : p.videoViewRate) : null,
    videoCompletionRate:  p.videoCompletionRate != null ? (p.videoCompletionRate>1 ? p.videoCompletionRate/100 : p.videoCompletionRate) : null,
  };
}

function normalizeEntity(e) {
  if (!e) return null;
  return {
    id:    e.id,
    name:  e.name || e.title || 'Unnamed',
    impressions: e.impressions || 0,
    clicks:      e.clicks      || 0,
    spend:       e.spent       || e.spend || 0,
    engagements: e.engagements || 0,
    reach:       e.reach       || 0,
    leads:       e.leads       || 0,
    objectiveType: e.objectiveType || e.objective || '',
    ctr:            e.ctr != null ? (e.ctr > 1 ? e.ctr / 100 : e.ctr) : (e.impressions ? (e.clicks||0)/e.impressions : null),
    engagementRate: e.engagementRate != null ? (e.engagementRate > 1 ? e.engagementRate / 100 : e.engagementRate) : (e.impressions ? (e.engagements||0)/e.impressions : null),
    cpm:            e.impressions ? ((e.spent||e.spend||0) / e.impressions) * 1000 : null,
    cpc:            e.clicks ? (e.spent||e.spend||0) / e.clicks : null,
    frequency:      e.frequency != null ? e.frequency : (e.reach ? e.impressions / e.reach : null),
    cpl:            e.leads ? (e.spent||e.spend||0) / e.leads : null,
    videoViewRate:        e.videoViewRate       != null ? (e.videoViewRate>1 ? e.videoViewRate/100 : e.videoViewRate) : null,
    videoCompletionRate:  e.videoCompletionRate != null ? (e.videoCompletionRate>1 ? e.videoCompletionRate/100 : e.videoCompletionRate) : null,
  };
}

/* ====================================================================
   4. PROFESSIONAL DEMOGRAPHICS — optional XLSX/CSV upload parser
   ==================================================================== */

const DEMOGRAPHIC_DIMENSIONS = [
  'job function','job_function','jobfunction',
  'seniority','job seniority','title',
  'industry','company industry','company size','company_size','company','company name',
  'country','region','location','geo','city',
  'audience','audience segment',
];
const DEMOGRAPHIC_METRICS = {
  impressions:    ['impressions','imps'],
  clicks:         ['clicks','total clicks'],
  ctr:            ['ctr','click through rate'],
  spend:          ['spend','total spend','total spent','amount spent','cost'],
  engagements:    ['engagements','total engagements'],
  engagementRate: ['engagement rate','er'],
  cpm:            ['cpm','average cpm'],
  cpc:            ['cpc','average cpc'],
  leads:          ['leads','total leads'],
  reach:          ['reach'],
};

function parseDemographicsFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb   = xlsxRead(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = xlsxUtils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
        resolve(parseDemographicsRows(raw, file.name));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseDemographicsRows(raw, fileName) {
  const allTerms = [...DEMOGRAPHIC_DIMENSIONS, ...Object.values(DEMOGRAPHIC_METRICS).flat()];
  const termSet = new Set(allTerms);

  let headerIdx = 0, bestScore = 0;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const row = raw[i] || [];
    let score = 0;
    for (const c of row) if (typeof c === 'string' && termSet.has(c.trim().toLowerCase())) score++;
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (bestScore < 2) throw new Error('Could not find a recognisable header row. Expected columns like "Job Function" / "Country" / "Impressions" / "Clicks".');

  const header = raw[headerIdx];
  const dimensionIdx = {};
  const metricIdx = {};

  for (let i = 0; i < header.length; i++) {
    const cell = header[i];
    if (typeof cell !== 'string') continue;
    const norm = cell.trim().toLowerCase();
    if (DEMOGRAPHIC_DIMENSIONS.includes(norm)) dimensionIdx[cell.trim()] = i;
    for (const [metric, aliases] of Object.entries(DEMOGRAPHIC_METRICS)) {
      if (aliases.includes(norm) && metricIdx[metric] == null) metricIdx[metric] = i;
    }
  }

  if (!Object.keys(dimensionIdx).length) throw new Error('No demographic dimension column detected (Job Function / Industry / Country / etc.).');
  if (metricIdx.impressions == null && metricIdx.clicks == null) throw new Error('No metric columns detected (need Impressions or Clicks).');

  const primaryDim = Object.keys(dimensionIdx)[0];
  const primaryCol = dimensionIdx[primaryDim];

  const headerSet = new Set();
  for (const c of header) if (typeof c === 'string') headerSet.add(c.trim().toLowerCase());

  const rows = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every(c => c == null || c === '')) continue;
    let hits = 0;
    for (const c of r) {
      if (typeof c === 'string' && headerSet.has(c.trim().toLowerCase())) hits++;
      if (hits >= 2) break;
    }
    if (hits >= 2) continue;
    const dimValue = r[primaryCol];
    if (dimValue == null || dimValue === '') continue;
    const row = { [primaryDim]: String(dimValue).trim() };
    for (const [metric, idx] of Object.entries(metricIdx)) {
      row[metric] = toNum(r[idx]);
    }
    if (typeof row[primaryDim] === 'string' && /\b(total|subtotal|grand\s*total)\b/i.test(row[primaryDim])) continue;
    if (!row.impressions && !row.clicks) continue;
    rows.push(row);
  }

  // Normalize rates
  for (const f of ['ctr','engagementRate']) {
    const vals = rows.map(r => r[f]).filter(v => typeof v === 'number');
    if (vals.length && Math.max(...vals.map(Math.abs)) > 1) {
      rows.forEach(r => { if (typeof r[f] === 'number') r[f] = r[f] / 100; });
    }
  }

  // Aggregate by primary dimension
  const groupMap = new Map();
  for (const r of rows) {
    const key = r[primaryDim];
    if (!groupMap.has(key)) {
      groupMap.set(key, { [primaryDim]: key, impressions: 0, clicks: 0, spend: 0, engagements: 0, leads: 0, reach: 0 });
    }
    const g = groupMap.get(key);
    g.impressions += r.impressions || 0;
    g.clicks      += r.clicks      || 0;
    g.spend       += r.spend       || 0;
    g.engagements += r.engagements || 0;
    g.leads       += r.leads       || 0;
    g.reach       += r.reach       || 0;
  }

  const grouped = [...groupMap.values()].map(g => ({
    ...g,
    ctr:            g.impressions ? g.clicks / g.impressions : null,
    engagementRate: g.impressions ? g.engagements / g.impressions : null,
    cpm:            g.impressions ? (g.spend / g.impressions) * 1000 : null,
    cpc:            g.clicks ? g.spend / g.clicks : null,
    cpl:            g.leads ? g.spend / g.leads : null,
  })).sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  return { fileName, dimension: primaryDim, rows: grouped, allDimensions: Object.keys(dimensionIdx) };
}

function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v.startsWith('=')) return null;
    const cleaned = v.replace(/[$,£€R\s]/g, '').replace('%', '');
    const n = parseFloat(cleaned);
    if (!isNaN(n)) return v.includes('%') ? n / 100 : n;
  }
  return null;
}

/* ====================================================================
   5. AI PROMPT
   ==================================================================== */

function buildAIPrompt({ objective, breakdownId, cells, primaryCell, isMultiCell, layoutMode, demographics, benchmarks, currency, metricKeys }) {
  const benchTable = Object.entries(benchmarks).filter(([, v]) => v != null)
    .map(([m, v]) => `  ${METRIC_DEFS[m]?.label || m}: ${fmtMetric(m, v, currency)}`).join('\n');

  const cellSection = cells.map((c, i) => {
    const rows = metricKeys
      .map(m => `    ${METRIC_DEFS[m].label}: ${fmtMetric(m, c.totals?.[m], currency)}`).join('\n');
    return `  CELL ${i + 1}: ${c.label}\n${rows}`;
  }).join('\n\n');

  const primaryGroups = primaryCell ? (
    breakdownId === 'campaign' ? primaryCell.topCampaigns :
    breakdownId === 'ad'       ? (primaryCell.topAds?.length ? primaryCell.topAds : primaryCell.topCampaigns) :
    []
  ) : [];
  const groupTable = (primaryGroups || []).slice(0, 15).map(g => {
    const m = metricKeys.map(k => `${METRIC_DEFS[k].label}=${fmtMetric(k, g[k], currency)}`).join(', ');
    return `  • ${g.name}: ${m}`;
  }).join('\n');

  const demoTable = demographics && demographics.rows.length
    ? `\n\nPROFESSIONAL DEMOGRAPHICS (${demographics.dimension}):\n` +
      demographics.rows.slice(0, 15).map(r => {
        const m = `Imp=${(r.impressions||0).toLocaleString()}, Clicks=${(r.clicks||0).toLocaleString()}, CTR=${((r.ctr||0)*100).toFixed(2)}%`;
        return `  • ${r[demographics.dimension]}: ${m}`;
      }).join('\n')
    : '';

  const breakdownLabel = BREAKDOWNS.find(b => b.id === breakdownId)?.label || breakdownId;
  const comparisonContext = isMultiCell
    ? layoutMode === 'primary'
      ? `\nLAYOUT: Primary + Reference. The primary cell is "${primaryCell.label}"; the others are comparison references. The narrative should focus on the primary, citing references for context.`
      : `\nLAYOUT: Side-by-side comparison of ${cells.length} cells. The narrative should compare them on equal footing — highlight which cell performs best on each metric, identify patterns, and call out outliers.`
    : '';

  return `You are a senior performance marketing analyst at Turn Left Media writing a LinkedIn campaign report for a client. Campaign objective: ${OBJECTIVES[objective].label}. Breakdown for the primary cell: ${breakdownLabel}.${comparisonContext}

DATA CELLS (each is one account × date range):
${cellSection}

BENCHMARKS:
${benchTable || '  (none set)'}

PER-GROUP PERFORMANCE for primary cell (${breakdownLabel}):
${groupTable || '  (none)'}
${demoTable}

Respond with EXACTLY four sections in this format, with NO other preamble or commentary:

===EXEC_SUMMARY===
${isMultiCell
  ? '2-3 sentences comparing the cells. Lead with the most striking difference or pattern across them.'
  : '2-3 sentences. Lead with the strongest finding. Call out a specific number.'}

===WHATS_WORKING===
4-6 bullets, each starting with "—". ${isMultiCell ? 'For each win, name which cell it applies to.' : 'Cite specific metrics with values.'} Compare to benchmarks where relevant.

===WHATS_NOT_WORKING===
2-4 bullets, each starting with "—". Be diplomatic but honest. ${isMultiCell ? 'Name the cell when calling out an issue.' : ''}

===RECOMMENDATIONS===
3-5 actionable recommendations. Each starts with a short action verb followed by ":" then the recommendation. ${isMultiCell ? 'Where relevant, frame in terms of one cell learning from another.' : ''}

Use Turn Left's voice: data-led, decisive, no fluff. Use 🔵 / 🟡 / 🔴 emoji tags inline when calling out metrics vs benchmark.`;
}

function parseAIResponse(text) {
  const sections = { execSummary: '', whatsWorking: '', whatsNotWorking: '', recommendations: '' };
  const re = /===(EXEC_SUMMARY|WHATS_WORKING|WHATS_NOT_WORKING|RECOMMENDATIONS)===\s*\n([\s\S]*?)(?=\n===|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1], body = m[2].trim();
    if (key === 'EXEC_SUMMARY')      sections.execSummary = body;
    if (key === 'WHATS_WORKING')     sections.whatsWorking = body;
    if (key === 'WHATS_NOT_WORKING') sections.whatsNotWorking = body;
    if (key === 'RECOMMENDATIONS')   sections.recommendations = body;
  }
  if (!sections.execSummary && text) sections.execSummary = text.slice(0, 600);
  return sections;
}

/* ====================================================================
   6. EXPORT HTML — email-ready document
   ==================================================================== */

function buildExportHTML({ title, objective, breakdownId, cells, primaryCell, isMultiCell, layoutMode, demographics, benchmarks, narrative, currency, metricKeys, breakdownRows }) {
  const objLabel = OBJECTIVES[objective].label;
  const breakdownLabel = BREAKDOWNS.find(b => b.id === breakdownId)?.label || '';

  /* ── Totals section: single-cell vs multi-cell ── */
  let totalsBlock;
  if (!isMultiCell) {
    const c = primaryCell;
    const totals = c.totals, prevTotals = c.prevTotals;
    const rows = metricKeys.map(m => {
      const delta = prevTotals ? fmtDelta(totals[m], prevTotals[m], m) : null;
      const deltaStr = delta
        ? ` <span style="color:${delta.good===true?'#22c55e':delta.good===false?'#ef4444':'#64748b'};font-size:11px;">${delta.direction==='up'?'↑':delta.direction==='down'?'↓':'→'} ${Math.abs(delta.pct).toFixed(1)}%</span>`
        : '';
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${METRIC_DEFS[m].label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;text-align:right;">${fmtMetric(m,totals[m],currency)}${deltaStr}</td>
        </tr>`;
    }).join('');
    totalsBlock = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;"><tbody>${rows}</tbody></table>`;
  } else {
    // Multi-cell: metric rows × cell columns
    const headerCells = cells.map(c =>
      `<th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;font-size:11px;">${escapeHtml(c.label)}</th>`).join('');
    const rows = metricKeys.map(m => {
      const cellCells = cells.map(c => {
        const v = c.totals?.[m];
        const benchmark = benchmarks[m];
        const rating = benchmark != null ? rateValue(m, v, benchmark) : null;
        const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
        return `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;text-align:right;">${fmtMetric(m,v,currency)} ${dot}</td>`;
      }).join('');
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;font-weight:600;">${METRIC_DEFS[m].label}</td>
          ${cellCells}
        </tr>`;
    }).join('');
    totalsBlock = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">
      <thead><tr><th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">Metric</th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  /* ── Benchmark comparison (uses primary cell's totals) ── */
  const benchRows = primaryCell.totals && metricKeys.filter(m => benchmarks[m] != null).map(m => {
    const rating = rateValue(m, primaryCell.totals[m], benchmarks[m]);
    const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${METRIC_DEFS[m].label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0e1034;">${fmtMetric(m,primaryCell.totals[m],currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#475569;">${fmtMetric(m,benchmarks[m],currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${dot}</td>
      </tr>`;
  }).join('');

  /* ── Breakdown table — multi-cell aware, mirrors the in-page view ── */
  let breakdownHtml = '';
  if (breakdownRows && breakdownRows.length) {
    if (!isMultiCell || breakdownId === 'date') {
      const headerRow = metricKeys.map(m =>
        `<th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">${METRIC_DEFS[m].label}</th>`).join('');
      const bodyRows = breakdownRows.slice(0, 30).map(r => {
        const cellsHtml = metricKeys.map(m => {
          const v = (r.primary || {})[m];
          return `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${fmtMetric(m,v,currency)}</td>`;
        }).join('');
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;">${escapeHtml(r.name)}</td>
          ${cellsHtml}
        </tr>`;
      }).join('');
      breakdownHtml = `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
        <thead><tr><th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">Name</th>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    } else {
      // Multi-cell: nested headers
      const topRow = metricKeys.map(m =>
        `<th colspan="${cells.length}" style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:center;border-left:1px solid #1e293b;">${METRIC_DEFS[m].label}</th>`).join('');
      const subRow = metricKeys.map(m =>
        cells.map((c, ci) =>
          `<th style="padding:6px 8px;background:#0e1034;color:#94a3b8;text-align:right;font-weight:normal;font-size:10px;border-left:1px solid #1e293b;">${escapeHtml(ci === 0 ? c.accountName.slice(0,12) : (c.dateLabel || c.accountName.slice(0,12)))}</th>`).join('')
      ).join('');
      const bodyRows = breakdownRows.slice(0, 30).map(r => {
        const cellsHtml = metricKeys.map(m =>
          cells.map(c => {
            const cellData = r.cellMetrics[c.id];
            const v = cellData ? cellData[m] : null;
            return `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;font-size:11px;border-left:1px solid #f1f5f9;">${v != null ? fmtMetric(m,v,currency) : '—'}</td>`;
          }).join('')
        ).join('');
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;">${escapeHtml(r.name)}</td>
          ${cellsHtml}
        </tr>`;
      }).join('');
      breakdownHtml = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;">
        <thead>
          <tr><th rowspan="2" style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;vertical-align:bottom;">Name</th>${topRow}</tr>
          <tr>${subRow}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    }
  }

  const demoBlock = demographics && demographics.rows.length ? `
    <div style="padding:0 30px 25px;">
      <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">👥 By ${escapeHtml(demographics.dimension)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
        <thead><tr>
          <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">${escapeHtml(demographics.dimension)}</th>
          <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">Impressions</th>
          <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">Clicks</th>
          <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">CTR</th>
          <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">Engagement Rate</th>
        </tr></thead>
        <tbody>
          ${demographics.rows.slice(0, 25).map(r => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;">${escapeHtml(r[demographics.dimension])}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${(r.impressions||0).toLocaleString()}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${(r.clicks||0).toLocaleString()}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${r.ctr!=null?(r.ctr*100).toFixed(2)+'%':'—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${r.engagementRate!=null?(r.engagementRate*100).toFixed(2)+'%':'—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const cellsSubtitle = cells.map(c => escapeHtml(c.label)).join(' · ');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:30px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#0e1034;">
<div style="max-width:1100px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#0e1034;color:#fff;padding:30px;">
    <div style="font-size:22px;font-weight:700;">${escapeHtml(title)}</div>
    <div style="font-size:12px;color:#F6DC4E;margin-top:6px;">${cellsSubtitle} · Objective: ${escapeHtml(objLabel)} · Breakdown: ${escapeHtml(breakdownLabel)}</div>
  </div>

  <div style="padding:25px 30px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">📈 Executive Summary</h2>
    <div style="color:#444;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(narrative.execSummary)}</div>
  </div>

  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">📊 Performance Totals${isMultiCell ? ' — Side-by-side' : ''}</h2>
    ${totalsBlock}
  </div>

  ${benchRows ? `
  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🎯 Benchmark Comparison${isMultiCell ? ` (${escapeHtml(primaryCell.label)})` : ''}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">
      <thead><tr>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">Metric</th>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">Campaign</th>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">Benchmark</th>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:center;">Status</th>
      </tr></thead>
      <tbody>${benchRows}</tbody>
    </table>
    <div style="font-size:11px;color:#64748b;margin-top:6px;">🔵 Above &nbsp; 🟡 Meets &nbsp; 🔴 Below</div>
  </div>` : ''}

  ${breakdownHtml ? `
  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🔍 ${escapeHtml(breakdownLabel)}</h2>
    ${breakdownHtml}
  </div>` : ''}

  ${demoBlock}

  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">✅ What's Working</h2>
    <div style="color:#444;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(narrative.whatsWorking)}</div>
  </div>

  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">⚠️ What's Not Working</h2>
    <div style="color:#444;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(narrative.whatsNotWorking)}</div>
  </div>

  <div style="padding:0 30px 30px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🎯 Recommendations</h2>
    <div style="color:#444;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(narrative.recommendations)}</div>
  </div>

  <div style="background:#f3f4f6;padding:15px 30px;font-size:11px;color:#94a3b8;text-align:center;">
    Generated by TLM Dashboard · ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
  </div>
</div>
</body></html>`;
}

/* ====================================================================
   7. UI sub-components
   ==================================================================== */

function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-xl border border-slate-700/50 ${className}`}
         style={{ background: 'rgba(15, 31, 61, 0.6)' }} {...rest}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" style={{ color: '#F6DC4E' }} />}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.start);
  const [tempEnd, setTempEnd] = useState(value.end);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const presets = [
    { label: 'Last 7 days',  fn: () => ({ start: daysAgo(6),  end: today() }) },
    { label: 'Last 30 days', fn: () => ({ start: daysAgo(29), end: today() }) },
    { label: 'Last 90 days', fn: () => ({ start: daysAgo(89), end: today() }) },
    { label: 'This month',   fn: () => ({ start: firstOfMonth(), end: today() }) },
    { label: 'Last month',   fn: () => lastMonth() },
    { label: 'This quarter', fn: () => thisQuarter() },
    { label: 'Last quarter', fn: () => lastQuarter() },
  ];

  function formatDisplay(s, e) {
    if (!s || !e) return 'Select date range';
    const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return s === e ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-sm text-white w-full"
              style={{ background: '#0a1530' }}>
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-left">{formatDisplay(value.start, value.end)}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 p-4 rounded-lg shadow-xl border border-slate-600 w-80"
             style={{ background: '#0a1530' }}>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {presets.map(p => (
              <button key={p.label} onClick={() => {
                const v = p.fn(); onChange(v); setTempStart(v.start); setTempEnd(v.end);
              }} className="text-xs px-2 py-1.5 rounded text-slate-300 hover:bg-slate-700 text-left">
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <label className="block text-xs text-slate-400">From</label>
            <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)}
                   className="w-full px-2 py-1 rounded border border-slate-600 text-sm"
                   style={{ background: '#0f1f3d', color: '#fff' }} />
            <label className="block text-xs text-slate-400">To</label>
            <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)}
                   className="w-full px-2 py-1 rounded border border-slate-600 text-sm"
                   style={{ background: '#0f1f3d', color: '#fff' }} />
            <button onClick={() => { onChange({ start: tempStart, end: tempEnd }); setOpen(false); }}
                    className="w-full mt-2 px-3 py-1.5 rounded text-sm font-semibold"
                    style={{ background: '#F6DC4E', color: '#0e1034' }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSelect({ items, selected, onChange, placeholder, searchKey = 'name' }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => String(i[searchKey] || '').toLowerCase().includes(q) || String(i.id).toLowerCase().includes(q));
  }, [items, search, searchKey]);

  function toggle(id) {
    const s = String(id);
    onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  }

  return (
    <div className="rounded-lg border border-slate-700/50 p-2" style={{ background: 'rgba(10,21,48,0.4)' }}>
      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder}
               className="w-full pl-7 pr-2 py-1.5 rounded border border-slate-600 text-sm"
               style={{ background: '#0a1530', color: '#fff' }} />
      </div>
      <div className="max-h-44 overflow-y-auto space-y-1">
        {filtered.length === 0 && <div className="text-xs text-slate-500 px-2 py-1">No matches</div>}
        {filtered.slice(0, 100).map(i => {
          const sid = String(i.id);
          const isSel = selected.includes(sid);
          return (
            <label key={sid} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-700/40">
              <input type="checkbox" checked={isSel} onChange={() => toggle(sid)} className="rounded" />
              <span className="text-xs text-slate-200 truncate">{i[searchKey] || `ID ${sid}`}</span>
              <span className="text-[10px] text-slate-500 ml-auto">{sid}</span>
            </label>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-400">{selected.length} selected</span>
          <button onClick={() => onChange([])} className="text-xs text-slate-400 hover:text-white">Clear</button>
        </div>
      )}
    </div>
  );
}

function NarrativeBlock({ title, value, onChange, accent }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</h3>
        <Edit3 className="w-3 h-3 text-slate-500" />
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={e => onChange(e.currentTarget.innerText)}
        className="text-sm text-slate-200 whitespace-pre-wrap outline-none focus:ring-2 focus:ring-yellow-400/30 rounded p-2 -m-2"
        style={{ minHeight: '60px', lineHeight: 1.6 }}
      >
        {value}
      </div>
    </Card>
  );
}

function DemoUploader({ value, onUpload, onClear, loading, error }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) onUpload(f);
        }}
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? '#F6DC4E' : '#334155',
          background:  dragOver ? 'rgba(246,220,78,0.08)' : 'transparent',
        }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
               onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Parsing…
          </div>
        ) : value ? (
          <div>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color:'#22c55e' }} />
            <div className="font-semibold text-white">{value.fileName}</div>
            <div className="text-xs text-slate-400 mt-1">
              Breakdown by <span style={{ color: '#F6DC4E' }}>{value.dimension}</span> · {value.rows.length} rows
            </div>
            <button onClick={e => { e.stopPropagation(); onClear(); }}
                    className="mt-2 text-xs text-slate-400 hover:text-white">
              Remove
            </button>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <div className="text-slate-300 font-semibold text-sm">Drop Professional Demographics file</div>
            <div className="text-xs text-slate-500 mt-1">.xlsx · .xls · .csv · Expected columns: Job Function / Industry / Country / etc. + Impressions / Clicks / CTR</div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 p-3 rounded-lg flex items-start gap-2"
             style={{ background:'rgba(239,68,68,0.1)', borderLeft:'3px solid #ef4444' }}>
          <AlertCircle className="w-4 h-4 mt-0.5" style={{ color:'#ef4444' }} />
          <div className="text-sm" style={{ color:'#fecaca' }}>{error}</div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   8. MAIN COMPONENT
   ==================================================================== */

export default function ObjectiveTabs() {
  // ── Scope / filter state ──
  const [accounts, setAccounts] = useState([]);
  const [selectedAcctIds, setSelectedAcctIds] = useState([]);
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [ads, setAds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [selectedCampIds, setSelectedCampIds] = useState([]);
  const [selectedAdIds,   setSelectedAdIds]   = useState([]);
  const [reportLevel, setReportLevel] = useState('campaigns');

  // Date ranges: primary always present, secondary optional (comparison)
  const [dateRange, setDateRange] = useState(() => {
    const lm = lastMonth(); return { start: lm.start, end: lm.end };
  });
  const [compareDateEnabled, setCompareDateEnabled] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState(() => {
    // Default to the period before primary
    const lm = lastMonth();
    return previousRangeFor(lm.start, lm.end);
  });

  // Layout mode for multi-cell reports
  // 'primary' = primary + reference deltas (one main story)
  // 'sideby'  = equal columns per cell
  const [layoutMode, setLayoutMode] = useState('sideby');

  const [fxRate, setFxRate] = useState('18.5');
  const [fxMode, setFxMode] = useState('usd-zar'); // 'usd-only' | 'usd-zar' | 'usd-kes'
  const [currency, setCurrency] = useState('R');

  // Custom metrics list used when Objective = 'combined'
  const [combinedMetrics, setCombinedMetrics] = useState(DEFAULT_COMBINED_METRICS);

  // ── Loading / error state ──
  const [loadingAccounts,  setLoadingAccounts]  = useState(false);
  const [loadingGroups,    setLoadingGroups]    = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAds,       setLoadingAds]       = useState(false);
  const [loadingReport,    setLoadingReport]    = useState(false);
  const [fetchError,       setFetchError]       = useState(null);

  // ── Report data ──
  // Multi-cell model: each cell is one (account × dateRange) result from /api/analytics
  // For backward compat with the legacy 1-account flow, cells.length can be 1
  const [cells, setCells] = useState([]);  // [{id, accountId, accountName, dateRange, label, raw, totals, prevTotals, topCampaigns, topAds}]
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });

  // ── Configuration ──
  const [reportTitle, setReportTitle] = useState('');
  const [objective, setObjective] = useState('engagement');
  const [breakdownId, setBreakdownId] = useState('campaign');
  const [benchmarkPreset, setBenchmarkPreset] = useState('sa-median');
  const [benchmarks, setBenchmarks] = useState({ ...BENCHMARK_PRESETS['sa-median'].values });

  // ── Demographics upload ──
  const [showDemoUpload, setShowDemoUpload] = useState(false);
  const [demographics, setDemographics] = useState(null);
  const [demoError, setDemoError] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  // ── AI narrative ──
  const [narrative, setNarrative] = useState({ execSummary:'', whatsWorking:'', whatsNotWorking:'', recommendations:'' });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  // ── Export toast ──
  const [exportToast, setExportToast] = useState(null);

  /* ── Initial accounts load ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAccounts(true);
      try {
        const res = await fetch('/api/accounts');
        if (!res.ok) throw new Error('Could not load accounts');
        const data = await res.json();
        if (!cancelled) setAccounts(data || []);
      } catch (e) { if (!cancelled) setFetchError(e.message); }
      finally { if (!cancelled) setLoadingAccounts(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── When account selection changes ──
     Groups/campaigns/ads pickers only apply when exactly ONE account is selected.
     With multiple accounts, the report is always at account level. */
  useEffect(() => {
    if (selectedAcctIds.length !== 1) {
      setCampaignGroups([]); setCampaigns([]); setAds([]);
      setSelectedGroupIds([]); setSelectedCampIds([]); setSelectedAdIds([]);
      if (selectedAcctIds.length > 1 && reportLevel !== 'account') {
        setReportLevel('account');
      }
      return;
    }
    const acctId = selectedAcctIds[0];
    let cancelled = false;
    (async () => {
      setLoadingGroups(true); setLoadingCampaigns(true);
      try {
        const [gRes, cRes] = await Promise.all([
          fetch('/api/campaigngroups', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accountIds: [acctId] }) }),
          fetch('/api/campaigns',      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accountIds: [acctId] }) }),
        ]);
        if (!cancelled) {
          if (gRes.ok) setCampaignGroups(await gRes.json() || []);
          if (cRes.ok) setCampaigns(await cRes.json() || []);
        }
      } catch (e) { if (!cancelled) setFetchError(e.message); }
      finally { if (!cancelled) { setLoadingGroups(false); setLoadingCampaigns(false); } }
    })();
    return () => { cancelled = true; };
  }, [selectedAcctIds, reportLevel]);

  /* ── When campaigns selected, load ads ── */
  useEffect(() => {
    if (!selectedCampIds.length) { setAds([]); setSelectedAdIds([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingAds(true);
      try {
        const res = await fetch('/api/ads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ campaignIds: selectedCampIds }) });
        if (!cancelled && res.ok) setAds(await res.json() || []);
      } catch { /* non-blocking */ }
      finally { if (!cancelled) setLoadingAds(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedCampIds]);

  /* ── Load report data from /api/analytics ──
     Builds a list of (account × dateRange) combinations and fires them
     in parallel. Each result becomes one "cell" in the report. */
  const loadReportData = useCallback(async () => {
    if (!selectedAcctIds.length) { setFetchError('Select at least one account.'); return; }

    // Build the cell list: every account × every date range
    const dateRanges = [{ label: 'Primary', range: dateRange }];
    if (compareDateEnabled) dateRanges.push({ label: 'Comparison', range: compareDateRange });

    const cellSpecs = [];
    for (const acctId of selectedAcctIds) {
      const acc = accounts.find(a => String(a.id) === String(acctId));
      const accName = acc?.name || `Account ${acctId}`;
      for (const dr of dateRanges) {
        cellSpecs.push({
          id: `${acctId}__${dr.range.start}_${dr.range.end}`,
          accountId: acctId,
          accountName: accName,
          dateRange: dr.range,
          dateLabel: dr.label,
          label: dateRanges.length > 1
            ? `${accName} · ${dr.label} (${dr.range.start} → ${dr.range.end})`
            : accName,
        });
      }
    }

    setLoadingReport(true); setFetchError(null);
    setLoadProgress({ done: 0, total: cellSpecs.length });

    // Fire one fetch per cell, in parallel.
    let done = 0;
    const results = await Promise.all(cellSpecs.map(async (spec) => {
      try {
        const payload = {
          accountIds: [spec.accountId],
          currentRange:  { start: spec.dateRange.start, end: spec.dateRange.end },
          previousRange: previousRangeFor(spec.dateRange.start, spec.dateRange.end),
          exchangeRate:  fxMode === 'usd-only' ? 1 : (parseFloat(fxRate) || 18.5),
        };
        // Per-entity scoping only when ONE account selected (otherwise no shared meaning)
        if (selectedAcctIds.length === 1) {
          if (reportLevel === 'groups')    payload.campaignGroupIds = selectedGroupIds.length ? selectedGroupIds : null;
          if (reportLevel === 'campaigns') payload.campaignIds      = selectedCampIds.length  ? selectedCampIds  : null;
          if (reportLevel === 'ads') {
            payload.campaignIds = selectedCampIds.length ? selectedCampIds : null;
            payload.adIds       = selectedAdIds.length   ? selectedAdIds   : null;
          }
        }
        const res = await fetch('/api/analytics', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        done++;
        setLoadProgress({ done, total: cellSpecs.length });
        return {
          ...spec,
          raw: data,
          totals:     data.current  ? normalizePeriod(data.current)  : null,
          prevTotals: data.previous ? normalizePeriod(data.previous) : null,
          topCampaigns: (data.topCampaigns || []).map(normalizeEntity).filter(Boolean),
          topAds:       (data.topAds       || []).map(normalizeEntity).filter(Boolean),
        };
      } catch (e) {
        done++;
        setLoadProgress({ done, total: cellSpecs.length });
        return { ...spec, error: e.message };
      }
    }));

    setLoadingReport(false);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length === results.length) {
      setFetchError(`All ${errors.length} requests failed. ${errors[0].error}`);
      setCells([]);
      return;
    } else if (errors.length) {
      setFetchError(`${errors.length} of ${results.length} requests failed — showing partial results.`);
    }

    setCells(results.filter(r => !r.error));

    // Auto-fill the report title if blank
    if (!reportTitle) {
      const accNames = [...new Set(selectedAcctIds.map(id => accounts.find(a => String(a.id) === String(id))?.name).filter(Boolean))];
      const accLabel = accNames.length === 1 ? accNames[0] : accNames.length === 2 ? `${accNames[0]} vs ${accNames[1]}` : `${accNames.length} accounts`;
      const dateLabel = compareDateEnabled
        ? `${dateRange.start} to ${dateRange.end} vs ${compareDateRange.start} to ${compareDateRange.end}`
        : `${dateRange.start} to ${dateRange.end}`;
      setReportTitle(`${accLabel} – ${dateLabel}`);
    }
  }, [selectedAcctIds, dateRange, compareDateEnabled, compareDateRange, fxRate, fxMode, reportLevel, selectedGroupIds, selectedCampIds, selectedAdIds, accounts, reportTitle]);

  /* ── Demographics upload ── */
  const handleDemoUpload = useCallback(async (file) => {
    if (!file) return;
    setDemoLoading(true); setDemoError(null);
    try {
      const parsed = await parseDemographicsFile(file);
      setDemographics(parsed);
    } catch (e) { setDemoError(e.message || String(e)); }
    finally { setDemoLoading(false); }
  }, []);

  /* ── Derived: a "primary cell" is the first one — used for the single-cell summary
     and as the basis for the AI narrative and old-style single-account views.
     Multi-cell rendering iterates over `cells` directly. */
  const primaryCell = useMemo(() => cells[0] || null, [cells]);
  const totals     = useMemo(() => primaryCell?.totals     || null, [primaryCell]);
  const prevTotals = useMemo(() => primaryCell?.prevTotals || null, [primaryCell]);
  const isMultiCell = cells.length > 1;

  /* ── Breakdown rows ──
     For each cell we have `topCampaigns` and `topAds` arrays.
     We want to produce ONE row per entity (campaign/ad), with each cell's
     metrics for that entity as nested data: row.cellMetrics[cellId] = {ctr, ...}.

     If the user filtered to specific IDs in the picker, only those entities appear.
     Otherwise, fall back to the union of every cell's top-N entries. */
  const breakdownRows = useMemo(() => {
    if (!cells.length) return [];

    // Build per-cell entity lookup tables
    const cellEntityMaps = cells.map(cell => {
      const map = new Map();
      const src = breakdownId === 'ad'
        ? (cell.topAds?.length ? cell.topAds : [])
        : breakdownId === 'campaign'
          ? (cell.topCampaigns || [])
          : [];
      for (const e of src) map.set(String(e.id), e);
      return map;
    });

    if (breakdownId === 'date') {
      // Date mode: one row per cell, showing its current totals + delta vs previous
      return cells.map((c) => ({
        id: c.id,
        name: c.label,
        primary: c.totals || {},
        cellMetrics: { [c.id]: c.totals || {} },
      }));
    }

    // Build the set of entity IDs to show
    let entityIds = [];
    const filterIds = breakdownId === 'ad' ? selectedAdIds : selectedCampIds;

    if (filterIds && filterIds.length) {
      // User explicitly filtered — show those entities
      entityIds = [...filterIds];
    } else {
      // No filter — fall back to union of top-N from all cells, deduped
      const seen = new Set();
      for (const map of cellEntityMaps) {
        for (const id of map.keys()) {
          if (!seen.has(id)) { seen.add(id); entityIds.push(id); }
        }
      }
    }

    // For each entity, gather its metrics from each cell
    const rows = entityIds.map(id => {
      const cellMetrics = {};
      let name = `ID ${id}`;
      let primaryImpressions = 0;
      let primary = null;
      for (let i = 0; i < cells.length; i++) {
        const entity = cellEntityMaps[i].get(String(id));
        if (entity) {
          cellMetrics[cells[i].id] = entity;
          if (entity.name) name = entity.name;
          if (i === 0) {
            primary = entity;
            primaryImpressions = entity.impressions || 0;
          } else if (!primary) {
            // primary cell has no data for this entity — use first available
            primary = entity;
            primaryImpressions = entity.impressions || 0;
          }
        }
      }
      // If not even in the API response, look up name from the campaigns/ads list
      if (name === `ID ${id}`) {
        const lookup = breakdownId === 'ad' ? ads : campaigns;
        const found = lookup.find(x => String(x.id) === String(id));
        if (found?.name) name = found.name;
      }
      return { id, name, cellMetrics, primary: primary || {}, _sortKey: primaryImpressions };
    });

    // Sort by primary cell impressions, desc
    rows.sort((a, b) => b._sortKey - a._sortKey);
    return rows;
  }, [cells, breakdownId, selectedAdIds, selectedCampIds, ads, campaigns]);

  /* ── Legacy single-row group view (kept for AI prompt / export — primary cell only) ── */
  const groups = useMemo(() => {
    return breakdownRows.map(r => ({
      id: r.id,
      name: r.name,
      ...(r.primary || {}),
    }));
  }, [breakdownRows]);

  /* ── AI narrative ── */
  const generateNarrative = useCallback(async () => {
    if (!totals) return;
    setGeneratingAI(true); setAiError(null);
    try {
      const prompt = buildAIPrompt({
        objective, breakdownId, cells, primaryCell, isMultiCell, layoutMode,
        demographics, benchmarks, currency, metricKeys,
      });
      const res = await fetch('/api/ai-recommendations', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`AI API returned ${res.status}`);
      const data = await res.json();
      setNarrative(parseAIResponse(data.text || ''));
    } catch (e) { setAiError(e.message); }
    finally { setGeneratingAI(false); }
  }, [totals, cells, primaryCell, isMultiCell, layoutMode, demographics, benchmarks, currency, objective, breakdownId]);

  /* ── Auto-generate AI narrative once data first appears ── */
  useEffect(() => {
    if (totals && !narrative.execSummary && !generatingAI) generateNarrative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals]);

  /* ── Export ── */
  const exportReport = (mode) => {
    if (!totals) return;
    const html = buildExportHTML({
      title: reportTitle || 'LinkedIn Campaign Report',
      objective, breakdownId, cells, primaryCell, isMultiCell, layoutMode,
      demographics, benchmarks, narrative, currency, metricKeys, breakdownRows,
    });
    if (mode === 'copy') {
      navigator.clipboard.writeText(html).then(() => {
        setExportToast('HTML copied to clipboard');
        setTimeout(() => setExportToast(null), 2500);
      });
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(reportTitle||'report').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${today()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const applyBenchmarkPreset = (k) => {
    setBenchmarkPreset(k);
    setBenchmarks({ ...BENCHMARK_PRESETS[k].values });
  };

  const metricKeys = objective === 'combined' ? combinedMetrics : OBJECTIVES[objective].metrics;

  /* ====================================================================
     RENDER
     ==================================================================== */

  return (
    <div className="text-slate-200">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Layers className="w-6 h-6" style={{ color: '#F6DC4E' }} />
          Custom Report Builder
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pull LinkedIn campaign data, configure breakdowns and benchmarks, and generate a client-ready report.
        </p>
      </div>

      {/* ─────────── SCOPE / FILTERS ─────────── */}
      <Card className="p-6 mb-4">
        <SectionHeader icon={Filter} title="Scope & Filters" subtitle="Choose what to include in the report" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-1">
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>
              Accounts {selectedAcctIds.length > 0 && <span style={{ color:'#F6DC4E' }}>· {selectedAcctIds.length} selected</span>}
            </label>
            {loadingAccounts
              ? <div className="px-3 py-2 text-sm text-slate-400 rounded-lg border border-slate-600" style={{ background:'#0a1530' }}>Loading accounts…</div>
              : <MultiSelect items={accounts} selected={selectedAcctIds} onChange={setSelectedAcctIds}
                             placeholder={`Search ${accounts.length} accounts…`} />
            }
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Date Range</label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={compareDateEnabled} onChange={e => setCompareDateEnabled(e.target.checked)} className="rounded" />
                <span>Compare to another date range</span>
              </label>
            </div>
            <div className={`grid gap-2 ${compareDateEnabled ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                {compareDateEnabled && <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Primary</div>}
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
              {compareDateEnabled && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Comparison</div>
                  <DateRangePicker value={compareDateRange} onChange={setCompareDateRange} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Currency Conversion</label>
            <div className="flex gap-1 rounded-lg border border-slate-700/50 p-1" style={{ background:'#0a1530' }}>
              {[
                { id: 'usd-only', label: 'USD only',     curr: '$', rate: '1' },
                { id: 'usd-zar',  label: 'USD → ZAR',    curr: 'R', rate: '18.5' },
                { id: 'usd-kes',  label: 'USD → KES',    curr: 'KSh', rate: '130' },
              ].map(m => (
                <button key={m.id} onClick={() => {
                  setFxMode(m.id);
                  setCurrency(m.curr);
                  if (m.id !== 'usd-only') setFxRate(m.rate);
                }}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-all"
                  style={fxMode === m.id
                    ? { background: '#F6DC4E', color: '#0e1034' }
                    : { background: 'transparent', color: '#cbd5e1' }}>
                  {m.label}
                </button>
              ))}
            </div>
            {fxMode !== 'usd-only' && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Rate:</span>
                <input type="number" step="0.01" value={fxRate} onChange={e => setFxRate(e.target.value)}
                       className="w-24 px-2 py-1 rounded border border-slate-600"
                       style={{ background: '#0a1530', color: '#fff' }} />
                <span className="text-slate-500">$1 = {currency}{fxRate}</span>
              </div>
            )}
          </div>
          {selectedAcctIds.length >= 2 && (
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Comparison Layout</label>
              <div className="flex gap-2">
                {[
                  { id: 'sideby',  label: 'Side-by-side' },
                  { id: 'primary', label: 'Primary + Reference' },
                ].map(l => (
                  <button key={l.id} onClick={() => setLayoutMode(l.id)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                          style={layoutMode === l.id
                            ? { background:'rgba(246,220,78,0.15)', borderColor:'#F6DC4E', color:'#F6DC4E' }
                            : { background:'transparent', borderColor:'#334155', color:'#cbd5e1' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedAcctIds.length === 1 && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Report Level</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id:'account',   label:'Whole Account' },
                { id:'groups',    label:'Campaign Groups' },
                { id:'campaigns', label:'Campaigns' },
                { id:'ads',       label:'Ads' },
              ].map(l => (
                <button key={l.id} onClick={() => setReportLevel(l.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all"
                        style={reportLevel === l.id
                          ? { background:'rgba(246,220,78,0.15)', borderColor:'#F6DC4E', color:'#F6DC4E' }
                          : { background:'transparent', borderColor:'#334155', color:'#cbd5e1' }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedAcctIds.length > 1 && (
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background:'rgba(246,220,78,0.05)', border:'1px solid rgba(246,220,78,0.2)', color:'#cbd5e1' }}>
            Multiple accounts selected — the report runs at account level. Pick a single account to drill down to campaign groups / campaigns / ads.
          </div>
        )}

        {selectedAcctIds.length === 1 && reportLevel === 'groups' && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Campaign Groups · {loadingGroups ? 'loading…' : `${campaignGroups.length} available`}</label>
            <MultiSelect items={campaignGroups} selected={selectedGroupIds} onChange={setSelectedGroupIds} placeholder="Search groups…" />
          </div>
        )}
        {selectedAcctIds.length === 1 && (reportLevel === 'campaigns' || reportLevel === 'ads') && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Campaigns · {loadingCampaigns ? 'loading…' : `${campaigns.length} available`}</label>
            <MultiSelect items={campaigns} selected={selectedCampIds} onChange={setSelectedCampIds} placeholder="Search campaigns…" />
          </div>
        )}
        {selectedAcctIds.length === 1 && reportLevel === 'ads' && selectedCampIds.length > 0 && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Ads · {loadingAds ? 'loading…' : `${ads.length} available`}</label>
            <MultiSelect items={ads} selected={selectedAdIds} onChange={setSelectedAdIds} placeholder="Search ads…" />
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button onClick={loadReportData} disabled={!selectedAcctIds.length || loadingReport}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: '#F6DC4E', color: '#0e1034' }}>
            {loadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loadingReport
              ? loadProgress.total > 1
                ? `Loading… ${loadProgress.done}/${loadProgress.total}`
                : 'Loading from LinkedIn…'
              : selectedAcctIds.length > 1 || compareDateEnabled
                ? `Load Report Data (${selectedAcctIds.length} accounts × ${compareDateEnabled ? 2 : 1} date${compareDateEnabled ? 's' : ''})`
                : 'Load Report Data'}
          </button>
          {fetchError && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#fecaca' }}>
              <AlertCircle className="w-4 h-4" /> {fetchError}
            </div>
          )}
        </div>
      </Card>

      {/* ─────────── CONFIGURATION ─────────── */}
      {totals && (
        <Card className="p-6 mb-4">
          <SectionHeader icon={Settings} title="Report Configuration" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Report Title</label>
              <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border border-slate-600 text-sm"
                     style={{ background: '#0a1530', color: '#fff' }} />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Objective</label>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {Object.entries(OBJECTIVES).map(([id, o]) => (
                <button key={id} onClick={() => setObjective(id)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                        style={objective === id
                          ? { background:'rgba(246,220,78,0.15)', borderColor:'#F6DC4E', color:'#F6DC4E' }
                          : { background:'transparent', borderColor:'#334155', color:'#cbd5e1' }}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{OBJECTIVES[objective].description}</p>

            {objective === 'combined' && (
              <div className="mt-3 p-4 rounded-lg border border-slate-700/50" style={{ background: 'rgba(10,21,48,0.4)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-wider" style={{ color: '#F6DC4E' }}>Pick your metrics</div>
                  <div className="flex gap-1">
                    <button onClick={() => setCombinedMetrics([...PICKABLE_METRICS])}
                            className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white">
                      Select all
                    </button>
                    <button onClick={() => setCombinedMetrics([])}
                            className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PICKABLE_METRICS.map(m => {
                    const checked = combinedMetrics.includes(m);
                    return (
                      <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-700/30">
                        <input type="checkbox" checked={checked}
                               onChange={() => {
                                 if (checked) setCombinedMetrics(combinedMetrics.filter(x => x !== m));
                                 else setCombinedMetrics([...combinedMetrics, m]);
                               }}
                               className="rounded" />
                        <span className="text-xs text-slate-200">{METRIC_DEFS[m].label}</span>
                      </label>
                    );
                  })}
                </div>
                {combinedMetrics.length === 0 && (
                  <div className="mt-2 text-xs" style={{ color: '#fecaca' }}>
                    Select at least one metric to show in the report.
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-500">
                  {combinedMetrics.length} metric{combinedMetrics.length === 1 ? '' : 's'} selected. Order in the report follows the order shown above.
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Breakdown</label>
            <div className="flex flex-wrap gap-2">
              {BREAKDOWNS.map(b => (
                <button key={b.id} onClick={() => setBreakdownId(b.id)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                        style={breakdownId === b.id
                          ? { background:'rgba(246,220,78,0.15)', borderColor:'#F6DC4E', color:'#F6DC4E' }
                          : { background:'transparent', borderColor:'#334155', color:'#cbd5e1' }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Benchmarks</label>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(BENCHMARK_PRESETS).map(([k, p]) => (
                  <button key={k} onClick={() => applyBenchmarkPreset(k)}
                          className="text-xs px-2 py-1 rounded border"
                          style={benchmarkPreset === k
                            ? { borderColor:'#F6DC4E', color:'#F6DC4E', background:'rgba(246,220,78,0.08)' }
                            : { borderColor:'#334155', color:'#94a3b8' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricKeys.map(m => {
                const def = METRIC_DEFS[m];
                if (def.higherIsBetter === null) return null;
                return (
                  <div key={m}>
                    <div className="text-xs text-slate-300 mb-1">{def.label}</div>
                    <input type="number" step="any"
                           value={benchmarks[m] ?? ''}
                           onChange={e => setBenchmarks({ ...benchmarks, [m]: e.target.value === '' ? null : Number(e.target.value) })}
                           placeholder={def.format === 'pct' ? 'e.g. 0.0044' : def.format === 'cur' ? 'e.g. 4.76' : ''}
                           className="w-full px-2 py-1.5 rounded border border-slate-600 text-sm"
                           style={{ background: '#0a1530', color: '#fff' }} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">Rates as decimals (0.0044 = 0.44%). Leave blank to skip.</p>
          </div>
        </Card>
      )}

      {/* ─────────── PROFESSIONAL DEMOGRAPHICS (optional) ─────────── */}
      {totals && (
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" style={{ color: '#F6DC4E' }} />
              <div>
                <h3 className="text-base font-semibold text-white">Professional Demographics</h3>
                <p className="text-xs text-slate-400">Optional · Upload Campaign Manager's demographic export to add audience/geo breakdowns</p>
              </div>
            </div>
            <button onClick={() => setShowDemoUpload(!showDemoUpload)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor:'#334155', color:'#cbd5e1' }}>
              {showDemoUpload ? 'Hide' : (demographics ? 'Edit' : '+ Add demographic data')}
            </button>
          </div>

          {showDemoUpload && (
            <div className="mt-4">
              <DemoUploader
                value={demographics}
                onUpload={handleDemoUpload}
                onClear={() => setDemographics(null)}
                loading={demoLoading}
                error={demoError}
              />
            </div>
          )}

          {!showDemoUpload && demographics && (
            <div className="mt-3 text-xs text-slate-400">
              ✓ {demographics.fileName} loaded · breakdown by <span style={{ color: '#F6DC4E' }}>{demographics.dimension}</span> · {demographics.rows.length} rows
            </div>
          )}
        </Card>
      )}

      {/* ─────────── REPORT OUTPUT ─────────── */}
      {totals && (
        <>
          {!isMultiCell ? (
            <Card className="p-6 mb-4">
              <SectionHeader icon={TrendingUp} title="Performance Totals"
                subtitle={prevTotals ? 'vs. previous period (LinkedIn auto-comparison)' : undefined} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {metricKeys.map(m => {
                  const delta = prevTotals ? fmtDelta(totals[m], prevTotals[m], m) : null;
                  const rating = benchmarks[m] != null ? rateValue(m, totals[m], benchmarks[m]) : null;
                  const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                  return (
                    <div key={m} className="p-3 rounded-lg border border-slate-700/50"
                         style={{ background:'rgba(10,21,48,0.5)' }}>
                      <div className="text-xs text-slate-400">{METRIC_DEFS[m].label} {dot}</div>
                      <div className="text-xl font-bold text-white mt-1">{fmtMetric(m, totals[m], currency)}</div>
                      {delta && (
                        <div className="text-xs mt-1"
                             style={{ color: delta.good === true ? '#22c55e' : delta.good === false ? '#ef4444' : '#94a3b8' }}>
                          {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'} {Math.abs(delta.pct).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-4">
              <SectionHeader icon={TrendingUp} title="Performance Totals — Comparison"
                subtitle={`${cells.length} cells · ${layoutMode === 'sideby' ? 'Side-by-side' : 'Primary + Reference'}`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0a1530' }}>
                      <th className="text-left p-3 font-semibold" style={{ color: '#F6DC4E' }}>Metric</th>
                      {cells.map((c, i) => (
                        <th key={c.id} className="text-right p-3 font-semibold text-xs"
                            style={{ color: i === 0 && layoutMode === 'primary' ? '#F6DC4E' : '#cbd5e1' }}>
                          {c.label}
                          {i === 0 && layoutMode === 'primary' && <div className="text-[10px] opacity-70">PRIMARY</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map(m => (
                      <tr key={m}>
                        <td className="p-3 font-medium text-slate-300">{METRIC_DEFS[m].label}</td>
                        {cells.map((c, i) => {
                          const v = c.totals?.[m];
                          const rating = benchmarks[m] != null ? rateValue(m, v, benchmarks[m]) : null;
                          const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                          // In primary mode, show delta vs primary cell on non-primary cells
                          let deltaEl = null;
                          if (layoutMode === 'primary' && i > 0) {
                            const primVal = cells[0].totals?.[m];
                            const delta = fmtDelta(v, primVal, m);
                            if (delta) {
                              deltaEl = (
                                <div className="text-[10px] mt-0.5"
                                     style={{ color: delta.good === true ? '#22c55e' : delta.good === false ? '#ef4444' : '#94a3b8' }}>
                                  {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'} {Math.abs(delta.pct).toFixed(1)}% vs primary
                                </div>
                              );
                            }
                          }
                          return (
                            <td key={c.id} className="text-right p-3"
                                style={{ background: i === 0 && layoutMode === 'primary' ? 'rgba(246,220,78,0.05)' : 'transparent' }}>
                              <div className="font-semibold text-white">{fmtMetric(m, v, currency)} {dot && <span className="text-xs">{dot}</span>}</div>
                              {deltaEl}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {breakdownRows.length > 0 && (
            <Card className="p-6 mb-4">
              <SectionHeader icon={BarChart3} title={BREAKDOWNS.find(b => b.id === breakdownId)?.label}
                subtitle={isMultiCell
                  ? `${breakdownRows.length} ${breakdownId === 'ad' ? 'ads' : 'campaigns'} across ${cells.length} cells${(breakdownId === 'campaign' && selectedCampIds.length) || (breakdownId === 'ad' && selectedAdIds.length) ? ' (filtered)' : ' (top by impressions)'}`
                  : `${breakdownRows.length} ${breakdownId === 'date' ? 'periods' : breakdownId === 'ad' ? 'ads' : 'campaigns'}${(breakdownId === 'campaign' && selectedCampIds.length) || (breakdownId === 'ad' && selectedAdIds.length) ? ' (filtered)' : ''}`} />
              <div className="overflow-x-auto">
                {!isMultiCell || breakdownId === 'date' ? (
                  /* Single-cell OR date breakdown: simple flat table */
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#0a1530' }}>
                        <th className="text-left p-3 font-semibold" style={{ color: '#F6DC4E' }}>
                          {breakdownId === 'date' ? 'Period' : 'Name'}
                        </th>
                        {metricKeys.map(m => (
                          <th key={m} className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>{METRIC_DEFS[m].label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {breakdownRows.slice(0, 30).map((r, i) => (
                        <tr key={r.id || i} style={{ background: i % 2 === 0 ? 'rgba(10,21,48,0.3)' : 'transparent' }}>
                          <td className="p-3 font-medium text-white">{r.name}</td>
                          {metricKeys.map(m => {
                            const v = (r.primary || {})[m];
                            const rating = benchmarks[m] != null ? rateValue(m, v, benchmarks[m]) : null;
                            const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                            return (
                              <td key={m} className="text-right p-3 text-slate-200">
                                {fmtMetric(m, v, currency)} {dot && <span className="text-xs ml-1">{dot}</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* Multi-cell: nested headers — entity name × (metric · cell) */
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#0a1530' }}>
                        <th rowSpan={2} className="text-left p-3 font-semibold align-bottom" style={{ color: '#F6DC4E', minWidth: '180px' }}>Name</th>
                        {metricKeys.map(m => (
                          <th key={m} colSpan={cells.length}
                              className="text-center p-2 font-semibold border-l border-slate-700/50"
                              style={{ color: '#F6DC4E' }}>
                            {METRIC_DEFS[m].label}
                          </th>
                        ))}
                      </tr>
                      <tr style={{ background: '#0a1530' }}>
                        {metricKeys.map(m =>
                          cells.map((c, ci) => (
                            <th key={`${m}_${c.id}`}
                                className="text-right p-2 font-normal text-[10px] border-l border-slate-700/30"
                                style={{ color: '#94a3b8', minWidth: '70px' }}
                                title={c.label}>
                              {ci === 0 ? c.accountName.slice(0, 12) : c.dateLabel || c.accountName.slice(0, 12)}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {breakdownRows.slice(0, 30).map((r, i) => (
                        <tr key={r.id || i} style={{ background: i % 2 === 0 ? 'rgba(10,21,48,0.3)' : 'transparent' }}>
                          <td className="p-3 font-medium text-white">{r.name}</td>
                          {metricKeys.map(m =>
                            cells.map((c) => {
                              const cellData = r.cellMetrics[c.id];
                              const v = cellData ? cellData[m] : null;
                              const rating = benchmarks[m] != null ? rateValue(m, v, benchmarks[m]) : null;
                              const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                              return (
                                <td key={`${r.id}_${m}_${c.id}`} className="text-right p-2 text-slate-200 border-l border-slate-700/30">
                                  {v != null ? fmtMetric(m, v, currency) : '—'} {dot && <span className="text-[10px]">{dot}</span>}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}
          )}

          {demographics && demographics.rows.length > 0 && (
            <Card className="p-6 mb-4">
              <SectionHeader icon={Users} title={`By ${demographics.dimension}`}
                             subtitle="From uploaded Professional Demographics export" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0a1530' }}>
                      <th className="text-left p-3 font-semibold" style={{ color: '#F6DC4E' }}>{demographics.dimension}</th>
                      <th className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>Impressions</th>
                      <th className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>Clicks</th>
                      <th className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>CTR</th>
                      <th className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demographics.rows.slice(0, 25).map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(10,21,48,0.3)' : 'transparent' }}>
                        <td className="p-3 font-medium text-white">{r[demographics.dimension]}</td>
                        <td className="p-3 text-right text-slate-200">{(r.impressions || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-200">{(r.clicks || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-200">{r.ctr != null ? (r.ctr * 100).toFixed(2) + '%' : '—'}</td>
                        <td className="p-3 text-right text-slate-200">{r.engagementRate != null ? (r.engagementRate * 100).toFixed(2) + '%' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#F6DC4E' }} /> AI Narrative
              <span className="text-xs font-normal text-slate-400">· click any section to edit</span>
            </h2>
            <button onClick={generateNarrative} disabled={generatingAI}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background:'rgba(246,220,78,0.12)', color:'#F6DC4E', border:'1px solid #F6DC4E' }}>
              {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {generatingAI ? 'Generating…' : 'Regenerate'}
            </button>
          </div>

          {aiError && (
            <div className="mb-3 p-3 rounded-lg flex items-start gap-2"
                 style={{ background:'rgba(239,68,68,0.1)', borderLeft:'3px solid #ef4444' }}>
              <AlertCircle className="w-4 h-4 mt-0.5" style={{ color:'#ef4444' }} />
              <div className="text-sm" style={{ color:'#fecaca' }}>AI failed: {aiError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <NarrativeBlock title="Executive Summary"  accent="#F6DC4E"
              value={narrative.execSummary}    onChange={v => setNarrative({ ...narrative, execSummary: v })} />
            <NarrativeBlock title="What's Working"     accent="#22c55e"
              value={narrative.whatsWorking}   onChange={v => setNarrative({ ...narrative, whatsWorking: v })} />
            <NarrativeBlock title="What's Not Working" accent="#ef4444"
              value={narrative.whatsNotWorking} onChange={v => setNarrative({ ...narrative, whatsNotWorking: v })} />
            <NarrativeBlock title="Recommendations"    accent="#3b82f6"
              value={narrative.recommendations} onChange={v => setNarrative({ ...narrative, recommendations: v })} />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={() => exportReport('copy')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 border"
                    style={{ borderColor:'#F6DC4E', color:'#F6DC4E', background:'rgba(246,220,78,0.08)' }}>
              <Copy className="w-4 h-4" /> Copy HTML
            </button>
            <button onClick={() => exportReport('download')}
                    className="px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    style={{ background:'#F6DC4E', color:'#0e1034' }}>
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
        </>
      )}

      {exportToast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
             style={{ background: '#22c55e', color: '#fff' }}>
          <CheckCircle2 className="w-4 h-4" /> {exportToast}
        </div>
      )}
    </div>
  );
}