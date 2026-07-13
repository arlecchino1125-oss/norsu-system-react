export type R2ClientConfig = {
    endpoint: string;
    bucket: string;
};

export type AwsFetchSigner = {
    sign(input: string, init: RequestInit & { aws?: { signQuery?: boolean; allHeaders?: boolean } }): Promise<Request>;
    fetch(input: string, init?: RequestInit): Promise<Response>;
};

const requireObjectKey = (value: string) => {
    const key = String(value || '').trim();
    if (!key || key.startsWith('/') || key.includes('..') || key.includes('\\') || key.includes('//')) {
        throw new Error('Invalid R2 object key.');
    }
    return key;
};

const encodeObjectKey = (key: string) => key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const createR2Client = (config: R2ClientConfig, aws: AwsFetchSigner) => {
    const endpoint = String(config.endpoint || '').trim().replace(/\/+$/, '');
    const bucket = String(config.bucket || '').trim();
    if (!/^https:\/\//i.test(endpoint) || !bucket || bucket.includes('/')) {
        throw new Error('Invalid R2 configuration.');
    }

    const objectUrl = (objectKey: string) =>
        `${endpoint}/${encodeURIComponent(bucket)}/${encodeObjectKey(requireObjectKey(objectKey))}`;

    const signQuery = async (
        objectKey: string,
        method: 'GET' | 'PUT',
        expiresInSeconds: number,
        headers?: Record<string, string>
    ) => {
        if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 604_800) {
            throw new Error('Invalid signed URL expiry.');
        }
        const url = new URL(objectUrl(objectKey));
        url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
        const signed = await aws.sign(url.toString(), {
            method,
            ...(headers ? { headers } : {}),
            aws: { signQuery: true, ...(headers ? { allHeaders: true } : {}) }
        });
        return signed.url;
    };

    return {
        signUpload: (objectKey: string, contentType: string, expiresInSeconds: number) =>
            signQuery(objectKey, 'PUT', expiresInSeconds, { 'Content-Type': contentType }),

        signView: (objectKey: string, expiresInSeconds: number) =>
            signQuery(objectKey, 'GET', expiresInSeconds),

        headObject: async (objectKey: string) => {
            const response = await aws.fetch(objectUrl(objectKey), { method: 'HEAD' });
            if (response.status === 404) throw new Error('Uploaded object was not found.');
            if (!response.ok) throw new Error('Unable to verify the uploaded object.');

            const contentType = String(response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
            const size = Number(response.headers.get('Content-Length'));
            if (!contentType || !Number.isFinite(size) || size < 0) {
                throw new Error('Uploaded object metadata is incomplete.');
            }
            return { contentType, size };
        },

        deleteObject: async (objectKey: string) => {
            const response = await aws.fetch(objectUrl(objectKey), { method: 'DELETE' });
            if (!response.ok && response.status !== 404) {
                throw new Error('Unable to remove the invalid uploaded object.');
            }
        }
    };
};
