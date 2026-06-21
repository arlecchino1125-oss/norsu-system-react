import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CustomScrollHandle } from '../../../components/CustomScrollHandle';
import DatePicker from '../../../components/ui/DatePicker';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import { supabase } from '../../../lib/supabase';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { joinNameParts } from '../../../utils/nameUtils';
import { getStoredAssetPath, openStoredAsset } from '../../../utils/storageAssets';
import { TEXT_INPUT_RULES } from '../../../utils/inputSecurity';
import { driveService } from '../../../services/driveService';
import { 
    MAX_PROFILE_PHOTO_BYTES, 
    MAX_PROFILE_DOCUMENT_BYTES, 
    PROFILE_TEXT_FIELD_LIMITS, 
    cleanLiveProfileText, 
    getProfileTextFieldRule, 
    ProfileTextFieldRule 
} from '../../../utils/profileFieldRules';
import { getValidProfileImageUrl } from '../../../utils/formatters';

type ProfileCompletionModalProps = {
    isOpen: boolean;
    initialData: any;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onCompleted: (result: { submittedProfile: any; updatedStudent: any; }) => void | Promise<void>;
    onClose?: () => void;
};

const PROFILE_TOTAL_STEPS = 9;
const PROFILE_STEP_LABELS = ['Personal', 'Family', 'Socio-Economic', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];
const profileCompletionInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] leading-5 text-slate-700 outline-none placeholder:text-slate-300 sm:py-2.5 sm:text-sm';
const profileCompletionTextareaClass = `${profileCompletionInputClass} min-h-[8rem] resize-none`;
const profileCompletionLabelClass = 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500';
const profileCompletionGridTwoClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2';
const profileCompletionGridThreeClass = 'grid grid-cols-1 gap-3 sm:grid-cols-3';
const profileCompletionReadOnlyClass = `${profileCompletionInputClass} cursor-not-allowed text-slate-500`;
const REGION_OPTIONS = ['Region XVIII (NIR)', 'Region VII (Central Visayas)', 'Region VI (Western Visayas)', 'Other'];
const YEAR_LEVEL_OPTIONS = [
    { value: '1st Year', label: 'I' },
    { value: '2nd Year', label: 'II' },
    { value: '3rd Year', label: 'III' },
    { value: '4th Year', label: 'IV' },
    { value: '5th Year', label: 'V' },
    { value: '6th Year', label: 'VI' },
    { value: 'Other', label: 'Other' }
];
const FAMILY_STATUS_OPTIONS = ['Alive', 'Deceased', 'Unknown', 'Prefer not to say'];
const PREGNANCY_OPTIONS = ['Yes', 'No', 'Maybe'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const WORK_TYPE_OPTIONS = ['House help', 'Call Center Agent/BPO employee', 'Fast food/Restaurant', 'Online employee/Freelancer', 'Self-employed', 'N/A', 'Other'];
const PWD_TYPE_OPTIONS = ['0', 'Visual impairment', 'Hearing impairment', 'Physical/Orthopedic disability', 'Chronic illness', 'Psychosocial disability', 'Communication disability', 'Other'];
const INDIGENOUS_GROUP_OPTIONS = ['N/A', 'Bukidnon', 'Tabihanon Group', 'ATA', 'IFUGAO', 'Kalahing Kulot', 'Lumad', 'Other'];
const ORPHAN_CAUSE_OPTIONS = ['N/A', 'Death', 'Abandonment', 'Other'];
const GUARDIAN_RELATION_OPTIONS = ['Family', 'Relative', 'Not relative', 'Landlord', 'Landlady', 'Other'];
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
    { value: 'Other', label: 'Other' }
];

const PROFILE_DOCUMENT_UPLOADS = [
    { fileField: 'pwdDocumentFile', urlField: 'pwdDocumentUrl', slug: 'pwd', label: 'PWD ID / DSWD Certification' },
    { fileField: 'ipDocumentFile', urlField: 'ipDocumentUrl', slug: 'ip', label: 'IP ID / Chieftain Certification' },
    { fileField: 'fourPsDocumentFile', urlField: 'fourPsDocumentUrl', slug: '4ps', label: '4Ps ID' },
    { fileField: 'soloParentDocumentFile', urlField: 'soloParentDocumentUrl', slug: 'solo-parent', label: 'Solo Parent ID / DSWD Certification' },
    { fileField: 'seniorCitizenDocumentFile', urlField: 'seniorCitizenDocumentUrl', slug: 'senior-citizen', label: 'Senior Citizen ID / DSWD Certification' },
] as const;
const FALLBACK_PROGRAM_OPTIONS = [
    'Bachelor of Science in Agribusiness',
    'Bachelor of Science in Midwifery (BSM)',
    'Bachelor of Science in Agriculture - Major in Agronomy (BSA - Agronomy)',
    'Bachelor of Science in Computer Science (BSCS)',
    'Bachelor of Science in Business Administration - Major in Human Resource Management (BSBA - HRM)',
    'Bachelor of Science in Hospitality Management (BSHM)',
    'Bachelor of Science in Office Administration (BSOA)',
    'Bachelor of Science in Criminology (BSCrim)',
    'Bachelor of Industrial Technology - Major in Automotive Technology (BSIT - Automotive Technology)',
    'Bachelor of Industrial Technology - Major in Computer Technology (BSIT - Computer Technology)',
    'Bachelor of Industrial Technology - Major in Electrical Technology (BSIT - Electrical Technology)',
    'Bachelor of Industrial Technology - Major in Electronics Technology (BSIT – Electronics Technology)',
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education - Major in Mathematics (BSED - Math)',
    'Bachelor of Secondary Education - Major in English (BSED - English)',
    'Bachelor of Secondary Education - Major in Social Studies (BSED - Social Studies)',
    'Bachelor of Technology and Livelihood Education (BTLEd)'
];
const FALLBACK_COLLEGE_OPTIONS = [
    'CAFF (College of Agriculture, Forestry and Fisheries)',
    'CIT (College of Industrial Technology)',
    'CCJE (College of Criminal Justice Education)',
    'CAS (College of Arts and Sciences)',
    'CTED (College of Teacher Education)',
    'CBA (College of Business Administration)'
];

const normalizeStudentEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const calculateAgeFromDate = (value: string) => {
    if (!value) return '';
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }
    return age >= 0 ? age : '';
};
const extractDepartmentName = (departments: any) => {
    if (!departments) return '';
    if (Array.isArray(departments)) return departments[0]?.name || '';
    return departments.name || '';
};

