import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@mdrrmo_resident_notifications';

export const getStoredNotifications = async () => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load notifications from storage:', e);
    return [];
  }
};

export const saveNotifications = async (notifications) => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications to storage:', e);
  }
};

export const addNotification = async (notification) => {
  try {
    const list = await getStoredNotifications();
    // Avoid duplicate IDs
    const exists = list.some((n) => n.id === notification.id);
    if (exists) return list;

    const updated = [notification, ...list];
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to add notification:', e);
    return [];
  }
};

export const markNotificationRead = async (id) => {
  try {
    const list = await getStoredNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to mark notification read:', e);
    return [];
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const list = await getStoredNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to mark all notifications read:', e);
    return [];
  }
};

export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    return [];
  } catch (e) {
    console.error('Failed to clear notifications:', e);
    return [];
  }
};

export const generateNotificationsFromReports = (reportsList, readMap = new Map()) => {
  const generatedNotifs = [];

  // Default system announcement
  generatedNotifs.push({
    id: 'system-opol-ems-online',
    title: 'OPOL RESQ Emergency Services Online',
    message: 'OPOL RESQ Emergency Medical Response System by MDRRMO Opol is active 24/7. In life-threatening emergencies, call 0917-707-6765.',
    type: 'system',
    timestamp: new Date().toISOString(),
    read: Boolean(readMap.get('system-opol-ems-online')),
  });

  const list = Array.isArray(reportsList) ? reportsList : [];
  list.forEach((r) => {
    const idCode = `INC-2026-${r.id?.toString().padStart(5, '0')}`;
    const typeName = r.incident_type?.name || r.incident_type || 'Medical Emergency';
    const activeDispatch = r.active_dispatch;
    const dStatus = activeDispatch?.dispatch_status;

    // Base notification: Report Received
    const receivedId = `notif-${r.id}-received`;
    generatedNotifs.push({
      id: receivedId,
      reportId: r.id,
      title: `Emergency Report Received (${idCode})`,
      message: `Your report for "${typeName}" was received by MDRRMO Command Center and placed in dispatch queue.`,
      type: 'received',
      timestamp: r.reported_at || r.created_at,
      read: Boolean(readMap.get(receivedId)),
    });

    // Verification or Rejection
    if (r.incident_status === 'rejected') {
      const rejectedId = `notif-${r.id}-rejected`;
      const reason = r.verification_remarks || r.rejection_reason || 'Does not qualify for emergency vehicle dispatch.';
      generatedNotifs.push({
        id: rejectedId,
        reportId: r.id,
        title: `Report Not Approved (${idCode})`,
        message: `Dispatcher Review: Declined. Reason: ${reason}`,
        type: 'rejected',
        timestamp: r.updated_at || r.reported_at,
        read: Boolean(readMap.get(rejectedId)),
        rejectionReason: reason,
      });
    } else if (['verified', 'assigned', 'responding', 'resolved'].includes(r.incident_status)) {
      const verifiedId = `notif-${r.id}-verified`;
      generatedNotifs.push({
        id: verifiedId,
        reportId: r.id,
        title: `Report Verified (${idCode})`,
        message: `Command Center has approved your emergency report. Resources are mobilized.`,
        type: 'verified',
        timestamp: r.verified_at || r.updated_at || r.reported_at,
        read: Boolean(readMap.get(verifiedId)),
      });
    }

    // Assigned
    if (activeDispatch || ['assigned', 'responding'].includes(r.incident_status)) {
      const assignedId = `notif-${r.id}-assigned`;
      const unit = activeDispatch?.ambulance?.vehicle_name || 'Ambulance Unit';
      generatedNotifs.push({
        id: assignedId,
        reportId: r.id,
        title: `Responder Assigned (${idCode})`,
        message: `${unit} has been assigned to your emergency report and is preparing departure.`,
        type: 'assigned',
        timestamp: activeDispatch?.created_at || r.updated_at,
        read: Boolean(readMap.get(assignedId)),
      });
    }

    // En route
    if (['en_route', 'arrived_on_scene', 'completed'].includes(dStatus)) {
      const enRouteId = `notif-${r.id}-en_route`;
      generatedNotifs.push({
        id: enRouteId,
        reportId: r.id,
        title: `Responder En Route (${idCode})`,
        message: `Emergency response unit is traveling to your reported location. Track live on the map.`,
        type: 'en_route',
        timestamp: activeDispatch?.updated_at || r.updated_at,
        read: Boolean(readMap.get(enRouteId)),
      });
    }

    // Arrived
    if (['arrived_on_scene', 'completed'].includes(dStatus)) {
      const arrivedId = `notif-${r.id}-arrived`;
      generatedNotifs.push({
        id: arrivedId,
        reportId: r.id,
        title: `Responders On Scene (${idCode})`,
        message: `Emergency medical team has arrived at your emergency scene.`,
        type: 'arrived',
        timestamp: activeDispatch?.updated_at || r.updated_at,
        read: Boolean(readMap.get(arrivedId)),
      });
    }

    // Completed
    if (r.incident_status === 'resolved' || dStatus === 'completed') {
      const compId = `notif-${r.id}-completed`;
      generatedNotifs.push({
        id: compId,
        reportId: r.id,
        title: `Emergency Mission Completed (${idCode})`,
        message: `Patient care and transport concluded successfully. Stay safe!`,
        type: 'completed',
        timestamp: r.resolved_at || r.updated_at,
        read: Boolean(readMap.get(compId)),
      });
    }
  });

  generatedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return generatedNotifs;
};

export const getUnreadNotificationsCount = async (reportsList) => {
  try {
    const stored = await getStoredNotifications();
    const readMap = new Map();
    stored.forEach((item) => {
      if (item?.id && item?.read) readMap.set(item.id, true);
    });
    const notifs = generateNotificationsFromReports(reportsList, readMap);
    return notifs.filter((n) => !n.read).length;
  } catch (e) {
    return 0;
  }
};
