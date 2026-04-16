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

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toHtmlText = (value: unknown, fallback = '') => escapeHtml(toText(value, fallback));

const buildStudentPortalLoginUrl = (details: Record<string, unknown>) => {
  const rawUrl =
    toText(details.loginUrl)
    || toText(Deno.env.get('STUDENT_PORTAL_LOGIN_URL'))
    || toText(Deno.env.get('APP_BASE_URL'));

  if (!rawUrl) {
    return 'http://localhost:5173/student/login';
  }

  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/student/login';
    }
    return url.toString();
  } catch {
    return rawUrl.includes('/student/login')
      ? rawUrl
      : `${rawUrl.replace(/\/+$/, '')}/student/login`;
  }
};

const buildEmailTemplate = (type: string, name: string, details: Record<string, unknown>) => {
  let subject = '';
  let html = '';
  const safeName = toHtmlText(name, 'Student');

  switch (type) {
    case 'NAT_SUBMISSION':
      subject = 'NAT Application Received';
      html = `
          <h2>Application Received</h2>
          <p>Dear ${safeName},</p>
          <p>Your application for the NORSU Admission Test has been received.</p>
          <p><strong>Test Date:</strong> ${toHtmlText(details.testDate, 'To be announced')}</p>
          ${toText(details.testTime) ? `<p><strong>Test Time:</strong> ${toHtmlText(details.testTime)}</p>` : ''}
          <p><strong>Venue:</strong> NORSU Main Campus</p>
          <hr />
          <h3>Your Portal Credentials</h3>
          <p><strong>Username:</strong> ${toHtmlText(details.username)}</p>
          <p><strong>Password:</strong> ${toHtmlText(details.password)}</p>
          <p>Please save these credentials to login to the portal.</p>
        `;
      break;
    case 'NAT_RESULT':
      subject = `NAT Result Update: ${toText(details.status, 'Updated')}`;
      html = `
          <h2>NAT Result Update</h2>
          <p>Dear ${safeName},</p>
          <p>Your admission test status has been updated to: <strong>${toHtmlText(details.status, 'Updated')}</strong>.</p>
          <p>Please login to the NAT Portal to view more details.</p>
        `;
      break;
    case 'STUDENT_ACTIVATION': {
      const loginUrl = buildStudentPortalLoginUrl(details);
      subject = 'Student Account Activated - Login Instructions';
      html = `
          <h2>Welcome to NORSU Student Portal</h2>
          <p>Dear ${safeName},</p>
          <p>Your student account has been successfully activated.</p>
          <p>You can now access the Student Portal to manage your profile and use student services such as Needs Assessment, Counseling, Additional Support, Scholarships, Events, and Feedback.</p>
          <hr />
          <h3>Your Login Credentials</h3>
          <p><strong>Username (Student ID):</strong> ${toHtmlText(details.studentId)}</p>
          <p><strong>Password:</strong> ${toHtmlText(details.password)}</p>
          <br />
          <p><a href="${escapeHtml(loginUrl)}">Login to Student Portal</a></p>
        `;
      break;
    }
    case 'APPLICANT_INTERVIEW_SCHEDULED':
      subject = 'NORSU Interview Schedule';
      html = `
          <h2>Interview Scheduled</h2>
          <p>Dear ${safeName},</p>
          <p>Your application for <strong>${toHtmlText(details.course, 'your selected course')}</strong> has been scheduled for interview.</p>
          <p><strong>Interview Schedule:</strong> ${toHtmlText(details.interviewDate, 'To be announced')}</p>
          <p><strong>Department:</strong> ${toHtmlText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toHtmlText(details.referenceId)}</p>` : ''}
          <p>Please be ready for the scheduled interview.</p>
        `;
      break;
    case 'APPLICANT_APPROVED_FOR_ENROLLMENT':
      subject = 'Approved for Enrollment';
      html = `
          <h2>Application Approved</h2>
          <p>Dear ${safeName},</p>
          <p>Good news. Your application for <strong>${toHtmlText(details.course, 'your selected course')}</strong> has been approved for enrollment.</p>
          <p><strong>Department:</strong> ${toHtmlText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toHtmlText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next enrollment and activation steps.</p>
        `;
      break;
    case 'APPLICANT_FORWARDED_TO_NEXT_CHOICE':
      subject = 'Application Forwarded to Next Course Choice';
      html = `
          <h2>Application Forwarded</h2>
          <p>Dear ${safeName},</p>
          <p>Your application was not advanced under your <strong>${toHtmlText(details.fromChoice, 'current choice')}</strong>.</p>
          <p>It has now been forwarded to your <strong>${toHtmlText(details.toChoice, 'next choice')}</strong>.</p>
          <p><strong>Next Course:</strong> ${toHtmlText(details.nextCourse, 'your next course choice')}</p>
          <p><strong>Department:</strong> ${toHtmlText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toHtmlText(details.referenceId)}</p>` : ''}
          <p>Please wait for the next department update.</p>
        `;
      break;
    case 'APPLICANT_UNSUCCESSFUL':
      subject = 'NORSU Application Update';
      html = `
          <h2>Application Update</h2>
          <p>Dear ${safeName},</p>
          <p>We are sorry to inform you that your application for <strong>${toHtmlText(details.course, 'your selected course')}</strong> was not approved.</p>
          <p><strong>Department:</strong> ${toHtmlText(details.department)}</p>
          ${toText(details.referenceId) ? `<p><strong>Reference ID:</strong> ${toHtmlText(details.referenceId)}</p>` : ''}
          <p>Thank you for your interest in NORSU.</p>
        `;
      break;
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
