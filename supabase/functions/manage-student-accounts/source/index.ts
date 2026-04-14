import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
    buildOtpExpiryTimestamp,
    generateOtpCode,
    getOtpExpiryMinutes,
    hashOtpCode,
    isValidEmail,
    maskEmailAddress,
    normalizeEmail,
    sendSecurityOtpEmail
} from '../../_shared/securityOtp.ts';
import { sanitizePlainText } from '../../_shared/plainText.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const getAdminClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

const isMissingAuthUserError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('user not found') || message.includes('not found');
};

const normalizeAuthUpdateError = (error: any, email: string) => {
    const message = String(error?.message || error || '').toLowerCase();

    if (message.includes('already been registered')
        || message.includes('already exists')
        || message.includes('duplicate')) {
        return new Error(`The email "${email}" is already being used by another auth account.`);
    }

    return error instanceof Error
        ? error
        : new Error('Failed to sync the student auth email.');
};

const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

const pickAllowedFields = (value: unknown, allowedFields: string[]) => {
    const payload = asObject(value);
    const picked: Record<string, unknown> = {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined) {
            picked[field] = payload[field];
        }
    }

    return picked;
};

const STUDENT_TEXT_FIELD_RULES: Record<string, { maxLength: number; multiline?: boolean }> = {
    first_name: { maxLength: 80 },
    last_name: { maxLength: 80 },
    middle_name: { maxLength: 80 },
    suffix: { maxLength: 20 },
    place_of_birth: { maxLength: 120 },
    nationality: { maxLength: 80 },
    sex: { maxLength: 20 },
    gender_identity: { maxLength: 40 },
    civil_status: { maxLength: 40 },
    street: { maxLength: 160 },
    city: { maxLength: 80 },
    province: { maxLength: 80 },
    zip_code: { maxLength: 20 },
    mobile: { maxLength: 24 },
    facebook_url: { maxLength: 255 },
    religion: { maxLength: 80 },
    school_last_attended: { maxLength: 160 },
    year_level: { maxLength: 32 },
    supporter: { maxLength: 120 },
    supporter_contact: { maxLength: 40 },
    working_student_type: { maxLength: 120 },
    pwd_type: { maxLength: 120 },
    indigenous_group: { maxLength: 120 },
    mother_name: { maxLength: 120 },
    mother_last_name: { maxLength: 80 },
    mother_given_name: { maxLength: 80 },
    mother_middle_name: { maxLength: 80 },
    mother_occupation: { maxLength: 120 },
    mother_contact: { maxLength: 40 },
    father_name: { maxLength: 120 },
    father_last_name: { maxLength: 80 },
    father_given_name: { maxLength: 80 },
    father_middle_name: { maxLength: 80 },
    father_occupation: { maxLength: 120 },
    father_contact: { maxLength: 40 },
    parent_address: { maxLength: 200 },
    spouse_name: { maxLength: 120 },
    spouse_occupation: { maxLength: 120 },
    guardian_name: { maxLength: 120 },
    guardian_address: { maxLength: 200 },
    guardian_contact: { maxLength: 40 },
    guardian_relation: { maxLength: 80 },
    emergency_name: { maxLength: 120 },
    emergency_address: { maxLength: 200 },
    emergency_relationship: { maxLength: 80 },
    emergency_number: { maxLength: 40 },
    elem_school: { maxLength: 160 },
    junior_high_school: { maxLength: 160 },
    senior_high_school: { maxLength: 160 },
    college_school: { maxLength: 160 },
    honors_awards: { maxLength: 1000, multiline: true },
    extracurricular_activities: { maxLength: 1000, multiline: true },
    scholarships_availed: { maxLength: 1000, multiline: true },
    course: { maxLength: 120 },
    department: { maxLength: 120 },
    status: { maxLength: 80 },
    section: { maxLength: 32 },
    profile_picture_url: { maxLength: 2048 }
};

