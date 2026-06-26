const fs = require('fs');
const path = 'k:\\THESIS\\norsu-system-react - Copy (2) - Copy\\supabase\\functions\\manage-student-accounts\\index.ts';

const content = fs.readFileSync(path, 'utf8');
const [prefix] = content.split('serve(async (request: Request) => {');

const correctEnd = `serve(async (request: Request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        const body = asObject(await request.json());
        const mode = String(body.mode || '').trim();
        const rateLimitResponse = await enforceRateLimit(request, {
            endpoint: 'manage-student-accounts',
            action: mode,
            corsHeaders
        });
        if (rateLimitResponse) return rateLimitResponse;

        const adminClient = getAdminClient();

        if (mode === 'ping') {
            return json({ success: true });
        }

        if (mode === 'delete-all-students') {
            return json(await deleteAllStudents(adminClient, request));
        }

        if (mode === 'preview-care-student-reset') {
            return json(await previewCareStudentReset(adminClient, request));
        }

        if (mode === 'request-care-reset-otp') {
            const otpRateLimit = await enforceRateLimit(request, {
                endpoint: 'manage-student-accounts',
                action: 'request-care-reset-otp',
                maxRequests: 3,
                windowSeconds: 15 * 60,
                message: 'You have requested too many OTPs. Please wait 15 minutes before trying again.',
                corsHeaders
            });
            if (otpRateLimit) return otpRateLimit;

            return json(await requestCareStudentResetOtp(adminClient, request));
        }

        if (mode === 'care-reset-student-data') {
            return json(await resetCareStudentData(adminClient, request, body));
        }

        if (mode === 'request-forgot-password-otp') {
            const otpRateLimit = await enforceRateLimit(request, {
                endpoint: 'manage-student-accounts',
                action: 'request-forgot-password-otp',
                maxRequests: 3,
                windowSeconds: 15 * 60,
                message: 'You have requested too many OTPs. Please wait 15 minutes before trying again.',
                corsHeaders
            });
            if (otpRateLimit) return otpRateLimit;

            return json(await requestForgotPasswordOtp(adminClient, body));
        }

        if (mode === 'confirm-forgot-password-reset') {
            return json(await confirmForgotPasswordReset(adminClient, body));
        }

        if (mode === 'sync-auth-email') {
            return json(await syncStudentAuthEmail(adminClient, request, body.email));
        }

        if (mode === 'request-security-otp') {
            const purpose = parseSecurityOtpPurpose(body.purpose);
            const otpRateLimit = await enforceRateLimit(request, {
                endpoint: 'manage-student-accounts',
                action: \`request-security-otp-\${purpose}\`,
                maxRequests: 3,
                windowSeconds: 15 * 60,
                message: 'You have requested too many OTPs. Please wait 15 minutes before trying again.',
                corsHeaders
            });
            if (otpRateLimit) return otpRateLimit;

            return json(await requestStudentSecurityOtp(adminClient, request, purpose, body.email));
        }

        if (mode === 'confirm-password-change') {
            return json(await confirmStudentPasswordChange(adminClient, request, body.otp, body.password));
        }

        if (mode === 'confirm-email-change') {
            return json(await confirmStudentEmailChange(adminClient, request, body.otp, body.email));
        }

        if (mode === 'sync-all-auth-emails') {
            return json(await syncAllStudentAuthEmails(adminClient, request));
        }

        if (mode === 'update-profile-completion') {
            return json(await updateStudentProfileCompletion(adminClient, request, body.payload));
        }

        if (mode === 'update-profile') {
            return json(await updateStudentProfile(adminClient, request, body.payload));
        }

        if (mode === 'confirm-course-year') {
            return json(await confirmCurrentStudentCourseYear(adminClient, request, body.payload));
        }

        if (mode === 'reset-expired-course-year') {
            return json(await resetExpiredCurrentStudentCourseYear(adminClient, request));
        }

        if (mode === 'update-profile-picture') {
            return json(await updateCurrentStudentProfilePicture(adminClient, request, body.profilePictureUrl));
        }

        if (mode === 'mark-tour-seen') {
            return json(await markCurrentStudentTourSeen(adminClient, request));
        }

        if (mode === 'complete-office-visit') {
            return json(await completeCurrentStudentOfficeVisit(adminClient, request, body.officeVisitId));
        }

        return json({ success: false, error: 'Unsupported student management mode.' }, 400);
    } catch (error: any) {
        let message = 'Unexpected student cleanup error.';
        if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === 'object' && error.message) {
            message = String(error.message);
        } else if (typeof error === 'string') {
            message = error;
        }
        console.error('manage-student-accounts ERROR:', message, error);
        return new Response(JSON.stringify({ error: message, details: error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
});
`;

fs.writeFileSync(path, prefix + correctEnd);
console.log('Fixed file');
