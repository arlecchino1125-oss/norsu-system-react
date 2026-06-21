import React, { lazy, Suspense, useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { CustomScrollHandle } from '../components/CustomScrollHandle';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import { renderRemainingViews } from './student/StudentPortalViewRouter';
import { STUDENT_VIEW_FEATURE_MAP, STUDENT_VIEW_LABELS } from './student/StudentPortalRoutes';
import DatePicker from '../components/ui/DatePicker';
import {
    getAttendanceHistory,
    getRatedEventIds
} from '../services/studentPortalService';
import { STUDENT_LIST_COLUMNS } from '../services/careStaffService';
import { fetchDepartmentNameForCourse } from '../utils/courseDepartment';
import { joinNameParts, splitFullName } from '../utils/nameUtils';
import { buildStudentAddress, getStudentEmergencyContact, getStudentSex } from '../utils/studentFields';
import { getAudienceLabel, isStudentEligibleForEvent } from '../utils/eventAudience';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import NorsuBrand from '../components/NorsuBrand';
import { usePermissions } from '../hooks/usePermissions';
import FeatureAvailabilityView from '../components/permissions/FeatureAvailabilityView';
import { useStudentProfileData } from '../hooks/student/useStudentProfileData';
import { useStudentEventsData } from '../hooks/student/useStudentEventsData';
import { useStudentFormsData } from '../hooks/student/useStudentFormsData';
import { useStudentCounselingData } from '../hooks/student/useStudentCounselingData';
import { useStudentSupportData } from '../hooks/student/useStudentSupportData';
import { getPermissionNotice } from '../types/permissions';
import {
    clearPendingProfileCompletion,
    getPendingProfileCompletionProfile,
    shouldForceProfileCompletionPrompt
} from '../lib/studentProfileCompletionPrompt';
import { validateTextInput } from '../utils/inputSecurity';
import { getProfileTextFieldRule } from '../utils/profileFieldRules';

const supabaseClient = supabase;
const ProfileCompletionModal = lazy(() => import('./student/forms/ProfileCompletionModal'));
const StudentDashboardView = lazy(() => import('./student/StudentDashboardView'));
const StudentEventsView = lazy(() => import('./student/StudentEventsView'));
const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
const FAMILY_STATUS_OPTIONS = ['Alive', 'Deceased', 'Unknown', 'Prefer not to say'];
const PREGNANCY_OPTIONS = ['Yes', 'No', 'Maybe'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const WORK_TYPE_OPTIONS = ['House help', 'Call Center Agent/BPO employee', 'Fast food/Restaurant', 'Online employee/Freelancer', 'Self-employed', 'N/A', 'Other'];
const PWD_TYPE_OPTIONS = ['0', 'Visual impairment', 'Hearing impairment', 'Physical/Orthopedic disability', 'Chronic illness', 'Psychosocial disability', 'Communication disability', 'Other'];
const INDIGENOUS_GROUP_OPTIONS = ['N/A', 'Bukidnon', 'Tabihanon Group', 'ATA', 'IFUGAO', 'Kalahing Kulot', 'Lumad', 'Other'];
const ORPHAN_CAUSE_OPTIONS = ['N/A', 'Death', 'Abandonment', 'Other'];
const BIRTH_ORDER_OPTIONS = [
    { value: '1', label: '1 (1st child/eldest)' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' },
    { value: 'Only child', label: 'Only child' },
    { value: 'Legally adopted', label: 'Legally adopted' },
    { value: 'Simulated', label: 'Simulated' },
    { value: 'Foster child', label: 'Foster child' },
    { value: 'Other', label: 'Other' },
];
const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';
const ARCHIVE_RPC_CHECKED_CACHE_KEY = 'norsu_archive_rpc_checked_student';
const DATASET_REFRESH_TTL_MS = {
    activeVisit: 60 * 1000,
    counselingRequests: 2 * 60 * 1000,
    events: 5 * 60 * 1000,
    forms: 5 * 60 * 1000,
    history: 2 * 60 * 1000,
    notifications: 60 * 1000,
    scholarshipApplications: 2 * 60 * 1000,
    scholarships: 5 * 60 * 1000,
    supportRequests: 2 * 60 * 1000,
    visitReasons: 60 * 60 * 1000
} as const;

type StudentDatasetRefreshKey = keyof typeof DATASET_REFRESH_TTL_MS;
type DatasetRefreshCacheEntry = {
    loaded: boolean;
    refreshedAt: number;
};

const isValidYearLevel = (value: string) => YEAR_LEVEL_OPTIONS.includes(value);
const normalizeStudentEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const pickProfilePrefillValue = (primaryValue: unknown, fallbackValue: unknown) => {
    if (primaryValue === null || primaryValue === undefined) {
        return fallbackValue;
    }

    if (typeof primaryValue === 'string') {
        return primaryValue.trim() !== '' ? primaryValue : fallbackValue;
    }

    return primaryValue;
};
const resolveProfileFormValue = (currentValue: unknown, ...candidateValues: unknown[]) =>
    candidateValues.reduce(
        (resolvedValue, candidateValue) => pickProfilePrefillValue(resolvedValue, candidateValue),
        currentValue
    );
const applyPendingProfileToProfileForm = (
    setProfileFormData: React.Dispatch<React.SetStateAction<any>>,
    pendingProfile: Record<string, unknown> | null | undefined
) => {
    if (!pendingProfile) return;

    setProfileFormData((prev: any) => ({
        ...prev,
        firstName: resolveProfileFormValue(prev.firstName, pendingProfile.firstName) || '',
        lastName: resolveProfileFormValue(prev.lastName, pendingProfile.lastName) || '',
        middleName: resolveProfileFormValue(prev.middleName, pendingProfile.middleName) || '',
        suffix: resolveProfileFormValue(prev.suffix, pendingProfile.suffix) || '',
        dob: resolveProfileFormValue(prev.dob, pendingProfile.dob) || '',
        age: resolveProfileFormValue(prev.age, pendingProfile.age) || '',
        sex: resolveProfileFormValue(prev.sex, pendingProfile.sex) || '',
        street: resolveProfileFormValue(prev.street, pendingProfile.street) || '',
        city: resolveProfileFormValue(prev.city, pendingProfile.city) || '',
        province: resolveProfileFormValue(prev.province, pendingProfile.province) || '',
        zipCode: resolveProfileFormValue(prev.zipCode, pendingProfile.zipCode) || '',
        mobile: resolveProfileFormValue(prev.mobile, pendingProfile.mobile) || '',
        email: resolveProfileFormValue(prev.email, pendingProfile.email) || ''
    }));
};
const createStudentDatasetRefreshCache = (): Record<StudentDatasetRefreshKey, DatasetRefreshCacheEntry> => ({
    activeVisit: { loaded: false, refreshedAt: 0 },
    counselingRequests: { loaded: false, refreshedAt: 0 },
    events: { loaded: false, refreshedAt: 0 },
    forms: { loaded: false, refreshedAt: 0 },
    history: { loaded: false, refreshedAt: 0 },
    notifications: { loaded: false, refreshedAt: 0 },
    scholarshipApplications: { loaded: false, refreshedAt: 0 },
    scholarships: { loaded: false, refreshedAt: 0 },
    supportRequests: { loaded: false, refreshedAt: 0 },
    visitReasons: { loaded: false, refreshedAt: 0 }
});
const toYesNoChoice = (value: unknown) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'yes') return 'Yes';
        if (normalized === 'no') return 'No';
    }

    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '';
};
const hasFilledProfileValue = (value: unknown) => {
    if (Array.isArray(value)) {
        return value.some((entry) => String(entry ?? '').trim() !== '');
    }

    if (typeof value === 'boolean') {
        return true;
    }

    if (typeof value === 'number') {
        return !Number.isNaN(value);
    }

    return String(value ?? '').trim() !== '';
};
const isProfileCompletionFormComplete = (profile: Record<string, any>) => {
    const requiredFields = [
        'firstName', 'lastName', 'middleName', 'suffix',
        'profilePictureUrl', 'studentId',
        'dob', 'age', 'placeOfBirth', 'nationality', 'sex', 'genderIdentity', 'civilStatus',
        'street', 'city', 'province', 'zipCode', 'region',
        'mobile', 'email', 'facebookUrl',
        'yearLevelApplying', 'department', 'course',
        'spouseName', 'spouseOccupation', 'spouseEmployerName', 'spouseEmployerAddress', 'spouseContact',
        'numChildren', 'childrenNamesBirthdates', 'currentlyPregnant',
        'motherLastName', 'motherGivenName', 'motherMiddleName', 'motherOccupation', 'motherStatus', 'motherContact', 'motherAddress',
        'fatherLastName', 'fatherGivenName', 'fatherMiddleName', 'fatherOccupation', 'fatherStatus', 'fatherContact', 'fatherAddress',
        'parentsNumChildren', 'birthOrder',
        'supporter', 'supporterContact',
        'isWorkingStudent', 'workingStudentType', 'employerName', 'employerAddress',
        'isPwd', 'pwdNumber', 'pwdType', 'disabilityCause',
        'isIndigenous', 'indigenousGroup',
        'isFourPsMember', 'isRebelReturnee',
        'isSoloParent', 'isChildOfSoloParent',
        'isOrphan', 'orphanCause',
        'isHomelessCitizen', 'isSeniorCitizen',
        'workExperiences',
        'guardianName', 'guardianAddress', 'guardianContact', 'guardianRelation',
        'emergencyName', 'emergencyAddress', 'emergencyRelationship', 'emergencyNumber',
        'elemSchool', 'elemYearGraduated',
        'juniorHighSchool', 'juniorHighYearGraduated',
        'seniorHighSchool', 'seniorHighYearGraduated',
        'collegeSchool', 'collegeYearGraduated',
        'honorsAwards', 'tesdaNc2Acquired', 'eligibilityAcquired', 'specialTrainingsAttended',
        'extracurricularActivities', 'holdsPublicServicePosition', 'publicServicePosition',
        'organizationsMemberships', 'sportsSkills', 'otherTalents',
        'scholarshipsAvailed', 'hasBeenCriminallyCharged', 'hasBeenConvictedOfCrime'
    ];
    if (requiredFields.some((field) => !hasFilledProfileValue(profile[field]))) {
        return false;
    }

    if (profile.birthOrder === 'Other' && !hasFilledProfileValue(profile.birthOrderOther)) {
        return false;
    }

    if (profile.isPwd === 'Yes' && !hasFilledProfileValue(profile.pwdDocumentUrl)) {
        return false;
    }

    if (profile.isIndigenous === 'Yes' && !hasFilledProfileValue(profile.ipDocumentUrl)) {
        return false;
    }

    if (profile.isFourPsMember === 'Yes' && !hasFilledProfileValue(profile.fourPsDocumentUrl)) {
        return false;
    }

    if ((profile.isSoloParent === 'Yes' || profile.isChildOfSoloParent === 'Yes') && !hasFilledProfileValue(profile.soloParentDocumentUrl)) {
        return false;
    }

    if (profile.isSeniorCitizen === 'Yes' && !hasFilledProfileValue(profile.seniorCitizenDocumentUrl)) {
        return false;
    }

    return true;
};
const createInitialProfileFormData = () => ({
    studentId: '', profilePictureUrl: '', profilePictureFile: null as File | null,
    firstName: '', lastName: '', middleName: '', suffix: '',
    dob: '', age: '', placeOfBirth: '',
    nationality: '', sex: '', genderIdentity: '', civilStatus: '',
    street: '', city: '', province: '', zipCode: '', region: '',
    mobile: '', email: '', facebookUrl: '',
    religion: '', yearLevelApplying: '1st Year',
    department: '', course: '',
    supporter: '', supporterContact: '',
    isWorkingStudent: '', workingStudentType: '',
    employerName: '', employerAddress: '',
    isPwd: '', pwdNumber: '', pwdType: '', disabilityCause: '', pwdDocumentUrl: '', pwdDocumentFile: null as File | null,
    isIndigenous: '', indigenousGroup: '', ipDocumentUrl: '', ipDocumentFile: null as File | null,
    isFourPsMember: '', fourPsDocumentUrl: '', fourPsDocumentFile: null as File | null,
    isRebelReturnee: '',
    isSoloParent: '', isChildOfSoloParent: '', soloParentDocumentUrl: '', soloParentDocumentFile: null as File | null,
    isOrphan: '', orphanCause: '', isHomelessCitizen: '', isSeniorCitizen: '', seniorCitizenDocumentUrl: '', seniorCitizenDocumentFile: null as File | null,
    workExperiences: '',
    motherLastName: '', motherGivenName: '', motherMiddleName: '', motherOccupation: '', motherContact: '',
    motherStatus: '', motherAddress: '',
    fatherLastName: '', fatherGivenName: '', fatherMiddleName: '', fatherOccupation: '', fatherContact: '',
    fatherStatus: '', fatherAddress: '',
    spouseName: '', spouseOccupation: '', spouseEmployerName: '', spouseEmployerAddress: '', spouseContact: '',
    numChildren: '', childrenNamesBirthdates: '', currentlyPregnant: '',
    guardianName: '', guardianAddress: '', guardianContact: '', guardianRelation: '',
    emergencyName: '', emergencyAddress: '', emergencyRelationship: '', emergencyNumber: '',
    elemSchool: '', elemYearGraduated: '',
    juniorHighSchool: '', juniorHighYearGraduated: '',
    seniorHighSchool: '', seniorHighYearGraduated: '',
    collegeSchool: '', collegeYearGraduated: '',
    honorsAwards: '', tesdaNc2Acquired: '', eligibilityAcquired: '', specialTrainingsAttended: '',
    extracurricularActivities: '', holdsPublicServicePosition: '', publicServicePosition: '',
    organizationsMemberships: '', sportsSkills: '', otherTalents: '',
    scholarshipsAvailed: '', hasBeenCriminallyCharged: '', hasBeenConvictedOfCrime: '',
    agreedToPrivacy: false,
});
const buildProfileCompletionFormSnapshot = ({
    base,
    studentData,
    pendingActivationProfile,
    sessionPrefillProfile,
    motherParts,
    fatherParts
}: {
    base: any;
    studentData: any;
    pendingActivationProfile: Record<string, any>;
    sessionPrefillProfile: Record<string, any>;
    motherParts: { last: string; given: string; middle: string; };
    fatherParts: { last: string; given: string; middle: string; };
}) => ({
    ...base,
    studentId: resolveProfileFormValue(base.studentId, studentData.student_id) || '',
    profilePictureUrl: resolveProfileFormValue(base.profilePictureUrl, studentData.profile_picture_url) || '',
    firstName: resolveProfileFormValue(base.firstName, studentData.first_name, pendingActivationProfile.firstName, sessionPrefillProfile.firstName) || '',
    lastName: resolveProfileFormValue(base.lastName, studentData.last_name, pendingActivationProfile.lastName, sessionPrefillProfile.lastName) || '',
    middleName: resolveProfileFormValue(base.middleName, studentData.middle_name, pendingActivationProfile.middleName, sessionPrefillProfile.middleName) || '',
    suffix: resolveProfileFormValue(base.suffix, studentData.suffix, pendingActivationProfile.suffix, sessionPrefillProfile.suffix) || '',
    dob: resolveProfileFormValue(base.dob, studentData.dob, pendingActivationProfile.dob, sessionPrefillProfile.dob) || '',
    age: resolveProfileFormValue(base.age, studentData.age, pendingActivationProfile.age, sessionPrefillProfile.age) ?? '',
    placeOfBirth: resolveProfileFormValue(base.placeOfBirth, studentData.place_of_birth) || '',
    nationality: resolveProfileFormValue(base.nationality, studentData.nationality, 'Filipino') || 'Filipino',
    sex: resolveProfileFormValue(base.sex, getStudentSex(studentData), pendingActivationProfile.sex, sessionPrefillProfile.sex) || '',
    genderIdentity: resolveProfileFormValue(base.genderIdentity, studentData.gender_identity) || '',
    civilStatus: resolveProfileFormValue(base.civilStatus, studentData.civil_status) || '',
    street: resolveProfileFormValue(base.street, studentData.street, pendingActivationProfile.street, sessionPrefillProfile.street) || '',
    city: resolveProfileFormValue(base.city, studentData.city, pendingActivationProfile.city, sessionPrefillProfile.city) || '',
    province: resolveProfileFormValue(base.province, studentData.province, pendingActivationProfile.province, sessionPrefillProfile.province) || '',
    zipCode: resolveProfileFormValue(base.zipCode, studentData.zip_code, pendingActivationProfile.zipCode, sessionPrefillProfile.zipCode) || '',
    region: resolveProfileFormValue(base.region, studentData.region, sessionPrefillProfile.region) || '',
    regionOther: resolveProfileFormValue(base.regionOther, studentData.region_other) || '',
    mobile: resolveProfileFormValue(base.mobile, studentData.mobile, pendingActivationProfile.mobile, sessionPrefillProfile.mobile) || '',
    email: resolveProfileFormValue(base.email, studentData.email, pendingActivationProfile.email, sessionPrefillProfile.email) || '',
    facebookUrl: resolveProfileFormValue(base.facebookUrl, studentData.facebook_url) || '',
    motherLastName: resolveProfileFormValue(base.motherLastName, motherParts.last) || '',
    motherGivenName: resolveProfileFormValue(base.motherGivenName, motherParts.given) || '',
    motherMiddleName: resolveProfileFormValue(base.motherMiddleName, motherParts.middle) || '',
    motherOccupation: resolveProfileFormValue(base.motherOccupation, studentData.mother_occupation) || '',
    motherStatus: resolveProfileFormValue(base.motherStatus, studentData.mother_status) || '',
    motherContact: resolveProfileFormValue(base.motherContact, studentData.mother_contact) || '',
    motherAddress: resolveProfileFormValue(base.motherAddress, studentData.mother_address) || '',
    fatherLastName: resolveProfileFormValue(base.fatherLastName, fatherParts.last) || '',
    fatherGivenName: resolveProfileFormValue(base.fatherGivenName, fatherParts.given) || '',
    fatherMiddleName: resolveProfileFormValue(base.fatherMiddleName, fatherParts.middle) || '',
    fatherOccupation: resolveProfileFormValue(base.fatherOccupation, studentData.father_occupation) || '',
    fatherStatus: resolveProfileFormValue(base.fatherStatus, studentData.father_status) || '',
    fatherContact: resolveProfileFormValue(base.fatherContact, studentData.father_contact) || '',
    fatherAddress: resolveProfileFormValue(base.fatherAddress, studentData.father_address) || '',
    religion: resolveProfileFormValue(base.religion, studentData.religion) || '',
    yearLevelApplying: resolveProfileFormValue(base.yearLevelApplying, studentData.year_level, '1st Year') || '1st Year',
    yearLevelOther: resolveProfileFormValue(base.yearLevelOther, studentData.year_level_other) || '',
    department: resolveProfileFormValue(base.department, studentData.department) || '',
    course: resolveProfileFormValue(base.course, studentData.course) || '',
    supporter: resolveProfileFormValue(base.supporter, studentData.supporter) || '',
    supporterContact: resolveProfileFormValue(base.supporterContact, studentData.supporter_contact) || '',
    isWorkingStudent: resolveProfileFormValue(base.isWorkingStudent, toYesNoChoice(studentData.is_working_student)) || '',
    workingStudentType: resolveProfileFormValue(base.workingStudentType, studentData.working_student_type) || '',
    workingStudentTypeOther: resolveProfileFormValue(base.workingStudentTypeOther, studentData.working_student_type_other) || '',
    employerName: resolveProfileFormValue(base.employerName, studentData.employer_name) || '',
    employerAddress: resolveProfileFormValue(base.employerAddress, studentData.employer_address) || '',
    isPwd: resolveProfileFormValue(base.isPwd, toYesNoChoice(studentData.is_pwd)) || '',
    pwdNumber: resolveProfileFormValue(base.pwdNumber, studentData.pwd_number) || '',
    pwdType: resolveProfileFormValue(base.pwdType, studentData.pwd_type) || '',
    pwdTypeOther: resolveProfileFormValue(base.pwdTypeOther, studentData.pwd_type_other) || '',
    disabilityCause: resolveProfileFormValue(base.disabilityCause, studentData.disability_cause) || '',
    pwdDocumentUrl: resolveProfileFormValue(base.pwdDocumentUrl, studentData.pwd_document_url) || '',
    isIndigenous: resolveProfileFormValue(base.isIndigenous, toYesNoChoice(studentData.is_indigenous)) || '',
    indigenousGroup: resolveProfileFormValue(base.indigenousGroup, studentData.indigenous_group) || '',
    indigenousGroupOther: resolveProfileFormValue(base.indigenousGroupOther, studentData.indigenous_group_other) || '',
    ipDocumentUrl: resolveProfileFormValue(base.ipDocumentUrl, studentData.ip_document_url) || '',
    isFourPsMember: resolveProfileFormValue(base.isFourPsMember, toYesNoChoice(studentData.is_four_ps_member)) || '',
    fourPsDocumentUrl: resolveProfileFormValue(base.fourPsDocumentUrl, studentData.four_ps_document_url) || '',
    isRebelReturnee: resolveProfileFormValue(base.isRebelReturnee, toYesNoChoice(studentData.is_rebel_returnee)) || '',
    isSoloParent: resolveProfileFormValue(base.isSoloParent, toYesNoChoice(studentData.is_solo_parent)) || '',
    isChildOfSoloParent: resolveProfileFormValue(base.isChildOfSoloParent, toYesNoChoice(studentData.is_child_of_solo_parent)) || '',
    soloParentDocumentUrl: resolveProfileFormValue(base.soloParentDocumentUrl, studentData.solo_parent_document_url) || '',
    isOrphan: resolveProfileFormValue(base.isOrphan, toYesNoChoice(studentData.is_orphan)) || '',
    orphanCause: resolveProfileFormValue(base.orphanCause, studentData.orphan_cause) || '',
    orphanCauseOther: resolveProfileFormValue(base.orphanCauseOther, studentData.orphan_cause_other) || '',
    isHomelessCitizen: resolveProfileFormValue(base.isHomelessCitizen, toYesNoChoice(studentData.is_homeless_citizen)) || '',
    isSeniorCitizen: resolveProfileFormValue(base.isSeniorCitizen, toYesNoChoice(studentData.is_senior_citizen)) || '',
    seniorCitizenDocumentUrl: resolveProfileFormValue(base.seniorCitizenDocumentUrl, studentData.senior_citizen_document_url) || '',
    workExperiences: resolveProfileFormValue(base.workExperiences, studentData.work_experiences) || '',
    parentsNumChildren: resolveProfileFormValue(base.parentsNumChildren, studentData.parents_num_children) ?? '',
    birthOrder: resolveProfileFormValue(base.birthOrder, studentData.birth_order) || '',
    birthOrderOther: resolveProfileFormValue(base.birthOrderOther, studentData.birth_order_other) || '',
    spouseName: resolveProfileFormValue(base.spouseName, studentData.spouse_name) || '',
    spouseOccupation: resolveProfileFormValue(base.spouseOccupation, studentData.spouse_occupation) || '',
    spouseEmployerName: resolveProfileFormValue(base.spouseEmployerName, studentData.spouse_employer_name) || '',
    spouseEmployerAddress: resolveProfileFormValue(base.spouseEmployerAddress, studentData.spouse_employer_address) || '',
    spouseContact: resolveProfileFormValue(base.spouseContact, studentData.spouse_contact) || '',
    numChildren: resolveProfileFormValue(base.numChildren, studentData.num_children) ?? '',
    childrenNamesBirthdates: resolveProfileFormValue(base.childrenNamesBirthdates, studentData.children_names_birthdates) || '',
    currentlyPregnant: resolveProfileFormValue(base.currentlyPregnant, studentData.currently_pregnant) || '',
    guardianName: resolveProfileFormValue(base.guardianName, studentData.guardian_name) || '',
    guardianAddress: resolveProfileFormValue(base.guardianAddress, studentData.guardian_address) || '',
    guardianContact: resolveProfileFormValue(base.guardianContact, studentData.guardian_contact) || '',
    guardianRelation: resolveProfileFormValue(base.guardianRelation, studentData.guardian_relation) || '',
    emergencyName: resolveProfileFormValue(base.emergencyName, studentData.emergency_name) || '',
    emergencyAddress: resolveProfileFormValue(base.emergencyAddress, studentData.emergency_address) || '',
    emergencyRelationship: resolveProfileFormValue(base.emergencyRelationship, studentData.emergency_relationship) || '',
    emergencyNumber: resolveProfileFormValue(base.emergencyNumber, studentData.emergency_number) || '',
    elemSchool: resolveProfileFormValue(base.elemSchool, studentData.elem_school) || '',
    elemYearGraduated: resolveProfileFormValue(base.elemYearGraduated, studentData.elem_year_graduated) || '',
    juniorHighSchool: resolveProfileFormValue(base.juniorHighSchool, studentData.junior_high_school) || '',
    juniorHighYearGraduated: resolveProfileFormValue(base.juniorHighYearGraduated, studentData.junior_high_year_graduated) || '',
    seniorHighSchool: resolveProfileFormValue(base.seniorHighSchool, studentData.senior_high_school) || '',
    seniorHighYearGraduated: resolveProfileFormValue(base.seniorHighYearGraduated, studentData.senior_high_year_graduated) || '',
    collegeSchool: resolveProfileFormValue(base.collegeSchool, studentData.college_school) || '',
    collegeYearGraduated: resolveProfileFormValue(base.collegeYearGraduated, studentData.college_year_graduated) || '',
    honorsAwards: resolveProfileFormValue(base.honorsAwards, studentData.honors_awards) || '',
    tesdaNc2Acquired: resolveProfileFormValue(base.tesdaNc2Acquired, studentData.tesda_nc2_acquired) || '',
    eligibilityAcquired: resolveProfileFormValue(base.eligibilityAcquired, studentData.eligibility_acquired) || '',
    specialTrainingsAttended: resolveProfileFormValue(base.specialTrainingsAttended, studentData.special_trainings_attended) || '',
    extracurricularActivities: resolveProfileFormValue(base.extracurricularActivities, studentData.extracurricular_activities) || '',
    holdsPublicServicePosition: resolveProfileFormValue(base.holdsPublicServicePosition, toYesNoChoice(studentData.holds_public_service_position)) || '',
    publicServicePosition: resolveProfileFormValue(base.publicServicePosition, studentData.public_service_position) || '',
    organizationsMemberships: resolveProfileFormValue(base.organizationsMemberships, studentData.organizations_memberships) || '',
    sportsSkills: resolveProfileFormValue(base.sportsSkills, studentData.sports_skills) || '',
    otherTalents: resolveProfileFormValue(base.otherTalents, studentData.other_talents) || '',
    scholarshipsAvailed: resolveProfileFormValue(base.scholarshipsAvailed, studentData.scholarships_availed) || '',
    hasBeenCriminallyCharged: resolveProfileFormValue(base.hasBeenCriminallyCharged, toYesNoChoice(studentData.has_been_criminally_charged)) || '',
    criminalChargeDetails: resolveProfileFormValue(base.criminalChargeDetails, studentData.criminal_charge_details) || '',
    hasBeenConvictedOfCrime: resolveProfileFormValue(base.hasBeenConvictedOfCrime, toYesNoChoice(studentData.has_been_convicted_of_crime)) || '',
    crimeConvictionDetails: resolveProfileFormValue(base.crimeConvictionDetails, studentData.crime_conviction_details) || '',
});