const sanitizeStudentPatch = (patch: Record<string, unknown>) => {
    const sanitizedPatch: Record<string, unknown> = {};

    Object.entries(patch).forEach(([field, value]) => {
        if (typeof value !== 'string') {
            sanitizedPatch[field] = value;
            return;
        }

        const rule = STUDENT_TEXT_FIELD_RULES[field];
        sanitizedPatch[field] = sanitizePlainText(value, {
            maxLength: rule?.maxLength ?? 255,
            multiline: rule?.multiline ?? false
        });
    });

    return sanitizedPatch;
};

const parseSecurityOtpPurpose = (value: unknown): 'password_change' | 'email_change' => {
    const purpose = String(value || '').trim();
    if (purpose === 'password_change' || purpose === 'email_change') {
        return purpose;
    }

    throw withStatus('Unsupported security OTP purpose.', 400);
};

const STUDENT_PROFILE_COMPLETION_FIELDS = [
    'first_name',
    'last_name',
    'middle_name',
    'suffix',
    'dob',
    'age',
    'place_of_birth',
    'nationality',
    'sex',
    'gender_identity',
    'civil_status',
    'street',
    'city',
    'province',
    'zip_code',
    'mobile',
    'email',
    'facebook_url',
    'religion',
    'school_last_attended',
    'year_level',
    'supporter',
    'supporter_contact',
    'is_working_student',
    'working_student_type',
    'is_pwd',
    'pwd_type',
    'is_indigenous',
    'indigenous_group',
    'witnessed_conflict',
    'is_safe_in_community',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'mother_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'mother_occupation',
    'mother_contact',
    'father_name',
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'father_occupation',
    'father_contact',
    'parent_address',
    'num_brothers',
    'num_sisters',
    'birth_order',
    'spouse_name',
    'spouse_occupation',
    'num_children',
    'guardian_name',
    'guardian_address',
    'guardian_contact',
    'guardian_relation',
    'emergency_name',
    'emergency_address',
    'emergency_relationship',
    'emergency_number',
    'elem_school',
    'elem_year_graduated',
    'junior_high_school',
    'junior_high_year_graduated',
    'senior_high_school',
    'senior_high_year_graduated',
    'college_school',
    'college_year_graduated',
    'honors_awards',
    'extracurricular_activities',
    'scholarships_availed',
    'profile_completed'
] as const;

const STUDENT_PROFILE_EDIT_FIELDS = [
    'first_name',
    'last_name',
    'middle_name',
    'suffix',
    'place_of_birth',
    'street',
    'city',
    'province',
    'zip_code',
    'mobile',
    'civil_status',
    'facebook_url',
    'dob',
    'sex',
    'gender_identity',
    'nationality',
    'school_last_attended',
    'is_working_student',
    'working_student_type',
    'supporter',
    'supporter_contact',
    'is_pwd',
    'pwd_type',
    'is_indigenous',
    'indigenous_group',
    'witnessed_conflict',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'section',
    'religion',
    'is_safe_in_community',
    'mother_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'mother_occupation',
    'mother_contact',
    'father_name',
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'father_occupation',
    'father_contact',
    'parent_address',
    'num_brothers',
    'num_sisters',
    'birth_order',
    'spouse_name',
    'spouse_occupation',
    'num_children',
    'guardian_name',
    'guardian_address',
    'guardian_contact',
    'guardian_relation',
    'emergency_name',
    'emergency_address',
    'emergency_relationship',
    'emergency_number',
    'elem_school',
    'elem_year_graduated',
    'junior_high_school',
    'junior_high_year_graduated',
    'senior_high_school',
    'senior_high_year_graduated',
    'college_school',
    'college_year_graduated',
    'honors_awards',
    'extracurricular_activities',
    'scholarships_availed'
] as const;

