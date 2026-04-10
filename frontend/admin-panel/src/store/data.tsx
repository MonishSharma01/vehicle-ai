import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

const defaultVehicles: Vehicle[] = [
  { id: 'CAR-001', model: 'Tesla Model 3',   health: 72, failure: 'Battery Cell Degradation', urgency: 'Medium', action: 'Schedule Service', status: 'warning',  garageApproval: 'accepted', userApproval: 'pending'  },
  { id: 'CAR-002', model: 'Honda City',       health: 95, failure: 'Normal / None',            urgency: 'None',   action: 'Monitor Only',    status: 'healthy',  garageApproval: 'none',     userApproval: 'none'     },
  { id: 'CAR-003', model: 'Toyota Camry',     health: 45, failure: 'Engine Overheating',       urgency: 'High',   action: 'URGENT Service',  status: 'critical', garageApproval: 'accepted', userApproval: 'accepted' },
  { id: 'CAR-004', model: 'Ford Mustang',     health: 88, failure: 'Routine Oil Change',       urgency: 'Low',    action: 'Schedule Service', status: 'healthy', garageApproval: 'pending',  userApproval: 'pending'  },
  { id: 'CAR-005', model: 'BMW X5',           health: 30, failure: 'Coolant System Leak',      urgency: 'High',   action: 'URGENT Service',  status: 'critical', garageApproval: 'pending',  userApproval: 'none'     },
  { id: 'CAR-006', model: 'Hyundai Creta',    health: 65, failure: 'Brake Pad Wear',           urgency: 'Medium', action: 'Schedule Service', status: 'warning',  garageApproval: 'declined', userApproval: 'none'     },
];

const defaultAnomalies: Anomaly[] = [
  { time: '10:15 AM', vehicle: 'CAR-003', issue: 'Risk=Low but Decision=Urgent → MISMATCH',   severity: 'critical' },
  { time: '09:30 AM', vehicle: null,      issue: 'Prediction confidence 65% (below 70% threshold)', severity: 'warning'  },
  { time: '08:45 AM', vehicle: null,      issue: 'Pricing Agent failed to respond → RESTARTED', severity: 'info'     },
];

const defaultGarages: Garage[] = [
  { name: 'QuickFix Garage', bookings: 156, revenue: 140400, rating: 4.2, status: 'active'         },
  { name: 'SpeedService',    bookings: 98,  revenue: 88200,  rating: 4.5, status: 'active'         },
  { name: 'AutoCare Pro',    bookings: 45,  revenue: 40500,  rating: 3.9, status: 'warning-status' },
  { name: 'City Garage',     bookings: 12,  revenue: 10800,  rating: 3.2, status: 'suspended'      },
];

export const failureData: FailureData[] = [
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
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setAnomalies: React.Dispatch<React.SetStateAction<Anomaly[]>>;
  setGarages: React.Dispatch<React.SetStateAction<Garage[]>>;
  setAccuracy: React.Dispatch<React.SetStateAction<number>>;
  toasts: ToastItem[];
  addToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const v = localStorage.getItem('ai_admin_v');
      return v ? (JSON.parse(v) as Vehicle[]) : defaultVehicles;
    } catch { return defaultVehicles; }
  });

  const [anomalies, setAnomalies] = useState<Anomaly[]>(() => {
    try {
      const a = localStorage.getItem('ai_admin_a');
      return a ? (JSON.parse(a) as Anomaly[]) : defaultAnomalies;
    } catch { return defaultAnomalies; }
  });

  const [garages, setGarages] = useState<Garage[]>(() => {
    try {
      const g = localStorage.getItem('ai_admin_g');
      return g ? (JSON.parse(g) as Garage[]) : defaultGarages;
    } catch { return defaultGarages; }
  });

  const [accuracy, setAccuracy] = useState<number>(94.0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('ai_admin_v', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('ai_admin_a', JSON.stringify(anomalies));
  }, [anomalies]);

  useEffect(() => {
    localStorage.setItem('ai_admin_g', JSON.stringify(garages));
  }, [garages]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <AppContext.Provider value={{ vehicles, anomalies, garages, accuracy, setVehicles, setAnomalies, setGarages, setAccuracy, toasts, addToast }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
