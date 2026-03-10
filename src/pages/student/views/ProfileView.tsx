import React from 'react';

const INPUT_CLASS = 'w-full appearance-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-5 text-slate-700 shadow-sm outline-none transition-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm';

// Extracted to top-level so React keeps a stable component identity across re-renders.
// When these were inline, every state change created a new component type →
// React unmounted/remounted <select> elements → dropdowns collapsed instantly.
const Field = ({ label, field, type, options, readOnly, colSpan, isEditing, activePersonalInfo, personalInfo, setDraftPersonalInfo }: any) => {
    const fieldId = `profile-${field}`;
    const showsEditableControl = isEditing && !readOnly;

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
                    <textarea id={fieldId} name={field} autoComplete="off" className={`${INPUT_CLASS} min-h-[112px] resize-none sm:min-h-0`} style={{ colorScheme: 'light' }} rows={3} value={activePersonalInfo[field] || ''} onChange={(e) => setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value }))} />
                ) : type === 'boolean' ? (
                    <select id={fieldId} name={field} autoComplete="off" className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] ? 'Yes' : 'No'} onChange={(e) => setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value === 'Yes' }))}>
                        <option value="No" className="bg-white text-slate-700">No</option><option value="Yes" className="bg-white text-slate-700">Yes</option>
                    </select>
                ) : (
                    <input id={fieldId} name={field} autoComplete="off" spellCheck={false} type={type || 'text'} className={INPUT_CLASS} style={{ colorScheme: 'light' }} value={activePersonalInfo[field] || ''} onChange={(e) => {
                        if (field === 'dob') {
                            const dob = e.target.value;
                            let age = activePersonalInfo.age;
                            if (dob) { const b = new Date(dob); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; age = a >= 0 ? a : ''; }
                            setDraftPersonalInfo((prev: any) => ({ ...prev, dob, age }));
                        } else {
                            setDraftPersonalInfo((prev: any) => ({ ...prev, [field]: e.target.value }));
                        }
                    }} />
                )
            ) : (
                <p className="text-[15px] font-semibold leading-6 text-slate-700 break-words sm:text-sm sm:leading-5 sm:truncate" title={String(personalInfo[field] || '')}>
                    {type === 'boolean' ? (personalInfo[field] ? 'Yes' : 'No') : (personalInfo[field] || <span className="text-gray-300 italic font-normal">—</span>)}
                </p>
            )}
        </div>
    );
};

const Section = ({ icon, gradient, title, children, cardClass }: any) => (
    <div className={cardClass}>
        <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className={`p-1.5 bg-gradient-to-br ${gradient} text-white rounded-lg text-xs`}>{icon}</span> {title}</h4>
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 md:grid-cols-4">{children}</div>
    </div>
);

