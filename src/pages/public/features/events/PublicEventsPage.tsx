import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import PublicHelpGuideModal from "./components/PublicHelpGuideModal";
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
import PublicAnnouncementsSlideshow from "./components/PublicAnnouncementsSlideshow";
import PublicPrivacyFooter from "./components/PublicPrivacyFooter";
import type { PublicAssessmentForm, PublicAssessmentQuestion } from "./publicEventsService";
import type { PublicEvent } from "./publicEventsService";
import { isAttendanceActivityType } from "../../../../utils/eventAudience";
import { isScholarshipExpired } from "../../../../utils/scholarshipHelpers";

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
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-blue-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />Public view · ID to interact
            </span>
        );
    }
    if (serviceId === "office_visit") {
        if (hasId) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-sky-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />ID or Guest Name
            </span>
        );
    }
    if (serviceId === "scholarship") {
        if (hasId) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-rose-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />Public view · ID to apply
            </span>
        );
    }
    if (serviceId === "peer_facilitator") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Active Peer Facilitator
            </span>
        );
    }
    if (type === "anonymous") return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />No ID needed
        </span>
    );
    if (hasId) return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ID ready
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9.5px] sm:px-2.5 sm:text-[11px] font-semibold text-violet-700">
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
                <div className="flex items-center justify-between px-4 pt-3.5 sm:px-5 sm:pt-5">
                    <button type="button" onClick={onBack} className="group flex items-center gap-1 text-[11px] font-semibold text-white/80 transition-all hover:text-white active:opacity-60 sm:gap-1.5 sm:text-xs">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5 sm:h-4 sm:w-4"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Back
                    </button>
                    {studentId && <span className="font-mono text-[10px] text-white/60 sm:text-[11px]">{studentId}</span>}
                </div>
                <div className="px-4 pb-4 pt-2.5 sm:px-5 sm:pb-6 sm:pt-4">
                    <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-inner transition-transform hover:scale-105 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>{service.emoji}</div>
                    <h1 className="text-[20px] font-extrabold leading-tight tracking-tight text-white sm:text-[24px]">{service.title}</h1>
                    <p className="mt-1 text-xs leading-relaxed text-white/75 sm:mt-2 sm:text-sm">{service.description}</p>
                </div>
            </div>
            <div className="flex-1 pb-8 sm:pb-10">{children}</div>
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
    const { scholarshipsList = [], isLoading: scholarshipsLoading, isError: scholarshipsError } = usePublicScholarshipsData();

    const [evaluationEvent, setEvaluationEvent] = useState<PublicEvent | null>(null);
    const [showCounselingEvalModal, setShowCounselingEvalModal] = useState(false);
    const [showCounselingRequestModal, setShowCounselingRequestModal] = useState(false);
    const [activeAssessmentForm, setActiveAssessmentForm] = useState<PublicAssessmentForm | null>(null);
    const [assessmentQuestions, setAssessmentQuestions] = useState<PublicAssessmentQuestion[] | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);

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
                <div className="flex items-center justify-between px-4 pt-3.5 sm:px-5 sm:pt-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50 sm:text-[10px]">Student Access</p>
                    <Link
                        to="/student/login"
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20 sm:px-3.5 sm:py-1 sm:text-xs"
                    >
                        Student Portal
                    </Link>
                </div>
                <div className="px-4 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex shrink-0 items-center -space-x-1.5 sm:-space-x-2">
                            <img
                                src="/norsu.png"
                                alt="NORSU Logo"
                                className="h-9 w-9 rounded-full border-2 border-white/40 bg-white object-contain p-0.5 shadow-md sm:h-11 sm:w-11"
                            />
                            <img
                                src="/carecenter.png"
                                alt="CARE Center Logo"
                                className="h-9 w-9 rounded-full border-2 border-white/40 bg-white object-contain p-0.5 shadow-md sm:h-11 sm:w-11"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[20px] font-extrabold leading-tight tracking-tight text-white sm:text-[26px]">
                                CARE CENTER
                            </h1>
                            <p className="text-[11.5px] font-medium tracking-normal text-white/80 sm:text-[14px]">
                                NORSU-Guihulngan Campus Public Hub
                            </p>
                        </div>
                    </div>
                    <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-white/65 sm:mt-2.5 sm:text-sm">
                        Pick what you need below. Your Student ID is only asked once for the whole session.
                    </p>
                </div>

                {/* ── Purple Header Announcements, Events & Scholarships Slideshow ── */}
                <PublicAnnouncementsSlideshow
                    announcements={eventsList.filter((e: any) => !isAttendanceActivityType(e.type) || e.type === 'Announcement')}
                    events={eventsList.filter((e: any) => isAttendanceActivityType(e.type))}
                    scholarships={scholarshipsList.filter((s: any) => !isScholarshipExpired(s.deadline))}
                    isLoading={isLoading || scholarshipsLoading}
                    onOpenEvents={() => {
                        setActiveServiceId('events');
                    }}
                    onOpenScholarships={() => {
                        setActiveServiceId('scholarship');
                    }}
                />

                <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 sm:mx-5 sm:mb-5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    {studentId ? (
                        <>
                            <span className="text-base sm:text-lg">✅</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold leading-snug text-white sm:text-xs">ID saved for this session</p>
                                <p className="mt-0.5 font-mono text-[10px] text-white/50 sm:text-[11px]">{studentId}</p>
                            </div>
                            <button type="button" onClick={handleSignOut} className="text-[10px] font-semibold text-white/40 transition-colors hover:text-white/70 sm:text-[11px]">Change</button>
                        </>
                    ) : (
                        <>
                            <span className="text-base sm:text-lg">🪪</span>
                            <p className="flex-1 text-[11px] leading-snug text-white/75 sm:text-xs">Have your <span className="font-semibold text-white">Student ID</span> handy — you will enter it once when you open your first option.</p>
                        </>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-lg flex-1 space-y-2.5 px-3.5 pb-8 pt-3.5 sm:space-y-3 sm:px-4 sm:pb-10 sm:pt-5">
                <p className="mb-0.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:mb-1 sm:text-[11px]">What can we help with?</p>
                {visibleServices.map((s, index) => {
                    const isExpanded = expandedId === s.id;
                    return (
                        <div
                            key={s.id}
                            className="w-full overflow-hidden rounded-xl border border-black/[0.07] bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300/80 animate-fade-in-up sm:rounded-2xl"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:gap-4 sm:px-4 sm:py-3.5"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl transition-transform duration-200 group-hover:scale-105 sm:h-13 sm:w-13 sm:rounded-xl sm:text-2xl" style={{ background: s.colorLight }}>{s.emoji}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-bold leading-snug text-slate-900 sm:text-[15px]">{s.title}</p>
                                    <div className="mt-1 sm:mt-1.5"><AccessPill type={s.access} hasId={Boolean(studentId)} serviceId={s.id} /></div>
                                </div>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 sm:h-8 sm:w-8" style={{ background: isExpanded ? s.color : "transparent", border: `1.5px solid ${isExpanded ? s.color : "rgba(0,0,0,0.1)"}` }}>
                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="sm:h-3.5 sm:w-3.5" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)", color: isExpanded ? "white" : "#6b7280" }}>
                                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="border-t border-black/[0.05] px-3.5 pb-3.5 animate-fade-in sm:px-4 sm:pb-4">
                                    <p className="mb-3 mt-2 text-xs leading-relaxed text-slate-500 sm:mb-4 sm:mt-3 sm:text-sm">{s.description}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(s)}
                                        className="btn-press w-full rounded-lg py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] sm:rounded-xl sm:py-3 sm:text-sm"
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

            {/* ── Privacy Policy Footer ── */}
            <PublicPrivacyFooter />

            {/* ── Floating Help & Guide Button ── */}
            <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-white/25 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-xl shadow-purple-950/40 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:shadow-violet-600/50 hover:border-white/40 active:scale-95 sm:bottom-6 sm:right-6 sm:px-4 sm:py-2.5 sm:text-sm"
                aria-label="Open Public Services Guide and FAQs"
            >
                <HelpCircle size={16} className="text-violet-200" />
                <span>Guide & FAQs</span>
            </button>

            {/* ── Public Help & FAQs Modal ── */}
            <PublicHelpGuideModal
                open={showGuideModal}
                onClose={() => setShowGuideModal(false)}
                onSelectService={(serviceId) => {
                    const s = ALL_SERVICES.find((srv) => srv.id === serviceId);
                    if (s) handleOpen(s);
                }}
            />

            {showSheet && <IdBottomSheet serviceName={SERVICES.find((s) => s.id === pendingServiceId)?.title ?? "service"} onConfirm={handleIdConfirm} onDismiss={closeSheet} isLoading={sheetLoading} error={sheetError} />}
            {toast && <Toast toast={toast} />}
        </div>
    );
}
