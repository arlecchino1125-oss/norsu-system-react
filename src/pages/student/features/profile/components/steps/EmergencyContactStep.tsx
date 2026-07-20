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
            <div className="space-y-1.5"><label htmlFor="emergencyName" className={labelClass}>Full Name *</label><input id="emergencyName" name="emergencyName" value={formData.emergencyName} onChange={onChange} className={inputClass} /></div>
            <div className="space-y-1.5"><label htmlFor="emergencyAddress" className={labelClass}>Address *</label><input id="emergencyAddress" name="emergencyAddress" value={formData.emergencyAddress} onChange={onChange} className={inputClass} /></div>
            <div className={gridTwoClass}>
                <div className="space-y-1.5"><label htmlFor="emergencyRelationship" className={labelClass}>Relationship *</label><select id="emergencyRelationship" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={onChange} className={inputClass}><option value="">Select</option>{guardianRelationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-1.5"><label htmlFor="emergencyNumber" className={labelClass}>Contact Number *</label><input id="emergencyNumber" name="emergencyNumber" value={formData.emergencyNumber} onChange={onChange} className={inputClass} /></div>
            </div>
        </div>
    );
}

