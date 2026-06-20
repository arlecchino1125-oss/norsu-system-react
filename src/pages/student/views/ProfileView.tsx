import React from 'react';
import AccountSecuritySettings from '../../../components/AccountSecuritySettings';
import { openStoredAsset } from '../../../utils/storageAssets';
import { cleanLiveProfileText, getProfileTextFieldRule } from '../../../utils/profileFieldRules';
import { getValidProfileImageUrl } from '../../../utils/formatters';

const INPUT_CLASS = 'w-full appearance-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-5 text-slate-700 shadow-sm outline-none transition-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm';

// Extracted to top-level so React keeps a stable component identity across re-renders.
// When these were inline, every state change created a new component type →
// React unmounted/remounted <select> elements → dropdowns collapsed instantly.
const Field = ({ label, field, type, options, readOnly, colSpan, isEditing, activePersonalInfo, personalInfo, setDraftPersonalInfo, showToast }: any) => {
    const fieldId = `profile-${field}`;
    const showsEditableControl = isEditing && !readOnly && type !== 'document';
    const openDocument = async () => {
        try {
            await openStoredAsset('support_documents', personalInfo[field]);
        } catch (error: any) {
            showToast?.(error.message || 'Unable to open the selected file.', 'error');
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
        <div className={`min-w-0 ${colSpan ? `col-span-${colSpan}` : ''}`}>
            {showsEditableControl ? (
                <label htmlFor={fieldId} className="block text-[11px] text-gray-400 uppercase font-bold mb-1.5 sm:text-[10px] sm:mb-1">{label}</label>
            ) : (
                <p className="block text-[11px] text-gray-400 uppercase font-bold mb-1.5 sm:text-[10px] sm:mb-1">{label}</p>
            )}
            {showsEditableControl ? (
                type === 'select' ? (
                    <select id={fieldId} name={field} autoComplete="off" className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] || ''} onChange={(e) => setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="" className="bg-white text-slate-700">Select</option>
                        {(options || []).map((o: any) => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value} className="bg-white text-slate-700">{typeof o === 'string' ? o : o.label}</option>)}
                    </select>
                ) : type === 'textarea' ? (
                    <textarea id={fieldId} name={field} autoComplete="off" maxLength={fieldRule.maxLength} className={`${INPUT_CLASS} min-h-[112px] resize-none sm:min-h-0`} style={{ colorScheme: 'light' }} rows={3} value={activePersonalInfo[field] || ''} onChange={handleTextChange} />
                ) : type === 'boolean' ? (
                    <select id={fieldId} name={field} autoComplete="off" className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] ? 'Yes' : 'No'} onChange={(e) => setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value === 'Yes' }))}>
                        <option value="No" className="bg-white text-slate-700">No</option><option value="Yes" className="bg-white text-slate-700">Yes</option>
                    </select>
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
                <p className="text-[15px] font-semibold leading-6 text-slate-700 break-words sm:text-sm sm:leading-5 sm:truncate" title={String(personalInfo[field] || '')}>
                    {type === 'boolean' ? (personalInfo[field] ? 'Yes' : 'No') : (personalInfo[field] || <span className="text-gray-300 italic font-normal">—</span>)}
                </p>
            )}
        </div>
    );
};

