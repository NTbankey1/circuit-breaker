import React, { useState, useEffect } from 'react';
import { Download, Package, Clock, Sparkles, Truck, TrendingUp, AlertCircle, RefreshCw, BarChart3, Activity, Zap, ShieldCheck, ZapOff, Globe, Bell, Map as MapIcon, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api, Stats, Incident } from '../services/api';

const qualityMetrics = [
  { subject: 'Speed', A: 120, fullMark: 150 },
  { subject: 'Accuracy', A: 98, fullMark: 150 },
  { subject: 'Reliability', A: 86, fullMark: 150 },
  { subject: 'Capacity', A: 99, fullMark: 150 },
  { subject: 'Cost', A: 85, fullMark: 150 },
];

const featureImportance = [
  { name: 'Distance (km)', value: 0.45 },
  { name: 'Traffic (0-3)', value: 0.30 },
  { name: 'Stops', value: 0.15 },
  { name: 'Time (cyclic)', value: 0.10 },
];

const chartData = [
  { name: 'T2', volume: 60, efficiency: 40 },
  { name: 'T3', volume: 70, efficiency: 55 },
  { name: 'T4', volume: 65, efficiency: 45 },
  { name: 'T5', volume: 85, efficiency: 70 },
  { name: 'T6', volume: 90, efficiency: 85 },
  { name: 'T7', volume: 75, efficiency: 60 },
  { name: 'CN', volume: 95, efficiency: 90 },
];

