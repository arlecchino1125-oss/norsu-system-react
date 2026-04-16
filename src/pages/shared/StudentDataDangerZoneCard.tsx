import React from 'react';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    KeyRound,
    RefreshCw,
    ShieldAlert
} from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

export type StudentResetImpact = {
    students: number;
    applications: number;
    counselingRequests: number;
    supportRequests: number;
    notifications: number;
    officeVisits: number;
    generalFeedback: number;
    eventAttendance: number;
    submissions: number;
    answers: number;
    enrollmentKeys: number;
    linkedAuthUsers: number;
    scopedRecordCount: number;
};

type ResetOtpInfo = {
    maskedEmail?: string;
    expiresInMinutes?: number;
};

type StudentResetResult = {
    deletedStudentCount?: number;
    deletedLinkedAuthCount?: number;
    missingLinkedAuthCount?: number;
    impact?: StudentResetImpact;
};

type StudentDataDangerZoneCardProps = {
    portalLabel: string;
    loadImpact: () => Promise<{ impact?: StudentResetImpact; confirmationText?: string } | StudentResetImpact>;
    requestOtp: () => Promise<ResetOtpInfo | void>;
    confirmReset: (payload: {
        otp: string;
        reason: string;
        confirmationText: string;
    }) => Promise<StudentResetResult | void>;
    showToast?: (message: string, type?: ToastType) => void;
    onResetComplete?: () => void;
};

const INPUT_CLASS = 'w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-rose-400 focus:ring-4 focus:ring-rose-100';
const IMPACT_CARDS = [
    { key: 'students', label: 'Students' },
    { key: 'applications', label: 'Applications' },
    { key: 'counselingRequests', label: 'Counseling' },
    { key: 'supportRequests', label: 'Support Requests' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'officeVisits', label: 'Office Visits' },
    { key: 'generalFeedback', label: 'General Feedback' },
    { key: 'eventAttendance', label: 'Event Attendance' },
    { key: 'submissions', label: 'Form Submissions' },
    { key: 'answers', label: 'Form Answers' },
    { key: 'enrollmentKeys', label: 'Enrollment Keys' },
    { key: 'linkedAuthUsers', label: 'Linked Auth Users' }
] as const;

