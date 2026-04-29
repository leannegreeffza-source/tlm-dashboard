import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { campaignIds } = await request.json();
    if (!campaignIds || campaignIds.length === 0) {
      return NextResponse.json([]);
    }

    const headers = {
      Authorization: `Bearer ${token.accessToken}`,
      'LinkedIn-Version': '202401',
    };

    const allAds = [];
    const seenIds = new Set();

    for (const campaignId of campaignIds) {
      const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;

      const endD = new Date();
      const startD = new Date(Date.now() - 180 * 86400000);

      const params = new URLSearchParams({
        q: 'analytics',
        pivot: 'CREATIVE',
        timeGranularity: 'ALL',
        'dateRange.start.year': startD.getFullYear(),
        'dateRange.start.month': startD.getMonth() + 1,
        'dateRange.start.day': startD.getDate(),
        'dateRange.end.year': endD.getFullYear(),
        'dateRange.end.month': endD.getMonth() + 1,
        'dateRange.end.day': endD.getDate(),
        'campaigns[0]': campaignUrn,
        fields: 'pivotValues,impressions',
      });

      const url = `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`;
      console.log(`Fetching ads for campaign ${campaignId} via analytics pivot`);

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Analytics pivot failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
        continue;
      }

      const data = await res.json();
      const elements = data.elements || [];
      console.log(`Campaign ${campaignId}: found ${elements.length} creatives via analytics`);

      for (const el of elements) {
        const urn = el.pivotValues?.[0];
        if (!urn) continue;
        const id = urn.split(':').pop();
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        allAds.push({
          id,
          name: `Ad ${id}`,
          campaignId: String(campaignId),
          status: 'ACTIVE',
          impressions: parseInt(el.impressions || 0),
        });
      }
    }

    allAds.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    console.log('Total ads returned:', allAds.length);
    return NextResponse.json(allAds);

  } catch (error) {
    console.error('Ads error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}