import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    HelpCircle,
    X,
    Search,
    BookOpen,
    HelpCircle as FaqIcon,
    Sparkles,
    Calendar,
    Building2,
    GraduationCap,
    MessageCircle,
    HeartHandshake,
    ClipboardList,
    Star,
    Users,
    ChevronDown,
    ShieldCheck,
    ArrowUpRight,
    LogIn,
    CheckCircle2
} from 'lucide-react';

interface PublicHelpGuideModalProps {
    open: boolean;
    onClose: () => void;
    onSelectService?: (serviceId: string) => void;
}

interface ServiceGuideItem {
    id: string;
    emoji: string;
    title: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: string;
    badge: string;
    summary: string;
    whatToTouch: string[];
    idRequirement: string;
    tip?: string;
}

const SERVICE_GUIDES: ServiceGuideItem[] = [
    {
        id: 'events',
        emoji: '📅',
        title: 'Events & Attendance',
        icon: Calendar,
        color: '#4f46e5',
        badge: 'Public View · ID to interact',
        summary: 'Campus seminars, workshops, assemblies, and orientations.',
        whatToTouch: [
            'Browse active & upcoming campus events.',
            'Tap an active event to record your Time In when arriving.',
            'Tap Time Out when the event concludes.',
            'Tap Evaluate / Rate after attending to submit event feedback.'
        ],
        idRequirement: 'Student ID is required when timing in/out or submitting evaluations.',
        tip: 'Make sure the event is currently active or in its attendance window before attempting to time in.'
    },
    {
        id: 'office_visit',
        emoji: '🏢',
        title: 'Office Visit',
        icon: Building2,
        color: '#0284c7',
        badge: 'Requires Student ID',
        summary: 'Walk-in visits to the physical CARE Center office.',
        whatToTouch: [
            'Select your purpose of visit (e.g., consultation, inquiry, document submission).',
            'Tap Time In when you arrive at the office.',
            'Tap Time Out when leaving the office.'
        ],
        idRequirement: 'Requires your Student ID to log your entry into the visitor logbook.',
        tip: 'Log in as soon as you enter the CARE Center so staff know you are waiting.'
    },
    {
        id: 'scholarship',
        emoji: '🎓',
        title: 'Scholarships',
        icon: GraduationCap,
        color: '#e11d48',
        badge: 'Requires Student ID',
        summary: 'Active university, government, and donor scholarship programs.',
        whatToTouch: [
            'Browse active scholarship announcements and deadlines.',
            'Tap any scholarship to view eligibility criteria and required documents.',
            'Tap Apply to submit your application form directly with your Student ID.'
        ],
        idRequirement: 'Student ID is required to link the application to your student record.',
        tip: 'Check application deadlines closely. Expired scholarships are automatically archived.'
    },
    {
        id: 'counseling',
        emoji: '💬',
        title: 'Counseling Services',
        icon: MessageCircle,
        color: '#7c3aed',
        badge: 'Requires Student ID',
        summary: 'Private, confidential guidance and psychological support sessions.',
        whatToTouch: [
            'Tap Request Counseling to schedule a confidential 1-on-1 session with a guidance counselor.',
            'Choose your preferred schedule and reason for consultation.',
            'Tap Evaluate Counseling Session if you completed a recent counseling visit.'
        ],
        idRequirement: 'Requires Student ID. All submissions are strictly confidential under the Data Privacy Act.',
        tip: 'Emergency and mental health crisis concerns are prioritized by guidance counselors.'
    },
    {
        id: 'support',
        emoji: '🤝',
        title: 'Additional Support',
        icon: HeartHandshake,
        color: '#0d9488',
        badge: 'Requires Student ID',
        summary: 'Special assistance for PWD, academics, accommodations, and emergencies.',
        whatToTouch: [
            'Academic Assistance: Tutoring or learning accommodation requests.',
            'PWD Support: Accessibility assistance and physical accommodation.',
            'Special Support: Unique classroom, health, or personal considerations.',
            'Emergency Aid: Immediate welfare and assistance requests.'
        ],
        idRequirement: 'Requires Student ID to process support endorsement.',
        tip: 'Provide brief details on your situation so the CARE team can assign the right coordinator.'
    },
    {
        id: 'assessment',
        emoji: '📋',
        title: 'Needs Assessment',
        icon: ClipboardList,
        color: '#0891b2',
        badge: 'Requires Student ID',
        summary: 'Student inventory and guidance profiling questionnaires.',
        whatToTouch: [
            'Tap an active survey or assessment form.',
            'Answer the multiple choice and self-check questions honestly.',
            'Tap Submit to send your assessment responses to the guidance office.'
        ],
        idRequirement: 'Requires Student ID.',
        tip: 'Assessments help counselors understand student well-being trends and tailor campus seminars.'
    },
    {
        id: 'feedback',
        emoji: '⭐',
        title: 'General Feedback',
        icon: Star,
        color: '#d97706',
        badge: '100% Anonymous · No ID needed',
        summary: 'Rate CARE Center services and Citizen’s Charter standards.',
        whatToTouch: [
            'Rate overall service satisfaction and staff responsiveness.',
            'Provide open comments or suggestions for campus improvement.',
            'Submit anonymously without entering any personal info.'
        ],
        idRequirement: 'No Student ID required! Your identity is completely anonymous.',
        tip: 'Your constructive feedback directly helps improve university student support programs.'
    },
    {
        id: 'peer_facilitator',
        emoji: '👥',
        title: 'Peer Facilitators',
        icon: Users,
        color: '#059669',
        badge: 'For Peer Facilitators Only',
        summary: 'Official logbooks for active student peer volunteers.',
        whatToTouch: [
            'Volunteer Time In / Out for scheduled duty hours.',
            'Peer Support Logbook: Record peer mentoring interactions.',
            'CARE Activities Logbook: Log participation in campus guidance campaigns.'
        ],
        idRequirement: 'Requires verified Peer Facilitator Student ID.',
        tip: 'Only active registered peer facilitators can access this section.'
    }
];

