import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { escapeHtml, sendEmail, trySendEmail } from '../_shared/emailService.ts';
import { hashNatPassword } from '../_shared/natPassword.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { sanitizeOptionalPlainText, sanitizePlainText } from './plainText.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const DEFAULT_NAT_SUBMISSION_MAX = 10;
const DEFAULT_NAT_SUBMISSION_WINDOW_SECONDS = 60 * 60;

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const getEnvPositiveInt = (key: string, fallback: number) => {
    const value = Number(Deno.env.get(key));
    return Number.isFinite(value) && value > 0
        ? Math.floor(value)
        : fallback;
};

const getAdminClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

const normalizeEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

const isValidEmail = (value: string | null) =>
    Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const isIsoDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value);

const toNullableDate = (value: unknown) => {
    const text = String(value || '').trim();
    return text && isIsoDate(text) ? text : null;
};

const toNullableInt = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (!text) return null;

    const numberValue = Number(text);
    return Number.isInteger(numberValue) && numberValue >= 0
        ? numberValue
        : null;
};

const buildReferenceId = () =>
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

const getNatRequirements = async (adminClient: any) => {
    const { data, error } = await adminClient
        .from('nat_requirements')
        .select('name')
        .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || [])
        .map((row: any) => String(row?.name || '').trim())
        .filter(Boolean);
};

// Sent server-side (not via the public send-email relay) so the recipient/credentials
// in this email always come from the row we just validated and inserted, never from a
// second, separately-trustable client call.
const sendNatSubmissionEmail = async (
    adminClient: any,
    details: {
        email: string;
        firstName: string;
        lastName: string;
        username: string;
        password: string;
        testDate: string;
        testTime?: string | null;
    }
) => {
    const requirements = await getNatRequirements(adminClient);
    const html = `
        <h2>Application Received</h2>
        <p>Dear ${escapeHtml(`${details.firstName} ${details.lastName}`)},</p>
        <p>Your application for the NORSU Admission Test has been received.</p>
        <p><strong>Test Date:</strong> ${escapeHtml(details.testDate || 'To be announced')}</p>
        ${details.testTime ? `<p><strong>Test Time:</strong> ${escapeHtml(details.testTime)}</p>` : ''}
        <p><strong>Venue:</strong> NORSU Main Campus</p>
        ${requirements.length > 0 ? `
        <hr />
        <h3>Requirements to Bring</h3>
        <ul>
          ${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}
        </ul>
        <p>Please bring these requirements on your scheduled test day.</p>
        ` : ''}
        <hr />
        <h3>Your Portal Credentials</h3>
        <p><strong>Username:</strong> ${escapeHtml(details.username)}</p>
        <p><strong>Password:</strong> ${escapeHtml(details.password)}</p>
        <p>Please save these credentials to login to the portal.</p>
      `;

    await sendEmail({
        to: details.email,
        subject: 'NAT Application Received',
        html,
        senderName: 'NORSU System',
        emailType: 'NAT_SUBMISSION'
    });
};

const normalizeDuplicateError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    if (error?.code === '23505' || message.includes('duplicate')) {
        return withStatus('This email address is already registered.', 409);
    }

    return error instanceof Error
        ? error
        : new Error('Failed to submit the NAT application.');
};

