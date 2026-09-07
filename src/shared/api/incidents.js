import apiClient from './client';

export const submitEmergencyReport = async (formData) => {
  const response = await apiClient.post('/resident/incidents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateReporterLocation = async (incidentId, latitude, longitude) => {
  const response = await apiClient.put(`/resident/incidents/${incidentId}/location`, {
    latitude,
    longitude,
  });
  return response.data;
};

export const getMyReports = async () => {
  const response = await apiClient.get('/resident/incidents');
  return response.data;
};

export const callResponderApi = async (incidentId, latitude, longitude) => {
  const response = await apiClient.post(`/resident/incidents/${incidentId}/call-responder`, {
    latitude,
    longitude,
  });
  return response.data;
};

export const callHotlineApi = async (latitude, longitude) => {
  const response = await apiClient.post(`/resident/hotline/call`, {
    latitude,
    longitude,
  });
  return response.data;
};
