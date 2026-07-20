import type { ReactNode } from 'react';
import type { ProfileCompletionFormChangeHandler } from './types';

type SocioEconomicStepProps = {
    formData: any;
    labelClass: string;
    inputClass: string;
    textareaClass: string;
    gridTwoClass: string;
    gridThreeClass: string;
    yesNoOptions: string[];
    workTypeOptions: string[];
    pwdTypeOptions: string[];
    indigenousGroupOptions: string[];
    orphanCauseOptions: string[];
    documentUploads: readonly any[];
    renderDocumentInput: (config: any) => ReactNode;
    onAutoNA: (name: string, value?: string) => void;
    onChange: ProfileCompletionFormChangeHandler;
};

export function SocioEconomicStep({
    formData,
    labelClass,
    inputClass,
    textareaClass,
    gridTwoClass,
    gridThreeClass,
    yesNoOptions,
    workTypeOptions,
    pwdTypeOptions,
    indigenousGroupOptions,
    orphanCauseOptions,
    documentUploads,
    renderDocumentInput,
    onAutoNA,
    onChange
}: SocioEconomicStepProps) {
    return (
        <div className="space-y-4">
            <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Socio-Economic Background</h3><p className="text-sm leading-relaxed text-slate-400">Valid claims require supporting documents.</p></div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Financial Support and Work</p>
                <div className="space-y-1.5"><label htmlFor="supporter" className={labelClass}>Person/Agency Who Supports Your Studies Financially Other Than Yourself *</label><input id="supporter" name="supporter" value={formData.supporter} onChange={onChange} className={inputClass} /></div>
                <div className="space-y-1.5"><label htmlFor="supporterContact" className={labelClass}>Supporter Contact Information *</label><input id="supporterContact" name="supporterContact" value={formData.supporterContact} onChange={onChange} className={inputClass} /></div>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="isWorkingStudent" className={labelClass}>Are You a Working Student? *</label><select id="isWorkingStudent" name="isWorkingStudent" value={formData.isWorkingStudent} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="workingStudentType" className={labelClass}>Type of Work *</label><select id="workingStudentType" name="workingStudentType" value={formData.workingStudentType} onChange={onChange} className={inputClass}><option value="">Select</option>{workTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                {formData.workingStudentType === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="workingStudentTypeOther" className={labelClass}>Specify Type of Work *</label><input id="workingStudentTypeOther" name="workingStudentTypeOther" value={formData.workingStudentTypeOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                <div className={gridTwoClass}>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="employerName" className={labelClass}>Name of Employer *</label>
                            <button type="button" onClick={() => onAutoNA('employerName', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input id="employerName" name="employerName" placeholder="N/A if not applicable" value={formData.employerName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="employerAddress" className={labelClass}>Address of Employer *</label>
                            <button type="button" onClick={() => onAutoNA('employerAddress', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input id="employerAddress" name="employerAddress" placeholder="N/A if not applicable" value={formData.employerAddress} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="workExperiences" className={labelClass}>Work Experiences *</label>
                        <button type="button" onClick={() => onAutoNA('workExperiences', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                    </div>
                    <textarea id="workExperiences" name="workExperiences" placeholder="N/A if not applicable" value={formData.workExperiences} onChange={onChange} rows={4} className={textareaClass} />
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">PWD Claim</p>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="isPwd" className={labelClass}>Are You a Person with a Disability (PWD)? *</label><select id="isPwd" name="isPwd" value={formData.isPwd} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="pwdNumber" className={labelClass}>PWD # *</label>
                            <button type="button" onClick={() => onAutoNA('pwdNumber', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input id="pwdNumber" name="pwdNumber" placeholder="RR-PPMM-BB-NNNNNNN or N/A" value={formData.pwdNumber} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="pwdType" className={labelClass}>Type of Disability *</label><select id="pwdType" name="pwdType" value={formData.pwdType} onChange={onChange} className={inputClass}><option value="">Select</option>{pwdTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="disabilityCause" className={labelClass}>Cause of Disability *</label>
                            <button type="button" onClick={() => onAutoNA('disabilityCause', 'N/A')} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors">Auto N/A</button>
                        </div>
                        <input id="disabilityCause" name="disabilityCause" placeholder="N/A if not applicable" value={formData.disabilityCause} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                {formData.pwdType === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="pwdTypeOther" className={labelClass}>Specify Type of Disability *</label><input id="pwdTypeOther" name="pwdTypeOther" value={formData.pwdTypeOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                {formData.isPwd === 'Yes' && renderDocumentInput(documentUploads[0])}
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Cultural Community and 4Ps</p>
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="isIndigenous" className={labelClass}>Member of Indigenous Group / Cultural Community? *</label><select id="isIndigenous" name="isIndigenous" value={formData.isIndigenous} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="indigenousGroup" className={labelClass}>If Yes, Choose Below *</label><select id="indigenousGroup" name="indigenousGroup" value={formData.indigenousGroup} onChange={onChange} className={inputClass}><option value="">Select</option>{indigenousGroupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                {formData.indigenousGroup === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="indigenousGroupOther" className={labelClass}>Specify Indigenous Group *</label><input id="indigenousGroupOther" name="indigenousGroupOther" value={formData.indigenousGroupOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                {formData.isIndigenous === 'Yes' && renderDocumentInput(documentUploads[1])}
                <div className="space-y-1.5"><label htmlFor="isFourPsMember" className={labelClass}>Are You a Member of 4Ps? *</label><select id="isFourPsMember" name="isFourPsMember" value={formData.isFourPsMember} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                {formData.isFourPsMember === 'Yes' && renderDocumentInput(documentUploads[2])}
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Other Claims</p>
                <div className={gridThreeClass}>
                    <div className="space-y-1.5"><label htmlFor="isRebelReturnee" className={labelClass}>Are You a Rebel Returnee? *</label><select id="isRebelReturnee" name="isRebelReturnee" value={formData.isRebelReturnee} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="isChildOfSoloParent" className={labelClass}>Son/Daughter of a Solo Parent? *</label><select id="isChildOfSoloParent" name="isChildOfSoloParent" value={formData.isChildOfSoloParent} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="isSoloParent" className={labelClass}>Are You a Solo Parent Yourself? *</label><select id="isSoloParent" name="isSoloParent" value={formData.isSoloParent} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                {(formData.isSoloParent === 'Yes' || formData.isChildOfSoloParent === 'Yes') && renderDocumentInput(documentUploads[3])}
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="isOrphan" className={labelClass}>Are You an Orphan? *</label><select id="isOrphan" name="isOrphan" value={formData.isOrphan} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="orphanCause" className={labelClass}>If Yes, Cause *</label><select id="orphanCause" name="orphanCause" value={formData.orphanCause} onChange={onChange} className={inputClass}><option value="">Select</option>{orphanCauseOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                {formData.orphanCause === 'Other' && (
                    <div className="space-y-1.5"><label htmlFor="orphanCauseOther" className={labelClass}>Specify Cause of Being an Orphan *</label><input id="orphanCauseOther" name="orphanCauseOther" value={formData.orphanCauseOther || ''} onChange={onChange} className={inputClass} /></div>
                )}
                <div className={gridTwoClass}>
                    <div className="space-y-1.5"><label htmlFor="isHomelessCitizen" className={labelClass}>Are You a Homeless Citizen? *</label><select id="isHomelessCitizen" name="isHomelessCitizen" value={formData.isHomelessCitizen} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                    <div className="space-y-1.5"><label htmlFor="isSeniorCitizen" className={labelClass}>Are You a Senior Citizen? *</label><select id="isSeniorCitizen" name="isSeniorCitizen" value={formData.isSeniorCitizen} onChange={onChange} className={inputClass}><option value="">Select</option>{yesNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                {formData.isSeniorCitizen === 'Yes' && renderDocumentInput(documentUploads[4])}
            </div>
        </div>
    );
}
