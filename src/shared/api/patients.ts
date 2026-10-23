import apiClient from './client';
import { offlineSyncService } from '../services/offlineSyncService';

export const searchPatients = async (query: string) => {
  try {
    const response = await apiClient.get(`/responder/patients/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (err: any) {
    if (err.isNetworkError || !err.response) {
      console.log('[searchPatients] Offline: patient search unavailable without network');
      return [];
    }
    throw err;
  }
};

export const createPatient = async (patientData: any) => {
  try {
    const response = await apiClient.post('/responder/patients', patientData);
    return response.data;
  } catch (err: any) {
    if (err.isNetworkError || !err.response) {
      const tempId = `temp_patient_${offlineSyncService.generateUUID()}`;
      console.log(`[createPatient] Offline: created temporary patient ${tempId}`);
      
      const queuedPayload = {
        ...patientData,
        temp_id: tempId,
      };

      await offlineSyncService.enqueue({
        action: 'CREATE_PATIENT',
        payload: queuedPayload,
      });

      return {
        message: 'Patient created offline',
        patient_id: tempId,
        id: tempId,
        data: {
          id: tempId,
          ...patientData,
        },
        is_offline: true,
      };
    }
    throw err;
  }
};

export const identifyPatient = async (patientId: number | string, data: any) => {
  const response = await apiClient.put(`/responder/patients/${patientId}/identify`, data);
  return response.data;
};
