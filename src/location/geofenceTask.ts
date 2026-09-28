import type { GeofencingEventType, LocationRegion } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { GEOFENCE_TASK, handleGeofenceEvent } from './locationService';

/**
 * Background geofence handler. Must be defined at module scope during app
 * start-up (imported from the root layout) so the OS can deliver events after
 * relaunching the app in the background.
 */
if ((Platform.OS === 'ios' || Platform.OS === 'android') && !TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask<{ eventType: GeofencingEventType; region: LocationRegion }>(GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data?.region) return;
    try {
      await handleGeofenceEvent(data.eventType, data.region);
    } catch (e) {
      console.warn('[geofence] event failed', e);
    }
  });
}