const PROFILE_FIELD_LABELS: Record<string, string> = {
    first_name: 'First Name',
    last_name: 'Last Name',
    middle_name: 'Middle Name',
    suffix: 'Suffix',
    dob: 'Birth Date',
    age: 'Age',
    place_of_birth: 'Place of Birth',
    nationality: 'Nationality',
    sex: 'Sex',
    gender_identity: 'Gender Identity',
    civil_status: 'Civil Status',
    street: 'Street',
    city: 'City',
    province: 'Province',
    zip_code: 'Zip Code',
    mobile: 'Mobile',
    email: 'Email',
    facebook_url: 'Facebook URL',
    religion: 'Religion',
    school_last_attended: 'School Last Attended',
    year_level: 'Year Level',
    supporter: 'Supporter',
    supporter_contact: 'Supporter Contact',
    is_working_student: 'Working Student Status',
    working_student_type: 'Working Student Type',
    is_pwd: 'PWD Status',
    pwd_type: 'PWD Type',
    is_indigenous: 'Indigenous Status',
    indigenous_group: 'Indigenous Group',
    witnessed_conflict: 'Witnessed Conflict',
    is_safe_in_community: 'Community Safety',
    is_solo_parent: 'Solo Parent Status',
    is_child_of_solo_parent: 'Child of Solo Parent Status',
    mother_name: 'Mother Name',
    mother_last_name: 'Mother Last Name',
    mother_given_name: 'Mother Given Name',
    mother_middle_name: 'Mother Middle Name',
    mother_occupation: 'Mother Occupation',
    mother_contact: 'Mother Contact',
    father_name: 'Father Name',
    father_last_name: 'Father Last Name',
    father_given_name: 'Father Given Name',
    father_middle_name: 'Father Middle Name',
    father_occupation: 'Father Occupation',
    father_contact: 'Father Contact',
    parent_address: 'Parent Address',
    num_brothers: 'No. of Brothers',
    num_sisters: 'No. of Sisters',
    birth_order: 'Birth Order',
    spouse_name: 'Spouse Name',
    spouse_occupation: 'Spouse Occupation',
    num_children: 'No. of Children',
    guardian_name: 'Guardian Name',
    guardian_address: 'Guardian Address',
    guardian_contact: 'Guardian Contact',
    guardian_relation: 'Guardian Relation',
    emergency_name: 'Emergency Contact Name',
    emergency_address: 'Emergency Address',
    emergency_relationship: 'Emergency Relationship',
    emergency_number: 'Emergency Number',
    elem_school: 'Elementary School',
    elem_year_graduated: 'Elementary Year Graduated',
    junior_high_school: 'Junior High School',
    junior_high_year_graduated: 'Junior High Year Graduated',
    senior_high_school: 'Senior High School',
    senior_high_year_graduated: 'Senior High Year Graduated',
    college_school: 'College School',
    college_year_graduated: 'College Year Graduated',
    honors_awards: 'Honors/Awards',
    extracurricular_activities: 'Extracurricular Activities',
    scholarships_availed: 'Scholarships Availed',
    profile_completed: 'Profile Completion'
};

const normalizeProfileFieldValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value);
    return String(value).trim();
};

const getChangedProfileFields = (beforeProfile: any, afterPayload: Record<string, unknown>) => {
    const changedFields: string[] = [];

    Object.keys(afterPayload || {}).forEach((field) => {
        const beforeValue = normalizeProfileFieldValue(beforeProfile?.[field]);
        const afterValue = normalizeProfileFieldValue(afterPayload?.[field]);
        if (beforeValue !== afterValue) {
            changedFields.push(PROFILE_FIELD_LABELS[field] || field.replace(/_/g, ' '));
        }
    });

    return changedFields;
};

const buildStudentAuthUpdatePayload = (student: any, email: string) => ({
    email,
    email_confirm: true,
    app_metadata: {
        role: 'student'
    },
    user_metadata: {
        student_id: student.student_id,
        contact_email: email
    }
});

const getBearerTokenFromHeader = (value: string | null) => {
    const headerValue = String(value || '').trim();
    if (!headerValue.toLowerCase().startsWith('bearer ')) {
        return null;
    }

    const token = headerValue.slice('Bearer '.length).trim();
    return token || null;
};

const getRequestAuthUser = async (adminClient: any, request: Request) => {
    const accessToken = getBearerTokenFromHeader(
        request.headers.get('x-supabase-auth')
        || request.headers.get('x-client-authorization')
        || request.headers.get('Authorization')
    );

    if (!accessToken) {
        throw withStatus('Missing authenticated session.', 401);
    }

    const { data, error } = await adminClient.auth.getUser(accessToken);
    if (error || !data?.user) {
        throw withStatus('Unable to verify the current user.', 401);
    }

    return data.user;
};

const getLinkedStudentForRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);
    const { data: student, error } = await adminClient
        .from('students')
        .select('id, student_id, auth_user_id, email, first_name, last_name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (!student?.student_id) {
        throw withStatus('Only linked student accounts can perform this action.', 403);
    }

    return {
        authUser,
        student
    };
};

const createStudentSecurityOtp = async (
    adminClient: any,
    authUserId: string,
    purpose: 'password_change' | 'email_change',
    targetEmail: string
) => {
    const otp = generateOtpCode();
    const otpHash = await hashOtpCode(otp);

    await adminClient
        .from('security_change_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId)
        .eq('account_type', 'student')
        .eq('purpose', purpose)
        .is('consumed_at', null);

    const { error } = await adminClient
        .from('security_change_otps')
        .insert({
            auth_user_id: authUserId,
            account_type: 'student',
            purpose,
            target_email: targetEmail,
            otp_hash: otpHash,
            expires_at: buildOtpExpiryTimestamp(),
        });

    if (error) throw error;
    return otp;
};

const consumeStudentSecurityOtp = async (
    adminClient: any,
    authUserId: string,
    purpose: 'password_change' | 'email_change',
    otp: string,
    targetEmail?: string | null
) => {
    const normalizedOtp = String(otp || '').trim();
    if (!normalizedOtp) {
        throw withStatus('OTP is required.', 400);
    }

    const { data: otpRows, error } = await adminClient
        .from('security_change_otps')
        .select('id, otp_hash, target_email, expires_at, consumed_at, attempt_count')
        .eq('auth_user_id', authUserId)
        .eq('account_type', 'student')
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;

    const record = otpRows?.[0];
    if (!record) {
        throw withStatus('No active OTP request found. Request a new code first.', 404);
    }

    if (targetEmail && normalizeEmail(record.target_email) !== normalizeEmail(targetEmail)) {
        throw withStatus('This OTP was issued for a different email address.', 409);
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
        throw withStatus('This OTP has expired. Request a new code first.', 410);
    }

    const otpHash = await hashOtpCode(normalizedOtp);
    if (otpHash !== String(record.otp_hash || '')) {
        await adminClient
            .from('security_change_otps')
            .update({
                attempt_count: Number(record.attempt_count || 0) + 1,
                last_attempt_at: new Date().toISOString()
            })
            .eq('id', record.id);
        throw withStatus('Invalid OTP.', 401);
    }

    const consumedAt = new Date().toISOString();
    const { error: consumeError } = await adminClient
        .from('security_change_otps')
        .update({
            consumed_at: consumedAt,
            last_attempt_at: consumedAt
        })
        .eq('id', record.id);

    if (consumeError) throw consumeError;
    return record;
};

const assertAdminRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);

    const { data: staffAccount, error } = await adminClient
        .from('staff_accounts')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (String(staffAccount?.role || '').trim() !== 'Admin') {
        throw withStatus('Admin privileges are required for this action.', 403);
    }

    return authUser;
};

const deleteAllStudents = async (adminClient: any, request: Request) => {
    await assertAdminRequest(adminClient, request);

    const { data: students, error: studentsError } = await adminClient
        .from('students')
        .select('id, student_id, auth_user_id');

    if (studentsError) throw studentsError;

    let deletedLinkedAuthCount = 0;
    let missingLinkedAuthCount = 0;

    for (const student of students || []) {
        if (!student.auth_user_id) continue;

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(student.auth_user_id);
        if (deleteAuthError) {
            if (isMissingAuthUserError(deleteAuthError)) {
                missingLinkedAuthCount += 1;
                continue;
            }

            throw deleteAuthError;
        }

        deletedLinkedAuthCount += 1;
    }

    const { error: deleteStudentsError } = await adminClient
        .from('students')
        .delete()
        .not('id', 'is', null);

    if (deleteStudentsError) throw deleteStudentsError;

    return {
        success: true,
        deletedStudentCount: (students || []).length,
        deletedLinkedAuthCount,
        missingLinkedAuthCount
    };
};