interface FaqItem {
    question: string;
    answer: string;
    tag: string;
}

const FAQ_ITEMS: FaqItem[] = [
    {
        question: 'Do I need a password to use this Public Page?',
        answer: 'No! The Public Hub is designed for rapid walk-in and campus kiosk use. You do not need a password here—just enter your Student ID once when opening any service that requires it.',
        tag: 'Access'
    },
    {
        question: 'How does the Student ID session work?',
        answer: 'When you enter your Student ID for any service, it is safely stored in your browser session for this visit. You will see "ID saved for this session" at the top so you don\'t have to retype it. If you share a device, tap "Change" to clear it.',
        tag: 'Student ID'
    },
    {
        question: 'How do I access my full student account, profile, or records?',
        answer: 'Tap the "Student Portal" button at the top right of the purple header. That takes you to the student login page where you can sign in with your email/student ID and password to access your full student dashboard.',
        tag: 'Student Portal'
    },
    {
        question: 'Why does attendance ask for my Student ID?',
        answer: 'Entering your Student ID verifies your student identity so your Time-In and Time-Out timestamps are credited directly to your official university activity record.',
        tag: 'Attendance'
    },
    {
        question: 'Are my counseling and support requests confidential?',
        answer: 'Yes, 100%. All appointment requests, counseling notes, and support submissions are strictly confidential under Republic Act 10173 (Data Privacy Act of 2012) and are only accessible by authorized guidance counselors.',
        tag: 'Privacy'
    },
    {
        question: 'What if I made a mistake or entered the wrong Student ID?',
        answer: 'Look at the top section under the purple banner. If your ID is saved, click "Change" to reset your session and enter your correct Student ID.',
        tag: 'Troubleshooting'
    }
];

