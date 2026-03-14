import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchDashboard, type DashboardData, type Station } from '../data';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Activity, Server, Cpu, ArrowUpRight, ShieldAlert, Zap, Factory, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'red':    return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'yellow': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'green':  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    default:       return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'red':    return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    case 'yellow': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
    case 'green':  return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    default:       return 'bg-slate-500';
  }
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());

  const load = async () => {
    try {
      setError(null);
      const d = await fetchDashboard();
      setData(d);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Cannot connect to backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const dataInterval = setInterval(load, 15 * 60 * 1000); // refresh every 15 min
    const clockInterval = setInterval(() => setNow(new Date()), 1000); // clock ticks every 1s
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Loading factory data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-white font-semibold mb-2">Backend Offline</p>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  const sortedStations = [...data.stations].sort((a, b) => b.riskScore - a.riskScore);
  const currentBN  = data.stations.find(s => s.id === data.currentBottleneck)   || data.stations[0];
  const predictedBN = data.stations.find(s => s.id === data.predictedBottleneck) || data.stations[0];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <div className="flex items-center gap-3 text-blue-400 mb-1">
            <Factory className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Smart Factory Dashboard</h1>
          </div>
          <p className="text-slate-400 text-sm tracking-wide uppercase">
            Predictive Bottleneck Detector • Window {data.windowIndex.toLocaleString()} / {data.totalWindows.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4 bg-[#111827] px-4 py-2 rounded-lg border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">System Online</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className="text-xs text-slate-400 font-mono font-bold text-white">{now.toLocaleTimeString()}</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className="text-xs text-slate-500 font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Current & Predicted Bottleneck */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">

          {/* Current Bottleneck */}
          <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-[#1c1314] to-[#0f0a0a] p-6 shadow-lg shadow-red-900/10 industrial-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-red-100">Current Bottleneck</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-sm text-red-400/70 uppercase tracking-wider mb-1">Station Name</p>
                  <Link to={`/station/${currentBN.machineKey}`} className="text-2xl font-bold text-white hover:text-red-300 transition-colors inline-flex items-center gap-2">
                    {currentBN.machineKey}
                    <ArrowUpRight className="w-5 h-5 opacity-50" />
                  </Link>
                  <p className="text-xs text-slate-500 mt-1">{currentBN.name.split('(')[1]?.replace(')', '')}</p>
                </div>
                <div className="mt-4 bg-black/40 rounded-lg p-3 border border-red-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Bottleneck Score
                  </p>
                  <p className="text-2xl font-mono text-red-400 font-semibold glow-text-red">{currentBN.riskScore.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col justify-end gap-3">
                <div className="bg-black/40 rounded-lg p-3 border border-red-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Server className="w-3 h-3" /> Blocked Time
                  </p>
                  <p className="text-2xl font-mono text-red-400 font-semibold glow-text-red">
                    {currentBN.currentQueue} <span className="text-sm text-slate-500">min</span>
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-red-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Starved Time
                  </p>
                  <p className="text-2xl font-mono text-red-400 font-semibold glow-text-red">
                    {currentBN.starvedMin} <span className="text-sm text-slate-500">min</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Predicted Bottleneck */}
          <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0d1624] to-[#0a0f18] p-6 shadow-lg shadow-blue-900/10 industrial-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-blue-100">
                  Predicted Bottleneck <span className="text-sm font-normal text-blue-400/60 ml-2">(Next 4h)</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                <ShieldAlert className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-blue-300">
                  Gap: {data.confidenceGap.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-sm text-blue-400/70 uppercase tracking-wider mb-1">AI Prediction</p>
                  <Link to={`/station/${predictedBN.machineKey}`} className="text-2xl font-bold text-white hover:text-blue-300 transition-colors inline-flex items-center gap-2">
                    {predictedBN.machineKey}
                    <ArrowUpRight className="w-5 h-5 opacity-50" />
                  </Link>
                  <p className="text-xs text-slate-500 mt-1">{predictedBN.name.split('(')[1]?.replace(')', '')}</p>
                </div>
                <div className="mt-4 bg-black/40 rounded-lg p-3 border border-blue-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-blue-400" /> Bottleneck Score
                  </p>
                  <p className="text-2xl font-mono text-blue-400 font-semibold glow-text-blue">{predictedBN.riskScore.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col justify-end gap-3">
                <div className="bg-black/40 rounded-lg p-3 border border-blue-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Blocked Time
                  </p>
                  <p className="text-2xl font-mono text-blue-400 font-semibold glow-text-blue">
                    {predictedBN.predictedQueue} <span className="text-sm text-slate-500">min</span>
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-blue-900/30">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Starved Time
                  </p>
                  <p className="text-2xl font-mono text-blue-400 font-semibold glow-text-blue">
                    {predictedBN.starvedMin} <span className="text-sm text-slate-500">min</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottleneck Risk Ranking Table */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800/60 bg-[#121827]/80 backdrop-blur-sm shadow-xl p-6 industrial-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Bottleneck Risk Ranking
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 px-4 font-medium">Rank</th>
                  <th className="pb-3 px-4 font-medium">Station</th>
                  <th className="pb-3 px-4 font-medium text-right">Blocked (min)</th>
                  <th className="pb-3 px-4 font-medium text-right">Starved (min)</th>
                  <th className="pb-3 px-4 font-medium text-right">Score</th>
                  <th className="pb-3 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedStations.map((station, index) => (
                  <tr key={station.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4 text-slate-500 font-mono text-sm">#{index + 1}</td>
                    <td className="py-4 px-4">
                      <Link to={`/station/${station.machineKey}`} className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors block">
                        {station.name.split('(')[0].trim()}
                      </Link>
                      <span className="text-xs text-slate-500 font-mono">{station.machineId}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-300">{station.currentQueue}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-300">{station.starvedMin}</td>
                    <td className="py-4 px-4 text-right font-mono text-amber-400 font-semibold">{station.riskScore.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", getStatusColor(station.status))}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(station.status))}></span>
                        {station.stateLabel.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Factory Overview Grid */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800/60 bg-[#121827]/80 backdrop-blur-sm shadow-xl p-6 flex flex-col industrial-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-400" />
              Factory Overview
            </h2>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-3">
            {data.stations.map(station => (
              <Link
                key={station.id}
                to={`/station/${station.machineKey}`}
                className="block p-3 rounded-lg border border-slate-800/80 bg-[#0d1320] hover:bg-[#151c2d] hover:border-slate-700 transition-all group relative overflow-hidden"
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-80", getStatusDot(station.status))}></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <div>
                    <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                      {station.name.split('(')[0].trim()}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{station.machineId}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded border", getStatusColor(station.status))}>
                    {station.machineKey}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3 mt-1 pl-2">
                  <div className="flex-1 bg-black/30 rounded-lg p-2 border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Blocked</p>
                    <div className="flex justify-between items-end">
                      <p className="text-base font-mono text-white leading-none">{station.currentQueue} <span className="text-xs text-slate-500">min</span></p>
                      <div className="h-6 w-14 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={station.chartData.slice(-10)}>
                            <Line type="monotone" dataKey="blocked_min"
                              stroke={station.status === 'red' ? '#ef4444' : station.status === 'yellow' ? '#f59e0b' : '#10b981'}
                              strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-black/30 rounded-lg p-2 border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Starved</p>
                    <div className="flex justify-between items-end">
                      <p className="text-base font-mono text-white leading-none">{station.starvedMin} <span className="text-xs text-slate-500">min</span></p>
                      <div className="h-6 w-14 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={station.chartData.slice(-10)}>
                            <Line type="monotone" dataKey="starved_min" stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
