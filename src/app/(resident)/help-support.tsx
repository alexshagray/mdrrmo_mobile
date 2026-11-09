import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BrandBackground } from '@/shared/components';
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Settings,
} from 'lucide-react-native';

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
    q: 'Can I call for emergency assistance without mobile data?',
    a: 'Yes! You can use the official emergency hotline numbers featured directly on your Home screen to connect via standard cellular voice calls to the MDRRMO Command Center, Police, Fire, or RHU even without internet access.',
  },
  {
    q: 'What are Opol Location Codes / Electric Posts?',
    a: 'MDRRMO has catalogued over 8,000 electric utility poles throughout Opol. By citing the pole number tag on your street, responders can navigate directly to your location with pinpoint precision.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)');
    }
  };

  return (
    <View style={styles.screenContainer}>
      <BrandBackground variant="subpage" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Header App Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerIconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>Help & Support</Text>
            <Text style={styles.headerSubtitleText}>Emergency Guides & FAQs</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(resident)/account-security')}
            style={styles.headerIconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Account Settings & Security"
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: How Emergency Response Works */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>How Emergency Response Works</Text>
            <Text style={styles.cardSectionSubtitle}>Step-by-step life-safety workflow</Text>

            <View style={styles.workflowStepsList}>
              {/* Step 1 */}
              <View style={styles.workflowStepItem}>
                <View style={styles.stepIndicatorCol}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeNumber}>1</Text>
                  </View>
                  <View style={styles.stepConnectorLine} />
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Submit Report</Text>
                  <Text style={styles.stepDescription}>
                    Launch the app, take a scene photo, verify your location, and hit submit.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.workflowStepItem}>
                <View style={styles.stepIndicatorCol}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeNumber}>2</Text>
                  </View>
                  <View style={styles.stepConnectorLine} />
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Triage & Verification</Text>
                  <Text style={styles.stepDescription}>
                    The MDRRMO Command Center verifies incident priority and prepares the rescue crew.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={[styles.workflowStepItem, { marginBottom: 0 }]}>
                <View style={styles.stepIndicatorCol}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeNumber}>3</Text>
                  </View>
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Ambulance Dispatch & Live Tracking</Text>
                  <Text style={styles.stepDescription}>
                    Follow the responder vehicle on the interactive map until arrival on scene.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Section 2: Frequently Asked Questions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.faqIconBox}>
                <HelpCircle size={20} color="#D97706" strokeWidth={2.3} />
              </View>
              <View style={styles.cardHeaderTextGroup}>
                <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
                <Text style={styles.cardSubtitle}>Common inquiries & guides</Text>
              </View>
            </View>

            <View style={styles.faqList}>
              {FAQS.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <View key={faq.q} style={styles.faqCard}>
                    <TouchableOpacity
                      onPress={() => setExpandedFaq(isExpanded ? null : index)}
                      style={styles.faqQuestionRow}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={styles.faqQuestionText}>{faq.q}</Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color="#64748B" strokeWidth={2.2} />
                      ) : (
                        <ChevronDown size={18} color="#94A3B8" strokeWidth={2.2} />
                      )}
                    </TouchableOpacity>
                    {isExpanded ? (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={styles.faqAnswerText}>{faq.a}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section 3: MDRRMO Office Information */}
          <View style={styles.card}>
            <View style={styles.officeHeader}>
              <View style={styles.officeIconBox}>
                <Building2 size={20} color="#1E88E5" strokeWidth={2.2} />
              </View>
              <View style={styles.cardHeaderTextGroup}>
                <Text style={styles.cardTitle}>MDRRMO Opol Headquarters</Text>
                <Text style={styles.cardSubtitle}>Municipal Disaster Risk Reduction & Management</Text>
              </View>
            </View>
            <Text style={styles.officeAddress}>
              Municipal Complex, Poblacion, Opol, Misamis Oriental, Philippines
            </Text>
            <View style={styles.officeHoursBadge}>
              <Text style={styles.officeHoursText}>
                Operating 24 hours a day, 7 days a week, 365 days a year.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },

  /* Header App Bar */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 16,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Scroll View */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 50,
  },

  /* Standard Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSectionTitle: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSectionSubtitle: {
    color: '#64748B',
    fontSize: 13.5,
    marginTop: 2,
    marginBottom: 18,
  },

  /* Workflow Steps */
  workflowStepsList: {
    paddingLeft: 2,
  },
  workflowStepItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 14,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNumber: {
    color: '#1E88E5',
    fontSize: 13.5,
    fontWeight: '800',
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  stepContentCol: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
  },
  stepTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  stepDescription: {
    color: '#526174',
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 3,
  },

  /* FAQ Section */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  faqIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardHeaderTextGroup: {
    flex: 1,
  },
  cardTitle: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 13.5,
    marginTop: 2,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    color: '#1F2937',
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    paddingRight: 12,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  faqAnswerText: {
    color: '#526174',
    fontSize: 13.5,
    lineHeight: 20,
  },

  /* Office Info */
  officeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  officeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  officeAddress: {
    color: '#526174',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 10,
  },
  officeHoursBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  officeHoursText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
