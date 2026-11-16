import apiClient from './client';

export interface SystemNotificationItem {
  id: number;
  user_id: number;
  incident_id: number | null;
  dispatch_id: number | null;
  title: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'archived';
  data: {
    notification_id?: string;
    event_type?: string;
    title?: string;
    message?: string;
    incident_id?: string;
    dispatch_id?: string;
    recipient_user_id?: string;
    incident_type?: string;
    barangay?: string;
    location?: string;
    dispatch_time?: string;
    status?: string;
    [key: string]: any;
  } | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  incident?: any;
  dispatch?: any;
}

export interface ResponderNotificationsResponse {
  success: boolean;
  notifications: SystemNotificationItem[];
  total: number;
  unread_count: number;
}

export const getResponderNotificationsApi = async (page = 1): Promise<ResponderNotificationsResponse> => {
  try {
    const response = await apiClient.get<ResponderNotificationsResponse>(`/responder/notifications?page=${page}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      notifications: [],
      total: 0,
      unread_count: 0,
    };
  }
};

export const markNotificationReadApi = async (id: number): Promise<boolean> => {
  try {
    const response = await apiClient.post(`/responder/notifications/${id}/read`);
    return Boolean(response.data?.success);
  } catch (error) {
    return false;
  }
};

export const markAllNotificationsReadApi = async (): Promise<boolean> => {
  try {
    const response = await apiClient.post('/responder/notifications/read-all');
    return Boolean(response.data?.success);
  } catch (error) {
    return false;
  }
};
