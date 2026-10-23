import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSyncService } from './offlineSyncService';

const CACHED_MISSION_KEY = '@mdrrmo_cached_active_mission';
const CACHED_BREADCRUMBS_KEY = '@mdrrmo_cached_breadcrumbs';

export interface CachedMission {
  id: number | string;
  incident_id: number | string;
  dispatch_status: string;
  driver_id?: number | null;
  emt_id?: number | null;
  ambulance?: any;
  driver?: any;
  emt?: any;
  teamLeader?: any;
  crew?: any[];
  incident?: {
    id: number | string;
    incident_type?: any;
    priority?: string;
    place_of_incident?: string;
    incident_address?: string;
    location_code?: string;
    caller_phone_number?: string;
    description?: string;
    incident_latitude?: number | string;
    incident_longitude?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    reporter_latitude?: number | string;
    reporter_longitude?: number | string;
    reported_at?: string;
    created_at?: string;
    resident?: any;
    status?: string;
    incident_status?: string;
  };
  patient_care_record?: any;
  patientCareRecord?: any;
  _is_offline_cached?: boolean;
  _cached_at?: string;
  _has_pending_sync?: boolean;
  _pending_status?: string;
  _offline_accepted_at?: string;
  _offline_arrived_at?: string;
}

class OfflineMissionService {
  /**
   * Save active dispatch from server to local persistent storage
   */
  public async saveActiveMission(dispatch: any): Promise<void> {
    if (!dispatch || !dispatch.id) return;
    try {
      const missionToCache: CachedMission = {
        ...dispatch,
        _is_offline_cached: true,
        _cached_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHED_MISSION_KEY, JSON.stringify(missionToCache));
      console.log(`[OfflineMissionService] Cached active mission #${dispatch.id} to storage`);
    } catch (e) {
      console.error('[OfflineMissionService] Error caching active mission:', e);
    }
  }

  /**
   * Get currently cached active mission
   */
  public async getActiveMission(): Promise<CachedMission | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHED_MISSION_KEY);
      if (!raw) return null;
      const parsed: CachedMission = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.error('[OfflineMissionService] Error reading cached mission:', e);
      return null;
    }
  }

  /**
   * Clear cached mission (when mission is resolved/completed or cancelled)
   */
  public async clearActiveMission(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHED_MISSION_KEY);
      console.log('[OfflineMissionService] Cleared cached active mission');
    } catch (e) {
      console.error('[OfflineMissionService] Error clearing cached mission:', e);
    }
  }

  /**
   * Checks whether a mission is already available locally in offline storage
   */
  public async isMissionAvailableLocally(dispatchId: number | string): Promise<boolean> {
    const cached = await this.getActiveMission();
    return Boolean(cached && String(cached.id) === String(dispatchId));
  }

  /**
   * Accept an already synchronized mission while offline
   */
  public async acceptMissionOffline(dispatchId: number | string): Promise<CachedMission> {
    const cached = await this.getActiveMission();
    if (!cached || String(cached.id) !== String(dispatchId)) {
      throw new Error('Offline acceptance rejected: Unknown or unsynchronized mission.');
    }

    const nowIso = new Date().toISOString();
    const updated: CachedMission = {
      ...cached,
      dispatch_status: 'accepted',
      _has_pending_sync: true,
      _pending_status: 'accepted',
      _offline_accepted_at: nowIso,
    };

    if (updated.incident) {
      updated.incident.incident_status = 'responding';
    }

    await AsyncStorage.setItem(CACHED_MISSION_KEY, JSON.stringify(updated));

    // Queue operation for server synchronization
    await offlineSyncService.enqueue({
      action: 'ACCEPT_DISPATCH',
      dispatchId,
      payload: { accepted_at: nowIso },
    });

    return updated;
  }

  /**
   * Record mission status change while offline (en_route, arrived_on_scene, completed, cancelled)
   */
  public async updateStatusOffline(
    dispatchId: number | string,
    status: 'en_route' | 'arrived_on_scene' | 'completed' | 'cancelled',
    coords?: { latitude: number; longitude: number } | null
  ): Promise<CachedMission | null> {
    const cached = await this.getActiveMission();
    if (!cached || String(cached.id) !== String(dispatchId)) {
      console.warn(`[OfflineMissionService] Updating status for mission #${dispatchId} without local cache`);
    }

    const nowIso = new Date().toISOString();
    const updated: CachedMission = cached
      ? {
          ...cached,
          dispatch_status: status,
          _has_pending_sync: true,
          _pending_status: status,
        }
      : ({
          id: dispatchId,
          incident_id: 'unknown',
          dispatch_status: status,
          _has_pending_sync: true,
        } as any);

    if (coords?.latitude && coords?.longitude) {
      (updated as any).last_latitude = coords.latitude;
      (updated as any).last_longitude = coords.longitude;
    }

    if (status === 'arrived_on_scene') {
      updated._offline_arrived_at = nowIso;
    }

    if (status === 'completed' || status === 'cancelled') {
      // Retain offline copy marked as completed until synced
      await AsyncStorage.setItem(CACHED_MISSION_KEY, JSON.stringify(updated));
    } else {
      await AsyncStorage.setItem(CACHED_MISSION_KEY, JSON.stringify(updated));
    }

    // Queue operation for server synchronization
    await offlineSyncService.enqueue({
      action: 'UPDATE_STATUS',
      dispatchId,
      payload: {
        status,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        timestamp: nowIso,
      },
    });

    return updated;
  }

  /**
   * Store offline location breadcrumb
   */
  public async recordOfflineBreadcrumb(dispatchId: number | string, coords: { latitude: number; longitude: number; heading?: number | null; accuracy?: number | null }): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CACHED_BREADCRUMBS_KEY);
      let list: any[] = raw ? JSON.parse(raw) : [];

      list.push({
        dispatchId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading ?? null,
        accuracy: coords.accuracy ?? null,
        timestamp: new Date().toISOString(),
      });

      // Keep only up to 30 most recent breadcrumbs to preserve storage & transmission speed
      if (list.length > 30) {
        list = list.slice(list.length - 30);
      }

      await AsyncStorage.setItem(CACHED_BREADCRUMBS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[OfflineMissionService] Failed to record breadcrumb:', e);
    }
  }

  /**
   * Flush all recorded offline location breadcrumbs to the sync queue
   */
  public async flushBreadcrumbs(dispatchId: number | string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CACHED_BREADCRUMBS_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;

      const missionBreadcrumbs = list.filter((b) => String(b.dispatchId) === String(dispatchId));
      if (missionBreadcrumbs.length > 0) {
        await offlineSyncService.enqueue({
          action: 'HTTP',
          method: 'post',
          url: `/responder/dispatches/${dispatchId}/location`,
          payload: {
            locations: missionBreadcrumbs,
          },
        });
      }

      await AsyncStorage.removeItem(CACHED_BREADCRUMBS_KEY);
    } catch (e) {}
  }
}

export const offlineMissionService = new OfflineMissionService();
