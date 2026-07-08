import type { ProfileCompletionFormChangeHandler } from './types';

type ScholarshipsStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    textareaClass: string;
    gridTwoClass: string;
    yesNoOptions: string[];
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
};

export function ScholarshipsStep({
    formData,
    labelClass,
    inputClass,
    textareaClass,
    gridTwoClass,
    yesNoOptions,
    onAutoNA,
    onChange
}: ScholarshipsStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={labelClass}>Name of Scholarship Availed & Sponsor *</label>
                    <button type="button" onClick={() => onAutoNA('scholarshipsAvailed', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                </div>
                <textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={formData.scholarshipsAvailed} onChange={onChange} rows={4} className={textareaClass} />
            </div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Have You Been Criminally Charged Before Any Court? *</label><select name="hasBeenCriminallyCharged" value={formData.hasBeenCriminallyCharged} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-1.5"><label className={labelClass}>Have You Been Convicted of Any Crime? *</label><select name="hasBeenConvictedOfCrime" value={formData.hasBeenConvictedOfCrime} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            </div>
            {formData.hasBeenCriminallyCharged === 'Yes' && (
                <div className="space-y-1.5"><label className={labelClass}>If Yes, Indicate (Criminal Charge Details) *</label><textarea name="criminalChargeDetails" value={formData.criminalChargeDetails || ''} onChange={onChange} rows={3} className={textareaClass} /></div>
            )}
            {formData.hasBeenConvictedOfCrime === 'Yes' && (
                <div className="space-y-1.5"><label className={labelClass}>If Yes, Indicate (Crime Conviction Details) *</label><textarea name="crimeConvictionDetails" value={formData.crimeConvictionDetails || ''} onChange={onChange} rows={3} className={textareaClass} /></div>
            )}
        </div>
    );
}

