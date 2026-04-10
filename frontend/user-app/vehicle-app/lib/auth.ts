/**
 * auth.ts — Auth helpers for the User App (Expo React Native).
 * Stores JWT token in AsyncStorage for persistent sessions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const TOKEN_KEY   = 'vehicle_ai_user_token';
const PROFILE_KEY = 'vehicle_ai_user_profile';

export interface UserProfile {
  id: string;
  name: string;
  car_model: string;
  car_number_plate: string;
  vehicle_id?: string;   // Demo vehicle ID assigned by backend (V001/V002/V003)
  phone?: string;
  email?: string;
  ml_category?: string;
  created_at: string;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
  message: string;
  ml_category?: string;
}

// ── Token management ──────────────────────────────────────────────────────────

export async function getUserToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function isUserLoggedIn(): Promise<boolean> {
  const token = await getUserToken();
  return !!token;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
}

async function saveSession(token: string, user: UserProfile): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function loginUser(
  identifier: string,
  password: string
): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  await saveSession(data.token, data.user);
  return data;
}

export async function signupUser(payload: {
  name: string;
  car_model: string;
  car_number_plate: string;
  password: string;
  phone?: string;
  email?: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/user/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Signup failed');
  await saveSession(data.token, data.user);
  return data;
}

export async function fetchUserMe(): Promise<UserProfile> {
  const token = await getUserToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/auth/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch profile');
  return data;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getUserToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Indian car models list ────────────────────────────────────────────────────
export const POPULAR_INDIAN_CARS = [
  'Tata Nexon', 'Tata Harrier', 'Tata Safari', 'Tata Punch', 'Tata Tiago', 'Tata Altroz',
  'Maruti Swift', 'Maruti Baleno', 'Maruti Alto', 'Maruti Wagon R', 'Maruti Brezza',
  'Maruti Ertiga', 'Maruti Dzire', 'Maruti Grand Vitara',
  'Hyundai Creta', 'Hyundai Venue', 'Hyundai i20', 'Hyundai Verna', 'Hyundai Alcazar',
  'Kia Seltos', 'Kia Sonet', 'Kia Carens',
  'Mahindra XUV700', 'Mahindra Scorpio N', 'Mahindra Thar', 'Mahindra XUV300',
  'Honda City', 'Honda Amaze', 'Honda Elevate',
  'Toyota Innova Crysta', 'Toyota Fortuner', 'Toyota Hyryder', 'Toyota Glanza',
  'Skoda Kushaq', 'Skoda Slavia',
  'Volkswagen Taigun', 'Volkswagen Virtus',
  'Renault Kwid', 'Renault Kiger', 'Renault Triber',
  'Nissan Magnite',
  'MG Hector', 'MG Astor', 'MG ZS EV',
  'Jeep Compass', 'Jeep Meridian',
  'Other',
];
