import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/hooks';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
        text2: 'Please fix the errors in the form.'
      });
      return;
    }

    setIsSubmitting(true);
    const result = await register(formData);
    setIsSubmitting(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Welcome to the Resident Portal!'
      });
      // The authContext will automatically route the user because isAuthenticated becomes true.
    } else {
      // Check if it's an email taken error or other backend validation
      if (result.error?.includes('email')) {
         setErrors(prev => ({ ...prev, email: 'This email is already taken.' }));
      }
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: result.error
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back Button */}
        <TouchableOpacity 
          className="mb-6 flex-row items-center" 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#64748B" />
          <Text className="ml-2 text-slate-500 font-medium">Back to Login</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-slate-900 mb-2">Create Account</Text>
          <Text className="text-slate-500">Sign up to access the Resident Portal and report emergencies.</Text>
        </View>

        {/* Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">First Name *</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-slate-800 ${errors.first_name ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="Juan"
              value={formData.first_name}
              onChangeText={(val) => handleChange('first_name', val)}
            />
            {errors.first_name && <Text className="text-red-500 text-xs mt-1">{errors.first_name}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Last Name *</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-slate-800 ${errors.last_name ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="Dela Cruz"
              value={formData.last_name}
              onChangeText={(val) => handleChange('last_name', val)}
            />
            {errors.last_name && <Text className="text-red-500 text-xs mt-1">{errors.last_name}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Email Address *</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-slate-800 ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="juan@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(val) => handleChange('email', val)}
            />
            {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
              placeholder="09123456789"
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(val) => handleChange('phone_number', val)}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Password *</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-slate-800 ${errors.password ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="••••••••"
              secureTextEntry
              value={formData.password}
              onChangeText={(val) => handleChange('password', val)}
            />
            {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Confirm Password *</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-slate-800 ${errors.password_confirmation ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="••••••••"
              secureTextEntry
              value={formData.password_confirmation}
              onChangeText={(val) => handleChange('password_confirmation', val)}
            />
            {errors.password_confirmation && <Text className="text-red-500 text-xs mt-1">{errors.password_confirmation}</Text>}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`mt-8 bg-blue-600 py-4 rounded-xl items-center justify-center flex-row ${isSubmitting ? 'opacity-70' : ''}`}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : null}
          <Text className="text-white font-bold text-lg">Sign Up</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}
