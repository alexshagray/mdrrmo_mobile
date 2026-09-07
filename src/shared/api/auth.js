import apiClient from './client';

export const loginApi = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

export const logoutApi = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const getUserApi = async () => {
  const response = await apiClient.get('/auth/user');
  return response.data;
};

export const updatePushTokenApi = async (token) => {
  const response = await apiClient.post('/auth/push-token', { token });
  return response.data;
};
