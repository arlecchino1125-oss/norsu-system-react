import React, { useCallback, useEffect, useRef, useState } from "react";
import PublicEventsView from "./components/PublicEventsView";
import PublicOfficeVisitView from "./components/PublicOfficeVisitView";
import PublicCounselingView from "./components/PublicCounselingView";
import PublicCounselingRequestModal from "./components/PublicCounselingRequestModal";
import PublicSupportView from "./components/PublicSupportView";
import PublicAssessmentView from "./components/PublicAssessmentView";
import PublicFeedbackView from "./components/PublicFeedbackView";
import PublicEvaluationModal from "./components/PublicEvaluationModal";
import PublicCounselingEvaluationModal from "./components/PublicCounselingEvaluationModal";
import PublicRatingModal from "./components/PublicRatingModal";
import PublicAssessmentFormModal from "./components/PublicAssessmentFormModal";
import { usePublicEventActions, usePublicEventsData, usePublicIdentity } from "./hooks/usePublicEvents";
import { usePublicAssessmentData, usePublicAssessmentActions } from "./hooks/usePublicAssessment";
import { usePublicScholarshipsData } from "./hooks/usePublicScholarships";
import PublicScholarshipsView from "./components/PublicScholarshipsView";
import PublicPeerFacilitatorView from "./components/PublicPeerFacilitatorView";
import PublicPrivacyFooter from "./components/PublicPrivacyFooter";
import type { PublicAssessmentForm, PublicAssessmentQuestion } from "./publicEventsService";
import type { PublicEvent } from "./publicEventsService";
import { isAttendanceActivityType } from "../../../../utils/eventAudience";

const SERVICES = [
    { id: "events" as const, emoji: "📅", color: "#4f46e5", colorLight: "#eef2ff", title: "Events & Attendance", description: "Browse campus activities. Sign in with your Student ID to record attendance (time in/out), rate, and evaluate.", access: "anonymous" as const },
    { id: "office_visit" as const, emoji: "🏢", color: "#0284c7", colorLight: "#e0f2fe", title: "Office Visit", description: "Log your visit (time in & time out) when visiting the CARE Center office in person.", access: "anonymous" as const },
    { id: "scholarship" as const, emoji: "🎓", color: "#e11d48", colorLight: "#ffe4e6", title: "Scholarships", description: "Browse active scholarships and submit direct applications with your Student ID.", access: "anonymous" as const },
    { id: "counseling" as const, emoji: "💬", color: "#7c3aed", colorLight: "#f5f3ff", title: "Counseling Services", description: "Request a confidential counseling appointment or evaluate a completed session.", access: "student-id" as const },
    { id: "support" as const, emoji: "🤝", color: "#0d9488", colorLight: "#f0fdfa", title: "Additional Support", description: "Request academic assistance, PWD support, special accommodation, or emergency aid.", access: "student-id" as const },
    { id: "assessment" as const, emoji: "📋", color: "#0891b2", colorLight: "#ecfeff", title: "Needs Assessment", description: "Answer a short inventory so we can understand how to better support you.", access: "student-id" as const },
    { id: "feedback" as const, emoji: "⭐", color: "#d97706", colorLight: "#fffbeb", title: "General Feedback", description: "Share feedback on our Citizen Charter and overall service quality. No ID needed.", access: "anonymous" as const },
];

const PEER_SERVICE = {
    id: "peer_facilitator" as const,
    emoji: "🤝",
    color: "#059669",
    colorLight: "#ecfdf5",
    title: "Peer Facilitators",
    description: "Volunteer time in/out, peer support logbook, and CARE activities logbook.",
    access: "student-id" as const
};

const ALL_SERVICES = [...SERVICES, PEER_SERVICE] as const;

type ServiceId = (typeof ALL_SERVICES)[number]["id"];
type AnyService = (typeof ALL_SERVICES)[number];
type ActionType = "time_in" | "time_out" | "rate" | "evaluate";

