import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

const buildEmailTemplate = (type: string, name: string, details: Record<string, unknown>) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'NAT_SUBMISSION':
      subject = 'NAT Application Received';
      html = `
          <h2>Application Received</h2>
          <p>Dear ${name},</p>
          <p>Your application for the NORSU Admission Test has been received.</p>
          <p><strong>Test Date:</strong> ${toText(details.testDate, 'To be announced')}</p>
          ${toText(details.testTime) ? `<p><strong>Test Time:</strong> ${toText(details.testTime)}</p>` : ''}
          <p><strong>Venue:</strong> NORSU Main Campus</p>
          <hr />
          <h3>Your Portal Credentials</h3>
          <p><strong>Username:</strong> ${toText(details.username)}</p>
          <p><strong>Password:</strong> ${toText(details.password)}</p>
          <p>Please save these credentials to login to the portal.</p>
        `;
      break;
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
          <p><em>(This is the same password you used for the NAT Portal)</em></p>
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
          <p><strong>Department:</strong> ${toText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toText(details.referenceId)}</p>` : ''}
          <p>Please be ready for the scheduled interview.</p>
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
    const { type, email, name, ...details } = await req.json();
    const normalizedType = toText(type);
    const normalizedEmail = toText(email);
    const normalizedName = toText(name, 'Student');

    console.log(`Processing email type: ${normalizedType} for: ${normalizedEmail}`);

    if (!normalizedEmail) {
      return json({ error: 'Email is required.' }, 400);
    }

    const template = buildEmailTemplate(normalizedType, normalizedName, details);
    if (!template) {
      return json({ error: `Unsupported email type: ${normalizedType || 'Unknown'}` }, 400);
    }

    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("Missing Secrets: GMAIL_USER or GMAIL_APP_PASSWORD");
      throw new Error("Server misconfiguration: Missing email credentials.");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    try {
      await client.send({
        from: `NORSU Admission <${GMAIL_USER}>`,
        to: normalizedEmail,
        subject: template.subject,
        content: template.html,
        html: template.html,
      });
    } finally {
      await client.close();
    }

    return json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error("Handler Error:", error);
    return json({ error: error.message }, 500);
  }
});
