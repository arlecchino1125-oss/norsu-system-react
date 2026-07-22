import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { STUDENT_LIST_COLUMNS } from '../../../../../services/careStaffService';
import { uploadProfileDocument } from '../profileDocumentStorage';
import { fetchDepartmentNameForCourse } from '../../../../../utils/courseDepartment';
import { joinNameParts, splitFullName } from '../../../../../utils/nameUtils';
import { buildStudentAddress, getStudentEmergencyContact, getStudentSex } from '../../../../../utils/studentFields';
import { isValidEmailDomain } from '../../../../../utils/inputSecurity';
import { getProfileTextFieldRule } from '../../../../../utils/profileFieldRules';
import { getStoredAssetPath } from '../../../../../utils/storageAssets';
import {
    clearPendingProfileCompletion,
    getPendingProfileCompletionProfile,
    shouldForceProfileCompletionPrompt
} from '../../../../../lib/studentProfileCompletionPrompt';
import { useStudentProfileCompletionGate } from '../../../hooks/useStudentProfileCompletionGate';
import type { Student } from '../../../types';
import {
    isValidYearLevel,
    normalizeStudentEmail,
    toYesNoChoice,
    hasFilledProfileValue,
    isProfileCompletionFormComplete,
    createInitialProfileFormData,
    buildProfileCompletionFormSnapshot
} from '../profileFormUtils';
import { ARCHIVE_RPC_MISSING_CACHE_KEY, ARCHIVE_RPC_CHECKED_CACHE_KEY } from '../../../../../utils/archiveRpc';

const supabaseClient = supabase;

// The student is the only in-session writer of their own profile, so it can
// stay cached for an hour. Their own writes bypass this via refreshStudentProfile(true),
// and the profile view's refresh button forces a fresh fetch on demand.
const STUDENT_PROFILE_STALE_MS = 60 * 60 * 1000;

interface UseStudentProfileFormArgs {
    session: any;
    updateSession: any;
    showToast: (message: string, type?: string) => void;
    setHasSeenTourState: React.Dispatch<React.SetStateAction<boolean>>;
}

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
    address: 'Address',
    street: 'Street',
    city: 'City',
    province: 'Province',
    zip_code: 'Zip Code',
    region: 'Region',
    mobile: 'Mobile',
    email: 'Email',
    facebook_url: 'Facebook URL',
    religion: 'Religion',
    year_level: 'Year Level',
    department: 'Department',
    course: 'Complete Program',
    section: 'Section',
    supporter: 'Supporter',
    supporter_contact: 'Supporter Contact',
    is_working_student: 'Working Student Status',
    working_student_type: 'Working Student Type',
    employer_name: 'Employer Name',
    employer_address: 'Employer Address',
    is_pwd: 'PWD Status',
    pwd_number: 'PWD Number',
    pwd_type: 'PWD Type',
    disability_cause: 'Cause of Disability',
    pwd_document_url: 'PWD Claim Document',
    is_indigenous: 'Indigenous Status',
    indigenous_group: 'Indigenous Group',
    ip_document_url: 'IP Claim Document',
    is_four_ps_member: '4Ps Membership',
    four_ps_document_url: '4Ps Document',
    is_rebel_returnee: 'Rebel Returnee Status',
    is_solo_parent: 'Solo Parent Status',
    is_child_of_solo_parent: 'Child of Solo Parent Status',
    solo_parent_document_url: 'Solo Parent Document',
    is_orphan: 'Orphan Status',
    orphan_cause: 'Orphan Cause',
    is_homeless_citizen: 'Homeless Citizen Status',
    is_senior_citizen: 'Senior Citizen Status',
    senior_citizen_document_url: 'Senior Citizen Document',
    work_experiences: 'Work Experiences',
    mother_name: 'Mother Name',
    mother_last_name: 'Mother Last Name',
    mother_given_name: 'Mother Given Name',
    mother_middle_name: 'Mother Middle Name',
    mother_occupation: 'Mother Occupation',
    mother_status: 'Mother Status',
    mother_contact: 'Mother Contact',
    mother_address: 'Mother Address',
    father_name: 'Father Name',
    father_last_name: 'Father Last Name',
    father_given_name: 'Father Given Name',
    father_middle_name: 'Father Middle Name',
    father_occupation: 'Father Occupation',
    father_status: 'Father Status',
    father_contact: 'Father Contact',
    father_address: 'Father Address',
    parents_num_children: 'Parents Number of Children',
    birth_order: 'Birth Order',
    birth_order_other: 'Birth Order Other',
    spouse_name: 'Spouse Name',
    spouse_occupation: 'Spouse Occupation',
    spouse_employer_name: 'Spouse Employer/Business Name',
    spouse_employer_address: 'Spouse Employer/Business Address',
    spouse_contact: 'Spouse Contact Number',
    num_children: 'No. of Children',
    children_names_birthdates: 'Children Names and Birthdates',
    currently_pregnant: 'Currently Pregnant',
    guardian_name: 'Guardian Name',
    guardian_address: 'Guardian Address',
    guardian_contact: 'Guardian Contact',
    guardian_relation: 'Guardian Relation',
    emergency_name: 'Person to Contact Full Name',
    emergency_address: 'Person to Contact Address',
    emergency_relationship: 'Person to Contact Relationship',
    emergency_number: 'Person to Contact Number',
    elem_school: 'Elementary School',
    elem_year_graduated: 'Elementary Inclusive Years Attended',
    junior_high_school: 'Junior High School',
    junior_high_year_graduated: 'Junior High Inclusive Years Attended',
    senior_high_school: 'Senior High School',
    senior_high_year_graduated: 'Senior High Inclusive Years Attended',
    college_school: 'Transferee College School',
    college_year_graduated: 'College Inclusive Years Attended',
    honors_awards: 'Honors/Awards',
    tesda_nc2_acquired: 'TESDA NC II Acquired - Date Acquired - Validity',
    eligibility_acquired: 'Eligibility Acquired - Date Acquired',
    special_trainings_attended: 'Special Trainings Attended',
    extracurricular_activities: 'Voluntary Activities',
    holds_public_service_position: 'Public Service Position Holder',
    public_service_position: 'Position in Public Service',
    organizations_memberships: 'Organizations Memberships',
    sports_skills: 'Sports',
    other_talents: 'Other Talents',
    scholarships_availed: 'Scholarship Availed and Sponsor',
    has_been_criminally_charged: 'Criminally Charged Before Any Court',
    has_been_convicted_of_crime: 'Convicted of Any Crime',
    profile_completed: 'Profile Completion',
    profile_picture_url: 'Profile Picture'
};

const toProfileFieldLabel = (field: string) => {
    if (PROFILE_FIELD_LABELS[field]) return PROFILE_FIELD_LABELS[field];
    return field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeProfileField = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value);
    return String(value).trim();
};

const formatGateDate = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const getChangedProfileFields = (beforeProfile: any, afterPayload: any) => {
    const changedFields: string[] = [];
    Object.keys(afterPayload || {}).forEach((key) => {
        const beforeValue = normalizeProfileField(beforeProfile?.[key]);
        const afterValue = normalizeProfileField(afterPayload?.[key]);
        if (beforeValue !== afterValue) {
            changedFields.push(toProfileFieldLabel(key));
        }
    });
    return changedFields;
};

const getCourseYearWindowRange = (startValue: string | null | undefined, endValue: string | null | undefined) => {
    const startText = formatGateDate(startValue || null);
    const endText = formatGateDate(endValue || null);
    if (startText && endText) return `${startText} to ${endText}`;
    if (startText) return `Starts ${startText}`;
    if (endText) return `Until ${endText}`;
    return null;
};

