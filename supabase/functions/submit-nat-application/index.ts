import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { escapeHtml, sendEmail, trySendEmail } from '../_shared/emailService.ts';
import { hashNatPassword } from '../_shared/natPassword.ts';
import { generateRandomPassword } from '../_shared/randomPassword.ts';
import { requireValidTurnstile } from '../_shared/turnstile.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { sanitizeOptionalPlainText } from './plainText.ts';
import { validateNatSubmission } from './submissionValidation.ts';

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
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
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
    const validated = validateNatSubmission(body);
    const password = generateRandomPassword();
    const {
        firstName,
        lastName,
        dob,
        age,
        placeOfBirth,
        nationality,
        sex,
        civilStatus,
        reason,
        street,
        city,
        province,
        zipCode,
        mobile,
        email,
        priorityCourse,
        altCourse1,
        altCourse2,
        testDate
    } = validated;

    const referenceId = buildReferenceId();
    const payload: Record<string, unknown> = {
        reference_id: referenceId,
        first_name: firstName,
        last_name: lastName,
        middle_name: sanitizeOptionalPlainText(body.middle_name, { maxLength: 80 }),
        suffix: sanitizeOptionalPlainText(body.suffix, { maxLength: 20 }),
        dob,
        place_of_birth: placeOfBirth,
        age,
        sex,
        gender_identity: sanitizeOptionalPlainText(body.gender_identity, { maxLength: 40 }),
        civil_status: civilStatus,
        nationality,
        reason,
        street,
        city,
        province,
        zip_code: zipCode,
        mobile,
        email,
        facebook_url: sanitizeOptionalPlainText(body.facebook_url, { maxLength: 255 }),
        priority_course: priorityCourse,
        alt_course_1: altCourse1,
        alt_course_2: altCourse2,
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
        password,
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

        await requireValidTurnstile(
            body.captchaToken,
            Deno.env.get('TURNSTILE_SECRET_KEY')
        );

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