export const Dashboard: React.FC = () => {
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [incidents,   setIncidents]   = useState<Incident[]>([]);
  const [etaResult,   setEtaResult]   = useState<any>(null);
  const [isLoadingETA, setIsLoadingETA] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [liveLog,     setLiveLog]     = useState<string[]>([]);

  const loadData = async () => {
    setIsLoadingStats(true);
    try {
      const [s, inc] = await Promise.all([api.getStats(), api.getIncidents()]);
      setStats(s); setIncidents(inc);
    } catch { /* connection error */ }
    finally { setIsLoadingStats(false); }
  };
  
  useEffect(() => { 
    loadData();
    const interval = setInterval(() => {
       const msgs = [
          "Inbound: New order #ORD-"+Math.floor(Math.random()*9000),
          "Shipper SHP-"+Math.floor(Math.random()*90)+" updated GPS",
          "Recalculating A* paths for Cluster 4",
          "Weather alert: Light rain in Dist 7",
          "System Sync: DB cluster healthy"
       ];
       setLiveLog(prev => [msgs[Math.floor(Math.random()*msgs.length)], ...prev.slice(0, 4)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const testPredict = async () => {
    setIsLoadingETA(true);
    try {
      const res = await api.predictETA({
        order_lat: 10.7769, order_lng: 106.7009,
        warehouse_lat: 10.8231, warehouse_lng: 106.6297,
        traffic_level: 3, number_of_stops: 4,
      });
      setEtaResult(res);
    } catch { /* fallback */ }
    finally { setIsLoadingETA(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-[1600px] mx-auto bg-background min-h-full">
      
      {/* Header with Navigation Breadcrumbs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-12 gap-8 border-b border-outline-variant pb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-mono rounded-full font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM_STABLE_HCM
             </div>
             <span className="text-[10px] font-mono tracking-widest text-outline uppercase">/ analytics / core_intelligence</span>
          </div>
          <h1 className="text-6xl xl:text-7xl font-serif italic text-on-surface leading-none mb-4 tracking-tighter">Mission Intelligence</h1>
          <p className="text-[11px] uppercase tracking-[0.4em] text-outline font-mono flex items-center gap-3 opacity-60">
             <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-amber-400' : 'bg-outline-variant'}`} />)}
             </div>
             LogiSense AI · Neural Fleet Orchestration
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full xl:w-auto items-end">
           {/* Live Event Ticker */}
           <div className="hidden sm:flex flex-col bg-surface-container-low/30 border border-outline-variant px-6 py-4 rounded-sm min-w-[340px] shadow-sm relative overflow-hidden group">
              <div className="absolute left-0 top-0 w-1 h-full bg-on-surface" />
              <AnimatePresence mode="wait">
                 <motion.p key={liveLog[0]} initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }}
                   className="text-[9px] font-mono text-on-surface uppercase tracking-widest truncate font-bold">
                    {liveLog[0] || "Awaiting telemetry data..."}
                 </motion.p>
              </AnimatePresence>
              <div className="text-[7px] font-mono text-outline uppercase tracking-widest mt-1 opacity-40">Live search stream active</div>
           </div>
           <div className="flex gap-3">
              <button onClick={loadData} className="px-6 py-4 border border-outline-variant rounded-sm hover:bg-surface-container-low transition-all text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 group">
                 <RefreshCw size={14} className={`${isLoadingStats ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} /> Sync
              </button>
              <Button variant="primary" className="px-10 py-4 shadow-2xl font-bold tracking-[0.2em] text-[10px] uppercase">
                 <Download size={15} /> Intelligence Report
              </Button>
           </div>
        </div>
      </div>

      {/* Hero Layout: Throughput vs Intelligence */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 mb-10">
        
        {/* Main Area Chart */}
        <Card className="xl:col-span-8 p-0 overflow-hidden border-none shadow-2xl bg-surface-container-lowest">
           <div className="p-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/10">
              <div>
                 <h3 className="text-3xl font-serif italic text-on-surface">Fleet Throughput</h3>
                 <p className="text-[10px] font-mono uppercase text-outline tracking-widest mt-1">Global Delivery Volumetrics</p>
              </div>
           </div>
           <div className="p-8 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorHero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ border: 'none', borderRadius: '4px', shadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="volume" stroke="#1A1A1A" strokeWidth={3} fill="url(#colorHero)" activeDot={{ r: 8, fill: '#1A1A1A' }} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

        {/* Feature Importance Card */}
        <Card className="xl:col-span-4 p-8 border-none shadow-2xl bg-surface-container-lowest flex flex-col group">
           <div className="w-full mb-8">
              <h3 className="text-2xl font-serif italic text-on-surface">AdaBoost Heuristics</h3>
              <p className="text-[10px] font-mono uppercase text-outline tracking-widest mt-1">Feature weight distribution</p>
           </div>
           <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={featureImportance} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }} width={100} />
                    <Tooltip contentStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                       {featureImportance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#1A1A1A', '#444', '#777', '#AAA'][index]} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-auto pt-8 border-t border-outline-variant">
              <div className="flex justify-between items-center">
                 <div>
                    <p className="text-[9px] font-mono text-outline uppercase mb-1">Model Precision</p>
                    <p className="text-2xl font-serif italic text-on-surface">0.9841</p>
                 </div>
                 <ChevronRight size={24} className="text-outline opacity-20" />
              </div>
           </div>
        </Card>
      </div>

      {/* Global Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
         {[
            { label: 'System Volume', value: stats?.total_deliveries || '0', icon: Package, delta: '+12%', color: 'border-l-blue-500' },
            { label: 'SLA Reliability', value: (stats?.on_time_rate || '0') + '%', icon: ShieldCheck, delta: 'Stable', color: 'border-l-emerald-500' },
            { label: 'Avg Latency', value: (stats?.avg_delivery_minutes || '0') + 'm', icon: Clock, delta: '-4.2m', color: 'border-l-amber-500' },
            { label: 'Active Shippers', value: stats?.idle_shippers || '0', icon: Truck, delta: 'Online', color: 'border-l-violet-500' },
         ].map((kpi, i) => (
           <Card key={i} className={`p-8 border-none border-l-4 shadow-xl group transition-all hover:-translate-y-1 ${kpi.color}`}>
              <div className="flex justify-between items-center mb-8">
                 <div className="p-3 bg-surface-container-low rounded-sm group-hover:bg-on-surface group-hover:text-white transition-all">
                    <kpi.icon size={20} />
                 </div>
                 <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">{kpi.delta}</span>
              </div>
              <p className="text-[10px] font-mono uppercase text-outline tracking-widest mb-2">{kpi.label}</p>
              <h2 className="text-4xl font-serif italic text-on-surface">{isLoadingStats ? '…' : kpi.value}</h2>
           </Card>
         ))}
      </div>

      {/* Intelligence Probe Panel */}
      <Card className="bg-on-surface text-surface-container-lowest p-12 rounded-sm relative overflow-hidden shadow-2xl border-none">
         <div className="absolute right-0 top-0 w-2/3 h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
         <div className="flex flex-col lg:flex-row gap-16 items-center relative z-10">
            <div className="flex-1">
               <div className="flex items-center gap-5 mb-8">
                  <div className="bg-white/10 p-4 rounded-sm shadow-xl"><Sparkles size={32} className="text-amber-400" /></div>
                  <h2 className="text-5xl font-serif italic leading-none">Neural Prediction Engine</h2>
               </div>
               <p className="text-lg font-mono leading-relaxed opacity-60 max-w-3xl mb-12 uppercase tracking-wide text-xs">
                  Analyzing current fleet state across 5 districts. Adaptive AdaBoost model recalibrating every 500ms based on traffic patterns and agent historical performance.
               </p>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-white/10 pt-10">
                  {[
                     { l: 'Network Health', v: 'Excellent' },
                     { l: 'Engine Drifts', v: '0.002%' },
                     { l: 'Total Nodes', v: stats?.total_deliveries || '2k+' },
                     { l: 'API Latency', v: '14ms' },
                  ].map(m => (
                    <div key={m.l} className="flex flex-col">
                       <span className="text-[10px] font-mono uppercase opacity-40 mb-2 tracking-widest">{m.l}</span>
                       <span className="text-xl font-serif italic text-emerald-400">{m.v}</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="w-full lg:w-[420px]">
               <div className="bg-white/5 border border-white/10 p-10 rounded-sm shadow-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                     <span className="text-[11px] font-mono uppercase tracking-[0.4em] font-bold text-amber-400">Live Probe</span>
                     <button onClick={testPredict} disabled={isLoadingETA} className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] hover:text-white transition-all">
                        <Activity size={14} className={isLoadingETA ? 'animate-pulse' : ''} /> {isLoadingETA ? 'Processing' : 'Recalculate'}
                     </button>
                  </div>
                  <AnimatePresence mode="wait">
                     {etaResult ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                           <div className="text-7xl font-serif italic text-white mb-6 leading-none">{Number(etaResult.predicted_minutes).toFixed(1)}<span className="text-2xl ml-3 opacity-30">min</span></div>
                           <div className="flex items-center gap-4 py-4 px-6 bg-white/10 rounded-sm mb-8 border border-white/10">
                              <div className={`w-3 h-3 rounded-full ${etaResult.is_at_risk ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                              <span className="text-[12px] font-mono uppercase tracking-[0.3em] font-bold">Status: {etaResult.is_at_risk ? 'DELAY_RISK' : 'OPTIMAL'}</span>
                           </div>
                           <div className="flex justify-between text-[11px] font-mono opacity-40 uppercase tracking-[0.4em] border-t border-white/10 pt-8">
                              <span>Low: {etaResult.confidence_band[0].toFixed(1)}m</span>
                              <span>High: {etaResult.confidence_band[1].toFixed(1)}m</span>
                           </div>
                        </motion.div>
                     ) : (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 text-[11px] font-mono opacity-20 uppercase tracking-[0.5em] text-center px-10">
                           <ZapOff size={40} className="mb-6" />
                           Signal Standby
                        </div>
                     )}
                  </AnimatePresence>
               </div>
            </div>
         </div>
      </Card>

    </motion.div>
  );
};
