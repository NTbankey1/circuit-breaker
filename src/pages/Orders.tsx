import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RefreshCcw, Package, ChevronLeft, ChevronRight, Play, MapPin, Calendar, Scale, Activity, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Order } from '../services/api';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES: Record<string, string> = {
  PENDING:     'border-amber-400/40 text-amber-600 bg-amber-500/5',
  IN_TRANSIT:  'border-blue-400/40 text-blue-600 bg-blue-500/5',
  DELIVERED:   'border-emerald-400/40 text-emerald-600 bg-emerald-500/5',
  CANCELLED:   'border-red-400/40 text-red-600 bg-red-500/5',
};

const PAGE_SIZE = 12;

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [orders,      setOrders]    = useState<Order[]>([]);
  const [search,      setSearch]    = useState('');
  const [page,        setPage]      = useState(1);
  const [isLoading,   setIsLoading] = useState(true);
  const [stats, setStats]           = useState({ total: 0, pending: 0 });

  const fetchData = async () => {
    setIsLoading(true);
    // Add a timeout to prevent infinite skeleton loaders
    const timeout = setTimeout(() => setIsLoading(false), 8000);
    
    try {
      const [o, s] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getStats().catch(() => ({ total_orders: 0, pending_orders: 0 }))
      ]);
      setOrders(o || []);
      setStats({ 
        total: s?.total_orders || 0, 
        pending: s?.pending_orders || 0 
      });
    } catch (err) {
      console.error("Data fetch failed:", err);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.order_id.toLowerCase().includes(q) ||
      o.latitude.toString().includes(q) ||
      o.longitude.toString().includes(q)
    );
  }, [search, orders]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shortId    = (id: string) => id?.substring(0, 8).toUpperCase() || '—';

  const formatDate = (s: string) => {
    if (!s) return '—';
    const date = new Date(s);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + 
           date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="p-4 md:p-8 max-w-[1600px] mx-auto bg-background min-h-full"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-outline-variant pb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono rounded-sm">LIVE</div>
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-outline">/ root / logistics / warehouse</span>
          </div>
          <h1 className="text-6xl font-serif italic text-on-surface leading-none mb-3 tracking-tighter">Order Warehouse</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-outline font-mono flex items-center gap-2">
            <Activity size={12} className="text-emerald-500" /> PostgreSQL · {orders.length.toLocaleString()} Records Indexed
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-80 group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-on-surface transition-colors" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              type="text" placeholder="Search by ID, coordinates..."
              className="w-full pl-11 pr-4 py-3 border border-outline-variant rounded-sm bg-surface-container-lowest text-xs font-mono tracking-widest text-on-surface focus:outline-none focus:border-on-surface focus:ring-1 focus:ring-on-surface transition-all uppercase"
            />
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-5 py-3 rounded-sm border border-outline-variant hover:bg-surface-container-low text-[10px] font-mono uppercase tracking-widest transition-all">
            <RefreshCcw size={13} /> Sync
          </button>
          <button
            onClick={() => navigate('/optimization')}
            className="flex items-center gap-2 px-8 py-3 rounded-sm bg-on-surface text-surface-container-lowest text-[10px] font-mono tracking-[0.2em] uppercase hover:opacity-85 transition-all shadow-2xl font-bold">
            <Play size={12} fill="currentColor" /> Initialize Optimizer
          </button>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Volume',  value: isLoading ? '…' : stats.total,    icon: Package },
          { label: 'Unassigned',    value: isLoading ? '…' : stats.pending,  icon: Clock },
          { label: 'Active Filter', value: isLoading ? '…' : filtered.length, icon: Filter },
          { label: 'Page View',     value: `${page} / ${totalPages || 1}`,    icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-outline-variant rounded-sm p-5 bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
               <Icon size={12} className="text-outline" />
               <p className="text-[9px] font-mono uppercase tracking-widest text-outline">{label}</p>
            </div>
            <p className="text-2xl font-serif italic text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest rounded-sm border border-outline-variant overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                {[
                  { h: 'Order Identifier', icon: Package },
                  { h: 'GPS Coordinates', icon: MapPin },
                  { h: 'Net Weight', icon: Scale },
                  { h: 'Priority', icon: AlertCircle },
                  { h: 'Lifecycle', icon: Activity },
                  { h: 'Timestamp', icon: Clock }
                ].map(({ h, icon: Icon }) => (
                  <th key={h} className="py-5 px-8 text-[9px] font-mono text-outline uppercase tracking-[0.15em] font-bold">
                    <div className="flex items-center gap-2">
                       <Icon size={11} /> {h}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <AnimatePresence mode="popLayout">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="py-6 px-8"><div className="h-5 bg-surface-container-low rounded-sm animate-pulse" /></td></tr>
                    ))
                  : paginated.map((order, idx) => (
                      <motion.tr key={order.order_id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="hover:bg-surface-container-low/30 transition-colors group">
                        <td className="py-5 px-8 font-mono text-xs text-on-surface font-bold">#{shortId(order.order_id)}</td>
                        <td className="py-5 px-8">
                          <div className="flex flex-col">
                             <span className="text-xs font-mono text-on-surface">{order.latitude.toFixed(6)}</span>
                             <span className="text-[9px] font-mono text-outline">{order.longitude.toFixed(6)}</span>
                          </div>
                        </td>
                        <td className="py-5 px-8 font-mono text-xs text-on-surface">
                           <span className="font-bold">{order.weight_kg.toFixed(2)}</span> <span className="opacity-40 ml-1">kg</span>
                        </td>
                        <td className="py-5 px-8">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-sm font-mono text-xs border ${order.priority === 3 ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-surface-container-low border-outline-variant text-outline'}`}>
                            P{order.priority ?? 1}
                          </span>
                        </td>
                        <td className="py-5 px-8">
                          <span className={`inline-block text-[9px] font-mono px-3 py-1.5 border rounded-full uppercase tracking-widest font-bold ${STATUS_STYLES[order.status ?? 'PENDING']}`}>
                            {order.status ?? 'PENDING'}
                          </span>
                        </td>
                        <td className="py-5 px-8 font-mono text-[10px] text-outline">
                          {formatDate(order.placed_at)}
                        </td>
                      </motion.tr>
                    ))
                }
              </AnimatePresence>
            </tbody>
          </table>
          
          {!isLoading && filtered.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center gap-4 border-t border-outline-variant bg-surface-container-low/10">
               <Package size={40} className="text-outline opacity-20" />
               <p className="text-[10px] font-mono uppercase tracking-widest text-outline">No records match your current filter.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="bg-surface-container-lowest p-6 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-mono uppercase tracking-widest text-outline">
                Showing {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} – {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
             </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-sm border border-outline-variant hover:bg-surface-container-low text-[10px] font-mono uppercase tracking-widest disabled:opacity-30 transition-all">
              <ChevronLeft size={14} /> Prev
            </button>
            <div className="flex gap-1">
               {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pNum = i + 1; // Simplified for now
                  return (
                    <button key={i} onClick={() => setPage(pNum)} className={`w-8 h-8 font-mono text-[10px] rounded-sm transition-all ${page === pNum ? 'bg-on-surface text-surface-container-lowest' : 'hover:bg-surface-container-low text-outline'}`}>
                       {pNum}
                    </button>
                  );
               })}
               {totalPages > 5 && <span className="px-2 self-center opacity-30">...</span>}
            </div>
            <button 
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
              disabled={page >= totalPages}
              className="flex items-center gap-2 px-4 py-2 rounded-sm border border-outline-variant hover:bg-surface-container-low text-[10px] font-mono uppercase tracking-widest disabled:opacity-30 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