function ProfileViewContent(p: any) {
    const { profileTab, setProfileTab, personalInfo, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, Icons, attendanceMap, formatFullDate, uploadProfilePicture } = p;
    const [draftPersonalInfo, setDraftPersonalInfo] = React.useState(personalInfo);
    const profileCardClass = isEditing
        ? 'bg-white rounded-xl border border-blue-100/50 p-4 shadow-sm sm:p-6'
        : 'bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-4 shadow-sm card-hover sm:p-6';
    const profileSummaryCardClass = isEditing
        ? 'bg-white rounded-2xl border border-blue-100/50 p-4 shadow-sm sm:p-6'
        : 'bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-4 shadow-sm card-hover sm:p-6';
    const activePersonalInfo = isEditing ? draftPersonalInfo : personalInfo;
    const profileTabs = [
        { id: 'personal', label: 'Personal Info', mobileLabel: 'Personal', icon: <Icons.Profile /> },
        { id: 'engagement', label: 'Engagement', mobileLabel: 'Activity', icon: <Icons.Clock /> },
        { id: 'security', label: 'Security', mobileLabel: 'Security', icon: <Icons.Support /> },
    ];

    // Shared field props — passed to every <Field> to avoid repetition
    const fp = { isEditing, activePersonalInfo, personalInfo, setDraftPersonalInfo };

    React.useEffect(() => {
        if (!isEditing) {
            setDraftPersonalInfo(personalInfo);
        }
    }, [isEditing, personalInfo]);

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

    return (
        <div className={`flex flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8 ${isEditing ? 'student-profile-edit' : 'page-transition'}`} style={isEditing ? { colorScheme: 'light' } : undefined}>
            <div className={`w-full lg:w-80 lg:shrink-0 space-y-4 sm:space-y-6 ${isEditing ? '' : 'animate-fade-in-up'}`}>
                <div className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 text-white text-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl animate-float"></div>
                    <div className="h-20 bg-white/5 relative sm:h-24"></div>
                    <div className="px-5 pb-6 -mt-10 relative z-10 sm:px-8 sm:pb-8 sm:-mt-12">
                        {/* Avatar with photo support + upload button */}
                        <div className="relative mx-auto mb-4 h-20 w-20 sm:h-24 sm:w-24">
                            {personalInfo.profile_picture_url ? (
                                <img
                                    src={personalInfo.profile_picture_url}
                                    alt="Profile"
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
                            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm sm:py-1 sm:text-[10px]">{personalInfo.year}</span>
                            {personalInfo.section && <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm sm:py-1 sm:text-[10px]">Sec {personalInfo.section}</span>}
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 sm:py-1 sm:text-[10px]">{personalInfo.status}</span>
                        </div>
                        <button onClick={() => { setProfileTab('personal'); setIsEditing(true); }} className="mt-5 w-full rounded-xl border border-white/20 bg-white/15 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25 btn-press sm:mt-6 sm:py-2.5 sm:text-xs lg:mt-8">Edit Profile</button>
                    </div>
                </div>
                <div className={profileSummaryCardClass} style={{ animationDelay: '100ms' }}>
                    <h4 className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest mb-4">Academic Summary</h4>
                    <p className="text-[10px] text-gray-400">Department</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.department}</p>
                    <p className="text-[10px] text-gray-400">Course</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.course}</p>
                    <p className="text-[10px] text-gray-400">Year Level</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.year || '-'}</p>
                    <p className="text-[10px] text-gray-400">Section</p>
                    <p className="text-sm font-bold">{personalInfo.section || '-'}</p>
                </div>
                <div className={profileSummaryCardClass} style={{ animationDelay: '150ms' }}>
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-slate-500 to-slate-700 text-white rounded-lg text-xs"><Icons.Scholarship /></span> Academic Details</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
                        <Field {...fp} label="Year Level" field="year" type="select" options={[{ value: '1st Year', label: '1st Year' }, { value: '2nd Year', label: '2nd Year' }, { value: '3rd Year', label: '3rd Year' }, { value: '4th Year', label: '4th Year' }, { value: '5th Year', label: '5th Year' }]} readOnly />
                        <Field {...fp} label="Section" field="section" type="select" options={['A', 'B', 'C']} />
                        <Field {...fp} label="Priority Course" field="priorityCourse" readOnly colSpan={2} />
                        <Field {...fp} label="Alt Course 1" field="altCourse1" readOnly colSpan={2} />
                        <Field {...fp} label="Alt Course 2" field="altCourse2" readOnly colSpan={2} />
                    </div>
                </div>
            </div>
            <div className="flex-1 space-y-6">
                <div className={`bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 flex shadow-sm p-1 ${isEditing ? '' : 'animate-fade-in-up'}`} style={{ animationDelay: '100ms' }}>
                    {profileTabs.map((tab: any) => (
                        <button key={tab.id} onClick={() => { setProfileTab(tab.id); setIsEditing(false); }} className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-[10px] font-bold leading-tight transition-all sm:min-h-0 sm:flex-row sm:gap-2 sm:text-xs ${profileTab === tab.id ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-900 hover:bg-purple-50'}`}>
                            {tab.icon}
                            <span className="sm:hidden">{tab.mobileLabel}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {profileTab === 'personal' && (
                    <div className={`space-y-6 ${isEditing ? '' : 'animate-fade-in-up'}`} style={{ animationDelay: '200ms' }}>
                        <Section cardClass={profileCardClass} icon={<Icons.Profile />} gradient="from-blue-500 to-sky-400" title="Basic Information">
                            <Field {...fp} label="Last Name" field="lastName" />
                            <Field {...fp} label="First Name" field="firstName" />
                            <Field {...fp} label="Middle Name" field="middleName" />
                            <Field {...fp} label="Suffix" field="suffix" />
                            <Field {...fp} label="Date of Birth" field="dob" type="date" />
                            <Field {...fp} label="Age" field="age" readOnly />
                            <Field {...fp} label="Sex (Birth)" field="sex" type="select" options={['Male', 'Female']} />
                            <Field {...fp} label="Gender Identity" field="genderIdentity" type="select" options={['Cis-gender', 'Transgender', 'Non-binary', 'Prefer not to say']} />
                            <Field {...fp} label="Civil Status" field="civilStatus" type="select" options={['Single', 'Married', 'Separated Legally', 'Separated Physically', 'With Live-In Partner', 'Divorced', 'Widow/er']} />
                            <Field {...fp} label="Nationality" field="nationality" />
                            <Field {...fp} label="Religion" field="religion" />
                            <Field {...fp} label="Place of Birth" field="placeOfBirth" />
                        </Section>

                        <Section cardClass={profileCardClass} icon={<Icons.Events />} gradient="from-emerald-400 to-teal-500" title="Contact & Address">
                            <Field {...fp} label="Email" field="email" colSpan={2} />
                            <Field {...fp} label="Mobile" field="mobile" />
                            <Field {...fp} label="Facebook" field="facebookUrl" />
                            <Field {...fp} label="Street / Barangay" field="street" colSpan={2} />
                            <Field {...fp} label="City / Municipality" field="city" />
                            <Field {...fp} label="Province" field="province" />
                            <Field {...fp} label="Zip Code" field="zipCode" />
                            <Field {...fp} label="Current Residence" field="address" />
                        </Section>

                        <Section cardClass={profileCardClass} icon="👨‍👩‍👧" gradient="from-amber-400 to-orange-500" title="Family Background">
                            <Field {...fp} label="Mother's Last Name" field="motherLastName" />
                            <Field {...fp} label="Mother's Given Name" field="motherGivenName" />
                            <Field {...fp} label="Mother's Middle Name" field="motherMiddleName" />
                            <Field {...fp} label="Occupation" field="motherOccupation" />
                            <Field {...fp} label="Contact" field="motherContact" colSpan={2} />
                            <Field {...fp} label="Father's Last Name" field="fatherLastName" />
                            <Field {...fp} label="Father's Given Name" field="fatherGivenName" />
                            <Field {...fp} label="Father's Middle Name" field="fatherMiddleName" />
                            <Field {...fp} label="Occupation" field="fatherOccupation" />
                            <Field {...fp} label="Contact" field="fatherContact" colSpan={2} />
                            <Field {...fp} label="Parent's Address" field="parentAddress" colSpan={2} />
                            <Field {...fp} label="No. of Brothers" field="numBrothers" />
                            <Field {...fp} label="No. of Sisters" field="numSisters" />
                            <Field {...fp} label="Birth Order" field="birthOrder" type="select" options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child']} />
                            <Field {...fp} label="Spouse Name" field="spouseName" />
                            <Field {...fp} label="Spouse Occupation" field="spouseOccupation" />
                            <Field {...fp} label="No. of Children" field="numChildren" />
                        </Section>

                        <Section cardClass={profileCardClass} icon="🛡️" gradient="from-indigo-400 to-violet-500" title="Guardian">
                            <Field {...fp} label="Full Name" field="guardianName" colSpan={2} />
                            <Field {...fp} label="Address" field="guardianAddress" colSpan={2} />
                            <Field {...fp} label="Contact" field="guardianContact" />
                            <Field {...fp} label="Relation" field="guardianRelation" type="select" options={['Relative', 'Not relative', 'Landlord', 'Landlady']} />
                        </Section>

                        <Section cardClass={profileCardClass} icon="🚨" gradient="from-rose-400 to-red-500" title="Emergency Contact">
                            <Field {...fp} label="Full Name" field="emergencyName" colSpan={2} />
                            <Field {...fp} label="Address" field="emergencyAddress" colSpan={2} />
                            <Field {...fp} label="Relationship" field="emergencyRelationship" />
                            <Field {...fp} label="Contact Number" field="emergencyNumber" />
                        </Section>

                        <Section cardClass={profileCardClass} icon={<Icons.Assessment />} gradient="from-cyan-400 to-blue-500" title="Educational Background">
                            <Field {...fp} label="Elementary" field="elemSchool" colSpan={2} />
                            <Field {...fp} label="Yr Graduated" field="elemYearGraduated" colSpan={2} />
                            <Field {...fp} label="Junior High" field="juniorHighSchool" colSpan={2} />
                            <Field {...fp} label="Yr Graduated" field="juniorHighYearGraduated" colSpan={2} />
                            <Field {...fp} label="Senior High" field="seniorHighSchool" colSpan={2} />
                            <Field {...fp} label="Yr Graduated" field="seniorHighYearGraduated" colSpan={2} />
                            <Field {...fp} label="College" field="collegeSchool" colSpan={2} />
                            <Field {...fp} label="Yr Graduated" field="collegeYearGraduated" colSpan={2} />
                            <Field {...fp} label="School Last Attended" field="schoolLastAttended" colSpan={2} />
                            <Field {...fp} label="Honors / Awards" field="honorsAwards" colSpan={2} />
                        </Section>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                            <div className={profileCardClass}>
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-lg text-xs">🎭</span> Extra-Curricular</h4>
                                <Field {...fp} label="Activities" field="extracurricularActivities" type="textarea" />
                            </div>
                            <div className={profileCardClass}>
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-lg text-xs">🎓</span> Scholarships</h4>
                                <Field {...fp} label="Scholarships Availed" field="scholarshipsAvailed" type="textarea" />
                            </div>
                        </div>

                        <Section cardClass={profileCardClass} icon={<Icons.Counseling />} gradient="from-violet-400 to-purple-500" title="Special Status & Background">
                            <Field {...fp} label="Working Student" field="isWorkingStudent" type="boolean" />
                            {activePersonalInfo.isWorkingStudent && <Field {...fp} label="Type of Work" field="workingStudentType" />}
                            <Field {...fp} label="Supporter" field="supporter" />
                            <Field {...fp} label="Supporter Contact" field="supporterContact" />
                            <Field {...fp} label="PWD" field="isPwd" type="boolean" />
                            {activePersonalInfo.isPwd && <Field {...fp} label="PWD Type" field="pwdType" />}
                            <Field {...fp} label="Indigenous" field="isIndigenous" type="boolean" />
                            {activePersonalInfo.isIndigenous && <Field {...fp} label="Indigenous Group" field="indigenousGroup" />}
                            <Field {...fp} label="Witnessed Conflict" field="witnessedConflict" type="boolean" />
                            <Field {...fp} label="Safe in Community" field="isSafeInCommunity" type="boolean" />
                            <Field {...fp} label="Solo Parent" field="isSoloParent" type="boolean" />
                            <Field {...fp} label="Child of Solo Parent" field="isChildOfSoloParent" type="boolean" />
                        </Section>
                        {isEditing && (
                            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                                <button onClick={() => setIsEditing(false)} className="w-full rounded-xl border border-purple-100/50 bg-white/80 px-6 py-3 text-sm font-bold transition-all hover:bg-gray-50 sm:w-auto sm:py-2.5">Cancel</button>
                                <button onClick={() => { setPersonalInfo(draftPersonalInfo); saveProfileChanges(); }} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl btn-press sm:w-auto sm:py-2.5">Save Changes</button>
                            </div>
                        )}
                    </div>
                )}
                {profileTab === 'engagement' && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-5 shadow-sm card-hover animate-fade-in-up sm:p-8" style={{ animationDelay: '200ms' }}>
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
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-5 shadow-sm card-hover animate-fade-in-up sm:p-8" style={{ animationDelay: '200ms' }}>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 sm:mb-6"><span className="p-1.5 bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-lg"><Icons.Support /></span> Security Settings</h3>
                        <p className="text-sm text-gray-400">Manage your account security and password.</p>
                        <div className="mt-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100/30">
                            <p className="text-xs text-gray-500">Password management is handled through your NAT account. Contact the admin office for password resets.</p>
                        </div>
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
