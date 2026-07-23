import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Loader2, Pencil } from 'lucide-react';
import AccountSecuritySettings from '../../../../../components/AccountSecuritySettings';
import { openStoredAsset } from '../../../../../utils/storageAssets';
import { cleanLiveProfileText, getProfileTextFieldRule } from '../../../../../utils/profileFieldRules';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';
import { fetchDepartmentNameForCourse } from '../../../../../utils/courseDepartment';
import { supabase } from '../../../../../lib/supabase';
import { getProfileDocumentCategory, uploadProfileDocument } from '../profileDocumentStorage';

const INPUT_CLASS = 'w-full appearance-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-5 text-slate-700 shadow-sm outline-none transition-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm';

const FALLBACK_PROGRAM_OPTIONS = [
    'Bachelor of Science in Agriculture Major in Agronomy',
    'Bachelor of Science in Computer Science',
    'Bachelor of Science in Midwifery',
    'Bachelor of Science in AgriBusiness',
    'Bachelor of Science in Business Administration Major in Human Resource Management',
    'Bachelor of Science in Hospitality Management',
    'Bachelor of Science in Office Administration',
    'Bachelor of Science in Criminology',
    'Bachelor of Industrial Technology Major in Automotive Technology',
    'Bachelor of Industrial Technology Major in Computer Technology',
    'Bachelor of Industrial Technology Major in Electrical Technology',
    'Bachelor of Industrial Technology Major in Electronics Technology',
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education Major in English',
    'Bachelor of Secondary Education Major in Mathematics',
    'Bachelor of Secondary Education Major in Social Studies',
    'Bachelor of Technology and Livelihood Education Major in Home Economics'
];

const FALLBACK_DEPARTMENT_OPTIONS = [
    'College of Agriculture and Forestry',
    'College of Arts and Sciences',
    'College of Business Administration',
    'College of Criminal Justice Education',
    'College of Education',
    'College of Engineering and Architecture',
    'College of Industrial Technology',
    'College of Nursing, Pharmacy and Allied Health Sciences'
];

const YEAR_LEVEL_OPTIONS = [
    { value: '1st Year', label: 'I' },
    { value: '2nd Year', label: 'II' },
    { value: '3rd Year', label: 'III' },
    { value: '4th Year', label: 'IV' },
    { value: '5th Year', label: 'V' },
    { value: '6th Year', label: 'VI' },
    { value: 'Other', label: 'Other' }
];

