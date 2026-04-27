import React, { useState } from 'react';
import { Cpu, GitMerge, ShieldAlert, Info, Save, RotateCcw, CheckCircle2, Database, Zap, Network, Activity, Lock, Bell, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SliderProps { label: string; sublabel: string; defaultVal: number; min: number; max: number; step: number; unit: string; }
const Slider: React.FC<SliderProps> = ({ label, sublabel, defaultVal, min, max, step, unit }) => {
  const [val, setVal] = useState(defaultVal);
  const pct = ((val - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface font-bold">{label}</p>
          <p className="text-[9px] font-mono text-outline mt-0.5">{sublabel}</p>
        </div>
        <span className="font-mono text-sm font-bold text-on-surface tabular-nums">{val}{unit}</span>
      </div>
      <div className="relative h-1.5 bg-outline-variant rounded-full">
        <div className="absolute h-full bg-on-surface rounded-full transition-all" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={val}
          onChange={e => setVal(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-on-surface rounded-full border-2 border-surface-container-lowest shadow-lg transition-all"
          style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
    </div>
  );
};

interface ToggleProps { label: string; desc: string; defaultOn?: boolean; accent?: string; }
const Toggle: React.FC<ToggleProps> = ({ label, desc, defaultOn = true, accent = 'bg-on-surface' }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <label onClick={() => setOn(p => !p)} className="flex items-center justify-between p-5 bg-surface-container-lowest border border-outline-variant rounded-sm cursor-pointer hover:border-on-surface transition-all group">
      <div className="flex-1 pr-6">
        <p className="text-sm font-serif italic text-on-surface mb-1">{label}</p>
        <p className="text-[9px] font-mono uppercase tracking-widest text-outline">{desc}</p>
      </div>
      <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${on ? accent : 'bg-outline-variant'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${on ? 'left-7' : 'left-1'}`} />
      </div>
    </label>
  );
};

const SYSTEM_HEALTH = [
  { label: 'Backend API',    status: 'online',   latency: '14ms', icon: Network },
  { label: 'PostgreSQL DB',  status: 'online',   latency: '3ms',  icon: Database },
  { label: 'Redis Cache',    status: 'online',   latency: '1ms',  icon: Zap },
  { label: 'ML Engine',      status: 'online',   latency: '22ms', icon: Cpu },
];

export const Settings: React.FC = () => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-outline-variant pb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-2 py-0.5 bg-violet-600 text-white text-[9px] font-mono rounded-sm">ADMIN</div>
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-outline">/ root / logistics / config</span>
          </div>
          <h1 className="text-6xl font-serif italic text-on-surface leading-none mb-3 tracking-tighter">System Configuration</h1>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-outline">
            ML Hyperparameters · Algorithm Heuristics · SLA Thresholds · Infrastructure
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 border border-outline-variant rounded-sm text-[10px] font-mono uppercase tracking-widest hover:bg-surface-container transition-all flex items-center gap-2">
            <RotateCcw size={13} /> Revert
          </button>
          <AnimatePresence mode="wait">
            <motion.button
              key={saved ? 'saved' : 'save'}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleSave}
              className={`px-8 py-3 rounded-sm text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 font-bold transition-all shadow-xl ${
                saved ? 'bg-emerald-600 text-white' : 'bg-on-surface text-white hover:opacity-90'
              }`}
            >
              {saved ? <><CheckCircle2 size={13} /> Deployed!</> : <><Save size={13} /> Deploy Config</>}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      {/* System Health Banner */}
      <div className="bg-on-surface text-surface-container-lowest rounded-sm p-8 mb-10 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06),transparent)] pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] opacity-40 mb-2">Infrastructure Status</p>
            <h2 className="text-3xl font-serif italic">All Systems Operational</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {SYSTEM_HEALTH.map(({ label, latency, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Icon size={12} className="opacity-40" />
                </div>
                <p className="text-[9px] font-mono uppercase opacity-40 tracking-widest">{label}</p>
                <p className="text-xs font-mono font-bold text-emerald-400">{latency}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* ML Model Config */}
        <section className="xl:col-span-8 space-y-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8 border-b border-outline-variant pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-on-surface rounded-sm">
                  <Cpu size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic text-on-surface">Model Drift & Retraining</h2>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">AdaBoost ETA Engine · v3.1</p>
                </div>
              </div>
              <span className="px-3 py-1.5 border border-outline-variant text-[9px] font-mono uppercase tracking-widest rounded-sm text-outline">ML-OPS v2.4</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-outline mb-3">MAE Alert Limit</label>
                <div className="relative">
                  <input type="number" step="0.1" defaultValue="12.5"
                    className="w-full bg-background border border-outline-variant rounded-sm px-4 py-3 font-mono text-sm text-on-surface focus:outline-none focus:border-on-surface transition-colors pr-16" />
                  <span className="absolute right-4 top-3.5 text-[10px] font-mono text-outline">mins</span>
                </div>
                <p className="text-[9px] font-mono text-outline mt-2 leading-relaxed">Trigger alert when 24h MAE exceeds this threshold.</p>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-outline mb-3">PSI Drift Limit</label>
                <div className="relative">
                  <input type="number" step="0.01" defaultValue="0.25"
                    className="w-full bg-background border border-outline-variant rounded-sm px-4 py-3 font-mono text-sm text-on-surface focus:outline-none focus:border-on-surface transition-colors pr-16" />
                  <span className="absolute right-4 top-3.5 text-[10px] font-mono text-outline">idx</span>
                </div>
                <p className="text-[9px] font-mono text-outline mt-2 leading-relaxed">Severe data drift requiring immediate retraining.</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-outline border-b border-outline-variant pb-4 mb-6">Automated Retraining Schedule</p>
              <Toggle label="Periodic Baseline Retraining" desc="Full historical pipeline every Sunday at 02:00 UTC" defaultOn={true} accent="bg-on-surface" />
              <Toggle label="Drift-Triggered Micro-Retraining" desc="Launch shadow model when PSI > 0.15 automatically" defaultOn={true} accent="bg-blue-600" />
              <Toggle label="Champion/Challenger Testing" desc="A/B test new model vs production for 7-day window" defaultOn={false} accent="bg-violet-600" />
            </div>
          </div>

          {/* SLA Policies */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8 border-b border-outline-variant pb-6">
              <div className="p-3 bg-on-surface rounded-sm">
                <ShieldAlert size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic text-on-surface">SLA Policy Definitions</h2>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">Service Level Agreements · Active</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Standard Delivery', hours: 48, color: 'border-l-outline', desc: 'Default freight policy' },
                { label: 'Expedited Delivery', hours: 24, color: 'border-l-amber-500', desc: 'Priority tier routing enforced' },
                { label: 'Same-Day Local', hours: 8, color: 'border-l-red-500', desc: 'Within 50km radius only' },
              ].map(({ label, hours, color, desc }) => (
                <div key={label} className={`border border-outline-variant border-l-4 ${color} rounded-sm p-6 bg-surface-container-low/30`}>
                  <p className="text-[10px] font-mono uppercase tracking-widest font-bold mb-4 text-on-surface">{label}</p>
                  <div className="flex items-center gap-3 mb-3">
                    <input type="number" defaultValue={hours}
                      className="w-20 bg-background border border-outline-variant rounded-sm p-2 text-lg font-mono font-bold text-on-surface focus:outline-none focus:border-on-surface" />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-outline">Hours Max</span>
                  </div>
                  <p className="text-[9px] font-mono text-outline">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column */}
        <section className="xl:col-span-4 space-y-8">
          {/* A* Heuristics */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8 border-b border-outline-variant pb-6">
              <div className="p-3 bg-on-surface rounded-sm">
                <GitMerge size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif italic text-on-surface">A* Heuristics</h2>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">Routing cost weights</p>
              </div>
            </div>
            <div className="space-y-8">
              <Slider label="Distance (W_d)" sublabel="Euclidean path distance" defaultVal={0.6} min={0} max={1} step={0.1} unit="" />
              <Slider label="Traffic (W_t)" sublabel="Real-time congestion factor" defaultVal={0.8} min={0} max={1} step={0.1} unit="" />
              <Slider label="Fuel (W_f)" sublabel="Fuel efficiency optimization" defaultVal={0.4} min={0} max={1} step={0.1} unit="" />
              <Slider label="Max Cluster Size" sublabel="Orders per shipper cluster" defaultVal={12} min={5} max={25} step={1} unit="" />
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-outline">
                <Info size={11} />
                Weights are normalized per route independently
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8 border-b border-outline-variant pb-6">
              <div className="p-3 bg-on-surface rounded-sm">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif italic text-on-surface">Alerts & Notifs</h2>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">Real-time system alerts</p>
              </div>
            </div>
            <div className="space-y-4">
              <Toggle label="SLA Breach Alerts" desc="Notify when delivery exceeds SLA window" defaultOn={true} accent="bg-red-600" />
              <Toggle label="Drift Warnings" desc="PSI score exceeds watch threshold" defaultOn={true} accent="bg-amber-600" />
              <Toggle label="Retrain Completion" desc="Model retrain pipeline finished" defaultOn={true} accent="bg-emerald-600" />
            </div>
          </div>

          {/* Security */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-6 border-b border-outline-variant pb-6">
              <div className="p-3 bg-on-surface rounded-sm">
                <Lock size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif italic text-on-surface">Security</h2>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">API access control</p>
              </div>
            </div>
            <div className="space-y-4 text-[10px] font-mono">
              {[
                { k: 'Auth Mode', v: 'JWT Bearer' },
                { k: 'API Version', v: 'v1.0.0' },
                { k: 'Rate Limit', v: '500 req/min' },
                { k: 'SSL', v: 'TLS 1.3' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between items-center py-3 border-b border-outline-variant/50 last:border-0">
                  <span className="text-outline uppercase tracking-widest">{k}</span>
                  <span className="font-bold text-on-surface">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </motion.div>
  );
};
