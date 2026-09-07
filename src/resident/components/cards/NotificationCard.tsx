import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';

interface NotificationData {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success';
  unread?: boolean;
}

interface NotificationCardProps {
  notification?: NotificationData;
  onPress?: () => void;
}

type TypeConfig = {
  iconBg: string;
  dotColor: string;
  borderColor: string;
  Icon: any;
  iconColor: string;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  warning: {
    Icon: AlertTriangle,
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
    dotColor: '#F97316',
    borderColor: '#FFEDD5',
  },
  success: {
    Icon: CheckCircle2,
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    dotColor: '#10B981',
    borderColor: '#D1FAE5',
  },
  info: {
    Icon: Bell,
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    dotColor: '#6366F1',
    borderColor: '#E0E7FF',
  },
};

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const data: NotificationData = notification ?? {
    id: 1,
    title: 'System Update',
    message: 'The MDRRMO system has been updated with new emergency protocols.',
    time: 'Just now',
    type: 'info',
    unread: true,
  };

  const cfg = TYPE_CONFIG[data.type] ?? TYPE_CONFIG.info;
  const IconComponent = cfg.Icon;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: 16,
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
            borderWidth: 1,
            borderColor: data.unread ? cfg.borderColor : '#F8FAFC',
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: cfg.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <IconComponent size={22} color={cfg.iconColor} strokeWidth={2.25} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingTop: 2 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                {data.unread && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: cfg.dotColor,
                      marginRight: 8,
                    }}
                  />
                )}
                <Text
                  style={{
                    color: '#0F172A',
                    fontSize: 15,
                    fontWeight: '700',
                    letterSpacing: -0.2,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {data.title}
                </Text>
              </View>
              <Text
                style={{
                  color: '#94A3B8',
                  fontSize: 12,
                  fontWeight: '600',
                  marginTop: 1,
                }}
              >
                {data.time}
              </Text>
            </View>

            <Text
              style={{
                color: '#64748B',
                fontSize: 14,
                fontWeight: '400',
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {data.message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
