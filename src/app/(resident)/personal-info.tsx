import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
} from 'lucide-react-native';
import { getResidentProfileApi, updateResidentPersonalApi, getBarangaysApi } from '@/shared/api/residents';
import { useAuth } from '@/shared/hooks';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [barangays, setBarangays] = useState<{ id: number; barangay_name: string }[]>([]);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [barangayId, setBarangayId] = useState<number | null>(null);
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');

  // UI Feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
        setPhoneNumber(u.phone_number || '');
        setEmail(u.email || '');

        setGender(p.gender || '');
        setBarangayId(p.barangay_id || null);
        setHouseNo(p.house_no || '');
        setStreet(p.street || '');
      } else if (user) {
        setFirstName(user.first_name || '');
        setMiddleName(user.middle_name || '');
        setLastName(user.last_name || '');
        setBirthdate(user.birthdate || '');
        setAge(user.age || null);
        setPhoneNumber(user.phone_number || '');
        setEmail(user.email || '');
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
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      newErrors.birthdate = 'Format must be YYYY-MM-DD';
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
        phone_number: phoneNumber.trim() || null,
        gender: gender || null,
        barangay_id: barangayId,
        house_no: houseNo.trim() || null,
        street: street.trim() || null,
      };

      const res = await updateResidentPersonalApi(payload);
      setSuccessMessage(res.message || 'Personal information updated successfully.');

      if (refreshUser) {
        refreshUser();
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

  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0F172A]/90">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#F8FAFC" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white text-base font-bold tracking-tight">Personal Information</Text>
            <Text className="text-slate-400 text-xs">Resident Profile</Text>
          </View>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading personal details...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Feedback Banners */}
            {successMessage ? (
              <View className="flex-row items-center bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-4 mb-5">
                <CheckCircle2 size={20} color="#10B981" />
                <Text className="text-emerald-300 text-xs font-semibold ml-2.5 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="flex-row items-center bg-red-950/60 border border-red-700/50 rounded-2xl p-4 mb-5">
                <AlertCircle size={20} color="#EF4444" />
                <Text className="text-red-300 text-xs font-semibold ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Section: Identity */}
            <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-blue-500/10 items-center justify-center border border-blue-500/20 mr-3">
                  <User size={18} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Full Name & Identity</Text>
                  <Text className="text-slate-400 text-xs">Official resident registration</Text>
                </View>
              </View>

              {/* First Name */}
              <View className="mb-3.5">
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                  First Name <Text className="text-rose-400">*</Text>
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                  }}
                  placeholder="e.g. Juan"
                  placeholderTextColor="#475569"
                  className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm ${
                    errors.firstName ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                {errors.firstName && (
                  <Text className="text-rose-400 text-xs mt-1 ml-1">{errors.firstName}</Text>
                )}
              </View>

              {/* Middle Name */}
              <View className="mb-3.5">
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">Middle Name</Text>
                <TextInput
                  value={middleName}
                  onChangeText={setMiddleName}
                  placeholder="e.g. Santos (Optional)"
                  placeholderTextColor="#475569"
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-blue-500"
                />
              </View>

              {/* Last Name */}
              <View className="mb-3.5">
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                  Last Name <Text className="text-rose-400">*</Text>
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={(val) => {
                    setLastName(val);
                    if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
                  }}
                  placeholder="e.g. Dela Cruz"
                  placeholderTextColor="#475569"
                  className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm ${
                    errors.lastName ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                {errors.lastName && (
                  <Text className="text-rose-400 text-xs mt-1 ml-1">{errors.lastName}</Text>
                )}
              </View>

              {/* Birthdate & Age */}
              <View className="flex-row gap-3 mb-3.5">
                <View className="flex-1">
                  <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                    Date of Birth
                  </Text>
                  <TextInput
                    value={birthdate}
                    onChangeText={handleBirthdateChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#475569"
                    maxLength={10}
                    className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm ${
                      errors.birthdate ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                  {errors.birthdate && (
                    <Text className="text-rose-400 text-xs mt-1 ml-1">{errors.birthdate}</Text>
                  )}
                </View>
                <View className="w-24">
                  <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">Age</Text>
                  <View className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-3 items-center justify-center">
                    <Text className="text-slate-300 font-bold text-sm">
                      {age !== null ? `${age} yrs` : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Gender */}
              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">Gender</Text>
                <View className="flex-row gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-xl items-center border ${
                        gender === g
                          ? 'bg-blue-600/30 border-blue-500 text-blue-400'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-bold capitalize ${
                          gender === g ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Section: Contact & Account Info */}
            <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20 mr-3">
                  <Phone size={18} color="#10B981" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Contact Information</Text>
                  <Text className="text-slate-400 text-xs">For emergency responder dispatch calls</Text>
                </View>
              </View>

              {/* Mobile Phone */}
              <View className="mb-3.5">
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                  Mobile Number
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. 0917 123 4567"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-500"
                />
              </View>

              {/* Email (System Controlled - Read Only) */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5 ml-1">
                  <Text className="text-slate-300 text-xs font-semibold">Email Address</Text>
                  <View className="flex-row items-center">
                    <Lock size={12} color="#64748B" />
                    <Text className="text-slate-500 text-[11px] ml-1">Verified</Text>
                  </View>
                </View>
                <View className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
                  <Mail size={16} color="#64748B" />
                  <Text className="text-slate-400 text-sm ml-2.5 flex-1">{email || 'Not provided'}</Text>
                </View>
              </View>
            </View>

            {/* Section: Residence Address */}
            <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-amber-500/10 items-center justify-center border border-amber-500/20 mr-3">
                  <MapPin size={18} color="#F59E0B" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Primary Residence</Text>
                  <Text className="text-slate-400 text-xs">Municipality of Opol</Text>
                </View>
              </View>

              {/* Barangay Selector */}
              <View className="mb-3.5">
                <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">Barangay</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                  <View className="flex-row gap-2">
                    {barangays.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => setBarangayId(b.id)}
                        className={`px-3.5 py-2 rounded-xl border ${
                          barangayId === b.id
                            ? 'bg-amber-500/20 border-amber-500'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            barangayId === b.id ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {b.barangay_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* House No & Street */}
              <View className="flex-row gap-3">
                <View className="w-32">
                  <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">House No.</Text>
                  <TextInput
                    value={houseNo}
                    onChangeText={setHouseNo}
                    placeholder="e.g. 124"
                    placeholderTextColor="#475569"
                    className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-amber-500"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">Street / Zone</Text>
                  <TextInput
                    value={street}
                    onChangeText={setStreet}
                    placeholder="e.g. Zone 2, National Hwy"
                    placeholderTextColor="#475569"
                    className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-amber-500"
                  />
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-1 bg-slate-800/80 border border-slate-700 py-4 rounded-2xl items-center justify-center active:bg-slate-700"
                activeOpacity={0.7}
              >
                <Text className="text-slate-300 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="flex-1 bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-600/30 active:bg-blue-700"
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" className="mr-2" />
                    <Text className="text-white font-bold text-sm ml-2">Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
