'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signupGarage } from '@/lib/auth';

const SPECIALIZATIONS = [
  'battery', 'engine', 'oil', 'transmission', 'brakes', 'tires', 'electrical', 'general',
];

export default function GarageSignup() {
  const router = useRouter();
  const [form, setForm] = useState({
    garage_name: '',
    owner_name: '',
    phone: '',
    location: '',
    specialization: 'general',
    password: '',
    confirm_password: '',
    email: '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await signupGarage({
        garage_name:   form.garage_name,
        owner_name:    form.owner_name,
        phone:         form.phone,
        location:      form.location,
        specialization: form.specialization,
        password:      form.password,
        email:         form.email,
      });
      setSuccess(`Garage registered! Your Garage ID: ${result.garage.id}`);
      setTimeout(() => router.push('/'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Register Your Garage</h1>
          <p className="text-slate-400 text-sm mt-1">Join the Vehicle AI Maintenance Network</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {success && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row: Garage name + Owner */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Garage Name" required>
                <input value={form.garage_name} onChange={update('garage_name')}
                  placeholder="Sharma Auto Works" required className={inputCls} />
              </Field>
              <Field label="Owner Name" required>
                <input value={form.owner_name} onChange={update('owner_name')}
                  placeholder="Ramesh Sharma" required className={inputCls} />
              </Field>
            </div>

            {/* Row: Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required>
                <input value={form.phone} onChange={update('phone')}
                  placeholder="9876543210" type="tel" required className={inputCls} />
              </Field>
              <Field label="Email (optional)">
                <input value={form.email} onChange={update('email')}
                  placeholder="garage@email.com" type="email" className={inputCls} />
              </Field>
            </div>

            {/* Location */}
            <Field label="Full Address / Location" required>
              <input value={form.location} onChange={update('location')}
                placeholder="123 MG Road, Pune, Maharashtra" required className={inputCls} />
            </Field>

            {/* Specialization */}
            <Field label="Primary Specialization" required>
              <select value={form.specialization} onChange={update('specialization')} className={inputCls} required>
                {SPECIALIZATIONS.map(s => (
                  <option key={s} value={s} style={{ background: '#1e293b' }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </Field>

            {/* Row: Password + Confirm */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" required>
                <input value={form.password} onChange={update('password')}
                  type="password" placeholder="Min. 6 characters" required minLength={6} className={inputCls} />
              </Field>
              <Field label="Confirm Password" required>
                <input value={form.confirm_password} onChange={update('confirm_password')}
                  type="password" placeholder="Repeat password" required className={inputCls} />
              </Field>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registering…
                </>
              ) : 'Register Garage'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already registered?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white caret-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition text-sm';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
