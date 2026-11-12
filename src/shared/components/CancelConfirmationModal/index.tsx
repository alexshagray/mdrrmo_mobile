import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, XCircle, ShieldCheck, X } from 'lucide-react-native';

export interface CancelConfirmationModalProps {
  visible: boolean;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  incidentCode?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelConfirmationModal({
  visible,
  isLoading = false,
  title = 'Cancel Emergency Request?',
  subtitle = 'Are you sure you want to cancel this emergency request? Responders will not be dispatched and this triage mission will be closed.',
  incidentCode,
  onConfirm,
  onClose,
}: CancelConfirmationModalProps) {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={isLoading ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
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
                onPress={onClose}
                disabled={isLoading}
                activeOpacity={0.7}
                style={[styles.closeBtn, isLoading && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <X size={18} color="#94A3B8" strokeWidth={2.4} />
              </TouchableOpacity>

              {/* Top Concentric Icon Ring */}
              <View style={styles.outerIconRing}>
                <View style={styles.innerIconBadge}>
                  <AlertTriangle size={28} color="#DC2626" strokeWidth={2.3} />
                </View>
              </View>

              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>
                  {incidentCode ? `${incidentCode} • CANCELLATION` : 'ACTION REQUIRED • CANCELLATION'}
                </Text>
              </View>

              {/* Title */}
              <Text style={styles.titleText}>{title}</Text>

              {/* Description */}
              <Text style={styles.bodyText}>{subtitle}</Text>

              {/* Warning Notice Box */}
              <View style={styles.warningCard}>
                <View style={styles.warningIconCol}>
                  <AlertTriangle size={15} color="#D97706" strokeWidth={2.4} />
                </View>
                <Text style={styles.warningText}>
                  If you or someone nearby still requires emergency care, please keep this request active or dial <Text style={styles.boldRed}>911</Text> directly.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionCol}>
                {/* Primary Destructive Cancel Request */}
                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  style={[styles.confirmCancelBtn, isLoading && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm cancel request"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <XCircle size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                      <Text style={styles.confirmCancelBtnText}>Yes, Cancel Request</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Secondary Keep Request */}
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  style={styles.keepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Keep request active"
                >
                  <Text style={styles.keepBtnText}>Keep Request Active</Text>
                </TouchableOpacity>
              </View>

              {/* Footer Trust Marker */}
              <View style={styles.footerNote}>
                <ShieldCheck size={13} color="#94A3B8" style={{ marginRight: 5 }} />
                <Text style={styles.footerNoteText}>
                  MDRRMO Opol Emergency Medical Services
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
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
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
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  innerIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    backgroundColor: '#DC2626',
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 19.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  warningCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  warningIconCol: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '500',
  },
  boldRed: {
    fontWeight: '800',
    color: '#DC2626',
  },
  actionCol: {
    width: '100%',
    gap: 8,
  },
  confirmCancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  keepBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keepBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.4,
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

