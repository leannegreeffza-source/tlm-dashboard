'use client';

import { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, MousePointer, DollarSign, Target, Eye, Video, ChevronDown, ChevronUp, BarChart2, Globe, Activity, Download, FileText, Printer } from 'lucide-react';

// ─── BENCHMARKS ──────────────────────────────────────────────
const BENCHMARKS = {
  ctr: 0.4,
  websiteCtr: 0.4,
  engagementRate: 2.5,
  videoViewThroughRate: 35,
  videoCompletionRate: 1.7,
  leadFormCompletionRate: 6.65,
};

// ─── CAMPAIGNS ───────────────────────────────────────────────
const CAMPAIGNS = [
  {
    id: 'C02877',
    name: 'Ben v Cornell | Engagement | Boosted User Post | ICP 1 | ABM | Mgmt | Manual | 41k',
    objective: 'Engagement',
    budget: '$13.85/day',
    period: 'Dec 01 2025 - Jan 05 2026',
    currency: '$',
    weeks: [
      { week: 'Week 1', dates: 'Dec 01-07', impressions: 2529, clicks: 178, ctr: 7.038, cpc: 0.82, cpm: 57.97, landingPageCtr: 0.791, websiteVisits: 20, leads: 0, cpl: 0, engRate: 7.078, engagements: 179, videoViewRate: 0, cpv: 0, spend: 146.66 },
      { week: 'Week 2', dates: 'Dec 08-14', impressions: 3506, clicks: 254, ctr: 7.245, cpc: 0.58, cpm: 41.87, landingPageCtr: 0.998, websiteVisits: 35, leads: 0, cpl: 0, engRate: 7.473, engagements: 262, videoViewRate: 0, cpv: 0, spend: 146.79 },
      { week: 'Week 3', dates: 'Dec 15-21', impressions: 2524, clicks: 196, ctr: 7.765, cpc: 0.83, cpm: 64.79, landingPageCtr: 1.030, websiteVisits: 26, leads: 0, cpl: 0, engRate: 7.765, engagements: 196, videoViewRate: 0, cpv: 0, spend: 163.52 },
      { week: 'Week 4', dates: 'Dec 22-28', impressions: 1909, clicks: 165, ctr: 8.643, cpc: 0.85, cpm: 73.84, landingPageCtr: 1.048, websiteVisits: 20, leads: 0, cpl: 0, engRate: 8.748, engagements: 167, videoViewRate: 0, cpv: 0, spend: 140.97 },
      { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 1751, clicks: 139, ctr: 7.938, cpc: 0.90, cpm: 71.37, landingPageCtr: 1.142, websiteVisits: 20, leads: 0, cpl: 0, engRate: 7.938, engagements: 139, videoViewRate: 0, cpv: 0, spend: 124.97 },
      { week: 'Week 6', dates: 'Jan 05',      impressions: 202,  clicks: 23,  ctr: 11.386, cpc: 0.81, cpm: 91.83, landingPageCtr: 2.475, websiteVisits: 5,  leads: 0, cpl: 0, engRate: 11.881, engagements: 24, videoViewRate: 0, cpv: 0, spend: 18.55 },
    ],
  },
  {
    id: 'C03510',
    name: 'cTrader | Lead Generation | Message | AWARE: Brokers | All Custom Audiences | Manual',
    objective: 'Lead Generation',
    budget: 'EUR 27.85/day',
    period: 'Dec 04 2025 - Jan 06 2026',
    currency: 'EUR',
    weeks: [
      { week: 'Week 1', dates: 'Dec 04-10', impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, landingPageCtr: 0, websiteVisits: 0, leads: 2, cpl: 59.21,  engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 118.43 },
      { week: 'Week 2', dates: 'Dec 11-17', impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0,      engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 172.72 },
      { week: 'Week 3', dates: 'Dec 18-24', impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, landingPageCtr: 0, websiteVisits: 0, leads: 1, cpl: 129.31, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 129.31 },
      { week: 'Week 4', dates: 'Dec 25-31', impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, landingPageCtr: 0, websiteVisits: 0, leads: 2, cpl: 49.80,  engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 99.59  },
      { week: 'Week 5', dates: 'Jan 01-06', impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, landingPageCtr: 0, websiteVisits: 0, leads: 2, cpl: 58.25,  engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 116.51 },
    ],
  },
  {
    id: 'C03482',
    name: 'Pain Points | Website Visits | Single Image | ICP 1.1: Brokers-Ops, F,P | Manual | 22k',
    objective: 'Website Visits',
    budget: 'EUR 33.87/day',
    period: 'Dec 01 2025 - Jan 06 2026',
    currency: 'EUR',
    weeks: [
      { week: 'Week 1', dates: 'Dec 01-07', impressions: 7981,  clicks: 139, ctr: 4.838, cpc: 1.64, cpm: 27.77, landingPageCtr: 4.838, websiteVisits: 139, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 221.69 },
      { week: 'Week 2', dates: 'Dec 08-14', impressions: 11307, clicks: 121, ctr: 1.224, cpc: 1.45, cpm: 16.39, landingPageCtr: 1.224, websiteVisits: 121, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 185.37 },
      { week: 'Week 3', dates: 'Dec 15-21', impressions: 21045, clicks: 172, ctr: 0.836, cpc: 1.53, cpm: 12.38, landingPageCtr: 0.836, websiteVisits: 172, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 260.60 },
      { week: 'Week 4', dates: 'Dec 22-28', impressions: 11366, clicks: 141, ctr: 1.249, cpc: 1.88, cpm: 23.45, landingPageCtr: 1.249, websiteVisits: 141, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 266.56 },
      { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 11140, clicks: 145, ctr: 1.375, cpc: 2.02, cpm: 26.36, landingPageCtr: 1.375, websiteVisits: 145, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 293.60 },
      { week: 'Week 6', dates: 'Jan 05-06',    impressions: 4687,  clicks: 44,  ctr: 0.941, cpc: 1.91, cpm: 17.95, landingPageCtr: 0.941, websiteVisits: 44,  leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 0, cpv: 0, spend: 84.12  },
    ],
  },
  {
    id: 'VIDEO01',
    name: 'Cold Unaware | Video Views | ICP 1.1: Brokers-Ops, F,P | Video Ad',
    objective: 'Video Views',
    budget: 'EUR 30.00/day',
    period: 'Dec 01 2025 - Jan 06 2026',
    currency: 'EUR',
    weeks: [
      { week: 'Week 1', dates: 'Dec 01-07', impressions: 6725, clicks: 0, ctr: 0, cpc: 0, cpm: 30.20, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 33.12, cpv: 0.091, spend: 203.12 },
      { week: 'Week 2', dates: 'Dec 08-14', impressions: 7342, clicks: 0, ctr: 0, cpc: 0, cpm: 25.48, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 31.67, cpv: 0.080, spend: 187.01 },
      { week: 'Week 3', dates: 'Dec 15-21', impressions: 8532, clicks: 0, ctr: 0, cpc: 0, cpm: 32.79, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 33.98, cpv: 0.097, spend: 279.83 },
      { week: 'Week 4', dates: 'Dec 22-28', impressions: 6243, clicks: 0, ctr: 0, cpc: 0, cpm: 47.01, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 34.47, cpv: 0.136, spend: 293.46 },
      { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 6304, clicks: 0, ctr: 0, cpc: 0, cpm: 51.04, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 38.07, cpv: 0.134, spend: 321.75 },
      { week: 'Week 6', dates: 'Jan 05-06',    impressions: 1619, clicks: 0, ctr: 0, cpc: 0, cpm: 46.65, landingPageCtr: 0, websiteVisits: 0, leads: 0, cpl: 0, engRate: 0, engagements: 0, videoViewRate: 39.53, cpv: 0.118, spend: 75.53  },
    ],
  },
];

