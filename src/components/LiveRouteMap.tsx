// src/components/LiveRouteMap.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Order, Shipper, RouteResponse } from '../services/api';

// ── Interpolation helper ─────────────────────────────────────────────────────
function interpolate(p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

// ── HCM Districts (Approximated Centers) ─────────────────────────────────────
const DISTRICTS = [
  { name: 'Quận 1', pos: [10.776, 106.701] },
  { name: 'Quận 7', pos: [10.732, 106.721] },
  { name: 'Gò Vấp', pos: [10.833, 106.666] },
  { name: 'Bình Thạnh', pos: [10.810, 106.709] },
  { name: 'Thủ Đức', pos: [10.849, 106.772] },
];

// ── Map Controller ───────────────────────────────────────────────────────────
function MapController({ orders, shippers, routes, centerOn }: { 
  orders: Order[]; shippers: Shipper[]; routes: RouteResponse[]; centerOn?: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [];
    const assigned = new Set(routes.flatMap(r => r.route));
    orders.filter(o => routes.length === 0 || assigned.has(o.order_id)).forEach(o => pts.push([o.latitude, o.longitude]));
    (routes.length > 0 ? routes : []).forEach(r => {
      const s = shippers.find(sh => sh.shipper_id === r.shipper_id);
      if (s) pts.push([s.current_lat, s.current_lng]);
    });
    if (routes.length === 0) shippers.forEach(s => pts.push([s.current_lat, s.current_lng]));
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], animate: true });
  }, [routes.length, orders.length, shippers.length]);

  useEffect(() => {
    if (centerOn) {
      const order = orders.find(o => o.order_id === centerOn);
      if (order) map.setView([order.latitude, order.longitude], 15, { animate: true });
    }
  }, [centerOn]);
  return null;
}

