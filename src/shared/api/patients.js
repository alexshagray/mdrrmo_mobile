import apiClient from './client';

export const searchPatients = async (query) => {
  const response = await apiClient.get(`/responder/patients/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const createPatient = async (patientData) => {
  const response = await apiClient.post('/responder/patients', patientData);
  return response.data;
};