export default function ProfileCompletionModal({
    isOpen,
    initialData,
    personalInfo,
    showToast,
    onCompleted,
    onClose
}: ProfileCompletionModalProps) {
    const [profileStep, setProfileStep] = useState(1);
    const [profileSaving, setProfileSaving] = useState(false);
    const [formData, setFormData] = useState<any>(initialData);
    const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState('');
    const [programOptions, setProgramOptions] = useState<string[]>(FALLBACK_PROGRAM_OPTIONS);
    const [collegeOptions, setCollegeOptions] = useState<string[]>(FALLBACK_COLLEGE_OPTIONS);
    const [courseDepartmentMap, setCourseDepartmentMap] = useState<Record<string, string>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            wasOpenRef.current = false;
            return;
        }

        if (wasOpenRef.current) {
            return;
        }

        wasOpenRef.current = true;
        setProfileStep(1);
        setFormData(initialData);
        setProfilePhotoPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return '';
        });
    }, [initialData, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        const loadAcademicOptions = async () => {
            const [coursesResult, departmentsResult] = await Promise.all([
                supabase.from('courses').select('name, departments(name)').order('name'),
                supabase.from('departments').select('name').order('name')
            ]);

            if (!isMounted) return;

            if (!coursesResult.error && Array.isArray(coursesResult.data) && coursesResult.data.length > 0) {
                const nextPrograms = coursesResult.data
                    .map((row: any) => String(row.name || '').trim())
                    .filter(Boolean);
                const nextCourseDepartmentMap = coursesResult.data.reduce((map: Record<string, string>, row: any) => {
                    const courseName = String(row.name || '').trim();
                    const departmentName = extractDepartmentName(row.departments);
                    if (courseName && departmentName) map[courseName] = departmentName;
                    return map;
                }, {});
                setCourseDepartmentMap(prev => ({ ...prev, ...nextCourseDepartmentMap }));
                setProgramOptions(prev => [...new Set([...prev, ...nextPrograms, initialData?.course].filter(Boolean))]);
            } else if (coursesResult.error) {
                console.warn('Unable to load course options for profile completion.', coursesResult.error);
            }

            if (!departmentsResult.error && Array.isArray(departmentsResult.data) && departmentsResult.data.length > 0) {
                setCollegeOptions(departmentsResult.data.map((row: any) => String(row.name || '').trim()).filter(Boolean));
            } else if (departmentsResult.error) {
                console.warn('Unable to load department options for profile completion.', departmentsResult.error);
            }
        };

        void loadAcademicOptions();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
        };
    }, [profilePhotoPreviewUrl]);

    const handleAutoNA = (name: string, val: string = 'N/A') => {
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleProfileFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        const isTextarea = event.target instanceof HTMLTextAreaElement;
        const fieldRule = getProfileTextFieldRule(name, isTextarea);
        const nextFieldValue = cleanLiveProfileText(value, fieldRule.multiline || isTextarea);

        if (nextFieldValue !== value) {
            showToast('Unsafe control or angle-bracket characters were removed.', 'error');
        }

        if (nextFieldValue.length > fieldRule.maxLength) {
            showToast(`${fieldRule.label} must be ${fieldRule.maxLength} characters or fewer.`, 'error');
            return;
        }

        setFormData((prev: any) => {
            const next = { ...prev, [name]: nextFieldValue };
            if (name === 'department') {
                const selectedCourseDepartment = courseDepartmentMap[prev.course] || '';
                if (!nextFieldValue || (selectedCourseDepartment && selectedCourseDepartment !== nextFieldValue)) {
                    next.course = '';
                }
            }
            if (name === 'course' && courseDepartmentMap[nextFieldValue]) {
                next.department = courseDepartmentMap[nextFieldValue];
            }
            return next;
        });
    };

    const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file for your portrait.', 'error');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_PROFILE_PHOTO_BYTES) {
            showToast('Profile portrait must be under 1 MB.', 'error');
            event.target.value = '';
            return;
        }

        setProfilePhotoPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(file);
        });
        setFormData((prev: any) => ({ ...prev, profilePictureFile: file }));
    };

    const handleProfileDocumentChange = (event: React.ChangeEvent<HTMLInputElement>, fileField: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isSupportedFile = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isSupportedFile) {
            showToast('Please upload an image or PDF file.', 'error');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_PROFILE_DOCUMENT_BYTES) {
            showToast('Profile claim documents must be under 1 MB.', 'error');
            event.target.value = '';
            return;
        }

        setFormData((prev: any) => ({ ...prev, [fileField]: file }));
    };

    const validateStepOne = () => {
        const requiredFields = [
            ['profilePicture', formData.profilePictureFile || formData.profilePictureUrl, 'Please upload a clear ID-style photo under 1 MB.'],
            ['studentId', formData.studentId || personalInfo?.studentId, "Student's I.D. No. is required."],
            ['suffix', formData.suffix, 'Extension Name is required. Enter 0 if none.'],
            ['middleName', formData.middleName, 'Middle Name is required. Enter 0 if you legally have no middle name.'],
            ['street', formData.street, 'Permanent street/sitio and barangay address is required.'],
            ['city', formData.city, 'Permanent municipality/city is required.'],
            ['province', formData.province, 'Permanent province is required.'],
            ['zipCode', formData.zipCode, 'Permanent ZIP code is required.'],
            ['region', formData.region, 'Permanent region is required.'],
            ['mobile', formData.mobile, 'Contact number is required.'],
            ['dob', formData.dob, 'Birthday is required.'],
            ['sex', formData.sex, 'Sex assigned at birth is required.'],
            ['genderIdentity', formData.genderIdentity, 'Gender is required.'],
            ['nationality', formData.nationality, 'Citizenship is required.'],
            ['facebookUrl', formData.facebookUrl, 'Facebook account link is required.'],
            ['placeOfBirth', formData.placeOfBirth, 'Place of birth is required.'],
            ['religion', formData.religion, 'Religion is required.'],
            ['yearLevelApplying', formData.yearLevelApplying, 'Year level is required.'],
            ['department', formData.department, 'College is required.'],
            ['course', formData.course, 'Program is required.'],
            ['civilStatus', formData.civilStatus, 'Civil status is required.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }

        const validColleges = new Set([...collegeOptions, ...FALLBACK_COLLEGE_OPTIONS]);
        if (!validColleges.has(formData.department)) {
            showToast('Please select a valid College from the list.', 'error');
            return false;
        }

        const validPrograms = new Set([...programOptions, ...FALLBACK_PROGRAM_OPTIONS]);
        if (!validPrograms.has(formData.course)) {
            showToast('Please select a valid Program from the list.', 'error');
            return false;
        }

        return true;
    };

    const validateStepTwo = () => {
        const requiredFields = [
            ['spouseName', formData.spouseName, 'Name of spouse is required. Type N/A if not applicable.'],
            ['spouseOccupation', formData.spouseOccupation, "Spouse's occupation is required. Type N/A if not applicable."],
            ['spouseEmployerName', formData.spouseEmployerName, "Spouse's employer/business name is required. Type N/A if not applicable."],
            ['spouseEmployerAddress', formData.spouseEmployerAddress, "Spouse's employer/business address is required. Type N/A if not applicable."],
            ['spouseContact', formData.spouseContact, "Spouse's contact number is required. Type N/A if not applicable."],
            ['numChildren', formData.numChildren, 'Number of children is required. Type N/A if not applicable.'],
            ['childrenNamesBirthdates', formData.childrenNamesBirthdates, 'Name of children and date of birth is required. Type N/A if not applicable.'],
            ['currentlyPregnant', formData.currentlyPregnant, 'Currently pregnant status is required.'],
            ['motherLastName', formData.motherLastName, "Mother's maiden last name is required. Type N/A if not applicable."],
            ['motherGivenName', formData.motherGivenName, "Mother's given name is required. Type N/A if not applicable."],
            ['motherMiddleName', formData.motherMiddleName, "Mother's maiden middle name is required. Type N/A if not applicable."],
            ['motherOccupation', formData.motherOccupation, "Mother's occupation is required. Type N/A if not applicable."],
            ['motherStatus', formData.motherStatus, "Mother's status is required."],
            ['motherContact', formData.motherContact, "Mother's contact number is required. Type N/A if not applicable."],
            ['motherAddress', formData.motherAddress, "Mother's address is required. Type N/A if not applicable."],
            ['fatherLastName', formData.fatherLastName, "Father's last name is required. Type N/A if not applicable."],
            ['fatherGivenName', formData.fatherGivenName, "Father's given name is required. Type N/A if not applicable."],
            ['fatherMiddleName', formData.fatherMiddleName, "Father's middle name is required. Type N/A if not applicable."],
            ['fatherOccupation', formData.fatherOccupation, "Father's occupation is required. Type N/A if not applicable."],
            ['fatherStatus', formData.fatherStatus, "Father's status is required."],
            ['fatherContact', formData.fatherContact, "Father's contact number is required. Type N/A if not applicable."],
            ['fatherAddress', formData.fatherAddress, "Father's address is required. Type N/A if not applicable."],
            ['parentsNumChildren', formData.parentsNumChildren, 'Number of children your parents have is required. Type N/A if not applicable.'],
            ['birthOrder', formData.birthOrder, 'Birth order is required.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        if (formData.birthOrder === 'Other' && !String(formData.birthOrderOther || '').trim()) {
            showToast('Please specify your birth order for Other.', 'error');
            return false;
        }
        return true;
    };

    const validateStepThree = () => {
        const requiredFields = [
            ['supporter', formData.supporter, 'Person/agency supporting your studies is required.'],
            ['supporterContact', formData.supporterContact, 'Supporter contact information is required.'],
            ['isWorkingStudent', formData.isWorkingStudent, 'Working student status is required.'],
            ['workingStudentType', formData.workingStudentType, 'Type of work is required. Choose N/A if not applicable.'],
            ['employerName', formData.employerName, 'Name of employer is required. Type N/A if not applicable.'],
            ['employerAddress', formData.employerAddress, 'Address of employer is required. Type N/A if not applicable.'],
            ['isPwd', formData.isPwd, 'PWD status is required.'],
            ['pwdNumber', formData.pwdNumber, 'PWD number is required. Type N/A if not applicable.'],
            ['pwdType', formData.pwdType, 'PWD type is required. Choose 0 if not applicable.'],
            ['disabilityCause', formData.disabilityCause, 'Cause of disability is required. Type N/A if not applicable.'],
            ['isIndigenous', formData.isIndigenous, 'Indigenous group status is required.'],
            ['indigenousGroup', formData.indigenousGroup, 'Indigenous group selection is required. Choose N/A if not applicable.'],
            ['isFourPsMember', formData.isFourPsMember, '4Ps membership status is required.'],
            ['isRebelReturnee', formData.isRebelReturnee, 'Rebel returnee status is required.'],
            ['isChildOfSoloParent', formData.isChildOfSoloParent, 'Son/daughter of solo parent status is required.'],
            ['isSoloParent', formData.isSoloParent, 'Solo parent status is required.'],
            ['isOrphan', formData.isOrphan, 'Orphan status is required.'],
            ['orphanCause', formData.orphanCause, 'Orphan cause is required. Choose N/A if not applicable.'],
            ['isHomelessCitizen', formData.isHomelessCitizen, 'Homeless citizen status is required.'],
            ['isSeniorCitizen', formData.isSeniorCitizen, 'Senior citizen status is required.'],
            ['workExperiences', formData.workExperiences, 'Work experiences are required. Type N/A if not applicable.'],
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }

        const requiredDocuments = [
            [formData.isPwd === 'Yes', 'pwdDocumentFile', 'pwdDocumentUrl', 'Please upload a PWD ID or DSWD certification under 1 MB.'],
            [formData.isIndigenous === 'Yes', 'ipDocumentFile', 'ipDocumentUrl', 'Please upload an IP ID or Chieftain certification under 1 MB.'],
            [formData.isFourPsMember === 'Yes', 'fourPsDocumentFile', 'fourPsDocumentUrl', 'Please upload a 4Ps ID under 1 MB.'],
            [formData.isSoloParent === 'Yes' || formData.isChildOfSoloParent === 'Yes', 'soloParentDocumentFile', 'soloParentDocumentUrl', 'Please upload a Solo Parent ID or DSWD certification under 1 MB.'],
            [formData.isSeniorCitizen === 'Yes', 'seniorCitizenDocumentFile', 'seniorCitizenDocumentUrl', 'Please upload a Senior Citizen ID or DSWD certification under 1 MB.'],
        ] as const;
        const missingDocument = requiredDocuments.find(([required, fileField, urlField]) =>
            required && !formData[fileField] && !String(formData[urlField] || '').trim()
        );
        if (missingDocument) {
            showToast(missingDocument[3], 'error');
            return false;
        }

        return true;
    };

    const validateStepFour = () => {
        const requiredFields = [
            ['guardianName', formData.guardianName, 'Guardian full name is required.'],
            ['guardianAddress', formData.guardianAddress, 'Guardian address is required.'],
            ['guardianContact', formData.guardianContact, 'Guardian contact number is required.'],
            ['guardianRelation', formData.guardianRelation, 'Relation to the guardian is required.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        return true;
    };

    const validateStepFive = () => {
        const requiredFields = [
            ['emergencyName', formData.emergencyName, 'Emergency contact full name is required.'],
            ['emergencyAddress', formData.emergencyAddress, 'Emergency contact address is required.'],
            ['emergencyRelationship', formData.emergencyRelationship, 'Emergency contact relationship is required.'],
            ['emergencyNumber', formData.emergencyNumber, 'Emergency contact number is required.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        return true;
    };

    const validateStepSix = () => {
        const requiredFields = [
            ['elemSchool', formData.elemSchool, 'Elementary school is required.'],
            ['elemYearGraduated', formData.elemYearGraduated, 'Elementary inclusive years attended is required.'],
            ['juniorHighSchool', formData.juniorHighSchool, 'Junior high school is required.'],
            ['juniorHighYearGraduated', formData.juniorHighYearGraduated, 'Junior high inclusive years attended is required.'],
            ['seniorHighSchool', formData.seniorHighSchool, 'Senior high school is required.'],
            ['seniorHighYearGraduated', formData.seniorHighYearGraduated, 'Senior high inclusive years attended is required.'],
            ['collegeSchool', formData.collegeSchool, 'Transferee college school is required. Type N/A if not applicable.'],
            ['collegeYearGraduated', formData.collegeYearGraduated, 'College inclusive years attended is required. Type N/A if not applicable.'],
            ['honorsAwards', formData.honorsAwards, 'Honors or awards are required. Type N/A if not applicable.'],
            ['tesdaNc2Acquired', formData.tesdaNc2Acquired, 'TESDA NC II acquired is required. Type N/A if none.'],
            ['eligibilityAcquired', formData.eligibilityAcquired, 'Eligibility acquired is required. Type N/A if none.'],
            ['specialTrainingsAttended', formData.specialTrainingsAttended, 'Special trainings attended are required. Type N/A if none.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        return true;
    };

    const validateStepSeven = () => {
        const requiredFields = [
            ['extracurricularActivities', formData.extracurricularActivities, 'Voluntary activities are required. Type N/A if not applicable.'],
            ['holdsPublicServicePosition', formData.holdsPublicServicePosition, 'Public service position status is required.'],
            ['publicServicePosition', formData.publicServicePosition, 'Position in public service is required. Type N/A if not applicable.'],
            ['organizationsMemberships', formData.organizationsMemberships, 'Organizations are required. Type N/A if not applicable.'],
            ['sportsSkills', formData.sportsSkills, 'Sports are required. Type N/A if not applicable.'],
            ['otherTalents', formData.otherTalents, 'Other talents are required. Type N/A if not applicable.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        return true;
    };

    const validateStepEight = () => {
        const requiredFields = [
            ['scholarshipsAvailed', formData.scholarshipsAvailed, 'Scholarship name and sponsor is required. Type N/A if not applicable.'],
            ['hasBeenCriminallyCharged', formData.hasBeenCriminallyCharged, 'Criminal charge history is required.'],
            ['hasBeenConvictedOfCrime', formData.hasBeenConvictedOfCrime, 'Crime conviction history is required.']
        ];
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            showToast(String(missing[2]), 'error');
            return false;
        }
        return true;
    };

    const uploadProfileCompletionPhoto = async () => {
        if (!formData.profilePictureFile) {
            return formData.profilePictureUrl || null;
        }

        const studentId = String(formData.studentId || personalInfo?.studentId || '').trim();
        if (!studentId) {
            throw new Error('Student ID is required before uploading your portrait.');
        }

        const file = formData.profilePictureFile as File;
        const result = await driveService.uploadFile(file, studentId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to upload profile picture to Google Drive');
        }

        return result.directLink || result.webViewLink;
    };

    const uploadProfileCompletionDocument = async (config: typeof PROFILE_DOCUMENT_UPLOADS[number]) => {
        const existingUrl = String(formData[config.urlField] || '').trim();
        const file = formData[config.fileField] as File | null;
        if (!file) {
            return existingUrl || null;
        }

        const studentId = String(formData.studentId || personalInfo?.studentId || '').trim();
        if (!studentId) {
            throw new Error('Student ID is required before uploading profile documents.');
        }

        const result = await driveService.uploadFile(file, studentId);
        
        if (!result.success) {
            throw new Error(result.error || `Failed to upload ${config.label} to Google Drive`);
        }

        return result.webViewLink;
    };

    const uploadProfileCompletionDocuments = async () => {
        const uploadedEntries = await Promise.all(
            PROFILE_DOCUMENT_UPLOADS.map(async (config) => [config.urlField, await uploadProfileCompletionDocument(config)] as const)
        );

        return Object.fromEntries(uploadedEntries);
    };

    const handleProfileNextStep = () => {
        if (profileStep === 1 && !validateStepOne()) return;
        if (profileStep === 2 && !validateStepTwo()) return;
        if (profileStep === 3 && !validateStepThree()) return;
        if (profileStep === 4 && !validateStepFour()) return;
        if (profileStep === 5 && !validateStepFive()) return;
        if (profileStep === 6 && !validateStepSix()) return;
        if (profileStep === 7 && !validateStepSeven()) return;
        if (profileStep === 8 && !validateStepEight()) return;
        setProfileStep((prev) => Math.min(prev + 1, PROFILE_TOTAL_STEPS));
    };

    const handleProfileCompletion = async () => {
        if (!formData.agreedToPrivacy) return;

        setProfileSaving(true);
        try {
            const normalizedEmail = normalizeStudentEmail(formData.email);
            if (!normalizedEmail) {
                throw new Error('Email is required.');
            }
            if (!validateStepOne()) { setProfileStep(1); setProfileSaving(false); return; }
            if (!validateStepTwo()) { setProfileStep(2); setProfileSaving(false); return; }
            if (!validateStepThree()) { setProfileStep(3); setProfileSaving(false); return; }
            if (!validateStepFour()) { setProfileStep(4); setProfileSaving(false); return; }
            if (!validateStepFive()) { setProfileStep(5); setProfileSaving(false); return; }
            if (!validateStepSix()) { setProfileStep(6); setProfileSaving(false); return; }
            if (!validateStepSeven()) { setProfileStep(7); setProfileSaving(false); return; }
            if (!validateStepEight()) { setProfileStep(8); setProfileSaving(false); return; }

            const profilePictureUrl = await uploadProfileCompletionPhoto();
            const profileDocumentUrls = await uploadProfileCompletionDocuments();

            const payload: any = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName,
                suffix: formData.suffix,
                profile_picture_url: profilePictureUrl,
                dob: formData.dob || null,
                age: formData.age || null,
                place_of_birth: formData.placeOfBirth,
                nationality: formData.nationality,
                sex: formData.sex,
                gender_identity: formData.genderIdentity,
                civil_status: formData.civilStatus,
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zip_code: formData.zipCode,
                region: formData.region,
                region_other: formData.region === 'Other' ? formData.regionOther : null,
                mobile: formData.mobile,
                email: normalizedEmail,
                facebook_url: formData.facebookUrl,
                religion: formData.religion,
                year_level: formData.yearLevelApplying,
                year_level_other: formData.yearLevelApplying === 'Other' ? formData.yearLevelOther : null,
                department: formData.department,
                course: formData.course,
                supporter: formData.supporter,
                supporter_contact: formData.supporterContact,
                is_working_student: formData.isWorkingStudent === 'Yes',
                working_student_type: formData.workingStudentType,
                working_student_type_other: formData.workingStudentType === 'Other' ? formData.workingStudentTypeOther : null,
                employer_name: formData.employerName,
                employer_address: formData.employerAddress,
                is_pwd: formData.isPwd === 'Yes',
                pwd_number: formData.pwdNumber,
                pwd_type: formData.pwdType,
                pwd_type_other: formData.pwdType === 'Other' ? formData.pwdTypeOther : null,
                disability_cause: formData.disabilityCause,
                pwd_document_url: profileDocumentUrls.pwdDocumentUrl,
                is_indigenous: formData.isIndigenous === 'Yes',
                indigenous_group: formData.indigenousGroup,
                indigenous_group_other: formData.indigenousGroup === 'Other' ? formData.indigenousGroupOther : null,
                ip_document_url: profileDocumentUrls.ipDocumentUrl,
                is_four_ps_member: formData.isFourPsMember === 'Yes',
                four_ps_document_url: profileDocumentUrls.fourPsDocumentUrl,
                is_rebel_returnee: formData.isRebelReturnee === 'Yes',
                is_solo_parent: formData.isSoloParent === 'Yes',
                is_child_of_solo_parent: formData.isChildOfSoloParent === 'Yes',
                solo_parent_document_url: profileDocumentUrls.soloParentDocumentUrl,
                is_orphan: formData.isOrphan === 'Yes',
                orphan_cause: formData.orphanCause,
                orphan_cause_other: formData.orphanCause === 'Other' ? formData.orphanCauseOther : null,
                is_homeless_citizen: formData.isHomelessCitizen === 'Yes',
                is_senior_citizen: formData.isSeniorCitizen === 'Yes',
                senior_citizen_document_url: profileDocumentUrls.seniorCitizenDocumentUrl,
                work_experiences: formData.workExperiences,
                guardian_name: formData.guardianName,
                guardian_address: formData.guardianAddress,
                guardian_contact: formData.guardianContact,
                guardian_relation: formData.guardianRelation,
                mother_name: joinNameParts({
                    given: formData.motherGivenName,
                    middle: formData.motherMiddleName,
                    last: formData.motherLastName
                }) || null,
                mother_last_name: formData.motherLastName || null,
                mother_given_name: formData.motherGivenName || null,
                mother_middle_name: formData.motherMiddleName || null,
                mother_occupation: formData.motherOccupation,
                mother_status: formData.motherStatus,
                mother_contact: formData.motherContact,
                mother_address: formData.motherAddress,
                father_name: joinNameParts({
                    given: formData.fatherGivenName,
                    middle: formData.fatherMiddleName,
                    last: formData.fatherLastName
                }) || null,
                father_last_name: formData.fatherLastName || null,
                father_given_name: formData.fatherGivenName || null,
                father_middle_name: formData.fatherMiddleName || null,
                father_occupation: formData.fatherOccupation,
                father_status: formData.fatherStatus,
                father_contact: formData.fatherContact,
                father_address: formData.fatherAddress,
                parents_num_children: formData.parentsNumChildren,
                birth_order: formData.birthOrder,
                birth_order_other: formData.birthOrder === 'Other' ? formData.birthOrderOther : null,
                spouse_name: formData.spouseName,
                spouse_occupation: formData.spouseOccupation,
                spouse_employer_name: formData.spouseEmployerName,
                spouse_employer_address: formData.spouseEmployerAddress,
                spouse_contact: formData.spouseContact,
                num_children: formData.numChildren,
                children_names_birthdates: formData.childrenNamesBirthdates,
                currently_pregnant: formData.currentlyPregnant,
                emergency_name: formData.emergencyName,
                emergency_address: formData.emergencyAddress,
                emergency_relationship: formData.emergencyRelationship,
                emergency_number: formData.emergencyNumber,
                elem_school: formData.elemSchool,
                elem_year_graduated: formData.elemYearGraduated,
                junior_high_school: formData.juniorHighSchool,
                junior_high_year_graduated: formData.juniorHighYearGraduated,
                senior_high_school: formData.seniorHighSchool,
                senior_high_year_graduated: formData.seniorHighYearGraduated,
                college_school: formData.collegeSchool,
                college_year_graduated: formData.collegeYearGraduated,
                honors_awards: formData.honorsAwards,
                tesda_nc2_acquired: formData.tesdaNc2Acquired,
                eligibility_acquired: formData.eligibilityAcquired,
                special_trainings_attended: formData.specialTrainingsAttended,
                extracurricular_activities: formData.extracurricularActivities,
                holds_public_service_position: formData.holdsPublicServicePosition === 'Yes',
                public_service_position: formData.publicServicePosition,
                organizations_memberships: formData.organizationsMemberships,
                sports_skills: formData.sportsSkills,
                other_talents: formData.otherTalents,
                scholarships_availed: formData.scholarshipsAvailed,
                has_been_criminally_charged: formData.hasBeenCriminallyCharged === 'Yes',
                criminal_charge_details: formData.hasBeenCriminallyCharged === 'Yes' ? formData.criminalChargeDetails : null,
                has_been_convicted_of_crime: formData.hasBeenConvictedOfCrime === 'Yes',
                crime_conviction_details: formData.hasBeenConvictedOfCrime === 'Yes' ? formData.crimeConvictionDetails : null,
                profile_completed: true
            };

            const result = await invokeEdgeFunction<{
                success?: boolean;
                student?: any;
                studentId?: string;
            }>('manage-student-accounts', {
                client: supabase,
                body: {
                    mode: 'update-profile-completion',
                    payload
                },
                requireAuth: true,
                non2xxMessage: 'Your student session could not be verified. Please sign in again.',
                fallbackMessage: 'Failed to update your student profile.'
            });

            let updatedStudent = result?.student || null;
            const fallbackStudentId = String(result?.studentId || personalInfo?.studentId || '').trim();

            if (!updatedStudent && fallbackStudentId) {
                const { data: fallbackStudent, error: fallbackStudentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('student_id', fallbackStudentId)
                    .maybeSingle();

                if (fallbackStudentError) {
                    console.warn('Unable to fetch fallback student profile after completion.', fallbackStudentError);
                } else {
                    updatedStudent = fallbackStudent;
                }
            }

            await onCompleted({
                submittedProfile: { ...formData, profilePictureUrl, ...profileDocumentUrls },
                updatedStudent
            });
        } catch (error: any) {
            console.error('Profile completion error:', error);
            showToast(error.message || 'Error saving profile', 'error');
        } finally {
            setProfileSaving(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    const selectedCollege = String(formData.department || '').trim();
    const visibleCollegeOptions = Array.from(new Set([...collegeOptions].map((value) => String(value || '').trim()).filter(Boolean)));
    const visibleProgramOptions = Array.from(new Set([
        ...programOptions
    ].map((value) => String(value || '').trim()).filter(Boolean)));
    const handleOpenProfileDocument = async (value: string) => {
        try {
            await openStoredAsset('support_documents', value);
        } catch (error: any) {
            showToast(error.message || 'Unable to open the uploaded file.', 'error');
        }
    };
    const renderProfileDocumentInput = (config: typeof PROFILE_DOCUMENT_UPLOADS[number]) => {
        const file = formData[config.fileField] as File | null;
        const existingUrl = String(formData[config.urlField] || '').trim();

        return (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <label className={profileCompletionLabelClass}>{config.label}</label>
                <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => handleProfileDocumentChange(event, config.fileField)}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Max 1 MB.</span>
                    {file && <span className="font-semibold text-slate-500">{file.name}</span>}
                    {!file && existingUrl && (
                        <button type="button" onClick={() => handleOpenProfileDocument(existingUrl)} className="font-bold text-indigo-600 hover:text-indigo-700">View uploaded file</button>
                    )}
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[10002] overflow-visible bg-transparent p-3 sm:p-4 pointer-events-auto student-mobile-modal-overlay">
            <div className="flex min-h-full items-start justify-center sm:items-center student-mobile-modal-shell">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col student-mobile-modal-panel relative">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 text-center sm:p-6">
                        <h2 className="text-xl font-black text-slate-800 sm:text-2xl">Complete Your Profile</h2>
                        <p className="mt-1 text-sm text-slate-500">Please fill in the remaining information to complete your student profile.</p>
                        <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 shadow-sm sm:hidden">{PROFILE_STEP_LABELS[profileStep - 1]}</div>
                                <div className="text-[11px] font-semibold text-slate-400 sm:hidden">Step {profileStep} of {PROFILE_TOTAL_STEPS}</div>
                                <div className="hidden w-full justify-between px-1 text-[10px] font-bold text-slate-400 sm:flex">
                                    {PROFILE_STEP_LABELS.map((label, index) => (
                                        <span key={label} className={profileStep >= index + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300" style={{ width: `${(profileStep / PROFILE_TOTAL_STEPS) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    <CustomScrollHandle scrollRef={scrollContainerRef} />

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 [-webkit-overflow-scrolling:touch] overscroll-contain">
                        {profileStep === 1 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-sm leading-relaxed text-slate-400">Review the pre-filled identity details and complete the required personal information.</p></div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            {profilePhotoPreviewUrl || formData.profilePictureUrl ? (
                                                <img src={getValidProfileImageUrl(profilePhotoPreviewUrl || formData.profilePictureUrl)} alt="Profile portrait preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-black text-slate-300">
                                                    {formData.firstName?.[0] || 'S'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <label className={profileCompletionLabelClass}>Photo/Portrait *</label>
                                            <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700" />
                                            <p className="text-xs text-slate-400">Upload a clear ID-style image under 1 MB.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Student ID No. *</label><input name="studentId" value={formData.studentId || personalInfo?.studentId || ''} readOnly className={profileCompletionReadOnlyClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Last Name *</label><input name="lastName" value={formData.lastName} readOnly className={profileCompletionReadOnlyClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Given Name *</label><input name="firstName" value={formData.firstName} readOnly className={profileCompletionReadOnlyClass} /></div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Extension Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('suffix', '0')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto 0</button>
                                        </div>
                                        <input name="suffix" value={formData.suffix} onChange={handleProfileFormChange} placeholder="0 if none" className={profileCompletionInputClass} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Middle Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('middleName', '0')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto 0</button>
                                        </div>
                                        <input name="middleName" value={formData.middleName} onChange={handleProfileFormChange} placeholder="0 if no middle name" className={profileCompletionInputClass} />
                                    </div>
                                </div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Permanent Address - Street/Sitio & Barangay *</label><input name="street" value={formData.street} onChange={handleProfileFormChange} placeholder="House No., Block, Lot, Street/Sitio, Barangay" className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Town/City Municipality *</label><input name="city" value={formData.city} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Province *</label><input name="province" value={formData.province} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Zip Code *</label><input name="zipCode" value={formData.zipCode} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Region *</label><select name="region" value={formData.region} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{REGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    {formData.region === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Region *</label><input name="regionOther" value={formData.regionOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number *</label><input name="mobile" value={formData.mobile} onChange={handleProfileFormChange} placeholder="09123456789" className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birthday *</label><DatePicker required name="dob" value={formData.dob} onChange={(value) => { setFormData((prev: any) => ({ ...prev, dob: value, age: calculateAgeFromDate(value) })); }} placeholder="YYYY-MM-DD" className="[&>button]:min-h-[3rem] [&>button]:rounded-xl [&>button]:border-slate-200 [&>button]:bg-slate-50 [&>button]:px-4 [&>button]:py-3 [&>button]:text-[16px] sm:[&>button]:py-2.5 sm:[&>button]:text-sm" /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Age</label><input name="age" value={formData.age} onChange={handleProfileFormChange} className={profileCompletionInputClass} readOnly /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Sex Assigned at Birth *</label><select name="sex" value={formData.sex} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Gender *</label><select name="genderIdentity" value={formData.genderIdentity} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary gender">Non-binary gender</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Citizenship *</label><input name="nationality" value={formData.nationality} onChange={handleProfileFormChange} placeholder="Filipino" className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>FB Account Link *</label><input name="facebookUrl" value={formData.facebookUrl} onChange={handleProfileFormChange} placeholder="https://www.facebook.com/yourname" className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Place of Birth *</label><input name="placeOfBirth" value={formData.placeOfBirth} onChange={handleProfileFormChange} placeholder="City/Municipality, Province" className={profileCompletionInputClass} /></div>
                                </div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Religion *</label><input name="religion" value={formData.religion} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Level *</label><select name="yearLevelApplying" value={formData.yearLevelApplying} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YEAR_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                                    {formData.yearLevelApplying === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Year Level *</label><input name="yearLevelOther" value={formData.yearLevelOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Civil Status *</label><select name="civilStatus" value={formData.civilStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Single">Single</option><option value="Cohabitation (Live-In)">Cohabitation (Live-In)</option><option value="Was Previously Married But Separated">Was Previously Married But Separated</option><option value="Married">Married</option><option value="Widow/er">Widow/er</option></select></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5">
                                        <SearchableSelect
                                            label="College"
                                            required
                                            disabled={true}
                                            onDisabledClick={() => showToast('College is automatically set based on your selected program.', 'info')}
                                            value={formData.department}
                                            onChange={(val) => handleProfileFormChange({ target: { name: 'department', value: val } } as any)}
                                            options={visibleCollegeOptions.map(opt => ({ label: opt, value: opt }))}
                                            placeholder="Auto-filled from program"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <SearchableSelect
                                            label="Program"
                                            required
                                            value={formData.course}
                                            onChange={(val) => handleProfileFormChange({ target: { name: 'course', value: val } } as any)}
                                            options={visibleProgramOptions.map(opt => ({ label: opt, value: opt }))}
                                            placeholder="What's your program/course?"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {profileStep === 2 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Spouse and Children</p>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Name of Spouse *</label>
                                            <button type="button" onClick={() => handleAutoNA('spouseName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="spouseName" placeholder="N/A if not applicable" value={formData.spouseName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Spouse's Occupation *</label>
                                            <button type="button" onClick={() => handleAutoNA('spouseOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="spouseOccupation" placeholder="N/A if not applicable" value={formData.spouseOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Spouse's Contact Number *</label>
                                            <button type="button" onClick={() => handleAutoNA('spouseContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="spouseContact" placeholder="N/A if not applicable" value={formData.spouseContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Spouse's Employer/Business Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('spouseEmployerName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="spouseEmployerName" placeholder="N/A if not applicable" value={formData.spouseEmployerName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Spouse's Employer/Business Address *</label>
                                            <button type="button" onClick={() => handleAutoNA('spouseEmployerAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="spouseEmployerAddress" placeholder="N/A if not applicable" value={formData.spouseEmployerAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Number of Children *</label>
                                            <button type="button" onClick={() => handleAutoNA('numChildren', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="numChildren" placeholder="N/A if not applicable" value={formData.numChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Currently Pregnant? *</label><select name="currentlyPregnant" value={formData.currentlyPregnant} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{PREGNANCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Name of Children - Date of Birth *</label>
                                            <button type="button" onClick={() => handleAutoNA('childrenNamesBirthdates', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="childrenNamesBirthdates" placeholder="N/A if not applicable" value={formData.childrenNamesBirthdates} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Mother</p>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Maiden Last Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherLastName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherLastName" placeholder="N/A if not applicable" value={formData.motherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Given Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherGivenName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherGivenName" placeholder="N/A if not applicable" value={formData.motherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Maiden Middle Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherMiddleName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherMiddleName" placeholder="N/A if not applicable" value={formData.motherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Occupation *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherOccupation" placeholder="N/A if not applicable" value={formData.motherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Status *</label><select name="motherStatus" value={formData.motherStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{FAMILY_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Contact Number *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherContact" placeholder="N/A if not applicable" value={formData.motherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Mother's Address *</label>
                                            <button type="button" onClick={() => handleAutoNA('motherAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="motherAddress" placeholder="N/A if not applicable" value={formData.motherAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Father</p>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Last Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherLastName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherLastName" placeholder="N/A if not applicable" value={formData.fatherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Given Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherGivenName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherGivenName" placeholder="N/A if not applicable" value={formData.fatherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Middle Name *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherMiddleName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherMiddleName" placeholder="N/A if not applicable" value={formData.fatherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Occupation *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherOccupation" placeholder="N/A if not applicable" value={formData.fatherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Status *</label><select name="fatherStatus" value={formData.fatherStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{FAMILY_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Contact Number *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherContact" placeholder="N/A if not applicable" value={formData.fatherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Father's Address *</label>
                                            <button type="button" onClick={() => handleAutoNA('fatherAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="fatherAddress" placeholder="N/A if not applicable" value={formData.fatherAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Family Order</p>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Number of Children Your Parents Have *</label>
                                            <button type="button" onClick={() => handleAutoNA('parentsNumChildren', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="parentsNumChildren" placeholder="N/A if not applicable" value={formData.parentsNumChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Your Birth Order in the Family *</label><select name="birthOrder" value={formData.birthOrder} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{BIRTH_ORDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                                    </div>
                                    {formData.birthOrder === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Birth Order *</label><input name="birthOrderOther" value={formData.birthOrderOther} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                </div>
                            </div>
                        )}
                        {profileStep === 3 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Socio-Economic Background</h3><p className="text-sm leading-relaxed text-slate-400">Valid claims require supporting documents.</p></div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Financial Support and Work</p>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Person/Agency Who Supports Your Studies Financially Other Than Yourself *</label><input name="supporter" value={formData.supporter} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Supporter Contact Information *</label><input name="supporterContact" value={formData.supporterContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Working Student? *</label><select name="isWorkingStudent" value={formData.isWorkingStudent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Type of Work *</label><select name="workingStudentType" value={formData.workingStudentType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{WORK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    {formData.workingStudentType === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Type of Work *</label><input name="workingStudentTypeOther" value={formData.workingStudentTypeOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Name of Employer *</label>
                                            <button type="button" onClick={() => handleAutoNA('employerName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="employerName" placeholder="N/A if not applicable" value={formData.employerName} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Address of Employer *</label>
                                            <button type="button" onClick={() => handleAutoNA('employerAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="employerAddress" placeholder="N/A if not applicable" value={formData.employerAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Work Experiences *</label>
                                            <button type="button" onClick={() => handleAutoNA('workExperiences', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="workExperiences" placeholder="N/A if not applicable" value={formData.workExperiences} onChange={handleProfileFormChange} rows={4} className={profileCompletionTextareaClass} />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">PWD Claim</p>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Person with a Disability (PWD)? *</label><select name="isPwd" value={formData.isPwd} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>PWD # *</label>
                                            <button type="button" onClick={() => handleAutoNA('pwdNumber', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="pwdNumber" placeholder="RR-PPMM-BB-NNNNNNN or N/A" value={formData.pwdNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Type of Disability *</label><select name="pwdType" value={formData.pwdType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{PWD_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Cause of Disability *</label>
                                            <button type="button" onClick={() => handleAutoNA('disabilityCause', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="disabilityCause" placeholder="N/A if not applicable" value={formData.disabilityCause} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    </div>
                                    {formData.pwdType === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Type of Disability *</label><input name="pwdTypeOther" value={formData.pwdTypeOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    {formData.isPwd === 'Yes' && renderProfileDocumentInput(PROFILE_DOCUMENT_UPLOADS[0])}
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Cultural Community and 4Ps</p>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Member of Indigenous Group / Cultural Community? *</label><select name="isIndigenous" value={formData.isIndigenous} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>If Yes, Choose Below *</label><select name="indigenousGroup" value={formData.indigenousGroup} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{INDIGENOUS_GROUP_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    {formData.indigenousGroup === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Indigenous Group *</label><input name="indigenousGroupOther" value={formData.indigenousGroupOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    {formData.isIndigenous === 'Yes' && renderProfileDocumentInput(PROFILE_DOCUMENT_UPLOADS[1])}
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Member of 4Ps? *</label><select name="isFourPsMember" value={formData.isFourPsMember} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    {formData.isFourPsMember === 'Yes' && renderProfileDocumentInput(PROFILE_DOCUMENT_UPLOADS[2])}
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Other Claims</p>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Rebel Returnee? *</label><select name="isRebelReturnee" value={formData.isRebelReturnee} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Son/Daughter of a Solo Parent? *</label><select name="isChildOfSoloParent" value={formData.isChildOfSoloParent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Solo Parent Yourself? *</label><select name="isSoloParent" value={formData.isSoloParent} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    {(formData.isSoloParent === 'Yes' || formData.isChildOfSoloParent === 'Yes') && renderProfileDocumentInput(PROFILE_DOCUMENT_UPLOADS[3])}
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You an Orphan? *</label><select name="isOrphan" value={formData.isOrphan} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>If Yes, Cause *</label><select name="orphanCause" value={formData.orphanCause} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{ORPHAN_CAUSE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    {formData.orphanCause === 'Other' && (
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Specify Cause of Being an Orphan *</label><input name="orphanCauseOther" value={formData.orphanCauseOther || ''} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    )}
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Homeless Citizen? *</label><select name="isHomelessCitizen" value={formData.isHomelessCitizen} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Are You a Senior Citizen? *</label><select name="isSeniorCitizen" value={formData.isSeniorCitizen} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    </div>
                                    {formData.isSeniorCitizen === 'Yes' && renderProfileDocumentInput(PROFILE_DOCUMENT_UPLOADS[4])}
                                </div>
                            </div>
                        )}
                        {profileStep === 4 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name *</label><input name="guardianName" value={formData.guardianName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address *</label><input name="guardianAddress" value={formData.guardianAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number *</label><input name="guardianContact" value={formData.guardianContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relation to the Guardian *</label><select name="guardianRelation" value={formData.guardianRelation} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{GUARDIAN_RELATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                </div>
                            </div>
                        )}
                        {profileStep === 5 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (In Case of Emergency)</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name *</label><input name="emergencyName" value={formData.emergencyName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address *</label><input name="emergencyAddress" value={formData.emergencyAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relationship *</label><select name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{GUARDIAN_RELATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number *</label><input name="emergencyNumber" value={formData.emergencyNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                            </div>
                        )}
                        {profileStep === 6 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Elementary: Name of School *</label><input name="elemSchool" value={formData.elemSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="elemYearGraduated" value={formData.elemYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Junior High School: Name of School *</label><input name="juniorHighSchool" value={formData.juniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="juniorHighYearGraduated" value={formData.juniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Senior High School: Name of School *</label><input name="seniorHighSchool" value={formData.seniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Inclusive Years Attended *</label><input name="seniorHighYearGraduated" value={formData.seniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>If Transferee, College: Name of School *</label>
                                            <button type="button" onClick={() => handleAutoNA('collegeSchool', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="collegeSchool" placeholder="N/A if not applicable" value={formData.collegeSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Inclusive Years Attended *</label>
                                            <button type="button" onClick={() => handleAutoNA('collegeYearGraduated', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="collegeYearGraduated" placeholder="N/A if not applicable" value={formData.collegeYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Honor/Award Received. List from Elementary *</label>
                                            <button type="button" onClick={() => handleAutoNA('honorsAwards', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="honorsAwards" placeholder="N/A if not applicable" value={formData.honorsAwards} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>TESDA NC II Acquired - Date Acquired - Validity *</label>
                                            <button type="button" onClick={() => handleAutoNA('tesdaNc2Acquired', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="tesdaNc2Acquired" placeholder="N/A if none" value={formData.tesdaNc2Acquired} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Eligibility Acquired - Date Acquired *</label>
                                            <button type="button" onClick={() => handleAutoNA('eligibilityAcquired', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="eligibilityAcquired" placeholder="N/A if none" value={formData.eligibilityAcquired} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Special Trainings Attended *</label>
                                            <button type="button" onClick={() => handleAutoNA('specialTrainingsAttended', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="specialTrainingsAttended" placeholder="N/A if none" value={formData.specialTrainingsAttended} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                            </div>
                        )}
                        {profileStep === 7 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Name of Voluntary Activities *</label>
                                            <button type="button" onClick={() => handleAutoNA('extracurricularActivities', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={formData.extracurricularActivities} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Do You Hold a Local/National Position in Public Service? *</label><select name="holdsPublicServicePosition" value={formData.holdsPublicServicePosition} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Position in Public Service *</label>
                                            <button type="button" onClick={() => handleAutoNA('publicServicePosition', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <input name="publicServicePosition" placeholder="N/A if not applicable" value={formData.publicServicePosition} onChange={handleProfileFormChange} className={profileCompletionInputClass} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Organizations You Are a Member Of *</label>
                                            <button type="button" onClick={() => handleAutoNA('organizationsMemberships', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="organizationsMemberships" value={formData.organizationsMemberships} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Sports You Are Good At *</label>
                                            <button type="button" onClick={() => handleAutoNA('sportsSkills', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="sportsSkills" value={formData.sportsSkills} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Other Talent/s *</label>
                                            <button type="button" onClick={() => handleAutoNA('otherTalents', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="otherTalents" value={formData.otherTalents} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} />
                                    </div>
                            </div>
                        )}
                        {profileStep === 8 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
                                <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className={profileCompletionLabelClass}>Name of Scholarship Availed & Sponsor *</label>
                                            <button type="button" onClick={() => handleAutoNA('scholarshipsAvailed', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                                        </div>
                                        <textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={formData.scholarshipsAvailed} onChange={handleProfileFormChange} rows={4} className={profileCompletionTextareaClass} />
                                    </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Have You Been Criminally Charged Before Any Court? *</label><select name="hasBeenCriminallyCharged" value={formData.hasBeenCriminallyCharged} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Have You Been Convicted of Any Crime? *</label><select name="hasBeenConvictedOfCrime" value={formData.hasBeenConvictedOfCrime} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{YES_NO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                                </div>
                                {formData.hasBeenCriminallyCharged === 'Yes' && (
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>If Yes, Indicate (Criminal Charge Details) *</label><textarea name="criminalChargeDetails" value={formData.criminalChargeDetails || ''} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                )}
                                {formData.hasBeenConvictedOfCrime === 'Yes' && (
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>If Yes, Indicate (Crime Conviction Details) *</label><textarea name="crimeConvictionDetails" value={formData.crimeConvictionDetails || ''} onChange={handleProfileFormChange} rows={3} className={profileCompletionTextareaClass} /></div>
                                )}
                            </div>
                        )}
                        {profileStep === 9 && (
                            <div className="space-y-6 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-slate-200"><svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                                <h3 className="text-xl font-bold text-slate-800 sm:text-2xl">Final Step</h3>
                                <p className="text-slate-500 text-sm">Please agree to the data privacy terms to complete your profile.</p>
                                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-left sm:p-6">
                                    <h4 className="text-sm font-bold text-indigo-900 mb-2">DATA PRIVACY ACT DISCLAIMER</h4>
                                    <p className="text-xs text-indigo-800/80 mb-5 leading-relaxed">By submitting this form, I hereby authorize Negros Oriental State University (NORSU) to collect, process, and retain my personal and sensitive information for purposes of academic administration, student services, and university records in strict accordance with the Data Privacy Act of 2012 (RA 10173).</p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.agreedToPrivacy ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>{formData.agreedToPrivacy && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}</div>
                                        <input type="checkbox" checked={formData.agreedToPrivacy} onChange={(event) => setFormData((prev: any) => ({ ...prev, agreedToPrivacy: event.target.checked }))} className="hidden" />
                                        <span className="text-sm font-bold text-slate-800">I have read and agree to the terms</span>
                                    </label>
                                </div>
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-left"><p className="text-xs text-emerald-700 italic leading-relaxed">Thank you for taking the time to complete this form. Your responses will help us serve you better. If you have any questions or need further assistance, please feel free to reach out. We appreciate your time and cooperation! Don't forget to take a screenshot of proof of submission of this form and present it to the CARE Center Staff assigned in the Stamping Area during enrollment. Thank you.</p></div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-b-[2rem] border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {profileStep > 1 ? (
                                <button type="button" onClick={() => setProfileStep((prev) => prev - 1)} className="w-full rounded-xl px-6 py-3 font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5">Back</button>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                            {profileStep < PROFILE_TOTAL_STEPS ? (
                                <button type="button" onClick={handleProfileNextStep} className="w-full rounded-xl bg-slate-900 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5">Next Step</button>
                            ) : (
                                <button disabled={profileSaving || !formData.agreedToPrivacy} onClick={handleProfileCompletion} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-8 py-3 font-bold text-white shadow-lg transition-all disabled:opacity-50 sm:w-auto sm:py-2.5">{profileSaving ? 'Saving...' : 'Complete Profile'}</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
