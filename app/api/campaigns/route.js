import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// NOTE ON NAMING (after LinkedIn's UI rename):
//   LinkedIn's /adCampaignGroupsV2  ==  "Campaigns" in the UI
//   LinkedIn's /adCampaignsV2       ==  "Ad Sets"   in the UI
//   LinkedIn's /adCreatives*        ==  "Ads"       in the UI
// This route returns what the UI calls "Ad Sets" (LinkedIn's adCampaignsV2).

export async function POST(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { accountIds } = await request.json();
    if (!accountIds || accountIds.length === 0) {
      return NextResponse.json([]);
    }

    const allCampaigns = [];

    await Promise.all(
      accountIds.map(async (accountId) => {
        let start = 0;
        const count = 100;
        let hasMore = true;

        while (hasMore) {
          try {
            const res = await fetch(
              `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}&fields=id,name,status,account,campaignGroup,objectiveType,type&count=${count}&start=${start}`,
              {
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                  'LinkedIn-Version': '202401',
                },
              }
            );

            if (!res.ok) {
              console.error(`Ad sets failed for account ${accountId}:`, await res.text());
              break;
            }

            const data = await res.json();
            const elements = data.elements || [];

            elements.forEach(c => {
              const rawId = c.id;
              const id = typeof rawId === 'string' && rawId.includes(':')
                ? parseInt(rawId.split(':').pop())
                : parseInt(rawId);

              const name = c.name || c.displayName || `Ad Set ${id}`;

              // Normalise campaignGroup URN → numeric ID (lets the UI group ad sets under their parent campaign)
              let campaignGroupId = null;
              if (c.campaignGroup) {
                const ref = String(c.campaignGroup);
                campaignGroupId = ref.includes(':') ? parseInt(ref.split(':').pop()) : parseInt(ref);
              }

              allCampaigns.push({
                id,
                name,
                accountId: parseInt(accountId),
                status: c.status || 'ACTIVE',
                objectiveType: c.objectiveType || c.type || '',
                type: c.type || '',
                campaignGroup: campaignGroupId,
              });
            });

            const paging = data.paging;
            hasMore = paging && paging.total
              ? start + count < paging.total
              : elements.length === count;
            start += count;
            if (start >= 2000) break;
          } catch (err) {
            console.error(`Ad sets error for account ${accountId}:`, err);
            break;
          }
        }
      })
    );

    allCampaigns.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(allCampaigns);
  } catch (error) {
    console.error('Ad sets API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}