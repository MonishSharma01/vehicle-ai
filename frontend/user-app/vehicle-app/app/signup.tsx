import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { signupUser, POPULAR_INDIAN_CARS } from '../lib/auth';

export default function SignupScreen() {
  const [form, setForm] = useState({
    name: '',
    car_model: '',
    car_number_plate: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showCarPicker, setCarPicker] = useState(false);
  const [carSearch, setCarSearch]     = useState('');

  const update = (k: keyof typeof form) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const filteredCars = POPULAR_INDIAN_CARS.filter(c =>
    c.toLowerCase().includes(carSearch.toLowerCase())
  );

  async function handleSignup() {
    const { name, car_model, car_number_plate, phone, email, password, confirm_password } = form;
    setError('');
    if (!name || !car_model || !car_number_plate || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!phone && !email) {
      setError('Please enter at least a phone number or email.');
      return;
    }
    if (password !== confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await signupUser({ name, car_model, car_number_plate, phone, email, password });
      setSuccess(`Account created! Welcome ${result.user.name} 🎉  Vehicle assigned: ${result.user.vehicle_id ?? 'V001'}`);
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <View style={s.logoIcon}>
              <Text style={{ fontSize: 32 }}>🚗</Text>
            </View>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.sub}>Join Vehicle AI — keep your car maintained</Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <Field label="Full Name *">
              <TextInput style={s.input} placeholder="Rahul Sharma"
                placeholderTextColor="#64748b" value={form.name} onChangeText={update('name')} />
            </Field>

            <Field label="Car Model *">
              <TouchableOpacity
                style={[s.input, s.selectBtn]}
                onPress={() => setCarPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={{ color: form.car_model ? '#f1f5f9' : '#64748b', fontSize: 14 }}>
                  {form.car_model || 'Tap to select your car…'}
                </Text>
                <Text style={{ color: '#6366f1' }}>▾</Text>
              </TouchableOpacity>
            </Field>

            <Field label="Number Plate *">
              <TextInput style={s.input} placeholder="MH12AB1234"
                placeholderTextColor="#64748b" value={form.car_number_plate}
                onChangeText={update('car_number_plate')} autoCapitalize="characters" />
            </Field>

            <Field label="Phone Number">
              <TextInput style={s.input} placeholder="9876543210"
                placeholderTextColor="#64748b" value={form.phone}
                onChangeText={update('phone')} keyboardType="phone-pad" />
            </Field>

            <Field label="Email">
              <TextInput style={s.input} placeholder="you@example.com"
                placeholderTextColor="#64748b" value={form.email}
                onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" />
            </Field>

            <Field label="Password *">
              <TextInput style={s.input} placeholder="Min. 6 characters"
                placeholderTextColor="#64748b" value={form.password}
                onChangeText={update('password')} secureTextEntry />
            </Field>

            <Field label="Confirm Password *">
              <TextInput style={s.input} placeholder="Repeat password"
                placeholderTextColor="#64748b" value={form.confirm_password}
                onChangeText={update('confirm_password')} secureTextEntry />
            </Field>

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Create Account →</Text>}
            </TouchableOpacity>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
            {!!success && (
              <View style={s.successBox}>
                <Text style={s.successText}>{success}</Text>
              </View>
            )}

            <TouchableOpacity style={s.link} onPress={() => router.push('/login')}>
              <Text style={s.linkText}>
                Already have an account? <Text style={s.linkAccent}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Car picker modal */}
      <Modal visible={showCarPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Your Car</Text>
            <TouchableOpacity onPress={() => setCarPicker(false)}>
              <Text style={{ color: '#6366f1', fontSize: 15, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.searchInput}
            placeholder="Search car model…"
            placeholderTextColor="#64748b"
            value={carSearch}
            onChangeText={setCarSearch}
          />
          <FlatList
            data={filteredCars}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.carItem, form.car_model === item && s.carItemActive]}
                onPress={() => {
                  setForm(f => ({ ...f, car_model: item }));
                  setCarPicker(false);
                  setCarSearch('');
                }}
              >
                <Text style={[s.carItemText, form.car_model === item && s.carItemTextActive]}>
                  {item}
                </Text>
                {form.car_model === item && <Text style={{ color: '#6366f1' }}>✓</Text>}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#1e293b' }} />}
          />
        </View>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  scroll:          { padding: 24, paddingBottom: 48 },
  header:          { alignItems: 'center', paddingVertical: 28 },
  logoIcon:        { width: 64, height: 64, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title:           { fontSize: 24, fontWeight: '700', color: '#f1f5f9' },
  sub:             { fontSize: 13, color: '#64748b', marginTop: 4 },
  card:            { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  label:           { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#f1f5f9' },
  selectBtn:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn:             { backgroundColor: '#6366f1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled:     { opacity: 0.5 },
  btnText:         { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:            { marginTop: 16, alignItems: 'center' },
  linkText:        { color: '#64748b', fontSize: 13 },
  linkAccent:      { color: '#818cf8', fontWeight: '600' },
  errorBox:        { marginTop: 10, backgroundColor: '#450a0a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7f1d1d' },
  errorText:       { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  successBox:      { marginTop: 10, backgroundColor: '#052e16', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#166534' },
  successText:     { color: '#86efac', fontSize: 13, textAlign: 'center' },
  modal:           { flex: 1, backgroundColor: '#0f172a' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  searchInput:    { margin: 16, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#f1f5f9' },
  carItem:        { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  carItemActive:  { backgroundColor: '#4f46e5' + '22' },
  carItemText:    { fontSize: 15, color: '#cbd5e1' },
  carItemTextActive: { color: '#818cf8', fontWeight: '600' },
});
