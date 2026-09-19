import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/shared/components';
import { EmergencyButton } from '@/resident/components/common/EmergencyButton';
import { EmergencyHotlineGrid } from '@/resident/components/cards/HotlineCard';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  MapPin,
  Navigation,
  Bell,
  FileText,
  PhoneCall,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Flame,
  Wind,
  Zap,
  Waves,
  X,
  Radio,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { getMyReports } from '@/shared/api/incidents';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';

// ─── Disaster Tips Data ───────────────────────────────────────────────────────
interface DisasterGuide {
  title: string;
  category: string;
  badge: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  summary: string;
  steps: string[];
}

const DISASTER_GUIDES: DisasterGuide[] = [
  {
    title: 'Typhoon Preparedness',
    category: 'Severe Weather',
    badge: 'TYPHOON',
    icon: Wind,
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    summary: 'Essential checklist before, during, and after tropical storms in Opol.',
    steps: [
      'Secure loose outdoor items, roof sheets, and window shutters.',
      'Charge power banks, flashlights, and keep battery-powered radios ready.',
      'Prepare emergency go-bags with 3 days of non-perishable food and potable water.',
      'Know your nearest designated Barangay Evacuation Center.',
      'Avoid crossing swollen rivers, creeks, or flooded low-lying roads.',
    ],
  },
  {
    title: 'Fire Safety & Prevention',
    category: 'Home & Workplace',
    badge: 'FIRE',
    icon: Flame,
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    summary: 'Life-saving measures for domestic electrical and gas fire hazards.',
    steps: [
      'Inspect electrical cords and avoid overloading extension sockets.',
      'Keep kitchen stove and LPG regulators tightly shut when unattended.',
      'Identify two safe exit routes from every room in your residence.',
      'If smoke fills the room, stay low and crawl toward the nearest exit.',
      'Call the BFP Opol Fire Station hotline immediately at 09758429491.',
    ],
  },
  {
    title: 'Earthquake Drill (Duck, Cover & Hold)',
    category: 'Geological Hazard',
    badge: 'SEISMIC',
    icon: Zap,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    summary: 'Immediate reflexive actions when sudden seismic tremors strike.',
    steps: [
      'Duck under a sturdy table or desk immediately and hold on tight.',
      'Protect your head and neck with your arms if no shelter is nearby.',
      'Stay away from glass windows, dangling chandeliers, and tall bookcases.',
      'Do not rush outside or use elevators while tremors are ongoing.',
      'Once shaking stops, proceed calmly to an open designated assembly field.',
    ],
  },
  {
    title: 'Flood & Coastal Storm Surge',
    category: 'Hydrological Hazard',
    badge: 'FLOOD',
    icon: Waves,
    color: '#0D9488',
    bg: '#F0FDFA',
    border: '#99F6E4',
    summary: 'Crucial steps for riverine, creek, and coastal tidal surges.',
    steps: [
      'Monitor local MDRRMO water level warnings and barangay siren advisories.',
      'Shut off the main electrical circuit breaker before floodwater enters your home.',
      'Move elderly family members, infants, and vital documents to higher levels.',
      'Never drive or wade through floodwaters with unknown depth and strong currents.',
      'Heed pre-emptive evacuation orders given by local disaster response officials.',
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { residentRefreshTrigger } = useResidentAlert();
  const userName = user?.first_name || user?.name || 'Resident';

  const [recentReport, setRecentReport] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeGuide, setActiveGuide] = useState<DisasterGuide | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      
      if (incidents.length > 0) {
        // Find latest active emergency if exists, otherwise take first latest
        const activeItem = incidents.find((i: any) => 
          ['pending', 'verified', 'assigned', 'responding'].includes(i.incident_status)
        );
        const target = activeItem || incidents[0];
        const isActive = ['pending', 'verified', 'assigned', 'responding'].includes(target.incident_status);

        setRecentReport({
          id: `INC-2026-${String(target.id).padStart(5, '0')}`,
          rawId: target.id,
          type: target.incident_type?.name || 'Emergency Incident',
          status: target.incident_status,
          isActive,
          time: new Date(target.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          location:
            target.place_of_incident ||
            target.incident_address ||
            target.location ||
            'Opol, Misamis Oriental',
          priority: target.priority || 'High',
          activeDispatch: target.active_dispatch,
        });
      } else {
        setRecentReport(null);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoadingReports(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIncidents();
    }, [fetchIncidents])
  );

  useEffect(() => {
    fetchIncidents();
  }, [residentRefreshTrigger, fetchIncidents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
  };

  const getStatusBadge = (status: string, dispatchStatus?: string) => {
    if (dispatchStatus === 'arrived_on_scene') {
      return {
        label: 'RESPONDERS ON SCENE',
        bg: 'bg-emerald-50 border-emerald-200/70',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    }
    if (dispatchStatus === 'en_route') {
      return {
        label: 'AMBULANCE EN ROUTE',
        bg: 'bg-rose-50 border-rose-200/70',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
      };
    }
    if (status === 'assigned') {
      return {
        label: 'CREW DISPATCHED',
        bg: 'bg-indigo-50 border-indigo-200/70',
        text: 'text-indigo-700',
        dot: 'bg-indigo-500',
      };
    }
    if (status === 'verified') {
      return {
        label: 'DISPATCH VERIFIED',
        bg: 'bg-blue-50 border-blue-200/70',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
      };
    }
    if (status === 'resolved' || status === 'completed') {
      return {
        label: 'RESOLVED',
        bg: 'bg-slate-100 border-slate-200/70',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
    }
    return {
      label: 'PENDING VERIFICATION',
      bg: 'bg-amber-50 border-amber-200/70',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Header
        title={`Hi, ${userName} 👋`}
        subtitle="MDRRMO OPOL • CITIZEN EMERGENCY PORTAL"
        className="bg-transparent pb-0"
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#64748B"
          />
        }
      >
        {/* Urgent Emergency SOS Card */}
        <EmergencyButton onPress={() => router.push('/(resident)/report')} />

        {/* ─── Quick Services Hub ────────────────────────────────────────── */}
        <View
          className="bg-white rounded-3xl p-4 border border-slate-200/80 mb-6 flex-row justify-between items-center"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* File Emergency Report */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/report')}
            activeOpacity={0.75}
            className="items-center flex-1"
          >
            <View className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/60 items-center justify-center mb-1.5 shadow-sm">
              <ShieldAlert size={22} color="#E11D48" strokeWidth={2.25} />
            </View>
            <Text className="text-slate-800 text-[11px] font-bold text-center">New Report</Text>
            <Text className="text-slate-400 text-[9px] font-medium text-center">Emergency</Text>
          </TouchableOpacity>

          {/* My Incident History */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/my-reports')}
            activeOpacity={0.75}
            className="items-center flex-1"
          >
            <View className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 items-center justify-center mb-1.5 shadow-sm">
              <FileText size={22} color="#4F46E5" strokeWidth={2.25} />
            </View>
            <Text className="text-slate-800 text-[11px] font-bold text-center">My Reports</Text>
            <Text className="text-slate-400 text-[9px] font-medium text-center">History</Text>
          </TouchableOpacity>

          {/* Live Dispatch Tracking */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/track')}
            activeOpacity={0.75}
            className="items-center flex-1"
          >
            <View className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/60 items-center justify-center mb-1.5 shadow-sm">
              <Navigation size={21} color="#0284C7" strokeWidth={2.25} />
            </View>
            <Text className="text-slate-800 text-[11px] font-bold text-center">Live Track</Text>
            <Text className="text-slate-400 text-[9px] font-medium text-center">Navigation</Text>
          </TouchableOpacity>

          {/* Emergency Directory */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/help-support')}
            activeOpacity={0.75}
            className="items-center flex-1"
          >
            <View className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 items-center justify-center mb-1.5 shadow-sm">
              <PhoneCall size={22} color="#059669" strokeWidth={2.25} />
            </View>
            <Text className="text-slate-800 text-[11px] font-bold text-center">Directory</Text>
            <Text className="text-slate-400 text-[9px] font-medium text-center">Hotlines</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Active Emergency Status (Parallel to Responder Assignment) ── */}
        <View className="mb-2">
          {loadingReports ? (
            <View className="py-8 items-center justify-center bg-white rounded-3xl border border-slate-200/80 mb-6 shadow-sm">
              <ActivityIndicator size="small" color="#E11D48" />
              <Text className="text-slate-400 text-xs mt-2 font-medium">Checking active status...</Text>
            </View>
          ) : recentReport && recentReport.isActive ? (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-base font-bold text-slate-900 tracking-tight">
                  Active Emergency Status
                </Text>
                <View className="flex-row items-center bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                  <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                  <Text className="text-rose-600 text-[10px] font-bold uppercase tracking-wider">
                    LIVE
                  </Text>
                </View>
              </View>

              {/* Elevated Active Mission Card */}
              {(() => {
                const badge = getStatusBadge(
                  recentReport.status,
                  recentReport.activeDispatch?.dispatch_status
                );
                return (
                  <View
                    className="bg-white rounded-3xl p-5 border border-slate-200/80"
                    style={{
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 14,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2 mb-1.5">
                          <View className="bg-rose-50 border border-rose-200/70 px-2.5 py-0.5 rounded-full">
                            <Text className="text-rose-700 text-[10px] font-black uppercase tracking-wider">
                              {recentReport.type}
                            </Text>
                          </View>
                          <Text className="text-slate-400 font-mono font-bold text-[11px]">
                            {recentReport.id}
                          </Text>
                        </View>
                        <Text className="text-slate-900 text-lg font-black tracking-tight" numberOfLines={1}>
                          {recentReport.type}
                        </Text>
                      </View>

                      {/* Status badge */}
                      <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${badge.bg}`}>
                        <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`} />
                        <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${badge.text}`}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Location and time row */}
                    <View className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 mb-4 space-y-1.5">
                      <View className="flex-row items-center">
                        <MapPin size={13} color="#64748B" style={{ marginRight: 6 }} />
                        <Text className="text-slate-700 text-xs font-semibold flex-1" numberOfLines={1}>
                          {recentReport.location}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Clock size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text className="text-slate-400 text-[11px] font-medium">
                          Reported: {recentReport.time}
                        </Text>
                      </View>
                    </View>

                    {/* Track Button */}
                    <TouchableOpacity
                      onPress={() => router.push('/(resident)/track')}
                      activeOpacity={0.85}
                      className="w-full py-3 bg-slate-900 active:bg-slate-800 rounded-2xl flex-row items-center justify-center shadow-sm"
                    >
                      <MapPin size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text className="text-white font-bold text-xs tracking-wider uppercase">
                        TRACK RESPONDERS LIVE
                      </Text>
                      <ChevronRight size={15} color="#94A3B8" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          ) : (
            <View className="py-8 px-6 items-center justify-center bg-white rounded-3xl border border-slate-200/70 mb-6 shadow-sm">
              <View className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center mb-3">
                <ShieldCheck size={26} color="#059669" />
              </View>
              <Text className="text-slate-900 font-bold text-base tracking-tight mb-1">
                All Clear • No Active Emergencies
              </Text>
              <Text className="text-slate-400 text-xs font-medium text-center leading-relaxed">
                MDRRMO rescue teams and Alpha units are on active 24/7 standby in Opol.
              </Text>
            </View>
          )}
        </View>

        {/* ─── Direct Emergency Hotlines ─────────────────────────────────── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-base font-bold text-slate-900 tracking-tight">
              Emergency Hotlines
            </Text>
            <TouchableOpacity onPress={() => router.push('/(resident)/help-support')}>
              <Text className="text-indigo-600 text-xs font-bold">Directory</Text>
            </TouchableOpacity>
          </View>
          <EmergencyHotlineGrid />
        </View>

        {/* ─── Safety & Disaster Preparedness Guides ──────────────────────── */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-base font-bold text-slate-900 tracking-tight">
              Safety & Disaster Guides
            </Text>
            <Text className="text-slate-400 text-xs font-medium">Tap to view protocol</Text>
          </View>

          <View className="space-y-3">
            {DISASTER_GUIDES.map((guide, idx) => {
              const IconComp = guide.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveGuide(guide)}
                  activeOpacity={0.75}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 flex-row items-center justify-between shadow-sm mb-2.5"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center mr-3 border"
                      style={{ backgroundColor: guide.bg, borderColor: guide.border }}
                    >
                      <IconComp size={22} color={guide.color} strokeWidth={2.25} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 mb-0.5">
                        <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                          {guide.title}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs font-medium" numberOfLines={1}>
                        {guide.summary}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ─── Interactive Disaster Guide Protocol Modal ─────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!activeGuide}
        onRequestClose={() => setActiveGuide(null)}
      >
        <View className="flex-1 justify-end bg-slate-900/60">
          <View
            className="bg-white rounded-t-[32px] p-6 max-h-[85%] border-t border-slate-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header / Close button */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <View className="flex-row items-center flex-1 mr-2">
                {activeGuide && (
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3 border"
                    style={{ backgroundColor: activeGuide.bg, borderColor: activeGuide.border }}
                  >
                    <activeGuide.icon size={22} color={activeGuide.color} strokeWidth={2.25} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-slate-900 font-black text-lg tracking-tight" numberOfLines={1}>
                    {activeGuide?.title}
                  </Text>
                  <Text className="text-slate-400 text-xs font-semibold">
                    {activeGuide?.category} Protocol
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setActiveGuide(null)}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                activeOpacity={0.7}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Content checklist */}
            <ScrollView showsVerticalScrollIndicator={false} className="mb-5">
              <Text className="text-slate-600 text-xs font-medium leading-relaxed mb-4">
                {activeGuide?.summary}
              </Text>

              <Text className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-2.5">
                Key Safety Action Steps:
              </Text>

              <View className="space-y-2.5">
                {activeGuide?.steps.map((step, sIdx) => (
                  <View
                    key={sIdx}
                    className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex-row items-start mb-2"
                  >
                    <View className="w-5 h-5 rounded-full bg-slate-900 items-center justify-center mr-3 mt-0.5">
                      <Text className="text-white text-[10px] font-black">{sIdx + 1}</Text>
                    </View>
                    <Text className="text-slate-700 text-xs font-medium flex-1 leading-5">
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Done button */}
            <TouchableOpacity
              onPress={() => setActiveGuide(null)}
              activeOpacity={0.85}
              className="w-full py-3.5 bg-slate-900 active:bg-slate-800 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-xs tracking-wider uppercase">
                Understood & Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

