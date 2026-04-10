/**
 * api.ts — Typed API client for the Vehicle AI backend.
 * All garage-dashboard pages import from here instead of calling fetch() directly.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const GARAGE_ID = process.env.NEXT_PUBLIC_GARAGE_ID ?? 'G001';

export const ACTIVE_GARAGE_ID = GARAGE_ID;

// ── Response shapes (mirrors backend JSON) ─────────────────────────────────

export interface ApiGarageStats {
  todays_bookings: number;
  completed: number;
  revenue: number;
  rating: number;
}

export interface ApiBooking {
  id: string;
  vehicle_id: string;
  owner: string;
  model: string;
  garage_id: string;
  issue: string;
  service: string;
  cost: string;
  cost_inr: number;
  urgency: string;
  status: string;
  created_at: string;
}

export interface ApiPendingBooking {
  id: string;
  vehicle_id: string;
  owner_name: string;
  model: string;
  issue: string;
  service: string;
  cost_inr: number;
  urgency: string;
  created_at: string;
  action_label?: string;
  booking_status?: string;
}

export interface ApiVehicle {
  id: string;
  owner: string;
  phone: string;
  model: string;
  active: boolean;
  in_pipeline: boolean;
}

// ── Garage dashboard ────────────────────────────────────────────────────────

export async function getGarageStats(): Promise<ApiGarageStats> {
  const res = await fetch(`${API_URL}/garages/${GARAGE_ID}/stats`);
  if (!res.ok) throw new Error('Failed to fetch garage stats');
  return res.json();
}

export async function getGarageBookings(): Promise<ApiBooking[]> {
  const res = await fetch(`${API_URL}/garages/${GARAGE_ID}/bookings`);
  if (!res.ok) throw new Error('Failed to fetch garage bookings');
  return res.json();
}

/** Returns the most recent CONFIRMED booking waiting for the garage to start, or null. */
export async function getPendingBooking(): Promise<ApiPendingBooking | null> {
  const res = await fetch(`${API_URL}/garages/${GARAGE_ID}/pending`);
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
}

// ── Booking lifecycle ───────────────────────────────────────────────────────

export async function startBooking(bookingId: string): Promise<void> {
  await fetch(`${API_URL}/bookings/${bookingId}/start`, { method: 'POST' });
}

export async function completeBooking(bookingId: string): Promise<void> {
  await fetch(`${API_URL}/bookings/${bookingId}/complete`, { method: 'POST' });
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await fetch(`${API_URL}/bookings/${bookingId}/cancel`, { method: 'POST' });
}

// ── Shared / Admin ──────────────────────────────────────────────────────────

export async function getVehicles(): Promise<ApiVehicle[]> {
  const res = await fetch(`${API_URL}/vehicles`);
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}
