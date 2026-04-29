import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// NOTE ON NAMING (after LinkedIn's UI rename):
//   LinkedIn's /adCampaignsV2       ==  "Ad Sets"   in the UI
//   LinkedIn's /adCreativesV2       ==  "Ads"       in the UI
// This route returns what the UI calls "Ads" (LinkedIn's adCreatives).

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

      // ── Strategy A: v2 /adCreativesV2 with campaign search (matches working pattern) ──
      try {
        const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;
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
            console.error(`[A] v2 adCreativesV2 failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
            break;
          }
          const data = await res.json();
          const batch = data.elements || [];
          elements = elements.concat(batch);
          strategyUsed = 'A: v2 adCreativesV2';
          if (batch.length < count) break;
          start += count;
          if (start > 2000) break;
        }
      } catch (err) {
        console.error(`[A] threw for campaign ${campaignId}:`, err.message);
      }

      // ── Strategy B: REST /adCreatives (newer API) ──
      if (elements.length === 0) {
        try {
          const campaignUrn = encodeURIComponent(`urn:li:sponsoredCampaign:${campaignId}`);
          let start = 0;
          const count = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/rest/adCreatives` +
              `?q=search&search.campaign.values[0]=${campaignUrn}` +
              `&count=${count}&start=${start}`;
            const res = await fetch(url, { headers: restHeaders });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`[B] REST adCreatives failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'B: REST adCreatives';
            if (batch.length < count) break;
            start += count;
            if (start > 2000) break;
          }
        } catch (err) {
          console.error(`[B] threw for campaign ${campaignId}:`, err.message);
        }
      }

      // ── Strategy C: v2 /adCreativesV2 with campaigns filter param ──
      if (elements.length === 0) {
        try {
          const campaignUrn = encodeURIComponent(`urn:li:sponsoredCampaign:${campaignId}`);
          const url =
            `https://api.linkedin.com/v2/adCreativesV2` +
            `?q=criteria&campaigns[0]=${campaignUrn}&count=100`;
          const res = await fetch(url, { headers: v2Headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[C] v2 criteria failed for campaign ${campaignId}: ${res.status} :: ${errText.slice(0, 400)}`);
          } else {
            const data = await res.json();
            elements = data.elements || [];
            strategyUsed = 'C: v2 criteria finder';
          }
        } catch (err) {
          console.error(`[C] threw for campaign ${campaignId}:`, err.message);
        }
      }

      console.log(`Campaign ${campaignId}: strategy=${strategyUsed}, ads=${elements.length}`);

      // Normalise
      for (const a of elements) {
        // The ad ID can be in different places depending on the API version
        const rawId = a.id || a.contentReference?.split(':').pop();
        const id = typeof rawId === 'string' && rawId.includes(':')
          ? rawId.split(':').pop()
          : String(rawId);

        if (!id || id === 'undefined' || seenIds.has(id)) continue;
        seenIds.add(id);

        // Name: LinkedIn creatives often don't have a "name" field.
        // Derive something useful from available data.
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