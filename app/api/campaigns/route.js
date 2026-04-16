import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    const headers = {
      'Authorization': `Bearer ${token.accessToken}`,
      'Linkedin-Version': '202504',
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const v2Headers = {
      'Authorization': `Bearer ${token.accessToken}`,
      'X-RestLi-Protocol-Version': '2.0.0',
    };

    const allCampaigns = [];

    // Primary approach: list ad sets directly per account via the search finder.
    // LinkedIn's "campaigns" = what the UI calls ad sets. This returns every ad set
    // regardless of whether it has delivered any impressions.
    for (const accountId of accountIds) {
      let elements = [];
      let fetchedOk = false;

      // --- Attempt 1: REST adAccounts/{id}/adCampaigns (paged) ---
      try {
        let start = 0;
        const pageSize = 100;
        while (true) {
          const url =
            `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns` +
            `?q=search&search=(status:(values:List(ACTIVE,PAUSED,DRAFT,ARCHIVED,COMPLETED,CANCELED,PENDING_DELETION,REMOVED)))` +
            `&start=${start}&count=${pageSize}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            console.error(`REST adCampaigns search failed for account ${accountId}:`, res.status, await res.text());
            break;
          }
          const data = await res.json();
          const batch = data.elements || [];
          elements = elements.concat(batch);
          fetchedOk = true;
          if (batch.length < pageSize) break;
          start += pageSize;
          if (start > 5000) break; // safety cap
        }
      } catch (err) {
        console.error(`REST adCampaigns threw for account ${accountId}:`, err);
      }

      // --- Attempt 2: v2 adCampaignsV2 finder fallback ---
      if (!fetchedOk || elements.length === 0) {
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
              console.error(`v2 adCampaignsV2 search failed for account ${accountId}:`, res.status, await res.text());
              break;
            }
            const data = await res.json();
            const batch = data.elements || [];
            elements = elements.concat(batch);
            if (batch.length < pageSize) break;
            start += pageSize;
            if (start > 5000) break;
          }
        } catch (err) {
          console.error(`v2 adCampaignsV2 threw for account ${accountId}:`, err);
        }
      }

      // Normalize into { id, name, accountId, status, objectiveType, type }
      for (const el of elements) {
        const id = typeof el.id === 'number' ? el.id : parseInt(el.id);
        if (!id) continue;
        if (allCampaigns.find(c => c.id === id)) continue;
        allCampaigns.push({
          id,
          name: el.name || `Campaign ${id}`,
          accountId,
          status: el.status || 'UNKNOWN',
          objectiveType: el.objectiveType || el.type || '',
          type: el.type || '',
        });
      }

      console.log(`Account ${accountId}: found ${elements.length} ad sets`);
    }

    // Last-resort fallback: if the direct list returned nothing, fall back to the
    // old analytics-pivot approach so we at least show ad sets that delivered.
    if (allCampaigns.length === 0) {
      console.warn('Direct ad set list was empty — falling back to analytics pivot');

      const endD = new Date();
      const startD = new Date(Date.now() - 90 * 86400000);
      const fmt = d => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
      const s = fmt(startD);
      const e = fmt(endD);
      const dateRangeParam = `dateRange=(start:(year:${s.year},month:${s.month},day:${s.day}),end:(year:${e.year},month:${e.month},day:${e.day}))`;

      for (const accountId of accountIds) {
        const accountUrn = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`);
        const url = `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=ALL&${dateRangeParam}&accounts=List(${accountUrn})&fields=impressions,pivotValues`;
        const res = await fetch(url, { headers });
        if (!res.ok) { console.error('Analytics fallback failed:', await res.text()); continue; }
        const data = await res.json();
        (data.elements || []).forEach(el => {
          const urn = el.pivotValues?.[0];
          if (urn) {
            const id = parseInt(urn.split(':').pop());
            if (id && !allCampaigns.find(c => c.id === id)) {
              allCampaigns.push({ id, name: `Campaign ${id}`, accountId, status: 'ACTIVE' });
            }
          }
        });
      }

      // Hydrate names for analytics-derived ids
      await Promise.all(
        allCampaigns.map(async (c, i) => {
          let res = await fetch(`https://api.linkedin.com/rest/adCampaigns/${c.id}`, { headers });
          if (!res.ok) {
            res = await fetch(`https://api.linkedin.com/v2/adCampaignsV2/${c.id}`, { headers: v2Headers });
          }
          if (res.ok) {
            const detail = await res.json();
            const name = detail.name || detail.campaignName || null;
            if (name) {
              allCampaigns[i].name = name;
              allCampaigns[i].status = detail.status || allCampaigns[i].status;
              allCampaigns[i].objectiveType = detail.objectiveType || detail.type || '';
              allCampaigns[i].type = detail.type || '';
            }
          } else {
            console.error(`Could not fetch name for campaign ${c.id}:`, res.status);
          }
        })
      );
    }

    console.log('Total ad sets returned:', allCampaigns.length);
    return NextResponse.json(allCampaigns);

  } catch (error) {
    console.error('Campaigns error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}