export default function PublicHelpGuideModal({
    open,
    onClose,
    onSelectService
}: PublicHelpGuideModalProps) {
    const [activeTab, setActiveTab] = useState<'services' | 'faq'>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

    // Reset when modal opens
    useEffect(() => {
        if (open) {
            setSearchQuery('');
            setExpandedServiceId(null);
            setExpandedFaqIndex(0);
        }
    }, [open]);

    // Handle ESC key to close
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Filter services based on search
    const filteredServices = useMemo(() => {
        if (!searchQuery.trim()) return SERVICE_GUIDES;
        const q = searchQuery.toLowerCase();
        return SERVICE_GUIDES.filter(
            (s) =>
                s.title.toLowerCase().includes(q) ||
                s.summary.toLowerCase().includes(q) ||
                s.whatToTouch.some((item) => item.toLowerCase().includes(q))
        );
    }, [searchQuery]);

    // Filter FAQs based on search
    const filteredFaqs = useMemo(() => {
        if (!searchQuery.trim()) return FAQ_ITEMS;
        const q = searchQuery.toLowerCase();
        return FAQ_ITEMS.filter(
            (f) =>
                f.question.toLowerCase().includes(q) ||
                f.answer.toLowerCase().includes(q) ||
                f.tag.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-2.5 backdrop-blur-sm sm:p-4"
            onClick={onClose}
        >
            <div
                className="relative flex h-[94vh] max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:h-auto sm:max-h-[88vh]"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                {/* Header */}
                <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 px-4 py-3.5 text-white sm:px-5 sm:py-4">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white opacity-10" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/20 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-violet-200 sm:text-[10px]">
                                <Sparkles size={11} className="text-violet-300" />
                                Student Help & Guide
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
                            aria-label="Close guide"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <h3 className="mt-1 text-[15px] font-black leading-tight text-white sm:text-lg">
                        How to Use the Public Hub
                    </h3>
                    <p className="mt-0.5 text-[10.5px] text-white/70 sm:text-xs">
                        A quick guide on what to touch for each campus service.
                    </p>

                    {/* Navigation Tabs */}
                    <div className="mt-3 flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
                        <button
                            type="button"
                            onClick={() => setActiveTab('services')}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-bold transition sm:text-xs ${
                                activeTab === 'services'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-white/75 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <BookOpen size={13} className="shrink-0" />
                            <span className="truncate">
                                <span className="sm:hidden">Services ({filteredServices.length})</span>
                                <span className="hidden sm:inline">Services Guide ({filteredServices.length})</span>
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('faq')}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-bold transition sm:text-xs ${
                                activeTab === 'faq'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-white/75 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <FaqIcon size={13} className="shrink-0" />
                            <span className="truncate">
                                <span className="sm:hidden">FAQs ({filteredFaqs.length})</span>
                                <span className="hidden sm:inline">Questions & FAQs ({filteredFaqs.length})</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-2 sm:py-2.5">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                activeTab === 'services'
                                    ? 'Search services, attendance, counseling...'
                                    : 'Search questions, ID, privacy...'
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable Content Body */}
                <div className="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-2.5 sm:p-4 sm:space-y-3">
                    {/* Quick Notice Banner */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-violet-950">
                        <span className="mt-0.5 text-sm">💡</span>
                        <div className="text-[11.5px] leading-relaxed">
                            <strong className="font-bold text-violet-900">No Password Required:</strong>{' '}
                            The Public Page only asks for your <strong>Student ID</strong> when submitting or timing in. For full student account settings, use the{' '}
                            <span className="inline-flex items-center gap-0.5 rounded bg-violet-200/80 px-1 py-0.2 font-semibold text-violet-900">
                                Student Portal
                            </span>{' '}
                            at the top.
                        </div>
                    </div>

                    {/* TAB 1: SERVICES GUIDE */}
                    {activeTab === 'services' && (
                        <div className="space-y-2.5">
                            {filteredServices.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400">
                                    No services matching &quot;{searchQuery}&quot;
                                </div>
                            ) : (
                                filteredServices.map((service) => {
                                    const isExpanded = expandedServiceId === service.id;
                                    const IconComponent = service.icon;

                                    return (
                                        <div
                                            key={service.id}
                                            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedServiceId(isExpanded ? null : service.id)
                                                }
                                                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50/70"
                                            >
                                                <div
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                                                    style={{ backgroundColor: `${service.color}15` }}
                                                >
                                                    {service.emoji}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[13px] font-bold text-slate-900">
                                                            {service.title}
                                                        </h4>
                                                    </div>
                                                    <p className="line-clamp-1 text-[11px] text-slate-500">
                                                        {service.summary}
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    size={16}
                                                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180 text-violet-600' : ''
                                                    }`}
                                                />
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 text-xs animate-fade-in">
                                                    <div>
                                                        <span className="inline-block rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                            {service.badge}
                                                        </span>
                                                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                                                            {service.summary}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-lg border border-slate-200/60 bg-white p-2.5">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                            👉 What to touch / do:
                                                        </p>
                                                        <ul className="mt-1.5 space-y-1 text-[11px] text-slate-700">
                                                            {service.whatToTouch.map((step, idx) => (
                                                                <li key={idx} className="flex items-start gap-1.5">
                                                                    <span className="text-violet-600 font-bold">•</span>
                                                                    <span>{step}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {service.tip && (
                                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                                                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                            <span>Tip: {service.tip}</span>
                                                        </div>
                                                    )}

                                                    {onSelectService && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onSelectService(service.id);
                                                                onClose();
                                                            }}
                                                            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
                                                            style={{ backgroundColor: service.color }}
                                                        >
                                                            <span>Open {service.title}</span>
                                                            <ArrowUpRight size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 2: FAQS */}
                    {activeTab === 'faq' && (
                        <div className="space-y-2">
                            {filteredFaqs.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400">
                                    No FAQs matching &quot;{searchQuery}&quot;
                                </div>
                            ) : (
                                filteredFaqs.map((faq, index) => {
                                    const isOpen = expandedFaqIndex === index;

                                    return (
                                        <div
                                            key={index}
                                            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedFaqIndex(isOpen ? null : index)
                                                }
                                                className="flex w-full items-center justify-between gap-2 p-3 text-left transition hover:bg-slate-50/70"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="mt-0.5 text-violet-600 font-black text-xs">
                                                        Q:
                                                    </span>
                                                    <div>
                                                        <span className="text-[12.5px] font-bold text-slate-800">
                                                            {faq.question}
                                                        </span>
                                                        <span className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-bold text-slate-500">
                                                            {faq.tag}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronDown
                                                    size={15}
                                                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                                                        isOpen ? 'rotate-180 text-violet-600' : ''
                                                    }`}
                                                />
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-600 animate-fade-in">
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Close Button */}
                <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-2.5 sm:py-3 text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] sm:w-auto sm:px-6"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