interface Student {
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    studentId: string;
    department: string;
    course: string;
    year: string;
    section: string;
    status: string;
    address: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    mobile: string;
    email: string;
    facebookUrl?: string;
    emergencyContact?: string;
    dob: string;
    age: string | number;
    placeOfBirth?: string;
    sex: string;
    genderIdentity?: string;
    civilStatus?: string;
    nationality?: string;
    priorityCourse?: string;
    altCourse1?: string;
    altCourse2?: string;
    schoolLastAttended?: string;
    isWorkingStudent?: boolean;
    workingStudentType?: string;
    employerName?: string;
    employerAddress?: string;
    supporter?: string;
    supporterContact?: string;
    isPwd?: boolean;
    pwdNumber?: string;
    pwdType?: string;
    disabilityCause?: string;
    pwdDocumentUrl?: string;
    isIndigenous?: boolean;
    indigenousGroup?: string;
    ipDocumentUrl?: string;
    isFourPsMember?: boolean;
    fourPsDocumentUrl?: string;
    isRebelReturnee?: boolean;
    soloParentDocumentUrl?: string;
    isOrphan?: boolean;
    orphanCause?: string;
    isHomelessCitizen?: boolean;
    isSeniorCitizen?: boolean;
    seniorCitizenDocumentUrl?: string;
    workExperiences?: string;
    motherLastName?: string;
    motherGivenName?: string;
    motherMiddleName?: string;
    fatherLastName?: string;
    fatherGivenName?: string;
    fatherMiddleName?: string;
    witnessedConflict?: string;
    isSoloParent?: boolean;
    isChildOfSoloParent?: boolean;
    [key: string]: any; // Allow loose typing for now to prevent breakage
}

interface Event {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    event_time: string;
    end_time?: string;
    location: string;
    type: string;
}

interface Scholarship {
    id: string;
    title: string;
    description: string;
    requirements: string;
    deadline: string;
}

interface Request {
    id: string;
    status: string;
    created_at: string;
    student_name?: string;
    course_year?: string;
    contact_number?: string;
    reason_for_referral?: string;
    description?: string;
    personal_actions_taken?: string;
    date_duration_of_concern?: string;
    referred_by?: string;
    scheduled_date?: string;
    resolution_notes?: string;
    rating?: number;
    feedback?: string;
    support_type?: string;
    [key: string]: any;
}


