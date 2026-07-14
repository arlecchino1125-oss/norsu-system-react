import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { buildStudentPortalLoginUrl, escapeHtml, maskEmailAddress, sendEmail, trySendEmail } from '../_shared/emailService.ts';
import { generateRandomPassword } from '../_shared/randomPassword.ts';
import { requireNatSessionSecurity } from '../manage-nat-applications/natSecurity.ts';
import {
    classifyNatActivationCompletion,
    requireApprovedNatActivation
} from './natActivation.ts';

const STUDENT_ACTIVATION_SETTINGS_ROW_ID = 1;
const DEFAULT_REQUIRE_ENROLLMENT_KEY = true;

type StudentActivationPolicy = {
  requireEnrollmentKey: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

const normalizeRequireEnrollmentKey = (value: unknown) =>
  value === false ? false : DEFAULT_REQUIRE_ENROLLMENT_KEY;

const getStudentActivationPolicy = async (
  adminClient: any,
): Promise<StudentActivationPolicy> => {
  const { data: existingData, error } = await adminClient
    .from('student_activation_settings')
    .select('require_enrollment_key, updated_at, updated_by')
    .eq('id', STUDENT_ACTIVATION_SETTINGS_ROW_ID)
    .maybeSingle();
  let data = existingData;

  if (error) throw error;

  if (!data) {
    const { data: createdData, error: createError } = await adminClient
      .from('student_activation_settings')
      .upsert(
        {
          id: STUDENT_ACTIVATION_SETTINGS_ROW_ID,
          require_enrollment_key: DEFAULT_REQUIRE_ENROLLMENT_KEY,
        },
        { onConflict: 'id' },
      )
      .select('require_enrollment_key, updated_at, updated_by')
      .single();

    if (createError) throw createError;
    data = createdData;
  }

  return {
    requireEnrollmentKey: normalizeRequireEnrollmentKey(data?.require_enrollment_key),
    updatedAt: data?.updated_at ? String(data.updated_at) : null,
    updatedBy: data?.updated_by ? String(data.updated_by) : null,
  };
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const PROFILE_FIELD_MAP: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    middleName: 'middle_name',
    suffix: 'suffix',
    dob: 'dob',
    age: 'age',
    placeOfBirth: 'place_of_birth',
    sex: 'sex',
    genderIdentity: 'gender_identity',
    civilStatus: 'civil_status',
    nationality: 'nationality',
    religion: 'religion',
    email: 'email',
    mobile: 'mobile',
    facebookUrl: 'facebook_url',
    street: 'street',
    city: 'city',
    province: 'province',
    zipCode: 'zip_code',
    schoolLastAttended: 'school_last_attended',
    workingStudentType: 'working_student_type',
    supporterContact: 'supporter_contact',
    pwdType: 'pwd_type',
    indigenousGroup: 'indigenous_group',
    motherOccupation: 'mother_occupation',
    motherContact: 'mother_contact',
    fatherOccupation: 'father_occupation',
    fatherContact: 'father_contact',
    parentAddress: 'parent_address',
    numBrothers: 'num_brothers',
    numSisters: 'num_sisters',
    birthOrder: 'birth_order',
    spouseName: 'spouse_name',
    spouseOccupation: 'spouse_occupation',
    numChildren: 'num_children',
    guardianName: 'guardian_name',
    guardianAddress: 'guardian_address',
    guardianContact: 'guardian_contact',
    guardianRelation: 'guardian_relation',
    emergencyName: 'emergency_name',
    emergencyAddress: 'emergency_address',
    emergencyRelationship: 'emergency_relationship',
    emergencyNumber: 'emergency_number',
    elemSchool: 'elem_school',
    elemYearGraduated: 'elem_year_graduated',
    juniorHighSchool: 'junior_high_school',
    juniorHighYearGraduated: 'junior_high_year_graduated',
    seniorHighSchool: 'senior_high_school',
    seniorHighYearGraduated: 'senior_high_year_graduated',
    collegeSchool: 'college_school',
    collegeYearGraduated: 'college_year_graduated',
    honorsAwards: 'honors_awards',
    extracurricularActivities: 'extracurricular_activities',
    scholarshipsAvailed: 'scholarships_availed',
    yearLevelApplying: 'year_level',
    section: 'section'
};

const boolFromYesNo = (value: unknown) => String(value || '').trim().toLowerCase() === 'yes';

const buildParentName = (parts: { given?: unknown; middle?: unknown; last?: unknown }) =>
    [parts.given, parts.middle, parts.last]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
    || null;

const normalizeEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

const hasOwn = (value: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(value, key);

const isValidEmail = (value: string | null) =>
    Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });

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