const syncStudentAuthEmail = async (adminClient: any, request: Request, nextEmail: string | null) => {
    const normalizedEmail = normalizeEmail(nextEmail);
    if (!isValidEmail(normalizedEmail)) {
        throw new Error('A valid email address is required.');
    }

    const { authUser, student } = await getLinkedStudentForRequest(adminClient, request);

    const currentEmail = normalizeEmail(student.email);
    if (currentEmail === normalizedEmail
        && String(authUser.email || '').trim().toLowerCase() === normalizedEmail) {
        return {
            success: true,
            studentId: student.student_id,
            email: normalizedEmail,
            updated: false
        };
    }

    const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        buildStudentAuthUpdatePayload(student, normalizedEmail)
    );

    if (authError || !updatedUser?.user) {
        throw normalizeAuthUpdateError(authError || new Error('Failed to update the linked auth email.'), normalizedEmail);
    }

    const { error: updateStudentError } = await adminClient
        .from('students')
        .update({ email: normalizedEmail })
        .eq('student_id', student.student_id);

    if (updateStudentError) throw updateStudentError;

    return {
        success: true,
        studentId: student.student_id,
        email: normalizedEmail,
        updated: true
    };
};

const requestStudentSecurityOtp = async (
    adminClient: any,
    request: Request,
    purpose: 'password_change' | 'email_change',
    nextEmailValue?: unknown
) => {
    const { authUser, student } = await getLinkedStudentForRequest(adminClient, request);
    const currentEmail = normalizeEmail(authUser.email) || normalizeEmail(student.email);
    const targetEmail = purpose === 'email_change'
        ? normalizeEmail(nextEmailValue)
        : currentEmail;

    if (!isValidEmail(targetEmail)) {
        throw new Error('A valid email address is required.');
    }

    if (purpose === 'email_change' && targetEmail === currentEmail) {
        throw new Error('Enter a different email address to continue.');
    }

    const otp = await createStudentSecurityOtp(adminClient, authUser.id, purpose, targetEmail!);
    await sendSecurityOtpEmail({
        recipientEmail: targetEmail!,
        recipientName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_id,
        otp,
        purpose
    });

    return {
        success: true,
        purpose,
        maskedEmail: maskEmailAddress(targetEmail!),
        expiresInMinutes: getOtpExpiryMinutes()
    };
};

const confirmStudentPasswordChange = async (
    adminClient: any,
    request: Request,
    otp: unknown,
    nextPasswordValue: unknown
) => {
    const { authUser } = await getLinkedStudentForRequest(adminClient, request);
    const nextPassword = String(nextPasswordValue || '');
    if (nextPassword.length < 8) {
        throw new Error('Password must be at least 8 characters.');
    }

    await consumeStudentSecurityOtp(adminClient, authUser.id, 'password_change', String(otp || ''));

    const { data, error } = await adminClient.auth.admin.updateUserById(authUser.id, {
        password: nextPassword
    });

    if (error || !data?.user) {
        throw error || new Error('Failed to update the student password.');
    }

    return {
        success: true,
        passwordUpdated: true
    };
};

const confirmStudentEmailChange = async (
    adminClient: any,
    request: Request,
    otp: unknown,
    nextEmailValue: unknown
) => {
    const normalizedEmail = normalizeEmail(nextEmailValue);
    if (!isValidEmail(normalizedEmail)) {
        throw new Error('A valid email address is required.');
    }

    const { authUser, student } = await getLinkedStudentForRequest(adminClient, request);
    await consumeStudentSecurityOtp(adminClient, authUser.id, 'email_change', String(otp || ''), normalizedEmail);

    const currentEmail = normalizeEmail(student.email);
    if (currentEmail === normalizedEmail
        && normalizeEmail(authUser.email) === normalizedEmail) {
        return {
            success: true,
            studentId: student.student_id,
            email: normalizedEmail,
            updated: false
        };
    }

    const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        buildStudentAuthUpdatePayload(student, normalizedEmail!)
    );

    if (authError || !updatedUser?.user) {
        throw normalizeAuthUpdateError(authError || new Error('Failed to update the linked auth email.'), normalizedEmail!);
    }

    const { error: updateStudentError } = await adminClient
        .from('students')
        .update({ email: normalizedEmail })
        .eq('student_id', student.student_id);

    if (updateStudentError) throw updateStudentError;

    return {
        success: true,
        studentId: student.student_id,
        email: normalizedEmail,
        updated: true
    };
};

