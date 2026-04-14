import { sendEmailMessage } from "../../_shared/mailer.ts";

console.log("Email Function: Service started");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });

const toText = (value: unknown, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const toTextArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toText(item))
      .filter(Boolean);
  }

  const single = toText(value);
  return single ? [single] : [];
};

const buildPortalUrl = (rawUrl: string, fallbackPath: string) => {
  if (!rawUrl) {
    return `http://localhost:5173${fallbackPath}`;
  }

  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = fallbackPath;
    }
    return url.toString();
  } catch {
    return rawUrl.includes(fallbackPath)
      ? rawUrl
      : `${rawUrl.replace(/\/+$/, '')}${fallbackPath}`;
  }
};

const buildStudentPortalLoginUrl = (details: Record<string, unknown>) => {
  const rawUrl =
    toText(details.loginUrl)
    || toText(Deno.env.get('STUDENT_PORTAL_LOGIN_URL'))
    || toText(Deno.env.get('APP_BASE_URL'));

  return buildPortalUrl(rawUrl, '/student/login');
};

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

const htmlToPlainText = (value: string) =>
  String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const buildEmailTemplate = (type: string, name: string, details: Record<string, unknown>) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'NAT_SUBMISSION': {
      const natRequirements = toTextArray(details.requirements);
      subject = 'NAT Application Received';
      html = `
          <h2>Application Received</h2>
          <p>Dear ${name},</p>
          <p>Your application for the NORSU Admission Test has been received.</p>
          <p><strong>Test Date:</strong> ${toText(details.testDate, 'To be announced')}</p>
          ${toText(details.testTime) ? `<p><strong>Test Time:</strong> ${toText(details.testTime)}</p>` : ''}
          <p><strong>Venue:</strong> NORSU Main Campus</p>
          ${natRequirements.length > 0 ? `
          <hr />
          <h3>Requirements to Bring</h3>
          <ul>
            ${natRequirements.map((requirement) => `<li>${requirement}</li>`).join('')}
          </ul>
          <p>Please bring these requirements on your scheduled test day.</p>
          ` : ''}
          <hr />
          <h3>Your Portal Credentials</h3>
          <p><strong>Username:</strong> ${toText(details.username)}</p>
          <p><strong>Password:</strong> ${toText(details.password)}</p>
          <p>Please save these credentials to login to the portal.</p>
        `;
      break;
    }
    case 'NAT_RESULT':
      subject = `NAT Result Update: ${toText(details.status, 'Updated')}`;
      html = `
          <h2>NAT Result Update</h2>
          <p>Dear ${name},</p>
          <p>Your admission test status has been updated to: <strong>${toText(details.status, 'Updated')}</strong>.</p>
          <p>Please login to the NAT Portal to view more details.</p>
        `;
      break;
    case 'STUDENT_ACTIVATION': {
      const loginUrl = buildStudentPortalLoginUrl(details);
      subject = 'Student Account Activated - Login Instructions';
      html = `
          <h2>Welcome to NORSU Student Portal</h2>
          <p>Dear ${name},</p>
          <p>Your student account has been successfully activated.</p>
          <p>You can now access the Student Portal to manage your profile and use student services such as Needs Assessment, Counseling, Additional Support, Scholarships, Events, and Feedback.</p>
          <hr />
          <h3>Your Login Credentials</h3>
          <p><strong>Username (Student ID):</strong> ${toText(details.studentId)}</p>
          <p><strong>Password:</strong> ${toText(details.password)}</p>
          <p><em>This password was generated for your student portal account during activation.</em></p>
          <br />
          <p><a href="${loginUrl}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'APPLICANT_INTERVIEW_SCHEDULED':
      subject = 'NORSU Interview Schedule';
      html = `
          <h2>Interview Scheduled</h2>
          <p>Dear ${name},</p>
          <p>Your application for <strong>${toText(details.course, 'your selected course')}</strong> has been scheduled for interview.</p>
          <p><strong>Interview Schedule:</strong> ${toText(details.interviewDate, 'To be announced')}</p>
          ${toText(details.venue) ? `<p><strong>Venue:</strong> ${toText(details.venue)}</p>` : ''}
          ${toText(details.panel) ? `<p><strong>Panel:</strong> ${toText(details.panel)}</p>` : ''}
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Please be ready for the scheduled interview.</p>
        `;
      break;
    case 'APPLICANT_INTERVIEW_RESCHEDULED':
      subject = 'NORSU Interview Schedule Updated';
      html = `
          <h2>Interview Rescheduled</h2>
          <p>Dear ${name},</p>
          <p>Your interview schedule for <strong>${toText(details.course, 'your selected course')}</strong> has been updated.</p>
          <p><strong>New Interview Schedule:</strong> ${toText(details.interviewDate, 'To be announced')}</p>
          ${toText(details.venue) ? `<p><strong>Venue:</strong> ${toText(details.venue)}</p>` : ''}
          ${toText(details.panel) ? `<p><strong>Panel:</strong> ${toText(details.panel)}</p>` : ''}
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Please take note of your updated interview schedule.</p>
        `;
      break;
    case 'APPLICANT_APPROVED_FOR_ENROLLMENT':
      subject = 'Approved for Enrollment';
      html = `
          <h2>Application Approved</h2>
          <p>Dear ${name},</p>
          <p>Good news. Your application for <strong>${toText(details.course, 'your selected course')}</strong> has been approved for enrollment.</p>
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next enrollment and activation steps.</p>
        `;
      break;
    case 'APPLICANT_FORWARDED_TO_NEXT_CHOICE':
      subject = 'Application Forwarded to Next Course Choice';
      html = `
          <h2>Application Forwarded</h2>
          <p>Dear ${name},</p>
          <p>Your application was not advanced under your <strong>${toText(details.fromChoice, 'current choice')}</strong>.</p>
          <p>It has now been forwarded to your <strong>${toText(details.toChoice, 'next choice')}</strong>.</p>
          <p><strong>Next Course:</strong> ${toText(details.nextCourse, 'your next course choice')}</p>
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next department update.</p>
        `;
      break;
    case 'APPLICANT_UNSUCCESSFUL':
      subject = 'NORSU Application Update';
      html = `
          <h2>Application Update</h2>
          <p>Dear ${name},</p>
          <p>We are sorry to inform you that your application for <strong>${toText(details.course, 'your selected course')}</strong> was not approved.</p>
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Thank you for your interest in NORSU.</p>
        `;
      break;
    case 'COUNSELING_STATUS_UPDATE': {
      const loginUrl = buildStudentPortalLoginUrl(details);
      const status = toText(details.status, 'Updated');
      subject = `Counseling Update: ${status}`;
      html = `
          <h2>Counseling Request Update</h2>
          <p>Dear ${name},</p>
          <p>Your counseling request status has been updated to <strong>${status}</strong>.</p>
          ${toText(details.requestType) ? `<p><strong>Request Type:</strong> ${toText(details.requestType)}</p>` : ''}
          ${toText(details.scheduleDate) ? `<p><strong>Schedule:</strong> ${toText(details.scheduleDate)}</p>` : ''}
          ${toText(details.actor) ? `<p><strong>Updated By:</strong> ${toText(details.actor)}</p>` : ''}
          ${toText(details.notes) ? `<p><strong>Notes:</strong> ${toText(details.notes)}</p>` : ''}
          <p>You may log in to the Student Portal for more details.</p>
          <p><a href="${loginUrl}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'SUPPORT_STATUS_UPDATE': {
      const loginUrl = buildStudentPortalLoginUrl(details);
      const status = toText(details.status, 'Updated');
      subject = `Support Request Update: ${status}`;
      html = `
          <h2>Support Request Update</h2>
          <p>Dear ${name},</p>
          <p>Your support request status has been updated to <strong>${status}</strong>.</p>
          ${toText(details.supportType) ? `<p><strong>Support Type:</strong> ${toText(details.supportType)}</p>` : ''}
          ${toText(details.scheduleDate) ? `<p><strong>Schedule:</strong> ${toText(details.scheduleDate)}</p>` : ''}
          ${toText(details.actor) ? `<p><strong>Updated By:</strong> ${toText(details.actor)}</p>` : ''}
          ${toText(details.notes) ? `<p><strong>Notes:</strong> ${toText(details.notes)}</p>` : ''}
          <p>You may log in to the Student Portal for more details.</p>
          <p><a href="${loginUrl}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'STAFF_ACCOUNT_CREATED': {
      const loginUrl = buildStaffPortalLoginUrl(details);
      subject = `NORSU ${toText(details.role, 'Staff')} Account Created`;
      html = `
          <h2>NORSU Staff Account Created</h2>
          <p>Dear ${name},</p>
          <p>Your <strong>${toText(details.role, 'Staff')}</strong> portal account has been created.</p>
          ${toText(details.department) ? `<p><strong>Department:</strong> ${toText(details.department)}</p>` : ''}
          <hr />
          <h3>Your Login Credentials</h3>
          <p><strong>Username:</strong> ${toText(details.username)}</p>
          <p><strong>Password:</strong> ${toText(details.password)}</p>
          <p><a href="${loginUrl}">Open Staff Portal</a></p>
        `;
      break;
    }
    default:
      return null;
  }

  return { subject, html };
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

    console.log(`Processing email type: ${normalizedType} for: ${normalizedEmail}`);

    if (!normalizedEmail) {
      return json({ error: 'Email is required.' }, 400);
    }

    const template = buildEmailTemplate(normalizedType, normalizedName, details);
    if (!template) {
      return json({ error: `Unsupported email type: ${normalizedType || 'Unknown'}` }, 400);
    }

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

    const plainTextBody = htmlToPlainText(template.html);
    const mailPayload = {
      to: normalizedEmail,
      subject: template.subject,
      text: plainTextBody,
      html: template.html,
    };

    try {
      await sendEmailMessage(mailPayload);
    } catch (error) {
      console.error('Email send failed:', {
        type: normalizedType,
        email: normalizedEmail,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    return json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error("Handler Error:", error);
    return json({ error: error.message }, 500);
  }
});
