import type React from 'react';
import { getStudentSex } from '../../../../utils/studentFields';

export const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
export const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';
export const ARCHIVE_RPC_CHECKED_CACHE_KEY = 'norsu_archive_rpc_checked_student';

export const isValidYearLevel = (value: string) => YEAR_LEVEL_OPTIONS.includes(value);
export const normalizeStudentEmail = (value: unknown) => String(value || '').trim().toLowerCase();
export const pickProfilePrefillValue = (primaryValue: unknown, fallbackValue: unknown) => {
    if (primaryValue === null || primaryValue === undefined) {
        return fallbackValue;
    }

    if (typeof primaryValue === 'string') {
        return primaryValue.trim() !== '' ? primaryValue : fallbackValue;
    }

    return primaryValue;
};
export const resolveProfileFormValue = (currentValue: unknown, ...candidateValues: unknown[]) =>
    candidateValues.reduce(
        (resolvedValue, candidateValue) => pickProfilePrefillValue(resolvedValue, candidateValue),
        currentValue
    );
export const applyPendingProfileToProfileForm = (
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
export const toYesNoChoice = (value: unknown) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'yes') return 'Yes';
        if (normalized === 'no') return 'No';
    }

    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '';
};
export const hasFilledProfileValue = (value: unknown) => {
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
export const isProfileCompletionFormComplete = (profile: Record<string, any>) => {
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
export const createInitialProfileFormData = () => ({
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
export const buildProfileCompletionFormSnapshot = ({
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
