import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import type { R2DocumentLocator } from '../services/r2DocumentService';

const HTTP_URL_PATTERN = /^https?:\/\//i;

const isStoredAssetUrl = (value: string | null | undefined) =>
    HTTP_URL_PATTERN.test(String(value || '').trim());

export const isR2Reference = (value: unknown) =>
    String(value || '').trim().startsWith('r2:');

type R2ViewResponse = {
    success: true;
    url: string;
    expiresAt: string;
};

type R2BulkViewResponse = {
    success: true;
    urls: Record<string, string | null>;
    expiresAt: string;
};

export type R2BulkLocatorEntry = {
    key: string;
    locator: R2DocumentLocator;
};

export const DOCUMENT_PREVIEW_EVENT = 'care:document-preview';

export type DocumentPreviewRequest = {
    url: string;
    storedValue: string;
    label: string;
    locator?: R2DocumentLocator;
};

const resolveR2DocumentUrl = async (locator?: R2DocumentLocator) => {
    if (!locator) throw new Error('Document authorization details are required.');
    const result = await invokeEdgeFunction<R2ViewResponse>('manage-r2-documents', {
        requireAuth: true,
        body: { action: 'create-view', locator },
        fallbackMessage: 'Unable to open the selected file.'
    });
    return result?.url || null;
};

export const getStoredAssetPath = (bucket: string, value: string | null | undefined) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';

    if (!isStoredAssetUrl(normalized)) {
        return normalized.replace(/^\/+/, '');
    }

    try {
        const url = new URL(normalized);
        const segments = url.pathname.split('/').filter(Boolean);
        const objectIndex = segments.findIndex((segment) => segment === 'object');
        const bucketSegment = segments[objectIndex + 2];

        if (objectIndex >= 0 && bucketSegment === bucket) {
            return decodeURIComponent(segments.slice(objectIndex + 3).join('/'));
        }
    } catch {
        return '';
    }

    return '';
};

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
    expiresInSeconds = 3600,
    locator?: R2DocumentLocator
) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;

    if (isR2Reference(normalized)) {
        return resolveR2DocumentUrl(locator);
    }

    const extractedPath = getStoredAssetPath(bucket, normalized);
    if (isStoredAssetUrl(normalized) && !extractedPath) {
        return normalized;
    }

    const path = extractedPath || normalized.replace(/^\/+/, '');
    const { data: signedData, error: signedError } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

    if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
    }

    if (isStoredAssetUrl(normalized)) {
        return normalized;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData?.publicUrl || null;
};

export const openStoredAsset = async (
    bucket: string,
    value: string | null | undefined,
    expiresInSeconds = 3600,
    locator?: R2DocumentLocator
) => {
    const resolvedUrl = await resolveStoredAssetUrl(bucket, value, expiresInSeconds, locator);
    if (!resolvedUrl) {
        throw new Error('Unable to open the selected file.');
    }

    window.dispatchEvent(new CustomEvent<DocumentPreviewRequest>(DOCUMENT_PREVIEW_EVENT, {
        detail: {
            url: resolvedUrl,
            storedValue: String(value || '').trim(),
            label: getStoredAssetLabel(value),
            locator
        }
    }));

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

export const resolveStoredAssetUrlsBulk = async (
    bucket: string,
    values: (string | null | undefined)[],
    expiresInSeconds = 3600,
    r2Entries: Record<string, R2BulkLocatorEntry> = {}
): Promise<Record<string, string | null>> => {
    const resultMap: Record<string, string | null> = {};
    if (!values || values.length === 0) return resultMap;

    // Filter unique normalized non-empty values
    const uniqueInputs = Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));

    const pathsToSign: string[] = [];
    const alreadyResolved: Record<string, string> = {};
    const pathToInputMap: Record<string, string[]> = {};
    const r2Inputs: string[] = [];

    for (const normalized of uniqueInputs) {
        if (isR2Reference(normalized)) {
            r2Inputs.push(normalized);
            continue;
        }
        const extractedPath = getStoredAssetPath(bucket, normalized);
        if (isStoredAssetUrl(normalized) && !extractedPath) {
            alreadyResolved[normalized] = normalized;
            continue;
        }

        const path = extractedPath || normalized.replace(/^\/+/, '');
        if (!pathToInputMap[path]) {
            pathToInputMap[path] = [];
            pathsToSign.push(path);
        }
        pathToInputMap[path].push(normalized);
    }

    // Request signed URLs for all pathsToSign in batches
    const batchSize = 100;
    const signedUrlsMap: Record<string, string> = {};

    if (r2Inputs.length > 0) {
        const entries = r2Inputs
            .map((value) => r2Entries[value])
            .filter((entry): entry is R2BulkLocatorEntry => Boolean(entry));
        if (entries.length > 0) {
            const result = await invokeEdgeFunction<R2BulkViewResponse>('manage-r2-documents', {
                requireAuth: true,
                body: { action: 'create-view-batch', entries },
                fallbackMessage: 'Unable to load private documents.'
            });
            for (const value of r2Inputs) {
                const entry = r2Entries[value];
                const url = entry ? result?.urls?.[entry.key] : null;
                if (url) resultMap[value] = url;
            }
        }
    }

    for (let i = 0; i < pathsToSign.length; i += batchSize) {
        const batch = pathsToSign.slice(i, i + batchSize);
        try {
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .createSignedUrls(batch, expiresInSeconds);

            if (!error && data) {
                for (const item of data) {
                    if (item.signedUrl) {
                        signedUrlsMap[item.path] = item.signedUrl;
                    }
                }
            }
        } catch (err) {
            console.error('Error batch signing URLs:', err);
        }
    }

    // Map everything back to the original unique inputs
    for (const normalized of uniqueInputs) {
        if (isR2Reference(normalized)) {
            resultMap[normalized] = resultMap[normalized] || null;
            continue;
        }
        if (alreadyResolved[normalized]) {
            resultMap[normalized] = alreadyResolved[normalized];
            continue;
        }

        const extractedPath = getStoredAssetPath(bucket, normalized);
        const path = extractedPath || normalized.replace(/^\/+/, '');

        const signedUrl = signedUrlsMap[path];
        if (signedUrl) {
            resultMap[normalized] = signedUrl;
        } else if (isStoredAssetUrl(normalized)) {
            resultMap[normalized] = normalized;
        } else {
            const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
            resultMap[normalized] = publicData?.publicUrl || null;
        }
    }

    // Populate resultMap for all original values
    const finalMap: Record<string, string | null> = {};
    for (const originalValue of values) {
        const key = originalValue === null || originalValue === undefined ? '' : String(originalValue);
        const normalized = key.trim();
        if (!normalized) {
            finalMap[key] = null;
        } else {
            finalMap[key] = resultMap[normalized] || null;
        }
    }

    return finalMap;
};
