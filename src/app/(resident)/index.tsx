import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/shared/components';
import { EmergencyButton } from '@/resident/components/common/EmergencyButton';
import { EmergencyHotlineGrid } from '@/resident/components/cards/HotlineCard';
import { SafetyTipCard } from '@/resident/components/cards/SafetyTipCard';
import { ReportCard } from '@/resident/components/cards/ReportCard';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Bell, FileSearch } from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { getMyReports } from '@/shared/api/incidents';

// ─── Quick-action button ─────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{ alignItems: 'center', flex: 1 }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          shadowColor: color,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: '#475569',
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: '#1E293B',
          fontSize: 15,
          fontWeight: '800',
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text
            style={{
              color: '#6366F1',
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.first_name || user?.name || 'Resident';

  const [recentReport, setRecentReport] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchIncidents = async () => {
        try {
          setLoadingReports(true);
          const res = await getMyReports();
          const incidents = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          
          if (incidents.length > 0) {
            const latest = incidents[0];
            setRecentReport({
              id: `RPT-${latest.id}`,
              type: latest.incident_type?.name || 'Emergency',
              status: latest.incident_status,
              time: new Date(latest.created_at).toLocaleDateString() || 'Recently',
              location: latest.location || 'Unknown location',
            });
          } else {
            setRecentReport(null);
          }
        } catch (e) {
          console.error("Failed to fetch reports", e);
        } finally {
          setLoadingReports(false);
        }
      };

      fetchIncidents();
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
      <Header
        title={`Hi, ${userName} 👋`}
        subtitle="Stay safe and prepared."
        className="bg-transparent pb-0"
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Emergency CTA */}
        <EmergencyButton onPress={() => router.push('/(resident)/report')} />

        {/* Quick actions row */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            paddingVertical: 16,
            paddingHorizontal: 12,
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            marginBottom: 6,
          }}
        >
          <QuickAction
            icon={<FileSearch size={22} color="#6366F1" strokeWidth={2.25} />}
            label="My Reports"
            color="#6366F1"
            bg="#EEF2FF"
            onPress={() => router.push('/(resident)/report')}
          />
          <QuickAction
            icon={<MapPin size={22} color="#0891B2" strokeWidth={2.25} />}
            label="Track"
            color="#0891B2"
            bg="#ECFEFF"
            onPress={() => router.push('/(resident)/track')}
          />
          <QuickAction
            icon={<Bell size={22} color="#D97706" strokeWidth={2.25} />}
            label="Alerts"
            color="#D97706"
            bg="#FFFBEB"
            onPress={() => router.push('/(resident)/notifications')}
          />
        </View>

        {/* Emergency hotlines 2×2 grid */}
        <View className="px-4 mt-4">
          <SectionHeader title="Emergency Hotlines" />
          <EmergencyHotlineGrid />
        </View>

        {/* Safety tips */}
        <View className="px-4 mt-5">
          <SectionHeader
            title="Safety & Preparedness"
            actionLabel="View All"
            onAction={() => console.log('View all safety tips')}
          />
          <SafetyTipCard
            title="Typhoon Preparedness"
            description="Learn how to prepare your family for severe weather."
          />
          <SafetyTipCard
            title="Fire Safety at Home"
            description="Essential tips to prevent and respond to fire emergencies."
          />
        </View>

        {/* Recent reports */}
        {loadingReports ? (
          <View className="px-4 mt-8 items-center justify-center">
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        ) : recentReport ? (
          <View className="px-4 mt-5">
            <SectionHeader
              title="Recent Reports"
              actionLabel="View All"
              onAction={() => router.push('/(resident)/report')}
            />
            <ReportCard 
              report={recentReport}
              onPress={() => {
                // Determine if it's active or past. Active typically tracks.
                const isActive = ['pending', 'verified', 'assigned', 'responding'].includes(recentReport.status);
                if (isActive) {
                  router.push('/(resident)/track');
                } else {
                  router.push('/(resident)/report'); // Or detail page if it existed
                }
              }} 
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
