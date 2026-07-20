import type React from 'react';
import DatePicker from '../../../../../../components/ui/DatePicker';
import SearchableSelect from '../../../../../../components/ui/SearchableSelect';
import { ResolvedProfileImage } from '../../../../../../components/ResolvedProfileImage';
import type { ProfileCompletionFormChangeHandler } from './types';

type YearLevelOption = {
    value: string;
    label: string;
};

type PersonalInformationStepProps = {
    formData: any;
    personalInfo: any;
    profilePhotoPreviewUrl: string;
    visibleCollegeOptions: string[];
    visibleProgramOptions: string[];
    regionOptions: string[];
    yearLevelOptions: YearLevelOption[];
    labelClass: string;
    inputClass: string;
    readOnlyClass: string;
    gridTwoClass: string;
    gridThreeClass: string;
    showToast: (message: string, type?: string) => void;
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
    onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDateOfBirthChange: (value: string) => void;
    onDepartmentChange: (value: string) => void;
    onCourseChange: (value: string) => void;
};

export function PersonalInformationStep({
    formData,
    personalInfo,
    profilePhotoPreviewUrl,
    visibleCollegeOptions,
    visibleProgramOptions,
    regionOptions,
    yearLevelOptions,
    labelClass,
    inputClass,
    readOnlyClass,
    gridTwoClass,
    gridThreeClass,
    showToast,
    onAutoNA,
    onChange,
    onPhotoChange,
    onDateOfBirthChange,
    onDepartmentChange,
    onCourseChange
}: PersonalInformationStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-sm leading-relaxed text-slate-400">Review the pre-filled identity details and complete the required personal information.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {profilePhotoPreviewUrl || formData.profilePictureUrl ? (
                            <ResolvedProfileImage
                                storedValue={profilePhotoPreviewUrl || formData.profilePictureUrl}
                                studentId={String(formData.studentId || personalInfo?.studentId || personalInfo?.student_id || '')}
                                alt="Profile portrait preview"
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-black text-slate-300">
                                {formData.firstName?.[0] || 'S'}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                    <label htmlFor="profilePhoto" className={labelClass}>Photo/Portrait *</label>
                    <input id="profilePhoto" type="file" accept="image/*" onChange={onPhotoChange} className="block w-full text-sm text-indigo-900 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700" />
                        <p className="text-xs text-slate-400">Upload a clear ID-style image under 1 MB.</p>
                    </div>
                </div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="studentId" className={labelClass}>Student ID No. *</label><input id="studentId" name="studentId" value={formData.studentId || personalInfo?.studentId || ''} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="lastName" className={labelClass}>Last Name *</label><input id="lastName" name="lastName" value={formData.lastName} readOnly className={readOnlyClass} /></div>
                <div className="space-y-1.5"><label htmlFor="firstName" className={labelClass}>Given Name *</label><input id="firstName" name="firstName" value={formData.firstName} readOnly className={readOnlyClass} /></div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="suffix" className={labelClass}>Extension Name *</label>
                        <button type="button" onClick={() => onAutoNA('suffix', '0')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto 0</button>
                    </div>
                    <input id="suffix" name="suffix" value={formData.suffix} onChange={onChange} placeholder="0 if none" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="middleName" className={labelClass}>Middle Name *</label>
                        <button type="button" onClick={() => onAutoNA('middleName', '0')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto 0</button>
                    </div>
                    <input id="middleName" name="middleName" value={formData.middleName} onChange={onChange} placeholder="0 if no middle name" className={inputClass} />
                </div>
            </div>
            <div className="space-y-1.5"><label htmlFor="profileStreet" className={labelClass}>Permanent Address - Street/Sitio & Barangay *</label><input id="profileStreet" name="street" value={formData.street} onChange={onChange} placeholder="House No., Block, Lot, Street/Sitio, Barangay" className={inputClass} /></div>
            <div className={gridThreeClass}>
                <div className="space-y-1.5"><label htmlFor="profileCity" className={labelClass}>Town/City Municipality *</label><input id="profileCity" name="city" value={formData.city} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="profileProvince" className={labelClass}>Province *</label><input id="profileProvince" name="province" value={formData.province} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="profileZipCode" className={labelClass}>Zip Code *</label><input id="profileZipCode" name="zipCode" value={formData.zipCode} onChange={onChange} className={inputClass} /></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="profileRegion" className={labelClass}>Region *</label><select id="profileRegion" name="region" value={formData.region} onChange={onChange} className={inputClass}><option value="">Select</option>{regionOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                {formData.region === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="regionOther" className={labelClass}>Specify Region *</label><input id="regionOther" name="regionOther" value={formData.regionOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                <div className="space-y-1.5"><label htmlFor="profileMobile" className={labelClass}>Contact Number *</label><input id="profileMobile" name="mobile" value={formData.mobile} onChange={onChange} placeholder="09123456789" className={inputClass} /></div>
            </div>
            <div className={gridThreeClass}>
                <div className="space-y-1.5"><p className={labelClass}>Birthday *</p><DatePicker required name="dob" value={formData.dob} onChange={onDateOfBirthChange} placeholder="YYYY-MM-DD" className="[&>button]:min-h-[3rem] [&>button]:rounded-xl [&>button]:border-slate-200 [&>button]:bg-slate-50 [&>button]:px-4 [&>button]:py-3 [&>button]:text-[16px] sm:[&>button]:py-2.5 sm:[&>button]:text-sm" /></div>
                <div className="space-y-1.5"><label htmlFor="profileAge" className={labelClass}>Age</label><input id="profileAge" name="age" value={formData.age} onChange={onChange} className={inputClass} readOnly /></div>
                <div className="space-y-1.5"><label htmlFor="profileSex" className={labelClass}>Sex Assigned at Birth *</label><select id="profileSex" name="sex" value={formData.sex} onChange={onChange} className={inputClass}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="genderIdentity" className={labelClass}>Gender *</label><select id="genderIdentity" name="genderIdentity" value={formData.genderIdentity} onChange={onChange} className={inputClass}><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary gender">Non-binary gender</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                <div className="space-y-1.5"><label htmlFor="nationality" className={labelClass}>Citizenship *</label><input id="nationality" name="nationality" value={formData.nationality} onChange={onChange} placeholder="Filipino" className={inputClass} /></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="facebookUrl" className={labelClass}>FB Account Link *</label><input id="facebookUrl" name="facebookUrl" value={formData.facebookUrl} onChange={onChange} placeholder="https://www.facebook.com/yourname" className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="placeOfBirth" className={labelClass}>Place of Birth *</label><input id="placeOfBirth" name="placeOfBirth" value={formData.placeOfBirth} onChange={onChange} placeholder="City/Municipality, Province" className={inputClass} /></div>
            </div>
            <div className="space-y-1.5"><label htmlFor="religion" className={labelClass}>Religion *</label><input id="religion" name="religion" value={formData.religion} onChange={onChange} className={inputClass} /></div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="yearLevelApplying" className={labelClass}>Year Level *</label><select id="yearLevelApplying" name="yearLevelApplying" value={formData.yearLevelApplying} onChange={onChange} className={inputClass}><option value="">Select</option>{yearLevelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                {formData.yearLevelApplying === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="yearLevelOther" className={labelClass}>Specify Year Level *</label><input id="yearLevelOther" name="yearLevelOther" value={formData.yearLevelOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                <div className="space-y-1.5"><label htmlFor="civilStatus" className={labelClass}>Civil Status *</label><select id="civilStatus" name="civilStatus" value={formData.civilStatus} onChange={onChange} className={inputClass}><option value="">Select</option><option value="Single">Single</option><option value="Cohabitation (Live-In)">Cohabitation (Live-In)</option><option value="Was Previously Married But Separated">Was Previously Married But Separated</option><option value="Married">Married</option><option value="Widow/er">Widow/er</option></select></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5">
                    <SearchableSelect
                        label="College"
                        required
                        disabled={true}
                        onDisabledClick={() => showToast('College is automatically set based on your selected program.', 'info')}
                        value={formData.department}
                        onChange={onDepartmentChange}
                        options={visibleCollegeOptions.map(opt => ({ label: opt, value: opt }))}
                        placeholder="Auto-filled from program"
                    />
                </div>
                <div className="space-y-1.5">
                    <SearchableSelect
                        label="Program"
                        required
                        value={formData.course}
                        onChange={onCourseChange}
                        options={visibleProgramOptions.map(opt => ({ label: opt, value: opt }))}
                        placeholder="What's your program/course?"
                    />
                </div>
            </div>
        </div>
    );
}

