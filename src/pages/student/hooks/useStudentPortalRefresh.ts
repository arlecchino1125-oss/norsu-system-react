import { useCallback, useEffect, useRef } from 'react';

// Staff write these datasets (schedules, new events/forms/scholarships), and the
// student portal has no realtime channels — so this TTL is the longest a student
// waits to see staff changes. Keep the staff-written ones uniform at 2 minutes.
const DATASET_REFRESH_TTL_MS = {
    activeVisit: 60 * 1000,
    counselingRequests: 2 * 60 * 1000,
    events: 2 * 60 * 1000,
    forms: 2 * 60 * 1000,
    history: 2 * 60 * 1000,
    notifications: 60 * 1000,
    scholarshipApplications: 2 * 60 * 1000,
    scholarships: 2 * 60 * 1000,
    supportRequests: 2 * 60 * 1000,
    visitReasons: 24 * 60 * 60 * 1000
} as const;

export type StudentDatasetRefreshKey = keyof typeof DATASET_REFRESH_TTL_MS;

type DatasetRefreshCacheEntry = {
    loaded: boolean;
    refreshedAt: number;
};

type StudentDatasetRefreshOptions = {
    force?: boolean;
};

const createStudentDatasetRefreshCache = (): Record<StudentDatasetRefreshKey, DatasetRefreshCacheEntry> => ({
    activeVisit: { loaded: false, refreshedAt: 0 },
    counselingRequests: { loaded: false, refreshedAt: 0 },
    events: { loaded: false, refreshedAt: 0 },
    forms: { loaded: false, refreshedAt: 0 },
    history: { loaded: false, refreshedAt: 0 },
    notifications: { loaded: false, refreshedAt: 0 },
    scholarshipApplications: { loaded: false, refreshedAt: 0 },
    scholarships: { loaded: false, refreshedAt: 0 },
    supportRequests: { loaded: false, refreshedAt: 0 },
    visitReasons: { loaded: false, refreshedAt: 0 }
});

export function useStudentPortalRefresh(studentId: string | null | undefined) {
    const datasetRefreshCacheRef = useRef<Record<StudentDatasetRefreshKey, DatasetRefreshCacheEntry> | null>(null);
    if (datasetRefreshCacheRef.current === null) {
        datasetRefreshCacheRef.current = createStudentDatasetRefreshCache();
    }

    useEffect(() => {
        datasetRefreshCacheRef.current = createStudentDatasetRefreshCache();
    }, [studentId]);

    return useCallback(async (
        key: StudentDatasetRefreshKey,
        refreshFn: () => Promise<unknown>,
        options?: StudentDatasetRefreshOptions
    ) => {
        const force = Boolean(options?.force);
        const cacheEntry = datasetRefreshCacheRef.current[key];
        const ttl = DATASET_REFRESH_TTL_MS[key];
        const now = Date.now();

        if (!force && cacheEntry.loaded && now - cacheEntry.refreshedAt < ttl) {
            return false;
        }

        await refreshFn();
        datasetRefreshCacheRef.current[key] = {
            loaded: true,
            refreshedAt: Date.now()
        };
        return true;
    }, []);
}
