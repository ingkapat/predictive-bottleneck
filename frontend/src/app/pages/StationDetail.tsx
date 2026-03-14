import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { fetchStation, type StationDetailData } from '../data';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import {
  ArrowLeft, Activity, Server, Clock, Hash, CheckCircle2,
  AlertCircle, BarChart2, Zap, Settings, ShieldAlert, Cpu, RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StationDetail() {
  const { id } = useParams();
  const [data, setData]           = useState<StationDetailData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [historyN, setHistoryN]   = useState(50);
  const [now, setNow]             = useState<Date>(new Date());

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const d = await fetchStation(id, historyN);
      setData(d);
    } catch (e) {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, historyN]);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red':    return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'yellow': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'green':  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:       return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'red':    return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'yellow': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'green':  return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default:       return <Settings className="w-5 h-5 text-slate-500" />;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Loading station data...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-white font-semibold mb-2">Error</p>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Back to Dashboard</Link>
      </div>
    </div>
  );

  // comparison: bottleneck score current vs predicted
  const comparisonData = data.comparison.map(c => ({
    name:           c.machine,
    queue:          c.score,
    predictedQueue: (c as any).predictedScore ?? 0,
  }));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans p-4 md:p-8">

      {/* ── Header ── */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">{data.name.split(' (')[0]}</h1>
              <span className={cn('px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded border flex items-center gap-1.5', getStatusColor(data.status))}>
                {getStatusIcon(data.status)}
                {data.status} Status
              </span>
            </div>
            <p className="text-slate-400 text-sm">{data.name.split('(')[1]?.replace(')', '')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={historyN}
            onChange={e => setHistoryN(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2"
          >
            <option value={25}>Last 25 windows</option>
            <option value={50}>Last 50 windows</option>
            <option value={100}>Last 100 windows</option>
            <option value={200}>Last 200 windows</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsComparing(!isComparing)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border',
              isComparing
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            )}
          >
            <BarChart2 className="w-4 h-4" />
            {isComparing ? 'Close Comparison' : 'Compare Stations'}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className={cn('grid gap-6 transition-all', isComparing ? 'lg:grid-cols-12' : 'grid-cols-1')}>

        {/* Detail View */}
        <div className={cn('flex flex-col gap-6', isComparing ? 'lg:col-span-7' : '')}>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg industrial-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Time Index</p>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-mono text-emerald-400">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-xs text-slate-500 mt-1">Window #{data.windowIndex}</p>
            </div>
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg industrial-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Machine ID</p>
                <Hash className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-mono text-white">{data.machineId}</p>
              <p className="text-xs text-slate-500 mt-1">Hardware identifier</p>
            </div>
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg relative overflow-hidden industrial-card">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-500/5 rounded-tl-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Block Time</p>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <p className="text-3xl font-mono font-semibold text-blue-400 leading-none glow-text-blue">{data.currentQueue}</p>
                <span className="text-sm text-slate-500 mb-0.5">min</span>
              </div>
              <p className="text-xs text-blue-400/70 mt-2 flex items-center gap-1">
                Predicted: {data.predictedQueue} min <Zap className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg relative overflow-hidden industrial-card">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-orange-500/5 rounded-tl-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Starved Time</p>
                <Activity className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <p className="text-3xl font-mono font-semibold text-orange-400 leading-none">{data.starvedMin}</p>
                <span className="text-sm text-slate-500 mb-0.5">min</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Score: <span className="text-amber-400 font-mono">{data.riskScore.toFixed(3)}</span></p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Block Time Chart */}
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-5 shadow-lg flex flex-col industrial-card">
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" /> Block time vs time
              </h3>
              <div className="w-full flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#475569" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} itemStyle={{ color: '#60a5fa' }} />
                    <Area type="monotone" dataKey="blocked_min" name="Block Time (min)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorQueue)" isAnimationActive={true} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Starved Time Chart */}
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-5 shadow-lg flex flex-col industrial-card">
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Starved time vs time
              </h3>
              <div className="w-full flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#475569" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} itemStyle={{ color: '#fb923c' }} />
                    <Line type="monotone" dataKey="starved_min" name="Starved Time (min)" stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#fb923c', stroke: '#0f172a', strokeWidth: 2 }} isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Comparison Panel ── */}
        {isComparing && (
          <div className="lg:col-span-5 bg-[#0f1423] border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)] rounded-xl p-5 shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-300 industrial-card">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" /> Factory Station Comparison
              </h3>
            </div>
            <div className="flex flex-col gap-4 flex-1">

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block bg-blue-500"></span>
                  Current Bottleneck Score
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block bg-red-500"></span>
                  Predicted Bottleneck Score
                </span>
              </div>

              {/* Bottleneck Score Current vs Predicted */}
              <div className="flex-1 flex flex-col">
                <h4 className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Bottleneck Score (Current vs Predicted)
                </h4>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={3} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickMargin={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      />
                      <Bar dataKey="queue" name="Current Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="predictedQueue" name="Predicted Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
