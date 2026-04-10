import React, { useState, useRef } from 'react';
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

type AppState = 'login' | 'loading' | 'dashboard' | 'diagnosis' | 'rejected' | 'accepted';

export default function AppFlowScreen() {
  const [appState, setAppState] = useState<AppState>('login');
  
  const [ownerName, setOwnerName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedGarageId, setSelectedGarageId] = useState<number>(2);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const alertFadeAnim = useRef(new Animated.Value(0)).current;

  // Mock Datas
  const MOCK_DIAGNOSIS = {
    model: 'Swift Dzire',
    prediction: 'Battery Degradation',
    recommendation: 'Battery Check and Replacement',
    riskScore: 72,
    riskText: 'Medium Risk',
  };

  const MOCK_GARAGES = [
    { id: 1, name: 'ElectroFix Auto Garage', price: 1200, rating: '4.5 ⭐', recommended: false },
    { id: 2, name: 'Prime Motors Services', price: 900, rating: '4.8 ⭐', recommended: true },
  ];

  const transitionTo = (nextState: AppState, duration = 300) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setAppState(nextState);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleLogin = () => {
    if (!ownerName.trim() || !vehicleNumber.trim()) return;

    transitionTo('loading', 400);

    // Simulate scanning delay
    setTimeout(() => {
      transitionTo('dashboard', 400);

      // Slide in AI alert slightly after dashboard load
      setTimeout(() => {
        Animated.timing(alertFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1200);

    }, 2500);
  };

  const getSelectedGarage = () => {
    return MOCK_GARAGES.find(g => g.id === selectedGarageId) || MOCK_GARAGES[1];
  };

  const activeGarage = getSelectedGarage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {appState === 'login' && (
            <View style={styles.topBrandingLogin}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>⚕️</Text>
              </View>
              <Text style={styles.brandTitle}>AUTOMIND AI</Text>
              <Text style={styles.brandSubtitle}>Intelligence for Every Engine</Text>
            </View>
          )}

          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', maxWidth: 450, alignItems: 'center' }]}>
            
            {/* ================= STEP 1: LOGIN ================= */}
            {appState === 'login' && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>User Login</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Owner Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#9CA3AF"
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MH 04 XY 1234"
                    placeholderTextColor="#9CA3AF"
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!ownerName.trim() || !vehicleNumber.trim()) && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={!ownerName.trim() || !vehicleNumber.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= LOADING ================= */}
            {appState === 'loading' && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loaderText}>Scanning vehicle sensors...</Text>
              </View>
            )}

            {/* ================= STEP 2: DASHBOARD ================= */}
            {appState === 'dashboard' && (
              <View style={styles.viewContainer}>
                <Text style={styles.sectionHeaderTitle}>Dashboard</Text>

                <View style={styles.card}>
                  <View style={styles.dashboardHeader}>
                    <View>
                      <Text style={styles.dashboardGreeting}>Hello, {ownerName}</Text>
                      <Text style={styles.vehicleModel}>{MOCK_DIAGNOSIS.model}</Text>
                    </View>
                    <Text style={styles.dashboardBadge}>{vehicleNumber}</Text>
                  </View>
                </View>

                <Text style={styles.subSectionTitle}>Health Summary</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridIcon}>🔋</Text>
                    <Text style={styles.gridLabel}>Battery</Text>
                    <Text style={styles.gridValueCaution}>Degrading</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridIcon}>🌡️</Text>
                    <Text style={styles.gridLabel}>Engine Temp</Text>
                    <Text style={styles.gridValue}>89°C</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridIcon}>🛢️</Text>
                    <Text style={styles.gridLabel}>Oil Life</Text>
                    <Text style={styles.gridValue}>42%</Text>
                  </View>
                </View>

                {/* AI ALERT (Fades in) */}
                <Animated.View style={{ opacity: alertFadeAnim, marginTop: 24 }}>
                  <View style={[styles.card, styles.alertCardBg]}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>⚠️</Text>
                      <Text style={styles.alertTitle}>Battery issue detected</Text>
                    </View>
                    
                    <Text style={styles.alertUrgencyText}>
                      Action required within 3 days
                    </Text>

                    <TouchableOpacity
                      style={styles.alertButton}
                      onPress={() => transitionTo('diagnosis')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.alertButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            )}

            {/* ================= STEP 3 & 4 & 5: DIAGNOSIS & GARAGES & DECISION ================= */}
            {appState === 'diagnosis' && (
              <View style={styles.viewContainer}>
                <Text style={styles.sectionHeaderTitle}>Diagnosis Report</Text>

                {/* Diagnosis Details */}
                <View style={styles.card}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Prediction</Text>
                    <Text style={styles.reportValueEmphasis}>{MOCK_DIAGNOSIS.prediction}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Recommendation</Text>
                    <Text style={styles.reportValue}>{MOCK_DIAGNOSIS.recommendation}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />

                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Risk Score</Text>
                    <View style={styles.riskScoreBadge}>
                      <Text style={styles.riskBadgeText}>{MOCK_DIAGNOSIS.riskScore}% ({MOCK_DIAGNOSIS.riskText})</Text>
                    </View>
                  </View>
                  
                  <View style={styles.progressBarWrapper}>
                    <View style={[styles.progressBarFill, { width: `${MOCK_DIAGNOSIS.riskScore}%` }]} />
                  </View>
                </View>

                {/* AI ASSISTANT SMART CARD */}
                <View style={styles.aiAssistantCard}>
                  <Text style={styles.aiAssistantIcon}>🧠</Text>
                  <View style={styles.aiAssistantContent}>
                    <Text style={styles.aiAssistantLabel}>AI Assistant Insight</Text>
                    <Text style={styles.aiAssistantText}>
                      Your battery health is degrading. Immediate service is recommended to avoid sudden breakdown in the next 72 hours.
                    </Text>
                  </View>
                </View>

                {/* GARAGE COMPARISON */}
                <Text style={styles.sectionTitle}>Garage Comparison</Text>
                {MOCK_GARAGES.map((garage) => (
                  <TouchableOpacity
                    key={garage.id}
                    style={[
                      styles.card, 
                      styles.garageCard,
                      garage.recommended && styles.recommendedCardStyle,
                      selectedGarageId === garage.id && styles.selectedGarageCard
                    ]}
                    onPress={() => setSelectedGarageId(garage.id)}
                    activeOpacity={0.9}
                  >
                    {garage.recommended && (
                      <View style={styles.recommendedBadgeTag}>
                        <Text style={styles.recommendedBadgeTagText}>💡 Recommended – Best Value</Text>
                      </View>
                    )}
                    
                    <View style={styles.garageHeader}>
                      <Text style={styles.garageName}>{garage.name}</Text>
                      <Text style={styles.garagePrice}>₹{garage.price}</Text>
                    </View>
                    <Text style={styles.garageRating}>Rating: {garage.rating}</Text>
                  </TouchableOpacity>
                ))}

                {/* USER DECISION */}
                <View style={styles.decisionStack}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => transitionTo('accepted')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Accept Service</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => transitionTo('rejected')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 40 }}/>
              </View>
            )}

            {/* ================= STEP 6B: REJECTED WARNING ================= */}
            {appState === 'rejected' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, styles.warningCardBg]}>
                  <View style={styles.warningHeader}>
                    <Text style={styles.warningTitleIcon}>🚨</Text>
                    <Text style={styles.warningTitle}>Risk Warning</Text>
                  </View>

                  <Text style={styles.warningText}>
                    Ignoring this issue may lead to engine failure and higher costs. Delaying service may increase cost by 2–3x.
                  </Text>

                  <View style={styles.costBox}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Fix now</Text>
                      <Text style={styles.costValueGood}>₹{activeGarage.price}</Text>
                    </View>
                    <View style={styles.dividerSubtle} />
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Later estimate</Text>
                      <Text style={styles.costValueBad}>₹2500+</Text>
                    </View>
                  </View>

                  <View style={styles.aiInsightBox}>
                    <Text style={styles.aiInsightIcon}>💡</Text>
                    <Text style={styles.aiInsightText}>
                      Smart Insight: Other garages may charge higher than ₹1200. We secured a reliable match for you.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: 20 }]}
                    onPress={() => transitionTo('accepted')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Reconsider & Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= STEP 6A: ACCEPTED RESOLVE ================= */}
            {appState === 'accepted' && (
              <View style={styles.viewContainer}>
                <View style={[styles.card, styles.successCardStyle]}>
                  <View style={styles.successHeader}>
                    <View style={styles.successIconBg}>
                      <Text style={styles.successIcon}>✅</Text>
                    </View>
                    <Text style={styles.successTitle}>Booking Confirmed</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Selected Garage</Text>
                    <Text style={styles.reportValueEmphasis}>{activeGarage.name}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />

                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Final Price</Text>
                    <Text style={styles.reportValueEmphasisSuccess}>₹{activeGarage.price}</Text>
                  </View>
                  <View style={styles.dividerSubtle} />

                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Time Slot</Text>
                    <Text style={styles.reportValue}>Tomorrow 10:00 AM</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { marginTop: 32 }]}
                    onPress={() => transitionTo('dashboard')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
                  </TouchableOpacity>
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
    backgroundColor: '#F9FAFB', // Light modern background
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  viewContainer: {
    width: '100%',
  },
  
  // Login Branding
  topBrandingLogin: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logoEmoji: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },

  // Cards
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Input Forms
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },

  // Buttons
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563EB', // Blue primary
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  decisionStack: {
    gap: 12,
    marginTop: 8,
  },

  // Typography
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 14,
  },

  // Dashboard
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardGreeting: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  vehicleModel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  dashboardBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  // Grid Stats
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  gridIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  gridValueCaution: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444', 
  },

  // Alert
  alertCardBg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  alertUrgencyText: {
    fontSize: 15,
    color: '#B91C1C',
    fontWeight: '600',
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading
  loaderContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },

  // Report Display
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  reportValueEmphasis: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  reportValueEmphasisSuccess: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  reportValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dividerSubtle: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },

  // Risk Score & Bar
  riskScoreBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  riskBadgeText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarWrapper: {
    width: '100%',
    height: 8,
    backgroundColor: '#FEF3C7', // Base track
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B', // Fill color
    borderRadius: 4,
  },

  // AI Assistant Inside Card
  aiAssistantCard: {
    backgroundColor: '#EFF6FF', // Soft AI blue
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  aiAssistantIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  aiAssistantContent: {
    flex: 1,
  },
  aiAssistantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  aiAssistantText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Garages
  garageCard: {
    paddingVertical: 20,
    marginBottom: 12,
  },
  recommendedCardStyle: {
    borderWidth: 2,
    borderColor: '#2563EB', // Blue outline
    position: 'relative',
    paddingTop: 28,
  },
  selectedGarageCard: {
    backgroundColor: '#F8FAFC',
  },
  recommendedBadgeTag: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recommendedBadgeTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  garageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  garageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  garagePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  garageRating: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Warning (Reject)
  warningCardBg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingTop: 30,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitleIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
  },
  warningText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 20,
  },
  costBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  costValueGood: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981', // green
  },
  costValueBad: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626', // red
  },
  aiInsightBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFEFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiInsightIcon: {
    marginRight: 8,
  },
  aiInsightText: {
    flex: 1,
    fontSize: 13,
    color: '#0891B2',
    fontWeight: '600',
    lineHeight: 20,
  },
  persuasionText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Accept / Success
  successCardStyle: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingTop: 32,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconBg: {
    backgroundColor: '#10B981',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIcon: {
    fontSize: 32,
    color: '#FFFFFF', // native emoji is colored but this ensures standard contrast
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
});