function AccessPill({ type, hasId, serviceId }: { type: "student-id" | "anonymous"; hasId: boolean; serviceId?: string }) {
    if (serviceId === "events") {
        if (hasId) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />Public view · ID to interact
            </span>
        );
    }
    if (serviceId === "office_visit") {
        if (hasId) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />ID or Guest Name
            </span>
        );
    }
    if (serviceId === "scholarship") {
        if (hasId) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />Public view · ID to apply
            </span>
        );
    }
    if (serviceId === "peer_facilitator") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Active Peer Facilitator
            </span>
        );
    }
    if (type === "anonymous") return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />No ID needed
        </span>
    );
    if (hasId) return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />Needs Student ID
        </span>
    );
}

function Toast({ toast }: { toast: { message: string; type: string } }) {
    return (
        <div className={`fixed bottom-4 left-4 right-4 z-[10050] mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl backdrop-blur-sm animate-fade-in-up transition-all sm:bottom-6 sm:px-6 sm:py-4 ${toast.type === "error" ? "bg-red-600/90" : "bg-gradient-to-r from-emerald-500 to-green-600"}`}>
            <div className="text-xl font-black">{toast.type === "error" ? "!" : "OK"}</div>
            <div className="min-w-0">
                <p className="text-sm font-bold">{toast.type === "error" ? "Error" : "Done"}</p>
                <p className="text-xs opacity-90">{toast.message}</p>
            </div>
        </div>
    );
}

function IdBottomSheet({ onConfirm, onDismiss, serviceName, isLoading, error }: { onConfirm: (id: string) => void; onDismiss: () => void; serviceName: string; isLoading: boolean; error: string }) {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
    const submit = () => { if (value.trim()) onConfirm(value.trim()); };
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onDismiss} />
            <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg animate-scale-in">
                <div className="rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-2xl">
                    <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/10" />
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl">🪪</div>
                    <h2 className="mb-1 text-[18px] font-extrabold leading-tight text-slate-900">Enter your Student ID</h2>
                    <p className="mb-5 text-sm leading-relaxed text-slate-500">Your ID will be remembered for this session so you won't have to enter it again.</p>
                    {error && <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 animate-fade-in">{error}</div>}
                    <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="e.g. 420000000" className="mb-3 w-full rounded-2xl bg-[#f4f4f8] px-4 py-4 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-all input-smooth" />
                    <p className="mb-5 px-1 text-[11px] text-slate-500">Opening: <span className="font-semibold text-slate-800">{serviceName}</span></p>
                    <button type="button" disabled={!value.trim() || isLoading} onClick={submit} className="w-full rounded-2xl py-4 text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-30 btn-press" style={{ background: "linear-gradient(135deg, #3b1fa8 0%, #6d28d9 100%)", boxShadow: value.trim() ? "0 6px 20px rgba(59,31,168,0.3)" : "none" }}>
                        {isLoading ? "Verifying..." : "Continue →"}
                    </button>
                </div>
            </div>
        </>
    );
}

