'use client';

import { useState, useRef } from 'react';
import { TrendingUp, MousePointer, DollarSign, Target, Eye, Video, ChevronDown, ChevronUp, BarChart2, Globe, Activity, FileText, Printer, RefreshCw } from 'lucide-react';

// ─── BENCHMARKS ──────────────────────────────────────────────
const BENCHMARKS = {
  ctr: 0.4,
  websiteCtr: 0.4,
  engagementRate: 2.5,
  videoViewThroughRate: 35,
  videoCompletionRate: 1.7,
  leadFormCompletionRate: 6.65,
};

// ─── OBJECTIVE DETECTION ─────────────────────────────────────
function detectObjective(objectiveType) {
  if (!objectiveType) return 'Other';
  const t = objectiveType.toUpperCase();
  if (t.includes('VIDEO'))                                          return 'Video Views';
  if (t.includes('LEAD') || t.includes('CONVERSION'))             return 'Lead Generation';
  if (t.includes('WEBSITE') || t.includes('TRAFFIC') || t.includes('LANDING_PAGE')) return 'Website Visits';
  if (t.includes('ENGAGEMENT') || t.includes('BRAND') || t.includes('AWARENESS'))   return 'Engagement';
  return 'Other';
}

// ─── OBJECTIVE STATUS ─────────────────────────────────────────
function getObjectiveStatus(objective, metrics) {
  const ctr       = metrics.ctr       || 0;
  const engRate   = metrics.engRate   || 0;
  const webCtr    = metrics.landingPageCtr || ctr;
  const viewRate  = metrics.videoViewRate || 0;
  const leads     = metrics.leads     || 0;

  if (objective === 'Engagement') {
    const ctrOk = ctr >= BENCHMARKS.ctr;
    const engOk = engRate >= BENCHMARKS.engagementRate;
    if (ctrOk && engOk)   return { label: 'Meeting All', color: 'green' };
    if (ctrOk || engOk)   return { label: 'Partially Met', color: 'amber' };
    return { label: 'Below Target', color: 'red' };
  }
  if (objective === 'Lead Generation') {
    if (leads > 0) return { label: 'Leads Generated', color: 'green' };
    return { label: 'No Leads', color: 'red' };
  }
  if (objective === 'Website Visits') {
    if (ctr >= BENCHMARKS.ctr) return { label: 'Meeting CTR', color: 'green' };
    return { label: 'Below CTR Target', color: 'red' };
  }
  if (objective === 'Video Views') {
    if (viewRate >= BENCHMARKS.videoViewThroughRate) return { label: 'Meeting View Rate', color: 'green' };
    if (viewRate > 0) return { label: 'Below View Rate', color: 'amber' };
    return { label: 'No View Data', color: 'gray' };
  }
  return { label: 'Active', color: 'gray' };
}

