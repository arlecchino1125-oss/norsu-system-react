// Versioned localStorage keys. Bump the :vN suffix whenever the stored shape
// changes so old saved data is ignored instead of crashing JSON.parse on load.
export const APP_SESSION_STORAGE_KEY = 'norsu_session:v1';
export const CARE_STAFF_NOTES_STORAGE_KEY = 'care_staff_notes:v1';

// v1 only renamed the keys (same shape), so carry data saved under the old
// unversioned name forward once, then drop the old entry.
export const migrateLegacyStorageKey = (legacyKey: string, versionedKey: string) => {
    if (typeof window === 'undefined') return;
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue === null) return;
    if (window.localStorage.getItem(versionedKey) === null) {
        window.localStorage.setItem(versionedKey, legacyValue);
    }
    window.localStorage.removeItem(legacyKey);
};
