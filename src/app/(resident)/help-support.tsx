import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  PhoneCall,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  Flame,
  Stethoscope,
  Building2,
  ExternalLink,
} from 'lucide-react-native';

interface HotlineItem {
  name: string;
  agency: string;
  number: string;
  icon: any;
  color: string;
  badgeBg: string;
}

const EMERGENCY_SERVICES: HotlineItem[] = [
  {
    name: 'MDRRMO Opol Command Center',
    agency: 'EMS & Disaster Response',
    number: '09177076765',
    icon: Shield,
    color: '#3B82F6',
    badgeBg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    name: 'Opol Municipal Police Station',
    agency: 'Philippine National Police (PNP)',
    number: '09358056370',
    icon: Shield,
    color: '#6366F1',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    name: 'BFP Opol Fire Station',
    agency: 'Bureau of Fire Protection (BFP)',
    number: '09758429491',
    icon: Flame,
    color: '#EF4444',
    badgeBg: 'bg-red-500/10 border-red-500/20',
  },
  {
    name: 'Opol Municipal Health Office',
    agency: 'Health & Medical Services (RHU / DOH)',
    number: '0953678760',
    icon: Stethoscope,
    color: '#10B981',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

const FAQS = [
  {
    q: 'How do I report an emergency through the app?',
    a: 'Navigate to the Report tab or tap the prominent Emergency button on Home. Select your incident classification (e.g. Medical Emergency, Road Accident), capture a photo of the incident scene, verify your location code or address, and submit. Dispatchers receive your alert within seconds.',
  },
  {
    q: 'How does responder live tracking work?',
    a: 'Once your emergency submission is approved by the MDRRMO command center, an ambulance crew is deployed. You can view their live real-time position, route navigation, and estimated arrival time on the Track tab.',
  },
  {
    q: 'Why was my emergency report rejected?',
    a: 'Reports can be declined if they are identified as accidental submissions, duplicates of an already ongoing incident, or non-emergency queries. The exact rejection reason from the dispatcher is displayed directly on your Report Details screen.',
  },
  {
    q: 'Can I report an emergency without cellular mobile data?',
    a: 'Yes! The app provides direct emergency hotline shortcuts that connect directly through standard cellular voice calls to the MDRRMO Command Center even without internet access.',
  },
  {
    q: 'What are Opol Location Codes / Electric Posts?',
    a: 'MDRRMO has catalogued over 8,000 electric utility poles throughout Opol. By citing the pole number tag on your street, responders can navigate directly to your location with pinpoint precision.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCall = (number: string, name: string) => {
    Alert.alert('Call Emergency Service', `Dial ${number} for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call Now',
        style: 'default',
        onPress: () => Linking.openURL(`tel:${number}`),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
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
          <Text className="text-slate-900 text-base font-bold tracking-tight">Help & Support</Text>
          <Text className="text-slate-400 text-xs">Emergency Directory & FAQs</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Emergency Hotlines */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View>
              <Text className="text-slate-900 font-bold text-base">Emergency Hotlines</Text>
              <Text className="text-slate-400 text-xs">Tap to call emergency responders immediately</Text>
            </View>
            <View className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              <Text className="text-rose-700 text-[10px] font-bold uppercase tracking-wider">24/7 Hotlines</Text>
            </View>
          </View>

          <View className="space-y-3">
            {EMERGENCY_SERVICES.map((item) => {
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.number}
                  onPress={() => handleCall(item.number, item.name)}
                  className="bg-white border border-slate-200/80 rounded-3xl p-4 flex-row items-center justify-between active:bg-slate-50"
                  style={{
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center border mr-3 ${item.badgeBg}`}
                    >
                      <IconComp size={19} color={item.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-slate-400 text-[11px] mt-0.5">{item.agency}</Text>
                      <Text className="text-blue-600 font-mono text-xs font-bold mt-0.5">
                        {item.number}
                      </Text>
                    </View>
                  </View>

                  <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center">
                    <PhoneCall size={16} color="#059669" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: How It Works Guides */}
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
          <Text className="text-slate-900 font-bold text-base mb-1 tracking-tight">
            How Emergency Response Works
          </Text>
          <Text className="text-slate-400 text-xs mb-4">
            Step-by-step life-safety workflow
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-start">
              <View className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-700 text-xs font-bold">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-xs">Submit Report</Text>
                <Text className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  Launch the app, take a scene photo, verify your location, and hit submit.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mt-3">
              <View className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-700 text-xs font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-xs">Triage & Verification</Text>
                <Text className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  The MDRRMO Command Center verifies incident priority and prepares the rescue crew.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mt-3">
              <View className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-700 text-xs font-bold">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-xs">Ambulance Dispatch & Live Tracking</Text>
                <Text className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  Follow the responder vehicle on the interactive map until arrival on scene.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Frequently Asked Questions */}
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
            <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center border border-amber-200/60 mr-3">
              <HelpCircle size={18} color="#D97706" />
            </View>
            <View>
              <Text className="text-slate-900 font-bold text-base">Frequently Asked Questions</Text>
              <Text className="text-slate-400 text-xs">Common inquiries & guides</Text>
            </View>
          </View>

          <View className="space-y-2.5">
            {FAQS.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <View
                  key={faq.q}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden"
                >
                  <TouchableOpacity
                    onPress={() => setExpandedFaq(isExpanded ? null : index)}
                    className="p-3.5 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <Text className="text-slate-800 font-bold text-xs flex-1 pr-3 leading-snug">
                      {faq.q}
                    </Text>
                    {isExpanded ? (
                      <ChevronUp size={16} color="#64748B" />
                    ) : (
                      <ChevronDown size={16} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                  {isExpanded ? (
                    <View className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/60">
                      <Text className="text-slate-600 text-xs leading-relaxed">{faq.a}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Section 4: MDRRMO Office Information */}
        <View
          className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Building2 size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text className="text-slate-900 font-bold text-sm">MDRRMO Opol Headquarters</Text>
          </View>
          <Text className="text-slate-600 text-xs leading-relaxed mb-2">
            Municipal Disaster Risk Reduction and Management Office (MDRRMO)
            {'\n'}Municipal Complex, Poblacion, Opol, Misamis Oriental, Philippines
          </Text>
          <Text className="text-slate-400 text-[11px] font-medium">
            Operating 24 hours a day, 7 days a week, 365 days a year.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
