import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/hooks';
import Toast from 'react-native-toast-message';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Calendar, 
  Hash, 
  ShieldCheck, 
  Check, 
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AuthBackground, LoginCard } from '@/auth/components';
import { Input } from '@/shared/components';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    birthdate: '',
    age: '',
    password: '',
    password_confirmation: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate age from MM-DD-YYYY
  const calculateAgeFromMmDdYyyy = (dateString: string): string => {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return '';
    const [monthStr, dayStr, yearStr] = dateString.split('-');
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return '';
    const birthDate = new Date(year, month - 1, day);
    if (isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age <= 120 ? String(age) : '';
  };

  // Convert MM-DD-YYYY to backend SQL ISO format YYYY-MM-DD
  const convertMmDdYyyyToIso = (dateString: string): string | null => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      const mm = parts[0].padStart(2, '0');
      const dd = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
    return dateString;
  };

  // Birthday formatter: strictly formats MM-DD-YYYY, auto-pads single digits, and enforces 10-char max
  const handleBirthdayChange = (raw: string) => {
    const prev = formData.birthdate;
    // Allow natural backspacing
    if (raw.length < prev.length) {
      const nextVal = raw.endsWith('-') ? raw.slice(0, -1) : raw;
      setFormData(f => ({ ...f, birthdate: nextVal }));
      if (errors.birthdate) setErrors(f => ({ ...f, birthdate: '' }));
      return;
    }

    // Extract numbers only
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setFormData(f => ({ ...f, birthdate: '', age: '' }));
      return;
    }

    // --- 1. Month Logic ---
    const firstDigit = parseInt(digits[0], 10);
    let monthStr = '';
    let remaining = '';

    if (firstDigit >= 2 && firstDigit <= 9) {
      // Month digit is 2-9 (e.g. 6) -> immediately format as 06-
      monthStr = `0${firstDigit}`;
      remaining = digits.slice(1);
    } else if (digits.length === 1) {
      // Only 0 or 1 entered so far
      setFormData(f => ({ ...f, birthdate: digits[0] }));
      return;
    } else {
      // 2 or more digits starting with 0 or 1
      const twoDigitMonth = parseInt(digits.slice(0, 2), 10);
      if (twoDigitMonth === 0) {
        monthStr = '01';
        remaining = digits.slice(2);
      } else if (twoDigitMonth > 12) {
        // e.g. user typed 1 followed by 5 -> month 01, day 5
        monthStr = `0${firstDigit}`;
        remaining = digits.slice(1);
      } else {
        monthStr = digits.slice(0, 2);
        remaining = digits.slice(2);
      }
    }

    let formatted = `${monthStr}-`;
    if (!remaining) {
      setFormData(f => ({ ...f, birthdate: formatted }));
      return;
    }

    // --- 2. Day Logic ---
    const dayFirstDigit = parseInt(remaining[0], 10);
    let dayStr = '';
    let yearRemaining = '';

    if (dayFirstDigit >= 4 && dayFirstDigit <= 9) {
      // Day digit is 4-9 (e.g. 6) -> immediately format as 06-
      dayStr = `0${dayFirstDigit}`;
      yearRemaining = remaining.slice(1);
    } else if (remaining.length === 1) {
      // 0, 1, 2, 3 -> wait for second digit of day
      setFormData(f => ({ ...f, birthdate: `${formatted}${remaining[0]}` }));
      return;
    } else {
      const twoDigitDay = parseInt(remaining.slice(0, 2), 10);
      if (twoDigitDay === 0) {
        dayStr = '01';
      } else if (twoDigitDay > 31) {
        dayStr = '31';
      } else {
        dayStr = remaining.slice(0, 2);
      }
      yearRemaining = remaining.slice(2);
    }

    formatted = `${monthStr}-${dayStr}-`;
    if (!yearRemaining) {
      setFormData(f => ({ ...f, birthdate: formatted }));
      return;
    }

    // --- 3. Year Logic (STRICTLY MAXIMUM 4 DIGITS) ---
    const yearStr = yearRemaining.slice(0, 4);
    formatted = `${monthStr}-${dayStr}-${yearStr}`;

    const calculatedAge = calculateAgeFromMmDdYyyy(formatted);
    setFormData(f => ({
      ...f,
      birthdate: formatted,
      age: calculatedAge || f.age,
    }));

    if (errors.birthdate) {
      setErrors(f => {
        const next = { ...f };
        delete next.birthdate;
        return next;
      });
    }
  };

  const handleBirthdayBlur = () => {
    if (!formData.birthdate) return;
    const parts = formData.birthdate.split('-');
    if (parts.length >= 2) {
      const mm = parts[0] ? String(Math.min(12, Math.max(1, parseInt(parts[0], 10) || 1))).padStart(2, '0') : '';
      const dd = parts[1] ? String(Math.min(31, Math.max(1, parseInt(parts[1], 10) || 1))).padStart(2, '0') : '';
      const yyyy = parts[2] ? parts[2].replace(/[^0-9]/g, '').slice(0, 4) : '';
      let normalized = mm;
      if (dd) normalized += `-${dd}`;
      if (yyyy) normalized += `-${yyyy}`;
      const age = calculateAgeFromMmDdYyyy(normalized);
      setFormData(f => ({
        ...f,
        birthdate: normalized,
        age: age || f.age,
      }));
    }
  };

  // Age input: numbers only, blocks all letters
  const handleAgeChange = (raw: string) => {
    const cleanNumber = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setFormData(prev => ({ ...prev, age: cleanNumber }));
    if (errors.age) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.age;
        return next;
      });
    }
  };

  // Phone input: allows numbers and plus, restricts to valid length
  const handlePhoneChange = (raw: string) => {
    const cleanPhone = raw.replace(/[^\d+]/g, '').slice(0, 13);
    setFormData(prev => ({ ...prev, phone_number: cleanPhone }));
    if (errors.phone_number) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.phone_number;
        return next;
      });
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    // Also live re-evaluate password match error
    if (name === 'password' || name === 'password_confirmation') {
      if (errors.password_confirmation && (name === 'password' ? value === formData.password_confirmation : value === formData.password)) {
        setErrors(prev => {
          const next = { ...prev };
          delete next.password_confirmation;
          return next;
        });
      }
    }
  };

  const isPasswordLongEnough = formData.password.length >= 8;
  const doPasswordsMatch = Boolean(
    formData.password &&
    formData.password_confirmation &&
    formData.password === formData.password_confirmation
  );

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.trim().length > 255) {
      newErrors.first_name = 'First name cannot exceed 255 characters';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.trim().length > 255) {
      newErrors.last_name = 'Last name cannot exceed 255 characters';
    }

    if (formData.phone_number.trim()) {
      const cleanPhone = formData.phone_number.trim().replace(/[-\s]/g, '');
      if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) {
        newErrors.phone_number = 'Please enter a valid Philippine mobile number (e.g. 09123456789)';
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.birthdate) {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(formData.birthdate)) {
        newErrors.birthdate = 'Format must be MM-DD-YYYY (e.g. 06-15-1998)';
      } else {
        const [mStr, dStr, yStr] = formData.birthdate.split('-');
        const m = parseInt(mStr, 10);
        const d = parseInt(dStr, 10);
        const y = parseInt(yStr, 10);
        const bDate = new Date(y, m - 1, d);
        if (isNaN(bDate.getTime()) || m < 1 || m > 12 || d < 1 || d > 31 || bDate >= new Date() || y < 1900) {
          newErrors.birthdate = 'Birthday must be a valid past date (MM-DD-YYYY)';
        }
      }
    }

    if (formData.age) {
      const ageNum = parseInt(formData.age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = 'Age must be between 1 and 120';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete Registration Form',
        text2: `Please resolve the ${Object.keys(newErrors).length} highlighted error(s) below.`,
      });
      return;
    }

    setIsSubmitting(true);
    const isoBirthdate = formData.birthdate ? convertMmDdYyyyToIso(formData.birthdate) : null;
    const payload = {
      ...formData,
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim() || null,
      age: formData.age ? parseInt(formData.age, 10) : null,
      birthdate: isoBirthdate,
    };

    const result = await register(payload);
    setIsSubmitting(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Welcome to OPOL RESQ!',
      });
    } else {
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        const serverErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          serverErrors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        }
        setErrors(serverErrors);
        Toast.show({
          type: 'error',
          text1: 'Registration Error',
          text2: 'Please review the highlighted fields with issues.',
        });
      } else {
        if (result.error?.toLowerCase().includes('email')) {
          setErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
        } else if (result.error?.toLowerCase().includes('phone')) {
          setErrors(prev => ({ ...prev, phone_number: 'This phone number is already registered.' }));
        }
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: result.error || 'Unable to register account. Please try again.',
        });
      }
    }
  };

  return (
    <AuthBackground>
      {/* Top Header Section */}
      <Animated.View 
        entering={FadeInDown.delay(100).duration(600).springify()} 
        className="mb-6 pt-2"
      >
        {/* Navigation Bar */}
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/login');
            }
          }}
          activeOpacity={0.7}
          className="flex-row items-center self-start bg-white/20 border border-white/30 px-3.5 py-1.5 rounded-full mb-6"
        >
          <ArrowLeft size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold ml-1.5">Back to Sign In</Text>
        </TouchableOpacity>

        {/* Branding & Welcome */}
        <View className="items-center">
          <View className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 items-center justify-center mb-3 shadow-sm">
            <Image
              source={require('../../assets/images/opol-resq-logo.png')}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
          </View>

          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 mb-2">
            <Sparkles size={12} color="#BFDBFE" />
            <Text className="text-blue-100 text-[11px] font-bold uppercase tracking-wider">
              Resident Portal Access
            </Text>
          </View>

          <Text className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight">
            Create Account
          </Text>
          <Text className="text-blue-100 text-xs sm:text-sm text-center font-medium mt-1 max-w-xs">
            Join the OPOL RESQ network by MDRRMO Opol for fast emergency medical and disaster response.
          </Text>
        </View>
      </Animated.View>

      {/* Main Glass Form Card */}
      <LoginCard>
        {/* Section 1: Personal Details */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-[#208AEF] uppercase tracking-wider mb-3">
            Personal Details
          </Text>

          {/* First Name */}
          <Input
            label="First Name *"
            placeholder="Juan"
            value={formData.first_name}
            onChangeText={(val) => handleChange('first_name', val)}
            icon={<User />}
            error={errors.first_name}
          />

          {/* Last Name */}
          <Input
            label="Last Name *"
            placeholder="Dela Cruz"
            value={formData.last_name}
            onChangeText={(val) => handleChange('last_name', val)}
            icon={<User />}
            error={errors.last_name}
          />

          {/* Birthday and Age Row */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Birthday"
                placeholder="MM-DD-YYYY"
                value={formData.birthdate}
                onChangeText={handleBirthdayChange}
                onBlur={handleBirthdayBlur}
                keyboardType="numeric"
                maxLength={10}
                icon={<Calendar />}
                error={errors.birthdate}
              />
            </View>

            <View className="w-28">
              <Input
                label="Age"
                placeholder="Years"
                value={formData.age}
                onChangeText={handleAgeChange}
                keyboardType="numeric"
                maxLength={3}
                icon={<Hash />}
                error={errors.age}
              />
            </View>
          </View>

          {/* Phone Number */}
          <Input
            label="Phone Number (Optional)"
            placeholder="09XXXXXXXXX"
            value={formData.phone_number}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={13}
            icon={<Phone />}
            error={errors.phone_number}
          />
        </View>

        {/* Section 2: Account & Security */}
        <View className="mb-4 pt-2 border-t border-slate-100">
          <Text className="text-xs font-bold text-[#208AEF] uppercase tracking-wider mb-3">
            Account & Security
          </Text>

          {/* Email */}
          <Input
            label="Email Address *"
            placeholder="juan@example.com"
            value={formData.email}
            onChangeText={(val) => handleChange('email', val)}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail />}
            error={errors.email}
          />

          {/* Password */}
          <Input
            label="Password *"
            placeholder="Minimum 8 characters"
            value={formData.password}
            onChangeText={(val) => handleChange('password', val)}
            secureTextEntry
            icon={<Lock />}
            error={errors.password}
          />

          {/* Confirm Password */}
          <Input
            label="Confirm Password *"
            placeholder="Re-type password"
            value={formData.password_confirmation}
            onChangeText={(val) => handleChange('password_confirmation', val)}
            secureTextEntry
            icon={<Lock />}
            error={errors.password_confirmation}
          />

          {/* Password Checklist Pills */}
          <View className="flex-row flex-wrap gap-2 mb-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <View className="flex-row items-center">
              <View className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-1.5 ${isPasswordLongEnough ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                {isPasswordLongEnough ? <Check size={10} color="#FFF" /> : null}
              </View>
              <Text className={`text-[11px] font-medium ${isPasswordLongEnough ? 'text-emerald-700' : 'text-slate-500'}`}>
                8+ characters
              </Text>
            </View>

            <View className="flex-row items-center ml-2">
              <View className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-1.5 ${doPasswordsMatch ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                {doPasswordsMatch ? <Check size={10} color="#FFF" /> : null}
              </View>
              <Text className={`text-[11px] font-medium ${doPasswordsMatch ? 'text-emerald-700' : 'text-slate-500'}`}>
                Passwords match
              </Text>
            </View>
          </View>
        </View>

        {/* Error Summary Banner when validation errors exist */}
        {Object.keys(errors).length > 0 && (
          <View className="mb-3.5 p-4 rounded-2xl bg-red-50 border-2 border-red-200">
            <View className="flex-row items-center mb-1.5">
              <AlertCircle size={18} color="#DC2626" />
              <Text className="text-red-700 font-bold text-xs uppercase tracking-wide ml-2">
                Please correct the following ({Object.keys(errors).length}):
              </Text>
            </View>
            <View className="space-y-1 pl-1">
              {Object.entries(errors).map(([field, msg]) => (
                <View key={field} className="flex-row items-start mt-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 mt-1.5" />
                  <Text className="text-red-600 text-xs font-semibold flex-1 leading-relaxed">
                    {msg}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.8}
          className={`w-full rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30 mt-2 ${isSubmitting ? 'opacity-80' : ''}`}
        >
          <View className="bg-[#208AEF] py-4 flex-row justify-center items-center">
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" className="mr-2" />
            ) : (
              <>
                <Text className="text-white text-base font-bold mr-2 tracking-wide">
                  Complete Registration
                </Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Terms notice */}
        <Text className="text-[11px] text-slate-400 text-center leading-relaxed mt-3 px-2">
          By signing up, you agree to OPOL RESQ & MDRRMO's Terms of Service and Privacy Policy for resident emergency assistance.
        </Text>

        {/* Back to Sign In footer */}
        <View className="mt-6 pt-4 border-t border-slate-100 flex-row justify-center items-center">
          <Text className="text-slate-500 text-xs">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
            <Text className="text-[#208AEF] font-bold text-xs">Sign In</Text>
          </TouchableOpacity>
        </View>
      </LoginCard>
    </AuthBackground>
  );
}
