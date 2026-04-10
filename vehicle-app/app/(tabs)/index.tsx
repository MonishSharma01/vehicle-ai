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
} from 'react-native';

type AppState = 'login' | 'dashboard' | 'final' | 'accepted' | 'rejected';

export default function AppFlowScreen() {
  const [appState, setAppState] = useState<AppState>('login');
  
  // User Input
  const [ownerName, setOwnerName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Selected Garage in Final Step
  const [selectedGarageId, setSelectedGarageId] = useState<number>(2);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const alertFadeAnim = useRef(new Animated.Value(0)).current;
  const alertSlideAnim = useRef(new Animated.Value(20)).current;

  // Mock Datas
  const MOCK_DIAGNOSIS = {
    prediction: 'Battery Degradation',
    risk: 'High',
    recommendation: 'Immediate Replacement',
  };

  const MOCK_GARAGES = [
    { id: 1, name: 'Garage A', price: 1200, distance: '1.2 km', rating: '4.5 ⭐', recommended: false },
    { id: 2, name: 'Garage B', price: 900, distance: '2.5 km', rating: '4.8 ⭐', recommended: true },
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

    transitionTo('dashboard', 400);

    // Simulate alert pop-in after a short delay on the dashboard
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(alertFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(alertSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
    }, 1500);
  };

  const commonAnimationStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
    width: '100%',
  };

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
          {/* Header persistent branding */}
          <View style={styles.topBranding}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>⚕️</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>AUTOMIND AI</Text>
              <Text style={styles.brandSubtitle}>Intelligence for Every Engine</Text>
            </View>
          </View>

          <Animated.View style={commonAnimationStyle}>
            
            {/* ================= STEP 1: LOGIN ================= */}
            {appState === 'login' && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>User Login</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Owner Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#A0AAB5"
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MH 01 AB 1234"
                    placeholderTextColor="#A0AAB5"
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
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= STEP 2: DASHBOARD ================= */}
            {appState === 'dashboard' && (
              <View>
                {/* Vehicle Identity */}
                <View style={styles.card}>
                  <View style={styles.dashboardHeader}>
                    <Text style={styles.dashboardGreeting}>Hello, {ownerName}</Text>
                    <Text style={styles.dashboardBadge}>{vehicleNumber}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.vehicleDetailsRow}>
                    <View style={styles.vehicleStat}>
                      <Text style={styles.statLabel}>Make</Text>
                      <Text style={styles.statValue}>AUTOMIND</Text>
                    </View>
                    <View style={styles.vehicleStat}>
                      <Text style={styles.statLabel}>Model</Text>
                      <Text style={styles.statValue}>Sedan XZ</Text>
                    </View>
                    <View style={styles.vehicleStat}>
                      <Text style={styles.statLabel}>Year</Text>
                      <Text style={styles.statValue}>2021</Text>
                    </View>
                  </View>
                </View>

                {/* Live Stats */}
                <Text style={styles.sectionTitle}>Live Telemetry</Text>
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

                {/* Simulated Pop-in Alert Card */}
                <Animated.View style={{ opacity: alertFadeAnim, transform: [{ translateY: alertSlideAnim }], marginTop: 24 }}>
                  <View style={[styles.card, styles.alertCardBg]}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIconPulse}>⚠️</Text>
                      <Text style={styles.alertTitle}>Battery Issue Detected</Text>
                    </View>
                    
                    <Text style={styles.alertDesc}>
                      Our sensors have identified a critical irregularity requiring immediate attention.
                    </Text>

                    <TouchableOpacity
                      style={styles.alertButton}
                      onPress={() => transitionTo('final')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.alertButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            )}


            {/* ================= STEP 3: FINAL COMBINED SCREEN ================= */}
            {appState === 'final' && (
              <View>
                <Text style={styles.sectionTitle}>1. Diagnosis Report</Text>
                <View style={styles.card}>
                  <View style={styles.reportDesignBox}>
                    <View style={styles.reportRow}>
                      <Text style={styles.reportLabel}>Prediction</Text>
                      <Text style={styles.reportValueEmphasis}>{MOCK_DIAGNOSIS.prediction}</Text>
                    </View>
                    <View style={styles.dividerSubtle} />
                    
                    <View style={styles.reportRow}>
                      <Text style={styles.reportLabel}>Risk Level</Text>
                      <View style={styles.riskBadge}>
                        <Text style={styles.riskBadgeText}>{MOCK_DIAGNOSIS.risk}</Text>
                      </View>
                    </View>
                    <View style={styles.dividerSubtle} />
                    
                    <View style={styles.reportRow}>
                      <Text style={styles.reportLabel}>Recommendation</Text>
                      <Text style={styles.reportValue}>{MOCK_DIAGNOSIS.recommendation}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>2. Garage Comparison</Text>
                {MOCK_GARAGES.map((garage) => (
                  <TouchableOpacity
                    key={garage.id}
                    style={[
                      styles.card, 
                      garage.recommended && styles.recommendedCard,
                      selectedGarageId === garage.id && styles.selectedCard
                    ]}
                    onPress={() => setSelectedGarageId(garage.id)}
                    activeOpacity={0.9}
                  >
                    {garage.recommended && (
                      <View style={styles.recommendedBadgeTag}>
                        <Text style={styles.recommendedBadgeTagText}>Best Option</Text>
                      </View>
                    )}
                    
                    <View style={styles.garageHeader}>
                      <Text style={styles.garageName}>{garage.name}</Text>
                      <Text style={styles.garagePrice}>₹{garage.price}</Text>
                    </View>

                    <View style={styles.garageDetailsRow}>
                      <View style={styles.garageStat}>
                        <Text style={styles.garageStatIcon}>📍</Text>
                        <Text style={styles.garageStatText}>{garage.distance}</Text>
                      </View>
                      <View style={styles.garageStat}>
                        <Text style={styles.garageStatIcon}>⭐</Text>
                        <Text style={styles.garageStatText}>{garage.rating}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

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
              </View>
            )}

            {/* ================= STEP 4A: ACCEPTED ================= */}
            {appState === 'accepted' && (
              <View style={styles.card}>
                <View style={styles.successHeader}>
                  <View style={styles.successIconBg}>
                    <Text style={styles.successIcon}>✅</Text>
                  </View>
                  <Text style={styles.successTitle}>Booking Confirmed</Text>
                </View>

                <Text style={styles.successDesc}>
                  Your appointment at Garage B is scheduled. Please arrive safely.
                </Text>

                <View style={styles.divider} />
                
                <Text style={styles.successSubtext}>
                  Payment of ₹900 to be collected securely upon completion.
                </Text>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 20 }]}
                  onPress={() => transitionTo('dashboard')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= STEP 4B: REJECTED ================= */}
            {appState === 'rejected' && (
              <View style={[styles.card, styles.warningCardBg]}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningIcon}>🚨</Text>
                  <Text style={styles.warningTitle}>Warning</Text>
                </View>

                <Text style={styles.warningText}>
                  Delaying this issue could cause the battery to short-circuit, potentially harming expensive electrical components.
                </Text>

                <View style={styles.costBox}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Fix now</Text>
                    <Text style={styles.costValueGood}>₹900</Text>
                  </View>
                  <View style={styles.dividerSubtle} />
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Later estimate</Text>
                    <Text style={styles.costValueBad}>₹3000+</Text>
                  </View>
                </View>

                <Text style={styles.persuasionText}>
                  Delaying service radically increases costs.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 20 }]}
                  onPress={() => transitionTo('accepted')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Reconsider & Book</Text>
                </TouchableOpacity>
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
    backgroundColor: '#F5F6F8', // Modern Light Background
    paddingTop: Platform.OS === 'android' ? 40 : 0,
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
  
  // Persistent Top Branding
  topBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logoEmoji: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#6E7178',
    fontWeight: '500',
  },

  // Cards
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Forms
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },

  // Buttons
  primaryButton: {
    width: '100%',
    backgroundColor: '#1A73E8', 
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B3CFF7',
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
    borderColor: '#E9ECEF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  decisionStack: {
    gap: 12,
    marginTop: 12,
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  dividerSubtle: {
    height: 1,
    backgroundColor: '#F8F9FA',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    width: '100%',
    maxWidth: 400,
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Dashboard
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardGreeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dashboardBadge: {
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  vehicleDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#868E96',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Live Stats Grid
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  gridIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#868E96',
    marginBottom: 4,
    textAlign: 'center',
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  gridValueCaution: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D32F2F', // alert red
  },

  // Alert State
  alertCardBg: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE3E3',
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconPulse: {
    fontSize: 24,
    marginRight: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
  },
  alertDesc: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Report Display
  reportDesignBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 14,
    color: '#6E7178',
    fontWeight: '500',
  },
  reportValueEmphasis: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reportValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  riskBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  riskBadgeText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '700',
  },

  // Garages
  recommendedCard: {
    borderColor: '#1A73E8',
    borderWidth: 2,
    position: 'relative',
  },
  selectedCard: {
    backgroundColor: '#F8FAFF',
  },
  recommendedBadgeTag: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  garageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  garageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  garagePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32', // green
  },
  garageDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  garageStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  garageStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  garageStatText: {
    fontSize: 13,
    color: '#6E7178',
    fontWeight: '500',
  },

  // Success 
  successHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconBg: {
    backgroundColor: '#E8F5E9',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  successDesc: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 22,
  },
  successSubtext: {
    fontSize: 13,
    color: '#6E7178',
    textAlign: 'center',
    marginTop: 10,
  },

  // Reject / Warning
  warningCardBg: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE3E3',
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
  },
  warningText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
    marginBottom: 20,
  },
  costBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE3E3',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#555555',
  },
  costValueGood: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  costValueBad: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D32F2F',
  },
  persuasionText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
  },
});