// ─── OBJECTIVE STATUS LOGIC ──────────────────────────────────
function getObjectiveStatus(campaign, week) {
  const obj = campaign.objective;
  if (obj === 'Engagement') {
    const ctrOk  = week.ctr >= BENCHMARKS.ctr;
    const engOk  = week.engRate >= BENCHMARKS.engagementRate;
    const webOk  = week.landingPageCtr >= BENCHMARKS.websiteCtr;
    if (ctrOk && engOk && webOk) return { label: 'Meeting All', color: 'green' };
    if (ctrOk || engOk)          return { label: 'Partially Met', color: 'amber' };
    return { label: 'Below Target', color: 'red' };
  }
  if (obj === 'Lead Generation') {
    if (week.leads > 0) return { label: 'Leads Generated', color: 'green' };
    return { label: 'No Leads', color: 'red' };
  }
  if (obj === 'Website Visits') {
    if (week.ctr >= BENCHMARKS.ctr) return { label: 'Meeting CTR', color: 'green' };
    return { label: 'Below CTR Target', color: 'red' };
  }
  if (obj === 'Video Views') {
    if (week.videoViewRate >= BENCHMARKS.videoViewThroughRate) return { label: 'Meeting View Rate', color: 'green' };
    return { label: 'Below View Rate', color: 'amber' };
  }
  return { label: 'N/A', color: 'gray' };
}

