import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function dateToObj(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function calculateMetrics(elements) {
  let impressions = 0, clicks = 0, spent = 0, leads = 0,
    engagements = 0, websiteVisits = 0;

  for (const el of elements) {
    impressions += parseInt(el.impressions || 0);
    clicks += parseInt(el.clicks || 0);
    spent += parseFloat(el.costInLocalCurrency || 0);
    leads += parseInt(el.oneClickLeads || 0);
    engagements += parseInt(el.totalEngagements || 0);
    // landingPageClicks = website visits / external clicks
    websiteVisits += parseInt(el.landingPageClicks || el.externalWebsiteConversions || 0);
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpm = impressions > 0 ? (spent / impressions) * 1000 : 0;
  const cpc = clicks > 0 ? spent / clicks : 0;
  const cpl = leads > 0 ? spent / leads : 0;
  const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

  return { impressions, clicks, spent, leads, engagements, websiteVisits, ctr, cpm, cpc, cpl, engagementRate };
}

export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { accountIds, campaignGroupIds, campaignIds, adIds, currentRange, previousRange, exchangeRate } = await request.json();

    if (!accountIds || accountIds.length === 0) {
      return NextResponse.json({ error: 'No accounts provided' }, { status: 400 });
    }

    const currentStart = dateToObj(currentRange.start);
    const currentEnd = dateToObj(currentRange.end);
    const previousStart = dateToObj(previousRange.start);
    const previousEnd = dateToObj(previousRange.end);

    // Fields including landingPageClicks for website visits
    const fields = 'dateRange,impressions,clicks,costInLocalCurrency,totalEngagements,oneClickLeads,landingPageClicks,externalWebsiteConversions';

    async function fetchAnalytics(startDate, endDate, pivot = 'ACCOUNT') {
      const allElements = [];

      await Promise.all(
        accountIds.map(async (accountId) => {
          try {
            const params = new URLSearchParams({
              q: 'analytics',
              pivot,
              timeGranularity: 'ALL',
              'dateRange.start.year': startDate.year,
              'dateRange.start.month': startDate.month,
              'dateRange.start.day': startDate.day,
              'dateRange.end.year': endDate.year,
              'dateRange.end.month': endDate.month,
              'dateRange.end.day': endDate.day,
              'accounts[0]': `urn:li:sponsoredAccount:${accountId}`,
              fields,
            });

            // Campaign group filter
            if (campaignGroupIds && campaignGroupIds.length > 0) {
              campaignGroupIds.forEach((gId, idx) => {
                params.append(`campaignGroups[${idx}]`, `urn:li:sponsoredCampaignGroup:${gId}`);
              });
            }

            // Campaign filter
            if (campaignIds && campaignIds.length > 0) {
              campaignIds.forEach((cId, idx) => {
                params.append(`campaigns[${idx}]`, `urn:li:sponsoredCampaign:${cId}`);
              });
            }

            // Ad filter
            if (adIds && adIds.length > 0) {
              adIds.forEach((aId, idx) => {
                params.append(`creatives[${idx}]`, `urn:li:sponsoredCreative:${aId}`);
              });
            }

            const res = await fetch(
              `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                  'LinkedIn-Version': '202401',
                },
              }
            );

            if (!res.ok) {
              console.error(`Analytics failed for account ${accountId}:`, await res.text());
              return;
            }

            const data = await res.json();
            allElements.push(...(data.elements || []));
          } catch (err) {
            console.error(`Analytics error for account ${accountId}:`, err);
          }
        })
      );

      return allElements;
    }

    // Fetch top campaigns with CAMPAIGN pivot
    async function fetchTopCampaigns(startDate, endDate) {
      const allElements = [];

      await Promise.all(
        accountIds.map(async (accountId) => {
          try {
            const params = new URLSearchParams({
              q: 'analytics',
              pivot: 'CAMPAIGN',
              timeGranularity: 'ALL',
              'dateRange.start.year': startDate.year,
              'dateRange.start.month': startDate.month,
              'dateRange.start.day': startDate.day,
              'dateRange.end.year': endDate.year,
              'dateRange.end.month': endDate.month,
              'dateRange.end.day': endDate.day,
              'accounts[0]': `urn:li:sponsoredAccount:${accountId}`,
              fields,
            });

            if (campaignGroupIds && campaignGroupIds.length > 0) {
              campaignGroupIds.forEach((gId, idx) => {
                params.append(`campaignGroups[${idx}]`, `urn:li:sponsoredCampaignGroup:${gId}`);
              });
            }

            if (campaignIds && campaignIds.length > 0) {
              campaignIds.forEach((cId, idx) => {
                params.append(`campaigns[${idx}]`, `urn:li:sponsoredCampaign:${cId}`);
              });
            }

            const res = await fetch(
              `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                  'LinkedIn-Version': '202401',
                },
              }
            );

            if (!res.ok) return;

            const data = await res.json();
            allElements.push(...(data.elements || []));
          } catch (err) {
            console.error(`Top campaigns error for account ${accountId}:`, err);
          }
        })
      );

      return allElements;
    }

    // Fetch top ads with CREATIVE pivot
    async function fetchTopAds(startDate, endDate) {
      if (!campaignIds || campaignIds.length === 0) return [];
      const allElements = [];

      await Promise.all(
        accountIds.map(async (accountId) => {
          try {
            const params = new URLSearchParams({
              q: 'analytics',
              pivot: 'CREATIVE',
              timeGranularity: 'ALL',
              'dateRange.start.year': startDate.year,
              'dateRange.start.month': startDate.month,
              'dateRange.start.day': startDate.day,
              'dateRange.end.year': endDate.year,
              'dateRange.end.month': endDate.month,
              'dateRange.end.day': endDate.day,
              'accounts[0]': `urn:li:sponsoredAccount:${accountId}`,
              fields,
            });

            campaignIds.forEach((cId, idx) => {
              params.append(`campaigns[${idx}]`, `urn:li:sponsoredCampaign:${cId}`);
            });

            if (adIds && adIds.length > 0) {
              adIds.forEach((aId, idx) => {
                params.append(`creatives[${idx}]`, `urn:li:sponsoredCreative:${aId}`);
              });
            }

            const res = await fetch(
              `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                  'LinkedIn-Version': '202401',
                },
              }
            );

            if (!res.ok) return;

            const data = await res.json();
            allElements.push(...(data.elements || []));
          } catch (err) {
            console.error(`Top ads error for account ${accountId}:`, err);
          }
        })
      );

      return allElements;
    }

    // Run all fetches in parallel
    const [currentElements, previousElements, campaignElements, adElements] = await Promise.all([
      fetchAnalytics(currentStart, currentEnd),
      fetchAnalytics(previousStart, previousEnd),
      fetchTopCampaigns(currentStart, currentEnd),
      fetchTopAds(currentStart, currentEnd),
    ]);

    const current = calculateMetrics(currentElements);
    const previous = calculateMetrics(previousElements);

    // Build top campaigns list
    const campaignMap = {};
    for (const el of campaignElements) {
      const ref = el.pivotValues?.[0] || el.campaign || '';
      const id = typeof ref === 'string' ? ref.split(':').pop() : String(ref);
      if (!id || id === 'undefined') continue;
      if (!campaignMap[id]) {
        campaignMap[id] = { id, impressions: 0, clicks: 0, spent: 0, leads: 0, websiteVisits: 0 };
      }
      campaignMap[id].impressions += parseInt(el.impressions || 0);
      campaignMap[id].clicks += parseInt(el.clicks || 0);
      campaignMap[id].spent += parseFloat(el.costInLocalCurrency || 0);
      campaignMap[id].leads += parseInt(el.oneClickLeads || 0);
      campaignMap[id].websiteVisits += parseInt(el.landingPageClicks || 0);
    }

    const topCampaigns = Object.values(campaignMap)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions * 100).toFixed(2) : '0.00',
        spent: parseFloat(c.spent.toFixed(2)),
      }));

    // Build top ads list
    const adMap = {};
    for (const el of adElements) {
      const ref = el.pivotValues?.[0] || el.creative || '';
      const id = typeof ref === 'string' ? ref.split(':').pop() : String(ref);
      if (!id || id === 'undefined') continue;
      if (!adMap[id]) {
        adMap[id] = { id, impressions: 0, clicks: 0, spent: 0, leads: 0 };
      }
      adMap[id].impressions += parseInt(el.impressions || 0);
      adMap[id].clicks += parseInt(el.clicks || 0);
      adMap[id].spent += parseFloat(el.costInLocalCurrency || 0);
      adMap[id].leads += parseInt(el.oneClickLeads || 0);
    }

    const topAds = Object.values(adMap)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(a => ({
        ...a,
        ctr: a.impressions > 0 ? (a.clicks / a.impressions * 100).toFixed(2) : '0.00',
        spent: parseFloat(a.spent.toFixed(2)),
      }));

    // Budget pacing
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    return NextResponse.json({
      current,
      previous,
      topCampaigns,
      topAds,
      budgetPacing: {
        spent: current.spent,
        dayOfMonth,
        daysInMonth,
        projectedMonthly: current.spent > 0 ? (current.spent / dayOfMonth) * daysInMonth : 0,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
