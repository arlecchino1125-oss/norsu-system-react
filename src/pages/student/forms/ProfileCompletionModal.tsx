import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../../../components/ui/DatePicker';
import { supabase } from '../../../lib/supabase';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { joinNameParts } from '../../../utils/nameUtils';

type ProfileCompletionModalProps = {
    isOpen: boolean;
    initialData: any;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onCompleted: (result: { submittedProfile: any; updatedStudent: any; }) => void | Promise<void>;
};

const PROFILE_TOTAL_STEPS = 8;
const PROFILE_STEP_LABELS = ['Personal', 'Family', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];
const profileCompletionInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] leading-5 text-slate-700 outline-none placeholder:text-slate-300 sm:py-2.5 sm:text-sm';
const profileCompletionTextareaClass = `${profileCompletionInputClass} min-h-[8rem] resize-none`;
const profileCompletionLabelClass = 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500';
const profileCompletionGridTwoClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2';
const profileCompletionGridThreeClass = 'grid grid-cols-1 gap-3 sm:grid-cols-3';
const profileCompletionRadioGroupClass = 'flex flex-col gap-3 sm:flex-row sm:gap-4';
const profileCompletionCheckboxGridClass = 'grid grid-cols-1 gap-2 sm:grid-cols-2';

const normalizeStudentEmail = (value: unknown) => String(value || '').trim().toLowerCase();

