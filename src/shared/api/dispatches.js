import apiClient from './client';

export const getActiveDispatches = async () => {
  const response = await apiClient.get('/responder/dispatches');
  return response.data;
};

export const getDispatchHistory = async (page = 1, type = 'all', date = '') => {
  let url = `/responder/history?page=${page}&type=${type}`;
  if (date) url += `&date=${date}`;
  
  const response = await apiClient.get(url);
  return response.data;
};

export const createWalkInDispatch = async (data = { latitude: 0, longitude: 0 }) => {
  const response = await apiClient.post('/responder/dispatches/walk-in', data);
  return response.data;
};

export const acceptDispatch = async (dispatchId) => {
  const response = await apiClient.post(`/responder/dispatches/${dispatchId}/accept`);
  return response.data;
};

export const updateDispatchStatus = async (dispatchId, status, coords = null) => {
  const payload = { status };
  if (coords) {
    payload.latitude = coords.latitude;
    payload.longitude = coords.longitude;
  }
  const response = await apiClient.post(`/responder/dispatches/${dispatchId}/status`, payload);
  return response.data;
};

export const updatePcr = async (dispatchId, pcrData) => {
  const response = await apiClient.post(`/responder/dispatches/${dispatchId}/pcr`, pcrData);
  return response.data;
};

export const submitPcr = async (dispatchId) => {
  const response = await apiClient.post(`/responder/dispatches/${dispatchId}/pcr/submit`);
  return response.data;
};
