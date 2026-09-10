import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated, Platform, StyleSheet, KeyboardAvoidingView, Modal } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header, Button } from '@/shared/components';
import { SignaturePad, BodyDiagram } from '@/shared/components';
import { Check, ChevronRight, ChevronLeft, Search, Save, Activity, Stethoscope, Clock, Truck, FileText, User, Plus, ShieldCheck, Send, MapPin, Navigation } from 'lucide-react-native';
import { searchPatients, createPatient } from '@/shared/api/patients';
import { getActiveDispatches, updatePcr, submitPcr, createWalkInDispatch } from '@/shared/api/dispatches';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';

function debounce(func: Function, wait: number) {
  let timeout: any;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const formatTimeForApi = (dateString: string | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const formatTimeInput = (text: string) => {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 4) {
    digits = digits.slice(0, 4);
  }
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  return digits;
};

const isPlusCode = (text: string | null | undefined): boolean => {
  if (!text) return false;
  return /[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
};

const cleanFormattedAddress = (addr: string | null | undefined): string => {
  if (!addr) return '';
  return addr.replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}(,\s*)?/gi, '').trim();
};

const resolveAddressFromCoords = async (latitude: number, longitude: number): Promise<string> => {
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) return '';
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const g = geocode[0];

      // Clean street (ignore Unnamed Road or Plus codes)
      let street = g.street || '';
      if (street.toLowerCase().includes('unnamed') || isPlusCode(street)) {
        street = '';
      }
      const streetLine = [g.streetNumber, street].filter(Boolean).join(' ');

      // POI or establishment name (exclude Plus Codes or street duplicates)
      const poiName = g.name && !isPlusCode(g.name) && g.name !== g.street && g.name !== g.city ? g.name : '';

      // Barangay / District formatting (standard for Philippines)
      let barangay = g.district || '';
      if (barangay && !barangay.toLowerCase().startsWith('brgy') && !barangay.toLowerCase().startsWith('barangay')) {
        barangay = `Brgy. ${barangay}`;
      }

      const city = g.city || g.subregion || '';
      const province = g.region || '';

      const addressComponents = [
        poiName,
        streetLine,
        barangay,
        city,
        province,
      ].filter(Boolean);

      const uniqueComponents = Array.from(new Set(addressComponents));
      if (uniqueComponents.length >= 2) {
        return uniqueComponents.join(', ');
      }

      // Fallback to formattedAddress cleaned of Plus Codes
      if (g.formattedAddress) {
        const cleaned = cleanFormattedAddress(g.formattedAddress);
        if (cleaned) {
          if (barangay && !cleaned.toLowerCase().includes(g.district!.toLowerCase())) {
            return `${barangay}, ${cleaned}`;
          }
          return cleaned;
        }
      }

      if (uniqueComponents.length > 0) {
        return uniqueComponents.join(', ');
      }
    }
  } catch (err) {
    console.log('Reverse geocoding error:', err);
  }
  return `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
};

const TOTAL_STEPS = 8;

const initialFormData = {
  patient_id: null,
  searchQuery: '',
  first_name: '',
  last_name: '',
  birthdate: '',
  gender: 'male',
  contact_number: '',
  address: '',
  nature_of_call: '',
  chief_complaint: '',
  place_of_incident: '',
  civil_status: '',
  incident_address: '',
  age: '',
  
  // Assessment
  assessment_findings: [] as string[],
  assessment_markers: [] as any[],

  // Vital Signs (Array of 3 takes)
  vital_signs: [
    { take: 1, time: '', bp: '', pr: '', rr: '', spo2: '', temp: '' },
    { take: 2, time: '', bp: '', pr: '', rr: '', spo2: '', temp: '' },
    { take: 3, time: '', bp: '', pr: '', rr: '', spo2: '', temp: '' },
  ],

  // GCS
  glasgow_coma_scale: { eye: 0, verbal: 0, motor: 0, total: 0 },
  
  // Times
  dispatch_time: '',
  en_route_time: '',
  on_scene_time: '',
  transport_time: '',
  arrived_hf_time: '',
  departed_hf_time: '',
  
  // Disposition & Transport
  disposition: [] as string[],
  special_instructions: '',
  transported: false,
  transported_to: '',
  received_by: '',
  
  // Footer / Signatures
  responders: '',
  waiver_signed: false,
  witness_name: '',
  patient_signature: '',
  witness_signature: '',
  waiver_signature: '',
};

const CHIEF_COMPLAINTS = [
  'Medical Emergency', 'Cardiac Emergency', 'Respiratory Emergency', 'Diabetic Emergency',
  'Psychiatric Emergency', 'Motor Vehicular Accidents', 'Motor Vehicular Accidents (Pedestrian)',
  'Mass Casualty Incident (Trauma)', 'Mass Casualty Incident (Medical, Infectious)', 'Industrial Accident',
  'Transport Home to Hospital', 'Transport for Check Up', 'Transport for Referral', 'Transport for Hospital Admission',
  'Transport (Cadaver)', 'Public Service', 'Training', 'Stand-By Unit', 'COVID-19 Transport',
  'Calls (Emergency, Assistance and Inquiry)', 'Hazardous Condition', 'Hazardous Materials', 'Severe Weather',
  'Search and Rescue/ Retrieval', 'Water Rescue/Drowning Incident', 'Evacuation Center Management', 'Bomb Threat',
  'Hostage Situation', 'Fire Incidents', 'Terrorism', 'Assault', 'Missing Persons', 'Bleeding',
  'Hemorrhage/Laceration/Abrasion', 'Trauma', 'Fall Victim', 'Fracture/Dislocation', 'Abdominal Pain',
  'Back Pain', 'Headache', 'Eye Problem', 'Breathing Problems/Difficulty of Breathing', 'Burns', 'Electrical Shock',
  'Allergic Reaction', 'Overdose', 'Flu-like Symptoms', 'Unconscious', 'Seizures', 'Pregnancy/Childbirth',
  'Wound Dressing/First Aid', 'Dead', 'Nausea and Vomiting', 'COVID Transport', 'Waiver', 'Fainting',
  'Suicide', 'CVA (Stroke)', 'Animal Bite', 'Stab Wound', 'Hypertensive Emergency', 'Psychosomatic Disorder',
  'Post Operative Case', 'Loss of Bowel Movement/Mild Dehydration', 'Chest Pain', 'Body Weakness', 'Attempted Suicide'
];

const calculateAge = (birthdate: string): string => {
  if (!birthdate) return '';
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age.toString();
};

export default function PatientCareRecordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormData);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [isCreatingWalkIn, setIsCreatingWalkIn] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInCoords, setWalkInCoords] = useState<{latitude: number, longitude: number, address: string} | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSearch, setComplaintSearch] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const { missionRefreshTrigger } = useMissionAlarm();

  useEffect(() => {
    loadActiveDispatch();
  }, [missionRefreshTrigger]);

  const loadActiveDispatch = async () => {
    try {
      const res = await getActiveDispatches();
      if (res && res.data && res.data.length > 0) {
        const dispatch = res.data[0];
        setActiveDispatch(dispatch);
        setIsWalkIn(false);

        const pcr = dispatch.patient_care_record;
        const resident = dispatch.incident?.resident;
        const residentProfile = resident?.resident_profile;
        const existingPatient = pcr?.patient;

        // Auto-populate incident location from place of incident, report coordinates, or existing PCR
        let defaultPlaceOfIncident = pcr?.place_of_incident 
          || dispatch.incident?.place_of_incident 
          || dispatch.incident?.location 
          || '';

        if (!defaultPlaceOfIncident && dispatch.incident) {
          const incLat = parseFloat(dispatch.incident.incident_latitude ?? dispatch.incident.latitude);
          const incLng = parseFloat(dispatch.incident.incident_longitude ?? dispatch.incident.longitude);
          if (!isNaN(incLat) && !isNaN(incLng) && (incLat !== 0 || incLng !== 0)) {
            setIsResolvingLocation(true);
            defaultPlaceOfIncident = await resolveAddressFromCoords(incLat, incLng);
            setIsResolvingLocation(false);
          } else if (dispatch.incident.description) {
            defaultPlaceOfIncident = dispatch.incident.description;
          }
        }

        // Comprehensive address resolution (from existing patient record, PCR, or resident profile)
        const residentBarangay = residentProfile?.barangay?.barangay_name || residentProfile?.barangay?.name || '';
        const residentAddressParts = [residentProfile?.house_no, residentProfile?.street, residentBarangay].filter(Boolean);
        const residentHomeAddress = residentAddressParts.join(', ');

        const defaultHomeAddress = (
          pcr?.incident_address || 
          existingPatient?.address || 
          existingPatient?.street || 
          residentHomeAddress || 
          resident?.address || 
          ''
        );

        // Auto-fill Chief Complaint from what the dispatcher entered (or incident type)
        const defaultChiefComplaint = pcr?.chief_complaint 
          || dispatch.incident?.chief_complaint 
          || dispatch.incident?.incident_type?.name 
          || '';

        // Auto-fill Nature of Call based on incident type or existing field
        const incidentTypeName = (dispatch.incident?.incident_type?.name || '').toLowerCase();
        let defaultNatureOfCall = pcr?.nature_of_call || dispatch.incident?.nature_of_call || '';
        if (!defaultNatureOfCall) {
          if (incidentTypeName.includes('transport')) defaultNatureOfCall = 'transport';
          else if (incidentTypeName.includes('standby')) defaultNatureOfCall = 'standby';
          else if (incidentTypeName.includes('medical assistance') || incidentTypeName.includes('walk-in')) defaultNatureOfCall = 'medical assistance';
          else if (incidentTypeName.includes('non-emergency')) defaultNatureOfCall = 'non-emergency';
          else defaultNatureOfCall = 'emergency';
        }

        // Comprehensive demographic resolution
        const resolvedBirthdate = existingPatient?.birthdate || residentProfile?.birthdate || '';
        const resolvedAge = resolvedBirthdate 
          ? String(calculateAge(resolvedBirthdate)) 
          : (existingPatient?.age ? String(existingPatient.age) : (pcr?.age ? String(pcr.age) : ''));

        const resolvedGender = existingPatient?.gender || pcr?.gender || residentProfile?.gender || 'male';

        const resolvedContact = (
          pcr?.contact_number || 
          existingPatient?.contact_number || 
          resident?.phone_number || 
          dispatch.incident?.caller_phone_number || 
          ''
        );

        const resolvedPatientId = pcr?.patient_id || existingPatient?.id || null;
        const resolvedFirstName = existingPatient?.first_name || resident?.first_name || '';
        const resolvedLastName = existingPatient?.last_name || resident?.last_name || '';
        const resolvedFullName = `${resolvedFirstName} ${resolvedLastName}`.trim();

        setFormData(prev => ({
          ...prev,
          dispatch_time: formatTimeForApi(dispatch.created_at),
          en_route_time: formatTimeForApi(dispatch.en_route_at),
          on_scene_time: formatTimeForApi(dispatch.arrived_on_scene_at || dispatch.arrived_at),
          responders: [
            dispatch.team_leader ? `${dispatch.team_leader.first_name} ${dispatch.team_leader.last_name}` : null,
            dispatch.driver ? `${dispatch.driver.first_name} ${dispatch.driver.last_name}` : null,
            dispatch.emt ? `${dispatch.emt.first_name} ${dispatch.emt.last_name}` : null
          ].filter(Boolean).join(', '),
          place_of_incident: defaultPlaceOfIncident || prev.place_of_incident,
          incident_address: pcr?.incident_address || dispatch.incident?.incident_address || defaultHomeAddress || prev.incident_address,
          address: defaultHomeAddress || prev.address,
          chief_complaint: defaultChiefComplaint || prev.chief_complaint,
          nature_of_call: defaultNatureOfCall || prev.nature_of_call,

          // Auto-populated Patient Demographics
          patient_id: resolvedPatientId || prev.patient_id,
          first_name: resolvedFirstName || prev.first_name,
          last_name: resolvedLastName || prev.last_name,
          birthdate: resolvedBirthdate || prev.birthdate,
          gender: resolvedGender || prev.gender,
          age: resolvedAge || prev.age,
          contact_number: resolvedContact || prev.contact_number,
          searchQuery: resolvedFullName || prev.searchQuery,
          civil_status: pcr?.civil_status || existingPatient?.civil_status || prev.civil_status || 'single',

          ...(pcr ? {
            assessment_findings: pcr.assessment || prev.assessment_findings,
            assessment_markers: pcr.assessment_markers || prev.assessment_markers,
            
            vital_signs: pcr.vital_signs || prev.vital_signs,
            glasgow_coma_scale: pcr.glasgow_coma_scale || prev.glasgow_coma_scale,
            
            disposition: pcr.disposition || prev.disposition,
            special_instructions: pcr.special_instructions || prev.special_instructions,
            transported: pcr.transported !== undefined ? pcr.transported : prev.transported,
            transported_to: pcr.transported_to || prev.transported_to,
            received_by: pcr.received_by || prev.received_by,
            
            patient_signature: pcr.patient_signature || pcr.waiver_signature || prev.patient_signature,
            witness_name: pcr.witness_name || prev.witness_name,
            witness_signature: pcr.witness_signature || prev.witness_signature,
            waiver_signature: pcr.waiver_signature || pcr.patient_signature || prev.waiver_signature,
          } : {})
        }));
      }
    } catch (e) {
      console.log('Error loading active dispatch:', e);
    } finally {
      setIsLoading(false);
      setIsResolvingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsResolvingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to detect current location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const address = await resolveAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
      const resolved = address || `Lat: ${loc.coords.latitude.toFixed(6)}, Lng: ${loc.coords.longitude.toFixed(6)}`;
      setFormData(prev => ({ ...prev, place_of_incident: resolved }));
      setErrors(prev => ({ ...prev, place_of_incident: '' }));
    } catch (e) {
      console.log('Error obtaining current location:', e);
      Alert.alert('Error', 'Unable to fetch current location.');
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleUseReportedLocation = async () => {
    if (!activeDispatch?.incident) {
      Alert.alert('Notice', 'No incident details available for this dispatch.');
      return;
    }
    const incLat = parseFloat(activeDispatch.incident.incident_latitude ?? activeDispatch.incident.latitude);
    const incLng = parseFloat(activeDispatch.incident.incident_longitude ?? activeDispatch.incident.longitude);
    if (!isNaN(incLat) && !isNaN(incLng) && (incLat !== 0 || incLng !== 0)) {
      setIsResolvingLocation(true);
      const address = await resolveAddressFromCoords(incLat, incLng);
      setFormData(prev => ({ ...prev, place_of_incident: address }));
      setErrors(prev => ({ ...prev, place_of_incident: '' }));
      setIsResolvingLocation(false);
    } else if (activeDispatch.incident.description) {
      setFormData(prev => ({ ...prev, place_of_incident: activeDispatch.incident.description }));
      setErrors(prev => ({ ...prev, place_of_incident: '' }));
    } else {
      Alert.alert('Notice', 'No GPS coordinates found in incident report.');
    }
  };

  const handleConfirmWalkIn = async () => {
    setIsCreatingWalkIn(true);
    try {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { latitude: 0, longitude: 0 };
      let addressStr = 'Unknown Location';

      if (status === 'granted') {
        // 2. Get GPS Location
        const location = await Location.getCurrentPositionAsync({});
        coords.latitude = location.coords.latitude;
        coords.longitude = location.coords.longitude;
        addressStr = await resolveAddressFromCoords(coords.latitude, coords.longitude);
      }

      // 3. Call API with coords
      const res = await createWalkInDispatch(coords);
      
      // 4. Update state
      setActiveDispatch(res.data);
      setIsWalkIn(true);
      setWalkInCoords({ ...coords, address: addressStr });
      
      const timestamp = new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      const locationDetails = status === 'granted' 
        ? `${addressStr} (Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}) @ ${timestamp}`
        : `Unknown Location @ ${timestamp}`;

      setFormData(prev => ({
        ...prev,
        dispatch_time: formatTimeForApi(res.data.created_at),
        en_route_time: formatTimeForApi(res.data.en_route_at),
        on_scene_time: formatTimeForApi(res.data.arrived_on_scene_at || res.data.arrived_at),
        place_of_incident: locationDetails,
      }));
      setShowWalkInModal(false);
      setStep(1);
    } catch (error) {
      console.log('Error creating walk-in dispatch:', error);
      Alert.alert('Error', 'Failed to create Walk-In PCR.');
    } finally {
      setIsCreatingWalkIn(false);
    }
  };

  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchPatients(query);
        setSearchResults(results);
      } catch (error) {
        console.log('Search error', error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const selectPatient = (patient: any) => {
    setFormData(prev => {
      const calculatedAge = patient.birthdate ? calculateAge(patient.birthdate) : (patient.age ? String(patient.age) : prev.age);
      const homeAddress = (patient.address || patient.incident_address || `${patient.street || ''} ${patient.barangay?.name || ''}`).trim();
      return {
        ...prev,
        patient_id: patient.id || patient.patient_id, // Handle API response variation
        first_name: patient.first_name,
        last_name: patient.last_name,
        birthdate: patient.birthdate || '',
        gender: patient.gender || prev.gender || 'male',
        contact_number: patient.contact_number || prev.contact_number || '',
        address: homeAddress,
        incident_address: homeAddress || prev.incident_address, // Resident Home Address
        civil_status: patient.civil_status || prev.civil_status || 'single',
        age: calculatedAge,
        searchQuery: `${patient.first_name} ${patient.last_name}`
      };
    });
    setSearchResults([]);
  };

  const handleCreatePatient = async () => {
    const query = formData.searchQuery?.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const parts = query.split(/\s+/);
      const first_name = parts[0] || 'Unknown';
      const last_name = parts.slice(1).join(' ') || 'Unknown';
      
      const payload: any = {
        first_name,
        last_name,
      };

      if (formData.gender) payload.gender = formData.gender;
      if (formData.age) payload.age = parseInt(formData.age, 10);
      if (formData.incident_address) payload.address = formData.incident_address;
      if (formData.contact_number) payload.contact_number = formData.contact_number;

      const res = await createPatient(payload);
      if (res && (res.patient_id || res.id)) {
        selectPatient({
          ...res,
          id: res.patient_id || res.id,
          first_name,
          last_name,
          gender: formData.gender,
          age: formData.age,
          address: formData.incident_address,
          contact_number: formData.contact_number,
          civil_status: formData.civil_status,
        });
        Alert.alert('Success', 'Patient created successfully!');
      }
    } catch (error: any) {
      console.log('Error creating patient', error?.response?.data || error?.message || error);
      const msg = error?.response?.data?.message || 'Failed to create patient.';
      Alert.alert('Error', msg);
    } finally {
      setIsSearching(false);
    }
  };

  const saveCurrentStep = async () => {
    if (!activeDispatch || !formData.patient_id) return true;
    setIsSaving(true);
    try {
      // Auto-extract unique injury types from markers to keep the legacy `assessment` array populated
      const uniqueAssessments = Array.from(new Set(formData.assessment_markers.map(m => m.label).filter(Boolean)));

      const payload = {
        patient_id: formData.patient_id,
        gender: formData.gender,
        contact_number: formData.contact_number,
        nature_of_call: formData.nature_of_call,
        chief_complaint: formData.chief_complaint,
        place_of_incident: formData.place_of_incident,
        civil_status: formData.civil_status,
        incident_address: formData.incident_address,
        age: formData.age,
        assessment: uniqueAssessments,
        assessment_markers: formData.assessment_markers,
        vital_signs: formData.vital_signs,
        glasgow_coma_scale: formData.glasgow_coma_scale,
        disposition: formData.disposition,
        special_instructions: formData.special_instructions,
        dispatch_time: formData.dispatch_time,
        en_route_time: formData.en_route_time,
        on_scene_time: formData.on_scene_time,
        transport_time: formData.transport_time,
        arrived_hf_time: formData.arrived_hf_time,
        departed_hf_time: formData.departed_hf_time,
        transported: formData.transported,
        transported_to: formData.transported_to,
        received_by: formData.received_by,
        patient_signature: formData.patient_signature || formData.waiver_signature,
        witness_name: formData.witness_name,
        witness_signature: formData.witness_signature,
        waiver_signature: formData.waiver_signature || formData.patient_signature,
      };
      await updatePcr(activeDispatch.id, payload);
      return true;
    } catch (e: any) {
      console.log('PCR Save Error:', e.response?.data || e.message);
      const errorMsg = e.response?.data?.message || e.message || 'Failed to save progress.';
      Alert.alert('Error', errorMsg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    let newErrors: Record<string, string> = {};
    
    // Step Validation
    if (step === 1) {
      if (!formData.patient_id) {
        newErrors.patient_id = 'Please select or create a patient first.';
      }
      
      if (!formData.age) {
        newErrors.age = 'Age is required.';
      } else {
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
          newErrors.age = 'Please enter a valid age between 0 and 120.';
        }
      }
      
      if (!formData.nature_of_call) newErrors.nature_of_call = 'Nature of Call is required.';
      
      if (!formData.place_of_incident) {
        newErrors.place_of_incident = 'Place of Incident is required.';
      }
      if (!formData.incident_address) {
        newErrors.incident_address = 'Resident Home Address is required.';
      }
      
      if (!formData.chief_complaint) newErrors.chief_complaint = 'Chief Complaint is required.';
      
      if (formData.contact_number) {
        const phPhoneRegex = /^09\d{9}$/;
        if (!phPhoneRegex.test(formData.contact_number)) {
          newErrors.contact_number = 'Please enter a valid Philippine mobile number (e.g. 09123456789).';
        }
      }
    } else if (step === 2) {
      if (formData.assessment_markers.length === 0) {
        newErrors.assessment = 'Please add at least one injury marker to the diagram.';
      }
    } else if (step === 3) {
      const t1 = formData.vital_signs[0];
      if (!t1.time || !t1.bp || !t1.pr || !t1.rr || !t1.spo2) {
        newErrors.vital_signs = 'Please complete Time, BP, PR/HR, RR, and O2 Sat for Take 1.';
      }
    } else if (step === 4) {
      if (formData.glasgow_coma_scale.eye === 0 || formData.glasgow_coma_scale.verbal === 0 || formData.glasgow_coma_scale.motor === 0) {
        newErrors.gcs = 'Please select a value for Eye, Verbal, and Motor response.';
      }
    } else if (step === 5) {
      if (formData.disposition.length === 0) {
        newErrors.disposition = 'Please select at least one disposition option.';
      }
    } else if (step === 6) {
      const isTransported = formData.disposition.some(d => d.includes('Transported'));
      if (isTransported) {
        if (!formData.transported_to) newErrors.transported_to = 'Transported To is required.';
        if (!formData.received_by) newErrors.received_by = 'Received By is required.';
      }
    } else if (step === 7) {
      // No required signatures by default since waiver is optional
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});

    const saved = await saveCurrentStep();
    if (saved && step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleFinalSubmit = async () => {
    const saved = await saveCurrentStep();
    if (!saved) return;
    
    setIsSaving(true);
    try {
      await submitPcr(activeDispatch.id);
      Alert.alert('Success', 'PCR submitted successfully!');
      setActiveDispatch(null);
      setStep(1);
      setFormData(initialFormData);
    } catch (e: any) {
      console.log('PCR Submit Error:', e.response?.data || e.message);
      const errorMsg = e.response?.data?.message || e.message || 'Failed to submit PCR.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[...Array(TOTAL_STEPS)].map((_, i) => (
        <View key={i} style={[styles.stepDot, i + 1 <= step ? styles.stepActive : null]} />
      ))}
    </View>
  );

  const updateVital = (takeIdx: number, field: string, val: string) => {
    const newVitals = [...formData.vital_signs];
    newVitals[takeIdx] = { ...newVitals[takeIdx], [field]: val };
    
    // Auto-set time on first entry for this take if time is empty
    if (field !== 'time' && !newVitals[takeIdx].time) {
      newVitals[takeIdx].time = formatTimeForApi(new Date().toISOString());
    }
    
    setFormData({ ...formData, vital_signs: newVitals });
  };

  const handleTimeDigitsChange = (takeIdx: number, val: string) => {
    const currentVal = formData.vital_signs[takeIdx].time || '';
    const currentPeriod = currentVal.includes('PM') ? 'PM' : 'AM';
    const formattedDigits = formatTimeInput(val);
    updateVital(takeIdx, 'time', `${formattedDigits} ${currentPeriod}`);
  };

  const toggleAmPm = (takeIdx: number) => {
    const currentVal = formData.vital_signs[takeIdx].time || '';
    let currentDigits = currentVal.split(' ')[0] || '';
    if (!currentDigits) {
      const d = new Date();
      let h = d.getHours() % 12;
      h = h ? h : 12;
      const m = d.getMinutes().toString().padStart(2, '0');
      currentDigits = `${h.toString().padStart(2, '0')}:${m}`;
    }
    const currentPeriod = currentVal.includes('PM') ? 'PM' : 'AM';
    const newPeriod = currentPeriod === 'AM' ? 'PM' : 'AM';
    updateVital(takeIdx, 'time', `${currentDigits} ${newPeriod}`);
  };

  const toggleArrayItem = (field: 'assessment_findings' | 'disposition', item: string) => {
    const current = formData[field];
    if (current.includes(item)) {
      setFormData({ ...formData, [field]: current.filter(i => i !== item) });
    } else {
      setFormData({ ...formData, [field]: [...current, item] });
    }
  };

  const renderError = (field: string) => {
    if (errors[field]) {
      return <Text style={styles.errorText}>{errors[field]}</Text>;
    }
    return null;
  };

  const renderStep1 = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Step 1: Patient Info</Text>
      <Text style={[styles.label, { marginTop: 0 }]}>Search Patient</Text>
      <TextInput
        style={[styles.input, errors.patient_id ? styles.inputError : null]}
        placeholder="Patient Name"
        value={formData.searchQuery}
        onChangeText={(txt) => { 
          setFormData({...formData, searchQuery: txt, patient_id: null}); 
          setErrors({...errors, patient_id: ''});
          handleSearch(txt); 
        }}
      />
      {renderError('patient_id')}
      {isSearching && <ActivityIndicator />}
      {searchResults.map(p => (
        <TouchableOpacity key={p.id} style={styles.resultItem} onPress={() => { selectPatient(p); setErrors({...errors, patient_id: ''}); }}>
          <Text style={styles.resultName}>{p.first_name} {p.last_name}</Text>
          <Text style={styles.resultSub}>Patient ID: PAT-{p.id} • {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'Gender N/A'}{p.age ? ` • ${p.age} yrs` : ''}</Text>
          {(p.address || p.street) && (
            <Text style={styles.resultSub} numberOfLines={1}>{p.address || `${p.street || ''} ${p.barangay?.name || ''}`.trim()}</Text>
          )}
        </TouchableOpacity>
      ))}
      {!isSearching && formData.searchQuery.length >= 2 && searchResults.length === 0 && !formData.patient_id && (
        <TouchableOpacity style={styles.createBtn} onPress={handleCreatePatient}>
          <Text style={styles.createBtnText}>+ Create New Patient: {formData.searchQuery}</Text>
        </TouchableOpacity>
      )}
      {formData.patient_id && (
        <View style={styles.selectedPatient}>
          <Text style={styles.resultName}>Selected: {formData.first_name} {formData.last_name}</Text>
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.checkboxContainer}>
          {['male', 'female'].map(g => (
            <TouchableOpacity key={g} style={[styles.checkbox, formData.gender === g && styles.checkboxActive]} onPress={() => setFormData({...formData, gender: g})}>
              <Text style={[styles.checkboxText, formData.gender === g && styles.checkboxTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={[styles.input, errors.age ? styles.inputError : null]}
          placeholder="e.g. 34"
          keyboardType="numeric"
          maxLength={3}
          value={formData.age}
          onChangeText={(v) => { 
            const numericValue = v.replace(/[^0-9]/g, '');
            setFormData({...formData, age: numericValue}); 
            setErrors({...errors, age: ''}); 
          }}
        />
        {renderError('age')}
        
        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={[styles.input, errors.contact_number ? styles.inputError : null]}
          placeholder="e.g. 09123456789"
          keyboardType="phone-pad"
          maxLength={11}
          value={formData.contact_number}
          onChangeText={(v) => { setFormData({...formData, contact_number: v}); setErrors({...errors, contact_number: ''}); }}
        />
        {renderError('contact_number')}
        
        <Text style={styles.label}>Resident Home Address</Text>
        <TextInput
          style={[styles.input, errors.incident_address ? styles.inputError : null]}
          placeholder="Patient's home or registered address"
          value={formData.incident_address}
          onChangeText={(v) => { setFormData({...formData, incident_address: v, address: v}); setErrors({...errors, incident_address: ''}); }}
        />
        {renderError('incident_address')}
        
        <Text style={styles.label}>Civil Status</Text>
        <View style={styles.checkboxContainer}>
          {['single', 'married', 'widowed', 'child', 'separated'].map(s => (
            <TouchableOpacity key={s} style={[styles.checkbox, formData.civil_status === s && styles.checkboxActive]} onPress={() => setFormData({...formData, civil_status: s})}>
              <Text style={[styles.checkboxText, formData.civil_status === s && styles.checkboxTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nature of Call</Text>
        <View style={styles.checkboxContainer}>
          {['emergency', 'transport', 'standby', 'non-emergency', 'medical assistance'].map(n => (
            <TouchableOpacity key={n} style={[styles.checkbox, formData.nature_of_call === n && styles.checkboxActive, errors.nature_of_call ? styles.inputError : null]} onPress={() => { setFormData({...formData, nature_of_call: n}); setErrors({...errors, nature_of_call: ''}); }}>
              <Text style={[styles.checkboxText, formData.nature_of_call === n && styles.checkboxTextActive]}>{n.charAt(0).toUpperCase() + n.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderError('nature_of_call')}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 }}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Place of Incident</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {activeDispatch?.incident && (
              <TouchableOpacity
                onPress={handleUseReportedLocation}
                disabled={isResolvingLocation}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}
              >
                <MapPin size={12} color="#2563eb" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563eb', marginLeft: 4 }}>Reported GPS</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              disabled={isResolvingLocation}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' }}
            >
              <Navigation size={12} color="#16a34a" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#16a34a', marginLeft: 4 }}>My GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, errors.place_of_incident ? styles.inputError : null, { paddingRight: isResolvingLocation ? 40 : 16, marginBottom: 6 }]}
            placeholder="Place or address of incident"
            value={formData.place_of_incident}
            onChangeText={(v) => {
              setFormData({ ...formData, place_of_incident: v });
              setErrors({ ...errors, place_of_incident: '' });
            }}
          />
          {isResolvingLocation && (
            <View style={{ position: 'absolute', right: 12, top: 16 }}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14, marginLeft: 2 }}>
          Auto-filled from incident report location. You can edit or refine this.
        </Text>
        {renderError('place_of_incident')}
        
        <Text style={styles.label}>Chief Complaint</Text>
        <TouchableOpacity 
          style={[styles.input, { justifyContent: 'center', height: 56, marginBottom: 16 }, errors.chief_complaint ? styles.inputError : null]}
          onPress={() => setShowComplaintModal(true)}
        >
          <Text style={{ color: formData.chief_complaint ? '#0f172a' : '#94a3b8', fontSize: 16 }}>
            {formData.chief_complaint || 'Select Chief Complaint'}
          </Text>
        </TouchableOpacity>
        {renderError('chief_complaint')}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Step 2: Assessment</Text>
      {renderError('assessment')}
      <BodyDiagram 
        markers={formData.assessment_markers} 
        onAddMarker={(m) => { setFormData({...formData, assessment_markers: [...formData.assessment_markers, m]}); setErrors({...errors, assessment: ''}); }}
        onRemoveMarker={(id) => setFormData({...formData, assessment_markers: formData.assessment_markers.filter(m => m.id !== id)})}
      />
      
      <View style={{ marginTop: 24, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <FileText size={18} color="#0f172a" />
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0, marginLeft: 8 }]}>Special Instructions / Notes</Text>
        </View>
        <TextInput 
          style={[styles.inputArea, { marginBottom: 0, backgroundColor: '#fff', minHeight: 100 }]} 
          placeholder="Add any special instructions or additional assessment notes here..." 
          multiline 
          value={formData.special_instructions} 
          onChangeText={(v) => setFormData({...formData, special_instructions: v})} 
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Step 3: Vital Signs</Text>
      
      <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Stethoscope size={20} color="#0369a1" />
        <Text style={{ color: '#0369a1', marginLeft: 8, fontSize: 14, fontWeight: '600' }}>Record up to 3 sets of vital signs.</Text>
      </View>

      {[0, 1, 2].map((take) => {
        const isLocked = take > 0 && !formData.vital_signs[take-1].bp;
        const isError = take === 0 && errors.vital_signs;
        
        return (
          <View key={take} style={[styles.card, { borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: isError ? '#f87171' : '#e2e8f0', backgroundColor: '#fff' }, isLocked ? {opacity: 0.4} : null]} pointerEvents={isLocked ? 'none' : 'auto'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 }}>
              <View style={{ backgroundColor: '#f1f5f9', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a', fontSize: 16 }}>{take + 1}</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 }}>
                Take {take + 1}
              </Text>
              {take > 0 && <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>OPTIONAL</Text>}
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Clock size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>Time</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                  <TextInput 
                    style={[styles.input, {flex: 1, marginBottom: 0, paddingHorizontal: 8, textAlign: 'center', borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0}]} 
                    placeholder="00:00" 
                    keyboardType="numeric"
                    maxLength={5}
                    value={(formData.vital_signs[take].time || '').split(' ')[0]} 
                    onChangeText={(v) => { 
                      handleTimeDigitsChange(take, v); 
                      setErrors({...errors, vital_signs: ''}); 
                    }} 
                  />
                  <TouchableOpacity 
                    style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12, height: 49.5, justifyContent: 'center' }}
                    onPress={() => toggleAmPm(take)}
                  >
                    <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 13 }}>
                      {(formData.vital_signs[take].time || '').includes('PM') ? 'PM' : 'AM'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Activity size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>O2 Sat</Text>
                </View>
                <TextInput style={styles.input} placeholder="%" keyboardType="numeric" maxLength={3} value={formData.vital_signs[take].spo2} onChangeText={(v) => { updateVital(take, 'spo2', v.replace(/\D/g, '')); setErrors({...errors, vital_signs: ''}); }} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Activity size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>PR/HR</Text>
                </View>
                <TextInput style={styles.input} placeholder="bpm" keyboardType="numeric" maxLength={3} value={formData.vital_signs[take].pr} onChangeText={(v) => { updateVital(take, 'pr', v.replace(/\D/g, '')); setErrors({...errors, vital_signs: ''}); }} />
              </View>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Activity size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>RR</Text>
                </View>
                <TextInput style={styles.input} placeholder="cpm" keyboardType="numeric" maxLength={3} value={formData.vital_signs[take].rr} onChangeText={(v) => { updateVital(take, 'rr', v.replace(/\D/g, '')); setErrors({...errors, vital_signs: ''}); }} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Activity size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>BP</Text>
                </View>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="120/80" keyboardType="numbers-and-punctuation" maxLength={7} value={formData.vital_signs[take].bp} onChangeText={(v) => { updateVital(take, 'bp', v.replace(/[^0-9/]/g, '')); setErrors({...errors, vital_signs: ''}); }} />
              </View>
              <View style={styles.flex1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Stethoscope size={14} color="#64748b" />
                  <Text style={[styles.label, { marginBottom: 0, marginLeft: 4, marginTop: 0 }]}>Temp (Opt)</Text>
                </View>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="°C" value={formData.vital_signs[take].temp} onChangeText={(v) => { updateVital(take, 'temp', v); setErrors({...errors, vital_signs: ''}); }} />
              </View>
            </View>
          </View>
        );
      })}
      {renderError('vital_signs')}
    </View>
  );

  const renderStep4 = () => {
    const setGcs = (field: 'eye'|'verbal'|'motor', val: number) => {
      const newGcs = { ...formData.glasgow_coma_scale, [field]: val };
      newGcs.total = newGcs.eye + newGcs.verbal + newGcs.motor;
      setFormData({ ...formData, glasgow_coma_scale: newGcs });
      if (errors.gcs) {
        setErrors({ ...errors, gcs: '' });
      }
    };

    const gcsTotal = formData.glasgow_coma_scale.total;
    let severityColor = '#0f172a';
    let severityLabel = 'Incomplete';
    
    if (formData.glasgow_coma_scale.eye > 0 && formData.glasgow_coma_scale.verbal > 0 && formData.glasgow_coma_scale.motor > 0) {
      if (gcsTotal <= 8) { severityColor = '#e11d48'; severityLabel = 'Severe Head Injury'; }
      else if (gcsTotal <= 12) { severityColor = '#f59e0b'; severityLabel = 'Moderate Head Injury'; }
      else { severityColor = '#10b981'; severityLabel = 'Mild Head Injury / Normal'; }
    }

    const renderOptions = (field: 'eye'|'verbal'|'motor', title: string, options: {l: string, v: number}[]) => (
      <View style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>{title}</Text>
        {options.map((opt, idx) => {
          const isActive = formData.glasgow_coma_scale[field] === opt.v;
          return (
            <TouchableOpacity 
              key={field + opt.v} 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: idx === options.length - 1 ? 0 : 8,
                backgroundColor: isActive ? '#f0f9ff' : '#f8fafc',
                borderWidth: 1.5,
                borderColor: isActive ? '#38bdf8' : '#f1f5f9'
              }} 
              onPress={() => setGcs(field, opt.v)}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isActive ? '#0284c7' : '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: isActive ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: 16 }}>{opt.v}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: isActive ? '#0369a1' : '#334155', fontWeight: isActive ? '700' : '500' }}>{opt.l}</Text>
              {isActive && <Check size={20} color="#0284c7" />}
            </TouchableOpacity>
          );
        })}
      </View>
    );

    return (
      <View style={styles.content}>
        <Text style={styles.title}>Step 4: Glasgow Coma Scale</Text>
        
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Score</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: severityColor, lineHeight: 50 }}>{gcsTotal}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#cbd5e1', marginBottom: 6, marginLeft: 4 }}>/ 15</Text>
          </View>
          <View style={{ backgroundColor: severityColor + '15', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 }}>
            <Text style={{ color: severityColor, fontWeight: '800', fontSize: 14 }}>{severityLabel}</Text>
          </View>
        </View>

        {renderOptions('eye', 'Best Eye Response (E)', [
          {l: 'Spontaneous-open with blinking at baseline', v: 4},
          {l: 'Opens to verbal command, speech, or shout', v: 3},
          {l: 'Open to pain, not applied to face', v: 2},
          {l: 'None', v: 1}
        ])}

        {renderOptions('verbal', 'Best Verbal Response (V)', [
          {l: 'Oriented', v: 5},
          {l: 'Confused conversation, but able to answer questions', v: 4},
          {l: 'Inappropriate responses, words discernible', v: 3},
          {l: 'Incomprehensible speech', v: 2},
          {l: 'None', v: 1}
        ])}

        {renderOptions('motor', 'Best Motor Response (M)', [
          {l: 'Obeys commands for movement', v: 6},
          {l: 'Purposeful movement to painful stimulus', v: 5},
          {l: 'Withdraws from pain', v: 4},
          {l: 'Abnormal (spastic) flexion, decorticate posture', v: 3},
          {l: 'Extensor (rigid) response, decerebrate posture', v: 2},
          {l: 'None', v: 1}
        ])}
        
        {renderError('gcs')}
      </View>
    );
  };

  const renderStep5 = () => {
    const dispositionOptions = [
      'Treated,Recovered',
      'Treated, Transported to Hospital',
      'Transported Care to RHU',
      'Treated, Transported by Private Veh.',
      'Treated, Refused Transport',
      'No Treatment, Transport Required',
      'False Call',
      'Cancelled',
      'No Patient Found',
      'Dead At Scene',
      'Patient Refused Care',
      'No Treatment Required'
    ];

    return (
      <View style={styles.content}>
        <Text style={styles.title}>Step 5: Disposition</Text>

        <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Check size={20} color="#0369a1" />
          <Text style={{ color: '#0369a1', marginLeft: 8, fontSize: 14, fontWeight: '600' }}>Select all applicable outcomes.</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' }}>
          {dispositionOptions.map((f, idx) => {
            const isActive = formData.disposition.includes(f);
            const displayText = f === 'Treated,Recovered' ? 'Treated, Recovered' : f;
            
            return (
              <TouchableOpacity 
                key={f} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 16, 
                  borderRadius: 12, 
                  marginBottom: idx === dispositionOptions.length - 1 ? 0 : 8,
                  backgroundColor: isActive ? '#f0f9ff' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: isActive ? '#38bdf8' : '#f1f5f9'
                }} 
                onPress={() => { toggleArrayItem('disposition', f); setErrors({...errors, disposition: ''}); }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: isActive ? '#0284c7' : '#cbd5e1', backgroundColor: isActive ? '#0284c7' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  {isActive && <Check size={16} color="#fff" />}
                </View>
                <Text style={{ flex: 1, color: isActive ? '#0369a1' : '#475569', fontWeight: isActive ? '700' : '500', fontSize: 15 }}>{displayText}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {renderError('disposition')}
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Step 6: Transport</Text>
      
      <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <Truck size={20} color="#0369a1" />
        <Text style={{ color: '#0369a1', marginLeft: 8, fontSize: 14, fontWeight: '600', flex: 1 }}>Provide transport and endorsement details.</Text>
      </View>

      <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#e2e8f0', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <ShieldCheck size={20} color="#475569" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Responders on Duty</Text>
          <Text style={{ fontSize: 16, color: '#0f172a', fontWeight: '600', marginTop: 2 }}>{formData.responders || 'None Assigned'}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Truck size={16} color="#0f172a" />
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0, marginLeft: 6 }]}>Transported To:</Text>
        </View>
        <TextInput style={[styles.input, errors.transported_to ? styles.inputError : null, { backgroundColor: '#f8fafc', marginBottom: 20 }]} placeholder="e.g., General Hospital" value={formData.transported_to} onChangeText={(v) => { setFormData({...formData, transported_to: v}); setErrors({...errors, transported_to: ''}); }} />
        {renderError('transported_to')}
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <User size={16} color="#0f172a" />
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0, marginLeft: 6 }]}>Received By:</Text>
        </View>
        <TextInput style={[styles.input, errors.received_by ? styles.inputError : null, { backgroundColor: '#f8fafc', marginBottom: 8 }]} placeholder="e.g., Dr. Smith / RN Doe" value={formData.received_by} onChangeText={(v) => { setFormData({...formData, received_by: v}); setErrors({...errors, received_by: ''}); }} />
        {renderError('received_by')}
      </View>
    </View>
  );

  const renderStep7 = () => {
    const patientName = `${formData.first_name} ${formData.last_name}`.trim() || '____________';
    
    return (
      <View style={styles.content}>
        <Text style={styles.title}>Step 7: Signatures</Text>
        
        <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <FileText size={20} color="#0369a1" />
          <Text style={{ color: '#0369a1', marginLeft: 8, fontSize: 14, fontWeight: '600', flex: 1 }}>Obtain necessary signatures for authorization.</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 12, marginRight: 12 }}>
              <FileText size={24} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Waiver Signature</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Patient's consent for treatment</Text>
            </View>
          </View>
          
          {formData.waiver_signature ? (
            <View style={{ backgroundColor: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#fef3c7' : '#f0fdf4', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#fde68a' : '#bbf7d0' }}>
              <Check size={20} color={formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#d97706' : '#16a34a'} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#b45309' : '#16a34a', marginLeft: 8, flex: 1 }}>
                {formData.waiver_signature === 'UNABLE_TO_SIGN' ? 'Marked Unable to Sign (Unconscious)' : 'Waiver Signed'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setFormData(prev => ({ ...prev, waiver_signature: '', patient_signature: '' }));
                  setShowWaiverModal(true);
                }} 
                style={{ backgroundColor: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#fef9c3' : '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#a16207' : '#15803d', fontWeight: '700', fontSize: 12 }}>RE-SIGN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowWaiverModal(true)}>
              <FileText size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>Tap to Sign Waiver</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 12, marginRight: 12 }}>
              <User size={24} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Witness Signature</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Secondary authorization</Text>
            </View>
          </View>

          {formData.witness_signature ? (
            <View style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' }}>
              <Check size={20} color="#16a34a" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#16a34a', marginLeft: 8, flex: 1 }}>Witness Signed</Text>
              <TouchableOpacity onPress={() => setShowWitnessModal(true)} style={{ backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 12 }}>RE-SIGN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={{ backgroundColor: '#0284c7', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowWitnessModal(true)}>
              <User size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>Tap to Add Witness</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    );
  };

  const renderStep8 = () => {
    const uniqueAssessments = Array.from(new Set(formData.assessment_markers.map(m => m.label).filter(Boolean)));
    
    const SummaryRow = ({ icon: Icon, title, value }: any) => (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
        <View style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 12, marginRight: 16 }}>
          <Icon size={20} color="#0f172a" />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
          <Text style={{ fontSize: 16, color: '#0f172a', fontWeight: '700' }}>{value || 'None'}</Text>
        </View>
      </View>
    );

    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 72, height: 72, backgroundColor: '#f0fdf4', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 4, borderColor: '#dcfce7' }}>
            <Check size={36} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a' }}>Review & Submit</Text>
          <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 16 }}>
            Please review the summary of the Patient Care Record before final submission.
          </Text>
        </View>

        <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <SummaryRow icon={User} title="Patient Information" value={`${formData.first_name} ${formData.last_name}`.trim() || 'Unknown'} />
          <SummaryRow icon={Activity} title="Assessment Findings" value={uniqueAssessments.length > 0 ? uniqueAssessments.join(', ') : 'No injuries marked'} />
          <SummaryRow icon={Stethoscope} title="Glasgow Coma Scale" value={`Total: ${formData.glasgow_coma_scale.total} / 15`} />
          <SummaryRow icon={Truck} title="Disposition" value={formData.disposition.length > 0 ? formData.disposition.join(', ') : 'None selected'} />
          
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 12, marginRight: 16 }}>
              <FileText size={20} color="#0f172a" />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Signatures Attached</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {formData.waiver_signature ? (
                  <View style={{ backgroundColor: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#fef3c7' : '#ecfdf5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#fde68a' : '#a7f3d0' }}>
                    <Text style={{ color: formData.waiver_signature === 'UNABLE_TO_SIGN' ? '#b45309' : '#059669', fontWeight: '800', fontSize: 13 }}>
                      {formData.waiver_signature === 'UNABLE_TO_SIGN' ? '⚠ UNABLE TO SIGN' : '✓ WAIVER'}
                    </Text>
                  </View>
                ) : null}
                {formData.witness_signature ? (
                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ color: '#2563eb', fontWeight: '800', fontSize: 13 }}>✓ WITNESS</Text>
                  </View>
                ) : null}
                {!formData.waiver_signature && !formData.witness_signature && (
                  <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>NONE</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleFinalSubmit} 
          disabled={isSaving}
          style={{ width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: isSaving ? '#94a3b8' : '#10b981', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Send size={20} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
            {isSaving ? 'SUBMITTING...' : 'SUBMIT REPORT'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#e11d48" /></SafeAreaView>;
  }

  if (!activeDispatch) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6" edges={['top', 'left', 'right']}>
        <View className="items-center justify-center bg-white p-8 rounded-[32px] border-2 border-slate-200 border-dashed w-full shadow-sm">
          <View className="bg-slate-100 p-5 rounded-full mb-5">
            <ShieldCheck size={48} color="#94A3B8" />
          </View>
          <Text className="text-slate-800 font-black text-2xl tracking-tight mb-2 text-center">No Active Dispatch</Text>
          <Text className="text-slate-500 font-medium text-center mb-8 leading-5">
            You can only fill out a Patient Care Record when you are actively assigned to an emergency dispatch.
          </Text>
          <Button 
            title="Create Walk-In PCR" 
            onPress={() => setShowWalkInModal(true)} 
            style={{ width: '100%', backgroundColor: '#e11d48' }}
          />
        </View>

        {/* Walk-In Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showWalkInModal}
          onRequestClose={() => setShowWalkInModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-slate-900/70 p-4">
            <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
                  <Plus size={32} color="#e11d48" />
                </View>
                <Text className="text-xl font-bold text-slate-800 text-center mb-2">
                  Create Walk-In PCR?
                </Text>
                <Text className="text-slate-500 text-center font-medium">
                  This will instantly generate a new active dispatch and automatically capture your current location.
                </Text>
              </View>
              <View className="flex-row justify-between space-x-3 mt-4">
                <TouchableOpacity 
                  onPress={() => setShowWalkInModal(false)}
                  disabled={isCreatingWalkIn}
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl items-center"
                >
                  <Text className="text-slate-600 font-bold">CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleConfirmWalkIn}
                  disabled={isCreatingWalkIn}
                  className="flex-1 py-3.5 bg-rose-600 rounded-xl items-center shadow-sm flex-row justify-center"
                >
                  {isCreatingWalkIn ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold">CONFIRM</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.main} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={`PCR: ${activeDispatch.incident?.tracking_number || 'Walk-In'}`} />
        {renderStepIndicator()}
        

        <ScrollView style={styles.flex1} contentContainerStyle={styles.scroll}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
          {step === 7 && renderStep7()}
          {step === 8 && renderStep8()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 85) + 16 }]}>
          <TouchableOpacity style={[styles.navBtn, step === 1 && styles.navBtnDisabled]} disabled={step === 1} onPress={() => setStep(step - 1)}>
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
          {step < TOTAL_STEPS && (
            <TouchableOpacity style={styles.navBtnPrimary} onPress={handleNext}>
              <Text style={styles.navTextPrimary}>Next</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Waiver Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showWaiverModal}
          onRequestClose={() => setShowWaiverModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconBg}>
                  <ShieldCheck size={28} color="#e11d48" />
                </View>
                <Text style={styles.modalTitle}>Refusal of Care Waiver</Text>
              </View>
              
              <Text style={styles.waiverText}>
                By signing this form, I, <Text style={styles.waiverName}>{formData.first_name ? `${formData.first_name} ${formData.last_name}` : '____________'}</Text>, am releasing OPOL RESCUE TEAM of any liability and/or medical claim from my decision to refuse care against medical advice.
              </Text>

              <TouchableOpacity 
                style={[styles.checkbox, formData.waiver_signature === 'UNABLE_TO_SIGN' && styles.checkboxActive, { marginBottom: 16 }]} 
                onPress={() => {
                  setFormData(prev => {
                    if (prev.waiver_signature === 'UNABLE_TO_SIGN') {
                      return { ...prev, waiver_signature: '', patient_signature: '' };
                    } else {
                      return { ...prev, waiver_signature: 'UNABLE_TO_SIGN', patient_signature: 'UNABLE_TO_SIGN' };
                    }
                  });
                }}
              >
                <Text style={[styles.checkboxText, formData.waiver_signature === 'UNABLE_TO_SIGN' && styles.checkboxTextActive]}>
                  Patient is unable to sign waiver (e.g., Unconscious, Minor)
                </Text>
              </TouchableOpacity>
              
              {formData.waiver_signature === 'UNABLE_TO_SIGN' ? (
                <TouchableOpacity 
                  style={[styles.signButton, { marginTop: 10 }]} 
                  onPress={() => {
                    setFormData(prev => ({ ...prev, waiver_signature: 'UNABLE_TO_SIGN', patient_signature: 'UNABLE_TO_SIGN' }));
                    setShowWaiverModal(false);
                  }}
                >
                  <Text style={styles.signButtonText}>Confirm & Close</Text>
                </TouchableOpacity>
              ) : (
                <SignaturePad 
                  descriptionText="Please sign below:"
                  onOK={(sig) => { 
                    setFormData(prev => ({ ...prev, waiver_signature: sig, patient_signature: sig })); 
                    setShowWaiverModal(false); 
                  }} 
                  onEmpty={() => {}} 
                />
              )}
              
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWaiverModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Witness Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showWitnessModal}
          onRequestClose={() => setShowWitnessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconBg, { backgroundColor: '#eff6ff' }]}>
                  <User size={28} color="#3b82f6" />
                </View>
                <Text style={styles.modalTitle}>Witness Information</Text>
              </View>
              
              <Text style={styles.label}>Name (Optional)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Witness Name / Relationship" 
                value={formData.witness_name} 
                onChangeText={(v) => setFormData({...formData, witness_name: v})} 
              />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.label, { marginTop: 0, marginRight: 8, marginBottom: 0 }]}>Date:</Text>
                <Text style={{ fontSize: 16, color: '#0f172a', fontWeight: '600' }}>
                  {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              <SignaturePad 
                descriptionText="Please sign below:"
                onOK={(sig) => { 
                  setFormData({...formData, witness_signature: sig}); 
                  setShowWitnessModal(false); 
                }} 
                onEmpty={() => {}} 
              />
              
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowWitnessModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Chief Complaint Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showComplaintModal}
          onRequestClose={() => setShowComplaintModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Select Chief Complaint</Text>
              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                placeholder="Search complaint..."
                value={complaintSearch}
                onChangeText={setComplaintSearch}
              />
              <ScrollView style={{ marginTop: 8 }}>
                {CHIEF_COMPLAINTS.filter(c => c.toLowerCase().includes(complaintSearch.toLowerCase())).map((complaint, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                    onPress={() => {
                      setFormData({...formData, chief_complaint: complaint});
                      setErrors({...errors, chief_complaint: ''});
                      setShowComplaintModal(false);
                      setComplaintSearch('');
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#334155' }}>{complaint}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowComplaintModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flex1: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  content: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  subtitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 15, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 15 },
  stepContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd5e1' },
  stepActive: { backgroundColor: '#3b82f6', width: 24 },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconBg: {
    width: 56,
    height: 56,
    backgroundColor: '#ffe4e6',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  waiverText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'justify',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  waiverName: {
    fontWeight: '700',
    color: '#0f172a',
    textDecorationLine: 'underline',
  },
  modalCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
  signButton: {
    backgroundColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  signButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  signedContainer: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  signedText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 15,
  },
  reSignText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 16, fontSize: 16, color: '#0f172a' },
  inputArea: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 16, fontSize: 16, color: '#0f172a', minHeight: 120, textAlignVertical: 'top' },
  errorText: { color: '#e11d48', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 4, fontWeight: '600' },
  inputError: { borderColor: '#e11d48', backgroundColor: '#fff1f2' },
  resultItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultName: { fontSize: 16, fontWeight: '600' },
  resultSub: { fontSize: 13, color: '#64748b' },
  selectedPatient: { padding: 15, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff', paddingHorizontal: 16 },
  navBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#e2e8f0' },
  navBtnDisabled: { opacity: 0.5 },
  navBtnPrimary: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#0f172a' },
  navText: { color: '#0f172a', fontWeight: '600', fontSize: 16 },
  navTextPrimary: { color: '#fff', fontWeight: '600', fontSize: 16 },
  checkboxContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  checkbox: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  checkboxActive: { backgroundColor: '#fee2e2', borderColor: '#f87171' },
  checkboxText: { color: '#475569', fontSize: 14 },
  checkboxTextActive: { color: '#b91c1c', fontWeight: '600' },
  card: { padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  gcsTotal: { fontSize: 18, fontWeight: 'bold', color: '#e11d48', marginBottom: 15, textAlign: 'center' },
  radio: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  radioActive: { backgroundColor: '#fee2e2' },
  radioText: { fontSize: 15, color: '#334155' },
  radioTextActive: { color: '#b91c1c', fontWeight: '600' },
  summaryText: { fontSize: 15, marginBottom: 8, color: '#334155' },
  createBtn: { padding: 15, backgroundColor: '#e0f2fe', borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', marginTop: 10, alignItems: 'center' },
  createBtnText: { color: '#0369a1', fontWeight: 'bold' }
});