const submitNatApplication = async (adminClient: any, body: Record<string, unknown>) => {
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const firstName = sanitizePlainText(body.first_name, { maxLength: 80 });
    const lastName = sanitizePlainText(body.last_name, { maxLength: 80 });
    const mobile = sanitizePlainText(body.mobile, { maxLength: 24 });
    const priorityCourse = sanitizePlainText(body.priority_course, { maxLength: 120 });
    const testDate = String(body.test_date || '').trim();

    if (!firstName || !lastName) {
        throw withStatus('First name and last name are required.', 400);
    }

    if (!isValidEmail(email)) {
        throw withStatus('A valid email address is required.', 400);
    }

    if (!mobile) {
        throw withStatus('Mobile number is required.', 400);
    }

    if (!priorityCourse) {
        throw withStatus('Primary course choice is required.', 400);
    }

    if (!testDate || !isIsoDate(testDate)) {
        throw withStatus('A valid test date is required.', 400);
    }

    if (password.length < 8) {
        throw withStatus('A valid application password is required.', 400);
    }

    const referenceId = buildReferenceId();
    const payload: Record<string, unknown> = {
        reference_id: referenceId,
        first_name: firstName,
        last_name: lastName,
        middle_name: sanitizeOptionalPlainText(body.middle_name, { maxLength: 80 }),
        suffix: sanitizeOptionalPlainText(body.suffix, { maxLength: 20 }),
        dob: toNullableDate(body.dob),
        place_of_birth: sanitizeOptionalPlainText(body.place_of_birth, { maxLength: 120 }),
        age: toNullableInt(body.age),
        sex: sanitizeOptionalPlainText(body.sex, { maxLength: 20 }),
        gender_identity: sanitizeOptionalPlainText(body.gender_identity, { maxLength: 40 }),
        civil_status: sanitizeOptionalPlainText(body.civil_status, { maxLength: 40 }),
        nationality: sanitizeOptionalPlainText(body.nationality, { maxLength: 80 }),
        reason: sanitizeOptionalPlainText(body.reason, { maxLength: 500 }),
        street: sanitizeOptionalPlainText(body.street, { maxLength: 160 }),
        city: sanitizeOptionalPlainText(body.city, { maxLength: 80 }),
        province: sanitizeOptionalPlainText(body.province, { maxLength: 80 }),
        zip_code: sanitizeOptionalPlainText(body.zip_code, { maxLength: 20 }),
        mobile,
        email,
        facebook_url: sanitizeOptionalPlainText(body.facebook_url, { maxLength: 255 }),
        priority_course: priorityCourse,
        alt_course_1: sanitizeOptionalPlainText(body.alt_course_1, { maxLength: 120 }),
        alt_course_2: sanitizeOptionalPlainText(body.alt_course_2, { maxLength: 120 }),
        test_date: testDate,
        username: email,
        nat_password_hash: await hashNatPassword(password)
    };

    if (Object.prototype.hasOwnProperty.call(body, 'test_time')) {
        payload.test_time = sanitizeOptionalPlainText(body.test_time, { maxLength: 80 });
    }

    const { data, error } = await adminClient
        .from('applications')
        .insert([payload])
        .select('id, reference_id, email, test_date, test_time, username')
        .single();

    if (error) {
        throw normalizeDuplicateError(error);
    }

    const { emailSent, emailError } = await trySendEmail(
        () => sendNatSubmissionEmail(adminClient, {
            email,
            firstName,
            lastName,
            username: email,
            password,
            testDate,
            testTime: Object.prototype.hasOwnProperty.call(body, 'test_time')
                ? sanitizeOptionalPlainText(body.test_time, { maxLength: 80 })
                : null
        }),
        'Failed to send NAT submission email:'
    );

    return {
        success: true,
        application: data,
        referenceId,
        emailSent,
        emailError
    };
};

serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        const body = asObject(await request.json());
        const rateLimitResponse = await enforceRateLimit(request, {
            endpoint: 'submit-nat-application',
            action: 'submit',
            identifierMode: 'ip',
            maxRequests: getEnvPositiveInt('NAT_SUBMISSION_RATE_LIMIT_MAX', DEFAULT_NAT_SUBMISSION_MAX),
            windowSeconds: getEnvPositiveInt('NAT_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS', DEFAULT_NAT_SUBMISSION_WINDOW_SECONDS),
            message: 'Too many NAT applications have been submitted from this network. Please wait before submitting again.',
            corsHeaders
        });
        if (rateLimitResponse) return rateLimitResponse;

        const adminClient = getAdminClient();
        return json(await submitNatApplication(adminClient, body));
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'submit-nat-application' });
        const message = error instanceof Error ? error.message : 'Unexpected NAT application submission error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
