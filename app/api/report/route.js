import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Map LinkedIn objective codes to human-readable names and relevant KPIs
const OBJECTIVE_META = {
  LEAD_GENERATION:      { label: 'Lead Generation',     kpis: 'Leads, CPL, Form Fill Rate, CTR' },
  BRAND_AWARENESS:      { label: 'Brand Awareness',     kpis: 'Impressions, Reach, CPM, Frequency' },
  WEBSITE_VISITS:       { label: 'Website Visits',      kpis: 'Clicks, CPC, CTR, Landing Page Views' },
  ENGAGEMENT:           { label: 'Engagement',          kpis: 'Engagement Rate, Clicks, Likes, Shares, Comments' },
  VIDEO_VIEWS:          { label: 'Video Views',         kpis: 'Video Views, View Rate, Cost Per View, Completion Rate' },
  WEBSITE_CONVERSIONS:  { label: 'Website Conversions', kpis: 'Conversions, CPA, Conversion Rate, CTR' },
  JOB_APPLICANTS:       { label: 'Job Applicants',      kpis: 'Applications, Cost Per Application, CTR' },
  SPONSORED_UPDATES:    { label: 'Sponsored Content',   kpis: 'Engagement Rate, CTR, Impressions' },
  SPONSORED_INMAILS:    { label: 'Sponsored InMail',    kpis: 'Open Rate, CTR, Leads, CPL' },
  SPONSORED_VIDEO:      { label: 'Sponsored Video',     kpis: 'Video Views, Completion Rate, Cost Per View' },
};

function getObjectiveLabel(type) {
  const upper = (type || '').toUpperCase();
  return OBJECTIVE_META[upper]?.label || type || 'Unknown';
}

function getObjectiveKPIs(type) {
  const upper = (type || '').toUpperCase();
  return OBJECTIVE_META[upper]?.kpis || 'Impressions, Clicks, CTR, Spend';
}

