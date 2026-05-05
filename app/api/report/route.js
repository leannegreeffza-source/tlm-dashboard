import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OBJECTIVE_META = {
  LEAD_GENERATION:      { label: 'Lead Generation',     kpis: 'Leads, CPL, Form Fill Rate, CTR' },
  BRAND_AWARENESS:      { label: 'Brand Awareness',     kpis: 'Impressions, Reach, CPM, Frequency' },
  WEBSITE_VISITS:       { label: 'Website Visits',      kpis: 'Clicks, CPC, CTR, Landing Page Views, Website Conversions (Insight Tag), Cost Per Conversion' },
  ENGAGEMENT:           { label: 'Engagement',          kpis: 'Engagement Rate, Clicks, Likes, Shares, Comments' },
  VIDEO_VIEWS:          { label: 'Video Views',         kpis: 'Video Views, View Rate, Cost Per View, Completion Rate' },
  WEBSITE_CONVERSIONS:  { label: 'Website Conversions', kpis: 'Website Conversions (Insight Tag), Cost Per Conversion, Conversion Rate, CTR, CPC' },
  JOB_APPLICANTS:       { label: 'Job Applicants',      kpis: 'Applications, Cost Per Application, CTR' },
};

function safe(v, fallback) { return v != null && v !== '' ? v : fallback; }
function num(v) { return parseFloat(v) || 0; }
function fmt(v) { return num(v).toFixed(2); }
function fmtInt(v) { return (parseInt(v) || 0).toLocaleString(); }
function getObjLabel(t) { return OBJECTIVE_META[(t||'').toUpperCase()]?.label || t || 'Unknown'; }
function getObjKPIs(t) { return OBJECTIVE_META[(t||'').toUpperCase()]?.kpis || 'Impressions, Clicks, CTR, Spend'; }