const updateCurrentStudent = async (adminClient: any, request: Request, patch: Record<string, unknown>) => {
    const sanitizedPatch = sanitizeStudentPatch(patch);

    if (!Object.keys(sanitizedPatch).length) {
        throw new Error('No student changes were provided.');
    }

    const { student } = await getLinkedStudentForRequest(adminClient, request);
    const { data: updatedStudent, error } = await adminClient
        .from('students')
        .update(sanitizedPatch)
        .eq('student_id', student.student_id)
        .select('*')
        .maybeSingle();

    if (error) throw error;

    return {
        success: true,
        studentId: student.student_id,
        student: updatedStudent
    };
};

const updateStudentProfileCompletion = async (adminClient: any, request: Request, payload: unknown) => {
    const completionPatch = pickAllowedFields(payload, [...STUDENT_PROFILE_COMPLETION_FIELDS]);
    const requestedEmail = normalizeEmail(completionPatch.email);
    if (requestedEmail) {
        completionPatch.email = requestedEmail;
    }

    const { student } = await getLinkedStudentForRequest(adminClient, request);
    const { data: beforeProfile, error: beforeProfileError } = await adminClient
        .from('students')
        .select('*')
        .eq('student_id', student.student_id)
        .maybeSingle();

    if (beforeProfileError) throw beforeProfileError;

    let emailSynced = false;
    if (requestedEmail) {
        const syncResult = await syncStudentAuthEmail(adminClient, request, requestedEmail);
        emailSynced = Boolean(syncResult.updated);
    }

    const result = await updateCurrentStudent(adminClient, request, completionPatch);
    const changedFields = getChangedProfileFields(beforeProfile, completionPatch);

    if (changedFields.length > 0) {
        const fullName = `${result.student?.first_name || beforeProfile?.first_name || ''} ${result.student?.last_name || beforeProfile?.last_name || ''}`.trim() || 'Student';
        const changedPreview = changedFields.slice(0, 6).join(', ');
        const moreSuffix = changedFields.length > 6 ? ` (+${changedFields.length - 6} more)` : '';

        const { error: notificationError } = await adminClient
            .from('notifications')
            .insert([{
                student_id: student.student_id,
                message: `[PROFILE UPDATE] ${fullName} (${student.student_id}) modified: ${changedPreview}${moreSuffix}.`
            }]);

        if (notificationError) {
            console.warn('Profile completion notification failed:', notificationError.message);
        }
    }

    return {
        ...result,
        emailSynced
    };
};

const updateStudentProfile = async (adminClient: any, request: Request, payload: unknown) =>
    updateCurrentStudent(
        adminClient,
        request,
        pickAllowedFields(payload, [...STUDENT_PROFILE_EDIT_FIELDS])
    );

const confirmCurrentStudentCourseYear = async (adminClient: any, request: Request, payload: unknown) => {
    const patch = pickAllowedFields(payload, [
        'course',
        'year_level',
        'department',
        'status',
        'course_year_confirmed_at',
        'course_year_update_required'
    ]);

    if (!patch.course || !patch.year_level) {
        throw new Error('Course and year level are required.');
    }

    return updateCurrentStudent(adminClient, request, patch);
};

const resetExpiredCurrentStudentCourseYear = async (adminClient: any, request: Request) =>
    updateCurrentStudent(adminClient, request, {
        course: null,
        year_level: null,
        status: 'Inactive',
        course_year_confirmed_at: null,
        course_year_update_required: false,
        course_year_window_start: null,
        course_year_window_end: null
    });

const updateCurrentStudentProfilePicture = async (adminClient: any, request: Request, profilePictureUrl: unknown) => {
    const nextUrl = String(profilePictureUrl || '').trim();
    if (!nextUrl) {
        throw new Error('Profile picture URL is required.');
    }

    return updateCurrentStudent(adminClient, request, {
        profile_picture_url: nextUrl
    });
};

const markCurrentStudentTourSeen = async (adminClient: any, request: Request) =>
    updateCurrentStudent(adminClient, request, {
        has_seen_tour: true
    });

