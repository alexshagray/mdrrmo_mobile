import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  Sparkles
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

  // Auto-calculate age from YYYY-MM-DD
  const calculateAgeFromDate = (dateString: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age <= 120 ? String(age) : '';
  };

  // Birthday formatter: auto-inserts dashes and rejects any letters
  const handleBirthdayChange = (raw: string) => {
    // Only allow numbers
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4 && digits.length <= 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }

    const calculatedAge = calculateAgeFromDate(formatted);
    setFormData(prev => ({
      ...prev,
      birthdate: formatted,
      age: calculatedAge || prev.age,
    }));

    if (errors.birthdate) {
      setErrors(prev => ({ ...prev, birthdate: '' }));
    }
  };

  // Age input: numbers only, blocks all letters
  const handleAgeChange = (raw: string) => {
    const cleanNumber = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setFormData(prev => ({ ...prev, age: cleanNumber }));
    if (errors.age) {
      setErrors(prev => ({ ...prev, age: '' }));
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthdate)) {
      newErrors.birthdate = 'Format must be YYYY-MM-DD';
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
        text1: 'Validation Error',
        text2: 'Please check the highlighted fields.',
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      email: formData.email.trim(),
      age: formData.age ? parseInt(formData.age, 10) : null,
      birthdate: formData.birthdate || null,
    };

    const result = await register(payload);
    setIsSubmitting(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Welcome to MDRRMO Opol EMS!',
      });
    } else {
      if (result.error?.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      }
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: result.error || 'Unable to register account. Please try again.',
      });
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
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="flex-row items-center self-start bg-white/20 border border-white/30 px-3.5 py-1.5 rounded-full mb-6"
        >
          <ArrowLeft size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold ml-1.5">Back to Sign In</Text>
        </TouchableOpacity>

        {/* Branding & Welcome */}
        <View className="items-center">
          <View className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 items-center justify-center mb-3 shadow-sm">
            <ShieldCheck size={32} color="#FFFFFF" strokeWidth={2} />
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
            Join the MDRRMO Opol network for fast emergency medical and disaster response.
          </Text>
        </View>
      </Animated.View>

      {/* Main Glass Form Card */}
      <LoginCard>
        {/* Section 1: Personal Details */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
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
                placeholder="YYYY-MM-DD"
                value={formData.birthdate}
                onChangeText={handleBirthdayChange}
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
            onChangeText={(val) => handleChange('phone_number', val)}
            keyboardType="phone-pad"
            icon={<Phone />}
            error={errors.phone_number}
          />
        </View>

        {/* Section 2: Account & Security */}
        <View className="mb-4 pt-2 border-t border-slate-100">
          <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
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

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.8}
          className={`w-full rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30 mt-3 ${isSubmitting ? 'opacity-80' : ''}`}
        >
          <View className="bg-blue-600 py-4 flex-row justify-center items-center">
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
          By signing up, you agree to MDRRMO's Terms of Service and Privacy Policy for resident emergency assistance.
        </Text>

        {/* Back to Sign In footer */}
        <View className="mt-6 pt-4 border-t border-slate-100 flex-row justify-center items-center">
          <Text className="text-slate-500 text-xs">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
            <Text className="text-blue-600 font-bold text-xs">Sign In</Text>
          </TouchableOpacity>
        </View>
      </LoginCard>
    </AuthBackground>
  );
}
