import type { ProfileCompletionFormChangeHandler } from './types';

type EmergencyContactStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    gridTwoClass: string;
    guardianRelationOptions: string[];
    onChange: ProfileCompletionFormChangeHandler;
};

export function EmergencyContactStep({
    formData,
    labelClass,
    inputClass,
    gridTwoClass,
    guardianRelationOptions,
    onChange
}: EmergencyContactStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (In Case of Emergency)</h3></div>
            <div className="space-y-1.5"><label className={labelClass}>Full Name *</label><input name="emergencyName" value={formData.emergencyName} onChange={onChange} className={inputClass} /></div>
            <div className="space-y-1.5"><label className={labelClass}>Address *</label><input name="emergencyAddress" value={formData.emergencyAddress} onChange={onChange} className={inputClass} /></div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label className={labelClass}>Relationship *</label><select name="emergencyRelationship" value={formData.emergencyRelationship} onChange={onChange} className={inputClass}><option value="">Select</option>{guardianRelationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-1.5"><label className={labelClass}>Contact Number *</label><input name="emergencyNumber" value={formData.emergencyNumber} onChange={onChange} className={inputClass} /></div>
            </div>
        </div>
    );
}

