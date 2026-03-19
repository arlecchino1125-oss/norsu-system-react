import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const STUDENT_AUTH_DOMAIN = 'students.norsu.local';
const buildStudentAuthEmail = (studentId: string) =>
    `${String(studentId || '').trim()}@${STUDENT_AUTH_DOMAIN}`;

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

const generatePassword = (length = 12) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let result = '';
    for (let index = 0; index < length; index += 1) {
        result += alphabet[bytes[index] % alphabet.length];
    }
    return result;
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
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

const getDepartmentName = async (adminClient: any, course: string) => {
    const { data, error } = await adminClient
        .from('courses')
        .select('name, departments(name)')
        .eq('name', course)
        .maybeSingle();

    if (error) throw error;

    return data?.departments?.name || 'Unassigned';
};

const ensureEnrollmentKey = async (adminClient: any, studentId: string, course: string, email: string, allowCreate = false) => {
    let { data: keyData, error: keyError } = await adminClient
        .from('enrolled_students')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

    if (keyError) throw keyError;

    if (!keyData && allowCreate) {
        const { data: createdKey, error: createError } = await adminClient
            .from('enrolled_students')
            .insert([{
                student_id: studentId,
                course,
                is_used: false,
                status: 'Pending'
            }])
            .select('*')
            .single();

        if (createError) throw createError;
        keyData = createdKey;
    }

    if (!keyData) {
        throw new Error('Student ID not found in the enrollment list.');
    }

    if (keyData.course && String(keyData.course).trim().toLowerCase() !== course.trim().toLowerCase()) {
        throw new Error(`Course mismatch. This ID is enrolled in ${keyData.course}.`);
    }

    if (keyData.is_used && keyData.assigned_to_email !== email) {
        throw new Error('This Student ID has already been activated by another user.');
    }

    return keyData;
};

