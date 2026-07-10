import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPortalUrl, buildStudentPortalLoginUrl, escapeHtml, maskEmailAddress, sendEmail } from '../_shared/emailService.ts';
import { captureEdgeException } from '../_shared/sentry.ts';

console.log("Email Function: Service started");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });

const withStatus = (message: string, status: number) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

const toText = (value: unknown, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

// Escaped for safe HTML interpolation; use toText() instead when a raw value is needed (e.g. building a URL).
const toSafeText = (value: unknown, fallback = '') => escapeHtml(toText(value, fallback));

const buildStaffPortalLoginUrl = (details: Record<string, unknown>) => {
  const role = toText(details.role);
  const fallbackPath = role === 'Admin'
    ? '/admin'
    : role === 'Department Head'
      ? '/department/login'
      : role === 'Care Staff'
        ? '/care-staff'
        : '/';
  const rawUrl =
    toText(details.loginUrl)
    || toText(Deno.env.get('STAFF_PORTAL_LOGIN_URL'))
    || toText(Deno.env.get('APP_BASE_URL'));

  return buildPortalUrl(rawUrl, fallbackPath);
};

// NAT_SUBMISSION and STUDENT_ACTIVATION are intentionally NOT handled here. Both used to
// be sent by an anonymous browser call to this function (an unauthenticated relay that also
// carried a plaintext password). They're now sent server-side, inline, by
// submit-nat-application/index.ts and activate-student-account/index.ts respectively, using
// values those functions already generated/validated themselves -- so this function no
// longer needs to expose those two templates to an unauthenticated caller at all.
const buildEmailTemplate = (type: string, name: string, details: Record<string, unknown>) => {
  const safeName = escapeHtml(name);
  let subject = '';
  let html = '';

  switch (type) {
    case 'NAT_RESULT':
      subject = `NAT Result Update: ${toText(details.status, 'Updated')}`;
      html = `
          <h2>NAT Result Update</h2>
          <p>Dear ${safeName},</p>
          <p>Your admission test status has been updated to: <strong>${toSafeText(details.status, 'Updated')}</strong>.</p>
          <p>Please login to the NAT Portal to view more details.</p>
        `;
      break;
    case 'APPLICANT_INTERVIEW_SCHEDULED':
      subject = 'NORSU Interview Schedule';
      html = `
          <h2>Interview Scheduled</h2>
          <p>Dear ${safeName},</p>
          <p>Your application for <strong>${toSafeText(details.course, 'your selected course')}</strong> has been scheduled for interview.</p>
          <p><strong>Interview Schedule:</strong> ${toSafeText(details.interviewDate, 'To be announced')}</p>
          ${toText(details.venue) ? `<p><strong>Venue:</strong> ${toSafeText(details.venue)}</p>` : ''}
          ${toText(details.panel) ? `<p><strong>Panel:</strong> ${toSafeText(details.panel)}</p>` : ''}
          <p><strong>Department:</strong> ${toSafeText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toSafeText(details.referenceId)}</p>` : ''}
          <p>Please be ready for the scheduled interview.</p>
        `;
      break;
    case 'APPLICANT_INTERVIEW_RESCHEDULED':
      subject = 'NORSU Interview Schedule Updated';
      html = `
          <h2>Interview Rescheduled</h2>
          <p>Dear ${safeName},</p>
          <p>Your interview schedule for <strong>${toSafeText(details.course, 'your selected course')}</strong> has been updated.</p>
          <p><strong>New Interview Schedule:</strong> ${toSafeText(details.interviewDate, 'To be announced')}</p>
          ${toText(details.venue) ? `<p><strong>Venue:</strong> ${toSafeText(details.venue)}</p>` : ''}
          ${toText(details.panel) ? `<p><strong>Panel:</strong> ${toSafeText(details.panel)}</p>` : ''}
          <p><strong>Department:</strong> ${toSafeText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toSafeText(details.referenceId)}</p>` : ''}
          <p>Please take note of your updated interview schedule.</p>
        `;
      break;
    case 'APPLICANT_APPROVED_FOR_ENROLLMENT':
      subject = 'Approved for Enrollment';
      html = `
          <h2>Application Approved</h2>
          <p>Dear ${safeName},</p>
          <p>Good news. Your application for <strong>${toSafeText(details.course, 'your selected course')}</strong> has been approved for enrollment.</p>
          <p><strong>Department:</strong> ${toSafeText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toSafeText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next enrollment and activation steps.</p>
        `;
      break;
    case 'APPLICANT_FORWARDED_TO_NEXT_CHOICE':
      subject = 'Application Forwarded to Next Course Choice';
      html = `
          <h2>Application Forwarded</h2>
          <p>Dear ${safeName},</p>
          <p>Your application was not advanced under your <strong>${toSafeText(details.fromChoice, 'current choice')}</strong>.</p>
          <p>It has now been forwarded to your <strong>${toSafeText(details.toChoice, 'next choice')}</strong>.</p>
          <p><strong>Next Course:</strong> ${toSafeText(details.nextCourse, 'your next course choice')}</p>
          <p><strong>Department:</strong> ${toSafeText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toSafeText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next department update.</p>
        `;
      break;
    case 'APPLICANT_UNSUCCESSFUL':
      subject = 'NORSU Application Update';
      html = `
          <h2>Application Update</h2>
          <p>Dear ${safeName},</p>
          <p>We are sorry to inform you that your application for <strong>${toSafeText(details.course, 'your selected course')}</strong> was not approved.</p>
          <p><strong>Department:</strong> ${toSafeText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toSafeText(details.referenceId)}</p>` : ''}
          <p>Thank you for your interest in NORSU.</p>
        `;
      break;
    case 'COUNSELING_STATUS_UPDATE': {
      const loginUrl = buildStudentPortalLoginUrl(toText(details.loginUrl));
      const status = toText(details.status, 'Updated');
      subject = `Counseling Update: ${status}`;
      html = `
          <h2>Counseling Request Update</h2>
          <p>Dear ${safeName},</p>
          <p>Your counseling request status has been updated to <strong>${escapeHtml(status)}</strong>.</p>
          ${toText(details.requestType) ? `<p><strong>Request Type:</strong> ${toSafeText(details.requestType)}</p>` : ''}
          ${toText(details.scheduleDate) ? `<p><strong>Schedule:</strong> ${toSafeText(details.scheduleDate)}</p>` : ''}
          ${toText(details.actor) ? `<p><strong>Updated By:</strong> ${toSafeText(details.actor)}</p>` : ''}
          ${toText(details.notes) ? `<p><strong>Notes:</strong> ${toSafeText(details.notes)}</p>` : ''}
          <p>You may log in to the Student Portal for more details.</p>
          <p><a href="${escapeHtml(loginUrl)}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'SUPPORT_STATUS_UPDATE': {
      const loginUrl = buildStudentPortalLoginUrl(toText(details.loginUrl));
      const status = toText(details.status, 'Updated');
      subject = `Support Request Update: ${status}`;
      html = `
          <h2>Support Request Update</h2>
          <p>Dear ${safeName},</p>
          <p>Your support request status has been updated to <strong>${escapeHtml(status)}</strong>.</p>
          ${toText(details.supportType) ? `<p><strong>Support Type:</strong> ${toSafeText(details.supportType)}</p>` : ''}
          ${toText(details.scheduleDate) ? `<p><strong>Schedule:</strong> ${toSafeText(details.scheduleDate)}</p>` : ''}
          ${toText(details.actor) ? `<p><strong>Updated By:</strong> ${toSafeText(details.actor)}</p>` : ''}
          ${toText(details.notes) ? `<p><strong>Notes:</strong> ${toSafeText(details.notes)}</p>` : ''}
          <p>You may log in to the Student Portal for more details.</p>
          <p><a href="${escapeHtml(loginUrl)}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'PEER_FACILITATOR_STATUS_UPDATE': {
      const loginUrl = buildStudentPortalLoginUrl(toText(details.loginUrl));
      const status = toText(details.status, 'updated').toLowerCase();
      const isApproved = status === 'approved';
      const isRejected = status === 'rejected';
      subject = isApproved
        ? 'CARE Peer Facilitator Application Approved'
        : isRejected
          ? 'CARE Peer Facilitator Application Update'
          : 'CARE Peer Facilitator Status Update';
      html = `
          <h2>CARE Peer Facilitator Application ${isApproved ? 'Approved' : 'Update'}</h2>
          <p>Dear ${safeName},</p>
          <p>${isApproved
            ? 'Congratulations. Your CARE Peer Facilitator application has been approved.'
            : `Your CARE Peer Facilitator application status has been updated to <strong>${escapeHtml(status)}</strong>.`
          }</p>
          ${toText(details.schoolYear) ? `<p><strong>School Year:</strong> ${toSafeText(details.schoolYear)}</p>` : ''}
          <p>Please log in to the Student Portal to view your application status and any next steps from the CARE Office.</p>
          <p><a href="${escapeHtml(loginUrl)}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'STAFF_ACCOUNT_CREATED': {
      const loginUrl = buildStaffPortalLoginUrl(details);
      subject = `NORSU ${toText(details.role, 'Staff')} Account Created`;
      html = `
          <h2>NORSU Staff Account Created</h2>
          <p>Dear ${safeName},</p>
          <p>Your <strong>${toSafeText(details.role, 'Staff')}</strong> portal account has been created.</p>
          ${toText(details.department) ? `<p><strong>Department:</strong> ${toSafeText(details.department)}</p>` : ''}
          <hr />
          <h3>Your Login Credentials</h3>
          <p><strong>Username:</strong> ${toSafeText(details.username)}</p>
          <p><strong>Password:</strong> ${toSafeText(details.password)}</p>
          <p><a href="${escapeHtml(loginUrl)}">Open Staff Portal</a></p>
        `;
      break;
    }
    default:
      return null;
  }

  return { subject, html };
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

