import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// LinkedIn API version — bump this forward periodically.
// Reminder on naming: LinkedIn's /adCampaigns = what the UI now calls "Ad Sets".
// LinkedIn's /adCampaignGroups = what the UI now calls "Campaigns".
const LI_VERSION = '202509';

export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { accountIds } = await request.json();
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json([]);
    }

    const restHeaders = {
      'Authorization': `Bearer ${token.accessToken}`,
      'Linkedin-Version': LI_VERSION,
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const v2Headers = {
      'Authorization': `Bearer ${token.accessToken}`,
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const allCampaigns = [];

    const normalise = (el, accountId) => {
      const id = typeof el.id === 'number' ? el.id : parseInt(el.id);
      if (!id) return null;
      return {
        id,
        name: el.name || `Ad Set ${id}`,
        accountId,
        status: el.status || 'UNKNOWN',
        objectiveType: el.objectiveType || el.type || '',
        type: el.type || '',
        campaignGroup: el.campaignGroup || null,
      };
    };

    for (const accountId of accountIds) {
      let elements = [];
      let strategyUsed = 'none';

      // ── Strategy A: REST /adAccounts/{id}/adCampaigns with q=search (no filters) ──
      try {
        let start = 0;
        const pageSize = 100;
        while (true) {
          const url =
            `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns` +
            `?q=search&start=${start}&count=${pageSize}`;
          const res = await fetch(url, { headers: restHeaders });
          if (!res.ok) {
            const body = await res.text();
            console.error(`[A] REST /adAccounts/${accountId}/adCampaigns failed: ${res.status} :: ${body.slice(0, 400)}`);
            break;
          }
          const data = await res.json();
          const batch = data.elements || [];
          elements = elements.concat(batch);
          strategyUsed = 'A: REST adAccounts path';
          if (batch.length < pageSize) break;
          start += pageSize;
          if (start > 5000) break;
        }
      } catch (err) {
        console.error(`[A] threw:`, err.message);
      }

      // ── Strategy B: REST /adCampaigns?q=search with account URN filter ──
      if (elements.length === 0) {
        try {
          const accountUrn = `urn:li:sponsoredAccount:${accountId}`;
          let start = 0;
          const pageSize = 100;
          while (true) {
            const searchParam = encodeURIComponent(`(account:${accountUrn})`);
            const url =
              `https://api.linkedin.com/rest/adCampaigns` +
              `?q=search&search=${searchParam}&start=${start}&count=${pageSize}`;
            const res = await fetch(url, { headers: restHeaders });
            if (!res.ok) {
              const body = await res.text();
              console.error(`[B] REST /adCampaigns?q=search failed: ${res.status} :: ${body.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'B: REST adCampaigns search';
            if (batch.length < pageSize) break;
            start += pageSize;
            if (start > 5000) break;
          }
        } catch (err) {
          console.error(`[B] threw:`, err.message);
        }
      }

      // ── Strategy C: v2 /adCampaignsV2 finder (legacy) ──
      if (elements.length === 0) {
        try {
          const accountUrn = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`);
          let start = 0;
          const pageSize = 100;
          while (true) {
            const url =
              `https://api.linkedin.com/v2/adCampaignsV2` +
              `?q=search&search.account.values[0]=${accountUrn}` +
              `&start=${start}&count=${pageSize}`;
            const res = await fetch(url, { headers: v2Headers });
            if (!res.ok) {
              const body = await res.text();
              console.error(`[C] v2 /adCampaignsV2 failed: ${res.status} :: ${body.slice(0, 400)}`);
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            strategyUsed = 'C: v2 adCampaignsV2';
            if (batch.length < pageSize) break;
            start += pageSize;
            if (start > 5000) break;
          }
        } catch (err) {
          console.error(`[C] threw:`, err.message);
        }
      }

      // ── Strategy D (last resort): analytics pivot, then hydrate names ──
      if (elements.length === 0) {
        try {
          const endD = new Date();
          const startD = new Date(Date.now() - 90 * 86400000);
          const fmt = d => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
          const s = fmt(startD);
          const e = fmt(endD);
          const dateRangeParam = `dateRange=(start:(year:${s.year},month:${s.month},day:${s.day}),end:(year:${e.year},month:${e.month},day:${e.day}))`;
          const accountUrn = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`);
          const url = `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=ALL&${dateRangeParam}&accounts=List(${accountUrn})&fields=impressions,pivotValues`;
          const res = await fetch(url, { headers: restHeaders });
          if (!res.ok) {
            const body = await res.text();
            console.error(`[D] analytics pivot failed: ${res.status} :: ${body.slice(0, 400)}`);
          } else {
            const data = await res.json();
            const ids = (data.elements || [])
              .map(el => el.pivotValues?.[0])
              .filter(Boolean)
              .map(urn => parseInt(urn.split(':').pop()))
              .filter(Boolean);

            const hydrated = await Promise.all(
              ids.map(async (id) => {
                let r = await fetch(`https://api.linkedin.com/rest/adCampaigns/${id}`, { headers: restHeaders });
                if (!r.ok) r = await fetch(`https://api.linkedin.com/v2/adCampaignsV2/${id}`, { headers: v2Headers });
                if (r.ok) return await r.json();
                return { id, name: `Ad Set ${id}`, status: 'UNKNOWN' };
              })
            );
            elements = hydrated;
            strategyUsed = 'D: analytics pivot fallback';
          }
        } catch (err) {
          console.error(`[D] threw:`, err.message);
        }
      }

      console.log(`Account ${accountId}: strategy=${strategyUsed}, found=${elements.length} ad sets`);

      for (const el of elements) {
        const norm = normalise(el, accountId);
        if (norm && !allCampaigns.find(c => c.id === norm.id)) {
          allCampaigns.push(norm);
        }
      }
    }

    console.log('Total ad sets returned:', allCampaigns.length);
    return NextResponse.json(allCampaigns);

  } catch (error) {
    console.error('Campaigns error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}