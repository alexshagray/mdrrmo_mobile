import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert as RNAlert,
} from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  X,
  Navigation,
} from 'lucide-react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  customIcon?: 'danger' | 'warning' | 'success' | 'info';
  customCategory?: string;
}

// Global reference to open the custom alert from anywhere
type AlertListener = (config: AlertConfig) => void;
let alertListener: AlertListener | null = null;
let isNativeAlertOverridden = false;

// Store original RN Alert.alert so we have a reliable fallback
const originalNativeAlert = RNAlert.alert.bind(RNAlert);

/**
 * Programmatic invocation for Custom Alert
 */
export function showCustomAlert(config: AlertConfig) {
  if (alertListener) {
    alertListener(config);
  } else {
    // Fallback to native alert if provider is not mounted
    originalNativeAlert(
      config.title,
      config.message,
      config.buttons,
      config.options
    );
  }
}

/**
 * Overrides RN's Alert.alert globally so all existing Alert.alert calls across the app
 * automatically use this professional, beautifully designed alert dialog.
 */
export function patchGlobalAlert() {
  if (isNativeAlertOverridden) return;

  RNAlert.alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => {
    if (alertListener) {
      alertListener({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
        options,
      });
    } else {
      originalNativeAlert(title, message, buttons, options);
    }
  };

  isNativeAlertOverridden = true;
}

export function restoreGlobalAlert() {
  if (!isNativeAlertOverridden) return;
  RNAlert.alert = originalNativeAlert;
  isNativeAlertOverridden = false;
}

/**
 * Determine theme colors, icons, and categories dynamically from title/message/buttons
 */
function getAlertTheme(
  title: string = '',
  message: string = '',
  buttons: AlertButton[] = [],
  customIcon?: string,
  customCategory?: string
) {
  const combined = `${title} ${message}`.toLowerCase();
  const hasDestructive = buttons.some(
    (b) => b.style === 'destructive' || /cancel|decline|delete|remove|reject/i.test(b.text || '')
  );

  // 1. DANGER / DECLINE / CANCEL / ERROR
  if (
    customIcon === 'danger' ||
    /decline|declined|cancel|cancelled|cancellation|delete|remove|rejected|failed|danger|error/i.test(title) ||
    (/cancel request|declined|remove patient/i.test(combined) && hasDestructive)
  ) {
    return {
      type: 'danger' as const,
      category:
        customCategory ||
        (/decline/i.test(title)
          ? 'MISSION DECLINED'
          : /cancel/i.test(title)
          ? 'CANCELLATION REQUEST'
          : /error|failed/i.test(title)
          ? 'SYSTEM NOTICE'
          : /remove/i.test(title)
          ? 'RECORD REMOVAL'
          : 'ACTION REQUIRED'),
      primaryColor: '#DC2626',
      primaryBg: '#DC2626',
      ringOuter: '#FEE2E2',
      ringInner: '#FEF2F2',
      badgeBg: '#FEF2F2',
      badgeBorder: '#FECACA',
      badgeText: '#DC2626',
      dotColor: '#EF4444',
      IconComponent: /decline|remove|failed|error/i.test(title) ? XCircle : AlertTriangle,
    };
  }

  // 2. WARNING / OVERRIDE / GPS DRIFT / OFFLINE
  if (
    customIcon === 'warning' ||
    /override|arrival override|warning|caution|gps|drift|offline|range|limit/i.test(combined) ||
    /override/i.test(title)
  ) {
    return {
      type: 'warning' as const,
      category:
        customCategory ||
        (/override/i.test(title)
          ? 'MANUAL GPS OVERRIDE'
          : /offline/i.test(combined)
          ? 'OFFLINE DISPATCH'
          : 'VERIFICATION NOTICE'),
      primaryColor: '#D97706',
      primaryBg: '#D97706',
      ringOuter: '#FEF3C7',
      ringInner: '#FFFBEB',
      badgeBg: '#FFFBEB',
      badgeBorder: '#FDE68A',
      badgeText: '#D97706',
      dotColor: '#F59E0B',
      IconComponent: /arrival|override|gps/i.test(title) ? Navigation : AlertCircle,
    };
  }

  // 3. SUCCESS / VERIFIED / ACCEPTED / SAVED
  if (
    customIcon === 'success' ||
    /success|verified|accepted|complete|completed|saved|connected|recorded/i.test(title)
  ) {
    return {
      type: 'success' as const,
      category: customCategory || 'MISSION UPDATE',
      primaryColor: '#059669',
      primaryBg: '#059669',
      ringOuter: '#D1FAE5',
      ringInner: '#ECFDF5',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      badgeText: '#059669',
      dotColor: '#10B981',
      IconComponent: CheckCircle2,
    };
  }

  // 4. INFORMATION / GENERAL NOTICE
  return {
    type: 'info' as const,
    category: customCategory || 'MDRRMO NOTICE',
    primaryColor: '#2563EB',
    primaryBg: '#2563EB',
    ringOuter: '#DBEAFE',
    ringInner: '#EFF6FF',
    badgeBg: '#EFF6FF',
    badgeBorder: '#BFDBFE',
    badgeText: '#2563EB',
    dotColor: '#3B82F6',
    IconComponent: Info,
  };
}