function StatusPill({ status }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50 text-red-700 border-red-200',
    gray:  'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[status.color]}`}>
      {status.color === 'green' ? '✓' : status.color === 'red' ? '✗' : '~'} {status.label}
    </span>
  );
}

// ─── OBJECTIVE METRICS CONFIG ────────────────────────────────
function getObjectiveColumns(objective) {
  if (objective === 'Engagement')    return ['Week', 'Dates', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Eng Rate', 'Engagements', 'Web Visits', 'Web CTR', 'Spend', 'Objective Met'];
  if (objective === 'Lead Generation') return ['Week', 'Dates', 'Leads', 'CPL', 'Spend', 'Objective Met'];
  if (objective === 'Website Visits') return ['Week', 'Dates', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Web Visits', 'Spend', 'Objective Met'];
  if (objective === 'Video Views')    return ['Week', 'Dates', 'Impressions', 'View Rate', 'CPV', 'CPM', 'Spend', 'Objective Met'];
  return ['Week', 'Dates', 'Impressions', 'Clicks', 'CTR', 'Spend', 'Objective Met'];
}

function getObjectiveRow(campaign, week) {
  const obj = campaign.objective;
  const cur = campaign.currency;
  const fmt = (v, decimals = 2) => v > 0 ? `${cur} ${v.toFixed(decimals)}` : '—';
  const pct = (v) => v > 0 ? `${v.toFixed(3)}%` : '—';
  const num = (v) => v > 0 ? v.toLocaleString() : '—';
  const status = getObjectiveStatus(campaign, week);

  if (obj === 'Engagement')    return [week.week, week.dates, num(week.impressions), num(week.clicks), pct(week.ctr), fmt(week.cpc), fmt(week.cpm), pct(week.engRate), num(week.engagements), num(week.websiteVisits), pct(week.landingPageCtr), fmt(week.spend), <StatusPill status={status} key="s" />];
  if (obj === 'Lead Generation') return [week.week, week.dates, week.leads, week.cpl > 0 ? `${cur} ${week.cpl.toFixed(2)}` : '—', `${cur} ${week.spend.toFixed(2)}`, <StatusPill status={status} key="s" />];
  if (obj === 'Website Visits') return [week.week, week.dates, num(week.impressions), num(week.clicks), pct(week.ctr), fmt(week.cpc), fmt(week.cpm), num(week.websiteVisits), fmt(week.spend), <StatusPill status={status} key="s" />];
  if (obj === 'Video Views')    return [week.week, week.dates, num(week.impressions), pct(week.videoViewRate), fmt(week.cpv, 3), fmt(week.cpm), fmt(week.spend), <StatusPill status={status} key="s" />];
  return [week.week, week.dates, num(week.impressions), num(week.clicks), pct(week.ctr), fmt(week.spend), <StatusPill status={status} key="s" />];
}

// ─── TOTALS ROW ───────────────────────────────────────────────
function getCampaignTotals(campaign) {
  const weeks = campaign.weeks;
  const cur = campaign.currency;
  const totalSpend       = weeks.reduce((s, w) => s + w.spend, 0);
  const totalImpressions = weeks.reduce((s, w) => s + w.impressions, 0);
  const totalClicks      = weeks.reduce((s, w) => s + w.clicks, 0);
  const totalLeads       = weeks.reduce((s, w) => s + w.leads, 0);
  const totalEngagements = weeks.reduce((s, w) => s + w.engagements, 0);
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
  const avgEngRate       = totalImpressions > 0 ? (totalEngagements / totalImpressions * 100) : 0;
  const avgCpc           = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm           = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;
  const avgCpl           = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgViewRate      = weeks.filter(w => w.videoViewRate > 0).length > 0
    ? weeks.filter(w => w.videoViewRate > 0).reduce((s, w) => s + w.videoViewRate, 0) / weeks.filter(w => w.videoViewRate > 0).length : 0;
  const avgCpv           = weeks.filter(w => w.cpv > 0).length > 0
    ? weeks.filter(w => w.cpv > 0).reduce((s, w) => s + w.cpv, 0) / weeks.filter(w => w.cpv > 0).length : 0;

  return { totalSpend, totalImpressions, totalClicks, totalLeads, totalEngagements, avgCtr, avgEngRate, avgCpc, avgCpm, avgCpl, avgViewRate, avgCpv, cur };
}

// ─── HTML EXPORT ─────────────────────────────────────────────
function generateExportHTML(campaigns) {
  const now = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  const campaignHTML = campaigns.map(c => {
    const totals = getCampaignTotals(c);
    const columns = getObjectiveColumns(c.objective);
    const headerRow = columns.map(col => `<th style="text-align:left;padding:8px 12px;background:#f2f1ec;font-family:monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8a8880;white-space:nowrap;border-bottom:1px solid #e8e6df">${col}</th>`).join('');
    const dataRows = c.weeks.map((week, i) => {
      const status = getObjectiveStatus(c, week);
      const statusColor = status.color === 'green' ? '#059669' : status.color === 'red' ? '#dc2626' : '#d97706';
      const obj = c.objective;
      const cur = c.currency;
      const pct = v => v > 0 ? `${v.toFixed(3)}%` : '-';
      const fmt = (v, d=2) => v > 0 ? `${cur} ${v.toFixed(d)}` : '-';
      const num = v => v > 0 ? v.toLocaleString() : '-';
      let cells = [];
      if (obj === 'Engagement')      cells = [week.week, week.dates, num(week.impressions), num(week.clicks), pct(week.ctr), fmt(week.cpc), fmt(week.cpm), pct(week.engRate), num(week.engagements), num(week.websiteVisits), pct(week.landingPageCtr), fmt(week.spend)];
      else if (obj === 'Lead Generation') cells = [week.week, week.dates, week.leads, week.cpl > 0 ? fmt(week.cpl) : '-', fmt(week.spend)];
      else if (obj === 'Website Visits')  cells = [week.week, week.dates, num(week.impressions), num(week.clicks), pct(week.ctr), fmt(week.cpc), fmt(week.cpm), num(week.websiteVisits), fmt(week.spend)];
      else if (obj === 'Video Views')     cells = [week.week, week.dates, num(week.impressions), pct(week.videoViewRate), fmt(week.cpv,3), fmt(week.cpm), fmt(week.spend)];
      cells.push(`<span style="color:${statusColor};font-weight:700">${status.color === 'green' ? '✓' : status.color === 'red' ? '✗' : '~'} ${status.label}</span>`);
      return `<tr style="background:${i%2===0?'white':'#fafaf9'}">${cells.map(cell => `<td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #e8e6df;white-space:nowrap">${cell}</td>`).join('')}</tr>`;
    }).join('');

    return `
      <div style="margin-bottom:40px;border:1px solid #e8e6df;border-radius:8px;overflow:hidden">
        <div style="background:#272828;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-family:monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B1AAA4;margin-bottom:4px">Campaign ID: ${c.id}</div>
            <div style="color:white;font-weight:700;font-size:15px;max-width:600px">${c.name}</div>
          </div>
          <div style="text-align:right">
            <span style="background:#F6DC4E;color:#272828;font-size:10px;font-weight:700;padding:3px 10px;border-radius:3px;font-family:monospace">${c.objective.toUpperCase()}</span>
            <div style="color:#B1AAA4;font-size:11px;margin-top:4px">${c.budget} &nbsp;·&nbsp; ${c.period}</div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${dataRows}</tbody>
          </table>
        </div>
        <div style="background:#f2f1ec;padding:10px 20px;font-size:11px;color:#8a8880;font-family:monospace">
          TOTALS &nbsp;·&nbsp; ${c.currency} ${totals.totalSpend.toFixed(2)} spent
          ${totals.totalImpressions > 0 ? ` &nbsp;·&nbsp; ${totals.totalImpressions.toLocaleString()} impressions` : ''}
          ${totals.totalClicks > 0 ? ` &nbsp;·&nbsp; ${totals.totalClicks.toLocaleString()} clicks` : ''}
          ${totals.totalLeads > 0 ? ` &nbsp;·&nbsp; ${totals.totalLeads} leads` : ''}
          ${totals.avgCtr > 0 ? ` &nbsp;·&nbsp; Avg CTR ${totals.avgCtr.toFixed(3)}%` : ''}
          ${totals.avgEngRate > 0 ? ` &nbsp;·&nbsp; Avg Eng Rate ${totals.avgEngRate.toFixed(3)}%` : ''}
          ${totals.avgViewRate > 0 ? ` &nbsp;·&nbsp; Avg View Rate ${totals.avgViewRate.toFixed(2)}%` : ''}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Performance per Campaign - Turn Left Media</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F4F3F0;color:#272828;line-height:1.6}.container{max-width:1400px;margin:0 auto;padding:24px}@media print{body{background:white}.no-print{display:none!important}}</style>
</head><body><div class="container">
<div style="background:#272828;color:white;padding:40px;border-radius:12px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <svg width="36" height="36" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" fill="#1a1a1a"/><path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/><path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/><path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/></svg>
      <span style="color:#B1AAA4;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Turn Left Media</span>
    </div>
    <h1 style="font-size:28px;font-weight:700;margin-bottom:8px">Performance per Campaign</h1>
    <p style="color:#B1AAA4;font-size:14px">Week-by-Week Summary with Objective Benchmarks</p>
  </div>
  <div style="text-align:right">
    <div style="color:#F6DC4E;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Campaign Report</div>
    <div style="color:#B1AAA4;font-size:13px">Generated: ${now}</div>
    <div style="color:#B1AAA4;font-size:12px;margin-top:4px">${campaigns.length} campaigns</div>
  </div>
</div>
${campaignHTML}
<div style="text-align:center;padding:20px;color:#B1AAA4;font-size:12px;border-top:1px solid #e8e6df;margin-top:20px">
  Report generated by Turn Left Media &nbsp;·&nbsp; ${now} &nbsp;·&nbsp; Benchmarks: CTR 0.4% | Eng Rate 2.5% | View Rate 35%
</div>
</div></body></html>`;
}

// ─── CSV EXPORT ───────────────────────────────────────────────
function generateCSV(campaigns) {
  const rows = [['Campaign ID', 'Campaign Name', 'Objective', 'Week', 'Dates', 'Impressions', 'Clicks', 'CTR %', 'CPC', 'CPM', 'Landing Page CTR %', 'Website Visits', 'Leads', 'CPL', 'Eng Rate %', 'Engagements', 'Video View Rate %', 'CPV', 'Spend', 'Objective Status']];
  campaigns.forEach(c => {
    c.weeks.forEach(w => {
      const status = getObjectiveStatus(c, w);
      rows.push([
        c.id, `"${c.name}"`, c.objective, w.week, w.dates,
        w.impressions, w.clicks, w.ctr.toFixed(3), w.cpc.toFixed(2), w.cpm.toFixed(2),
        w.landingPageCtr.toFixed(3), w.websiteVisits, w.leads,
        w.cpl > 0 ? w.cpl.toFixed(2) : '0',
        w.engRate.toFixed(3), w.engagements,
        w.videoViewRate.toFixed(2), w.cpv.toFixed(3),
        w.spend.toFixed(2), status.label
      ]);
    });
  });
  return rows.map(r => r.join(',')).join('\n');
}

// ─── CAMPAIGN CARD ────────────────────────────────────────────
function CampaignCard({ campaign }) {
  const [open, setOpen] = useState(true);
  const totals = getCampaignTotals(campaign);
  const columns = getObjectiveColumns(campaign.objective);
  const objColors = {
    'Engagement':     'border-l-indigo-500 bg-indigo-50',
    'Lead Generation':'border-l-blue-500 bg-blue-50',
    'Website Visits': 'border-l-emerald-500 bg-emerald-50',
    'Video Views':    'border-l-violet-500 bg-violet-50',
  };
  const badgeColors = {
    'Engagement':     'bg-indigo-100 text-indigo-700',
    'Lead Generation':'bg-blue-100 text-blue-700',
    'Website Visits': 'bg-emerald-100 text-emerald-700',
    'Video Views':    'bg-violet-100 text-violet-700',
  };

  // Count weeks meeting objective
  const metCount = campaign.weeks.filter(w => getObjectiveStatus(campaign, w).color === 'green').length;
  const totalWeeks = campaign.weeks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      {/* Campaign Header */}
      <div className={`border-l-4 p-4 ${objColors[campaign.objective] || 'border-l-gray-400 bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[campaign.objective] || 'bg-gray-100 text-gray-600'}`}>
                {campaign.objective}
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {campaign.id}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{campaign.name}</p>
            <p className="text-xs text-gray-500 mt-1">{campaign.budget} &nbsp;·&nbsp; {campaign.period}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Objective met summary */}
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-0.5">Objective Met</div>
              <div className={`text-sm font-bold ${metCount === totalWeeks ? 'text-green-600' : metCount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {metCount}/{totalWeeks} weeks
              </div>
            </div>
            <button onClick={() => setOpen(!open)}
              className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
              {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pt-3 border-t border-black/5">
          <span className="text-xs text-gray-600"><span className="font-semibold">{campaign.currency} {totals.totalSpend.toFixed(2)}</span> total spend</span>
          {totals.totalImpressions > 0 && <span className="text-xs text-gray-600"><span className="font-semibold">{totals.totalImpressions.toLocaleString()}</span> impressions</span>}
          {totals.totalClicks > 0 && <span className="text-xs text-gray-600"><span className="font-semibold">{totals.totalClicks.toLocaleString()}</span> clicks</span>}
          {totals.avgCtr > 0 && <span className="text-xs text-gray-600">Avg CTR <span className="font-semibold">{totals.avgCtr.toFixed(3)}%</span></span>}
          {totals.totalLeads > 0 && <span className="text-xs text-gray-600"><span className="font-semibold">{totals.totalLeads}</span> leads</span>}
          {totals.avgCpl > 0 && <span className="text-xs text-gray-600">Avg CPL <span className="font-semibold">{campaign.currency} {totals.avgCpl.toFixed(2)}</span></span>}
          {totals.avgEngRate > 0 && <span className="text-xs text-gray-600">Avg Eng Rate <span className="font-semibold">{totals.avgEngRate.toFixed(3)}%</span></span>}
          {totals.avgViewRate > 0 && <span className="text-xs text-gray-600">Avg View Rate <span className="font-semibold">{totals.avgViewRate.toFixed(2)}%</span></span>}
        </div>
      </div>

      {/* Weekly Table */}
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
              {campaign.weeks.map((week, i) => (
                <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  {getObjectiveRow(campaign, week).map((cell, j) => (
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
export default function ObjectiveTabs() {
  const reportRef = useRef(null);

  function downloadHTML() {
    const html = generateExportHTML(CAMPAIGNS);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `performance-per-campaign-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const csv  = generateCSV(CAMPAIGNS);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `performance-per-campaign-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <div ref={reportRef}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Performance per Campaign</h2>
          <p className="text-sm text-slate-400 mt-0.5">Week-by-week breakdown with objective benchmark status</p>
        </div>
        {/* Download buttons — matching Report Generator style */}
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

      {/* Benchmark reference bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest self-center">Benchmarks</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">CTR</span> &ge; {BENCHMARKS.ctr}%</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">Engagement Rate</span> &ge; {BENCHMARKS.engagementRate}%</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">Web CTR</span> &ge; {BENCHMARKS.websiteCtr}%</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">Video View Rate</span> &ge; {BENCHMARKS.videoViewThroughRate}%</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">Video Completion</span> &ge; {BENCHMARKS.videoCompletionRate}%</span>
        <span className="text-xs text-slate-300"><span className="text-white font-semibold">Lead Form Completion</span> &ge; {BENCHMARKS.leadFormCompletionRate}%</span>
      </div>

      {/* Campaign cards */}
      {CAMPAIGNS.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}