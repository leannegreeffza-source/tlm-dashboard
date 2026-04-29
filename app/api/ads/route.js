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

    const v2Headers = {
      'Authorization': `Bearer ${token.accessToken}`,
      'LinkedIn-Version': '202401',
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const restHeaders = {
      'Authorization': `Bearer ${token.accessToken}`,
      'Linkedin-Version': '202504',
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const allAds = [];
    const seenIds = new Set();

    for (const campaignId of campaignIds) {
      let elements = [];
      let strategyUsed = 'none';
      const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;

      // ── Strategy A: v2 /adCreativesV2?q=search with NON-encoded URN ──
      // LinkedIn's v2 search finder for creatives often requires the raw URN
      try {
        let start = 0;
        const count = 100;
        while (true) {
          const url =
            `https://api.linkedin.com/v2/adCreativesV2` +
            `?q=search&search.campaign.values[0]=${campaignUrn}` +
            `&count=${count}&start=${start}`;
          const res = await fetch(url, { headers: v2Headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[A] v2 raw URN failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
            break;
          }
          const data = await res.json();
          const batch = data.elements || [];
          elements = elements.concat(batch);
          strategyUsed = 'A: v2 raw URN';
          if (batch.length < count) break;
          start += count;
          if (start > 2000) break;
        }
      } catch (err) {
        console.error(`[A] threw:`, err.message);
      }

      // ── Strategy B: v2 /adCreativesV2?q=search with encoded URN ──
      if (elements.length === 0) {
        try {
          let start = 0;
          const count = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/v2/adCreativesV2` +
              `?q=search&search.campaign.values[0]=${encodeURIComponent(campaignUrn)}` +
              `&count=${count}&start=${start}`;
            const res = await fetch(url, { headers: v2Headers });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`[B] v2 encoded URN failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'B: v2 encoded URN';
            if (batch.length < count) break;
            start += count;
            if (start > 2000) break;
          }
        } catch (err) {
          console.error(`[B] threw:`, err.message);
        }
      }

      // ── Strategy C: REST /adCreatives?q=search with campaign filter ──
      if (elements.length === 0) {
        try {
          let start = 0;
          const count = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/rest/adCreatives` +
              `?q=search&search=(campaign:(values:List(${encodeURIComponent(campaignUrn)})))` +
              `&count=${count}&start=${start}`;
            const res = await fetch(url, { headers: restHeaders });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`[C] REST Rest.li syntax failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'C: REST Rest.li';
            if (batch.length < count) break;
            start += count;
            if (start > 2000) break;
          }
        } catch (err) {
          console.error(`[C] threw:`, err.message);
        }
      }

      // ── Strategy D: REST /adCreatives with flat search params ──
      if (elements.length === 0) {
        try {
          const url =
            `https://api.linkedin.com/rest/adCreatives` +
            `?q=search&search.campaign.values[0]=${encodeURIComponent(campaignUrn)}` +
            `&count=100`;
          const res = await fetch(url, { headers: restHeaders });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[D] REST flat params failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          } else {
            const data = await res.json();
            elements = data.elements || [];
            strategyUsed = 'D: REST flat params';
          }
        } catch (err) {
          console.error(`[D] threw:`, err.message);
        }
      }

      // ── Strategy E: v2 /adCreativesV2 with campaigns param (no q=search) ──
      if (elements.length === 0) {
        try {
          const url =
            `https://api.linkedin.com/v2/adCreativesV2` +
            `?q=search&campaigns[0]=${encodeURIComponent(campaignUrn)}` +
            `&count=100`;
          const res = await fetch(url, { headers: v2Headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[E] v2 campaigns param failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          } else {
            const data = await res.json();
            elements = data.elements || [];
            strategyUsed = 'E: v2 campaigns param';
          }
        } catch (err) {
          console.error(`[E] threw:`, err.message);
        }
      }

      // ── Strategy F: analytics pivot CREATIVE to discover ad IDs that delivered ──
      if (elements.length === 0) {
        try {
          const end = new Date();
          const start = new Date(Date.now() - 90 * 86400000);
          const fmt = d => `dateRange.start.year=${d.getFullYear()}&dateRange.start.month=${d.getMonth()+1}&dateRange.start.day=${d.getDate()}&dateRange.end.year=${end.getFullYear()}&dateRange.end.month=${end.getMonth()+1}&dateRange.end.day=${end.getDate()}`;
          const url =
            `https://api.linkedin.com/v2/adAnalyticsV2` +
            `?q=analytics&pivot=CREATIVE&timeGranularity=ALL` +
            `&${fmt(start)}` +
            `&campaigns[0]=${encodeURIComponent(campaignUrn)}` +
            `&fields=pivotValues,impressions`;
          const res = await fetch(url, { headers: v2Headers });
          if (res.ok) {
            const data = await res.json();
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
              strategyUsed = 'F: analytics pivot';
            }
          } else {
            const errText = await res.text();
            console.error(`[F] analytics pivot failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          }
        } catch (err) {
          console.error(`[F] threw:`, err.message);
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