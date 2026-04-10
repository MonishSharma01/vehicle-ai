/**
 * auth.ts — Auth helpers for the garage dashboard.
 * Stores JWT in localStorage for persistent sessions.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface GarageProfile {
  id: string;
  garage_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  location: string;
  specialization: string;
  rating: number;
  created_at: string;
}

export interface AuthResult {
  token: string;
  garage: GarageProfile;
  message: string;
}

const TOKEN_KEY = 'vehicle_ai_garage_token';
const GARAGE_KEY = 'vehicle_ai_garage_profile';

// ── Token management ───────────────────────────────────────────────────────

export function getGarageToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getGarageProfile(): GarageProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(GARAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isGarageLoggedIn(): boolean {
  return !!getGarageToken();
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GARAGE_KEY);
}

function saveSession(token: string, garage: GarageProfile): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(GARAGE_KEY, JSON.stringify(garage));
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function loginGarage(
  identifier: string,
  password: string
): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/garage/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  saveSession(data.token, data.garage);
  return data;
}

export async function signupGarage(payload: {
  garage_name: string;
  owner_name: string;
  phone: string;
  location: string;
  specialization: string;
  password: string;
  email?: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/garage/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Signup failed');
  saveSession(data.token, data.garage);
  return data;
}

export async function fetchGarageMe(): Promise<GarageProfile> {
  const token = getGarageToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/auth/garage/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch profile');
  return data;
}

// Auth fetch wrapper — adds Bearer header to all API calls
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getGarageToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
