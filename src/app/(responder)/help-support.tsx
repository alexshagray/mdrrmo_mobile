import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Home,
  PhoneCall,
  Shield,
  ShieldCheck,
  Flame,
  Stethoscope,
  Building2,
  Radio,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Compass,
  FileText,
  Activity,
  HeartPulse,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Info,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react-native';
import { useNetworkStatus } from '@/shared/hooks';
import Toast from 'react-native-toast-message';

interface HotlineItem {
  id: string;
  name: string;
  unit: string;
  tag: string;
  number: string;
  radioChannel?: string;
  icon: any;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
}

const EMERGENCY_AGENCIES: HotlineItem[] = [
  {
    id: 'mdrrmo-dispatch',
    name: 'MDRRMO Opol Command Center',
    unit: 'EMS & Disaster Operations Desk',
    tag: 'COMMAND DISPATCH',
    number: '09177076765',
    radioChannel: 'VHF 146.520 MHz (Ch 1 - Main)',
    icon: ShieldCheck,
    color: '#208AEF',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-[#1A76CE]',
    description: '24/7 central dispatch, crew staging, ambulance deployment & rescue coordination.',
  },
  {
    id: 'opol-pnp',
    name: 'Opol Municipal Police Station',
    unit: 'Philippine National Police (PNP)',
    tag: 'LAW ENFORCEMENT',
    number: '09358056370',
    radioChannel: 'VHF Tac Net (Ch 2)',
    icon: Shield,
    color: '#4F46E5',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
    description: 'Scene security, crowd management, vehicular crash investigation & police escorts.',
  },
  {
    id: 'opol-bfp',
    name: 'BFP Opol Fire & Rescue Station',
    unit: 'Bureau of Fire Protection',
    tag: 'FIRE & EXTRICATION',
    number: '09758429491',
    radioChannel: 'VHF Fire Net (Ch 3)',
    icon: Flame,
    color: '#DC2626',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-700',
    description: 'Heavy vehicle extrication, structural fires, hazardous materials & water rescue.',
  },
  {
    id: 'opol-rhu',
    name: 'Opol Municipal Health Office',
    unit: 'Rural Health Unit (RHU / DOH)',
    tag: 'MEDICAL DIRECTION',
    number: '0953678760',
    radioChannel: 'Direct Telephone Line',
    icon: Stethoscope,
    color: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-700',
    description: 'Municipal Health Officer (MHO) on-call, triage consultation & clinic receiving.',
  },
  {
    id: 'nmmc-trauma',
    name: 'Northern Mindanao Medical Center',
    unit: 'NMMC Tertiary Trauma Receiving Center',
    tag: 'LEVEL 3 TRAUMA HOSPITAL',
    number: '0888564147',
    radioChannel: 'Emergency Dept Hot-Line',
    icon: Building2,
    color: '#D97706',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-700',
    description: 'Regional tertiary referral facility for major trauma, critical ICU & surgical care.',
  },
];

interface RadioCode {
  code: string;
  name: string;
  meaning: string;
  category: 'status' | 'incident' | 'movement';
}

const RADIO_10_CODES: RadioCode[] = [
  { code: '10-4', name: 'Message Acknowledged', meaning: 'Affirmative / Received and understood.', category: 'status' },
  { code: '10-7', name: 'Out of Service', meaning: 'Unit off-duty, refueling, or maintenance.', category: 'status' },
  { code: '10-8', name: 'In Service / Available', meaning: 'Unit ready for immediate mission dispatch.', category: 'status' },
  { code: '10-19', name: 'Return to Base', meaning: 'Mission completed, returning to MDRRMO station.', category: 'movement' },
  { code: '10-20', name: 'Location Coordinates', meaning: 'Current position or utility pole location code.', category: 'movement' },
  { code: '10-23', name: 'Arrived on Scene', meaning: 'Ambulance parked in fend-off position at site.', category: 'movement' },
  { code: '10-50', name: 'Vehicular Accident (MVA)', meaning: 'Road traffic collision requiring EMS & PNP.', category: 'incident' },
  { code: '10-51', name: 'Ambulance Needed', meaning: 'Requesting additional EMS medical backup.', category: 'incident' },
  { code: '10-70', name: 'Fire Alarm / HAZMAT', meaning: 'Fire incident requiring immediate BFP response.', category: 'incident' },
  { code: '10-97', name: 'En Route to Scene', meaning: 'Ambulance wheels rolling, emergency lights active.', category: 'movement' },
];

interface SOPItem {
  id: string;
  step: string;
  title: string;
  summary: string;
  details: string[];
  protocolRule: string;
  icon: any;
}

const FIELD_SOPS: SOPItem[] = [
  {
    id: 'sop-1',
    step: 'SOP 01',
    title: 'Dispatch Acceptance & 60s Rollout',
    summary: 'Rapid response time standards upon receiving command center alarm.',
    protocolRule: 'Acknowledge within 60 seconds of terminal notification.',
    icon: Clock,
    details: [
      'Acknowledge the incoming mission on your mobile terminal within 60 seconds.',
      'Verify 3-man crew complement: Designated Ambulance Driver, Primary EMT/Medic, and Team Leader.',
      'Conduct a 30-second rapid vehicle check: oxygen tank level (>1000 PSI), AED pads, trauma bag readiness.',
      'Notify Dispatch via radio: "Unit [Ambulance Name] 10-97 to [Location]".',
    ],
  },
  {
    id: 'sop-2',
    step: 'SOP 02',
    title: 'Defensive Driving & Location Codes',
    summary: 'Emergency road navigation and rural electric pole pinpointing.',
    protocolRule: 'Drive with due regard; sirens do not exempt from safety.',
    icon: Compass,
    details: [
      'Maintain siren & emergency beacon discipline. Slow down at all blind intersections and highway crossings.',
      'If GPS signal degrades in rural barangays (e.g. Awang, Tingalan), reference Opol Electric Pole Markers (e.g. Marker #1024).',
      'The MDRRMO location code system maps 8,000+ utility poles directly to house coordinates.',
      'Maintain radio contact if heavy weather, landslides, or road closures obstruct transit.',
    ],
  },
  {
    id: 'sop-3',
    step: 'SOP 03',
    title: '360° Scene Size-Up & Hazard Isolation',
    summary: 'Defensive parking, perimeter hazard scans, and safety triage.',
    protocolRule: 'Never enter an unsecure or hostile scene.',
    icon: AlertTriangle,
    details: [
      'Park vehicle in the "fend-off" position: 50 feet away from wreckage, angled to protect crew from oncoming traffic.',
      'Conduct a 360-degree perimeter sweep: look up for downed electrical lines, look down for fuel spills/toxic runoff.',
      'Evaluate mechanism of injury (MOI) and number of casualties.',
      'If scene involves weapons, violence, or hostile crowds, stage at a safe distance and request PNP priority backup.',
    ],
  },
  {
    id: 'sop-4',
    step: 'SOP 04',
    title: 'Patient Primary Survey (ABCDE Protocol)',
    summary: 'Life-saving assessment and rapid trauma intervention workflow.',
    protocolRule: 'Treat life threats immediately as they are discovered.',
    icon: HeartPulse,
    details: [
      'A (Airway): Assess patency with manual C-spine stabilization for trauma victims.',
      'B (Breathing): Inspect rate, depth, chest symmetry; administer high-flow oxygen if SpO2 < 94%.',
      'C (Circulation): Check radial/carotid pulses, skin color/temperature; apply immediate direct pressure or commercial tourniquet for severe hemorrhage.',
      'D (Disability): Rapid neurological status via AVPU scale (Alert, Voice, Pain, Unresponsive) and pupillary reflex.',
      'E (Exposure): Expose injuries while maintaining patient dignity and hypothermia prevention.',
    ],
  },
  {
    id: 'sop-5',
    step: 'SOP 05',
    title: 'Digital Patient Care Record (PCR) Standards',
    summary: 'Mandatory documentation for clinical and legal handover.',
    protocolRule: 'If it was not documented in the PCR, legally it was not done.',
    icon: FileText,
    details: [
      'Document complete baseline vital signs: Blood Pressure (BP), Pulse Rate (PR), Respiratory Rate (RR), Oxygen Saturation (SpO2), Body Temperature, and Glasgow Coma Scale (GCS).',
      'Log time stamps for all administered interventions: Wound dressing, splinting, oxygen liters/min, and CPR cycles.',
      'Record patient allergies, current medications, and past medical history (SAMPLE protocol).',
      'If cellular network is offline, save draft locally; the app will queue and sync once network returns.',
    ],
  },
  {
    id: 'sop-6',
    step: 'SOP 06',
    title: 'Hospital Turnover & Clinical Handover',
    summary: 'Structured MIST verbal endorsement to emergency receiving staff.',
    protocolRule: 'Transfer care directly to registered medical personnel.',
    icon: Building2,
    details: [
      'Deliver verbal endorsement using the MIST format: Mechanism of injury, Injuries identified, Signs & vital trends, Treatment rendered.',
      'Assist triage staff in smooth patient transfer onto the emergency department gurney.',
      'Obtain receiving physician or triage nurse endorsement notes and signature for the PCR.',
      'Clean and disinfect ambulance interior, restock disposable supplies, and report 10-8 (Available).',
    ],
  },
  {
    id: 'sop-7',
    step: 'SOP 07',
    title: 'Patient Refusal of Care (AMA Protocol)',
    summary: 'Legal documentation when a patient declines medical transport.',
    protocolRule: 'Ensure patient has decision-making capacity before accepting refusal.',
    icon: Shield,
    details: [
      'Assess if patient is legally competent (adult, alert, oriented x4, not under severe intoxication or altered mental status).',
      'Explain the medical risks of refusing care and transport in clear, understandable language.',
      'Document full reasons for refusal in the Patient Care Record.',
      'Have the patient sign the Against Medical Advice (AMA) refusal section; secure a crew witness signature.',
      'Notify the Command Center dispatcher of the refusal before clearing the scene.',
    ],
  },
  {
    id: 'sop-8',
    step: 'SOP 08',
    title: 'False Alarm & Unfounded Incident Protocol',
    summary: 'Procedures when no patient or emergency is discovered on scene.',
    protocolRule: 'Conduct a thorough 5-minute visual sweep before declaring unfounded.',
    icon: Info,
    details: [
      'Perform a minimum 5-minute perimeter check and contact the caller/dispatch for location clarification.',
      'If confirmed false alarm, gone-on-arrival (GOA), or prank call, tap "Report Unfounded" in the mission screen.',
      'Provide concise field observations (e.g., "Area quiet, no accident found at cited marker, caller unreachable").',
      'Command Center will clear the dispatch, allowing your unit to return to active standby without penalty.',
    ],
  },
];

export default function ResponderHelpSupportScreen() {
  const router = useRouter();
  const { isOnline, isOffline, isSyncing, pendingCount, triggerSync, checkReachability } = useNetworkStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'hotlines' | 'radio' | 'sops' | 'offline'>('all');
  const [expandedSopId, setExpandedSopId] = useState<string | null>('sop-1');
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<'success' | 'failed' | null>(null);

  // Handle Back button to return to previous screen
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(responder)');
    }
  };

  // Explicit return to Home / Operations Dashboard
  const handleGoHome = () => {
    router.replace('/(responder)');
  };

  const handleCall = (number: string, name: string) => {
    Alert.alert(
      'Emergency Dispatch Call',
      `Dial ${number} for ${name}?\n\nStandard mobile call rates apply.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'default',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Toast.show({
                type: 'error',
                text1: 'Call Failed',
                text2: `Cannot dial ${number} on this device.`,
              });
            });
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const ok = await checkReachability(6000);
      setPingResult(ok ? 'success' : 'failed');
      if (ok) {
        Toast.show({
          type: 'success',
          text1: 'Command Center Reachable',
          text2: 'VHF & API communication links are active.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Server Unreachable',
          text2: 'Operating in local offline mode. Data will queue.',
        });
      }
    } finally {
      setIsTestingPing(false);
    }
  };

  // Filtered Hotlines
  const filteredHotlines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EMERGENCY_AGENCIES.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q) ||
        item.number.includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  // Filtered Radio Codes
  const filteredRadioCodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return RADIO_10_CODES.filter((code) => {
      if (!q) return true;
      return (
        code.code.toLowerCase().includes(q) ||
        code.name.toLowerCase().includes(q) ||
        code.meaning.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  // Filtered SOPs
  const filteredSops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FIELD_SOPS.filter((sop) => {
      if (!q) return true;
      return (
        sop.title.toLowerCase().includes(q) ||
        sop.summary.toLowerCase().includes(q) ||
        sop.protocolRule.toLowerCase().includes(q) ||
        sop.details.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const toggleSop = (id: string) => {
    setExpandedSopId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top']}>
      {/* 1. Command-Tier Top Navigation Bar */}
      <View className="bg-[#1570C7] px-4 pt-3 pb-4 shadow-md">
        <View className="flex-row items-center justify-between">
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center bg-white/15 px-3 py-2 rounded-xl active:bg-white/25 border border-white/20"
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold ml-1.5 uppercase tracking-wider">Back</Text>
          </TouchableOpacity>

          {/* Center Brand Title */}
          <View className="items-center flex-1 mx-2">
            <View className="flex-row items-center">
              <ShieldCheck size={16} color="#93C5FD" style={{ marginRight: 5 }} />
              <Text className="text-white text-base font-extrabold tracking-tight">Field Ops & Support</Text>
            </View>
            <Text className="text-blue-100 text-[11px] font-medium tracking-wide">
              MDRRMO OPOL RESCUE COMMAND
            </Text>
          </View>

          {/* Home Direct Shortcut Icon */}
          <TouchableOpacity
            onPress={handleGoHome}
            className="w-9 h-9 rounded-xl bg-white/15 items-center justify-center active:bg-white/25 border border-white/20"
            activeOpacity={0.7}
          >
            <Home size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 2. Live Search Bar */}
        <View className="mt-3.5 flex-row items-center bg-white rounded-xl px-3 py-2 shadow-sm">
          <Search size={16} color="#64748B" />
          <TextInput
            className="flex-1 ml-2 text-slate-800 text-sm font-medium py-0.5"
            placeholder="Search hotlines, 10-codes, SOPs, radio..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-4 px-4"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedTab('all')}
            className={`px-3.5 py-1.5 rounded-full mr-2 border ${
              selectedTab === 'all'
                ? 'bg-white border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedTab === 'all' ? 'text-[#1570C7]' : 'text-white'
              }`}
            >
              All Directives
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('hotlines')}
            className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 border ${
              selectedTab === 'hotlines'
                ? 'bg-white border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <PhoneCall size={12} color={selectedTab === 'hotlines' ? '#1570C7' : '#FFFFFF'} style={{ marginRight: 4 }} />
            <Text
              className={`text-xs font-bold ${
                selectedTab === 'hotlines' ? 'text-[#1570C7]' : 'text-white'
              }`}
            >
              Command Hotlines ({EMERGENCY_AGENCIES.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('radio')}
            className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 border ${
              selectedTab === 'radio'
                ? 'bg-white border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <Radio size={12} color={selectedTab === 'radio' ? '#1570C7' : '#FFFFFF'} style={{ marginRight: 4 }} />
            <Text
              className={`text-xs font-bold ${
                selectedTab === 'radio' ? 'text-[#1570C7]' : 'text-white'
              }`}
            >
              Radio 10-Codes ({RADIO_10_CODES.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('sops')}
            className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 border ${
              selectedTab === 'sops'
                ? 'bg-white border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <Layers size={12} color={selectedTab === 'sops' ? '#1570C7' : '#FFFFFF'} style={{ marginRight: 4 }} />
            <Text
              className={`text-xs font-bold ${
                selectedTab === 'sops' ? 'text-[#1570C7]' : 'text-white'
              }`}
            >
              Field SOPs ({FIELD_SOPS.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('offline')}
            className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 border ${
              selectedTab === 'offline'
                ? 'bg-white border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <Wifi size={12} color={selectedTab === 'offline' ? '#1570C7' : '#FFFFFF'} style={{ marginRight: 4 }} />
            <Text
              className={`text-xs font-bold ${
                selectedTab === 'offline' ? 'text-[#1570C7]' : 'text-white'
              }`}
            >
              Offline Mode
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Connection Banner & Diagnostic */}
        <View className="bg-white rounded-2xl p-4 mb-5 border border-slate-200/80 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                  isOnline ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                }`}
              >
                {isOnline ? (
                  <Wifi size={20} color="#059669" />
                ) : (
                  <WifiOff size={20} color="#D97706" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-slate-900 font-extrabold text-sm">
                    {isOnline ? 'MDRRMO Network Connected' : 'Operating in Offline Mode'}
                  </Text>
                </View>
                <Text className="text-slate-500 text-[11px] mt-0.5">
                  {isOnline
                    ? 'Real-time telemetry, location tracking & alarms active'
                    : 'Records queued locally; will auto-sync on signal restoration'}
                </Text>
              </View>
            </View>

            {/* Test Ping Button */}
            <TouchableOpacity
              onPress={handleTestConnection}
              disabled={isTestingPing}
              className="bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/90 active:bg-slate-200 flex-row items-center"
            >
              {isTestingPing ? (
                <ActivityIndicator size="small" color="#208AEF" />
              ) : (
                <>
                  <RefreshCw size={13} color="#475569" style={{ marginRight: 4 }} />
                  <Text className="text-slate-700 font-bold text-xs">Test Ping</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {pendingCount > 0 && (
            <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                <Text className="text-slate-700 font-semibold text-xs">
                  {pendingCount} offline update(s) pending sync
                </Text>
              </View>
              <TouchableOpacity
                onPress={triggerSync}
                disabled={isSyncing}
                className="bg-[#208AEF] px-3 py-1 rounded-lg active:bg-[#1A76CE]"
              >
                <Text className="text-white font-bold text-[11px]">
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SECTION 1: EMERGENCY COMMAND HOTLINES */}
        {(selectedTab === 'all' || selectedTab === 'hotlines') && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View>
                <Text className="text-slate-900 font-extrabold text-base tracking-tight">
                  Emergency Command Hotlines
                </Text>
                <Text className="text-slate-500 text-xs">
                  Direct telephone and radio dispatch channels
                </Text>
              </View>
              <View className="bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-full">
                <Text className="text-rose-700 font-bold text-[10px] uppercase tracking-wider">
                  24/7 PRIORITY
                </Text>
              </View>
            </View>

            {filteredHotlines.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200/80">
                <Text className="text-slate-400 font-medium text-sm">No hotlines match your query.</Text>
              </View>
            ) : (
              filteredHotlines.map((item) => {
                const IconComponent = item.icon;
                return (
                  <View
                    key={item.id}
                    className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm"
                  >
                    <View className="flex-row items-start justify-between">
                      {/* Left: Agency details */}
                      <View className="flex-row items-start flex-1 mr-3">
                        <View
                          className="w-11 h-11 rounded-xl items-center justify-center mr-3 mt-0.5"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <IconComponent size={22} color={item.color} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center flex-wrap gap-1 mb-1">
                            <View className={`${item.badgeBg} border ${item.badgeBorder} px-2 py-0.5 rounded-md`}>
                              <Text className={`${item.badgeText} font-extrabold text-[9px] uppercase tracking-wider`}>
                                {item.tag}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-slate-900 font-bold text-sm leading-tight">
                            {item.name}
                          </Text>
                          <Text className="text-slate-500 text-xs font-medium mt-0.5">
                            {item.unit}
                          </Text>
                          <Text className="text-slate-400 text-[11px] mt-1 leading-snug">
                            {item.description}
                          </Text>

                          {item.radioChannel && (
                            <View className="flex-row items-center mt-2 bg-slate-50 border border-slate-200/70 px-2 py-1 rounded-lg self-start">
                              <Radio size={11} color="#64748B" style={{ marginRight: 4 }} />
                              <Text className="text-slate-600 font-semibold text-[10px]">
                                {item.radioChannel}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Right: Direct Dial Button */}
                      <TouchableOpacity
                        onPress={() => handleCall(item.number, item.name)}
                        className="bg-emerald-600 px-3.5 py-2.5 rounded-xl flex-row items-center active:bg-emerald-700 shadow-sm"
                        activeOpacity={0.8}
                      >
                        <PhoneCall size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text className="text-white font-extrabold text-xs">Call</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Bottom hotline phone pill */}
                    <View className="mt-3 pt-2.5 border-t border-slate-100 flex-row items-center justify-between">
                      <Text className="text-slate-400 text-[11px] font-medium">Direct Line:</Text>
                      <TouchableOpacity
                        onPress={() => handleCall(item.number, item.name)}
                        className="flex-row items-center"
                      >
                        <Text className="text-slate-900 font-extrabold text-sm tracking-wide">
                          {item.number}
                        </Text>
                        <Text className="text-emerald-600 text-xs font-bold ml-2">Tap to Dial →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 2: RADIO 10-CODES CHEATSHEET */}
        {(selectedTab === 'all' || selectedTab === 'radio') && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View>
                <Text className="text-slate-900 font-extrabold text-base tracking-tight">
                  Emergency Radio 10-Codes
                </Text>
                <Text className="text-slate-500 text-xs">
                  Standard Philippine public safety radio shorthand
                </Text>
              </View>
              <View className="bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full flex-row items-center">
                <Radio size={11} color="#4F46E5" style={{ marginRight: 4 }} />
                <Text className="text-indigo-700 font-bold text-[10px] uppercase tracking-wider">
                  VHF TAC
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm">
              {filteredRadioCodes.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="text-slate-400 text-xs font-medium">No 10-codes match your search.</Text>
                </View>
              ) : (
                <View className="divide-y divide-slate-100">
                  {filteredRadioCodes.map((item) => (
                    <View key={item.code} className="py-2.5 px-1 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-14 py-1 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center mr-3">
                          <Text className="text-slate-900 font-extrabold text-xs tracking-wider">
                            {item.code}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-900 font-bold text-xs">{item.name}</Text>
                          <Text className="text-slate-500 text-[11px] leading-snug">{item.meaning}</Text>
                        </View>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          item.category === 'incident'
                            ? 'bg-rose-50 border border-rose-200'
                            : item.category === 'movement'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase ${
                            item.category === 'incident'
                              ? 'text-rose-700'
                              : item.category === 'movement'
                              ? 'text-blue-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* SECTION 3: FIELD STANDARD OPERATING PROCEDURES (SOPS) */}
        {(selectedTab === 'all' || selectedTab === 'sops') && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View>
                <Text className="text-slate-900 font-extrabold text-base tracking-tight">
                  Field SOPs & Protocols
                </Text>
                <Text className="text-slate-500 text-xs">
                  Step-by-step life safety and clinical guidelines
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                <Text className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider">
                  EMS MANUAL
                </Text>
              </View>
            </View>

            {filteredSops.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200/80">
                <Text className="text-slate-400 font-medium text-sm">No SOP protocols match your query.</Text>
              </View>
            ) : (
              filteredSops.map((sop) => {
                const isExpanded = expandedSopId === sop.id;
                const SopIcon = sop.icon;
                return (
                  <View
                    key={sop.id}
                    className="bg-white rounded-2xl mb-3 border border-slate-200/80 overflow-hidden shadow-sm"
                  >
                    <TouchableOpacity
                      onPress={() => toggleSop(sop.id)}
                      className="p-4 flex-row items-center justify-between active:bg-slate-50"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center mr-3">
                          <SopIcon size={18} color="#208AEF" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center mb-0.5">
                            <Text className="text-blue-600 font-extrabold text-[10px] uppercase tracking-wider mr-2">
                              {sop.step}
                            </Text>
                          </View>
                          <Text className="text-slate-900 font-bold text-sm leading-snug">
                            {sop.title}
                          </Text>
                          <Text className="text-slate-500 text-xs mt-0.5 font-medium" numberOfLines={1}>
                            {sop.summary}
                          </Text>
                        </View>
                      </View>
                      <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp size={16} color="#64748B" />
                        ) : (
                          <ChevronDown size={16} color="#64748B" />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/60">
                        {/* Golden Rule Callout */}
                        <View className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 mb-3 flex-row items-start">
                          <ShieldCheck size={16} color="#B45309" style={{ marginTop: 2, marginRight: 8 }} />
                          <View className="flex-1">
                            <Text className="text-amber-900 font-bold text-xs uppercase tracking-wider">
                              Operational Directive:
                            </Text>
                            <Text className="text-amber-800 text-xs mt-0.5 font-medium">
                              {sop.protocolRule}
                            </Text>
                          </View>
                        </View>

                        {/* Detailed Steps */}
                        <Text className="text-slate-700 font-bold text-xs mb-2 uppercase tracking-wider">
                          Standard Execution Steps:
                        </Text>
                        <View className="space-y-2">
                          {sop.details.map((detail, idx) => (
                            <View key={idx} className="flex-row items-start mb-2">
                              <View className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 items-center justify-center mr-2.5 mt-0.5">
                                <Text className="text-[#1A76CE] font-bold text-[10px]">{idx + 1}</Text>
                              </View>
                              <Text className="text-slate-600 text-xs leading-relaxed flex-1 font-medium">
                                {detail}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION 4: OFFLINE SYSTEM & TECH GUIDE */}
        {(selectedTab === 'all' || selectedTab === 'offline') && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View>
                <Text className="text-slate-900 font-extrabold text-base tracking-tight">
                  Field Offline Resilience
                </Text>
                <Text className="text-slate-500 text-xs">
                  How MDRRMO mobile functions without cellular data
                </Text>
              </View>
              <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full">
                <Text className="text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                  SYNC ENGINE
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4">
              {/* Feature 1 */}
              <View className="flex-row items-start mb-3">
                <View className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 items-center justify-center mr-3 mt-0.5">
                  <Layers size={18} color="#4F46E5" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-sm">
                    Offline Mission Caching
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Active dispatches, patient details, and incident codes are locally stored on the device. Even if connectivity drops midway through a mission, you can still view location codes, accept missions, and change status.
                  </Text>
                </View>
              </View>

              {/* Feature 2 */}
              <View className="flex-row items-start mb-3">
                <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center mr-3 mt-0.5">
                  <FileText size={18} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-sm">
                    Queued Patient Care Records (PCR)
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Vital signs, medical notes, and injury assessments saved while offline are queued in encrypted local storage. As soon as the ambulance enters cellular range or Wi-Fi coverage, records upload automatically.
                  </Text>
                </View>
              </View>

              {/* Feature 3 */}
              <View className="flex-row items-start mb-2">
                <View className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 items-center justify-center mr-3 mt-0.5">
                  <MapPin size={18} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-sm">
                    Opol Electric Pole Location Markers
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Over 8,000 electric utility poles across Opol have designated numeric code plates. When mobile GPS satellite accuracy drops under canopy, match the pole code on the street to navigate directly to the incident.
                  </Text>
                </View>
              </View>

              {/* Manual sync action bar */}
              <View className="mt-2 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                <Text className="text-slate-500 text-xs font-semibold">
                  Pending Updates: <Text className="text-slate-900 font-extrabold">{pendingCount}</Text>
                </Text>
                <TouchableOpacity
                  onPress={triggerSync}
                  disabled={isSyncing}
                  className="bg-[#208AEF] px-4 py-2 rounded-xl flex-row items-center active:bg-[#1A76CE]"
                >
                  <RefreshCw size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text className="text-white font-extrabold text-xs">
                    {isSyncing ? 'Synchronizing...' : 'Force Sync Queue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Home Return Card */}
        <View className="bg-slate-900 rounded-2xl p-5 items-center text-center mt-2 shadow-md">
          <View className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/30 items-center justify-center mb-3">
            <Home size={22} color="#60A5FA" />
          </View>
          <Text className="text-white font-extrabold text-base">Return to Operations Dashboard</Text>
          <Text className="text-slate-400 text-xs text-center mt-1 px-4">
            Keep your terminal on standby for real-time dispatch assignments and emergency alarm sirens.
          </Text>
          <TouchableOpacity
            onPress={handleGoHome}
            className="mt-4 bg-[#208AEF] w-full py-3.5 rounded-xl items-center active:bg-[#1A76CE]"
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider">
              Back to Home Page
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