const getSchoolYearLabel = (startValue: string | null | undefined, endValue: string | null | undefined) => {
    const startDate = startValue ? new Date(startValue) : null;
    const endDate = endValue ? new Date(endValue) : null;
    const hasStart = Boolean(startDate && !Number.isNaN(startDate.getTime()));
    const hasEnd = Boolean(endDate && !Number.isNaN(endDate.getTime()));

    if (!hasStart && !hasEnd) return 'SY Unknown';
    if (!hasStart && hasEnd) {
        const endYear = (endDate as Date).getFullYear();
        return `SY ${endYear - 1}-${endYear}`;
    }
    if (hasStart && !hasEnd) {
        const startYear = (startDate as Date).getFullYear();
        return `SY ${startYear}-${startYear + 1}`;
    }

    const startYear = (startDate as Date).getFullYear();
    const endYear = (endDate as Date).getFullYear();
    return `SY ${Math.min(startYear, endYear)}-${Math.max(startYear, endYear)}`;
};

// Profile domain lifted verbatim from useStudentPortal (see docs/portal-structure-refactor-plan.md).
// Owns personalInfo, hydration from the students row, profile save/security/picture
// flows, the course-year gate, and the profile-completion gate wiring.
export function useStudentProfileForm({
    session,
    updateSession,
    showToast,
    setHasSeenTourState
}: UseStudentProfileFormArgs) {
    const queryClient = useQueryClient();

    // Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [personalInfo, setPersonalInfo] = useState<Student>({
        firstName: "", lastName: "", middleName: "", suffix: "",
        studentId: "", department: "", course: "", year: "", section: "", status: "",
        address: "", street: "", city: "", province: "", zipCode: "", region: "",
        mobile: "", email: "", facebookUrl: "", emergencyContact: "",
        profile_picture_url: "",
        dob: "", age: "", placeOfBirth: "",
        sex: "", genderIdentity: "",
        civilStatus: "", nationality: "",
        priorityCourse: "", altCourse1: "", altCourse2: "",
        isWorkingStudent: false, workingStudentType: "",
        employerName: "", employerAddress: "",
        supporter: "", supporterContact: "",
        isPwd: false, pwdNumber: "", pwdType: "", disabilityCause: "", pwdDocumentUrl: "",
        isIndigenous: false, indigenousGroup: "", ipDocumentUrl: "",
        isFourPsMember: false, fourPsDocumentUrl: "",
        isRebelReturnee: false,
        motherLastName: "", motherGivenName: "", motherMiddleName: "",
        fatherLastName: "", fatherGivenName: "", fatherMiddleName: "",
        isSoloParent: false, isChildOfSoloParent: false, soloParentDocumentUrl: "",
        isOrphan: false, orphanCause: "", isHomelessCitizen: false,
        isSeniorCitizen: false, seniorCitizenDocumentUrl: "",
        workExperiences: "",
        elemSchool: "", elemYearGraduated: "",
        juniorHighSchool: "", juniorHighYearGraduated: "",
        seniorHighSchool: "", seniorHighYearGraduated: "",
        collegeSchool: "", collegeYearGraduated: "",
        honorsAwards: "", tesdaNc2Acquired: "", eligibilityAcquired: "", specialTrainingsAttended: "",
        extracurricularActivities: "", holdsPublicServicePosition: "", publicServicePosition: "",
        organizationsMemberships: "", sportsSkills: "", otherTalents: "",
        scholarshipsAvailed: "", hasBeenCriminallyCharged: "", hasBeenConvictedOfCrime: ""
    });
    const [showMoreProfile, setShowMoreProfile] = useState(false);
    const [courseYearGate, setCourseYearGate] = useState<any>({
        visible: false,
        expired: false,
        course: '',
        year: '1st Year',
        courseLocked: false,
        yearLocked: false,
        courseOptions: [] as string[],
        windowStart: null as string | null,
        windowEnd: null as string | null
    });
    const [isSubmittingCourseYearGate, setIsSubmittingCourseYearGate] = useState(false);
    const courseYearGateVisibleRef = useRef(false);
    const courseYearGateConfirmedRef = useRef(false);
    const archiveRpcStateRef = useRef<'unknown' | 'available' | 'missing'>(
        sessionStorage.getItem(ARCHIVE_RPC_MISSING_CACHE_KEY) === '1' ? 'missing' : 'unknown'
    );
    const archiveRpcCheckedKeysRef = useRef<Set<string>>(new Set());
    const courseOptionsCacheRef = useRef<string[] | null>(null);

    // Profile Completion Modal State
    const {
        forceProfileCompletionPrompt,
        setForceProfileCompletionPrompt,
        profileServiceGate,
        profileCompletionInitialData,
        setProfileCompletionInitialData,
        setProfileCompletionStatusOverride,
        setProfileFieldsComplete,
        profileCompletionJustCompletedRef,
        refreshStudentProfileRequestRef,
        profileCompletionReminderRequired,
        profileCompletionGateActive,
        profileCompletionReminderVisible,
        openProfileCompletionModal,
        closeProfileCompletionModal,
        closeProfileServiceGate,
        openProfileCompletionFromServiceGate,
        requireCompletedProfileForService,
        dismissProfileCompletionReminder
    } = useStudentProfileCompletionGate({
        session,
        createInitialProfileFormData
    });
    const [isSavingProfileChanges, setIsSavingProfileChanges] = useState(false);

    const getStoredParentParts = React.useCallback((studentData: any, prefix: 'mother' | 'father') => {
        const last = studentData?.[`${prefix}_last_name`] || '';
        const given = studentData?.[`${prefix}_given_name`] || '';
        const middle = studentData?.[`${prefix}_middle_name`] || '';

        if (last || given || middle) {
            return { last, given, middle };
        }

        const fallback = splitFullName(studentData?.[`${prefix}_name`]);
        return {
            last: fallback.last,
            given: fallback.given,
            middle: fallback.middle
        };
    }, []);

    const syncStudentSession = React.useCallback((studentPatch: any) => {
        if (!studentPatch || session?.userType !== 'student') return;
        updateSession?.((prev: any) => ({
            ...(prev || {}),
            ...studentPatch,
            userType: 'student',
            role: 'Student'
        }));
    }, [session?.userType, updateSession]);


    const handleProfileCompletionSuccess = useCallback(async ({
        submittedProfile,
        updatedStudent
    }: {
        submittedProfile: any;
        updatedStudent: any;
    }) => {
        if (!updatedStudent?.student_id) {
            throw new Error('Profile saved, but the latest student record was not returned.');
        }

        const matchedDepartment = updatedStudent.department || personalInfo.department || session?.department || 'Unassigned';
        const motherParts = getStoredParentParts(updatedStudent, 'mother');
        const fatherParts = getStoredParentParts(updatedStudent, 'father');
        const sessionPrefillProfile = {
            firstName: session?.first_name,
            lastName: session?.last_name,
            middleName: session?.middle_name,
            suffix: session?.suffix,
            dob: session?.dob,
            age: session?.age,
            sex: session?.sex,
            street: session?.street,
            city: session?.city,
            province: session?.province,
            zipCode: session?.zip_code,
            region: session?.region,
            mobile: session?.mobile,
            email: session?.email
        };
        const pendingActivationProfile = getPendingProfileCompletionProfile(updatedStudent.student_id)
            || getPendingProfileCompletionProfile()
            || {};
        const nextProfileSnapshot = buildProfileCompletionFormSnapshot({
            base: createInitialProfileFormData(),
            studentData: updatedStudent,
            pendingActivationProfile,
            sessionPrefillProfile,
            motherParts,
            fatherParts
        });

        setPersonalInfo((prev: any) => ({
            ...prev,
            firstName: updatedStudent.first_name || '',
            lastName: updatedStudent.last_name || '',
            middleName: updatedStudent.middle_name || '',
            suffix: updatedStudent.suffix || '',
            studentId: updatedStudent.student_id,
            profile_picture_url: updatedStudent.profile_picture_url || prev.profile_picture_url || '',
            course: updatedStudent.course || prev.course || '',
            year: updatedStudent.year_level || '',
            status: updatedStudent.status || prev.status || 'Active',
            department: matchedDepartment,
            section: updatedStudent.section || '',
            email: updatedStudent.email || '',
            mobile: updatedStudent.mobile || '',
            facebookUrl: updatedStudent.facebook_url || '',
            address: buildStudentAddress(updatedStudent),
            street: updatedStudent.street || '',
            city: updatedStudent.city || '',
            province: updatedStudent.province || '',
            zipCode: updatedStudent.zip_code || '',
            region: updatedStudent.region || '',
            emergencyContact: getStudentEmergencyContact(updatedStudent),
            dob: updatedStudent.dob || '',
            age: updatedStudent.age || '',
            placeOfBirth: updatedStudent.place_of_birth || '',
            sex: getStudentSex(updatedStudent),
            genderIdentity: updatedStudent.gender_identity || '',
            civilStatus: updatedStudent.civil_status || '',
            nationality: updatedStudent.nationality || '',
            isWorkingStudent: updatedStudent.is_working_student || false,
            workingStudentType: updatedStudent.working_student_type || '',
            employerName: updatedStudent.employer_name || '',
            employerAddress: updatedStudent.employer_address || '',
            supporter: updatedStudent.supporter || '',
            supporterContact: updatedStudent.supporter_contact || '',
            isPwd: updatedStudent.is_pwd || false,
            pwdNumber: updatedStudent.pwd_number || '',
            pwdType: updatedStudent.pwd_type || '',
            disabilityCause: updatedStudent.disability_cause || '',
            pwdDocumentUrl: updatedStudent.pwd_document_url || '',
            isIndigenous: updatedStudent.is_indigenous || false,
            indigenousGroup: updatedStudent.indigenous_group || '',
            ipDocumentUrl: updatedStudent.ip_document_url || '',
            isFourPsMember: updatedStudent.is_four_ps_member || false,
            fourPsDocumentUrl: updatedStudent.four_ps_document_url || '',
            isRebelReturnee: updatedStudent.is_rebel_returnee || false,
            isSoloParent: updatedStudent.is_solo_parent || false,
            isChildOfSoloParent: updatedStudent.is_child_of_solo_parent || false,
            soloParentDocumentUrl: updatedStudent.solo_parent_document_url || '',
            isOrphan: updatedStudent.is_orphan || false,
            orphanCause: updatedStudent.orphan_cause || '',
            isHomelessCitizen: updatedStudent.is_homeless_citizen || false,
            isSeniorCitizen: updatedStudent.is_senior_citizen || false,
            seniorCitizenDocumentUrl: updatedStudent.senior_citizen_document_url || '',
            workExperiences: updatedStudent.work_experiences || '',
            religion: updatedStudent.religion || '',
            motherLastName: motherParts.last,
            motherGivenName: motherParts.given,
            motherMiddleName: motherParts.middle,
            motherOccupation: updatedStudent.mother_occupation || '',
            motherStatus: updatedStudent.mother_status || '',
            motherContact: updatedStudent.mother_contact || '',
            motherAddress: updatedStudent.mother_address || '',
            fatherLastName: fatherParts.last,
            fatherGivenName: fatherParts.given,
            fatherMiddleName: fatherParts.middle,
            fatherOccupation: updatedStudent.father_occupation || '',
            fatherStatus: updatedStudent.father_status || '',
            fatherContact: updatedStudent.father_contact || '',
            fatherAddress: updatedStudent.father_address || '',
            parentsNumChildren: updatedStudent.parents_num_children || '',
            birthOrder: updatedStudent.birth_order || '',
            birthOrderOther: updatedStudent.birth_order_other || '',
            spouseName: updatedStudent.spouse_name || '',
            spouseOccupation: updatedStudent.spouse_occupation || '',
            spouseEmployerName: updatedStudent.spouse_employer_name || '',
            spouseEmployerAddress: updatedStudent.spouse_employer_address || '',
            spouseContact: updatedStudent.spouse_contact || '',
            numChildren: updatedStudent.num_children || '',
            childrenNamesBirthdates: updatedStudent.children_names_birthdates || '',
            currentlyPregnant: updatedStudent.currently_pregnant || '',
            guardianName: updatedStudent.guardian_name || '',
            guardianAddress: updatedStudent.guardian_address || '',
            guardianContact: updatedStudent.guardian_contact || '',
            guardianRelation: updatedStudent.guardian_relation || '',
            emergencyName: updatedStudent.emergency_name || '',
            emergencyAddress: updatedStudent.emergency_address || '',
            emergencyRelationship: updatedStudent.emergency_relationship || '',
            emergencyNumber: updatedStudent.emergency_number || '',
            elemSchool: updatedStudent.elem_school || '',
            elemYearGraduated: updatedStudent.elem_year_graduated || '',
            juniorHighSchool: updatedStudent.junior_high_school || '',
            juniorHighYearGraduated: updatedStudent.junior_high_year_graduated || '',
            seniorHighSchool: updatedStudent.senior_high_school || '',
            seniorHighYearGraduated: updatedStudent.senior_high_year_graduated || '',
            collegeSchool: updatedStudent.college_school || '',
            collegeYearGraduated: updatedStudent.college_year_graduated || '',
            honorsAwards: updatedStudent.honors_awards || '',
            tesdaNc2Acquired: updatedStudent.tesda_nc2_acquired || '',
            eligibilityAcquired: updatedStudent.eligibility_acquired || '',
            specialTrainingsAttended: updatedStudent.special_trainings_attended || '',
            extracurricularActivities: updatedStudent.extracurricular_activities || '',
            holdsPublicServicePosition: toYesNoChoice(updatedStudent.holds_public_service_position) || '',
            publicServicePosition: updatedStudent.public_service_position || '',
            organizationsMemberships: updatedStudent.organizations_memberships || '',
            sportsSkills: updatedStudent.sports_skills || '',
            otherTalents: updatedStudent.other_talents || '',
            scholarshipsAvailed: updatedStudent.scholarships_availed || '',
            hasBeenCriminallyCharged: toYesNoChoice(updatedStudent.has_been_criminally_charged) || '',
            hasBeenConvictedOfCrime: toYesNoChoice(updatedStudent.has_been_convicted_of_crime) || '',
            courseYearWindowStart: updatedStudent.course_year_window_start || null,
            courseYearWindowEnd: updatedStudent.course_year_window_end || null,
            course_year_profile_edited: Boolean(updatedStudent.course_year_profile_edited)
        }));
        setProfileCompletionInitialData(nextProfileSnapshot);
        profileCompletionJustCompletedRef.current = true;
        setProfileFieldsComplete(isProfileCompletionFormComplete(nextProfileSnapshot));
        setProfileCompletionStatusOverride(true);
        clearPendingProfileCompletion(updatedStudent.student_id || personalInfo.studentId);
        setForceProfileCompletionPrompt(false);
        closeProfileCompletionModal();
        syncStudentSession({
            ...updatedStudent,
            department: matchedDepartment,
            profile_completed: true
        });
        showToast('Your profile is ready.');
    }, [
        getStoredParentParts,
        personalInfo.department,
        personalInfo.studentId,
        closeProfileCompletionModal,
        session?.age,
        session?.city,
        session?.department,
        session?.dob,
        session?.email,
        session?.first_name,
        session?.last_name,
        session?.middle_name,
        session?.mobile,
        session?.province,
        session?.region,
        session?.sex,
        session?.street,
        session?.suffix,
        session?.zip_code,
        profileCompletionJustCompletedRef,
        setForceProfileCompletionPrompt,
        setProfileCompletionInitialData,
        setProfileCompletionStatusOverride,
        setProfileFieldsComplete,
        showToast,
        syncStudentSession
    ]);


    const invokeManagedStudentFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-student-accounts', {
            client: supabaseClient,
            body,
            requireAuth: true,
            non2xxMessage: 'Your student session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to update your student profile.'
        });
    }, []);

    const syncStudentAuthEmailIfNeeded = useCallback(async (nextEmailValue: unknown) => {
        const nextEmail = normalizeStudentEmail(nextEmailValue);
        if (!nextEmail) {
            throw new Error('Email is required.');
        }

        // Force a fresh auth token before calling a JWT-protected edge function.
        const { data: refreshedSessionData, error: refreshError } = await supabaseClient.auth.refreshSession();
        // Ordered on purpose: getSession() reads the auth store refreshSession() just updated;
        // running them in parallel could return a stale token.
        // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
        const { data: authSessionData } = await supabaseClient.auth.getSession();
        const accessToken = refreshedSessionData.session?.access_token || authSessionData.session?.access_token;
        if (!accessToken) {
            if (refreshError) {
                console.warn('Failed to refresh student auth session before email sync.', refreshError);
            }
            throw new Error('Your login session has expired. Please sign in again before changing your email.');
        }

        const data = await invokeEdgeFunction('manage-student-accounts', {
            client: supabaseClient,
            accessToken,
            body: {
                mode: 'sync-auth-email',
                email: nextEmail
            },
            non2xxMessage: 'Your Supabase login session could not be verified. Please sign out and sign in again, then try again.',
            fallbackMessage: 'Failed to sync your student login email.'
        });

        syncStudentSession({
            email: nextEmail,
            auth_email: nextEmail,
            user: {
                ...(session?.user || {}),
                id: session?.user?.id || session?.auth_user_id || null,
                email: nextEmail
            }
        });

        return nextEmail;
    }, [session?.auth_user_id, session?.user, syncStudentSession]);

    const submitCourseYearConfirmation = async () => {
        if (!personalInfo.studentId) return;
        if (!courseYearGate.course) {
            showToast('Course is required.', 'error');
            return;
        }
        if (!isValidYearLevel(courseYearGate.year)) {
            showToast('Select a valid year level.', 'error');
            return;
        }
        if (courseYearGate.expired) {
            showToast('Course/year update window has ended. Contact CARE staff.', 'error');
            return;
        }

        setIsSubmittingCourseYearGate(true);
        try {
            const nowIso = new Date().toISOString();
            const matchedDepartment = await fetchDepartmentNameForCourse(
                supabaseClient,
                courseYearGate.course,
                personalInfo.department || 'Unassigned'
            );
            await invokeManagedStudentFunction({
                mode: 'confirm-course-year',
                payload: {
                    course: courseYearGate.course,
                    year_level: courseYearGate.year,
                    department: matchedDepartment,
                    status: 'Active',
                    course_year_confirmed_at: nowIso,
                    course_year_update_required: false
                }
            });

            const { error: enrollmentSyncError } = await supabaseClient
                .from('enrolled_students')
                .update({
                    course: courseYearGate.course,
                    year_level: courseYearGate.year
                })
                .eq('student_id', personalInfo.studentId);
            if (enrollmentSyncError) {
                console.warn('Failed to sync enrollment record after course/year confirmation.', enrollmentSyncError);
            }

            setPersonalInfo((prev: any) => ({
                ...prev,
                course: courseYearGate.course,
                year: courseYearGate.year,
                department: matchedDepartment,
                status: 'Active',
                courseYearWindowStart: courseYearGate.windowStart || prev.courseYearWindowStart || null,
                courseYearWindowEnd: courseYearGate.windowEnd || prev.courseYearWindowEnd || null,
                course_year_profile_edited: false
            }));

            syncStudentSession({
                course: courseYearGate.course,
                year_level: courseYearGate.year,
                department: matchedDepartment,
                status: 'Active',
                course_year_update_required: false,
                course_year_window_start: courseYearGate.windowStart || session?.course_year_window_start || null,
                course_year_window_end: courseYearGate.windowEnd || session?.course_year_window_end || null,
                course_year_confirmed_at: nowIso
            });

            courseYearGateVisibleRef.current = false;
            courseYearGateConfirmedRef.current = true;
            setCourseYearGate((prev: any) => ({
                ...prev,
                visible: false,
                expired: false
            }));
            void queryClient.invalidateQueries({ queryKey: ['student_profile'] });
            showToast('Course and year confirmed.');
        } catch (error: any) {
            showToast("Couldn't save course and year. ", 'error');
        } finally {
            setIsSubmittingCourseYearGate(false);
        }
    };

    // The student's own profile is cached in React Query like every other portal
    // dataset. personalInfo (below) stays as the editable working copy hydrated
    // from this cache; forceRefresh bypasses staleTime after the student's own writes.
    const fetchStudentRow = React.useCallback(async (
        profileKey: string,
        authUserId: string | null,
        studentId: string | null,
        options?: { force?: boolean }
    ) => {
        return queryClient.fetchQuery({
            queryKey: ['student_profile', profileKey],
            staleTime: options?.force ? 0 : STUDENT_PROFILE_STALE_MS,
            queryFn: async () => {
                let latest: any = null;
                if (authUserId) {
                    const { data } = await supabaseClient
                        .from('students')
                        .select(STUDENT_LIST_COLUMNS)
                        .eq('auth_user_id', authUserId)
                        .maybeSingle();
                    latest = data;
                }
                if (!latest && studentId) {
                    const { data } = await supabaseClient
                        .from('students')
                        .select(STUDENT_LIST_COLUMNS)
                        .eq('student_id', studentId)
                        .maybeSingle();
                    latest = data;
                }
                return latest ?? null;
            }
        });
    }, [queryClient]);

    const refreshStudentProfile = React.useCallback(async (forceRefresh = false) => {
        if (!session || session.userType !== 'student') return;

        const refreshRequestId = refreshStudentProfileRequestRef.current + 1;
        refreshStudentProfileRequestRef.current = refreshRequestId;
        const studentId = session.student_id || null;
        const authUserId = session.auth_user_id || session?.user?.id || null;
        const profileKey = String(authUserId || studentId || '').trim();
        if (!profileKey) return;
        try {
            let studentData: any = session;

            const latestStudent = await fetchStudentRow(profileKey, authUserId, studentId, { force: forceRefresh });

            if (latestStudent) {
                studentData = latestStudent;
            }

            let archiveError: any = null;
            let archivedRows = 0;
            const archiveCacheKey = `${ARCHIVE_RPC_CHECKED_CACHE_KEY}:${profileKey}`;
            const archiveAlreadyChecked = archiveRpcCheckedKeysRef.current.has(profileKey)
                || sessionStorage.getItem(archiveCacheKey) === '1';

            if (archiveRpcStateRef.current !== 'missing' && !archiveAlreadyChecked) {
                archiveRpcCheckedKeysRef.current.add(profileKey);
                const rpcResult = await supabaseClient.rpc('archive_and_reset_expired_course_year');
                archiveError = rpcResult.error;
                archivedRows = Number(rpcResult.data || 0);

                if (archiveError) {
                    const errorText = String(archiveError.message || '').toLowerCase();
                    const missingRpc = errorText.includes('archive_and_reset_expired_course_year');
                    if (missingRpc) {
                        archiveRpcStateRef.current = 'missing';
                        sessionStorage.setItem(ARCHIVE_RPC_MISSING_CACHE_KEY, '1');
                        sessionStorage.setItem(archiveCacheKey, '1');
                    } else {
                        archiveRpcStateRef.current = 'available';
                        console.warn('Failed to run expired course/year archive reset RPC.', archiveError);
                    }
                } else {
                    archiveRpcStateRef.current = 'available';
                    sessionStorage.removeItem(ARCHIVE_RPC_MISSING_CACHE_KEY);
                    sessionStorage.setItem(archiveCacheKey, '1');
                }
            }

            if (archivedRows > 0) {
                const { data: refreshedStudent } = await supabaseClient
                    .from('students')
                    .select(STUDENT_LIST_COLUMNS)
                    .eq('student_id', studentData.student_id)
                    .maybeSingle();
                if (refreshedStudent) {
                    studentData = refreshedStudent;
                    // Keep the cached row coherent after the archive RPC mutated it.
                    queryClient.setQueryData(['student_profile', profileKey], refreshedStudent);
                }
            }

            if (archiveRpcStateRef.current === 'missing' || archiveError) {
                const windowEnd = studentData.course_year_window_end || null;
                const windowEndDate = windowEnd ? new Date(windowEnd) : null;
                const expired = Boolean(windowEndDate && new Date() > windowEndDate);
                const hasWindowState = Boolean(
                    studentData.course
                    || studentData.year_level
                    || studentData.course_year_update_required
                    || studentData.course_year_window_start
                    || studentData.course_year_window_end
                );
                if (expired && hasWindowState) {
                    try {
                        await invokeManagedStudentFunction({
                            mode: 'reset-expired-course-year'
                        });
                        studentData = {
                            ...studentData,
                            course: null,
                            year_level: null,
                            status: 'Inactive',
                            course_year_confirmed_at: null,
                            course_year_update_required: false,
                            course_year_window_start: null,
                            course_year_window_end: null
                        };
                    } catch (fallbackResetError) {
                        console.warn('Failed to run expired course/year fallback reset.', fallbackResetError);
                    }
                }
            }

            const course = studentData.course || '';

            let matchedDepartment = studentData.department || 'Unassigned';

            if (course) {
                try {
                    matchedDepartment = await fetchDepartmentNameForCourse(
                        supabaseClient,
                        course,
                        matchedDepartment
                    );
                } catch (courseLookupError) {
                    console.warn('Failed to refresh department from selected course.', courseLookupError);
                }
            }

            const motherParts = getStoredParentParts(studentData, 'mother');
            const fatherParts = getStoredParentParts(studentData, 'father');
            if (refreshRequestId !== refreshStudentProfileRequestRef.current) return;

            setPersonalInfo((prev: any) => ({
                ...prev,
                firstName: studentData.first_name || '',
                lastName: studentData.last_name || '',
                middleName: studentData.middle_name || '',
                suffix: studentData.suffix || '',
                studentId: studentData.student_id,
                profile_picture_url: studentData.profile_picture_url || '',
                course: course,
                year: studentData.year_level || '',
                status: studentData.status || 'Active',
                department: matchedDepartment,
                section: studentData.section || '',
                email: studentData.email || '',
                mobile: studentData.mobile || '',
                facebookUrl: studentData.facebook_url || '',
                address: buildStudentAddress(studentData),
                street: studentData.street || '',
                city: studentData.city || '',
                province: studentData.province || '',
                zipCode: studentData.zip_code || '',
                region: studentData.region || '',
                emergencyContact: getStudentEmergencyContact(studentData),
                dob: studentData.dob || '',
                age: studentData.age || '',
                placeOfBirth: studentData.place_of_birth || '',
                sex: getStudentSex(studentData),
                genderIdentity: studentData.gender_identity || '',
                civilStatus: studentData.civil_status || '',
                nationality: studentData.nationality || '',
                priorityCourse: studentData.priority_course || '',
                altCourse1: studentData.alt_course_1 || '',
                altCourse2: studentData.alt_course_2 || '',
                isWorkingStudent: studentData.is_working_student || false,
                workingStudentType: studentData.working_student_type || '',
                employerName: studentData.employer_name || '',
                employerAddress: studentData.employer_address || '',
                supporter: studentData.supporter || '',
                supporterContact: studentData.supporter_contact || '',
                isPwd: studentData.is_pwd || false,
                pwdNumber: studentData.pwd_number || '',
                pwdType: studentData.pwd_type || '',
                disabilityCause: studentData.disability_cause || '',
                pwdDocumentUrl: studentData.pwd_document_url || '',
                isIndigenous: studentData.is_indigenous || false,
                indigenousGroup: studentData.indigenous_group || '',
                ipDocumentUrl: studentData.ip_document_url || '',
                isFourPsMember: studentData.is_four_ps_member || false,
                fourPsDocumentUrl: studentData.four_ps_document_url || '',
                isRebelReturnee: studentData.is_rebel_returnee || false,
                isSoloParent: studentData.is_solo_parent || false,
                isChildOfSoloParent: studentData.is_child_of_solo_parent || false,
                soloParentDocumentUrl: studentData.solo_parent_document_url || '',
                isOrphan: studentData.is_orphan || false,
                orphanCause: studentData.orphan_cause || '',
                isHomelessCitizen: studentData.is_homeless_citizen || false,
                isSeniorCitizen: studentData.is_senior_citizen || false,
                seniorCitizenDocumentUrl: studentData.senior_citizen_document_url || '',
                workExperiences: studentData.work_experiences || '',
                religion: studentData.religion || '',
                motherLastName: motherParts.last,
                motherGivenName: motherParts.given,
                motherMiddleName: motherParts.middle,
                motherOccupation: studentData.mother_occupation || '',
                motherStatus: studentData.mother_status || '',
                motherContact: studentData.mother_contact || '',
                motherAddress: studentData.mother_address || '',
                fatherLastName: fatherParts.last,
                fatherGivenName: fatherParts.given,
                fatherMiddleName: fatherParts.middle,
                fatherOccupation: studentData.father_occupation || '',
                fatherStatus: studentData.father_status || '',
                fatherContact: studentData.father_contact || '',
                fatherAddress: studentData.father_address || '',
                parentsNumChildren: studentData.parents_num_children || '',
                birthOrder: studentData.birth_order || '',
                birthOrderOther: studentData.birth_order_other || '',
                spouseName: studentData.spouse_name || '',
                spouseOccupation: studentData.spouse_occupation || '',
                spouseEmployerName: studentData.spouse_employer_name || '',
                spouseEmployerAddress: studentData.spouse_employer_address || '',
                spouseContact: studentData.spouse_contact || '',
                numChildren: studentData.num_children || '',
                childrenNamesBirthdates: studentData.children_names_birthdates || '',
                currentlyPregnant: studentData.currently_pregnant || '',
                guardianName: studentData.guardian_name || '',
                guardianAddress: studentData.guardian_address || '',
                guardianContact: studentData.guardian_contact || '',
                guardianRelation: studentData.guardian_relation || '',
                emergencyName: studentData.emergency_name || '',
                emergencyAddress: studentData.emergency_address || '',
                emergencyRelationship: studentData.emergency_relationship || '',
                emergencyNumber: studentData.emergency_number || '',
                elemSchool: studentData.elem_school || '',
                elemYearGraduated: studentData.elem_year_graduated || '',
                juniorHighSchool: studentData.junior_high_school || '',
                juniorHighYearGraduated: studentData.junior_high_year_graduated || '',
                seniorHighSchool: studentData.senior_high_school || '',
                seniorHighYearGraduated: studentData.senior_high_year_graduated || '',
                collegeSchool: studentData.college_school || '',
                collegeYearGraduated: studentData.college_year_graduated || '',
                honorsAwards: studentData.honors_awards || '',
                tesdaNc2Acquired: studentData.tesda_nc2_acquired || '',
                eligibilityAcquired: studentData.eligibility_acquired || '',
                specialTrainingsAttended: studentData.special_trainings_attended || '',
                extracurricularActivities: studentData.extracurricular_activities || '',
                holdsPublicServicePosition: toYesNoChoice(studentData.holds_public_service_position) || '',
                publicServicePosition: studentData.public_service_position || '',
                organizationsMemberships: studentData.organizations_memberships || '',
                sportsSkills: studentData.sports_skills || '',
                otherTalents: studentData.other_talents || '',
                scholarshipsAvailed: studentData.scholarships_availed || '',
                hasBeenCriminallyCharged: toYesNoChoice(studentData.has_been_criminally_charged) || '',
                hasBeenConvictedOfCrime: toYesNoChoice(studentData.has_been_convicted_of_crime) || '',
                courseYearWindowStart: studentData.course_year_window_start || null,
                courseYearWindowEnd: studentData.course_year_window_end || null,
            }));

            if (studentData.course_year_update_required) {
                const trustedCourse = course || '';
                const trustedYear = isValidYearLevel(studentData.year_level || '') ? studentData.year_level : '1st Year';

                if (!courseOptionsCacheRef.current) {
                    const { data: courseRows } = await supabaseClient
                        .from('courses')
                        .select('name')
                        .order('name');
                    courseOptionsCacheRef.current = (courseRows || []).flatMap((row: any) => row.name ? [row.name] : []);
                }
                const normalizedCourseOptions = [...new Set([trustedCourse, ...(courseOptionsCacheRef.current || [])].filter(Boolean))];

                const now = new Date();
                const windowStart = studentData.course_year_window_start || null;
                const windowEnd = studentData.course_year_window_end || null;
                const windowStartDate = windowStart ? new Date(windowStart) : null;
                const windowEndDate = windowEnd ? new Date(windowEnd) : null;
                const beforeWindow = Boolean(windowStartDate && now < windowStartDate);
                const expired = Boolean(windowEndDate && now > windowEndDate);

                setPersonalInfo((prev: any) => ({
                    ...prev,
                    course: trustedCourse || '',
                    year: trustedYear || '1st Year'
                }));

                // Only set the gate if it's not already visible (user may be mid-interaction)
                // and hasn't already been confirmed in this session
                if (!courseYearGateVisibleRef.current && !courseYearGateConfirmedRef.current) {
                    const shouldShow = !beforeWindow && !expired;
                    courseYearGateVisibleRef.current = shouldShow;
                    setCourseYearGate({
                        visible: shouldShow,
                        expired,
                        course: trustedCourse || '',
                        year: trustedYear || '1st Year',
                        courseLocked: false,
                        yearLocked: false,
                        courseOptions: normalizedCourseOptions,
                        windowStart,
                        windowEnd
                    });
                }
            } else {
                if (!courseYearGateVisibleRef.current) {
                    setCourseYearGate((prev: any) => ({
                        ...prev,
                        visible: false,
                        expired: false
                    }));
                }
            }

            syncStudentSession({
                ...studentData,
                department: matchedDepartment
            });

            const currentStudentId = String(studentData.student_id || studentId || '').trim();
            const pendingActivationProfile = getPendingProfileCompletionProfile(currentStudentId)
                || getPendingProfileCompletionProfile()
                || {};
            const sessionPrefillProfile = {
                firstName: session?.first_name,
                lastName: session?.last_name,
                middleName: session?.middle_name,
                suffix: session?.suffix,
                dob: session?.dob,
                age: session?.age,
                sex: session?.sex,
                street: session?.street,
                city: session?.city,
                province: session?.province,
                zipCode: session?.zip_code,
                region: session?.region,
                mobile: session?.mobile,
                email: session?.email
            };
            const profileCompletedFromStudent = studentData.profile_completed === true;
            if (profileCompletedFromStudent) {
                profileCompletionJustCompletedRef.current = false;
            }
            const profileCompleted = profileCompletedFromStudent
                || profileCompletionJustCompletedRef.current;
            const shouldForceProfileCompletion = !profileCompleted && (
                forceProfileCompletionPrompt
                || shouldForceProfileCompletionPrompt(currentStudentId)
            );
            setProfileCompletionStatusOverride(profileCompleted);
            if (profileCompleted) {
                setForceProfileCompletionPrompt(false);
                closeProfileCompletionModal();
            } else if (shouldForceProfileCompletion) {
                setForceProfileCompletionPrompt(true);
            }
            const freshProfileFormSnapshot = buildProfileCompletionFormSnapshot({
                base: createInitialProfileFormData(),
                studentData,
                pendingActivationProfile,
                sessionPrefillProfile,
                motherParts,
                fatherParts
            });
            setProfileCompletionInitialData((prev: any) => buildProfileCompletionFormSnapshot({
                base: prev,
                studentData,
                pendingActivationProfile,
                sessionPrefillProfile,
                motherParts,
                fatherParts
            }));
            setProfileFieldsComplete(isProfileCompletionFormComplete(freshProfileFormSnapshot));
            setHasSeenTourState(Boolean(studentData.has_seen_tour));
        } catch (error) {
            console.error('Failed to refresh student profile.', error);
        }
    }, [
        closeProfileCompletionModal,
        fetchStudentRow,
        forceProfileCompletionPrompt,
        getStoredParentParts,
        invokeManagedStudentFunction,
        profileCompletionJustCompletedRef,
        queryClient,
        refreshStudentProfileRequestRef,
        session,
        setForceProfileCompletionPrompt,
        setHasSeenTourState,
        setProfileCompletionInitialData,
        setProfileCompletionStatusOverride,
        setProfileFieldsComplete,
        syncStudentSession
    ]);

    const refreshStudentProfileForSession = React.useEffectEvent(() => {
        void refreshStudentProfile();
    });

    // Sync session to personalInfo
    useEffect(() => {
        refreshStudentProfileForSession();
    }, [session?.auth_user_id, session?.user?.id, session?.student_id, session?.userType]);

    // Save Profile Changes to Supabase
    const validateProfileBeforeSave = (profile: any) => {
        if (!profile.profilePictureUrl && !profile.profile_picture_url) {
            showToast('Profile picture is required.', 'error');
            return false;
        }

        const requiredFields: string[] = [
            'firstName', 'lastName', 'middleName',
            'dob', 'age', 'placeOfBirth', 'nationality', 'sex', 'genderIdentity', 'civilStatus',
            'street', 'city', 'province', 'zipCode', 'region',
            'mobile', 'facebookUrl',
            'emergencyName', 'emergencyAddress', 'emergencyRelationship', 'emergencyNumber'
        ];

        if (String(profile.spouseName || '').trim() && !['N/A', 'n/a', 'none'].includes(String(profile.spouseName || '').trim().toLowerCase())) {
            requiredFields.push('spouseOccupation', 'spouseEmployerName', 'spouseEmployerAddress', 'spouseContact');
        }
        if (String(profile.numChildren || '').trim() && !['0', 'N/A', 'n/a', 'none'].includes(String(profile.numChildren || '').trim().toLowerCase())) {
            requiredFields.push('childrenNamesBirthdates');
        }
        if (profile.isWorkingStudent) {
            requiredFields.push('workingStudentType', 'employerName', 'employerAddress');
        }
        if (profile.isPwd) {
            requiredFields.push('pwdNumber', 'pwdType', 'disabilityCause');
        }
        if (profile.isIndigenous) {
            requiredFields.push('indigenousGroup');
        }
        if (profile.isOrphan) {
            requiredFields.push('orphanCause');
        }
        if (String(profile.collegeSchool || '').trim() && !['N/A', 'n/a', 'none'].includes(String(profile.collegeSchool || '').trim().toLowerCase())) {
            requiredFields.push('collegeYearGraduated');
        }
        if (profile.holdsPublicServicePosition) {
            requiredFields.push('publicServicePosition');
        }

        for (const field of requiredFields) {
            if (!hasFilledProfileValue(profile[field])) {
                const label = getProfileTextFieldRule(field, false).label;
                showToast(`${label} is required.`, 'error');
                setTimeout(() => {
                    const el = document.getElementById(`profile-${field}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.focus();
                    }
                }, 100);
                return false;
            }
        }

        const customChecks = [
            { condition: profile.birthOrder === 'Other' && !hasFilledProfileValue(profile.birthOrderOther), msg: 'Specify Birth Order is required.', field: 'birthOrderOther' },
            { condition: profile.workingStudentType === 'Other' && !hasFilledProfileValue(profile.workingStudentTypeOther), msg: 'Specify Type of Work is required.', field: 'workingStudentTypeOther' },
            { condition: profile.pwdType === 'Other' && !hasFilledProfileValue(profile.pwdTypeOther), msg: 'Specify Type of Disability is required.', field: 'pwdTypeOther' },
            { condition: profile.indigenousGroup === 'Other' && !hasFilledProfileValue(profile.indigenousGroupOther), msg: 'Specify Indigenous Group is required.', field: 'indigenousGroupOther' },
            { condition: profile.orphanCause === 'Other' && !hasFilledProfileValue(profile.orphanCauseOther), msg: 'Specify Cause of Being an Orphan is required.', field: 'orphanCauseOther' },
        ];

        for (const check of customChecks) {
            if (check.condition) {
                showToast(check.msg, 'error');
                setTimeout(() => {
                    const el = document.getElementById(`profile-${check.field}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.focus();
                    }
                }, 100);
                return false;
            }
        }

        return true;
    };

    const saveProfileChanges = async (nextPersonalInfo = personalInfo) => {
        if (isSavingProfileChanges) return;
        if (!validateProfileBeforeSave(nextPersonalInfo)) {
            return;
        }

        const courseOrYearChanged = nextPersonalInfo.course !== personalInfo.course || nextPersonalInfo.year !== personalInfo.year || nextPersonalInfo.department !== personalInfo.department;
        
        const confirmMessage = courseOrYearChanged 
            ? "Are you sure you want to save these changes?\n\n⚠️ You are changing your Course/Department/Year Level. You will NOT be able to edit these fields again until the next academic window.\n\nMake sure all other information is correct and up to date before proceeding."
            : "Are you sure you want to save these changes? Make sure all your information is correct and up to date before proceeding.";

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsEditing(false);
        setIsSavingProfileChanges(true);
        try {
            const normalizedEmail = normalizeStudentEmail(nextPersonalInfo.email);
            if (!normalizedEmail) {
                throw new Error('Email is required.');
            }
            if (!isValidEmailDomain(normalizedEmail)) {
                throw new Error('Please enter a valid email address (e.g., name@example.com).');
            }

            await syncStudentAuthEmailIfNeeded(normalizedEmail);

            const updatePayload = {
                student_id: nextPersonalInfo.studentId || null,
                first_name: nextPersonalInfo.firstName || null,
                last_name: nextPersonalInfo.lastName || null,
                middle_name: nextPersonalInfo.middleName || null,
                suffix: nextPersonalInfo.suffix || null,
                place_of_birth: nextPersonalInfo.placeOfBirth || null,
                department: nextPersonalInfo.department || null,
                street: nextPersonalInfo.street || null,
                city: nextPersonalInfo.city || null,
                province: nextPersonalInfo.province || null,
                zip_code: nextPersonalInfo.zipCode || null,
                region: nextPersonalInfo.region || null,
                mobile: nextPersonalInfo.mobile || null,
                course: nextPersonalInfo.course || null,
                year_level: nextPersonalInfo.year || null,
                email: normalizedEmail,
                civil_status: nextPersonalInfo.civilStatus || null,
                facebook_url: nextPersonalInfo.facebookUrl || null,
                dob: nextPersonalInfo.dob || null,
                sex: nextPersonalInfo.sex || null,
                gender_identity: nextPersonalInfo.genderIdentity || null,
                nationality: nextPersonalInfo.nationality || null,
                is_working_student: Boolean(nextPersonalInfo.isWorkingStudent),
                working_student_type: nextPersonalInfo.workingStudentType || null,
                employer_name: nextPersonalInfo.employerName || null,
                employer_address: nextPersonalInfo.employerAddress || null,
                supporter: nextPersonalInfo.supporter || null,
                supporter_contact: nextPersonalInfo.supporterContact || null,
                is_pwd: Boolean(nextPersonalInfo.isPwd),
                pwd_number: nextPersonalInfo.pwdNumber || null,
                pwd_type: nextPersonalInfo.pwdType || null,
                disability_cause: nextPersonalInfo.disabilityCause || null,
                pwd_document_url: nextPersonalInfo.pwdDocumentUrl || null,
                is_indigenous: Boolean(nextPersonalInfo.isIndigenous),
                indigenous_group: nextPersonalInfo.indigenousGroup || null,
                ip_document_url: nextPersonalInfo.ipDocumentUrl || null,
                is_four_ps_member: Boolean(nextPersonalInfo.isFourPsMember),
                four_ps_document_url: nextPersonalInfo.fourPsDocumentUrl || null,
                is_rebel_returnee: Boolean(nextPersonalInfo.isRebelReturnee),
                is_solo_parent: Boolean(nextPersonalInfo.isSoloParent),
                is_child_of_solo_parent: Boolean(nextPersonalInfo.isChildOfSoloParent),
                solo_parent_document_url: nextPersonalInfo.soloParentDocumentUrl || null,
                is_orphan: Boolean(nextPersonalInfo.isOrphan),
                orphan_cause: nextPersonalInfo.orphanCause || null,
                is_homeless_citizen: Boolean(nextPersonalInfo.isHomelessCitizen),
                is_senior_citizen: Boolean(nextPersonalInfo.isSeniorCitizen),
                senior_citizen_document_url: nextPersonalInfo.seniorCitizenDocumentUrl || null,
                work_experiences: nextPersonalInfo.workExperiences || null,
                section: nextPersonalInfo.section || null,
                // New fields
                religion: nextPersonalInfo.religion || null,
                mother_name: joinNameParts({
                    given: nextPersonalInfo.motherGivenName,
                    middle: nextPersonalInfo.motherMiddleName,
                    last: nextPersonalInfo.motherLastName
                }) || null,
                mother_last_name: nextPersonalInfo.motherLastName || null,
                mother_given_name: nextPersonalInfo.motherGivenName || null,
                mother_middle_name: nextPersonalInfo.motherMiddleName || null,
                mother_occupation: nextPersonalInfo.motherOccupation || null,
                mother_status: nextPersonalInfo.motherStatus || null,
                mother_contact: nextPersonalInfo.motherContact || null,
                mother_address: nextPersonalInfo.motherAddress || null,
                father_name: joinNameParts({
                    given: nextPersonalInfo.fatherGivenName,
                    middle: nextPersonalInfo.fatherMiddleName,
                    last: nextPersonalInfo.fatherLastName
                }) || null,
                father_last_name: nextPersonalInfo.fatherLastName || null,
                father_given_name: nextPersonalInfo.fatherGivenName || null,
                father_middle_name: nextPersonalInfo.fatherMiddleName || null,
                father_occupation: nextPersonalInfo.fatherOccupation || null,
                father_status: nextPersonalInfo.fatherStatus || null,
                father_contact: nextPersonalInfo.fatherContact || null,
                father_address: nextPersonalInfo.fatherAddress || null,
                parents_num_children: nextPersonalInfo.parentsNumChildren || null,
                birth_order: nextPersonalInfo.birthOrder || null,
                birth_order_other: nextPersonalInfo.birthOrder === 'Other' ? nextPersonalInfo.birthOrderOther || null : null,
                spouse_name: nextPersonalInfo.spouseName || null,
                spouse_occupation: nextPersonalInfo.spouseOccupation || null,
                spouse_employer_name: nextPersonalInfo.spouseEmployerName || null,
                spouse_employer_address: nextPersonalInfo.spouseEmployerAddress || null,
                spouse_contact: nextPersonalInfo.spouseContact || null,
                num_children: nextPersonalInfo.numChildren || null,
                children_names_birthdates: nextPersonalInfo.childrenNamesBirthdates || null,
                currently_pregnant: nextPersonalInfo.currentlyPregnant || null,
                guardian_name: nextPersonalInfo.guardianName || null,
                guardian_address: nextPersonalInfo.guardianAddress || null,
                guardian_contact: nextPersonalInfo.guardianContact || null,
                guardian_relation: nextPersonalInfo.guardianRelation || null,
                emergency_name: nextPersonalInfo.emergencyName || null,
                emergency_address: nextPersonalInfo.emergencyAddress || null,
                emergency_relationship: nextPersonalInfo.emergencyRelationship || null,
                emergency_number: nextPersonalInfo.emergencyNumber || null,
                elem_school: nextPersonalInfo.elemSchool || null,
                elem_year_graduated: nextPersonalInfo.elemYearGraduated || null,
                junior_high_school: nextPersonalInfo.juniorHighSchool || null,
                junior_high_year_graduated: nextPersonalInfo.juniorHighYearGraduated || null,
                senior_high_school: nextPersonalInfo.seniorHighSchool || null,
                senior_high_year_graduated: nextPersonalInfo.seniorHighYearGraduated || null,
                college_school: nextPersonalInfo.collegeSchool || null,
                college_year_graduated: nextPersonalInfo.collegeYearGraduated || null,
                honors_awards: nextPersonalInfo.honorsAwards || null,
                tesda_nc2_acquired: nextPersonalInfo.tesdaNc2Acquired || null,
                eligibility_acquired: nextPersonalInfo.eligibilityAcquired || null,
                special_trainings_attended: nextPersonalInfo.specialTrainingsAttended || null,
                extracurricular_activities: nextPersonalInfo.extracurricularActivities || null,
                holds_public_service_position: nextPersonalInfo.holdsPublicServicePosition === 'Yes' || nextPersonalInfo.holdsPublicServicePosition === true,
                public_service_position: nextPersonalInfo.publicServicePosition || null,
                organizations_memberships: nextPersonalInfo.organizationsMemberships || null,
                sports_skills: nextPersonalInfo.sportsSkills || null,
                other_talents: nextPersonalInfo.otherTalents || null,
                scholarships_availed: nextPersonalInfo.scholarshipsAvailed || null,
                has_been_criminally_charged: nextPersonalInfo.hasBeenCriminallyCharged === 'Yes' || nextPersonalInfo.hasBeenCriminallyCharged === true,
                criminal_charge_details: nextPersonalInfo.criminalChargeDetails || null,
                has_been_convicted_of_crime: nextPersonalInfo.hasBeenConvictedOfCrime === 'Yes' || nextPersonalInfo.hasBeenConvictedOfCrime === true,
                crime_conviction_details: nextPersonalInfo.crimeConvictionDetails || null,
            };

            await invokeManagedStudentFunction({
                mode: 'update-profile',
                payload: updatePayload
            });
            await refreshStudentProfile(true);
            showToast("Profile updated.");
        } catch (err: any) {
            showToast("Couldn't save profile. ", 'error');
        } finally {
            setIsSavingProfileChanges(false);
        }
    };

    const requestStudentSecurityOtp = async (
        purpose: 'password_change' | 'email_change',
        nextEmailValue?: unknown
    ) => {
        const normalizedEmail = purpose === 'email_change'
            ? normalizeStudentEmail(nextEmailValue)
            : undefined;

        return invokeManagedStudentFunction({
            mode: 'request-security-otp',
            purpose,
            email: normalizedEmail
        });
    };

    const confirmStudentSecurityEmailChange = async (nextEmailValue: unknown, otp: unknown) => {
        if (!personalInfo.studentId) {
            throw new Error('Your student profile is not loaded yet.');
        }

        const normalizedEmail = normalizeStudentEmail(nextEmailValue);
        if (!normalizedEmail) {
            throw new Error('Email is required.');
        }
        if (!isValidEmailDomain(normalizedEmail)) {
            throw new Error('Please enter a valid email address (e.g., name@example.com).');
        }

        await invokeManagedStudentFunction({
            mode: 'confirm-email-change',
            otp: String(otp || '').trim(),
            email: normalizedEmail
        });

        syncStudentSession({
            email: normalizedEmail,
            auth_email: normalizedEmail,
            user: {
                ...(session?.user || {}),
                id: session?.user?.id || session?.auth_user_id || null,
                email: normalizedEmail
            }
        });

        setPersonalInfo((prev: any) => ({
            ...prev,
            email: normalizedEmail
        }));

        await refreshStudentProfile(true);
    };

    const confirmStudentPasswordChange = async (nextPasswordValue: unknown, otp: unknown) => {
        const nextPassword = String(nextPasswordValue || '');
        if (nextPassword.length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }

        await invokeManagedStudentFunction({
            mode: 'confirm-password-change',
            otp: String(otp || '').trim(),
            password: nextPassword
        });
    };

    // Upload profile picture to Google Drive & update DB
    const uploadProfilePicture = async (file: File) => {
        if (!personalInfo.studentId) return;
        try {
            const oldUrl = personalInfo.profile_picture_url || personalInfo.profilePictureUrl;
            const oldPath = oldUrl ? getStoredAssetPath('profile-pictures', oldUrl) : '';

            const publicUrl = await uploadProfileDocument(file, 'profile_picture_url');
            await invokeManagedStudentFunction({
                mode: 'update-profile-picture',
                profilePictureUrl: publicUrl
            });
            setPersonalInfo((prev: any) => ({ ...prev, profilePictureUrl: publicUrl, profile_picture_url: publicUrl }));
            void queryClient.invalidateQueries({ queryKey: ['student_profile'] });
            showToast("Profile picture updated!");

            // Delete old file from Supabase storage if it existed there
            if (oldPath) {
                try {
                    await supabaseClient.storage.from('profile-pictures').remove([oldPath]);
                } catch (deleteErr) {
                    console.warn('Failed to delete legacy profile picture from Supabase Storage:', deleteErr);
                }
            }
        } catch (err: any) {
            showToast(err.message || "Couldn't upload picture. ", 'error');
        }
    };


    return {
        isEditing,
        setIsEditing,
        personalInfo,
        setPersonalInfo,
        showMoreProfile,
        setShowMoreProfile,
        courseYearGate,
        setCourseYearGate,
        isSubmittingCourseYearGate,
        setIsSubmittingCourseYearGate,
        courseYearGateVisibleRef,
        courseYearGateConfirmedRef,
        archiveRpcStateRef,
        archiveRpcCheckedKeysRef,
        courseOptionsCacheRef,
        isSavingProfileChanges,
        setIsSavingProfileChanges,
        getStoredParentParts,
        PROFILE_FIELD_LABELS,
        normalizeProfileField,
        toProfileFieldLabel,
        getChangedProfileFields,
        syncStudentSession,
        handleProfileCompletionSuccess,
        invokeManagedStudentFunction,
        syncStudentAuthEmailIfNeeded,
        getCourseYearWindowRange,
        formatGateDate,
        getSchoolYearLabel,
        submitCourseYearConfirmation,
        refreshStudentProfile,
        validateProfileBeforeSave,
        saveProfileChanges,
        requestStudentSecurityOtp,
        confirmStudentSecurityEmailChange,
        confirmStudentPasswordChange,
        uploadProfilePicture,
        profileServiceGate,
        profileCompletionInitialData,
        profileCompletionReminderRequired,
        profileCompletionGateActive,
        profileCompletionReminderVisible,
        openProfileCompletionModal,
        closeProfileCompletionModal,
        closeProfileServiceGate,
        openProfileCompletionFromServiceGate,
        requireCompletedProfileForService,
        dismissProfileCompletionReminder
    };
}
