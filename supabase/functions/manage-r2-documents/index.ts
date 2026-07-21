import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { createR2Client } from '../_shared/r2Client.ts';
import {
    type R2Actor,
    type R2DocumentCategory,
    type R2Resource,
    type R2StaffRole
} from '../_shared/r2DocumentPolicy.ts';
import {
    handleR2DocumentRequest,
    type R2DocumentLocator,
    type ResolvedViewResource
} from './handler.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const requiredEnv = (name: string) => {
    const value = String(Deno.env.get(name) || '').trim();
    if (!value) throw new Error(`Missing server configuration: ${name}.`);
    return value;
};

const supabaseUrl = requiredEnv('SUPABASE_URL');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const r2AccountId = requiredEnv('R2_ACCOUNT_ID');
const r2Endpoint = requiredEnv('R2_ENDPOINT');
if (!r2Endpoint.includes(r2AccountId)) {
    throw new Error('R2 endpoint does not match the configured account.');
}

const aws = new AwsClient({
    accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
    retries: 2
});
const r2 = createR2Client({
    endpoint: r2Endpoint,
    bucket: requiredEnv('R2_BUCKET')
}, aws);

const PROFILE_FIELDS: Partial<Record<R2DocumentCategory, string>> = {
    'profile-photo': 'profile_picture_url',
    'claim-pwd': 'pwd_document_url',
    'claim-indigenous': 'ip_document_url',
    'claim-four-ps': 'four_ps_document_url',
    'claim-solo-parent': 'solo_parent_document_url',
    'claim-senior-citizen': 'senior_citizen_document_url'
};
const DEPARTMENT_VISIBLE_SUPPORT_STATUSES = new Set([
    'Forwarded to Dept',
    'Visit Scheduled',
    'Resolved by Dept',
    'Referred to CARE',
    'Rejected',
    'Approved',
    'Completed'
]);
const STAFF_ROLES = new Set<R2StaffRole>(['Admin', 'Care Staff', 'Registrar', 'Department Head']);

const withCors = async (response: Response) => {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
    return new Response(response.body, { status: response.status, headers });
};

const bearerToken = (request: Request) => {
    const authorization = String(request.headers.get('Authorization') || '').trim();
    return authorization.toLowerCase().startsWith('bearer ')
        ? authorization.slice('bearer '.length).trim()
        : '';
};

const getStudentBySchoolId = async (studentId: string) => {
    const { data, error } = await adminClient
        .from('students')
        .select('id, student_id, department, auth_user_id')
        .eq('student_id', studentId)
        .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error('Student record not found.');
    return data;
};

const authenticate = async (request: Request): Promise<R2Actor | null> => {
    const token = bearerToken(request);
    if (!token) return null;
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData?.user?.id) return null;

    const [studentResult, staffResult] = await Promise.all([
        adminClient
            .from('students')
            .select('id, department')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle(),
        adminClient
            .from('staff_accounts')
            .select('role, department, is_archived')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle()
    ]);
    if (studentResult.error) throw studentResult.error;
    if (staffResult.error) throw staffResult.error;
    if (studentResult.data && staffResult.data) throw new Error('Ambiguous account identity.');

    if (studentResult.data?.id) {
        return {
            kind: 'student',
            authUserId: authData.user.id,
            studentDbId: Number(studentResult.data.id),
            department: studentResult.data.department || null
        };
    }

    const role = String(staffResult.data?.role || '') as R2StaffRole;
    if (staffResult.data && !staffResult.data.is_archived && STAFF_ROLES.has(role)) {
        return {
            kind: 'staff',
            authUserId: authData.user.id,
            role,
            department: staffResult.data.department || null
        };
    }
    return null;
};

const resolveUploadResource = async (
    actor: R2Actor,
    input: Record<string, unknown>
): Promise<R2Resource> => {
    const category = String(input.category || '') as R2DocumentCategory;
    if (actor.kind === 'student' && actor.studentDbId) {
        if (category === 'attendance-proof') {
            const eventId = Number(input.eventId);
            const { data, error } = await adminClient.from('events').select('id').eq('id', eventId).maybeSingle();
            if (error) throw error;
            if (!data?.id) throw new Error('Event not found.');
            return {
                category,
                studentDbId: actor.studentDbId,
                department: actor.department,
                eventId: Number(data.id)
            };
        }
        return {
            category,
            studentDbId: actor.studentDbId,
            department: actor.department
        };
    }

    const requestId = Number(input.requestId);
    const { data: supportRequest, error } = await adminClient
        .from('support_requests')
        .select('id, student_id, department, status')
        .eq('id', requestId)
        .maybeSingle();
    if (error) throw error;
    if (!supportRequest?.id) throw new Error('Support request not found.');
    const student = await getStudentBySchoolId(supportRequest.student_id);
    return {
        category,
        studentDbId: Number(student.id),
        department: supportRequest.department || student.department || null,
        requestId: Number(supportRequest.id),
        supportStatus: String(supportRequest.status || ''),
        forwardedToDepartment: DEPARTMENT_VISIBLE_SUPPORT_STATUSES.has(String(supportRequest.status || ''))
    };
};

