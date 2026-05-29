'use client';

/* ============================================================
   ObjectiveTabs.js — Custom Report Builder
   ------------------------------------------------------------
   Replaces the previous Performance-by-Objective tab.
   A 4-step builder that ingests a LinkedIn ad export and
   produces a client-ready report matching the Turn Left
   reporting style (Nedgroup / AEW2026 / City Lodge).

   Dependencies (add once):
     npm install xlsx

   No other new packages. Uses lucide-react (already present)
   and the existing /api/ai-recommendations POST route for AI narrative.
   ============================================================ */

import { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileText, Settings, Sparkles, Download, Copy,
  ChevronRight, ChevronLeft, Trash2, Plus, RefreshCw,
  CheckCircle2, AlertCircle, X, Filter, TrendingUp,
  Layers, Edit3, Loader2,
} from 'lucide-react';

/* ====================================================================
   1. CONSTANTS — objectives, metric definitions, benchmark presets
   ==================================================================== */

const OBJECTIVES = {
  engagement: {
    label: 'Engagement',
    metrics: ['ctr', 'engagementRate', 'cpm', 'cpc', 'frequency', 'reach'],
    description: 'CTR, Engagement Rate, CPM, CPC, Frequency',
  },
  website: {
    label: 'Website Visits',
    metrics: ['ctr', 'cpc', 'cpm', 'landingPageClicks', 'frequency', 'reach'],
    description: 'CTR, CPC, Landing Page Clicks',
  },
  leads: {
    label: 'Lead Generation',
    metrics: ['ctr', 'leads', 'formFillRate', 'cpl', 'engagementRate', 'frequency'],
    description: 'Leads, Form Fill Rate, CPL',
  },
  video: {
    label: 'Video Views',
    metrics: ['videoViewRate', 'videoCompletionRate', 'cpm', 'ctr', 'engagementRate', 'frequency'],
    description: 'Video View Rate, Completion Rate',
  },
  awareness: {
    label: 'Awareness / Brand',
    metrics: ['cpm', 'reach', 'frequency', 'impressions', 'ctr', 'engagementRate'],
    description: 'CPM, Reach, Frequency',
  },
};

// metric → {label, format, higherIsBetter, derivedFrom}
const METRIC_DEFS = {
  impressions:         { label: 'Impressions',          format: 'num',  higherIsBetter: true  },
  clicks:              { label: 'Clicks',               format: 'num',  higherIsBetter: true  },
  ctr:                 { label: 'CTR',                  format: 'pct',  higherIsBetter: true  },
  engagements:         { label: 'Engagements',          format: 'num',  higherIsBetter: true  },
  engagementRate:      { label: 'Engagement Rate',      format: 'pct',  higherIsBetter: true  },
  spend:               { label: 'Spend',                format: 'cur',  higherIsBetter: null  },
  cpm:                 { label: 'CPM',                  format: 'cur',  higherIsBetter: false },
  cpc:                 { label: 'CPC',                  format: 'cur',  higherIsBetter: false },
  reach:               { label: 'Reach',                format: 'num',  higherIsBetter: true  },
  frequency:           { label: 'Frequency',            format: 'dec',  higherIsBetter: null  },
  videoViewRate:       { label: 'Video View Rate',      format: 'pct',  higherIsBetter: true  },
  videoCompletionRate: { label: 'Video Completion Rate', format: 'pct', higherIsBetter: true  },
  landingPageClicks:   { label: 'Landing Page Clicks',  format: 'num',  higherIsBetter: true  },
  leads:               { label: 'Leads',                format: 'num',  higherIsBetter: true  },
  formOpens:           { label: 'Form Opens',           format: 'num',  higherIsBetter: true  },
  formFillRate:        { label: 'Form Fill Rate',       format: 'pct',  higherIsBetter: true  },
  cpl:                 { label: 'Cost per Lead',        format: 'cur',  higherIsBetter: false },
};

// Region presets — pulled from the three sample reports
const BENCHMARK_PRESETS = {
  'sa-median': {
    label: 'South Africa (Median)',
    values: { ctr: 0.0057, engagementRate: 0.0088, cpm: 4.76, cpc: 1.61, videoViewRate: 0.311, videoCompletionRate: 0.012, formFillRate: 0.1032 },
  },
  'linkedin-global': {
    label: 'LinkedIn Global (Median)',
    values: { ctr: 0.0044, engagementRate: 0.0054, cpm: 4.76, cpc: 1.61, videoViewRate: 0.311, videoCompletionRate: 0.012, formFillRate: 0.10 },
  },
  'africa': {
    label: 'Africa (AEW Benchmark)',
    values: { ctr: 0.0052, engagementRate: 0.0095, cpm: 3.50, cpc: 1.20, formFillRate: 0.1032, videoViewRate: 0.30, videoCompletionRate: 0.012 },
  },
  'europe': {
    label: 'Europe',
    values: { ctr: 0.0052, engagementRate: 0.0095, cpm: 5.50, cpc: 1.85, formFillRate: 0.08 },
  },
  'custom': {
    label: 'Custom (start blank)',
    values: {},
  },
};

const BREAKDOWNS = [
  { id: 'month',    label: 'Month / Period',    column: 'month' },
  { id: 'audience', label: 'Audience',          column: 'audience' },
  { id: 'geo',      label: 'Geo / Region',      column: 'geo' },
  { id: 'creative', label: 'Creative / Ad',     column: 'adName' },
  { id: 'objective',label: 'Ad Set Objective',  column: 'objective' },
  { id: 'adType',   label: 'Ad Type',           column: 'adType' },
];