// Extracted to top-level so React keeps a stable component identity across re-renders.
// When these were inline, every state change created a new component type →
// React unmounted/remounted <select> elements → dropdowns collapsed instantly.
const Field = ({ label, field, type, options, readOnly, colSpan, isEditing, activePersonalInfo, personalInfo, setDraftPersonalInfo, showToast, onChange }: any) => {
    const fieldId = `profile-${field}`;
    const showsEditableControl = isEditing && !readOnly;
    const fieldShellClass = showsEditableControl
        ? 'min-w-0'
        : 'min-w-0 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 transition-colors hover:border-blue-200 hover:bg-slate-50/70';
    const [isUploading, setIsUploading] = React.useState(false);

    const openDocument = async () => {
        try {
            await openStoredAsset('support_documents', personalInfo[field], 300, {
                category: getProfileDocumentCategory(field),
                studentId: String(personalInfo?.studentId || personalInfo?.student_id || '')
            });
        } catch (error: any) {
            showToast?.(error.message || 'Unable to open the selected file.', 'error');
        }
    };

    const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isSupportedFile = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isSupportedFile) {
            showToast?.('Upload an image or PDF.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 1024 * 1024) {
            showToast?.('Profile documents must be under 1 MB.', 'error');
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const storedReference = await uploadProfileDocument(file, field);
            setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: storedReference }));
            showToast?.('Document uploaded successfully! Click "Save Changes" at the bottom to finalize.', 'success');
        } catch (err: any) {
            showToast?.(err.message, 'error');
            e.target.value = '';
        } finally {
            setIsUploading(false);
        }
    };

    const fieldRule = getProfileTextFieldRule(field, type === 'textarea');

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        const nextFieldValue = cleanLiveProfileText(val, fieldRule.multiline || type === 'textarea');
        if (nextFieldValue !== val) {
            showToast?.('Unsafe control or angle-bracket characters were removed.', 'error');
        }
        if (nextFieldValue.length > fieldRule.maxLength) {
            showToast?.(`${fieldRule.label} must be ${fieldRule.maxLength} characters or fewer.`, 'error');
            return;
        }
        setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: nextFieldValue }));
    };

    return (
        <div className={`${fieldShellClass} ${colSpan ? `sm:col-span-${colSpan}` : ''}`}>
            {showsEditableControl ? (
                <label htmlFor={fieldId} className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.11em] text-slate-500 sm:text-[10px]">{label}</label>
            ) : (
                <p className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">{label}</p>
            )}
            {showsEditableControl ? (
                type === 'select' ? (
                    <select id={fieldId} name={field} autoComplete="off" className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] || ''} onChange={(e) => onChange ? onChange(e.target.value) : setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="" className="bg-white text-slate-700">Select</option>
                        {(options || []).map((o: any) => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value} className="bg-white text-slate-700">{typeof o === 'string' ? o : o.label}</option>)}
                    </select>
                ) : type === 'textarea' ? (
                    <textarea id={fieldId} name={field} autoComplete="off" maxLength={fieldRule.maxLength} className={`${INPUT_CLASS} min-h-[112px] resize-none sm:min-h-0`} style={{ colorScheme: 'light' }} rows={3} value={activePersonalInfo[field] || ''} onChange={handleTextChange} />
                ) : type === 'boolean' ? (
                    <select id={fieldId} name={field} autoComplete="off" className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] ? 'Yes' : 'No'} onChange={(e) => setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value === 'Yes' }))}>
                        <option value="No" className="bg-white text-slate-700">No</option><option value="Yes" className="bg-white text-slate-700">Yes</option>
                    </select>
                ) : type === 'document' ? (
                    <div className="space-y-2">
                        <input
                            id={fieldId}
                            name={field}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleDocumentChange}
                            disabled={isUploading}
                            className="block w-full text-sm text-indigo-900 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 sm:text-[10px]">
                            <span>Max 1 MB.</span>
                            {isUploading && <span className="font-semibold text-indigo-500 animate-pulse">Uploading...</span>}
                            {!isUploading && activePersonalInfo[field] && (
                                <button type="button" onClick={() => openStoredAsset('support_documents', activePersonalInfo[field], 300, {
                                    category: getProfileDocumentCategory(field),
                                    studentId: String(personalInfo?.studentId || personalInfo?.student_id || '')
                                }).catch(err => showToast?.(err.message, 'error'))} className="font-bold text-indigo-600 hover:text-indigo-700">View current file</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <input id={fieldId} name={field} autoComplete="off" spellCheck={false} maxLength={fieldRule.maxLength} type={type || 'text'} className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] || ''} onChange={(e) => {
                        if (field === 'dob') {
                            const dob = e.target.value;
                            let age = activePersonalInfo.age;
                            if (dob) { const b = new Date(dob); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; age = a >= 0 ? a : ''; }
                            setDraftPersonalInfo((prev: any) => ({ ...prev, dob, age }));
                        } else {
                            handleTextChange(e);
                        }
                    }} />
                )
            ) : type === 'document' && personalInfo[field] ? (
                <button type="button" onClick={openDocument} className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">View file</button>
            ) : (
                <p className="min-h-5 break-words text-sm font-bold leading-5 text-slate-900" title={String(activePersonalInfo[field] || '')}>
                    {type === 'boolean' ? (activePersonalInfo[field] ? 'Yes' : 'No') : (activePersonalInfo[field] || <span className="text-gray-300 italic font-normal">—</span>)}
                </p>
            )}
        </div>
    );
};

const Section = ({ icon, gradient, title, children, cardClass, cardStyle }: any) => (
    <section className={cardClass} style={cardStyle}>
        <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-950">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs text-white shadow-sm`}>{icon}</span>
                <span className="min-w-0 leading-tight">{title}</span>
            </h4>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">{children}</div>
    </section>
);

