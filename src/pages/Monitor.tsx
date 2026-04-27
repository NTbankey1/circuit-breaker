import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, RefreshCw, TrendingDown, TrendingUp, Zap, Radio } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, BarChart, Bar, Cell, ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

// ── Static model data ─────────────────────────────────────────────────────────
const etaVarianceData = [
  { time: '08:00', actual: 38, predicted: 40, error: -2 },
  { time: '09:00', actual: 52, predicted: 49, error: 3  },
  { time: '10:00', actual: 44, predicted: 46, error: -2 },
  { time: '11:00', actual: 61, predicted: 57, error: 4  },
  { time: '12:00', actual: 75, predicted: 70, error: 5  },
  { time: '13:00', actual: 68, predicted: 66, error: 2  },
  { time: '14:00', actual: 55, predicted: 54, error: 1  },
  { time: '15:00', actual: 48, predicted: 50, error: -2 },
  { time: '16:00', actual: 62, predicted: 59, error: 3  },
  { time: '17:00', actual: 82, predicted: 76, error: 6  },
  { time: '18:00', actual: 91, predicted: 85, error: 6  },
  { time: '19:00', actual: 70, predicted: 69, error: 1  },
];

const driftHistory = [
  { date: 'T2', psi: 0.04 }, { date: 'T3', psi: 0.06 }, { date: 'T4', psi: 0.09 },
  { date: 'T5', psi: 0.07 }, { date: 'T6', psi: 0.08 }, { date: 'T7', psi: 0.05 },
  { date: 'CN', psi: 0.08 },
];

const errorDistribution = [
  { bucket: '<-10', count: 2,  fill: '#EF4444' },
  { bucket: '-10~-5', count: 8, fill: '#F97316' },
  { bucket: '-5~0',  count: 45, fill: '#1A1A1A' },
  { bucket: '0~5',   count: 55, fill: '#1A1A1A' },
  { bucket: '5~10',  count: 18, fill: '#F97316' },
  { bucket: '>10',   count: 4,  fill: '#EF4444' },
];

const retrainLog = [
  { time: '02:00 hôm nay', status: 'success', mae: 4.2, samples: 1850, model: 'AdaBoost v3.1' },
  { time: '02:00 hôm qua', status: 'success', mae: 4.6, samples: 1800, model: 'AdaBoost v3.0' },
  { time: '02:00 T6',      status: 'success', mae: 5.1, samples: 1750, model: 'AdaBoost v2.9' },
  { time: '02:00 T5',      status: 'warning', mae: 6.2, samples: 1600, model: 'AdaBoost v2.8' },
];