export async function POST(request) {
  let current = {}, previous = {}, topCampaigns = [], topAds = [];
  let currentRange = {start:'',end:''}, previousRange = {start:'',end:''};

  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    current = body.current || {};
    previous = body.previous || {};
    topCampaigns = body.topCampaigns || [];
    topAds = body.topAds || [];
    currentRange = body.currentRange || {start:'',end:''};
    previousRange = body.previousRange || {start:'',end:''};

    // Currency conversion
    const exchangeRate = parseFloat(body.exchangeRate) || 0;
    const currency = body.currency || 'USD';
    const currencySymbol = body.currencySymbol || '$';
    const hasFx = exchangeRate > 0 && currency !== 'USD';

    // Format a USD value in local currency
    function fmtMoney(usdVal) {
      const v = num(usdVal);
      if (hasFx) {
        const local = v * exchangeRate;
        return `${currencySymbol}${local.toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
      }
      return `$${fmt(v)}`;
    }

    console.log('[Report] Received:', topCampaigns.length, 'campaigns,', topAds.length, 'ads');

    // Group campaigns by objective
    const byObjective = {};
    for (const c of topCampaigns) {
      const obj = getObjLabel(c.objectiveType);
      if (!byObjective[obj]) byObjective[obj] = [];
      byObjective[obj].push(c);
    }

    // Build objective breakdown
    let objectiveBreakdown = '';
    try {
      objectiveBreakdown = Object.entries(byObjective).map(([obj, camps]) => {
        const totalImp = camps.reduce((s, c) => s + num(c.impressions), 0);
        const totalClk = camps.reduce((s, c) => s + num(c.clicks), 0);
        const totalSpd = camps.reduce((s, c) => s + num(c.spent), 0);
        const totalLds = camps.reduce((s, c) => s + num(c.leads), 0);
        const relevantKPIs = getObjKPIs(camps[0]?.objectiveType);

        const campDetails = camps.map(c => {
          const name = c.name || `Campaign ${c.id}`;
          const ctr = num(c.impressions) > 0 ? (num(c.clicks) / num(c.impressions) * 100).toFixed(2) : '0.00';
          const cpc = num(c.clicks) > 0 ? (num(c.spent) / num(c.clicks)).toFixed(2) : '0.00';
          const cpl = num(c.leads) > 0 ? fmtMoney(num(c.spent) / num(c.leads)) : 'N/A';
          return `    - ${name} (ID: ${c.id}): ${fmtInt(c.impressions)} imp, ${fmtInt(c.clicks)} clicks, ${ctr}% CTR, ${fmtMoney(c.spent)} spent, ${safe(c.leads,0)} leads, ${safe(c.conversions,0)} conversions, CPC ${fmtMoney(num(c.spent)/Math.max(num(c.clicks),1))}, CPL ${cpl}`;
        }).join('\n');

        return `OBJECTIVE: ${obj} (${camps.length} campaign${camps.length !== 1 ? 's' : ''})
  Relevant KPIs: ${relevantKPIs}
  Totals: ${fmtInt(totalImp)} imp, ${fmtInt(totalClk)} clicks, ${fmtMoney(totalSpd)} spent, ${totalLds} leads
  Campaigns:
${campDetails}`;
      }).join('\n\n');
    } catch (e) {
      console.error('[Report] Error building objective breakdown:', e);
      objectiveBreakdown = 'Error building objective breakdown';
    }

    // Build ads section
    let adsSection = '';
    const hasAds = topAds.length > 0;
    try {
      if (hasAds) {
        adsSection = `\n\nAD-LEVEL PERFORMANCE (${topAds.length} ads):
${topAds.map(a => {
  const name = a.name || `Ad ${a.id}`;
  const ctr = num(a.impressions) > 0 ? (num(a.clicks) / num(a.impressions) * 100).toFixed(2) : '0.00';
  const cpc = num(a.clicks) > 0 ? (num(a.spent) / num(a.clicks)).toFixed(2) : '0.00';
  return `- ${name} (ID: ${a.id}): ${fmtInt(a.impressions)} imp, ${fmtInt(a.clicks)} clicks, ${ctr}% CTR, ${fmtMoney(a.spent)} spent, ${safe(a.leads,0)} leads, ${safe(a.conversions,0)} conversions, CPC ${fmtMoney(num(a.spent)/Math.max(num(a.clicks),1))}`;
}).join('\n')}`;
      }
    } catch (e) {
      console.error('[Report] Error building ads section:', e);
      adsSection = '';
    }

    const objectivesList = Object.keys(byObjective);

    const prompt = `You are a LinkedIn Ads expert at a digital media agency. Analyze the following campaign data and return a JSON object ONLY — no markdown, no explanation, just raw JSON.

IMPORTANT: These campaigns may have DIFFERENT objectives. Do NOT evaluate all campaigns using Lead Generation metrics. Each campaign must be evaluated against the KPIs relevant to its specific objective.
${hasFx ? `CURRENCY: All monetary values are in ${currency} (${currencySymbol}). Use ${currency} values throughout your analysis — do NOT use USD ($) symbols.` : 'CURRENCY: USD'}

OVERALL METRICS:
- Period: ${currentRange.start} to ${currentRange.end}
- Compare Period: ${previousRange.start} to ${previousRange.end}
- Impressions: ${fmtInt(current.impressions)} (prev: ${fmtInt(previous.impressions)})
- Clicks: ${fmtInt(current.clicks)} (prev: ${fmtInt(previous.clicks)})
- CTR: ${fmt(current.ctr)}% (prev: ${fmt(previous.ctr)}%)
- Spend: ${fmtMoney(current.spent)} (prev: ${fmtMoney(previous.spent)})
- CPM: ${fmtMoney(current.cpm)} (prev: ${fmtMoney(previous.cpm)})
- CPC: ${fmtMoney(current.cpc)} (prev: ${fmtMoney(previous.cpc)})
- Leads: ${safe(current.leads,0)} (prev: ${safe(previous.leads,0)})
- CPL: ${fmtMoney(current.cpl)} (prev: ${fmtMoney(previous.cpl)})
- Website Visits (Landing Page Clicks): ${safe(current.websiteVisits,0)} (prev: ${safe(previous.websiteVisits,0)})
- Website Conversions (Insight Tag): ${safe(current.conversions,0)} (prev: ${safe(previous.conversions,0)})
- Cost Per Conversion: ${fmtMoney(current.costPerConversion)} (prev: ${fmtMoney(previous.costPerConversion)})
- Engagement Rate: ${fmt(current.engagementRate)}%
- Engagements: ${safe(current.engagements,0)}

CAMPAIGNS GROUPED BY OBJECTIVE:
${objectiveBreakdown || 'No campaign data available'}
${adsSection}

Return this exact JSON structure:
{
  "executiveSummary": "2-3 sentence overview",
  "overallPerformance": "optimal|warning|critical",
  "keyMetrics": {
    "impressionsChange": "+X% or -X%",
    "clicksChange": "+X% or -X%",
    "ctrChange": "+X% or -X%",
    "spendChange": "+X% or -X%",
    "cplChange": "+X% or -X%",
    "conversionsChange": "+X% or -X%",
    "costPerConversionChange": "+X% or -X%"
  },
  "objectiveAnalysis": [
    {
      "objective": "objective name",
      "campaignCount": 1,
      "performance": "optimal|warning|critical",
      "summary": "1-2 sentence assessment using the RIGHT KPIs for this objective",
      "keyInsight": "most important finding"
    }
  ],
  "campaignAnalysis": [
    {
      "id": "campaign_id",
      "name": "campaign name",
      "objective": "campaign objective type",
      "performance": "above|below|at benchmark",
      "status": "optimal|warning|critical",
      "trend": "up|down|stable",
      "recommendations": ["rec 1", "rec 2"]
    }
  ],
  ${hasAds ? `"adAnalysis": [
    {
      "id": "ad_id",
      "name": "ad name",
      "performance": "strong|average|weak",
      "insight": "what makes this ad perform well or poorly",
      "recommendation": "specific action"
    }
  ],
  "adInsights": {
    "topPerformer": "which ad performs best and why",
    "worstPerformer": "which ad underperforms and why",
    "creativeRecommendations": ["rec 1", "rec 2", "rec 3"]
  },` : ''}
  "topPerformers": ["insight 1", "insight 2", "insight 3"],
  "areasForImprovement": ["area 1", "area 2", "area 3"],
  "strategicRecommendations": ["rec 1", "rec 2", "rec 3", "rec 4", "rec 5"],
  "budgetRecommendation": "specific budget advice",
  "immediateActions": ["action 1", "action 2", "action 3"]
}`;

    console.log('[Report] Sending prompt to Claude, length:', prompt.length);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    });

    let reportJson;
    try {
      const text = message.content[0].text.replace(/```json|```/g, '').trim();
      reportJson = JSON.parse(text);
      console.log('[Report] Parsed JSON successfully');
    } catch (e) {
      console.error('[Report] JSON parse failed:', e.message);
      reportJson = {
        executiveSummary: message.content[0].text.substring(0, 500),
        overallPerformance: 'warning',
        keyMetrics: {},
        objectiveAnalysis: [],
        campaignAnalysis: [],
        topPerformers: [],
        areasForImprovement: [],
        strategicRecommendations: [],
        budgetRecommendation: '',
        immediateActions: []
      };
    }

    console.log('[Report] Returning response with', topCampaigns.length, 'campaigns,', topAds.length, 'ads');

    return NextResponse.json({
      report: reportJson,
      metrics: { current, previous, topCampaigns, topAds },
      period: { currentRange, previousRange }
    });

  } catch (error) {
    console.error('[Report] FATAL ERROR:', error.message, error.stack);
    // Even on error, return the data we received so the frontend can display it
    return NextResponse.json({
      report: {
        executiveSummary: 'Report generation failed: ' + (error.message || 'Unknown error'),
        overallPerformance: 'warning',
        keyMetrics: {},
        objectiveAnalysis: [],
        campaignAnalysis: [],
        topPerformers: [],
        areasForImprovement: [],
        strategicRecommendations: [],
        budgetRecommendation: '',
        immediateActions: []
      },
      metrics: { current, previous, topCampaigns, topAds },
      period: { currentRange, previousRange }
    });
  }
}