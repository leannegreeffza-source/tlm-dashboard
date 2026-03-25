import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const allAccounts = [];
    let start = 0;
    const count = 100; // LinkedIn max per page
    let hasMore = true;

    while (hasMore) {
      // Use q=search without any filter fields that require extra permissions
      const url = `https://api.linkedin.com/v2/adAccountsV2?q=search&count=${count}&start=${start}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202411',
        },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('LinkedIn accounts error:', err);
        // Return whatever we have accumulated so far
        break;
      }

      const data = await res.json();
      const elements = data.elements || [];

      const mapped = elements.map(acc => ({
        id:       acc.id,
        name:     acc.name || `Account ${acc.id}`,
        currency: acc.currency || 'USD',
        status:   acc.status || 'ACTIVE',
        type:     acc.type || 'BUSINESS',
      }));

      allAccounts.push(...mapped);

      // LinkedIn paging: stop when we get fewer results than requested
      // or when paging.total tells us we have everything
      const total  = data.paging?.total ?? null;
      const loaded = start + elements.length;

      if (elements.length < count) {
        // Fewer results than page size = last page
        hasMore = false;
      } else if (total !== null && loaded >= total) {
        // Reached declared total
        hasMore = false;
      } else {
        start += count;
      }

      // Safety cap: never fetch more than 5000 accounts
      if (allAccounts.length >= 5000) {
        hasMore = false;
      }
    }

    return NextResponse.json(allAccounts);

  } catch (error) {
    console.error('Accounts fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}