const requireNatActivationSession = (adminClient: any, input: Record<string, unknown>) =>
    requireNatSessionSecurity(input, {
        now: () => new Date(),
        findSession: async ({ tokenHash, browserIdHash, now }) => {
            const { data: session, error: sessionError } = await adminClient
                .from('nat_applicant_sessions')
                .select('application_id, expires_at')
                .eq('token_hash', tokenHash)
                .eq('browser_id_hash', browserIdHash)
                .gt('expires_at', now)
                .maybeSingle();
            if (sessionError) throw sessionError;
            if (!session) return null;

            const { data: application, error: applicationError } = await adminClient
                .from('applications')
                .select('*')
                .eq('id', session.application_id)
                .maybeSingle();
            if (applicationError) throw applicationError;

            return application
                ? { application, expiresAt: session.expires_at }
                : null;
        }
    });

const probeNatActivationCompletion = async (
    adminClient: any,
    expected: { applicationId: string; studentId: string; authUserId: string }
) => {
    const [studentResult, archiveResult] = await Promise.all([
        adminClient
            .from('students')
            .select('student_id, auth_user_id')
            .eq('student_id', expected.studentId)
            .maybeSingle(),
        adminClient
            .from('application_archives')
            .select('source_application_id, activated_student_id')
            .eq('source_application_id', expected.applicationId)
            .maybeSingle()
    ]);

    return classifyNatActivationCompletion({
        student: studentResult.data,
        archive: archiveResult.data,
        studentError: studentResult.error,
        archiveError: archiveResult.error
    }, expected);
};

// Sent server-side (not via the public send-email relay) so the recipient/credentials in
// this email always come from the account we just created, never from a second, separately
// -trustable client call carrying an arbitrary email + plaintext password.
const sendStudentActivationEmail = async (details: {
    email: string;
    name: string;
    studentId: string;
    password: string;
}) => {
    const loginUrl = buildStudentPortalLoginUrl();
    const html = `
        <h2>Welcome to NORSU Student Portal</h2>
        <p>Dear ${escapeHtml(details.name || 'Student')},</p>
        <p>Your student account has been successfully activated.</p>
        <p>You can now access the Student Portal to manage your profile and use student services such as Needs Assessment, Counseling, Additional Support, Scholarships, Events, and Feedback.</p>
        <hr />
        <h3>Your Login Credentials</h3>
        <p><strong>Username (Student ID):</strong> ${escapeHtml(details.studentId)}</p>
        <p><strong>Password:</strong> ${escapeHtml(details.password)}</p>
        <p><em>This password was generated for your student portal account during activation.</em></p>
        <br />
        <p><a href="${escapeHtml(loginUrl)}">Login to Student Portal</a></p>
      `;

    await sendEmail({
        to: details.email,
        subject: 'Student Account Activated - Login Instructions',
        html,
        senderName: 'NORSU System',
        emailType: 'STUDENT_ACTIVATION'
    });
};

const getDepartmentName = async (adminClient: any, course: string) => {
    const { data, error } = await adminClient
        .from('courses')
        .select('name, departments(name)')
        .eq('name', course)
        .maybeSingle();

    if (error) throw error;

    return data?.departments?.name || 'Unassigned';
};

const ensureEnrollmentKey = async (
    adminClient: any,
    studentId: string,
    course: string,
    email: string
) => {
    const { data: keyData, error: keyError } = await adminClient
        .from('enrolled_students')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

    if (keyError) throw keyError;

    if (!keyData) {
        throw new Error('Student ID not found in the enrollment list.');
    }

    if (keyData.course && String(keyData.course).trim().toLowerCase() !== course.trim().toLowerCase()) {
        throw new Error(`Course mismatch. This ID is enrolled in ${keyData.course}.`);
    }

    if (keyData.is_used && normalizeEmail(keyData.assigned_to_email) !== email) {
        throw new Error('This Student ID has already been activated by another user.');
    }

    return keyData;
};