const completeCurrentStudentOfficeVisit = async (adminClient: any, request: Request, officeVisitId: unknown) => {
    const { student } = await getLinkedStudentForRequest(adminClient, request);
    const nextOfficeVisitId = String(officeVisitId || '').trim();

    if (!nextOfficeVisitId) {
        throw new Error('Office visit ID is required.');
    }

    const { data: officeVisit, error: officeVisitError } = await adminClient
        .from('office_visits')
        .select('id, student_id, status, time_out')
        .eq('id', nextOfficeVisitId)
        .maybeSingle();

    if (officeVisitError) throw officeVisitError;
    if (!officeVisit?.id) {
        throw withStatus('Office visit not found.', 404);
    }

    if (String(officeVisit.student_id || '').trim() !== String(student.student_id || '').trim()) {
        throw withStatus('You can only complete your own office visit.', 403);
    }

    if (String(officeVisit.status || '').trim() !== 'Ongoing' || officeVisit.time_out) {
        throw withStatus('This office visit is already completed.', 409);
    }

    const timeOut = new Date().toISOString();
    const { error } = await adminClient
        .from('office_visits')
        .update({
            time_out: timeOut,
            status: 'Completed'
        })
        .eq('id', officeVisit.id);

    if (error) throw error;

    return {
        success: true,
        officeVisitId: officeVisit.id,
        status: 'Completed',
        timeOut
    };
};

const syncAllStudentAuthEmails = async (adminClient: any, request: Request) => {
    await assertAdminRequest(adminClient, request);

    const { data: students, error } = await adminClient
        .from('students')
        .select('id, student_id, email, auth_user_id')
        .not('auth_user_id', 'is', null);

    if (error) throw error;

    let updatedCount = 0;
    let alreadySyncedCount = 0;
    let missingLinkedAuthCount = 0;
    let invalidEmailCount = 0;
    const warnings: string[] = [];

    for (const student of students || []) {
        const normalizedEmail = normalizeEmail(student.email);
        if (!student.auth_user_id) {
            continue;
        }

        if (!isValidEmail(normalizedEmail)) {
            invalidEmailCount += 1;
            warnings.push(`${student.student_id}: missing or invalid email on students row.`);
            continue;
        }

        const { data: authLookup, error: authLookupError } = await adminClient.auth.admin.getUserById(student.auth_user_id);
        if (authLookupError || !authLookup?.user) {
            if (isMissingAuthUserError(authLookupError)) {
                missingLinkedAuthCount += 1;
                warnings.push(`${student.student_id}: linked auth user was not found.`);
                continue;
            }

            throw authLookupError || new Error(`Unable to load linked auth user for ${student.student_id}.`);
        }

        const authEmail = normalizeEmail(authLookup.user.email);
        if (authEmail === normalizedEmail) {
            alreadySyncedCount += 1;
            continue;
        }

        const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
            student.auth_user_id,
            buildStudentAuthUpdatePayload(student, normalizedEmail)
        );

        if (authError || !updatedUser?.user) {
            warnings.push(`${student.student_id}: ${normalizeAuthUpdateError(authError || new Error('Failed to update linked auth email.'), normalizedEmail).message}`);
            continue;
        }

        const { error: updateStudentError } = await adminClient
            .from('students')
            .update({ email: normalizedEmail })
            .eq('id', student.id);

        if (updateStudentError) {
            throw updateStudentError;
        }

        updatedCount += 1;
    }

    return {
        success: true,
        updatedCount,
        alreadySyncedCount,
        missingLinkedAuthCount,
        invalidEmailCount,
        warnings
    };
};

serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        const body = await request.json();
        const adminClient = getAdminClient();
        const mode = String(body.mode || '').trim();

        if (mode === 'ping') {
            return json({ success: true });
        }

        if (mode === 'delete-all-students') {
            return json(await deleteAllStudents(adminClient, request));
        }

    if (mode === 'sync-auth-email') {
        return json(await syncStudentAuthEmail(adminClient, request, body.email));
    }

        if (mode === 'request-security-otp') {
            return json(await requestStudentSecurityOtp(adminClient, request, parseSecurityOtpPurpose(body.purpose), body.email));
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
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected student cleanup error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
