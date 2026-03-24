'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, ChevronDown, ChevronUp, Download, Printer, FileText, X } from 'lucide-react';

// ─── CHART COMPONENT ─────────────────────────────────────────
function MiniChart({ data, label, color, type = 'bar' }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const uid = useRef(`chart-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (typeof window === 'undefined' || !data?.length) return;

    function init(Chart) {
      if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} }
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      chartRef.current = new Chart(ctx, {
        type,
        data: {
          labels: data.map(d => d.label),
          datasets: [{
            label,
            data: data.map(d => d.value),
            backgroundColor: type === 'bar'
              ? data.map(d => d.value > (d.benchmark || 0) ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)')
              : color || '#F6DC4E',
            borderColor: type === 'line' ? color || '#F6DC4E' : undefined,
            borderWidth: type === 'line' ? 2 : 0,
            tension: 0.4,
            fill: type === 'line',
            pointRadius: type === 'line' ? 3 : 0,
            ...(type === 'line' ? { backgroundColor: (color || '#F6DC4E') + '18' } : {}),
          },
          ...(data[0]?.benchmark != null && type === 'bar' ? [{
            label: 'Benchmark',
            data: data.map(d => d.benchmark),
            type: 'line',
            borderColor: '#F6DC4E',
            borderDash: [4, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          }] : [])
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666', font: { size: 9 } } },
            x: { grid: { display: false }, ticks: { color: '#666', font: { size: 9 } } },
          },
        },
      });
    }

    if (window.Chart) { init(window.Chart); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => init(window.Chart);
    document.head.appendChild(s);
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} } };
  }, [data, label, color, type]);

  return <div style={{ height: 120 }}><canvas ref={canvasRef} /></div>;
}

// ─── EDITABLE BLOCK ───────────────────────────────────────────
function EditableBlock({ title, items, color, icon }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(items.join('\n'));
  const lines = content.split('\n').filter(Boolean);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700" style={{ background: '#1e2235' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
        <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color }}>{icon} {title}</span>
        <button onClick={() => setEditing(!editing)}
          className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors">
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full p-4 text-sm bg-transparent text-slate-200 resize-none focus:outline-none"
          style={{ minHeight: 120, fontFamily: 'inherit', lineHeight: 1.7 }}
        />
      ) : (
        <ul className="p-4 space-y-2.5">
          {lines.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: '#d1cbc3' }}>
              <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full" style={{ background: color, minWidth: 6, minHeight: 6 }} />
              <span>{item}</span>
            </li>
          ))}
          {!lines.length && <li className="text-xs text-slate-600">—</li>}
        </ul>
      )}
    </div>
  );
}

// ─── CAMPAIGN AI CARD ────────────────────────────────────────
function CampaignAICard({ campaign, campaignName, benchmarks, region }) {
  const [open, setOpen]       = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null); // parsed per-campaign AI response
  const [execText, setExecText] = useState('');

  const imp  = campaign.impressions || 0;
  const clk  = campaign.clicks || 0;
  const spd  = campaign.spent  || 0;
  const lds  = campaign.leads  || 0;
  const eng  = (clk) + (campaign.likes||0) + (campaign.comments||0) + (campaign.shares||0) + (campaign.follows||0);
  const ctr  = imp > 0 ? (clk / imp * 100) : 0;
  const engR = imp > 0 ? (eng / imp * 100) : 0;
  const cpc  = clk > 0 ? spd / clk : 0;
  const cpl  = lds > 0 ? spd / lds : 0;
  const b    = benchmarks || {};

  // Benchmark values for charts
  const bCTR = (b['Sponsored Content CTR']?.median || 0) * 100;
  const bEng = (b['Sponsored Engagement Rate']?.median || 0) * 100;
  const bCPC = b['CPC ($)']?.median || 0;
  const bCPL = b['Cost Per Lead ($)']?.median || 0;

  // Weekly chart data if available
  const weeklyData = campaign.weeklyData || [];
  const weekCTR = weeklyData.map(w => ({ label: w.label || w.week, value: parseFloat((w.ctr * 100).toFixed(2)), benchmark: bCTR }));
  const weekEng = weeklyData.map(w => ({ label: w.label || w.week, value: parseFloat((w.eng * 100).toFixed(2)), benchmark: bEng }));
  const weekSpend = weeklyData.map(w => ({ label: w.label || w.week, value: parseFloat(w.spend?.toFixed(2) || 0) }));

  async function analyse() {
    setLoading(true); setError(null); setData(null); setExecText('');
    const prompt = `You are a senior LinkedIn advertising strategist at Turn Left Media. Analyse this single campaign and return ONLY a JSON object — no markdown, no backticks, no explanation.

CAMPAIGN: ${campaignName} (ID: ${campaign.id})
REGION: ${region || 'Global'} (LinkedIn Q4 2025 Benchmarks)

METRICS:
- Impressions: ${imp.toLocaleString()}
- Clicks: ${clk.toLocaleString()}
- CTR: ${ctr.toFixed(2)}% (benchmark median: ${bCTR.toFixed(2)}%)
- Engagements: ${eng}
- Engagement Rate: ${engR.toFixed(2)}% (benchmark median: ${bEng.toFixed(2)}%)
- CPC: $${cpc.toFixed(2)} (benchmark median: $${bCPC.toFixed(2)})
- Total Spend: $${spd.toFixed(2)}
- Leads: ${lds}${lds > 0 ? ` | CPL: $${cpl.toFixed(2)} (benchmark: $${bCPL.toFixed(2)})` : ''}
${weeklyData.length > 0 ? `\nWEEKLY TREND:\n${weeklyData.map(w => `- ${w.label}: CTR ${(w.ctr*100).toFixed(2)}%, Eng ${(w.eng*100).toFixed(2)}%, Spend $${w.spend?.toFixed(2)}`).join('\n')}` : ''}

Return exactly this JSON:
{
  "overallStatus": "optimal|warning|critical",
  "executiveSummary": "2-3 sentence summary of this campaign",
  "working": ["point 1", "point 2", "point 3"],
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "budgetAdvice": "specific budget advice",
  "immediateActions": ["action 1", "action 2", "action 3"]
}`;

    try {
      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const raw = await res.json();
      if (!raw.text) { setError('No response received.'); setLoading(false); return; }
      const clean = raw.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setData(parsed);
      setExecText(parsed.executiveSummary || '');
    } catch(e) {
      setError('Failed to analyse campaign. Please try again.');
    }
    setLoading(false);
  }

  const statusColors = { optimal: '#4ade80', warning: '#fbbf24', critical: '#f87171' };
  const statusColor = data ? (statusColors[data.overallStatus] || '#888') : '#888';

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 mb-4" style={{ background: '#151827' }}>
      {/* Campaign header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-700"
        style={{ background: '#0f1120' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {data && (
              <span className="text-xs font-bold px-2 py-0.5 rounded font-mono"
                style={{ background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
                {data.overallStatus?.toUpperCase()}
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono">ID: {campaign.id}</span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">{campaignName}</p>
          <p className="text-xs text-slate-500 mt-1">
            {imp.toLocaleString()} impr &nbsp;·&nbsp; {ctr.toFixed(2)}% CTR &nbsp;·&nbsp; ${spd.toFixed(2)} spent
            {lds > 0 ? ` &nbsp;·&nbsp; ${lds} leads` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!data && !loading && (
            <button onClick={analyse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: '#F6DC4E', color: '#272828' }}>
              <Sparkles className="w-3.5 h-3.5" /> Analyse
            </button>
          )}
          {data && !loading && (
            <button onClick={analyse}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white transition-colors">
              Refresh
            </button>
          )}
          <button onClick={() => setOpen(!open)}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-5">
          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-6 text-slate-400 text-sm justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#F6DC4E' }} />
              Analysing {campaignName} against {region || 'Global'} benchmarks...
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-400 text-sm px-1">{error}</p>}

          {/* Empty state */}
          {!loading && !data && !error && (
            <div className="text-center py-8 text-slate-600 text-sm">
              Click <span style={{ color: '#F6DC4E' }}>Analyse</span> to generate AI recommendations for this campaign
            </div>
          )}

          {/* AI results */}
          {data && !loading && (
            <>
              {/* Executive summary — editable */}
              <div className="rounded-lg border border-slate-700 p-4" style={{ background: '#1e2235' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-2 font-mono" style={{ color: '#F6DC4E' }}>
                  Executive Summary
                </div>
                <p
                  className="text-sm leading-relaxed text-slate-300"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ outline: 'none', minHeight: 40 }}
                  onBlur={e => setExecText(e.target.innerText)}
                >
                  {execText}
                </p>
                <p className="text-xs text-slate-600 mt-2">Click to edit</p>
              </div>

              {/* Charts row */}
              {weeklyData.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-700 p-3" style={{ background: '#1e2235' }}>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">CTR % (vs benchmark)</div>
                    <MiniChart data={weekCTR} label="CTR %" color="#60a5fa" type="bar" />
                  </div>
                  <div className="rounded-lg border border-slate-700 p-3" style={{ background: '#1e2235' }}>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Engagement Rate %</div>
                    <MiniChart data={weekEng} label="Eng Rate %" color="#4ade80" type="bar" />
                  </div>
                  <div className="rounded-lg border border-slate-700 p-3" style={{ background: '#1e2235' }}>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Weekly Spend ($)</div>
                    <MiniChart data={weekSpend} label="Spend $" color="#F6DC4E" type="line" />
                  </div>
                </div>
              )}

              {/* Insight blocks — all editable */}
              <div className="grid grid-cols-2 gap-3">
                <EditableBlock title="What's Working"          items={data.working || []}          color="#4ade80"  icon="✓" />
                <EditableBlock title="Issues to Address"       items={data.issues || []}            color="#f87171"  icon="⚠" />
                <EditableBlock title="Recommendations"         items={data.recommendations || []}   color="#60a5fa"  icon="→" />
                <EditableBlock title="Immediate Actions"       items={data.immediateActions || []}  color="#fb923c"  icon="⚡" />
              </div>

              {/* Budget advice — full width editable */}
              <div className="rounded-lg border border-slate-700 overflow-hidden" style={{ background: '#1e2235' }}>
                <div className="px-4 py-2.5 border-b border-slate-700">
                  <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: '#F6DC4E' }}>$ Budget Advice</span>
                </div>
                <p
                  className="px-4 py-3 text-sm text-slate-300 leading-relaxed"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ outline: 'none', minHeight: 40 }}
                >
                  {data.budgetAdvice}
                </p>
                <p className="px-4 pb-2 text-xs text-slate-600">Click to edit</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export default function CampaignAIReport({ topCampaigns, campaignNameMap, benchmarks, region, accountName, currentRange }) {
  const [open, setOpen]         = useState(false);
  const [analyseAll, setAnalyseAll] = useState(false);

  const campaigns = topCampaigns || [];

  if (!campaigns.length) return null;

  function downloadHTML() {
    // Build a printable HTML snapshot of the current page section
    const el = document.getElementById('campaign-ai-report-content');
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AI Campaign Analysis - ${accountName}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;background:#0f1120;color:#d1cbc3;padding:32px;max-width:1200px;margin:0 auto}
h1{color:white;font-size:22px;margin-bottom:8px}p{line-height:1.7;font-size:13px}
.card{background:#151827;border:1px solid #2a3050;border-radius:10px;margin-bottom:24px;overflow:hidden}
.card-header{background:#0f1120;padding:16px 20px;border-bottom:1px solid #2a3050}
.section{padding:16px 20px}h3{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;margin-bottom:10px}
ul{list-style:none;padding:0}li{padding:4px 0;font-size:13px;padding-left:14px;position:relative}
li::before{content:'→';position:absolute;left:0;color:#F6DC4E}
@media print{body{background:white;color:#272828}.card{border-color:#e0e0e0;background:white}.card-header{background:#f5f5f5}}</style>
</head><body>
<h1>${accountName} — AI Campaign Analysis</h1>
<p style="color:#888;margin-bottom:32px">${currentRange?.start} to ${currentRange?.end} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</p>
${el.innerHTML}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ai-campaign-analysis-${currentRange?.start || 'export'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 mt-6" style={{ background: '#0f1120' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700 cursor-pointer"
        onClick={() => setOpen(!open)}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: '#F6DC4E', color: '#272828' }}>AI</div>
        <div className="flex-1">
          <div className="font-bold text-white text-sm">AI Recommendations per Campaign</div>
          <div className="text-xs" style={{ color: '#888' }}>
            Click each campaign to generate individual analysis with editable recommendations · {campaigns.length} campaigns
          </div>
        </div>
        <div className="flex items-center gap-2 no-print" onClick={e => e.stopPropagation()}>
          {open && (
            <>
              <button onClick={downloadHTML}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors border border-slate-600">
                <FileText className="w-3.5 h-3.5" /> Export HTML
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors">
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </>
          )}
          <button className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors ml-1">
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-5" id="campaign-ai-report-content">
          {campaigns.map(c => (
            <CampaignAICard
              key={c.id}
              campaign={c}
              campaignName={campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`}
              benchmarks={benchmarks}
              region={region}
            />
          ))}
        </div>
      )}
    </div>
  );
}