const ensureEnrollmentReference = async (adminClient: any, studentId: string) => {
    const { error } = await adminClient
        .from('enrolled_students')
        .upsert(
            [{ student_id: studentId }],
            { onConflict: 'student_id', ignoreDuplicates: true }
        );

    if (error) throw error;
};

const normalizeCreateAuthError = (error: any, contactEmail: string) => {
    const message = String(error?.message || error || '').toLowerCase();

    if (message.includes('already been registered')
        || message.includes('already exists')
        || message.includes('duplicate')) {
        return new Error(`A Supabase Auth account already exists for ${maskEmailAddress(contactEmail)}. Use a different email or reset the existing auth account first.`);
    }

    return error instanceof Error
        ? error
        : new Error('Failed to create student auth account.');
};

const createStudentAuthUser = async (
    adminClient: any,
    studentId: string,
    password: string,
    contactEmail: string
) => {
    const { data, error } = await adminClient.auth.admin.createUser({
        email: contactEmail,
        password,
        email_confirm: true,
        app_metadata: {
            role: 'student'
        },
        user_metadata: {
            student_id: studentId,
            contact_email: contactEmail
        }
    });

    if (error || !data?.user) {
        throw error || new Error('Failed to create student auth account.');
    }

    return data.user;
};

const cleanupCreatedAuthUser = async (adminClient: any, authUserId: string, mode: string) => {
    try {
        const { error } = await adminClient.auth.admin.deleteUser(authUserId);
        if (error) {
            await captureEdgeException(error, {
                endpoint: 'activate-student-account',
                phase: 'auth-cleanup',
                mode
            });
        }
    } catch (error) {
        await captureEdgeException(error, {
            endpoint: 'activate-student-account',
            phase: 'auth-cleanup',
            mode
        });
    }
};

const upsertStudentRow = async (
    adminClient: any,
    studentId: string,
    authUserId: string,
    payload: Record<string, unknown>
) => {
    const { data: existingStudent, error: existingError } = await adminClient
        .from('students')
        .select('id, auth_user_id, profile_completed, has_seen_tour')
        .eq('student_id', studentId)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existingStudent?.auth_user_id && existingStudent.auth_user_id !== authUserId) {
        throw new Error('This student record is already linked to a different auth account.');
    }

    if (existingStudent) {
        const shouldPreserveExistingFlags = Boolean(existingStudent.auth_user_id);
        const updatePayload = {
            ...payload,
            auth_user_id: authUserId,
            ...(shouldPreserveExistingFlags && existingStudent.profile_completed ? { profile_completed: true } : {}),
            ...(shouldPreserveExistingFlags && existingStudent.has_seen_tour ? { has_seen_tour: true } : {})
        };

        const { error: updateError } = await adminClient
            .from('students')
            .update(updatePayload)
            .eq('student_id', studentId);

        if (updateError) throw updateError;
        return existingStudent;
    }

    const insertPayload = {
        ...payload,
        student_id: studentId,
        auth_user_id: authUserId,
        profile_completed: Object.prototype.hasOwnProperty.call(payload, 'profile_completed')
            ? payload.profile_completed
            : false,
        has_seen_tour: Object.prototype.hasOwnProperty.call(payload, 'has_seen_tour')
            ? payload.has_seen_tour
            : false
    };

    const { error: insertError } = await adminClient
        .from('students')
        .insert([insertPayload]);

    if (insertError) throw insertError;
    return null;
};

const markEnrollmentKeyUsed = async (adminClient: any, studentId: string, email: string) => {
    const { error } = await adminClient
        .from('enrolled_students')
        .update({
            is_used: true,
            status: 'Activated',
            assigned_to_email: email
        })
        .eq('student_id', studentId);

    if (error) throw error;
};

