// src/services/api.ts
const BASE_URL = '/api/v1';

// ── Domain Types ─────────────────────────────────────────────────────────────
export interface Order {
  order_id: string;
  latitude: number;
  longitude: number;
  placed_at: string;
  weight_kg: number;
  priority?: number;
  status?: string;
}

export interface Shipper {
  shipper_id: string;
  current_lat: number;
  current_lng: number;
  status: 'IDLE' | 'ON_DELIVERY' | 'OFFLINE';
  max_load_kg: number;
}

export interface Stats {
  total_orders: number;
  pending_orders: number;
  total_shippers: number;
  idle_shippers: number;
  total_deliveries: number;
  avg_delivery_minutes: number;
  on_time_rate: number;
}

export interface Incident {
  record_id: string;
  order_id: string;
  shipper_id: string;
  traffic_level: number;
  actual_delivery_minutes: number;
  predicted_minutes: number;
  recorded_at: string;
  delay_minutes: number;
}

export interface ETARequest {
  order_lat: number;
  order_lng: number;
  warehouse_lat: number;
  warehouse_lng: number;
  traffic_level: number;
  number_of_stops: number;
  departure_time?: string;
}

export interface ETAResponse {
  predicted_minutes: number;
  is_at_risk: boolean;
  confidence_band: [number, number];
  cached: boolean;
}

export interface OptimizeRequest {
  orders: { order_id: string; latitude: number; longitude: number; weight_kg: number }[];
  shippers: { shipper_id: string; current_lat: number; current_lng: number; status: string; max_load_kg: number }[];
}

export interface RouteResponse {
  shipper_id: string;
  route: string[];
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  predictETA:      (data: ETARequest)     => apiFetch<ETAResponse>('/predict_eta', { method: 'POST', body: JSON.stringify(data) }),
  optimizeRoute:   (data: OptimizeRequest)=> apiFetch<RouteResponse[]>('/optimize_route', { method: 'POST', body: JSON.stringify(data) }),
  getOrders:       ()                     => apiFetch<Order[]>('/orders'),
  getShippers:     ()                     => apiFetch<Shipper[]>('/shippers'),
  getStats:        ()                     => apiFetch<Stats>('/stats'),
  getIncidents:    ()                     => apiFetch<Incident[]>('/recent_incidents'),
};
