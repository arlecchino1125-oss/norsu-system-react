import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { joinNameParts } from '../../../../../utils/nameUtils';
import { getStoredAssetPath, openStoredAsset } from '../../../../../utils/storageAssets';
import { TEXT_INPUT_RULES } from '../../../../../utils/inputSecurity';
import { driveService } from '../../../../../services/driveService';
import { ActivitiesStep } from './steps/ActivitiesStep';
import { EducationStep } from './steps/EducationStep';
import { EmergencyContactStep } from './steps/EmergencyContactStep';
import { FamilyBackgroundStep } from './steps/FamilyBackgroundStep';
import { GuardianStep } from './steps/GuardianStep';
import { PersonalInformationStep } from './steps/PersonalInformationStep';
import { ProfileFinishStep } from './steps/ProfileFinishStep';
import { ScholarshipsStep } from './steps/ScholarshipsStep';
import { SocioEconomicStep } from './steps/SocioEconomicStep';
import {
    MAX_PROFILE_PHOTO_BYTES,
    MAX_PROFILE_DOCUMENT_BYTES,
    PROFILE_TEXT_FIELD_LIMITS,
    cleanLiveProfileText,
    getProfileTextFieldRule,
    ProfileTextFieldRule
} from '../../../../../utils/profileFieldRules';

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
        
        const studentIdKey = String(initialData?.studentId || 'new').trim();
        const draftKey = `profile_completion_draft_${studentIdKey}`;
        const stepKey = `profile_completion_step_${studentIdKey}`;
        
        let loadedData = initialData;
        try {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                loadedData = { ...initialData, ...JSON.parse(savedDraft) };
            }
        } catch (e) {
            console.warn('Failed to parse profile completion draft', e);
        }
        
        const savedStep = localStorage.getItem(stepKey);
        setProfileStep(savedStep ? Number(savedStep) : 1);
        setFormData(loadedData);
        setProfilePhotoPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return '';
        });
    }, [initialData, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const studentIdKey = String(formData?.studentId || initialData?.studentId || 'new').trim();
        const draftKey = `profile_completion_draft_${studentIdKey}`;
        
        const draftToSave = { ...formData };
        delete draftToSave.profilePictureFile;
        delete draftToSave.pwdDocumentFile;
        delete draftToSave.ipDocumentFile;
        delete draftToSave.fourPsDocumentFile;
        delete draftToSave.soloParentDocumentFile;
        delete draftToSave.seniorCitizenDocumentFile;
        
        localStorage.setItem(draftKey, JSON.stringify(draftToSave));
    }, [formData, isOpen, initialData?.studentId]);

    useEffect(() => {
        if (!isOpen) return;
        const studentIdKey = String(formData?.studentId || initialData?.studentId || 'new').trim();
        const stepKey = `profile_completion_step_${studentIdKey}`;
        localStorage.setItem(stepKey, String(profileStep));
    }, [profileStep, isOpen, initialData?.studentId]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [profileStep]);

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
            showToast('Upload an image or PDF.', 'error');
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

    const handleValidationError = (field: string, message: string) => {
        showToast(message, 'error');
        setTimeout(() => {
            let el = document.querySelector(`[name="${field}"]`) as HTMLElement;
            if (!el) el = document.getElementById(`profile-${field}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
            }
        }, 150);
    };

    const validateStepOne = () => {
        const requiredFields = [
            ['profilePicture', formData.profilePictureFile || formData.profilePictureUrl, 'Please upload a clear ID-style photo under 1 MB.'],
            ['studentId', formData.studentId || personalInfo?.studentId, "Student's I.D. No. is required."],
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
            handleValidationError(missing[0] as string, String(missing[2]));
            return false;
        }

        const validColleges = new Set([...collegeOptions, ...FALLBACK_COLLEGE_OPTIONS]);
        if (!validColleges.has(formData.department)) {
            handleValidationError('department', 'Please select a valid College from the list.');
            return false;
        }

        const validPrograms = new Set([...programOptions, ...FALLBACK_PROGRAM_OPTIONS]);
        if (!validPrograms.has(formData.course)) {
            handleValidationError('course', 'Please select a valid Program from the list.');
            return false;
        }

        return true;
    };

    const validateStepTwo = () => {
        const requiredFields: [string, any, string][] = [
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

        if (String(formData.spouseName || '').trim() && !['N/A', 'n/a', 'none'].includes(String(formData.spouseName || '').trim().toLowerCase())) {
            requiredFields.push(
                ['spouseOccupation', formData.spouseOccupation, "Spouse's occupation is required."],
                ['spouseEmployerName', formData.spouseEmployerName, "Spouse's employer/business name is required."],
                ['spouseEmployerAddress', formData.spouseEmployerAddress, "Spouse's employer/business address is required."],
                ['spouseContact', formData.spouseContact, "Spouse's contact number is required."]
            );
        }

        if (String(formData.numChildren || '').trim() && !['0', 'N/A', 'n/a', 'none'].includes(String(formData.numChildren || '').trim().toLowerCase())) {
            requiredFields.push(
                ['childrenNamesBirthdates', formData.childrenNamesBirthdates, 'Name of children and date of birth is required.']
            );
        }
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            handleValidationError(missing[0] as string, String(missing[2]));
            return false;
        }
        if (formData.birthOrder === 'Other' && !String(formData.birthOrderOther || '').trim()) {
            handleValidationError('birthOrderOther', 'Please specify your birth order for Other.');
            return false;
        }
        return true;
    };

    const validateStepThree = () => {
        const requiredFields: [string, any, string][] = [
            ['supporter', formData.supporter, 'Person/agency supporting your studies is required.'],
            ['isFourPsMember', formData.isFourPsMember, '4Ps membership status is required.'],
            ['isRebelReturnee', formData.isRebelReturnee, 'Rebel returnee status is required.'],
            ['isChildOfSoloParent', formData.isChildOfSoloParent, 'Son/daughter of solo parent status is required.'],
            ['isSoloParent', formData.isSoloParent, 'Solo parent status is required.'],
            ['isOrphan', formData.isOrphan, 'Orphan status is required.'],
            ['isHomelessCitizen', formData.isHomelessCitizen, 'Homeless citizen status is required.'],
            ['isSeniorCitizen', formData.isSeniorCitizen, 'Senior citizen status is required.']
        ];

        if (formData.isWorkingStudent === 'Yes') {
            requiredFields.push(
                ['workingStudentType', formData.workingStudentType, 'Type of work is required. Choose N/A if not applicable.'],
                ['employerName', formData.employerName, 'Name of employer is required. Type N/A if not applicable.'],
                ['employerAddress', formData.employerAddress, 'Address of employer is required. Type N/A if not applicable.']
            );
        }

        if (formData.isPwd === 'Yes') {
            requiredFields.push(
                ['pwdNumber', formData.pwdNumber, 'PWD number is required. Type N/A if not applicable.'],
                ['pwdType', formData.pwdType, 'PWD type is required. Choose 0 if not applicable.'],
                ['disabilityCause', formData.disabilityCause, 'Cause of disability is required. Type N/A if not applicable.']
            );
        }

        if (formData.isIndigenous === 'Yes') {
            requiredFields.push(
                ['indigenousGroup', formData.indigenousGroup, 'Indigenous group selection is required. Choose N/A if not applicable.']
            );
        }

        if (formData.isOrphan === 'Yes') {
            requiredFields.push(
                ['orphanCause', formData.orphanCause, 'Orphan cause is required. Choose N/A if not applicable.']
            );
        }
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            handleValidationError(missing[0] as string, String(missing[2]));
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
            handleValidationError(missingDocument[1] as string, missingDocument[3] as string);
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
            handleValidationError(missing[0] as string, String(missing[2]));
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
            handleValidationError(missing[0] as string, String(missing[2]));
            return false;
        }
        return true;
    };

    const validateStepSix = () => {
        const requiredFields: [string, any, string][] = [
            ['elemSchool', formData.elemSchool, 'Elementary school is required.'],
            ['elemYearGraduated', formData.elemYearGraduated, 'Elementary inclusive years attended is required.'],
            ['juniorHighSchool', formData.juniorHighSchool, 'Junior high school is required.'],
            ['juniorHighYearGraduated', formData.juniorHighYearGraduated, 'Junior high inclusive years attended is required.'],
            ['seniorHighSchool', formData.seniorHighSchool, 'Senior high school is required.'],
            ['seniorHighYearGraduated', formData.seniorHighYearGraduated, 'Senior high inclusive years attended is required.'],
            ['honorsAwards', formData.honorsAwards, 'Honors or awards are required. Type N/A if not applicable.']
        ];

        if (String(formData.collegeSchool || '').trim() && !['N/A', 'n/a', 'none'].includes(String(formData.collegeSchool || '').trim().toLowerCase())) {
            requiredFields.push(
                ['collegeYearGraduated', formData.collegeYearGraduated, 'College inclusive years attended is required.']
            );
        }
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            handleValidationError(missing[0] as string, String(missing[2]));
            return false;
        }
        return true;
    };

    const validateStepSeven = () => {
        const requiredFields: [string, any, string][] = [];

        if (formData.holdsPublicServicePosition === 'Yes') {
            requiredFields.push(
                ['publicServicePosition', formData.publicServicePosition, 'Position in public service is required. Type N/A if not applicable.']
            );
        }
        const missing = requiredFields.find(([, value]) => !String(value || '').trim());
        if (missing) {
            handleValidationError(missing[0] as string, String(missing[2]));
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
            handleValidationError(missing[0] as string, String(missing[2]));
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
                non2xxMessage: 'Your student session could not be verified. Sign in again.',
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

            const studentIdKey = String(formData?.studentId || initialData?.studentId || 'new').trim();
            localStorage.removeItem(`profile_completion_draft_${studentIdKey}`);
            localStorage.removeItem(`profile_completion_step_${studentIdKey}`);

            await onCompleted({
                submittedProfile: { ...formData, profilePictureUrl, ...profileDocumentUrls },
                updatedStudent
            });
        } catch (error: any) {
            console.error('Profile completion error:', error);
            showToast(error.message || "Couldn't save profile.", 'error');
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
        <div className="fixed inset-0 z-[10002] bg-slate-900/60 p-3 sm:p-4 pointer-events-auto backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col relative">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-30"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    <div className="rounded-t-[2rem] border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 text-center sm:p-6">
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

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {profileStep === 1 && (
                            <PersonalInformationStep
                                formData={formData}
                                personalInfo={personalInfo}
                                profilePhotoPreviewUrl={profilePhotoPreviewUrl}
                                visibleCollegeOptions={visibleCollegeOptions}
                                visibleProgramOptions={visibleProgramOptions}
                                regionOptions={REGION_OPTIONS}
                                yearLevelOptions={YEAR_LEVEL_OPTIONS}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                readOnlyClass={profileCompletionReadOnlyClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                gridThreeClass={profileCompletionGridThreeClass}
                                showToast={showToast}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                                onPhotoChange={handleProfilePhotoChange}
                                onDateOfBirthChange={(value) => {
                                    setFormData((prev: any) => ({ ...prev, dob: value, age: calculateAgeFromDate(value) }));
                                }}
                                onDepartmentChange={(value) => {
                                    handleProfileFormChange({ target: { name: 'department', value } } as any);
                                }}
                                onCourseChange={(value) => {
                                    handleProfileFormChange({ target: { name: 'course', value } } as any);
                                }}
                            />
                        )}
                        {profileStep === 2 && (
                            <FamilyBackgroundStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                textareaClass={profileCompletionTextareaClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                gridThreeClass={profileCompletionGridThreeClass}
                                familyStatusOptions={FAMILY_STATUS_OPTIONS}
                                pregnancyOptions={PREGNANCY_OPTIONS}
                                birthOrderOptions={BIRTH_ORDER_OPTIONS}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 3 && (
                            <SocioEconomicStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                textareaClass={profileCompletionTextareaClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                gridThreeClass={profileCompletionGridThreeClass}
                                yesNoOptions={YES_NO_OPTIONS}
                                workTypeOptions={WORK_TYPE_OPTIONS}
                                pwdTypeOptions={PWD_TYPE_OPTIONS}
                                indigenousGroupOptions={INDIGENOUS_GROUP_OPTIONS}
                                orphanCauseOptions={ORPHAN_CAUSE_OPTIONS}
                                documentUploads={PROFILE_DOCUMENT_UPLOADS}
                                renderDocumentInput={renderProfileDocumentInput}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 4 && (
                            <GuardianStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                guardianRelationOptions={GUARDIAN_RELATION_OPTIONS}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 5 && (
                            <EmergencyContactStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                guardianRelationOptions={GUARDIAN_RELATION_OPTIONS}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 6 && (
                            <EducationStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                textareaClass={profileCompletionTextareaClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 7 && (
                            <ActivitiesStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                textareaClass={profileCompletionTextareaClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                yesNoOptions={YES_NO_OPTIONS}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 8 && (
                            <ScholarshipsStep
                                formData={formData}
                                labelClass={profileCompletionLabelClass}
                                inputClass={profileCompletionInputClass}
                                textareaClass={profileCompletionTextareaClass}
                                gridTwoClass={profileCompletionGridTwoClass}
                                yesNoOptions={YES_NO_OPTIONS}
                                onAutoNA={handleAutoNA}
                                onChange={handleProfileFormChange}
                            />
                        )}
                        {profileStep === 9 && (
                            <ProfileFinishStep
                                agreedToPrivacy={Boolean(formData.agreedToPrivacy)}
                                onPrivacyAgreementChange={(agreedToPrivacy) => setFormData((prev: any) => ({ ...prev, agreedToPrivacy }))}
                            />
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
            </div>,
        document.body
    );
}
