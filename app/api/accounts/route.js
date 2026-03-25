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
      const url = `https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE&count=${count}&start=${start}`;

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
        // Return what we have so far rather than failing completely
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

      // Check if there are more pages
      const total  = data.paging?.total  ?? elements.length;
      const loaded = start + elements.length;

      if (elements.length < count || loaded >= total) {
        hasMore = false;
      } else {
        start += count;
      }

      // Safety cap at 5000 accounts (50 pages) to avoid infinite loops
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