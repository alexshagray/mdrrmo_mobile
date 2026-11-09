import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client';

const REPORTS_HISTORY_VIEWED_KEY = '@mdrrmo_resident_reports_history_viewed_at';

export const markReportsHistoryViewed = async () => {
  try {
    await AsyncStorage.setItem(REPORTS_HISTORY_VIEWED_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Failed to save reports history viewed timestamp:', e);
  }
};

export const getUnviewedReportsCount = async (reportsList = []) => {
  try {
    const list = Array.isArray(reportsList) ? reportsList : [];
    if (list.length === 0) return 0;

    const lastViewedStr = await AsyncStorage.getItem(REPORTS_HISTORY_VIEWED_KEY);
    if (!lastViewedStr) {
      // First time check: if no timestamp stored, consider current reports viewed upon first check
      // or return list.length until user taps it once
      return list.length;
    }

    const lastViewedTime = new Date(lastViewedStr).getTime();
    if (isNaN(lastViewedTime)) return 0;

    // Count only reports created or updated after the resident last checked the history
    const unviewed = list.filter((r) => {
      const reportTime = new Date(r.updated_at || r.created_at || r.reported_at || 0).getTime();
      return reportTime > lastViewedTime;
    });

    return unviewed.length;
  } catch (e) {
    console.error('Failed to get unviewed reports count:', e);
    return 0;
  }
};

export const getIncidentTypesApi = async () => {
  try {
    const response = await apiClient.get('/incident-types');
    return response.data;
  } catch (e) {
    console.warn('Failed to fetch incident types from server:', e);
    return null;
  }
};

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

export const cancelEmergencyReport = async (incidentId, reason = 'Cancelled by reporting resident') => {
  const response = await apiClient.post(`/resident/incidents/${incidentId}/cancel`, {
    reason,
  });
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