function ServiceScreenShell({ service, studentId, onBack, children }: { service: AnyService; studentId: string | null; onBack: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-[#f1f3f8] page-transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="relative flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(145deg, ${service.color}dd 0%, ${service.color} 100%)` }}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white opacity-10" />
                <div className="pointer-events-none absolute -right-4 top-8 h-24 w-24 rounded-full bg-white opacity-10" />
                <div className="flex items-center justify-between px-5 pt-5">
                    <button type="button" onClick={onBack} className="group flex items-center gap-1.5 text-xs font-semibold text-white/80 transition-all hover:text-white active:opacity-60">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Back
                    </button>
                    {studentId && <span className="font-mono text-[11px] text-white/60">{studentId}</span>}
                </div>
                <div className="px-5 pb-6 pt-4">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-inner transition-transform hover:scale-105" style={{ background: "rgba(255,255,255,0.15)" }}>{service.emoji}</div>
                    <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-white">{service.title}</h1>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">{service.description}</p>
                </div>
            </div>
            <div className="flex-1 pb-10">{children}</div>
            <PublicPrivacyFooter />
        </div>
    );
}

export default function PublicEventsPage() {
    const [activeServiceId, setActiveServiceId] = useState<ServiceId | null>(null);
    const [expandedId, setExpandedId] = useState<ServiceId | null>(null);
    const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, type = "success") => {
        setToast({ message, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);
    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    const { identity, verify, signOut } = usePublicIdentity();
    const studentId = identity?.student.student_id ?? null;

    const [showSheet, setShowSheet] = useState(false);
    const [pendingServiceId, setPendingServiceId] = useState<ServiceId | null>(null);
    const [sheetLoading, setSheetLoading] = useState(false);
    const [sheetError, setSheetError] = useState("");

    const { eventsList, statusMap, isLoading, isError, refreshStatus, refreshEvents } = usePublicEventsData(identity);
    const { timingInEventId, timingOutEventId, showRatingModal, setShowRatingModal, ratingForm, setRatingForm, isSubmittingRating, handleTimeIn, handleTimeOut, handleRateEvent, submitRating } = usePublicEventActions({ identity, showToast, refreshStatus, refreshEvents });
    const { formsList: assessmentFormsList, isLoading: assessmentLoading, isError: assessmentError, refreshForms: refreshAssessmentForms } = usePublicAssessmentData(identity, { enabled: activeServiceId === "assessment" });
    const assessmentActions = usePublicAssessmentActions(identity, showToast, refreshAssessmentForms);
    const { scholarshipsList, isLoading: scholarshipsLoading, isError: scholarshipsError } = usePublicScholarshipsData({ enabled: activeServiceId === "scholarship" });

    const [evaluationEvent, setEvaluationEvent] = useState<PublicEvent | null>(null);
    const [showCounselingEvalModal, setShowCounselingEvalModal] = useState(false);
    const [showCounselingRequestModal, setShowCounselingRequestModal] = useState(false);
    const [activeAssessmentForm, setActiveAssessmentForm] = useState<PublicAssessmentForm | null>(null);
    const [assessmentQuestions, setAssessmentQuestions] = useState<PublicAssessmentQuestion[] | null>(null);

    const requestAction = useCallback((type: ActionType, event: PublicEvent) => {
        if (!identity) { setShowSheet(true); return; }
        if (type === "time_in") void handleTimeIn(event);
        else if (type === "time_out") void handleTimeOut(event);
        else if (type === "rate") handleRateEvent(event);
        else setEvaluationEvent(event);
    }, [handleRateEvent, handleTimeIn, handleTimeOut, identity]);

    const handleIdConfirm = useCallback(async (id: string) => {
        setSheetError("");
        setSheetLoading(true);
        try {
            await verify(id);
            setShowSheet(false);
            showToast("Signed in. You can now access student services.");
            if (pendingServiceId) { setActiveServiceId(pendingServiceId); setPendingServiceId(null); }
        } catch (err: any) {
            setSheetError(err?.message || "We could not verify that ID.");
        } finally {
            setSheetLoading(false);
        }
    }, [pendingServiceId, showToast, verify]);

    const handleOpen = useCallback((service: AnyService) => {
        if (service.access === "anonymous" || identity) { setActiveServiceId(service.id); }
        else { setPendingServiceId(service.id); setSheetError(""); setShowSheet(true); }
    }, [identity]);

    const handleSignOut = useCallback(() => { signOut(); showToast("Signed out."); }, [showToast, signOut]);

    const openAssessmentForm = useCallback(async (form: PublicAssessmentForm) => {
        try {
            const questions = await assessmentActions.loadFormQuestions(form.id);
            setAssessmentQuestions(questions);
            setActiveAssessmentForm(form);
        } catch (err: any) { showToast(err.message || "Could not load the assessment form.", "error"); }
    }, [assessmentActions, showToast]);

    const isPeer = Boolean(identity?.student?.is_peer);
    const visibleServices = isPeer ? ALL_SERVICES : SERVICES;
    const activeService = ALL_SERVICES.find((s) => s.id === activeServiceId) ?? null;

    const openSheet = useCallback(() => { setSheetError(""); setShowSheet(true); }, []);
    const closeSheet = useCallback(() => { setShowSheet(false); setPendingServiceId(null); setSheetError(""); }, []);

    if (activeService) {
        return (
            <>
                <ServiceScreenShell service={activeService} studentId={studentId} onBack={() => setActiveServiceId(null)}>
                    {activeService.id === "events" ? (
                        <PublicEventsView eventsList={eventsList} statusMap={statusMap} isSignedIn={Boolean(identity)} isLoading={isLoading} isError={isError} timingInEventId={timingInEventId} timingOutEventId={timingOutEventId} onRefresh={() => { void refreshEvents(); void refreshStatus(); }} onTimeIn={(e) => requestAction("time_in", e)} onTimeOut={(e) => requestAction("time_out", e)} onRate={(e) => requestAction("rate", e)} onEvaluate={(e) => requestAction("evaluate", e)} onRequireSignIn={openSheet} />
                    ) : activeService.id === "office_visit" ? (
                        <PublicOfficeVisitView identity={identity} onRequireSignIn={openSheet} showToast={showToast} />
                    ) : activeService.id === "scholarship" ? (
                        <PublicScholarshipsView scholarshipsList={scholarshipsList} isLoading={scholarshipsLoading} isError={scholarshipsError} identity={identity} onRequireSignIn={openSheet} showToast={showToast} />
                    ) : activeService.id === "counseling" ? (
                        <PublicCounselingView identity={identity} onRequireSignIn={openSheet} onRequestAppointment={() => setShowCounselingRequestModal(true)} onStartEvaluation={() => setShowCounselingEvalModal(true)} />
                    ) : activeService.id === "support" ? (
                        <PublicSupportView identity={identity} onRequireSignIn={openSheet} showToast={showToast} />
                    ) : activeService.id === "assessment" ? (
                        <PublicAssessmentView identity={identity} formsList={assessmentFormsList} isLoading={assessmentLoading} isError={assessmentError} onRequireSignIn={openSheet} onOpenForm={(form) => void openAssessmentForm(form)} onRefresh={() => void refreshAssessmentForms()} />
                    ) : activeService.id === "peer_facilitator" ? (
                        <PublicPeerFacilitatorView identity={identity!} onRequireSignIn={openSheet} showToast={showToast} />
                    ) : (
                        <PublicFeedbackView identity={identity} onRequireSignIn={openSheet} showToast={showToast} />
                    )}
                </ServiceScreenShell>
                {identity && evaluationEvent && <PublicEvaluationModal open={Boolean(evaluationEvent)} eventId={evaluationEvent.id} eventTitle={evaluationEvent.title} studentId={identity.student.student_id} onClose={() => setEvaluationEvent(null)} onSubmitted={() => { void refreshStatus(); }} showToast={showToast} />}
                {identity && showCounselingEvalModal && <PublicCounselingEvaluationModal open={showCounselingEvalModal} studentId={identity.student.student_id} onClose={() => setShowCounselingEvalModal(false)} onSubmitted={() => showToast("Your counseling evaluation has been submitted.")} showToast={showToast} />}
                {identity && showCounselingRequestModal && <PublicCounselingRequestModal isOpen={showCounselingRequestModal} studentId={identity.student.student_id} onClose={() => setShowCounselingRequestModal(false)} showToast={showToast} />}
                {identity && showRatingModal && <PublicRatingModal ratingForm={ratingForm} setRatingForm={setRatingForm} submitRating={submitRating} isSubmitting={isSubmittingRating} onClose={() => setShowRatingModal(false)} />}
                {identity && activeAssessmentForm && <PublicAssessmentFormModal form={activeAssessmentForm} isOpen={Boolean(activeAssessmentForm)} studentId={identity.student.student_id} onClose={() => { setActiveAssessmentForm(null); setAssessmentQuestions(null); }} onSubmit={(responses) => assessmentActions.handleSubmit(activeAssessmentForm.id, responses)} showToast={showToast} questions={assessmentQuestions ?? []} />}
                {showSheet && <IdBottomSheet serviceName={activeService.title} onConfirm={handleIdConfirm} onDismiss={closeSheet} isLoading={sheetLoading} error={sheetError} />}
                {toast && <Toast toast={toast} />}
            </>
        );
    }

    return (
        <div className="flex min-h-screen flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f1f3f8" }}>
            <header className="relative overflow-hidden" style={{ background: "linear-gradient(145deg, #2a1280 0%, #4c1fa8 55%, #6d28d9 100%)" }}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white opacity-10" />
                <div className="pointer-events-none absolute -right-4 top-8 h-24 w-24 rounded-full bg-white opacity-10" />
                <div className="flex items-center justify-between px-5 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Student Access</p>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70">Service Hub</span>
                </div>
                <div className="px-5 pb-4 pt-3">
                    <div className="flex items-center gap-3">
                        <div className="flex shrink-0 items-center -space-x-2">
                            <img
                                src="/norsu.png"
                                alt="NORSU Logo"
                                className="h-11 w-11 rounded-full border-2 border-white/40 bg-white object-contain p-0.5 shadow-md"
                            />
                            <img
                                src="/carecenter.png"
                                alt="CARE Center Logo"
                                className="h-11 w-11 rounded-full border-2 border-white/40 bg-white object-contain p-0.5 shadow-md"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-white sm:text-[28px]">
                                CARE CENTER
                            </h1>
                            <p className="text-[13px] font-medium tracking-normal text-white/80 sm:text-[15px]">
                                NORSU-Guihulngan Campus Public Hub
                            </p>
                        </div>
                    </div>
                    <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-white/65">
                        Pick what you need below. Your Student ID is only asked once for the whole session.
                    </p>
                </div>
                <div className="mx-5 mb-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    {studentId ? (
                        <>
                            <span className="text-lg">✅</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold leading-snug text-white">ID saved for this session</p>
                                <p className="mt-0.5 font-mono text-[11px] text-white/50">{studentId}</p>
                            </div>
                            <button type="button" onClick={handleSignOut} className="text-[11px] font-semibold text-white/40 transition-colors hover:text-white/70">Change</button>
                        </>
                    ) : (
                        <>
                            <span className="text-lg">🪪</span>
                            <p className="flex-1 text-xs leading-snug text-white/75">Have your <span className="font-semibold text-white">Student ID</span> handy — you will enter it once when you open your first option.</p>
                        </>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 pb-10 pt-5">
                <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">What can we help with?</p>
                {visibleServices.map((s, index) => {
                    const isExpanded = expandedId === s.id;
                    return (
                        <div
                            key={s.id}
                            className="w-full overflow-hidden rounded-2xl border border-black/[0.07] bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300/80 animate-fade-in-up"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl transition-transform duration-200 group-hover:scale-105" style={{ background: s.colorLight }}>{s.emoji}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold leading-snug text-slate-900">{s.title}</p>
                                    <div className="mt-1.5"><AccessPill type={s.access} hasId={Boolean(studentId)} serviceId={s.id} /></div>
                                </div>
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300" style={{ background: isExpanded ? s.color : "transparent", border: `1.5px solid ${isExpanded ? s.color : "rgba(0,0,0,0.1)"}` }}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)", color: isExpanded ? "white" : "#6b7280" }}>
                                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="border-t border-black/[0.05] px-4 pb-4 animate-fade-in">
                                    <p className="mb-4 mt-3 text-sm leading-relaxed text-slate-500">{s.description}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(s)}
                                        className="btn-press w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
                                        style={{ background: s.color }}
                                    >
                                        {s.access === "student-id" && !studentId ? "Enter ID & Open →" : "Open →"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>

            {/* ── Announcements board ── */}
            {(() => {
                const announcements = eventsList.filter((e: any) => !isAttendanceActivityType(e.type) || e.type === 'Announcement');
                if (isLoading) return null;
                return (
                    <section className="mx-auto w-full max-w-lg px-4 pb-10">
                        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            📢 Announcements &amp; News
                        </p>
                        {announcements.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center shadow-sm">
                                <p className="text-xs font-semibold text-slate-400">No announcements posted at this time.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {announcements.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-sky-100 bg-white px-4 py-3.5 shadow-sm"
                                    >
                                        <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase text-sky-700">
                                            {item.type || 'Announcement'}
                                        </span>
                                        <p className="mt-2 text-[14px] font-bold leading-snug text-slate-900">
                                            {item.title}
                                        </p>
                                        {item.description && (
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                                {item.description}
                                            </p>
                                        )}
                                        <p className="mt-2 text-[10px] font-semibold text-slate-400">
                                            {item.event_date || item.created_at
                                                ? new Date(item.event_date || item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })()}

            {/* ── Privacy Policy Footer ── */}
            <PublicPrivacyFooter />

            {showSheet && <IdBottomSheet serviceName={SERVICES.find((s) => s.id === pendingServiceId)?.title ?? "service"} onConfirm={handleIdConfirm} onDismiss={closeSheet} isLoading={sheetLoading} error={sheetError} />}
            {toast && <Toast toast={toast} />}
        </div>
    );
}
