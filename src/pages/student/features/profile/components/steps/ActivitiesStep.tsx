import type { ProfileCompletionFormChangeHandler } from './types';

type ActivitiesStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    textareaClass: string;
    gridTwoClass: string;
    yesNoOptions: string[];
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
};

export function ActivitiesStep({
    formData,
    labelClass,
    inputClass,
    textareaClass,
    gridTwoClass,
    yesNoOptions,
    onAutoNA,
    onChange
}: ActivitiesStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Name of Voluntary Activities *</label>
                    <button type="button" onClick={() => onAutoNA('extracurricularActivities', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={formData.extracurricularActivities} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Do You Hold a Local/National Position in Public Service? *</label><select name="holdsPublicServicePosition" value={formData.holdsPublicServicePosition} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Position in Public Service *</label>
                        <button type="button" onClick={() => onAutoNA('publicServicePosition', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <input name="publicServicePosition" placeholder="N/A if not applicable" value={formData.publicServicePosition} onChange={onChange} className={inputClass} />
                </div>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Organizations You Are a Member Of *</label>
                    <button type="button" onClick={() => onAutoNA('organizationsMemberships', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="organizationsMemberships" value={formData.organizationsMemberships} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Sports You Are Good At *</label>
                    <button type="button" onClick={() => onAutoNA('sportsSkills', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="sportsSkills" value={formData.sportsSkills} onChange={onChange} rows={3} className={textareaClass} />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Other Talent/s *</label>
                    <button type="button" onClick={() => onAutoNA('otherTalents', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="otherTalents" value={formData.otherTalents} onChange={onChange} rows={3} className={textareaClass} />
            </div>
        </div>
    );
}

