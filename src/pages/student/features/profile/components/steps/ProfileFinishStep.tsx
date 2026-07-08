type ProfileFinishStepProps = {
    agreedToPrivacy: boolean;
    onPrivacyAgreementChange: (agreed: boolean) => void;
};

export function ProfileFinishStep({
    agreedToPrivacy,
    onPrivacyAgreementChange
}: ProfileFinishStepProps) {
    return (
        <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-slate-200"><svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
            <h3 className="text-xl font-bold text-slate-800 sm:text-2xl">Final Step</h3>
            <p className="text-slate-500 text-sm">Please agree to the data privacy terms to complete your profile.</p>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-left sm:p-6">
                <h4 className="text-sm font-bold text-indigo-900 mb-2">DATA PRIVACY ACT DISCLAIMER</h4>
                <p className="text-xs text-indigo-800/80 mb-5 leading-relaxed">By submitting this form, I hereby authorize Negros Oriental State University (NORSU) to collect, process, and retain my personal and sensitive information for purposes of academic administration, student services, and university records in strict accordance with the Data Privacy Act of 2012 (RA 10173).</p>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${agreedToPrivacy ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>{agreedToPrivacy && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}</div>
                    <input type="checkbox" checked={agreedToPrivacy} onChange={(event) => onPrivacyAgreementChange(event.target.checked)} className="hidden" />
                    <span className="text-sm font-bold text-slate-800">I have read and agree to the terms</span>
                </label>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-left"><p className="text-xs text-emerald-700 italic leading-relaxed">Thank you for taking the time to complete this form. Your responses will help us serve you better. If you have any questions or need further assistance, please feel free to reach out. We appreciate your time and cooperation! Don't forget to take a screenshot of proof of submission of this form and present it to the CARE Center Staff assigned in the Stamping Area during enrollment. Thank you.</p></div>
        </div>
    );
}

