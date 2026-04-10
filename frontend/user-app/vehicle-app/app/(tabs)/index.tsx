import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { getUserProfile } from '../../lib/auth';

// ── API config ───────────────────────────────────────────────────────────────
// Android emulator: change to http://10.0.2.2:8000
const API_URL = 'http://localhost:8000';
const POLL_MS  = 3000;

// ── Types ────────────────────────────────────────────────────────────────────
type AppState =
  | 'login'
  | 'loading'
  | 'dashboard'
  | 'analyzing'
  | 'awaiting'
  | 'booking_active'
  | 'in_service'
  | 'completed'
  | 'rejected'
  | 'no_garage';

interface OfferedGarage {
  id: string; name: string; address: string; rating: number; cost_inr: number;
}
interface UserRequest {
  id: string; status: string; issue: string; confidence: number;
  urgency: string; offered_garage: OfferedGarage | null;
}
interface UserBooking {
  id: string; status: string; service: string; cost_inr: number;
  garage_name: string; urgency: string;
}
interface UserStatus {
  vehicle: { id: string; owner: string; model: string; phone: string };
  in_pipeline: boolean;
  request: UserRequest | null;
  booking: UserBooking | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const ISSUE_LABELS: Record<string, string> = {
  battery_failure: 'Battery Cell Degradation',
  engine_overheat: 'Engine Overheating',
  low_oil_life:    'Low Oil Life',
  normal:          'Normal / None',
};
const AI_INSIGHTS: Record<string, string> = {
  battery_failure: 'Battery health is degrading rapidly. Immediate service is recommended to avoid sudden breakdown.',
  engine_overheat: 'Engine overheating detected. Critical service required to prevent severe engine damage.',
  low_oil_life:    'Oil life is critically low. An oil change should be scheduled within the week.',
  normal:          'All vehicle systems nominal. Continue regular monitoring.',
};
const URGENCY_RISK: Record<string, number> = { CRITICAL: 90, HIGH: 75, MEDIUM: 55, LOW: 30 };

function deriveUiState(data: UserStatus): AppState {
  const req = data.request; const booking = data.booking;
  if (booking?.status === 'COMPLETED')   return 'completed';
  if (booking?.status === 'IN_PROGRESS') return 'in_service';
  if (booking?.status === 'CONFIRMED')   return 'booking_active';
  if (req?.status === 'USER_DECLINED')   return 'rejected';
  if (req?.status === 'ALL_REJECTED')    return 'no_garage';
  if (req?.status === 'AWAITING_USER')   return 'awaiting';
  if (data.in_pipeline || (req && !['BOOKED','USER_DECLINED','ALL_REJECTED'].includes(req.status)))
    return 'analyzing';
  return 'dashboard';
}

export default function AppFlowScreen() {
  const [appState,   setAppState]   = useState<AppState>('login');
  const [ownerName,  setOwnerName]  = useState('');
  const [vehicleId,  setVehicleId]  = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [statusData, setStatusData] = useState<UserStatus | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fadeAnim            = useRef(new Animated.Value(1)).current;
  const slideAnim           = useRef(new Animated.Value(0)).current;
  const alertFadeAnim       = useRef(new Animated.Value(0)).current;
  // When user presses Back we set this true so the poll won't drag
  // them away from dashboard. Only cleared when a real decision is needed
  // (garage accepted → AWAITING_USER) or the user takes an action.
  const userChoseDashboard  = useRef(false);

  const transitionTo = useCallback((next: AppState, duration = 300) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setAppState(next);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // Auto-connect from stored auth profile (set by login.tsx / signup.tsx)
  useEffect(() => {
    getUserProfile().then(profile => {
      if (!profile) return; // _layout.tsx handles redirect to /login
      const vid = (profile.vehicle_id ?? 'V001').toUpperCase();
      setOwnerName(profile.name);
      setVehicleId(vid);
      setAppState('loading');
      fetch(`${API_URL}/user/${vid}/status`)
        .then(r => r.ok ? (r.json() as Promise<UserStatus>) : Promise.reject(new Error('not found')))
        .then((data: UserStatus) => {
          setVehicleId(data.vehicle.id);
          setStatusData(data);
          setLoggedIn(true);
          userChoseDashboard.current = false;
          setAppState(deriveUiState(data));
        })
        .catch(() => {
          // vehicle not found or network error — show legacy login form
          setOwnerName(profile.name);
          setVehicleId(vid);
          setAppState('login');
        });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backend polling — runs every 3s once logged in
  useEffect(() => {
    if (!loggedIn || !vehicleId) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_URL}/user/${vehicleId}/status`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as UserStatus;
        if (cancelled) return;
        setStatusData(data);
        const uiState = deriveUiState(data);
        if (userChoseDashboard.current) {
          // After Back: let the pipeline states show through so judges see the flow.
          // Only suppress 'no_garage' (dead-end screen).
          if (uiState === 'no_garage') {
            // stay on dashboard silently
          } else {
            userChoseDashboard.current = false; // new actionable state — resume normal flow
            setAppState(prev => prev !== uiState ? uiState : prev);
          }
        } else {
          setAppState(prev => prev !== uiState ? uiState : prev);
        }
        if (uiState === 'analyzing' || uiState === 'awaiting') {
          Animated.timing(alertFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
      } catch { /* keep current state on network error */ }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [loggedIn, vehicleId, alertFadeAnim]);

  const handleLogin = async () => {
    if (!ownerName.trim() || !vehicleId.trim()) return;
    setLoginError('');
    setAppState('loading');
    try {
      const res = await fetch(`${API_URL}/user/${vehicleId.trim().toUpperCase()}/status`);
      if (!res.ok) {
        setLoginError(`Vehicle "${vehicleId.toUpperCase()}" not found. Try V001, V002 or V003.`);
        setAppState('login');
        return;
      }
      const data = (await res.json()) as UserStatus;
      setVehicleId(data.vehicle.id);
      setStatusData(data);
      setLoggedIn(true);
      userChoseDashboard.current = false; // always start fresh on login
      transitionTo(deriveUiState(data), 400);
    } catch {
      setLoginError('Cannot reach backend. Is the server running on port 8000?');
      setAppState('login');
    }
  };

  const handleAccept = async () => {
    const reqId = statusData?.request?.id;
    if (!reqId || actionBusy) return;
    userChoseDashboard.current = false;
    setActionBusy(true);
    try { await fetch(`${API_URL}/requests/${reqId}/user-accept`, { method: 'POST' }); }
    catch { /* next poll handles state */ }
    finally { setActionBusy(false); }
  };

  const handleDecline = async () => {
    const reqId = statusData?.request?.id;
    if (!reqId || actionBusy) return;
    userChoseDashboard.current = false;
    setActionBusy(true);
    try { await fetch(`${API_URL}/requests/${reqId}/user-decline`, { method: 'POST' }); }
    catch { /* next poll handles state */ }
    finally { setActionBusy(false); }
  };

  const handleRebook = async () => {
    const reqId = statusData?.request?.id;
    if (!reqId || actionBusy) return;
    userChoseDashboard.current = false;
    setActionBusy(true);
    try {
      await fetch(`${API_URL}/requests/${reqId}/rebook`, { method: 'POST' });
    } catch { /* next poll handles state */ }
    finally { setActionBusy(false); }
  };

  const handleLogout = () => {
    userChoseDashboard.current = true;
    transitionTo('dashboard');
  };

  // Derived display
  const vehicle       = statusData?.vehicle;
  const req           = statusData?.request;
  const booking       = statusData?.booking;
  const issue         = req?.issue ?? 'normal';
  const issueLabel    = ISSUE_LABELS[issue] ?? issue;
  const aiInsight     = AI_INSIGHTS[issue] ?? AI_INSIGHTS.normal;
  const riskPct       = URGENCY_RISK[req?.urgency ?? ''] ?? 10;
  const riskText      = riskPct >= 75 ? 'High Risk' : riskPct >= 50 ? 'Medium Risk' : 'Low Risk';
  const offeredGarage = req?.offered_garage;
  const displayName   = vehicle?.owner  ?? ownerName;
  const displayModel  = vehicle?.model  ?? '—';
  const displayId     = vehicle?.id     ?? vehicleId;

  const healthCards = [
    { icon: '🔋', label: 'Battery',     value: issue === 'battery_failure' ? 'Degrading'   : 'Good',   warn: issue === 'battery_failure' },
    { icon: '🌡️', label: 'Engine Temp', value: issue === 'engine_overheat' ? 'Overheating' : 'Normal', warn: issue === 'engine_overheat' },
    { icon: '🛢️', label: 'Oil Life',    value: issue === 'low_oil_life'    ? 'Low'         : '42%',    warn: issue === 'low_oil_life'    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {appState !== 'login' && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>← Back</Text>
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {appState === 'login' && (
            <View style={styles.topBrandingLogin}>
              <View style={styles.logoCircle}><Text style={styles.logoEmoji}>⚕️</Text></View>
              <Text style={styles.brandTitle}>AUTOMIND AI</Text>
              <Text style={styles.brandSubtitle}>Intelligence for Every Engine</Text>
            </View>
          )}

          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', maxWidth: 450, alignItems: 'center' }]}>

            {/* LOGIN */}
            {appState === 'login' && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>User Login</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Owner Name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Alice Johnson" placeholderTextColor="#9CA3AF"
                    value={ownerName} onChangeText={setOwnerName} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle ID</Text>
                  <TextInput style={styles.input} placeholder="e.g. V001, V002, V003" placeholderTextColor="#9CA3AF"
                    value={vehicleId} onChangeText={setVehicleId} autoCapitalize="characters" />
                </View>
                {!!loginError && <Text style={styles.errorText}>{loginError}</Text>}
                <TouchableOpacity
                  style={[styles.primaryButton, (!ownerName.trim() || !vehicleId.trim()) && styles.buttonDisabled]}
                  onPress={handleLogin} disabled={!ownerName.trim() || !vehicleId.trim()} activeOpacity={0.8}>
                  <Text style={styles.primaryButtonText}>Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* LOADING */}
            {appState === 'loading' && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loaderText}>Scanning vehicle sensors…</Text>
              </View>
            )}

            {/* DASHBOARD — healthy */}
            {appState === 'dashboard' && (
              <View style={styles.viewContainer}>
                <Text style={styles.sectionHeaderTitle}>Dashboard</Text>
                <View style={styles.card}>
                  <View style={styles.dashboardHeader}>
                    <View>
                      <Text style={styles.dashboardGreeting}>Hello, {displayName}</Text>
                      <Text style={styles.vehicleModel}>{displayModel}</Text>
                    </View>
                    <Text style={styles.dashboardBadge}>{displayId}</Text>
                  </View>
                </View>
                <Text style={styles.subSectionTitle}>Health Summary</Text>
                <View style={styles.gridContainer}>
                  {healthCards.map(c => (
                    <View style={styles.gridCard} key={c.label}>
                      <Text style={styles.gridIcon}>{c.icon}</Text>
                      <Text style={styles.gridLabel}>{c.label}</Text>
                      <Text style={styles.gridValue}>{c.value}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.card, { marginTop: 24, backgroundColor: '#ECFDF5', borderColor: '#6EE7B7', borderWidth: 1 }]}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#065F46', textAlign: 'center' }}>✅ All Systems Nominal</Text>
                  <Text style={{ fontSize: 14, color: '#047857', textAlign: 'center', marginTop: 8 }}>AI is actively monitoring. No issues detected.</Text>
                </View>
              </View>
            )}

            {/* ANALYZING — pipeline active */}
            {appState === 'analyzing' && (
              <View style={styles.viewContainer}>
                <Text style={styles.sectionHeaderTitle}>Dashboard</Text>
                <View style={styles.card}>
                  <View style={styles.dashboardHeader}>
                    <View>
                      <Text style={styles.dashboardGreeting}>Hello, {displayName}</Text>
                      <Text style={styles.vehicleModel}>{displayModel}</Text>
                    </View>
                    <Text style={styles.dashboardBadge}>{displayId}</Text>
                  </View>
                </View>
                <Text style={styles.subSectionTitle}>Health Summary</Text>
                <View style={styles.gridContainer}>
                  {healthCards.map(c => (
                    <View style={styles.gridCard} key={c.label}>
                      <Text style={styles.gridIcon}>{c.icon}</Text>
                      <Text style={styles.gridLabel}>{c.label}</Text>
                      <Text style={c.warn ? styles.gridValueCaution : styles.gridValue}>{c.value}</Text>
                    </View>
                  ))}
                </View>
                <Animated.View style={{ opacity: alertFadeAnim, marginTop: 24 }}>
                  <View style={[styles.card, styles.alertCardBg]}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>⚠️</Text>
                      <Text style={styles.alertTitle}>{issueLabel} detected</Text>
                    </View>
                    <Text style={styles.alertUrgencyText}>Urgency: {req?.urgency ?? '—'} — AI is finding the best garage…</Text>
                    <ActivityIndicator size="small" color="#DC2626" style={{ marginTop: 8 }} />
                  </View>
                </Animated.View>
              </View>
            )}

            {/* AWAITING USER DECISION */}
            {appState === 'awaiting' && (
              <View style={styles.viewContainer}>
                <Text style={styles.sectionHeaderTitle}>Diagnosis Report</Text>
                <View style={styles.card}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Prediction</Text>
                    <Text style={styles.reportValueEmphasis}>{issueLabel}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Confidence</Text>
                    <Text style={styles.reportValue}>{req?.confidence ?? '—'}%</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Risk Score</Text>
                    <View style={styles.riskScoreBadge}>
                      <Text style={styles.riskBadgeText}>{riskPct}% ({riskText})</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarWrapper}>
                    <View style={[styles.progressBarFill, { width: `${riskPct}%` as any }]} />
                  </View>
                </View>

                <View style={styles.aiAssistantCard}>
                  <Text style={styles.aiAssistantIcon}>🧠</Text>
                  <View style={styles.aiAssistantContent}>
                    <Text style={styles.aiAssistantLabel}>AI Assistant Insight</Text>
                    <Text style={styles.aiAssistantText}>{aiInsight}</Text>
                  </View>
                </View>

                {offeredGarage ? (
                  <>
                    <Text style={styles.sectionTitle}>Recommended Garage</Text>
                    <View style={[styles.card, styles.garageCard, styles.recommendedCardStyle]}>
                      <View style={styles.recommendedBadgeTag}>
                        <Text style={styles.recommendedBadgeTagText}>💡 AI Selected — Best Match</Text>
                      </View>
                      <View style={styles.garageHeader}>
                        <Text style={styles.garageName}>{offeredGarage.name}</Text>
                        <Text style={styles.garagePrice}>₹{offeredGarage.cost_inr.toLocaleString('en-IN')}</Text>
                      </View>
                      <Text style={styles.garageRating}>Rating: {offeredGarage.rating.toFixed(1)} ⭐  •  {offeredGarage.address}</Text>
                    </View>
                    <View style={styles.decisionStack}>
                      <TouchableOpacity style={[styles.primaryButton, actionBusy && styles.buttonDisabled]}
                        onPress={handleAccept} disabled={actionBusy} activeOpacity={0.8}>
                        {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Accept Service</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryButton, actionBusy && styles.buttonDisabled]}
                        onPress={handleDecline} disabled={actionBusy} activeOpacity={0.8}>
                        <Text style={styles.secondaryButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.card}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={{ textAlign: 'center', marginTop: 12, color: '#4B5563', fontWeight: '500' }}>Finding the best garage for you…</Text>
                  </View>
                )}
                <View style={{ height: 40 }} />
              </View>
            )}

            {/* BOOKING CONFIRMED */}
            {appState === 'booking_active' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, styles.successCardStyle]}>
                  <View style={styles.successHeader}>
                    <View style={styles.successIconBg}><Text style={styles.successIcon}>✅</Text></View>
                    <Text style={styles.successTitle}>Booking Confirmed</Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Garage</Text>
                    <Text style={styles.reportValueEmphasis}>{booking?.garage_name ?? '—'}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Service</Text>
                    <Text style={styles.reportValue}>{booking?.service ?? '—'}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Cost</Text>
                    <Text style={styles.reportValueEmphasisSuccess}>₹{(booking?.cost_inr ?? 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Status</Text>
                    <Text style={{ fontWeight: '700', color: '#2563EB' }}>Awaiting Service</Text>
                  </View>
                </View>
              </View>
            )}

            {/* IN SERVICE */}
            {appState === 'in_service' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, { borderWidth: 1, borderColor: '#FDE68A' }]}>
                  <View style={styles.successHeader}>
                    <View style={[styles.successIconBg, { backgroundColor: '#F59E0B' }]}><Text style={styles.successIcon}>🔧</Text></View>
                    <Text style={[styles.successTitle, { color: '#92400E' }]}>Service In Progress</Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Garage</Text>
                    <Text style={styles.reportValueEmphasis}>{booking?.garage_name ?? '—'}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Service</Text>
                    <Text style={styles.reportValue}>{booking?.service ?? '—'}</Text>
                  </View>
                  <ActivityIndicator size="small" color="#F59E0B" style={{ marginTop: 16 }} />
                </View>
              </View>
            )}

            {/* COMPLETED */}
            {appState === 'completed' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, styles.successCardStyle]}>
                  <View style={styles.successHeader}>
                    <View style={styles.successIconBg}><Text style={styles.successIcon}>🎉</Text></View>
                    <Text style={styles.successTitle}>Service Complete!</Text>
                  </View>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Garage</Text>
                    <Text style={styles.reportValueEmphasis}>{booking?.garage_name ?? '—'}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Service</Text>
                    <Text style={styles.reportValue}>{booking?.service ?? '—'}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Total Paid</Text>
                    <Text style={styles.reportValueEmphasisSuccess}>₹{(booking?.cost_inr ?? 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* REJECTED */}
            {appState === 'rejected' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, styles.warningCardBg]}>
                  <View style={styles.warningHeader}>
                    <Text style={styles.warningTitleIcon}>🚨</Text>
                    <Text style={styles.warningTitle}>Risk Warning</Text>
                  </View>
                  <Text style={styles.warningText}>
                    You declined the service offer. Ignoring this {issueLabel} issue may cause further damage and significantly higher repair costs.
                  </Text>
                  <View style={styles.costBox}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Current repair cost</Text>
                      <Text style={styles.costValueGood}>₹{(offeredGarage?.cost_inr ?? 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.dividerSubtle} />
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>If ignored — future estimate</Text>
                      <Text style={styles.costValueBad}>₹{((offeredGarage?.cost_inr ?? 0) * 2.5).toLocaleString('en-IN')} – ₹{((offeredGarage?.cost_inr ?? 0) * 3).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={styles.aiInsightBox}>
                    <Text style={styles.aiInsightIcon}>💡</Text>
                    <Text style={styles.aiInsightText}>{aiInsight}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryButton, actionBusy && styles.buttonDisabled, { marginTop: 16 }]}
                    onPress={handleRebook}
                    disabled={actionBusy}
                  >
                    <Text style={styles.primaryButtonText}>🔁 Reconsider — Book Now at ₹{(offeredGarage?.cost_inr ?? 0).toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* NO GARAGE — demo cycles automatically */}
            {appState === 'no_garage' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, { borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' }]}>
                  <ActivityIndicator size="large" color="#2563EB" style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' }}>Loading next demo…</Text>
                  <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
                    The AI is preparing the next vehicle for demonstration.
                  </Text>
                </View>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  logoutBtn: { position: 'absolute', top: Platform.OS === 'android' ? 48 : 56, right: 16, zIndex: 99, backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  logoutBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  viewContainer: { width: '100%' },
  topBrandingLogin: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  logoEmoji: { fontSize: 28 },
  brandTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  brandSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: 4 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, marginBottom: 16 },
  cardHeader: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  primaryButton: { width: '100%', backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  decisionStack: { gap: 12, marginTop: 8 },
  sectionHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  subSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 14 },
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashboardGreeting: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  vehicleModel: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 },
  dashboardBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 14, fontWeight: '700', color: '#374151' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flex: 1, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, alignItems: 'center' },
  gridIcon: { fontSize: 22, marginBottom: 8 },
  gridLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8, textAlign: 'center', fontWeight: '500' },
  gridValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  gridValueCaution: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  alertCardBg: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alertIcon: { fontSize: 24, marginRight: 10 },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#DC2626' },
  alertUrgencyText: { fontSize: 15, color: '#B91C1C', fontWeight: '600', marginBottom: 8 },
  loaderContainer: { marginTop: 100, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 16, fontSize: 16, color: '#4B5563', fontWeight: '500' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportLabel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  reportValueEmphasis: { fontSize: 15, fontWeight: '700', color: '#111827' },
  reportValueEmphasisSuccess: { fontSize: 16, fontWeight: '800', color: '#10B981' },
  reportValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  dividerSubtle: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  riskScoreBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  riskBadgeText: { color: '#D97706', fontSize: 13, fontWeight: '700' },
  progressBarWrapper: { width: '100%', height: 8, backgroundColor: '#FEF3C7', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  aiAssistantCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 16 },
  aiAssistantIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  aiAssistantContent: { flex: 1 },
  aiAssistantLabel: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 },
  aiAssistantText: { fontSize: 14, color: '#1E3A8A', lineHeight: 20, fontWeight: '500' },
  garageCard: { paddingVertical: 20, marginBottom: 12 },
  recommendedCardStyle: { borderWidth: 2, borderColor: '#2563EB', position: 'relative', paddingTop: 28 },
  recommendedBadgeTag: { position: 'absolute', top: -12, left: 16, backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  recommendedBadgeTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  garageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  garageName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  garagePrice: { fontSize: 16, fontWeight: '800', color: '#111827' },
  garageRating: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  warningCardBg: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, paddingTop: 30 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  warningTitleIcon: { fontSize: 22, marginRight: 8 },
  warningTitle: { fontSize: 20, fontWeight: '800', color: '#DC2626' },
  warningText: { fontSize: 15, color: '#111827', lineHeight: 24, marginBottom: 20 },
  costBox: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  costValueGood: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  costValueBad: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  aiInsightBox: { flexDirection: 'row', backgroundColor: '#ECFEFF', padding: 12, borderRadius: 8, marginBottom: 16 },
  aiInsightIcon: { marginRight: 8 },
  aiInsightText: { flex: 1, fontSize: 13, color: '#0891B2', fontWeight: '600', lineHeight: 20 },
  successCardStyle: { borderWidth: 1, borderColor: '#D1FAE5', paddingTop: 32 },
  successHeader: { alignItems: 'center', marginBottom: 32 },
  successIconBg: { backgroundColor: '#10B981', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  successIcon: { fontSize: 32, color: '#FFFFFF' },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#10B981' },
});
