import type { ProfileCompletionFormChangeHandler } from './types';

type BirthOrderOption = {
    value: string;
    label: string;
};

type FamilyBackgroundStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    textareaClass: string;
    gridTwoClass: string;
    gridThreeClass: string;
    familyStatusOptions: string[];
    pregnancyOptions: string[];
    birthOrderOptions: BirthOrderOption[];
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
};

export function FamilyBackgroundStep({
    formData,
    labelClass,
    inputClass,
    textareaClass,
    gridTwoClass,
    gridThreeClass,
    familyStatusOptions,
    pregnancyOptions,
    birthOrderOptions,
    onAutoNA,
    onChange
}: FamilyBackgroundStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Spouse and Children</p>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Name of Spouse *</label>
                            <button type="button" onClick={() => onAutoNA('spouseName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="spouseName" placeholder="N/A if not applicable" value={formData.spouseName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Spouse's Occupation *</label>
                            <button type="button" onClick={() => onAutoNA('spouseOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="spouseOccupation" placeholder="N/A if not applicable" value={formData.spouseOccupation} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Spouse's Contact Number *</label>
                            <button type="button" onClick={() => onAutoNA('spouseContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="spouseContact" placeholder="N/A if not applicable" value={formData.spouseContact} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Spouse's Employer/Business Name *</label>
                            <button type="button" onClick={() => onAutoNA('spouseEmployerName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="spouseEmployerName" placeholder="N/A if not applicable" value={formData.spouseEmployerName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Spouse's Employer/Business Address *</label>
                            <button type="button" onClick={() => onAutoNA('spouseEmployerAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="spouseEmployerAddress" placeholder="N/A if not applicable" value={formData.spouseEmployerAddress} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Number of Children *</label>
                            <button type="button" onClick={() => onAutoNA('numChildren', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="numChildren" placeholder="N/A if not applicable" value={formData.numChildren} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5"><label className={labelClass}>Currently Pregnant? *</label><select name="currentlyPregnant" value={formData.currentlyPregnant} onChange={onChange} className={inputClass}><option value="">Select</option>{pregnancyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Name of Children - Date of Birth *</label>
                        <button type="button" onClick={() => onAutoNA('childrenNamesBirthdates', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <textarea name="childrenNamesBirthdates" placeholder="N/A if not applicable" value={formData.childrenNamesBirthdates} onChange={onChange} rows={3} className={textareaClass} />
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Mother</p>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Mother's Maiden Last Name *</label>
                            <button type="button" onClick={() => onAutoNA('motherLastName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="motherLastName" placeholder="N/A if not applicable" value={formData.motherLastName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Mother's Given Name *</label>
                            <button type="button" onClick={() => onAutoNA('motherGivenName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="motherGivenName" placeholder="N/A if not applicable" value={formData.motherGivenName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Mother's Maiden Middle Name *</label>
                            <button type="button" onClick={() => onAutoNA('motherMiddleName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="motherMiddleName" placeholder="N/A if not applicable" value={formData.motherMiddleName} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Mother's Occupation *</label>
                            <button type="button" onClick={() => onAutoNA('motherOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="motherOccupation" placeholder="N/A if not applicable" value={formData.motherOccupation} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5"><label className={labelClass}>Mother's Status *</label><select name="motherStatus" value={formData.motherStatus} onChange={onChange} className={inputClass}><option value="">Select</option>{familyStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Mother's Contact Number *</label>
                            <button type="button" onClick={() => onAutoNA('motherContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="motherContact" placeholder="N/A if not applicable" value={formData.motherContact} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Mother's Address *</label>
                        <button type="button" onClick={() => onAutoNA('motherAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <input name="motherAddress" placeholder="N/A if not applicable" value={formData.motherAddress} onChange={onChange} className={inputClass} />
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Father</p>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Father's Last Name *</label>
                            <button type="button" onClick={() => onAutoNA('fatherLastName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="fatherLastName" placeholder="N/A if not applicable" value={formData.fatherLastName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Father's Given Name *</label>
                            <button type="button" onClick={() => onAutoNA('fatherGivenName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="fatherGivenName" placeholder="N/A if not applicable" value={formData.fatherGivenName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Father's Middle Name *</label>
                            <button type="button" onClick={() => onAutoNA('fatherMiddleName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="fatherMiddleName" placeholder="N/A if not applicable" value={formData.fatherMiddleName} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Father's Occupation *</label>
                            <button type="button" onClick={() => onAutoNA('fatherOccupation', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="fatherOccupation" placeholder="N/A if not applicable" value={formData.fatherOccupation} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5"><label className={labelClass}>Father's Status *</label><select name="fatherStatus" value={formData.fatherStatus} onChange={onChange} className={inputClass}><option value="">Select</option>{familyStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Father's Contact Number *</label>
                            <button type="button" onClick={() => onAutoNA('fatherContact', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="fatherContact" placeholder="N/A if not applicable" value={formData.fatherContact} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Father's Address *</label>
                        <button type="button" onClick={() => onAutoNA('fatherAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <input name="fatherAddress" placeholder="N/A if not applicable" value={formData.fatherAddress} onChange={onChange} className={inputClass} />
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Family Order</p>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={labelClass}>Number of Children Your Parents Have *</label>
                            <button type="button" onClick={() => onAutoNA('parentsNumChildren', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input name="parentsNumChildren" placeholder="N/A if not applicable" value={formData.parentsNumChildren} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5"><label className={labelClass}>Your Birth Order in the Family *</label><select name="birthOrder" value={formData.birthOrder} onChange={onChange} className={inputClass}><option value="">Select</option>{birthOrderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                </div>
                {formData.birthOrder === 'Other' && (
                    <div className="space-y-1.5"><label className={labelClass}>Specify Birth Order *</label><input name="birthOrderOther" value={formData.birthOrderOther} onChange={onChange} className={inputClass} /></div>
                )}
            </div>
        </div>
    );
}

