import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  Mail,
  Smartphone,
  Settings,
  User,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { BrandBackground } from '@/shared/components';
import { changeResidentPasswordApi, changeResponderPasswordApi } from '@/shared/api/residents';

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { user, role, logout } = useAuth();

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<'current' | 'new' | 'confirm' | null>(null);

  // UI Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sign Out Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Validation Rules
  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = isMinLength && isMatching && currentPassword.trim().length > 0;

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = 'Enter your current password';
    }

    if (!newPassword) {
      errs.newPassword = 'Enter a new password';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const payload = {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      };

      let res;
      if (role === 'responder') {
        res = await changeResponderPasswordApi(payload);
      } else {
        res = await changeResidentPasswordApi(payload);
      }

      setSuccessMessage(res.message || 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.current_password?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        'Unable to update password. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch {
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/profile');
    }
  };

  // User display info
  const userEmail = user?.email || '—';
  const userPhone = user?.phone_number || user?.phone || user?.contact_number || '—';
  const userFullName =
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    'Resident User';

  return (
    <View style={styles.screenContainer}>
      <BrandBackground variant="subpage" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* Top Header App Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerIconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleText}>Account & Security</Text>
              <Text style={styles.headerSubtitleText}>Credentials & Authentication</Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/profile')}
              style={styles.headerIconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Profile settings"
            >
              <Settings size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── 1. ACCOUNT IDENTITY CARD ── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.shieldIconBox}>
                    <ShieldCheck size={22} color="#1E88E5" strokeWidth={2.3} />
                  </View>
                  <View style={styles.headerTextCol}>
                    <Text style={styles.cardTitle}>Account Identity</Text>
                    <Text style={styles.cardSubtitle}>Verified system profile</Text>
                  </View>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.infoList}>
                {/* Email Address Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Mail size={16} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoLabelText}>Email Address</Text>
                  </View>
                  <Text style={styles.infoValueText} numberOfLines={2}>
                    {userEmail}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Mobile Number Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Smartphone size={16} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoLabelText}>Mobile Number</Text>
                  </View>
                  <Text style={styles.infoValueText}>
                    {userPhone}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Role Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Text style={styles.infoLabelText}>Role</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {role === 'responder' ? 'EMERGENCY RESPONDER' : 'RESIDENT'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 2. CHANGE PASSWORD CARD ── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.keyIconBox}>
                    <KeyRound size={22} color="#D97706" strokeWidth={2.2} />
                  </View>
                  <View style={styles.headerTextCol}>
                    <Text style={styles.cardTitle}>Change Password</Text>
                    <Text style={styles.cardSubtitle}>Update your secure access key</Text>
                  </View>
                </View>
              </View>

              {/* Feedback Banners */}
              {successMessage ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={18} color="#059669" strokeWidth={2.3} />
                  <Text style={styles.successBannerText}>{successMessage}</Text>
                </View>
              ) : null}

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#DC2626" strokeWidth={2.3} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Input 1: Current Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Current Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'current' && styles.inputFocused,
                    !!fieldErrors.currentPassword && styles.inputError,
                  ]}
                >
                  <TextInput
                    value={currentPassword}
                    onChangeText={(val) => {
                      setCurrentPassword(val);
                      if (fieldErrors.currentPassword) {
                        setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }
                    }}
                    onFocus={() => setFocusedField('current')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInputField}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconButton}
                    accessibilityRole="button"
                    accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? (
                      <EyeOff size={19} color="#64748B" strokeWidth={2} />
                    ) : (
                      <Eye size={19} color="#64748B" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.currentPassword ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.currentPassword}</Text>
                ) : null}
              </View>

              {/* Input 2: New Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  New Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'new' && styles.inputFocused,
                    !!fieldErrors.newPassword && styles.inputError,
                  ]}
                >
                  <TextInput
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (fieldErrors.newPassword) {
                        setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    onFocus={() => setFocusedField('new')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInputField}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconButton}
                    accessibilityRole="button"
                    accessibilityLabel={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? (
                      <EyeOff size={19} color="#64748B" strokeWidth={2} />
                    ) : (
                      <Eye size={19} color="#64748B" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.newPassword ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.newPassword}</Text>
                ) : null}
              </View>

              {/* Input 3: Confirm New Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Confirm New Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'confirm' && styles.inputFocused,
                    !!fieldErrors.confirmPassword && styles.inputError,
                  ]}
                >
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Repeat new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInputField}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconButton}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <EyeOff size={19} color="#64748B" strokeWidth={2} />
                    ) : (
                      <Eye size={19} color="#64748B" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.confirmPassword ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* ── 3. PASSWORD REQUIREMENTS BOX ── */}
              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>PASSWORD REQUIREMENTS</Text>

                {/* Requirement 1: Min 8 chars */}
                <View style={styles.requirementRow}>
                  <View
                    style={[
                      styles.reqIndicator,
                      isMinLength ? styles.reqIndicatorActive : styles.reqIndicatorInactive,
                    ]}
                  >
                    {isMinLength ? (
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <View style={styles.reqDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.requirementText,
                      isMinLength ? styles.requirementTextActive : styles.requirementTextInactive,
                    ]}
                  >
                    Minimum 8 characters
                  </Text>
                </View>

                {/* Requirement 2: Passwords match */}
                <View style={styles.requirementRow}>
                  <View
                    style={[
                      styles.reqIndicator,
                      isMatching ? styles.reqIndicatorActive : styles.reqIndicatorInactive,
                    ]}
                  >
                    {isMatching ? (
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <View style={styles.reqDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.requirementText,
                      isMatching ? styles.requirementTextActive : styles.requirementTextInactive,
                    ]}
                  >
                    Passwords match
                  </Text>
                </View>
              </View>

              {/* Primary Change Password Action Button */}
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isLoading || !isFormValid}
                style={[
                  styles.primaryActionButton,
                  isFormValid ? styles.primaryActionButtonValid : styles.primaryActionButtonDisabled,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Change Password"
              >
                {isLoading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonLoadingText}>Updating Password...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInnerRow}>
                    <Lock
                      size={17}
                      color={isFormValid ? '#FFFFFF' : '#94A3B8'}
                      strokeWidth={2.2}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.primaryActionText,
                        isFormValid ? styles.primaryActionTextValid : styles.primaryActionTextDisabled,
                      ]}
                    >
                      Change Password
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── 4. SIGN OUT ACTION SECTION ── */}
            <TouchableOpacity
              onPress={() => setShowLogoutModal(true)}
              style={styles.signOutButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign Out of Account"
            >
              <LogOut size={17} color="#DC2626" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.signOutButtonText}>SIGN OUT OF ACCOUNT</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* ── 5. LOG OUT CONFIRMATION MODAL ── */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showLogoutModal}
            onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => !isLoggingOut && setShowLogoutModal(false)}
              style={styles.modalBackdrop}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={styles.modalCard}
              >
                {/* Icon Badge */}
                <View style={styles.modalIconBadge}>
                  <View style={styles.modalIconInner}>
                    <LogOut size={24} color="#DC2626" strokeWidth={2.4} />
                  </View>
                </View>

                {/* Title & Message */}
                <Text style={styles.modalTitle}>Log Out</Text>
                <Text style={styles.modalDescription}>
                  Are you sure you want to log out?
                </Text>

                {/* Modal Buttons */}
                <View style={styles.modalButtonGroup}>
                  <TouchableOpacity
                    onPress={handleLogoutConfirm}
                    disabled={isLoggingOut}
                    activeOpacity={0.85}
                    style={styles.modalConfirmBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Yes, Log Out"
                  >
                    {isLoggingOut ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                        <Text style={styles.modalConfirmText}>Yes, Log Out</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowLogoutModal(false)}
                    disabled={isLoggingOut}
                    activeOpacity={0.7}
                    style={styles.modalCancelBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },

  /* Header App Bar */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 16,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Scroll Layout */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* Unified Card Design */
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  keyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },

  /* Status and Role Badges */
  activeBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: '#4338CA',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Account Info Rows */
  infoList: {
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginLeft: 8,
  },
  infoValueText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 3,
  },

  /* Feedback Banners */
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  /* Form Fields */
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginLeft: 2,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '700',
  },
  inputContainer: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFocused: {
    borderColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 0,
    paddingRight: 8,
  },
  eyeIconButton: {
    padding: 6,
    marginRight: -4,
  },
  fieldErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },

  /* Password Requirements */
  requirementsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  requirementsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reqIndicatorActive: {
    backgroundColor: '#10B981',
  },
  reqIndicatorInactive: {
    backgroundColor: '#E2E8F0',
  },
  reqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  requirementText: {
    fontSize: 13.5,
  },
  requirementTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  requirementTextInactive: {
    color: '#64748B',
    fontWeight: '500',
  },

  /* Action Buttons */
  primaryActionButton: {
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonValid: {
    backgroundColor: '#1E88E5',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    marginLeft: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryActionTextValid: {
    color: '#FFFFFF',
  },
  primaryActionTextDisabled: {
    color: '#94A3B8',
  },

  /* Sign Out Button */
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutButtonText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13.5,
    letterSpacing: 0.5,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalButtonGroup: {
    width: '100%',
  },
  modalConfirmBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  modalCancelBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
});
