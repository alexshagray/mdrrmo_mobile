import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  HeartPulse,
  Phone,
  Droplet,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import { getResidentProfileApi, updateResidentEmergencyApi } from '@/shared/api/residents';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Guardian'];

export default function EmergencyInfoScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Emergency Details State
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // UI Feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getResidentProfileApi();
      const p = res.resident_profile || {};

      setContactName(p.emergency_contact_name || '');
      setContactNumber(p.emergency_contact_number || '');
      setRelationship(p.emergency_contact_relationship || '');
      setBloodType(p.blood_type || '');
      setAllergies(p.allergies || '');
      setMedicalNotes(p.medical_notes || '');
    } catch (err) {
      console.error('Error loading emergency information:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const payload = {
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_number: contactNumber.trim() || null,
        emergency_contact_relationship: relationship.trim() || null,
        blood_type: bloodType || null,
        allergies: allergies.trim() || null,
        medical_notes: medicalNotes.trim() || null,
      };

      const res = await updateResidentEmergencyApi(payload);
      setSuccessMessage(res.message || 'Emergency information saved successfully.');

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Failed to save emergency information. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-white">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center border border-slate-200/80 active:bg-slate-200"
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#0F172A" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-slate-900 text-base font-bold tracking-tight">Emergency Information</Text>
            <Text className="text-slate-400 text-xs">Medical & Contacts</Text>
          </View>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E11D48" />
            <Text className="text-slate-500 text-sm mt-3 font-medium">Loading emergency data...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Informational Guidance Alert */}
            <View className="flex-row items-start bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
              <Info size={18} color="#2563EB" style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                <Text className="text-blue-900 text-xs font-bold leading-relaxed">
                  Optional Emergency Record
                </Text>
                <Text className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
                  All fields in this section are optional. Providing these details helps MDRRMO emergency responders during critical field care.
                </Text>
              </View>
            </View>

            {/* Feedback Banners */}
            {successMessage ? (
              <View className="flex-row items-center bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
                <CheckCircle2 size={18} color="#059669" />
                <Text className="text-emerald-800 text-xs font-semibold ml-2.5 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-5">
                <AlertCircle size={18} color="#E11D48" />
                <Text className="text-rose-800 text-xs font-semibold ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Section: Emergency Contact Person */}
            <View
              className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-5"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center border border-rose-200/60 mr-3">
                  <Phone size={18} color="#E11D48" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-base">Emergency Contact Person</Text>
                  <Text className="text-slate-400 text-xs">Primary contact in case of emergency</Text>
                </View>
              </View>

              {/* Contact Name */}
              <View className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-700 text-xs font-bold">Contact Full Name</Text>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="e.g. Maria Dela Cruz"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:border-rose-500 focus:bg-white"
                />
              </View>

              {/* Contact Number */}
              <View className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-700 text-xs font-bold">Contact Phone Number</Text>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="e.g. 0918 765 4321"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:border-rose-500 focus:bg-white"
                />
              </View>

              {/* Relationship Pills */}
              <View>
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-700 text-xs font-bold">Relationship</Text>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                  <View className="flex-row gap-2">
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setRelationship(rel === relationship ? '' : rel)}
                        className={`px-3.5 py-2 rounded-xl border ${
                          relationship === rel
                            ? 'bg-rose-50 border-rose-500'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            relationship === rel ? 'text-rose-700' : 'text-slate-600'
                          }`}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Section: Medical Profile */}
            <View
              className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-6"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center border border-red-200/60 mr-3">
                  <HeartPulse size={18} color="#DC2626" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-base">Medical Background</Text>
                  <Text className="text-slate-400 text-xs">Assists EMT and triage responders</Text>
                </View>
              </View>

              {/* Blood Type */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2 ml-1">
                  <View className="flex-row items-center">
                    <Droplet size={14} color="#DC2626" />
                    <Text className="text-slate-700 text-xs font-bold ml-1.5">Blood Type</Text>
                  </View>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {BLOOD_TYPES.map((bt) => (
                    <TouchableOpacity
                      key={bt}
                      onPress={() => setBloodType(bt === bloodType ? '' : bt)}
                      className={`px-3.5 py-2 rounded-xl border ${
                        bloodType === bt
                          ? 'bg-red-50 border-red-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          bloodType === bt ? 'text-red-700' : 'text-slate-600'
                        }`}
                      >
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Allergies */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <View className="flex-row items-center">
                    <AlertTriangle size={14} color="#D97706" />
                    <Text className="text-slate-700 text-xs font-bold ml-1.5">
                      Known Allergies
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Penicillin, Aspirin, Seafood, Latex..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:border-red-500 focus:bg-white text-top"
                />
              </View>

              {/* Medical Conditions / Notes */}
              <View>
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <View className="flex-row items-center">
                    <FileText size={14} color="#2563EB" />
                    <Text className="text-slate-700 text-xs font-bold ml-1.5">
                      Important Medical Conditions
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                  placeholder="e.g. Asthma, Hypertension, Diabetes, Pacemaker implant..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:border-red-500 focus:bg-white text-top"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-1 bg-white border border-slate-200 py-3.5 rounded-2xl items-center justify-center active:bg-slate-100"
                activeOpacity={0.7}
              >
                <Text className="text-slate-700 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="flex-1 bg-slate-900 py-3.5 rounded-2xl flex-row items-center justify-center shadow-md active:bg-slate-800"
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={16} color="#FFFFFF" className="mr-2" />
                    <Text className="text-white font-bold text-sm ml-2">Save Details</Text>
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
