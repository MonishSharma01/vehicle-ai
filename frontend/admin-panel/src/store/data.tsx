import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api, BackendVehicle, BackendGarage, BackendRequest, BackendBooking } from '../lib/api';

export type Vehicle = {
  id: string;
  model: string;
  health: number;
  failure: string;
  urgency: string;
  action: string;
  status: string;
  garageApproval: string;
  userApproval: string;
};

export type Anomaly = {
  time: string;
  vehicle: string | null;
  issue: string;
  severity: string;
};

export type Garage = {
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  status: string;
};

export type FailureData = {
  label: string;
  pct: number;
  color: string;
};

// Static defaults shown briefly before first backend fetch
const defaultVehicles: Vehicle[] = [
  { id: 'V001', model: '—', health: 93, failure: 'Normal / None', urgency: 'None', action: 'Monitor Only', status: 'healthy', garageApproval: 'none', userApproval: 'none' },
  { id: 'V002', model: '—', health: 93, failure: 'Normal / None', urgency: 'None', action: 'Monitor Only', status: 'healthy', garageApproval: 'none', userApproval: 'none' },
  { id: 'V003', model: '—', health: 93, failure: 'Normal / None', urgency: 'None', action: 'Monitor Only', status: 'healthy', garageApproval: 'none', userApproval: 'none' },
];

const defaultAnomalies: Anomaly[] = [
  { time: '--:--', vehicle: null, issue: 'Connecting to backend…', severity: 'info' },
];

const defaultGarages: Garage[] = [];

// ── Mapping helpers ─────────────────────────────────────────────────────────
const HEALTH_MAP: Record<string, number> = {
  normal: 93, low_oil_life: 65, battery_failure: 45, engine_overheat: 30,
};
const FAILURE_LABEL: Record<string, string> = {
  normal: 'Normal / None',
  low_oil_life: 'Low Oil Life',
  battery_failure: 'Battery Cell Degradation',
  engine_overheat: 'Engine Overheating',
};
const ISSUE_COST: Record<string, number> = {
  battery_failure: 4000, engine_overheat: 7500, low_oil_life: 1500, normal: 0,
};

function getHealthStatus(health: number): string {
  if (health > 80) return 'healthy';
  if (health >= 50) return 'warning';
  return 'critical';
}

function getAction(urgency: string): string {
  if (urgency === 'High') return 'URGENT Service';
  if (urgency === 'None') return 'Monitor Only';
  return 'Schedule Service';
}

function getGarageApproval(req: BackendRequest | undefined): string {
  if (!req) return 'none';
  if (req.status === 'ACCEPTED' || req.status === 'BOOKED') return 'accepted';
  if (req.status === 'DECLINED') return 'declined';
  if (req.status === 'PENDING') return 'pending';
  return 'none';
}

function getUserApproval(req: BackendRequest | undefined): string {
  if (!req) return 'none';
  if (req.status === 'BOOKED') return 'accepted';
  if (req.status === 'USER_DECLINED') return 'declined';
  return 'pending';
}

