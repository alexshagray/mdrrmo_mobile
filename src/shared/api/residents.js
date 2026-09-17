import apiClient from './client';

export const getResidentProfileApi = async () => {
  const response = await apiClient.get('/resident/profile');
  return response.data;
};

export const updateResidentPersonalApi = async (data) => {
  const response = await apiClient.put('/resident/profile/personal', data);
  return response.data;
};

export const updateResidentEmergencyApi = async (data) => {
  const response = await apiClient.put('/resident/profile/emergency', data);
  return response.data;
};

export const uploadResidentPhotoApi = async (formData) => {
  const response = await apiClient.post('/resident/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const changeResidentPasswordApi = async (data) => {
  const response = await apiClient.put('/resident/profile/password', data);
  return response.data;
};

export const changeResponderPasswordApi = async (data) => {
  const response = await apiClient.put('/responder/profile/password', data);
  return response.data;
};

export const getBarangaysApi = async () => {
  const response = await apiClient.get('/barangays');
  return response.data;
};