const createStudentAuthUser = async (
    adminClient: any,
    studentId: string,
    password: string,
    contactEmail: string
) => {
    const authEmail = buildStudentAuthEmail(studentId);
    const { data, error } = await adminClient.auth.admin.createUser({
        email: authEmail,
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
        const updatePayload = {
            ...payload,
            auth_user_id: authUserId,
            ...(existingStudent.profile_completed ? { profile_completed: true } : {}),
            ...(existingStudent.has_seen_tour ? { has_seen_tour: true } : {})
        };

        const { error: updateError } = await adminClient
            .from('students')
            .update(updatePayload)
            .eq('student_id', studentId);

        if (updateError) throw updateError;
        return existingStudent;
    }

    const { error: insertError } = await adminClient
        .from('students')
        .insert([{
            ...payload,
            student_id: studentId,
            auth_user_id: authUserId,
            profile_completed: false,
            has_seen_tour: false
        }]);

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

const buildStudentPayloadFromProfile = async (adminClient: any, studentId: string, course: string, profile: Record<string, unknown>) => {
    const department = await getDepartmentName(adminClient, course);
    const payload: Record<string, unknown> = {
        student_id: studentId,
        course,
        department,
        status: 'Active',
        profile_completed: true
    };

    Object.entries(PROFILE_FIELD_MAP).forEach(([sourceKey, targetKey]) => {
        if (sourceKey in profile) {
            const value = profile[sourceKey];
            payload[targetKey] = value === '' ? null : value;
        }
    });

    payload.supporter = Array.isArray(profile.supporter)
        ? profile.supporter.filter(Boolean).join(', ')
        : profile.supporter || null;
    payload.is_working_student = boolFromYesNo(profile.isWorkingStudent);
    payload.is_pwd = boolFromYesNo(profile.isPwd);
    payload.is_indigenous = boolFromYesNo(profile.isIndigenous);
    payload.witnessed_conflict = boolFromYesNo(profile.witnessedConflict);
    payload.is_safe_in_community = boolFromYesNo(profile.isSafeInCommunity);
    payload.is_solo_parent = boolFromYesNo(profile.isSoloParent);
    payload.is_child_of_solo_parent = boolFromYesNo(profile.isChildOfSoloParent);
    payload.mother_name = buildParentName({
        given: profile.motherGivenName,
        middle: profile.motherMiddleName,
        last: profile.motherLastName
    });
    payload.mother_last_name = profile.motherLastName || null;
    payload.mother_given_name = profile.motherGivenName || null;
    payload.mother_middle_name = profile.motherMiddleName || null;
    payload.father_name = buildParentName({
        given: profile.fatherGivenName,
        middle: profile.fatherMiddleName,
        last: profile.fatherLastName
    });
    payload.father_last_name = profile.fatherLastName || null;
    payload.father_given_name = profile.fatherGivenName || null;
    payload.father_middle_name = profile.fatherMiddleName || null;

    return payload;
};

const activateStudentProfileAccount = async (adminClient: any, body: Record<string, unknown>) => {
    const studentId = String(body.studentId || '').trim();
    const course = String(body.course || '').trim();
    const profile = typeof body.profile === 'object' && body.profile
        ? body.profile as Record<string, unknown>
        : {};
    const contactEmail = String(profile.email || '').trim();

    if (!studentId || !course || !contactEmail) {
        throw new Error('Missing required activation details.');
    }

    await ensureEnrollmentKey(adminClient, studentId, course, contactEmail, false);

    const generatedPassword = generatePassword();
    let createdAuthUserId: string | null = null;

    try {
        const authUser = await createStudentAuthUser(adminClient, studentId, generatedPassword, contactEmail);
        createdAuthUserId = authUser.id;
        const studentPayload = await buildStudentPayloadFromProfile(adminClient, studentId, course, profile);
        await upsertStudentRow(adminClient, studentId, authUser.id, studentPayload);
        await markEnrollmentKeyUsed(adminClient, studentId, contactEmail);

        return {
            success: true,
            studentId,
            password: generatedPassword
        };
    } catch (error) {
        if (createdAuthUserId) {
            await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
        }
        throw error;
    }
};

const activateNatStudentAccount = async (adminClient: any, body: Record<string, unknown>) => {
    const studentId = String(body.studentId || '').trim();
    const course = String(body.course || '').trim();
    const applicationId = String(body.applicationId || '').trim();

    if (!studentId || !course || !applicationId) {
        throw new Error('Missing required NAT activation details.');
    }

    const { data: application, error: applicationError } = await adminClient
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

    if (applicationError) throw applicationError;
    if (!application) throw new Error('Application not found.');

    const contactEmail = String(application.email || '').trim();
    if (!contactEmail) throw new Error('Application email is required before activation.');

    await ensureEnrollmentKey(
        adminClient,
        studentId,
        course,
        contactEmail,
        String(application.status || '') === 'Approved for Enrollment'
    );

    const initialPassword = String(application.password || '').trim() || generatePassword();
    const department = await getDepartmentName(adminClient, course);
    const studentPayload = {
        first_name: application.first_name || null,
        last_name: application.last_name || null,
        middle_name: application.middle_name || null,
        suffix: application.suffix || null,
        dob: application.dob || null,
        age: application.age || null,
        place_of_birth: application.place_of_birth || null,
        sex: application.sex || null,
        gender_identity: application.gender_identity || null,
        civil_status: application.civil_status || null,
        nationality: application.nationality || null,
        email: application.email || null,
        mobile: application.mobile || null,
        facebook_url: application.facebook_url || null,
        street: application.street || null,
        city: application.city || null,
        province: application.province || null,
        zip_code: application.zip_code || null,
        course,
        year_level: '1st Year',
        status: 'Active',
        department,
        priority_course: application.priority_course || null,
        alt_course_1: application.alt_course_1 || null,
        alt_course_2: application.alt_course_2 || null
    };

    const { data: existingStudent, error: existingStudentError } = await adminClient
        .from('students')
        .select('auth_user_id')
        .eq('student_id', studentId)
        .maybeSingle();

    if (existingStudentError) throw existingStudentError;

    let authUserId = existingStudent?.auth_user_id || null;
    let createdAuthUserId: string | null = null;

    try {
        if (!authUserId) {
            const authUser = await createStudentAuthUser(adminClient, studentId, initialPassword, contactEmail);
            authUserId = authUser.id;
            createdAuthUserId = authUser.id;
        }

        await upsertStudentRow(adminClient, studentId, authUserId, studentPayload);
        await markEnrollmentKeyUsed(adminClient, studentId, contactEmail);

        const { error: deleteError } = await adminClient
            .from('applications')
            .delete()
            .eq('id', applicationId);

        if (deleteError) throw deleteError;

        return {
            success: true,
            studentId,
            password: initialPassword
        };
    } catch (error) {
        if (createdAuthUserId) {
            await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
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
        const message = error instanceof Error ? error.message : 'Unexpected activation error.';
        return json({ success: false, error: message }, 400);
    }
});
