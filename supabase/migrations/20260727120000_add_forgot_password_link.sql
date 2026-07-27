-- Password reset links, alongside the existing forgot-password OTP.
--
-- Students on Gmail were losing OTPs to per-recipient throttling: Gmail defers with a 4xx,
-- Resend retries, and the code lands after its 10-minute expiry already invalidated by the
-- student's next request. A single-use link with a 60-minute window survives that deferral.
-- The token reuses this table's otp_hash column (SHA-256 hex of a 32-byte secret), so the
-- only schema change needed is a new purpose value plus an index to redeem by token.

-- 1. Allow the new purpose. Mirrors the constraint swap in
--    20260720120000_remove_student_data_reset.sql; all previously allowed values are kept.
alter table public.security_change_otps
    drop constraint if exists security_change_otps_purpose_check;
alter table public.security_change_otps
    add constraint security_change_otps_purpose_check
    check (purpose = any (array[
        'password_change'::text,
        'email_change'::text,
        'forgot_password'::text,
        'forgot_password_link'::text
    ]));

-- 2. A link is redeemed by token alone, with no auth_user_id to narrow on, so the existing
--    idx_security_change_otps_lookup (auth_user_id first) cannot serve it. Partial on
--    unconsumed rows because redeemed and expired tokens are never looked up again.
create index if not exists idx_security_change_otps_token
    on public.security_change_otps (otp_hash)
    where consumed_at is null;
