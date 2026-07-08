-- Signature data URLs are base64 PNGs (typically 5-50KB); the edge function
-- sanitizer allows up to 500000 chars, so the DB caps must match or every
-- forward/referral submitted with a signature fails its CHECK constraint.

ALTER TABLE "public"."counseling_requests"
    DROP CONSTRAINT IF EXISTS "counseling_requests_referrer_signature_len";
ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_referrer_signature_len"
    CHECK (("referrer_signature" IS NULL) OR (char_length("referrer_signature") <= 500000)) NOT VALID;

-- dept_notes embeds the signature inside a JSON blob alongside text fields.
ALTER TABLE "public"."support_requests"
    DROP CONSTRAINT IF EXISTS "support_requests_dept_notes_len";
ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_dept_notes_len"
    CHECK (("dept_notes" IS NULL) OR (char_length("dept_notes") <= 510000)) NOT VALID;