const buildStudentPayloadFromProfile = async (
    adminClient: any,
    studentId: string,
    course: string,
    profile: Record<string, unknown>,
    options: {
        profileCompleted?: boolean;
    } = {}
) => {
    const department = await getDepartmentName(adminClient, course);
    const payload: Record<string, unknown> = {
        student_id: studentId,
        course,
        department,
        status: 'Active',
        profile_completed: options.profileCompleted === true
    };

    Object.entries(PROFILE_FIELD_MAP).forEach(([sourceKey, targetKey]) => {
        if (hasOwn(profile, sourceKey)) {
            const value = profile[sourceKey];
            payload[targetKey] = value === '' ? null : value;
        }
    });

    if (hasOwn(profile, 'supporter')) {
        payload.supporter = Array.isArray(profile.supporter)
            ? profile.supporter.filter(Boolean).join(', ')
            : profile.supporter || null;
    }
    if (hasOwn(profile, 'isWorkingStudent')) {
        payload.is_working_student = boolFromYesNo(profile.isWorkingStudent);
    }
    if (hasOwn(profile, 'isPwd')) {
        payload.is_pwd = boolFromYesNo(profile.isPwd);
    }
    if (hasOwn(profile, 'isIndigenous')) {
        payload.is_indigenous = boolFromYesNo(profile.isIndigenous);
    }
    if (hasOwn(profile, 'witnessedConflict')) {
        payload.witnessed_conflict = boolFromYesNo(profile.witnessedConflict);
    }
    if (hasOwn(profile, 'isSafeInCommunity')) {
        payload.is_safe_in_community = boolFromYesNo(profile.isSafeInCommunity);
    }
    if (hasOwn(profile, 'isSoloParent')) {
        payload.is_solo_parent = boolFromYesNo(profile.isSoloParent);
    }
    if (hasOwn(profile, 'isChildOfSoloParent')) {
        payload.is_child_of_solo_parent = boolFromYesNo(profile.isChildOfSoloParent);
    }

    const hasMotherDetails = ['motherGivenName', 'motherMiddleName', 'motherLastName', 'motherOccupation', 'motherContact']
        .some((key) => hasOwn(profile, key));
    if (hasMotherDetails) {
        payload.mother_name = buildParentName({
            given: profile.motherGivenName,
            middle: profile.motherMiddleName,
            last: profile.motherLastName
        });
        payload.mother_last_name = profile.motherLastName || null;
        payload.mother_given_name = profile.motherGivenName || null;
        payload.mother_middle_name = profile.motherMiddleName || null;
    }

    const hasFatherDetails = ['fatherGivenName', 'fatherMiddleName', 'fatherLastName', 'fatherOccupation', 'fatherContact']
        .some((key) => hasOwn(profile, key));
    if (hasFatherDetails) {
        payload.father_name = buildParentName({
            given: profile.fatherGivenName,
            middle: profile.fatherMiddleName,
            last: profile.fatherLastName
        });
        payload.father_last_name = profile.fatherLastName || null;
        payload.father_given_name = profile.fatherGivenName || null;
        payload.father_middle_name = profile.fatherMiddleName || null;
    }

    return payload;
};

const activateStudentProfileAccount = async (adminClient: any, body: Record<string, unknown>) => {
    const studentId = String(body.studentId || '').trim();
    const course = String(body.course || '').trim();
    const password = String(body.password || '');
    const profile = typeof body.profile === 'object' && body.profile
        ? body.profile as Record<string, unknown>
        : {};
    const contactEmail = normalizeEmail(profile.email);

    if (!studentId || !course || !contactEmail) {
        throw new Error('Missing required activation details.');
    }

    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
    }

    if (!isValidEmail(contactEmail)) {
        throw new Error('A valid student email address is required before activation.');
    }

    const { data: existingStudent, error: existingStudentError } = await adminClient
        .from('students')
        .select('auth_user_id')
        .eq('student_id', studentId)
        .maybeSingle();

    if (existingStudentError) throw existingStudentError;
    if (existingStudent?.auth_user_id) {
        throw new Error('This student ID has already been activated. Sign in with the existing account or ask an admin to reset it first.');
    }

    const activationPolicy = await getStudentActivationPolicy(adminClient);
    if (activationPolicy.requireEnrollmentKey) {
        await ensureEnrollmentKey(adminClient, studentId, course, contactEmail);
    } else {
        await ensureEnrollmentReference(adminClient, studentId);
    }

    let createdAuthUserId: string | null = null;

    try {
        const authUser = await createStudentAuthUser(adminClient, studentId, password, contactEmail)
            .catch((error) => {
                throw normalizeCreateAuthError(error, contactEmail);
            });
        createdAuthUserId = authUser.id;
        const studentPayload = await buildStudentPayloadFromProfile(adminClient, studentId, course, profile, {
            profileCompleted: false
        });
        studentPayload.email = contactEmail;
        await upsertStudentRow(adminClient, studentId, authUser.id, studentPayload);
        if (activationPolicy.requireEnrollmentKey) {
            await markEnrollmentKeyUsed(adminClient, studentId, contactEmail);
        }

        return {
            success: true,
            studentId
        };
    } catch (error) {
        if (createdAuthUserId) {
            await cleanupCreatedAuthUser(adminClient, createdAuthUserId, 'student-profile-activation');
        }
        throw error;
    }
};

