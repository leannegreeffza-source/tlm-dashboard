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

    // Use 202401 for EVERYTHING — 202504 is rejected by LinkedIn
    const headers = {
      'Authorization': `Bearer ${token.accessToken}`,
      'LinkedIn-Version': '202401',
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const allAds = [];
    const seenIds = new Set();

    for (const campaignId of campaignIds) {
      let elements = [];
      let strategyUsed = 'none';
      const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;

      // ── Strategy A: /v2/adCreatives (NOT V2 suffix) with q=search ──
      try {
        let start = 0;
        const count = 100;
        while (true) {
          const url =
            `https://api.linkedin.com/v2/adCreatives` +
            `?q=search&search.campaign.values[0]=${campaignUrn}` +
            `&count=${count}&start=${start}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[A] /v2/adCreatives q=search for ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
            break;
          }
          const data = await res.json();
          const batch = data.elements || [];
          elements = elements.concat(batch);
          strategyUsed = 'A: /v2/adCreatives';
          if (batch.length < count) break;
          start += count;
          if (start > 2000) break;
        }
      } catch (err) {
        console.error(`[A] threw:`, err.message);
      }

      // ── Strategy B: /v2/adCreativesV2 with q=search ──
      if (elements.length === 0) {
        try {
          let start = 0;
          const count = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/v2/adCreativesV2` +
              `?q=search&search.campaign.values[0]=${campaignUrn}` +
              `&count=${count}&start=${start}`;
            const res = await fetch(url, { headers });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`[B] /v2/adCreativesV2 q=search for ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'B: /v2/adCreativesV2';
            if (batch.length < count) break;
            start += count;
            if (start > 2000) break;
          }
        } catch (err) {
          console.error(`[B] threw:`, err.message);
        }
      }

      // ── Strategy C: /rest/adCreatives with q=search (version 202401) ──
      if (elements.length === 0) {
        try {
          let start = 0;
          const count = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/rest/adCreatives` +
              `?q=search&search.campaign.values[0]=${encodeURIComponent(campaignUrn)}` +
              `&count=${count}&start=${start}`;
            const res = await fetch(url, { headers });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`[C] /rest/adCreatives for ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'C: /rest/adCreatives';
            if (batch.length < count) break;
            start += count;
            if (start > 2000) break;
          }
        } catch (err) {
          console.error(`[C] threw:`, err.message);
        }
      }

      // ── Strategy D: /v2/adCreatives with q=criteria ──
      if (elements.length === 0) {
        try {
          const url =
            `https://api.linkedin.com/v2/adCreatives` +
            `?q=criteria&campaigns[0]=${encodeURIComponent(campaignUrn)}` +
            `&count=100`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[D] /v2/adCreatives q=criteria for ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          } else {
            const data = await res.json();
            elements = data.elements || [];
            if (elements.length > 0) strategyUsed = 'D: /v2/adCreatives q=criteria';
          }
        } catch (err) {
          console.error(`[D] threw:`, err.message);
        }
      }

      // ── Strategy E: analytics pivot CREATIVE (last resort — guaranteed to find ads with impressions) ──
      if (elements.length === 0) {
        console.log(`[E] Trying analytics pivot for campaign ${campaignId}...`);
        try {
          const endD = new Date();
          const startD = new Date(Date.now() - 90 * 86400000);
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
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            console.log(`[E] analytics pivot returned ${data.elements?.length || 0} elements`);
            const creativeIds = (data.elements || [])
              .map(el => el.pivotValues?.[0])
              .filter(Boolean)
              .map(urn => urn.split(':').pop())
              .filter(Boolean);

            if (creativeIds.length > 0) {
              elements = creativeIds.map(id => ({
                id,
                name: `Ad ${id}`,
                status: 'ACTIVE',
              }));
              strategyUsed = 'E: analytics pivot';
            }
          } else {
            const errText = await res.text();
            console.error(`[E] analytics pivot failed for ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          }
        } catch (err) {
          console.error(`[E] threw:`, err.message);
        }
      }

      console.log(`Campaign ${campaignId}: strategy=${strategyUsed}, ads=${elements.length}`);

      // Normalise
      for (const a of elements) {
        const rawId = a.id || a.contentReference?.split(':').pop();
        const id = typeof rawId === 'string' && rawId.includes(':')
          ? rawId.split(':').pop()
          : String(rawId);

        if (!id || id === 'undefined' || seenIds.has(id)) continue;
        seenIds.add(id);

        const name = a.name
          || a.variables?.data?.['com.linkedin.ads.SponsoredUpdateCreativeVariables']?.title
          || a.variables?.data?.['com.linkedin.ads.TextAdCreativeVariables']?.title
          || a.reference
          || `Ad ${id}`;

        allAds.push({
          id,
          name,
          campaignId: String(campaignId),
          status: a.status || 'UNKNOWN',
          type: a.type || '',
        });
      }
    }

    allAds.sort((a, b) => a.name.localeCompare(b.name));
    console.log('Total ads returned:', allAds.length);
    return NextResponse.json(allAds);

  } catch (error) {
    console.error('Ads error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}