import React, { useCallback, useEffect, useRef, useState } from 'react';
import PublicEventsView from './components/PublicEventsView';
import PublicIdentityModal from './components/PublicIdentityModal';
import PublicEvaluationModal from './components/PublicEvaluationModal';
import PublicRatingModal from './components/PublicRatingModal';
import { usePublicEventActions, usePublicEventsData, usePublicIdentity } from './hooks/usePublicEvents';
import type { PublicEvent } from './publicEventsService';

type ActionType = 'time_in' | 'time_out' | 'rate' | 'evaluate';

export default function PublicEventsPage() {
    const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stable across renders on purpose: PublicEvaluationModal keys its loader off
    // this identity, and a new function every render reloaded the form mid-answer.
    const showToast = useCallback((message: string, type = 'success') => {
        setToast({ message, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    const { identity, verify, signOut } = usePublicIdentity();
    const { eventsList, statusMap, isLoading, isError, refreshStatus, refreshEvents } = usePublicEventsData(identity);
    const {
        timingInEventId,
        timingOutEventId,
        showRatingModal,
        setShowRatingModal,
        ratingForm,
        setRatingForm,
        isSubmittingRating,
        handleTimeIn,
        handleTimeOut,
        handleRateEvent,
        submitRating
    } = usePublicEventActions({ identity, showToast, refreshStatus, refreshEvents });

    const [identityModalOpen, setIdentityModalOpen] = useState(false);
    const [evaluationEvent, setEvaluationEvent] = useState<PublicEvent | null>(null);

    // Sign in first, then act. The action is deliberately NOT replayed after
    // verification: replaying it fired a time-in the moment the student typed
    // their details, and it raced the status query, which then cached a
    // pre-time-in snapshot and left the button stuck on "Time In".
    const requestAction = useCallback((type: ActionType, event: PublicEvent) => {
        if (!identity) {
            setIdentityModalOpen(true);
            return;
        }
        if (type === 'time_in') void handleTimeIn(event);
        else if (type === 'time_out') void handleTimeOut(event);
        else if (type === 'rate') handleRateEvent(event);
        else setEvaluationEvent(event);
    }, [handleRateEvent, handleTimeIn, handleTimeOut, identity]);

    // Rejects when the details do not match a student record, which is what puts
    // the message inside the form instead of behind its own backdrop.
    const handleVerify = useCallback(async (studentId: string) => {
        await verify(studentId);
        setIdentityModalOpen(false);
        showToast('Signed in. You can now time in, rate, and evaluate.');
    }, [showToast, verify]);

    const closeIdentityModal = useCallback(() => setIdentityModalOpen(false), []);

    const closeEvaluation = useCallback(() => setEvaluationEvent(null), []);

    const handleSignOut = useCallback(() => {
        signOut();
        showToast('Signed out.');
    }, [showToast, signOut]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">CARE Events</h1>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Public Access</p>
                    </div>
                </div>
                {identity ? (
                    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-2 sm:px-6">
                        <p className="min-w-0 truncate text-xs font-semibold text-blue-800">
                            Signed in as <strong className="font-black">{identity.student.student_id}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="shrink-0 text-xs font-black uppercase tracking-wider text-blue-600 underline transition-colors hover:text-blue-800"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 sm:px-6">
                        <p className="min-w-0 text-xs font-semibold text-amber-800">
                            Viewing as a guest. Enter your Student ID to time in, rate, or evaluate.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIdentityModalOpen(true)}
                            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-amber-600"
                        >
                            Sign In
                        </button>
                    </div>
                )}
            </header>

            <main className="w-full p-3 pb-24 sm:p-5">
                <PublicEventsView
                    eventsList={eventsList}
                    statusMap={statusMap}
                    isSignedIn={Boolean(identity)}
                    isLoading={isLoading}
                    isError={isError}
                    timingInEventId={timingInEventId}
                    timingOutEventId={timingOutEventId}
                    onRefresh={() => { void refreshEvents(); void refreshStatus(); }}
                    onTimeIn={(event) => requestAction('time_in', event)}
                    onTimeOut={(event) => requestAction('time_out', event)}
                    onRate={(event) => requestAction('rate', event)}
                    onEvaluate={(event) => requestAction('evaluate', event)}
                />
            </main>

            <PublicIdentityModal
                open={identityModalOpen}
                actionName={null}
                onClose={closeIdentityModal}
                onSubmit={handleVerify}
            />

            {identity && evaluationEvent && (
                <PublicEvaluationModal
                    open={Boolean(evaluationEvent)}
                    eventId={evaluationEvent.id}
                    eventTitle={evaluationEvent.title}
                    studentId={identity.student.student_id}
                    onClose={closeEvaluation}
                    onSubmitted={() => { void refreshStatus(); }}
                    showToast={showToast}
                />
            )}

            {identity && showRatingModal && (
                <PublicRatingModal
                    ratingForm={ratingForm}
                    setRatingForm={setRatingForm}
                    submitRating={submitRating}
                    isSubmitting={isSubmittingRating}
                    onClose={() => setShowRatingModal(false)}
                />
            )}

            {/* Above the modals (z-9998/9999) on purpose: an error raised by an
                action taken inside a modal has to stay readable. */}
            {toast && (
                <div className={`fixed bottom-4 left-4 right-4 z-[10050] flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-2xl backdrop-blur-sm animate-slide-in-right sm:bottom-6 sm:left-auto sm:right-6 sm:px-6 sm:py-4 ${toast.type === 'error' ? 'bg-red-600/90' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
                    <div className="text-xl font-black">{toast.type === 'error' ? '!' : 'OK'}</div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold">{toast.type === 'error' ? 'Error' : 'Success'}</p>
                        <p className="text-xs opacity-90">{toast.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