// Column name aliases — extend freely; matching is case-insensitive and trim-insensitive
const COLUMN_ALIASES = {
  adName:              ['ad set name', 'ad name', 'campaign name', 'ad'],
  month:               ['month', 'period', 'reporting period'],
  audience:            ['audience', 'audience segment', 'target audience'],
  geo:                 ['region', 'geo', 'geo location', 'country', 'location', 'market'],
  adType:              ['ad type', 'ad format', 'format', 'creative type'],
  objective:           ['ad set objective', 'objective', 'campaign objective'],
  spend:               ['total spent', 'spend', 'total spend', 'amount spent', 'cost'],
  impressions:         ['impressions', 'imps'],
  clicks:              ['clicks', 'total clicks'],
  ctr:                 ['click through rate', 'ctr'],
  cpm:                 ['average cpm', 'cpm'],
  cpc:                 ['average cpc', 'cpc'],
  engagements:         ['total engagements', 'engagements'],
  engagementRate:      ['engagement rate', 'er'],
  reach:               ['reach', 'unique members reached'],
  frequency:           ['average frequency', 'frequency'],
  videoViewRate:       ['video view rate', 'view rate'],
  videoCompletionRate: ['video completion rate', 'completion rate', 'video completions'],
  landingPageClicks:   ['clicks to landing page', 'landing page clicks', 'lp clicks'],
  leads:               ['leads', 'total leads', 'form completions', 'form submissions'],
  formOpens:           ['form opens', 'lead form opens'],
  formFillRate:        ['form fill rate', 'form completion rate', 'lead fill rate'],
};

/* ====================================================================
   2. PARSING — XLSX / CSV → normalized rows
   ==================================================================== */

function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // raw:false makes formula cells (e.g. local-currency Total Spent = `=N7*M7`)
        // return their cached computed value rather than the formula string.
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Find the row that looks like a header — high count of recognisable column names
function findHeaderRow(rows) {
  const knownTerms = new Set();
  Object.values(COLUMN_ALIASES).flat().forEach(a => knownTerms.add(a.toLowerCase()));

  let bestIdx = 0, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    let score = 0;
    for (const cell of row) {
      if (typeof cell === 'string' && knownTerms.has(cell.trim().toLowerCase())) score++;
    }
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestScore >= 3 ? bestIdx : 0;
}

// Auto-map header row → our internal field names
function autoMapColumns(headerRow) {
  const map = {};
  if (!headerRow) return map;

  const usedIdx = new Set();
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headerRow.length; i++) {
      if (usedIdx.has(i)) continue;
      const cell = headerRow[i];
      if (typeof cell !== 'string') continue;
      const norm = cell.trim().toLowerCase();
      if (aliases.includes(norm)) {
        map[field] = i;
        usedIdx.add(i);
        break;
      }
    }
  }
  return map;
}

// Normalize audience / geo labels — trim, collapse, alias common variants
function normalizeLabel(value) {
  if (value == null) return null;
  const s = String(value).trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const lower = s.toLowerCase();

  const aliases = {
    'consumer':                    'Consumer/Individual',
    'consumer/individual':         'Consumer/Individual',
    'individual':                  'Consumer/Individual',
    'financial advisor':           'Financial Advisors',
    'financial advisors':          'Financial Advisors',
    'fa':                          'Financial Advisors',
    'corporate':                   'Corporate / Institutional',
    'corporate and institutional': 'Corporate / Institutional',
    'corporate / institutional':   'Corporate / Institutional',
    'institutional':               'Corporate / Institutional',
  };
  return aliases[lower] || s;
}

function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v.startsWith('=')) return null; // formula
    const cleaned = v.replace(/[$,£€R\s]/g, '').replace('%', '');
    const n = parseFloat(cleaned);
    if (!isNaN(n)) {
      // If the original had a %, the value was a display percentage — convert to ratio
      return v.includes('%') ? n / 100 : n;
    }
  }
  return null;
}

// Some exports store rates as decimals (0.0131 = 1.31%), others as numbers (1.31).
// Heuristic: any rate field with values > 1 is treated as percent and divided by 100.
function maybeNormalizeRate(arr) {
  const nums = arr.filter(v => typeof v === 'number');
  if (!nums.length) return arr;
  const max = Math.max(...nums.map(Math.abs));
  if (max > 1) return arr.map(v => (typeof v === 'number' ? v / 100 : v));
  return arr;
}

function buildRows(rawRows, headerIdx, colMap) {
  const out = [];
  const headerLowerSet = new Set();
  if (rawRows[headerIdx]) {
    for (const c of rawRows[headerIdx]) {
      if (typeof c === 'string') headerLowerSet.add(c.trim().toLowerCase());
    }
  }

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.every(c => c == null || c === '')) continue;

    // Skip repeated header rows mid-file. We consider it a header repeat if
    // >=2 cells in this row match known header terms — robust to messy exports
    // where the first column might be blank but the rest mirrors the header.
    let headerHits = 0;
    for (const c of r) {
      if (typeof c === 'string' && headerLowerSet.has(c.trim().toLowerCase())) headerHits++;
      if (headerHits >= 2) break;
    }
    if (headerHits >= 2) continue;

    const row = {};
    for (const [field, idx] of Object.entries(colMap)) {
      const v = r[idx];
      if (['audience', 'geo', 'adType', 'objective', 'adName', 'month'].includes(field)) {
        row[field] = normalizeLabel(v);
      } else if (['impressions','clicks','engagements','reach','spend','leads','formOpens','landingPageClicks'].includes(field)) {
        row[field] = toNumber(v);
      } else {
        row[field] = toNumber(v);
      }
    }

    // Skip rows with no impressions and no spend — likely junk
    if (!row.impressions && !row.spend) continue;
    // Skip subtotal/summary rows (common LinkedIn export artefact)
    if (typeof row.adName === 'string' && /\b(total|subtotal|grand\s*total)\b/i.test(row.adName)) continue;
    // Skip rows with no identity at all (no ad name AND no month AND no audience AND no geo)
    if (!row.adName && !row.month && !row.audience && !row.geo) continue;
    out.push(row);
  }

  // Normalize ONLY video rates if they appear to be stored as percents.
  // Other rates (CTR, ER, Form Fill, etc.) are recomputed from sums during
  // aggregation, so we deliberately leave per-row values alone to avoid
  // corrupting them when one outlier value triggers a global divide-by-100.
  const rateFields = ['videoViewRate', 'videoCompletionRate'];
  for (const f of rateFields) {
    const vals = out.map(r => r[f]);
    const normalized = maybeNormalizeRate(vals);
    out.forEach((r, i) => { r[f] = normalized[i]; });
  }

  return out;
}

