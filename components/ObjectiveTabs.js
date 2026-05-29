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
};

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

function buildAIPrompt({ objective, breakdownId, totals, prevTotals, groups, demographics, benchmarks, currency, periodLabel, accountName }) {
  const benchTable = Object.entries(benchmarks).filter(([, v]) => v != null)
    .map(([m, v]) => `  ${METRIC_DEFS[m]?.label || m}: ${fmtMetric(m, v, currency)}`).join('\n');

  const totalsTable = OBJECTIVES[objective].metrics
    .map(m => `  ${METRIC_DEFS[m].label}: ${fmtMetric(m, totals[m], currency)}`).join('\n');

  const prevTable = prevTotals
    ? '\nPREVIOUS PERIOD:\n' + OBJECTIVES[objective].metrics
        .map(m => `  ${METRIC_DEFS[m].label}: ${fmtMetric(m, prevTotals[m], currency)}`).join('\n')
    : '';

  const groupTable = groups.slice(0, 20).map(g => {
    const metrics = OBJECTIVES[objective].metrics
      .map(m => `${METRIC_DEFS[m].label}=${fmtMetric(m, g[m], currency)}`).join(', ');
    return `  • ${g.name}: ${metrics}`;
  }).join('\n');

  const demoTable = demographics && demographics.rows.length
    ? `\n\nPROFESSIONAL DEMOGRAPHICS (${demographics.dimension}):\n` +
      demographics.rows.slice(0, 15).map(r => {
        const m = `Imp=${(r.impressions||0).toLocaleString()}, Clicks=${(r.clicks||0).toLocaleString()}, CTR=${((r.ctr||0)*100).toFixed(2)}%`;
        return `  • ${r[demographics.dimension]}: ${m}`;
      }).join('\n')
    : '';

  const breakdownLabel = BREAKDOWNS.find(b => b.id === breakdownId)?.label || breakdownId;

  return `You are a senior performance marketing analyst at Turn Left Media writing a LinkedIn campaign report for a client. The campaign objective is ${OBJECTIVES[objective].label}. Breakdown: ${breakdownLabel}.${periodLabel ? ` Period: ${periodLabel}.` : ''}${accountName ? ` Account: ${accountName}.` : ''}

CAMPAIGN TOTALS (current period):
${totalsTable}
${prevTable}

BENCHMARKS:
${benchTable || '  (none set)'}

PER-GROUP PERFORMANCE (${breakdownLabel}):
${groupTable || '  (none)'}
${demoTable}

Respond with EXACTLY four sections in this format, with NO other preamble or commentary:

===EXEC_SUMMARY===
2-3 sentences. Lead with the strongest finding. Call out a specific number.

===WHATS_WORKING===
4-6 bullets, each starting with "—". Cite specific metrics with values. Compare to benchmarks where relevant.

===WHATS_NOT_WORKING===
2-4 bullets, each starting with "—". Be diplomatic but honest.

===RECOMMENDATIONS===
3-5 actionable recommendations. Each starts with a short action verb followed by ":" then the recommendation.

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

function buildExportHTML({ title, periodLabel, objective, breakdownId, totals, prevTotals, groups, demographics, benchmarks, narrative, currency, accountName }) {
  const breakdownLabel = BREAKDOWNS.find(b => b.id === breakdownId)?.label || '';
  const objLabel = OBJECTIVES[objective].label;
  const metricKeys = OBJECTIVES[objective].metrics;

  const totalsRows = metricKeys.map(m => {
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

  const benchRows = metricKeys.filter(m => benchmarks[m] != null).map(m => {
    const rating = rateValue(m, totals[m], benchmarks[m]);
    const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${METRIC_DEFS[m].label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0e1034;">${fmtMetric(m,totals[m],currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#475569;">${fmtMetric(m,benchmarks[m],currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${dot}</td>
      </tr>`;
  }).join('');

  const groupHeaders = metricKeys.map(m =>
    `<th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:right;">${METRIC_DEFS[m].label}</th>`).join('');

  const groupRows = groups.slice(0, 30).map(g => {
    const cells = metricKeys.map(m =>
      `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${fmtMetric(m,g[m],currency)}</td>`).join('');
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;">${escapeHtml(g.name)}</td>
        ${cells}
      </tr>`;
  }).join('');

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

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:30px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#0e1034;">
<div style="max-width:920px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#0e1034;color:#fff;padding:30px;">
    <div style="font-size:22px;font-weight:700;">${escapeHtml(title)}</div>
    <div style="font-size:13px;color:#F6DC4E;margin-top:6px;">${escapeHtml(periodLabel||'')} · ${escapeHtml(accountName||'')} · Objective: ${escapeHtml(objLabel)} · ${escapeHtml(breakdownLabel)}</div>
  </div>

  <div style="padding:25px 30px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">📈 Executive Summary</h2>
    <div style="color:#444;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(narrative.execSummary)}</div>
  </div>

  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">📊 Performance Totals</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">
      <tbody>${totalsRows}</tbody>
    </table>
  </div>

  ${benchRows ? `
  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🎯 Benchmark Comparison</h2>
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

  ${groupRows ? `
  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🔍 ${escapeHtml(breakdownLabel)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
      <thead><tr>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">Name</th>
        ${groupHeaders}
      </tr></thead>
      <tbody>${groupRows}</tbody>
    </table>
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
  const [selectedAcctId, setSelectedAcctId] = useState('');
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [ads, setAds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [selectedCampIds, setSelectedCampIds] = useState([]);
  const [selectedAdIds,   setSelectedAdIds]   = useState([]);
  const [reportLevel, setReportLevel] = useState('campaigns');
  const [dateRange, setDateRange] = useState(() => {
    const lm = lastMonth();
    return { start: lm.start, end: lm.end };
  });
  const [fxRate, setFxRate] = useState('18.5');
  const [currency, setCurrency] = useState('R');

  // ── Loading / error state ──
  const [loadingAccounts,  setLoadingAccounts]  = useState(false);
  const [loadingGroups,    setLoadingGroups]    = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAds,       setLoadingAds]       = useState(false);
  const [loadingReport,    setLoadingReport]    = useState(false);
  const [fetchError,       setFetchError]       = useState(null);

  // ── Report data ──
  const [reportData, setReportData] = useState(null);

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

  /* ── When account changes, load campaign groups + campaigns ── */
  useEffect(() => {
    if (!selectedAcctId) {
      setCampaignGroups([]); setCampaigns([]); setAds([]);
      setSelectedGroupIds([]); setSelectedCampIds([]); setSelectedAdIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingGroups(true); setLoadingCampaigns(true);
      try {
        const [gRes, cRes] = await Promise.all([
          fetch('/api/campaigngroups', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accountIds: [selectedAcctId] }) }),
          fetch('/api/campaigns',      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accountIds: [selectedAcctId] }) }),
        ]);
        if (!cancelled) {
          if (gRes.ok) setCampaignGroups(await gRes.json() || []);
          if (cRes.ok) setCampaigns(await cRes.json() || []);
        }
      } catch (e) { if (!cancelled) setFetchError(e.message); }
      finally { if (!cancelled) { setLoadingGroups(false); setLoadingCampaigns(false); } }
    })();
    return () => { cancelled = true; };
  }, [selectedAcctId]);

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

  /* ── Load report data from /api/analytics ── */
  const loadReportData = useCallback(async () => {
    if (!selectedAcctId) { setFetchError('Select an account first.'); return; }
    setLoadingReport(true); setFetchError(null);
    try {
      const payload = {
        accountIds: [selectedAcctId],
        currentRange:  { start: dateRange.start, end: dateRange.end },
        previousRange: previousRangeFor(dateRange.start, dateRange.end),
        exchangeRate:  parseFloat(fxRate) || 18.5,
      };
      if (reportLevel === 'groups')    payload.campaignGroupIds = selectedGroupIds.length ? selectedGroupIds : null;
      if (reportLevel === 'campaigns') payload.campaignIds      = selectedCampIds.length  ? selectedCampIds  : null;
      if (reportLevel === 'ads') {
        payload.campaignIds = selectedCampIds.length ? selectedCampIds : null;
        payload.adIds       = selectedAdIds.length   ? selectedAdIds   : null;
      }
      const res = await fetch('/api/analytics', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`/api/analytics returned ${res.status}`);
      const data = await res.json();
      setReportData(data);
      if (!reportTitle) {
        const acc = accounts.find(a => String(a.id) === String(selectedAcctId));
        const accName = acc?.name || 'Account';
        setReportTitle(`${accName} – ${dateRange.start} to ${dateRange.end}`);
      }
    } catch (e) { setFetchError(e.message); }
    finally { setLoadingReport(false); }
  }, [selectedAcctId, dateRange, fxRate, reportLevel, selectedGroupIds, selectedCampIds, selectedAdIds, accounts, reportTitle]);

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

  /* ── Derived: normalised totals + breakdown groups ── */
  const totals     = useMemo(() => reportData?.current  ? normalizePeriod(reportData.current)  : null, [reportData]);
  const prevTotals = useMemo(() => reportData?.previous ? normalizePeriod(reportData.previous) : null, [reportData]);

  const groups = useMemo(() => {
    if (!reportData) return [];
    if (breakdownId === 'campaign') {
      return (reportData.topCampaigns || []).map(normalizeEntity).filter(Boolean)
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    }
    if (breakdownId === 'ad') {
      return (reportData.topAds || reportData.topCampaigns || []).map(normalizeEntity).filter(Boolean)
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    }
    if (breakdownId === 'date') {
      if (!totals) return [];
      const rows = [{ id:'current', name:`Current (${dateRange.start} → ${dateRange.end})`, ...totals }];
      if (prevTotals) {
        const prev = previousRangeFor(dateRange.start, dateRange.end);
        rows.push({ id:'previous', name:`Previous (${prev.start} → ${prev.end})`, ...prevTotals });
      }
      return rows;
    }
    return [];
  }, [reportData, breakdownId, totals, prevTotals, dateRange]);

  /* ── AI narrative ── */
  const generateNarrative = useCallback(async () => {
    if (!totals) return;
    setGeneratingAI(true); setAiError(null);
    try {
      const acc = accounts.find(a => String(a.id) === String(selectedAcctId));
      const prompt = buildAIPrompt({
        objective, breakdownId, totals, prevTotals, groups,
        demographics, benchmarks, currency,
        periodLabel: `${dateRange.start} to ${dateRange.end}`,
        accountName: acc?.name,
      });
      const res = await fetch('/api/ai-recommendations', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`AI API returned ${res.status}`);
      const data = await res.json();
      setNarrative(parseAIResponse(data.text || ''));
    } catch (e) { setAiError(e.message); }
    finally { setGeneratingAI(false); }
  }, [totals, prevTotals, groups, demographics, benchmarks, currency, dateRange, objective, breakdownId, accounts, selectedAcctId]);

  /* ── Auto-generate AI narrative once data first appears ── */
  useEffect(() => {
    if (totals && !narrative.execSummary && !generatingAI) generateNarrative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals]);

  /* ── Export ── */
  const exportReport = (mode) => {
    if (!totals) return;
    const acc = accounts.find(a => String(a.id) === String(selectedAcctId));
    const html = buildExportHTML({
      title: reportTitle || 'LinkedIn Campaign Report',
      periodLabel: `${dateRange.start} to ${dateRange.end}`,
      objective, breakdownId, totals, prevTotals, groups,
      demographics, benchmarks, narrative, currency,
      accountName: acc?.name,
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

  const metricKeys = OBJECTIVES[objective].metrics;

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
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Account</label>
            <select value={selectedAcctId} onChange={e => setSelectedAcctId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 text-sm"
                    style={{ background: '#0a1530', color: '#fff' }}>
              <option value="">{loadingAccounts ? 'Loading…' : `Select account (${accounts.length} available)`}</option>
              {accounts.map(a => (
                <option key={a.id} value={String(a.id)}>{a.name} · {a.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Date Range</label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>USD → ZAR rate</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={fxRate} onChange={e => setFxRate(e.target.value)}
                     className="flex-1 px-3 py-2 rounded-lg border border-slate-600 text-sm"
                     style={{ background: '#0a1530', color: '#fff' }} />
              <input type="text" value={currency} onChange={e => setCurrency(e.target.value)}
                     className="w-14 px-2 py-2 rounded-lg border border-slate-600 text-sm text-center"
                     style={{ background: '#0a1530', color: '#fff' }} title="Currency symbol" />
            </div>
          </div>
        </div>

        {selectedAcctId && (
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

        {selectedAcctId && reportLevel === 'groups' && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Campaign Groups · {loadingGroups ? 'loading…' : `${campaignGroups.length} available`}</label>
            <MultiSelect items={campaignGroups} selected={selectedGroupIds} onChange={setSelectedGroupIds} placeholder="Search groups…" />
          </div>
        )}
        {selectedAcctId && (reportLevel === 'campaigns' || reportLevel === 'ads') && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Campaigns · {loadingCampaigns ? 'loading…' : `${campaigns.length} available`}</label>
            <MultiSelect items={campaigns} selected={selectedCampIds} onChange={setSelectedCampIds} placeholder="Search campaigns…" />
          </div>
        )}
        {selectedAcctId && reportLevel === 'ads' && selectedCampIds.length > 0 && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Ads · {loadingAds ? 'loading…' : `${ads.length} available`}</label>
            <MultiSelect items={ads} selected={selectedAdIds} onChange={setSelectedAdIds} placeholder="Search ads…" />
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button onClick={loadReportData} disabled={!selectedAcctId || loadingReport}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: '#F6DC4E', color: '#0e1034' }}>
            {loadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loadingReport ? 'Loading from LinkedIn…' : 'Load Report Data'}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
          <Card className="p-6 mb-4">
            <SectionHeader icon={TrendingUp} title="Performance Totals"
              subtitle={prevTotals ? 'vs. previous period' : undefined} />
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

          {groups.length > 0 && (
            <Card className="p-6 mb-4">
              <SectionHeader icon={BarChart3} title={BREAKDOWNS.find(b => b.id === breakdownId)?.label} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0a1530' }}>
                      <th className="text-left p-3 font-semibold" style={{ color: '#F6DC4E' }}>Name</th>
                      {metricKeys.map(m => (
                        <th key={m} className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>{METRIC_DEFS[m].label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.slice(0, 30).map((g, i) => (
                      <tr key={g.id || i} style={{ background: i % 2 === 0 ? 'rgba(10,21,48,0.3)' : 'transparent' }}>
                        <td className="p-3 font-medium text-white">{g.name}</td>
                        {metricKeys.map(m => {
                          const rating = benchmarks[m] != null ? rateValue(m, g[m], benchmarks[m]) : null;
                          const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                          return (
                            <td key={m} className="text-right p-3 text-slate-200">
                              {fmtMetric(m, g[m], currency)} {dot && <span className="text-xs ml-1">{dot}</span>}
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