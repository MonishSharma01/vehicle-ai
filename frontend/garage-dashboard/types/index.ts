// Types for the Precision Garage application

export interface Service {
  id: string;
  name: string;
  price: number;
  estimatedTime: number; // in minutes
}

export interface WorkOrder {
  id: string;
  orderId: string;
  customerName: string;
  carModel: string;
  serviceType: string;
  status: "Pending" | "In Progress" | "Completed";
  scheduledDate: string; // ISO date string
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  carModels: string[];
  totalVisits: number;
  createdAt: string;
}

export interface LiveJob {
  id: string;
  carId: string;
  serviceType: string;
  status: "IN_PROGRESS" | "SCHEDULED";
  timeLeft?: number; // seconds for countdown
  scheduledTime?: string; // "HH:MM AM/PM"
  serviceCost: number;
}

export interface NewBooking {
  id: string;
  issueId: string;
  carModel: string;
  owner: string;
  problem: string;
  scheduledTime: string;
  actionLabel?: string;
}

export interface ChargesConfig {
  basicService: number;
  engineFuelRangeMin: number;
  engineFuelRangeMax: number;
  coolantMin: number;
  coolantMax: number;
  batteryExchangeMin: number;
  batteryExchangeMax: number;
  tyresNormalMin: number;
  tyresNormalMax: number;
  tyresNew: number;
  carDamage: string;
}

export interface DashboardStats {
  todaysBookings: number;
  completed: number;
  revenue: number;
  rating: number;
}
