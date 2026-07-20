import { Resend } from "npm:resend";

let resendClient: Resend | null = null;

const getResendClient = () => {
    if (!resendClient) {
        const apiKey = Deno.env.get("RESEND_API_KEY");
        if (!apiKey) {
            throw new Error("Server misconfiguration: Missing RESEND_API_KEY environment variable.");
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
};

const getSenderEmail = () => {
    return Deno.env.get("RESEND_FROM_EMAIL") || "noreply@norsugcare.space";
};

const formatSender = (email: string, name: string | null) => {
    if (!name) return email;
    return `${name} <${email}>`;
};

type SendEmailOptions = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    senderName?: string;
    emailType?: string;
};

export const sendEmail = async (options: SendEmailOptions) => {
    const resend = getResendClient();
    const from = formatSender(getSenderEmail(), options.senderName || "NORSU System");

    try {
        const { data, error } = await resend.emails.send({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        if (error) {
            console.error(`Resend API Error [${options.emailType || "Email"}]:`, error);
            throw new Error("The email service is currently unavailable. Please try again later.");
        }

        console.log(`Successfully sent email [${options.emailType || "Email"}] to ${maskEmailAddress(options.to)}. Resend ID: ${data?.id}`);
        return data;
    } catch (error) {
        if (error instanceof Error && error.message.includes("email service is currently unavailable")) {
            throw error;
        }
        console.error(`Unexpected error sending email [${options.emailType || "Email"}]:`, error);
        throw new Error("The email service is currently unavailable. Please try again later.");
    }
};

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const escapeHtml = (value: unknown): string =>
    String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);

export const buildPortalUrl = (rawUrl: string, fallbackPath: string) => {
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

export const buildStudentPortalLoginUrl = (overrideUrl?: string | null) => {
    const rawUrl = String(
        overrideUrl
        || Deno.env.get('STUDENT_PORTAL_LOGIN_URL')
        || Deno.env.get('APP_BASE_URL')
        || ''
    ).trim();

    return buildPortalUrl(rawUrl, '/student/login');
};

// Runs a template-building + sendEmail call and reports success/failure instead of
// throwing, so a saved record (application, activated account, ...) never gets rolled
// back just because its confirmation email failed to send.
export const trySendEmail = async (
    sendFn: () => Promise<unknown>,
    failureLogLabel: string
): Promise<{ emailSent: boolean; emailError: string | null }> => {
    try {
        await sendFn();
        return { emailSent: true, emailError: null };
    } catch (error) {
        console.error(failureLogLabel, error);
        return {
            emailSent: false,
            emailError: error instanceof Error ? error.message : 'Failed to send the email.'
        };
    }
};

export const maskEmailAddress = (email: string | null) => {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return "";
    const [localPart, domain = ""] = normalized.split("@");
    if (!localPart) return normalized;
    const visiblePrefix = localPart.slice(0, 2);
    return `${visiblePrefix}${"*".repeat(Math.max(localPart.length - visiblePrefix.length, 1))}@${domain}`;
};

export const sendSecurityOtpEmail = async ({
    recipientEmail,
    recipientName,
    otp,
    purpose,
    expiryMinutes = 10,
}: {
    recipientEmail: string;
    recipientName: string;
    otp: string;
    purpose: "password_change" | "email_change" | "forgot_password";
    expiryMinutes?: number;
}) => {
    let actionLabel = "password change";
    switch (purpose) {
        case "email_change":
            actionLabel = "email change";
            break;
        case "forgot_password":
            actionLabel = "password reset";
            break;
        case "password_change":
        default:
            actionLabel = "password change";
            break;
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Security Verification Code</h2>
            <p>Dear ${recipientName || "User"},</p>
            <p>Use the verification code below to complete your <strong>${actionLabel}</strong> request.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; color: #1e40af;">${otp}</p>
            </div>
            <p style="color: #ef4444; font-weight: bold;">This code expires in ${expiryMinutes} minutes.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 14px; color: #6b7280;">Security Warning: If you did not request this ${actionLabel}, please ignore this email. Your account is secure, but someone may have mistakenly entered your email address.</p>
        </div>
    `;

    const text = [
        "Security Verification Code",
        `Dear ${recipientName || "User"},`,
        `Use the verification code below to complete your ${actionLabel} request.`,
        otp,
        `This code expires in ${expiryMinutes} minutes.`,
        `Security Warning: If you did not request this ${actionLabel}, please ignore this email.`,
    ].join("\n\n");

    await sendEmail({
        to: recipientEmail,
        subject: `NORSU Security OTP for ${actionLabel}`,
        html,
        text,
        senderName: "NORSU Security",
        emailType: `OTP_${purpose.toUpperCase()}`,
    });
};