const Icons = {
    Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>,
    Profile: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Assessment: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="m9 14 2 2 4-4" /></svg>,
    Counseling: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    Support: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m7 11 2-2-2-2M11 9h4" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg>,
    Scholarship: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>,
    Events: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
    Feedback: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-4.7 8.38 8.38 0 0 1 3.8.9L21 9z" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
    Star: ({ filled }: any) => <svg className={`w-8 h-8 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
    GraduationCap: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    ArrowRight: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
    Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    XCircle: ({ size = 24, className }: any) => <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
};

// Isolated Hero Component to prevent full page re-renders
const StudentHero = ({ firstName }: any) => {
    const [time, setTime] = useState(new Date());
    const [isCompactHeroLayout, setIsCompactHeroLayout] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let intervalId: number | null = null;
        let startDelayId: number | null = null;
        let minuteSyncId: number | null = null;
        const syncTime = () => setTime(new Date());
        const startLiveClock = () => {
            syncTime();
            const now = new Date();
            const msUntilNextMinute = Math.max((((59 - now.getSeconds()) * 1000) + (1000 - now.getMilliseconds())), 250);

            minuteSyncId = window.setTimeout(() => {
                syncTime();
                intervalId = window.setInterval(syncTime, 60 * 1000);
            }, msUntilNextMinute);
        };

        const startClockWithDelay = () => {
            startDelayId = window.setTimeout(() => {
                startLiveClock();
            }, 1800);
        };

        if (isCompactHeroLayout) {
            startClockWithDelay();
        } else {
            setTime(new Date());
            startLiveClock();
        }

        return () => {
            if (startDelayId !== null) {
                window.clearTimeout(startDelayId);
            }

            if (minuteSyncId !== null) {
                window.clearTimeout(minuteSyncId);
            }

            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
        };
    }, [isCompactHeroLayout]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCompactLayout = () => {
            setIsCompactHeroLayout(window.innerWidth < 640);
        };

        syncCompactLayout();
        window.addEventListener('resize', syncCompactLayout);

        return () => {
            window.removeEventListener('resize', syncCompactLayout);
        };
    }, []);

    const formatFullDate = (date: any) => {
        return new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTimeParts = (date: any) => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const parts = formatter.formatToParts(new Date(date));
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        return {
            time: `${values.hour || '--'}:${values.minute || '--'}`,
            period: String(values.dayPeriod || '').toUpperCase()
        };
    };

    const { time: formattedTime, period } = formatTimeParts(time);

    return (
        <div className={`student-dashboard-hero bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between shadow-2xl shadow-blue-500/20 relative overflow-hidden ${isCompactHeroLayout ? '' : 'animate-fade-in-up'}`}>
            <div className={`student-hero-decoration absolute top-0 right-0 w-72 h-72 bg-sky-400/20 rounded-full -mr-20 -mt-20 blur-3xl ${isCompactHeroLayout ? '' : 'animate-float'}`}></div>
            <div className={`student-hero-decoration absolute bottom-0 left-0 w-48 h-48 bg-blue-400/15 rounded-full -ml-10 -mb-10 blur-3xl ${isCompactHeroLayout ? '' : 'animate-blob'}`}></div>
            <div className="relative z-10 max-w-full">
                <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl sm:leading-tight">
                    Welcome back, <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">{firstName}</span>!
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-200/70 sm:text-base">{formatFullDate(time)}</p>
            </div>
            <div className="relative z-10 w-full text-left sm:w-auto sm:text-right">
                <div className="flex items-end gap-2 sm:justify-end sm:gap-3">
                    <span className="text-[clamp(2rem,10vw,3.75rem)] font-black leading-none tracking-[-0.06em] tabular-nums bg-gradient-to-b from-white to-sky-200 bg-clip-text text-transparent">
                        {formattedTime}
                    </span>
                    <span className="pb-1 text-lg font-black leading-none tracking-[0.12em] text-sky-100/90 sm:pb-1.5 sm:text-2xl">
                        {period}
                    </span>
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/50 sm:text-right">Current System Time</p>
            </div>
        </div>
    );
};

export default function StudentPortal() {
    const { session, loading, updateSession, logout } = useAuth() as any;
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState,
        isFeatureVisible
    } = usePermissions();
    const navigate = useNavigate();

    const [activeView, setActiveView] = useState('dashboard');
    const [profileTab, setProfileTab] = useState('personal');
    const [isCompactPortalLayout, setIsCompactPortalLayout] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    ));
    // Timer removed from main component
    const [feedbackType, setFeedbackType] = useState('service');
    const [rating, setRating] = useState(0);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [selectedSupportRequest, setSelectedSupportRequest] = useState<any>(null);
    const [sessionFeedback, setSessionFeedback] = useState<any>({ rating: 0, comment: '' });
    const [feedbackPrefill, setFeedbackPrefill] = useState<any>(null);
    const [activeVisit, setActiveVisit] = useState<any>(null);
    const [toast, setToast] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCommandHub, setShowCommandHub] = useState(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const showToast = (message: string, type: string = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const getStudentViewAccessState = useCallback((viewId: string) => {
        if (viewId === 'dashboard') {
            return {
                isAllowed: true,
                status: 'enabled' as const,
                noticeText: null,
                description: null
            };
        }

        const permissionKey = STUDENT_VIEW_FEATURE_MAP[viewId];
        if (!permissionKey) {
            return {
                isAllowed: true,
                status: 'enabled' as const,
                noticeText: null,
                description: null
            };
        }

        return getFeatureAccessState(permissionKey);
    }, [getFeatureAccessState]);

    const isStudentViewEnabled = useCallback((viewId: string) => {
        const accessState = getStudentViewAccessState(viewId);
        return accessState.isAllowed && accessState.status === 'enabled';
    }, [getStudentViewAccessState]);

    const isStudentViewVisible = useCallback((viewId: string) => {
        if (viewId === 'dashboard') return true;

        const permissionKey = STUDENT_VIEW_FEATURE_MAP[viewId];
        if (!permissionKey) return true;
        return isFeatureVisible(permissionKey);
    }, [isFeatureVisible]);

    const requireStudentViewVisibility = useCallback((
        viewId: string,
        deniedMessage?: string,
        options?: { suppressToast?: boolean }
    ) => {
        if (isStudentViewVisible(viewId)) {
            return true;
        }

        if (!options?.suppressToast) {
            showToast(
                deniedMessage || `${STUDENT_VIEW_LABELS[viewId] || viewId} is currently hidden from the student portal.`,
                'error'
            );
        }

        return false;
    }, [isStudentViewVisible]);

    const requireStudentFeatureAccess = useCallback((
        viewId: string,
        deniedMessage?: string,
        options?: { suppressToast?: boolean }
    ) => {
        const accessState = getStudentViewAccessState(viewId);
        if (accessState.isAllowed && accessState.status === 'enabled') {
            return true;
        }

        if (!options?.suppressToast) {
            showToast(
                deniedMessage || getPermissionNotice(accessState, STUDENT_VIEW_LABELS[viewId] || String(STUDENT_VIEW_FEATURE_MAP[viewId] || viewId)),
                'error'
            );
        }

        return false;
    }, [getStudentViewAccessState]);

    // Assessment State
    const [activeForm, setActiveForm] = useState<any>(null);
    const [formsList, setFormsList] = useState<any[]>([]);
    const [loadingForm, setLoadingForm] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedForms, setCompletedForms] = useState<Set<any>>(new Set());

    // Events State (Merged)
    const [eventFilter, setEventFilter] = useState('All');
    const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({}); // Stores { eventId: { time_in, time_out } }
    const [registrationMap, setRegistrationMap] = useState<Record<string, any>>({});
    const [ratedEvents, setRatedEvents] = useState<any[]>([]);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingForm, setRatingForm] = useState<any>({ eventId: null, title: '', rating: 0, comment: '', q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, open_best: '', open_suggestions: '', open_comments: '' });

    // Modals & Dynamic States
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showCounselingRequestsModal, setShowCounselingRequestsModal] = useState(false);
    const [showSupportRequestsModal, setShowSupportRequestsModal] = useState(false);
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<any>(null);

    // Office Logbook Modal State
    const [showTimeInModal, setShowTimeInModal] = useState(false);
    const [visitReasons, setVisitReasons] = useState<any[]>([]);
    const [selectedReason, setSelectedReason] = useState('');
    const [showTimeOutFeedback, setShowTimeOutFeedback] = useState(false);
    const [timeOutVisitReason, setTimeOutVisitReason] = useState('');

    const [proofFile, setProofFile] = useState<any>(null);
    const [isTimingIn, setIsTimingIn] = useState(false);
    const [timingOutEventId, setTimingOutEventId] = useState<string | null>(null);
    const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
    const [cancellingRegistrationEventId, setCancellingRegistrationEventId] = useState<string | null>(null);
    const [isSubmittingEventRating, setIsSubmittingEventRating] = useState(false);
    const [isApplyingScholarshipId, setIsApplyingScholarshipId] = useState<string | null>(null);
    const [isSubmittingOfficeTimeIn, setIsSubmittingOfficeTimeIn] = useState(false);
    const [isCompletingOfficeVisit, setIsCompletingOfficeVisit] = useState(false);

    const handleLogout = React.useCallback(() => {
        logout();
        navigate('/student/login', { replace: true });
    }, [logout, navigate]);

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

    // Onboarding Tour State
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [hasSeenTourState, setHasSeenTourState] = useState(true); // Default true

    // Profile Completion Modal State
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [forceProfileCompletionPrompt, setForceProfileCompletionPrompt] = useState(false);
    const [hideProfileCompletionReminder, setHideProfileCompletionReminder] = useState(false);
    const [profileServiceGate, setProfileServiceGate] = useState({
        visible: false,
        serviceLabel: '',
        message: ''
    });
    const [profileCompletionInitialData, setProfileCompletionInitialData] = useState<any>(createInitialProfileFormData);
    const [isSavingProfileChanges, setIsSavingProfileChanges] = useState(false);
    const [profileCompletionStatusOverride, setProfileCompletionStatusOverride] = useState<boolean | null>(null);
    const [profileFieldsComplete, setProfileFieldsComplete] = useState<boolean | null>(null);
    const profileCompletionJustCompletedRef = useRef(false);
    const refreshStudentProfileRequestRef = useRef(0);
    const hasPendingForcedProfileCompletion = session?.userType === 'student'
        && shouldForceProfileCompletionPrompt(session?.student_id);
    const effectiveProfileCompleted = profileCompletionStatusOverride !== null
        ? profileCompletionStatusOverride
        : (session?.profile_completed === true || profileFieldsComplete === true
            ? true
            : (profileFieldsComplete === false ? false : null));
    const profileCompletionReminderRequired = Boolean(
        session?.userType === 'student' && (
            forceProfileCompletionPrompt
            || effectiveProfileCompleted === false
            || hasPendingForcedProfileCompletion
        )
    );
    const profileCompletionGateActive = Boolean(
        session?.userType === 'student' && showProfileCompletion
    );
    const profileCompletionReminderVisible = profileCompletionReminderRequired
        && !profileCompletionGateActive
        && !hideProfileCompletionReminder;

    const portalMountTimeRef = useRef(Date.now());

    const openProfileCompletionModal = () => {
        // Prevent mobile ghost-clicks from the login screen triggering the modal
        if (Date.now() - portalMountTimeRef.current < 800) return;

        setShowProfileCompletion(true);
        setHideProfileCompletionReminder(false);
    };
    const closeProfileServiceGate = React.useCallback(() => {
        setProfileServiceGate({
            visible: false,
            serviceLabel: '',
            message: ''
        });
    }, []);
    const openProfileCompletionFromServiceGate = React.useCallback(() => {
        closeProfileServiceGate();
        openProfileCompletionModal();
    }, [closeProfileServiceGate]);

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

    const normalizeProfileField = (value: any) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? '1' : '0';
        if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value);
        return String(value).trim();
    };

    const toProfileFieldLabel = (field: string) => {
        if (PROFILE_FIELD_LABELS[field]) return PROFILE_FIELD_LABELS[field];
        return field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
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

    const logStudentProfileUpdate = async ({
        action,
        beforeProfile,
        afterPayload,
        fallbackName,
        fallbackStudentId
    }: {
        action: string;
        beforeProfile: any;
        afterPayload: any;
        fallbackName?: string;
        fallbackStudentId?: string;
    }) => {
        try {
            const changedFields = getChangedProfileFields(beforeProfile, afterPayload);
            if (changedFields.length === 0) return;

            const studentId = fallbackStudentId || personalInfo.studentId || session?.user?.id || 'unknown';
            const fullName = (fallbackName || `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`).trim() || 'Student';
            const changedPreview = changedFields.slice(0, 6).join(', ');
            const moreSuffix = changedFields.length > 6 ? ` (+${changedFields.length - 6} more)` : '';
            const details = `${fullName} (${studentId}) modified: ${changedPreview}${moreSuffix}.`;

            const { error: notificationError } = await supabaseClient.from('notifications').insert([{
                student_id: studentId,
                message: `[PROFILE UPDATE] ${details}`
            }]);
            if (notificationError) {
                console.warn('Profile update notification failed:', notificationError.message);
            }
        } catch (loggingError: any) {
            console.warn('Unable to record profile update notification:', loggingError?.message || loggingError);
        }
    };

    const syncStudentSession = React.useCallback((studentPatch: any) => {
        if (!studentPatch || session?.userType !== 'student') return;
        updateSession?.((prev: any) => ({
            ...(prev || {}),
            ...studentPatch,
            userType: 'student',
            role: 'Student'
        }));
    }, [session?.userType, updateSession]);

    const handleAssessmentSubmitted = useCallback(async (formId: any, wasNewSubmission: boolean) => {
        setCompletedForms((prev) => new Set([...prev, formId]));
        setShowAssessmentModal(false);
        setActiveForm((current: any) => (current?.id === formId ? null : current));

        if (wasNewSubmission) {
            setShowSuccessModal(true);
        }
    }, []);

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
        setShowProfileCompletion(false);
        syncStudentSession({
            ...updatedStudent,
            department: matchedDepartment,
            profile_completed: true
        });
        showToast('Profile completed successfully!');
    }, [
        getStoredParentParts,
        personalInfo.department,
        personalInfo.studentId,
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
        session?.sex,
        session?.street,
        session?.suffix,
        session?.zip_code,
        showToast,
        syncStudentSession
    ]);

    const [eventsList, setEventsList] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Scholarship State
    const [scholarshipsList, setScholarshipsList] = useState<any[]>([]);
    const [myApplications, setMyApplications] = useState<any[]>([]);
    const [isRefreshingView, setIsRefreshingView] = useState(false);
    const datasetRefreshCacheRef = useRef<Record<StudentDatasetRefreshKey, DatasetRefreshCacheEntry>>(createStudentDatasetRefreshCache());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCompactLayout = () => {
            setIsCompactPortalLayout(window.innerWidth < 640);
        };

        syncCompactLayout();
        window.addEventListener('resize', syncCompactLayout);

        return () => {
            window.removeEventListener('resize', syncCompactLayout);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        document.body.classList.toggle('student-portal-compact-mobile', isCompactPortalLayout);

        return () => {
            document.body.classList.remove('student-portal-compact-mobile');
        };
    }, [isCompactPortalLayout]);

    useEffect(() => {
        datasetRefreshCacheRef.current = createStudentDatasetRefreshCache();
    }, [personalInfo.studentId]);

    const runDatasetRefresh = useCallback(async (
        key: StudentDatasetRefreshKey,
        refreshFn: () => Promise<unknown>,
        options?: { force?: boolean }
    ) => {
        const force = Boolean(options?.force);
        const cacheEntry = datasetRefreshCacheRef.current[key];
        const ttl = DATASET_REFRESH_TTL_MS[key];
        const now = Date.now();

        if (!force && cacheEntry.loaded && now - cacheEntry.refreshedAt < ttl) {
            return false;
        }

        await refreshFn();
        datasetRefreshCacheRef.current[key] = {
            loaded: true,
            refreshedAt: Date.now()
        };
        return true;
    }, []);

    const transitionToView = useCallback((nextView: string, options?: { suppressToast?: boolean }) => {
        if (!requireStudentViewVisibility(nextView, undefined, options)) {
            return false;
        }

        startTransition(() => {
            setActiveView(nextView);
        });
        return true;
    }, [requireStudentViewVisibility]);

    const { refreshActiveVisit, refreshVisitReasons, refreshNotifications } = useStudentProfileData({
        studentId: personalInfo.studentId,
        setActiveVisit,
        setVisitReasons,
        setNotifications
    });
    const refreshCounselingRequestsCached = useCallback(async (options?: { force?: boolean }) => {}, []);
    const refreshNotificationsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('notifications', refreshNotifications, options),
        [refreshNotifications, runDatasetRefresh]
    );
    const refreshEventsCached = useCallback(async (options?: { force?: boolean }) => {}, []);
    const refreshActiveVisitCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('activeVisit', refreshActiveVisit, options),
        [refreshActiveVisit, runDatasetRefresh]
    );
    const refreshVisitReasonsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('visitReasons', refreshVisitReasons, options),
        [refreshVisitReasons, runDatasetRefresh]
    );
    const refreshFormsCached = useCallback(async (options?: { force?: boolean }) => {}, []);
    const refreshSupportRequestsCached = useCallback(async (options?: { force?: boolean }) => {}, []);
    const handleCounselingSubmitted = useCallback(async () => {
        await refreshCounselingRequestsCached({ force: true });
    }, [refreshCounselingRequestsCached]);
    const handleSupportSubmitted = useCallback(async () => {
        await refreshSupportRequestsCached({ force: true });
    }, [refreshSupportRequestsCached]);

    const refreshScholarships = useCallback(async () => {
        const { data } = await supabaseClient
            .from('scholarships')
            .select('id, title, description, requirements, deadline')
            .eq('is_active', true)
            .order('deadline', { ascending: true });
        setScholarshipsList(data || []);
    }, []);
    const refreshScholarshipsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('scholarships', refreshScholarships, options),
        [refreshScholarships, runDatasetRefresh]
    );

    const refreshScholarshipApplications = useCallback(async () => {
        if (!personalInfo.studentId) {
            setMyApplications([]);
            return;
        }

        const { data } = await supabaseClient
            .from('scholarship_applications')
            .select('scholarship_id, status')
            .eq('student_id', personalInfo.studentId);

        setMyApplications(data || []);
    }, [personalInfo.studentId]);
    const refreshScholarshipApplicationsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('scholarshipApplications', refreshScholarshipApplications, options),
        [refreshScholarshipApplications, runDatasetRefresh]
    );

    const handleApplyScholarship = async (scholarship: any) => {
        if (!scholarship) return;
        const scholarshipId = String(scholarship.id || '').trim();
        if (scholarshipId && isApplyingScholarshipId === scholarshipId) return;
        // Verify profile completeness
        if (!personalInfo.mobile || !personalInfo.email) {
            showToast("Please update your contact info (Mobile & Email) in Profile first.", "error"); return;
        }

        if (scholarshipId) {
            setIsApplyingScholarshipId(scholarshipId);
        }
        try {
            const payload = {
                scholarship_id: scholarship.id,
                student_id: personalInfo.studentId,
                status: 'Pending'
            } as any;

            const { error } = await supabaseClient.from('scholarship_applications').insert([payload]);
            if (error) throw error;
            showToast("Application submitted successfully!");
            setMyApplications([...myApplications, { scholarship_id: scholarship.id, status: 'Pending' }]);
            setShowScholarshipModal(false);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            if (scholarshipId) {
                setIsApplyingScholarshipId((current) => (current === scholarshipId ? null : current));
            }
        }
    };

    const invokeManagedStudentFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-student-accounts', {
            client: supabaseClient,
            body,
            requireAuth: true,
            non2xxMessage: 'Your student session could not be verified. Please sign in again.',
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
    }, [session?.auth_email, session?.auth_user_id, session?.user, syncStudentSession]);

    const getCourseYearWindowRange = (startValue: string | null | undefined, endValue: string | null | undefined) => {
        const startText = formatGateDate(startValue || null);
        const endText = formatGateDate(endValue || null);
        if (startText && endText) return `${startText} to ${endText}`;
        if (startText) return `Starts ${startText}`;
        if (endText) return `Until ${endText}`;
        return null;
    };

    const formatGateDate = (value: string | null) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
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
            showToast('Course and year confirmed successfully.');
        } catch (error: any) {
            showToast('Failed to confirm course/year: ' + error.message, 'error');
        } finally {
            setIsSubmittingCourseYearGate(false);
        }
    };

    // Timer removed (handled by Clock component)

    // Helper to determine department from course
    // Removed hardcoded getDepartment in favor of dynamic fetch

    const refreshStudentProfile = React.useCallback(async () => {
        if (!session || session.userType !== 'student') return;

        const refreshRequestId = refreshStudentProfileRequestRef.current + 1;
        refreshStudentProfileRequestRef.current = refreshRequestId;
        const studentId = session.student_id || null;
        const authUserId = session.auth_user_id || session?.user?.id || null;
        const profileKey = String(authUserId || studentId || '').trim();
        if (!profileKey) return;
        try {
            let studentData: any = session;
            let latestStudent: any = null;

            if (authUserId) {
                const { data } = await supabaseClient
                    .from('students')
                    .select(STUDENT_LIST_COLUMNS)
                    .eq('auth_user_id', authUserId)
                    .maybeSingle();
                latestStudent = data;
            }

            if (!latestStudent && studentId) {
                const { data } = await supabaseClient
                    .from('students')
                    .select(STUDENT_LIST_COLUMNS)
                    .eq('student_id', studentId)
                    .maybeSingle();
                latestStudent = data;
            }

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
                if (refreshedStudent) studentData = refreshedStudent;
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
                    courseOptionsCacheRef.current = (courseRows || []).map((row: any) => row.name).filter(Boolean);
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
                setShowProfileCompletion(false);
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
    }, [session, syncStudentSession, getStoredParentParts, invokeManagedStudentFunction, forceProfileCompletionPrompt]);

    useEffect(() => {
        profileCompletionJustCompletedRef.current = false;
        setProfileCompletionStatusOverride(null);
        setProfileFieldsComplete(null);
        setProfileCompletionInitialData(createInitialProfileFormData());
    }, [session?.student_id, session?.auth_user_id]);

    useEffect(() => {
        setHideProfileCompletionReminder(false);
    }, [session?.student_id, session?.auth_user_id]);

    useEffect(() => {
        if (session?.userType !== 'student') {
            profileCompletionJustCompletedRef.current = false;
            setForceProfileCompletionPrompt(false);
            setHideProfileCompletionReminder(false);
            setShowProfileCompletion(false);
            setProfileCompletionStatusOverride(null);
            setProfileFieldsComplete(null);
            return;
        }

        applyPendingProfileToProfileForm(
            setProfileCompletionInitialData,
            getPendingProfileCompletionProfile(session.student_id) || getPendingProfileCompletionProfile()
        );

        if (shouldForceProfileCompletionPrompt(session.student_id)) {
            setForceProfileCompletionPrompt(true);
        }
    }, [session?.student_id, session?.userType]);

    useEffect(() => {
        if (!profileCompletionReminderRequired) {
            setHideProfileCompletionReminder(false);
            return;
        }

        if (hasPendingForcedProfileCompletion) {
            setForceProfileCompletionPrompt(true);
        }
    }, [profileCompletionReminderRequired, hasPendingForcedProfileCompletion]);

    useEffect(() => {
        if (!profileCompletionReminderRequired) {
            closeProfileServiceGate();
        }
    }, [closeProfileServiceGate, profileCompletionReminderRequired]);

    // Sync session to personalInfo
    useEffect(() => {
        refreshStudentProfile();
    }, [session?.auth_user_id, session?.user?.id, session?.student_id, session?.userType]);

    useEffect(() => {
        if (!profileCompletionGateActive) return;

        setShowTour(false);
        setTourStep(0);
        setShowCommandHub(false);
    }, [profileCompletionGateActive]);

    // Sequences the Tour to appear AFTER Profile Completion closes and when Side Panel is opened
    useEffect(() => {
        if (!loading && session && !profileCompletionGateActive && !hasSeenTourState) {
            if (isSidebarOpen) {
                setShowTour(true);
            } else {
                setShowTour(false);
            }
        }
    }, [loading, session, profileCompletionGateActive, hasSeenTourState, isSidebarOpen]);

    // Save Profile Changes to Supabase
    const validateProfileBeforeSave = (profile: any) => {
        if (!profile.profilePictureUrl && !profile.profile_picture_url) {
            showToast('Profile picture is required.', 'error');
            return false;
        }

        const requiredFields = [
            'firstName', 'lastName', 'middleName', 'suffix',
            'dob', 'age', 'placeOfBirth', 'nationality', 'sex', 'genderIdentity', 'civilStatus',
            'street', 'city', 'province', 'zipCode', 'region',
            'mobile', 'facebookUrl',
            'spouseName', 'spouseOccupation', 'spouseEmployerName', 'spouseEmployerAddress', 'spouseContact',
            'numChildren', 'childrenNamesBirthdates', 'currentlyPregnant',
            'motherLastName', 'motherGivenName', 'motherMiddleName', 'motherOccupation', 'motherStatus', 'motherContact', 'motherAddress',
            'fatherLastName', 'fatherGivenName', 'fatherMiddleName', 'fatherOccupation', 'fatherStatus', 'fatherContact', 'fatherAddress',
            'parentsNumChildren', 'birthOrder',
            'supporter', 'supporterContact',
            'isWorkingStudent', 'workingStudentType', 'employerName', 'employerAddress',
            'isPwd', 'pwdNumber', 'pwdType', 'disabilityCause',
            'isIndigenous', 'indigenousGroup',
            'isFourPsMember', 'isRebelReturnee',
            'isSoloParent', 'isChildOfSoloParent',
            'isOrphan', 'orphanCause',
            'isHomelessCitizen', 'isSeniorCitizen',
            'workExperiences',
            'guardianName', 'guardianAddress', 'guardianContact', 'guardianRelation',
            'emergencyName', 'emergencyAddress', 'emergencyRelationship', 'emergencyNumber',
            'elemSchool', 'elemYearGraduated',
            'juniorHighSchool', 'juniorHighYearGraduated',
            'seniorHighSchool', 'seniorHighYearGraduated',
            'collegeSchool', 'collegeYearGraduated',
            'honorsAwards', 'tesdaNc2Acquired', 'eligibilityAcquired', 'specialTrainingsAttended',
            'extracurricularActivities', 'holdsPublicServicePosition', 'publicServicePosition',
            'organizationsMemberships', 'sportsSkills', 'otherTalents',
            'scholarshipsAvailed', 'hasBeenCriminallyCharged', 'hasBeenConvictedOfCrime'
        ];

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

            const { data: beforeProfile } = await supabaseClient
                .from('students')
                .select(STUDENT_LIST_COLUMNS)
                .eq('student_id', personalInfo.studentId)
                .maybeSingle();

            await syncStudentAuthEmailIfNeeded(normalizedEmail);

            const updatePayload = {
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
            await logStudentProfileUpdate({
                action: 'Student Profile Updated',
                beforeProfile,
                afterPayload: updatePayload,
                fallbackName: `${nextPersonalInfo.firstName || ''} ${nextPersonalInfo.lastName || ''}`.trim(),
                fallbackStudentId: nextPersonalInfo.studentId
            });
            await refreshStudentProfile();
            showToast("Profile updated successfully!");
        } catch (err: any) {
            showToast("Error saving profile: " + err.message, 'error');
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

        const { data: beforeProfile } = await supabaseClient
            .from('students')
            .select(STUDENT_LIST_COLUMNS)
            .eq('student_id', personalInfo.studentId)
            .maybeSingle();

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

        await logStudentProfileUpdate({
            action: 'Student Profile Updated',
            beforeProfile,
            afterPayload: { email: normalizedEmail },
            fallbackName: `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim(),
            fallbackStudentId: personalInfo.studentId
        });

        await refreshStudentProfile();
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

    // Upload profile picture to Supabase Storage & update DB
    const uploadProfilePicture = async (file: File) => {
        if (!personalInfo.studentId) return;
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${personalInfo.studentId}/avatar.${ext}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('profile-pictures')
                .upload(path, file, { upsert: true, contentType: file.type });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseClient.storage
                .from('profile-pictures')
                .getPublicUrl(path);
            const publicUrl = urlData.publicUrl;
            await invokeManagedStudentFunction({
                mode: 'update-profile-picture',
                profilePictureUrl: publicUrl
            });
            await logStudentProfileUpdate({
                action: 'Student Profile Picture Updated',
                beforeProfile: { profile_picture_url: personalInfo.profile_picture_url || null },
                afterPayload: { profile_picture_url: publicUrl },
                fallbackName: `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim(),
                fallbackStudentId: personalInfo.studentId
            });
            setPersonalInfo((prev: any) => ({ ...prev, profilePictureUrl: publicUrl, profile_picture_url: publicUrl }));
            showToast("Profile picture updated!");
        } catch (err: any) {
            showToast("Failed to upload picture: " + err.message, 'error');
        }
    };

    const formatFullDate = (date: any) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const formatTime = (date: any) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const isRegistrationEvent = (event: any) => event?.participation_mode === 'registration_required';
    const isRegistrationDeadlinePassed = (event: any) => {
        if (!event?.registration_deadline) return false;
        const deadline = new Date(event.registration_deadline);
        return !Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime();
    };
    const getStudentDisplayName = () => `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Student';
    const formatEventEmailDate = (value: any) => {
        if (!value) return 'To be announced';
        const date = new Date(String(value));
        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const formatEventEmailTime = (event: any) => {
        const startTime = String(event?.event_time || '').trim();
        const endTime = String(event?.end_time || '').trim();
        if (startTime && endTime) return `${startTime} - ${endTime}`;
        return startTime || 'To be announced';
    };

    // Fetch Attendance and Rating History
    const fetchHistory = useCallback(async () => {
        if (!personalInfo.studentId) return;

        const [
            attendanceData,
            ratingData,
            registrationResult
        ] = await Promise.all([
            getAttendanceHistory(personalInfo.studentId),
            getRatedEventIds(personalInfo.studentId),
            supabaseClient
                .from('event_registrations')
                .select('id, event_id, student_id, student_name, email, department, course, year_level, section, status, registered_at, cancelled_at, updated_at')
                .eq('student_id', personalInfo.studentId)
        ]);

        if (attendanceData) {
            const map: Record<string, any> = {};
            attendanceData.forEach((r: any) => map[r.event_id] = r);
            setAttendanceMap(map);
        }

        if (registrationResult.error) {
            if (registrationResult.error.code !== '42P01') {
                throw registrationResult.error;
            }
            setRegistrationMap({});
        } else {
            const map: Record<string, any> = {};
            (registrationResult.data || []).forEach((registration: any) => {
                map[String(registration.event_id)] = registration;
            });
            setRegistrationMap(map);
        }

        setRatedEvents(ratingData || []);
    }, [personalInfo.studentId]);
    const fetchHistoryCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('history', fetchHistory, options),
        [fetchHistory, runDatasetRefresh]
    );

    const refreshCurrentView = useCallback(async (options?: { force?: boolean }) => {
        if (profileCompletionGateActive) {
            return;
        }

        const force = Boolean(options?.force);

        switch (activeView) {
            case 'dashboard':
                await Promise.all([
                    refreshCounselingRequestsCached({ force }),
                    refreshNotificationsCached({ force }),
                    refreshEventsCached({ force }),
                    refreshActiveVisitCached({ force }),
                    refreshVisitReasonsCached({ force }),
                    fetchHistoryCached({ force })
                ]);
                break;
            case 'profile':
                await Promise.all([
                    refreshActiveVisitCached({ force }),
                    refreshVisitReasonsCached({ force })
                ]);
                break;
            case 'assessment':
                await refreshFormsCached({ force });
                break;
            case 'counseling':
                await Promise.all([
                    refreshCounselingRequestsCached({ force }),
                    refreshNotificationsCached({ force })
                ]);
                break;
            case 'support':
                await refreshSupportRequestsCached({ force });
                break;
            case 'scholarship':
                await Promise.all([
                    refreshScholarshipsCached({ force }),
                    refreshScholarshipApplicationsCached({ force })
                ]);
                break;
            case 'events':
                await Promise.all([
                    refreshEventsCached({ force }),
                    fetchHistoryCached({ force })
                ]);
                break;
            default:
                break;
        }
    }, [
        activeView,
        fetchHistoryCached,
        profileCompletionGateActive,
        refreshActiveVisitCached,
        refreshCounselingRequestsCached,
        refreshEventsCached,
        refreshFormsCached,
        refreshNotificationsCached,
        refreshScholarshipApplicationsCached,
        refreshScholarshipsCached,
        refreshSupportRequestsCached,
        refreshVisitReasonsCached
    ]);

    useEffect(() => {
        void refreshCurrentView();
    }, [refreshCurrentView]);

    const handleRefreshCurrentView = useCallback(async () => {
        setIsRefreshingView(true);
        try {
            await refreshCurrentView({ force: true });
            showToast('View refreshed.');
        } catch (error: any) {
            showToast(error?.message || 'Failed to refresh this view.', 'error');
        } finally {
            setIsRefreshingView(false);
        }
    }, [refreshCurrentView, showToast]);

    const syncEventAttendeeCount = async (eventId: any) => {
        const { count, error: countError } = await supabaseClient
            .from('event_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);

        if (countError) throw countError;

        const attendeeCount = count || 0;
        const { error: updateError } = await supabaseClient
            .from('events')
            .update({ attendees: attendeeCount })
            .eq('id', eventId);

        if (updateError) throw updateError;

        setEventsList((prev: any) => prev.map((item: any) => (
            item.id === eventId
                ? { ...item, attendees: attendeeCount }
                : item
        )));
    };

    const handleRegisterEvent = async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (!eventId || registeringEventId === eventId) return;
        if (!personalInfo.studentId) {
            showToast('Your student profile is still loading.', 'error');
            return;
        }
        if (!isRegistrationEvent(event)) {
            showToast('This event does not require registration.', 'error');
            return;
        }
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast('This event is not available for your student group.', 'error');
            return;
        }
        if (isRegistrationDeadlinePassed(event)) {
            showToast('The registration deadline for this event has passed.', 'error');
            return;
        }

        setRegisteringEventId(eventId);
        try {
            const { data, error } = await supabaseClient.rpc('register_student_for_event', {
                p_event_id: Number(event.id)
            });
            if (error) throw error;

            const registration = Array.isArray(data) ? data[0] : data;
            if (registration) {
                setRegistrationMap((prev: any) => ({
                    ...prev,
                    [String(registration.event_id)]: registration
                }));
            }

            const shouldSendConfirmationEmail = Boolean(personalInfo.email);
            if (shouldSendConfirmationEmail) {
                void sendTransactionalEmailNotification({
                    type: 'EVENT_REGISTRATION_CONFIRMATION',
                    email: personalInfo.email,
                    name: getStudentDisplayName(),
                    eventTitle: event.title,
                    eventType: event.type,
                    eventDate: formatEventEmailDate(event.event_date),
                    eventTime: formatEventEmailTime(event),
                    location: event.location || 'To be announced',
                    audience: getAudienceLabel(event)
                }, 'Failed to send event registration email.').then((emailResult) => {
                    if (!emailResult.emailSent && emailResult.emailError) {
                        console.warn('Event registration email failed:', emailResult.emailError);
                    }
                });
            }

            showToast(shouldSendConfirmationEmail
                ? 'Registration successful. Event details were sent to your email.'
                : 'Registration successful.');
            await Promise.all([
                fetchHistoryCached({ force: true }),
                refreshEventsCached({ force: true })
            ]);
        } catch (err: any) {
            showToast(err?.message || 'Failed to register for this event.', 'error');
        } finally {
            setRegisteringEventId(null);
        }
    };

    const handleCancelRegistration = async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (!eventId || cancellingRegistrationEventId === eventId) return;

        setCancellingRegistrationEventId(eventId);
        try {
            const { data, error } = await supabaseClient.rpc('cancel_student_event_registration', {
                p_event_id: Number(event.id)
            });
            if (error) throw error;

            const registration = Array.isArray(data) ? data[0] : data;
            if (registration) {
                setRegistrationMap((prev: any) => ({
                    ...prev,
                    [String(registration.event_id)]: registration
                }));
            }

            showToast('Registration cancelled.');
            await Promise.all([
                fetchHistoryCached({ force: true }),
                refreshEventsCached({ force: true })
            ]);
        } catch (err: any) {
            showToast(err?.message || 'Failed to cancel registration.', 'error');
        } finally {
            setCancellingRegistrationEventId(null);
        }
    };

    const upsertEventRegistrationAttendanceStatus = async (event: any) => {
        if (!isRegistrationEvent(event) || !personalInfo.studentId) return;

        const now = new Date().toISOString();
        const payload = {
            event_id: event.id,
            student_id: personalInfo.studentId,
            student_name: getStudentDisplayName(),
            email: personalInfo.email || null,
            department: personalInfo.department || null,
            course: personalInfo.course || null,
            year_level: personalInfo.year || personalInfo.year_level || null,
            section: personalInfo.section || null,
            status: 'Attended',
            registered_at: registrationMap[String(event.id)]?.registered_at || now,
            cancelled_at: null
        };

        const { data, error } = await supabaseClient
            .from('event_registrations')
            .upsert(payload, { onConflict: 'event_id,student_id' })
            .select('id, event_id, student_id, student_name, email, department, course, year_level, section, status, registered_at, cancelled_at, updated_at')
            .maybeSingle();

        if (error && error.code !== '42P01') {
            throw error;
        }

        if (data) {
            setRegistrationMap((prev: any) => ({
                ...prev,
                [String(data.event_id)]: data
            }));
        }
    };

    const handleTimeIn = async (event: any) => {
        if (isTimingIn) return;
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast("This event is not available for your student group.", 'error');
            return;
        }
        if (isRegistrationEvent(event) && !event.allow_walk_ins) {
            const registration = registrationMap[String(event.id)];
            const registrationStatus = String(registration?.status || '');
            if (!['Registered', 'Attended'].includes(registrationStatus)) {
                showToast("Please register for this event before timing in.", 'error');
                return;
            }
        }
        if (!proofFile) { showToast("Please upload a proof photo to Time In.", 'error'); return; }

        if (!navigator.geolocation) { showToast("Geolocation is not supported by your browser.", 'error'); return; }
        setIsTimingIn(true);

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES (Update these with real values) ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 200; // Realistic campus radius

            // Haversine Formula to calculate distance
            const R = 6371e3; // Earth radius in meters
            const φ1 = userLat * Math.PI / 180;
            const φ2 = targetLat * Math.PI / 180;
            const Δφ = (targetLat - userLat) * Math.PI / 180;
            const Δλ = (targetLng - userLng) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > MAX_DISTANCE_METERS) {
                showToast(`You are too far from campus (${Math.round(distance)}m).`, 'error');
                setIsTimingIn(false);
                return;
            }

            try {
                const { data: existingAttendance } = await supabaseClient
                    .from('event_attendance')
                    .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                    .eq('event_id', event.id)
                    .eq('student_id', personalInfo.studentId)
                    .maybeSingle();

                if (existingAttendance?.time_in) {
                    setAttendanceMap((prev: any) => ({ ...prev, [event.id]: existingAttendance }));
                    setProofFile(null);
                    showToast(existingAttendance.time_out
                        ? "Your attendance is already recorded for this event."
                        : "You have already timed in for this event.", 'error');
                    setIsTimingIn(false);
                    return;
                }

                // Upload Proof
                const fileName = `${personalInfo.studentId}_${event.id}_${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('attendance_proofs').upload(fileName, proofFile, {
                    contentType: proofFile.type,
                    upsert: false
                });
                if (uploadError) throw uploadError;

                // Record Time In
                const now = new Date().toISOString();
                const { error } = await supabaseClient.from('event_attendance').insert([{
                    event_id: event.id,
                    student_id: personalInfo.studentId,
                    student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                    time_in: now,
                    proof_url: fileName,
                    latitude: userLat,
                    longitude: userLng,
                    department: personalInfo.department
                }]);
                if (error) throw error;

                try {
                    await upsertEventRegistrationAttendanceStatus(event);
                } catch (registrationStatusError) {
                    console.warn('Failed to update event registration attendance status.', registrationStatusError);
                }

                try {
                    await syncEventAttendeeCount(event.id);
                } catch (countSyncError) {
                    console.warn('Failed to sync event attendee count after time in.', countSyncError);
                }

                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: { event_id: event.id, time_in: now, time_out: null } }));
                setProofFile(null);
                showToast("Time In Successful! Location Verified.");
            } catch (err: any) {
                if (err.code === '23505') {
                    showToast("You have already timed in for this event.", 'error');
                    // Refresh attendance to sync state
                    const { data } = await supabaseClient
                        .from('event_attendance')
                        .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                        .eq('event_id', event.id)
                        .eq('student_id', personalInfo.studentId)
                        .single();
                    if (data) setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data }));
                } else {
                    console.error("Time In Error:", err);
                    showToast("Error: " + (err.message || "Unknown error"), 'error');
                }
            } finally {
                setIsTimingIn(false);
            }
        }, (error: any) => {
            setIsTimingIn(false);
            let msg = "Location check failed.";
            if (error.code === 1) msg = "Permission denied. Please allow location access.";
            else if (error.code === 2) msg = "Position unavailable. Ensure GPS/WiFi is on.";
            else if (error.code === 3) msg = "Location request timed out.";
            showToast(msg, 'error');
        }, options);
    };

    const handleTimeOut = async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (eventId && timingOutEventId === eventId) return;
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast("This event is not available for your student group.", 'error');
            return;
        }
        if (!navigator.geolocation) { showToast("Geolocation is not supported.", 'error'); return; }
        if (eventId) {
            setTimingOutEventId(eventId);
        }

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 200; // Realistic campus radius

            // Haversine Formula
            const R = 6371e3;
            const φ1 = userLat * Math.PI / 180;
            const φ2 = targetLat * Math.PI / 180;
            const Δφ = (targetLat - userLat) * Math.PI / 180;
            const Δλ = (targetLng - userLng) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > MAX_DISTANCE_METERS) {
                showToast(`You are too far from the venue (${Math.round(distance)}m).`, 'error');
                if (eventId) setTimingOutEventId(null);
                return;
            }

            try {
                const now = new Date().toISOString();
                const { data, error } = await supabaseClient.from('event_attendance')
                    .update({ time_out: now })
                    .eq('event_id', event.id)
                    .eq('student_id', personalInfo.studentId)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    showToast("No attendance record found. Please time in first.", 'error');
                    return;
                }
                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data[0] }));
                showToast("Time Out Successful!");
                await fetchHistoryCached({ force: true });
            } catch (err: any) {
                console.error("Time Out Error:", err);
                showToast("Error: " + err.message, 'error');
            } finally {
                if (eventId) setTimingOutEventId(null);
            }
        }, (error: any) => {
            if (eventId) setTimingOutEventId(null);
            showToast("Location check failed. Please enable location services.", 'error');
        }, options);
    };

    const handleRateEvent = (event: any) => {
        setRatingForm({
            eventId: event.id, title: event.title, rating: 0, comment: '',
            q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0,
            open_best: '', open_suggestions: '', open_comments: '',
            date_of_activity: event.event_date || event.created_at || new Date().toISOString()
        });
        setShowRatingModal(true);
    };

    const submitRating = async () => {
        if (isSubmittingEventRating) return;
        const scores = [ratingForm.q1, ratingForm.q2, ratingForm.q3, ratingForm.q4, ratingForm.q5, ratingForm.q6, ratingForm.q7];
        if (scores.some(s => s === 0)) { showToast("Please rate all evaluation criteria", 'error'); return; }
        if (ratedEvents.includes(ratingForm.eventId)) { showToast("You have already rated this event.", 'error'); setShowRatingModal(false); return; }
        const commentCheck = validateTextInput(ratingForm.comment, 'notes', { multiline: true, label: 'Event comment' });
        const bestCheck = validateTextInput(ratingForm.open_best, 'notes', { multiline: true, label: 'What you liked best' });
        const suggestionsCheck = validateTextInput(ratingForm.open_suggestions, 'notes', { multiline: true, label: 'Suggestions' });
        const openCommentsCheck = validateTextInput(ratingForm.open_comments, 'notes', { multiline: true, label: 'Other comments' });
        const invalidText = [commentCheck, bestCheck, suggestionsCheck, openCommentsCheck].find((check) => !check.valid);

        if (invalidText?.error) {
            showToast(invalidText.error, 'error');
            return;
        }

        const avgRating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setIsSubmittingEventRating(true);
        try {
            const { error } = await supabaseClient.from('event_feedback').insert([{
                event_id: ratingForm.eventId,
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                rating: avgRating,
                feedback: commentCheck.value,
                submitted_at: new Date().toISOString(),
                sex: personalInfo.sex || '',
                college: `${personalInfo.department || ''} - ${personalInfo.course || ''} (${personalInfo.year || ''})`,
                date_of_activity: ratingForm.date_of_activity ? new Date(ratingForm.date_of_activity).toISOString().split('T')[0] : null,
                q1_score: ratingForm.q1,
                q2_score: ratingForm.q2,
                q3_score: ratingForm.q3,
                q4_score: ratingForm.q4,
                q5_score: ratingForm.q5,
                q6_score: ratingForm.q6,
                q7_score: ratingForm.q7,
                open_best: bestCheck.value,
                open_suggestions: suggestionsCheck.value,
                open_comments: openCommentsCheck.value
            }]);
            if (error) throw error;
            setRatedEvents([...ratedEvents, ratingForm.eventId]);
            showToast("Evaluation submitted successfully!"); setShowRatingModal(false);
        } catch (err: any) { showToast("Error: " + err.message, 'error'); }
        finally { setIsSubmittingEventRating(false); }
    };

    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', hoverBg: 'group-hover:bg-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600', hoverBg: 'group-hover:bg-green-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', hoverBg: 'group-hover:bg-purple-600' }
    };

    const openAssessmentForm = async (form: any) => {
        if (completedForms.has(form.id)) {
            showToast('You have already completed this assessment.', 'error');
            return;
        }
        setActiveForm(form);
        setShowAssessmentModal(true);
    };

    const requireCompletedProfileForService = React.useCallback((serviceLabel: string, message: string) => {
        if (!profileCompletionReminderRequired) return false;
        setProfileServiceGate({
            visible: true,
            serviceLabel,
            message
        });
        return true;
    }, [profileCompletionReminderRequired]);

    const openAssessmentFormWithProfileGate = React.useCallback(async (form: any) => {
        if (!requireStudentFeatureAccess(
            'assessment',
            'Needs Assessment is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Needs Assessment',
            'To start your needs assessment, please complete your student profile first. We need your emergency contact and remaining student information on file before you continue.'
        )) {
            return;
        }
        await openAssessmentForm(form);
    }, [openAssessmentForm, requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openCounselingFormWithProfileGate = React.useCallback(() => {
        if (!requireStudentFeatureAccess(
            'counseling',
            'Counseling is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Counseling Request',
            'To request counseling, you must complete your student profile first. Please add your emergency contact and other required profile details before using this service.'
        )) {
            return;
        }
        setShowCounselingForm(true);
    }, [requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openSupportFormWithProfileGate = React.useCallback(() => {
        if (!requireStudentFeatureAccess(
            'support',
            'Additional Support is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Additional Support Request',
            'To request additional support, you must complete your student profile first. Please finish your profile details so the CARE team has the information they need to assist you.'
        )) {
            return;
        }
        setShowSupportModal(true);
    }, [requireCompletedProfileForService, requireStudentFeatureAccess]);

    const handleApplyScholarshipWithProfileGate = React.useCallback(async (scholarship: any) => {
        if (!requireStudentFeatureAccess(
            'scholarship',
            'Scholarship access is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Scholarship Application',
            'To apply for scholarships, you must complete your student profile first. Please provide your emergency contact and remaining required profile information before applying.'
        )) {
            return;
        }
        await handleApplyScholarship(scholarship);
    }, [handleApplyScholarship, requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openRequestModal = (req: any) => {
        setSelectedRequest(req);
        setSessionFeedback({ rating: req.rating || 0, comment: req.feedback || '' });
    };

    const submitSessionFeedback = async () => {
        if (sessionFeedback.rating === 0) { showToast("Please select a rating.", 'error'); return; }
        try {
            const { error } = await supabaseClient.from('counseling_requests').update({ rating: sessionFeedback.rating, feedback: sessionFeedback.comment }).eq('id', selectedRequest.id);
            if (error) throw error;
            showToast("Feedback submitted!");
            const updatedReq = { ...selectedRequest, rating: sessionFeedback.rating, feedback: sessionFeedback.comment };
            setCounselingRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedReq : r));
            setSelectedRequest(updatedReq);
        } catch (err: any) { showToast("Error: " + err.message, 'error'); }
    };

    const handleOfficeTimeIn = async () => { setShowTimeInModal(true); };

    const submitTimeIn = async () => {
        if (isSubmittingOfficeTimeIn) return;
        if (!selectedReason) { showToast("Please select a reason.", 'error'); return; }
        setIsSubmittingOfficeTimeIn(true);
        try {
            const { data, error } = await supabaseClient.from('office_visits').insert([{ student_id: personalInfo.studentId, student_name: `${personalInfo.firstName} ${personalInfo.lastName}`, reason: selectedReason, status: 'Ongoing' }]).select().single();
            if (error) throw error;
            setActiveVisit(data);
            showToast("You have Timed In at the office.");
            setShowTimeInModal(false);
        } catch (err: any) { showToast(err.message, 'error'); }
        finally { setIsSubmittingOfficeTimeIn(false); }
    };

    const handleOfficeTimeOut = async () => {
        if (isCompletingOfficeVisit) return;
        if (!activeVisit) return;
        const visitReason = activeVisit.reason || '';
        setIsCompletingOfficeVisit(true);
        try {
            await invokeManagedStudentFunction({
                mode: 'complete-office-visit',
                officeVisitId: activeVisit.id
            });
            setActiveVisit(null);
            showToast("You have Timed Out. Thank you for visiting!");
            // Trigger feedback form with the visit reason pre-filled
            setTimeOutVisitReason(visitReason);
            setShowTimeOutFeedback(true);
        } catch (err: any) {
            showToast(err.message || 'Failed to complete your office visit.', 'error');
        } finally {
            setIsCompletingOfficeVisit(false);
        }
    };

    const sidebarLinks = React.useMemo(() => ([
        { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, group: 'Core' },
        { id: 'profile', label: 'My Profile', icon: Icons.Profile, group: 'Core' },
        { id: 'assessment', label: 'Needs Assessment', icon: Icons.Assessment, group: 'Academic' },
        { id: 'counseling', label: 'Counseling', icon: Icons.Counseling, group: 'Services' },
        { id: 'support', label: 'Additional Support', icon: Icons.Support, group: 'Services' },
        { id: 'scholarship', label: 'Scholarship', icon: Icons.Scholarship, group: 'Services' },
        { id: 'events', label: 'Events', icon: Icons.Events, group: 'Activities' },
        { id: 'feedback', label: 'Feedback', icon: Icons.Feedback, group: 'Activities' }
    ]), []);
    const visibleSidebarLinks = React.useMemo(
        () => sidebarLinks.filter((link) => isStudentViewVisible(link.id)),
        [isStudentViewVisible, sidebarLinks]
    );
    const visibleViewIds = React.useMemo(
        () => visibleSidebarLinks.map((link) => link.id),
        [visibleSidebarLinks]
    );

    useEffect(() => {
        if (permissionsLoading) {
            return;
        }

        if (!visibleViewIds.length) {
            return;
        }

        if (!visibleViewIds.includes(activeView)) {
            transitionToView(visibleViewIds[0], { suppressToast: true });
        }
    }, [activeView, permissionsLoading, transitionToView, visibleViewIds]);

    // --- LOADING STATE ---
    if (loading || permissionsLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading Student Portal...</div>;
    }

    if (permissionsError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">Unable to load student permissions</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{permissionsError}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Reload
                        </button>
                        <button
                            onClick={() => { logout(); navigate('/student/login'); }}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!visibleSidebarLinks.length) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">No student features are enabled</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Your student role currently has no enabled portal features. Please contact an administrator or CARE staff for access.
                    </p>
                    <button
                        onClick={() => { logout(); navigate('/student/login'); }}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // --- AUTHENTICATED MAIN RENDER ---
    const activeViewAccessState = getStudentViewAccessState(activeView);
    const showStudentAvailabilityView = activeView !== 'dashboard'
        && Object.prototype.hasOwnProperty.call(STUDENT_VIEW_FEATURE_MAP, activeView)
        && !(activeViewAccessState.isAllowed && activeViewAccessState.status === 'enabled');

    // --- ONBOARDING TOUR DATA ---
    const TOUR_STEPS = [
        {
            title: "Welcome to your Student Portal! 👋",
            description: "This is your central hub for all student services, assessments, and essential information. Let's take a quick look around.",
            icon: <Icons.Star filled />,
            highlightId: null
        },
        {
            title: "Needs Assessment",
            description: "Complete available needs assessment forms and submit your responses here.",
            icon: <Icons.Assessment />,
            highlightId: "nav-assessment"
        },
        {
            title: "Counseling Services",
            description: "Need someone to talk to? Request an appointment with our counseling staff easily through this tab.",
            icon: <Icons.Counseling />,
            highlightId: "nav-counseling"
        },
        {
            title: "Events & Announcements",
            description: "Stay updated with the latest workshops, seminars, and important school announcements.",
            icon: <Icons.Events />,
            highlightId: "nav-events"
        },
        {
            title: "Your Profile",
            description: "Keep your personal information up to date so we can serve you better. Click here to edit your details.",
            icon: <Icons.Profile />,
            highlightId: "nav-profile"
        },
        {
            title: "You're All Set! 🚀",
            description: "Feel free to explore the portal at your own pace. If you ever need help, the Support tab is right there.",
            icon: <Icons.CheckCircle />,
            highlightId: null
        }
    ];

    const currentTourStep = TOUR_STEPS[tourStep];
    const highlightedElement = currentTourStep?.highlightId ? document.getElementById(currentTourStep.highlightId) : null;
    const highlightRect = highlightedElement ? highlightedElement.getBoundingClientRect() : null;

    const handleTourNext = async () => {
        if (tourStep < TOUR_STEPS.length - 1) {
            setTourStep(prev => prev + 1);
        } else {
            setShowTour(false);
            setHasSeenTourState(true);
            try {
                await invokeManagedStudentFunction({
                    mode: 'mark-tour-seen'
                });
                syncStudentSession({ has_seen_tour: true });
            } catch (err) {
                console.error("Failed to save tour completion.", err);
            }
        }
    };
    const PROFILE_TOTAL_STEPS = 9;
    const PROFILE_STEP_LABELS = ['Personal', 'Family', 'Socio-Economic', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];
    const profileCompletionInputClass = '';
    const profileCompletionTextareaClass = '';
    const profileCompletionLabelClass = '';
    const profileCompletionGridTwoClass = '';
    const profileCompletionGridThreeClass = '';
    const profileCompletionRadioGroupClass = '';
    const profileCompletionCheckboxGridClass = '';
    const profileFormData = profileCompletionInitialData;
    const setProfileFormData = setProfileCompletionInitialData;
    const profileSaving = false;
    const profileStep: number = 1;
    const setProfileStep = (..._args: any[]) => undefined;
    const handleProfileFormChange = (..._args: any[]) => undefined;
    const handleProfileCheckboxGroup = (..._args: any[]) => undefined;
    const handleProfileNextStep = (..._args: any[]) => undefined;
    const handleProfileCompletion = (..._args: any[]) => undefined;

    return (
        <div className={`student-portal-shell flex h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-800 font-sans overflow-hidden relative ${profileCompletionGateActive ? 'pointer-events-none select-none' : ''}`}>

            {/* Onboarding Tour Overlay */}
            {showTour && !profileCompletionGateActive && !profileCompletionReminderVisible && createPortal(
                <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-auto">
                    {/* Dark backdrop with cutout */}
                    <div className="absolute inset-0 bg-black/60 transition-all duration-300 pointer-events-none" style={
                        highlightRect ? {
                            clipPath: `polygon(
                                0% 0%, 0% 100%, 
                                ${highlightRect.left - 8}px 100%, 
                                ${highlightRect.left - 8}px ${highlightRect.top - 8}px, 
                                ${highlightRect.right + 8}px ${highlightRect.top - 8}px, 
                                ${highlightRect.right + 8}px ${highlightRect.bottom + 8}px, 
                                ${highlightRect.left - 8}px ${highlightRect.bottom + 8}px, 
                                ${highlightRect.left - 8}px 100%, 
                                100% 100%, 100% 0%
                            )`
                        } : { clipPath: 'none' }
                    } />

                    {/* Highlights Ring */}
                    {highlightRect && (
                        <div className="absolute border-2 border-indigo-400 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 animate-pulse pointer-events-none"
                            style={{
                                top: highlightRect.top - 8,
                                left: highlightRect.left - 8,
                                width: highlightRect.width + 16,
                                height: highlightRect.height + 16
                            }}
                        />
                    )}

                    {/* Dialog Box */}
                    <div className="absolute transition-all duration-500 max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
                        style={
                            highlightRect ? (
                                isCompactPortalLayout ? {
                                    top: highlightRect.top > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) ? 'auto' : highlightRect.bottom + 16,
                                    bottom: highlightRect.top > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) ? (typeof window !== 'undefined' ? window.innerHeight - highlightRect.top + 16 : 16) : 'auto',
                                    left: '16px',
                                    width: 'calc(100vw - 32px)',
                                    transform: 'none',
                                } : {
                                    top: highlightRect.top + highlightRect.height / 2,
                                    left: highlightRect.right + 24, // Place to the right of the highlight
                                    transform: 'translateY(-50%)',
                                }
                            ) : {
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }
                        }>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <div className="text-indigo-600 [&>svg]:w-6 [&>svg]:h-6">{currentTourStep.icon}</div>
                            </div>
                            <div className="flex-1 mt-1">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{currentTourStep.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{currentTourStep.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                            <div className="flex gap-1.5">
                                {TOUR_STEPS.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === tourStep ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} />
                                ))}
                            </div>
                            <button onClick={handleTourNext} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors shadow-md shadow-indigo-500/20">
                                {tourStep === TOUR_STEPS.length - 1 ? "Let's Go!" : "Next"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {profileCompletionGateActive && (
                <Suspense fallback={null}>
                    <ProfileCompletionModal
                        isOpen={profileCompletionGateActive}
                        initialData={profileCompletionInitialData}
                        personalInfo={personalInfo}
                        showToast={showToast}
                        onCompleted={handleProfileCompletionSuccess}
                        onClose={() => setShowProfileCompletion(false)}
                    />
                </Suspense>
            )}
            {false && createPortal(
                <div className="flex min-h-full items-start justify-center sm:items-center student-mobile-modal-shell">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col student-mobile-modal-panel">
                        {/* Header */}
                        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 text-center sm:p-6">
                            <h2 className="text-xl font-black text-slate-800 sm:text-2xl">Complete Your Profile</h2>
                            <p className="mt-1 text-sm text-slate-500">Please fill in the remaining information to complete your student profile.</p>
                            <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 shadow-sm sm:hidden">
                                        {PROFILE_STEP_LABELS[profileStep - 1]}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-400 sm:hidden">
                                        Step {profileStep} of {PROFILE_TOTAL_STEPS}
                                    </div>
                                    <div className="hidden w-full justify-between px-1 text-[10px] font-bold text-slate-400 sm:flex">
                                        {PROFILE_STEP_LABELS.map((label, i) => (
                                            <span key={label} className={profileStep >= i + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300" style={{ width: `${(profileStep / PROFILE_TOTAL_STEPS) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

                            {/* STEP 1: PERSONAL INFO (NAT auto-filled + remaining) */}
                            {profileStep === 1 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-sm leading-relaxed text-slate-400">Fields from your application are pre-filled. You may edit them.</p></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Last Name *</label><input name="lastName" value={profileFormData.lastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>First Name *</label><input name="firstName" value={profileFormData.firstName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Suffix</label><input name="suffix" value={profileFormData.suffix} onChange={handleProfileFormChange} placeholder="Jr., II" className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Middle Name</label><input name="middleName" value={profileFormData.middleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="street" value={profileFormData.street} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>City</label><input name="city" value={profileFormData.city} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Province</label><input name="province" value={profileFormData.province} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Zip</label><input name="zipCode" value={profileFormData.zipCode} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact *</label><input name="mobile" value={profileFormData.mobile} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Email *</label><input name="email" value={profileFormData.email} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birthday *</label><DatePicker required name="dob" value={profileFormData.dob} onChange={(val) => { setProfileFormData((prev: any) => { const age = val ? Math.floor((Date.now() - new Date(val + 'T00:00:00').getTime()) / 31557600000) : ''; return { ...prev, dob: val, age }; }); }} placeholder="Select birth date" className="[&>button]:min-h-[3rem] [&>button]:rounded-xl [&>button]:border-slate-200 [&>button]:bg-slate-50 [&>button]:px-4 [&>button]:py-3 [&>button]:text-[16px] sm:[&>button]:py-2.5 sm:[&>button]:text-sm" /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Age</label><input name="age" value={profileFormData.age} onChange={handleProfileFormChange} className={profileCompletionInputClass} readOnly /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Sex *</label><select name="sex" value={profileFormData.sex} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Gender Identity</label><select name="genderIdentity" value={profileFormData.genderIdentity} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Civil Status</label><select name="civilStatus" value={profileFormData.civilStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated Legally">Separated Legally</option><option value="Separated Physically">Separated Physically</option><option value="With Live-In Partner">With Live-In Partner</option><option value="Divorced">Divorced</option><option value="Widow/er">Widow/er</option></select></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Nationality</label><input name="nationality" value={profileFormData.nationality} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>FB Account Link</label><input name="facebookUrl" value={profileFormData.facebookUrl} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Place of Birth</label><input name="placeOfBirth" value={profileFormData.placeOfBirth} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Religion</label><input name="religion" value={profileFormData.religion} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>School Last Attended</label><input name="schoolLastAttended" value={profileFormData.schoolLastAttended} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Level</label><select name="yearLevelApplying" value={profileFormData.yearLevelApplying} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="1st Year">I</option><option value="2nd Year">II</option><option value="3rd Year">III</option><option value="4th Year">IV</option></select></div>
                                    </div>
                                    {/* Supporter */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Person who supported your studies aside from parents</label>
                                        <div className={profileCompletionCheckboxGridClass}>{['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants'].map(opt => (<label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" value={opt} checked={(profileFormData.supporter || []).includes(opt)} onChange={e => handleProfileCheckboxGroup(e, 'supporter')} className="h-4 w-4 text-indigo-600" />{opt}</label>))}</div>
                                        <input name="supporterContact" placeholder="Supporter Contact Info" value={profileFormData.supporterContact} onChange={handleProfileFormChange} className={`${profileCompletionInputClass} mt-2`} />
                                    </div>
                                    {/* Working Student */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Are you a Working Student?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value={o} checked={profileFormData.isWorkingStudent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isWorkingStudent === 'Yes' && <select name="workingStudentType" value={profileFormData.workingStudentType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select Type</option><option value="House help">House help</option><option value="Call Center Agent/BPO employee">Call Center Agent/BPO</option><option value="Fast food/Restaurant">Fast food/Restaurant</option><option value="Online employee/Freelancer">Online/Freelancer</option><option value="Self-employed">Self-employed</option></select>}
                                    </div>
                                    {/* PWD */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Are you a Person with a Disability (PWD)?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value={o} checked={profileFormData.isPwd === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isPwd === 'Yes' && <select name="pwdType" value={profileFormData.pwdType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Visual impairment">Visual</option><option value="Hearing impairment">Hearing</option><option value="Physical/Orthopedic disability">Physical/Orthopedic</option><option value="Chronic illness">Chronic illness</option><option value="Psychosocial disability">Psychosocial</option><option value="Communication disability">Communication</option></select>}
                                    </div>
                                    {/* Indigenous */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Member of any Indigenous Group?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value={o} checked={profileFormData.isIndigenous === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isIndigenous === 'Yes' && <select name="indigenousGroup" value={profileFormData.indigenousGroup} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Bukidnon">Bukidnon</option><option value="Tabihanon Group">Tabihanon</option><option value="ATA">ATA</option><option value="IFUGAO">IFUGAO</option><option value="Kalahing Kulot">Kalahing Kulot</option><option value="Lumad">Lumad</option></select>}
                                    </div>
                                    {/* Conflict & Solo Parent */}
                                    <div className="pt-3 border-t border-slate-100 space-y-3">
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Witnessed armed conflict in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="witnessedConflict" value={o} checked={profileFormData.witnessedConflict === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Feel safe in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSafeInCommunity" value={o} checked={profileFormData.isSafeInCommunity === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Are you a Solo Parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSoloParent" value={o} checked={profileFormData.isSoloParent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Son/daughter of a solo parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isChildOfSoloParent" value={o} checked={profileFormData.isChildOfSoloParent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: FAMILY BACKGROUND */}
                            {profileStep === 2 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
                                    <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Spouse and Children</p>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Spouse</label><input name="spouseName" placeholder="N/A if not applicable" value={profileFormData.spouseName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse's Occupation</label><input name="spouseOccupation" placeholder="N/A if not applicable" value={profileFormData.spouseOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse's Contact Number</label><input name="spouseContact" placeholder="N/A if not applicable" value={profileFormData.spouseContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className={profileCompletionGridTwoClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse's Employer/Business Name</label><input name="spouseEmployerName" placeholder="N/A if not applicable" value={profileFormData.spouseEmployerName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse's Employer/Business Address</label><input name="spouseEmployerAddress" placeholder="N/A if not applicable" value={profileFormData.spouseEmployerAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className={profileCompletionGridTwoClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Number of Children</label><input name="numChildren" placeholder="N/A if not applicable" value={profileFormData.numChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Currently Pregnant?</label><select name="currentlyPregnant" value={profileFormData.currentlyPregnant} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{PREGNANCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Children - Date of Birth</label><textarea name="childrenNamesBirthdates" placeholder="N/A if not applicable" value={profileFormData.childrenNamesBirthdates} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Mother</p>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Maiden Last Name</label><input name="motherLastName" placeholder="N/A if not applicable" value={profileFormData.motherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Given Name</label><input name="motherGivenName" placeholder="N/A if not applicable" value={profileFormData.motherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Maiden Middle Name</label><input name="motherMiddleName" placeholder="N/A if not applicable" value={profileFormData.motherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Occupation</label><input name="motherOccupation" placeholder="N/A if not applicable" value={profileFormData.motherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Status</label><select name="motherStatus" value={profileFormData.motherStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{FAMILY_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Contact Number</label><input name="motherContact" placeholder="N/A if not applicable" value={profileFormData.motherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Address</label><input name="motherAddress" placeholder="N/A if not applicable" value={profileFormData.motherAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Father</p>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Last Name</label><input name="fatherLastName" placeholder="N/A if not applicable" value={profileFormData.fatherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Given Name</label><input name="fatherGivenName" placeholder="N/A if not applicable" value={profileFormData.fatherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Middle Name</label><input name="fatherMiddleName" placeholder="N/A if not applicable" value={profileFormData.fatherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Occupation</label><input name="fatherOccupation" placeholder="N/A if not applicable" value={profileFormData.fatherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Status</label><select name="fatherStatus" value={profileFormData.fatherStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{FAMILY_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Contact Number</label><input name="fatherContact" placeholder="N/A if not applicable" value={profileFormData.fatherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Address</label><input name="fatherAddress" placeholder="N/A if not applicable" value={profileFormData.fatherAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Family Order</p>
                                        <div className={profileCompletionGridTwoClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Number of Children Your Parents Have</label><input name="parentsNumChildren" placeholder="N/A if not applicable" value={profileFormData.parentsNumChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Your Birth Order in the Family</label><select name="birthOrder" value={profileFormData.birthOrder} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{BIRTH_ORDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                                        </div>
                                        {profileFormData.birthOrder === 'Other' && (
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Birth Order</label><input name="birthOrderOther" value={profileFormData.birthOrderOther} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SOCIO-ECONOMIC BACKGROUND */}
                            {profileStep === 3 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Socio-Economic Background</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Person/Agency Supporting Studies</label><input name="supporter" value={profileFormData.supporter} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Supporter Contact</label><input name="supporterContact" value={profileFormData.supporterContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Working Student</label><select name="isWorkingStudent" value={profileFormData.isWorkingStudent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Type of Work</label><select name="workingStudentType" value={profileFormData.workingStudentType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{WORK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Employer Name</label><input name="employerName" value={profileFormData.employerName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Employer Address</label><input name="employerAddress" value={profileFormData.employerAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>PWD</label><select name="isPwd" value={profileFormData.isPwd} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>PWD #</label><input name="pwdNumber" value={profileFormData.pwdNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>PWD Type</label><select name="pwdType" value={profileFormData.pwdType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{PWD_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Cause of Disability</label><input name="disabilityCause" value={profileFormData.disabilityCause} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Indigenous Member</label><select name="isIndigenous" value={profileFormData.isIndigenous} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Indigenous Group</label><select name="indigenousGroup" value={profileFormData.indigenousGroup} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{INDIGENOUS_GROUP_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>4Ps Member</label><select name="isFourPsMember" value={profileFormData.isFourPsMember} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Rebel Returnee</label><select name="isRebelReturnee" value={profileFormData.isRebelReturnee} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Child of Solo Parent</label><select name="isChildOfSoloParent" value={profileFormData.isChildOfSoloParent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Solo Parent</label><select name="isSoloParent" value={profileFormData.isSoloParent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Orphan</label><select name="isOrphan" value={profileFormData.isOrphan} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Orphan Cause</label><select name="orphanCause" value={profileFormData.orphanCause} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{ORPHAN_CAUSE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Homeless Citizen</label><select name="isHomelessCitizen" value={profileFormData.isHomelessCitizen} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Senior Citizen</label><select name="isSeniorCitizen" value={profileFormData.isSeniorCitizen} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Work Experiences</label><textarea name="workExperiences" value={profileFormData.workExperiences} onChange={handleProfileFormChange} rows={4} className={profileCompletionTextareaClass} /></div>
                                </div>
                            )}

                            {/* STEP 4: GUARDIAN */}
                            {profileStep === 4 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name</label><input name="guardianName" value={profileFormData.guardianName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="guardianAddress" value={profileFormData.guardianAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number</label><input name="guardianContact" value={profileFormData.guardianContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relation to the Guardian</label><select name="guardianRelation" value={profileFormData.guardianRelation} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{['Relative', 'Not relative', 'Landlord', 'Landlady', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: PERSON TO CONTACT */}
                            {profileStep === 5 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (In Case of Emergency)</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name *</label><input name="emergencyName" value={profileFormData.emergencyName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address *</label><input name="emergencyAddress" value={profileFormData.emergencyAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relationship *</label><input name="emergencyRelationship" value={profileFormData.emergencyRelationship} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number *</label><input name="emergencyNumber" value={profileFormData.emergencyNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 6: EDUCATIONAL BACKGROUND */}
                            {profileStep === 6 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Elementary: Name of School *</label><input name="elemSchool" value={profileFormData.elemSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="elemYearGraduated" value={profileFormData.elemYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Junior High School: Name of School *</label><input name="juniorHighSchool" value={profileFormData.juniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="juniorHighYearGraduated" value={profileFormData.juniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Senior High School: Name of School *</label><input name="seniorHighSchool" value={profileFormData.seniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="seniorHighYearGraduated" value={profileFormData.seniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>If Transferee, College: Name of School *</label><input name="collegeSchool" placeholder="N/A if not applicable" value={profileFormData.collegeSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="collegeYearGraduated" placeholder="N/A if not applicable" value={profileFormData.collegeYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Honor/Award Received. List from Elementary *</label><textarea name="honorsAwards" placeholder="N/A if not applicable" value={profileFormData.honorsAwards} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>TESDA NC II Acquired - Date Acquired - Validity *</label><textarea name="tesdaNc2Acquired" placeholder="N/A if none" value={profileFormData.tesdaNc2Acquired} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Eligibility Acquired - Date Acquired *</label><textarea name="eligibilityAcquired" placeholder="N/A if none" value={profileFormData.eligibilityAcquired} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Special Trainings Attended *</label><textarea name="specialTrainingsAttended" placeholder="N/A if none" value={profileFormData.specialTrainingsAttended} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                </div>
                            )}

                            {/* STEP 7: EXTRA-CURRICULAR */}
                            {profileStep === 7 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Voluntary Activities *</label><textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={profileFormData.extracurricularActivities} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Do You Hold a Local/National Position in Public Service? *</label><select name="holdsPublicServicePosition" value={profileFormData.holdsPublicServicePosition} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Position in Public Service *</label><input name="publicServicePosition" placeholder="N/A if not applicable" value={profileFormData.publicServicePosition} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Organizations You Are a Member Of *</label><textarea name="organizationsMemberships" value={profileFormData.organizationsMemberships} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Sports You Are Good At *</label><textarea name="sportsSkills" value={profileFormData.sportsSkills} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Other Talent/s *</label><textarea name="otherTalents" value={profileFormData.otherTalents} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                </div>
                            )}

                            {/* STEP 8: SCHOLARSHIPS */}
                            {profileStep === 8 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Scholarship Availed & Sponsor *</label><textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={profileFormData.scholarshipsAvailed} onChange={handleProfileFormChange} rows={4} className={profileCompletionTextareaClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Have You Been Criminally Charged Before Any Court? *</label><select name="hasBeenCriminallyCharged" value={profileFormData.hasBeenCriminallyCharged} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Have You Been Convicted of Any Crime? *</label><select name="hasBeenConvictedOfCrime" value={profileFormData.hasBeenConvictedOfCrime} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 9: FINISH */}
                            {profileStep === 9 && (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-slate-200"><svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                                    <h3 className="text-xl font-bold text-slate-800 sm:text-2xl">Final Step</h3>
                                    <p className="text-slate-500 text-sm">Please agree to the data privacy terms to complete your profile.</p>
                                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-left sm:p-6">
                                        <h4 className="text-sm font-bold text-indigo-900 mb-2">DATA PRIVACY ACT DISCLAIMER</h4>
                                        <p className="text-xs text-indigo-800/80 mb-5 leading-relaxed">By submitting this form, I hereby authorize Negros Oriental State University (NORSU) to collect, process, and retain my personal and sensitive information for purposes of academic administration, student services, and university records in strict accordance with the Data Privacy Act of 2012 (RA 10173).</p>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${profileFormData.agreedToPrivacy ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>{profileFormData.agreedToPrivacy && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}</div>
                                            <input type="checkbox" checked={profileFormData.agreedToPrivacy} onChange={e => setProfileFormData({ ...profileFormData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                            <span className="text-sm font-bold text-slate-800">I have read and agree to the terms</span>
                                        </label>
                                    </div>
                                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-left"><p className="text-xs text-emerald-700 italic leading-relaxed">Thank you for taking the time to complete this form. Your responses will help us serve you better. If you have any questions or need further assistance, please feel free to reach out. We appreciate your time and cooperation! Don't forget to take a screenshot of proof of submission of this form and present it to the CARE Center Staff assigned in the Stamping Area during enrollment. Thank you.</p></div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="rounded-b-[2rem] border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {profileStep > 1 ? (
                                <button type="button" onClick={() => setProfileStep(p => p - 1)} className="w-full rounded-xl px-6 py-3 font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5">Back</button>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                            {profileStep < PROFILE_TOTAL_STEPS ? (
                                <button type="button" onClick={handleProfileNextStep} className="w-full rounded-xl bg-slate-900 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5">Next Step</button>
                            ) : (
                                <button disabled={profileSaving || !profileFormData.agreedToPrivacy} onClick={handleProfileCompletion} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-8 py-3 font-bold text-white shadow-lg transition-all disabled:opacity-50 sm:w-auto sm:py-2.5">{profileSaving ? 'Saving...' : 'Complete Profile'}</button>
                            )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Floating Profile Completion Reminder */}
            {profileCompletionReminderVisible && createPortal(
                <div className="fixed bottom-4 right-4 z-[10003] w-[calc(100%-2rem)] max-w-sm pointer-events-auto sm:bottom-6 sm:right-6">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={openProfileCompletionModal}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openProfileCompletionModal();
                            }
                        }}
                        className="cursor-pointer rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-2xl shadow-amber-200/40 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-amber-200/60"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
                                <Icons.Profile />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600/80">Profile Incomplete</p>
                                        <h3 className="mt-1 text-base font-black text-slate-900">Please complete your profile</h3>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Dismiss profile reminder"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setHideProfileCompletionReminder(true);
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Some required student information is still missing. Open the profile form to finish it.
                                </p>
                                <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-700">
                                    <span>Open Complete Profile</span>
                                    <Icons.ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {profileServiceGate.visible && createPortal(
                <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-transparent p-4 pointer-events-auto student-mobile-modal-overlay">
                    <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl student-mobile-modal-panel">
                        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-amber-50 to-white px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                                    <Icons.Lock />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600/80">Profile Required</p>
                                    <h3 className="mt-1 text-xl font-black text-slate-900">Complete your profile to continue</h3>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{profileServiceGate.serviceLabel}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm leading-relaxed text-slate-600">
                                {profileServiceGate.message}
                            </p>
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                                Complete your profile once, then all locked campus services will be available on your next attempt.
                            </div>
                        </div>
                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={closeProfileServiceGate}
                                className="w-full rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5"
                            >
                                Maybe later
                            </button>
                            <button
                                type="button"
                                onClick={openProfileCompletionFromServiceGate}
                                className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5"
                            >
                                Open Complete Profile
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Forced Course/Year Confirmation Gate */}
            {!profileCompletionGateActive && courseYearGate.visible && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-transparent p-4 student-mobile-modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 student-mobile-modal-panel student-mobile-modal-scroll-panel">
                        <h3 className="text-lg font-extrabold text-slate-900">Course and Year Confirmation Required</h3>
                        <p className="text-sm text-slate-600 mt-2">
                            Please confirm your course and year level for the current enrollment cycle before continuing.
                        </p>
                        {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd) && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                <span>School Year: {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd)}</span>
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Course</label>
                                {courseYearGate.courseLocked ? (
                                    <input
                                        readOnly
                                        value={courseYearGate.course}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                    />
                                ) : (
                                    <select
                                        value={courseYearGate.course}
                                        onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, course: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                    >
                                        <option value="">Select course</option>
                                        {(courseYearGate.courseOptions || []).map((courseName: string) => (
                                            <option key={courseName} value={courseName}>{courseName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Year Level</label>
                                {courseYearGate.yearLocked ? (
                                    <input
                                        readOnly
                                        value={courseYearGate.year}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                    />
                                ) : (
                                    <select
                                        value={courseYearGate.year}
                                        onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, year: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                    >
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>

                        {courseYearGate.expired && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                The update window has ended. Contact CARE staff to reopen your confirmation window.
                            </div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700"
                            >
                                Logout
                            </button>
                            {!courseYearGate.expired && (
                                <button
                                    type="button"
                                    onClick={submitCourseYearConfirmation}
                                    disabled={isSubmittingCourseYearGate}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSubmittingCourseYearGate ? 'Saving...' : 'Confirm'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Sidebar Overlay */}
            {isSidebarOpen && <div className="student-sidebar-overlay fixed inset-0 bg-transparent z-20 animate-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`student-portal-sidebar fixed inset-y-0 left-0 z-30 w-[17rem] max-w-[calc(100vw-1rem)] bg-gradient-student-sidebar transform transition-all duration-500 ease-out sm:w-72 flex flex-col ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-blue-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-4 flex items-center justify-between border-b border-white/10 sm:p-6">
                    <NorsuBrand title="Student Portal" subtitle="NORSU-G CARE student services" accent="blue" size="sm" className="min-w-0" />
                    <button onClick={() => setIsSidebarOpen(false)} className="text-sky-300/60 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg></button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1 sm:p-4">
                    {['Core', 'Academic', 'Services', 'Activities'].map((group, gi) => (
                        <div key={group} className={gi > 0 ? 'pt-5 mt-4 border-t border-white/5' : ''}>
                            <p className="px-4 text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.15em] mb-3">{group}</p>
                            {visibleSidebarLinks.filter(link => link.group === group).map((link: any) => (
                                <button key={link.id} id={`nav-${link.id}`} onClick={() => { transitionToView(link.id); setIsEditing(false); setIsSidebarOpen(false); }} className={`nav-item nav-item-student w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeView === link.id ? 'nav-item-active text-sky-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <link.icon /> {link.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"><Icons.Logout /> Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="student-portal-main flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}
                <header className={`student-portal-header h-14 relative flex items-center justify-between px-4 z-10 sm:h-16 sm:px-6 lg:px-10 ${isCompactPortalLayout ? 'bg-white border-b border-blue-100/70' : 'glass gradient-border-blue'}`}>
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="student-portal-menu-button shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <div className="student-portal-title min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-500/70 sm:text-[10px] sm:tracking-[0.18em]">NORSU-G CARE</p>
                            <h2 className="truncate text-lg font-bold gradient-text-blue sm:text-xl">{STUDENT_VIEW_LABELS[activeView] || activeView}</h2>
                        </div>
                    </div>
                    <div className="student-portal-header-actions flex shrink-0 items-center gap-2 sm:gap-3">
                        <img src="/carecenter.png" alt="NORSU-G CARE" className="hidden h-10 w-10 rounded-full border border-blue-100 bg-white object-cover shadow-sm md:block" />
                        <button
                            type="button"
                            onClick={handleRefreshCurrentView}
                            disabled={isRefreshingView}
                            className="student-portal-header-action inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-2.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm"
                        >
                            <svg
                                className={`h-4 w-4 ${isRefreshingView ? 'animate-spin' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 1118.36 5.64" />
                            </svg>
                            <span className="hidden sm:inline">{isRefreshingView ? 'Refreshing...' : 'Refresh View'}</span>
                        </button>
                        <div className="student-portal-notification">
                            <NotificationBell notifications={notifications} accentColor="blue" />
                        </div>
                    </div>
                </header>

                <div
                    ref={mainScrollRef}
                    className={`student-portal-scroll isolate flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 ${activeView === 'profile' || isCompactPortalLayout ? '' : 'page-transition'}`}
                    style={activeView === 'profile' ? { transform: 'none' } : undefined}
                >


                    {showStudentAvailabilityView ? (
                        <FeatureAvailabilityView
                            title={STUDENT_VIEW_LABELS[activeView] || activeView}
                            permission={activeViewAccessState}
                            description="This page is not available right now. Please try again later or contact the CARE Center if you need help with this service."
                            accent="blue"
                        />
                    ) : (
                        <>
                            {/* DASHBOARD */}
                            {activeView === 'dashboard' && (
                                <Suspense fallback={null}>
                                    <StudentDashboardView
                                        personalInfo={personalInfo}
                                        activeVisit={activeVisit}
                                        handleOfficeTimeIn={handleOfficeTimeIn}
                                        handleOfficeTimeOut={handleOfficeTimeOut}
                                        notifications={notifications}
                                        colorMap={colorMap}
                                        setActiveView={transitionToView}
                                        eventsList={eventsList}
                                        attendanceMap={attendanceMap}
                                        StudentHero={StudentHero}
                                        showTimeInModal={showTimeInModal}
                                        setShowTimeInModal={setShowTimeInModal}
                                        visitReasons={visitReasons}
                                        selectedReason={selectedReason}
                                        setSelectedReason={setSelectedReason}
                                        submitTimeIn={submitTimeIn}
                                        isSubmittingOfficeTimeIn={isSubmittingOfficeTimeIn}
                                        isCompletingOfficeVisit={isCompletingOfficeVisit}
                                        showTimeOutFeedback={showTimeOutFeedback}
                                        setShowTimeOutFeedback={setShowTimeOutFeedback}
                                        timeOutVisitReason={timeOutVisitReason}
                                        showProfileCompletionBanner={profileCompletionReminderRequired}
                                        openProfileCompletionModal={openProfileCompletionModal}
                                        showToast={showToast}
                                    />
                                </Suspense>
                            )}

                            {/* EVENTS */}
                            {activeView === 'events' && (
                                <Suspense fallback={null}>
                                    <StudentEventsView
                                        eventsList={eventsList}
                                        eventFilter={eventFilter}
                                        setEventFilter={setEventFilter}
                                        attendanceMap={attendanceMap}
                                        registrationMap={registrationMap}
                                        fetchHistory={fetchHistory}
                                        handleRegisterEvent={handleRegisterEvent}
                                        handleCancelRegistration={handleCancelRegistration}
                                        handleTimeIn={handleTimeIn}
                                        handleTimeOut={handleTimeOut}
                                        handleRateEvent={handleRateEvent}
                                        ratedEvents={ratedEvents}
                                        isTimingIn={isTimingIn}
                                        timingOutEventId={timingOutEventId}
                                        registeringEventId={registeringEventId}
                                        cancellingRegistrationEventId={cancellingRegistrationEventId}
                                        isSubmittingEventRating={isSubmittingEventRating}
                                        setProofFile={setProofFile}
                                        selectedEvent={selectedEvent}
                                        setSelectedEvent={setSelectedEvent}
                                        showRatingModal={showRatingModal}
                                        setShowRatingModal={setShowRatingModal}
                                        ratingForm={ratingForm}
                                        setRatingForm={setRatingForm}
                                        submitRating={submitRating}
                                        showTimeInModal={showTimeInModal}
                                        setShowTimeInModal={setShowTimeInModal}
                                        visitReasons={visitReasons}
                                        selectedReason={selectedReason}
                                        setSelectedReason={setSelectedReason}
                                        submitTimeIn={submitTimeIn}
                                        personalInfo={personalInfo}
                                        toast={toast}
                                        Icons={Icons}
                                        showCommandHub={showCommandHub}
                                        setShowCommandHub={setShowCommandHub}
                                        setActiveView={transitionToView}
                                        setShowCounselingForm={setShowCounselingForm}
                                        setShowSupportModal={setShowSupportModal}
                                    />
                                </Suspense>
                            )}

                            {/* ASSESSMENT - COUNSELING - SUPPORT - SCHOLARSHIP - FEEDBACK - PROFILE */}
                            {renderRemainingViews({ activeView, activeForm, loadingForm, formsList, openAssessmentForm: openAssessmentFormWithProfileGate, showAssessmentModal, setShowAssessmentModal, onAssessmentSubmitted: handleAssessmentSubmitted, showSuccessModal, setShowSuccessModal, showCounselingForm, setShowCounselingForm, openCounselingForm: openCounselingFormWithProfileGate, onCounselingSubmitted: handleCounselingSubmitted, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, selectedSupportRequest, setSelectedSupportRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, openSupportForm: openSupportFormWithProfileGate, onSupportSubmitted: handleSupportSubmitted, showCounselingRequestsModal, setShowCounselingRequestsModal, showSupportRequestsModal, setShowSupportRequestsModal, personalInfo, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, isSavingProfileChanges, requestStudentSecurityOtp, confirmStudentSecurityEmailChange, confirmStudentPasswordChange, authEmail: session?.user?.email || session?.auth_email || personalInfo.email || '', attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship: handleApplyScholarshipWithProfileGate, isApplyingScholarshipId, uploadProfilePicture, setActiveView: transitionToView, feedbackPrefill, setFeedbackPrefill, showToast })}
                        </>
                    )}
                </div>

                <CustomScrollHandle scrollRef={mainScrollRef} />
                
                {/* FAB TRIGGER FOR COMMAND HUB */}
                <button
                    onClick={() => setShowCommandHub(true)}
                    className={`student-command-fab fixed bottom-4 right-4 z-40 h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/60 hover:scale-110 transition-all duration-300 flex items-center justify-center group sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 ${showCommandHub ? 'hidden' : (isCompactPortalLayout ? '' : 'animate-float')}`}
                >
                    <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {/* STUDENT COMMAND HUB */}
                {showCommandHub && (
                    <div className="fixed inset-0 bg-transparent z-50 flex items-end sm:items-center justify-center p-4 student-mobile-modal-overlay" onClick={() => setShowCommandHub(false)}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden animate-scale-in border border-white/20 student-mobile-modal-panel student-mobile-modal-scroll-panel sm:max-w-sm" onClick={(e: any) => e.stopPropagation()}>
                            <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden sm:p-6">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl ${isCompactPortalLayout ? '' : 'animate-float'}`}></div>
                                <h3 className="text-xl font-extrabold relative z-10">Student Hub</h3>
                                <p className="text-blue-200 text-xs relative z-10">Quick access to student services</p>
                                <button onClick={() => setShowCommandHub(false)} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-white/10 p-1 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
                                {isStudentViewVisible('counseling') && (
                                    <button onClick={() => {
                                        setShowCommandHub(false);
                                        const didNavigate = transitionToView('counseling');
                                        if (didNavigate && isStudentViewEnabled('counseling')) {
                                            openCounselingFormWithProfileGate();
                                        }
                                    }} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-purple-50 border border-purple-100 p-3 transition-all group hover:bg-purple-100 sm:p-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Icons.Counseling /></div>
                                        <span className="text-xs font-bold text-gray-700">Counseling</span>
                                    </button>
                                )}
                                {isStudentViewVisible('support') && (
                                    <button onClick={() => {
                                        setShowCommandHub(false);
                                        const didNavigate = transitionToView('support');
                                        if (didNavigate && isStudentViewEnabled('support')) {
                                            openSupportFormWithProfileGate();
                                        }
                                    }} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 border border-blue-100 p-3 transition-all group hover:bg-blue-100 sm:p-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Icons.Support /></div>
                                        <span className="text-xs font-bold text-gray-700">Support</span>
                                    </button>
                                )}
                                {isStudentViewVisible('feedback') && (
                                    <button onClick={() => { setShowCommandHub(false); transitionToView('feedback'); }} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-pink-50 border border-pink-100 p-3 transition-all group hover:bg-pink-100 sm:p-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform"><Icons.Feedback /></div>
                                        <span className="text-xs font-bold text-gray-700">Feedback</span>
                                    </button>
                                )}
                                {isStudentViewVisible('scholarship') && (
                                    <button onClick={() => { setShowCommandHub(false); transitionToView('scholarship'); }} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-3 transition-all group hover:bg-emerald-100 sm:p-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Icons.Scholarship /></div>
                                        <span className="text-xs font-bold text-gray-700">Scholarships</span>
                                    </button>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                {isStudentViewVisible('profile') && (
                                    <button onClick={() => { setShowCommandHub(false); transitionToView('profile'); }} className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                                        <Icons.Profile /> View My Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* GLOBAL TOAST NOTIFICATION */}
            {toast && createPortal(
                <div className={`fixed bottom-4 left-4 right-4 z-[99999] flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold animate-fade-in-up transition-all sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-6 sm:py-3.5 ${toast.type === 'error'
                    ? 'bg-red-600 text-white shadow-red-500/30'
                    : toast.type === 'info'
                        ? 'bg-blue-600 text-white shadow-blue-500/30'
                        : 'bg-emerald-600 text-white shadow-emerald-500/30'
                    }`}>
                    {toast.type === 'error' ? (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                    ) : toast.type === 'info' ? (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    ) : (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                    )}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

