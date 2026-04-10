import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { loginUser } from '../lib/auth';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleLogin() {
    if (!identifier || !password) {
      setError('Please enter your email/phone and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginUser(identifier, password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoBox}>
          <View style={s.logoIcon}>
            <Text style={s.logoEmoji}>🚗</Text>
          </View>
          <Text style={s.appName}>Vehicle AI</Text>
          <Text style={s.appSub}>Predictive Maintenance Platform</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.cardSub}>Sign in to monitor your vehicle</Text>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Email or Phone</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com or 9876543210"
              placeholderTextColor="#64748b"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Your password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In →</Text>}
          </TouchableOpacity>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={s.link} onPress={() => router.push('/signup')}>
            <Text style={s.linkText}>New user? <Text style={s.linkAccent}>Create account</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Demo hint */}
        <View style={s.hint}>
          <Text style={s.hintText}>
            🔒 Your session stays active until you log out
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0f172a' },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  logoBox:    { alignItems: 'center', marginBottom: 32 },
  logoIcon:   { width: 72, height: 72, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#6366f1', shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
  logoEmoji:  { fontSize: 36 },
  appName:    { fontSize: 26, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.5 },
  appSub:     { fontSize: 13, color: '#64748b', marginTop: 4 },
  card:       { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#334155' },
  cardTitle:  { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  cardSub:    { fontSize: 13, color: '#64748b', marginBottom: 24 },
  fieldGroup: { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  input:      { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 14, fontSize: 14, color: '#f1f5f9' },
  btn:        { backgroundColor: '#6366f1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:       { marginTop: 16, alignItems: 'center' },
  linkText:   { color: '#64748b', fontSize: 13 },
  linkAccent: { color: '#818cf8', fontWeight: '600' },
  hint:       { marginTop: 24, alignItems: 'center' },
  hintText:   { color: '#475569', fontSize: 12 },
  errorBox:   { marginTop: 12, backgroundColor: '#450a0a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7f1d1d' },
  errorText:  { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
});
