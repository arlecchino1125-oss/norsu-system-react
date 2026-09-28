import React, { useState } from 'react';
import {
    Activity,
    AlertCircle,
    ArrowRightCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
    XCircle
} from 'lucide-react';
import { ContextMenu, ContextMenuPosition } from '../../../../../components/ui/ContextMenu';
import {
    COUNSELING_STATUS,
    isCounselingFollowUpEligible,
    isCounselingReschedulable
} from '../../../../../utils/workflow';
import { toTitleCase } from '../../../../../utils/formatters';

export type CounselingOutcomeType = 'Counseled' | 'Monitoring' | 'Subject_For_2nd_Counseling';

export interface CounselingOutcomeMenuProps {
    request: any;
    open: boolean;
    position: ContextMenuPosition | null;
    onClose: () => void;
    onSelectOutcome: (request: any, outcomeStatus: CounselingOutcomeType, notes?: string) => Promise<void> | void;
    onReschedule: (request: any) => void;
    onScheduleFollowUp: (request: any) => void;
    canManageOutcome: boolean;
    canManageCounseling: boolean;
}

export const CounselingOutcomeMenu: React.FC<CounselingOutcomeMenuProps> = ({
    request,
    open,
    position,
    onClose,
    onSelectOutcome,
    onReschedule,
    onScheduleFollowUp,
    canManageOutcome,
    canManageCounseling
}) => {
    const [pendingOutcome, setPendingOutcome] = useState<CounselingOutcomeType | null>(null);
    const [confirmNotes, setConfirmNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!request) return null;

    const isOutcomeEligible = request?.status === COUNSELING_STATUS.COMPLETED;
    const canSetOutcome = canManageOutcome && isOutcomeEligible;
    const isReschedulable = isCounselingReschedulable(request?.status);
    const isFollowUpEligible = isCounselingFollowUpEligible(request?.status);

    const handleOutcomeClick = (outcome: CounselingOutcomeType) => {
        setPendingOutcome(outcome);
        setConfirmNotes('');
    };

    const handleConfirmOutcome = async () => {
        if (!pendingOutcome) return;
        setIsSubmitting(true);
        try {
            await onSelectOutcome(request, pendingOutcome, confirmNotes);
            setPendingOutcome(null);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const outcomeLabels: Record<CounselingOutcomeType, { title: string; desc: string }> = {
        Counseled: {
            title: 'Mark as Counseled',
            desc: 'Session completed successfully and student was counseled.'
        },
        Monitoring: {
            title: 'Set to Monitoring',
            desc: 'Student will be observed; follow-up may be scheduled later.'
        },
        Subject_For_2nd_Counseling: {
            title: 'Subject for 2nd Counseling',
            desc: 'Student requires another counseling session.'
        }
    };

    return (
        <>
            <ContextMenu
                open={open && !pendingOutcome}
                position={position}
                onClose={onClose}
                ariaLabel="Counseling Actions Menu"
                className="w-72 p-1.5 shadow-2xl border-slate-200"
            >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Counseling Outcomes & Follow-up
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                        {toTitleCase(request.student_name, 'Student')}
                    </p>
                </div>

                <div className="space-y-0.5">
                    {/* Item 1: Mark as Counseled */}
                    <button
                        type="button"
                        role="menuitem"
                        disabled={!canSetOutcome}
                        onClick={() => handleOutcomeClick('Counseled')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                            canSetOutcome
                                ? 'text-emerald-800 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none'
                                : 'text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <CheckCircle2 size={16} className={canSetOutcome ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="flex-1">Mark as Counseled</span>
                        {!canSetOutcome && <Lock size={12} className="text-slate-400" />}
                    </button>

                    {/* Item 2: Set to Monitoring */}
                    <button
                        type="button"
                        role="menuitem"
                        disabled={!canSetOutcome}
                        onClick={() => handleOutcomeClick('Monitoring')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                            canSetOutcome
                                ? 'text-violet-800 hover:bg-violet-50 focus:bg-violet-50 focus:outline-none'
                                : 'text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <Activity size={16} className={canSetOutcome ? 'text-violet-600' : 'text-slate-400'} />
                        <span className="flex-1">Set to Monitoring</span>
                        {!canSetOutcome && <Lock size={12} className="text-slate-400" />}
                    </button>

                    {/* Item 3: Subject for 2nd Counseling */}
                    <button
                        type="button"
                        role="menuitem"
                        disabled={!canSetOutcome}
                        onClick={() => handleOutcomeClick('Subject_For_2nd_Counseling')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                            canSetOutcome
                                ? 'text-rose-800 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none'
                                : 'text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <Clock size={16} className={canSetOutcome ? 'text-rose-600' : 'text-slate-400'} />
                        <span className="flex-1">Mark as Subject for 2nd</span>
                        {!canSetOutcome && <Lock size={12} className="text-slate-400" />}
                    </button>
                </div>

                {(isReschedulable || isFollowUpEligible) && (
                    <div className="my-1 border-t border-slate-100" />
                )}

                <div className="space-y-0.5">
                    {/* Item 4: Reschedule Session */}
                    {isReschedulable && (
                        <button
                            type="button"
                            role="menuitem"
                            disabled={!canManageCounseling}
                            onClick={() => {
                                onClose();
                                onReschedule(request);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                                canManageCounseling
                                    ? 'text-cyan-900 hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none'
                                    : 'text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                        >
                            <Calendar size={16} className={canManageCounseling ? 'text-cyan-600' : 'text-slate-400'} />
                            <span className="flex-1">Reschedule Session</span>
                            {!canManageCounseling && <Lock size={12} className="text-slate-400" />}
                        </button>
                    )}

                    {/* Item 5: Schedule Follow-up Session */}
                    {isFollowUpEligible && (
                        <button
                            type="button"
                            role="menuitem"
                            disabled={!canManageCounseling}
                            onClick={() => {
                                onClose();
                                onScheduleFollowUp(request);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                                canManageCounseling
                                    ? 'text-indigo-900 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none'
                                    : 'text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                        >
                            <ArrowRightCircle size={16} className={canManageCounseling ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="flex-1">Schedule 2nd Session</span>
                            {!canManageCounseling && <Lock size={12} className="text-slate-400" />}
                        </button>
                    )}
                </div>
            </ContextMenu>

            {/* Confirm Dialog for Status Outcomes */}
            {pendingOutcome && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <AlertCircle size={20} className="text-indigo-600" />
                                <h3 className="font-bold text-base text-slate-900">
                                    {outcomeLabels[pendingOutcome]?.title || 'Set Outcome'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                aria-label="Cancel outcome change"
                                onClick={() => setPendingOutcome(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {outcomeLabels[pendingOutcome]?.desc}
                            </p>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                                <span className="font-bold text-slate-700">Target Student: </span>
                                <span className="text-slate-900 font-semibold">{toTitleCase(request.student_name, 'Student')}</span>
                            </div>

                            <div>
                                <label htmlFor="outcome-confirm-notes" className="block text-xs font-bold text-slate-700 mb-1">
                                    Counselor Outcome Notes (Optional)
                                </label>
                                <textarea
                                    id="outcome-confirm-notes"
                                    value={confirmNotes}
                                    onChange={(e) => setConfirmNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                    placeholder="Enter clinical notes or observations for this outcome..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPendingOutcome(null)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleConfirmOutcome}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-60"
                                >
                                    {isSubmitting ? 'Updating...' : 'Confirm Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CounselingOutcomeMenu;