function StatusPill({ status }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50   text-red-700   border-red-200',
    gray:  'bg-gray-50  text-gray-500  border-gray-200',
  };
  const icon = status.color === 'green' ? '✓' : status.color === 'red' ? '✗' : '~';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[status.color]}`}>
      {icon} {status.label}
    </span>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────
function fmtNum(v)       { return v != null && v > 0 ? Number(v).toLocaleString() : '0'; }
function fmtPct(v)       { return v != null && v > 0 ? `${Number(v).toFixed(3)}%` : '0.000%'; }
function fmtCur(v, sym)  { return v != null && v > 0 ? `${sym || '$'}${Number(v).toFixed(2)}` : `${sym || '$'}0.00`; }
function fmtCpv(v, sym)  { return v != null && v > 0 ? `${sym || '$'}${Number(v).toFixed(3)}` : `${sym || '$'}0.000`; }

// ─── COLUMNS PER OBJECTIVE ────────────────────────────────────
function getColumns(objective) {
  if (objective === 'Engagement')
    return ['Week', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Eng Rate', 'Engagements', 'Web Visits', 'Spend', 'Objective Met'];
  if (objective === 'Lead Generation')
    return ['Week', 'Impressions', 'Clicks', 'Leads', 'CPL', 'Spend', 'Objective Met'];
  if (objective === 'Website Visits')
    return ['Week', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Web Visits', 'Spend', 'Objective Met'];
  if (objective === 'Video Views')
    return ['Week', 'Impressions', 'View Rate', 'CPV', 'CPM', 'Spend', 'Objective Met'];
  return ['Week', 'Impressions', 'Clicks', 'CTR', 'Spend', 'Objective Met'];
}

function getRow(objective, week, sym) {
  const status = getObjectiveStatus(objective, {
    ctr: week.ctr, engRate: week.engRate,
    videoViewRate: week.videoViewRate, leads: week.leads,
  });
  const pill = <StatusPill status={status} key="s" />;

  if (objective === 'Engagement')
    return [week.label, fmtNum(week.impressions), fmtNum(week.clicks), fmtPct(week.ctr), fmtCur(week.cpc, sym), fmtCur(week.cpm, sym), fmtPct(week.engRate), fmtNum(week.engagements), fmtNum(week.websiteVisits), fmtCur(week.spend, sym), pill];
  if (objective === 'Lead Generation')
    return [week.label, fmtNum(week.impressions), fmtNum(week.clicks), week.leads || 0, fmtCur(week.cpl, sym), fmtCur(week.spend, sym), pill];
  if (objective === 'Website Visits')
    return [week.label, fmtNum(week.impressions), fmtNum(week.clicks), fmtPct(week.ctr), fmtCur(week.cpc, sym), fmtCur(week.cpm, sym), fmtNum(week.websiteVisits), fmtCur(week.spend, sym), pill];
  if (objective === 'Video Views')
    return [week.label, fmtNum(week.impressions), fmtPct(week.videoViewRate), fmtCpv(week.cpv, sym), fmtCur(week.cpm, sym), fmtCur(week.spend, sym), pill];
  return [week.label, fmtNum(week.impressions), fmtNum(week.clicks), fmtPct(week.ctr), fmtCur(week.spend, sym), pill];
}

// ─── BUILD WEEKLY ROWS FROM topCampaigns weeklyData ──────────
function buildWeekRows(campaign) {
  if (!campaign) return [];
  // If the API provides weeklyData, use it
  if (campaign.weeklyData && campaign.weeklyData.length > 0) {
    return campaign.weeklyData.map(w => ({
      label:         w.label || w.week || 'Week',
      impressions:   w.impressions || 0,
      clicks:        w.clicks || 0,
      ctr:           w.ctr != null ? w.ctr * 100 : (w.impressions > 0 ? w.clicks / w.impressions * 100 : 0),
      cpc:           w.cpc || (w.clicks > 0 ? w.spend / w.clicks : 0),
      cpm:           w.cpm || (w.impressions > 0 ? (w.spend / w.impressions) * 1000 : 0),
      engRate:       w.eng != null ? w.eng * 100 : 0,
      engagements:   w.engagements || 0,
      websiteVisits: w.webClicks || w.websiteVisits || 0,
      leads:         w.leads || 0,
      cpl:           w.leads > 0 ? w.spend / w.leads : 0,
      videoViewRate: w.videoViewRate || 0,
      cpv:           w.cpv || 0,
      spend:         w.spend || 0,
    }));
  }
  // No weekly data — show a single summary row
  const imp  = campaign.impressions || 0;
  const clk  = campaign.clicks || 0;
  const spd  = campaign.spent || 0;
  const lds  = campaign.leads || 0;
  const eng  = (campaign.clicks || 0) + (campaign.likes || 0) + (campaign.comments || 0) + (campaign.shares || 0) + (campaign.follows || 0);
  return [{
    label:         'Period Total',
    impressions:   imp,
    clicks:        clk,
    ctr:           imp > 0 ? clk / imp * 100 : 0,
    cpc:           clk > 0 ? spd / clk : 0,
    cpm:           imp > 0 ? (spd / imp) * 1000 : 0,
    engRate:       imp > 0 ? eng / imp * 100 : 0,
    engagements:   eng,
    websiteVisits: campaign.webClicks || 0,
    leads:         lds,
    cpl:           lds > 0 ? spd / lds : 0,
    videoViewRate: campaign.videoViewRate || 0,
    cpv:           campaign.cpv || 0,
    spend:         spd,
  }];
}

// ─── HTML EXPORT ─────────────────────────────────────────────
function buildExportHTML(campaignCards, currentRange, accountName) {
  const now = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const period = currentRange ? `${currentRange.start} to ${currentRange.end}` : '';

  const cardsHTML = campaignCards.map(({ campaign, objective, weeks, sym }) => {
    const cols = getColumns(objective);
    const thead = cols.map(c => `<th style="text-align:left;padding:8px 12px;background:#f2f1ec;font-family:monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8a8880;white-space:nowrap;border-bottom:1px solid #e8e6df">${c}</th>`).join('');
    const tbody = weeks.map((w, i) => {
      const status = getObjectiveStatus(objective, { ctr: w.ctr, engRate: w.engRate, videoViewRate: w.videoViewRate, leads: w.leads });
      const sc = status.color === 'green' ? '#059669' : status.color === 'red' ? '#dc2626' : '#d97706';
      let cells = [];
      if (objective === 'Engagement')      cells = [w.label, fmtNum(w.impressions), fmtNum(w.clicks), fmtPct(w.ctr), fmtCur(w.cpc, sym), fmtCur(w.cpm, sym), fmtPct(w.engRate), fmtNum(w.engagements), fmtNum(w.websiteVisits), fmtCur(w.spend, sym)];
      else if (objective === 'Lead Generation') cells = [w.label, fmtNum(w.impressions), fmtNum(w.clicks), w.leads || 0, fmtCur(w.cpl, sym), fmtCur(w.spend, sym)];
      else if (objective === 'Website Visits')  cells = [w.label, fmtNum(w.impressions), fmtNum(w.clicks), fmtPct(w.ctr), fmtCur(w.cpc, sym), fmtCur(w.cpm, sym), fmtNum(w.websiteVisits), fmtCur(w.spend, sym)];
      else if (objective === 'Video Views')     cells = [w.label, fmtNum(w.impressions), fmtPct(w.videoViewRate), fmtCpv(w.cpv, sym), fmtCur(w.cpm, sym), fmtCur(w.spend, sym)];
      else cells = [w.label, fmtNum(w.impressions), fmtNum(w.clicks), fmtPct(w.ctr), fmtCur(w.spend, sym)];
      cells.push(`<span style="color:${sc};font-weight:700">${status.color === 'green' ? '✓' : status.color === 'red' ? '✗' : '~'} ${status.label}</span>`);
      return `<tr style="background:${i % 2 === 0 ? 'white' : '#fafaf9'}">${cells.map(c => `<td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #e8e6df;white-space:nowrap">${c}</td>`).join('')}</tr>`;
    }).join('');

    const totalSpend = weeks.reduce((s, w) => s + (w.spend || 0), 0);
    const totalImpr  = weeks.reduce((s, w) => s + (w.impressions || 0), 0);
    const totalClk   = weeks.reduce((s, w) => s + (w.clicks || 0), 0);
    const totalLds   = weeks.reduce((s, w) => s + (w.leads || 0), 0);
    const metCount   = weeks.filter(w => getObjectiveStatus(objective, w).color === 'green').length;

    return `<div style="margin-bottom:40px;border:1px solid #e8e6df;border-radius:8px;overflow:hidden">
      <div style="background:#272828;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B1AAA4;margin-bottom:4px">ID: ${campaign.id}</div>
          <div style="color:white;font-weight:700;font-size:14px;max-width:700px">${campaign.name}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:16px">
          <span style="background:#F6DC4E;color:#272828;font-size:10px;font-weight:700;padding:3px 10px;border-radius:3px;font-family:monospace">${objective.toUpperCase()}</span>
          <div style="color:#B1AAA4;font-size:11px;margin-top:6px">Objective Met: ${metCount}/${weeks.length} weeks</div>
        </div>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>
      <div style="background:#f2f1ec;padding:10px 20px;font-size:11px;color:#8a8880;font-family:monospace">
        TOTALS &nbsp;·&nbsp; ${sym}${totalSpend.toFixed(2)} spent${totalImpr > 0 ? ` &nbsp;·&nbsp; ${totalImpr.toLocaleString()} impressions` : ''}${totalClk > 0 ? ` &nbsp;·&nbsp; ${totalClk.toLocaleString()} clicks` : ''}${totalLds > 0 ? ` &nbsp;·&nbsp; ${totalLds} leads` : ''}
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Performance per Campaign - ${accountName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F4F3F0;color:#272828}.container{max-width:1400px;margin:0 auto;padding:24px}@media print{body{background:white}}</style>
</head><body><div class="container">
<div style="background:#272828;color:white;padding:40px;border-radius:12px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <svg width="32" height="32" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" fill="#1a1a1a"/><path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/><path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/><path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/></svg>
      <span style="color:#B1AAA4;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Turn Left Media</span>
    </div>
    <h1 style="font-size:26px;font-weight:700;margin-bottom:6px">${accountName}</h1>
    <p style="color:#B1AAA4;font-size:13px">Performance per Campaign &nbsp;·&nbsp; Week-by-Week Summary</p>
  </div>
  <div style="text-align:right">
    <div style="color:#F6DC4E;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Campaign Report</div>
    <div style="color:#B1AAA4;font-size:12px">${period}</div>
    <div style="color:#B1AAA4;font-size:11px;margin-top:4px">Generated: ${now}</div>
  </div>
</div>
${cardsHTML}
<div style="text-align:center;padding:20px;color:#B1AAA4;font-size:12px;border-top:1px solid #e8e6df;margin-top:20px">
  Report generated by Turn Left Media &nbsp;·&nbsp; ${now} &nbsp;·&nbsp; Benchmarks: CTR &ge;${BENCHMARKS.ctr}% | Eng Rate &ge;${BENCHMARKS.engagementRate}% | View Rate &ge;${BENCHMARKS.videoViewThroughRate}%
</div>
</div></body></html>`;
}

// ─── CSV EXPORT ───────────────────────────────────────────────
function buildCSV(campaignCards, currentRange, accountName) {
  const period = currentRange ? `${currentRange.start} to ${currentRange.end}` : '';
  const rows = [
    [`Performance per Campaign - ${accountName}`],
    [`Period: ${period}`],
    [],
    ['Campaign ID', 'Campaign Name', 'Objective', 'Week', 'Impressions', 'Clicks', 'CTR %', 'CPC', 'CPM', 'Eng Rate %', 'Engagements', 'Web Visits', 'Leads', 'CPL', 'Video View Rate %', 'CPV', 'Spend', 'Objective Status'],
  ];
  campaignCards.forEach(({ campaign, objective, weeks, sym }) => {
    weeks.forEach(w => {
      const status = getObjectiveStatus(objective, { ctr: w.ctr, engRate: w.engRate, videoViewRate: w.videoViewRate, leads: w.leads });
      rows.push([
        campaign.id, `"${campaign.name}"`, objective, w.label,
        w.impressions, w.clicks, w.ctr.toFixed(3), w.cpc.toFixed(2), w.cpm.toFixed(2),
        w.engRate.toFixed(3), w.engagements, w.websiteVisits || 0,
        w.leads || 0, w.cpl.toFixed(2),
        w.videoViewRate.toFixed(2), w.cpv.toFixed(3),
        w.spend.toFixed(2), status.label,
      ]);
    });
  });
  return rows.map(r => r.join(',')).join('\n');
}

// ─── CAMPAIGN CARD ────────────────────────────────────────────
function CampaignCard({ campaign, objective, weeks, sym }) {
  const [open, setOpen] = useState(true);
  const columns = getColumns(objective);

  const totalSpend = weeks.reduce((s, w) => s + (w.spend || 0), 0);
  const totalImpr  = weeks.reduce((s, w) => s + (w.impressions || 0), 0);
  const totalClk   = weeks.reduce((s, w) => s + (w.clicks || 0), 0);
  const totalLds   = weeks.reduce((s, w) => s + (w.leads || 0), 0);
  const metCount   = weeks.filter(w => getObjectiveStatus(objective, { ctr: w.ctr, engRate: w.engRate, videoViewRate: w.videoViewRate, leads: w.leads }).color === 'green').length;
  const avgCtr     = totalImpr > 0 ? totalClk / totalImpr * 100 : 0;
  const avgEngRate = totalImpr > 0 ? weeks.reduce((s, w) => s + (w.engagements || 0), 0) / totalImpr * 100 : 0;
  const avgViewRate = weeks.filter(w => w.videoViewRate > 0).length > 0
    ? weeks.filter(w => w.videoViewRate > 0).reduce((s, w) => s + w.videoViewRate, 0) / weeks.filter(w => w.videoViewRate > 0).length : 0;

  const objColors = {
    'Engagement':     'border-l-indigo-500 bg-indigo-50',
    'Lead Generation':'border-l-blue-500 bg-blue-50',
    'Website Visits': 'border-l-emerald-500 bg-emerald-50',
    'Video Views':    'border-l-violet-500 bg-violet-50',
    'Other':          'border-l-gray-400 bg-gray-50',
  };
  const badgeColors = {
    'Engagement':     'bg-indigo-100 text-indigo-700',
    'Lead Generation':'bg-blue-100 text-blue-700',
    'Website Visits': 'bg-emerald-100 text-emerald-700',
    'Video Views':    'bg-violet-100 text-violet-700',
    'Other':          'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <div className={`border-l-4 p-4 ${objColors[objective] || objColors.Other}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[objective] || badgeColors.Other}`}>{objective}</span>
              <span className="text-xs text-gray-400 font-mono">ID: {campaign.id}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{campaign.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-0.5">Objective Met</div>
              <div className={`text-sm font-bold ${metCount === weeks.length ? 'text-green-600' : metCount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {metCount}/{weeks.length} {weeks.length === 1 ? 'period' : 'weeks'}
              </div>
            </div>
            <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
              {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>
        {/* Totals strip */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pt-3 border-t border-black/5 text-xs text-gray-600">
          <span><span className="font-semibold">{sym}{totalSpend.toFixed(2)}</span> total spend</span>
          {totalImpr  > 0 && <span><span className="font-semibold">{totalImpr.toLocaleString()}</span> impressions</span>}
          {totalClk   > 0 && <span><span className="font-semibold">{totalClk.toLocaleString()}</span> clicks</span>}
          {avgCtr     > 0 && <span>Avg CTR <span className="font-semibold">{avgCtr.toFixed(3)}%</span></span>}
          {totalLds   > 0 && <span><span className="font-semibold">{totalLds}</span> leads</span>}
          {avgEngRate > 0 && <span>Avg Eng Rate <span className="font-semibold">{avgEngRate.toFixed(3)}%</span></span>}
          {avgViewRate > 0 && <span>Avg View Rate <span className="font-semibold">{avgViewRate.toFixed(2)}%</span></span>}
        </div>
      </div>

      {/* Weekly table */}
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-t border-gray-100">
                {columns.map(c => (
                  <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, i) => (
                <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${i % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                  {getRow(objective, week, sym).map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-gray-700 whitespace-nowrap text-sm">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export default function ObjectiveTabs({ reportData, campaigns, campaignNameMap, campaignObjectiveMap, currentRange, accounts, selectedAccounts, loading }) {

  // Build campaign cards from live data
  const topCampaigns = reportData?.topCampaigns || [];
  const accountName  = selectedAccounts?.length > 0
    ? (accounts || []).find(a => String(a.id) === String(selectedAccounts[0]))?.name || 'Selected Account'
    : 'No Account Selected';

  // Build card data — one per campaign in topCampaigns
  const campaignCards = topCampaigns.map(c => {
    const id        = String(c.id);
    const name      = campaignNameMap?.[id] || `Campaign ${id}`;
    const objType   = campaignObjectiveMap?.[id] || '';
    const objective = detectObjective(objType);
    const weeks     = buildWeekRows(c);
    const sym       = '$'; // LinkedIn reports in USD
    return { campaign: { id, name }, objective, weeks, sym };
  });

  function downloadHTML() {
    const html = buildExportHTML(campaignCards, currentRange, accountName);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `performance-per-campaign-${currentRange?.start || 'export'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const csv  = buildCSV(campaignCards, currentRange, accountName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `performance-per-campaign-${currentRange?.start || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => window.open('https://sheets.new', '_blank'), 500);
  }

  function printReport() { window.print(); }

  // ── Empty / loading states ──────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" style={{ color: '#F6DC4E' }} />
        <p className="text-sm">Loading campaign data...</p>
      </div>
    );
  }

  if (!reportData || topCampaigns.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-16 text-center">
        <Target className="w-14 h-14 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Campaign Data Yet</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Select an account and date range in the Report Generator tab first, then come back here to see performance per campaign.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header + download buttons */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Performance per Campaign</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {accountName} &nbsp;·&nbsp; {currentRange?.start} to {currentRange?.end} &nbsp;·&nbsp; {campaignCards.length} campaign{campaignCards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={downloadHTML}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-semibold text-xs border border-slate-600 transition-colors">
            <FileText className="w-3.5 h-3.5" /> Export HTML
          </button>
          <button onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-xs transition-colors">
            <span>📊</span> Sheets
          </button>
          <button onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-xs transition-colors">
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Benchmark bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest self-center">Benchmarks</span>
        <span className="text-xs text-slate-300">CTR <span className="text-white font-semibold">&ge;{BENCHMARKS.ctr}%</span></span>
        <span className="text-xs text-slate-300">Engagement Rate <span className="text-white font-semibold">&ge;{BENCHMARKS.engagementRate}%</span></span>
        <span className="text-xs text-slate-300">Web CTR <span className="text-white font-semibold">&ge;{BENCHMARKS.websiteCtr}%</span></span>
        <span className="text-xs text-slate-300">Video View Rate <span className="text-white font-semibold">&ge;{BENCHMARKS.videoViewThroughRate}%</span></span>
        <span className="text-xs text-slate-300">Video Completion <span className="text-white font-semibold">&ge;{BENCHMARKS.videoCompletionRate}%</span></span>
        <span className="text-xs text-slate-300">Lead Form Completion <span className="text-white font-semibold">&ge;{BENCHMARKS.leadFormCompletionRate}%</span></span>
      </div>

      {/* Campaign cards */}
      {campaignCards.map(card => (
        <CampaignCard key={card.campaign.id} {...card} />
      ))}
    </div>
  );
}