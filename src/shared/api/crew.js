import apiClient from './client';

export const getCrewMembers = async () => {
  const response = await apiClient.get('/responder/crew');
  return response.data;
};

export const updateDutyStatus = async (status) => {
  const response = await apiClient.post('/responder/status', { status });
  return response.data;
};
