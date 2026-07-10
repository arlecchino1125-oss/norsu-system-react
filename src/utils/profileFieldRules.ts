import { TEXT_INPUT_RULES } from './inputSecurity';

export const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
export const MAX_PROFILE_DOCUMENT_BYTES = 1024 * 1024;

export type ProfileTextFieldRule = {
    label: string;
    maxLength: number;
    multiline?: boolean;
};

const shortProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: 80 });
const mediumProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: 160 });
const addressProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: 200 });
const phoneProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: TEXT_INPUT_RULES.phone.maxLength });
const urlProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: TEXT_INPUT_RULES.url.maxLength });
const longProfileRule = (label: string): ProfileTextFieldRule => ({ label, maxLength: 1000, multiline: true });

export const PROFILE_TEXT_FIELD_LIMITS: Record<string, ProfileTextFieldRule> = {
    suffix: { label: 'Extension Name', maxLength: 20 },
    middleName: shortProfileRule('Middle Name'),
    street: { label: 'Permanent Address - Street/Sitio & Barangay', maxLength: 160 },
    city: shortProfileRule('Permanent Address - Town/City Municipality'),
    province: shortProfileRule('Permanent Address - Province'),
    zipCode: { label: 'Permanent Address - Zip Code', maxLength: 20 },
    region: shortProfileRule('Permanent Address - Region'),
    regionOther: shortProfileRule('Specify Region'),
    mobile: phoneProfileRule('Contact Number'),
    nationality: shortProfileRule('Citizenship'),
    facebookUrl: urlProfileRule('Facebook Account Link'),
    placeOfBirth: { label: 'Place of Birth', maxLength: 120 },
    religion: shortProfileRule('Religion'),
    yearLevelApplying: { label: 'Year Level', maxLength: 32 },
    yearLevelOther: shortProfileRule('Specify Year Level'),
    department: { label: 'College', maxLength: 120 },
    course: { label: 'Program', maxLength: 120 },
    civilStatus: { label: 'Civil Status', maxLength: 80 },
    spouseName: { label: 'Name of Spouse', maxLength: 120 },
    spouseOccupation: { label: "Spouse's Occupation", maxLength: 120 },
    spouseEmployerName: mediumProfileRule("Spouse's Employer/Business Name"),
    spouseEmployerAddress: addressProfileRule("Spouse's Employer/Business Address"),
    spouseContact: phoneProfileRule("Spouse's Contact Number"),
    numChildren: { label: 'Number of Children', maxLength: 40 },
    childrenNamesBirthdates: longProfileRule('Name of Children - Date of Birth'),
    currentlyPregnant: { label: 'Currently Pregnant', maxLength: 20 },
    motherLastName: shortProfileRule("Mother's Maiden Last Name"),
    motherGivenName: shortProfileRule("Mother's Given Name"),
    motherMiddleName: shortProfileRule("Mother's Maiden Middle Name"),
    motherOccupation: { label: "Mother's Occupation", maxLength: 120 },
    motherStatus: { label: "Mother's Status", maxLength: 40 },
    motherContact: phoneProfileRule("Mother's Contact Number"),
    motherAddress: addressProfileRule("Mother's Address"),
    fatherLastName: shortProfileRule("Father's Last Name"),
    fatherGivenName: shortProfileRule("Father's Given Name"),
    fatherMiddleName: shortProfileRule("Father's Middle Name"),
    fatherOccupation: { label: "Father's Occupation", maxLength: 120 },
    fatherStatus: { label: "Father's Status", maxLength: 40 },
    fatherContact: phoneProfileRule("Father's Contact Number"),
    fatherAddress: addressProfileRule("Father's Address"),
    parentsNumChildren: { label: 'Number of Children Your Parents Have', maxLength: 40 },
    birthOrder: { label: 'Your Birth Order in the Family', maxLength: 80 },
    birthOrderOther: shortProfileRule('Specify Birth Order'),
    supporter: { label: 'Person/Agency Supporting Studies', maxLength: 120 },
    supporterContact: phoneProfileRule('Supporter Contact Information'),
    isWorkingStudent: { label: 'Working Student Status', maxLength: 20 },
    workingStudentType: { label: 'Type of Work', maxLength: 120 },
    workingStudentTypeOther: shortProfileRule('Specify Type of Work'),
    employerName: mediumProfileRule('Name of Employer'),
    employerAddress: addressProfileRule('Address of Employer'),
    workExperiences: longProfileRule('Work Experiences'),
    isPwd: { label: 'PWD Status', maxLength: 20 },
    pwdNumber: { label: 'PWD Number', maxLength: 40 },
    pwdType: { label: 'Type of Disability', maxLength: 120 },
    pwdTypeOther: shortProfileRule('Specify Type of Disability'),
    disabilityCause: mediumProfileRule('Cause of Disability'),
    isIndigenous: { label: 'Indigenous Group Status', maxLength: 20 },
    indigenousGroup: { label: 'Indigenous Group', maxLength: 120 },
    indigenousGroupOther: shortProfileRule('Specify Indigenous Group'),
    isFourPsMember: { label: '4Ps Membership', maxLength: 20 },
    isRebelReturnee: { label: 'Rebel Returnee Status', maxLength: 20 },
    isChildOfSoloParent: { label: 'Child of Solo Parent Status', maxLength: 20 },
    isSoloParent: { label: 'Solo Parent Status', maxLength: 20 },
    isOrphan: { label: 'Orphan Status', maxLength: 20 },
    orphanCause: shortProfileRule('Cause of Being an Orphan'),
    orphanCauseOther: shortProfileRule('Specify Cause of Being an Orphan'),
    isHomelessCitizen: { label: 'Homeless Citizen Status', maxLength: 20 },
    isSeniorCitizen: { label: 'Senior Citizen Status', maxLength: 20 },
    guardianName: { label: 'Guardian Full Name', maxLength: 120 },
    guardianAddress: addressProfileRule('Guardian Address'),
    guardianContact: phoneProfileRule('Guardian Contact Number'),
    guardianRelation: shortProfileRule('Relation to the Guardian'),
    emergencyName: { label: 'Emergency Contact Full Name', maxLength: 120 },
    emergencyAddress: addressProfileRule('Emergency Contact Address'),
    emergencyRelationship: shortProfileRule('Emergency Contact Relationship'),
    emergencyNumber: phoneProfileRule('Emergency Contact Number'),
    elemSchool: mediumProfileRule('Elementary School'),
    elemYearGraduated: shortProfileRule('Elementary Inclusive Years Attended'),
    juniorHighSchool: mediumProfileRule('Junior High School'),
    juniorHighYearGraduated: shortProfileRule('Junior High Inclusive Years Attended'),
    seniorHighSchool: mediumProfileRule('Senior High School'),
    seniorHighYearGraduated: shortProfileRule('Senior High Inclusive Years Attended'),
    collegeSchool: mediumProfileRule('Transferee College'),
    collegeYearGraduated: shortProfileRule('Transferee College Inclusive Years Attended'),
    honorsAwards: longProfileRule('Honor/Award Received'),
    tesdaNc2Acquired: longProfileRule('TESDA NC II Acquired - Date Acquired - Validity'),
    eligibilityAcquired: longProfileRule('Eligibility Acquired - Date Acquired'),
    specialTrainingsAttended: longProfileRule('Special Trainings Attended'),
    extracurricularActivities: longProfileRule('Name of Voluntary Activities'),
    holdsPublicServicePosition: { label: 'Public Service Position Status', maxLength: 20 },
    publicServicePosition: mediumProfileRule('Position in Public Service'),
    organizationsMemberships: longProfileRule('Organizations You Are a Member Of'),
    sportsSkills: longProfileRule('Sports You Are Good At'),
    otherTalents: longProfileRule('Other Talents'),
    scholarshipsAvailed: longProfileRule('Name of Scholarship Availed and Sponsor'),
    hasBeenCriminallyCharged: { label: 'Criminal Charge Status', maxLength: 20 },
    criminalChargeDetails: longProfileRule('If Yes, Indicate (Criminal Charge Details)'),
    hasBeenConvictedOfCrime: { label: 'Crime Conviction Status', maxLength: 20 },
    crimeConvictionDetails: longProfileRule('If Yes, Indicate (Crime Conviction Details)')
};

export const cleanLiveProfileText = (value: string, multiline = false) => {
    const normalized = value.replace(/\r\n/g, '\n');
    return normalized
        .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '')
        .replace(/[<>]/g, '');
};

const humanizeProfileFieldName = (name: string) =>
    name.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()).trim();

export const getProfileTextFieldRule = (name: string, isTextarea: boolean): ProfileTextFieldRule =>
    PROFILE_TEXT_FIELD_LIMITS[name] || {
        label: humanizeProfileFieldName(name),
        maxLength: isTextarea ? TEXT_INPUT_RULES.notes.maxLength : TEXT_INPUT_RULES.mediumText.maxLength,
        multiline: isTextarea
    };
