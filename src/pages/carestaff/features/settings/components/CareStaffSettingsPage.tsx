import StaffAccountSecurityPage from '../../../../shared/StaffAccountSecurityPage';
import StudentDataDangerZoneCard, { type StudentResetImpact } from '../../../../shared/StudentDataDangerZoneCard';
import type { AuthSession, ToastHandler } from '../../../types';

interface CareStaffSettingsPageProps {
    session?: AuthSession | null;
    showToastMessage: ToastHandler;
    requestStaffSecurityOtp: (purpose: 'password_change' | 'email_change', nextEmailValue?: string) => Promise<any>;
    confirmStaffSecurityEmailChange: (nextEmailValue: string, otp: string) => Promise<void>;
    confirmStaffPasswordChange: (nextPasswordValue: string, otp: string) => Promise<void>;
    updateStaffProfileName: (nextNameValue: string) => Promise<void>;
    studentActivationPolicy: {
        requireEnrollmentKey: boolean;
        updatedAt: string | null;
        updatedBy: string | null;
    };
    isLoadingStudentActivationPolicy: boolean;
    isSavingStudentActivationPolicy: boolean;
    toggleStudentActivationPolicy: () => Promise<void> | void;
    loadStudentResetImpact: () => Promise<{ impact?: StudentResetImpact; confirmationText?: string }>;
    requestStudentResetOtp: () => Promise<any>;
    confirmStudentReset: (payload: { otp: string; reason: string; confirmationText: string }) => Promise<any>;
}

const CareStaffSettingsPage = ({
    session,
    showToastMessage,
    requestStaffSecurityOtp,
    confirmStaffSecurityEmailChange,
    confirmStaffPasswordChange,
    updateStaffProfileName,
    studentActivationPolicy,
    isLoadingStudentActivationPolicy,
    isSavingStudentActivationPolicy,
    toggleStudentActivationPolicy,
    loadStudentResetImpact,
    requestStudentResetOtp,
    confirmStudentReset
}: CareStaffSettingsPageProps) => (
    <div className="space-y-6">
        <StaffAccountSecurityPage
            portalLabel="CARE Staff"
            authEmail={session?.user?.email || session?.auth_email || ''}
            staffName={session?.full_name || 'CARE Staff'}
            staffRole="Care Staff"
            requestStaffSecurityOtp={requestStaffSecurityOtp}
            confirmStaffSecurityEmailChange={confirmStaffSecurityEmailChange}
            confirmStaffPasswordChange={confirmStaffPasswordChange}
            updateStaffProfileName={updateStaffProfileName}
            showToast={showToastMessage}
        />
        <div className="rounded-3xl border border-purple-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-500/80">Student Activation Policy</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Require enrollment keys before Student Portal activation</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        When this is turned on, students must match an uploaded enrollment key before their Student Portal account can be activated.
                        When turned off, the portal still checks first, then shows a warning and lets the student continue like the previous NAT activation flow.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={toggleStudentActivationPolicy}
                    disabled={isLoadingStudentActivationPolicy || isSavingStudentActivationPolicy}
                    className={`relative inline-flex h-11 w-24 items-center rounded-full border px-1 transition-all ${
                        studentActivationPolicy.requireEnrollmentKey
                            ? 'border-emerald-200 bg-emerald-500/90'
                            : 'border-amber-200 bg-amber-400/90'
                    } ${(isLoadingStudentActivationPolicy || isSavingStudentActivationPolicy) ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                    aria-pressed={studentActivationPolicy.requireEnrollmentKey}
                >
                    <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition-transform ${
                            studentActivationPolicy.requireEnrollmentKey ? 'translate-x-0' : 'translate-x-12'
                        }`}
                    >
                        {studentActivationPolicy.requireEnrollmentKey ? 'ON' : 'OFF'}
                    </span>
                </button>
            </div>
            <div className={`mt-5 rounded-2xl border p-4 ${
                studentActivationPolicy.requireEnrollmentKey
                    ? 'border-emerald-100 bg-emerald-50/70'
                    : 'border-amber-100 bg-amber-50/80'
            }`}>
                <p className="text-sm font-semibold text-slate-800">
                    Current mode:{' '}
                    <span className={studentActivationPolicy.requireEnrollmentKey ? 'text-emerald-700' : 'text-amber-700'}>
                        {studentActivationPolicy.requireEnrollmentKey
                            ? 'Enrollment key required before activation'
                            : 'Warning first, then continue activation if no key exists'}
                    </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {isLoadingStudentActivationPolicy
                        ? 'Loading the latest activation policy...'
                        : studentActivationPolicy.requireEnrollmentKey
                            ? 'Students will stop at activation until CARE Staff uploads or syncs their enrollment key.'
                            : 'Students can review a warning and continue activation even if CARE Staff has not uploaded the enrollment key yet.'}
                </p>
            </div>
        </div>
        <StudentDataDangerZoneCard
            portalLabel="CARE Staff"
            loadImpact={loadStudentResetImpact}
            requestOtp={requestStudentResetOtp}
            confirmReset={confirmStudentReset}
            showToast={showToastMessage}
        />
    </div>
);

export default CareStaffSettingsPage;