/* ====================================================================
   3. AGGREGATION — group rows by selected breakdown(s)
   ==================================================================== */

function aggregateRows(rows, breakdownIds) {
  const cols = breakdownIds.map(id => BREAKDOWNS.find(b => b.id === id)?.column).filter(Boolean);
  const groups = new Map();

  for (const row of rows) {
    const key = cols.map(c => row[c] ?? '—').join(' / ');
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        labels: cols.reduce((acc, c) => ({ ...acc, [c]: row[c] ?? '—' }), {}),
        impressions: 0, clicks: 0, spend: 0, engagements: 0,
        reach: 0, leads: 0, formOpens: 0, landingPageClicks: 0,
        _videoViewRates: [], _videoCompletionRates: [], _frequencies: [],
        _impressionsWeighted: 0, _reachRows: 0,
        rowCount: 0,
      });
    }
    const g = groups.get(key);
    g.impressions += row.impressions || 0;
    g.clicks      += row.clicks      || 0;
    g.spend       += row.spend       || 0;
    g.engagements += row.engagements || 0;
    g.reach       += row.reach       || 0; // note: not perfectly additive across overlapping audiences
    g.leads       += row.leads       || 0;
    g.formOpens   += row.formOpens   || 0;
    g.landingPageClicks += row.landingPageClicks || 0;
    if (row.videoViewRate != null && row.impressions) {
      g._videoViewRates.push({ rate: row.videoViewRate, imps: row.impressions });
    }
    if (row.videoCompletionRate != null && row.impressions) {
      g._videoCompletionRates.push({ rate: row.videoCompletionRate, imps: row.impressions });
    }
    if (row.frequency != null) g._frequencies.push(row.frequency);
    g.rowCount++;
  }

  // Derive rates from totals
  const results = [];
  for (const g of groups.values()) {
    g.ctr            = g.impressions ? g.clicks / g.impressions : null;
    g.engagementRate = g.impressions ? g.engagements / g.impressions : null;
    g.cpm            = g.impressions ? (g.spend / g.impressions) * 1000 : null;
    g.cpc            = g.clicks ? g.spend / g.clicks : null;
    g.frequency      = g.reach ? g.impressions / g.reach : null;
    g.formFillRate   = g.formOpens ? g.leads / g.formOpens : null;
    g.cpl            = g.leads ? g.spend / g.leads : null;
    g.videoViewRate  = weightedAvg(g._videoViewRates);
    g.videoCompletionRate = weightedAvg(g._videoCompletionRates);
    delete g._videoViewRates; delete g._videoCompletionRates; delete g._frequencies;
    delete g._impressionsWeighted; delete g._reachRows;
    results.push(g);
  }
  return results;
}

function weightedAvg(items) {
  if (!items.length) return null;
  let totalImps = 0, weighted = 0;
  for (const { rate, imps } of items) {
    totalImps += imps;
    weighted  += rate * imps;
  }
  return totalImps ? weighted / totalImps : null;
}

function aggregateTotals(rows) {
  return aggregateRows(rows, [])[0] || null;
}

/* ====================================================================
   4. RATING — value vs benchmark → 3-state
   ==================================================================== */

function rateValue(metric, value, benchmark) {
  if (value == null || benchmark == null) return null;
  const def = METRIC_DEFS[metric];
  const higherBetter = def?.higherIsBetter;
  if (higherBetter === null) return null;

  const ratio = value / benchmark;
  const TOLERANCE = 0.05;

  if (higherBetter) {
    if (ratio >= 1 + TOLERANCE) return 'above';
    if (ratio <= 1 - TOLERANCE) return 'below';
    return 'meets';
  } else {
    if (ratio <= 1 - TOLERANCE) return 'above'; // lower = better
    if (ratio >= 1 + TOLERANCE) return 'below';
    return 'meets';
  }
}

/* ====================================================================
   5. FORMATTING
   ==================================================================== */