export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const {
      current, previous, topCampaigns, topAds, budgetPacing,
      currentRange, previousRange, selectedCampaigns, exchangeRate,
      reportLevel, selectedAdIds,
    } = await request.json();

    const avgCTR = current.ctr?.toFixed(2) || '0.00';
    const avgCPL = current.cpl?.toFixed(2) || '0.00';
    const avgCPM = current.cpm?.toFixed(2) || '0.00';
    const avgCPC = current.cpc?.toFixed(2) || '0.00';

    // Group campaigns by objective
    const byObjective = {};
    for (const c of (topCampaigns || [])) {
      const obj = getObjectiveLabel(c.objectiveType);
      if (!byObjective[obj]) byObjective[obj] = [];
      byObjective[obj].push(c);
    }

    // Build objective breakdown for the prompt
    const objectiveBreakdown = Object.entries(byObjective).map(([obj, camps]) => {
      const totalImp = camps.reduce((s, c) => s + (c.impressions || 0), 0);
      const totalClk = camps.reduce((s, c) => s + (c.clicks || 0), 0);
      const totalSpd = camps.reduce((s, c) => s + (c.spent || 0), 0);
      const totalLds = camps.reduce((s, c) => s + (c.leads || 0), 0);
      const objType = camps[0]?.objectiveType || '';
      const relevantKPIs = getObjectiveKPIs(objType);

      const campDetails = camps.map(c => {
        const name = c.name || `Campaign ${c.id}`;
        const ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100).toFixed(2) : '0.00';
        const cpc = c.clicks > 0 ? (c.spent / c.clicks).toFixed(2) : '0.00';
        const cpl = c.leads > 0 ? (c.spent / c.leads).toFixed(2) : 'N/A';
        return `    - ${name} (ID: ${c.id}): ${(c.impressions || 0).toLocaleString()} imp, ${(c.clicks || 0).toLocaleString()} clicks, ${ctr}% CTR, $${(c.spent || 0).toFixed(2)} spent, ${c.leads || 0} leads, CPC $${cpc}, CPL ${cpl !== 'N/A' ? '$' + cpl : 'N/A'}`;
      }).join('\n');

      return `OBJECTIVE: ${obj} (${camps.length} campaign${camps.length !== 1 ? 's' : ''})
  Relevant KPIs for this objective: ${relevantKPIs}
  Totals: ${totalImp.toLocaleString()} impressions, ${totalClk.toLocaleString()} clicks, $${totalSpd.toFixed(2)} spent, ${totalLds} leads
  Campaigns:
${campDetails}`;
    }).join('\n\n');

    // Build ads section if ads data is provided
    const hasAds = topAds && topAds.length > 0;
    const adsSection = hasAds
      ? `\n\nAD-LEVEL PERFORMANCE (${topAds.length} ads):
${topAds.map(a => {
  const name = a.name || `Ad ${a.id}`;
  const ctr = a.impressions > 0 ? (a.clicks / a.impressions * 100).toFixed(2) : '0.00';
  const cpc = a.clicks > 0 ? (a.spent / a.clicks).toFixed(2) : '0.00';
  return `- ${name} (ID: ${a.id}): ${(a.impressions || 0).toLocaleString()} imp, ${(a.clicks || 0).toLocaleString()} clicks, ${ctr}% CTR, $${(a.spent || 0).toFixed(2)} spent, ${a.leads || 0} leads, CPC $${cpc}`;
}).join('\n')}`
      : '';

    // Determine which objectives are present
    const objectivesList = Object.keys(byObjective);
    const hasLeadGen = objectivesList.some(o => o.includes('Lead'));
    const hasAwareness = objectivesList.some(o => o.includes('Awareness'));
    const hasWebsite = objectivesList.some(o => o.includes('Website'));
    const hasEngagement = objectivesList.some(o => o.includes('Engagement'));
    const hasVideo = objectivesList.some(o => o.includes('Video'));

    const prompt = `You are a LinkedIn Ads expert at a digital media agency. Analyze the following campaign data and return a JSON object ONLY — no markdown, no explanation, just raw JSON.

IMPORTANT: These campaigns have DIFFERENT objectives. Do NOT evaluate all campaigns using Lead Generation metrics. Each campaign must be evaluated against the KPIs relevant to its specific objective:
${objectivesList.map(o => `- ${o} campaigns: evaluate using ${getObjectiveKPIs(Object.entries(byObjective).find(([k]) => k === o)?.[1]?.[0]?.objectiveType || '')}`).join('\n')}

OVERALL METRICS:
- Period: ${currentRange.start} to ${currentRange.end}
- Compare Period: ${previousRange.start} to ${previousRange.end}
- Impressions: ${current.impressions?.toLocaleString()} (prev: ${previous.impressions?.toLocaleString()})
- Clicks: ${current.clicks?.toLocaleString()} (prev: ${previous.clicks?.toLocaleString()})
- CTR: ${avgCTR}% (prev: ${previous.ctr?.toFixed(2)}%)
- Spend: $${current.spent?.toFixed(2)} (prev: $${previous.spent?.toFixed(2)})
- CPM: $${avgCPM} (prev: $${previous.cpm?.toFixed(2)})
- CPC: $${avgCPC} (prev: $${previous.cpc?.toFixed(2)})
- Leads: ${current.leads} (prev: ${previous.leads})
- CPL: $${avgCPL} (prev: $${previous.cpl?.toFixed(2)})
- Engagement Rate: ${current.engagementRate?.toFixed(2)}%
- Engagements: ${current.engagements}

CAMPAIGNS GROUPED BY OBJECTIVE:
${objectiveBreakdown || 'No campaign data available'}
${adsSection}

Return this exact JSON structure. CRITICAL: Your analysis for each campaign MUST be based on its specific objective. A Brand Awareness campaign with high impressions but low leads is performing WELL. A Lead Gen campaign with high impressions but low leads is performing POORLY. Evaluate accordingly.

{
  "executiveSummary": "2-3 sentence overview that acknowledges the different objectives being run and overall performance",
  "overallPerformance": "optimal|warning|critical",
  "keyMetrics": {
    "impressionsChange": "+X% or -X%",
    "clicksChange": "+X% or -X%",
    "ctrChange": "+X% or -X%",
    "spendChange": "+X% or -X%",
    "cplChange": "+X% or -X%"
  },
  "objectiveAnalysis": [
    {
      "objective": "objective name",
      "campaignCount": 1,
      "performance": "optimal|warning|critical",
      "summary": "1-2 sentence assessment using the RIGHT KPIs for this objective",
      "keyInsight": "most important finding for this objective type"
    }
  ],
  "campaignAnalysis": [
    {
      "id": "campaign_id",
      "name": "campaign name",
      "objective": "campaign objective type",
      "performance": "above|below|at benchmark for THIS objective type",
      "status": "optimal|warning|critical",
      "trend": "up|down|stable",
      "recommendations": ["recommendation specific to this campaign's objective", "recommendation 2"]
    }
  ],
  ${hasAds ? `"adAnalysis": [
    {
      "id": "ad_id",
      "name": "ad name",
      "performance": "strong|average|weak",
      "insight": "what makes this ad perform well or poorly",
      "recommendation": "specific action to improve this ad"
    }
  ],
  "adInsights": {
    "topPerformer": "which ad performs best and why",
    "worstPerformer": "which ad underperforms and why",
    "creativeRecommendations": ["creative recommendation 1", "creative recommendation 2", "creative recommendation 3"]
  },` : ''}
  "topPerformers": ["insight 1 — reference the campaign objective", "insight 2", "insight 3"],
  "areasForImprovement": ["area 1 — with objective context", "area 2", "area 3"],
  "strategicRecommendations": [
    "recommendation 1 — specific to the objectives being run",
    "recommendation 2",
    "recommendation 3",
    "recommendation 4",
    "recommendation 5"
  ],
  "budgetRecommendation": "specific budget advice considering the mix of objectives — e.g. shift budget from underperforming awareness to high-performing lead gen",
  "immediateActions": ["action 1", "action 2", "action 3"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    });

    let reportJson;
    try {
      const text = message.content[0].text.replace(/```json|```/g, '').trim();
      reportJson = JSON.parse(text);
    } catch (e) {
      reportJson = {
        executiveSummary: message.content[0].text,
        overallPerformance: 'warning',
        keyMetrics: {},
        objectiveAnalysis: [],
        campaignAnalysis: [],
        adAnalysis: [],
        adInsights: null,
        topPerformers: [],
        areasForImprovement: [],
        strategicRecommendations: [],
        budgetRecommendation: '',
        immediateActions: []
      };
    }

    return NextResponse.json({
      report: reportJson,
      metrics: { current, previous, topCampaigns, topAds },
      period: { currentRange, previousRange }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}