import { sendEmailMessage } from "./mailer.ts";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const textEncoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

export const normalizeEmail = (value: unknown) => {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
};

export const isValidEmail = (value: string | null) =>
  Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

export const generateOtpCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(OTP_LENGTH)))
    .map((value) => (value % 10).toString())
    .join("");

export const hashOtpCode = async (otp: string) => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(String(otp || "").trim()));
  return toHex(digest);
};

export const getOtpExpiryMinutes = () => OTP_EXPIRY_MINUTES;

export const buildOtpExpiryTimestamp = () =>
  new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

export const maskEmailAddress = (email: string | null) => {
  const normalized = normalizeEmail(email);
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
}: {
  recipientEmail: string;
  recipientName: string;
  otp: string;
  purpose: "password_change" | "email_change" | "destructive_reset";
}) => {
  const actionLabel = purpose === "email_change"
    ? "email change"
    : purpose === "destructive_reset"
      ? "student data reset"
      : "password change";
  const html = `
        <h2>Security Verification Code</h2>
        <p>Dear ${recipientName || "User"},</p>
        <p>Use the verification code below to complete your ${actionLabel} request.</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:24px 0;">${otp}</p>
        <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this, you may ignore this email.</p>
      `;

  await sendEmailMessage({
    to: recipientEmail,
    subject: `NORSU Security OTP for ${actionLabel}`,
    text: [
      "Security Verification Code",
      `Dear ${recipientName || "User"},`,
      `Use the verification code below to complete your ${actionLabel} request.`,
      otp,
      `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      "If you did not request this, you may ignore this email.",
    ].join("\n\n"),
    html,
  });
};
