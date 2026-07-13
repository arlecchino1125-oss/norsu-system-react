import {
    buildR2ObjectKey,
    canUploadR2Resource,
    canViewR2Resource,
    parseR2Reference,
    validateUploadMetadata,
    type R2Actor,
    type R2DocumentCategory,
    type R2Resource
} from '../_shared/r2DocumentPolicy.ts';

export type R2DocumentLocator =
    | { category: 'profile-photo' | 'claim-pwd' | 'claim-indigenous' | 'claim-four-ps' | 'claim-solo-parent' | 'claim-senior-citizen'; studentId: string }
    | { category: 'support-student'; requestId: number; index: number }
    | { category: 'support-endorsement'; requestId: number }
    | { category: 'attendance-proof'; attendanceId: number };

export type ResolvedViewResource = {
    resource: R2Resource;
    storedReference: string;
    legacyBucket?: string;
};

export type R2HandlerDependencies = {
    authenticate(request: Request): Promise<R2Actor | null>;
    resolveUploadResource(actor: R2Actor, input: Record<string, unknown>): Promise<R2Resource>;
    resolveViewResource(actor: R2Actor, locator: R2DocumentLocator): Promise<ResolvedViewResource>;
    signUpload(objectKey: string, contentType: string, expiresInSeconds: number): Promise<string>;
    signView(objectKey: string, expiresInSeconds: number): Promise<string>;
    signLegacyStorage(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
    headObject(objectKey: string): Promise<{ contentType: string; size: number }>;
    deleteObject(objectKey: string): Promise<void>;
    randomUuid(): string;
    now(): Date;
};

const CATEGORIES = new Set<R2DocumentCategory>([
    'profile-photo',
    'claim-pwd',
    'claim-indigenous',
    'claim-four-ps',
    'claim-solo-parent',
    'claim-senior-citizen',
    'support-student',
    'support-endorsement',
    'attendance-proof'
]);

class RequestError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
});

const readBody = async (request: Request) => {
    try {
        const value = await request.json();
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error();
        }
        return value as Record<string, unknown>;
    } catch {
        throw new RequestError('Invalid request body.');
    }
};

const requireCategory = (value: unknown) => {
    const category = String(value || '') as R2DocumentCategory;
    if (!CATEGORIES.has(category)) throw new RequestError('Invalid document category.');
    return category;
};

const requireObjectKey = (value: unknown) => {
    const objectKey = String(value || '').trim();
    if (!objectKey || objectKey.startsWith('/') || objectKey.includes('..') || objectKey.includes('\\')) {
        throw new RequestError('Invalid object reference.');
    }
    return objectKey;
};

const requireDocumentLocator = (value: unknown): R2DocumentLocator => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new RequestError('Invalid document locator.');
    }
    const locator = value as Record<string, unknown>;
    const category = String(locator.category || '');
    const positiveInteger = (input: unknown) => Number.isInteger(input) && Number(input) > 0;

    if (['profile-photo', 'claim-pwd', 'claim-indigenous', 'claim-four-ps', 'claim-solo-parent', 'claim-senior-citizen'].includes(category)) {
        if (typeof locator.studentId !== 'string' || !locator.studentId.trim()) {
            throw new RequestError('Invalid document locator.');
        }
        return { category, studentId: locator.studentId.trim() } as R2DocumentLocator;
    }
    if (category === 'support-student' && positiveInteger(locator.requestId) && Number.isInteger(locator.index) && Number(locator.index) >= 0) {
        return { category, requestId: Number(locator.requestId), index: Number(locator.index) };
    }
    if (category === 'support-endorsement' && positiveInteger(locator.requestId)) {
        return { category, requestId: Number(locator.requestId) };
    }
    if (category === 'attendance-proof' && positiveInteger(locator.attendanceId)) {
        return { category, attendanceId: Number(locator.attendanceId) };
    }
    throw new RequestError('Invalid document locator.');
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UUID_SEGMENT = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const EXTENSION_SEGMENT = '(?:jpg|png|webp|pdf)';
const MIGRATED_FILE_SEGMENT = '(?:(?:drive|supabase)-[A-Za-z0-9._-]+)';