const parseStoredArray = (value: unknown) => {
    try {
        const parsed = JSON.parse(String(value || ''));
        return Array.isArray(parsed) ? parsed.flatMap((entry) => {
            const normalizedEntry = String(entry || '').trim();
            return normalizedEntry ? [normalizedEntry] : [];
        }) : [];
    } catch {
        return String(value || '').trim() ? [String(value).trim()] : [];
    }
};

const endorsementReference = (careNotes: unknown, careDocumentsUrl: unknown) => {
    try {
        const parsed = JSON.parse(String(careNotes || ''));
        const reference = String(parsed?.letter_path || parsed?.letter_url || '').trim();
        if (reference) return reference;
    } catch {
        // Legacy plain-text CARE notes contain no document reference.
    }
    return parseStoredArray(careDocumentsUrl)[0] || '';
};

const resolveViewResource = async (
    _actor: R2Actor,
    locator: R2DocumentLocator
): Promise<ResolvedViewResource> => {
    if (locator.category === 'profile-photo' || locator.category.startsWith('claim-')) {
        const field = PROFILE_FIELDS[locator.category as R2DocumentCategory];
        if (!field) throw new Error('Unsupported profile document.');
        const { data, error } = await adminClient
            .from('students')
            .select(`id, department, ${field}`)
            .eq('student_id', String(locator.studentId || '').trim())
            .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error('Student document not found.');
        return {
            resource: {
                category: locator.category as R2DocumentCategory,
                studentDbId: Number(data.id),
                department: data.department || null
            },
            storedReference: String(data[field] || ''),
            legacyBucket: locator.category === 'profile-photo' ? 'profile-pictures' : 'support_documents'
        };
    }

    if (locator.category === 'attendance-proof') {
        const { data, error } = await adminClient
            .from('event_attendance')
            .select('id, event_id, student_id, department, proof_url')
            .eq('id', Number(locator.attendanceId))
            .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error('Attendance proof not found.');
        const student = await getStudentBySchoolId(data.student_id);
        return {
            resource: {
                category: 'attendance-proof',
                studentDbId: Number(student.id),
                department: data.department || student.department || null,
                eventId: Number(data.event_id)
            },
            storedReference: String(data.proof_url || ''),
            legacyBucket: 'attendance_proofs'
        };
    }

    const { data, error } = await adminClient
        .from('support_requests')
        .select('id, student_id, department, status, documents_url, care_notes, care_documents_url')
        .eq('id', Number(locator.requestId))
        .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error('Support document not found.');
    const student = await getStudentBySchoolId(data.student_id);
    const forwardedToDepartment = DEPARTMENT_VISIBLE_SUPPORT_STATUSES.has(String(data.status || ''));
    const storedReference = locator.category === 'support-student'
        ? parseStoredArray(data.documents_url)[Number(locator.index)] || ''
        : endorsementReference(data.care_notes, data.care_documents_url);
    return {
        resource: {
            category: locator.category,
            studentDbId: Number(student.id),
            department: data.department || student.department || null,
            requestId: Number(data.id),
            forwardedToDepartment
        },
        storedReference,
        legacyBucket: 'support_documents'
    };
};

const handlerDependencies = {
    authenticate,
    resolveUploadResource,
    resolveViewResource,
    signUpload: r2.signUpload,
    signView: r2.signView,
    signLegacyStorage: async (bucket: string, path: string, expiresInSeconds: number) => {
        const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
        if (error || !data?.signedUrl) throw error || new Error('Unable to sign legacy document.');
        return data.signedUrl;
    },
    headObject: r2.headObject,
    deleteObject: r2.deleteObject,
    randomUuid: () => crypto.randomUUID(),
    now: () => new Date()
};

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
        return withCors(new Response(JSON.stringify({ success: false, error: 'Method not allowed.' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
    return withCors(await handleR2DocumentRequest(request, handlerDependencies));
});
