import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { StatusChip } from '@/shared/components';
import { Clock, MapPin, FileText, ChevronRight } from 'lucide-react-native';

interface ReportData {
  id: string;
  type: string;
  status: string;
  time: string;
  location: string;
}

interface ReportCardProps {
  report?: ReportData;
  onPress?: () => void;
}

// Status → accent color for the left border
function getStatusAccent(status: string): string {
  switch (status?.toLowerCase()) {
    case 'en_route':
    case 'en route':
      return '#F59E0B';
    case 'arrived':
    case 'on scene':
      return '#10B981';
    case 'assigned':
      return '#6366F1';
    case 'completed':
      return '#94A3B8';
    default:
      return '#6366F1';
  }
}

export function ReportCard({ report, onPress }: ReportCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const data: ReportData = report ?? {
    id: 'RPT-2026-105',
    type: 'Medical Emergency',
    status: 'En Route',
    time: '2 mins ago',
    location: 'Zone 3, Brgy. Igpit',
  };

  const accentColor = getStatusAccent(data.status);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 20 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            overflow: 'hidden',
          }}
        >
          {/* Status accent bar at top */}
          <View
            style={{
              height: 3,
              backgroundColor: accentColor,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          />

          <View style={{ padding: 14 }}>
            {/* Header row */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                {/* Icon badge */}
                <View
                  style={{
                    backgroundColor: '#EEF2FF',
                    borderRadius: 10,
                    padding: 8,
                    marginRight: 10,
                  }}
                >
                  <FileText size={16} color="#6366F1" strokeWidth={2.25} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#1E293B',
                      fontSize: 15,
                      fontWeight: '700',
                      lineHeight: 20,
                    }}
                    numberOfLines={1}
                  >
                    {data.type}
                  </Text>
                  <Text
                    style={{
                      color: '#94A3B8',
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.3,
                      marginTop: 1,
                    }}
                  >
                    {data.id}
                  </Text>
                </View>
              </View>

              <StatusChip status={data.status} type="dispatch" />
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: '#F1F5F9',
                marginBottom: 10,
              }}
            />

            {/* Meta info + chevron */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 }}>
                  <View style={{ marginTop: 2 }}>
                    <MapPin size={13} color="#6366F1" strokeWidth={2.25} />
                  </View>
                  <Text
                    style={{
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: '500',
                      marginLeft: 6,
                      flex: 1,
                      lineHeight: 17,
                    }}
                    numberOfLines={3}
                  >
                    {data.location}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={13} color="#94A3B8" strokeWidth={2.25} />
                  <Text
                    style={{
                      color: '#94A3B8',
                      fontSize: 12,
                      fontWeight: '400',
                      marginLeft: 5,
                    }}
                  >
                    {data.time}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  padding: 6,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginLeft: 12,
                }}
              >
                <ChevronRight size={14} color="#94A3B8" strokeWidth={2.25} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
