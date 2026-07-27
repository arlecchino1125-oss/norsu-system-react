import {
  sendSecurityOtpEmail as sendEmailServiceOtp,
  sendPasswordResetLinkEmail as sendEmailServiceResetLink,
  maskEmailAddress as maskEmailServiceAddress,
  buildStudentPasswordResetUrl as buildEmailServiceResetUrl,
} from "./emailService.ts";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
// A link only has to be clicked, so it can outlive a Gmail deferral that would kill a typed
// code. Single-use and superseded by any newer request, so the longer window costs little.
const RESET_LINK_EXPIRY_MINUTES = 60;
const RESET_TOKEN_BYTES = 32;
const textEncoder = new TextEncoder();

const toHex = (buffer: ArrayBufferLike) =>
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

// Opaque single-use secret for a reset link. 32 bytes leaves brute force irrelevant, so unlike
// the 6-digit OTP this needs no attempt cap.
export const generateResetToken = () =>
  toHex(crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES)).buffer);

// Reuses hashOtpCode: the token is stored the same way an OTP is, as a SHA-256 hex digest.
export const hashResetToken = hashOtpCode;

export const getOtpExpiryMinutes = () => OTP_EXPIRY_MINUTES;

export const getResetLinkExpiryMinutes = () => RESET_LINK_EXPIRY_MINUTES;

export const buildOtpExpiryTimestamp = (minutes: number = OTP_EXPIRY_MINUTES) =>
  new Date(Date.now() + minutes * 60 * 1000).toISOString();

export const maskEmailAddress = maskEmailServiceAddress;

export const sendSecurityOtpEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  otp: string;
  purpose: "password_change" | "email_change" | "forgot_password";
  expiryMinutes?: number;
}) => {
  await sendEmailServiceOtp({
    ...params,
    expiryMinutes: params.expiryMinutes || getOtpExpiryMinutes(),
  });
};

export const buildStudentPasswordResetUrl = buildEmailServiceResetUrl;

export const sendPasswordResetLinkEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  expiryMinutes?: number;
}) => {
  await sendEmailServiceResetLink({
    ...params,
    expiryMinutes: params.expiryMinutes || getResetLinkExpiryMinutes(),
  });
};

