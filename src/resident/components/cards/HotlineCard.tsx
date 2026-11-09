import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  ShieldCheck,
  Flame,
  HeartPulse,
  Siren,
  Phone,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { callHotlineApi } from '@/shared/api/incidents';
import { LocationPermissionModal, CallConfirmationModal } from '@/shared/components';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotlineService {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  number: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  /** Card background color */
  cardBg: string;
  /** Solid accent color (icon bg, top bar, button) */
  accent: string;
  /** Lighter tint used for the icon container */
  iconBg: string;
  /** Icon foreground color */
  iconColor: string;
  /** Shadow/glow color */
  shadowColor: string;
}

const SERVICES: HotlineService[] = [
  {
    id: 'police',
    name: 'Police',
    shortLabel: 'PNP',
    description: 'Emergency & crime response',
    number: '09358056370',
    icon: ShieldCheck,
    cardBg: '#FFFFFF',
    accent: '#1D4ED8',
    iconBg: '#EFF6FF',
    iconColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
  },
  {
    id: 'fire',
    name: 'Fire Dept.',
    shortLabel: 'BFP',
    description: 'Fire & rescue operations',
    number: '09758429491',
    icon: Flame,
    cardBg: '#FFFFFF',
    accent: '#C2410C',
    iconBg: '#FFF7ED',
    iconColor: '#C2410C',
    shadowColor: '#C2410C',
  },
  {
    id: 'health',
    name: 'Health Dept.',
    shortLabel: 'RHU / DOH',
    description: 'Medical & health emergencies',
    number: '0953678760',
    icon: HeartPulse,
    cardBg: '#FFFFFF',
    accent: '#059669',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    shadowColor: '#059669',
  },
  {
    id: 'mdrrmo',
    name: 'OPOL RESQ',
    shortLabel: 'MDRRMO',
    description: '24/7 disaster & emergency response',
    number: '0881234567',
    icon: Siren,
    cardBg: '#FFFFFF',
    accent: '#208AEF',
    iconBg: '#F0F7FF',
    iconColor: '#208AEF',
    shadowColor: '#208AEF',
  },
];

// ─── Individual service card ──────────────────────────────────────────────────
function ServiceCard({ service }: { service: HotlineService }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [isLocationModalVisible, setIsLocationModalVisible] = React.useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = React.useState(false);
  const IconComponent = service.icon;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const onAllowLocation = async () => {
    setIsLocationModalVisible(false);
    const url = `tel:${service.number}`;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Denied",
          "Location access is turned off. Please enable location permission to allow emergency responders to locate you accurately.\n\nFor your safety, please allow location access so responders can identify your current location during an emergency.",
          [{ text: "OK" }]
        );
        // Still allow them to call
        Linking.openURL(url);
        return;
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Send to backend
      await callHotlineApi(location.coords.latitude, location.coords.longitude);

      // Open dialer
      Linking.openURL(url);

    } catch (error) {
      console.warn("Failed to get location or send to backend:", error);
      Alert.alert(
        "Location Unavailable",
        "We couldn’t determine your current location. Please make sure Location Services are enabled and try again.",
        [{ text: "OK", onPress: () => Linking.openURL(url) }]
      );
    }
  };

  const onDenyLocation = () => {
    setIsLocationModalVisible(false);
    Linking.openURL(`tel:${service.number}`);
  };

  const handleCall = () => {
    // If it's the MDRRMO hotline, grab location and notify dispatcher first
    if (service.id === 'mdrrmo') {
      setIsLocationModalVisible(true);
      return;
    }

    // Open custom professional confirmation modal
    setIsCallModalVisible(true);
  };

  const handleConfirmCall = () => {
    setIsCallModalVisible(false);
    const url = `tel:${service.number}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Place Call', `Please dial ${service.number} manually on your device.`);
    });
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [{ scale }],
          shadowColor: service.shadowColor,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleCall}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardTouchable}
        accessibilityLabel={`Call ${service.name} emergency line`}
        accessibilityRole="button"
      >
        {/* Top accent bar */}
        <View style={[styles.accentBar, { backgroundColor: service.accent }]} />

        <View style={styles.cardContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: service.iconBg }]}>
            <IconComponent
              size={22}
              color={service.iconColor}
              strokeWidth={2.3}
            />
          </View>

          {/* Labels */}
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.name}
          </Text>
          <Text style={[styles.shortLabel, { color: service.accent }]} numberOfLines={1}>
            {service.shortLabel}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {service.description}
          </Text>

          {/* Call button */}
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: service.accent }]}
            onPress={handleCall}
            activeOpacity={0.85}
            accessibilityLabel={`Dial ${service.number}`}
          >
            <Phone size={12} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.callBtnText} numberOfLines={1}>{service.number}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <LocationPermissionModal 
        visible={isLocationModalVisible} 
        onAllow={onAllowLocation} 
        onDeny={onDenyLocation} 
      />

      <CallConfirmationModal
        visible={isCallModalVisible}
        serviceName={service.name}
        shortLabel={service.shortLabel}
        phoneNumber={service.number}
        description={service.description}
        accentColor={service.accent}
        iconBg={service.iconBg}
        iconColor={service.iconColor}
        IconComponent={IconComponent}
        onConfirm={handleConfirmCall}
        onCancel={() => setIsCallModalVisible(false)}
      />
    </Animated.View>
  );
}

// ─── 2×2 Grid ─────────────────────────────────────────────────────────────────
export function EmergencyHotlineGrid() {
  const topRow = SERVICES.slice(0, 2);
  const bottomRow = SERVICES.slice(2, 4);

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        {topRow.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </View>
      <View style={styles.row}>
        {bottomRow.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GAP = 10;

const styles = StyleSheet.create({
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  // ── card shell
  cardWrapper: {
    flex: 1,
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  cardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accentBar: {
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardContent: {
    padding: 13,
    alignItems: 'flex-start',
  },
  // ── icon
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  // ── text
  serviceName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  shortLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  description: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 11,
    minHeight: 30,
  },
  // ── call CTA
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