function buildVehicles(bvs: BackendVehicle[], requests: BackendRequest[]): Vehicle[] {
  return bvs.map(v => {
    const reqs = requests
      .filter(r => r.vehicle_id === v.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const req     = reqs[0];
    const issue   = req?.issue   ?? 'normal';
    const urgency = req?.urgency ?? 'None';
    const health  = HEALTH_MAP[issue] ?? 90;
    return {
      id: v.id,
      model: v.model,
      health,
      failure:        FAILURE_LABEL[issue] ?? issue,
      urgency,
      action:         getAction(urgency),
      status:         getHealthStatus(health),
      garageApproval: getGarageApproval(req),
      userApproval:   getUserApproval(req),
    };
  });
}

function mergeGarages(prev: Garage[], fresh: Garage[]): Garage[] {
  const backendNames = new Set(fresh.map(g => g.name));
  const localOnly = prev.filter(g => !backendNames.has(g.name));
  return [...fresh, ...localOnly];
}

function buildGarages(bgs: BackendGarage[], bookings: BackendBooking[]): Garage[] {
  return bgs.map(g => {
    const gbs = bookings.filter(b => b.garage_id === g.id);
    const completed = gbs.filter(b => b.status === 'COMPLETED');
    const revenue = completed.reduce((s, b) => s + (ISSUE_COST[b.issue] ?? 0), 0);
    const gStatus = g.available_slots === 0 ? 'warning-status' : 'active';
    return { name: g.name, bookings: gbs.length, revenue, rating: g.rating, status: gStatus };
  });
}

function buildAnomalies(requests: BackendRequest[], activePipelines: string[]): Anomaly[] {
  const items: Anomaly[] = [];
  for (const r of requests) {
    if (r.confidence < 70) {
      items.push({
        time: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        vehicle: r.vehicle_id,
        issue: `Prediction confidence ${r.confidence}% — below 70% threshold`,
        severity: 'warning',
      });
    }
    if (r.status === 'DECLINED') {
      items.push({
        time: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        vehicle: r.vehicle_id,
        issue: 'Service request declined — no available garage accepted',
        severity: 'critical',
      });
    }
  }
  for (const vid of activePipelines) {
    items.push({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      vehicle: vid,
      issue: 'Vehicle actively in AI processing pipeline',
      severity: 'info',
    });
  }
  if (items.length === 0) {
    items.push({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      vehicle: null,
      issue: 'All systems nominal — no anomalies detected',
      severity: 'info',
    });
  }
  return items.slice(0, 6);
}

function buildFailureData(bookings: BackendBooking[]): FailureData[] {
  const counts = { battery_failure: 0, engine_overheat: 0, low_oil_life: 0 };
  for (const b of bookings) {
    if (b.issue in counts) counts[b.issue as keyof typeof counts]++;
  }
  const total = counts.battery_failure + counts.engine_overheat + counts.low_oil_life;
  if (total === 0) return staticFailureData;
  const result = [
    { label: 'Battery Issues',  pct: Math.round((counts.battery_failure / total) * 100), color: '#4F46E5' },
    { label: 'Engine Problems', pct: Math.round((counts.engine_overheat / total) * 100), color: '#8B5CF6' },
    { label: 'Oil Related',     pct: Math.round((counts.low_oil_life    / total) * 100), color: '#F59E0B' },
  ].filter(d => d.pct > 0);
  return result.length > 0 ? result : staticFailureData;
}

export const staticFailureData: FailureData[] = [
  { label: 'Battery Issues',  pct: 45, color: '#4F46E5' },
  { label: 'Engine Problems', pct: 25, color: '#8B5CF6' },
  { label: 'Oil Related',     pct: 20, color: '#F59E0B' },
  { label: 'Coolant Issues',  pct: 10, color: '#14B8A6' },
];

interface ToastItem {
  id: number;
  message: string;
  type: string;
}

interface AppContextType {
  vehicles: Vehicle[];
  anomalies: Anomaly[];
  garages: Garage[];
  accuracy: number;
  failureData: FailureData[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setAnomalies: React.Dispatch<React.SetStateAction<Anomaly[]>>;
  setGarages: React.Dispatch<React.SetStateAction<Garage[]>>;
  setAccuracy: React.Dispatch<React.SetStateAction<number>>;
  toasts: ToastItem[];
  addToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles,    setVehicles]    = useState<Vehicle[]>(defaultVehicles);
  const [anomalies,   setAnomalies]   = useState<Anomaly[]>(defaultAnomalies);
  const [garages,     setGarages]     = useState<Garage[]>(defaultGarages);
  const [accuracy,    setAccuracy]    = useState<number>(91.2);
  const [failureData, setFailureData] = useState<FailureData[]>(staticFailureData);
  const [toasts,      setToasts]      = useState<ToastItem[]>([]);

  // Poll backend every 5 s
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [bVehicles, bGarages, bRequests, bBookings, statusData] = await Promise.all([
          api.getVehicles(),
          api.getGarages(),
          api.getRequests(),
          api.getBookings(),
          api.getStatus(),
        ]);
        if (cancelled) return;
        setVehicles(buildVehicles(bVehicles, bRequests));
        setGarages(prev => mergeGarages(prev, buildGarages(bGarages, bBookings)));
        setAnomalies(buildAnomalies(bRequests, statusData.active_pipelines));
        setFailureData(buildFailureData(bBookings));
      } catch {
        // Backend unavailable — keep current state
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id));
    }, 3500);
  }, []);

  const ctxValue = useMemo(() => ({
    vehicles, anomalies, garages, accuracy, failureData,
    setVehicles, setAnomalies, setGarages, setAccuracy,
    toasts, addToast,
  }), [vehicles, anomalies, garages, accuracy, failureData, toasts, addToast]);

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