// ── Icons ────────────────────────────────────────────────────────────────────
const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const makeIcon = (color: string, label: string, size = 32, isHighlighted = false, type: 'truck' | 'stop' | 'district' = 'stop') => {
  if (type === 'district') {
    return L.divIcon({
      className: '',
      html: `<div style="color:rgba(255,255,255,0.2); font-family:serif; font-style:italic; font-size:14px; white-space:nowrap; pointer-events:none; letter-spacing:2px; text-transform:uppercase;">${label}</div>`,
      iconSize: [100, 20],
      iconAnchor: [50, 10]
    });
  }

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="relative flex items-center justify-center">
        ${isHighlighted ? `<div class="absolute inset-0 rounded-full animate-ping" style="background:${color}; opacity:0.4;"></div>` : ''}
        <div style="
          background:${type === 'truck' ? '#111' : color};
          color:white; border-radius:${type === 'truck' ? '6px' : '50%'};
          width:${size}px; height:${size}px; display:flex;
          align-items:center; justify-content:center;
          font-size:${size < 24 ? 9 : 12}px; font-family:JetBrains Mono; font-weight:bold;
          border:2.5px solid white;
          box-shadow:0 8px 20px rgba(0,0,0,0.4);
          transform:${isHighlighted ? 'scale(1.4)' : 'scale(1)'};
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          ${type === 'truck' ? '🚚' : label}
        </div>
      </div>
    `,
  });
};

interface LiveRouteMapProps {
  orders:   Order[];
  shippers: Shipper[];
  routes:   RouteResponse[];
  highlightedOrderId?: string | null;
  onMarkerClick?: (orderId: string) => void;
  isSimulating?: boolean;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({ 
  orders, shippers, routes, highlightedOrderId, onMarkerClick, isSimulating 
}) => {
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode]   = useState<'high-tech' | 'satellite'>('high-tech');
  
  const orderMap = useMemo(() => Object.fromEntries(orders.map(o => [o.order_id, o])), [orders]);
  const assignedIds = useMemo(() => new Set(routes.flatMap(r => r.route)), [routes]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(p => (p >= 1 ? 0 : p + 0.003));
    }, 40);
    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="bg-on-surface text-surface-container-lowest border border-white/10 rounded-sm p-8 mb-8 shadow-2xl relative overflow-hidden group">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rotate-45 translate-x-16 -translate-y-16 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4 mb-6 relative z-10">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <h2 className="text-2xl font-serif italic">Global Intelligence Map</h2>
           </div>
           <p className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">
             {isSimulating ? 'Active Agent Telemetry: Monitoring Movement' : 'Precision Logistics Visualization'}
           </p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex bg-white/5 p-1 rounded-sm border border-white/10">
              <button onClick={() => setViewMode('high-tech')} className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all ${viewMode === 'high-tech' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>High-Tech</button>
              <button onClick={() => setViewMode('satellite')} className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all ${viewMode === 'satellite' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>Satellite</button>
           </div>
        </div>
      </div>

      <div className="h-[650px] w-full rounded-sm overflow-hidden z-0 isolate border border-white/10 shadow-inner relative">
        <MapContainer center={[10.776, 106.701]} zoom={12} style={{ height: '100%', width: '100%', background: '#111' }}>
          {viewMode === 'high-tech' ? (
            <TileLayer
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          ) : (
            <TileLayer
              attribution='&copy; Google'
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            />
          )}
          
          <MapController orders={orders} shippers={shippers} routes={routes} centerOn={highlightedOrderId} />

          {/* District Labels */}
          {DISTRICTS.map(d => (
             <Marker key={d.name} position={d.pos as [number, number]} icon={makeIcon('', d.name, 0, false, 'district')} />
          ))}

          {/* Unassigned orders - subtle pulsing dots */}
          {orders.filter(o => !assignedIds.has(o.order_id)).map(order => (
            <CircleMarker key={order.order_id} center={[order.latitude, order.longitude]} radius={4}
              pathOptions={{ color: 'transparent', fillColor: '#FFF', fillOpacity: 0.3, weight: 0 }}>
               <Tooltip direction="top" opacity={0.9}>
                  <div className="font-mono text-[9px] uppercase">Pending Node: #{order.order_id?.substring(0,8) || '—'}</div>
               </Tooltip>
            </CircleMarker>
          ))}

          {/* Routes & Moving Shippers */}
          {routes.map((route, ci) => {
            const color  = COLORS[ci % COLORS.length];
            const clOrds = route.route.map(id => orderMap[id]).filter(Boolean);
            const shipper = shippers.find(s => s.shipper_id === route.shipper_id);
            if (!shipper) return null;

            const path: [number, number][] = [[shipper.current_lat, shipper.current_lng], ...clOrds.map(o => [o.latitude, o.longitude] as [number, number])];

            // Simulation Logic
            let truckPos: [number, number] = path[0];
            let nextStopIndex = 0;
            if (isSimulating && path.length > 1) {
              const totalSegments = path.length - 1;
              const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
              const segmentProgress = (progress * totalSegments) % 1;
              truckPos = interpolate(path[segmentIndex], path[segmentIndex + 1], segmentProgress);
              nextStopIndex = segmentIndex + 1;
            }

            return (
              <React.Fragment key={route.shipper_id}>
                {/* Ant-path effect using two polylines */}
                <Polyline positions={path} pathOptions={{ color, weight: 8, opacity: 0.1 }} />
                <Polyline positions={path} pathOptions={{ color, weight: 2, dashArray: '10 10', opacity: 0.8 }} className="animate-ant-path" />

                {/* Moving Truck */}
                <Marker position={truckPos} icon={makeIcon(color, '', 42, isSimulating, 'truck')}>
                   <Tooltip direction="top" opacity={1} permanent={isSimulating}>
                      <div className="bg-black text-white p-2 rounded shadow-2xl border border-white/20">
                         <p className="font-mono text-[9px] uppercase font-bold text-center">Shipper {ci + 1}</p>
                         <p className="text-[8px] font-mono opacity-60 text-center uppercase tracking-tighter">Velocity: 42 km/h</p>
                      </div>
                   </Tooltip>
                </Marker>

                {/* Order Stops */}
                {clOrds.map((order, seq) => {
                  const isNextStop = isSimulating && (seq + 1 === nextStopIndex);
                  return (
                    <Marker key={order.order_id} position={[order.latitude, order.longitude]}
                      icon={makeIcon(color, `${seq + 1}`, 24, order.order_id === highlightedOrderId || isNextStop, 'stop')}>
                      <Tooltip direction="top" opacity={0.97}>
                        <div className="font-mono p-2 text-[10px]">
                          <div className="font-bold mb-1" style={{ color }}>Stop #{seq + 1}</div>
                          <div className="opacity-60 text-[9px]">Load: {order.weight_kg.toFixed(1)}kg</div>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}
              </React.Fragment>
            );
          })}
        </MapContainer>
        
        {/* Map UI Overlay */}
        <div className="absolute top-10 left-10 z-[1000] flex flex-col gap-4">
           <div className="bg-black/80 backdrop-blur-md p-4 rounded-sm border border-white/10 shadow-2xl">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] mb-4 font-bold border-b border-white/10 pb-2">Network status</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                 <div>
                    <p className="text-[8px] font-mono text-white/40 uppercase">Latency</p>
                    <p className="text-xs font-mono text-emerald-400">12ms</p>
                 </div>
                 <div>
                    <p className="text-[8px] font-mono text-white/40 uppercase">Bandwidth</p>
                    <p className="text-xs font-mono text-emerald-400">98%</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Simulation CSS */}
      <style>{`
        .animate-ant-path {
          stroke-dashoffset: 20;
          animation: ant-path 2s linear infinite;
        }
        @keyframes ant-path {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};