const objectKeyMatchesResource = (
    objectKey: string,
    resource: R2Resource,
    allowMigratedKeys = false
) => {
    const studentPrefix = `students/${resource.studentDbId}`;
    const fileSegment = allowMigratedKeys
        ? `(?:${UUID_SEGMENT}|${MIGRATED_FILE_SEGMENT})`
        : UUID_SEGMENT;
    const supportGroupSegment = allowMigratedKeys && resource.requestId
        ? `(?:${UUID_SEGMENT}|${escapeRegex(String(resource.requestId))})`
        : UUID_SEGMENT;
    const categoryPatterns: Record<R2DocumentCategory, string> = {
        'profile-photo': `${studentPrefix}/profile/photo/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'claim-pwd': `${studentPrefix}/profile/claims/pwd/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'claim-indigenous': `${studentPrefix}/profile/claims/indigenous/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'claim-four-ps': `${studentPrefix}/profile/claims/four-ps/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'claim-solo-parent': `${studentPrefix}/profile/claims/solo-parent/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'claim-senior-citizen': `${studentPrefix}/profile/claims/senior-citizen/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'support-student': `${studentPrefix}/support/${supportGroupSegment}/student-documents/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'support-endorsement': `${studentPrefix}/support/${escapeRegex(String(resource.requestId || ''))}/endorsement/${fileSegment}\\.${EXTENSION_SEGMENT}`,
        'attendance-proof': `${studentPrefix}/events/${escapeRegex(String(resource.eventId || ''))}/attendance/${fileSegment}\\.${EXTENSION_SEGMENT}`
    };
    return new RegExp(`^${categoryPatterns[resource.category]}$`, 'i').test(objectKey);
};

const resolveAuthorizedViewUrl = async (
    actor: R2Actor,
    locator: R2DocumentLocator,
    deps: R2HandlerDependencies
) => {
    const resolved = await deps.resolveViewResource(actor, locator);
    if (!canViewR2Resource(actor, resolved.resource)) {
        throw new RequestError('Access denied.', 403);
    }

    const storedReference = String(resolved.storedReference || '').trim();
    if (!storedReference) throw new RequestError('Document not found.', 404);
    if (/^https?:\/\//i.test(storedReference)) return storedReference;

    const objectKey = parseR2Reference(storedReference);
    if (objectKey) {
        if (!objectKeyMatchesResource(objectKey, resolved.resource, true)) {
            throw new RequestError('Invalid object reference.', 403);
        }
        return deps.signView(objectKey, 300);
    }

    if (!resolved.legacyBucket) throw new RequestError('Invalid object reference.');
    return deps.signLegacyStorage(resolved.legacyBucket, storedReference.replace(/^\/+/, ''), 300);
};

const handleCreateUpload = async (
    actor: R2Actor,
    body: Record<string, unknown>,
    deps: R2HandlerDependencies
) => {
    const category = requireCategory(body.category);
    const contentType = String(body.contentType || '').trim().toLowerCase();
    const size = Number(body.size);
    const { extension } = validateUploadMetadata(category, contentType, size);
    const resource = await deps.resolveUploadResource(actor, { ...body, category });
    if (resource.category !== category || !canUploadR2Resource(actor, resource)) {
        throw new RequestError('Access denied.', 403);
    }

    const uploadGroupId = category === 'support-student'
        ? String(body.uploadGroupId || '').trim() || deps.randomUuid()
        : undefined;
    const objectKey = buildR2ObjectKey({
        category,
        studentDbId: resource.studentDbId,
        objectId: deps.randomUuid(),
        extension,
        uploadGroupId,
        requestId: resource.requestId,
        eventId: resource.eventId
    });
    const uploadUrl = await deps.signUpload(objectKey, contentType, 600);

    return json({
        success: true,
        uploadUrl,
        objectKey,
        contentType,
        ...(uploadGroupId ? { uploadGroupId } : {})
    });
};

const handleCompleteUpload = async (
    actor: R2Actor,
    body: Record<string, unknown>,
    deps: R2HandlerDependencies
) => {
    const category = requireCategory(body.category);
    const objectKey = requireObjectKey(body.objectKey);
    const resource = await deps.resolveUploadResource(actor, { ...body, category });
    if (
        resource.category !== category
        || !canUploadR2Resource(actor, resource)
        || !objectKeyMatchesResource(objectKey, resource)
    ) {
        throw new RequestError('Access denied.', 403);
    }

    const metadata = await deps.headObject(objectKey);
    try {
        const { extension } = validateUploadMetadata(category, metadata.contentType, metadata.size);
        if (!objectKey.toLowerCase().endsWith(`.${extension}`)) {
            throw new Error('File metadata does not match the object key.');
        }
    } catch {
        await deps.deleteObject(objectKey).catch(() => undefined);
        throw new RequestError('Uploaded file failed verification.');
    }

    return json({ success: true, storedReference: `r2:${objectKey}` });
};

const handleCreateView = async (
    actor: R2Actor,
    body: Record<string, unknown>,
    deps: R2HandlerDependencies
) => {
    const locator = requireDocumentLocator(body.locator);
    const url = await resolveAuthorizedViewUrl(actor, locator, deps);
    return json({
        success: true,
        url,
        expiresAt: new Date(deps.now().getTime() + 300_000).toISOString()
    });
};

const handleCreateViewBatch = async (
    actor: R2Actor,
    body: Record<string, unknown>,
    deps: R2HandlerDependencies
) => {
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (entries.length < 1 || entries.length > 100) throw new RequestError('Invalid document batch.');

    const urls: Record<string, string> = {};
    await Promise.all(entries.map(async (entry) => {
        if (!entry || typeof entry !== 'object') return;
        const key = String((entry as Record<string, unknown>).key || '').trim();
        if (!key) return;
        try {
            const locator = requireDocumentLocator((entry as Record<string, unknown>).locator);
            urls[key] = await resolveAuthorizedViewUrl(actor, locator, deps);
        } catch {
            // Each entry is authorized independently; denied entries are omitted.
        }
    }));

    return json({
        success: true,
        urls,
        expiresAt: new Date(deps.now().getTime() + 300_000).toISOString()
    });
};

export const handleR2DocumentRequest = async (request: Request, deps: R2HandlerDependencies) => {
    try {
        const actor = await deps.authenticate(request);
        if (!actor) throw new RequestError('Authentication required.', 401);
        const body = await readBody(request);

        if (body.action === 'create-upload') return await handleCreateUpload(actor, body, deps);
        if (body.action === 'complete-upload') return await handleCompleteUpload(actor, body, deps);
        if (body.action === 'create-view') return await handleCreateView(actor, body, deps);
        if (body.action === 'create-view-batch') return await handleCreateViewBatch(actor, body, deps);
        throw new RequestError('Invalid action.');
    } catch (error) {
        if (error instanceof RequestError) {
            return json({ success: false, error: error.message }, error.status);
        }
        return json({ success: false, error: 'Unable to process the document request.' }, 500);
    }
};