const StudentDataDangerZoneCard = ({
    portalLabel,
    loadImpact,
    requestOtp,
    confirmReset,
    showToast,
    onResetComplete
}: StudentDataDangerZoneCardProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [impact, setImpact] = React.useState<StudentResetImpact | null>(null);
    const [confirmationPhrase, setConfirmationPhrase] = React.useState('RESET STUDENT DATA');
    const [reason, setReason] = React.useState('');
    const [typedConfirmation, setTypedConfirmation] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [otpInfo, setOtpInfo] = React.useState<ResetOtpInfo | null>(null);
    const [isLoadingImpact, setIsLoadingImpact] = React.useState(false);
    const [isRequestingOtp, setIsRequestingOtp] = React.useState(false);
    const [isConfirmingReset, setIsConfirmingReset] = React.useState(false);

    const loadResetImpact = React.useCallback(async () => {
        setIsLoadingImpact(true);
        try {
            const result = await loadImpact();
            const nextImpact = result && typeof result === 'object' && 'impact' in result
                ? result.impact || null
                : (result as StudentResetImpact);
            const nextPhrase = result && typeof result === 'object' && 'confirmationText' in result
                ? String(result.confirmationText || 'RESET STUDENT DATA').trim().toUpperCase()
                : 'RESET STUDENT DATA';

            setImpact(nextImpact);
            setConfirmationPhrase(nextPhrase);
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to load student reset impact.', 'error');
        } finally {
            setIsLoadingImpact(false);
        }
    }, [loadImpact, showToast]);

    React.useEffect(() => {
        if (!isOpen || impact) return;
        void loadResetImpact();
    }, [impact, isOpen, loadResetImpact]);

    const otpHint = otpInfo?.maskedEmail
        ? `OTP sent to ${otpInfo.maskedEmail}${otpInfo.expiresInMinutes ? ` and expires in ${otpInfo.expiresInMinutes} minutes.` : '.'}`
        : '';

    const isPhraseMatched = typedConfirmation.trim().toUpperCase() === confirmationPhrase;

    const totalSummary = React.useMemo(() => {
        if (!impact) return 'Load the impact preview to review the current student-data footprint.';
        return `${impact.scopedRecordCount.toLocaleString()} scoped records and ${impact.linkedAuthUsers.toLocaleString()} linked auth account(s) are currently in scope.`;
    }, [impact]);

    const handleRequestOtp = async () => {
        setIsRequestingOtp(true);
        try {
            const result = await requestOtp();
            setOtpInfo(result || {});
            setOtp('');
            showToast?.('Reset OTP sent to your CARE Staff email.');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to send the student reset OTP.', 'error');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleConfirmReset = async () => {
        if (!reason.trim()) {
            showToast?.('Add a reset reason before continuing.', 'error');
            return;
        }

        if (!isPhraseMatched) {
            showToast?.(`Type "${confirmationPhrase}" to continue.`, 'error');
            return;
        }

        if (!otp.trim()) {
            showToast?.('Enter the OTP sent to your email.', 'error');
            return;
        }

        setIsConfirmingReset(true);
        try {
            const result = await confirmReset({
                otp: otp.trim(),
                reason: reason.trim(),
                confirmationText: typedConfirmation.trim()
            });

            const resetResult = result || {};

            setOtp('');
            setOtpInfo(null);
            setTypedConfirmation('');
            setReason('');
            showToast?.(
                `Student data reset complete. Deleted ${Number(resetResult.deletedStudentCount || 0).toLocaleString()} student record(s) and ${Number(resetResult.deletedLinkedAuthCount || 0).toLocaleString()} linked auth account(s).`
            );
            await loadResetImpact();
            onResetComplete?.();
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to reset student data.', 'error');
        } finally {
            setIsConfirmingReset(false);
        }
    };

    return (
        <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500/80">Advanced Data Controls</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Scoped student-data danger zone</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        This restricted area is for {portalLabel} only. It resets student-service records owned by CARE, not staff accounts, colleges, courses, forms, or full-system infrastructure.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                    {isOpen ? <EyeOff size={16} /> : <Eye size={16} />}
                    {isOpen ? 'Hide Restricted Controls' : 'Open Restricted Controls'}
                </button>
            </div>

            {isOpen && (
                <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-rose-200 bg-white/90 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Impact Preview</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{totalSummary}</p>
                            </div>
                            <button
                                type="button"
                                onClick={loadResetImpact}
                                disabled={isLoadingImpact}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={isLoadingImpact ? 'animate-spin' : ''} />
                                {isLoadingImpact ? 'Refreshing...' : 'Refresh Impact'}
                            </button>
                        </div>

                        {impact && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {IMPACT_CARDS.map((card) => (
                                    <div key={card.key} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">{card.label}</p>
                                        <p className="mt-3 text-2xl font-bold text-slate-900">
                                            {Number(impact[card.key] || 0).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Required safeguards</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                    This action requires an impact review, a written reason, an email OTP, and the exact confirmation phrase. All successful resets are audit-logged.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="space-y-4 rounded-2xl border border-rose-200 bg-white/90 p-5">
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Reset Reason</label>
                                <textarea
                                    rows={4}
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    className={INPUT_CLASS}
                                    placeholder="Explain why this student-data reset is necessary."
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Typed Confirmation</label>
                                <p className="mb-2 text-xs text-slate-500">
                                    Type <span className="font-bold text-rose-700">{confirmationPhrase}</span> to continue.
                                </p>
                                <input
                                    type="text"
                                    value={typedConfirmation}
                                    onChange={(event) => setTypedConfirmation(event.target.value)}
                                    className={INPUT_CLASS}
                                    placeholder={confirmationPhrase}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-rose-200 bg-white/90 p-5">
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">OTP Verification</p>
                                <p className="mt-2 text-sm text-slate-600">
                                    Send a one-time password to your current CARE Staff login email before executing this reset.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleRequestOtp}
                                disabled={isRequestingOtp || isConfirmingReset}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <KeyRound size={16} />
                                {isRequestingOtp ? 'Sending OTP...' : 'Send Reset OTP'}
                            </button>

                            {otpInfo && (
                                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                                    <p className="text-xs text-slate-600">{otpHint}</p>
                                    <label className="mb-2 mt-4 block text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">OTP Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value)}
                                        className={INPUT_CLASS}
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleConfirmReset}
                                disabled={!otpInfo || isConfirmingReset || isRequestingOtp}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <AlertTriangle size={16} />
                                {isConfirmingReset ? 'Resetting Student Data...' : 'Confirm Student Data Reset'}
                            </button>

                            <p className="text-[11px] leading-relaxed text-slate-500">
                                This reset stays inside the student-service domain. Staff accounts, department records, courses, forms, events, and full-system controls are not included.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDataDangerZoneCard;
