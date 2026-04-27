import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Box, Cpu, Database, Globe, Shield, Zap } from 'lucide-react';

const STATS = [
  { label: 'Delivery Records', value: 2000, suffix: '' },
  { label: 'Active Orders', value: 500, suffix: '' },
  { label: 'Fleet Agents', value: 15, suffix: '' },
  { label: 'SLA Accuracy', value: 98.4, suffix: '%' },
];

const FEATURES = [
  { icon: Cpu, label: 'A* Neural Pathfinding', desc: 'Multi-agent route optimization across city clusters' },
  { icon: Database, label: 'AdaBoost ETA Engine', desc: 'Real-time delivery prediction with 98.4% accuracy' },
  { icon: Globe, label: 'Live Fleet Telemetry', desc: 'GPS-driven agent simulation with dynamic re-routing' },
  { icon: Shield, label: 'SLA Risk Detection', desc: 'Proactive delay alerting before breach occurs' },
];

// Animated counter hook
function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(target % 1 !== 0 ? 1 : 0)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [start, target, duration]);
  return count;
}

function StatCounter({ label, value, suffix, start }: { label: string; value: number; suffix: string; start: boolean }) {
  const count = useCounter(value, 1800, start);
  return (
    <div className="text-center">
      <div className="text-5xl xl:text-6xl font-serif italic text-white leading-none mb-3">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">{label}</div>
    </div>
  );
}

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handleEnter = () => {
    setEntered(true);
    setTimeout(() => navigate('/dashboard'), 800);
  };

  return (
    <AnimatePresence>
      {!entered ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 bg-[#080808] overflow-y-auto z-[9999]"
        >
          {/* Background grid */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Radial glow center */}
          <div className="fixed inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

          {/* Scan line */}
          <div className="fixed inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-scan pointer-events-none" />

          {/* ── Hero ──────────────────────────────────────────── */}
          <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">

            {/* Top badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex items-center gap-3 mb-16"
            >
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-full bg-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">System Online — HCM Node</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
            </motion.div>

            {/* Logo mark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, type: 'spring', stiffness: 80 }}
              className="mb-10"
            >
              <div className="w-20 h-20 bg-white rounded-sm flex items-center justify-center shadow-2xl shadow-white/10 mx-auto">
                <Box size={40} className="text-black" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center mb-8"
            >
              <h1 className="text-7xl xl:text-9xl font-serif italic text-white leading-none tracking-tighter mb-6">
                LogiSense<br/>AI
              </h1>
              <p className="text-[11px] xl:text-[13px] font-mono uppercase tracking-[0.5em] text-white/30">
                AI-Driven Fleet Orchestration Platform
              </p>
            </motion.div>

            {/* Sub-description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-white/25 font-mono text-sm max-w-2xl text-center leading-relaxed mb-16 tracking-wide"
            >
              Autonomous multi-agent route optimization powered by AdaBoost predictive modeling
              and A* pathfinding — delivering measurable efficiency gains across HCMC's urban grid.
            </motion.p>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              onClick={handleEnter}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            className="group relative flex items-center gap-4 px-12 py-5 bg-white text-black font-mono text-sm uppercase tracking-[0.3em] font-bold rounded-sm shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Enter System</span>
              <ArrowRight size={18} className="relative group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute bottom-12 flex flex-col items-center gap-3"
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20">Scroll to explore</span>
              <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
            </motion.div>
          </section>

          {/* ── Stats Bar ─────────────────────────────────────── */}
          <section ref={statsRef} className="py-32 border-y border-white/5">
            <div className="max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-16">
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                  >
                    <StatCounter {...s} start={statsVisible} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Feature Grid ──────────────────────────────────── */}
          <section className="py-32 max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/20 mb-6">Core Capabilities</p>
              <h2 className="text-5xl font-serif italic text-white">Intelligence Modules</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="glass p-10 rounded-sm group hover:border-white/20 transition-all cursor-default"
                >
                  <div className="flex items-start gap-6">
                    <div className="p-4 bg-white/5 rounded-sm group-hover:bg-white/10 transition-colors flex-shrink-0">
                      <f.icon size={24} className="text-white/60" />
                    </div>
                    <div>
                      <h3 className="text-base font-serif italic text-white mb-3">{f.label}</h3>
                      <p className="text-[11px] font-mono text-white/25 leading-relaxed tracking-wide">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Bottom CTA ────────────────────────────────────── */}
          <section className="py-32 text-center border-t border-white/5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/20 mb-10">Ready to proceed</p>
              <button
                onClick={handleEnter}
                className="group flex items-center gap-4 mx-auto px-12 py-5 border border-white/15 text-white font-mono text-sm uppercase tracking-[0.3em] rounded-sm hover:bg-white hover:text-black transition-all font-bold"
              >
                Launch Dashboard
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
            <p className="mt-16 text-[9px] font-mono text-white/10 uppercase tracking-[0.5em]">
              LogiSense AI · Engine v3.0 · HCMC Fleet Network
            </p>
          </section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
