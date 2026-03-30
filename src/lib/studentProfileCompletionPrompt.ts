const PROFILE_COMPLETION_HANDOFF_KEY = 'norsu_force_profile_completion_student_id';

type PendingProfileCompletionPayload = {
    studentId: string;
    profile: Record<string, unknown> | null;
};

const normalizeStudentId = (value: unknown) => String(value || '').trim();
const readStorageValue = (storage: Storage | undefined | null) => {
    if (!storage) return '';

    try {
        return storage.getItem(PROFILE_COMPLETION_HANDOFF_KEY) || '';
    } catch {
        return '';
    }
};
const writeStorageValue = (storage: Storage | undefined | null, value: string) => {
    if (!storage) return;

    try {
        storage.setItem(PROFILE_COMPLETION_HANDOFF_KEY, value);
    } catch {
        // Ignore storage write failures so activation can still continue.
    }
};
const removeStorageValue = (storage: Storage | undefined | null) => {
    if (!storage) return;

    try {
        storage.removeItem(PROFILE_COMPLETION_HANDOFF_KEY);
    } catch {
        // Ignore storage removal failures.
    }
};

const readPendingProfileCompletionPayload = (): PendingProfileCompletionPayload => {
    if (typeof window === 'undefined') {
        return { studentId: '', profile: null };
    }

    const rawValue = readStorageValue(window.sessionStorage) || readStorageValue(window.localStorage);
    if (!rawValue) {
        return { studentId: '', profile: null };
    }

    try {
        const parsed = JSON.parse(rawValue);
        return {
            studentId: normalizeStudentId(parsed?.studentId),
            profile: parsed?.profile && typeof parsed.profile === 'object'
                ? parsed.profile as Record<string, unknown>
                : null
        };
    } catch {
        return {
            studentId: normalizeStudentId(rawValue),
            profile: null
        };
    }
};

export const rememberPendingProfileCompletion = (
    studentId: unknown,
    profile?: Record<string, unknown> | null
) => {
    if (typeof window === 'undefined') return;

    const normalizedStudentId = normalizeStudentId(studentId);
    if (!normalizedStudentId) return;

    const serializedValue = JSON.stringify({
        studentId: normalizedStudentId,
        profile: profile && typeof profile === 'object' ? profile : null
    });

    writeStorageValue(window.sessionStorage, serializedValue);
    writeStorageValue(window.localStorage, serializedValue);
};

export const getPendingProfileCompletionStudentId = () =>
    readPendingProfileCompletionPayload().studentId;

export const getPendingProfileCompletionProfile = (studentId?: unknown) => {
    const payload = readPendingProfileCompletionPayload();
    const normalizedStudentId = normalizeStudentId(studentId);

    if (!payload.studentId) return null;
    if (normalizedStudentId && payload.studentId !== normalizedStudentId) return null;

    return payload.profile;
};

export const shouldForceProfileCompletionPrompt = (studentId: unknown) =>
    normalizeStudentId(studentId) !== ''
    && getPendingProfileCompletionStudentId() === normalizeStudentId(studentId);

export const clearPendingProfileCompletion = (studentId?: unknown) => {
    if (typeof window === 'undefined') return;

    const normalizedStudentId = normalizeStudentId(studentId);
    if (!normalizedStudentId || shouldForceProfileCompletionPrompt(normalizedStudentId)) {
        removeStorageValue(window.sessionStorage);
        removeStorageValue(window.localStorage);
    }
};
