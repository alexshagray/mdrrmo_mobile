/**
 * Standardized event names mapping to backend Reverb events
 */
export const EVENTS = {
  // Dispatch Events
  INCOMING_DISPATCH: 'IncomingDispatchEvent',
  DISPATCH_ACCEPTED: 'DispatchAcceptedEvent',
  DISPATCH_CANCELLED: 'DispatchCancelledEvent',
  DISPATCH_COMPLETED: 'DispatchCompletedEvent',
  
  // Status Updates
  RESPONDER_STATUS_UPDATED: 'ResponderStatusUpdatedEvent',
  CREW_STATUS_UPDATED: 'CrewStatusUpdatedEvent',
  INCIDENT_STATUS_UPDATED: 'IncidentStatusUpdatedEvent',
  
  // Patient Records
  PCR_SUBMITTED: 'PatientCareRecordSubmittedEvent',
  
  // Tracking & Notifications
  LOCATION_UPDATED: 'LocationUpdatedEvent',
  NEW_NOTIFICATION: 'NewNotificationEvent',
};
