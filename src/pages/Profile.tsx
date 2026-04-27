import React from 'react';
import { Phone, Mail, MapPin, Package2, Star, StarHalf, Shield, Cpu, TrendingUp, Award, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const radarData = [
  { subject: 'Tốc độ',     A: 92 },
  { subject: 'SLA',        A: 98 },
  { subject: 'An toàn',    A: 96 },
  { subject: 'Hiệu suất',  A: 88 },
  { subject: 'Năng suất',  A: 94 },
];

const timeline = [
  { stop: 1, label: 'Kho Bình Dương (KD-01)', time: '07:30', status: 'done',    note: 'Lấy hàng — 45 kiện' },
  { stop: 2, label: 'Quận 7 — Order #SG-0214', time: '10:15', status: 'active',  note: 'ETA còn 12 phút · 3.2 km' },
  { stop: 3, label: 'Quận 1 — Order #SG-0215', time: '10:50', status: 'pending', note: 'AI ETA: 14:50' },
  { stop: 4, label: 'Bình Thạnh — Order #SG-0216', time: '11:40', status: 'pending', note: 'AI ETA: 11:40' },
];

const kpis = [
  { label: 'Tổng chuyến',    value: '1,842',  delta: '+14%',   icon: Package2 },
  { label: 'Điểm MAE',       value: '3.2m',   delta: 'Tốt',    icon: Cpu },
  { label: 'SLA Rate',        value: '98.4%',  delta: 'Đỉnh',   icon: Shield },
  { label: 'Đánh giá',       value: '4.9',    delta: '/ 5.0',  icon: Star },
];

const badges = [
  { label: 'Top Performer Q1', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { label: 'SLA Champion',     color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { label: 'Zero Incident',    color: 'bg-blue-50 border-blue-300 text-blue-700' },
];

export const Profile: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-outline-variant pb-10">
        <div className="flex items-center gap-8">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-sm bg-on-surface flex items-center justify-center shadow-2xl shadow-on-surface/20">
              <span className="text-4xl font-serif italic text-white select-none">N</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono rounded-sm uppercase tracking-widest">Active</span>
              <span className="text-[9px] font-mono text-outline uppercase tracking-[0.4em]">Fleet Agent · ID: SHP-0042</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-serif italic text-on-surface leading-none mb-3 tracking-tighter">
              Nguyễn Thái Bảo
            </h1>
            <div className="flex flex-wrap gap-3 mt-3">
              {badges.map(b => (
                <span key={b.label} className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest border rounded-full font-bold ${b.color}`}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-8 py-3 bg-on-surface text-white text-[10px] font-mono tracking-[0.3em] uppercase rounded-sm hover:opacity-90 transition-all shadow-xl font-bold">
            Edit Profile
          </button>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map(({ label, value, delta, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-surface-container-lowest border border-outline-variant p-8 rounded-sm shadow-xl group hover:border-on-surface transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <Icon size={16} className="text-outline group-hover:text-on-surface transition-colors" />
              <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase">{delta}</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-outline mb-2">{label}</p>
            <p className="text-4xl font-serif italic text-on-surface">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Contact Card */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <h3 className="text-xl font-serif italic text-on-surface mb-8 border-b border-outline-variant pb-4">Thông tin liên hệ</h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-surface-container-low rounded-sm flex items-center justify-center flex-shrink-0">
                  <Phone size={15} className="text-on-surface" />
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-outline mb-0.5">Điện thoại</p>
                  <p className="font-mono text-sm font-bold text-on-surface">0354 438 490</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-surface-container-low rounded-sm flex items-center justify-center flex-shrink-0">
                  <Mail size={15} className="text-on-surface" />
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-outline mb-0.5">Email</p>
                  <p className="font-mono text-sm text-on-surface">thaibao@logistics.vn</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-surface-container-low rounded-sm flex items-center justify-center flex-shrink-0">
                  <MapPin size={15} className="text-on-surface" />
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-outline mb-0.5">Khu vực</p>
                  <p className="font-mono text-sm text-on-surface">Quận 7 — TP. Hồ Chí Minh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <h3 className="text-xl font-serif italic text-on-surface mb-2">Agent Performance</h3>
            <p className="text-[9px] font-mono uppercase tracking-widest text-outline mb-6">Biểu đồ năng lực · Q1/2026</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#E8E4DF" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }} />
                  <Radar dataKey="A" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.08} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Route Timeline */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8 border-b border-outline-variant pb-6">
              <div>
                <h3 className="text-2xl font-serif italic text-on-surface">Lộ trình hôm nay</h3>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline mt-1">AI-Scheduled Route · HCM Fleet Node</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border border-emerald-400/30 rounded-full bg-emerald-500/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-700">On Time</span>
              </div>
            </div>

            <div className="relative pl-8 ml-4">
              <div className="absolute left-0 top-3 bottom-3 w-px bg-outline-variant" />
              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-[37px] top-2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center
                      ${item.status === 'done'    ? 'bg-on-surface border-on-surface' :
                        item.status === 'active'  ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30' :
                        'bg-background border-outline-variant'}`}
                    />

                    <div className={`p-6 rounded-sm border transition-all ${
                      item.status === 'active'
                        ? 'border-blue-400/40 bg-blue-500/5 shadow-lg'
                        : item.status === 'done'
                        ? 'border-outline-variant bg-surface-container-low/50 opacity-60'
                        : 'border-outline-variant bg-surface-container-lowest'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`text-[9px] font-mono uppercase tracking-widest font-bold mb-1 block
                            ${item.status === 'active' ? 'text-blue-600' : item.status === 'done' ? 'text-emerald-600' : 'text-outline'}`}>
                            Stop {item.stop} · {item.status === 'done' ? 'Hoàn thành' : item.status === 'active' ? '▶ Đang thực hiện' : 'Chờ'}
                          </span>
                          <h4 className="text-base font-serif italic text-on-surface">{item.label}</h4>
                        </div>
                        <span className="font-mono text-sm font-bold text-on-surface">{item.time}</span>
                      </div>
                      <p className="text-[10px] font-mono text-outline">{item.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Tổng km hôm nay', value: '47.3 km', icon: Zap },
              { label: 'Thời gian trung bình', value: '22 phút', icon: Clock },
              { label: 'Thưởng hiệu suất', value: '+450K ₫', icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-sm shadow-xl text-center group hover:border-on-surface transition-all">
                <Icon size={18} className="mx-auto mb-4 text-outline group-hover:text-on-surface transition-colors" />
                <p className="text-2xl font-serif italic text-on-surface mb-1">{value}</p>
                <p className="text-[9px] font-mono uppercase tracking-widest text-outline">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