function fmtMetric(metric, value, currency = '$') {
  if (value == null || (typeof value === 'number' && !isFinite(value))) return '—';
  const def = METRIC_DEFS[metric];
  const fmt = def?.format || 'num';
  switch (fmt) {
    case 'pct': return `${(value * 100).toFixed(2)}%`;
    case 'cur': return `${currency}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    case 'dec': return value.toFixed(2);
    case 'num':
    default:    return Math.round(value).toLocaleString();
  }
}

function fmtDelta(curr, prev, metric) {
  if (curr == null || prev == null || prev === 0) return null;
  const diff = curr - prev;
  const pct  = (diff / Math.abs(prev)) * 100;
  const def  = METRIC_DEFS[metric];
  const better = def?.higherIsBetter;
  let direction = 'flat';
  if (Math.abs(pct) >= 1) direction = pct > 0 ? 'up' : 'down';
  let good = null;
  if (better === true)  good = pct > 0;
  if (better === false) good = pct < 0;
  return { pct, direction, good, diff };
}

/* ====================================================================
   6. AI PROMPT — build a structured prompt for /api/ai-recommendations
   ==================================================================== */

function buildAIPrompt({ objective, breakdownIds, totals, groups, benchmarks, currency, periodLabel, previousTotals }) {
  const benchTable = Object.entries(benchmarks)
    .map(([m,v]) => `  ${METRIC_DEFS[m]?.label || m}: ${fmtMetric(m,v,currency)}`)
    .join('\n');

  const totalsTable = Object.keys(totals)
    .filter(k => METRIC_DEFS[k])
    .map(m => `  ${METRIC_DEFS[m].label}: ${fmtMetric(m, totals[m], currency)}`)
    .join('\n');

  const groupTable = groups.slice(0, 30).map(g => {
    const metrics = OBJECTIVES[objective].metrics
      .map(m => `${METRIC_DEFS[m].label}=${fmtMetric(m, g[m], currency)}`)
      .join(', ');
    return `  • ${g.key}: ${metrics}`;
  }).join('\n');

  const periodComparison = previousTotals
    ? `\nPREVIOUS PERIOD TOTALS (for comparison):\n${
        Object.keys(previousTotals).filter(k => METRIC_DEFS[k])
          .map(m => `  ${METRIC_DEFS[m].label}: ${fmtMetric(m, previousTotals[m], currency)}`).join('\n')
      }`
    : '';

  const breakdownLabels = breakdownIds.map(b => BREAKDOWNS.find(x => x.id === b)?.label).join(' × ');

  const isTrendStory = breakdownIds.length === 1 && breakdownIds[0] === 'month';

  return `You are a senior performance marketing analyst at Turn Left Media writing a LinkedIn campaign report for a client. Produce a client-ready narrative based on the data below. The campaign objective is ${OBJECTIVES[objective].label}. Breakdown: ${breakdownLabels}.${periodLabel ? ` Period: ${periodLabel}.` : ''}

CAMPAIGN TOTALS:
${totalsTable}

BENCHMARKS:
${benchTable}

PER-GROUP PERFORMANCE (${breakdownLabels}):
${groupTable}
${periodComparison}

Respond with EXACTLY four sections in this format, with NO other preamble or commentary:

===EXEC_SUMMARY===
${isTrendStory
  ? 'A 2-3 sentence trend narrative across the periods. Identify the phases (e.g. "Jul-Dec underperformance → Jan stabilisation → Feb breakthrough"). Lead with the most important shift.'
  : 'A 2-3 sentence overview leading with the strongest finding. Name the top-performing groups and the headline metric.'}

===WHATS_WORKING===
4-6 bullet points (each starting with "—") highlighting wins. Cite specific metrics with values and compare to benchmark where relevant. Be concrete: name the group, give the number.

===WHATS_NOT_WORKING===
2-4 bullet points (each starting with "—") highlighting issues. Be diplomatic but honest. If everything is above benchmark, focus on areas with the most room to improve.

===RECOMMENDATIONS===
3-5 actionable recommendations. Each starts with a short action verb followed by ":" then the recommendation. Example: "Shift budget: Move 20% of Europe spend toward West Africa."

Use Turn Left's voice: data-led, decisive, no fluff. Use 🔵 / 🟡 / 🔴 emoji tags inline when calling out a metric vs benchmark. Use line breaks between bullets.`;
}

function parseAIResponse(text) {
  const sections = { execSummary: '', whatsWorking: '', whatsNotWorking: '', recommendations: '' };
  const re = /===(EXEC_SUMMARY|WHATS_WORKING|WHATS_NOT_WORKING|RECOMMENDATIONS)===\s*\n([\s\S]*?)(?=\n===|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1];
    const body = m[2].trim();
    if (key === 'EXEC_SUMMARY')        sections.execSummary = body;
    if (key === 'WHATS_WORKING')       sections.whatsWorking = body;
    if (key === 'WHATS_NOT_WORKING')   sections.whatsNotWorking = body;
    if (key === 'RECOMMENDATIONS')     sections.recommendations = body;
  }
  if (!sections.execSummary && text) sections.execSummary = text.slice(0, 600);
  return sections;
}

/* ====================================================================
   7. EXPORT HTML — email-ready document
   ==================================================================== */