const getBearerTokenFromHeader = (value: string | null) => {
  const headerValue = String(value || '').trim();
  if (!headerValue.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = headerValue.slice('Bearer '.length).trim();
  return token || null;
};

// Every remaining template type here is staff-triggered (Admin/Dept Head/Care Staff).
// This function used to have no auth check at all, making it a public relay that could
// send arbitrary NORSU-branded email (including, for STAFF_ACCOUNT_CREATED, a plaintext
// password) to any address. Require a linked, non-archived staff account before sending.
const requireLinkedStaffRequest = async (adminClient: any, request: Request) => {
  const accessToken = getBearerTokenFromHeader(
    request.headers.get('x-supabase-auth')
    || request.headers.get('x-client-authorization')
    || request.headers.get('Authorization')
  );
  if (!accessToken) {
    throw withStatus('Missing authenticated session.', 401);
  }

  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    throw withStatus('Unable to verify the current user.', 401);
  }

  const { data: staffAccount, error: staffError } = await adminClient
    .from('staff_accounts')
    .select('id, is_archived')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (staffError) throw staffError;
  if (!staffAccount || staffAccount.is_archived) {
    throw withStatus('A linked staff account is required to send this email.', 403);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, email, name, preview, ...details } = await req.json();
    const normalizedType = toText(type);
    const normalizedEmail = toText(email);
    const normalizedName = toText(name, 'Student');
    const isPreview = Boolean(preview);

    console.log(`Processing email type: ${normalizedType} for: ${maskEmailAddress(normalizedEmail)}`);

    if (!normalizedEmail) {
      return json({ error: 'Email is required.' }, 400);
    }

    const template = buildEmailTemplate(normalizedType, normalizedName, details);
    if (!template) {
      return json({ error: `Unsupported email type: ${normalizedType || 'Unknown'}` }, 400);
    }

    const adminClient = getAdminClient();
    await requireLinkedStaffRequest(adminClient, req);

    if (isPreview) {
      return json({
        success: true,
        preview: {
          type: normalizedType,
          email: normalizedEmail,
          name: normalizedName,
          subject: template.subject,
          html: template.html
        }
      });
    }

    await sendEmail({
      to: normalizedEmail,
      subject: template.subject,
      html: template.html,
      senderName: "NORSU System",
      emailType: normalizedType
    });

    return json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error("Handler Error:", error);
    await captureEdgeException(error, { endpoint: 'send-email' });
    const message = error instanceof Error ? error.message : 'Unexpected email error.';
    const status = typeof (error as { status?: unknown })?.status === 'number'
      ? Number((error as { status?: unknown }).status)
      : 500;
    return json({ error: message }, status);
  }
});