// PSI gauge arc SVG
function PSIGauge({ value }: { value: number }) {
  const max = 0.25;
  const pct = Math.min(value / max, 1);
  const angle = -135 + pct * 270;
  const color = value < 0.1 ? '#10B981' : value < 0.2 ? '#F59E0B' : '#EF4444';
  const status = value < 0.1 ? 'Stable' : value < 0.2 ? 'Watch' : 'Alert';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 80" className="w-40 h-28">
        {/* Background arc */}
        <path d="M 15 75 A 45 45 0 1 1 105 75" fill="none" stroke="#E8E4DF" strokeWidth="8" strokeLinecap="round" />
        {/* Colored arc */}
        <path
          d="M 15 75 A 45 45 0 1 1 105 75"
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * 141.3} 141.3`}
          style={{ transition: 'stroke-dasharray 1.2s ease, stroke 0.5s ease' }}
        />
        {/* Needle */}
        <g transform={`rotate(${angle}, 60, 75)`}>
          <line x1="60" y1="75" x2="60" y2="35" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="60" cy="75" r="4" fill="#1A1A1A" />
        </g>
        {/* Labels */}
        <text x="12" y="85" fontSize="7" fill="#AAA" fontFamily="JetBrains Mono">0</text>
        <text x="95" y="85" fontSize="7" fill="#AAA" fontFamily="JetBrains Mono">0.25</text>
      </svg>
      <div className="text-center -mt-4">
        <div className="text-3xl font-serif italic" style={{ color }}>{value.toFixed(3)}</div>
        <div className="text-[9px] font-mono uppercase tracking-widest mt-1" style={{ color }}>{status}</div>
      </div>
    </div>
  );
}

export const Monitor: React.FC = () => {
  const [psi, setPsi] = useState(0.08);
  const [mae, setMae] = useState(4.2);
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainFlash, setRetrainFlash] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('vi-VN'));
      // Simulate small drift fluctuations
      setPsi(prev => Math.max(0.04, Math.min(0.18, prev + (Math.random() - 0.5) * 0.005)));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const handleRetrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      setIsRetraining(false);
      setRetrainFlash(true);
      setMae(prev => Math.max(3.8, prev - 0.1));
      setTimeout(() => setRetrainFlash(false), 2000);
    }, 3500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 md:p-8 max-w-[1600px] mx-auto bg-background min-h-full"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-outline-variant pb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono rounded-sm">LIVE</div>
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-on-surface-variant">{liveTime}</span>
          </div>
          <h1 className="text-6xl font-serif italic text-on-surface leading-none mb-3 tracking-tighter">Model Observatory</h1>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-on-surface-variant opacity-50">AdaBoost ETA Engine · Drift Monitoring & Performance Analytics</p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={isRetraining}
          className={`px-8 py-4 rounded-sm text-[10px] font-mono uppercase tracking-[0.3em] font-bold flex items-center gap-3 transition-all shadow-xl ${
            isRetraining
              ? 'bg-amber-500 text-white'
              : retrainFlash
              ? 'bg-emerald-600 text-white'
              : 'bg-on-surface text-white hover:opacity-90'
          }`}
        >
          {isRetraining
            ? <><Cpu size={14} className="animate-spin" /> Retraining...</>
            : retrainFlash
            ? <><CheckCircle2 size={14} /> Retrain Complete</>
            : <><RefreshCw size={14} /> Trigger Retrain</>}
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'PSI Score', value: psi.toFixed(3), status: psi < 0.1 ? 'Stable' : 'Watch', statusColor: psi < 0.1 ? 'text-emerald-600' : 'text-amber-600', icon: Activity },
          { label: 'MAE (7d)', value: `${mae}m`, status: '↓ Improving', statusColor: 'text-emerald-600', icon: TrendingDown },
          { label: 'Model Version', value: 'v3.1', status: 'AdaBoost · 200 Trees', statusColor: 'text-on-surface-variant opacity-60', icon: Cpu },
          { label: 'Next Retrain', value: '02:00', status: 'Scheduled', statusColor: 'text-blue-600', icon: Clock },
        ].map(({ label, value, status, statusColor, icon: Icon }) => (
          <div key={label} className="bg-surface-container-lowest border border-outline-variant p-8 rounded-sm shadow-xl group hover:border-on-surface transition-colors">
            <div className="flex justify-between items-start mb-6">
              <Icon size={16} className="text-outline group-hover:text-on-surface transition-colors" />
              <span className={`text-[9px] font-mono uppercase font-bold ${statusColor}`}>{status}</span>
            </div>
            <p className="text-[10px] font-mono uppercase text-outline tracking-widest mb-2">{label}</p>
            <p className="text-4xl font-serif italic text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">

        {/* ETA Actual vs Predicted */}
        <div className="xl:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl overflow-hidden">
          <div className="p-8 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif italic text-on-surface">ETA Variance — Actual vs Predicted</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-outline mt-1">Last 12 hours · Ho Chi Minh City Fleet</p>
            </div>
            <div className="flex gap-6 text-[10px] font-mono uppercase tracking-widest">
              <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-on-surface inline-block" /> Actual</span>
              <span className="flex items-center gap-2"><span className="w-4 border-t border-dashed border-on-surface opacity-40 inline-block" /> Predicted</span>
            </div>
          </div>
          <div className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={etaVarianceData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1A1A1A" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontFamily: 'JetBrains Mono' }} unit="m" />
                <Tooltip contentStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', border: 'none', borderRadius: 4 }} formatter={(v: any) => [`${v}m`]} />
                <Area type="monotone" dataKey="actual" stroke="#1A1A1A" strokeWidth={2.5} fill="url(#actualGrad)" dot={false} activeDot={{ r: 5, fill: '#1A1A1A' }} />
                <Line type="monotone" dataKey="predicted" stroke="#1A1A1A" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PSI Gauge */}
        <div className="xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl p-8 flex flex-col">
          <div className="mb-auto">
            <h2 className="text-xl font-serif italic text-on-surface mb-2">Drift Index (PSI)</h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-outline">Population Stability Index</p>
          </div>
          <div className="flex justify-center py-6">
            <PSIGauge value={psi} />
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-outline-variant pt-6 text-center">
            {[{ r: '< 0.10', l: 'Stable', c: 'text-emerald-600' }, { r: '0.10–0.20', l: 'Watch', c: 'text-amber-600' }, { r: '> 0.20', l: 'Retrain', c: 'text-red-600' }].map(x => (
              <div key={x.r}>
                <div className={`text-[9px] font-mono font-bold ${x.c}`}>{x.l}</div>
                <div className="text-[8px] font-mono text-outline mt-1">{x.r}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Error Distribution */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl p-8">
          <h2 className="text-xl font-serif italic text-on-surface mb-2">Error Distribution</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest text-outline mb-6">Prediction residuals (minutes)</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorDistribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', border: 'none', borderRadius: 4 }} />
                <ReferenceLine x="0~5" stroke="#1A1A1A" strokeDasharray="3 3" />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {errorDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retrain History */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl p-8">
          <h2 className="text-xl font-serif italic text-on-surface mb-2">Retrain History</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest text-outline mb-6">Scheduled at 02:00 daily</p>
          <div className="space-y-4">
            {retrainLog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-5 border border-outline-variant rounded-sm hover:bg-surface-container-low/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-xs font-mono text-on-surface font-bold">{entry.model}</p>
                    <p className="text-[9px] font-mono text-outline uppercase">{entry.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[9px] font-mono text-outline uppercase">MAE</p>
                    <p className="text-sm font-serif italic text-on-surface">{entry.mae}m</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-outline uppercase">Samples</p>
                    <p className="text-sm font-serif italic text-on-surface">{entry.samples.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
