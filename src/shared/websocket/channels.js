/**
 * Dynamic channel generators to ensure centralized and consistent 
 * channel string building across the application.
 */

// User specific channels
export const getPrivateUserChannel = (userId) => `private-App.Models.User.${userId}`;

// Resident channels
export const getPrivateResidentChannel = (residentId) => `private-resident.${residentId}`;

// Responder channels
export const getPrivateResponderChannel = (responderId) => `private-responder.${responderId}`;

// Dispatch and Incident channels
export const getPrivateDispatchChannel = (dispatchId) => `private-dispatch.${dispatchId}`;
export const getPrivateIncidentChannel = (incidentId) => `private-incident.${incidentId}`;

// System Notification channel
export const getPrivateNotificationChannel = (userId) => `private-notifications.${userId}`;