export default function ProfileCompletionModal({
    isOpen,
    initialData,
    personalInfo,
    showToast,
    onCompleted
}: ProfileCompletionModalProps) {
    const [profileStep, setProfileStep] = useState(1);
    const [profileSaving, setProfileSaving] = useState(false);
    const [formData, setFormData] = useState<any>(initialData);
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
    }, [initialData, isOpen]);

    const handleProfileFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleProfileCheckboxGroup = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const value = event.target.value;
        const checked = event.target.checked;
        setFormData((prev: any) => {
            const entries = prev[field] || [];
            return {
                ...prev,
                [field]: checked ? [...entries, value] : entries.filter((entry: string) => entry !== value)
            };
        });
    };

    const handleProfileNextStep = () => {
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

            const payload: any = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName,
                suffix: formData.suffix,
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
                mobile: formData.mobile,
                email: normalizedEmail,
                facebook_url: formData.facebookUrl,
                religion: formData.religion,
                school_last_attended: formData.schoolLastAttended,
                year_level: formData.yearLevelApplying,
                supporter: (formData.supporter || []).join(', '),
                supporter_contact: formData.supporterContact,
                is_working_student: formData.isWorkingStudent === 'Yes',
                working_student_type: formData.workingStudentType,
                is_pwd: formData.isPwd === 'Yes',
                pwd_type: formData.pwdType,
                is_indigenous: formData.isIndigenous === 'Yes',
                indigenous_group: formData.indigenousGroup,
                witnessed_conflict: formData.witnessedConflict === 'Yes',
                is_safe_in_community: formData.isSafeInCommunity === 'Yes',
                is_solo_parent: formData.isSoloParent === 'Yes',
                is_child_of_solo_parent: formData.isChildOfSoloParent === 'Yes',
                mother_name: joinNameParts({
                    given: formData.motherGivenName,
                    middle: formData.motherMiddleName,
                    last: formData.motherLastName
                }) || null,
                mother_last_name: formData.motherLastName || null,
                mother_given_name: formData.motherGivenName || null,
                mother_middle_name: formData.motherMiddleName || null,
                mother_occupation: formData.motherOccupation,
                mother_contact: formData.motherContact,
                father_name: joinNameParts({
                    given: formData.fatherGivenName,
                    middle: formData.fatherMiddleName,
                    last: formData.fatherLastName
                }) || null,
                father_last_name: formData.fatherLastName || null,
                father_given_name: formData.fatherGivenName || null,
                father_middle_name: formData.fatherMiddleName || null,
                father_occupation: formData.fatherOccupation,
                father_contact: formData.fatherContact,
                parent_address: formData.parentAddress,
                num_brothers: formData.numBrothers,
                num_sisters: formData.numSisters,
                birth_order: formData.birthOrder,
                spouse_name: formData.spouseName,
                spouse_occupation: formData.spouseOccupation,
                num_children: formData.numChildren,
                guardian_name: formData.guardianName,
                guardian_address: formData.guardianAddress,
                guardian_contact: formData.guardianContact,
                guardian_relation: formData.guardianRelation,
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
                extracurricular_activities: formData.extracurricularActivities,
                scholarships_availed: formData.scholarshipsAvailed,
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
                submittedProfile: formData,
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

    return createPortal(
        <div className="fixed inset-0 z-[10002] overflow-y-auto bg-transparent p-3 sm:p-4 pointer-events-auto student-mobile-modal-overlay">
            <div className="flex min-h-full items-start justify-center sm:items-center student-mobile-modal-shell">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col student-mobile-modal-panel">
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

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {profileStep === 1 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-sm leading-relaxed text-slate-400">Fields from your application are pre-filled. You may edit them.</p></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Last Name *</label><input name="lastName" value={formData.lastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>First Name *</label><input name="firstName" value={formData.firstName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Suffix</label><input name="suffix" value={formData.suffix} onChange={handleProfileFormChange} placeholder="Jr., II" className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Middle Name</label><input name="middleName" value={formData.middleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="street" value={formData.street} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>City</label><input name="city" value={formData.city} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Province</label><input name="province" value={formData.province} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Zip</label><input name="zipCode" value={formData.zipCode} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact *</label><input name="mobile" value={formData.mobile} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Email *</label><input name="email" value={formData.email} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birthday *</label><DatePicker required name="dob" value={formData.dob} onChange={(value) => { setFormData((prev: any) => { const age = value ? Math.floor((Date.now() - new Date(`${value}T00:00:00`).getTime()) / 31557600000) : ''; return { ...prev, dob: value, age }; }); }} placeholder="Select birth date" className="[&>button]:min-h-[3rem] [&>button]:rounded-xl [&>button]:border-slate-200 [&>button]:bg-slate-50 [&>button]:px-4 [&>button]:py-3 [&>button]:text-[16px] sm:[&>button]:py-2.5 sm:[&>button]:text-sm" /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Age</label><input name="age" value={formData.age} onChange={handleProfileFormChange} className={profileCompletionInputClass} readOnly /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Sex *</label><select name="sex" value={formData.sex} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Gender Identity</label><select name="genderIdentity" value={formData.genderIdentity} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Civil Status</label><select name="civilStatus" value={formData.civilStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated Legally">Separated Legally</option><option value="Separated Physically">Separated Physically</option><option value="With Live-In Partner">With Live-In Partner</option><option value="Divorced">Divorced</option><option value="Widow/er">Widow/er</option></select></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Nationality</label><input name="nationality" value={formData.nationality} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>FB Account Link</label><input name="facebookUrl" value={formData.facebookUrl} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Place of Birth</label><input name="placeOfBirth" value={formData.placeOfBirth} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Religion</label><input name="religion" value={formData.religion} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>School Last Attended</label><input name="schoolLastAttended" value={formData.schoolLastAttended} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Level</label><select name="yearLevelApplying" value={formData.yearLevelApplying} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="1st Year">I</option><option value="2nd Year">II</option><option value="3rd Year">III</option><option value="4th Year">IV</option></select></div>
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <label className={`${profileCompletionLabelClass} block`}>Person who supported your studies aside from parents</label>
                                    <div className={profileCompletionCheckboxGridClass}>{['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants'].map((option) => (<label key={option} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" value={option} checked={(formData.supporter || []).includes(option)} onChange={(event) => handleProfileCheckboxGroup(event, 'supporter')} className="h-4 w-4 text-indigo-600" />{option}</label>))}</div>
                                    <input name="supporterContact" placeholder="Supporter Contact Info" value={formData.supporterContact} onChange={handleProfileFormChange} className={`${profileCompletionInputClass} mt-2`} />
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <label className={`${profileCompletionLabelClass} block`}>Are you a Working Student?</label>
                                    <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value={option} checked={formData.isWorkingStudent === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div>
                                    {formData.isWorkingStudent === 'Yes' && <select name="workingStudentType" value={formData.workingStudentType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select Type</option><option value="House help">House help</option><option value="Call Center Agent/BPO employee">Call Center Agent/BPO</option><option value="Fast food/Restaurant">Fast food/Restaurant</option><option value="Online employee/Freelancer">Online/Freelancer</option><option value="Self-employed">Self-employed</option></select>}
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <label className={`${profileCompletionLabelClass} block`}>Are you a Person with a Disability (PWD)?</label>
                                    <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value={option} checked={formData.isPwd === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div>
                                    {formData.isPwd === 'Yes' && <select name="pwdType" value={formData.pwdType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Visual impairment">Visual</option><option value="Hearing impairment">Hearing</option><option value="Physical/Orthopedic disability">Physical/Orthopedic</option><option value="Chronic illness">Chronic illness</option><option value="Psychosocial disability">Psychosocial</option><option value="Communication disability">Communication</option></select>}
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <label className={`${profileCompletionLabelClass} block`}>Member of any Indigenous Group?</label>
                                    <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value={option} checked={formData.isIndigenous === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div>
                                    {formData.isIndigenous === 'Yes' && <select name="indigenousGroup" value={formData.indigenousGroup} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Bukidnon">Bukidnon</option><option value="Tabihanon Group">Tabihanon</option><option value="ATA">ATA</option><option value="IFUGAO">IFUGAO</option><option value="Kalahing Kulot">Kalahing Kulot</option><option value="Lumad">Lumad</option></select>}
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-3">
                                    <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Witnessed armed conflict in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="witnessedConflict" value={option} checked={formData.witnessedConflict === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div></div>
                                    <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Feel safe in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSafeInCommunity" value={option} checked={formData.isSafeInCommunity === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div></div>
                                    <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Are you a Solo Parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSoloParent" value={option} checked={formData.isSoloParent === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div></div>
                                    <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Son/daughter of a solo parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isChildOfSoloParent" value={option} checked={formData.isChildOfSoloParent === option} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{option}</span></label>)}</div></div>
                                </div>
                            </div>
                        )}
                        {profileStep === 2 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Last Name</label><input name="motherLastName" placeholder="N/A if not applicable" value={formData.motherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Given Name</label><input name="motherGivenName" placeholder="N/A if not applicable" value={formData.motherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Middle Name</label><input name="motherMiddleName" placeholder="N/A if not applicable" value={formData.motherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Occupation</label><input name="motherOccupation" placeholder="N/A" value={formData.motherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Contact</label><input name="motherContact" placeholder="N/A" value={formData.motherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Last Name</label><input name="fatherLastName" placeholder="N/A" value={formData.fatherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Given Name</label><input name="fatherGivenName" placeholder="N/A" value={formData.fatherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Middle Name</label><input name="fatherMiddleName" placeholder="N/A" value={formData.fatherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Occupation</label><input name="fatherOccupation" placeholder="N/A" value={formData.fatherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Contact</label><input name="fatherContact" placeholder="N/A" value={formData.fatherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Parent's Address</label><input name="parentAddress" placeholder="N/A" value={formData.parentAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridThreeClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Brothers</label><input name="numBrothers" placeholder="N/A" value={formData.numBrothers} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Sisters</label><input name="numSisters" placeholder="N/A" value={formData.numSisters} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birth Order</label><select name="birthOrder" value={formData.birthOrder} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child'].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
                                </div>
                                <div className="pt-3 border-t border-slate-100"><p className="text-xs text-slate-400 mb-2 italic">If married, fill the fields below. Type N/A if not applicable.</p>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse Name</label><input name="spouseName" placeholder="N/A" value={formData.spouseName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse Occupation</label><input name="spouseOccupation" placeholder="N/A" value={formData.spouseOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Children</label><input name="numChildren" placeholder="N/A" value={formData.numChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {profileStep === 3 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name</label><input name="guardianName" value={formData.guardianName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="guardianAddress" value={formData.guardianAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact</label><input name="guardianContact" value={formData.guardianContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relation</label><select name="guardianRelation" value={formData.guardianRelation} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Relative">Relative</option><option value="Not relative">Not relative</option><option value="Landlord">Landlord</option><option value="Landlady">Landlady</option></select></div>
                                </div>
                            </div>
                        )}
                        {profileStep === 4 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (Emergency)</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name</label><input name="emergencyName" value={formData.emergencyName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="emergencyAddress" value={formData.emergencyAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relationship</label><input name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number</label><input name="emergencyNumber" value={formData.emergencyNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                            </div>
                        )}
                        {profileStep === 5 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Elementary</label><input name="elemSchool" value={formData.elemSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="elemYearGraduated" value={formData.elemYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Junior High School</label><input name="juniorHighSchool" value={formData.juniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="juniorHighYearGraduated" value={formData.juniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Senior High School</label><input name="seniorHighSchool" value={formData.seniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="seniorHighYearGraduated" value={formData.seniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className={profileCompletionGridTwoClass}>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>College</label><input name="collegeSchool" value={formData.collegeSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated / Continuing</label><input name="collegeYearGraduated" value={formData.collegeYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Honor/Award Received</label><input name="honorsAwards" placeholder="N/A if not applicable" value={formData.honorsAwards} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                            </div>
                        )}
                        {profileStep === 6 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Activities</label><textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={formData.extracurricularActivities} onChange={handleProfileFormChange} rows={5} className={profileCompletionTextareaClass} /></div>
                            </div>
                        )}
                        {profileStep === 7 && (
                            <div className="space-y-4">
                                <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
                                <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Scholarship Availed</label><textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={formData.scholarshipsAvailed} onChange={handleProfileFormChange} rows={5} className={profileCompletionTextareaClass} /></div>
                            </div>
                        )}
                        {profileStep === 8 && (
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
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100"><p className="text-xs text-emerald-700 italic leading-relaxed">"Thank you for completing your profile. Your responses help us serve you better!"</p></div>
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
