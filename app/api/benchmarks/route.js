import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req) {
  // Protect the endpoint — only authenticated users can call Claude
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'Claude API error' }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    return NextResponse.json({ text });

  } catch (err) {
    console.error('AI recommendations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}