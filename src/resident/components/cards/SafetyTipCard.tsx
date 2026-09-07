import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  Shield,
  Waves,
  Flame,
  Zap,
  Wind,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';

interface SafetyTipCardProps {
  title?: string;
  description?: string;
  category?: 'typhoon' | 'fire' | 'earthquake' | 'flood' | 'lightning' | 'general';
  onPress?: () => void;
}

type CategoryConfig = {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  accent: string;
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  typhoon: {
    icon: Wind,
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    accent: '#BFDBFE',
  },
  flood: {
    icon: Waves,
    iconColor: '#0891B2',
    iconBg: '#ECFEFF',
    accent: '#A5F3FC',
  },
  fire: {
    icon: Flame,
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
    accent: '#FED7AA',
  },
  earthquake: {
    icon: Zap,
    iconColor: '#B45309',
    iconBg: '#FFFBEB',
    accent: '#FDE68A',
  },
  lightning: {
    icon: AlertTriangle,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    accent: '#DDD6FE',
  },
  general: {
    icon: Shield,
    iconColor: '#6366F1',
    iconBg: '#EEF2FF',
    accent: '#C7D2FE',
  },
};

function detectCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('typhoon') || lower.includes('wind') || lower.includes('storm')) {
    return 'typhoon';
  }
  if (lower.includes('flood') || lower.includes('water')) return 'flood';
  if (lower.includes('fire')) return 'fire';
  if (lower.includes('earthquake') || lower.includes('quake')) return 'earthquake';
  if (lower.includes('lightning') || lower.includes('thunder')) return 'lightning';
  return 'general';
}

export function SafetyTipCard({
  title = 'Typhoon Preparedness',
  description = 'Learn how to prepare your family for severe weather.',
  category,
  onPress,
}: SafetyTipCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const resolvedCategory = category ?? detectCategory(title);
  const cfg = CATEGORY_CONFIG[resolvedCategory] ?? CATEGORY_CONFIG.general;
  const IconComponent = cfg.icon;

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
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 14,
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          {/* Left accent bar */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: cfg.accent,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }}
          />

          {/* Icon */}
          <View
            style={{
              backgroundColor: cfg.iconBg,
              borderRadius: 14,
              padding: 11,
              marginRight: 14,
              marginLeft: 6,
            }}
          >
            <IconComponent size={20} color={cfg.iconColor} strokeWidth={2.25} />
          </View>

          {/* Text */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                color: '#1E293B',
                fontSize: 14,
                fontWeight: '700',
                lineHeight: 19,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                color: '#64748B',
                fontSize: 12,
                fontWeight: '400',
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {description}
            </Text>
          </View>

          {/* Arrow */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 10,
              padding: 6,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <ChevronRight size={14} color="#94A3B8" strokeWidth={2.25} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
