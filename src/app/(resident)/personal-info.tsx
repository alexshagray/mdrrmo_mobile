import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Settings,
  ShieldCheck,
  ChevronDown,
  Check,
  X,
  Search,
} from 'lucide-react-native';
import { getResidentProfileApi, updateResidentPersonalApi, getBarangaysApi } from '@/shared/api/residents';
import { BrandBackground } from '@/shared/components';
import { useAuth } from '@/shared/hooks';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [barangays, setBarangays] = useState<{ id: number; barangay_name: string }[]>([]);

  // Verification State
  const [verificationStatus, setVerificationStatus] = useState<string>('Pending');
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [barangayId, setBarangayId] = useState<number | null>(null);

  // Barangay Picker Dropdown State
  const [isBarangayPickerOpen, setIsBarangayPickerOpen] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  // Field Focus State for modern UX highlight
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // UI Feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.id === barangayId),
    [barangays, barangayId]
  );

  const filteredBarangays = useMemo(() => {
    if (!barangaySearch.trim()) return barangays;
    return barangays.filter((b) =>
      b.barangay_name.toLowerCase().includes(barangaySearch.trim().toLowerCase())
    );
  }, [barangays, barangaySearch]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, bRes] = await Promise.allSettled([
        getResidentProfileApi(),
        getBarangaysApi(),
      ]);

      if (bRes.status === 'fulfilled' && Array.isArray(bRes.value)) {
        setBarangays(bRes.value);
      }

      if (profileRes.status === 'fulfilled') {
        const u = profileRes.value.user || {};
        const p = profileRes.value.resident_profile || {};

        setFirstName(u.first_name || '');
        setMiddleName(u.middle_name || '');
        setLastName(u.last_name || '');
        setBirthdate(u.birthdate || '');
        setAge(u.age || null);
        const rawPhone = (u.phone_number || u.phone || '').replace(/[^0-9]/g, '').slice(0, 11);
        setPhoneNumber(rawPhone);
        setEmail(u.email || '');
        setHomeAddress(u.address || user?.address || '');

        setVerificationStatus(u.verification_status || 'Pending');
        setMissingFields(u.missing_fields || []);

        const rawGender = (u.gender || p.gender || '').toLowerCase();
        if (['male', 'female', 'other'].includes(rawGender)) {
          setGender(rawGender as any);
        }

        setBarangayId(p.barangay_id || null);
      } else if (user) {
        setFirstName(user.first_name || '');
        setMiddleName(user.middle_name || '');
        setLastName(user.last_name || '');
        setBirthdate(user.birthdate || '');
        setAge(user.age || null);
        const rawPhone = (user.phone_number || user.phone || '').replace(/[^0-9]/g, '').slice(0, 11);
        setPhoneNumber(rawPhone);
        setEmail(user.email || '');
        setHomeAddress(user.address || '');
        setVerificationStatus(user.verification_status || 'Pending');
        setMissingFields(user.missing_fields || []);
        const rawGender = (user.gender || '').toLowerCase();
        if (['male', 'female', 'other'].includes(rawGender)) {
          setGender(rawGender as any);
        }
      }
    } catch (err) {
      console.error('Error loading resident profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBirthdateChange = (text: string) => {
    // Format YYYY-MM-DD
    const cleaned = text.replace(/[^0-9-]/g, '');
    setBirthdate(cleaned);

    // Auto-calculate age if valid date
    if (cleaned.length === 10) {
      const parts = cleaned.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          const now = new Date();
          let calculatedAge = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge > 0 && calculatedAge < 120) {
            setAge(calculatedAge);
          }
        }
      }
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    // Only allow numbers and limit strictly to 1-11 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 11);
    setPhoneNumber(cleaned);
    if (errors.phoneNumber) {
      setErrors((prev) => ({ ...prev, phoneNumber: '' }));
    }
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      newErrors.birthdate = 'Format must be YYYY-MM-DD';
    }

    const cleanPhone = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      newErrors.phoneNumber = 'Mobile number is required';
    } else if (cleanPhone.length < 11) {
      newErrors.phoneNumber = 'Mobile number must be 11 digits (e.g. 09123456789)';
    } else if (!cleanPhone.startsWith('09')) {
      newErrors.phoneNumber = 'Mobile number must start with 09 (e.g. 09123456789)';
    }

    if (!barangayId) {
      newErrors.barangay = 'Please select your barangay';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Please fix the validation errors before saving.');
      return;
    }

    setErrors({});
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const payload = {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        birthdate: birthdate || null,
        phone_number: cleanPhone || null,
        gender: gender || null,
        barangay_id: barangayId,
        address: homeAddress.trim() || null,
      };

      const res = await updateResidentPersonalApi(payload);
      if (res.verification?.verification_status) {
        setVerificationStatus(res.verification.verification_status);
        setMissingFields(res.verification.missing_fields || []);
      }
      setSuccessMessage(res.message || 'Personal information updated successfully.');

      if (refreshUser) {
        await refreshUser();
      }

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[Object.keys(err?.response?.data?.errors || {})[0]]?.[0] ||
        'Failed to save personal information. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/profile');
    }
  };

  const getInputStyle = (fieldName: string) => {
    const isFocused = focusedField === fieldName;
    const hasError = !!errors[fieldName];

    if (hasError) {
      return [styles.input, styles.inputError];
    }
    if (isFocused) {
      return [styles.input, styles.inputFocused];
    }
    return styles.input;
  };

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
              <Text style={styles.headerTitleText}>Personal Information</Text>
              <Text style={styles.headerSubtitleText}>Resident Profile</Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/account-security')}
              style={styles.headerIconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Account Settings & Security"
            >
              <Settings size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E88E5" />
              <Text style={styles.loadingText}>Loading personal details...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Verification Status Card */}
              {verificationStatus === 'Verified' ? (
                <View style={styles.verifiedCard}>
                  <View style={styles.verifiedIconBox}>
                    <CheckCircle2 size={22} color="#059669" strokeWidth={2.4} />
                  </View>
                  <View style={styles.verifiedTextGroup}>
                    <View style={styles.verifiedStatusRow}>
                      <Text style={styles.verifiedTitle}>Profile Verified</Text>
                      <View style={styles.verifiedPill}>
                        <Text style={styles.verifiedPillText}>VERIFIED</Text>
                      </View>
                    </View>
                    <Text style={styles.verifiedDescription}>
                      Your personal information is complete. Emergency accident reporting is active.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingIconBox}>
                    <AlertCircle size={22} color="#D97706" strokeWidth={2.4} />
                  </View>
                  <View style={styles.pendingTextGroup}>
                    <View style={styles.pendingStatusRow}>
                      <Text style={styles.pendingTitle}>Verification Required</Text>
                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>PENDING</Text>
                      </View>
                    </View>
                    <Text style={styles.pendingDescription}>
                      Complete your personal information to unlock the accident reporting feature. Required fields are marked with (*).
                    </Text>
                    {missingFields.length > 0 && (
                      <View style={styles.missingFieldsBox}>
                        <Text style={styles.missingFieldsTitle}>Remaining items to complete:</Text>
                        <Text style={styles.missingFieldsList}>{missingFields.join(' • ')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Feedback Notifications */}
              {successMessage ? (
                <View style={styles.feedbackSuccess}>
                  <CheckCircle2 size={18} color="#059669" strokeWidth={2.2} />
                  <Text style={styles.feedbackSuccessText}>{successMessage}</Text>
                </View>
              ) : null}

              {errorMessage ? (
                <View style={styles.feedbackError}>
                  <AlertCircle size={18} color="#DC2626" strokeWidth={2.2} />
                  <Text style={styles.feedbackErrorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* 1. Full Name & Identity Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                    <User size={20} color="#1E88E5" strokeWidth={2.3} />
                  </View>
                  <View style={styles.cardHeaderTextGroup}>
                    <Text style={styles.cardTitle}>Full Name & Identity</Text>
                    <Text style={styles.cardSubtitle}>Official resident registration</Text>
                  </View>
                </View>

                {/* First Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    First Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    value={firstName}
                    onChangeText={(val) => {
                      setFirstName(val);
                      if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Juan"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    style={getInputStyle('firstName')}
                  />
                  {errors.firstName ? (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  ) : null}
                </View>

                {/* Middle Name */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Middle Name</Text>
                    <Text style={styles.optionalTag}>Optional</Text>
                  </View>
                  <TextInput
                    value={middleName}
                    onChangeText={setMiddleName}
                    onFocus={() => setFocusedField('middleName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Santos"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    style={getInputStyle('middleName')}
                  />
                </View>

                {/* Last Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Last Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    value={lastName}
                    onChangeText={(val) => {
                      setLastName(val);
                      if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
                    }}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Dela Cruz"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    style={getInputStyle('lastName')}
                  />
                  {errors.lastName ? (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  ) : null}
                </View>

                {/* Date of Birth & Age Row */}
                <View style={styles.dobAgeRow}>
                  <View style={styles.dobCol}>
                    <Text style={styles.label}>
                      Date of Birth <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.dobInputWrapper}>
                      <TextInput
                        value={birthdate}
                        onChangeText={(val) => {
                          handleBirthdateChange(val);
                          if (errors.birthdate) setErrors((prev) => ({ ...prev, birthdate: '' }));
                        }}
                        onFocus={() => setFocusedField('birthdate')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        maxLength={10}
                        keyboardType="numeric"
                        style={getInputStyle('birthdate')}
                      />
                    </View>
                    {errors.birthdate ? (
                      <Text style={styles.errorText}>{errors.birthdate}</Text>
                    ) : null}
                  </View>

                  <View style={styles.ageCol}>
                    <Text style={styles.label}>Age</Text>
                    <View style={styles.ageDisplayBox}>
                      <Text style={styles.ageDisplayText}>
                        {age !== null ? `${age} yrs` : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Gender / Sex Selection */}
                <View style={styles.formGroupLast}>
                  <Text style={styles.label}>
                    Gender <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female', 'other'] as const).map((g) => {
                      const isSelected = gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGender(g)}
                          style={[
                            styles.genderBtn,
                            isSelected ? styles.genderBtnSelected : styles.genderBtnUnselected,
                          ]}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={[
                              styles.genderBtnText,
                              isSelected ? styles.genderBtnTextSelected : styles.genderBtnTextUnselected,
                            ]}
                          >
                            {g === 'other' ? 'Other' : g.charAt(0).toUpperCase() + g.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* 2. Contact Information Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Phone size={20} color="#059669" strokeWidth={2.3} />
                  </View>
                  <View style={styles.cardHeaderTextGroup}>
                    <Text style={styles.cardTitle}>Contact Information</Text>
                    <Text style={styles.cardSubtitle}>For emergency responder dispatch calls</Text>
                  </View>
                </View>

                {/* Mobile Number */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>
                      Mobile Number <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <Text style={styles.charCountText}>
                      {phoneNumber.length}/11
                    </Text>
                  </View>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={handlePhoneNumberChange}
                    onFocus={() => setFocusedField('phoneNumber')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="09123456789"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={11}
                    style={getInputStyle('phoneNumber')}
                  />
                  {errors.phoneNumber ? (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  ) : (
                    <Text style={styles.fieldHelperText}>
                      Must be an 11-digit mobile number (e.g. 09123456789)
                    </Text>
                  )}
                </View>

                {/* Email Address & Verification Status */}
                <View style={styles.formGroupLast}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.emailVerifiedBadge}>
                      <ShieldCheck size={14} color="#059669" strokeWidth={2.4} />
                      <Text style={styles.emailVerifiedText}>Verified</Text>
                    </View>
                  </View>

                  <View style={styles.readOnlyInput}>
                    <Mail size={18} color="#64748B" strokeWidth={2} style={styles.readOnlyIcon} />
                    <Text style={styles.readOnlyValueText} numberOfLines={1}>
                      {email || 'Not provided'}
                    </Text>
                    <Lock size={15} color="#94A3B8" strokeWidth={2} style={styles.lockIcon} />
                  </View>
                  <Text style={styles.fieldHelperText}>
                    Primary email is linked to your resident account credentials.
                  </Text>
                </View>
              </View>

              {/* 3. Primary Residence Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <MapPin size={20} color="#D97706" strokeWidth={2.3} />
                  </View>
                  <View style={styles.cardHeaderTextGroup}>
                    <Text style={styles.cardTitle}>Primary Residence</Text>
                    <Text style={styles.cardSubtitle}>Municipality of Opol, Misamis Oriental</Text>
                  </View>
                </View>

                {/* Barangay Dropdown */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Barangay <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      isBarangayPickerOpen && styles.dropdownTriggerActive,
                      errors.barangay ? styles.dropdownTriggerError : null,
                    ]}
                    onPress={() => setIsBarangayPickerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <MapPin size={18} color={selectedBarangay ? '#1E88E5' : '#94A3B8'} />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          !selectedBarangay && styles.dropdownPlaceholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedBarangay ? selectedBarangay.barangay_name : 'Select Barangay...'}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#64748B" />
                  </TouchableOpacity>
                  {errors.barangay ? (
                    <Text style={styles.errorText}>{errors.barangay}</Text>
                  ) : (
                    <Text style={styles.fieldHelperText}>
                      Official registered barangay in Opol for dispatch locality assignment.
                    </Text>
                  )}
                </View>

                {/* Home Address Input */}
                <View style={styles.formGroupLast}>
                  <Text style={styles.label}>Home Address</Text>
                  <TextInput
                    value={homeAddress}
                    onChangeText={(val) => {
                      setHomeAddress(val);
                      if (errors.homeAddress) setErrors((prev) => ({ ...prev, homeAddress: '' }));
                    }}
                    onFocus={() => setFocusedField('homeAddress')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Zone 2, Near Malanang Elementary School"
                    placeholderTextColor="#94A3B8"
                    style={getInputStyle('homeAddress')}
                  />
                  <Text style={styles.fieldHelperText}>
                    Specific zone, purok, or street address saved to your profile.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  style={styles.saveBtn}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Save personal details"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Save size={18} color="#FFFFFF" strokeWidth={2.3} style={styles.saveIcon} />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Barangay Picker Dropdown Modal */}
      <Modal
        visible={isBarangayPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBarangayPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsBarangayPickerOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Barangay</Text>
                <Text style={styles.modalSubtitle}>Municipality of Opol</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBarangayPickerOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick search filter */}
            <View style={styles.searchBox}>
              <Search size={18} color="#94A3B8" />
              <TextInput
                value={barangaySearch}
                onChangeText={setBarangaySearch}
                placeholder="Search barangay..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {barangaySearch ? (
                <TouchableOpacity onPress={() => setBarangaySearch('')}>
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={styles.barangayList} showsVerticalScrollIndicator={false}>
              {filteredBarangays.map((b) => {
                const isSelected = barangayId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      setBarangayId(b.id);
                      setIsBarangayPickerOpen(false);
                      setBarangaySearch('');
                      if (errors.barangay) setErrors((prev) => ({ ...prev, barangay: '' }));
                    }}
                    style={[
                      styles.barangayOption,
                      isSelected && styles.barangayOptionSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.barangayOptionText,
                        isSelected && styles.barangayOptionTextSelected,
                      ]}
                    >
                      {b.barangay_name}
                    </Text>
                    {isSelected ? (
                      <Check size={18} color="#1E88E5" strokeWidth={2.5} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              {filteredBarangays.length === 0 && (
                <View style={styles.emptySearchContainer}>
                  <Text style={styles.emptySearchText}>No barangay found</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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

  /* Loading State */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#526174',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },

  /* Scroll Area */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 50,
  },

  /* Verification Badges */
  verifiedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  verifiedTextGroup: {
    flex: 1,
  },
  verifiedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedTitle: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 15,
  },
  verifiedPill: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedPillText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedDescription: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
    lineHeight: 18,
  },

  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pendingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  pendingTextGroup: {
    flex: 1,
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pendingTitle: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 15,
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pendingPillText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pendingDescription: {
    color: '#B45309',
    fontSize: 13,
    lineHeight: 18,
  },
  missingFieldsBox: {
    marginTop: 10,
    backgroundColor: 'rgba(254, 243, 199, 0.7)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  missingFieldsTitle: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  missingFieldsList: {
    color: '#92400E',
    fontSize: 11,
    lineHeight: 16,
  },

  /* Feedback Alerts */
  feedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  feedbackSuccessText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  feedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  feedbackErrorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },

  /* Card Standard */
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardHeaderTextGroup: {
    flex: 1,
  },
  cardTitle: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 13.5,
    marginTop: 2,
  },

  /* Forms & Labels */
  formGroup: {
    marginBottom: 16,
  },
  formGroupLast: {
    marginBottom: 0,
  },
  label: {
    color: '#526174',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 2,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '700',
  },
  optionalTag: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  charCountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },

  /* Inputs */
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  fieldHelperText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
    lineHeight: 16,
  },

  /* Date of Birth & Age Row */
  dobAgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dobCol: {
    flex: 1,
  },
  dobInputWrapper: {
    width: '100%',
  },
  ageCol: {
    width: 96,
  },
  ageDisplayBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  ageDisplayText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Gender Segmented Options */
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnUnselected: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderBtnSelected: {
    backgroundColor: '#1E88E5',
    borderWidth: 1,
    borderColor: '#1E88E5',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  genderBtnText: {
    fontSize: 15,
  },
  genderBtnTextUnselected: {
    color: '#526174',
    fontWeight: '600',
  },
  genderBtnTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Read Only Input (Email) */
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnlyIcon: {
    marginRight: 10,
  },
  readOnlyValueText: {
    color: '#334155',
    fontSize: 15.5,
    fontWeight: '500',
    flex: 1,
  },
  lockIcon: {
    marginLeft: 8,
  },
  emailVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  emailVerifiedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Dropdown Trigger */
  dropdownTrigger: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerActive: {
    borderColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  dropdownTriggerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  dropdownTriggerText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 19,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#1F2937',
    paddingVertical: 0,
  },
  barangayList: {
    maxHeight: 320,
  },
  barangayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  barangayOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  barangayOptionText: {
    color: '#334155',
    fontSize: 15.5,
    fontWeight: '500',
  },
  barangayOptionTextSelected: {
    color: '#1E88E5',
    fontWeight: '700',
  },
  emptySearchContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptySearchText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
  },

  /* Action Buttons */
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cancelBtnText: {
    color: '#526174',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.3,
    height: 54,
    backgroundColor: '#1E88E5',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
