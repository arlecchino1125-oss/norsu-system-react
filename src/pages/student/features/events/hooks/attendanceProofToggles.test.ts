import { describe, expect, it } from 'vitest';
import { isGeofenceEnforced, isPhotoRequired } from './useStudentEventActions';

describe('attendance proof toggles', () => {
    it('keeps legacy events (no flags) on photo-required, geofence-off', () => {
        expect(isPhotoRequired({})).toBe(true);
        expect(isGeofenceEnforced({})).toBe(false);
    });

    it('honours the staff toggles', () => {
        expect(isPhotoRequired({ require_photo: false })).toBe(false);
        expect(isGeofenceEnforced({ require_geolocation: true })).toBe(true);
    });
});