/**
 * Root Provider to place at the top of the app in _layout.tsx
 */
export function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const [currentAlert, setCurrentAlert] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Mount global interceptor
  useEffect(() => {
    alertListener = (config: AlertConfig) => {
      setCurrentAlert(config);
      setVisible(true);
    };

    patchGlobalAlert();

    return () => {
      alertListener = null;
    };
  }, []);

  // Handle animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          speed: 24,
          bounciness: 6,
          useNativeDriver: true,
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

  const handleDismiss = useCallback(
    (onPressCallback?: () => void) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setCurrentAlert(null);
        if (onPressCallback) {
          onPressCallback();
        }
      });
    },
    [scaleAnim, opacityAnim]
  );

  const buttons = currentAlert?.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : [{ text: 'OK' }];

  const hasCancelButton = buttons.some(
    (b) => b.style === 'cancel' || /cancel|close|dismiss|keep/i.test(b.text || '')
  );

  const isCancelable = currentAlert?.options?.cancelable ?? (hasCancelButton || buttons.length === 1);

  const handleBackdropPress = () => {
    if (!isCancelable) return;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    handleDismiss(cancelBtn?.onPress || currentAlert?.options?.onDismiss);
  };

  const theme = getAlertTheme(
    currentAlert?.title,
    currentAlert?.message,
    buttons,
    currentAlert?.customIcon,
    currentAlert?.customCategory
  );

  // Group buttons into primary & secondary
  const isSingleButton = buttons.length === 1;
  const isTwoButtons = buttons.length === 2;

  // Split multi-paragraph message if any
  const messageParagraphs = currentAlert?.message
    ? currentAlert.message.split('\n\n').filter((p) => p.trim().length > 0)
    : [];

  return (
    <>
      {children}

      {visible && currentAlert && (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => {
            if (isCancelable) {
              handleBackdropPress();
            }
          }}
        >
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.card,
                    {
                      opacity: opacityAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  {/* Top-Right Dismiss Icon (if cancelable) */}
                  {isCancelable && (
                    <TouchableOpacity
                      onPress={handleBackdropPress}
                      activeOpacity={0.7}
                      style={styles.closeBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <X size={18} color="#94A3B8" strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}

                  {/* Concentric Icon Ring */}
                  <View style={[styles.outerIconRing, { backgroundColor: theme.ringOuter }]}>
                    <View style={[styles.innerIconBadge, { backgroundColor: theme.ringInner }]}>
                      <theme.IconComponent size={28} color={theme.primaryColor} strokeWidth={2.3} />
                    </View>
                  </View>

                  {/* Category Status Pill */}
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor: theme.badgeBg,
                        borderColor: theme.badgeBorder,
                      },
                    ]}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: theme.dotColor }]} />
                    <Text style={[styles.categoryText, { color: theme.badgeText }]}>
                      {theme.category}
                    </Text>
                  </View>

                  {/* Dialog Title */}
                  <Text style={styles.titleText}>{currentAlert.title}</Text>

                  {/* Dialog Body Message */}
                  {messageParagraphs.length > 0 && (
                    <View style={styles.messageContainer}>
                      {messageParagraphs.map((para, idx) => (
                        <Text
                          key={idx}
                          style={[
                            styles.messageText,
                            idx > 0 && { marginTop: 8 },
                            // If paragraph contains GPS distance, style it with highlighted badge feel
                            para.includes('GPS reports') && styles.highlightedParagraph,
                          ]}
                        >
                          {para}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.buttonContainer}>
                    {isSingleButton ? (
                      // Single Button (Full-width prominent button)
                      <TouchableOpacity
                        onPress={() => handleDismiss(buttons[0].onPress)}
                        activeOpacity={0.85}
                        style={[
                          styles.primaryBtn,
                          {
                            backgroundColor:
                              theme.type === 'danger'
                                ? '#DC2626'
                                : theme.type === 'warning'
                                ? '#0F172A'
                                : theme.primaryBg,
                          },
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>{buttons[0].text || 'OK'}</Text>
                      </TouchableOpacity>
                    ) : isTwoButtons ? (
                      // Two Buttons: Primary on top (or confirmation), secondary cancel below for zero miss-taps
                      <View style={styles.buttonCol}>
                        {(() => {
                          const cancelIndex = buttons.findIndex((b) => b.style === 'cancel');
                          const primaryIndex = cancelIndex === 0 ? 1 : 0;
                          const primaryBtn = buttons[primaryIndex];
                          const cancelBtn = buttons[cancelIndex >= 0 ? cancelIndex : 1];

                          const isDestructive =
                            primaryBtn.style === 'destructive' ||
                            theme.type === 'danger' ||
                            /cancel|decline|delete|remove/i.test(primaryBtn.text || '');

                          return (
                            <>
                              <TouchableOpacity
                                onPress={() => handleDismiss(primaryBtn.onPress)}
                                activeOpacity={0.85}
                                style={[
                                  styles.primaryBtn,
                                  {
                                    backgroundColor: isDestructive
                                      ? '#DC2626'
                                      : theme.type === 'warning'
                                      ? '#0F172A'
                                      : theme.primaryBg,
                                  },
                                ]}
                              >
                                {isDestructive && (
                                  <XCircle size={17} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                                )}
                                {theme.type === 'warning' && !isDestructive && (
                                  <Navigation size={17} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                                )}
                                <Text style={styles.primaryBtnText}>{primaryBtn.text}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDismiss(cancelBtn.onPress)}
                                activeOpacity={0.7}
                                style={styles.secondaryBtn}
                              >
                                <Text style={styles.secondaryBtnText}>{cancelBtn.text}</Text>
                              </TouchableOpacity>
                            </>
                          );
                        })()}
                      </View>
                    ) : (
                      // 3+ Buttons (Stacked)
                      <View style={styles.buttonCol}>
                        {buttons.map((btn, index) => {
                          const isCancel = btn.style === 'cancel';
                          const isDestructive = btn.style === 'destructive';
                          return (
                            <TouchableOpacity
                              key={index}
                              onPress={() => handleDismiss(btn.onPress)}
                              activeOpacity={0.8}
                              style={[
                                isCancel ? styles.secondaryBtn : styles.primaryBtn,
                                isDestructive && { backgroundColor: '#DC2626' },
                              ]}
                            >
                              <Text style={isCancel ? styles.secondaryBtnText : styles.primaryBtnText}>
                                {btn.text}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Footer Trust Marker */}
                  <View style={styles.footerRow}>
                    <ShieldCheck size={13} color="#94A3B8" strokeWidth={2.2} style={{ marginRight: 5 }} />
                    <Text style={styles.footerText}>MDRRMO OPOL • RESQ SYSTEM</Text>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(width - 40, 390),
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outerIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  innerIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  messageContainer: {
    width: '100%',
    marginBottom: 20,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '400',
  },
  highlightedParagraph: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#334155',
    fontWeight: '500',
    fontSize: 13.5,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 4,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 14.5,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
});
