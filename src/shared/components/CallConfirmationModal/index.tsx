import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Phone, ShieldCheck, X } from 'lucide-react-native';

export interface CallConfirmationModalProps {
  visible: boolean;
  serviceName: string;
  shortLabel?: string;
  phoneNumber: string;
  description?: string;
  accentColor?: string;
  iconBg?: string;
  iconColor?: string;
  IconComponent?: React.ComponentType<any>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CallConfirmationModal({
  visible,
  serviceName,
  shortLabel = 'HOTLINE',
  phoneNumber,
  description,
  accentColor = '#208AEF',
  iconBg,
  iconColor,
  IconComponent = Phone,
  onConfirm,
  onCancel,
}: CallConfirmationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const bgTint = iconBg || `${accentColor}18`;
  const fgColor = iconColor || accentColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <X size={18} color="#94A3B8" strokeWidth={2.4} />
              </TouchableOpacity>

              {/* Top Concentric Icon Badge */}
              <View style={[styles.outerIconRing, { backgroundColor: bgTint }]}>
                <View style={[styles.innerIconBadge, { backgroundColor: '#FFFFFF', borderColor: `${accentColor}40` }]}>
                  <IconComponent size={28} color={fgColor} strokeWidth={2.3} />
                </View>
              </View>

              {/* Agency Pill Badge */}
              <View
                style={[
                  styles.agencyBadge,
                  { backgroundColor: bgTint, borderColor: `${accentColor}35` },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.agencyBadgeText, { color: accentColor }]}>
                  {shortLabel} • EMERGENCY HOTLINE
                </Text>
              </View>

              {/* Main Dialog Title */}
              <Text style={styles.titleText}>Call {serviceName}?</Text>

              {/* Supporting Descriptive Context */}
              <Text style={styles.bodyText}>
                {description ||
                  `You are about to dial the official 24/7 dispatch hotline for ${serviceName} (${shortLabel}). Responders are available to assist you.`}
              </Text>

              {/* Highlighted Hotline Number Card */}
              <View style={styles.phoneHighlightCard}>
                <View style={styles.phoneTextCol}>
                  <Text style={styles.phoneLabel}>DIRECT HOTLINE</Text>
                  <Text style={styles.phoneNumber}>{phoneNumber}</Text>
                </View>
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>24/7 READY</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionCol}>
                {/* Primary Call Action */}
                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.88}
                  style={[
                    styles.primaryCallBtn,
                    {
                      backgroundColor: accentColor,
                      shadowColor: accentColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${phoneNumber} now`}
                >
                  <Phone size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryCallBtnText}>Call {phoneNumber}</Text>
                </TouchableOpacity>

                {/* Secondary Cancel Action */}
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  style={styles.cancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel emergency call"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Footer Trust Marker */}
              <View style={styles.footerNote}>
                <ShieldCheck size={13} color="#64748B" style={{ marginRight: 5 }} />
                <Text style={styles.footerNoteText}>
                  Verified MDRRMO Opol Municipal Emergency Directory
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  outerIconRing: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  innerIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  agencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
  },
  agencyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  phoneHighlightCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  phoneTextCol: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 5,
  },
  activeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  actionCol: {
    width: '100%',
    gap: 8,
  },
  primaryCallBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCallBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  footerNoteText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
