import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
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
  FileText,
  Navigation,
  ShieldAlert,
  User,
  Phone,
  Info,
} from 'lucide-react-native';
import { getMyReports } from '@/shared/api/incidents';

const { width } = Dimensions.get('window');

export default function ReportDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const reportId = params.id ? parseInt(params.id) : null;

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <SafeAreaView className="flex-1 bg-[#0B1120] items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-slate-400 text-sm mt-3">Loading emergency report...</Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView className="flex-1 bg-[#0B1120] px-5 items-center justify-center">
        <View className="w-16 h-16 rounded-3xl bg-slate-800 items-center justify-center mb-4">
          <AlertTriangle size={28} color="#EF4444" />
        </View>
        <Text className="text-white font-bold text-lg text-center">Report Not Found</Text>
        <Text className="text-slate-400 text-xs text-center mt-1 mb-6">
          The requested emergency report could not be retrieved.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700"
        >
          <Text className="text-white font-bold text-sm">Return to Reports</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const incidentIdCode = `INC-2026-${report.id?.toString().padStart(5, '0')}`;
  const status = report.incident_status || 'pending';
  const isRejected = status === 'rejected';
  const isResolved = status === 'resolved';
  const isPending = status === 'pending';
  const isVerified = status === 'verified';
  const activeDispatch = report.active_dispatch;
  const dispatchStatus = activeDispatch?.dispatch_status;

  // Can track only if verified and responder assigned
  const isAssigned =
    !isRejected &&
    (status === 'assigned' ||
      status === 'responding' ||
      (activeDispatch && !['completed', 'cancelled'].includes(dispatchStatus)));

  const canTrack = isAssigned && activeDispatch;

  const rejectionReason =
    report.verification_remarks ||
    report.rejection_reason ||
    'Incident does not meet emergency dispatch criteria or is duplicate.';

  const typeName = report.incident_type?.name || report.incident_type || 'Emergency Incident';
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
        month: 'long',
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
          : 'Assigning nearest team...',
        state: isRejected ? 'skipped' : isAssigned ? 'done' : isPending ? 'upcoming' : 'current',
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
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0F172A]/90">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white text-base font-bold tracking-tight">{incidentIdCode}</Text>
          <Text className="text-slate-400 text-xs">Report Overview</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 18, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Status Banner (Section 6 Requirement) */}
        {isRejected ? (
          <View className="bg-rose-950/70 border border-rose-800/80 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center mb-2">
              <XCircle size={22} color="#F43F5E" />
              <Text className="text-rose-400 font-extrabold text-sm uppercase tracking-wider ml-2">
                REJECTED • NOT APPROVED
              </Text>
            </View>
            <Text className="text-white font-bold text-base mb-1">
              Dispatch Request Declined
            </Text>
            <View className="bg-rose-900/40 rounded-2xl p-3.5 my-2 border border-rose-800/40">
              <Text className="text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
                Reason Provided by Dispatcher:
              </Text>
              <Text className="text-rose-100 text-xs leading-relaxed">{rejectionReason}</Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Info size={14} color="#FDA4AF" />
              <Text className="text-rose-300 text-[11px] ml-1.5 flex-1">
                Responder navigation and tracking are disabled for declined reports.
              </Text>
            </View>
          </View>
        ) : isPending ? (
          <View className="bg-amber-950/60 border border-amber-800/70 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center mb-1.5">
              <Clock size={20} color="#F59E0B" />
              <Text className="text-amber-400 font-extrabold text-xs uppercase tracking-wider ml-2">
                PENDING REVIEW
              </Text>
            </View>
            <Text className="text-white font-bold text-base">Awaiting Dispatcher Verification</Text>
            <Text className="text-amber-200 text-xs mt-1 leading-relaxed">
              Your emergency submission is in the triage queue. Dispatchers will verify details before dispatching emergency medical vehicles.
            </Text>
          </View>
        ) : isResolved ? (
          <View className="bg-emerald-950/60 border border-emerald-800/70 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center mb-1.5">
              <CheckCircle2 size={20} color="#10B981" />
              <Text className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider ml-2">
                OPERATION COMPLETED
              </Text>
            </View>
            <Text className="text-white font-bold text-base">Emergency Resolved</Text>
            <Text className="text-emerald-200 text-xs mt-1">
              The MDRRMO response mission for this emergency report was successfully completed.
            </Text>
          </View>
        ) : (
          <View className="bg-blue-950/60 border border-blue-800/70 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center mb-1.5">
              <ShieldCheck size={20} color="#3B82F6" />
              <Text className="text-blue-400 font-extrabold text-xs uppercase tracking-wider ml-2">
                VERIFIED BY DISPATCHER
              </Text>
            </View>
            <Text className="text-white font-bold text-base">Active Emergency Response</Text>
            <Text className="text-blue-200 text-xs mt-1">
              Command center has validated this report. Resources are mobilized to provide assistance.
            </Text>
          </View>
        )}

        {/* Live Responder Tracking Action Banner (Section 8 Requirement) */}
        {canTrack ? (
          <View className="bg-indigo-950/80 border border-indigo-700 rounded-3xl p-5 mb-5 shadow-xl">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 items-center justify-center mr-3">
                  <Ambulance size={20} color="#818CF8" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    {activeDispatch?.ambulance?.vehicle_name || 'MDRRMO Rescue Unit'}
                  </Text>
                  <Text className="text-indigo-300 text-xs font-semibold">
                    {dispatchStatus === 'en_route'
                      ? 'Currently En Route to Your Scene'
                      : dispatchStatus === 'arrived_on_scene'
                      ? 'Responders On Scene'
                      : 'Assigned & Preparing Departure'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/track')}
              className="bg-blue-600 py-3.5 px-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-600/40 active:bg-blue-700"
              activeOpacity={0.8}
            >
              <Navigation size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm ml-2">Track Live Emergency Response</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section: Report Information */}
        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
          <Text className="text-white font-bold text-base mb-4 tracking-tight">
            Incident Information
          </Text>

          {/* Type & Date */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <View>
              <Text className="text-slate-400 text-xs">Incident Type</Text>
              <Text className="text-white font-bold text-sm mt-0.5">{typeName}</Text>
            </View>
            <View className="items-end">
              <Text className="text-slate-400 text-xs">Date Submitted</Text>
              <Text className="text-slate-300 font-medium text-xs mt-0.5">
                {formatDate(report.reported_at || report.created_at)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs mb-1">Description / Chief Complaint</Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
              <Text className="text-slate-200 text-xs leading-relaxed">
                {report.description || report.chief_complaint || 'No detailed description provided.'}
              </Text>
            </View>
          </View>

          {/* Location Details */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs mb-1">Location of Emergency</Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex-row items-start">
              <MapPin size={16} color="#3B82F6" className="mt-0.5 mr-2.5" />
              <View className="flex-1">
                <Text className="text-white font-semibold text-xs leading-snug">
                  {report.place_of_incident || report.incident_address || report.address || 'Opol, Misamis Oriental'}
                </Text>
                {report.location_code ? (
                  <View className="flex-row items-center mt-1.5">
                    <View className="bg-blue-900/60 border border-blue-700/50 px-2 py-0.5 rounded">
                      <Text className="text-blue-300 font-mono text-[10px] font-bold">
                        Code: {report.location_code}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Submitted Photo */}
          {submittedPhoto ? (
            <View>
              <Text className="text-slate-400 text-xs mb-2">Submitted Scene Photo</Text>
              <View className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <Image
                  source={{ uri: submittedPhoto }}
                  style={{ width: '100%', height: 190 }}
                  resizeMode="cover"
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Section: Incident Status Timeline (Section 7 Requirement) */}
        {!isRejected ? (
          <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
            <Text className="text-white font-bold text-base mb-1 tracking-tight">
              Incident Status Timeline
            </Text>
            <Text className="text-slate-400 text-xs mb-5">
              Live lifecycle status from command center
            </Text>

            <View className="pl-1">
              {timelineSteps.map((step, idx) => {
                const isLast = idx === timelineSteps.length - 1;
                const isDone = step.state === 'done';
                const isCurrent = step.state === 'current';

                return (
                  <View key={step.title} className="flex-row items-start">
                    {/* Circle & Line */}
                    <View className="items-center mr-4">
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center border-2 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500'
                            : isCurrent
                            ? 'bg-blue-600 border-blue-400'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.5} />
                        ) : isCurrent ? (
                          <View className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        ) : (
                          <View className="w-2 h-2 rounded-full bg-slate-700" />
                        )}
                      </View>
                      {!isLast ? (
                        <View
                          className={`w-0.5 h-10 my-0.5 ${
                            isDone ? 'bg-emerald-600/60' : 'bg-slate-800'
                          }`}
                        />
                      ) : null}
                    </View>

                    {/* Step Info */}
                    <View className="flex-1 pb-4">
                      <Text
                        className={`text-sm font-bold ${
                          isDone
                            ? 'text-white'
                            : isCurrent
                            ? 'text-blue-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.title}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">{step.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
