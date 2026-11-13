import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Shield,
  Truck,
  Heart,
  Activity,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileCheck,
  Stethoscope,
  Info,
} from 'lucide-react-native';
import { StatusChip } from '@/shared/components';
import { generatePcrHtml, getExpoPrint } from '@/shared/utils/pcrPrintService';

interface DispatchHistoryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  dispatch: any;
}

export function DispatchHistoryDetailModal({
  visible,
  onClose,
  dispatch,
}: DispatchHistoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'mission' | 'patients'>('mission');

  if (!dispatch) return null;

  const incident = dispatch.incident || {};
  const ambulance = dispatch.ambulance;
  const crew = Array.isArray(dispatch.crew) ? dispatch.crew : [];
  const patients = Array.isArray(dispatch.patients) ? dispatch.patients : [];
  const timeline = dispatch.timeline || {};
  const images = Array.isArray(dispatch.images) ? dispatch.images : [];

  const handlePrintPcr = async (patientItem: any) => {
    try {
      const rawPcr = patientItem?.raw_pcr || {};
      const html = generatePcrHtml({
        formData: {
          ...rawPcr,
          patient_name: patientItem?.name,
          gender: patientItem?.gender,
          age: patientItem?.age,
          civil_status: patientItem?.civil_status,
          contact_number: patientItem?.contact_number,
          clinical_chief_complaint: patientItem?.chief_complaint,
          nature_of_call: patientItem?.nature_of_call,
          vital_signs: patientItem?.vital_signs,
          glasgow_coma_scale: patientItem?.glasgow_coma_scale,
          assessment: patientItem?.assessment,
          assessment_markers: patientItem?.assessment_markers,
          transported: patientItem?.transported,
          transported_to: patientItem?.transported_to,
          received_by: patientItem?.received_by,
          witness_name: patientItem?.witness_name,
          special_instructions: patientItem?.special_instructions,
        },
        activeDispatch: dispatch?.raw_dispatch || dispatch,
      });

      const Print = getExpoPrint();
      if (Print && typeof Print.printAsync === 'function') {
        await Print.printAsync({ html });
      } else {
        Alert.alert(
          'Notice',
          'Native print is not supported in this runtime environment.'
        );
      }
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Unable to generate PCR document.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={styles.missionId}>{dispatch.id}</Text>
                {dispatch.incident_number && (
                  <View style={styles.incidentBadge}>
                    <Text style={styles.incidentBadgeText}>{dispatch.incident_number}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.missionType} numberOfLines={1}>
                {dispatch.type || 'Emergency Dispatch'}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
              <StatusChip status={dispatch.status} type="dispatch" />
            </View>
          </View>

          {/* Segmented Control / Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('mission')}
              style={[styles.tabBtn, activeTab === 'mission' && styles.tabBtnActive]}
              activeOpacity={0.7}
            >
              <Shield size={14} color={activeTab === 'mission' ? '#208AEF' : '#64748B'} />
              <Text style={[styles.tabBtnText, activeTab === 'mission' && styles.tabBtnTextActive]}>
                Mission Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('patients')}
              style={[styles.tabBtn, activeTab === 'patients' && styles.tabBtnActive]}
              activeOpacity={0.7}
            >
              <Heart size={14} color={activeTab === 'patients' ? '#208AEF' : '#64748B'} />
              <Text style={[styles.tabBtnText, activeTab === 'patients' && styles.tabBtnTextActive]}>
                Patients & PCR ({patients.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'mission' ? (
              <View style={{ gap: 14 }}>
                {/* Scene Location Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <MapPin size={16} color="#208AEF" />
                    <Text style={styles.cardTitle}>Incident Scene & Location</Text>
                  </View>
                  <Text style={styles.locationText}>
                    {dispatch.location || 'Opol, Misamis Oriental'}
                  </Text>
                  {dispatch.barangay && (
                    <View style={styles.barangayPill}>
                      <Text style={styles.barangayPillText}>Barangay {dispatch.barangay}</Text>
                    </View>
                  )}
                  {dispatch.latitude && dispatch.longitude && (
                    <Text style={styles.coordsText}>
                      Coordinates: {dispatch.latitude.toFixed(6)}, {dispatch.longitude.toFixed(6)}
                    </Text>
                  )}
                </View>

                {/* Reporter & Description Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <User size={16} color="#7C3AED" />
                    <Text style={styles.cardTitle}>Report & Caller Details</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Caller / Reporter:</Text>
                    <Text style={styles.infoValue}>{dispatch.reporter_name || 'Dispatch Call'}</Text>
                  </View>
                  {dispatch.reporter_phone && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone Number:</Text>
                      <Text style={styles.infoValue}>{dispatch.reporter_phone}</Text>
                    </View>
                  )}
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#F1F5F9' }}>
                    <Text style={styles.infoLabel}>Scene Narrative / Description:</Text>
                    <Text style={styles.descriptionText}>
                      {dispatch.description || 'No additional description provided.'}
                    </Text>
                  </View>
                </View>

                {/* Response Team & Unit Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Truck size={16} color="#059669" />
                    <Text style={styles.cardTitle}>Assigned Response Unit</Text>
                  </View>
                  {ambulance ? (
                    <View style={styles.unitBanner}>
                      <Text style={styles.unitPlate}>{ambulance.plate_number}</Text>
                      <Text style={styles.unitType}>{ambulance.vehicle_type || 'Emergency Ambulance'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.subtleText}>No dedicated vehicle record attached.</Text>
                  )}

                  {crew.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.infoLabel, { marginBottom: 6 }]}>Response Crew Members:</Text>
                      {crew.map((member: any, idx: number) => (
                        <View key={idx} style={styles.crewItem}>
                          <View style={styles.crewDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.crewName}>{member.name}</Text>
                            <Text style={styles.crewRole}>{member.role}</Text>
                          </View>
                          <Text style={styles.crewBadge}>{member.badge_number}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Mission Operational Timeline */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Clock size={16} color="#EA580C" />
                    <Text style={styles.cardTitle}>Operational Timeline</Text>
                  </View>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <TimelineStep
                      label="Assigned"
                      time={timeline.assigned_at || dispatch.time}
                      done={Boolean(timeline.assigned_at || dispatch.time)}
                    />
                    <TimelineStep
                      label="Accepted by Team"
                      time={timeline.accepted_at}
                      done={Boolean(timeline.accepted_at)}
                    />
                    <TimelineStep
                      label="En Route to Scene"
                      time={timeline.en_route_at}
                      done={Boolean(timeline.en_route_at)}
                    />
                    <TimelineStep
                      label="Arrived on Scene"
                      time={timeline.arrived_at}
                      done={Boolean(timeline.arrived_at)}
                    />
                    <TimelineStep
                      label="Mission Completed"
                      time={timeline.completed_at}
                      done={Boolean(timeline.completed_at || dispatch.status === 'Completed')}
                      isLast
                    />
                  </View>
                </View>

                {/* Incident Photos */}
                {images.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Activity size={16} color="#208AEF" />
                      <Text style={styles.cardTitle}>Scene Incident Photos ({images.length})</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {images.map((img: any, idx: number) => (
                        <View key={idx} style={styles.photoContainer}>
                          <Image source={{ uri: img.url }} style={styles.photoImg} />
                          {img.location_name && (
                            <Text style={styles.photoCaption} numberOfLines={1}>
                              {img.location_name}
                            </Text>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {patients.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <FileText size={36} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No Patient Care Record</Text>
                    <Text style={styles.emptySubtitle}>
                      No clinical patient care records were logged for this specific dispatch mission.
                    </Text>
                  </View>
                ) : (
                  patients.map((pat: any, index: number) => (
                    <View key={index} style={{ gap: 12 }}>
                      {/* Patient Banner */}
                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <User size={18} color="#208AEF" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.patientName}>{pat.name}</Text>
                            <Text style={styles.patientMeta}>
                              {pat.age ? `${pat.age}` : 'Age unspecified'} • {pat.gender ? pat.gender.toUpperCase() : 'Gender unspecified'}
                              {pat.civil_status ? ` • ${pat.civil_status}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 6, gap: 4 }}>
                          {pat.address && (
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Address:</Text>
                              <Text style={styles.infoValue}>{pat.address}</Text>
                            </View>
                          )}
                          {pat.contact_number && (
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Contact:</Text>
                              <Text style={styles.infoValue}>{pat.contact_number}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Clinical Complaint Card */}
                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Stethoscope size={16} color="#DC2626" />
                          <Text style={styles.cardTitle}>Clinical Chief Complaint</Text>
                        </View>
                        <Text style={styles.complaintText}>{pat.chief_complaint || 'Not stated'}</Text>
                        {pat.nature_of_call && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <Text style={styles.infoLabel}>Nature of Call:</Text>
                            <View style={styles.naturePill}>
                              <Text style={styles.naturePillText}>{pat.nature_of_call.toUpperCase()}</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Vital Signs Grid */}
                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Activity size={16} color="#059669" />
                          <Text style={styles.cardTitle}>Vital Signs at Scene</Text>
                        </View>
                        <View style={styles.vitalsGrid}>
                          <VitalItem
                            label="Blood Pressure"
                            value={pat.vital_signs?.bp || pat.vital_signs?.blood_pressure || '—'}
                            unit="mmHg"
                          />
                          <VitalItem
                            label="Pulse Rate"
                            value={pat.vital_signs?.pulse_rate || pat.vital_signs?.pr || '—'}
                            unit="bpm"
                          />
                          <VitalItem
                            label="Resp. Rate"
                            value={pat.vital_signs?.respiratory_rate || pat.vital_signs?.rr || '—'}
                            unit="cpm"
                          />
                          <VitalItem
                            label="Temperature"
                            value={pat.vital_signs?.temperature || pat.vital_signs?.temp || '—'}
                            unit="°C"
                          />
                          <VitalItem
                            label="SpO2"
                            value={pat.vital_signs?.oxygen_saturation || pat.vital_signs?.spo2 || '—'}
                            unit="%"
                          />
                          <VitalItem
                            label="Blood Glucose"
                            value={pat.vital_signs?.blood_glucose || '—'}
                            unit="mg/dL"
                          />
                          <VitalItem
                            label="Pain Scale"
                            value={pat.vital_signs?.pain_scale || pat.vital_signs?.pain_score || '—'}
                            unit="/10"
                          />
                        </View>
                      </View>

                      {/* Glasgow Coma Scale (GCS) */}
                      {pat.glasgow_coma_scale && (
                        <View style={styles.card}>
                          <View style={styles.cardHeader}>
                            <Info size={16} color="#6366F1" />
                            <Text style={styles.cardTitle}>Glasgow Coma Scale (GCS)</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <GcsBox label="Eye (E)" val={pat.glasgow_coma_scale.eye || '—'} />
                            <GcsBox label="Verbal (V)" val={pat.glasgow_coma_scale.verbal || '—'} />
                            <GcsBox label="Motor (M)" val={pat.glasgow_coma_scale.motor || '—'} />
                            <GcsBox
                              label="Total Score"
                              val={pat.glasgow_coma_scale.total || '—'}
                              highlight
                            />
                          </View>
                        </View>
                      )}

                      {/* Hospital Transport & Transfer */}
                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Building2 size={16} color="#2563EB" />
                          <Text style={styles.cardTitle}>Transport & Hospital Transfer</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Transported:</Text>
                          <Text style={[styles.infoValue, { color: pat.transported ? '#059669' : '#64748B' }]}>
                            {pat.transported ? 'YES (Ambulance Transfer)' : 'NO / Treated on Scene'}
                          </Text>
                        </View>
                        {pat.transported_to && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Receiving Facility:</Text>
                            <Text style={[styles.infoValue, { fontWeight: '700', color: '#1E293B' }]}>
                              {pat.transported_to}
                            </Text>
                          </View>
                        )}
                        {pat.received_by && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Received By:</Text>
                            <Text style={styles.infoValue}>{pat.received_by}</Text>
                          </View>
                        )}
                        {pat.waiver_signed && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <FileCheck size={14} color="#059669" />
                            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                              Patient / Witness Waiver Signed
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Action: Print / Export PCR */}
                      <TouchableOpacity
                        onPress={() => handlePrintPcr(pat)}
                        style={styles.printBtn}
                        activeOpacity={0.8}
                      >
                        <Printer size={16} color="#FFFFFF" />
                        <Text style={styles.printBtnText}>PRINT / EXPORT OFFICIAL PCR FORM</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TimelineStep({
  label,
  time,
  done,
  isLast = false,
}: {
  label: string;
  time?: string | null;
  done: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ alignItems: 'center', marginRight: 12 }}>
        <View
          style={[
            styles.timelineDot,
            done ? styles.timelineDotDone : styles.timelineDotPending,
          ]}
        >
          {done && <CheckCircle2 size={12} color="#FFFFFF" />}
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineLine,
              done ? { backgroundColor: '#208AEF' } : { backgroundColor: '#CBD5E1' },
            ]}
          />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
        <Text style={[styles.timelineLabel, done && { color: '#0F172A', fontWeight: '700' }]}>
          {label}
        </Text>
        <Text style={styles.timelineTime}>{time || 'Pending'}</Text>
      </View>
    </View>
  );
}

function VitalItem({ label, value, unit }: { label: string; value: any; unit: string }) {
  const hasValue = value && value !== '—';
  return (
    <View style={styles.vitalCard}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text style={[styles.vitalValue, !hasValue && { color: '#94A3B8' }]}>{value}</Text>
        {hasValue && <Text style={styles.vitalUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function GcsBox({ label, val, highlight = false }: { label: string; val: any; highlight?: boolean }) {
  return (
    <View style={[styles.gcsBox, highlight && styles.gcsBoxHighlight]}>
      <Text style={[styles.gcsLabel, highlight && { color: '#FFFFFF' }]}>{label}</Text>
      <Text style={[styles.gcsValue, highlight && { color: '#FFFFFF' }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  missionId: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#0F172A',
  },
  incidentBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  incidentBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#208AEF',
  },
  missionType: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#208AEF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  barangayPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  barangayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  coordsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 3,
  },
  unitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 2,
  },
  unitPlate: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#166534',
  },
  unitType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  subtleText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  crewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  crewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 8,
  },
  crewName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  crewRole: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  crewBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#208AEF',
  },
  timelineDotPending: {
    backgroundColor: '#E2E8F0',
  },
  timelineLine: {
    width: 2,
    height: 22,
    marginTop: 2,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  photoContainer: {
    marginRight: 10,
    width: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  photoImg: {
    width: 120,
    height: 90,
    borderRadius: 10,
  },
  photoCaption: {
    fontSize: 10,
    color: '#64748B',
    padding: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  complaintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  naturePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  naturePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  vitalCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalUnit: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  gcsBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  gcsBoxHighlight: {
    backgroundColor: '#4F46E5',
  },
  gcsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  gcsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
