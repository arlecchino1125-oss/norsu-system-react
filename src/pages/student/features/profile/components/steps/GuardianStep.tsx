import type { ProfileCompletionFormChangeHandler } from './types';

type GuardianStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    gridTwoClass: string;
    guardianRelationOptions: string[];
    onChange: ProfileCompletionFormChangeHandler;
};

export function GuardianStep({
    formData,
    labelClass,
    inputClass,
    gridTwoClass,
    guardianRelationOptions,
    onChange
}: GuardianStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
            <div className="space-y-1.5"><label htmlFor="guardianName" className={labelClass}>Full Name *</label><input id="guardianName" name="guardianName" value={formData.guardianName} onChange={onChange} className={inputClass} /></div>
            <div className="space-y-1.5"><label htmlFor="guardianAddress" className={labelClass}>Address *</label><input id="guardianAddress" name="guardianAddress" value={formData.guardianAddress} onChange={onChange} className={inputClass} /></div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="guardianContact" className={labelClass}>Contact Number *</label><input id="guardianContact" name="guardianContact" value={formData.guardianContact} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="guardianRelation" className={labelClass}>Relation to the Guardian *</label><select id="guardianRelation" name="guardianRelation" value={formData.guardianRelation} onChange={onChange} className={inputClass}><option value="">Select</option>{guardianRelationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            </div>
        </div>
    );
}