function buildExportHTML({ title, periodLabel, objective, breakdownIds, totals, groups, benchmarks, narrative, currency }) {
  const breakdownLabel = breakdownIds.map(b => BREAKDOWNS.find(x => x.id === b)?.label).join(' × ');
  const objLabel = OBJECTIVES[objective].label;
  const metricKeys = OBJECTIVES[objective].metrics;

  const totalsRows = metricKeys.map(m => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${METRIC_DEFS[m].label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;text-align:right;">${fmtMetric(m, totals[m], currency)}</td>
    </tr>`).join('');

  const benchRows = metricKeys.filter(m => benchmarks[m] != null).map(m => {
    const rating = rateValue(m, totals[m], benchmarks[m]);
    const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${METRIC_DEFS[m].label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0e1034;">${fmtMetric(m, totals[m], currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#475569;">${fmtMetric(m, benchmarks[m], currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${dot}</td>
    </tr>`;
  }).join('');

  const groupRows = groups.map(g => {
    const cells = metricKeys.map(m => `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0e1034;">${fmtMetric(m, g[m], currency)}</td>`).join('');
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0e1034;">${g.key}</td>
      ${cells}
    </tr>`;
  }).join('');

  const groupHeaders = metricKeys.map(m =>
    `<th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;font-weight:600;text-align:right;">${METRIC_DEFS[m].label}</th>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:30px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#0e1034;">
<div style="max-width:920px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#0e1034;color:#fff;padding:30px;">
    <div style="font-size:22px;font-weight:700;">${escapeHtml(title)}</div>
    <div style="font-size:13px;color:#F6DC4E;margin-top:6px;">${escapeHtml(periodLabel || '')} · Objective: ${escapeHtml(objLabel)} · Breakdown: ${escapeHtml(breakdownLabel)}</div>
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

  <div style="padding:0 30px 25px;">
    <h2 style="font-size:16px;color:#0e1034;border-bottom:2px solid #F6DC4E;padding-bottom:6px;">🔍 Performance by ${escapeHtml(breakdownLabel)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
      <thead><tr>
        <th style="padding:8px 12px;background:#0e1034;color:#F6DC4E;text-align:left;">${escapeHtml(breakdownLabel)}</th>
        ${groupHeaders}
      </tr></thead>
      <tbody>${groupRows}</tbody>
    </table>
  </div>

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

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ====================================================================
   8. UI sub-components
   ==================================================================== */

function StepHeader({ step, active, complete, label, icon: Icon }) {
  const bg = complete ? '#22c55e' : active ? '#F6DC4E' : '#334155';
  const color = active ? '#0e1034' : complete ? '#fff' : '#94a3b8';
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
           style={{ background: bg, color }}>
        {complete ? <CheckCircle2 className="w-5 h-5" /> : step}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Step {step}</div>
        <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</div>
      </div>
    </div>
  );
}

function Stepper({ current, completed }) {
  const steps = [
    { n: 1, label: 'Upload',      icon: Upload },
    { n: 2, label: 'Map Columns', icon: Filter },
    { n: 3, label: 'Configure',   icon: Settings },
    { n: 4, label: 'Report',      icon: Sparkles },
  ];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <StepHeader step={s.n} active={current === s.n} complete={completed.includes(s.n)} label={s.label} icon={s.icon} />
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
        </div>
      ))}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-700/50 ${className}`}
         style={{ background: 'rgba(15, 31, 61, 0.6)' }}>
      {children}
    </div>
  );
}

function UploadStep({ onParsed, secondaryMode, setSecondaryMode, secondaryFile, onSecondaryParsed }) {
  const fileRef = useRef(null);
  const fileRef2 = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [parsingErr, setParsingErr] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);

  const handleFile = useCallback(async (file, isSecondary = false) => {
    setParsing(true); setParsingErr(null);
    try {
      const raw = await parseSpreadsheet(file);
      const headerIdx = findHeaderRow(raw);
      const map = autoMapColumns(raw[headerIdx]);
      const rows = buildRows(raw, headerIdx, map);
      if (!rows.length) throw new Error('No data rows detected. Check that the file has a recognisable header row (Ad Set Name, Impressions, etc.)');
      if (isSecondary) {
        onSecondaryParsed({ file, fileName: file.name, raw, headerIdx, colMap: map, rows });
      } else {
        setFileName(file.name);
        onParsed({ file, fileName: file.name, raw, headerIdx, colMap: map, rows });
      }
    } catch (e) {
      setParsingErr(e.message || String(e));
    } finally {
      setParsing(false);
    }
  }, [onParsed, onSecondaryParsed]);

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="w-5 h-5" style={{ color: '#F6DC4E' }} />
        <h2 className="text-lg font-semibold text-white">Upload LinkedIn export</h2>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Drag-and-drop your LinkedIn Ad Performance Report (.xlsx or .csv). The dashboard will auto-detect columns
        and skip the LinkedIn metadata rows.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? '#F6DC4E' : '#334155',
          background: dragOver ? 'rgba(246,220,78,0.08)' : 'transparent',
        }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
               onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {parsing ? (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Parsing…
          </div>
        ) : fileName ? (
          <div>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#22c55e' }} />
            <div className="font-semibold text-white">{fileName}</div>
            <div className="text-xs text-slate-400 mt-1">Click to replace</div>
          </div>
        ) : (
          <div>
            <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
            <div className="text-slate-300 font-semibold mb-1">Drop file or click to upload</div>
            <div className="text-xs text-slate-500">.xlsx · .xls · .csv</div>
          </div>
        )}
      </div>

      {parsingErr && (
        <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
             style={{ background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444' }}>
          <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#ef4444' }} />
          <div className="text-sm" style={{ color: '#fecaca' }}>{parsingErr}</div>
        </div>
      )}

      {/* Optional second file for explicit period-over-period */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={secondaryMode} onChange={e => setSecondaryMode(e.target.checked)}
                 className="rounded" />
          <span>I have a separate previous-period file for comparison</span>
        </label>
        <p className="text-xs text-slate-500 mt-1 ml-6">
          Leave unchecked if your main file already spans multiple periods (the builder will compare them automatically).
        </p>
        {secondaryMode && (
          <div className="mt-3 ml-6">
            <input ref={fileRef2} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                   onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], true)} />
            <button onClick={() => fileRef2.current?.click()}
                    className="px-4 py-2 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50">
              {secondaryFile ? `✓ ${secondaryFile.fileName}` : 'Upload previous-period file'}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function MappingStep({ headerRow, colMap, onChange, rowCount, sampleRows }) {
  const fields = [
    { f: 'adName',       g: 'Identity' },
    { f: 'month',        g: 'Identity' },
    { f: 'audience',     g: 'Identity' },
    { f: 'geo',          g: 'Identity' },
    { f: 'adType',       g: 'Identity' },
    { f: 'objective',    g: 'Identity' },
    { f: 'spend',        g: 'Spend' },
    { f: 'impressions',  g: 'Volume' },
    { f: 'clicks',       g: 'Volume' },
    { f: 'engagements',  g: 'Volume' },
    { f: 'reach',        g: 'Volume' },
    { f: 'ctr',          g: 'Rates' },
    { f: 'engagementRate',g: 'Rates' },
    { f: 'cpm',          g: 'Rates' },
    { f: 'cpc',          g: 'Rates' },
    { f: 'frequency',    g: 'Rates' },
    { f: 'videoViewRate',g: 'Video' },
    { f: 'videoCompletionRate', g: 'Video' },
    { f: 'leads',        g: 'Lead Gen' },
    { f: 'formOpens',    g: 'Lead Gen' },
    { f: 'formFillRate', g: 'Lead Gen' },
    { f: 'landingPageClicks', g: 'Other' },
  ];

  const groups = [...new Set(fields.map(f => f.g))];
  const headers = headerRow || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Filter className="w-5 h-5" style={{ color: '#F6DC4E' }} /> Column Mapping
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {Object.keys(colMap).length} of {fields.length} fields auto-detected · {rowCount} data rows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        {groups.map(group => (
          <div key={group} className="mb-3">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#F6DC4E' }}>{group}</div>
            {fields.filter(x => x.g === group).map(({ f }) => (
              <div key={f} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-300">{METRIC_DEFS[f]?.label || labelize(f)}</span>
                <select
                  value={colMap[f] ?? ''}
                  onChange={e => onChange({ ...colMap, [f]: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="text-xs rounded border border-slate-600 px-2 py-1"
                  style={{ background: '#0f1f3d', color: '#cbd5e1', maxWidth: '200px' }}
                >
                  <option value="">— not in file —</option>
                  {headers.map((h, i) => h != null && (
                    <option key={i} value={i}>{colLetter(i)}: {String(h).slice(0, 38)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>

      {sampleRows.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Sample (first row)</div>
          <div className="text-xs grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1" style={{ color: '#cbd5e1' }}>
            {Object.entries(sampleRows[0]).slice(0, 12).map(([k, v]) => v != null && (
              <div key={k} className="truncate">
                <span style={{ color: '#94a3b8' }}>{k}: </span>
                <span>{String(v).slice(0, 30)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function labelize(s) { return s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }

// Convert 0-based column index → spreadsheet column letter (0=A, 25=Z, 26=AA…)
function colLetter(idx) {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function ConfigureStep({ config, setConfig, rows, secondaryRows }) {
  const detectedMonths = useMemo(() => {
    const months = new Set();
    rows.forEach(r => r.month && months.add(r.month));
    return [...months];
  }, [rows]);

  const detectedAudiences = useMemo(() => {
    const a = new Set();
    rows.forEach(r => r.audience && a.add(r.audience));
    return [...a];
  }, [rows]);

  const detectedGeos = useMemo(() => {
    const g = new Set();
    rows.forEach(r => r.geo && g.add(r.geo));
    return [...g];
  }, [rows]);

  const toggleBreakdown = (id) => {
    const next = config.breakdownIds.includes(id)
      ? config.breakdownIds.filter(x => x !== id)
      : [...config.breakdownIds, id].slice(-2); // cap at 2
    setConfig({ ...config, breakdownIds: next });
  };

  const applyPreset = (key) => {
    const preset = BENCHMARK_PRESETS[key];
    setConfig({ ...config, benchmarkPreset: key, benchmarks: { ...preset.values } });
  };

  const setBenchmark = (m, v) => {
    setConfig({ ...config, benchmarks: { ...config.benchmarks, [m]: v === '' ? null : Number(v) } });
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Title & Period */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" style={{ color: '#F6DC4E' }} /> Configure Report
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Report Title</label>
            <input type="text" value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg border border-slate-600 text-sm"
                   style={{ background: '#0a1530', color: '#fff' }}
                   placeholder="e.g. Nedgroup Investments – April 2026" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#94a3b8' }}>Period Label</label>
            <input type="text" value={config.periodLabel} onChange={e => setConfig({ ...config, periodLabel: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg border border-slate-600 text-sm"
                   style={{ background: '#0a1530', color: '#fff' }}
                   placeholder={detectedMonths.length ? `Detected: ${detectedMonths.join(', ')}` : 'e.g. Feb-Apr 2026'} />
          </div>
        </div>
      </div>

      {/* Objective */}
      <div>
        <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>Objective (drives which metrics show)</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(OBJECTIVES).map(([id, o]) => (
            <button key={id} onClick={() => setConfig({ ...config, objective: id })}
                    className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={config.objective === id
                      ? { background: 'rgba(246,220,78,0.15)', borderColor: '#F6DC4E', color: '#F6DC4E' }
                      : { background: 'transparent', borderColor: '#334155', color: '#cbd5e1' }}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">{OBJECTIVES[config.objective].description}</p>
      </div>

      {/* Breakdown */}
      <div>
        <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#94a3b8' }}>
          Breakdown (pick 1 or 2 — stack to slice by both)
        </label>
        <div className="flex flex-wrap gap-2">
          {BREAKDOWNS.map(b => {
            const active = config.breakdownIds.includes(b.id);
            return (
              <button key={b.id} onClick={() => toggleBreakdown(b.id)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                      style={active
                        ? { background: 'rgba(246,220,78,0.15)', borderColor: '#F6DC4E', color: '#F6DC4E' }
                        : { background: 'transparent', borderColor: '#334155', color: '#cbd5e1' }}>
                {b.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {detectedMonths.length} months · {detectedAudiences.length} audiences · {detectedGeos.length} geo values detected
        </div>
      </div>

      {/* Benchmarks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Benchmarks</label>
          <div className="flex gap-1">
            {Object.entries(BENCHMARK_PRESETS).map(([k, p]) => (
              <button key={k} onClick={() => applyPreset(k)}
                      className="text-xs px-2 py-1 rounded border"
                      style={config.benchmarkPreset === k
                        ? { borderColor: '#F6DC4E', color: '#F6DC4E', background: 'rgba(246,220,78,0.08)' }
                        : { borderColor: '#334155', color: '#94a3b8' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {OBJECTIVES[config.objective].metrics.map(m => {
            const def = METRIC_DEFS[m];
            if (def.higherIsBetter === null) return null;
            return (
              <div key={m}>
                <div className="text-xs text-slate-300 mb-1">{def.label}</div>
                <input type="number" step="any"
                       value={config.benchmarks[m] ?? ''}
                       onChange={e => setBenchmark(m, e.target.value)}
                       placeholder={def.format === 'pct' ? '0.0044 = 0.44%' : def.format === 'cur' ? '4.76' : '—'}
                       className="w-full px-2 py-1.5 rounded border border-slate-600 text-sm"
                       style={{ background: '#0a1530', color: '#fff' }} />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">Enter rates as decimals (0.0044 = 0.44%). Leave blank to skip benchmarking.</p>
      </div>

      {/* Currency */}
      <div className="flex items-center gap-3">
        <label className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Currency Symbol</label>
        <input type="text" value={config.currency} onChange={e => setConfig({ ...config, currency: e.target.value })}
               className="px-2 py-1 rounded border border-slate-600 text-sm w-20"
               style={{ background: '#0a1530', color: '#fff' }} />
        <span className="text-xs text-slate-500">Use $, R, £, €, etc.</span>
      </div>
    </Card>
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

function ResultsView({ config, totals, groups, narrative, setNarrative, generating, regenerate, periodCompareTotals }) {
  const metricKeys = OBJECTIVES[config.objective].metrics;
  const breakdownLabel = config.breakdownIds.map(b => BREAKDOWNS.find(x => x.id === b)?.label).join(' × ');

  return (
    <div className="space-y-6">
      {/* Totals */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: '#F6DC4E' }} /> Performance Totals
          </h2>
          {periodCompareTotals && (
            <div className="text-xs text-slate-400">vs. previous period</div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricKeys.map(m => {
            const delta = periodCompareTotals ? fmtDelta(totals[m], periodCompareTotals[m], m) : null;
            const rating = config.benchmarks[m] != null ? rateValue(m, totals[m], config.benchmarks[m]) : null;
            const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
            return (
              <div key={m} className="p-3 rounded-lg border border-slate-700/50"
                   style={{ background: 'rgba(10,21,48,0.5)' }}>
                <div className="text-xs text-slate-400">{METRIC_DEFS[m].label} {dot}</div>
                <div className="text-xl font-bold text-white mt-1">{fmtMetric(m, totals[m], config.currency)}</div>
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

      {/* Group breakdown table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">By {breakdownLabel}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#0a1530' }}>
                <th className="text-left p-3 font-semibold" style={{ color: '#F6DC4E' }}>{breakdownLabel}</th>
                {metricKeys.map(m => (
                  <th key={m} className="text-right p-3 font-semibold" style={{ color: '#F6DC4E' }}>{METRIC_DEFS[m].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={g.key} style={{ background: i % 2 === 0 ? 'rgba(10,21,48,0.3)' : 'transparent' }}>
                  <td className="p-3 font-medium text-white">{g.key}</td>
                  {metricKeys.map(m => {
                    const rating = config.benchmarks[m] != null ? rateValue(m, g[m], config.benchmarks[m]) : null;
                    const dot = rating === 'above' ? '🔵' : rating === 'meets' ? '🟡' : rating === 'below' ? '🔴' : '';
                    return (
                      <td key={m} className="text-right p-3 text-slate-200">
                        {fmtMetric(m, g[m], config.currency)} {dot && <span className="text-xs ml-1">{dot}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AI narrative */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: '#F6DC4E' }} /> AI Narrative
          <span className="text-xs font-normal text-slate-400">· editable, click any section</span>
        </h2>
        <button onClick={regenerate} disabled={generating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: 'rgba(246,220,78,0.12)', color: '#F6DC4E', border: '1px solid #F6DC4E' }}>
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NarrativeBlock title="Executive Summary"     accent="#F6DC4E"
          value={narrative.execSummary}     onChange={v => setNarrative({ ...narrative, execSummary: v })} />
        <NarrativeBlock title="What's Working"        accent="#22c55e"
          value={narrative.whatsWorking}    onChange={v => setNarrative({ ...narrative, whatsWorking: v })} />
        <NarrativeBlock title="What's Not Working"    accent="#ef4444"
          value={narrative.whatsNotWorking} onChange={v => setNarrative({ ...narrative, whatsNotWorking: v })} />
        <NarrativeBlock title="Recommendations"       accent="#3b82f6"
          value={narrative.recommendations} onChange={v => setNarrative({ ...narrative, recommendations: v })} />
      </div>
    </div>
  );
}

/* ====================================================================
   9. MAIN COMPONENT
   ==================================================================== */

export default function ObjectiveTabs() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState([]);

  // Step 1: upload
  const [primary, setPrimary] = useState(null);     // { fileName, raw, headerIdx, colMap, rows }
  const [secondaryMode, setSecondaryMode] = useState(false);
  const [secondary, setSecondary] = useState(null);

  // Step 2: column mapping (editable)
  const [colMap, setColMap] = useState({});

  // Step 3: report config
  const [config, setConfig] = useState({
    title: '',
    periodLabel: '',
    objective: 'engagement',
    breakdownIds: ['month'],
    benchmarkPreset: 'sa-median',
    benchmarks: { ...BENCHMARK_PRESETS['sa-median'].values },
    currency: '$',
  });

  // Step 4: narrative + export
  const [narrative, setNarrative] = useState({ execSummary: '', whatsWorking: '', whatsNotWorking: '', recommendations: '' });
  const [generating, setGenerating] = useState(false);
  const [generateErr, setGenerateErr] = useState(null);
  const [exportToast, setExportToast] = useState(null);

  /* ---------------- Step 1 handlers ---------------- */
  const onPrimaryParsed = useCallback((p) => {
    setPrimary(p);
    setColMap(p.colMap);
    if (!completed.includes(1)) setCompleted([...completed, 1]);
  }, [completed]);

  const onSecondaryParsed = useCallback((p) => setSecondary(p), []);

  /* ---------------- Derived rows (re-apply mapping when user edits it) ---------------- */
  const liveRows = useMemo(() => {
    if (!primary) return [];
    return buildRows(primary.raw, primary.headerIdx, colMap);
  }, [primary, colMap]);

  const secondaryRows = useMemo(() => {
    if (!secondary) return null;
    return buildRows(secondary.raw, secondary.headerIdx, secondary.colMap);
  }, [secondary]);

  /* ---------------- Aggregations ---------------- */
  const totals = useMemo(() => liveRows.length ? aggregateTotals(liveRows) : null, [liveRows]);
  const groups = useMemo(() => liveRows.length ? aggregateRows(liveRows, config.breakdownIds) : [], [liveRows, config.breakdownIds]);

  // Period-over-period totals
  const periodCompareTotals = useMemo(() => {
    if (secondaryRows && secondaryRows.length) return aggregateTotals(secondaryRows);
    // Auto-detect: if primary spans multiple months, compare latest two
    if (liveRows.length && config.breakdownIds[0] === 'month') {
      const months = [...new Set(liveRows.map(r => r.month).filter(Boolean))];
      if (months.length >= 2) {
        const lastMonth = months[months.length - 1];
        const prevMonth = months[months.length - 2];
        const prevRows = liveRows.filter(r => r.month === prevMonth);
        if (prevRows.length) return aggregateTotals(prevRows);
      }
    }
    return null;
  }, [secondaryRows, liveRows, config.breakdownIds]);

  /* ---------------- AI narrative generation ---------------- */
  const generateNarrative = useCallback(async () => {
    if (!totals || !groups.length) return;
    setGenerating(true); setGenerateErr(null);
    try {
      const prompt = buildAIPrompt({
        objective: config.objective,
        breakdownIds: config.breakdownIds,
        totals,
        groups,
        benchmarks: config.benchmarks,
        currency: config.currency,
        periodLabel: config.periodLabel,
        previousTotals: periodCompareTotals,
      });
      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`AI recommendations API returned ${res.status}`);
      const data = await res.json();
      const parsed = parseAIResponse(data.text || '');
      setNarrative(parsed);
    } catch (e) {
      setGenerateErr(e.message || String(e));
    } finally {
      setGenerating(false);
    }
  }, [totals, groups, config, periodCompareTotals]);

  /* ---------------- Step navigation ---------------- */
  const goNext = async () => {
    if (step === 1 && primary) {
      if (!completed.includes(1)) setCompleted([...completed, 1]);
      setStep(2);
    } else if (step === 2) {
      if (!completed.includes(2)) setCompleted([...completed, 2]);
      setStep(3);
    } else if (step === 3) {
      if (!completed.includes(3)) setCompleted([...completed, 3]);
      setStep(4);
      // Auto-trigger narrative on first visit to step 4
      if (!narrative.execSummary) {
        setTimeout(() => generateNarrative(), 100);
      }
    }
  };

  const goBack = () => setStep(Math.max(1, step - 1));

  /* ---------------- Export ---------------- */
  const exportHTML = (mode) => {
    if (!totals) return;
    const html = buildExportHTML({
      title: config.title || 'LinkedIn Campaign Report',
      periodLabel: config.periodLabel,
      objective: config.objective,
      breakdownIds: config.breakdownIds,
      totals,
      groups,
      benchmarks: config.benchmarks,
      narrative,
      currency: config.currency,
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
      a.download = `${(config.title || 'report').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${new Date().toISOString().slice(0,10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen text-slate-200" style={{ background: 'transparent' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Layers className="w-6 h-6" style={{ color: '#F6DC4E' }} />
          Custom Report Builder
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload a LinkedIn ad export, configure the breakdown and benchmarks, and generate a client-ready report.
        </p>
      </div>

      <Stepper current={step} completed={completed} />

      {step === 1 && (
        <UploadStep
          onParsed={onPrimaryParsed}
          secondaryMode={secondaryMode}
          setSecondaryMode={setSecondaryMode}
          secondaryFile={secondary}
          onSecondaryParsed={onSecondaryParsed}
        />
      )}
      {step === 2 && primary && (
        <MappingStep
          headerRow={primary.raw[primary.headerIdx]}
          colMap={colMap}
          onChange={setColMap}
          rowCount={liveRows.length}
          sampleRows={liveRows}
        />
      )}
      {step === 3 && primary && (
        <ConfigureStep config={config} setConfig={setConfig} rows={liveRows} secondaryRows={secondaryRows} />
      )}
      {step === 4 && totals && (
        <>
          <ResultsView
            config={config}
            totals={totals}
            groups={groups}
            narrative={narrative}
            setNarrative={setNarrative}
            generating={generating}
            regenerate={generateNarrative}
            periodCompareTotals={periodCompareTotals}
          />
          {generateErr && (
            <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
                 style={{ background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444' }}>
              <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#ef4444' }} />
              <div className="text-sm" style={{ color: '#fecaca' }}>AI narrative failed: {generateErr}</div>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={goBack} disabled={step === 1}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-600 text-slate-300 hover:bg-slate-700/50 disabled:opacity-30 flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 4 ? (
          <button onClick={goNext} disabled={(step === 1 && !primary) || (step === 2 && !liveRows.length)}
                  className="px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: '#F6DC4E', color: '#0e1034' }}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => exportHTML('copy')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 border"
                    style={{ borderColor: '#F6DC4E', color: '#F6DC4E', background: 'rgba(246,220,78,0.08)' }}>
              <Copy className="w-4 h-4" /> Copy HTML
            </button>
            <button onClick={() => exportHTML('download')}
                    className="px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    style={{ background: '#F6DC4E', color: '#0e1034' }}>
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
        )}
      </div>

      {exportToast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
             style={{ background: '#22c55e', color: '#fff' }}>
          <CheckCircle2 className="w-4 h-4" /> {exportToast}
        </div>
      )}
    </div>
  );
}