/** Identity header: photo, name, chips, academic summary, and the edit button. */
const ProfileHeaderCard = ({ personalInfo, isUploadingPhoto, onPickPhoto, onEdit }: any) => {
    const studentFullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName, personalInfo.suffix].filter(Boolean).join(' ') || 'Student';
    const profileStatus = personalInfo.status || 'Active';
    const profileChips = [
        personalInfo.year,
        personalInfo.section ? `Sec ${personalInfo.section}` : '',
        profileStatus
    ].filter(Boolean);
    const academicSummary = [
        { label: 'College', value: personalInfo.department || 'Not set' },
        { label: 'Program', value: personalInfo.course || 'Not set' },
    ];

    return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div>
            <div className="p-4 sm:p-5 lg:p-6">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="relative h-16 w-16 shrink-0 sm:h-24 sm:w-24">
                            {personalInfo.profile_picture_url ? (
                                <ResolvedProfileImage
                                    storedValue={personalInfo.profile_picture_url}
                                    studentId={String(personalInfo.studentId || personalInfo.student_id || '')}
                                    alt="Profile"
                                    referrerPolicy="no-referrer"
                                    className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 object-cover shadow-sm sm:h-24 sm:w-24"
                                />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-2xl font-black text-blue-600 shadow-sm sm:h-24 sm:w-24 sm:text-4xl">
                                    {personalInfo.firstName?.[0] || 'S'}
                                </div>
                            )}
                            <button
                                type="button"
                                aria-label={isUploadingPhoto ? 'Uploading profile picture' : 'Change profile picture'}
                                title={isUploadingPhoto ? 'Uploading…' : 'Change profile picture'}
                                onClick={onPickPhoto}
                                disabled={isUploadingPhoto}
                                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm transition-all hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:pointer-events-none disabled:opacity-70"
                            >
                                {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            </button>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="pr-20 sm:pr-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Student Profile</p>
                                <h3 className="mt-1 break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl" title={studentFullName}>
                                    {studentFullName}
                                </h3>
                                <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">{personalInfo.studentId || 'No student ID'}</p>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {profileChips.map((chip) => (
                                    <span key={chip} className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${chip === profileStatus ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-label="Edit profile"
                        title="Edit profile"
                        onClick={onEdit}
                        className="absolute right-0 top-0 inline-flex min-h-11 w-[70px] shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-950 px-2 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:static sm:w-auto sm:gap-2 sm:px-4 sm:text-sm"
                    >
                        <Pencil className="h-4 w-4" />
                        <span className="sm:hidden">Edit</span>
                        <span className="hidden sm:inline">Edit Profile</span>
                    </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    {academicSummary.map((item) => (
                        <div key={item.label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                            <p className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-900" title={item.value}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
    );
};

/** Family, socio-economic, guardian, emergency, education, and activity sections. */
const ExtendedProfileSections = ({ fp, activePersonalInfo, profileCardClass, Icons }: any) => (
    <>

        <Section cardClass={profileCardClass} icon="👨‍👩‍👧" gradient="from-amber-400 to-orange-500" title="Family Background">
            <Field {...fp} label="Name of Spouse" field="spouseName" />
            <Field {...fp} label="Spouse's Occupation" field="spouseOccupation" />
            <Field {...fp} label="Spouse's Employer/Business Name" field="spouseEmployerName" colSpan={2} />
            <Field {...fp} label="Spouse's Employer/Business Address" field="spouseEmployerAddress" colSpan={2} />
            <Field {...fp} label="Spouse's Contact Number" field="spouseContact" />
            <Field {...fp} label="Number of Children" field="numChildren" />
            <Field {...fp} label="Name of Children - Date of Birth" field="childrenNamesBirthdates" type="textarea" colSpan={2} />
            <Field {...fp} label="Currently Pregnant" field="currentlyPregnant" type="select" options={['Yes', 'No', 'Maybe']} />
            <Field {...fp} label="Mother's Maiden Last Name" field="motherLastName" />
            <Field {...fp} label="Mother's Given Name" field="motherGivenName" />
            <Field {...fp} label="Mother's Maiden Middle Name" field="motherMiddleName" />
            <Field {...fp} label="Mother's Occupation" field="motherOccupation" />
            <Field {...fp} label="Mother's Status" field="motherStatus" type="select" options={['Alive', 'Deceased', 'Unknown', 'Prefer not to say']} />
            <Field {...fp} label="Mother's Contact Number" field="motherContact" />
            <Field {...fp} label="Mother's Address" field="motherAddress" colSpan={2} />
            <Field {...fp} label="Father's Last Name" field="fatherLastName" />
            <Field {...fp} label="Father's Given Name" field="fatherGivenName" />
            <Field {...fp} label="Father's Middle Name" field="fatherMiddleName" />
            <Field {...fp} label="Father's Occupation" field="fatherOccupation" />
            <Field {...fp} label="Father's Status" field="fatherStatus" type="select" options={['Alive', 'Deceased', 'Unknown', 'Prefer not to say']} />
            <Field {...fp} label="Father's Contact Number" field="fatherContact" />
            <Field {...fp} label="Father's Address" field="fatherAddress" colSpan={2} />
            <Field {...fp} label="Number of Children Your Parents Have" field="parentsNumChildren" />
            <Field {...fp} label="Your Birth Order in the Family" field="birthOrder" type="select" options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child', 'Other']} />
            {activePersonalInfo.birthOrder === 'Other' && <Field {...fp} label="Birth Order Other" field="birthOrderOther" />}
        </Section>

        <Section cardClass={profileCardClass} icon="ℹ️" gradient="from-indigo-400 to-violet-500" title="Socio-Economic Background">
            <Field {...fp} label="Person/Agency Who Supports Your Studies Financially Other Than Yourself" field="supporter" colSpan={2} />
            <Field {...fp} label="Contact Information of the Person/Agency Who Supports Your Studies Financially Other Than Yourself" field="supporterContact" colSpan={2} />
            <Field {...fp} label="Are You a Working Student" field="isWorkingStudent" type="boolean" />
            <Field {...fp} label="Type of Work" field="workingStudentType" type="select" options={['House help', 'Call Center Agent/BPO employee', 'Fast food/Restaurant', 'Online employee/Freelancer', 'Self-employed', 'N/A', 'Other']} />
            {activePersonalInfo.workingStudentType === 'Other' && <Field {...fp} label="Specify Type of Work" field="workingStudentTypeOther" />}
            <Field {...fp} label="Name of Employer" field="employerName" />
            <Field {...fp} label="Address of Employer" field="employerAddress" />
            <Field {...fp} label="Are You a Person With Disability (PWD)" field="isPwd" type="boolean" />
            <Field {...fp} label="PWD Number" field="pwdNumber" />
            <Field {...fp} label="Type of Disability" field="pwdType" type="select" options={['0', 'Visual impairment', 'Hearing impairment', 'Physical/Orthopedic disability', 'Chronic illness', 'Psychosocial disability', 'Communication disability', 'Other']} />
            {activePersonalInfo.pwdType === 'Other' && <Field {...fp} label="Specify Type of Disability" field="pwdTypeOther" />}
            <Field {...fp} label="Cause of Disability" field="disabilityCause" />
            <Field {...fp} label="PWD Document" field="pwdDocumentUrl" type="document" />
            <Field {...fp} label="Are You a Member of Any Indigenous Group & Cultural Communities" field="isIndigenous" type="boolean" />
            <Field {...fp} label="Indigenous Group" field="indigenousGroup" type="select" options={['N/A', 'Bukidnon', 'Tabihanon Group', 'ATA', 'IFUGAO', 'Kalahing Kulot', 'Lumad', 'Other']} />
            {activePersonalInfo.indigenousGroup === 'Other' && <Field {...fp} label="Specify Indigenous Group" field="indigenousGroupOther" />}
            <Field {...fp} label="IP Document" field="ipDocumentUrl" type="document" />
            <Field {...fp} label="Are You a Member of 4Ps" field="isFourPsMember" type="boolean" />
            <Field {...fp} label="4Ps Document" field="fourPsDocumentUrl" type="document" />
            <Field {...fp} label="Are You a Rebel Returnee" field="isRebelReturnee" type="boolean" />
            <Field {...fp} label="Are You a Son/Daughter of a Solo Parent" field="isChildOfSoloParent" type="boolean" />
            <Field {...fp} label="Are You a Solo Parent Yourself" field="isSoloParent" type="boolean" />
            <Field {...fp} label="Solo Parent Document" field="soloParentDocumentUrl" type="document" />
            <Field {...fp} label="Are You an Orphan" field="isOrphan" type="boolean" />
            <Field {...fp} label="Cause of Being an Orphan" field="orphanCause" type="select" options={['N/A', 'Death', 'Abandonment', 'Other']} />
            {activePersonalInfo.orphanCause === 'Other' && <Field {...fp} label="Specify Cause of Being an Orphan" field="orphanCauseOther" />}
            <Field {...fp} label="Are You a Homeless Citizen" field="isHomelessCitizen" type="boolean" />
            <Field {...fp} label="Are You a Senior Citizen" field="isSeniorCitizen" type="boolean" />
            <Field {...fp} label="Senior Citizen Document" field="seniorCitizenDocumentUrl" type="document" />
            <Field {...fp} label="Work Experiences" field="workExperiences" type="textarea" colSpan={2} />
        </Section>

        <Section cardClass={profileCardClass} icon="🛡️" gradient="from-slate-500 to-slate-700" title="Guardian">
            <Field {...fp} label="Guardian Full Name" field="guardianName" colSpan={2} />
            <Field {...fp} label="Guardian Address" field="guardianAddress" colSpan={2} />
            <Field {...fp} label="Guardian Contact Number" field="guardianContact" />
            <Field {...fp} label="Relation to the Guardian" field="guardianRelation" type="select" options={['Family', 'Relative', 'Not relative', 'Landlord', 'Landlady', 'Other']} />
        </Section>

        <Section cardClass={profileCardClass} icon="🚨" gradient="from-rose-400 to-red-500" title="Person to Contact (In Case of Emergency)">
            <Field {...fp} label="Emergency Contact Full Name" field="emergencyName" colSpan={2} />
            <Field {...fp} label="Emergency Contact Address" field="emergencyAddress" colSpan={2} />
            <Field {...fp} label="Emergency Contact Relationship" field="emergencyRelationship" />
            <Field {...fp} label="Emergency Contact Number" field="emergencyNumber" />
        </Section>

        <Section cardClass={profileCardClass} icon={<Icons.Assessment />} gradient="from-cyan-400 to-blue-500" title="Educational Background">
            <Field {...fp} label="Elementary School" field="elemSchool" colSpan={2} />
            <Field {...fp} label="Elementary Inclusive Years Attended" field="elemYearGraduated" colSpan={2} />
            <Field {...fp} label="Junior High School" field="juniorHighSchool" colSpan={2} />
            <Field {...fp} label="Junior High Inclusive Years Attended" field="juniorHighYearGraduated" colSpan={2} />
            <Field {...fp} label="Senior High School" field="seniorHighSchool" colSpan={2} />
            <Field {...fp} label="Senior High Inclusive Years Attended" field="seniorHighYearGraduated" colSpan={2} />
            <Field {...fp} label="Transferee College" field="collegeSchool" colSpan={2} />
            <Field {...fp} label="Transferee College Inclusive Years Attended" field="collegeYearGraduated" colSpan={2} />
            <Field {...fp} label="Honor/Award Received" field="honorsAwards" type="textarea" colSpan={2} />
            <Field {...fp} label="TESDA NC II Acquired - Date Acquired - Validity" field="tesdaNc2Acquired" type="textarea" colSpan={2} />
            <Field {...fp} label="Eligibility Acquired - Date Acquired" field="eligibilityAcquired" type="textarea" colSpan={2} />
            <Field {...fp} label="Special Trainings Attended" field="specialTrainingsAttended" type="textarea" colSpan={2} />
        </Section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div className={profileCardClass}>
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-lg text-xs">🎭</span> Extra-Curricular</h4>
                <div className="space-y-4">
                    <Field {...fp} label="Name of Voluntary Activities" field="extracurricularActivities" type="textarea" />
                    <Field {...fp} label="Do You Hold a Local/National Position in Public Service" field="holdsPublicServicePosition" type="select" options={['Yes', 'No']} />
                    <Field {...fp} label="Position in Public Service" field="publicServicePosition" />
                    <Field {...fp} label="Organizations You Are a Member Of" field="organizationsMemberships" type="textarea" />
                    <Field {...fp} label="Sports You Are Good At" field="sportsSkills" type="textarea" />
                    <Field {...fp} label="Other Talent/s" field="otherTalents" type="textarea" />
                </div>
            </div>
            <div className={profileCardClass}>
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-lg text-xs">🎓</span> Scholarships</h4>
                <div className="space-y-4">
                    <Field {...fp} label="Name of Scholarship Availed & Sponsor" field="scholarshipsAvailed" type="textarea" />
                    <Field {...fp} label="Have You Been Criminally Charged Before Any Court" field="hasBeenCriminallyCharged" type="select" options={['Yes', 'No']} />
                    {activePersonalInfo.hasBeenCriminallyCharged === 'Yes' && <Field {...fp} label="If Yes, Indicate (Criminal Charge Details)" field="criminalChargeDetails" type="textarea" />}
                    <Field {...fp} label="Have You Been Convicted of Any Crime" field="hasBeenConvictedOfCrime" type="select" options={['Yes', 'No']} />
                    {activePersonalInfo.hasBeenConvictedOfCrime === 'Yes' && <Field {...fp} label="If Yes, Indicate (Crime Conviction Details)" field="crimeConvictionDetails" type="textarea" />}
                </div>
            </div>
        </div>

    </>
);

function ProfileViewContent(p: any) {
    const {
        profileTab,
        setProfileTab,
        personalInfo,
        isEditing,
        setIsEditing,
        setPersonalInfo,
        saveProfileChanges,
        isSavingProfileChanges,
        authEmail,
        requestStudentSecurityOtp,
        confirmStudentSecurityEmailChange,
        confirmStudentPasswordChange,
        Icons,
        attendanceMap,
        formatFullDate,
        uploadProfilePicture,
        showToast,
        showMoreProfile,
        setShowMoreProfile
    } = p;
    const [draftPersonalInfo, setDraftPersonalInfo] = React.useState(personalInfo);
    const [isCompactMobileLayout, setIsCompactMobileLayout] = React.useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    ));
    // Course names are reference data — cached for the session like the
    // registrar's lookups, so profile visits don't refetch them per nav.
    // gcTime Infinity too: the default 5-min gc would evict the entry while
    // this view is unmounted, causing a refetch on later visits.
    const { data: courseNameRows } = useQuery({
        queryKey: ['student_course_options'],
        queryFn: async () => {
            const { data, error } = await supabase.from('courses').select('name').order('name');
            if (error) throw error;
            return data || [];
        },
        staleTime: Infinity,
        gcTime: Infinity
    });
    const courseOptions = React.useMemo(
        () => [...new Set([...(courseNameRows || []).map((d: any) => d.name), ...FALLBACK_PROGRAM_OPTIONS].filter(Boolean))],
        [courseNameRows]
    );
    const profileCardClass = isEditing || isCompactMobileLayout
        ? 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5'
        : 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm card-hover sm:p-5';
    const surfacePanelClass = 'student-profile-tabs grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm';
    const largePanelClass = isCompactMobileLayout
        ? 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6'
        : 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover sm:p-6';
    const activePersonalInfo = isEditing ? draftPersonalInfo : personalInfo;
    const profileTabs = [
        { id: 'personal', label: 'Personal Info', mobileLabel: 'Personal', icon: <Icons.Profile /> },
        { id: 'engagement', label: 'Engagement', mobileLabel: 'Activity', icon: <Icons.Clock /> },
        { id: 'security', label: 'Security', mobileLabel: 'Security', icon: <Icons.Support /> },
    ];

    // Shared field props — passed to every <Field> to avoid repetition
    const fp = { isEditing, activePersonalInfo, personalInfo, setDraftPersonalInfo, showToast };

    React.useEffect(() => {
        if (!isEditing) {
            setDraftPersonalInfo(personalInfo);
        }
    }, [isEditing, personalInfo]);

    const handleCourseChange = (course: string) => {
        const fallbackDepartment = draftPersonalInfo.department || 'Unassigned';
        setDraftPersonalInfo((current: any) => ({
            ...current,
            course,
            department: course === personalInfo.course ? personalInfo.department : current.department
        }));

        if (!course || course === personalInfo.course) return;

        void fetchDepartmentNameForCourse(supabase, course, fallbackDepartment)
            .then((department) => {
                setDraftPersonalInfo((current: any) => (
                    current.course === course && current.department !== department
                        ? { ...current, department }
                        : current
                ));
            })
            .catch((error) => {
                console.error("Error fetching department:", error);
            });
    };

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCompactLayout = () => {
            setIsCompactMobileLayout(window.innerWidth < 640);
        };

        syncCompactLayout();
        window.addEventListener('resize', syncCompactLayout);

        return () => {
            window.removeEventListener('resize', syncCompactLayout);
        };
    }, []);

    React.useEffect(() => {
        if (isEditing && !showMoreProfile) {
            setShowMoreProfile(true);
        }
    }, [isEditing, setShowMoreProfile, showMoreProfile]);

    React.useEffect(() => {
        if (isEditing && (personalInfo.profilePictureUrl || personalInfo.profile_picture_url)) {
            setDraftPersonalInfo((prev: any) => ({
                ...prev,
                profilePictureUrl: personalInfo.profilePictureUrl || personalInfo.profile_picture_url,
                profile_picture_url: personalInfo.profile_picture_url || personalInfo.profilePictureUrl
            }));
        }
    }, [personalInfo.profilePictureUrl, personalInfo.profile_picture_url, isEditing, setDraftPersonalInfo]);

    const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

    // Programmatic file picker — avoids useRef (hook) inside a plain render function
    const openFilePicker = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file && uploadProfilePicture) {
                setIsUploadingPhoto(true);
                void Promise.resolve(uploadProfilePicture(file)).finally(() => setIsUploadingPhoto(false));
            }
        };
        input.click();
    };

    const shouldRenderFullPersonalTab = !isCompactMobileLayout || showMoreProfile || isEditing;

    const getCardStyle = (delay?: string): React.CSSProperties | undefined => {
        return delay && !isCompactMobileLayout ? { animationDelay: delay } : undefined;
    };

    return (
        <div className={`flex flex-col gap-4 sm:gap-6 ${isEditing ? 'student-profile-edit w-full max-w-full' : (isCompactMobileLayout ? '' : 'page-transition')}`} style={isEditing ? { colorScheme: 'light' } : undefined}>
            <div className="flex-1 space-y-4 w-full">
                <div className={`${surfacePanelClass} ${isEditing || isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('100ms')}>
                    {profileTabs.map((tab: any) => (
                        <button
                            key={tab.id}
                            type="button"
                            aria-current={profileTab === tab.id ? 'page' : undefined}
                            onClick={() => { setProfileTab(tab.id); setIsEditing(false); }}
                            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-black leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:flex-row sm:gap-2 sm:text-xs ${profileTab === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}
                        >
                            <span className={profileTab === tab.id ? 'text-blue-300' : 'text-slate-400'}>{tab.icon}</span>
                            <span className="sm:hidden">{tab.mobileLabel}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {profileTab === 'personal' && (
                    <div className={`space-y-4 ${isEditing || isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('200ms')}>
                        <ProfileHeaderCard
                            personalInfo={personalInfo}
                            isUploadingPhoto={isUploadingPhoto}
                            onPickPhoto={openFilePicker}
                            onEdit={() => { setProfileTab('personal'); setShowMoreProfile(true); setIsEditing(true); }}
                        />

                        <Section cardClass={profileCardClass} icon={<Icons.Profile />} gradient="from-blue-500 to-sky-400" title="Basic Information">
                            <Field {...fp} label="Email Address" field="email" readOnly />
                            <Field {...fp} label="Student ID No." field="studentId" readOnly />
                            <Field {...fp} label="Last Name" field="lastName" />
                            <Field {...fp} label="Given Name" field="firstName" />
                            <Field {...fp} label="Middle Name" field="middleName" />
                            <Field {...fp} label="Extension Name" field="suffix" />
                            <Field {...fp} label="Birthday" field="dob" type="date" />
                            <Field {...fp} label="Age" field="age" readOnly />
                            <Field {...fp} label="Sex Assigned at Birth" field="sex" type="select" options={['Male', 'Female']} />
                            <Field {...fp} label="Gender" field="genderIdentity" type="select" options={['Cis-gender', 'Transgender', 'Non-binary gender', 'Prefer not to say']} />
                            <Field {...fp} label="Civil Status" field="civilStatus" type="select" options={['Single', 'Cohabitation (Live-In)', 'Was Previously Married But Separated', 'Married', 'Widow/er']} />
                            <Field {...fp} label="Citizenship" field="nationality" />
                            <Field {...fp} label="Year Level" field="year" type="select" options={[...new Set([activePersonalInfo.year, ...YEAR_LEVEL_OPTIONS.map(o => o.value)].filter(Boolean))]} />
                            {activePersonalInfo.year === 'Other' && <Field {...fp} label="Specify Year Level" field="yearLevelOther" />}
                            <Field {...fp} label="Section" field="section" />
                            <Field {...fp} label="College" field="department" readOnly />
                            <Field {...fp} label="Program" field="course" colSpan={2} readOnly type="select" options={[...new Set([activePersonalInfo.course, ...courseOptions].filter(Boolean))]} onChange={handleCourseChange} />
                            <Field {...fp} label="Place of Birth" field="placeOfBirth" />
                            <Field {...fp} label="Religion" field="religion" />
                        </Section>

                        <Section cardClass={profileCardClass} icon={<Icons.Events />} gradient="from-emerald-400 to-teal-500" title="Contact & Address">
                            <Field {...fp} label="Contact Number" field="mobile" />
                            <Field {...fp} label="Facebook Account Link" field="facebookUrl" />
                            <Field {...fp} label="Permanent Address - Street/Sitio & Barangay" field="street" colSpan={2} />
                            <Field {...fp} label="Permanent Address - Town/City Municipality" field="city" />
                            <Field {...fp} label="Permanent Address - Province" field="province" />
                            <Field {...fp} label="Permanent Address - Zip Code" field="zipCode" />
                            <Field {...fp} label="Permanent Address - Region" field="region" type="select" options={['Region XVIII (NIR)', 'Region VII (Central Visayas)', 'Region VI (Western Visayas)', 'Other']} />
                            {activePersonalInfo.region === 'Other' && <Field {...fp} label="Specify Region" field="regionOther" />}
                        </Section>
                        {!shouldRenderFullPersonalTab && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                                <p className="text-sm font-black text-slate-950">Family, guardian, education, and support details</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">Review the remaining sections when you need to update the information used by CARE services.</p>
                                <button type="button" onClick={() => setShowMoreProfile(true)} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                    View Remaining Sections
                                </button>
                            </div>
                        )}
                        {shouldRenderFullPersonalTab && (
                            <ExtendedProfileSections fp={fp} activePersonalInfo={activePersonalInfo} profileCardClass={profileCardClass} Icons={Icons} />
                        )}
                        {isCompactMobileLayout && showMoreProfile && !isEditing && (
                            <button type="button" onClick={() => setShowMoreProfile(false)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                Show Fewer Profile Sections
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                                <button type="button" onClick={() => { setIsEditing(false); if (isCompactMobileLayout) setShowMoreProfile(false); }} className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-auto sm:py-2.5">Cancel</button>
                                <button type="button" disabled={Boolean(isSavingProfileChanges)} onClick={() => { setPersonalInfo(draftPersonalInfo); void saveProfileChanges(draftPersonalInfo); }} className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5">{isSavingProfileChanges ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        )}
                    </div>
                )}
                {profileTab === 'engagement' && (
                    <div className={`${largePanelClass} ${isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('200ms')}>
                        <h3 className="font-bold text-lg mb-4 sm:mb-6">Engagement History</h3>
                        <p className="text-sm text-gray-400">Your recent event attendance and platform activity.</p>
                        <div className="mt-4 space-y-3">
                            {Object.entries(attendanceMap).map(([eventId, record]: [string, any]) => (
                                <div key={eventId} className="flex flex-col items-start gap-2 rounded-xl border border-purple-100/30 bg-purple-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div><p className="text-xs font-bold text-gray-700">Event #{eventId}</p><p className="text-[10px] text-gray-400">Time In: {record.time_in ? formatFullDate(new Date(record.time_in)) : '—'}</p></div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${record.time_out ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>{record.time_out ? 'Completed' : 'Ongoing'}</span>
                                </div>
                            ))}
                            {Object.keys(attendanceMap).length === 0 && <p className="text-center text-gray-400 text-sm py-6">No activity records found.</p>}
                        </div>
                    </div>
                )}
                {profileTab === 'security' && (
                    <div className={`${largePanelClass} ${isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('200ms')}>
                        <h3 className="mb-3 flex items-center gap-2 text-base font-bold sm:mb-6 sm:text-lg"><span className="rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 p-1 text-white sm:p-1.5"><Icons.Support /></span> Security Settings</h3>
                        <p className="text-xs leading-5 text-gray-400 sm:text-sm">Manage the email and password behind your student login here. OTP verification is required before any email or password change is applied.</p>
                        <AccountSecuritySettings
                            currentEmail={authEmail || personalInfo.email || ''}
                            loginLabel="your student email"
                            emailHelperText="Your student ID login stays the same. This updates the real email behind your account, and the OTP will be sent to the new email address."
                            passwordHelperText="Choose a new password for your student login. An OTP will be sent to your current email before the password change is accepted."
                            requestOtp={requestStudentSecurityOtp}
                            confirmEmailChange={confirmStudentSecurityEmailChange}
                            confirmPasswordChange={confirmStudentPasswordChange}
                            showToast={showToast}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

const areProfileViewPropsEqual = (prev: any, next: any) =>
    prev.profileTab === next.profileTab
    && prev.isEditing === next.isEditing
    && prev.showMoreProfile === next.showMoreProfile
    && prev.isSavingProfileChanges === next.isSavingProfileChanges
    && prev.personalInfo === next.personalInfo
    && prev.attendanceMap === next.attendanceMap;

export const ProfileView = React.memo(ProfileViewContent, areProfileViewPropsEqual);
