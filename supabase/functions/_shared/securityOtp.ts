import { sendSecurityOtpEmail as sendEmailServiceOtp, maskEmailAddress as maskEmailServiceAddress } from "./emailService.ts";

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

export const maskEmailAddress = maskEmailServiceAddress;

export const sendSecurityOtpEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  otp: string;
  purpose: "password_change" | "email_change" | "destructive_reset" | "forgot_password";
  expiryMinutes?: number;
}) => {
  await sendEmailServiceOtp({
    ...params,
    expiryMinutes: params.expiryMinutes || getOtpExpiryMinutes(),
  });
};

