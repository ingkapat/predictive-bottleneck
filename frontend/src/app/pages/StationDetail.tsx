import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { stations } from '../data';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, CartesianAxis, Cell
} from 'recharts';
import { 
  ArrowLeft, Activity, Server, Clock, Hash, CheckCircle2, 
  AlertCircle, BarChart2, Zap, Settings, ShieldAlert, Cpu
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StationDetail() {
  const { id } = useParams();
  const [isComparing, setIsComparing] = useState(false);
  
  const station = stations.find(s => s.id === id) || stations[0];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'yellow': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'green': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'red': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'yellow': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'green': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: return <Settings className="w-5 h-5 text-slate-500" />;
    }
  };

  // Prepare comparison data
  const comparisonData = stations.map(s => ({
    name: s.name.split(' (')[0],
    queue: s.currentQueue,
    utilization: s.utilization,
    predictedQueue: s.predictedQueue
  }));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">{station.name.split(' (')[0]}</h1>
              <span className={cn("px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded border flex items-center gap-1.5", getStatusColor(station.status))}>
                {getStatusIcon(station.status)}
                {station.status} STATUS
              </span>
            </div>
            <p className="text-slate-400 text-sm">{station.name.split(' (')[1]?.replace(')', '') || 'Machine Analytics'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsComparing(!isComparing)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border",
              isComparing 
                ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            )}
          >
            <BarChart2 className="w-4 h-4" />
            {isComparing ? 'Close Comparison' : 'Compare Stations'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={cn("grid gap-6 transition-all", isComparing ? "lg:grid-cols-12" : "grid-cols-1")}>
        
        {/* Detail View */}
        <div className={cn("flex flex-col gap-6", isComparing ? "lg:col-span-7" : "")}>
          
          {/* Metrics Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg industrial-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Time Index</p>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xl font-mono text-white">{(new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <p className="text-xs text-slate-500 mt-1">Live updates active</p>
            </div>
            
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg industrial-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Machine ID</p>
                <Hash className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-mono text-white">{station.machineId}</p>
              <p className="text-xs text-slate-500 mt-1">Hardware identifier</p>
            </div>
            
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg relative overflow-hidden industrial-card">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-500/5 rounded-tl-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Block time</p>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <p className="text-3xl font-mono font-semibold text-blue-400 leading-none glow-text-blue">{station.currentQueue}</p>
                <span className="text-sm text-slate-500 mb-0.5">units</span>
              </div>
              <p className="text-xs text-blue-400/70 mt-2 flex items-center gap-1">
                Predicted: {station.predictedQueue} units <Zap className="w-3 h-3" />
              </p>
            </div>
            
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg relative overflow-hidden industrial-card">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-orange-500/5 rounded-tl-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Starved time</p>
                <Activity className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <p className="text-3xl font-mono font-semibold text-orange-400 leading-none">{station.utilization}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 mt-3">
                <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${station.utilization}` }}></div>
              </div>
            </div>
          </div>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Block Time Chart */}
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-5 shadow-lg flex flex-col industrial-card">
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" /> Block time vs time
              </h3>
              <div className="w-full flex-1 min-h-[250px]" style={{ minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <AreaChart data={station.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#475569" 
                      fontSize={11} 
                      tickMargin={10} 
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={11} 
                      tickFormatter={(value) => `${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="queue" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorQueue)" 
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Starved Time Chart */}
            <div className="bg-[#121827]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-5 shadow-lg flex flex-col industrial-card">
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Starved time vs time
              </h3>
              <div className="w-full flex-1 min-h-[250px]" style={{ minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <LineChart data={station.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#475569" 
                      fontSize={11} 
                      tickMargin={10} 
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={11} 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                      itemStyle={{ color: '#fb923c' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="utilization" 
                      stroke="#fb923c" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: '#fb923c', stroke: '#0f172a', strokeWidth: 2 }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        </div>

        {/* Comparison Panel */}
        {isComparing && (
          <div className="lg:col-span-5 bg-[#0f1423] border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)] rounded-xl p-5 shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-300 industrial-card">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" /> Factory Station Comparison
              </h3>
            </div>
            
            <div className="flex flex-col gap-8 flex-1">
              {/* Block Time Comparison */}
              <div className="flex-1 min-h-[250px] flex flex-col">
                <h4 className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-3 h-3" /> Block time (Current vs Predicted)
                </h4>
                <div className="flex-1 w-full min-h-[250px]" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="queue" name="Current Block time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="predictedQueue" name="Predicted Block time" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Starved Time Comparison */}
              <div className="flex-1 min-h-[200px] flex flex-col">
                <h4 className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Starved time Rate
                </h4>
                <div className="flex-1 w-full min-h-[250px]" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={80} tickMargin={5} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                        formatter={(value) => [`${value}`, 'Starved time']}
                      />
                      <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.utilization > 90 ? '#ef4444' : entry.utilization > 75 ? '#fb923c' : '#10b981'} />
                        ))}
                      </Bar>
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