const Section = ({ icon, gradient, title, children, cardClass, cardStyle }: any) => (
    <div className={cardClass} style={cardStyle}>
        <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className={`p-1.5 bg-gradient-to-br ${gradient} text-white rounded-lg text-xs`}>{icon}</span> {title}</h4>
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 md:grid-cols-4">{children}</div>
    </div>
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
    const profileCardClass = isEditing || isCompactMobileLayout
        ? 'bg-white rounded-xl border border-blue-100/50 p-4 shadow-sm sm:p-6'
        : 'bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-4 shadow-sm card-hover sm:p-6';
    const profileSummaryCardClass = isEditing || isCompactMobileLayout
        ? 'bg-white rounded-2xl border border-blue-100/50 p-4 shadow-sm sm:p-6'
        : 'bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-4 shadow-sm card-hover sm:p-6';
    const surfacePanelClass = isCompactMobileLayout
        ? 'bg-white rounded-xl border border-blue-100/50 flex shadow-sm p-1'
        : 'bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 flex shadow-sm p-1';
    const largePanelClass = isCompactMobileLayout
        ? 'bg-white rounded-2xl border border-blue-100/50 p-5 shadow-sm sm:p-8'
        : 'bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-5 shadow-sm card-hover sm:p-8';
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

    // Programmatic file picker — avoids useRef (hook) inside a plain render function
    const openFilePicker = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file && uploadProfilePicture) uploadProfilePicture(file);
        };
        input.click();
    };

    const shouldRenderFullPersonalTab = !isCompactMobileLayout || showMoreProfile || isEditing;
    const deferredCardStyle: React.CSSProperties | undefined = isCompactMobileLayout
        ? {
            contentVisibility: 'auto',
            containIntrinsicSize: '1px 420px',
            contain: 'layout paint style'
        }
        : undefined;
    const getCardStyle = (delay?: string): React.CSSProperties | undefined => {
        if (isCompactMobileLayout) return deferredCardStyle;
        return delay ? { animationDelay: delay } : undefined;
    };

    return (
        <div className={`flex flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8 ${isEditing ? 'student-profile-edit' : (isCompactMobileLayout ? '' : 'page-transition')}`} style={isEditing ? { colorScheme: 'light' } : undefined}>
            <div className={`w-full lg:w-80 lg:shrink-0 space-y-4 sm:space-y-6 ${isEditing || isCompactMobileLayout ? '' : 'animate-fade-in-up'}`}>
                <div className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 text-white text-center relative">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl ${isCompactMobileLayout ? '' : 'animate-float'}`}></div>
                    <div className="h-20 bg-white/5 relative sm:h-24"></div>
                    <div className="px-5 pb-6 -mt-10 relative z-10 sm:px-8 sm:pb-8 sm:-mt-12">
                        {/* Avatar with photo support + upload button */}
                        <div className="relative mx-auto mb-4 h-20 w-20 sm:h-24 sm:w-24">
                            {personalInfo.profile_picture_url ? (
                                <img
                                    src={getValidProfileImageUrl(personalInfo.profile_picture_url)}
                                    alt="Profile"
                                    referrerPolicy="no-referrer"
                                    className="h-20 w-20 rounded-2xl border-4 border-white/20 object-cover shadow-xl shadow-blue-500/30 sm:h-24 sm:w-24"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white/20 bg-gradient-to-br from-blue-400 to-sky-400 text-3xl font-black text-white shadow-xl shadow-blue-500/30 sm:h-24 sm:w-24 sm:text-4xl">
                                    {personalInfo.firstName?.[0] || 'S'}
                                </div>
                            )}
                            {/* Camera upload button */}
                            <button
                                title="Change profile picture"
                                onClick={openFilePicker}
                                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-lg transition-all hover:bg-blue-50 sm:h-8 sm:w-8"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            </button>
                        </div>
                        <h3 className="text-lg font-extrabold leading-tight sm:text-xl">{personalInfo.firstName} {personalInfo.lastName} {personalInfo.suffix}</h3>
                        <p className="text-[11px] font-medium text-blue-200/70 sm:text-xs">{personalInfo.studentId}</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            <span className={`rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold ${isCompactMobileLayout ? '' : 'backdrop-blur-sm'} sm:py-1 sm:text-[10px]`}>{personalInfo.year}</span>
                            {personalInfo.section && <span className={`rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold ${isCompactMobileLayout ? '' : 'backdrop-blur-sm'} sm:py-1 sm:text-[10px]`}>Sec {personalInfo.section}</span>}
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 sm:py-1 sm:text-[10px]">{personalInfo.status}</span>
                        </div>
                        <button onClick={() => { setProfileTab('personal'); setShowMoreProfile(true); setIsEditing(true); }} className={`mt-5 w-full rounded-xl border border-white/20 bg-white/15 py-3 text-sm font-bold text-white transition-all hover:bg-white/25 btn-press sm:mt-6 sm:py-2.5 sm:text-xs lg:mt-8 ${isCompactMobileLayout ? '' : 'backdrop-blur-sm'}`}>Edit Profile</button>
                    </div>
                </div>
                <div className={profileSummaryCardClass} style={getCardStyle('100ms')}>
                    <h4 className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest mb-4">Academic Summary</h4>
                    <p className="text-[10px] text-gray-400">College</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.department}</p>
                    <p className="text-[10px] text-gray-400">Program</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.course}</p>
                    <p className="text-[10px] text-gray-400">Year Level</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.year || '-'}</p>
                    <p className="text-[10px] text-gray-400">Section</p>
                    <p className="text-sm font-bold">{personalInfo.section || '-'}</p>
                </div>
            </div>
            <div className="flex-1 space-y-6">
                <div className={`${surfacePanelClass} ${isEditing || isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('100ms')}>
                    {profileTabs.map((tab: any) => (
                        <button key={tab.id} onClick={() => { setProfileTab(tab.id); setIsEditing(false); }} className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-[10px] font-bold leading-tight transition-all sm:min-h-0 sm:flex-row sm:gap-2 sm:text-xs ${profileTab === tab.id ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-900 hover:bg-purple-50'}`}>
                            {tab.icon}
                            <span className="sm:hidden">{tab.mobileLabel}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {profileTab === 'personal' && (
                    <div className={`space-y-6 ${isEditing || isCompactMobileLayout ? '' : 'animate-fade-in-up'}`} style={getCardStyle('200ms')}>
                        <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon={<Icons.Profile />} gradient="from-blue-500 to-sky-400" title="Basic Information">
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
                            <Field {...fp} label="Year Level" field="year" readOnly />
                            {activePersonalInfo.year === 'Other' && <Field {...fp} label="Specify Year Level" field="yearLevelOther" readOnly />}
                            <Field {...fp} label="College" field="department" readOnly />
                            <Field {...fp} label="Program" field="course" readOnly colSpan={2} />
                            <Field {...fp} label="Place of Birth" field="placeOfBirth" />
                            <Field {...fp} label="Religion" field="religion" />
                        </Section>

                        <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon={<Icons.Events />} gradient="from-emerald-400 to-teal-500" title="Contact & Address">
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
                            <div className="rounded-2xl border border-blue-100/60 bg-blue-50/60 p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">More Sections Available</p>
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">Show the remaining profile sections only when needed to keep this page lighter on slower mobile devices.</p>
                                <button onClick={() => setShowMoreProfile(true)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all btn-press">
                                    Show More Profile Sections
                                </button>
                            </div>
                        )}
                        {shouldRenderFullPersonalTab && (
                            <>

                                <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon="👨‍👩‍👧" gradient="from-amber-400 to-orange-500" title="Family Background">
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

                                <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon="ℹ️" gradient="from-indigo-400 to-violet-500" title="Socio-Economic Background">
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

                                <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon="🛡️" gradient="from-slate-500 to-slate-700" title="Guardian">
                                    <Field {...fp} label="Guardian Full Name" field="guardianName" colSpan={2} />
                                    <Field {...fp} label="Guardian Address" field="guardianAddress" colSpan={2} />
                                    <Field {...fp} label="Guardian Contact Number" field="guardianContact" />
                                    <Field {...fp} label="Relation to the Guardian" field="guardianRelation" type="select" options={['Family', 'Relative', 'Not relative', 'Landlord', 'Landlady', 'Other']} />
                                </Section>

                                <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon="🚨" gradient="from-rose-400 to-red-500" title="Person to Contact (In Case of Emergency)">
                                    <Field {...fp} label="Emergency Contact Full Name" field="emergencyName" colSpan={2} />
                                    <Field {...fp} label="Emergency Contact Address" field="emergencyAddress" colSpan={2} />
                                    <Field {...fp} label="Emergency Contact Relationship" field="emergencyRelationship" />
                                    <Field {...fp} label="Emergency Contact Number" field="emergencyNumber" />
                                </Section>

                                <Section cardClass={profileCardClass} cardStyle={deferredCardStyle} icon={<Icons.Assessment />} gradient="from-cyan-400 to-blue-500" title="Educational Background">
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
                                    <div className={profileCardClass} style={deferredCardStyle}>
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
                                    <div className={profileCardClass} style={deferredCardStyle}>
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
                        )}
                        {isCompactMobileLayout && showMoreProfile && !isEditing && (
                            <button onClick={() => setShowMoreProfile(false)} className="w-full rounded-xl border border-blue-100/60 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
                                Show Fewer Profile Sections
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                                <button onClick={() => { setIsEditing(false); if (isCompactMobileLayout) setShowMoreProfile(false); }} className="w-full rounded-xl border border-purple-100/50 bg-white/80 px-6 py-3 text-sm font-bold transition-all hover:bg-gray-50 sm:w-auto sm:py-2.5">Cancel</button>
                                <button disabled={Boolean(isSavingProfileChanges)} onClick={() => { setPersonalInfo(draftPersonalInfo); void saveProfileChanges(draftPersonalInfo); }} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl btn-press disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5">{isSavingProfileChanges ? 'Saving...' : 'Save Changes'}</button>
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
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 sm:mb-6"><span className="p-1.5 bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-lg"><Icons.Support /></span> Security Settings</h3>
                        <p className="text-sm text-gray-400">Manage the email and password behind your student login here. OTP verification is required before any email or password change is applied.</p>
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
    && prev.personalInfo === next.personalInfo
    && prev.attendanceMap === next.attendanceMap;

export const ProfileView = React.memo(ProfileViewContent, areProfileViewPropsEqual);

export function renderProfileView(p: any) {
    return <ProfileView {...p} />;
}
