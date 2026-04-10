import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

type AppState = 'splash' | 'login' | 'loading' | 'dashboard' | 'diagnosis' | 'rejected' | 'accepted';

const GARAGES = [
  { id: 1, name: 'ElectroFix Auto', price: 1200, rating: '4.2', recommended: false },
  { id: 2, name: 'Prime Motors Services', price: 900, rating: '4.5', recommended: true },
];

export default function AutomobileApp() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [showSplash, setShowSplash] = useState(true);
  
  const [ownerName, setOwnerName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedGarageId, setSelectedGarageId] = useState<number>(2);

  // General Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const alertFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Splash Screen Animations
  const splashCarTranslateX = useRef(new Animated.Value(width * 1.2)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (appState === 'splash') {
      Animated.sequence([
        Animated.delay(300),
        // Drive into center from right
        Animated.spring(splashCarTranslateX, {
          toValue: 0,
          bounciness: 5,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.delay(1200), // Admire the car
        // Drive off screen rapidly to the left (straight)
        Animated.timing(splashCarTranslateX, {
          toValue: -width * 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowSplash(false);
        setAppState('login');
      });
    }
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

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

    setTimeout(() => {
      transitionTo('dashboard', 400);

      setTimeout(() => {
        Animated.timing(alertFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1200);

    }, 2500);
  };

  const activeGarage = GARAGES.find(g => g.id === selectedGarageId) || GARAGES[1];

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      {/* Red Gradient Audi Background */}
      <LinearGradient
        colors={['#5A0010', '#8D061A', '#C62E3B', '#F1DDE0', '#FAFAFA', '#FFFFFF']}
        locations={[0, 0.1, 0.35, 0.55, 0.65, 0.7]}
        style={StyleSheet.absoluteFillObject}
      />

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
            <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }]}>
              
              {/* ================= STEP 1: LOGIN ================= */}
              {appState === 'login' && (
                <View style={styles.contentPadderLogin}>
                  <View style={styles.loginCard}>
                    <View style={styles.brandingCenter}>
                      <Ionicons name="car-sport" size={60} color="#C8001F" />
                      <Text style={styles.titleText}>AutoMind AI</Text>
                      <Text style={styles.subtitleText}>The Intelligence for your engine</Text>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Owner Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. John Doe"
                        placeholderTextColor="#9CA3AF"
                        value={ownerName}
                        onChangeText={setOwnerName}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Vehicle Number Plate</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MH12AB1234"
                        placeholderTextColor="#9CA3AF"
                        value={vehicleNumber}
                        onChangeText={setVehicleNumber}
                        autoCapitalize="characters"
                      />
                    </View>

                    <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.primaryButton, (!ownerName.trim() || !vehicleNumber.trim()) && styles.buttonDisabled]}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={handleLogin}
                        disabled={!ownerName.trim() || !vehicleNumber.trim()}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.primaryButtonText}>ADD YOUR VEHICLE</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>
              )}

              {/* ================= LOADING ================= */}
              {appState === 'loading' && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={[styles.loaderText, { color: '#FFFFFF' }]}>Scanning vehicle sensors...</Text>
                </View>
              )}

              {/* ================= STEP 2: DASHBOARD ================= */}
              {appState === 'dashboard' && (
                <View style={styles.contentPadder}>
                  
                  {/* Faux Header imitating the reference */}
                  <View style={styles.topHeaderFlex}>
                    <Ionicons name="menu" size={28} color="#FFF" />
                    <Text style={styles.topHeaderTitle}>Vehicle Status</Text>
                    <Ionicons name="notifications-outline" size={24} color="#FFF" />
                  </View>

                  <View style={styles.dashboardHeader}>
                    <Text style={styles.dashboardGreeting}>Hi {ownerName || 'Aryan'} 👋</Text>
                    <Text style={styles.dashboardVehicle}>Vehicle: {GARAGES.length > 0 ? "Audi S5 Sportback" : "Swift Dzire"}</Text>
                  </View>

                  <View style={styles.healthStatsGrid}>
                    <View style={styles.healthCard}>
                      <Ionicons name="battery-dead" size={26} color="#4B5563" style={styles.iconSpaced} />
                      <Text style={styles.healthCardLabel}>Battery Health</Text>
                      <Text style={styles.healthCardValueRed}>65%</Text>
                    </View>
                    <View style={styles.healthCard}>
                      <MaterialCommunityIcons name="thermometer" size={26} color="#4B5563" style={styles.iconSpaced} />
                      <Text style={styles.healthCardLabel}>Engine Temp</Text>
                      <Text style={styles.healthCardValueNormal}>92°C</Text>
                    </View>
                    <View style={styles.healthCard}>
                      <MaterialCommunityIcons name="oil" size={26} color="#4B5563" style={styles.iconSpaced} />
                      <Text style={styles.healthCardLabel}>Oil Life</Text>
                      <Text style={styles.healthCardValueNormal}>30%</Text>
                    </View>
                  </View>

                  {/* AI ALERT */}
                  <Animated.View style={{ opacity: alertFadeAnim, width: '100%' }}>
                    <View style={[styles.card, styles.alertCardBg]}>
                      <View style={styles.alertHeaderRow}>
                        <Text style={styles.alertIconEmoji}>⚠️</Text>
                        <Text style={styles.alertTitle}>Battery Issue Detected</Text>
                      </View>
                      
                      <Text style={styles.alertUrgencyText}>
                        Action required within 3 days
                      </Text>

                      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                          style={styles.primaryButton}
                          onPressIn={handlePressIn}
                          onPressOut={handlePressOut}
                          onPress={() => transitionTo('diagnosis')}
                          activeOpacity={0.8}
                        >
                          <View style={styles.rowCentered}>
                            <Text style={styles.primaryButtonText}>View Details</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* ================= STEP 3 & 4: DIAGNOSIS & DECISION ================= */}
              {appState === 'diagnosis' && (
                <View style={[styles.contentPadder, { paddingTop: 60 }]}>
                  
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitleCenter}>Diagnosis Report</Text>
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Prediction</Text>
                      <Text style={styles.dataValueBold}>Battery Issue</Text>
                    </View>
                    <View style={styles.divider} />
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Recommendation</Text>
                      <Text style={styles.dataValueBold}>Battery Check Required</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Risk Score</Text>
                      <View style={styles.riskBadge}>
                        <Text style={styles.riskBadgeText}>72% Risk (Medium)</Text>
                      </View>
                    </View>
                    
                    {/* Progress bar mapped to 72% */}
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFill, { width: '72%' }]} />
                    </View>
                  </View>

                  {/* AI ASSISTANT CARD */}
                  <View style={styles.aiCard}>
                    <Ionicons name="sparkles" size={20} color="#C8001F" style={{ marginTop: 2, marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiCardText}>
                        <Text style={styles.aiCardBold}>AI Assistant:</Text> Your battery health is degrading. Immediate service is recommended to avoid breakdown.
                      </Text>
                    </View>
                  </View>

                  {/* GARAGES */}
                  <View style={{ width: '100%', marginTop: 10, marginBottom: 10 }}>
                    {GARAGES.map((garage) => (
                      <TouchableOpacity
                        key={garage.id}
                        style={[
                          styles.card,
                          styles.garageRowLayout,
                          garage.recommended && styles.recommendedGarageCard,
                          selectedGarageId === garage.id && styles.selectedGarageCard
                        ]}
                        onPress={() => setSelectedGarageId(garage.id)}
                        activeOpacity={0.7}
                      >
                        {garage.recommended && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>💡 Recommended – Best Value</Text>
                          </View>
                        )}
                        <View>
                          <Text style={styles.garageName}>{garage.name}</Text>
                          <Text style={styles.garageRating}>⭐ {garage.rating}</Text>
                        </View>
                        <Text style={styles.garagePrice}>₹{garage.price}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* DECISION BUTTONS */}
                  <View style={styles.actionButtonsContainer}>
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                      <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: '#10B981' }]} // Keep Success Green
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={() => transitionTo('accepted')}
                        activeOpacity={0.8}
                      >
                        <View style={styles.rowCentered}>
                          <Text style={styles.primaryButtonText}>✅ Accept Service</Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => transitionTo('rejected')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryButtonText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ================= STEP 5: REJECT FLOW ================= */}
              {appState === 'rejected' && (
                <View style={[styles.contentPadder, { paddingTop: 60 }]}>
                  <View style={styles.card}>
                    
                    <Text style={styles.warningTitleCenter}>⚠️</Text>
                    <Text style={styles.cardSectionTitleCenterDanger}>
                      Ignoring this issue may cause engine failure
                    </Text>

                    <View style={styles.costBox}>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Fix now</Text>
                        <Text style={styles.dataValueGreen}>₹{activeGarage.price}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Later</Text>
                        <Text style={styles.dataValueDanger}>₹2500+</Text>
                      </View>
                    </View>

                    <Text style={styles.textCautionCenter}>
                      Delaying may increase cost 2–3x
                    </Text>

                    <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 24 }}>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={() => transitionTo('accepted')}
                        activeOpacity={0.8}
                      >
                        <View style={styles.rowCentered}>
                          <Text style={styles.primaryButtonText}>Reconsider & Accept</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                        </View>
                      </TouchableOpacity>
                    </Animated.View>

                  </View>
                </View>
              )}

              {/* ================= STEP 6: ACCEPTED ================= */}
              {appState === 'accepted' && (
                <View style={[styles.contentPadder, { paddingTop: 60 }]}>
                  <View style={[styles.card, { borderColor: '#10B981', borderWidth: 2 }]}>
                    
                    <View style={styles.successHeaderCentered}>
                      <View style={styles.successCircle}>
                        <Ionicons name="checkmark" size={40} color="#10B981" />
                      </View>
                      <Text style={styles.successTitle}>Booking Confirmed</Text>
                    </View>

                    <View style={{ marginTop: 20 }}>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Garage</Text>
                        <Text style={styles.dataValueBold}>{activeGarage.name}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Price</Text>
                        <Text style={styles.dataValueBold}>₹{activeGarage.price}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Time</Text>
                        <Text style={styles.dataValueBold}>Tomorrow 10 AM</Text>
                      </View>
                    </View>

                    <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 30 }}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={() => transitionTo('dashboard')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
                      </TouchableOpacity>
                    </Animated.View>

                  </View>
                </View>
              )}

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* OVERLAY: SPLASH LOGO (Audi Theme) */}
      {showSplash && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.splashOverlay, { opacity: splashOpacity }]}>
          <LinearGradient
            colors={['#5A0010', '#8D061A', '#C62E3B']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.splashContent}>
            <Ionicons name="car-sport" size={60} color="#FFFFFF" style={{ marginBottom: 16 }} />
            <Text style={styles.splashBrand}>AutoMind AI</Text>
            <Text style={styles.splashSubText}>The Intelligence for your engine</Text>
          </View>

          <Animated.View style={[{ position: 'absolute', bottom: '30%', width: '100%'}, { transform: [{ translateX: splashCarTranslateX }] }]}>
            <Image 
              source={require('../../assets/images/car_side.png')} 
              style={{ width: width * 1.2, height: 260, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20 }} 
              contentFit="contain" 
            />
          </Animated.View>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  contentPadderLogin: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '30%',
  },
  contentPadder: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 20,
    alignItems: 'center',
  },

  // Headers
  topHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    marginTop: Platform.OS === 'android' ? 20 : 0
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Splash
  splashOverlay: {
    zIndex: 999,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: width * 0.4,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashBrand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  splashSubText: {
    fontSize: 14,
    color: '#FEF2F2',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 1
  },

  // Branding
  brandingCenter: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  // Login Card Specific
  loginCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  // Generic Cards
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  cardSectionTitleCenter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  cardSectionTitleCenterDanger: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 24,
    textAlign: 'center',
  },
  warningTitleCenter: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 10,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },

  // Buttons (Audi Red)
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#C8001F', // Red
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C8001F',
  },
  secondaryButtonText: {
    color: '#C8001F',
    fontSize: 16,
    fontWeight: '700',
  },

  // Loading
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '50%',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  // Dashboard
  dashboardHeader: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  dashboardGreeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dashboardVehicle: {
    fontSize: 16,
    color: '#FEF2F2',
    marginTop: 4,
    fontWeight: '500',
  },

  // Dashboard Stats Grid
  healthStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconSpaced: {
    marginBottom: 10,
  },
  healthCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  healthCardValueNormal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  healthCardValueRed: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C8001F',
  },

  // Alert Card
  alertCardBg: {
    backgroundColor: '#FFF1F2', 
    borderColor: '#FECDD3',
    borderWidth: 1,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIconEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BE123C',
  },
  alertUrgencyText: {
    fontSize: 14,
    color: '#E11D48',
    fontWeight: '500',
    marginBottom: 20,
  },

  // Diagnosis Details
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  dataValueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dataValueGreen: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  dataValueDanger: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C8001F',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },

  // Risk
  riskBadge: {
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
    height: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    marginTop: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },

  // AI Assistant Card
  aiCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    width: '100%',
    borderColor: '#FFE4E6',
    borderWidth: 1,
  },
  aiCardText: {
    fontSize: 14,
    color: '#9F1239',
    lineHeight: 22,
    fontWeight: '500',
  },
  aiCardBold: {
    fontWeight: '700',
  },

  // Garage Cards
  garageRowLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 12,
  },
  recommendedGarageCard: {
    borderColor: '#C8001F',
    borderWidth: 2,
    position: 'relative',
  },
  selectedGarageCard: {
    backgroundColor: '#F8FAFC',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: '#C8001F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  garageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  garageRating: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  garagePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C8001F',
  },

  // Reject Flow Cost Box
  costBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  textCautionCenter: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Success
  successHeaderCentered: {
    alignItems: 'center',
    marginBottom: 10,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
});