const activateNatStudentAccount = async (adminClient: any, body: Record<string, unknown>) => {
    const studentId = String(body.studentId || '').trim();
    const course = String(body.course || '').trim();

    if (!studentId || !course) {
        throw new Error('Missing required NAT activation details.');
    }

    const application = await requireApprovedNatActivation(
        body,
        (input) => requireNatActivationSession(adminClient, input)
    );

    const contactEmail = normalizeEmail(application.email);
    if (!contactEmail) throw new Error('Application email is required before activation.');
    if (!isValidEmail(contactEmail)) {
        throw new Error('A valid student email address is required before activation.');
    }

    const initialPassword = generateRandomPassword();

    const { data: existingStudent, error: existingStudentError } = await adminClient
        .from('students')
        .select('auth_user_id')
        .eq('student_id', studentId)
        .maybeSingle();

    if (existingStudentError) throw existingStudentError;

    if (existingStudent?.auth_user_id) {
        throw new Error('This student ID is already activated. Sign in with the existing account or ask an admin to reset it first.');
    }

    let createdAuthUserId: string | null = null;
    let databaseActivationCommitted = false;
    let cleanupAuthOnFailure = true;

    try {
        const authUser = await createStudentAuthUser(adminClient, studentId, initialPassword, contactEmail)
            .catch((error) => {
                throw normalizeCreateAuthError(error, contactEmail);
            });
        createdAuthUserId = authUser.id;

        const { error: activationError } = await adminClient.rpc(
            'complete_nat_student_activation',
            {
                p_application_id: application.id,
                p_student_id: studentId,
                p_auth_user_id: authUser.id,
                p_course: course
            }
        );

        if (activationError) {
            const hasDefiniteDatabaseCode = Boolean(String(activationError.code || '').trim());

            if (hasDefiniteDatabaseCode) {
                throw new Error(activationError.message || 'Failed to complete student activation.');
            }

            const completionState = await probeNatActivationCompletion(adminClient, {
                applicationId: application.id,
                studentId,
                authUserId: authUser.id
            });

            if (completionState === 'committed') {
                databaseActivationCommitted = true;
            } else {
                cleanupAuthOnFailure = false;
                await captureEdgeException(activationError, {
                    endpoint: 'activate-student-account',
                    phase: 'activation-result-ambiguous',
                    mode: 'nat-application-activation'
                });

                const recoveryError = new Error(
                    'We could not confirm whether activation completed. Please contact CARE staff before trying again.'
                ) as Error & { status?: number };
                recoveryError.status = 503;
                throw recoveryError;
            }
        } else {
            databaseActivationCommitted = true;
        }

        const { emailSent, emailError } = await trySendEmail(
            () => sendStudentActivationEmail({
                email: contactEmail,
                name: `${application.first_name || ''} ${application.last_name || ''}`.trim(),
                studentId,
                password: initialPassword
            }),
            'Failed to send student activation email:'
        );

        return {
            success: true,
            studentId,
            password: initialPassword,
            emailSent,
            emailError
        };
    } catch (error) {
        if (createdAuthUserId && !databaseActivationCommitted && cleanupAuthOnFailure) {
            await cleanupCreatedAuthUser(adminClient, createdAuthUserId, 'nat-application-activation');
        }
        throw error;
    }
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

        if (mode === 'student-profile-activation') {
            return json(await activateStudentProfileAccount(adminClient, body));
        }

        if (mode === 'nat-application-activation') {
            return json(await activateNatStudentAccount(adminClient, body));
        }

        return json({ success: false, error: 'Unsupported activation mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'activate-student-account' });
        const message = error instanceof Error ? error.message : 'Unexpected activation error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
