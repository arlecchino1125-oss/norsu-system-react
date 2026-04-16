import { supabase } from '../lib/supabase';

const HTTP_URL_PATTERN = /^https?:\/\//i;

export const isStoredAssetUrl = (value: string | null | undefined) =>
    HTTP_URL_PATTERN.test(String(value || '').trim());

export const getStoredAssetEntries = (value: string | null | undefined) => {
    const normalized = String(value || '').trim();
    if (!normalized) return [] as string[];

    try {
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed)) {
            return parsed
                .map((entry) => String(entry || '').trim())
                .filter(Boolean);
        }
    } catch {
        // Fall back to the raw string when the column is not JSON.
    }

    return [normalized];
};

export const getStoredAssetLabel = (value: string | null | undefined, fallback = 'file') => {
    const normalized = String(value || '').trim();
    if (!normalized) return fallback;

    const withoutQuery = normalized.split('?')[0];
    const segments = withoutQuery.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return decodeURIComponent(lastSegment || fallback);
};

export const resolveStoredAssetUrl = async (
    bucket: string,
    value: string | null | undefined,
    expiresInSeconds = 3600
) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;

    if (isStoredAssetUrl(normalized)) {
        return normalized;
    }

    const path = normalized.replace(/^\/+/, '');
    const { data: signedData, error: signedError } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

    if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData?.publicUrl || null;
};

export const openStoredAsset = async (
    bucket: string,
    value: string | null | undefined,
    expiresInSeconds = 3600
) => {
    const resolvedUrl = await resolveStoredAssetUrl(bucket, value, expiresInSeconds);
    if (!resolvedUrl) {
        throw new Error('Unable to open the selected file.');
    }

    const newWindow = window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
        newWindow.opener = null;
    }

    return resolvedUrl;
};

export const parseCareNotesPayload = (value: string | null | undefined) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return {
            notes: '',
            letterReference: null as string | null
        };
    }

    try {
        const parsed = JSON.parse(normalized);
        return {
            notes: String(parsed?.notes || ''),
            letterReference: parsed?.letter_path || parsed?.letter_url || null
        };
    } catch {
        return {
            notes: normalized,
            letterReference: null as string | null
        };
    }
};
