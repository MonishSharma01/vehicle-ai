const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface BackendVehicle {
  id: string;
  owner: string;
  phone: string;
  model: string;
  active: boolean;
  in_pipeline: boolean;
}

export interface BackendGarage {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  specializations: string[];
  available_slots: number;
}

export interface BackendRequest {
  id: string;
  vehicle_id: string;
  issue: string;
  confidence: number;
  urgency: string;
  status: string;
  garages_tried: string[];
  created_at: string;
}

export interface BackendBooking {
  id: string;
  vehicle_id: string;
  garage_id: string;
  garage_name: string;
  issue: string;
  service: string;
  cost: number;
  urgency: string;
  status: string;
  created_at: string;
}

export interface BackendStatus {
  vehicles: number;
  garages: number;
  service_requests: number;
  bookings: number;
  active_pipelines: string[];
}

const get = <T>(path: string): Promise<T> =>
  fetch(`${API}${path}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });

const post = <T>(path: string): Promise<T> =>
  fetch(`${API}${path}`, { method: 'POST' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });

export const api = {
  getVehicles: () => get<BackendVehicle[]>('/vehicles'),
  getGarages:  () => get<BackendGarage[]>('/garages'),
  getRequests: () => get<BackendRequest[]>('/requests'),
  getBookings: () => get<BackendBooking[]>('/bookings'),
  getStatus:   () => get<BackendStatus>('/status'),
  forceIssue:  (vehicleId: string, issueType: string) =>
    post<{ message: string }>(`/simulate/force-issue/${vehicleId}/${issueType}`),
  reset: () => post<{ message: string }>('/simulate/reset'),
};
