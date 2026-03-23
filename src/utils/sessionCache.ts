type CachedValue<T> = {
    value: T;
    expiresAt: number;
};

const canUseSessionStorage = () =>
    typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const readSessionCache = <T>(key: string): T | null => {
    if (!canUseSessionStorage()) {
        return null;
    }

    try {
        const rawValue = window.sessionStorage.getItem(key);
        if (!rawValue) {
            return null;
        }

        const parsed = JSON.parse(rawValue) as CachedValue<T>;
        if (!parsed || typeof parsed !== 'object' || typeof parsed.expiresAt !== 'number') {
            window.sessionStorage.removeItem(key);
            return null;
        }

        if (parsed.expiresAt <= Date.now()) {
            window.sessionStorage.removeItem(key);
            return null;
        }

        return parsed.value ?? null;
    } catch {
        window.sessionStorage.removeItem(key);
        return null;
    }
};

export const writeSessionCache = <T>(key: string, value: T, ttlMs: number) => {
    if (!canUseSessionStorage() || !Number.isFinite(ttlMs) || ttlMs <= 0) {
        return;
    }

    const payload: CachedValue<T> = {
        value,
        expiresAt: Date.now() + ttlMs
    };

    try {
        window.sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // Ignore storage write failures.
    }
};

export const clearSessionCache = (key: string) => {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.removeItem(key);
};
