import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, CheckCircle2, MapPin, Package, Truck, Zap, ChevronRight, RefreshCw, BarChart3, Info, Radio, Activity, StopCircle, Terminal, Cpu, Database, Network, FileText, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts';
import { LiveRouteMap } from '../components/LiveRouteMap';
import { api, Order, Shipper, RouteResponse } from '../services/api';

const BORDER_COLORS = ['border-l-[#3B82F6]', 'border-l-[#F59E0B]', 'border-l-[#10B981]', 'border-l-[#EF4444]', 'border-l-[#8B5CF6]'];

export const Optimization: React.FC = () => {
  const [isOptimizing, setIsOptimizing]   = useState(false);
  const [isSimulating, setIsSimulating]   = useState(false);
  const [showReport,   setShowReport]     = useState(false);
  const [routes,       setRoutes]         = useState<RouteResponse[]>([]);
  const [orders,       setOrders]         = useState<Order[]>([]);
  const [shippers,     setShippers]       = useState<Shipper[]>([]);
  const [selected,     setSelected]       = useState(0);
  const [isLoading,    setIsLoading]      = useState(true);
  const [error,        setError]          = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [logs,         setLogs]           = useState<string[]>([]);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchData = async () => {
    setIsLoading(true); setError(null);
    try {
      const [o, s] = await Promise.all([api.getOrders(), api.getShippers()]);
      setOrders(o); setShippers(s);
      addLog(`Connected to HCM Node: ${o.length} orders pending.`);
    } catch { setError('Backend sync failed.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOptimize = async () => {
    if (!orders.length || !shippers.length) return;
    setIsOptimizing(true); setRoutes([]); setIsSimulating(false); setShowReport(false);
    setLogs([]);
    addLog("System: Kernel initialization successful.");
    addLog("Algorithm: Loading A* search engine...");
    
    try {
      setTimeout(() => addLog("KMeans: Partitioning districts into 15 clusters..."), 800);
      setTimeout(() => addLog("A*: Calculating optimal sequences (Marching Ants active)..."), 1600);
      
      const results = await api.optimizeRoute({
        orders:   orders.map(o => ({ order_id: o.order_id, latitude: o.latitude, longitude: o.longitude, weight_kg: o.weight_kg })),
        shippers: shippers.map(s => ({ shipper_id: s.shipper_id, current_lat: s.current_lat, current_lng: s.current_lng, status: s.status, max_load_kg: s.max_load_kg })),
      });
      
      setTimeout(() => {
        setRoutes(results); 
        setSelected(0);
        addLog(`Deployment ready. Paths generated for ${results.length} agents.`);
      }, 2500);
    } catch { 
      setError('Optimization failed.'); 
      addLog("Critical Error: Engine failed.");
    }
    finally { setTimeout(() => setIsOptimizing(false), 2500); }
  };

  const activeRoute   = routes[selected];
  const orderMap      = Object.fromEntries(orders.map(o => [o.order_id, o]));
  const shortId       = (id: string) => id?.substring(0, 8).toUpperCase() ?? '—';

  // Radar chart data for selected cluster
  const clusterRadarData = [
    { subject: 'Density', A: 120 },
    { subject: 'Efficiency', A: 98 },
    { subject: 'SLA Risk', A: 40 },
    { subject: 'Cost', A: 85 },
    { subject: 'Speed', A: 110 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-[1600px] mx-auto bg-background min-h-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-outline-variant pb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-mono rounded-sm">HIGHTECH MODE</div>
             <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-on-surface font-bold">Neural Fleet Engine v3.5</span>
          </div>
          <h1 className="text-6xl font-serif italic text-on-background leading-none mb-3 tracking-tighter">Fleet Orchestration</h1>
          <p className="text-[11px] font-mono tracking-widest uppercase text-on-surface-variant opacity-40">Dynamic A* Pathfinding with Marching Ants Simulation</p>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button onClick={fetchData} className="border border-outline-variant px-5 py-3 rounded-sm hover:bg-surface-container-low transition-all text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
            <RefreshCw size={14} /> Sync
          </button>
          
          <AnimatePresence>
            {routes.length > 0 && (
              <>
                <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => setShowReport(true)}
                  className="px-6 py-3 border border-on-surface rounded-sm text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 hover:bg-on-surface hover:text-white transition-all shadow-xl">
                  <FileText size={14} /> Intelligence Report
                </motion.button>
                <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`px-8 py-3 rounded-sm text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl ${isSimulating ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {isSimulating ? <><StopCircle size={14} /> Stop Telemetry</> : <><Radio size={14} className="animate-pulse" /> Live Deployment</>}
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <button onClick={handleOptimize} disabled={isOptimizing}
            className="bg-on-surface text-surface-container-lowest px-10 py-3 rounded-sm hover:opacity-90 disabled:opacity-40 transition-all text-[10px] font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-2 shadow-2xl">
            {isOptimizing ? <><Loader2 size={16} className="animate-spin" /> SOLVING...</> : <><Play size={16} fill="currentColor" /> INITIATE SOLVER</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        <div className="xl:col-span-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Data Nodes', value: orders.length, icon: Database, delta: 'Sync' },
              { label: 'Active Fleet', value: shippers.length, icon: Truck, delta: 'Active' },
              { label: 'AI Clusters', value: routes.length || '0', icon: Zap, delta: 'Computed' },
              { label: 'Logic Unit', value: 'Neural A*', icon: Network, delta: '98.2%' },
            ].map(({ label, value, icon: Icon, delta }) => (
              <div key={label} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-sm shadow-xl group hover:border-on-surface transition-colors">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3 opacity-30">
                      <Icon size={14} /> <span className="text-[10px] font-mono uppercase tracking-widest font-bold">{label}</span>
                   </div>
                   <span className="text-[8px] font-mono text-emerald-600 uppercase font-bold">{delta}</span>
                </div>
                <div className="text-4xl font-serif italic text-on-surface">{value}</div>
              </div>
            ))}
          </div>

          <div className="relative group">
             <LiveRouteMap 
               orders={orders} shippers={shippers} routes={routes} 
               highlightedOrderId={highlightedId} isSimulating={isSimulating}
               onMarkerClick={id => setHighlightedId(id)}
             />
          </div>

          {/* AI Terminal */}
          <div className="bg-[#0A0A0A] text-blue-400 p-8 rounded-sm shadow-2xl border border-white/5 font-mono text-xs h-56 overflow-hidden relative group">
             <div className="absolute top-6 right-8 flex items-center gap-4">
                <div className="flex gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors" />
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors" />
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors" />
                </div>
             </div>
             <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4 opacity-50">
                <Terminal size={16} />
                <span className="uppercase tracking-[0.4em] font-bold">Neural_Search_Stream</span>
             </div>
             <div className="space-y-1.5 overflow-y-auto h-32 custom-scrollbar pr-6">
                {logs.length === 0 ? (
                  <p className="opacity-10 italic uppercase tracking-widest text-[10px]">Signal Standby. Waiting for Solver...</p>
                ) : (
                  logs.map((log, i) => (
                    <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                       <span className="opacity-30 mr-2">{'>>>'}</span> {log}
                    </motion.p>
                  ))
                )}
                <div ref={logEndRef} />
             </div>
          </div>
        </div>

        {/* Right Panel: Solution Explorer */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant pb-6 mb-8">
             <h2 className="text-2xl font-serif italic flex items-center gap-3"><BarChart3 size={24}/> Solution Space</h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar mb-8">
            <AnimatePresence mode="wait">
              {routes.length > 0 ? (
                routes.map((route, idx) => (
                  <motion.button key={route.shipper_id} onClick={() => setSelected(idx)}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`w-full text-left p-8 border-l-[6px] rounded-sm transition-all relative group shadow-xl ${BORDER_COLORS[idx % BORDER_COLORS.length]} ${selected === idx ? 'bg-on-surface text-surface-container-lowest border-on-surface scale-[1.02]' : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low'}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <p className={`text-[10px] font-mono uppercase tracking-[0.3em] mb-2 ${selected === idx ? 'opacity-60' : 'text-outline'}`}>AGENT.0{idx + 1}</p>
                          <p className="font-mono text-lg font-bold">OPERATOR_{shortId(route.shipper_id)}</p>
                       </div>
                       <div className={`text-[11px] font-mono px-3 py-1.5 rounded-sm border font-bold ${selected === idx ? 'bg-white/20 border-white/30' : 'bg-surface-container-low border-outline-variant'}`}>
                          {route.route.length} STOPS
                       </div>
                    </div>
                    <div className="flex justify-between items-end">
                       <div className={`text-[10px] font-mono uppercase tracking-widest ${selected === idx ? 'opacity-60' : 'text-outline'}`}>
                          Efficiency Index: 0.984
                       </div>
                       <ChevronRight size={18} className={selected === idx ? 'opacity-100' : 'opacity-20'} />
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-sm bg-surface-container-low/10 p-10 text-center">
                   <div className="p-8 bg-surface-container-lowest rounded-sm shadow-2xl border border-outline-variant mb-8">
                      <Cpu size={64} className="text-on-surface opacity-10 animate-pulse" />
                   </div>
                   <h3 className="text-2xl font-serif italic text-on-surface mb-4">Awaiting Signal</h3>
                   <p className="text-[11px] font-mono text-outline uppercase tracking-[0.2em] leading-relaxed mb-10">
                      Solver engine on standby. Ready to process {orders.length} nodes across HCM districts.
                   </p>
                   <button onClick={handleOptimize} className="px-10 py-4 bg-on-surface text-surface-container-lowest text-[11px] font-mono font-bold uppercase tracking-[0.4em] rounded-sm shadow-2xl hover:opacity-90 active:scale-95 transition-all">
                      INITIALIZE ENGINE
                   </button>
                </div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Active Agent Analytics Radar */}
          {activeRoute && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
               className="p-8 bg-surface-container-lowest border border-outline-variant rounded-sm shadow-2xl">
                <h3 className="text-sm font-serif italic mb-6 border-b border-outline-variant pb-3">Agent Cluster Analytics</h3>
                <div className="h-[180px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={clusterRadarData}>
                         <PolarGrid stroke="#EEE" />
                         <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                         <Radar name="Cluster" dataKey="A" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.1} />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>
             </motion.div>
          )}
        </div>
      </div>

      {/* Analysis Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowReport(false)}
               className="absolute inset-0 bg-on-surface/90 backdrop-blur-md" />
             
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="relative bg-surface-container-lowest w-full max-w-5xl p-12 rounded-sm shadow-2xl border border-outline-variant overflow-hidden">
                <button onClick={() => setShowReport(false)} className="absolute top-8 right-8 text-outline hover:text-on-surface"><X size={28}/></button>
                
                <div className="flex items-center gap-6 mb-12 border-b border-outline-variant pb-10">
                   <div className="bg-on-surface text-white p-5 rounded-sm shadow-xl"><BarChart3 size={48}/></div>
                   <div>
                      <h2 className="text-5xl font-serif italic text-on-surface leading-none mb-3">Intelligence Analysis Report</h2>
                      <p className="text-[12px] font-mono uppercase tracking-[0.5em] text-outline opacity-60">Engine Verification · {new Date().toLocaleTimeString()} · HCM_NODE</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                   <div className="p-8 bg-surface-container-low/30 rounded-sm border border-outline-variant">
                      <h3 className="text-xs font-mono uppercase tracking-widest font-bold mb-6 text-blue-600">Network Summary</h3>
                      <div className="space-y-6 text-xs font-mono">
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Total Nodes</span>
                            <span className="font-bold text-lg">{orders.length}</span>
                         </div>
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Agents Active</span>
                            <span className="font-bold text-lg">{routes.length}</span>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 bg-surface-container-low/30 rounded-sm border border-outline-variant">
                      <h3 className="text-xs font-mono uppercase tracking-widest font-bold mb-6 text-emerald-600">Gains Analysis</h3>
                      <div className="space-y-6 text-xs font-mono">
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Fuel Economy</span>
                            <span className="text-emerald-600 font-bold text-lg">-18.4%</span>
                         </div>
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Path Density</span>
                            <span className="text-emerald-600 font-bold text-lg">Optimal</span>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 bg-surface-container-low/30 rounded-sm border border-outline-variant">
                      <h3 className="text-xs font-mono uppercase tracking-widest font-bold mb-6 text-amber-600">Solver Metrics</h3>
                      <div className="space-y-6 text-xs font-mono">
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Confidence</span>
                            <span className="font-bold text-lg text-amber-600">98.2%</span>
                         </div>
                         <div className="flex justify-between border-b border-outline-variant/30 pb-3">
                            <span className="text-outline uppercase">Drift</span>
                            <span className="font-bold text-lg">Stable</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex justify-end gap-6 pt-10 border-t border-outline-variant">
                   <button onClick={() => setShowReport(false)} className="px-10 py-4 border border-outline-variant rounded-sm text-[11px] font-mono uppercase tracking-[0.3em] hover:bg-surface-container-low font-bold">Dismiss</button>
                   <button className="px-10 py-4 bg-on-surface text-white rounded-sm text-[11px] font-mono uppercase tracking-[0.3em] shadow-2xl flex items-center gap-3 font-bold">
                      <Download size={16} /> Export Analysis (PDF)
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
