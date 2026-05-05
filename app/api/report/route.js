'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Search, TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Target, Users, RefreshCw, ChevronDown, Calendar, ExternalLink, Layers, Video, Globe, Zap, BarChart2, FileText, Settings, Sparkles } from 'lucide-react';
import ObjectiveTabs from '../components/ObjectiveTabs';

function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.start);
  const [tempEnd, setTempEnd] = useState(value.end);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const presets = [
    { label: 'Today', fn: () => { const d = today(); return { start: d, end: d }; } },
    { label: 'Yesterday', fn: () => { const d = daysAgo(1); return { start: d, end: d }; } },
    { label: 'Last 7 days', fn: () => ({ start: daysAgo(6), end: today() }) },
    { label: 'Last 30 days', fn: () => ({ start: daysAgo(29), end: today() }) },
    { label: 'Last 90 days', fn: () => ({ start: daysAgo(89), end: today() }) },
    { label: 'This month', fn: () => ({ start: firstOfMonth(), end: today() }) },
    { label: 'Last month', fn: () => lastMonth() },
    { label: 'This quarter', fn: () => thisQuarter() },
    { label: 'Last quarter', fn: () => lastQuarter() },
    { label: 'All time', fn: () => ({ start: '2020-01-01', end: today() }) },
  ];

  function today() { return new Date().toISOString().split('T')[0]; }
  function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().split('T')[0]; }
  function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
  function lastMonth() {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1);
    const start = d.toISOString().split('T')[0];
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
    return { start, end: last.toISOString().split('T')[0] };
  }
  function thisQuarter() {
    const d = new Date(); const q = Math.floor(d.getMonth()/3);
    return { start: new Date(d.getFullYear(), q*3, 1).toISOString().split('T')[0], end: today() };
  }
  function lastQuarter() {
    const d = new Date(); const q = Math.floor(d.getMonth()/3);
    const sq = q === 0 ? 3 : q-1; const yr = q === 0 ? d.getFullYear()-1 : d.getFullYear();
    return {
      start: new Date(yr, sq*3, 1).toISOString().split('T')[0],
      end: new Date(yr, sq*3+3, 0).toISOString().split('T')[0]
    };
  }

  function applyPreset(fn) {
    const range = fn();
    setTempStart(range.start); setTempEnd(range.end);
    onChange(range); setOpen(false);
  }

  function applyCustom() {
    onChange({ start: tempStart, end: tempEnd });
    setOpen(false);
  }

  function formatDisplay(start, end) {
    const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-sm font-medium text-white hover:bg-[#2a4a6e]">
        <Calendar className="w-4 h-4 text-slate-400" />
        {formatDisplay(value.start, value.end)}
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl flex" style={{minWidth: 560}}>
          <div className="w-40 border-r border-gray-100 py-2">
            {presets.map(p => (
              <button key={p.label} onClick={() => applyPreset(p.fn)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-4 flex-1">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
                <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
                <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={applyCustom}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarSection({ title, loading, items, selectedIds, onToggle, onSelectAll, onClear, searchValue, onSearchChange, searchPlaceholder, emptyMessage, accentColor = 'blue' }) {
  const accents = {
    blue:    { selected: 'bg-blue-900 border-blue-500',    btn: 'bg-blue-600 hover:bg-blue-700',    badge: 'bg-blue-800 text-blue-300' },
    purple:  { selected: 'bg-purple-900 border-purple-500', btn: 'bg-purple-600 hover:bg-purple-700', badge: 'bg-purple-800 text-purple-300' },
    emerald: { selected: 'bg-emerald-900 border-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-800 text-emerald-300' },
    orange:  { selected: 'bg-orange-900 border-orange-500', btn: 'bg-orange-600 hover:bg-orange-700', badge: 'bg-orange-800 text-orange-300' },
  };
  const accent = accents[accentColor];

  return (
    <div className="bg-[#0f1f3d] rounded-xl p-4 border border-[#1e3a5f]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-white text-sm uppercase tracking-wide">{title}</h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-slate-400 text-xs">(loading...)</span>}
          {selectedIds.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accent.badge}`}>{selectedIds.length} selected</span>
          )}
        </div>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input type="text" placeholder={searchPlaceholder}
          value={searchValue} onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={onSelectAll} className={`flex-1 px-2 py-1.5 text-white rounded-lg text-xs font-medium ${accent.btn}`}>Select All</button>
        {selectedIds.length > 0 && (
          <button onClick={onClear} className="flex-1 px-2 py-1.5 bg-slate-600 text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-500">
            Clear ({selectedIds.length})
          </button>
        )}
      </div>
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {items.map(item => (
          <label key={item.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
            selectedIds.includes(item.id) ? `${accent.selected} text-white` : 'border-[#2a4a6e] text-slate-300 hover:bg-[#1e3a5f] hover:border-slate-500'
          }`}>
            <input type="checkbox" checked={selectedIds.includes(item.id)}
              onChange={() => onToggle(item.id)} className="w-4 h-4 accent-blue-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-white leading-snug truncate">{item.name}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {item.id}</div>
            </div>
          </label>
        ))}
        {items.length === 0 && !loading && (
          <p className="text-slate-400 text-xs text-center py-6">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function TopPerformingBlock({ title, items, accountId, type, nameMap }) {
  if (!items || items.length === 0) return null;

  function getUrl(id) {
    const base = `https://www.linkedin.com/campaignmanager/accounts/${accountId}`;
    if (type === 'campaign') return `${base}/campaigns/${id}`;
    return `${base}/campaigns`;
  }

  function getName(id) {
    return nameMap?.[String(id)] || `${type === 'campaign' ? 'Campaign' : 'Ad'} ${id}`;
  }

  if (type === 'ad') {
    return (
      <div className="bg-[#0f1f3d] rounded-xl p-5 border border-[#1e3a5f]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a4a6e]">
                <th className="text-left pb-2 px-2 text-slate-400 font-semibold whitespace-nowrap">Creative ID</th>
                <th className="text-left pb-2 px-2 text-slate-400 font-semibold">Title</th>
                <th className="text-left pb-2 px-2 text-slate-400 font-semibold">URL</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold">Impressions</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold">Clicks</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold">CTR</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold whitespace-nowrap">Engagements</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold whitespace-nowrap">Eng. Rate</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold whitespace-nowrap">Other Eng.</th>
                <th className="text-right pb-2 px-2 text-slate-400 font-semibold whitespace-nowrap">Social Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const name = getName(item.id);
                const ctr = item.impressions > 0 ? (item.clicks / item.impressions * 100).toFixed(2) : '0.00';
                const engagements = (item.clicks || 0) + (item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.follows || 0);
                const engRate = item.impressions > 0 ? (engagements / item.impressions * 100).toFixed(2) : '0.00';
                const otherEng = item.otherEngagements || 0;
                const socialActions = (item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.follows || 0);
                return (
                  <tr key={item.id} className="border-b border-[#1e3a5f] hover:bg-[#1e3a5f]/30">
                    <td className="py-3 px-2 font-mono text-slate-300 whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-2 text-slate-200 max-w-xs">
                      <div className="flex items-start gap-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 border border-[#2a4a6e]" />
                        )}
                        <span className="leading-snug">{name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <a href={item.destinationUrl || getUrl(item.id)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                    <td className="py-3 px-2 text-right text-white font-medium">{item.impressions.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-white font-medium">{item.clicks.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-emerald-400 font-medium">{ctr}%</td>
                    <td className="py-3 px-2 text-right text-white font-medium">{engagements.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-white font-medium">{engRate}%</td>
                    <td className="py-3 px-2 text-right text-white font-medium">{otherEng.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-white font-medium">{socialActions.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1f3d] rounded-xl p-5 border border-[#1e3a5f]">
      <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="bg-[#1e3a5f]/50 rounded-lg p-3 border border-[#2a4a6e]">
            <div className="flex items-start justify-between gap-2 mb-1">
              <a href={getUrl(item.id)} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 min-w-0">
                <span className="truncate">{getName(item.id)}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
              <span className="text-xs text-slate-500 flex-shrink-0">#{i + 1}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono mb-2">ID: {item.id}</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div><div className="text-xs text-slate-400">Impr.</div><div className="text-xs font-bold text-white">{item.impressions.toLocaleString()}</div></div>
              <div><div className="text-xs text-slate-400">Clicks</div><div className="text-xs font-bold text-white">{item.clicks.toLocaleString()}</div></div>
              <div><div className="text-xs text-slate-400">CTR</div><div className="text-xs font-bold text-emerald-400">{item.ctr || (item.impressions > 0 ? (item.clicks / item.impressions * 100).toFixed(2) : '0.00')}%</div></div>
              <div><div className="text-xs text-slate-400">Spent</div><div className="text-xs font-bold text-white">${item.spent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FXCalculatorBlock({ reportData, currentRange }) {
  const [periods, setPeriods] = useState([
    { start: currentRange.start, end: '', rate: '' },
    { start: '', end: '', rate: '' },
    { start: '', end: currentRange.end, rate: '' },
  ]);

  function updatePeriod(index, field, value) {
    setPeriods(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  const totalSpendUSD = reportData?.current?.spent || 0;
  const totalImpressions = reportData?.current?.impressions || 0;
  const totalClicks = reportData?.current?.clicks || 0;

  const rangeStart = new Date(currentRange.start + 'T00:00:00');
  const rangeEnd = new Date(currentRange.end + 'T00:00:00');
  const totalRangeDays = Math.max(1, Math.round((rangeEnd - rangeStart) / 86400000) + 1);

  let zarTotalSpend = 0;
  const periodResults = periods.map((p, i) => {
    if (!p.start || !p.end || !p.rate || isNaN(parseFloat(p.rate))) {
      return { label: `Period ${i + 1}`, days: 0, usdSpend: 0, zarSpend: 0, rate: 0, valid: false };
    }
    const pStart = new Date(p.start + 'T00:00:00');
    const pEnd = new Date(p.end + 'T00:00:00');
    const days = Math.max(0, Math.round((pEnd - pStart) / 86400000) + 1);
    const proportion = days / totalRangeDays;
    const usdSpend = totalSpendUSD * proportion;
    const rate = parseFloat(p.rate);
    const zarSpend = usdSpend * rate;
    zarTotalSpend += zarSpend;
    return { label: `Period ${i + 1}`, days, usdSpend, zarSpend, rate, valid: true, start: p.start, end: p.end };
  });

  const blendedRate = totalSpendUSD > 0 ? zarTotalSpend / totalSpendUSD : 0;
  const zarCPM = totalImpressions > 0 ? (zarTotalSpend / totalImpressions) * 1000 : 0;
  const zarCPC = totalClicks > 0 ? zarTotalSpend / totalClicks : 0;

  const periodColors = ['border-blue-500 bg-blue-900/20', 'border-purple-500 bg-purple-900/20', 'border-emerald-500 bg-emerald-900/20'];
  const labelColors = ['text-blue-400', 'text-purple-400', 'text-emerald-400'];
  const barColors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];

  return (
    <div className="bg-[#0f1f3d] rounded-xl p-6 border border-[#1e3a5f] mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center text-white font-bold text-sm">R</div>
        <div>
          <h3 className="text-lg font-bold text-white">FX Rate Calculator</h3>
          <p className="text-xs text-slate-400">Split your reporting period across up to 3 exchange rates to calculate ZAR totals</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {periods.map((p, i) => (
          <div key={i} className={`rounded-xl p-4 border-2 ${periodColors[i]}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold uppercase tracking-wide ${labelColors[i]}`}>Period {i + 1}</span>
              {periodResults[i].valid && (
                <span className="text-xs text-slate-400 font-mono">{periodResults[i].days} days</span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Start Date</label>
                <input type="date" value={p.start}
                  onChange={e => updatePeriod(i, 'start', e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">End Date</label>
                <input type="date" value={p.end}
                  onChange={e => updatePeriod(i, 'end', e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Exchange Rate (R per $1)</label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-slate-400 text-xs font-bold">R</span>
                  <input type="number" step="0.01" placeholder="18.50" value={p.rate}
                    onChange={e => updatePeriod(i, 'rate', e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {periodResults[i].valid && (
                <div className="mt-3 pt-3 border-t border-[#2a4a6e] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">USD Spend</span>
                    <span className="text-white font-mono">${periodResults[i].usdSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">ZAR Spend</span>
                    <span className={`font-bold font-mono ${labelColors[i]}`}>R{periodResults[i].zarSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {zarTotalSpend > 0 && (
        <>
          <div className="border-t border-[#1e3a5f] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wide">ZAR Summary</h4>
              <span className="text-xs text-slate-500">Blended Rate: R{blendedRate.toFixed(4)} / $1</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#1e3a5f]/50 rounded-xl p-5 border border-[#2a4a6e]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">ZAR Total Spend</span>
                  <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full font-bold">R</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  R{zarTotalSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="text-xs text-slate-400">
                  = ${totalSpendUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                </div>
                <div className="mt-3 h-2 bg-slate-600 rounded-full overflow-hidden flex">
                  {periodResults.map((pr, i) => {
                    if (!pr.valid) return null;
                    const pct = (pr.days / totalRangeDays * 100).toFixed(1);
                    return <div key={i} className={`h-full ${barColors[i]}`} style={{width: `${pct}%`}} title={`Period ${i+1}: ${pct}%`} />;
                  })}
                </div>
                <div className="flex gap-3 mt-2">
                  {periodResults.filter(pr => pr.valid).map((pr, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${barColors[i]}`}></div>
                      <span className="text-xs text-slate-400">P{i+1}: {(pr.days / totalRangeDays * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1e3a5f]/50 rounded-xl p-5 border border-[#2a4a6e]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">ZAR CPM</span>
                  <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full font-bold">R</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  R{zarCPM.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="text-xs text-slate-400">per 1,000 impressions</div>
                <div className="mt-3 pt-3 border-t border-[#2a4a6e]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">USD CPM</span>
                    <span className="text-slate-300 font-mono">${(totalImpressions > 0 ? (totalSpendUSD / totalImpressions) * 1000 : 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e3a5f]/50 rounded-xl p-5 border border-[#2a4a6e]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">ZAR CPC</span>
                  <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full font-bold">R</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  R{zarCPC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="text-xs text-slate-400">per click</div>
                <div className="mt-3 pt-3 border-t border-[#2a4a6e]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">USD CPC</span>
                    <span className="text-slate-300 font-mono">${(totalClicks > 0 ? totalSpendUSD / totalClicks : 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#1e3a5f]/30 rounded-lg p-4 border border-[#2a4a6e]">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Period Breakdown</h5>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a4a6e]">
                  <th className="text-left pb-2 text-slate-400 font-semibold">Period</th>
                  <th className="text-left pb-2 text-slate-400 font-semibold">Dates</th>
                  <th className="text-right pb-2 text-slate-400 font-semibold">Days</th>
                  <th className="text-right pb-2 text-slate-400 font-semibold">Rate</th>
                  <th className="text-right pb-2 text-slate-400 font-semibold">USD Spend</th>
                  <th className="text-right pb-2 text-slate-400 font-semibold">ZAR Spend</th>
                </tr>
              </thead>
              <tbody>
                {periodResults.filter(pr => pr.valid).map((pr, i) => (
                  <tr key={i} className="border-b border-[#1e3a5f]">
                    <td className={`py-2 font-semibold ${labelColors[i]}`}>Period {i + 1}</td>
                    <td className="py-2 text-slate-300 font-mono">{pr.start} to {pr.end}</td>
                    <td className="py-2 text-right text-slate-300">{pr.days}</td>
                    <td className="py-2 text-right text-slate-300">R{pr.rate.toFixed(2)}</td>
                    <td className="py-2 text-right text-slate-300">${pr.usdSpend.toFixed(2)}</td>
                    <td className={`py-2 text-right font-bold ${labelColors[i]}`}>R{pr.zarSpend.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-[#1e3a5f]/50">
                  <td colSpan={4} className="py-2 font-bold text-white text-right pr-2">Total</td>
                  <td className="py-2 text-right font-bold text-white">${totalSpendUSD.toFixed(2)}</td>
                  <td className="py-2 text-right font-bold text-yellow-400">R{zarTotalSpend.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {zarTotalSpend === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Enter dates and exchange rates above to calculate ZAR totals
        </div>
      )}
    </div>
  );
}

// ── InlineCharts — owns its own canvas refs, no getElementById race ──
function InlineCharts({ campaigns, campaignNameMap }) {
  const spendRef  = useRef(null);
  const ctrRef    = useRef(null);
  const clicksRef = useRef(null);
  const imprRef   = useRef(null);
  const chartInstances = useRef({});

  useEffect(() => {
    if (!campaigns?.length) return;

    function draw() {
      const labels = campaigns.map(c => {
        const n = campaignNameMap?.[String(c.id)] || c.name || ('Campaign ' + c.id);
        return n.length > 22 ? n.substring(0, 22) + '\u2026' : n;
      });

      function make(ref, data, label, color) {
        if (!ref.current || !window.Chart) return;
        if (chartInstances.current[label]) {
          try { chartInstances.current[label].destroy(); } catch(e) {}
        }
        chartInstances.current[label] = new window.Chart(ref.current, {
          type: 'bar',
          data: { labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 4 }] },
          options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
              y: { grid: { display: false } }
            }
          }
        });
      }

      make(spendRef,  campaigns.map(c => parseFloat(c.spent)     || 0), 'Spend',       '#2196F3');
      make(ctrRef,    campaigns.map(c => parseFloat(c.ctr)       || 0), 'CTR %',       '#4caf50');
      make(clicksRef, campaigns.map(c => parseInt(c.clicks)      || 0), 'Clicks',      '#ff9800');
      make(imprRef,   campaigns.map(c => parseInt(c.impressions) || 0), 'Impressions', '#9c27b0');
    }

    if (window.Chart) {
      draw();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = draw;
      document.head.appendChild(s);
    }

    return () => {
      Object.values(chartInstances.current).forEach(ch => { try { ch.destroy(); } catch(e) {} });
      chartInstances.current = {};
    };
  }, [campaigns, campaignNameMap]);

  const box = { padding:'20px', background:'white', border:'1px solid #e0e0e0', borderRadius:'8px' };
  const ttl = { marginBottom:'12px', color:'#0e1034', fontSize:'14px', fontWeight:600 };

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
      <div style={box}><h3 style={ttl}>Spend (USD) by Campaign</h3> <canvas ref={spendRef}  /></div>
      <div style={box}><h3 style={ttl}>CTR (%) by Campaign</h3>     <canvas ref={ctrRef}    /></div>
      <div style={box}><h3 style={ttl}>Clicks by Campaign</h3>      <canvas ref={clicksRef} /></div>
      <div style={box}><h3 style={ttl}>Impressions by Campaign</h3> <canvas ref={imprRef}   /></div>
    </div>
  );
}

function AIReportModal({ show, onClose, generatingReport, reportData, reportResult, currentRange, previousRange, campaignNameMap, fxRate, fxCurrency }) {
  const reportRef = useRef(null);
  const chartSuffix = useRef(Date.now());

  function downloadHTML() {
    if (!reportResult) return;
    const html = generateFullHTML(reportResult, reportData, currentRange, previousRange, campaignNameMap);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-report-${currentRange.start}-${currentRange.end}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!show) return null;

  const report  = reportResult?.report;
  const rawMetrics = reportResult?.metrics;
  const metrics = rawMetrics || {};
  const fx      = parseFloat(fxRate) || 0;
  const fxSym   = fxCurrency === 'KES' ? 'KSh' : 'R';
  const fmtZar  = (v) => v > 0 ? `${fxSym} ${(v * fx).toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2})}` : null;
  const sfx     = chartSuffix.current;

  function statusColor(status) {
    if (status === 'critical') return '#ff5252';
    if (status === 'warning')  return '#ff9800';
    return '#4caf50';
  }
  function trendArrow(trend) {
    if (trend === 'up')   return '↑ Up';
    if (trend === 'down') return '↓ Down';
    return '→ Stable';
  }
  function perfBadge(perf) {
    if (!perf) return '—';
    if (perf.includes('above')) return 'Above Benchmark';
    if (perf.includes('below')) return 'Below Benchmark';
    return 'At Benchmark';
  }

  // ZAR summary values
  const spent  = metrics?.current?.spent  || 0;
  const cpl    = metrics?.current?.cpl    || 0;
  const cpm    = metrics?.current?.cpm    || 0;
  const cpc    = metrics?.current?.cpc    || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl my-4 overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center px-6 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">AI Campaign Report</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Editable</span>
          </div>
          <div className="flex gap-2">
            {report && !generatingReport && (
              <button onClick={downloadHTML}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 font-medium">
                Download HTML
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
              Close
            </button>
          </div>
        </div>

        {generatingReport ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <p className="text-gray-800 font-semibold text-xl">Analyzing your campaigns...</p>
            <p className="text-gray-400 text-sm mt-2">Fetching individual campaign data from LinkedIn — this may take 20–60 seconds</p>
          </div>
        ) : report ? (
          <div ref={reportRef} style={{fontFamily:"'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",background:'#f4fbff',padding:'20px'}}>
            <div style={{maxWidth:'100%',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'}}>

              {/* Header */}
              <div style={{background:'#0e1034',color:'white',padding:'30px'}} contentEditable suppressContentEditableWarning>
                <h1 style={{fontSize:'28px',marginBottom:'10px',margin:0}}>Campaign Optimization Summary</h1>
                <p style={{opacity:0.9,fontSize:'14px',marginTop:'10px'}}>
                  <strong>Report Period:</strong> {currentRange.start} to {currentRange.end} | <strong>Compare Period:</strong> {previousRange.start} to {previousRange.end}
                </p>
              </div>

              {/* Executive Summary */}
              <div style={{padding:'20px 30px',background:'#f0f4ff',borderBottom:'1px solid #e0e0e0'}}>
                <p style={{fontSize:'14px',color:'#333',lineHeight:1.7}} contentEditable suppressContentEditableWarning>
                  {report.executiveSummary}
                </p>
              </div>

              {/* Campaign Summary Cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'20px',padding:'30px'}}>
                {[
                  { label:'Total Spend',   value:`$${(spent).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,  sub:`vs $${(metrics?.previous?.spent||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} prev` },
                  { label:'Impressions',   value:(metrics?.current?.impressions||0).toLocaleString(),                                          sub:`${report.keyMetrics?.impressionsChange||''} vs previous` },
                  { label:'Clicks',        value:(metrics?.current?.clicks||0).toLocaleString(),                                               sub:`${report.keyMetrics?.clicksChange||''} vs previous` },
                  { label:'CTR',           value:`${(metrics?.current?.ctr||0).toFixed(2)}%`,                                                  sub:`${report.keyMetrics?.ctrChange||''} vs previous` },
                  { label:'CPL',           value:`$${(cpl).toFixed(2)}`,                                                                       sub:`${report.keyMetrics?.cplChange||''} vs previous` },
                  { label:'Total Leads',   value:String(metrics?.current?.leads||0),                                                           sub:`vs ${metrics?.previous?.leads||0} prev period` },
                ].map((card,i) => (
                  <div key={i} style={{background:'white',border:'1px solid #e0e0e0',borderRadius:'8px',padding:'20px',boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                    <h3 style={{fontSize:'12px',color:'#666',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{card.label}</h3>
                    <div style={{fontSize:'28px',fontWeight:'bold',color:'#0e1034',marginBottom:'5px'}} contentEditable suppressContentEditableWarning>{card.value}</div>
                    <div style={{fontSize:'13px',color:'#999'}} contentEditable suppressContentEditableWarning>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Currency Summary Block */}
              {fx > 0 && (
                <div style={{margin:'0 30px 30px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                    <div style={{width:'32px',height:'32px',background:'#16a34a',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'13px',color:'white',flexShrink:0}}>{fxSym}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:'14px',color:'#15803d'}}>{fxCurrency === 'KES' ? 'KES' : 'ZAR'} Summary</div>
                      <div style={{fontSize:'12px',color:'#86efac'}}>@ {fxSym}{fx.toFixed(2)} per $1 USD</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px'}}>
                    {[
                      { label:`Total Spent (${fxCurrency === 'KES' ? 'KES' : 'ZAR'})`, val: fmtZar(spent) },
                      { label:`CPM (${fxCurrency === 'KES' ? 'KES' : 'ZAR'})`,          val: fmtZar(cpm)   },
                      { label:`CPC (${fxCurrency === 'KES' ? 'KES' : 'ZAR'})`,          val: fmtZar(cpc)   },
                      ...(cpl > 0  ? [{ label:`CPL (${fxCurrency === 'KES' ? 'KES' : 'ZAR'})`, val: fmtZar(cpl) }] : []),
                    ].map((z,i) => z.val ? (
                      <div key={i} style={{background:'white',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'14px'}}>
                        <div style={{fontSize:'10px',textTransform:'uppercase',letterSpacing:'1.5px',color:'#16a34a',fontWeight:700,marginBottom:'6px'}}>{z.label}</div>
                        <div style={{fontSize:'22px',fontWeight:700,color:'#15803d'}} contentEditable suppressContentEditableWarning>{z.val}</div>
                        <div style={{fontSize:'11px',color:'#86efac',marginTop:'4px'}}>× {fxSym}{fx.toFixed(2)}</div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Campaign Performance Comparison */}
              <div style={{padding:'30px',borderTop:'1px solid #e0e0e0'}}>
                <h2 style={{fontSize:'22px',marginBottom:'20px',color:'#0e1034'}}>Campaign Performance Comparison</h2>
                {(!metrics?.topCampaigns || metrics.topCampaigns.length === 0) ? (
                  <p style={{color:'#999',fontSize:'13px'}}>No campaign data available.</p>
                ) : (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                      <thead>
                        <tr>
                          {['Campaign','Impressions','Clicks','CTR','Spent (USD)','Leads','CPL','Performance','Trend'].map(h => (
                            <th key={h} style={{textAlign:'left',padding:'12px',borderBottom:'1px solid #e0e0e0',background:'#f5f5f5',fontWeight:600,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px',color:'#666'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topCampaigns.map((c,i) => {
                          const analysis = report.campaignAnalysis?.find(a => String(a.id) === String(c.id));
                          const name = campaignNameMap?.[String(c.id)] || c.name || `Campaign ${c.id}`;
                          return (
                            <tr key={c.id || i} style={{background:i%2===0?'white':'#fafafa'}}>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>
                                <strong>{name}</strong><br/>
                                <span style={{fontSize:'11px',color:'#888',fontFamily:'monospace'}}>ID: {c.id}</span>
                              </td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{(c.impressions||0).toLocaleString()}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{(c.clicks||0).toLocaleString()}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{parseFloat(c.ctr||0).toFixed(2)}%</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>${(c.spent||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{c.leads||0}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{c.leads>0?`$${(c.spent/c.leads).toFixed(2)}`:'-'}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:statusColor(analysis?.status),fontWeight:600}} contentEditable suppressContentEditableWarning>{perfBadge(analysis?.performance)}</td>
                              <td style={{padding:'12px',borderBottom:'1px solid #e0e0e0',color:'#111'}} contentEditable suppressContentEditableWarning>{trendArrow(analysis?.trend)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Performance Charts — self-contained with refs, no ID race condition */}
              <div style={{padding:'30px',borderTop:'1px solid #e0e0e0'}}>
                <h2 style={{fontSize:'22px',marginBottom:'20px',color:'#0e1034'}}>Performance Charts</h2>
                {metrics?.topCampaigns?.length > 0 ? (
                  <InlineCharts campaigns={metrics.topCampaigns} campaignNameMap={campaignNameMap} />
                ) : (
                  <p style={{color:'#999',fontSize:'13px'}}>No campaign data available for charts.</p>
                )}
              </div>

              {/* Optimization Recommendations */}
              <div style={{padding:'30px',borderTop:'1px solid #e0e0e0'}}>
                <h2 style={{fontSize:'22px',marginBottom:'20px',color:'#0e1034'}}>Optimization Recommendations</h2>
                {report.campaignAnalysis?.map((analysis,i) => {
                  const name = campaignNameMap?.[String(analysis.id)] || `Campaign ${analysis.id}`;
                  return (
                    <div key={i} style={{background:'#f9f9f9',borderLeft:'4px solid #2196F3',padding:'15px',margin:'10px 0',borderRadius:'4px'}}>
                      <h4 style={{color:'#0e1034',marginBottom:'10px',fontSize:'15px'}} contentEditable suppressContentEditableWarning>
                        {name} <span style={{fontSize:'12px',color:'#999',fontFamily:'monospace'}}>(ID: {analysis.id})</span>
                      </h4>
                      <ul style={{listStyle:'none',padding:0}}>
                        {analysis.recommendations?.map((rec,j) => (
                          <li key={j} style={{padding:'5px 0',paddingLeft:'20px',position:'relative',color:'#444',fontSize:'14px'}} contentEditable suppressContentEditableWarning>
                            <span style={{position:'absolute',left:0,color:'#2196F3'}}>→</span>{rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Key Insights */}
              <div style={{padding:'30px',borderTop:'1px solid #e0e0e0'}}>
                <h2 style={{fontSize:'22px',marginBottom:'20px',color:'#0e1034'}}>Key Insights and Action Items</h2>
                {[
                  { title:'Top Performers',           items:report.topPerformers,           color:'#4caf50' },
                  { title:'Areas for Improvement',     items:report.areasForImprovement,     color:'#ff9800' },
                  { title:'Strategic Recommendations', items:report.strategicRecommendations,color:'#2196F3' },
                  { title:'Immediate Next Steps',      items:report.immediateActions,        color:'#ff5252' },
                ].map((section,si) => (
                  <div key={si} style={{background:'#f9f9f9',borderLeft:`4px solid ${section.color}`,padding:'15px',margin:'10px 0',borderRadius:'4px'}}>
                    <h4 style={{color:'#0e1034',marginBottom:'10px',fontSize:'15px'}}>{section.title}</h4>
                    <ul style={{listStyle:'none',padding:0}}>
                      {section.items?.map((item,j) => (
                        <li key={j} style={{padding:'5px 0',paddingLeft:'20px',position:'relative',color:'#444',fontSize:'14px'}} contentEditable suppressContentEditableWarning>
                          <span style={{position:'absolute',left:0,color:section.color}}>→</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {report.budgetRecommendation && (
                  <div style={{background:'#e8f5e9',borderLeft:'4px solid #4caf50',padding:'15px',margin:'10px 0',borderRadius:'4px'}}>
                    <h4 style={{color:'#0e1034',marginBottom:'10px',fontSize:'15px'}}>Budget Recommendation</h4>
                    <p style={{color:'#444',fontSize:'14px'}} contentEditable suppressContentEditableWarning>{report.budgetRecommendation}</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}

function ChartRenderer({ campaigns, campaignNameMap, suffix }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !campaigns?.length) return;
    const sfx = suffix || 'default';

    function drawCharts() {
      const labels = campaigns.map(c => {
        const n = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
        return n.length > 25 ? n.substring(0, 25) + '...' : n;
      });
      const makeChart = (id, data, label, color) => {
        const el = document.getElementById(id);
        if (!el || !window.Chart) return;
        if (el._chart) { try { el._chart.destroy(); } catch(e) {} }
        el._chart = new window.Chart(el, {
          type: 'bar',
          data: { labels, datasets: [{ label, data, backgroundColor: color }] },
          options: {
            responsive: true, maintainAspectRatio: true, indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
          }
        });
      };
      makeChart(`spendChart_${sfx}`,       campaigns.map(c => parseFloat(c.spent)    || 0), 'Spend',       '#2196F3');
      makeChart(`ctrChart_${sfx}`,         campaigns.map(c => parseFloat(c.ctr)      || 0), 'CTR %',       '#4caf50');
      makeChart(`clicksChart_${sfx}`,      campaigns.map(c => parseInt(c.clicks)     || 0), 'Clicks',      '#ff9800');
      makeChart(`impressionsChart_${sfx}`, campaigns.map(c => parseInt(c.impressions)|| 0), 'Impressions', '#9c27b0');
    }

    if (window.Chart) {
      drawCharts();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = drawCharts;
      document.head.appendChild(script);
    }
  }, [campaigns, campaignNameMap, suffix]);
  return null;
}

function generateFullHTML(reportResult, reportData, currentRange, previousRange, campaignNameMap) {
  const report = reportResult?.report;
  const metrics = reportResult?.metrics;
  const campaigns = metrics?.topCampaigns || [];
  const statusColor = (s) => s === 'critical' ? '#ff5252' : s === 'warning' ? '#ff9800' : '#4caf50';
  const trendArrow = (t) => t === 'up' ? 'up' : t === 'down' ? 'down' : 'stable';
  const perfBadge = (p) => p?.includes('above') ? 'Above Benchmark' : p?.includes('below') ? 'Below Benchmark' : 'At Benchmark';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Campaign Optimization Summary</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></` + `script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4fbff;padding:20px;line-height:1.6}
.container{max-width:1200px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden}
header{background:#0e1034;color:white;padding:30px}
header h1{font-size:28px;margin-bottom:10px}
.exec{padding:20px 30px;background:#f0f4ff;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333;line-height:1.7}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;padding:30px}
.card{background:white;border:1px solid #e0e0e0;border-radius:8px;padding:20px;box-shadow:0 2px 4px rgba(0,0,0,0.05)}
.card h3{font-size:12px;color:#666;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px}
.card .value{font-size:28px;font-weight:bold;color:#0e1034;margin-bottom:5px}
.card .sub{font-size:13px;color:#999}
section{padding:30px;border-top:1px solid #e0e0e0}
section h2{font-size:22px;margin-bottom:20px;color:#0e1034}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:12px;border-bottom:1px solid #e0e0e0}
th{background:#f5f5f5;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666}
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.chart-box{padding:20px;background:white;border:1px solid #e0e0e0;border-radius:8px}
.chart-box h3{margin-bottom:15px;color:#0e1034;font-size:16px}
canvas{max-height:280px!important}
.rec{background:#f9f9f9;padding:15px;margin:10px 0;border-radius:4px}
.rec h4{color:#0e1034;margin-bottom:10px;font-size:15px}
.rec ul{list-style:none;padding:0}
.rec li{padding:5px 0 5px 20px;position:relative;color:#444;font-size:14px}
</style>
</head>
<body>
<div class="container">
<header>
<h1>Campaign Optimization Summary</h1>
<p><strong>Report Period:</strong> ${currentRange.start} to ${currentRange.end} | <strong>Compare Period:</strong> ${previousRange.start} to ${previousRange.end}</p>
</header>
<div class="exec">${report?.executiveSummary || ''}</div>
<div class="summary-grid">
${[
  { label: 'Total Spend', value: `$${metrics?.current?.spent?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: `vs $${metrics?.previous?.spent?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} prev` },
  { label: 'Impressions', value: metrics?.current?.impressions?.toLocaleString(), sub: `${report?.keyMetrics?.impressionsChange||''} vs previous` },
  { label: 'Clicks', value: metrics?.current?.clicks?.toLocaleString(), sub: `${report?.keyMetrics?.clicksChange||''} vs previous` },
  { label: 'CTR', value: `${metrics?.current?.ctr?.toFixed(2)}%`, sub: `${report?.keyMetrics?.ctrChange||''} vs previous` },
  { label: 'CPL', value: `$${metrics?.current?.cpl?.toFixed(2)}`, sub: `${report?.keyMetrics?.cplChange||''} vs previous` },
  { label: 'Total Leads', value: metrics?.current?.leads, sub: `vs ${metrics?.previous?.leads} prev period` },
].map(c => `<div class="card"><h3>${c.label}</h3><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('')}
</div>
<section>
<h2>Campaign Performance Comparison</h2>
<table>
<thead><tr>${['Campaign','Impressions','Clicks','CTR','Spent (USD)','Leads','CPL','Performance','Trend'].map(h=>`<th>${h}</th>`).join('')}</tr></thead>
<tbody>
${campaigns.map((c,i)=>{
  const a=report?.campaignAnalysis?.find(x=>String(x.id)===String(c.id));
  const name=campaignNameMap?.[String(c.id)] || c.name || `Campaign ${c.id}`;
  return `<tr style="background:${i%2===0?'white':'#fafafa'}">
<td><strong>${name}</strong><br/><span style="font-size:11px;color:#999;font-family:monospace">ID: ${c.id}</span></td>
<td>${(c.impressions||0).toLocaleString()}</td><td>${(c.clicks||0).toLocaleString()}</td><td>${parseFloat(c.ctr||0).toFixed(2)}%</td>
<td>$${(c.spent||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
<td>${c.leads||0}</td><td>${c.leads>0?`$${(c.spent/c.leads).toFixed(2)}`:'-'}</td>
<td style="color:${statusColor(a?.status)}">${perfBadge(a?.performance)}</td>
<td>${trendArrow(a?.trend)}</td></tr>`;
}).join('')}
</tbody></table>
</section>
<section>
<h2>Performance Charts</h2>
<div class="chart-grid">
<div class="chart-box"><h3>Spend (USD) by Campaign</h3><canvas id="spendChart"></canvas></div>
<div class="chart-box"><h3>CTR by Campaign</h3><canvas id="ctrChart"></canvas></div>
<div class="chart-box"><h3>Clicks by Campaign</h3><canvas id="clicksChart"></canvas></div>
<div class="chart-box"><h3>Impressions by Campaign</h3><canvas id="impressionsChart"></canvas></div>
</div>
</section>
<section>
<h2>Optimization Recommendations</h2>
${(report?.campaignAnalysis||[]).map(a=>{
  const name=campaignNameMap?.[String(a.id)]||`Campaign ${a.id}`;
  return `<div class="rec" style="border-left:4px solid #2196F3">
<h4>${name} <span style="font-size:11px;color:#999">(ID: ${a.id})</span></h4>
<ul>${(a.recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
</div>`;
}).join('')}
</section>
<section>
<h2>Key Insights and Action Items</h2>
${[
  {title:'Top Performers',items:report?.topPerformers,color:'#4caf50'},
  {title:'Areas for Improvement',items:report?.areasForImprovement,color:'#ff9800'},
  {title:'Strategic Recommendations',items:report?.strategicRecommendations,color:'#2196F3'},
  {title:'Immediate Next Steps',items:report?.immediateActions,color:'#ff5252'},
].map(s=>`<div class="rec" style="border-left:4px solid ${s.color}">
<h4>${s.title}</h4>
<ul>${(s.items||[]).map(i=>`<li>${i}</li>`).join('')}</ul>
</div>`).join('')}
${report?.budgetRecommendation?`<div class="rec" style="border-left:4px solid #4caf50;background:#e8f5e9">
<h4>Budget Recommendation</h4><p style="color:#444;font-size:14px">${report.budgetRecommendation}</p></div>`:''}
</section>
</div>
<script>
window.addEventListener('load', function() {
  var labels=${JSON.stringify(campaigns.map(c=>{const n=campaignNameMap?.[String(c.id)]||c.name||`Campaign ${c.id}`;return n.length>25?n.substring(0,25)+'...':n;}))};
  function mc(id,data,label,color){
    var el=document.getElementById(id);
    if(!el||!window.Chart)return;
    new Chart(el,{type:'bar',data:{labels:labels,datasets:[{label:label,data:data,backgroundColor:color}]},options:{responsive:true,maintainAspectRatio:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
  }
  mc('spendChart',${JSON.stringify(campaigns.map(c=>parseFloat(c.spent)||0))},'Spend','#2196F3');
  mc('ctrChart',${JSON.stringify(campaigns.map(c=>parseFloat(c.ctr)||0))},'CTR %','#4caf50');
  mc('clicksChart',${JSON.stringify(campaigns.map(c=>parseInt(c.clicks)||0))},'Clicks','#ff9800');
  mc('impressionsChart',${JSON.stringify(campaigns.map(c=>parseInt(c.impressions)||0))},'Impressions','#9c27b0');
});
</` + `script>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────
// BENCHMARK TABLES — all regions & industries from LinkedIn Q4 2025 In-Depth
// ─────────────────────────────────────────────────────────────────────────────
const BENCHMARK_TABLES = {
  'Middle East': {
    label: 'Middle East',
    data: {
      'Organic CTR': { low: 0.0243, median: 0.0441, high: 0.0853 },
      'Organic Engagement Rate': { low: 0.0363, median: 0.0599, high: 0.104 },
      'Sponsored Content CTR': { low: 0.0021, median: 0.0059, high: 0.0124 },
      'Lead Gen Form Fill Rate': { low: 0.023, median: 0.0588, high: 0.1272 },
      'Sponsored Engagement Rate': { low: 0.003, median: 0.0089, high: 0.0208 },
      'Cost Per Lead ($)': { low: 18.99, median: 48.52, high: 129.36 },
      'Video View Through Rate': { low: 0.271, median: 0.372, high: 0.653 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 1.42, median: 4.63, high: 16.49 },
      'CPC ($)': { low: 0.27, median: 0.76, high: 2.53 },
      'Cost Per Conversion ($)': { low: 26.4, median: 125.78, high: 510.69 },
    },
  },
  'North America': {
    label: 'North America',
    data: {
      'Organic CTR': { low: 0.0232, median: 0.0409, high: 0.0756 },
      'Organic Engagement Rate': { low: 0.0357, median: 0.0594, high: 0.0975 },
      'Sponsored Content CTR': { low: 0.0016, median: 0.0068, high: 0.0159 },
      'Lead Gen Form Fill Rate': { low: 0.0299, median: 0.0805, high: 0.1818 },
      'Sponsored Engagement Rate': { low: 0.0023, median: 0.0106, high: 0.0208 },
      'Cost Per Lead ($)': { low: 61.46, median: 201.1, high: 581.28 },
      'Video View Through Rate': { low: 0.305, median: 0.448, high: 0.694 },
      'Conversion Rate': { low: 0.0082, median: 0.0401, high: 0.2167 },
      'CPM ($)': { low: 5.5, median: 17.61, high: 66.04 },
      'CPC ($)': { low: 0.71, median: 2.27, high: 11.1 },
      'Cost Per Conversion ($)': { low: 35.68, median: 208.89, high: 936.47 },
    },
  },
  'South America': {
    label: 'South America',
    data: {
      'Organic CTR': { low: 0.023, median: 0.0425, high: 0.0951 },
      'Organic Engagement Rate': { low: 0.0345, median: 0.0575, high: 0.1123 },
      'Sponsored Content CTR': { low: 0.0024, median: 0.0069, high: 0.0162 },
      'Lead Gen Form Fill Rate': { low: 0.0261, median: 0.0796, high: 0.203 },
      'Sponsored Engagement Rate': { low: 0.0035, median: 0.0104, high: 0.0228 },
      'Cost Per Lead ($)': { low: 4.41, median: 25.29, high: 88.3 },
      'Video View Through Rate': { low: 0.303, median: 0.439, high: 0.731 },
      'Conversion Rate': { low: 0.0062, median: 0.0313, high: 0.189 },
      'CPM ($)': { low: 1.11, median: 3.43, high: 11.13 },
      'CPC ($)': { low: 0.15, median: 0.48, high: 1.71 },
      'Cost Per Conversion ($)': { low: 4.87, median: 35.56, high: 153.56 },
    },
  },
  'Europe': {
    label: 'Europe',
    data: {
      'Organic CTR': { low: 0.0282, median: 0.0492, high: 0.1053 },
      'Organic Engagement Rate': { low: 0.0415, median: 0.0674, high: 0.1266 },
      'Sponsored Content CTR': { low: 0.0026, median: 0.0052, high: 0.0115 },
      'Lead Gen Form Fill Rate': { low: 0.0235, median: 0.0633, high: 0.1469 },
      'Sponsored Engagement Rate': { low: 0.0047, median: 0.0095, high: 0.0208 },
      'Cost Per Lead ($)': { low: 44.7, median: 123.12, high: 326.82 },
      'Video View Through Rate': { low: 0.287, median: 0.372, high: 0.499 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 9.6, median: 21.93, high: 43.51 },
      'CPC ($)': { low: 1.39, median: 3.73, high: 8.99 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'Africa': {
    label: 'Africa',
    data: {
      'Organic CTR': { low: 0.0282, median: 0.0492, high: 0.1053 },
      'Organic Engagement Rate': { low: 0.0415, median: 0.0674, high: 0.1266 },
      'Sponsored Content CTR': { low: 0.0026, median: 0.0061, high: 0.0114 },
      'Lead Gen Form Fill Rate': { low: 0.0417, median: 0.0909, high: 0.1745 },
      'Sponsored Engagement Rate': { low: 0.0035, median: 0.0083, high: 0.0221 },
      'Cost Per Lead ($)': { low: 6.17, median: 17.56, high: 49.28 },
      'Video View Through Rate': { low: 0.31, median: 0.427, high: 0.703 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 0.75, median: 2.08, high: 7.61 },
      'CPC ($)': { low: 0.15, median: 0.36, high: 1.06 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'Eurasia': {
    label: 'Eurasia',
    data: {
      'Organic CTR': { low: 0.0275, median: 0.0484, high: 0.1035 },
      'Organic Engagement Rate': { low: 0.0402, median: 0.0664, high: 0.125 },
      'Sponsored Content CTR': { low: 0.0028, median: 0.0058, high: 0.0127 },
      'Lead Gen Form Fill Rate': { low: 0.0247, median: 0.0628, high: 0.1389 },
      'Sponsored Engagement Rate': { low: 0.005, median: 0.0102, high: 0.0222 },
      'Cost Per Lead ($)': { low: 22.88, median: 72.69, high: 218.97 },
      'Video View Through Rate': { low: 0.286, median: 0.372, high: 0.508 },
      'Conversion Rate': { low: 0.0099, median: 0.04, high: 0.1667 },
      'CPM ($)': { low: 5.19, median: 16.46, high: 36.91 },
      'CPC ($)': { low: 0.73, median: 2.46, high: 7.04 },
      'Cost Per Conversion ($)': { low: 23.26, median: 113.93, high: 465.35 },
    },
  },
  'Asia': {
    label: 'Asia',
    data: {
      'Organic CTR': { low: 0.0259, median: 0.0466, high: 0.0992 },
      'Organic Engagement Rate': { low: 0.0373, median: 0.0638, high: 0.121 },
      'Sponsored Content CTR': { low: 0.003, median: 0.0068, high: 0.0155 },
      'Lead Gen Form Fill Rate': { low: 0.0264, median: 0.0632, high: 0.1305 },
      'Sponsored Engagement Rate': { low: 0.0048, median: 0.0112, high: 0.0246 },
      'Cost Per Lead ($)': { low: 12.21, median: 33.68, high: 100.55 },
      'Video View Through Rate': { low: 0.281, median: 0.372, high: 0.565 },
      'Conversion Rate': { low: 0.0105, median: 0.0417, high: 0.2143 },
      'CPM ($)': { low: 1.36, median: 4.96, high: 16.81 },
      'CPC ($)': { low: 0.22, median: 0.66, high: 2.33 },
      'Cost Per Conversion ($)': { low: 12.63, median: 74.95, high: 308.35 },
    },
  },
  'UK': {
    label: 'United Kingdom',
    data: {
      'Organic CTR': { low: 0.0267, median: 0.0458, high: 0.087 },
      'Organic Engagement Rate': { low: 0.0392, median: 0.0637, high: 0.1085 },
      'Sponsored Content CTR': { low: 0.0019, median: 0.0051, high: 0.013 },
      'Lead Gen Form Fill Rate': { low: 0.028, median: 0.0817, high: 0.1905 },
      'Sponsored Engagement Rate': { low: 0.003, median: 0.0093, high: 0.0216 },
      'Cost Per Lead ($)': { low: 33.81, median: 102.76, high: 301.92 },
      'Video View Through Rate': { low: 0.29, median: 0.388, high: 0.56 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 7.84, median: 22.21, high: 49.4 },
      'CPC ($)': { low: 1.15, median: 3.5, high: 9.91 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'US': {
    label: 'United States',
    data: {
      'Organic CTR': { low: 0.0224, median: 0.0396, high: 0.0723 },
      'Organic Engagement Rate': { low: 0.0349, median: 0.0583, high: 0.0949 },
      'Sponsored Content CTR': { low: 0.0013, median: 0.0065, high: 0.0157 },
      'Lead Gen Form Fill Rate': { low: 0.0309, median: 0.082, high: 0.1818 },
      'Sponsored Engagement Rate': { low: 0.0017, median: 0.0102, high: 0.0202 },
      'Cost Per Lead ($)': { low: 78.83, median: 236.02, high: 648.79 },
      'Video View Through Rate': { low: 0.309, median: 0.458, high: 0.695 },
      'Conversion Rate': { low: 0.0082, median: 0.0401, high: 0.2167 },
      'CPM ($)': { low: 5.8, median: 18.55, high: 72.15 },
      'CPC ($)': { low: 0.77, median: 2.46, high: 12.22 },
      'Cost Per Conversion ($)': { low: 35.7, median: 208.89, high: 936.5 },
    },
  },
  'KE': {
    label: 'Kenya',
    data: {
      'Organic CTR': { low: 0.025, median: 0.0467, high: 0.0989 },
      'Organic Engagement Rate': { low: 0.0344, median: 0.0603, high: 0.1148 },
      'Sponsored Content CTR': { low: 0.0041, median: 0.0083, high: 0.0252 },
      'Lead Gen Form Fill Rate': { low: 0.0506, median: 0.1062, high: 0.2 },
      'Sponsored Engagement Rate': { low: 0.008, median: 0.0191, high: 0.0429 },
      'Cost Per Lead ($)': { low: 4.03, median: 11.91, high: 29.45 },
      'Video View Through Rate': { low: 0.275, median: 0.354, high: 0.441 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 1.42, median: 4.18, high: 10.73 },
      'CPC ($)': { low: 0.16, median: 0.46, high: 1.22 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'NG': {
    label: 'Nigeria',
    data: {
      'Organic CTR': { low: 0.0278, median: 0.0474, high: 0.0855 },
      'Organic Engagement Rate': { low: 0.0365, median: 0.0641, high: 0.1096 },
      'Sponsored Content CTR': { low: 0.0016, median: 0.0072, high: 0.0216 },
      'Lead Gen Form Fill Rate': { low: 0.0626, median: 0.1403, high: 0.2609 },
      'Sponsored Engagement Rate': { low: 0.0021, median: 0.0164, high: 0.0417 },
      'Cost Per Lead ($)': { low: 2.92, median: 10.75, high: 29.34 },
      'Video View Through Rate': { low: 0.284, median: 0.398, high: 0.564 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 0.94, median: 3.12, high: 11.43 },
      'CPC ($)': { low: 0.19, median: 0.58, high: 1.6 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'ZA': {
    label: 'South Africa',
    data: {
      'Organic CTR': { low: 0.0224, median: 0.0426, high: 0.0817 },
      'Organic Engagement Rate': { low: 0.0315, median: 0.0557, high: 0.096 },
      'Lead Gen Form Fill Rate': { low: 0.0508, median: 0.1121, high: 0.2121 },
      'Sponsored Engagement Rate': { low: 0.0017, median: 0.0082, high: 0.0192 },
      'Cost Per Lead ($)': { low: 7.42, median: 21.43, high: 61.29 },
      'Video View Through Rate': { low: 0.341, median: 0.5, high: 0.809 },
      'Conversion Rate': { low: 0.0098, median: 0.0395, high: 0.1593 },
      'CPM ($)': { low: 0.95, median: 2.28, high: 9.61 },
      'CPC ($)': { low: 0.21, median: 0.51, high: 1.55 },
      'Cost Per Conversion ($)': { low: 26.41, median: 125.78, high: 510.69 },
    },
  },
  'Bank': {
    label: 'Banking',
    data: {
      'Organic CTR': { low: 0.0208, median: 0.0375, high: 0.058 },
      'Organic Engagement Rate': { low: 0.0305, median: 0.0453, high: 0.0671 },
      'Sponsored Content CTR': { low: 0.0009, median: 0.0044, high: 0.0076 },
      'Lead Gen Form Fill Rate': { low: 0.2273, median: 0.3571, high: 0.4184 },
      'Sponsored Engagement Rate': { low: 0.0011, median: 0.0054, high: 0.0118 },
      'Cost Per Lead ($)': { low: 4.89, median: 12.52, high: 19.94 },
      'Video View Through Rate': { low: 0.237, median: 0.311, high: 0.568 },
      'Conversion Rate': { low: 0.0156, median: 0.0727, high: 0.2122 },
      'CPM ($)': { low: 0.71, median: 2.82, high: 12.85 },
      'CPC ($)': { low: 0.26, median: 0.84, high: 3.04 },
      'Cost Per Conversion ($)': { low: 26.51, median: 95.11, high: 335.53 },
    },
  },
  'TelC': {
    label: 'Telecommunications',
    data: {
      'Organic CTR': { low: 0.0213, median: 0.0421, high: 0.091 },
      'Organic Engagement Rate': { low: 0.0328, median: 0.0587, high: 0.1114 },
      'Sponsored Content CTR': { low: 0.0015, median: 0.0049, high: 0.0091 },
      'Lead Gen Form Fill Rate': { low: 0.0505, median: 0.0789, high: 0.1098 },
      'Sponsored Engagement Rate': { low: 0.0023, median: 0.0072, high: 0.0151 },
      'Cost Per Lead ($)': { low: 34.99, median: 49.73, high: 82.18 },
      'Video View Through Rate': { low: 0.311, median: 0.381, high: 0.62 },
      'Conversion Rate': { low: 0.0116, median: 0.0556, high: 0.2229 },
      'CPM ($)': { low: 0.97, median: 2.1, high: 8.36 },
      'CPC ($)': { low: 0.2, median: 0.59, high: 2.11 },
      'Cost Per Conversion ($)': { low: 23.83, median: 111.13, high: 393.67 },
    },
  },
  'FinS': {
    label: 'Financial Services',
    data: {
      'Organic CTR': { low: 0.0188, median: 0.0401, high: 0.0724 },
      'Organic Engagement Rate': { low: 0.0281, median: 0.0527, high: 0.0877 },
      'Sponsored Content CTR': { low: 0.0015, median: 0.0057, high: 0.0125 },
      'Lead Gen Form Fill Rate': { low: 0.0395, median: 0.0743, high: 0.1266 },
      'Sponsored Engagement Rate': { low: 0.0022, median: 0.0089, high: 0.0239 },
      'Cost Per Lead ($)': { low: 13.42, median: 36.72, high: 73.07 },
      'Video View Through Rate': { low: 0.337, median: 0.463, high: 0.769 },
      'Conversion Rate': { low: 0.0105, median: 0.0417, high: 0.1579 },
      'CPM ($)': { low: 1.03, median: 2.98, high: 12.12 },
      'CPC ($)': { low: 0.22, median: 0.55, high: 1.89 },
      'Cost Per Conversion ($)': { low: 29.63, median: 136.79, high: 500.98 },
    },
  },
  'Auto': {
    label: 'Automotive',
    data: {
      'Organic CTR': { low: 0.0213, median: 0.0424, high: 0.0991 },
      'Organic Engagement Rate': { low: 0.034, median: 0.0573, high: 0.111 },
      'Sponsored Content CTR': { low: 0.0012, median: 0.0061, high: 0.0116 },
      'Lead Gen Form Fill Rate': { low: 0.0164, median: 0.022, high: 0.0714 },
      'Sponsored Engagement Rate': { low: 0.0013, median: 0.008, high: 0.019 },
      'Cost Per Lead ($)': { low: 20.76, median: 26.5, high: 37.94 },
      'Video View Through Rate': { low: 0.32, median: 0.448, high: 0.761 },
      'Conversion Rate': { low: 0.0097, median: 0.0497, high: 0.2363 },
      'CPM ($)': { low: 0.64, median: 1.42, high: 3.99 },
      'CPC ($)': { low: 0.16, median: 0.34, high: 0.8 },
      'Cost Per Conversion ($)': { low: 23.63, median: 86.09, high: 439.68 },
    },
  },
  'HiEd': {
    label: 'Higher Education',
    data: {
      'Organic CTR': { low: 0.0198, median: 0.0379, high: 0.0856 },
      'Organic Engagement Rate': { low: 0.0276, median: 0.0492, high: 0.1001 },
      'Sponsored Content CTR': { low: 0.0042, median: 0.0076, high: 0.0107 },
      'Lead Gen Form Fill Rate': { low: 0.0747, median: 0.1235, high: 0.1698 },
      'Sponsored Engagement Rate': { low: 0.0068, median: 0.0147, high: 0.0257 },
      'Cost Per Lead ($)': { low: 5.98, median: 12.45, high: 20.46 },
      'Video View Through Rate': { low: 0.358, median: 0.53, high: 0.784 },
      'Conversion Rate': { low: 0.0092, median: 0.0333, high: 0.1162 },
      'CPM ($)': { low: 1.53, median: 4.85, high: 10.75 },
      'CPC ($)': { low: 0.25, median: 0.69, high: 1.4 },
      'Cost Per Conversion ($)': { low: 24.7, median: 101.87, high: 319.31 },
    },
  },
  'IT': {
    label: 'Information Technology',
    data: {
      'Organic CTR': { low: 0.0241, median: 0.0502, high: 0.0905 },
      'Organic Engagement Rate': { low: 0.0338, median: 0.0651, high: 0.1067 },
      'Sponsored Content CTR': { low: 0.0009, median: 0.0055, high: 0.0119 },
      'Lead Gen Form Fill Rate': { low: 0.0735, median: 0.1316, high: 0.178 },
      'Sponsored Engagement Rate': { low: 0.001, median: 0.0071, high: 0.019 },
      'Cost Per Lead ($)': { low: 54.67, median: 67.61, high: 119.29 },
      'Video View Through Rate': { low: 0.327, median: 0.441, high: 0.828 },
      'Conversion Rate': { low: 0.0109, median: 0.0457, high: 0.2005 },
      'CPM ($)': { low: 0.84, median: 2.04, high: 8.17 },
      'CPC ($)': { low: 0.21, median: 0.56, high: 1.67 },
      'Cost Per Conversion ($)': { low: 22.09, median: 119.46, high: 523.92 },
    },
  },
  'Mark': {
    label: 'Marketing & Advertising',
    data: {
      'Organic CTR': { low: 0.0227, median: 0.0477, high: 0.0907 },
      'Organic Engagement Rate': { low: 0.0335, median: 0.0621, high: 0.1094 },
      'Sponsored Content CTR': { low: 0.0011, median: 0.0057, high: 0.0112 },
      'Lead Gen Form Fill Rate': { low: 0.0317, median: 0.0583, high: 0.1124 },
      'Sponsored Engagement Rate': { low: 0.0012, median: 0.007, high: 0.0171 },
      'Cost Per Lead ($)': { low: 13.19, median: 26.98, high: 73.57 },
      'Video View Through Rate': { low: 0.339, median: 0.594, high: 0.837 },
      'Conversion Rate': { low: 0.0125, median: 0.0614, high: 0.3156 },
      'CPM ($)': { low: 0.96, median: 1.73, high: 5.21 },
      'CPC ($)': { low: 0.21, median: 0.42, high: 1.13 },
      'Cost Per Conversion ($)': { low: 11.94, median: 75.9, high: 327.8 },
    },
  },
  'Reta': {
    label: 'Retail',
    data: {
      'Organic CTR': { low: 0.0281, median: 0.0528, high: 0.0913 },
      'Organic Engagement Rate': { low: 0.0362, median: 0.0628, high: 0.1047 },
      'Sponsored Content CTR': { low: 0.0007, median: 0.0036, high: 0.0092 },
      'Lead Gen Form Fill Rate': { low: 0.1023, median: 0.1023, high: 0.1023 },
      'Sponsored Engagement Rate': { low: 0.0007, median: 0.0042, high: 0.0131 },
      'Cost Per Lead ($)': { low: 5.37, median: 5.37, high: 5.37 },
      'Video View Through Rate': { low: 0.583, median: 0.779, high: 0.846 },
      'Conversion Rate': { low: 0.0132, median: 0.058, high: 0.1951 },
      'CPM ($)': { low: 0.62, median: 1.4, high: 2.25 },
      'CPC ($)': { low: 0.19, median: 0.3, high: 1.15 },
      'Cost Per Conversion ($)': { low: 23.37, median: 80.52, high: 255.67 },
    },
  },
  'AirT': {
    label: 'Airlines & Travel',
    data: {
      'Organic CTR': { low: 0.0228, median: 0.0406, high: 0.0615 },
      'Organic Engagement Rate': { low: 0.04, median: 0.0569, high: 0.0814 },
      'Sponsored Content CTR': { low: 0.0009, median: 0.0053, high: 0.0138 },
      'Lead Gen Form Fill Rate': { low: 0.0339, median: 0.0399, high: 0.046 },
      'Sponsored Engagement Rate': { low: 0.0009, median: 0.0062, high: 0.0233 },
      'Cost Per Lead ($)': { low: 20.26, median: 33.53, high: 46.81 },
      'Video View Through Rate': { low: 0.417, median: 0.57, high: 0.827 },
      'Conversion Rate': { low: 0.0059, median: 0.0433, high: 0.1699 },
      'CPM ($)': { low: 0.57, median: 1.52, high: 6.82 },
      'CPC ($)': { low: 0.0021, median: 0.0039, high: 0.0096 },
      'Cost Per Conversion ($)': { low: 9.66, median: 45.22, high: 240.86 },
    },
  },
  'Gov': {
    label: 'Government',
    data: {
      'Organic CTR': { low: 0.0201, median: 0.0431, high: 0.1133 },
      'Organic Engagement Rate': { low: 0.0265, median: 0.0522, high: 0.1248 },
      'Sponsored Content CTR': { low: 0.0007, median: 0.001, high: 0.0095 },
      'Lead Gen Form Fill Rate': { low: 0.0, median: 0.0, high: 0.0 },
      'Sponsored Engagement Rate': { low: 0.0007, median: 0.0011, high: 0.0129 },
      'Video View Through Rate': { low: 0.496, median: 0.813, high: 0.881 },
      'Conversion Rate': { low: 0.0168, median: 0.1455, high: 0.3467 },
      'CPM ($)': { low: 0.67, median: 1.11, high: 2.68 },
      'CPC ($)': { low: 0.0036, median: 0.0079, high: 0.0138 },
      'Cost Per Conversion ($)': { low: 8.5, median: 27.52, high: 174.15 },
    },
  },
};
function getBenchmarks(tableKey) {
  const key = tableKey || 'ZA';
  return BENCHMARK_TABLES[key]?.data || BENCHMARK_TABLES['ZA'].data;
}

// ─────────────────────────────────────────────────────────────
// TL LOGO SVG (inline, matches brand asset)
// ─────────────────────────────────────────────────────────────
function TLLogo({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="400" height="400" fill="#0a1628"/>
      <path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/>
      <path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/>
      <path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// RATING HELPERS
// ─────────────────────────────────────────────────────────────
function calcRating(metric, value, tableKey) {
  const bench = BENCHMARK_TABLES[tableKey]?.data || BENCHMARK_TABLES['ZA'].data;
  if (!bench?.[metric]) return null;
  const { low, median, high } = bench[metric];
  const isCost = metric.includes('Cost') || metric.includes('CPM') || metric.includes('CPC');
  if (isCost) {
    if (value <= low * 0.75) return 'exc';
    if (value <= median)     return 'above';
    if (value <= high)       return 'near';
    return 'below';
  }
  if (value >= high * 1.5)  return 'exc';
  if (value >= median)      return 'above';
  if (value >= low * 0.75)  return 'near';
  return 'below';
}

function RatingPill({ rating }) {
  if (!rating) return null;
  const map = {
    exc:   { label: '🟢 Exceptional',     cls: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' },
    above: { label: '🔵 Above Benchmark', cls: 'bg-blue-900/60 text-blue-300 border border-blue-700' },
    near:  { label: '🟡 Near Benchmark',  cls: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700' },
    below: { label: '🔴 Below Benchmark', cls: 'bg-red-900/60 text-red-300 border border-red-700' },
  };
  const c = map[rating];
  if (!c) return null;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${c.cls}`}>{c.label}</span>;
}

function fmtPct(v)  { return `${(v * 100).toFixed(2)}%`; }  // for ratios (0.0827 → 8.27%)
function fmtPctN(v) { return `${Number(v).toFixed(2)}%`; }   // for API % numbers (8.27 → 8.27%)
function fmtCur(v)  { return `$${Number(v).toFixed(2)}`; }
function fmtNum(v)  { return Number(v).toLocaleString(); }
function fmtBenchV(metric, v) {
  if (metric.includes('Cost') || metric.includes('CPM') || metric.includes('CPC')) return fmtCur(v);
  return fmtPct(v);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// BENCHMARK MANAGER  (developer-only tab)
// ─────────────────────────────────────────────────────────────
function BenchmarkManager() {
  const [localBench, setLocalBench] = useState(() => {
    const flat = {};
    Object.entries(BENCHMARK_TABLES).forEach(([k, v]) => { flat[k] = { ...v.data }; });
    return flat;
  });
  const [saved,   setSaved]   = useState({});
  const [saving,  setSaving]  = useState({});
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    fetch('/api/benchmarks')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLocalBench(data);
          Object.keys(data).forEach(key => {
            if (BENCHMARK_TABLES[key]) {
              Object.keys(data[key]).forEach(metric => {
                BENCHMARK_TABLES[key].data[metric] = { ...data[key][metric] };
              });
            }
          });
        }
      })
      .catch(() => setLoadErr('Could not load saved benchmarks — showing defaults.'));
  }, []);

  function handleChange(region, metric, level, val) {
    setLocalBench(prev => ({
      ...prev,
      [region]: { ...prev[region], [metric]: { ...prev[region][metric], [level]: parseFloat(val) || 0 } }
    }));
  }

  async function saveRegion(region) {
    setSaving(prev => ({ ...prev, [region]: true }));
    const updated = {};
    Object.entries(localBench).forEach(([k, v]) => { updated[k] = v; });
    Object.entries(localBench[region]).forEach(([metric, vals]) => {
      if (BENCHMARK_TABLES[region]) BENCHMARK_TABLES[region].data[metric] = { ...vals };
    });
    try {
      const res = await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSaved(prev => ({ ...prev, [region]: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, [region]: false })), 2500);
      }
    } catch (e) { console.error(e); }
    setSaving(prev => ({ ...prev, [region]: false }));
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1" style={{fontFamily:'Helvetica Neue,Helvetica,Arial,sans-serif'}}>Benchmark Manager</h2>
          <p className="text-slate-400 text-sm">LinkedIn Q4 2025 benchmarks. Changes persist to server and apply immediately to all new reports.</p>
          {loadErr && <p className="mt-2 text-yellow-400 text-xs">{loadErr}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#0f1f3d] border border-[#1e3a5f] rounded-lg px-3 py-2">
          <Settings className="w-3.5 h-3.5 text-yellow-500" />
          Developer Access Only
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {Object.entries(localBench).map(([region, metrics]) => (
          <div key={region} className="bg-[#0f1f3d] rounded-xl border border-[#1e3a5f] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e3a5f]" style={{background:'#0f1f3d'}}>
              <div>
                <h3 className="font-bold text-white text-sm">{region}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{Object.keys(metrics).length} metrics</p>
              </div>
              <div className="flex items-center gap-3">
                {saved[region] && <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">✓ Saved</span>}
                <button onClick={() => saveRegion(region)} disabled={saving[region]}
                  className="px-3 py-1.5 text-black rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  style={{background:'#F6DC4E'}}>
                  {saving[region] && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {saving[region] ? 'Saving...' : `Save ${region}`}
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-2 px-2">
                {['Metric','Low','Median','High'].map(h => (
                  <span key={h} className="text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              <div className="space-y-1.5">
                {Object.entries(metrics).map(([metric, vals]) => (
                  <div key={metric} className="grid grid-cols-4 gap-2 items-center bg-[#1e3a5f]/30 rounded-lg px-2 py-2">
                    <span className="text-xs text-slate-300 font-medium truncate" title={metric}>{metric}</span>
                    {['low','median','high'].map(lvl => (
                      <div key={lvl}>
                        <input type="number" step="0.0001" value={vals[lvl]}
                          onChange={e => handleChange(region, metric, lvl, e.target.value)}
                          className="w-full px-2 py-1 bg-[#1e3a5f] border border-[#2a4a6e] rounded text-xs text-white text-center focus:outline-none focus:border-yellow-500 font-mono" />
                        <div className="text-center text-xs text-slate-500 mt-0.5">{fmtBenchV(metric, vals[lvl])}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN CHARTS — Chart.js 2×2 grid per campaign
// ─────────────────────────────────────────────────────────────
function CampaignCharts({ campaignId, campaign: c, bench, region }) {
  const chartRef = useRef(null);
  const chartsRef = useRef([]);

  // Build week-level data from the campaign object
  // LinkedIn API returns totals; we simulate week buckets from daily data if available,
  // otherwise show single-period bars with benchmark lines
  const weeks  = c.weeklyData?.map(w => w.label) || ['Period Total'];
  const ctrArr = c.weeklyData?.map(w => +(w.ctr*100).toFixed(2))  || [+(c.impressions>0?(c.clicks/c.impressions*100):0).toFixed(2)];
  const engArr = c.weeklyData?.map(w => +(w.eng*100).toFixed(2))  || [+(c.impressions>0?((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions*100:0).toFixed(2)];
  const cpcArr = c.weeklyData?.map(w => +w.cpc.toFixed(2))        || [+(c.clicks>0?(c.spent/c.clicks):0).toFixed(2)];
  const spdArr = c.weeklyData?.map(w => +w.spend.toFixed(2))      || [+c.spent.toFixed(2)];

  const bCTR = bench['Sponsored Content CTR']?.low * 100 || 0.4;
  const bEng = bench['Sponsored Engagement Rate']?.low * 100 || 2.5;

  const uid = String(campaignId).slice(-8).replace(/[^a-z0-9]/gi,'');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
      const Chart = window.Chart;
      chartsRef.current.forEach(ch => { try { ch.destroy(); } catch(e){} });
      chartsRef.current = [];

      const benchLine = (n, val, label, color) => ({
        label, data: Array(n).fill(val),
        borderColor: color, borderDash: [6,4], borderWidth: 1.5,
        pointRadius: 0, fill: false, type: 'line'
      });

      const defaults = {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 14 } } }
      };

      // CTR line
      const el1 = document.getElementById(`ctr-${uid}`);
      if (el1) chartsRef.current.push(new Chart(el1, {
        type: 'line',
        data: { labels: weeks, datasets: [
          { label: 'CTR %', data: ctrArr, borderColor: '#1a3fcf', backgroundColor: 'rgba(26,63,207,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#1a3fcf' },
          benchLine(weeks.length, bCTR, `${bCTR.toFixed(1)}% Benchmark`, '#059669')
        ]},
        options: { ...defaults, scales: { y: { beginAtZero: true, title: { display: true, text: 'CTR (%)' } } } }
      }));

      // Engagement Rate line
      const el2 = document.getElementById(`eng-${uid}`);
      if (el2) chartsRef.current.push(new Chart(el2, {
        type: 'line',
        data: { labels: weeks, datasets: [
          { label: 'Eng Rate %', data: engArr, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#059669' },
          benchLine(weeks.length, bEng, `${bEng.toFixed(1)}% Benchmark`, '#d97706')
        ]},
        options: { ...defaults, scales: { y: { beginAtZero: true, title: { display: true, text: 'Engagement Rate (%)' } } } }
      }));

      // CPC bar
      const el3 = document.getElementById(`cpc-${uid}`);
      if (el3) chartsRef.current.push(new Chart(el3, {
        type: 'bar',
        data: { labels: weeks, datasets: [
          { label: 'Avg CPC $', data: cpcArr,
            backgroundColor: cpcArr.map(v => {
              const bv = bench['CPC ($)']?.high || 2;
              return v > bv * 1.5 ? '#dc2626' : v > bv ? '#d97706' : '#1a3fcf';
            })
          }
        ]},
        options: { ...defaults, scales: { y: { beginAtZero: true, title: { display: true, text: 'CPC ($)' } } } }
      }));

      // Spend bar
      const el4 = document.getElementById(`spd-${uid}`);
      if (el4) chartsRef.current.push(new Chart(el4, {
        type: 'bar',
        data: { labels: weeks, datasets: [{ label: 'Spend $', data: spdArr, backgroundColor: '#1d4ed8' }]},
        options: { ...defaults, scales: { y: { beginAtZero: true, title: { display: true, text: 'Spend ($)' } } } }
      }));
    };
    document.head.appendChild(script);
    return () => {
      chartsRef.current.forEach(ch => { try { ch.destroy(); } catch(e){} });
      try { document.head.removeChild(script); } catch(e){}
    };
  }, [campaignId]);

  return (
    <div style={{padding:'0 24px 24px'}} ref={chartRef}>
      <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',marginBottom:'16px',paddingTop:'8px',borderTop:'1px solid #e8e6df'}}>
        Performance Charts — Week on Week
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        {[
          { id:`ctr-${uid}`, title:'CTR % — Week on Week' },
          { id:`eng-${uid}`, title:'Engagement Rate % — Week on Week' },
          { id:`cpc-${uid}`, title:'Avg CPC ($) — Week on Week' },
          { id:`spd-${uid}`, title:'Weekly Spend ($)' },
        ].map(chart => (
          <div key={chart.id} style={{background:'#fafaf9',border:'1px solid #e8e6df',borderRadius:'4px',padding:'16px'}}>
            <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',marginBottom:'12px'}}>{chart.title}</div>
            <canvas id={chart.id} style={{maxHeight:'200px'}} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEKLY BREAKDOWN TABLE — per campaign
// ─────────────────────────────────────────────────────────────
function WeeklyBreakdown({ campaign: c, bench, region, campaignNameMap }) {
  const bCTR = bench['Sponsored Content CTR'];
  const bEng = bench['Sponsored Engagement Rate'];

  // Use weeklyData if available from API, else single summary row
  const rows = c.weeklyData || [{
    label:       'Period Total',
    dateRange:   '',
    ctr:         c.impressions>0 ? c.clicks/c.impressions : 0,
    cpc:         c.clicks>0 ? c.spent/c.clicks : 0,
    engRate:     c.impressions>0 ? ((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions : 0,
    webClicks:   c.webClicks || 0,
    webCtr:      c.impressions>0 ? (c.webClicks||0)/c.impressions : 0,
    impressions: c.impressions || 0,
    clicks:      c.clicks || 0,
    engagements: (c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0),
    spend:       c.spent || 0,
    days:        '—',
    ctrStatus:   calcRating('Sponsored Content CTR', c.impressions>0?c.clicks/c.impressions:0, region),
    engStatus:   calcRating('Sponsored Engagement Rate', c.impressions>0?((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions:0, region),
  }];

  function statusCell(r) {
    const color = r==='exc'||r==='above' ? '#059669' : r==='near' ? '#d97706' : '#dc2626';
    const label = r==='exc'?'✓ Exceptional':r==='above'?'✓ Above':r==='near'?'~ Near':'✗ Below';
    return <td style={{padding:'9px 12px',fontSize:'11px',color,whiteSpace:'nowrap'}}>{label}</td>;
  }

  return (
    <div style={{margin:'0 24px 24px'}}>
      <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',padding:'8px 12px',background:'#f2f1ec',borderRadius:'4px 4px 0 0',borderBottom:'1px solid #e8e6df'}}>
        Week-by-Week Summary — Objective: Engagement
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f2f1ec'}}>
              {['Week','Date Range','CTR %','CPC $','Eng Rate %','Web Clicks','Web CTR %','Impressions','Clicks','Engagements','Total Spend','Days','CTR Status','Eng Status'].map(h => (
                <th key={h} style={{textAlign:'left',padding:'8px 12px',fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',whiteSpace:'nowrap',borderBottom:'1px solid #e8e6df'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{background:i%2===0?'white':'#fafaf9',borderBottom:'1px solid #e8e6df'}}>
                <td style={{padding:'9px 12px',fontWeight:600,color:'#272828',fontSize:'13px',whiteSpace:'nowrap'}}>{row.label}</td>
                <td style={{padding:'9px 12px',fontSize:'12px',color:'#8a8880',whiteSpace:'nowrap'}}>{row.dateRange}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px',fontWeight:600,color: calcRating('Sponsored Content CTR',row.ctr,region)==='exc'||calcRating('Sponsored Content CTR',row.ctr,region)==='above'?'#059669':'#dc2626'}}>{(row.ctr*100).toFixed(2)}%</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>${row.cpc.toFixed(2)}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px',fontWeight:600,color: calcRating('Sponsored Engagement Rate',row.engRate,region)==='exc'||calcRating('Sponsored Engagement Rate',row.engRate,region)==='above'?'#059669':'#dc2626'}}>{(row.engRate*100).toFixed(2)}%</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{row.webClicks}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{(row.webCtr*100).toFixed(2)}%</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{Number(row.impressions).toLocaleString()}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{Number(row.clicks).toLocaleString()}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{Number(row.engagements).toLocaleString()}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>${row.spend.toFixed(2)}</td>
                <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:'12px'}}>{row.days}</td>
                {statusCell(row.ctrStatus || calcRating('Sponsored Content CTR',row.ctr,region))}
                {statusCell(row.engStatus || calcRating('Sponsored Engagement Rate',row.engRate,region))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LEVEL SELECTOR — reusable checkbox list with search + import
// ─────────────────────────────────────────────────────────────
function LevelSelector({ label, items, allItems, selectedIds, onToggle, onClear, search, onSearch, loading, placeholder, emptyMsg, onImport, showImport }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3 h-3 animate-spin" style={{color:'#F6DC4E'}} />}
          {selectedIds.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'#F6DC4E',color:'#272828'}}>
              {selectedIds.length} selected
            </span>
          )}
          <span className="text-xs text-slate-500">(leave empty = all {label.toLowerCase()})</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={onClear}
              className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded border border-[#1e3a5f] hover:border-red-800 transition-colors">
              Clear all
            </button>
          )}
          <button onClick={onImport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={showImport
              ? {background:'rgba(246,220,78,0.15)',borderColor:'#F6DC4E',color:'#F6DC4E'}
              : {background:'transparent',borderColor:'#475569',color:'#94a3b8'}}>
            <Layers className="w-3.5 h-3.5" /> Import IDs
          </button>
        </div>
      </div>

      {/* Imported IDs chips */}
      {selectedIds.filter(id => !allItems.find(x => String(x.id) === id)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.filter(id => !allItems.find(x => String(x.id) === id)).map(id => (
            <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-bold"
              style={{background:'rgba(177,170,164,0.12)',border:'1px solid #475569',color:'#B1AAA4'}}>
              {id}
              <button onClick={() => onToggle(id)} className="hover:text-red-400 transition-colors">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input type="text" placeholder={placeholder} value={search} onChange={e => onSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500" />
      </div>

      {/* List */}
      {allItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {(items.length > 0 ? items : allItems).map(item => {
            const sid = String(item.id);
            const sel = selectedIds.includes(sid);
            return (
              <label key={sid}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-xs transition-colors"
                style={sel
                  ? {background:'rgba(246,220,78,0.1)',borderColor:'#F6DC4E',color:'white'}
                  : {background:'transparent',borderColor:'#475569',color:'#94a3b8'}}>
                <input type="checkbox" checked={sel} onChange={() => onToggle(sid)}
                  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{accentColor:'#F6DC4E'}} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{item.name}</div>
                  <div className="font-mono mt-0.5" style={{color: sel ? '#F6DC4E' : '#64748b', fontSize:'10px'}}>ID: {sid}</div>
                </div>
              </label>
            );
          })}
          {items.length === 0 && search && (
            <p className="col-span-2 text-xs text-slate-500 px-2 py-3">No results for &quot;{search}&quot;</p>
          )}
        </div>
      ) : (
        <div className="text-xs py-2">
          {loading
            ? <span className="flex items-center gap-2 text-slate-500"><RefreshCw className="w-3 h-3 animate-spin" style={{color:'#F6DC4E'}} />Loading...</span>
            : <span className="text-slate-500">{emptyMsg}</span>
          }
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TLM REPORT GENERATOR — full branded report matching template
// ─────────────────────────────────────────────────────────────
function TLMReportGenerator({ session, currentRange: parentRange }) {

  // ─── Level state: which level the user is reporting on ───
  const [reportLevel, setReportLevel] = useState('campaigns'); // 'groups' | 'campaigns' | 'ads'

  // ─── Own data — fetched independently from LinkedIn ───
  const [ownAccounts,      setOwnAccounts]      = useState([]);
  const [ownGroups,        setOwnGroups]        = useState([]);
  const [ownCampaigns,     setOwnCampaigns]     = useState([]);
  const [ownAds,           setOwnAds]           = useState([]);
  const [ownLiveData,      setOwnLiveData]      = useState(null);

  // ─── Loading flags ───
  const [loadingAccounts,  setLoadingAccounts]  = useState(false);
  const [loadingGroups,    setLoadingGroups]    = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAds,       setLoadingAds]       = useState(false);
  const [loadingData,      setLoadingData]      = useState(false);
  const [fetchError,       setFetchError]       = useState(null);

  // ─── Selection state (IDs as strings) ───
  const [selectedAcctId,   setSelectedAcctId]   = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [selectedCampIds,  setSelectedCampIds]  = useState([]);
  const [selectedAdIds,    setSelectedAdIds]    = useState([]);

  // ─── Config ───
  const [region,         setRegion]         = useState('ZA');
  const [benchmarkTable, setBenchmarkTable] = useState('ZA');
  const [dateStart, setDateStart] = useState(parentRange?.start || '');
  const [dateEnd,   setDateEnd]   = useState(parentRange?.end   || '');
  const [fxRate,     setFxRate]     = useState('18.50');
  const [fxCurrency, setFxCurrency] = useState('ZAR'); // 'ZAR' or 'KES'

  // ─── Previous period (auto-calculated, user can override) ───
  const [useCompare, setUseCompare] = useState(false);
  const [prevStart, setPrevStart] = useState('');
  const [prevEnd,   setPrevEnd]   = useState('');

  // Auto-calculate previous period when current dates change
  useEffect(() => {
    if (!dateStart || !dateEnd) return;
    const s    = new Date(dateStart + 'T00:00:00').getTime();
    const e    = new Date(dateEnd   + 'T00:00:00').getTime();
    const span = Math.max(e - s, 86400000);
    setPrevEnd(  new Date(s - 86400000).toISOString().split('T')[0]);
    setPrevStart(new Date(s - span - 86400000).toISOString().split('T')[0]);
  }, [dateStart, dateEnd]);

  // ─── Report + AI ───
  const [report,    setReport]    = useState(null);
  const [aiText,    setAiText]    = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(null);

  // ─── AI Report Modal (same as LinkedIn dashboard app) ───
  const [showAIReport,      setShowAIReport]      = useState(false);
  const [aiReportResult,    setAiReportResult]    = useState(null);
  const [generatingAIReport, setGeneratingAIReport] = useState(false);

  // ─── Search + import ───
  const [acctSearch,   setAcctSearch]   = useState('');
  const [groupSearch,  setGroupSearch]  = useState('');
  const [campSearch,   setCampSearch]   = useState('');
  const [adSearch,     setAdSearch]     = useState('');
  const [idImport,     setIdImport]     = useState('');
  const [idImportErr,  setIdImportErr]  = useState('');
  const [showIdImport, setShowIdImport] = useState(false);
  const [idImportLevel,setIdImportLevel]= useState('campaigns'); // which level the import targets

  const printRef = useRef(null);

  // ─── Sync dates from parent ───
  useEffect(() => {
    setDateStart(parentRange?.start || '');
    setDateEnd(parentRange?.end   || '');
  }, [parentRange]);

  // ─── 1. Load accounts on mount ───
  useEffect(() => {
    async function go() {
      setLoadingAccounts(true); setFetchError(null);
      try {
        const res = await fetch('/api/accounts');
        if (res.ok) {
          const data = await res.json();
          setOwnAccounts(data || []);
          if (data?.length > 0) setSelectedAcctId(String(data[0].id));
        } else setFetchError('Failed to load accounts from LinkedIn.');
      } catch { setFetchError('Could not connect to LinkedIn API.'); }
      setLoadingAccounts(false);
    }
    go();
  }, []);

  // ─── 2. Load campaign groups when account changes ───
  useEffect(() => {
    if (!selectedAcctId) return;
    setSelectedGroupIds([]); setSelectedCampIds([]); setSelectedAdIds([]);
    setOwnGroups([]); setOwnCampaigns([]); setOwnAds([]); setOwnLiveData(null);
    async function go() {
      setLoadingGroups(true);
      try {
        const res = await fetch('/api/campaigngroups', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountIds: [selectedAcctId] })
        });
        if (res.ok) setOwnGroups(await res.json());
      } catch { console.error('groups fetch failed'); }
      setLoadingGroups(false);
    }
    go();
  }, [selectedAcctId]);

  // ─── 3. Load campaigns (ad sets) when account changes ───
  useEffect(() => {
    if (!selectedAcctId) return;
    setSelectedCampIds([]); setSelectedAdIds([]);
    setOwnCampaigns([]); setOwnAds([]); setOwnLiveData(null);
    async function go() {
      setLoadingCampaigns(true);
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountIds: [selectedAcctId] })
        });
        if (res.ok) setOwnCampaigns(await res.json());
      } catch { console.error('campaigns fetch failed'); }
      setLoadingCampaigns(false);
    }
    go();
  }, [selectedAcctId]);

  // ─── 3b. Re-fetch ad sets if user switches to Ad Sets level and list is empty ───
  useEffect(() => {
    if (reportLevel !== 'campaigns' || !selectedAcctId || ownCampaigns.length > 0 || loadingCampaigns) return;
    async function go() {
      setLoadingCampaigns(true);
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountIds: [selectedAcctId] })
        });
        if (res.ok) setOwnCampaigns(await res.json());
      } catch { console.error('campaigns refetch failed'); }
      setLoadingCampaigns(false);
    }
    go();
  }, [reportLevel]);

  // ─── 4. Load ads when campaigns are selected ───
  useEffect(() => {
    if (selectedCampIds.length === 0) { setOwnAds([]); setSelectedAdIds([]); return; }
    async function go() {
      setLoadingAds(true);
      try {
        const res = await fetch('/api/ads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignIds: selectedCampIds })
        });
        if (res.ok) setOwnAds(await res.json());
      } catch { console.error('ads fetch failed'); }
      setLoadingAds(false);
    }
    go();
  }, [selectedCampIds.join(',')]);

  // ─── Compute which IDs to send to analytics based on level ───
  function getAnalyticsPayload() {
    const base = {
      accountIds:  [selectedAcctId],
      currentRange: { start: dateStart, end: dateEnd },
      previousRange: (() => {
        if (prevStart && prevEnd && useCompare) return { start: prevStart, end: prevEnd };
        const s    = new Date(dateStart + 'T00:00:00').getTime();
        const e    = new Date(dateEnd   + 'T00:00:00').getTime();
        const span = Math.max(e - s, 86400000);
        return {
          start: new Date(s - span - 86400000).toISOString().split('T')[0],
          end:   new Date(s - 86400000).toISOString().split('T')[0],
        };
      })(),
      exchangeRate: parseFloat(fxRate) || 18.5,
    };
    if (reportLevel === 'groups')    return { ...base, campaignGroupIds: selectedGroupIds.length > 0 ? selectedGroupIds : null };
    if (reportLevel === 'campaigns') return { ...base, campaignIds: selectedCampIds.length > 0 ? selectedCampIds : null };
    if (reportLevel === 'ads')       return { ...base, campaignIds: selectedCampIds.length > 0 ? selectedCampIds : null, adIds: selectedAdIds.length > 0 ? selectedAdIds : null };
    return base;
  }

  // ─── 5. Fetch analytics ───
  async function fetchAnalytics() {
    if (!selectedAcctId || !dateStart || !dateEnd) return;
    setLoadingData(true); setFetchError(null);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAnalyticsPayload())
      });
      if (res.ok) setOwnLiveData(await res.json());
      else setFetchError('Failed to fetch analytics from LinkedIn.');
    } catch { setFetchError('Could not fetch analytics. Check your API connection.'); }
    setLoadingData(false);
  }

  // ─── Derived ───
  const liveData        = ownLiveData;
  const selectedAccount = ownAccounts.find(a => String(a.id) === String(selectedAcctId));
  const accountName     = selectedAccount?.name || session?.user?.name || 'Client';
  const campaignNameMap = Object.fromEntries([
    ...ownGroups.map(g    => [String(g.id), g.name]),
    ...ownCampaigns.map(c => [String(c.id), c.name]),
    ...ownAds.map(a       => [String(a.id), a.name]),
  ]);

  // ─── Filtered lists ───
  const filteredAccounts  = ownAccounts.filter(a  => !acctSearch  || a.name?.toLowerCase().includes(acctSearch.toLowerCase())  || String(a.id).includes(acctSearch));
  const filteredGroups    = ownGroups.filter(g    => !groupSearch || g.name?.toLowerCase().includes(groupSearch.toLowerCase()) || String(g.id).includes(groupSearch));
  const filteredCampaigns = ownCampaigns.filter(c => !campSearch  || c.name?.toLowerCase().includes(campSearch.toLowerCase())  || String(c.id).includes(campSearch));
  const filteredAds       = ownAds.filter(a       => !adSearch    || a.name?.toLowerCase().includes(adSearch.toLowerCase())    || String(a.id).includes(adSearch));

  // ─── Toggle helpers ───
  function toggleId(setFn, id) { setFn(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }

  // ─── ID import ───
  function handleIdImport() {
    setIdImportErr('');
    const raw = idImport.trim();
    if (!raw) return;
    const parsed = raw.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
    const invalid = parsed.filter(s => !/^\d+$/.test(s));
    if (invalid.length > 0) { setIdImportErr('Invalid IDs (numbers only): ' + invalid.join(', ')); return; }
    if (idImportLevel === 'groups')    setSelectedGroupIds(prev => [...new Set([...prev, ...parsed])]);
    if (idImportLevel === 'campaigns') setSelectedCampIds(prev  => [...new Set([...prev, ...parsed])]);
    if (idImportLevel === 'ads')       setSelectedAdIds(prev    => [...new Set([...prev, ...parsed])]);
    setIdImport(''); setShowIdImport(false);
  }

  // ─── Selected names for report header ───
  const selectedNames = (() => {
    if (reportLevel === 'groups'    && selectedGroupIds.length > 0) return selectedGroupIds.map(id => campaignNameMap[id] || 'Group '+id);
    if (reportLevel === 'campaigns' && selectedCampIds.length  > 0) return selectedCampIds.map(id  => campaignNameMap[id] || 'Campaign '+id);
    if (reportLevel === 'ads'       && selectedAdIds.length    > 0) return selectedAdIds.map(id    => campaignNameMap[id] || 'Ad '+id);
    return ['All ' + (reportLevel === 'groups' ? 'Campaign Groups' : reportLevel === 'ads' ? 'Ads' : 'Campaigns')];
  })();

  // campIds alias used throughout report building (send the right IDs for the level)
  const campIds = reportLevel === 'campaigns' ? selectedCampIds : reportLevel === 'ads' ? selectedCampIds : [];

  // Website Visits should only show when LinkedIn API returns real reach data
  // The API only returns non-zero reach for campaigns with Website Visits objective
  // We check this after data loads using liveData.current.reach
  const hasWebsiteObjective = (() => {
    if (!liveData?.current) return false;
    const apiReach = liveData.current.reach || liveData.current.totalReach || 0;
    return apiReach > 0;
  })();

    // ── Build aggregated metrics from live LinkedIn data ──
  function buildAgg() {
    if (!liveData) return null;
    const { current, topCampaigns } = liveData;

    // Previous period base — API gives ctr/engagementRate as % numbers (8.27), store as ratio
    const prevRaw  = liveData?.previous || {};
    const prevImp  = prevRaw.impressions || 0;
    const prevClk  = prevRaw.clicks      || 0;
    const prevSpd  = prevRaw.spent       || 0;
    const prevLds  = prevRaw.leads       || 0;
    const prevCtr  = prevRaw.ctr != null ? prevRaw.ctr / 100 : (prevImp > 0 ? prevClk / prevImp : 0);
    const prevEngR = prevRaw.engagementRate != null ? prevRaw.engagementRate / 100 : (prevImp > 0 ? (prevRaw.engagements || 0) / prevImp : 0);
    const prevObj  = {
      impressions: prevImp, clicks: prevClk, spend: prevSpd, leads: prevLds,
      ctr: prevCtr, engRate: prevEngR,
      cpl: prevLds > 0 ? prevSpd / prevLds : 0,
      reach: prevRaw.reach || Math.round(prevImp * 0.82),
    };

    // Filtered path: specific campaigns selected — compute from topCampaigns
    if (campIds.length > 0 && topCampaigns?.length) {
      const filtered = topCampaigns.filter(c => campIds.includes(String(c.id)));
      if (filtered.length > 0) {
        const imp = filtered.reduce((s,c) => s + (c.impressions||0), 0);
        const clk = filtered.reduce((s,c) => s + (c.clicks||0), 0);
        const spd = filtered.reduce((s,c) => s + (c.spent||0), 0);
        const lds = filtered.reduce((s,c) => s + (c.leads||0), 0);
        const eng = filtered.reduce((s,c) => s + ((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0)), 0);
        const lc  = filtered.reduce((s,c) => s + (c.webClicks||c.landingPageClicks||0), 0);
        return {
          impressions: imp, clicks: clk, spend: spd, leads: lds,
          ctr:          imp > 0 ? clk / imp : 0,
          landingCtr:   imp > 0 ? (lc > 0 ? lc / imp : clk / imp) : 0,
          landingClicks: lc,
          cpl:          lds > 0 ? spd / lds : 0,
          ffr:          clk > 0 ? lds / clk : 0,
          engRate:      imp > 0 ? eng / imp : 0,
          engagements:  eng,
          reach:        Math.round(imp * 0.82),
          cpm:          imp > 0 ? (spd / imp) * 1000 : 0,
          cpc:          clk > 0 ? spd / clk : 0,
          prev:         prevObj,
        };
      }
    }

    // All campaigns: use aggregated API totals
    const imp = current.impressions || 0;
    const clk = current.clicks      || 0;
    const spd = current.spent       || 0;
    const lds = current.leads       || 0;

    // Engagements: use pre-summed field if available, otherwise sum components
    const eng = (current.engagements && current.engagements > 0)
      ? current.engagements
      : (clk + (current.likes||0) + (current.comments||0) + (current.shares||0) + (current.follows||0) + (current.otherEngagements||0));

    // Landing page clicks — LinkedIn API field
    const landingClicks = current.landingPageClicks || current.clicksToLandingPage || current.webClicks || 0;

    const ctr     = current.ctr != null            ? current.ctr / 100            : (imp > 0 ? clk / imp : 0);
    const engRate = current.engagementRate != null  ? current.engagementRate / 100  : (imp > 0 ? eng / imp : 0);
    const landingCtr = imp > 0 ? landingClicks / imp : ctr; // fallback to ctr if no landing data

    return {
      impressions: imp, clicks: clk, spend: spd, leads: lds,
      ctr,
      landingCtr,
      landingClicks,
      cpl:         lds > 0 ? spd / lds : (current.cpl || 0),
      ffr:         clk > 0 ? lds / clk : 0,
      engRate,
      engagements: eng,
      reach:       current.reach || current.totalReach || 0,
      cpm:         current.cpm   || (imp > 0 ? (spd / imp) * 1000 : 0),
      cpc:         current.cpc   || (clk > 0 ? spd / clk : 0),
      prev:        prevObj,
    };
  }

  // ── Audience breakdown from top campaigns ──
  function buildAudience(agg) {
    const tc = liveData?.topCampaigns || [];
    const filtered = campIds.length > 0 ? tc.filter(c => campIds.includes(String(c.id))) : tc;
    // Use campaign names as proxy audience items
    const totalLeads = agg.leads || 1;
    const functions = filtered.slice(0,10).map((c,i) => ({
      rank: i+1, name: campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`,
      leads: c.leads || 0, pct: ((c.leads||0)/totalLeads*100).toFixed(1)+'%'
    }));
    return { functions, industries: [], countries: [] };
  }

  function generateReport() {
    const agg = buildAgg();
    if (!agg) return;
    setAiText(null); setAiError(null);
    setReport({ agg, region, bench: getBenchmarks(benchmarkTable), benchmarkTable, benchmarkLabel: BENCHMARK_TABLES[benchmarkTable]?.label || benchmarkTable, dateStart, dateEnd, selectedNames, accountName });
  }

  // ─── AI Report via /api/report ───
  async function generateAIReport() {
    if (!liveData) return;
    setGeneratingAIReport(true);
    setShowAIReport(true);
    setAiReportResult(null);

    try {
      const payload = getAnalyticsPayload();

      // liveData.current is already scoped to the exact selection —
      // use it directly for the summary metrics.

      // Step 1: Get topCampaigns — filtered to selection if applicable
      let topCampaigns = liveData.topCampaigns || [];
      if (selectedCampIds.length > 0 && (reportLevel === 'campaigns' || reportLevel === 'ads')) {
        const f = topCampaigns.filter(c => selectedCampIds.includes(String(c.id)));
        if (f.length > 0) topCampaigns = f;
      }

      // Step 2: If topCampaigns still empty, fetch each ad set individually.
      // We determine which ad sets to fetch based on what's selected:
      //   - Ad Sets level + selection → use selectedCampIds directly
      //   - Campaigns level + selection → use selectedGroupIds to scope ownCampaigns
      //   - No specific selection → fetch all ownCampaigns (already loaded for this account)
      if (topCampaigns.length === 0 && ownCampaigns.length > 0) {
        const adSetsToFetch = (() => {
          if ((reportLevel === 'campaigns' || reportLevel === 'ads') && selectedCampIds.length > 0)
            return ownCampaigns.filter(c => selectedCampIds.includes(String(c.id)));
          // For groups level, all ownCampaigns belong to this account —
          // fetch them all and filter to those with actual activity
          return ownCampaigns.slice(0, 30);
        })();

        const results = await Promise.all(
          adSetsToFetch.map(async (camp) => {
            try {
              const r = await fetch('/api/analytics', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountIds:   [selectedAcctId],
                  campaignIds:  [String(camp.id)],
                  currentRange: { start: dateStart, end: dateEnd },
                  previousRange: payload.previousRange,
                  exchangeRate: parseFloat(fxRate) || 18.5,
                })
              });
              if (!r.ok) return null;
              const d = await r.json();
              const cur = d.current || {};
              // Only skip if the API returned truly empty data
              if (!cur.impressions && !cur.clicks && !cur.spent && !cur.leads) return null;
              return {
                id:          camp.id,
                name:        camp.name,
                impressions: cur.impressions || 0,
                clicks:      cur.clicks      || 0,
                ctr:         cur.ctr         || (cur.impressions > 0 ? (cur.clicks / cur.impressions * 100) : 0),
                spent:       cur.spent       || 0,
                leads:       cur.leads       || 0,
                engagements: cur.engagements || 0,
                likes:       cur.likes       || 0,
                comments:    cur.comments    || 0,
                shares:      cur.shares      || 0,
                objectiveType: camp.objectiveType || camp.type || '',
                status:      camp.status || 'ACTIVE',
              };
            } catch { return null; }
          })
        );

        // Only keep ad sets that had activity in this period
        topCampaigns = results.filter(Boolean);

        // If selectedGroupIds are set on groups level, verify the totals match
        if (selectedGroupIds.length > 0 && topCampaigns.length > 0) {
          const fetchedSpend = topCampaigns.reduce((s, c) => s + (c.spent || 0), 0);
          const liveSpend = liveData.current?.spent || 0;
          // Only trim if fetched spend is more than 200% of live spend (very conservative)
          if (fetchedSpend > liveSpend * 2 && liveSpend > 0) {
            topCampaigns.sort((a, b) => (b.spent || 0) - (a.spent || 0));
            let runningTotal = 0;
            topCampaigns = topCampaigns.filter(c => {
              runningTotal += (c.spent || 0);
              return runningTotal <= liveSpend * 1.1;
            });
          }
        }
      }

      // Step 3: Generate the AI report using liveData.current (already scoped correctly)
      const res = await fetch('/api/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current:           liveData.current,
          previous:          liveData.previous,
          topCampaigns,
          topAds:            liveData.topAds,
          budgetPacing:      liveData.budgetPacing,
          currentRange:      { start: dateStart, end: dateEnd },
          previousRange:     payload.previousRange,
          selectedCampaigns: selectedCampIds.length > 0 ? selectedCampIds : selectedGroupIds,
          exchangeRate:      parseFloat(fxRate) || 0,
          currency:          fxCurrency !== 'NONE' ? fxCurrency : 'USD',
          currencySymbol:    fxCurrency === 'ZAR' ? 'R' : fxCurrency === 'KES' ? 'KSh' : '$',
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.metrics) result.metrics = {};
        result.metrics.topCampaigns = topCampaigns;
        setAiReportResult(result);
      } else {
        setAiReportResult({ error: 'Failed to generate AI report.' });
      }

    } catch (err) {
      console.error('[generateAIReport]', err);
      setAiReportResult({ error: 'Failed to generate AI report.' });
    }

    setGeneratingAIReport(false);
  }

  async function getAIInsights() {
    if (!report) return;
    setAiLoading(true); setAiError(null); setAiText(null);
    const { agg, region, bench, benchmarkTable: bTable, benchmarkLabel: bLabel } = report;
    const b = bench || {};
    const benchDisplayName = bLabel || BENCHMARK_TABLES[bTable]?.label || bTable || region;

    // Build per-campaign breakdown for the prompt
    const campaignBreakdown = (() => {
      const tc = liveData?.topCampaigns || [];
      const display = campIds.length > 0 ? tc.filter(c => campIds.includes(String(c.id))) : tc;
      if (!display.length) return '';
      return display.map((c, i) => {
        const name   = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
        const ctr    = c.impressions > 0 ? (c.clicks / c.impressions * 100).toFixed(2) : '0';
        const engR   = c.impressions > 0 ? (((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0)) / c.impressions * 100).toFixed(2) : '0';
        const cpc    = c.clicks > 0 ? (c.spent / c.clicks).toFixed(2) : '0';
        const cpl    = c.leads > 0 ? (c.spent / c.leads).toFixed(2) : 'N/A';
        const paused = !c.impressions || c.impressions === 0;
        return `Campaign ${i+1}: ${name} (ID: ${c.id})
  - Status: ${paused ? 'PAUSED' : 'Active'}
  - Impressions: ${fmtNum(c.impressions)} | Clicks: ${fmtNum(c.clicks)} | Leads: ${c.leads || 0}
  - CTR: ${ctr}% (benchmark median: ${b['Sponsored Content CTR'] ? fmtPct(b['Sponsored Content CTR'].median) : 'N/A'})
  - Engagement Rate: ${engR}% (benchmark median: ${b['Sponsored Engagement Rate'] ? fmtPct(b['Sponsored Engagement Rate'].median) : 'N/A'})
  - CPC: $${cpc} | CPL: ${cpl !== 'N/A' ? '$'+cpl : 'N/A'}
  - Spend: ${fmtCur(c.spent)}`;
      }).join('\n\n');
    })();

    const fx = parseFloat(fxRate) || 0;
    const fxSym = fxCurrency === 'KES' ? 'KSh' : fxCurrency === 'ZAR' ? 'R' : null;
    const hasFx = fxSym && fx > 0;
    const fmtLocal = (usd) => hasFx ? `${fxSym}${(usd * fx).toLocaleString('en-ZA', {minimumFractionDigits:2,maximumFractionDigits:2})} (${fmtCur(usd)})` : fmtCur(usd);
    const fmtLocalBench = (usd) => hasFx ? `${fxSym}${(usd * fx).toLocaleString('en-ZA', {minimumFractionDigits:2,maximumFractionDigits:2})}` : fmtCur(usd);

    const prompt = `You are a senior LinkedIn advertising strategist at Turn Left Media, a South African digital media agency. Analyse this LinkedIn campaign performance report and provide specific, data-driven, actionable recommendations.

CLIENT: ${accountName}
CAMPAIGNS: ${selectedNames.join(', ')}
PERIOD: ${fmtDate(dateStart)} – ${fmtDate(dateEnd)}
BENCHMARK REGION: ${benchDisplayName} (LinkedIn Q1 2026)
REPORT LEVEL: ${reportLevel.toUpperCase()}
${hasFx ? `CURRENCY: All costs shown in ${fxCurrency} (${fxSym}) at rate $1 = ${fxSym}${fx}. When discussing costs, use ${fxCurrency} values primarily.` : 'CURRENCY: USD'}

OVERALL PERFORMANCE:
- Impressions: ${fmtNum(agg.impressions)}
- Clicks: ${fmtNum(agg.clicks)}
- Leads: ${agg.leads}
- Total Spend: ${fmtLocal(agg.spend)}
- CTR: ${fmtPct(agg.ctr)} | Benchmark median: ${b['Sponsored Content CTR'] ? fmtPct(b['Sponsored Content CTR'].median) : 'N/A'}
- Engagement Rate: ${fmtPct(agg.engRate)} | Benchmark median: ${b['Sponsored Engagement Rate'] ? fmtPct(b['Sponsored Engagement Rate'].median) : 'N/A'}
- Form Fill Rate: ${fmtPct(agg.ffr)} | Benchmark median: ${b['Lead Gen Form Fill Rate'] ? fmtPct(b['Lead Gen Form Fill Rate'].median) : 'N/A'}
- Cost Per Lead: ${fmtLocal(agg.cpl)} | Benchmark median: ${b['Cost Per Lead ($)'] ? fmtLocalBench(b['Cost Per Lead ($)'].median) : 'N/A'}
- CPM: ${fmtLocal(agg.cpm)} | CPC: ${fmtLocal(agg.cpc)}

PER-CAMPAIGN BREAKDOWN:
${campaignBreakdown || 'No individual campaign data available.'}

BENCHMARKS (${benchDisplayName} Q1 2026):
- Sponsored CTR: Low ${b['Sponsored Content CTR'] ? fmtPct(b['Sponsored Content CTR'].low) : '—'} | Median ${b['Sponsored Content CTR'] ? fmtPct(b['Sponsored Content CTR'].median) : '—'} | High ${b['Sponsored Content CTR'] ? fmtPct(b['Sponsored Content CTR'].high) : '—'}
- Engagement Rate: Low ${b['Sponsored Engagement Rate'] ? fmtPct(b['Sponsored Engagement Rate'].low) : '—'} | Median ${b['Sponsored Engagement Rate'] ? fmtPct(b['Sponsored Engagement Rate'].median) : '—'} | High ${b['Sponsored Engagement Rate'] ? fmtPct(b['Sponsored Engagement Rate'].high) : '—'}
- Cost Per Lead: Low ${b['Cost Per Lead ($)'] ? fmtLocalBench(b['Cost Per Lead ($)'].low) : '—'} | Median ${b['Cost Per Lead ($)'] ? fmtLocalBench(b['Cost Per Lead ($)'].median) : '—'} | High ${b['Cost Per Lead ($)'] ? fmtLocalBench(b['Cost Per Lead ($)'].high) : '—'}
- CPC: ${b['CPC ($)'] ? fmtLocalBench(b['CPC ($)'].median) : '—'} | CPM: ${b['CPM ($)'] ? fmtLocalBench(b['CPM ($)'].median) : '—'}

Respond with EXACTLY these seven sections. Use "## " to start each header. Use "- " for bullet points. Be specific, reference the benchmark numbers, and name individual campaigns where relevant.${hasFx ? ` Always refer to costs in ${fxCurrency} (e.g. "${fxSym}9,983" not "$539").` : ''}

## Executive Summary
## What's Working
## Issues to Address
## Optimization Opportunities
## Audience & Targeting Strategy
## Budget Recommendations
## Next 30-Day Action Plan`;

    try {
      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        setAiError(`API error ${res.status}: ${err}`);
      } else {
        const data = await res.json();
        if (data.text) setAiText(data.text);
        else if (data.error) setAiError(`Claude error: ${data.error}`);
        else setAiError('No response from Claude. Check your API key.');
      }
    } catch (e) {
      setAiError(`Failed to connect: ${e.message}`);
    }
    setAiLoading(false);
  }

  // ── Build full branded HTML string (shared by Export HTML and Export PDF) ──
  function buildReportHTML(forPrint) {
    if (!report) return;
    const { agg, region, bench, benchmarkTable: bTable, benchmarkLabel: bLabel, dateStart, dateEnd, selectedNames, accountName } = report;
    const b = bench || {};
    const benchDisplayName = bLabel || BENCHMARK_TABLES[bTable]?.label || bTable || region;
    const now = new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
    const fx  = parseFloat(fxRate) || 0;
    const fxSym = fxCurrency === 'KES' ? 'KSh' : 'R';
    const fmtFx = (v) => fx > 0 && v > 0 ? `<div style="color:#059669;font-size:13px;font-weight:600;margin-top:2px">${fxSym} ${(v*fx).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>` : '';

    function ratingBadge(metric, val) {
      const r = calcRating(metric, val, bTable || region);
      const bv = b[metric];
      if (!r || !bv) return '';
      const isCost = metric.includes('Cost') || metric.includes('CPM') || metric.includes('CPC');
      const pct = isCost ? ((bv.median - val) / bv.median * 100) : ((val - bv.median) / bv.median * 100);
      const good = pct >= 0;
      const col = r==='exc'?'#059669':r==='above'?'#2563eb':r==='near'?'#ca8a04':'#dc2626';
      const bg  = r==='exc'?'rgba(5,150,105,0.1)':r==='above'?'rgba(37,99,235,0.1)':r==='near'?'rgba(202,138,4,0.1)':'rgba(220,38,38,0.1)';
      const label = r==='exc'?'Exceptional':r==='above'?'Above Benchmark':r==='near'?'Near Benchmark':'Below Benchmark';
      return `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${bg};color:${col};margin-top:6px;font-family:monospace">
        ${good?'↑':'↓'}${Math.abs(pct).toFixed(1)}% vs benchmark</div>`;
    }

    function ratingIndicator(metric, val) {
      const r = calcRating(metric, val, bTable || region);
      if (r === 'exc')   return '🟢';
      if (r === 'above') return '🔵';
      if (r === 'near')  return '🟡';
      if (r === 'below') return '🔴';
      return '';
    }

    // All 14 KPI cards matching the dashboard
    const kpiCards = [
      {
        label: 'Impressions',
        value: fmtNum(agg.impressions),
        sub: `${fmtNum(agg.clicks)} clicks`,
        extra: '',
        bench: '',
      },
      {
        label: 'Clicks',
        value: fmtNum(agg.clicks),
        sub: `CTR: ${fmtPct(agg.ctr)}`,
        extra: '',
        bench: '',
      },
      {
        label: 'CTR',
        value: fmtPct(agg.ctr),
        sub: '',
        extra: ratingBadge('Sponsored Content CTR', agg.ctr),
        bench: ratingIndicator('Sponsored Content CTR', agg.ctr),
      },
      {
        label: 'Spent (USD)',
        value: fmtCur(agg.spend || agg.spent || 0),
        sub: '',
        extra: fmtFx(agg.spend || agg.spent || 0),
        bench: '',
      },
      {
        label: 'CPM (USD)',
        value: fmtCur(agg.cpm),
        sub: '',
        extra: fmtFx(agg.cpm) + ratingBadge('CPM ($)', agg.cpm),
        bench: ratingIndicator('CPM ($)', agg.cpm),
      },
      {
        label: 'CPC (USD)',
        value: fmtCur(agg.cpc),
        sub: '',
        extra: fmtFx(agg.cpc) + ratingBadge('CPC ($)', agg.cpc),
        bench: ratingIndicator('CPC ($)', agg.cpc),
      },
      {
        label: 'Clicks to Landing Page CTR',
        value: agg.landingClicks > 0 ? fmtPct(agg.landingClicks / agg.impressions) : fmtPct(agg.ctr),
        sub: agg.landingClicks > 0 ? `${fmtNum(agg.landingClicks)} landing page clicks` : '',
        extra: '',
        bench: '',
      },
      {
        label: 'Website Visits',
        value: fmtNum(agg.reach),
        sub: 'Unique members reached',
        extra: '',
        bench: '',
      },
      {
        label: 'Leads',
        value: String(agg.leads),
        sub: `Form Fill Rate: ${fmtPct(agg.ffr)}`,
        extra: agg.leads > 0 ? ratingBadge('Lead Gen Form Fill Rate', agg.ffr) : '',
        bench: agg.leads > 0 ? ratingIndicator('Lead Gen Form Fill Rate', agg.ffr) : '',
      },
      {
        label: 'CPL (USD)',
        value: agg.leads > 0 ? fmtCur(agg.cpl) : '—',
        sub: `Total spend: ${fmtCur(agg.spend || agg.spent || 0)}`,
        extra: agg.leads > 0 ? fmtFx(agg.cpl) + ratingBadge('Cost Per Lead ($)', agg.cpl) : '',
        bench: agg.leads > 0 ? ratingIndicator('Cost Per Lead ($)', agg.cpl) : '',
      },
      {
        label: 'Engagement Rate',
        value: fmtPct(agg.engRate),
        sub: '',
        extra: ratingBadge('Sponsored Engagement Rate', agg.engRate),
        bench: ratingIndicator('Sponsored Engagement Rate', agg.engRate),
      },
      {
        label: 'Engagements',
        value: fmtNum(agg.engagements || 0),
        sub: `Eng Rate: ${fmtPct(agg.engRate)}`,
        extra: '',
        bench: '',
      },
      {
        label: 'Video View Rate',
        value: agg.videoViewRate > 0 ? fmtPct(agg.videoViewRate) : '0.00%',
        sub: '',
        extra: '',
        bench: '',
      },
      {
        label: 'CPV (USD)',
        value: fmtCur(agg.cpv || 0),
        sub: '',
        extra: fmtFx(agg.cpv || 0),
        bench: '',
      },
    ].map(({label, value, sub, extra, bench: bc}) => `
      <div style="background:white;padding:22px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;font-weight:600">${label}</div>
        <div style="font-size:1.9em;font-weight:700;color:#0a1628;margin-bottom:4px">${value}</div>
        ${sub ? `<div style="font-size:13px;color:#999">${sub}</div>` : ''}
        ${extra}
      </div>`).join('');

    const benchRows = [
      ['Sponsored Content CTR', fmtPct(agg.ctr), 'Sponsored Content CTR', agg.ctr],
      ['Engagement Rate', fmtPct(agg.engRate), 'Sponsored Engagement Rate', agg.engRate],
      ['Form Fill Rate', fmtPct(agg.ffr), 'Lead Gen Form Fill Rate', agg.ffr],
      ['Cost Per Lead', agg.leads > 0 ? fmtCur(agg.cpl) : '—', 'Cost Per Lead ($)', agg.cpl],
      ['CPM', fmtCur(agg.cpm), 'CPM ($)', agg.cpm],
      ['CPC', fmtCur(agg.cpc), 'CPC ($)', agg.cpc],
    ].map(([label, val, metric, rawVal]) => {
      const bv = b[metric];
      const ind = ratingIndicator(metric, rawVal);
      return `<tr>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;font-weight:600">${label}</td>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;font-size:1.1em;font-weight:700;color:#0a1628">${val}</td>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;color:#888">${bv ? fmtBenchV(metric, bv.low) : '—'}</td>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;color:#888">${bv ? fmtBenchV(metric, bv.median) : '—'}</td>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;color:#888">${bv ? fmtBenchV(metric, bv.high) : '—'}</td>
        <td style="padding:12px 15px;border-bottom:1px solid #e5e3de;font-size:1.2em">${ind}</td>
      </tr>`;
    }).join('');

    const aiFormatted = aiText
      ? aiText
          .split('\n')
          .map(line => {
            if (line.startsWith('## ')) return `<h4 style="color:#F6DC4E;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin:20px 0 8px">${line.slice(3)}</h4>`;
            if (line.startsWith('- ')) return `<li style="margin-bottom:6px;margin-left:20px">${line.slice(2)}</li>`;
            if (line === '') return '<br/>';
            return line;
          })
          .join('\n')
      : '';

    const aiSection = aiText ? `
      <div style="background:#0a1628;border-radius:10px;padding:30px;margin-bottom:30px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:36px;height:36px;background:#F6DC4E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#0a1628;flex-shrink:0">AI</div>
          <div>
            <div style="color:white;font-weight:700;font-size:15px">Claude AI Recommendations</div>
            <div style="color:#888;font-size:12px">Powered by Claude Sonnet · ${benchDisplayName} Q1 2026 Benchmarks</div>
          </div>
        </div>
        <div style="color:#d1cbc3;font-size:14px;line-height:1.8">${aiFormatted}</div>
      </div>` : '';

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${accountName} — LinkedIn Report ${fmtDate(dateStart)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F4F3F0;color:#272828;line-height:1.6;${forPrint ? '-webkit-print-color-adjust:exact;print-color-adjust:exact;' : ''}}.container{max-width:1200px;margin:0 auto;padding:24px}@media print{body{background:${forPrint ? '#F4F3F0' : 'white'}}.no-print{display:none!important}${forPrint ? '@page{margin:10mm;size:A4 landscape}' : ''}}</style>
</head><body><div class="container">

<div style="background:#0a1628;color:white;padding:40px;border-radius:12px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <svg width="36" height="36" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" fill="#0f1f3d"/><path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/><path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/><path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/></svg>
      <span style="color:#B1AAA4;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Turn Left Media</span>
    </div>
    <h1 style="font-size:2em;font-weight:700;margin-bottom:6px;letter-spacing:-0.5px">${accountName}</h1>
    <p style="color:#B1AAA4;font-size:13px">${selectedNames.join(' · ')}</p>
  </div>
  <div style="text-align:right">
    <div style="color:#F6DC4E;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">LinkedIn Performance Report</div>
    <div style="color:#B1AAA4;font-size:13px">Period: ${fmtDate(dateStart)} – ${fmtDate(dateEnd)}</div>
    <div style="color:#B1AAA4;font-size:13px">Benchmark: ${benchDisplayName}</div>
    <div style="color:#555;font-size:12px;margin-top:6px">Generated: ${now}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px">
${kpiCards}
</div>

<div style="background:white;padding:30px;border-radius:10px;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <h2 style="font-size:1.6em;font-weight:700;color:#0a1628;margin-bottom:6px;padding-bottom:12px;border-bottom:3px solid #F6DC4E">Performance vs ${benchDisplayName} Benchmarks</h2>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead><tr style="background:#0a1628;color:white"><th style="padding:12px 15px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase">Metric</th><th style="padding:12px 15px;text-align:left">Your Result</th><th style="padding:12px 15px;text-align:left">Low</th><th style="padding:12px 15px;text-align:left">Median</th><th style="padding:12px 15px;text-align:left">High</th><th style="padding:12px 15px;text-align:left">Rating</th></tr></thead>
    <tbody>${benchRows}</tbody>
  </table>
  <div style="margin-top:16px;padding:12px 16px;background:#F4F3F0;border-radius:8px;font-size:12px;color:#888">
    🟢 Exceptional (+50% vs benchmark) &nbsp;|&nbsp; 🔵 Above Benchmark &nbsp;|&nbsp; 🟡 Near Benchmark &nbsp;|&nbsp; 🔴 Below Benchmark
  </div>
</div>

${aiSection}

<div style="text-align:center;padding:20px;color:#888;font-size:12px;border-top:1px solid #e5e3de;margin-top:16px">
  <p>Report generated by Turn Left Media · ${now}</p>
  <p style="margin-top:4px">AI powered by Claude · LinkedIn Q1 2026 Benchmarks (${benchDisplayName})</p>
</div>
${forPrint ? '<scr'+'ipt>window.onload=function(){window.print();}<'+'/scr'+'ipt>' : ''}
</body></html>`;

    return html;
  }

  // ── Export full branded HTML (download) ──
  function exportHTML() {
    const html = buildReportHTML();
    if (!html || !report) return;
    const { accountName, dateStart } = report;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `TLM-Report-${accountName.replace(/\s+/g,'-')}-${dateStart}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helper: build chart script string without regex literals in template ──
  function buildChartScript(campaigns, nameMap) {
    const data = campaigns.map(c => ({
      id: c.id,
      name: (nameMap && nameMap[String(c.id)]) || ('Campaign ' + c.id),
      weeklyData: c.weeklyData || [],
    }));
    const dataJson = JSON.stringify(data);
    return [
      'var _campaigns = ' + dataJson + ';',
      '_campaigns.forEach(function(c) {',
      '  if (!c.weeklyData.length) return;',
      '  var weeks = c.weeklyData.map(function(w){ return w.label || "Wk"; });',
      '  var ctrs  = c.weeklyData.map(function(w){ return +(w.ctr*100).toFixed(2); });',
      '  var spends = c.weeklyData.map(function(w){ return +(w.spend||0).toFixed(2); });',
      '  var cId = String(c.id).slice(-6).split("").filter(function(ch){ return /[a-z0-9]/i.test(ch); }).join("");',
      '  var ctrEl = document.getElementById("wk-ctr-"+cId);',
      '  if (ctrEl) new Chart(ctrEl, { type:"line", data:{labels:weeks,datasets:[{label:"CTR %",data:ctrs,borderColor:"#2563eb",backgroundColor:"rgba(37,99,235,0.08)",tension:0.4,fill:true,pointRadius:3}]}, options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true},x:{grid:{display:false}}}} });',
      '  var spEl = document.getElementById("wk-sp-"+cId);',
      '  if (spEl) new Chart(spEl, { type:"bar", data:{labels:weeks,datasets:[{label:"Spend $",data:spends,backgroundColor:"#1d4ed8",borderRadius:3}]}, options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true},x:{grid:{display:false}}}} });',
      '});',
    ].join('\n');
  }

  // ── Export combined full AI report (TLM report + campaign breakdown + AI) ──
  function exportCombinedReport() {
    if (!report) return;
    const { agg, region, bench, benchmarkTable: bTable, benchmarkLabel: bLabel, dateStart, dateEnd, selectedNames, accountName } = report;
    const benchDisplayName = bLabel || BENCHMARK_TABLES[bTable]?.label || bTable || region;
    const b    = bench || {};
    const now  = new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
    const tc   = liveData?.topCampaigns || [];
    const display = campIds.length > 0 ? tc.filter(c => campIds.includes(String(c.id))) : tc;

    function ratingIndicator(metric, val) {
      const r = calcRating(metric, val, region);
      if (r === 'exc')   return '🟢';
      if (r === 'above') return '🔵';
      if (r === 'near')  return '🟡';
      if (r === 'below') return '🔴';
      return '';
    }

    const benchRows = [
      ['Impressions',       fmtNum(agg.impressions),  null],
      ['Clicks',            fmtNum(agg.clicks),        null],
      ['CTR',               fmtPct(agg.ctr),           'Sponsored Content CTR'],
      ['Spent',             fmtCur(agg.spend),         null],
      ['CPM',               fmtCur(agg.cpm),           'CPM ($)'],
      ['CPC',               fmtCur(agg.cpc),           'CPC ($)'],
      ['Landing Page CTR',  fmtPct(agg.ctr),           'Sponsored Content CTR'],
      ['Website Visits',    fmtNum(agg.reach),         null],
      ['Leads',             agg.leads,                 null],
      ['CPL',               fmtCur(agg.cpl),           'Cost Per Lead ($)'],
      ['Engagement Rate',   fmtPct(agg.engRate),       'Sponsored Engagement Rate'],
      ['Engagements',       fmtNum(agg.engagements||0), null],
      ['Video View Rate',   agg.videoViewRate > 0 ? fmtPct(agg.videoViewRate) : '0.00%', null],
      ['CPV',               agg.cpv > 0 ? fmtCur(agg.cpv) : '$0.00', null],
    ].map(([label, val, metric]) => {
      const bv  = metric ? b[metric] : null;
      const ind = metric ? ratingIndicator(metric, metric.includes('Cost')||metric.includes('CPM')||metric.includes('CPC') ? parseFloat((val||'').replace('$','')) : parseFloat((val||''))/100) : '';
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;font-weight:600;font-size:13px">${label}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;font-size:14px;font-weight:700;color:#272828">${val}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;color:#888;font-size:12px">${bv ? fmtBenchV(metric, bv.low) : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;color:#888;font-size:12px">${bv ? fmtBenchV(metric, bv.median) : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;color:#888;font-size:12px">${bv ? fmtBenchV(metric, bv.high) : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e3de;font-size:1.1em">${ind}</td>
      </tr>`;
    }).join('');

    // Per-campaign rows
    const campaignRows = display.map((c, i) => {
      const name  = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
      const ctr   = c.impressions > 0 ? (c.clicks / c.impressions * 100).toFixed(2) : '0.00';
      const engR  = c.impressions > 0 ? (((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0)) / c.impressions * 100).toFixed(2) : '0.00';
      const cpc   = c.clicks > 0 ? (c.spent / c.clicks).toFixed(2) : '0.00';
      const cpl   = c.leads > 0 ? (c.spent / c.leads).toFixed(2) : '—';
      const paused = !c.impressions || c.impressions === 0;
      const ctrRating = calcRating('Sponsored Content CTR', c.impressions > 0 ? c.clicks/c.impressions : 0, region);
      const engRating = calcRating('Sponsored Engagement Rate', c.impressions > 0 ? ((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions : 0, region);
      const ratingCol = (r) => r==='exc'||r==='above' ? '#059669' : r==='near' ? '#d97706' : '#dc2626';
      const ratingLbl = (r) => r==='exc'?'✓ Exceptional':r==='above'?'✓ Above':r==='near'?'~ Near':'✗ Below';

      // Weekly rows if available
      const weekRows = (c.weeklyData||[]).map((w,wi) => {
        const wCtr = w.impressions > 0 ? (w.clicks/w.impressions*100).toFixed(2) : '0.00';
        const wEng = w.impressions > 0 ? (w.eng*100).toFixed(2) : '0.00';
        const wCpc = w.clicks > 0 ? (w.spend/w.clicks).toFixed(2) : '0.00';
        return `<tr style="background:${wi%2===0?'#fafaf9':'white'};font-size:12px">
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb;color:#888;padding-left:28px">${w.label||'Week '+(wi+1)}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">${(w.impressions||0).toLocaleString()}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">${(w.clicks||0).toLocaleString()}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">${wCtr}%</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">$${wCpc}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">${wEng}%</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">${w.leads||0}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb">$${w.spend?.toFixed(2)||'0.00'}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb"></td>
          <td style="padding:7px 14px;border-bottom:1px solid #f0eeeb"></td>
        </tr>`;
      }).join('');

      return `<tr style="background:${i%2===0?'white':'#fafaf9'}">
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-weight:600;font-size:13px">
          ${name}<br/><span style="font-family:monospace;font-size:10px;color:#B1AAA4">ID: ${c.id}</span>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">${(c.impressions||0).toLocaleString()}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">${(c.clicks||0).toLocaleString()}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px;font-weight:600;color:${ratingCol(ctrRating)}">${ctr}%</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">$${cpc}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px;font-weight:600;color:${ratingCol(engRating)}">${engR}%</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">${c.leads||0}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">${cpl !== '—' ? '$'+cpl : '—'}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:12px;color:${ratingCol(ctrRating)}">${paused ? '⏸ Paused' : ratingLbl(ctrRating)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e6df;font-size:13px">$${c.spent?.toFixed(2)||'0.00'}</td>
      </tr>${weekRows}`;
    }).join('');

    // AI section
    const aiFormattedCombined = aiText
      ? aiText
          .split('\n')
          .map(line => {
            if (line.startsWith('## ')) return `<h4 style="color:#F6DC4E;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin:24px 0 10px;font-family:monospace">${line.slice(3)}</h4>`;
            if (line.startsWith('- ')) return `<div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:#F6DC4E;flex-shrink:0">→</span><span>${line.slice(2)}</span></div>`;
            if (line === '') return '<br/>';
            return line;
          })
          .join('\n')
      : '';

    const aiSection = aiText ? `
    <div style="background:#0a1628;border-radius:10px;padding:32px;margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <div style="width:38px;height:38px;background:#F6DC4E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#272828;flex-shrink:0">AI</div>
        <div>
          <div style="color:white;font-weight:700;font-size:16px">Claude AI Recommendations</div>
          <div style="color:#888;font-size:12px">Powered by Claude Sonnet · ${benchDisplayName} Q1 2026 Benchmarks</div>
        </div>
      </div>
      <div style="color:#d1cbc3;font-size:14px;line-height:1.9">${aiFormattedCombined}</div>
    </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${accountName} — Full Campaign Report ${fmtDate(dateStart)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F4F3F0;color:#272828;line-height:1.6}
  .container{max-width:1280px;margin:0 auto;padding:28px}
  h2{font-size:1.5em;font-weight:700;color:#272828;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #F6DC4E}
  section{background:white;padding:28px 32px;border-radius:10px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:10px 14px;background:#0a1628;color:white;font-size:11px;letter-spacing:1px;text-transform:uppercase}
  [contenteditable]:focus{outline:2px solid #F6DC4E;border-radius:2px}
  @media print{body{background:white}.no-print{display:none!important}@page{margin:1.5cm}}
</style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div style="background:#0a1628;color:white;padding:40px;border-radius:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <svg width="38" height="38" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" fill="#0f1f3d"/><path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/><path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/><path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/></svg>
        <span style="color:#B1AAA4;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Turn Left Media</span>
      </div>
      <h1 style="font-size:2em;font-weight:700;margin-bottom:6px;letter-spacing:-0.5px" contenteditable>${accountName}</h1>
      <p style="color:#B1AAA4;font-size:13px" contenteditable>${selectedNames.join(' · ')}</p>
    </div>
    <div style="text-align:right">
      <div style="color:#F6DC4E;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">LinkedIn Performance Report</div>
      <div style="color:#B1AAA4;font-size:13px">Period: ${fmtDate(dateStart)} – ${fmtDate(dateEnd)}</div>
      <div style="color:#B1AAA4;font-size:12px">Benchmark: ${benchDisplayName}</div>
      <div style="color:#555;font-size:11px;margin-top:6px">Generated: ${now}</div>
    </div>
  </div>

  <!-- 14 KPI CARDS -->
  <section>
    <h2>Campaign Performance Summary</h2>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px;margin-bottom:8px">
      ${[
        ['Impressions',      fmtNum(agg.impressions),  ''],
        ['Clicks',           fmtNum(agg.clicks),        ''],
        ['CTR',              fmtPct(agg.ctr),           ''],
        ['Spent',            fmtCur(agg.spend),         ''],
        ['CPM',              fmtCur(agg.cpm),           ''],
        ['CPC',              fmtCur(agg.cpc),           ''],
        ['Landing Page CTR', fmtPct(agg.ctr),           ''],
        ['Website Visits',   fmtNum(agg.reach),         ''],
        ['Leads',            String(agg.leads),         ''],
        ['CPL',              fmtCur(agg.cpl),           ''],
        ['Eng Rate',         fmtPct(agg.engRate),       ''],
        ['Engagements',      fmtNum(agg.engagements||0),''],
        ['Video View Rate',  agg.videoViewRate>0?fmtPct(agg.videoViewRate):'0.00%', ''],
        ['CPV',              agg.cpv>0?fmtCur(agg.cpv):'$0.00', ''],
      ].map(([t,v]) => `<div style="background:#f7f6f2;border-radius:8px;padding:16px 14px;border:1px solid #e8e6df">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#8a8880;font-family:monospace;margin-bottom:6px">${t}</div>
        <div style="font-size:1.4em;font-weight:700;color:#272828" contenteditable>${v}</div>
      </div>`).join('')}
    </div>
  </section>

  <!-- BENCHMARK TABLE -->
  <section>
    <h2>Performance vs ${benchDisplayName} Benchmarks</h2>
    <table>
      <thead><tr>
        <th>Metric</th><th>Your Result</th><th>Low</th><th>Median</th><th>High</th><th>Rating</th>
      </tr></thead>
      <tbody>${benchRows}</tbody>
    </table>
    <div style="margin-top:14px;padding:10px 14px;background:#f7f6f2;border-radius:6px;font-size:11px;color:#888">
      🟢 Exceptional &nbsp;|&nbsp; 🔵 Above Benchmark &nbsp;|&nbsp; 🟡 Near Benchmark &nbsp;|&nbsp; 🔴 Below Benchmark
    </div>
  </section>

  <!-- AI RECOMMENDATIONS -->
  ${aiSection || `<div style="background:#0a1628;border-radius:10px;padding:24px;margin-bottom:24px;color:#888;font-size:13px;text-align:center">
    No AI recommendations generated yet. Click "AI Recommendations" in the app first, then re-export.
  </div>`}

  <!-- PER-CAMPAIGN BREAKDOWN -->
  ${display.length > 0 ? `<section>
    <h2>Per-Campaign Week-by-Week Breakdown</h2>
    <div style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>Campaign</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>CPC</th>
          <th>Eng Rate</th><th>Leads</th><th>CPL</th><th>CTR Status</th><th>Spend</th>
        </tr></thead>
        <tbody>${campaignRows}</tbody>
      </table>
    </div>
    <p style="font-size:11px;color:#8a8880;margin-top:10px;font-family:monospace">
      ✓ Exceptional / ✓ Above = meeting or exceeding ${benchDisplayName} benchmark &nbsp;|&nbsp; ~ Near = within 20% &nbsp;|&nbsp; ✗ Below = below benchmark
    </p>
  </section>` : ''}

  <!-- FOOTER -->
  <div style="text-align:center;padding:20px;color:#888;font-size:12px;border-top:1px solid #e5e3de;margin-top:8px">
    <p>Report generated by Turn Left Media · ${now}</p>
    <p style="margin-top:4px">LinkedIn Campaign Manager · AI powered by Claude · LinkedIn Q1 2026 Benchmarks (${benchDisplayName})</p>
  </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
${buildChartScript(display, campaignNameMap)}
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `TLM-Full-Report-${accountName.replace(/\s+/g,'-')}-${dateStart}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderAIText(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## '))
        return <h4 key={i} className="text-xs font-bold uppercase tracking-widest mt-5 mb-2" style={{color:'#F6DC4E'}}>{line.replace('## ','')}</h4>;
      if (line.startsWith('- '))
        return <li key={i} className="text-slate-300 text-sm mb-1.5 ml-4 list-disc">{line.replace('- ','')}</li>;
      if (line.trim())
        return <p key={i} className="text-slate-300 text-sm mb-1.5">{line}</p>;
      return null;
    });
  }

  const agg   = report?.agg;
  const bench = report?.bench || {};

  // ── Main render ──
  return (
    <div className="max-w-screen-2xl mx-auto p-6 space-y-5" ref={printRef}>

      {/* ── Config panel ── */}
      <div className="rounded-xl border border-[#1e3a5f] p-6" style={{background:'#0f1f3d'}}>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5"
          style={{fontFamily:'Helvetica Neue,Helvetica,Arial,sans-serif'}}>Report Configuration</h2>

        {/* Row 1: Account + Region + Current Dates + Previous Dates + FX */}
        <div className="grid grid-cols-4 gap-4 mb-4">

          {/* Account */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account</span>
              {loadingAccounts && <RefreshCw className="w-3 h-3 animate-spin" style={{color:'#F6DC4E'}} />}
              {!loadingAccounts && ownAccounts.length > 0 && <span className="text-slate-600 text-xs">{ownAccounts.length.toLocaleString()} loaded</span>}
            </div>
            <div className="relative mb-1.5">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input type="text" placeholder="Search accounts..." value={acctSearch}
                onChange={e => setAcctSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {loadingAccounts && <div className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500"><RefreshCw className="w-3 h-3 animate-spin" style={{color:'#F6DC4E'}} />Loading all accounts...</div>}
              {!loadingAccounts && ownAccounts.length === 0 && <p className="text-xs text-slate-500 px-2 py-2">No accounts. Sign in with LinkedIn.</p>}
              {(filteredAccounts.length > 0 ? filteredAccounts : ownAccounts).map(a => {
                const sid = String(a.id); const sel = sid === String(selectedAcctId);
                return (
                  <button key={sid} onClick={() => setSelectedAcctId(sid)} className="w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors"
                    style={sel ? {background:'rgba(246,220,78,0.12)',borderColor:'#F6DC4E',color:'white'} : {background:'transparent',borderColor:'#475569',color:'#94a3b8'}}>
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="font-mono mt-0.5" style={{color:sel?'#F6DC4E':'#64748b',fontSize:'10px'}}>ID: {sid}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Benchmark Table */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Benchmark Table</div>
            <select value={benchmarkTable} onChange={e => setBenchmarkTable(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500">
              <optgroup label="── Regions ──" style={{color:'#94a3b8'}}>
                {['Middle East','North America','South America','Europe','Africa','Eurasia','Asia'].map(k => (
                  <option key={k} value={k}>{BENCHMARK_TABLES[k]?.label || k}</option>
                ))}
              </optgroup>
              <optgroup label="── Countries ──" style={{color:'#94a3b8'}}>
                {['US','UK','KE','NG','ZA'].map(k => (
                  <option key={k} value={k}>{BENCHMARK_TABLES[k]?.label || k}</option>
                ))}
              </optgroup>
              <optgroup label="── Industries ──" style={{color:'#94a3b8'}}>
                {['Bank','TelC','FinS','Auto','HiEd','IT','Mark','Reta','AirT','Gov'].map(k => (
                  <option key={k} value={k}>{BENCHMARK_TABLES[k]?.label || k}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Current period */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Current Period</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-slate-600 mb-1">Start</div>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                  className="w-full px-2 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-600 mb-1">End</div>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                  className="w-full px-2 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
          </div>

          {/* Compare period — opt-in via checkbox */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setUseCompare(v => !v)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors"
                style={{color: useCompare ? '#F6DC4E' : '#475569', background:'none', border:'none', cursor:'pointer', padding:0}}>
                <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                  style={{
                    background: useCompare ? '#F6DC4E' : 'transparent',
                    borderColor: useCompare ? '#F6DC4E' : '#475569',
                  }}>
                  {useCompare && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                Compare Period
              </button>
            </div>
            {useCompare && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">Start</div>
                  <input type="date" value={prevStart} onChange={e => setPrevStart(e.target.value)}
                    className="w-full px-2 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">End</div>
                  <input type="date" value={prevEnd} onChange={e => setPrevEnd(e.target.value)}
                    className="w-full px-2 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: FX Rate */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[#1e3a5f]" style={{background:'#0f1f3d'}}>
            {/* Currency toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[#2a4a6e]">
              {[{val:'NONE',label:'USD only'},{val:'ZAR',label:'USD → ZAR'},{val:'KES',label:'USD → KES'}].map(opt => (
                <button key={opt.val} onClick={() => {
                  setFxCurrency(opt.val);
                  setFxRate(opt.val === 'ZAR' ? '18.50' : opt.val === 'KES' ? '130' : '0');
                }}
                  className="px-3 py-1.5 text-xs font-bold transition-all"
                  style={fxCurrency === opt.val
                    ? {background:'#F6DC4E', color:'#0a1628'}
                    : {background:'transparent', color:'#64748b'}}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Rate input — hidden when USD only */}
            {fxCurrency !== 'NONE' && (
              <>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">
                    {fxCurrency === 'ZAR' ? 'R' : 'KSh'}
                  </span>
                  <input type="number" min="1" step="0.01"
                    placeholder={fxCurrency === 'ZAR' ? '18.50' : '130'}
                    value={fxRate}
                    onChange={e => setFxRate(e.target.value)}
                    className="w-28 pl-7 pr-3 py-1.5 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <span className="text-xs text-slate-500">
                  $1 = {fxCurrency === 'ZAR' ? 'R' : 'KSh'}{parseFloat(fxRate)||0}
                </span>
              </>
            )}
          </div>
          {useCompare && prevStart && prevEnd && dateStart && dateEnd && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"></span>
              Comparing <span className="text-slate-300">{dateStart} – {dateEnd}</span> vs <span className="text-slate-300">{prevStart} – {prevEnd}</span>
            </div>
          )}
        </div>

        {/* ── Report Level Tabs ── */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Report Level</div>
          <div className="flex gap-2 mb-4">
            {[
              { id:'groups',    label:'Campaigns',  num: selectedGroupIds.length, loading: loadingGroups },
              { id:'campaigns', label:'Ad Sets',     num: selectedCampIds.length,  loading: loadingCampaigns },
              { id:'ads',       label:'Ads',          num: selectedAdIds.length,    loading: loadingAds },
            ].map(({ id, label, num, loading }) => {
              const active = reportLevel === id;
              return (
                <button key={id} onClick={() => setReportLevel(id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all"
                  style={active
                    ? {background:'#112240',borderColor:'#F6DC4E',color:'#F6DC4E'}
                    : {background:'transparent',borderColor:'#475569',color:'#64748b'}}>
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {label}
                  {num > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{background: active ? '#F6DC4E' : '#1e3a5f', color: active ? '#272828' : '#94a3b8'}}>
                      {num}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Level: Campaign Groups ── */}
          {reportLevel === 'groups' && (
            <LevelSelector
              label="Campaign Groups"
              items={filteredGroups}
              allItems={ownGroups}
              selectedIds={selectedGroupIds}
              onToggle={id => toggleId(setSelectedGroupIds, id)}
              onClear={() => setSelectedGroupIds([])}
              search={groupSearch}
              onSearch={setGroupSearch}
              loading={loadingGroups}
              placeholder="Search groups by name or ID..."
              emptyMsg={selectedAcctId ? 'No campaign groups found for this account.' : 'Select an account to load groups.'}
              onImport={() => { setIdImportLevel('groups'); setShowIdImport(v => !v); }}
              showImport={showIdImport && idImportLevel === 'groups'}
            />
          )}

          {/* ── Level: Ad Sets ── */}
          {reportLevel === 'campaigns' && (
            <LevelSelector
              label="Ad Sets"
              items={filteredCampaigns}
              allItems={ownCampaigns}
              selectedIds={selectedCampIds}
              onToggle={id => toggleId(setSelectedCampIds, id)}
              onClear={() => setSelectedCampIds([])}
              search={campSearch}
              onSearch={setCampSearch}
              loading={loadingCampaigns}
              placeholder="Search ad sets by name or ID..."
              emptyMsg={selectedAcctId ? 'No ad sets found for this account.' : 'Select an account to load ad sets.'}
              onImport={() => { setIdImportLevel('campaigns'); setShowIdImport(v => !v); }}
              showImport={showIdImport && idImportLevel === 'campaigns'}
            />
          )}

          {/* ── Level: Ads ── */}
          {reportLevel === 'ads' && (
            <div>
              {selectedCampIds.length === 0 && (
                <div className="mb-3 px-4 py-3 rounded-lg border text-xs" style={{background:'rgba(246,220,78,0.06)',borderColor:'rgba(246,220,78,0.2)',color:'#F6DC4E'}}>
                  ⓘ Switch to the Campaigns level first and select the campaigns whose ads you want to report on. Ads will load automatically.
                </div>
              )}
              <LevelSelector
                label="Ads"
                items={filteredAds}
                allItems={ownAds}
                selectedIds={selectedAdIds}
                onToggle={id => toggleId(setSelectedAdIds, id)}
                onClear={() => setSelectedAdIds([])}
                search={adSearch}
                onSearch={setAdSearch}
                loading={loadingAds}
                placeholder="Search ads by name or ID..."
                emptyMsg={selectedCampIds.length > 0 ? 'No ads found for selected campaigns.' : 'Select campaigns first to load ads.'}
                onImport={() => { setIdImportLevel('ads'); setShowIdImport(v => !v); }}
                showImport={showIdImport && idImportLevel === 'ads'}
              />
            </div>
          )}

          {/* ── ID Import panel (shared) ── */}
          {showIdImport && (
            <div className="mt-3 p-4 rounded-lg border border-[#2a4a6e]" style={{background:'#0f1f3d'}}>
              <p className="text-xs text-slate-400 mb-2">
                Paste {idImportLevel === 'groups' ? 'Campaign Group' : idImportLevel === 'ads' ? 'Ad' : 'Campaign'} IDs — comma, space, or newline separated.
              </p>
              <textarea value={idImport} onChange={e => { setIdImport(e.target.value); setIdImportErr(''); }}
                placeholder="e.g. 123456789, 987654321" rows={3}
                className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6e] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 font-mono resize-none mb-2" />
              {idImportErr && <p className="text-xs text-red-400 mb-2">{idImportErr}</p>}
              <div className="flex gap-2">
                <button onClick={handleIdImport} className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{background:'#F6DC4E',color:'#272828'}}>Import</button>
                <button onClick={() => { setShowIdImport(false); setIdImport(''); setIdImportErr(''); }}
                  className="px-4 py-1.5 rounded-lg text-xs border border-[#2a4a6e] text-slate-400 hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div className="mb-4 px-4 py-3 rounded-lg border text-xs" style={{background:'rgba(220,38,38,0.08)',borderColor:'rgba(220,38,38,0.4)',color:'#f87171'}}>
            ⚠ {fetchError}
          </div>
        )}

        {/* Live data status */}
        {liveData && !loadingData && (
          <div className="mb-4 px-4 py-3 rounded-lg border text-xs flex items-center gap-2" style={{background:'rgba(16,185,129,0.08)',borderColor:'rgba(16,185,129,0.3)',color:'#6ee7b7'}}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:'#10b981'}} />
            Live data loaded · {fmtNum(liveData.current?.impressions || 0)} impressions · {liveData.current?.leads || 0} leads · {fmtDate(dateStart)} – {fmtDate(dateEnd)}
            <button onClick={fetchAnalytics} className="ml-auto text-xs border border-emerald-700 rounded px-2 py-1 hover:bg-emerald-900/30 transition-colors">
              Refresh
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 flex-wrap items-center">
          {/* Primary: Load Data from LinkedIn */}
          <button onClick={fetchAnalytics} disabled={!selectedAcctId || !dateStart || !dateEnd || loadingData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{background:'#1d4ed8',color:'white',border:'1px solid #0000cc'}}>
            {loadingData
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            {loadingData ? 'Loading from LinkedIn...' : 'Load LinkedIn Data'}
          </button>

          {/* Generate report */}
          <button onClick={generateReport} disabled={!liveData || loadingData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{background:'#0d1b2e',color:'white',border:'1px solid #444'}}>
            <FileText className="w-4 h-4" /> Generate Report
          </button>

          {/* AI */}
          <button onClick={getAIInsights} disabled={!report || aiLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{background:'#F6DC4E',color:'#272828'}}>
            {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiLoading ? 'Analysing...' : 'AI Recommendations'}
          </button>

          {/* AI Report (same as LinkedIn dashboard) */}
          <button onClick={generateAIReport} disabled={!liveData || generatingAIReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{background:'#7c3aed',color:'white',border:'1px solid #6d28d9'}}>
            {generatingAIReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>✦</span>}
            {generatingAIReport
              ? 'Generating...'
              : (() => {
                  if (reportLevel === 'campaigns' && selectedCampIds.length > 0)
                    return `AI Report (${selectedCampIds.length} ad set${selectedCampIds.length !== 1 ? 's' : ''})`;
                  if (reportLevel === 'groups' && selectedGroupIds.length > 0)
                    return `AI Report (${selectedGroupIds.length} campaign${selectedGroupIds.length !== 1 ? 's' : ''})`;
                  if (reportLevel === 'ads' && selectedAdIds.length > 0)
                    return `AI Report (${selectedAdIds.length} ad${selectedAdIds.length !== 1 ? 's' : ''})`;
                  return 'AI Report (all)';
                })()
            }
          </button>

          {report && (
            <button onClick={exportHTML}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#2a4a6e] transition-colors border border-[#2a4a6e]">
              <ExternalLink className="w-4 h-4" /> Export HTML
            </button>
          )}
          {report && (
            <button onClick={() => {
              const html = buildReportHTML(true);
              if (!html) return;
              const w = window.open('', '_blank');
              if (w) { w.document.write(html); w.document.close(); }
            }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#2a4a6e] transition-colors border border-[#2a4a6e]">
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!report && (
        <div className="rounded-xl border border-[#1e3a5f] p-16 text-center" style={{background:'#0f1f3d'}}>
          <TLLogo size={48} className="mx-auto mb-5 opacity-30" />
          <h3 className="text-lg font-bold text-white mb-2">No Report Generated</h3>
          <p className="text-slate-500 text-sm">Configure above and click Generate Report. Make sure an account is loaded in Campaign Manager first.</p>
        </div>
      )}

      {report && agg && (
        <>
          {/* ── Report Header ── */}
          <div className="rounded-xl p-8 flex items-start justify-between" style={{background:'#0f1f3d'}}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <TLLogo size={36} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{color:'#B1AAA4'}}>Turn Left Media</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1" style={{fontFamily:'Helvetica Neue,Helvetica,Arial,sans-serif',letterSpacing:'-0.5px'}}>{accountName}</h1>
              <p className="text-sm" style={{color:'#B1AAA4'}}>{report.selectedNames.join(' · ')}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{color:'#F6DC4E'}}>LinkedIn Performance Report</div>
              <div className="text-sm" style={{color:'#B1AAA4'}}>Period: {fmtDate(report.dateStart)} – {fmtDate(report.dateEnd)}</div>
              <div className="text-sm" style={{color:'#B1AAA4'}}>Benchmark: {report.benchmarkLabel || BENCHMARK_TABLES[report.benchmarkTable]?.label || report.benchmarkTable || report.region}</div>
              <div className="text-xs mt-1" style={{color:'#555'}}>
                Generated: {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}
              </div>
            </div>
          </div>

          {/* ── Summary KPI Cards ── */}
          {(() => {
            const p    = agg.prev || {};
            const rgn  = report.region;
            const bm   = getBenchmarks(benchmarkTable) || {};

            // MoM % change — null if no previous data
            const mom = (cur, prv) => (!prv || prv === 0) ? null : ((cur - prv) / prv * 100);

            // vs-benchmark badge — compares agg value (ratio) against benchmark (ratio)
            const vsBench = (metricKey, val) => {
              const b = bm[metricKey];
              if (!b || val == null) return null;
              const isCost = metricKey.includes('Cost') || metricKey.includes('CPM') || metricKey.includes('CPC');
              const pct = isCost
                ? ((b.median - val) / b.median * 100)
                : ((val - b.median) / b.median * 100);
              const good = pct >= 0;
              const col  = good ? '#059669' : '#dc2626';
              const bg   = good ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)';
              return (
                <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'4px',
                  fontSize:'11px',fontWeight:700,background:bg,color:col,fontFamily:'monospace',gap:'2px'}}>
                  {pct >= 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(1)}% vs benchmark
                </span>
              );
            };

            // MoM badge
            const momBadge = (pct, invertGood) => {
              if (pct === null || pct === undefined) return null;
              const good = invertGood ? pct < 0 : pct > 0;
              const col  = good ? '#059669' : '#dc2626';
              const bg   = good ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)';
              return (
                <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'4px',
                  fontSize:'11px',fontWeight:700,background:bg,color:col,fontFamily:'monospace',gap:'2px'}}>
                  {pct > 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(1)}% MoM
                </span>
              );
            };

            const cards = [
              {
                label: 'Impressions',
                val:   fmtNum(agg.impressions),
                sub:   `${fmtNum(agg.clicks)} clicks`,
                bench: null,
                mom:   momBadge(mom(agg.impressions, p.impressions), false),
              },
              {
                label: 'Clicks',
                val:   fmtNum(agg.clicks),
                sub:   `CTR: ${fmtPct(agg.ctr)}`,
                bench: null,
                mom:   momBadge(mom(agg.clicks, p.clicks), false),
              },
              {
                label: 'CTR',
                val:   fmtPct(agg.ctr),
                sub:   null,
                bench: vsBench('Sponsored Content CTR', agg.ctr),
                rating: <RatingPill rating={calcRating('Sponsored Content CTR', agg.ctr, benchmarkTable)} />,
                mom:   momBadge(mom(agg.ctr, p.ctr), false),
              },
              {
                label: 'Spent (USD)',
                val:   fmtCur(agg.spend || agg.spent || 0),
                sub:   null,
                zar:   parseFloat(fxRate) > 0 ? `${(fxCurrency === 'ZAR' ? 'R' : 'KSh')} ${((agg.spend||agg.spent||0) * parseFloat(fxRate)).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}` : null,
                bench: null,
                mom:   momBadge(mom(agg.spend || agg.spent || 0, p.spend || p.spent || 0), true),
              },
              {
                label: 'CPM (USD)',
                val:   fmtCur(agg.cpm),
                sub:   null,
                zar:   parseFloat(fxRate) > 0 ? `${(fxCurrency === 'ZAR' ? 'R' : 'KSh')} ${(agg.cpm * parseFloat(fxRate)).toFixed(2)}` : null,
                bench: vsBench('CPM ($)', agg.cpm),
                mom:   momBadge(mom(agg.cpm, p.cpm), true),
              },
              {
                label: 'CPC (USD)',
                val:   fmtCur(agg.cpc),
                sub:   null,
                zar:   parseFloat(fxRate) > 0 ? `${(fxCurrency === 'ZAR' ? 'R' : 'KSh')} ${(agg.cpc * parseFloat(fxRate)).toFixed(2)}` : null,
                bench: vsBench('CPC ($)', agg.cpc),
                mom:   momBadge(mom(agg.cpc, p.cpc), true),
              },
              {
                label: 'Clicks to Landing Page CTR',
                val:   agg.landingClicks > 0
                  ? fmtPct(agg.landingClicks / agg.impressions)
                  : fmtPct(agg.ctr),
                sub:   agg.landingClicks > 0 ? `${fmtNum(agg.landingClicks)} landing page clicks` : null,
                zar:   null,
                bench: null,
                mom:   momBadge(mom(agg.landingCtr || agg.ctr, p.landingCtr || p.ctr), false),
              },
              {
                label: 'Website Visits',
                val:   hasWebsiteObjective ? fmtNum(agg.reach) : '—',
                sub:   hasWebsiteObjective ? `Unique members reached` : 'No website visits objective',
                zar:   null,
                bench: null,
                mom:   hasWebsiteObjective ? momBadge(mom(agg.reach, p.reach), false) : null,
              },
              {
                label: 'Leads',
                val:   String(agg.leads),
                sub:   `Form Fill Rate: ${fmtPct(agg.ffr)}`,
                zar:   null,
                bench: agg.leads > 0 ? vsBench('Lead Gen Form Fill Rate', agg.ffr) : null,
                mom:   momBadge(mom(agg.leads, p.leads), false),
              },
              {
                label: 'CPL (USD)',
                val:   agg.leads > 0 ? fmtCur(agg.cpl) : '—',
                sub:   `Total spend: ${fmtCur(agg.spend || agg.spent || 0)}`,
                zar:   agg.leads > 0 && parseFloat(fxRate) > 0 ? `${(fxCurrency === 'ZAR' ? 'R' : 'KSh')} ${(agg.cpl * parseFloat(fxRate)).toFixed(2)} per lead` : null,
                bench: agg.leads > 0 ? vsBench('Cost Per Lead ($)', agg.cpl) : null,
                mom:   momBadge(agg.leads > 0 && p.cpl > 0 ? mom(agg.cpl, p.cpl) : null, true),
              },
              {
                label: 'Engagement Rate',
                val:   fmtPct(agg.engRate),
                sub:   null,
                zar:   null,
                bench: vsBench('Sponsored Engagement Rate', agg.engRate),
                rating: <RatingPill rating={calcRating('Sponsored Engagement Rate', agg.engRate, benchmarkTable)} />,
                mom:   momBadge(mom(agg.engRate, p.engRate), false),
              },
              {
                label: 'Engagements',
                val:   fmtNum(agg.engagements || 0),
                sub:   `Eng Rate: ${fmtPct(agg.engRate)}`,
                zar:   null,
                bench: null,
                mom:   momBadge(mom(agg.engagements || 0, p.engagements || 0), false),
              },
              {
                label: 'Video View Rate',
                val:   agg.videoViewRate != null && agg.videoViewRate > 0 ? fmtPct(agg.videoViewRate) : '0.00%',
                sub:   null,
                zar:   null,
                bench: null,
                mom:   momBadge(mom(agg.videoViewRate || 0, p.videoViewRate || 0), false),
              },
              {
                label: 'CPV (USD)',
                val:   agg.cpv != null && agg.cpv > 0 ? fmtCur(agg.cpv) : '$0.00',
                sub:   null,
                zar:   agg.cpv > 0 && parseFloat(fxRate) > 0 ? `${(fxCurrency === 'ZAR' ? 'R' : 'KSh')} ${(agg.cpv * parseFloat(fxRate)).toFixed(3)}` : null,
                bench: null,
                mom:   momBadge(mom(agg.cpv || 0, p.cpv || 0), true),
              },
            ];

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {cards.map(card => (
                  <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <div className="text-xs font-bold uppercase tracking-wide mb-2"
                      style={{color:'#888',letterSpacing:'1px'}}>{card.label}</div>
                    <div className="text-3xl font-bold mb-1"
                      style={{color:'#272828',fontFamily:'Helvetica Neue,Helvetica,Arial,sans-serif'}}>{card.val}</div>
                    {card.zar && (
                      <div className="text-sm font-semibold mb-2" style={{color:'#059669'}}>
                        {card.zar}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      {card.rating || null}
                      {card.bench  || null}
                      {card.mom    || null}
                    </div>
                    {card.sub && (
                      <div className="text-xs mt-1" style={{color:'#B1AAA4'}}>{card.sub}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {(aiLoading || aiText || aiError) && (
            <div className="rounded-xl overflow-hidden border border-[#1e3a5f]" style={{background:'#0f1f3d'}}>
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e3a5f]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0" style={{background:'#F6DC4E',color:'#272828'}}>AI</div>
                <div>
                  <div className="font-bold text-white text-sm">Claude AI Recommendations</div>
                  <div className="text-xs" style={{color:'#888'}}>Powered by Claude Sonnet · {report.benchmarkLabel || BENCHMARK_TABLES[report.benchmarkTable]?.label || report.benchmarkTable || report.region} Q1 2026 · {selectedNames.length} campaign{selectedNames.length!==1?'s':''}</div>
                </div>
                {aiText && !aiLoading && (
                  <button onClick={getAIInsights} className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[#2a4a6e] text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                    Refresh
                  </button>
                )}
              </div>

              {/* Loading */}
              {aiLoading && (
                <div className="flex items-center gap-3 px-6 py-8 text-slate-400 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{color:'#F6DC4E'}} />
                  Analysing {selectedNames.length} campaign{selectedNames.length!==1?'s':''} against {report.benchmarkLabel || BENCHMARK_TABLES[report.benchmarkTable]?.label || report.benchmarkTable || report.region} benchmarks...
                </div>
              )}

              {/* Error */}
              {aiError && <p className="px-6 py-4 text-red-400 text-sm">{aiError}</p>}

              {/* Structured output */}
              {aiText && !aiLoading && (() => {
                // Parse sections from AI text
                const getSection = (text, header) => {
                  const sIdx = text.indexOf(header);
                  if (sIdx === -1) return [];
                  const after = text.slice(sIdx + header.length);
                  const nIdx  = after.indexOf('\n## ');
                  const chunk = nIdx > 0 ? after.slice(0, nIdx) : after;
                  return chunk.split('\n').filter(l => l.startsWith('- ')).map(l => l.replace('- ', '').trim()).filter(Boolean);
                }
                const getTextSection = (text, header) => {
                  const sIdx = text.indexOf(header);
                  if (sIdx === -1) return '';
                  const after = text.slice(sIdx + header.length);
                  const nIdx  = after.indexOf('\n## ');
                  return (nIdx > 0 ? after.slice(0, nIdx) : after).trim();
                }

                const execSummary   = getTextSection(aiText, '## Executive Summary');
                const working       = getSection(aiText, "## What's Working");
                const issues        = getSection(aiText, '## Issues to Address');
                const optimise      = getSection(aiText, '## Optimization Opportunities');
                const audience      = getSection(aiText, '## Audience & Targeting Strategy');
                const budget        = getSection(aiText, '## Budget Recommendations');
                const actions       = getSection(aiText, '## Next 30-Day Action Plan');

                return (
                  <div>
                    {/* Executive Summary — full width */}
                    {execSummary && (
                      <div className="px-6 py-5 border-b border-[#1e3a5f]">
                        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'#F6DC4E',fontFamily:'monospace',letterSpacing:'2px'}}>Executive Summary</div>
                        <p className="text-sm leading-relaxed" style={{color:'#d1cbc3'}}>{execSummary.split('\n').filter(l=>!l.startsWith('##')).join(' ').replace(/^-\s/,'')}</p>
                      </div>
                    )}

                    {/* 2-col grid: What's Working + Issues */}
                    <div className="grid grid-cols-2 gap-0 border-b border-[#1e3a5f]">
                      <div className="px-6 py-5 border-r border-[#1e3a5f]">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#4ade80',fontFamily:'monospace',letterSpacing:'2px'}}>✓ What's Working</div>
                        <ul className="space-y-3">
                          {working.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{background:'#4ade80',marginTop:'7px'}} />
                              <span>{item}</span>
                            </li>
                          ))}
                          {!working.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                      <div className="px-6 py-5">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#f87171',fontFamily:'monospace',letterSpacing:'2px'}}>⚠ Issues to Address</div>
                        <ul className="space-y-3">
                          {issues.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{background:'#f87171',marginTop:'7px'}} />
                              <span>{item}</span>
                            </li>
                          ))}
                          {!issues.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                    </div>

                    {/* 2-col grid: Optimisation + Audience */}
                    <div className="grid grid-cols-2 gap-0 border-b border-[#1e3a5f]">
                      <div className="px-6 py-5 border-r border-[#1e3a5f]">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#60a5fa',fontFamily:'monospace',letterSpacing:'2px'}}>→ Optimization Opportunities</div>
                        <ul className="space-y-3">
                          {optimise.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="flex-shrink-0" style={{color:'#60a5fa',fontSize:'11px',marginTop:'3px'}}>→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                          {!optimise.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                      <div className="px-6 py-5">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#a78bfa',fontFamily:'monospace',letterSpacing:'2px'}}>◎ Audience & Targeting</div>
                        <ul className="space-y-3">
                          {audience.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="flex-shrink-0" style={{color:'#a78bfa',fontSize:'11px',marginTop:'3px'}}>◎</span>
                              <span>{item}</span>
                            </li>
                          ))}
                          {!audience.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                    </div>

                    {/* 2-col grid: Budget + Next Actions */}
                    <div className="grid grid-cols-2 gap-0">
                      <div className="px-6 py-5 border-r border-[#1e3a5f]">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#F6DC4E',fontFamily:'monospace',letterSpacing:'2px'}}>$ Budget Recommendations</div>
                        <ul className="space-y-3">
                          {budget.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="flex-shrink-0" style={{color:'#F6DC4E',fontSize:'11px',marginTop:'3px'}}>$</span>
                              <span>{item}</span>
                            </li>
                          ))}
                          {!budget.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                      <div className="px-6 py-5">
                        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#fb923c',fontFamily:'monospace',letterSpacing:'2px'}}>⚡ Next 30-Day Action Plan</div>
                        <ul className="space-y-3">
                          {actions.map((item,i) => (
                            <li key={i} className="flex gap-3 text-sm" style={{color:'#d1cbc3',lineHeight:1.6}}>
                              <span className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded flex items-center justify-center" style={{background:'rgba(251,146,60,0.2)',color:'#fb923c'}}>{i+1}</span>
                              <span>{item}</span>
                            </li>
                          ))}
                          {!actions.length && <li className="text-xs" style={{color:'#555'}}>—</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══════════════════════════════════════════
               CAMPAIGN BREAKDOWN (Thought Leader style)
             ══════════════════════════════════════════ */}
          {liveData?.topCampaigns?.length > 0 && (() => {
            const displayCampaigns = campIds.length > 0
              ? liveData.topCampaigns.filter(c => campIds.includes(String(c.id)))
              : liveData.topCampaigns;
            const totalImpr = displayCampaigns.reduce((s,c)=>s+(c.impressions||0),0);
            const totalClk  = displayCampaigns.reduce((s,c)=>s+(c.clicks||0),0);
            const totalSpd  = displayCampaigns.reduce((s,c)=>s+(c.spent||0),0);
            const totalLds  = displayCampaigns.reduce((s,c)=>s+(c.leads||0),0);
            const groupCTR  = totalImpr>0 ? (totalClk/totalImpr*100).toFixed(2)+'%' : '—';
            const groupEng  = fmtPct(agg.engRate);
            const bCTR = bench['Sponsored Content CTR'];
            const bEng = bench['Sponsored Engagement Rate'];
            const ratingColor = (r) => r==='exc'?'#059669':r==='above'?'#2563eb':r==='near'?'#d97706':'#dc2626';
            const statusLabel = (r) => r==='exc'?'✓ Exceptional':r==='above'?'✓ Above':r==='near'?'~ Near':'✗ Below';
            return (
              <>
                {/* Group Summary */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <div className="px-8 py-5 flex items-center justify-between" style={{background:'#0f1f3d'}}>
                    <div>
                      <div className="text-xs font-bold mb-1" style={{color:'#B1AAA4',fontFamily:'monospace',letterSpacing:'2px',textTransform:'uppercase'}}>Campaign Group Performance Report</div>
                      <h2 className="text-xl font-bold text-white">Group Summary</h2>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded" style={{background:'rgba(246,220,78,0.15)',color:'#F6DC4E',fontFamily:'monospace',letterSpacing:'1px'}}>ALL CAMPAIGNS COMBINED</span>
                  </div>
                  <div className="p-6 grid grid-cols-3 gap-4">
                    {[
                      {label:'Total Group Spend',    val:fmtCur(totalSpd),   sub:`${displayCampaigns.length} campaign${displayCampaigns.length!==1?'s':''} · period`,  accent:'#2563eb'},
                      {label:'Total Impressions',    val:fmtNum(totalImpr),  sub:`${fmtNum(totalClk)} total clicks`,                                                    accent:'#059669'},
                      {label:'Group Avg CTR',        val:groupCTR,           sub:bCTR?<span style={{color:parseFloat(groupCTR)>=(bCTR.low*100)?'#059669':'#dc2626',fontSize:'11px',fontFamily:'monospace'}}>{parseFloat(groupCTR)>=(bCTR.low*100)?'↑ ABOVE':'↓ BELOW'} {fmtPct(bCTR.low)} BENCHMARK</span>:null, accent:'#059669'},
                      {label:'Group Avg Engagement', val:groupEng,           sub:bEng?<span style={{color:agg.engRate>=(bEng.low)?'#059669':'#dc2626',fontSize:'11px',fontFamily:'monospace'}}>{agg.engRate>=(bEng.low)?'↑ ABOVE':'↓ BELOW'} {fmtPct(bEng.low)} BENCHMARK</span>:null, accent:'#059669'},
                      {label:'Cost Per Click',       val:fmtCur(agg.cpc),    sub:`Total leads: ${totalLds}`,                                                             accent:'#1e3a5f'},
                      {label:'Active Campaigns',     val:`${displayCampaigns.filter(c=>c.impressions>0).length} / ${displayCampaigns.length}`, sub:`${displayCampaigns.filter(c=>!c.impressions||c.impressions===0).length} paused`, accent:'#1e3a5f'},
                    ].map(({label,val,sub,accent})=>(
                      <div key={label} className="rounded-lg p-5" style={{borderLeft:`4px solid ${accent}`,background:'#fafaf9',border:'1px solid #e8e6df',borderLeftWidth:'4px',borderLeftColor:accent}}>
                        <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#888',marginBottom:'8px'}}>{label}</div>
                        <div style={{fontFamily:'Georgia,serif',fontSize:'28px',fontWeight:400,color:'#272828',lineHeight:1,marginBottom:'4px'}}>{val}</div>
                        <div style={{fontSize:'12px',color:'#8a8880'}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-Campaign Blocks */}
                <div className="space-y-5">
                  <div className="flex items-baseline gap-4 pb-3 border-b-2" style={{borderColor:'#272828'}}>
                    <h2 style={{fontFamily:'Georgia,serif',fontSize:'22px',fontWeight:400,color:'#272828'}}>Campaign Analysis</h2>
                    <span style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#888'}}>Individual Campaign Breakdown</span>
                  </div>
                  {displayCampaigns.map((c,idx)=>{
                    const name    = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
                    const ctr     = c.impressions>0 ? c.clicks/c.impressions : 0;
                    const engR    = c.impressions>0 ? ((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions : 0;
                    const cpc     = c.clicks>0 ? c.spent/c.clicks : 0;
                    const cpl     = c.leads>0  ? c.spent/c.leads  : 0;
                    const isPaused= !c.impressions||c.impressions===0;
                    const ctrR    = calcRating('Sponsored Content CTR',ctr,benchmarkTable);
                    const engR2   = calcRating('Sponsored Engagement Rate',engR,benchmarkTable);
                    const cpcR    = calcRating('CPC ($)',cpc,benchmarkTable);
                    return (
                      <div key={c.id} style={{background:'white',border:'1px solid #e8e6df',borderRadius:'8px',overflow:'hidden'}}>
                        {/* Header */}
                        <div style={{background:'#0d1b2e',padding:'24px 28px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'20px',flexWrap:'wrap'}}>
                          <div>
                            <div style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.45)',marginBottom:'4px'}}>CAMPAIGN {String(idx+1).padStart(2,'0')}</div>
                            <div style={{fontFamily:'monospace',fontSize:'14px',fontWeight:600,color:'white',marginBottom:'4px'}}>{name}</div>
                            <div style={{fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>ID: {c.id} · {isPaused?'Paused':'Active'}</div>
                          </div>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            {['ENGAGEMENT','CPC',isPaused?'PAUSED':'ACTIVE'].map(tag=>(
                              <span key={tag} style={{padding:'4px 12px',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'2px',fontFamily:'monospace',fontSize:'10px',letterSpacing:'1px',color:tag==='PAUSED'?'rgba(196,106,0,0.9)':'rgba(255,255,255,0.7)'}}>{tag}</span>
                            ))}
                          </div>
                        </div>
                        {isPaused ? (
                          <div style={{padding:'24px'}}>
                            <div style={{background:'#faf9f5',border:'1px solid #e8e6df',borderRadius:'4px',padding:'20px',display:'flex',alignItems:'center',gap:'16px'}}>
                              <div style={{fontSize:'32px'}}>⏸</div>
                              <div>
                                <div style={{fontWeight:600,marginBottom:'4px',color:'#272828'}}>Campaign Paused — No Active Data</div>
                                <div style={{fontSize:'13px',color:'#8a8880',lineHeight:1.6}}>Zero impressions and zero spend recorded. Review targeting, bid strategy, or creative approvals before reactivating.</div>
                              </div>
                            </div>
                          </div>
                        ):(
                          <>
                            {/* Benchmark bar */}
                            <div style={{margin:'20px 24px 16px',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'4px',padding:'12px 18px',display:'flex',gap:'28px',flexWrap:'wrap'}}>
                              {[[' CTR Benchmark',bCTR?`≥ ${fmtPct(bCTR.low)}`:'—'],['Eng Rate Benchmark',bEng?`≥ ${fmtPct(bEng.low)}`:'—'],['CPC Benchmark',bench['CPC ($)']?`≤ ${fmtCur(bench['CPC ($)'].median)}`:'—']].map(([l,v])=>(
                                <div key={l} style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                                  <span style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#059669'}}>{l}</span>
                                  <span style={{fontFamily:'monospace',fontSize:'11px',fontWeight:600,color:'#059669'}}>{v}</span>
                                </div>
                              ))}
                            </div>
                            {/* Stat cards */}
                            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',padding:'0 24px 20px'}}>
                              {[
                                {label:'Total Spend',     val:fmtCur(c.spent),      sub:`Period spend`,                           color:'#2563eb'},
                                {label:'CTR',             val:fmtPct(ctr),           sub:statusLabel(ctrR),                        color:ratingColor(ctrR)},
                                {label:'Avg CPC',         val:fmtCur(cpc),           sub:`${fmtNum(c.clicks)} clicks`,             color:ratingColor(cpcR)},
                                {label:'Engagement Rate', val:fmtPct(engR),          sub:statusLabel(engR2),                       color:ratingColor(engR2)},
                                {label:'Leads',           val:String(c.leads||0),   sub:`CPL: ${c.leads>0?fmtCur(cpl):'—'}`,     color:'#272828'},
                                {label:'Impressions',     val:fmtNum(c.impressions), sub:`${fmtNum(c.clicks)} clicks`,             color:'#272828'},
                              ].map(({label,val,sub,color})=>(
                                <div key={label} style={{borderLeft:`3px solid ${color}`,background:'#fafaf9',border:'1px solid #e8e6df',borderLeftWidth:'3px',borderLeftColor:color,borderRadius:'4px',padding:'16px'}}>
                                  <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',marginBottom:'6px'}}>{label}</div>
                                  <div style={{fontFamily:'Georgia,serif',fontSize:'24px',fontWeight:400,color:'#272828',lineHeight:1,marginBottom:'4px'}}>{val}</div>
                                  <div style={{fontSize:'11px',color:color==='#272828'?'#8a8880':color}}>{sub}</div>
                                </div>
                              ))}
                            </div>
                            {/* Detail table */}
                            <div style={{margin:'0 24px 24px',overflowX:'auto'}}>
                              <div style={{background:'#f2f1ec',padding:'8px 12px',fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',borderRadius:'4px 4px 0 0'}}>Campaign Performance Summary</div>
                              <table style={{width:'100%',borderCollapse:'collapse'}}>
                                <thead><tr style={{background:'#f2f1ec'}}>{['Impressions','Clicks','CTR','Eng Rate','CPC','Spend','Leads','CPL','CTR Status','Eng Status'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                                <tbody><tr style={{borderBottom:'1px solid #e8e6df'}}>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px'}}>{fmtNum(c.impressions)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px'}}>{fmtNum(c.clicks)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px',fontWeight:600,color:ratingColor(ctrR)}}>{fmtPct(ctr)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px',fontWeight:600,color:ratingColor(engR2)}}>{fmtPct(engR)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px'}}>{fmtCur(cpc)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px'}}>{fmtCur(c.spent)}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px',fontWeight:600}}>{c.leads||0}</td>
                                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:'12px'}}>{c.leads>0?fmtCur(cpl):'—'}</td>
                                  <td style={{padding:'10px 12px',fontSize:'12px',color:ratingColor(ctrR)}}>{statusLabel(ctrR)}</td>
                                  <td style={{padding:'10px 12px',fontSize:'12px',color:ratingColor(engR2)}}>{statusLabel(engR2)}</td>
                                </tr></tbody>
                              </table>
                            </div>

                            {/* ── Charts: 2x2 grid ── */}
                            <CampaignCharts campaignId={c.id} campaign={c} bench={bench} region={report.region} />

                            {/* ── Week-by-Week Summary Table ── */}
                            <WeeklyBreakdown campaign={c} bench={bench} region={report.region} campaignNameMap={campaignNameMap} />

                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Key Insights Per Campaign ── */}
                <div style={{background:'white',borderRadius:'12px',overflow:'hidden',border:'1px solid #e8e6df',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:'16px',padding:'20px 32px',borderBottom:'2px solid #272828'}}>
                    <h2 style={{fontFamily:'Georgia,serif',fontSize:'22px',fontWeight:400,color:'#272828'}}>Key Insights Per Campaign</h2>
                    <span style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880'}}>Data-driven analysis</span>
                  </div>
                  <div style={{padding:'24px',display:'flex',flexDirection:'column',gap:'20px'}}>
                    {displayCampaigns.map((c,idx)=>{
                      const name  = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
                      const ctr   = c.impressions>0 ? c.clicks/c.impressions : 0;
                      const engR  = c.impressions>0 ? ((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions : 0;
                      const cpc   = c.clicks>0 ? c.spent/c.clicks : 0;
                      const cpl   = c.leads>0  ? c.spent/c.leads  : 0;
                      const isPaused = !c.impressions||c.impressions===0;
                      const ctrR  = calcRating('Sponsored Content CTR',ctr,benchmarkTable);
                      const engR2 = calcRating('Sponsored Engagement Rate',engR,benchmarkTable);
                      const cpcR  = calcRating('CPC ($)',cpc,benchmarkTable);
                      const cplR  = c.leads>0 ? calcRating('Cost Per Lead ($)',cpl,benchmarkTable) : null;
                      const bCTR2 = bench['Sponsored Content CTR'];
                      const bEng2 = bench['Sponsored Engagement Rate'];
                      const bCPC2 = bench['CPC ($)'];
                      const bCPL2 = bench['Cost Per Lead ($)'];

                      const insights = [];
                      const flags    = [];

                      if (isPaused) {
                        flags.push({color:'#d97706', label:'Paused', text:'Campaign is paused with zero delivery. Review creative approvals, bid strategy, and targeting before reactivating.'});
                      } else {
                        // CTR
                        if (ctrR==='exc')        insights.push({color:'#059669', label:'Exceptional CTR', text:`CTR of ${fmtPct(ctr)} far exceeds the benchmark high of ${bCTR2?fmtPct(bCTR2.high):'—'}. Creative-audience fit is outstanding.`});
                        else if (ctrR==='above') insights.push({color:'#2563eb', label:'Strong CTR',      text:`CTR of ${fmtPct(ctr)} beats the benchmark median (${bCTR2?fmtPct(bCTR2.median):'—'}). Audience targeting is well-aligned.`});
                        else                     flags.push(   {color:'#dc2626', label:'Low CTR',         text:`CTR of ${fmtPct(ctr)} is below the benchmark low of ${bCTR2?fmtPct(bCTR2.low):'—'}. Immediate creative review recommended.`});

                        // Engagement
                        if (engR2==='exc')        insights.push({color:'#059669', label:'Exceptional Engagement', text:`Engagement rate of ${fmtPct(engR)} is exceptional — far exceeding the ${bEng2?fmtPct(bEng2.high):'—'} benchmark high. Strong content-audience resonance.`});
                        else if (engR2==='above') insights.push({color:'#2563eb', label:'Good Engagement',        text:`Engagement rate of ${fmtPct(engR)} exceeds the benchmark median (${bEng2?fmtPct(bEng2.median):'—'}).`});
                        else                     flags.push(   {color:'#dc2626', label:'Low Engagement',        text:`Engagement rate of ${fmtPct(engR)} is below the benchmark low (${bEng2?fmtPct(bEng2.low):'—'}). Audience or creative may need a full refresh.`});

                        // CPC
                        if (cpcR==='exc')        insights.push({color:'#059669', label:'Efficient CPC',   text:`CPC of ${fmtCur(cpc)} is well below the benchmark (${bCPC2?fmtCur(bCPC2.median):'—'} median). Budget is being deployed efficiently.`});
                        else if (cpcR==='above') insights.push({color:'#2563eb', label:'Good CPC',        text:`CPC of ${fmtCur(cpc)} is competitive against the ${bCPC2?fmtCur(bCPC2.median):'—'} benchmark median.`});
                        else                     flags.push(   {color:'#dc2626', label:'High CPC',        text:`CPC of ${fmtCur(cpc)} significantly exceeds the ${bCPC2?fmtCur(bCPC2.high):'—'} benchmark high. Bid strategy review is urgent.`});

                        // CPL
                        if (c.leads>0) {
                          if (cplR==='exc')        insights.push({color:'#059669', label:'Excellent CPL',  text:`Cost per lead of ${fmtCur(cpl)} is well within benchmark — efficient lead generation at scale.`});
                          else if (cplR==='above') insights.push({color:'#2563eb', label:'Good CPL',       text:`CPL of ${fmtCur(cpl)} is competitive against the ${bCPL2?fmtCur(bCPL2.median):'—'} benchmark median.`});
                          else                     flags.push(   {color:'#dc2626', label:'High CPL',       text:`CPL of ${fmtCur(cpl)} is above the benchmark high of ${bCPL2?fmtCur(bCPL2.high):'—'}. Lead form optimisation is a priority.`});
                        } else {
                          insights.push({color:'#8a8880', label:'No Leads Tracked', text:'No lead conversions recorded in this period. Verify lead form configuration or consider adding a lead gen objective.'});
                        }

                        // Volume note
                        if (c.impressions < 5000)  flags.push({color:'#d97706', label:'Low Reach', text:`Only ${fmtNum(c.impressions)} impressions. Audience may be too narrow or budget too low to achieve statistical significance.`});
                        if (c.impressions > 50000) insights.push({color:'#059669', label:'Strong Reach', text:`${fmtNum(c.impressions)} impressions delivered — sufficient volume for meaningful optimisation decisions.`});
                      }

                      return (
                        <div key={c.id} style={{border:'1px solid #e8e6df',borderRadius:'8px',overflow:'hidden'}}>
                          {/* Campaign name bar */}
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'#f7f6f2',borderBottom:'1px solid #e8e6df'}}>
                            <div>
                              <div style={{fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',marginBottom:'2px'}}>CAMPAIGN {String(idx+1).padStart(2,'0')}</div>
                              <div style={{fontWeight:600,fontSize:'14px',color:'#272828',fontFamily:'monospace'}}>{name}</div>
                            </div>
                            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                              <span style={{fontFamily:'monospace',fontSize:'10px',color:'#8a8880'}}>ID: {c.id}</span>
                              {!isPaused && (
                                <>
                                  <span style={{padding:'3px 10px',borderRadius:'2px',fontSize:'10px',fontFamily:'monospace',background:ratingColor(ctrR)==='#059669'?'rgba(5,150,105,0.1)':ratingColor(ctrR)==='#2563eb'?'rgba(37,99,235,0.1)':'rgba(220,38,38,0.1)',color:ratingColor(ctrR),border:`1px solid ${ratingColor(ctrR)}30`}}>CTR {fmtPct(ctr)}</span>
                                  <span style={{padding:'3px 10px',borderRadius:'2px',fontSize:'10px',fontFamily:'monospace',background:ratingColor(engR2)==='#059669'?'rgba(5,150,105,0.1)':ratingColor(engR2)==='#2563eb'?'rgba(37,99,235,0.1)':'rgba(220,38,38,0.1)',color:ratingColor(engR2),border:`1px solid ${ratingColor(engR2)}30`}}>ENG {fmtPct(engR)}</span>
                                  <span style={{padding:'3px 10px',borderRadius:'2px',fontSize:'10px',fontFamily:'monospace',background:'rgba(39,40,40,0.07)',color:'#272828',border:'1px solid #e8e6df'}}>CPC {fmtCur(cpc)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Insights list */}
                          <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                            {[...insights,...flags].map((item,i)=>(
                              <div key={i} style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                                <div style={{width:'3px',flexShrink:0,borderRadius:'2px',background:item.color,marginTop:'3px',alignSelf:'stretch',minHeight:'16px'}} />
                                <div style={{flex:1}}>
                                  <span style={{fontFamily:'monospace',fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:item.color,marginRight:'8px'}}>{item.label}</span>
                                  <span style={{fontSize:'13px',color:'#2a2c3a',lineHeight:1.6}}>{item.text}</span>
                                </div>
                              </div>
                            ))}
                            {insights.length===0 && flags.length===0 && (
                              <p style={{fontSize:'13px',color:'#8a8880'}}>No significant insights for this campaign in the selected period.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optimisation 4-quadrant */}
                {aiText && (
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    <div style={{display:'flex',alignItems:'baseline',gap:'16px',padding:'20px 32px',borderBottom:'2px solid #272828'}}>
                      <h2 style={{fontFamily:'Georgia,serif',fontSize:'22px',fontWeight:400,color:'#272828'}}>Optimisation Summary</h2>
                      <span style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#888'}}>Actionable Recommendations</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',padding:'24px'}}>
                      {[
                        {head:"✓ What's Working Well",       color:'#059669', section:"## What's Working"},
                        {head:"⚠ Issues to Address",         color:'#dc2626', section:"## Optimization Opportunities"},
                        {head:"→ Immediate Actions",         color:'#2563eb', section:"## Next 30-Day Action Plan"},
                        {head:"→ Strategic Recommendations", color:'#d97706', section:"## Audience & Targeting Strategy"},
                      ].map(({head,color,section})=>{
                        const sIdx=aiText.indexOf(section);
                        const nIdx=aiText.indexOf('\n## ',sIdx+4);
                        const chunk=sIdx>=0?aiText.slice(sIdx,nIdx>sIdx?nIdx:undefined):'';
                        const bullets=chunk.split('\n').filter(l=>l.startsWith('- ')).slice(0,4);
                        return (
                          <div key={head} style={{background:'white',border:'1px solid #e8e6df',borderRadius:'4px',padding:'20px'}}>
                            <div style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color,marginBottom:'14px'}}>{head}</div>
                            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:'10px'}}>
                              {bullets.map((line,i)=><li key={i} style={{fontSize:'13px',lineHeight:1.5,paddingLeft:'14px',position:'relative',color:'#2a2c3a'}}><span style={{position:'absolute',left:0,color:'#8a8880',fontSize:'11px'}}>→</span>{line.replace('- ','')}</li>)}
                              {bullets.length===0 && <li style={{fontSize:'12px',color:'#8a8880'}}>Generate AI Recommendations to populate.</li>}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Benchmark Performance Table */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <div style={{display:'flex',alignItems:'baseline',gap:'16px',padding:'20px 32px',borderBottom:'2px solid #272828'}}>
                    <h2 style={{fontFamily:'Georgia,serif',fontSize:'22px',fontWeight:400,color:'#272828'}}>Benchmark Performance Summary</h2>
                    <span style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#888'}}>{fmtDate(report.dateStart)} – {fmtDate(report.dateEnd)}</span>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#f2f1ec'}}>{['Campaign','Metric','Benchmark','Your Result','vs Benchmark','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 14px',fontFamily:'monospace',fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#8a8880',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {displayCampaigns.map((c,ci)=>{
                          const cname = campaignNameMap?.[String(c.id)] || `Campaign ${c.id}`;
                          const ctr   = c.impressions>0?c.clicks/c.impressions:0;
                          const engR  = c.impressions>0?((c.clicks||0)+(c.likes||0)+(c.comments||0)+(c.shares||0)+(c.follows||0))/c.impressions:0;
                          const cpc   = c.clicks>0?c.spent/c.clicks:0;
                          const paused= !c.impressions||c.impressions===0;
                          const rows  = [
                            {kpi:'CTR',             actual:ctr,  bval:bCTR?.median||0,                  fmt:fmtPct, metric:'Sponsored Content CTR'},
                            {kpi:'Engagement Rate', actual:engR, bval:bEng?.median||0,                  fmt:fmtPct, metric:'Sponsored Engagement Rate'},
                            {kpi:'CPC',             actual:cpc,  bval:bench['CPC ($)']?.median||0,      fmt:fmtCur, metric:'CPC ($)'},
                          ];
                          return rows.map(({kpi,actual,bval,fmt,metric},ri)=>{
                            const isCost = metric.includes('CPC')||metric.includes('Cost');
                            const diff   = isCost ? bval-actual : actual-bval;
                            const pct    = bval>0?((diff/bval)*100).toFixed(1):'0';
                            const ok     = diff>=0;
                            const r      = paused ? null : calcRating(metric, actual, benchmarkTable);
                            return (
                              <tr key={`${c.id}-${ri}`} style={{borderBottom:'1px solid #e8e6df',background:ci%2===0?'white':'#fafaf9'}}>
                                {ri===0 && <td rowSpan={3} style={{padding:'10px 14px',fontWeight:600,color:'#272828',verticalAlign:'top',paddingTop:'14px'}}>{cname}<div style={{fontFamily:'monospace',fontSize:'11px',color:'#B1AAA4',marginTop:'2px'}}>ID: {c.id}</div></td>}
                                <td style={{padding:'10px 14px',fontSize:'13px'}}>{kpi}</td>
                                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'12px',color:'#8a8880'}}>{fmt(bval)}</td>
                                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'12px',fontWeight:600,color:'#272828'}}>{paused?'—':fmt(actual)}</td>
                                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'12px',color:paused?'#8a8880':ok?'#059669':'#dc2626'}}>{paused?'—':(ok?'+':'')+pct+'pp'}</td>
                                <td style={{padding:'10px 14px',fontSize:'12px',color:paused?'#8a8880':ratingColor(r)}}>{paused?'⏸ Paused':statusLabel(r)}</td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Fallback What's Working if no campaign data */}
          {aiText && !liveData?.topCampaigns?.length && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-5 pb-3 border-b-2" style={{color:'#272828',borderColor:'#272828'}}>✅ What's Working</h2>
              <div className="space-y-2">
                {aiText.split('\n').filter(l => l.startsWith('- ')).slice(0,6).map((line,i) => (
                  <div key={i} className="flex items-start gap-3 py-2" style={{borderBottom:'1px solid #f0eeeb'}}>
                    <span className="font-bold mt-0.5 flex-shrink-0" style={{color:'#F6DC4E'}}>→</span>
                    <span className="text-sm" style={{color:'#444'}}>{line.replace('- ','')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="text-center py-5 text-xs border-t border-slate-200" style={{color:'#B1AAA4'}}>
            <p>Report generated by Turn Left Media · {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</p>
            <p className="mt-1">AI recommendations powered by Claude · LinkedIn Q4 2025 In-Depth Benchmarks</p>
          </div>
        </>
      )}

      {/* AI Report Modal (same as LinkedIn dashboard app) */}
      <AIReportModal
        show={showAIReport}
        onClose={() => setShowAIReport(false)}
        generatingReport={generatingAIReport}
        reportData={liveData}
        reportResult={aiReportResult}
        currentRange={{ start: dateStart, end: dateEnd }}
        previousRange={getAnalyticsPayload().previousRange}
        campaignNameMap={campaignNameMap}
        fxRate={fxRate}
        fxCurrency={fxCurrency}
      />
    </div>
  );
}


export default function Dashboard() {
  const { data: session, status } = useSession();

  const [activeMainTab, setActiveMainTab] = useState('report');
  const [devUnlocked,    setDevUnlocked]    = useState(false);
  const [showDevModal,   setShowDevModal]   = useState(false);
  const [devPassword,    setDevPassword]    = useState('');
  const [devPassErr,     setDevPassErr]     = useState('');

  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  const [campaignGroups, setCampaignGroups] = useState([]);
  const [selectedCampaignGroups, setSelectedCampaignGroups] = useState([]);
  const [campaignGroupSearch, setCampaignGroupSearch] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const [ads, setAds] = useState([]);
  const [selectedAds, setSelectedAds] = useState([]);
  const [adSearch, setAdSearch] = useState('');
  const [loadingAds, setLoadingAds] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(18.5);
  const [manualBudget, setManualBudget] = useState('');
  const [activeObjectiveTab, setActiveObjectiveTab] = useState('all');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');

  const [showReport, setShowReport] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [currentRange, setCurrentRange] = useState({
    start: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [previousRange, setPreviousRange] = useState({
    start: new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0],
    end: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  });

  useEffect(() => { if (session) loadAccounts(); }, [session]);

  useEffect(() => {
    if (selectedAccounts.length > 0) {
      loadCampaignGroups();
      loadCampaigns();
      setSelectedCampaignGroups([]);
      setSelectedCampaigns([]);
      setAds([]); setSelectedAds([]);
    } else {
      setCampaignGroups([]); setSelectedCampaignGroups([]);
      setCampaigns([]); setSelectedCampaigns([]);
      setAds([]); setSelectedAds([]);
      setReportData(null);
    }
  }, [selectedAccounts]);

  useEffect(() => {
    if (selectedCampaigns.length > 0) { loadAds(); setSelectedAds([]); }
    else { setAds([]); setSelectedAds([]); }
  }, [selectedCampaigns]);

  useEffect(() => {
    if (selectedAccounts.length > 0) loadAnalytics();
  }, [selectedAds, selectedCampaigns, selectedCampaignGroups, currentRange, previousRange]);

  async function loadAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) setAccounts(await res.json());
    } catch (err) { console.error(err); }
  }

  async function loadCampaignGroups() {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/campaigngroups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: selectedAccounts })
      });
      if (res.ok) setCampaignGroups(await res.json());
    } catch (err) { console.error(err); }
    setLoadingGroups(false);
  }

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: selectedAccounts })
      });
      if (res.ok) setCampaigns(await res.json());
    } catch (err) { console.error(err); }
    setLoadingCampaigns(false);
  }

  async function loadAds() {
    setLoadingAds(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: selectedCampaigns })
      });
      if (res.ok) setAds(await res.json());
    } catch (err) { console.error(err); }
    setLoadingAds(false);
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds: selectedAccounts,
          campaignGroupIds: selectedCampaignGroups.length > 0 ? selectedCampaignGroups : null,
          campaignIds: selectedCampaigns.length > 0 ? selectedCampaigns : null,
          adIds: selectedAds.length > 0 ? selectedAds : null,
          currentRange, previousRange, exchangeRate
        })
      });
      if (res.ok) setReportData(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function generateReport() {
    if (!reportData) return;
    setGeneratingReport(true);
    setShowReport(true);
    setReportResult(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: reportData.current,
          previous: reportData.previous,
          topCampaigns: reportData.topCampaigns,
          topAds: reportData.topAds,
          budgetPacing: reportData.budgetPacing,
          currentRange, previousRange, selectedCampaigns, exchangeRate
        })
      });
      if (res.ok) setReportResult(await res.json());
      else setReportResult({ error: 'Failed to generate report.' });
    } catch (err) {
      setReportResult({ error: 'Failed to generate report.' });
    }
    setGeneratingReport(false);
  }

  function exportToCSV() {
    if (!reportData) return;
    const { current, previous, topCampaigns } = reportData;
    const rows = [
      ['LinkedIn Campaign Dashboard Export'],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['SUMMARY METRICS', 'CURRENT PERIOD', 'PREVIOUS PERIOD', 'CHANGE %'],
      ['Period', `${currentRange.start} to ${currentRange.end}`, `${previousRange.start} to ${previousRange.end}`, ''],
      ['Impressions', current.impressions, previous.impressions, previous.impressions > 0 ? (((current.impressions - previous.impressions) / previous.impressions) * 100).toFixed(1) + '%' : 'N/A'],
      ['Clicks', current.clicks, previous.clicks, previous.clicks > 0 ? (((current.clicks - previous.clicks) / previous.clicks) * 100).toFixed(1) + '%' : 'N/A'],
      ['CTR (%)', current.ctr.toFixed(2), previous.ctr.toFixed(2), previous.ctr > 0 ? (((current.ctr - previous.ctr) / previous.ctr) * 100).toFixed(1) + '%' : 'N/A'],
      ['Spend ($)', current.spent.toFixed(2), previous.spent.toFixed(2), previous.spent > 0 ? (((current.spent - previous.spent) / previous.spent) * 100).toFixed(1) + '%' : 'N/A'],
      ['CPM ($)', current.cpm.toFixed(2), previous.cpm.toFixed(2), previous.cpm > 0 ? (((current.cpm - previous.cpm) / previous.cpm) * 100).toFixed(1) + '%' : 'N/A'],
      ['CPC ($)', current.cpc.toFixed(2), previous.cpc.toFixed(2), previous.cpc > 0 ? (((current.cpc - previous.cpc) / previous.cpc) * 100).toFixed(1) + '%' : 'N/A'],
      ['Leads', current.leads, previous.leads, previous.leads > 0 ? (((current.leads - previous.leads) / previous.leads) * 100).toFixed(1) + '%' : 'N/A'],
      ['CPL ($)', current.cpl.toFixed(2), previous.cpl.toFixed(2), previous.cpl > 0 ? (((current.cpl - previous.cpl) / previous.cpl) * 100).toFixed(1) + '%' : 'N/A'],
      ['Engagements', current.engagements, previous.engagements, previous.engagements > 0 ? (((current.engagements - previous.engagements) / previous.engagements) * 100).toFixed(1) + '%' : 'N/A'],
      ['Engagement Rate (%)', current.engagementRate.toFixed(2), previous.engagementRate.toFixed(2), previous.engagementRate > 0 ? (((current.engagementRate - previous.engagementRate) / previous.engagementRate) * 100).toFixed(1) + '%' : 'N/A'],
      [],
      ['TOP CAMPAIGNS', 'ID', 'IMPRESSIONS', 'CLICKS', 'CTR (%)', 'SPENT ($)', 'LEADS', 'CPL ($)'],
      ...(topCampaigns || []).map(c => [
        campaignNameMap[String(c.id)] || `Campaign ${c.id}`,
        c.id, c.impressions, c.clicks, c.ctr,
        c.spent.toFixed(2), c.leads || 0,
        c.leads > 0 ? (c.spent / c.leads).toFixed(2) : '-'
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-dashboard-${currentRange.start}-${currentRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => window.open('https://sheets.new', '_blank'), 500);
  }

  const campaignNameMap = Object.fromEntries(campaigns.map(c => [String(c.id), c.name]));
  const adNameMap = Object.fromEntries(ads.map(a => [String(a.id), a.name]));
  const primaryAccountId = selectedAccounts[0];

  // Map campaign ID → objectiveType for tab filtering
  const campaignObjectiveMap = Object.fromEntries(
    campaigns.map(c => [String(c.id), (c.objectiveType || c.type || '').toUpperCase()])
  );

  const OBJECTIVE_TABS = [
    { id: 'all',         label: 'All',              icon: BarChart2,   types: null,
      metrics: ['impressions','clicks','ctr','spent','cpm','cpc','websiteVisits','leads','cpl','engagementRate','engagements'] },
    { id: 'engagement',  label: 'Engagement',        icon: Zap,         types: ['ENGAGEMENT','BRAND_AWARENESS','SPONSORED_UPDATES'],
      metrics: ['impressions','clicks','ctr','cpc','engagementRate','engagements'] },
    { id: 'leads',       label: 'Lead Generation',   icon: Users,       types: ['LEAD_GENERATION','SPONSORED_INMAILS'],
      metrics: ['impressions','clicks','ctr','spent','leads','cpl'] },
    { id: 'video',       label: 'Video Views',       icon: Video,       types: ['VIDEO_VIEWS','SPONSORED_VIDEO'],
      metrics: ['impressions','clicks','ctr','spent','cpm','cpc'] },
    { id: 'website',     label: 'Website Visits',    icon: Globe,       types: ['WEBSITE_VISITS','WEBSITE_CONVERSIONS'],
      metrics: ['impressions','clicks','ctr','spent','cpm','cpc','websiteVisits'] },
  ];

  const activeTabConfig = OBJECTIVE_TABS.find(t => t.id === activeObjectiveTab) || OBJECTIVE_TABS[0];

  // Filter topCampaigns by objective type for the active tab
  const filteredTopCampaigns = activeTabConfig.types === null
    ? (reportData?.topCampaigns || [])
    : (reportData?.topCampaigns || []).filter(c => {
        const obj = campaignObjectiveMap[String(c.id)] || '';
        return activeTabConfig.types.some(t => obj.includes(t));
      });

  // All metrics config (used to selectively show per tab)
  const ALL_METRICS = [
    { label: 'Impressions',     key: 'impressions',     format: 'number',  icon: Eye,          prefix: '' },
    { label: 'Clicks',          key: 'clicks',          format: 'number',  icon: MousePointer, prefix: '' },
    { label: 'CTR',             key: 'ctr',             format: 'percent', icon: TrendingUp,   prefix: '' },
    { label: 'Spent (USD)',     key: 'spent',           format: 'decimal', icon: DollarSign,   prefix: '$' },
    { label: 'CPM (USD)',       key: 'cpm',             format: 'decimal', icon: DollarSign,   prefix: '$' },
    { label: 'CPC (USD)',       key: 'cpc',             format: 'decimal', icon: DollarSign,   prefix: '$' },
    { label: 'Website Visits',  key: 'websiteVisits',   format: 'number',  icon: Target,       prefix: '' },
    { label: 'Leads',           key: 'leads',           format: 'number',  icon: Users,        prefix: '' },
    { label: 'CPL (USD)',       key: 'cpl',             format: 'decimal', icon: DollarSign,   prefix: '$' },
    { label: 'Engagement Rate', key: 'engagementRate',  format: 'percent', icon: TrendingUp,   prefix: '' },
    { label: 'Engagements',     key: 'engagements',     format: 'number',  icon: Users,        prefix: '' },
  ];

  const visibleMetrics = ALL_METRICS.filter(m => activeTabConfig.metrics.includes(m.key));

  const filteredAccounts = accounts.filter(a => !accountSearch || a.name.toLowerCase().includes(accountSearch.toLowerCase()) || String(a.id).includes(accountSearch));
  const filteredGroups = campaignGroups.filter(g => !campaignGroupSearch || g.name.toLowerCase().includes(campaignGroupSearch.toLowerCase()) || String(g.id).includes(campaignGroupSearch));
  const filteredCampaigns = campaigns.filter(c => !campaignSearch || c.name.toLowerCase().includes(campaignSearch.toLowerCase()) || String(c.id).includes(campaignSearch));
  const filteredAds = ads.filter(a => !adSearch || a.name.toLowerCase().includes(adSearch.toLowerCase()) || String(a.id).includes(adSearch));

  function toggle(setter) {
    return (id) => setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (status === 'loading') return <LoadingScreen />;
  if (!session) return <SignInScreen />;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: #0f172a !important; } @page { margin: 1cm; } }`}</style>
      <div className="min-h-screen bg-[#0a1628]">
        {/* ── Top Bar ── */}
        <div className="bg-[#0a1628] border-b border-[#1e3a5f] shadow-lg no-print sticky top-0 z-40">
          <div className="max-w-screen-2xl mx-auto px-6">
            <div className="flex justify-between items-center py-3 border-b border-[#1e3a5f]">
              <div className="flex items-center gap-3">
                <svg width="28" height="28" viewBox="0 0 400 400" fill="none">
                  <rect width="400" height="400" fill="#0a1628"/>
                  <path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/>
                  <path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/>
                  <path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/>
                </svg>
                <div>
                  <span className="text-white font-bold text-sm tracking-wide">Turn Left Media</span>
                  <span className="ml-3 text-slate-500 text-xs">•</span>
                  <span className="ml-3 text-slate-400 text-xs">LinkedIn Campaign Platform</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {session?.user?.name && (
                  <span className="text-slate-400 text-xs border border-[#1e3a5f] rounded-full px-3 py-1">
                    {session.user.name}
                  </span>
                )}
                {activeMainTab === 'dashboard' && devUnlocked && reportData && (
                  <>
                    <button onClick={generateReport} disabled={generatingReport}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50">
                      {generatingReport ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>✦</span>}
                      {generatingReport ? 'Generating...' : 'AI Report'}
                    </button>
                    <button onClick={exportToCSV}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-xs flex items-center gap-1.5">
                      <span>📊</span> Sheets
                    </button>
                    <button onClick={() => window.print()}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-xs">
                      PDF
                    </button>
                  </>
                )}
                <button onClick={() => signOut()}
                  className="px-3 py-1.5 bg-red-900/60 text-red-300 border border-red-800 rounded-lg hover:bg-red-800 font-semibold text-xs">
                  Sign Out
                </button>
              </div>
            </div>
            {/* ── Navigation Tabs ── */}
            <div className="flex gap-1 items-end">
              {/* Report Generator — default first tab */}
              {[
                { id: 'report',     label: 'Report Generator', icon: FileText },
                { id: 'benchmarks', label: 'Benchmarks',       icon: Settings },
                { id: 'objective',  label: 'Performance by Objective', icon: Layers },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeMainTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveMainTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${isActive ? '' : 'border-transparent text-slate-400 hover:text-white hover:bg-[#0f1f3d]/50'}`}
                    style={isActive ? {borderColor:'#F6DC4E',color:'#F6DC4E',background:'rgba(246,220,78,0.08)'} : {}}>
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}

              {/* Campaign Manager — developer only, password locked */}
              <button
                onClick={() => {
                  if (devUnlocked) {
                    setActiveMainTab('dashboard');
                  } else {
                    setShowDevModal(true);
                    setDevPassword('');
                    setDevPassErr('');
                  }
                }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ml-auto ${
                  activeMainTab === 'dashboard' && devUnlocked
                    ? ''
                    : 'border-transparent text-slate-600 hover:text-slate-400 hover:bg-[#0f1f3d]/30'
                }`}
                style={activeMainTab === 'dashboard' && devUnlocked ? {borderColor:'#B1AAA4',color:'#B1AAA4',background:'rgba(177,170,164,0.05)'} : {}}>
                <BarChart2 className="w-4 h-4" />
                Campaign Manager
                {!devUnlocked && (
                  <svg className="w-3 h-3 ml-0.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                {devUnlocked && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold ml-0.5" style={{background:'rgba(177,170,164,0.15)',color:'#B1AAA4'}}>DEV</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Report Generator Tab ── */}
        {activeMainTab === 'report' && (
          <TLMReportGenerator
            session={session}
            currentRange={currentRange}
          />
        )}

        {/* ── Benchmarks Tab ── */}
        {activeMainTab === 'benchmarks' && <BenchmarkManager />}

        {/* ── Performance by Objective Tab ── */}
        {activeMainTab === 'objective' && (
          <div className="max-w-screen-2xl mx-auto p-6">
            <ObjectiveTabs />
          </div>
        )}

        {/* ── Campaign Manager (developer only) ── */}
        {activeMainTab === 'dashboard' && devUnlocked && <div className="max-w-screen-2xl mx-auto p-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 space-y-3 no-print">
              <div className="flex items-center gap-2 px-1">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Account</span>
              </div>
              <SidebarSection title="Accounts" loading={false} items={filteredAccounts}
                selectedIds={selectedAccounts} onToggle={toggle(setSelectedAccounts)}
                onSelectAll={() => setSelectedAccounts(filteredAccounts.map(a => a.id))}
                onClear={() => setSelectedAccounts([])} searchValue={accountSearch}
                onSearchChange={setAccountSearch} searchPlaceholder="Search by name or ID..."
                emptyMessage="No accounts found" accentColor="blue" />

              {selectedAccounts.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-1 pt-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Campaign Group</span>
                  </div>
                  <SidebarSection title="Campaign Groups" loading={loadingGroups} items={filteredGroups}
                    selectedIds={selectedCampaignGroups} onToggle={toggle(setSelectedCampaignGroups)}
                    onSelectAll={() => setSelectedCampaignGroups(filteredGroups.map(g => g.id))}
                    onClear={() => setSelectedCampaignGroups([])} searchValue={campaignGroupSearch}
                    onSearchChange={setCampaignGroupSearch} searchPlaceholder="Search by name or ID..."
                    emptyMessage="No campaign groups found" accentColor="purple" />

                  <div className="flex items-center gap-2 px-1 pt-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Campaign / Ad Set</span>
                  </div>
                  <SidebarSection title="Campaigns" loading={loadingCampaigns} items={filteredCampaigns}
                    selectedIds={selectedCampaigns} onToggle={toggle(setSelectedCampaigns)}
                    onSelectAll={() => setSelectedCampaigns(filteredCampaigns.map(c => c.id))}
                    onClear={() => setSelectedCampaigns([])} searchValue={campaignSearch}
                    onSearchChange={setCampaignSearch} searchPlaceholder="Search by name or ID..."
                    emptyMessage="No campaigns found" accentColor="emerald" />
                </>
              )}

              {selectedCampaigns.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-1 pt-2">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ads</span>
                  </div>
                  <SidebarSection title="Ads" loading={loadingAds} items={filteredAds}
                    selectedIds={selectedAds} onToggle={toggle(setSelectedAds)}
                    onSelectAll={() => setSelectedAds(filteredAds.map(a => a.id))}
                    onClear={() => setSelectedAds([])} searchValue={adSearch}
                    onSearchChange={setAdSearch} searchPlaceholder="Search by name or ID..."
                    emptyMessage="No ads found" accentColor="orange" />
                </>
              )}
            </div>

            <div className="col-span-9 print:col-span-12">
              {!reportData ? (
                <div className="bg-[#0f1f3d] rounded-xl p-12 text-center border border-[#1e3a5f]">
                  <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Select an Account to Begin</h2>
                  <p className="text-slate-400">Use the sidebar steps to filter by account, campaign group, campaign and ad</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-4 flex-wrap no-print">
                    <span className="px-3 py-1 bg-blue-900 border border-blue-700 rounded-full text-xs text-blue-300 font-medium">
                      {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}
                    </span>
                    {selectedCampaignGroups.length > 0 && (
                      <span className="px-3 py-1 bg-purple-900 border border-purple-700 rounded-full text-xs text-purple-300 font-medium">
                        {selectedCampaignGroups.length} Group{selectedCampaignGroups.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {selectedCampaigns.length > 0 && (
                      <span className="px-3 py-1 bg-emerald-900 border border-emerald-700 rounded-full text-xs text-emerald-300 font-medium">
                        {selectedCampaigns.length} Campaign{selectedCampaigns.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {selectedAds.length > 0 && (
                      <span className="px-3 py-1 bg-orange-900 border border-orange-700 rounded-full text-xs text-orange-300 font-medium">
                        {selectedAds.length} Ad{selectedAds.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="bg-[#0f1f3d] rounded-xl p-4 mb-6 border border-[#1e3a5f] no-print">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Current Period</p>
                        <DateRangePicker value={currentRange} onChange={setCurrentRange} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Compare Period</p>
                        <DateRangePicker value={previousRange} onChange={setPreviousRange} />
                      </div>
                      <div className="ml-auto">
                        <button onClick={loadAnalytics} disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="hidden print:block mb-6">
                    <h2 className="text-xl font-bold text-white">LinkedIn Campaign Report</h2>
                    <p className="text-slate-400 text-sm">Period: {currentRange.start} to {currentRange.end} | Compare: {previousRange.start} to {previousRange.end}</p>
                  </div>

                  {/* ── Objective Tabs ── */}
                  <div className="bg-[#0f1f3d] rounded-xl border border-[#1e3a5f] mb-6 overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-[#1e3a5f]">
                      {OBJECTIVE_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeObjectiveTab === tab.id;
                        // Count campaigns for this tab
                        const count = tab.types === null
                          ? (reportData?.topCampaigns?.length || 0)
                          : (reportData?.topCampaigns || []).filter(c => {
                              const obj = campaignObjectiveMap[String(c.id)] || '';
                              return tab.types.some(t => obj.includes(t));
                            }).length;

                        const activeColors = {
                          all:        'border-blue-500    text-blue-400    bg-blue-950/40',
                          engagement: 'border-yellow-500  text-yellow-400  bg-yellow-950/40',
                          leads:      'border-purple-500  text-purple-400  bg-purple-950/40',
                          video:      'border-rose-500    text-rose-400    bg-rose-950/40',
                          website:    'border-emerald-500 text-emerald-400 bg-emerald-950/40',
                        };

                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveObjectiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                              isActive
                                ? `${activeColors[tab.id]} border-b-2`
                                : 'border-transparent text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {count > 0 && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                isActive ? 'bg-[#1e3a5f] text-white' : 'bg-[#1e3a5f] text-slate-400'
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Campaign Performance Metrics */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-white mb-6">Campaign Performance</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {visibleMetrics.map(metric => (
                          <MetricCard key={metric.key} label={metric.label}
                            current={reportData.current[metric.key]}
                            previous={reportData.previous[metric.key]}
                            format={metric.format} icon={metric.icon} prefix={metric.prefix} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Campaigns — filtered by active tab */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <TopPerformingBlock
                      title={activeObjectiveTab === 'all' ? 'Top Campaigns' : `Top ${activeTabConfig.label} Campaigns`}
                      items={filteredTopCampaigns}
                      accountId={primaryAccountId} type="campaign" nameMap={campaignNameMap} />
                  </div>
                  {reportData.topAds && reportData.topAds.length > 0 && (
                    <div className="mb-6">
                      <TopPerformingBlock title="Top Performing Ads" items={reportData.topAds}
                        accountId={primaryAccountId} type="ad" nameMap={adNameMap} />
                    </div>
                  )}

                  <BudgetPacingCard pacing={reportData.budgetPacing}
                    manualBudget={manualBudget} onBudgetChange={setManualBudget}
                    campaignStart={campaignStart} campaignEnd={campaignEnd}
                    onCampaignStartChange={setCampaignStart} onCampaignEndChange={setCampaignEnd} />

                  <FXCalculatorBlock reportData={reportData} currentRange={currentRange} />
                </>
              )}
            </div>
          </div>

          <AIReportModal
            show={showReport}
            onClose={() => setShowReport(false)}
            generatingReport={generatingReport}
            reportData={reportData}
            reportResult={reportResult}
            currentRange={currentRange}
            previousRange={previousRange}
            campaignNameMap={campaignNameMap}
          />
        </div>
        }

        {/* ── Developer Password Modal ── */}
        {showDevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.85)'}}>
            <div className="rounded-2xl border border-[#1e3a5f] p-8 w-full max-w-sm shadow-2xl" style={{background:'#0f1f3d'}}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#0d1b2e',border:'1px solid #444'}}>
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Developer Access</div>
                  <div className="text-xs text-slate-500 mt-0.5">Campaign Manager is restricted</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 mb-4">
                Enter the developer password to access the Campaign Manager. Contact your administrator if you need access.
              </div>

              <input
                type="password"
                placeholder="Enter developer password"
                value={devPassword}
                onChange={e => { setDevPassword(e.target.value); setDevPassErr(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (devPassword === (process.env.NEXT_PUBLIC_DEV_PASSWORD || 'tlm-dev-2026')) {
                      setDevUnlocked(true);
                      setActiveMainTab('dashboard');
                      setShowDevModal(false);
                      setDevPassword('');
                    } else {
                      setDevPassErr('Incorrect password.');
                    }
                  }
                }}
                autoFocus
                className="w-full px-4 py-3 rounded-lg border text-sm text-white font-mono focus:outline-none mb-2"
                style={{background:'#0d1b2e',borderColor: devPassErr ? '#ef4444' : '#374151'}}
              />
              {devPassErr && <p className="text-xs text-red-400 mb-3">{devPassErr}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    if (devPassword === (process.env.NEXT_PUBLIC_DEV_PASSWORD || 'tlm-dev-2026')) {
                      setDevUnlocked(true);
                      setActiveMainTab('dashboard');
                      setShowDevModal(false);
                      setDevPassword('');
                    } else {
                      setDevPassErr('Incorrect password.');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors"
                  style={{background:'#F6DC4E',color:'#272828'}}>
                  Unlock
                </button>
                <button
                  onClick={() => { setShowDevModal(false); setDevPassword(''); setDevPassErr(''); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[#1e3a5f] text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                  Cancel
                </button>
              </div>

              {devUnlocked && (
                <button
                  onClick={() => { setDevUnlocked(false); setShowDevModal(false); if (activeMainTab === 'dashboard') setActiveMainTab('report'); }}
                  className="w-full mt-3 text-xs text-slate-600 hover:text-red-400 transition-colors text-center">
                  Lock Campaign Manager
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetricCard({ label, current, previous, format, icon: Icon, prefix = '' }) {
  const change = previous > 0 ? ((current - previous) / previous * 100) : 0;
  const isPositive = change >= 0;

  function formatValue(val) {
    if (format === 'decimal') return `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (format === 'percent') return `${val.toFixed(2)}%`;
    return `${prefix}${val.toLocaleString()}`;
  }

  return (
    <div className="bg-[#1e3a5f]/50 rounded-lg p-4 border border-[#2a4a6e]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{formatValue(current)}</div>
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}% vs previous
      </div>
    </div>
  );
}

function BudgetPacingCard({ pacing, manualBudget, onBudgetChange, campaignStart, campaignEnd, onCampaignStartChange, onCampaignEndChange }) {
  if (!pacing) return null;
  const budget = parseFloat(manualBudget) || 0;
  const pacingPercent = budget > 0 ? Math.min((pacing.spent / budget * 100), 100).toFixed(2) : null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0].replace(/-/g, '/');

  let daysElapsed = null, daysTotal = null;
  if (campaignStart && campaignEnd) {
    const start = new Date(campaignStart);
    const end = new Date(campaignEnd);
    daysTotal = Math.ceil((end - start) / 86400000) + 1;
    daysElapsed = Math.min(Math.ceil((today - start) / 86400000), daysTotal);
  }

  return (
    <div className="bg-[#0f1f3d] rounded-xl p-6 border border-[#1e3a5f]">
      <h3 className="text-lg font-bold text-white mb-6">Budgeting and Pacing</h3>
      <div className="grid grid-cols-2 gap-6">

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Budget</p>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 mb-1">Current Spent</p>
              <p className="text-2xl font-bold text-slate-900">
                R {pacing.spent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pacing</p>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 mb-1">Date Pacing</p>
              <p className={`text-2xl font-bold ${pacingPercent ? (parseFloat(pacingPercent) > 90 ? 'text-red-500' : parseFloat(pacingPercent) > 70 ? 'text-yellow-500' : 'text-slate-900') : 'text-slate-900'}`}>
                {pacingPercent ? `${pacingPercent}%` : '-'}
              </p>
              <div className="no-print mt-3 space-y-1">
                <p className="text-xs text-slate-400">Manual Budget (R)</p>
                <input type="number" placeholder="Enter total budget..." value={manualBudget}
                  onChange={e => onBudgetChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Campaign Duration</p>
          <div className="border-t border-slate-100 pt-3 space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Duration</p>
              <p className="text-sm font-bold text-slate-900">
                {campaignStart && campaignEnd
                  ? `${campaignStart.replace(/-/g, '/')} - ${campaignEnd.replace(/-/g, '/')}`
                  : <span className="text-sm text-slate-400 font-normal">Set dates below</span>}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 mb-1">Current Date</p>
              <p className="text-sm font-bold text-slate-900">{todayStr}</p>
            </div>
            {daysTotal !== null && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400 mb-1">Progress</p>
                <p className="text-sm font-bold text-slate-900">{daysElapsed}/{daysTotal} days</p>
              </div>
            )}
            <div className="no-print border-t border-slate-100 pt-3 space-y-2">
              <div>
                <p className="text-xs text-slate-400 mb-1">Campaign Start Date</p>
                <input type="date" value={campaignStart || ''} onChange={e => onCampaignStartChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Campaign End Date</p>
                <input type="date" value={campaignEnd || ''} onChange={e => onCampaignEndChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1f3d'}}>
      <div className="text-center">
        <svg width="48" height="48" viewBox="0 0 400 400" fill="none" className="mx-auto mb-6 animate-pulse">
          <rect width="400" height="400" fill="#0f1f3d"/>
          <path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/>
          <path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/>
          <path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/>
        </svg>
        <p className="text-white font-bold text-lg tracking-wide">Turn Left Media</p>
        <p className="text-slate-400 text-sm mt-1">Loading your campaigns...</p>
      </div>
    </div>
  );
}

function SignInScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1f3d'}}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <svg width="56" height="56" viewBox="0 0 400 400" fill="none" className="mb-5">
            <rect width="400" height="400" fill="#0f1f3d"/>
            <path d="M60 120 L60 80 L200 80 L310 200 L310 240 L280 240 L280 215 L175 95 L95 95 L95 120 Z" fill="white"/>
            <path d="M130 155 L130 320 L165 320 L165 155 Z" fill="white"/>
            <path d="M200 200 L340 200 L340 320 L310 320 L310 235 L200 235 Z" fill="white"/>
          </svg>
          <h1 className="text-2xl font-bold text-white tracking-wide">Turn Left Media</h1>
          <p className="text-slate-400 text-sm mt-1">LinkedIn Campaign Platform</p>
        </div>
        <div className="bg-[#0f1f3d] rounded-2xl border border-[#1e3a5f] p-8">
          <h2 className="text-lg font-bold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-6">Connect your LinkedIn account to continue</p>
          <button onClick={() => signIn('linkedin')}
            className="w-full bg-yellow-400 text-slate-900 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Sign in with LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}