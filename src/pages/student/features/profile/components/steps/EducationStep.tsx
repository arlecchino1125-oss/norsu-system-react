import type { ProfileCompletionFormChangeHandler } from './types';

type EducationStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    textareaClass: string;
    gridTwoClass: string;
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
};

export function EducationStep({
    formData,
    labelClass,
    inputClass,
    textareaClass,
    gridTwoClass,
    onAutoNA,
    onChange
}: EducationStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Elementary: Name of School *</label><input name="elemSchool" value={formData.elemSchool} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label className={labelClass}>Inclusive Years Attended *</label><input name="elemYearGraduated" value={formData.elemYearGraduated} onChange={onChange} className={inputClass} /></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Junior High School: Name of School *</label><input name="juniorHighSchool" value={formData.juniorHighSchool} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label className={labelClass}>Inclusive Years Attended *</label><input name="juniorHighYearGraduated" value={formData.juniorHighYearGraduated} onChange={onChange} className={inputClass} /></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Senior High School: Name of School *</label><input name="seniorHighSchool" value={formData.seniorHighSchool} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label className={labelClass}>Inclusive Years Attended *</label><input name="seniorHighYearGraduated" value={formData.seniorHighYearGraduated} onChange={onChange} className={inputClass} /></div>
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>If Transferee, College: Name of School *</label>
                        <button type="button" onClick={() => onAutoNA('collegeSchool', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <input name="collegeSchool" placeholder="N/A if not applicable" value={formData.collegeSchool} onChange={onChange} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Inclusive Years Attended *</label>
                        <button type="button" onClick={() => onAutoNA('collegeYearGraduated', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <input name="collegeYearGraduated" placeholder="N/A if not applicable" value={formData.collegeYearGraduated} onChange={onChange} className={inputClass} />
                </div>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Honor/Award Received. List from Elementary *</label>
                    <button type="button" onClick={() => onAutoNA('honorsAwards', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="honorsAwards" placeholder="N/A if not applicable" value={formData.honorsAwards} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>TESDA NC II Acquired - Date Acquired - Validity *</label>
                    <button type="button" onClick={() => onAutoNA('tesdaNc2Acquired', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="tesdaNc2Acquired" placeholder="N/A if none" value={formData.tesdaNc2Acquired} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Eligibility Acquired - Date Acquired *</label>
                    <button type="button" onClick={() => onAutoNA('eligibilityAcquired', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="eligibilityAcquired" placeholder="N/A if none" value={formData.eligibilityAcquired} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Special Trainings Attended *</label>
                    <button type="button" onClick={() => onAutoNA('specialTrainingsAttended', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="specialTrainingsAttended" placeholder="N/A if none" value={formData.specialTrainingsAttended} onChange={onChange} rows={3} className={textareaClass} />
            </div>
        </div>
    );
}

