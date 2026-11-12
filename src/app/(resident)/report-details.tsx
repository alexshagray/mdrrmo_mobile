import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Ambulance,
  MapPin,
  AlertTriangle,
  Navigation,
  Info,
  Maximize2,
  X,
  Lock,
} from 'lucide-react-native';
import { getMyReports, cancelEmergencyReport } from '@/shared/api/incidents';
import { BrandBackground, CancelConfirmationModal } from '@/shared/components';

export default function ReportDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const reportId = params.id ? parseInt(params.id) : null;

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/my-reports');
    }
  };

  const handleCancelReport = () => {
    if (!report?.id) return;

    if (!canCancel) {
      Alert.alert(
        'Cancellation Unavailable',
        'A response team is already assigned or responding. Please contact the MDRRMO hotline immediately if you need assistance.'
      );
      return;
    }

    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!report?.id) return;
    try {
      setIsCancelling(true);
      await cancelEmergencyReport(report.id);
      setShowCancelModal(false);
      Alert.alert('Request Cancelled', 'Your emergency request has been cancelled successfully.', [
        { text: 'OK', onPress: handleBack },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not cancel the report. Please try again or call the hotline.';
      Alert.alert('Error', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchReport = useCallback(async () => {
    if (!reportId) return;
    setIsLoading(true);
    try {
      const res = await getMyReports();
      const list = res.data || res.incidents || (Array.isArray(res) ? res : []);
      const found = list.find((item: any) => item.id === reportId);
      setReport(found || null);
    } catch (err) {
      console.error('Failed to load report details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <BrandBackground variant="subpage" />
        <SafeAreaView style={styles.centerContent} edges={['top']}>
          <ActivityIndicator size="large" color="#208AEF" />
          <Text style={styles.centerLoadingText}>Loading emergency report...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerScreen}>
        <BrandBackground variant="subpage" />
        <SafeAreaView style={styles.centerContent} edges={['top']}>
          <View style={styles.notFoundCard}>
            <View style={styles.notFoundIconBox}>
              <AlertTriangle size={32} color="#DC2626" strokeWidth={2.2} />
            </View>
            <Text style={styles.notFoundTitle}>Report Not Found</Text>
            <Text style={styles.notFoundSubtitle}>
              The requested emergency report could not be retrieved or may have been archived.
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.returnButton}
              activeOpacity={0.8}
            >
              <Text style={styles.returnButtonText}>Return to Reports</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const incidentIdCode = `INC-2026-${report.id?.toString().padStart(5, '0')}`;
  const status = report.incident_status || 'pending';
  const isRejected = status === 'rejected';
  const isResolved = status === 'resolved';
  const isPending = status === 'pending';
  const isVerified = status === 'verified';
  const isCancelled = status === 'cancelled';
  const activeDispatch = report.active_dispatch;
  const dispatchStatus = activeDispatch?.dispatch_status;

  // Can track only if verified and responder assigned
  const isAssigned =
    !isRejected &&
    !isCancelled &&
    (status === 'assigned' ||
      status === 'responding' ||
      (activeDispatch && !['completed', 'cancelled'].includes(dispatchStatus)));

  const canCancel = (isPending || isVerified) && !isAssigned && !isCancelled && !isResolved && !isRejected;

  const canTrack = isAssigned && activeDispatch;

  const rejectionReason =
    report.verification_remarks ||
    report.rejection_reason ||
    'Incident does not meet emergency dispatch criteria or is duplicate.';

  const typeName =
    report.incident_type?.incident_type_name ||
    report.incident_type?.name ||
    report.incident_type ||
    'Emergency Incident';
  const submittedPhoto =
    report.images?.[0]?.image_url ||
    (report.images?.[0]?.image_path
      ? `http://10.0.2.2:8000/storage/${report.images[0].image_path}`
      : null);

  const formatDate = (dStr: string) => {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dStr;
    }
  };

  // Timeline Step calculation
  const getTimelineSteps = () => {
    return [
      {
        title: 'Report Submitted',
        description: formatDate(report.reported_at || report.created_at),
        state: 'done',
      },
      {
        title: 'Dispatcher Verified',
        description: isRejected
          ? 'Declined by Command Center'
          : isCancelled
          ? (isVerified ? 'Approved before cancellation' : 'Cancelled during review')
          : isPending
          ? 'Awaiting Dispatcher Review'
          : 'Approved by Dispatcher',
        state: isRejected ? 'rejected' : isPending ? 'current' : 'done',
      },
      {
        title: 'Responder Assigned',
        description: activeDispatch
          ? `Unit: ${activeDispatch.ambulance?.plate_number || activeDispatch.ambulance?.vehicle_name || 'Ambulance Assigned'}`
          : isRejected
          ? 'Not Dispatched'
          : isCancelled
          ? 'Cancelled - No Dispatch'
          : 'Assigning nearest team...',
        state: isRejected || isCancelled ? 'skipped' : isAssigned ? 'done' : isPending ? 'upcoming' : 'current',
      },
      {
        title: 'Responder En Route',
        description:
          dispatchStatus === 'en_route'
            ? 'Traveling to your scene'
            : ['arrived_on_scene', 'completed'].includes(dispatchStatus)
            ? 'En route phase concluded'
            : 'Pending departure',
        state:
          dispatchStatus === 'en_route'
            ? 'current'
            : ['arrived_on_scene', 'completed'].includes(dispatchStatus)
            ? 'done'
            : 'upcoming',
      },
      {
        title: 'Responder Arrived',
        description:
          dispatchStatus === 'arrived_on_scene'
            ? 'Team actively on scene'
            : dispatchStatus === 'completed'
            ? 'On scene phase completed'
            : 'Awaiting arrival',
        state:
          dispatchStatus === 'arrived_on_scene'
            ? 'current'
            : dispatchStatus === 'completed'
            ? 'done'
            : 'upcoming',
      },
      {
        title: 'Incident Completed',
        description: isResolved ? 'Operation successfully concluded' : 'Final resolution pending',
        state: isResolved ? 'done' : 'upcoming',
      },
    ];
  };

  const timelineSteps = getTimelineSteps();

  return (
    <View style={styles.container}>
      <BrandBackground variant="subpage" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top App Bar Header */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.appBarCenter}>
            <Text style={styles.appBarTitle}>{incidentIdCode}</Text>
            <Text style={styles.appBarSubtitle}>Report Overview</Text>
          </View>

          {/* Balanced spacer to keep center content perfectly centered */}
          <View style={styles.appBarSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ============================================================== */}
          {/* 1. STATUS CARD (Rejection / Pending / Resolved / Verified)     */}
          {/* ============================================================== */}
          {isRejected ? (
            <View style={styles.rejectionCard}>
              {/* Header Badge Row */}
              <View style={styles.statusHeaderRow}>
                <View style={styles.rejectionIconBox}>
                  <XCircle size={20} color="#DC2626" strokeWidth={2.4} />
                </View>
                <View style={styles.rejectionBadge}>
                  <Text style={styles.rejectionBadgeText}>REJECTED · NOT APPROVED</Text>
                </View>
              </View>

              <Text style={styles.rejectionTitle}>Dispatch Request Declined</Text>

              {/* Inset Dispatcher Reason Container */}
              <View style={styles.rejectionReasonBox}>
                <Text style={styles.rejectionReasonLabel}>REASON PROVIDED BY DISPATCHER</Text>
                <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
              </View>

              {/* Informational notice */}
              <View style={styles.rejectionNoticeRow}>
                <Info size={16} color="#DC2626" strokeWidth={2.2} style={styles.noticeIcon} />
                <Text style={styles.rejectionNoticeText}>
                  Responder navigation and tracking are disabled for declined reports.
                </Text>
              </View>
            </View>
          ) : isPending ? (
            <View style={styles.pendingCard}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.pendingIconBox}>
                  <Clock size={20} color="#D97706" strokeWidth={2.4} />
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING REVIEW</Text>
                </View>
              </View>

              <Text style={styles.statusTitle}>Awaiting Dispatcher Verification</Text>
              <Text style={styles.statusDescription}>
                Your emergency submission is in the triage queue. Dispatchers will verify details before dispatching emergency medical vehicles.
              </Text>

              <TouchableOpacity
                onPress={handleCancelReport}
                disabled={isCancelling}
                activeOpacity={0.8}
                style={styles.cancelButton}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <XCircle size={16} color="#DC2626" strokeWidth={2.2} />
                    <Text style={styles.cancelButtonText}>Cancel Emergency Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : isCancelled ? (
            <View style={styles.cancelledCard}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.cancelledIconBox}>
                  <XCircle size={20} color="#64748B" strokeWidth={2.4} />
                </View>
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>REQUEST CANCELLED</Text>
                </View>
              </View>

              <Text style={styles.statusTitle}>Emergency Request Cancelled</Text>
              <Text style={styles.statusDescription}>
                This emergency report was cancelled by the resident. No emergency response units are dispatched.
              </Text>
            </View>
          ) : isResolved ? (
            <View style={styles.resolvedCard}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.resolvedIconBox}>
                  <CheckCircle2 size={20} color="#059669" strokeWidth={2.4} />
                </View>
                <View style={styles.resolvedBadge}>
                  <Text style={styles.resolvedBadgeText}>OPERATION COMPLETED</Text>
                </View>
              </View>

              <Text style={styles.statusTitle}>Emergency Resolved</Text>
              <Text style={styles.statusDescription}>
                The MDRRMO response mission for this emergency report was successfully completed.
              </Text>
            </View>
          ) : (
            <View style={styles.verifiedCard}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.verifiedIconBox}>
                  <ShieldCheck size={20} color="#208AEF" strokeWidth={2.4} />
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>
                    {isAssigned ? 'RESPONDER MOBILIZED' : 'VERIFIED BY DISPATCHER'}
                  </Text>
                </View>
              </View>

              <Text style={styles.statusTitle}>
                {isAssigned ? 'Emergency Response In Progress' : 'Active Emergency Response'}
              </Text>
              <Text style={styles.statusDescription}>
                {isAssigned
                  ? 'A response team is dispatched and en route to your location. For safety and operational continuity, direct cancellation is locked.'
                  : 'Command center has validated this report. Resources are mobilized to provide assistance.'}
              </Text>

              {canCancel ? (
                <TouchableOpacity
                  onPress={handleCancelReport}
                  disabled={isCancelling}
                  activeOpacity={0.8}
                  style={styles.cancelButton}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <XCircle size={16} color="#DC2626" strokeWidth={2.2} />
                      <Text style={styles.cancelButtonText}>Cancel Emergency Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : isAssigned ? (
                <View style={styles.lockedCancelNotice}>
                  <Lock size={14} color="#64748B" />
                  <Text style={styles.lockedCancelNoticeText}>
                    Responders are assigned and en route. Direct cancellation is disabled. Please call the 911 hotline for urgent requests.
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ============================================================== */}
          {/* 2. LIVE TRACKING BANNER (when canTrack)                        */}
          {/* ============================================================== */}
          {canTrack ? (
            <View style={styles.trackingCard}>
              <View style={styles.trackingHeader}>
                <View style={styles.trackingIconBox}>
                  <Ambulance size={22} color="#208AEF" strokeWidth={2.2} />
                </View>
                <View style={styles.trackingHeaderText}>
                  <Text style={styles.trackingUnitName}>
                    {activeDispatch?.ambulance?.vehicle_name || 'MDRRMO Rescue Unit'}
                  </Text>
                  <Text style={styles.trackingStatusText}>
                    {dispatchStatus === 'en_route'
                      ? 'Currently En Route to Your Scene'
                      : dispatchStatus === 'arrived_on_scene'
                      ? 'Responders On Scene'
                      : 'Assigned & Preparing Departure'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(resident)/track')}
                style={styles.trackingButton}
                activeOpacity={0.8}
              >
                <Navigation size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.trackingButtonText}>Track Live Emergency Response</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ============================================================== */}
          {/* 3. INCIDENT INFORMATION CARD                                   */}
          {/* ============================================================== */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionHeading}>Incident Information</Text>

            {/* Type & Date Row (Responsive, no clipping) */}
            <View style={styles.typeDateRow}>
              <View style={styles.typeCol}>
                <Text style={styles.fieldLabel}>Incident Type</Text>
                <Text style={styles.typeValue}>{typeName}</Text>
              </View>

              <View style={styles.dateCol}>
                <Text style={styles.fieldLabel}>Date Submitted</Text>
                <Text style={styles.dateValue}>
                  {formatDate(report.reported_at || report.created_at)}
                </Text>
              </View>
            </View>

            {/* Description / Chief Complaint */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description / Chief Complaint</Text>
              <View style={styles.descriptionBox}>
                <Text
                  style={[
                    styles.descriptionText,
                    !report.description && !report.chief_complaint && styles.emptyDescriptionText,
                  ]}
                >
                  {report.description || report.chief_complaint || 'No detailed description provided.'}
                </Text>
              </View>
            </View>

            {/* Location of Emergency */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Location of Emergency</Text>
              <View style={styles.locationBox}>
                <MapPin size={18} color="#208AEF" strokeWidth={2.4} style={styles.locationPinIcon} />
                <View style={styles.locationContent}>
                  <Text style={styles.locationText}>
                    {report.place_of_incident || report.incident_address || report.address || 'Opol, Misamis Oriental'}
                  </Text>
                  {report.location_code ? (
                    <View style={styles.locationCodeBadge}>
                      <Text style={styles.locationCodeText}>
                        Code: {report.location_code}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Submitted Scene Photo Evidence */}
            {submittedPhoto ? (
              <View style={styles.photoFieldGroup}>
                <View style={styles.photoHeaderRow}>
                  <Text style={styles.fieldLabel}>Submitted Scene Photo</Text>
                  <TouchableOpacity
                    onPress={() => setIsPhotoModalVisible(true)}
                    style={styles.expandPhotoButton}
                    activeOpacity={0.7}
                  >
                    <Maximize2 size={13} color="#208AEF" strokeWidth={2.2} />
                    <Text style={styles.expandPhotoText}>View Full Photo</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setIsPhotoModalVisible(true)}
                  style={styles.photoContainer}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: submittedPhoto }}
                    style={styles.scenePhoto}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* ============================================================== */}
          {/* 4. INCIDENT STATUS TIMELINE (Only for active / resolved)       */}
          {/* ============================================================== */}
          {!isRejected ? (
            <View style={styles.timelineCard}>
              <Text style={styles.sectionHeading}>Incident Status Timeline</Text>
              <Text style={styles.timelineSubtitle}>
                Live lifecycle status from command center
              </Text>

              <View style={styles.timelineContainer}>
                {timelineSteps.map((step, idx) => {
                  const isLast = idx === timelineSteps.length - 1;
                  const isDone = step.state === 'done';
                  const isCurrent = step.state === 'current';

                  return (
                    <View key={step.title} style={styles.timelineStepRow}>
                      {/* Step Indicator & Connector Line */}
                      <View style={styles.timelineIndicatorCol}>
                        <View
                          style={[
                            styles.timelineDot,
                            isDone
                              ? styles.timelineDotDone
                              : isCurrent
                              ? styles.timelineDotCurrent
                              : styles.timelineDotUpcoming,
                          ]}
                        >
                          {isDone ? (
                            <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.6} />
                          ) : isCurrent ? (
                            <View style={styles.currentDotPulse} />
                          ) : (
                            <View style={styles.upcomingDotInner} />
                          )}
                        </View>
                        {!isLast ? (
                          <View
                            style={[
                              styles.timelineLine,
                              isDone ? styles.timelineLineDone : styles.timelineLineUpcoming,
                            ]}
                          />
                        ) : null}
                      </View>

                      {/* Step Text Info */}
                      <View style={styles.timelineTextCol}>
                        <Text
                          style={[
                            styles.timelineStepTitle,
                            isDone
                              ? styles.timelineTitleDone
                              : isCurrent
                              ? styles.timelineTitleCurrent
                              : styles.timelineTitleUpcoming,
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.timelineStepDesc}>{step.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Full Screen Photo Modal */}
      {submittedPhoto ? (
        <Modal
          visible={isPhotoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsPhotoModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Scene Photo Evidence</Text>
                <TouchableOpacity
                  onPress={() => setIsPhotoModalVisible(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={20} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: submittedPhoto }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}

      {/* Premium Cancel Request Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        isLoading={isCancelling}
        incidentCode={incidentIdCode}
        onConfirm={handleConfirmCancel}
        onClose={() => !isCancelling && setShowCancelModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerLoadingText: {
    color: '#526174',
    fontSize: 14.5,
    fontWeight: '500',
    marginTop: 12,
  },
  notFoundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notFoundIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notFoundTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  notFoundSubtitle: {
    color: '#526174',
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  returnButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* App Bar Header */
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarCenter: {
    alignItems: 'center',
  },
  appBarTitle: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  appBarSpacer: {
    width: 40,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* Common Card Section Headings */
  sectionHeading: {
    color: '#1F2937',
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 16,
  },

  /* Status Header Row */
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    color: '#1F2937',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 6,
  },
  statusDescription: {
    color: '#526174',
    fontSize: 14.5,
    fontWeight: '400',
    lineHeight: 22,
  },

  /* Rejection Status Card */
  rejectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rejectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rejectionBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rejectionBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rejectionTitle: {
    color: '#1F2937',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 12,
  },
  rejectionReasonBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  rejectionReasonLabel: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rejectionReasonText: {
    color: '#7F1D1D',
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 21,
  },
  rejectionNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  noticeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  rejectionNoticeText: {
    flex: 1,
    color: '#526174',
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
  },

  /* Pending Review Card */
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cancelButton: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 8,
  },

  /* Cancelled Card */
  cancelledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelledIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelledBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cancelledBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Resolved Card */
  resolvedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  resolvedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resolvedBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resolvedBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Verified Card */
  verifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  verifiedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  verifiedBadge: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  lockedCancelNotice: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedCancelNoticeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },

  /* Live Tracking Card */
  trackingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  trackingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackingHeaderText: {
    flex: 1,
  },
  trackingUnitName: {
    color: '#1F2937',
    fontSize: 16.5,
    fontWeight: '800',
  },
  trackingStatusText: {
    color: '#208AEF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  trackingButton: {
    backgroundColor: '#208AEF',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    marginLeft: 8,
  },

  /* Incident Information Card */
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  typeDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
    gap: 12,
  },
  typeCol: {
    flex: 1,
    minWidth: 130,
  },
  dateCol: {
    flex: 1,
    minWidth: 130,
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeValue: {
    color: '#1F2937',
    fontSize: 16.5,
    fontWeight: '800',
    lineHeight: 22,
  },
  dateValue: {
    color: '#334155',
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  descriptionText: {
    color: '#1F2937',
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 21,
  },
  emptyDescriptionText: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  locationBox: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationPinIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  locationContent: {
    flex: 1,
  },
  locationText: {
    color: '#1F2937',
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 21,
  },
  locationCodeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  locationCodeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  /* Submitted Photo Evidence */
  photoFieldGroup: {
    marginTop: 4,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expandPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  expandPhotoText: {
    color: '#208AEF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  photoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  scenePhoto: {
    width: '100%',
    height: 210,
  },

  /* Timeline Card */
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '400',
    marginTop: -10,
    marginBottom: 18,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    marginRight: 14,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timelineDotCurrent: {
    backgroundColor: '#208AEF',
    borderColor: '#93C5FD',
  },
  timelineDotUpcoming: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  currentDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  upcomingDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    height: 32,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: '#059669',
  },
  timelineLineUpcoming: {
    backgroundColor: '#E2E8F0',
  },
  timelineTextCol: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStepTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  timelineTitleDone: {
    color: '#1F2937',
  },
  timelineTitleCurrent: {
    color: '#208AEF',
    fontWeight: '800',
  },
  timelineTitleUpcoming: {
    color: '#94A3B8',
  },
  timelineStepDesc: {
    color: '#526174',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },

  /* Modal Styles for Full Scene Photo */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

