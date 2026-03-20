import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'benchmarks.json');

// Default benchmarks — used on first run if no saved file exists
const DEFAULT_BENCHMARKS = {
  'ZA': {
    'Sponsored Content CTR':     { low: 0.0014, median: 0.0057, high: 0.0117 },
    'Sponsored Engagement Rate': { low: 0.0020, median: 0.0088, high: 0.0183 },
    'Lead Gen Form Fill Rate':   { low: 0.0626, median: 0.1537, high: 0.3552 },
    'Cost Per Lead ($)':         { low: 3.67,   median: 10.83,  high: 29.19  },
    'Organic CTR':               { low: 0.0261, median: 0.0474, high: 0.1019 },
    'Organic Engagement Rate':   { low: 0.0360, median: 0.0615, high: 0.1188 },
    'Video View Through Rate':   { low: 0.318,  median: 0.459,  high: 0.755  },
    'CPM ($)':                   { low: 4.40,   median: 4.40,   high: 4.40   },
    'CPC ($)':                   { low: 0.91,   median: 0.91,   high: 0.91   },
  },
  'Africa': {
    'Sponsored Content CTR':     { low: 0.0030, median: 0.0060, high: 0.0122 },
    'Sponsored Engagement Rate': { low: 0.0040, median: 0.0092, high: 0.0225 },
    'Lead Gen Form Fill Rate':   { low: 0.0374, median: 0.0965, high: 0.2397 },
    'Cost Per Lead ($)':         { low: 5.57,   median: 16.76,  high: 48.02  },
    'Organic CTR':               { low: 0.0298, median: 0.0524, high: 0.1203 },
    'Organic Engagement Rate':   { low: 0.0442, median: 0.0713, high: 0.1436 },
    'Video View Through Rate':   { low: 0.284,  median: 0.378,  high: 0.594  },
    'CPM ($)':                   { low: 3.75,   median: 3.75,   high: 3.75   },
    'CPC ($)':                   { low: 0.57,   median: 0.57,   high: 0.57   },
  },
  'North America': {
    'Sponsored Content CTR':     { low: 0.0013, median: 0.0057, high: 0.0141 },
    'Sponsored Engagement Rate': { low: 0.0017, median: 0.0046, high: 0.0093 },
    'Lead Gen Form Fill Rate':   { low: 0.0281, median: 0.0833, high: 0.2211 },
    'Cost Per Lead ($)':         { low: 77.31,  median: 110,    high: 160    },
    'Organic CTR':               { low: 0.0194, median: 0.0367, high: 0.0716 },
    'Organic Engagement Rate':   { low: 0.0334, median: 0.0554, high: 0.0940 },
    'CPM ($)':                   { low: 6.00,   median: 6.00,   high: 6.00   },
    'CPC ($)':                   { low: 2.50,   median: 2.50,   high: 2.50   },
  },
  'Europe': {
    'Sponsored Content CTR':     { low: 0.0023, median: 0.0047, high: 0.0092 },
    'Sponsored Engagement Rate': { low: 0.0042, median: 0.0102, high: 0.0238 },
    'Lead Gen Form Fill Rate':   { low: 0.0238, median: 0.0685, high: 0.1739 },
    'Cost Per Lead ($)':         { low: 49.23,  median: 80,     high: 130    },
    'Organic CTR':               { low: 0.0298, median: 0.0524, high: 0.1203 },
    'Organic Engagement Rate':   { low: 0.0442, median: 0.0713, high: 0.1436 },
    'CPM ($)':                   { low: 5.20,   median: 5.20,   high: 5.20   },
    'CPC ($)':                   { low: 2.10,   median: 2.10,   high: 2.10   },
  },
  'South America': {
    'Sponsored Content CTR':     { low: 0.0023, median: 0.0064, high: 0.0164 },
    'Sponsored Engagement Rate': { low: 0.0034, median: 0.0089, high: 0.0234 },
    'Lead Gen Form Fill Rate':   { low: 0.0250, median: 0.0909, high: 0.2692 },
    'Cost Per Lead ($)':         { low: 7.12,   median: 20,     high: 50     },
    'Organic CTR':               { low: 0.0259, median: 0.0463, high: 0.1191 },
    'Organic Engagement Rate':   { low: 0.0391, median: 0.0635, high: 0.1380 },
    'CPM ($)':                   { low: 3.20,   median: 3.20,   high: 3.20   },
    'CPC ($)':                   { low: 0.80,   median: 0.80,   high: 0.80   },
  },
};

async function readBenchmarks() {
  try {
    const raw = await readFile(FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // File doesn't exist yet — return defaults
    return DEFAULT_BENCHMARKS;
  }
}

// GET /api/benchmarks — load current benchmarks
export async function GET() {
  const data = await readBenchmarks();
  return NextResponse.json(data);
}

// POST /api/benchmarks — save updated benchmarks (admin only)
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional: restrict to admins only
  // if (session.user?.role !== 'admin') {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  try {
    const body = await req.json();

    // Validate it looks like a benchmarks object
    if (typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Ensure data directory exists
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Benchmarks save error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
