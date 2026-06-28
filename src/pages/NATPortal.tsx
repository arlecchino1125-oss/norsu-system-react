import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
    GraduationCap, ArrowLeft, FileText, Info, Check, User, Key,
    Calendar, MapPin, Loader2, Printer, X, Clock, HelpCircle, LogOut, Mail, Moon, Phone, ArrowRight, SunMedium
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { getSafeStudentActivationErrorMessage } from '../lib/studentActivationErrors';
import usePublicTheme from '../hooks/usePublicTheme';
import { usePermissionsForRole } from '../hooks/usePermissions';
import FeatureAvailabilityView from '../components/permissions/FeatureAvailabilityView';
import ApplicationWizard from './public/nat/components/ApplicationWizard';
import { getSafeErrorMessage } from '../utils/errorMasking';

// --- ASSETS & CONSTANTS ---
const NAT_TIME_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const NAT_SESSION_REFRESH_INTERVAL_MS = 90 * 1000;
const NAT_SECURE_TIME_CACHE_TTL_MS = 5 * 60 * 1000;
const NAT_APPLICATION_DRAFT_STORAGE_KEY = 'norsu-nat-application-draft-v1';

const INITIAL_NAT_FORM_DATA = {
    agreedToPrivacy: false,
    firstName: '', lastName: '', middleName: '', suffix: '',
    dob: '', age: '', placeOfBirth: '',
    nationality: 'Filipino',
    sex: '',
    genderIdentity: '',
    civilStatus: '',
    street: '', city: '', province: '', zipCode: '',
    mobile: '', email: '', facebookUrl: '',
    schoolLastAttended: '', yearLevelApplying: '', reason: '',
    priorityCourse: '', altCourse1: '', altCourse2: '', altCourse3: '',
    testDate: '', testTime: '',
    isWorkingStudent: 'No', workingStudentType: '',
    supporter: [], supporterContact: '',
    isPwd: 'No', pwdType: '',
    isIndigenous: 'No', indigenousGroup: '',
    witnessedConflict: 'No', isSoloParent: 'No', isChildOfSoloParent: 'No'
} as const;

const COURSE_CHOICE_FIELDS = [
    { name: 'priorityCourse', label: '1st Choice', accent: 'blue' },
    { name: 'altCourse1', label: '2nd Choice', accent: 'orange' },
    { name: 'altCourse2', label: '3rd Choice', accent: 'teal' }
] as const;

const NAT_FIELD_STEP_MAP: Record<string, number> = {
    agreedToPrivacy: 1,
    firstName: 1,
    lastName: 1,
    dob: 1,
    age: 1,
    placeOfBirth: 1,
    nationality: 1,
    sex: 1,
    civilStatus: 1,
    reason: 2,
    priorityCourse: 2,
    altCourse1: 2,
    altCourse2: 2,
    testDate: 2,
    testTime: 2,
    street: 3,
    city: 3,
    province: 3,
    zipCode: 3,
    mobile: 3,
    email: 3
};

type NatDraftPayload = {
    currentStep: number;
    formData: Record<string, any>;
};

type NatValidationScope =
    | { type: 'step'; step: number }
    | { type: 'all' }
    | null;

const loadNatDraft = (): NatDraftPayload | null => {
    if (typeof window === 'undefined') return null;

    try {
        const rawDraft = window.localStorage.getItem(NAT_APPLICATION_DRAFT_STORAGE_KEY);
        if (!rawDraft) return null;

        const parsedDraft = JSON.parse(rawDraft) as NatDraftPayload;
        if (!parsedDraft || typeof parsedDraft !== 'object') return null;

        return {
            currentStep: Math.min(Math.max(Number(parsedDraft.currentStep || 1), 1), 3),
            formData: {
                ...INITIAL_NAT_FORM_DATA,
                ...(parsedDraft.formData || {})
            }
        };
    } catch {
        return null;
    }
};

const hasMeaningfulNatDraft = (formData: Record<string, any>, currentStep: number) => {
    if (currentStep > 1) return true;

    return Object.entries(formData).some(([key, value]) => {
        const initialValue = (INITIAL_NAT_FORM_DATA as Record<string, any>)[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'boolean') return value !== initialValue;
        return String(value ?? '').trim() !== String(initialValue ?? '').trim();
    });
};

const saveNatDraft = (payload: NatDraftPayload) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NAT_APPLICATION_DRAFT_STORAGE_KEY, JSON.stringify(payload));
};

const clearNatDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(NAT_APPLICATION_DRAFT_STORAGE_KEY);
};

const normalizeText = (value: unknown) => String(value || '').trim();

const getCourseCapacityMeta = (course: any) => {
    const limit = Number(course?.application_limit || 200);
    const applicantCount = Number(course?.applicantCount || 0);
    const remaining = Math.max(limit - applicantCount, 0);
    const isClosed = String(course?.status || '') === 'Closed';
    const isFull = applicantCount >= limit;
    return {
        limit,
        applicantCount,
        remaining,
        isClosed,
        isFull,
        isSelectable: !isClosed && !isFull
    };
};

const getFirstInvalidStep = (errors: Record<string, string>) => {
    const steps = Object.keys(errors)
        .map((fieldName) => NAT_FIELD_STEP_MAP[fieldName] || 3)
        .sort((left, right) => left - right);

    return steps[0] || 1;
};

const validateNatFormData = ({
    formData,
    availableCourses,
    availableDates,
    selectedDateTimeSlots,
    supportsTestTime,
    scope
}: {
    formData: Record<string, any>;
    availableCourses: any[];
    availableDates: any[];
    selectedDateTimeSlots: any[];
    supportsTestTime: boolean;
    scope: NatValidationScope;
}) => {
    const errors: Record<string, string> = {};
    const validateStep = (step: number) => scope?.type === 'all' || (scope?.type === 'step' && scope.step === step);

    const selectedPriorityCourse = normalizeText(formData.priorityCourse);
    const selectedAltCourse1 = normalizeText(formData.altCourse1);
    const selectedAltCourse2 = normalizeText(formData.altCourse2);
    const selectedCourseChoices = [selectedPriorityCourse, selectedAltCourse1, selectedAltCourse2].filter(Boolean);

    const courseLookup = new Map(
        availableCourses.map((course: any) => [normalizeText(course?.name), course])
    );

    if (validateStep(1)) {
        if (!formData.agreedToPrivacy) errors.agreedToPrivacy = 'You must agree to the data privacy disclaimer before continuing.';
        if (!normalizeText(formData.firstName)) errors.firstName = 'First name is required.';
        if (!normalizeText(formData.lastName)) errors.lastName = 'Last name is required.';
        if (!normalizeText(formData.dob)) errors.dob = 'Date of birth is required.';

        const parsedAge = Number(formData.age);
        if (!normalizeText(formData.age)) {
            errors.age = 'Age is required.';
        } else if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
            errors.age = 'Please enter a valid age.';
        }

        if (!normalizeText(formData.placeOfBirth)) errors.placeOfBirth = 'Place of birth is required.';
        if (!normalizeText(formData.nationality)) errors.nationality = 'Nationality is required.';
        if (!normalizeText(formData.sex)) errors.sex = 'Sex assigned at birth is required.';
        if (!normalizeText(formData.civilStatus)) errors.civilStatus = 'Civil status is required.';
    }

    if (validateStep(2)) {
        if (!normalizeText(formData.reason)) errors.reason = 'Please tell us why you want to study at NORSU.';

        if (!selectedPriorityCourse) errors.priorityCourse = 'Please choose your first course preference.';
        if (!selectedAltCourse1) errors.altCourse1 = 'Please choose your second course preference.';
        if (!selectedAltCourse2) errors.altCourse2 = 'Please choose your third course preference.';

        if (selectedCourseChoices.length !== new Set(selectedCourseChoices).size) {
            if (!errors.priorityCourse) errors.priorityCourse = 'Each course preference must be different.';
            if (!errors.altCourse1) errors.altCourse1 = 'Each course preference must be different.';
            if (!errors.altCourse2) errors.altCourse2 = 'Each course preference must be different.';
        }

        COURSE_CHOICE_FIELDS.forEach((choiceField) => {
            const courseName = normalizeText(formData[choiceField.name]);
            if (!courseName) return;

            const matchedCourse = courseLookup.get(courseName);
            if (!matchedCourse) {
                errors[choiceField.name] = 'Please select a course from the available list.';
                return;
            }

            const capacity = getCourseCapacityMeta(matchedCourse);
            if (!capacity.isSelectable) {
                errors[choiceField.name] = capacity.isClosed
                    ? 'That course is currently closed. Please choose another option.'
                    : 'That course is already full. Please choose another option.';
            }
        });

        if (availableDates.length === 0) {
            errors.testDate = 'No test schedules are currently available. Please check back later.';
        } else if (!normalizeText(formData.testDate)) {
            errors.testDate = 'Please choose a preferred test date.';
        }

        if (supportsTestTime && normalizeText(formData.testDate) && selectedDateTimeSlots.length > 0 && !normalizeText(formData.testTime)) {
            errors.testTime = 'Please choose a preferred time slot.';
        }
    }

    if (validateStep(3)) {
        if (!normalizeText(formData.street)) errors.street = 'Complete address is required.';
        if (!normalizeText(formData.city)) errors.city = 'City or municipality is required.';
        if (!normalizeText(formData.province)) errors.province = 'Province is required.';
        if (!normalizeText(formData.zipCode)) errors.zipCode = 'Zip code is required.';

        const normalizedMobile = normalizeText(formData.mobile).replace(/\D/g, '');
        if (!normalizeText(formData.mobile)) {
            errors.mobile = 'Mobile number is required.';
        } else if (normalizedMobile.length < 10 || normalizedMobile.length > 13) {
            errors.mobile = 'Please enter a valid mobile number.';
        }

        if (!normalizeText(formData.email)) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(formData.email))) {
            errors.email = 'Enter a valid email address.';
        }
    }

    return errors;
};

const SessionSyncIndicator = ({ isSyncing, lastSyncedAt }: { isSyncing: boolean; lastSyncedAt: string | null }) => {
    const label = isSyncing
        ? 'Syncing session...'
        : lastSyncedAt
            ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : 'Session sync ready';

    return (
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${isSyncing ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>{label}</span>
        </div>
    );
};

const NatStatusSummaryScreen = ({
    credentials,
    itemVariants,
    onPrintSummary,
    onGoToLogin,
    onBackToWelcome
}: {
    credentials: Record<string, any> | null;
    itemVariants: Variants;
    onPrintSummary: () => void;
    onGoToLogin: () => void;
    onBackToWelcome: () => void;
}) => (
    <div className="nat-page-shell nat-page-shell-md max-w-4xl mx-auto w-full">
        <motion.div
            initial="initial"
            animate="in"
            variants={{
                initial: { opacity: 0 },
                in: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
                }
            }}
            className="nat-screen-card nat-print-summary bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 border border-white p-6 md:p-12 overflow-hidden relative"
        >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 nat-print-hidden"></div>

            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4">
                <div>
                    <h1 className="nat-panel-title text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Application Status</h1>
                    <p className="text-slate-500 text-sm font-semibold mt-2 flex items-center gap-2">Ref ID: <span className="font-mono text-xs md:text-sm text-slate-700 bg-white/60 border border-slate-200 px-2 md:px-3 py-1 rounded-lg shadow-sm">{credentials?.referenceId}</span></p>
                </div>
                <span className="px-5 md:px-6 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 text-emerald-700 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-3 shadow-md shadow-emerald-500/10 border border-emerald-200/50 w-full md:w-auto justify-center md:justify-start">
                    <span className="relative flex h-3.5 w-3.5 nat-print-hidden">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    Submitted Successfully
                </span>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
                <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[1.5rem] p-5 md:p-6 border border-white shadow-sm">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">Applicant Name</p>
                    <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{credentials?.firstName} {credentials?.lastName}</p>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-md rounded-[1.5rem] p-5 md:p-6 border border-blue-100/50 shadow-sm">
                    <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1 md:mb-2">Priority Course</p>
                    <p className="text-xl md:text-2xl font-black text-blue-700 tracking-tight">{credentials?.priorityCourse}</p>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="nat-callout bg-gradient-to-br from-blue-50/90 to-indigo-50/90 border border-blue-200/50 rounded-[1.5rem] p-8 mb-8 flex gap-5 shadow-inner">
                <div className="bg-white p-3 rounded-2xl h-fit text-blue-600 shadow-md shadow-blue-500/10 nat-print-hidden"><Clock className="w-7 h-7" /></div>
                <div>
                    <h3 className="font-extrabold text-slate-800 mb-2 text-lg">Next Steps</h3>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Your application is being processed. Please prepare for your admission test on <span className="font-black text-blue-700 bg-white/50 px-2 py-0.5 rounded-md border border-blue-100">{credentials?.testDate}</span>{credentials?.testTime ? <> at <span className="font-black text-blue-700 bg-white/50 px-2 py-0.5 rounded-md border border-blue-100">{formatTimeWindowLabel(credentials?.testTime)}</span></> : ''}.
                    </p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="nat-section-card bg-gradient-to-br from-amber-50/90 to-orange-50/90 border border-amber-200/50 rounded-[2rem] p-8 mb-10 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10 nat-print-hidden"></div>
                <div className="relative z-10">
                    <h3 className="text-lg font-black text-amber-900 mb-6 flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-amber-600 shadow-sm nat-print-hidden"><Key className="w-5 h-5" /></div> Your Portal Credentials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/80 backdrop-blur-sm border border-amber-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-black">Username</p>
                            <p className="font-mono font-black text-2xl text-slate-800 tracking-tight break-all">{credentials?.username}</p>
                        </div>
                        <div className="nat-print-hide-sensitive bg-white/80 backdrop-blur-sm border border-amber-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-black">Password</p>
                            <p className="font-mono font-black text-2xl text-slate-800 tracking-tight">{credentials?.password}</p>
                        </div>
                    </div>
                    <p className="text-sm text-amber-800 mt-6 font-bold flex items-center gap-2 opacity-90 block">
                        <Info className="w-4 h-4 nat-print-hidden" /> Please save these credentials. Use Print / Save Summary to keep a PDF copy. Password is hidden from printouts for safety.
                    </p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="nat-action-row nat-print-hidden flex flex-col md:flex-row gap-4">
                <button
                    onClick={onPrintSummary}
                    className="nat-secondary-action flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 text-slate-700 py-4 px-6 rounded-2xl font-black text-lg hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                >
                    <Printer className="w-5 h-5" /> Print / Save Summary
                </button>
                <button
                    onClick={onGoToLogin}
                    className="nat-primary-action flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 px-6 rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    <LogOut className="w-5 h-5 relative z-10" /> <span className="relative z-10">Go to Login Portal</span>
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>
                <button
                    onClick={onBackToWelcome}
                    className="nat-secondary-action flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 text-slate-700 py-4 px-6 rounded-2xl font-black text-lg hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                >
                    Back to Welcome
                </button>
            </motion.div>
        </motion.div>
    </div>
);

let natSecureTimeCache: { datetime: string; fetchedAt: number } | null = null;

const getTrustedNatTime = async () => {
    const nowTimestamp = Date.now();

    if (natSecureTimeCache && (nowTimestamp - natSecureTimeCache.fetchedAt) < NAT_SECURE_TIME_CACHE_TTL_MS) {
        const cachedBaseTimestamp = new Date(natSecureTimeCache.datetime).getTime();
        return new Date(cachedBaseTimestamp + (nowTimestamp - natSecureTimeCache.fetchedAt));
    }

    const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
    if (!response.ok) {
        throw new Error('Time API failed');
    }

    const timeData = await response.json();
    natSecureTimeCache = {
        datetime: String(timeData.datetime),
        fetchedAt: nowTimestamp
    };

    return new Date(timeData.datetime);
};


// --- REUSABLE LAYOUT COMPONENT ---
const NATLayout = ({ children, title = "NORSU Admission Test", showBack = false, onBack, rightAction, isDark = false, onToggleTheme }: any) => (
    <div className={`${isDark ? 'dark' : ''} nat-portal min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden font-inter selection:bg-blue-200 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]`}>
        {/* Animated Background Blobs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-cyan-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-4000"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
            {/* Glass Header */}
            <div className="sticky top-0 z-50 border-b border-white/50 bg-white/70 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/50 dark:border-slate-700/60 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/75">
                <div className="nat-layout-header max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/20 ring-1 ring-white/50">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-tight dark:text-white">{title}</h1>
                            <p className="text-xs text-blue-600 font-medium tracking-wide uppercase dark:text-sky-300">Gateway to Excellence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {onToggleTheme && (
                            <button
                                type="button"
                                onClick={onToggleTheme}
                                aria-pressed={isDark}
                                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-300"
                            >
                                {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                                {isDark ? 'Light mode' : 'Dark mode'}
                            </button>
                        )}
                        {rightAction}
                        {showBack && (
                            <button
                                onClick={onBack}
                                className="group flex items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:border-gray-200 hover:bg-white/50 hover:text-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 dark:hover:text-white"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="hidden md:inline">Back</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="nat-layout-main flex-grow p-4 md:p-8 flex flex-col justify-center">
                {children}
            </main>
        </div>
    </div>
);

const parseTimeToMinutes = (value: string) => {
    const [hour, minute] = String(value || '').split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
    return (hour * 60) + minute;
};

const formatTimeLabel = (value: string) => {
    const [hour, minute] = String(value || '').split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = ((hour + 11) % 12) + 1;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const formatTimeWindowLabel = (range: string) => {
    if (!range) return '';
    const [start, end] = String(range).split('-').map((part) => part.trim());
    if (!start || !end) return range;
    return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
};

const normalizeScheduleTimeWindows = (raw: any) => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((slot: any) => {
            const start = String(slot?.start || '').trim();
            const end = String(slot?.end || '').trim();
            const slots = parseInt(String(slot?.slots ?? '0'), 10);
            if (!start || !end || !Number.isFinite(slots) || slots <= 0) return null;
            if (parseTimeToMinutes(start) >= parseTimeToMinutes(end)) return null;
            return {
                start,
                end,
                slots,
                key: `${start}-${end}`,
                label: `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`
            };
        })
        .filter(Boolean);
};

const isNatFinishedStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Test Taken'
        || value === 'Passed'
        || value === 'Failed'
        || value === 'Qualified for Interview (1st Choice)'
        || value === 'Approved for Enrollment'
        || value === 'Interview Scheduled'
        || value.includes('Forwarded to')
        || value.includes('Application Unsuccessful');
};

const hasNatStartedStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Ongoing' || isNatFinishedStatus(value);
};

const hasNatAttendanceColumns = (record: any) => {
    if (!record || typeof record !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(record, 'time_in')
        || Object.prototype.hasOwnProperty.call(record, 'time_out');
};

const NATPortal = () => {
    const navigate = useNavigate();
    const { loginStudent } = useAuth() as any;
    const { isDark, toggleTheme } = usePublicTheme();
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState
    } = usePermissionsForRole('Public');
    const [draftSnapshot] = useState<NatDraftPayload | null>(() => loadNatDraft());
    // Start at 'welcome' screen
    const [currentScreen, setCurrentScreen] = useState<string>('welcome');
    const [currentStep, setCurrentStep] = useState<number>(draftSnapshot?.currentStep || 1);
    const [loading, setLoading] = useState<boolean>(false);
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [showActivationModal, setShowActivationModal] = useState<boolean>(false);
    const [activationConfirm, setActivationConfirm] = useState<{ visible: boolean; studentId: string; course: string }>({ visible: false, studentId: '', course: '' });
    const [activationSuccess, setActivationSuccess] = useState<{ visible: boolean; studentId: string; course: string; emailSent: boolean; password: string; viewed: boolean }>({ visible: false, studentId: '', course: '', emailSent: true, password: '', viewed: false });
    const [enrollConfirm, setEnrollConfirm] = useState<{ visible: boolean; studentId: string; course: string; resolve: ((v: boolean) => void) | null }>({ visible: false, studentId: '', course: '', resolve: null });

    // Auth & User State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [credentials, setCredentials] = useState<any>(null);

    // Options
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [availableDates, setAvailableDates] = useState<any[]>([]);
    const [natRequirements, setNatRequirements] = useState<string[]>([]);
    const [supportsTestTime, setSupportsTestTime] = useState<boolean>(true);

    // Form State
    const [formData, setFormData] = useState<any>(draftSnapshot?.formData || INITIAL_NAT_FORM_DATA);

    // Time State for Test Day
    const [timeState, setTimeState] = useState<any>({ isTestDate: false, isOpen: false });
    const [showTimeInConfirm, setShowTimeInConfirm] = useState(false);
    const [showTimeOutConfirm, setShowTimeOutConfirm] = useState(false);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [validationScope, setValidationScope] = useState<NatValidationScope>(null);
    const [isSessionSyncing, setIsSessionSyncing] = useState(false);
    const [lastSessionSyncAt, setLastSessionSyncAt] = useState<string | null>(null);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(Boolean(draftSnapshot));
    const [hasRestoredDraft] = useState(Boolean(draftSnapshot));

    const [toast, setToast] = useState<any>(null);

    const showToast = (msg: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(msg) : msg;
        setToast({ msg: safeMessage, type });
        setTimeout(() => setToast(null), 3000);
    };

    const natPortalAccessState = getFeatureAccessState('nat_portal');
    const showNatPortalAvailability = !(natPortalAccessState.isAllowed && natPortalAccessState.status === 'enabled');

    const invokeNatManagementFunction = async (body: any, fallbackMessage: string) => {
        return invokeEdgeFunction('manage-nat-applications', {
            body,
            fallbackMessage
        });
    };

    const supportsNatAttendance = hasNatAttendanceColumns(currentUser);
    const hasStartedCurrentNat = supportsNatAttendance ? Boolean(currentUser?.time_in) : hasNatStartedStatus(currentUser?.status);
    const hasFinishedCurrentNat = supportsNatAttendance ? Boolean(currentUser?.time_out) : isNatFinishedStatus(currentUser?.status);

    const selectedDateSchedule = availableDates.find((d: any) => d.date === formData.testDate);
    const selectedDateTimeSlots = selectedDateSchedule?.timeSlots || [];

    const runFormValidation = (scope: NatValidationScope) => {
        const errors = validateNatFormData({
            formData,
            availableCourses,
            availableDates,
            selectedDateTimeSlots,
            supportsTestTime,
            scope
        });

        setFieldErrors(errors);
        setValidationScope(scope);
        return errors;
    };

    const resolveInputClassName = (baseClassName: string, fieldName: string) => (
        `${baseClassName} ${fieldErrors[fieldName] ? 'border-red-300 bg-red-50/80 focus:border-red-500 focus:ring-red-500/20 dark:border-rose-400/60 dark:bg-rose-500/10 dark:focus:border-rose-400 dark:focus:ring-rose-400/20' : ''}`
    );

    const updateFormDraft = (updater: (previous: any) => any) => {
        setFormData((previous: any) => updater(previous));
    };

    const isWithinAssignedTimeWindow = (timeWindow: string, now: Date) => {
        if (!timeWindow) return null;
        const [start, end] = String(timeWindow).split('-').map((part) => part.trim());
        const startMin = parseTimeToMinutes(start);
        const endMin = parseTimeToMinutes(end);
        if (startMin < 0 || endMin < 0 || startMin >= endMin) return null;
        const nowMin = (now.getHours() * 60) + now.getMinutes();
        return nowMin >= startMin && nowMin < endMin;
    };

    // Load Options
    useEffect(() => {
        const fetchOptions = async () => {
            let statsData: any = {
                supportsTestTime: true,
                courseCounts: {},
                dateCounts: {},
                dateTimeCounts: {}
            };

            try {
                statsData = await invokeNatManagementFunction(
                    { mode: 'public-stats' },
                    'Failed to load NAT applicant counts.'
                );
            } catch (error) {
                console.error('Failed to load NAT applicant counts.', error);
            }

            // Fetch Courses
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, name, application_limit, status')
                .order('name');

            // Fetch Test Dates
            const { data: datesData } = await supabase
                .from('admission_schedules')
                .select('*')
                .eq('is_active', true)
                .order('date');

            const courseCounts = statsData?.courseCounts || {};
            const dateCounts = statsData?.dateCounts || {};
            const dateTimeCounts = statsData?.dateTimeCounts || {};
            const requirements = Array.isArray(statsData?.requirements)
                ? statsData.requirements.map((item: unknown) => String(item || '').trim()).filter(Boolean)
                : [];
            setSupportsTestTime(Boolean(statsData?.supportsTestTime));
            setNatRequirements(requirements);

            if (coursesData) {
                const coursesWithStats = coursesData.map((c: any) => ({
                    ...c,
                    applicantCount: courseCounts[c.name] || 0
                }));
                setAvailableCourses(coursesWithStats);
            }

            if (datesData) {
                const datesWithStats = datesData.map((d: any) => {
                    const normalizedWindows = normalizeScheduleTimeWindows(d.time_windows);
                    const timeSlots = normalizedWindows.map((slot: any) => {
                        const assigned = dateTimeCounts[`${d.date}|${slot.key}`] || 0;
                        return {
                            ...slot,
                            applicantCount: assigned,
                            remaining: Math.max(slot.slots - assigned, 0)
                        };
                    });
                    return {
                        ...d,
                        applicantCount: dateCounts[d.date] || 0,
                        timeSlots
                    };
                });
                setAvailableDates(datesWithStats);
            }
        };
        void fetchOptions();
    }, []);

    useEffect(() => {
        if (!hasMeaningfulNatDraft(formData, currentStep)) {
            clearNatDraft();
            return;
        }

        saveNatDraft({
            currentStep,
            formData
        });
    }, [currentStep, formData]);

    useEffect(() => {
        if (!validationScope) return;

        const errors = validateNatFormData({
            formData,
            availableCourses,
            availableDates,
            selectedDateTimeSlots,
            supportsTestTime,
            scope: validationScope
        });

        setFieldErrors(errors);
    }, [formData, availableCourses, availableDates, selectedDateTimeSlots, supportsTestTime, validationScope]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        if (supportsNatAttendance && currentUser?.time_in && !currentUser?.time_out) {
            const updateElapsed = () => {
                const start = new Date(currentUser.time_in).getTime();
                const diff = Date.now() - start;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            };

            updateElapsed();
            interval = setInterval(updateElapsed, 1000);
        } else {
            setElapsedTime('00:00:00');
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [supportsNatAttendance, currentUser?.time_in, currentUser?.time_out]);

    // Check Time Logic (Secure Server Time)
    useEffect(() => {
        if (currentScreen !== 'dashboard' || !currentUser || activationSuccess.visible) return;
        const checkTime = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }

            try {
                const now = await getTrustedNatTime();
                const todayDate = now.toISOString().split('T')[0];

                const isTestDate = currentUser.test_date === todayDate;
                const assignedWindowOpen = isWithinAssignedTimeWindow(currentUser.test_time, now);
                const fallbackHour = now.getHours();
                const fallbackOpen = (fallbackHour >= 8 && fallbackHour < 12) || (fallbackHour >= 13 && fallbackHour < 17);
                const isOpen = assignedWindowOpen === null ? fallbackOpen : assignedWindowOpen;
                setTimeState({ isTestDate, isOpen });
            } catch (err) {
                // Fallback to local time if API is down
                const now = new Date();
                const todayDate = now.toISOString().split('T')[0];

                const isTestDate = currentUser.test_date === todayDate;
                const assignedWindowOpen = isWithinAssignedTimeWindow(currentUser.test_time, now);
                const fallbackHour = now.getHours();
                const fallbackOpen = (fallbackHour >= 8 && fallbackHour < 12) || (fallbackHour >= 13 && fallbackHour < 17);
                const isOpen = assignedWindowOpen === null ? fallbackOpen : assignedWindowOpen;
                setTimeState({ isTestDate, isOpen });
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkTime();
            }
        };

        void checkTime();
        const interval = setInterval(() => { void checkTime(); }, NAT_TIME_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentScreen, currentUser, activationSuccess.visible]);

    useEffect(() => {
        if (currentScreen !== 'dashboard' || activationSuccess.visible || !credentials?.username || !credentials?.password) {
            return;
        }

        let cancelled = false;
        let hasCompletedInitialRefresh = false;

        const refreshSession = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }

            setIsSessionSyncing(true);
            try {
                const data = await invokeNatManagementFunction(
                    {
                        mode: 'session',
                        username: credentials.username,
                        password: credentials.password
                    },
                    'Failed to refresh the NAT portal session.'
                );

                if (cancelled || !data?.application) {
                    return;
                }

                setCurrentUser((prev: any) => {
                    const nextApplication = data.application;

                    if (
                        hasCompletedInitialRefresh
                        && prev?.status
                        && nextApplication?.status
                        && prev.status !== nextApplication.status
                    ) {
                        showToast(`Application marked as ${nextApplication.status}.`, 'info');
                    }

                    return prev ? { ...prev, ...nextApplication } : nextApplication;
                });

                hasCompletedInitialRefresh = true;
                setLastSessionSyncAt(new Date().toISOString());
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to refresh the NAT portal session.', error);
                }
            } finally {
                if (!cancelled) {
                    setIsSessionSyncing(false);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void refreshSession();
            }
        };

        void refreshSession();
        const interval = setInterval(() => { void refreshSession(); }, NAT_SESSION_REFRESH_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentScreen, credentials?.username, credentials?.password, activationSuccess.visible]);

    // Handlers
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'dob') {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            updateFormDraft((previous: any) => ({ ...previous, [name]: value, age: age >= 0 ? age : '' }));
        } else if (name === 'testDate') {
            updateFormDraft((previous: any) => ({ ...previous, testDate: value, testTime: '' }));
        } else {
            updateFormDraft((previous: any) => ({ ...previous, [name]: value }));
        }
    };

    const handleCheckboxGroup = (e: any, field: string) => {
        const { value, checked } = e.target;
        updateFormDraft((prev: any) => {
            const list = prev[field] || [];
            if (checked) return { ...prev, [field]: [...list, value] };
            return { ...prev, [field]: list.filter((item: any) => item !== value) };
        });
    };

    const handlePrivacyAgreementChange = (checked: boolean) => {
        updateFormDraft((previous: any) => ({ ...previous, agreedToPrivacy: checked }));
    };

    const handleDobChange = (value: string) => {
        updateFormDraft((previous: any) => {
            const age = value
                ? Math.floor((Date.now() - new Date(`${value}T00:00:00`).getTime()) / 31557600000)
                : '';

            return {
                ...previous,
                dob: value,
                age: age || age === 0 ? (age >= 0 ? age : '') : ''
            };
        });
    };

    const handlePrintSummary = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (loading) return;

        if (currentStep < 3) {
            const stepErrors = runFormValidation({ type: 'step', step: currentStep });
            if (Object.keys(stepErrors).length > 0) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            setFieldErrors({});
            setValidationScope(null);
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const finalErrors = runFormValidation({ type: 'all' });
        if (Object.keys(finalErrors).length > 0) {
            setCurrentStep(getFirstInvalidStep(finalErrors));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        const username = formData.email.trim();
        const password = Math.random().toString(36).slice(-8);

        try {
            const payload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName,
                suffix: formData.suffix,
                place_of_birth: formData.placeOfBirth,
                age: formData.age,
                sex: formData.sex,
                gender_identity: formData.genderIdentity,
                civil_status: formData.civilStatus,
                nationality: formData.nationality,
                reason: formData.reason,
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zip_code: formData.zipCode,
                mobile: formData.mobile,
                email: formData.email.trim(),
                facebook_url: formData.facebookUrl,
                priority_course: formData.priorityCourse,
                alt_course_1: formData.altCourse1,
                alt_course_2: formData.altCourse2,
                test_date: formData.testDate,
                username: username,
                password,
                dob: formData.dob
            } as any;
            if (supportsTestTime) payload.test_time = formData.testTime || null;

            const submission = await invokeEdgeFunction('submit-nat-application', {
                body: payload,
                fallbackMessage: 'Failed to submit the NAT application.'
            });
            const referenceId = String(submission?.referenceId || submission?.application?.reference_id || '');

            setCredentials({ ...formData, username, password, referenceId });

            let emailRequirements = natRequirements;
            try {
                const latestStatsData = await invokeNatManagementFunction(
                    { mode: 'public-stats' },
                    'Failed to load NAT requirements.'
                );
                emailRequirements = Array.isArray(latestStatsData?.requirements)
                    ? latestStatsData.requirements.map((item: unknown) => String(item || '').trim()).filter(Boolean)
                    : emailRequirements;
            } catch (requirementsError) {
                console.error('Failed to refresh NAT requirements before email send:', requirementsError);
            }

            // Send Email Notification
            try {
                const emailResult = await sendTransactionalEmailNotification({
                    type: 'NAT_SUBMISSION',
                    email: formData.email,
                    name: `${formData.firstName} ${formData.lastName}`,
                    testDate: formData.testDate,
                    testTime: formData.testTime,
                    requirements: emailRequirements,
                    username: username,
                    password: password
                }, 'Failed to send NAT submission email.');
                if (!emailResult.emailSent) {
                    throw new Error(emailResult.emailError || 'Failed to send NAT submission email.');
                }
            } catch (emailErr: any) {
                console.error("Email notification failed:", emailErr);
                showToast("Application saved, but email notification failed. Please save your credentials manually.", 'error'); // changed type to match HTML slightly or keep as warning
            }

            setShowSuccessModal(true);
            clearNatDraft();
            setFieldErrors({});
            setValidationScope(null);
        } catch (error: any) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                showToast('Submission Failed: This email address is already registered.', 'error');
            } else {
                showToast('Something went wrong.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: any) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        const user = e.target.username.value;
        const pass = e.target.password.value;
        try {
            const data = await invokeNatManagementFunction(
                {
                    mode: 'login',
                    username: user,
                    password: pass
                },
                'Failed to sign in to the NAT portal.'
            );

            setCredentials((prev: any) => ({
                ...(prev || {}),
                username: user,
                password: pass,
                referenceId: data?.application?.reference_id || prev?.referenceId || ''
            }));
            setCurrentUser(data.application);
            setCurrentScreen('dashboard');
        } catch (err: any) {
            showToast("Login error: ", 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeIn = async () => {
        if (loading) return;
        if (!credentials?.username || !credentials?.password) {
            showToast('Your NAT session has expired. Sign in again.', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = await invokeNatManagementFunction(
                {
                    mode: 'time-in',
                    username: credentials.username,
                    password: credentials.password
                },
                'Failed to record Time In.'
            );

            const application = data?.application || {};
            showToast(application?.time_in ? "Time In recorded successfully. Good luck!" : "NAT started successfully. Good luck!");
            setCurrentUser({ ...currentUser, ...application, status: application.status || 'Ongoing' });
            setShowTimeInConfirm(false);
        } catch (error: any) {
            showToast("Error recording Time In: ", 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeOut = async () => {
        if (loading) return;
        if (!credentials?.username || !credentials?.password) {
            showToast('Your NAT session has expired. Sign in again.', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = await invokeNatManagementFunction(
                {
                    mode: 'time-out',
                    username: credentials.username,
                    password: credentials.password
                },
                'Failed to record Time Out.'
            );

            const application = data?.application || {};
            showToast(application?.time_out ? "Time Out recorded. You have completed the NAT." : "NAT completion recorded.");
            setCurrentUser({ ...currentUser, ...application, status: application.status || 'Test Taken' });
            setShowTimeOutConfirm(false);
        } catch (error: any) {
            showToast('Something went wrong.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeActivation = async (studentId: string, course: string) => {
        if (loading) return;
        setLoading(true);

        try {
            const activateNatAccount = async (allowEnrollmentCreate = false) => {
                return invokeEdgeFunction('activate-student-account', {
                    body: {
                        mode: 'nat-application-activation',
                        applicationId: currentUser.id,
                        studentId,
                        course,
                        allowEnrollmentCreate
                    },
                    fallbackMessage: 'Activation failed.'
                });
            };

            let data;

            try {
                data = await activateNatAccount(false);
            } catch (error: any) {
                const missingEnrollment = String('').includes('Student ID not found in the enrollment list.');
                const canContinue = missingEnrollment && currentUser?.status === 'Approved for Enrollment';

                if (!canContinue) {
                    throw error;
                }

                const confirmed = await new Promise<boolean>((resolve) => {
                    setEnrollConfirm({
                        visible: true,
                        studentId,
                        course,
                        resolve
                    });
                });

                if (!confirmed) {
                    return;
                }

                data = await activateNatAccount(true);
            }

            let emailSent = true;
            try {
                const emailResult = await sendTransactionalEmailNotification({
                    type: 'STUDENT_ACTIVATION',
                    email: currentUser.email,
                    name: `${currentUser.first_name} ${currentUser.last_name}`.trim(),
                    studentId,
                    password: data.password,
                    loginUrl: `${window.location.origin}/student/login`
                }, 'Failed to send activation email.');
                emailSent = emailResult.emailSent;
                if (!emailResult.emailSent) {
                    console.error('Activation email failed:', emailResult.emailError);
                }
            } catch (emailErr: any) {
                emailSent = false;
                console.error('Activation email failed:', emailErr);
            }

            setShowActivationModal(false);
            setActivationSuccess({
                visible: true,
                studentId,
                course,
                emailSent,
                password: String(data?.password || ''),
                viewed: false
            });
        } catch (error: any) {
            showToast(`We couldn't activate your account. Please try again.`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActivation = (e: any) => {
        e.preventDefault();
        const studentId = e.target.studentId.value.trim();
        const course = e.target.course.value.trim();

        setActivationConfirm({
            visible: true,
            studentId,
            course
        });
    };

    const handleConfirmedActivation = async () => {
        if (loading) return;
        const { studentId, course } = activationConfirm;
        setActivationConfirm({ visible: false, studentId: '', course: '' });
        await executeActivation(studentId, course);
    };

    const handleActivationSuccessContinue = () => {
        setActivationSuccess({ visible: false, studentId: '', course: '', emailSent: true, password: '', viewed: false });
        setCurrentUser(null);
        setCredentials(null);
        navigate('/student/login');
    };

    const handleActivationSuccessLogin = async () => {
        if (!activationSuccess.studentId || !activationSuccess.password) {
            handleActivationSuccessContinue();
            return;
        }

        setLoading(true);

        try {
            const result = await loginStudent(activationSuccess.studentId, activationSuccess.password);

            if (result?.success) {
                setActivationSuccess({ visible: false, studentId: '', course: '', emailSent: true, password: '', viewed: false });
                setCurrentUser(null);
                setCredentials(null);
                showToast('Login Successful', 'success');
                setTimeout(() => navigate('/student'), 700);
                return;
            }

            showToast(
                result?.error || 'Automatic sign-in failed. Use the account details you saved on the student login page.',
                'error'
            );
            handleActivationSuccessContinue();
        } finally {
            setLoading(false);
        }
    };

    const handleNatLogout = () => {
        setCurrentUser(null);
        setCredentials(null);
        setCurrentScreen('welcome');
    };



    // Render Views
    // Page transition variants
    // --- ANIMATION VARIANTS ---
    const containerVariants: Variants = {
        initial: { opacity: 0 },
        in: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        initial: { opacity: 0, y: 20 },
        in: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };


    // --- DATA FETCHING ---
    if (permissionsLoading) {
        return (
            <NATLayout
                title="NAT Portal"
                isDark={isDark}
                onToggleTheme={toggleTheme}
                rightAction={(
                    <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                        Back to Main
                    </button>
                )}
            >
                <div className="nat-page-shell nat-page-shell-sm max-w-3xl mx-auto w-full">
                    <div className={`rounded-[2.5rem] border p-10 text-center shadow-2xl ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-white bg-white/70 text-slate-800'}`}>
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
                        <p className="mt-4 text-sm font-semibold">Loading NAT portal access...</p>
                    </div>
                </div>
            </NATLayout>
        );
    }

    if (permissionsError) {
        return (
            <NATLayout
                title="NAT Portal"
                isDark={isDark}
                onToggleTheme={toggleTheme}
                rightAction={(
                    <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                        Back to Main
                    </button>
                )}
            >
                <div className="nat-page-shell nat-page-shell-sm max-w-3xl mx-auto w-full">
                    <div className={`rounded-[2.5rem] border p-10 text-center shadow-2xl ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-white bg-white/70 text-slate-800'}`}>
                        <h2 className="text-2xl font-black tracking-tight">Unable to load NAT portal availability</h2>
                        <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {permissionsError}
                        </p>
                    </div>
                </div>
            </NATLayout>
        );
    }

    if (showNatPortalAvailability) {
        return (
            <NATLayout
                title="NAT Portal"
                isDark={isDark}
                onToggleTheme={toggleTheme}
                rightAction={(
                    <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                        Back to Main
                    </button>
                )}
            >
                <div className="nat-page-shell nat-page-shell-lg max-w-5xl mx-auto w-full">
                    <FeatureAvailabilityView
                        title="NAT Portal"
                        permission={natPortalAccessState}
                        description="Online NAT services are temporarily unavailable. Please check official NORSU announcements for the next opening schedule or return later."
                        accent="blue"
                    />
                </div>
            </NATLayout>
        );
    }

    // --- RENDER SCREEN: WELCOME ---
    if (currentScreen === 'welcome') return (
        <NATLayout
            isDark={isDark}
            onToggleTheme={toggleTheme}
            rightAction={
                <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                    Back to Main
                </button>
            }
        >
            <div className="nat-page-shell nat-page-shell-lg max-w-5xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="nat-screen-card nat-hero-card bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white p-6 md:p-14 text-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none"></div>

                    <motion.div
                        variants={containerVariants}
                        initial="initial"
                        animate="in"
                        className="relative z-10"
                    >
                        <motion.div variants={itemVariants} className="inline-flex p-4 md:p-5 bg-gradient-to-br from-white to-blue-50 border border-white rounded-[2rem] shadow-xl shadow-blue-200/50 mb-6 md:mb-8 transform hover:scale-110 transition-transform duration-500 relative">
                            <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full"></div>
                            <FileText className="w-10 h-10 md:w-14 md:h-14 text-blue-600 relative z-10 drop-shadow-sm" />
                        </motion.div>
                        <motion.h2 variants={itemVariants} className="nat-hero-title text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 mb-4 tracking-tight">
                            Welcome to NORSU
                        </motion.h2>
                        <motion.p variants={itemVariants} className="nat-hero-lead text-lg md:text-2xl text-slate-600/90 font-medium mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
                            Begin your academic journey with the Negros Oriental State University Admission Test.
                        </motion.p>

                        <motion.div variants={containerVariants} className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12 text-left">
                            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform group/card hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-3 text-base md:text-lg relative z-10">
                                    <div className="p-2 bg-blue-100/50 rounded-xl"><Info className="w-5 h-5 text-blue-600" /></div> About the Test
                                </h3>
                                <p className="text-sm md:text-base text-slate-600/90 leading-relaxed font-medium relative z-10">
                                    The NAT assesses your readiness for university-level education. It ensures you are prepared for the academic challenges ahead with a comprehensive evaluation.
                                </p>
                            </motion.div>
                            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform group/steps hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover/steps:opacity-100 transition-opacity duration-300"></div>
                                <h3 className="font-bold text-slate-800 mb-5 text-base md:text-lg relative z-10">Application Steps</h3>
                                <div className="space-y-3 md:space-y-4 relative z-10">
                                    {["Complete application form", "Choose test schedule", "Receive credentials", "Take the test"].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-700 font-bold group/step">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center text-[10px] md:text-xs font-black border border-blue-200/50 shadow-sm group-hover/step:scale-110 transition-transform">{i + 1}</div>
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="nat-action-row flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-lg mx-auto">
                            <button
                                onClick={() => setCurrentScreen('form')}
                                className="nat-primary-action flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 md:py-4 px-6 md:px-8 rounded-2xl font-bold text-base md:text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2">Apply Now <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                            </button>
                            <button
                                onClick={() => setCurrentScreen('login')}
                                className="nat-secondary-action flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 text-slate-700 py-3 md:py-4 px-6 md:px-8 rounded-2xl font-bold text-base md:text-lg hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-95"
                            >
                                Login to Portal
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>

                <p className="text-center text-slate-400/80 text-sm mt-8 font-semibold tracking-wide">Copyright {new Date().getFullYear()} NORSU Admission Office. All rights reserved.</p>
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: STATUS ---
    if (currentScreen === 'status') return (
        <NATLayout title="Applicant Status" showBack={false} isDark={isDark} onToggleTheme={toggleTheme}>
            <NatStatusSummaryScreen
                credentials={credentials}
                itemVariants={itemVariants}
                onPrintSummary={handlePrintSummary}
                onGoToLogin={() => setCurrentScreen('login')}
                onBackToWelcome={() => setCurrentScreen('welcome')}
            />
        </NATLayout>
    );

    // --- RENDER SCREEN: LOGIN ---
    if (currentScreen === 'login') return (
        <NATLayout
            title="Applicant Login"
            showBack={true}
            onBack={() => setCurrentScreen('welcome')}
            isDark={isDark}
            onToggleTheme={toggleTheme}
        >
            <div className="nat-page-shell nat-page-shell-sm max-w-md mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="nat-screen-card nat-login-card bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white p-8 md:p-10 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    <div className="text-center mb-8">
                        <div className="bg-gradient-to-br from-white to-blue-50 rounded-[1.5rem] w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200/50 relative border border-white">
                            <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full"></div>
                            <Key className="w-10 h-10 text-blue-600 relative z-10 drop-shadow-sm" />
                        </div>
                        <h1 className="nat-panel-title text-3xl font-black text-slate-800 tracking-tight mb-2">Access Your Portal</h1>
                        <p className="text-slate-600 font-medium">Enter the credentials sent to your email.</p>
                    </div>

                    <div className="nat-callout bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-5 mb-8 flex gap-3 shadow-inner">
                        <Info className="text-blue-500 shrink-0 w-5 h-5 mt-0.5 drop-shadow-sm" />
                        <p className="text-xs text-blue-800/90 leading-relaxed font-bold">
                            First time here? Your username and password are temporarily assigned after you submit your application form.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    name="username"
                                    required
                                    className="nat-auth-input w-full pl-12 pr-4 py-4 bg-white/60 border-2 border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-bold text-slate-800 z-10 relative shadow-sm"
                                    placeholder="e.g. user_123456"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="nat-auth-input w-full pl-12 pr-4 py-4 bg-white/60 border-2 border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-bold font-mono text-slate-800 shadow-sm tracking-wide"
                                    placeholder="Enter password"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="nat-primary-action w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-2xl font-black mt-4 hover:shadow-xl hover:shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <LogOut className="w-5 h-5 relative z-10" />}
                            <span className="relative z-10">{loading ? "Verifying..." : "Secure Login"}</span>
                        </button>
                    </form>
                </motion.div>

                {toast && (
                    <div className={`nat-print-hidden fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[100] backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/90' : toast.type === 'info' ? 'bg-blue-500/90' : 'bg-green-500/90'}`}>
                        <div className="bg-white/20 p-2 rounded-full">{toast.type === 'error' ? '!' : toast.type === 'info' ? 'i' : 'OK'}</div>
                        <div>
                            <h4 className="font-bold text-sm">{toast.type === 'error' ? 'Login Failed' : toast.type === 'info' ? 'Update' : 'Success'}</h4>
                            <p className="text-xs opacity-90 font-medium">{toast.msg}</p>
                        </div>
                    </div>
                )}
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: DASHBOARD ---
    if (currentScreen === 'dashboard') {
        if (!currentUser) return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
        return (
            <NATLayout
                title="Applicant Dashboard"
                isDark={isDark}
                onToggleTheme={toggleTheme}
                rightAction={
                    <button
                        onClick={handleNatLogout}
                        className="flex items-center gap-2 rounded-lg border border-white/50 bg-white/50 px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-white/80 hover:shadow active:scale-95 dark:border-slate-700 dark:bg-slate-800/80 dark:text-rose-300 dark:hover:bg-slate-800"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                }
            >
                <div className="nat-page-shell nat-page-shell-xl max-w-6xl mx-auto w-full animate-slide-in-up pb-24">

                    {/* Smart Action Bar (Time In/Out) */}
                    <div className="fixed bottom-0 left-0 w-full z-50 p-4 flex justify-center pointer-events-none">
                        <div className={`nat-action-bar pointer-events-auto bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 flex items-center gap-4 transition-all duration-500 max-w-lg w-full ${!hasStartedCurrentNat ? 'translate-y-0 opacity-100' : ''}`}>

                            {/* Status Display */}
                            <div className="flex-1 pl-4">
                                {!hasStartedCurrentNat ? (
                                    <div>
                                        <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Ready</p>
                                        <p className="text-white font-bold">Good luck, {currentUser.first_name}!</p>
                                    </div>
                                ) : !hasFinishedCurrentNat ? (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Ongoing</p>
                                        </div>
                                        {supportsNatAttendance ? (
                                            <p className="text-white font-mono font-bold text-lg">{elapsedTime}</p>
                                        ) : (
                                            <p className="text-white font-bold text-sm">Finish the exam when instructed by the proctor.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-400" />
                                            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Done</p>
                                        </div>
                                        <p className="text-white font-bold">Great job!</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <div>
                                {!hasStartedCurrentNat ? (
                                    <button
                                        onClick={() => setShowTimeInConfirm(true)}
                                        disabled={!(timeState.isTestDate && timeState.isOpen)}
                                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${(timeState.isTestDate && timeState.isOpen) ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 hover:shadow-green-500/30' : 'bg-gray-500/50 cursor-not-allowed grayscale'}`}
                                    >
                                        <Clock className="w-5 h-5" /> TIME IN
                                    </button>
                                ) : !hasFinishedCurrentNat ? (
                                    <button
                                        onClick={() => setShowTimeOutConfirm(true)}
                                        className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 hover:shadow-red-500/30"
                                    >
                                        <LogOut className="w-5 h-5" /> TIME OUT
                                    </button>
                                ) : (
                                    <button disabled className="px-6 py-3 rounded-xl font-bold text-white/50 bg-white/10 cursor-not-allowed flex items-center gap-2">
                                        <Check className="w-5 h-5" /> DONE
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Time In Confirmation Modal */}
                    {showTimeInConfirm && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E')] opacity-20"></div>
                                    <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-md shadow-inner">
                                        <Clock className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">Time In?</h3>
                                    <p className="text-green-50 text-sm relative z-10">Your time will begin immediately.</p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                                            <Info className="w-5 h-5 text-gray-400 shrink-0" />
                                            <span>Ensure you are in the examination room.</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                                            <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                                            <span>{supportsNatAttendance ? 'Your time-in record will be saved immediately.' : 'Your application status will switch to `Ongoing` once you start.'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setShowTimeInConfirm(false)} className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button disabled={loading} onClick={executeTimeIn} className="py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 hover:-translate-y-1 transition-all disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Processing...' : 'Confirm Time In'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Time Out Confirmation Modal */}
                    {showTimeOutConfirm && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E')] opacity-20"></div>
                                    <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-md shadow-inner">
                                        <LogOut className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">Time Out?</h3>
                                    <p className="text-red-50 text-sm relative z-10">This will stop your timer.</p>
                                </div>
                                <div className="p-6">
                                    <p className="text-center text-gray-600 text-sm mb-6">
                                        {supportsNatAttendance ? 'Are you sure you want to clock out? This action cannot be undone.' : 'Are you sure you want to finish the NAT? This action cannot be undone.'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setShowTimeOutConfirm(false)} className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button disabled={loading} onClick={executeTimeOut} className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 hover:-translate-y-1 transition-all disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Processing...' : 'Confirm Time Out'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activation Modal */}
                    {showActivationModal && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/20 relative">
                                <div className="sticky top-0 z-10 bg-white rounded-t-2xl">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl"></div>
                                    <div className="flex justify-between items-start p-6 pb-4 pt-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Activate Student Account</h3>
                                            <p className="text-sm text-gray-500 mt-1">Enter your details to sync with Student Portal</p>
                                        </div>
                                        <button onClick={() => setShowActivationModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                                    </div>
                                </div>

                                <form onSubmit={handleActivation} className="space-y-4 p-6 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Student ID</label>
                                        <input required name="studentId" pattern="\d{9}" title="Student ID must be exactly 9 digits" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono" placeholder="Ex: 202612345" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Enrolled Course</label>
                                        <select required name="course" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                            <option value="">Select Course</option>
                                            {availableCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-1">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Activate Account'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Activation Confirmation Modal */}
                    {activationConfirm.visible && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[250] p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-center">
                                    <div className="bg-white/20 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center backdrop-blur-md">
                                        <Info className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Confirm Activation</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Please confirm that these details are correct before creating your student portal account.
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                        <div className="flex items-center gap-2 text-sm text-gray-800">
                                            <span className="font-bold">Student ID:</span>
                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{activationConfirm.studentId}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-800">
                                            <span className="font-bold">Course:</span>
                                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{activationConfirm.course}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setActivationConfirm({ visible: false, studentId: '', course: '' })}
                                            className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                                        >Cancel</button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={handleConfirmedActivation}
                                            className="py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 hover:-translate-y-1 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                        >{loading ? 'Processing...' : 'Confirm'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enrollment Confirmation Modal (replaces window.confirm) */}
                    {enrollConfirm.visible && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[300] p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto border border-white/20 relative">
                                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-center rounded-t-2xl">
                                    <div className="bg-white/20 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center backdrop-blur-md">
                                        <Info className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Enrollment Record Still Pending</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        We could not find your enrollment record yet. This usually means your enrollment details are still being processed.
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Please review these details:</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-800">
                                            <span className="font-bold">Student ID:</span>
                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{enrollConfirm.studentId}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-800">
                                            <span className="font-bold">Course:</span>
                                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{enrollConfirm.course}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Since your application is already approved for enrollment, you may continue activation using the information shown below.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { enrollConfirm.resolve?.(false); setEnrollConfirm({ visible: false, studentId: '', course: '', resolve: null }); }}
                                            className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                                        >Cancel</button>
                                        <button
                                            type="button"
                                            onClick={() => { enrollConfirm.resolve?.(true); setEnrollConfirm({ visible: false, studentId: '', course: '', resolve: null }); }}
                                            className="py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 hover:-translate-y-1 transition-all"
                                        >Continue Activation</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activation Success Modal */}
                    {activationSuccess.visible && (
                        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[350] p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center">
                                    <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-md">
                                        <Check className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">Account Activated</h3>
                                    <p className="text-green-50 text-sm mt-2">Your student portal account is now ready.</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {activationSuccess.emailSent
                                            ? 'A confirmation email with your login details has been sent. Review the account details below first for backup before you log in.'
                                            : 'Your account was activated, but the confirmation email could not be sent. Review the account details below for backup before you log in.'}
                                    </p>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        <p className="font-bold uppercase tracking-wider text-xs mb-1">Reminder</p>
                                        <p className="leading-relaxed">Take a screenshot or save these account details in a secure place. Do not share your password with anyone.</p>
                                    </div>
                                    {activationSuccess.viewed ? (
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                            <div className="flex items-center gap-2 text-sm text-gray-800">
                                                <span className="font-bold">Student ID:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{activationSuccess.studentId}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-800">
                                                <span className="font-bold">Course:</span>
                                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{activationSuccess.course}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-800">
                                                <span className="font-bold">Temporary Password:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{activationSuccess.password}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
                                            Tap <span className="font-bold text-slate-800">View Account</span> to reveal your student portal login details.
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {!activationSuccess.viewed ? (
                                            <button
                                                type="button"
                                                onClick={() => setActivationSuccess((prev) => ({ ...prev, viewed: true }))}
                                                className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 hover:-translate-y-1 transition-all"
                                            >
                                                View Account
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={handleActivationSuccessLogin}
                                                    className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 hover:-translate-y-1 transition-all disabled:opacity-70"
                                                >
                                                    {loading ? 'Logging In...' : 'Log In to Student Portal'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleActivationSuccessContinue}
                                                    className="w-full py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                                                >
                                                    Return to Student Login
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                        {/* Left Column: Status Card + Actions */}
                        <div className="lg:col-span-2 space-y-4 md:space-y-6">
                            {/* Header Info */}
                            <div className="nat-section-card bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-blue-900/5">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4 mb-5 md:mb-6">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Hello, {currentUser.first_name}!</h2>
                                        <p className="text-gray-500 text-xs md:text-sm">Reference ID: <span className="font-mono text-gray-700">{currentUser.reference_id}</span></p>
                                        <div className="mt-3">
                                            <SessionSyncIndicator isSyncing={isSessionSyncing} lastSyncedAt={lastSessionSyncAt} />
                                        </div>
                                    </div>
                                    <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-[10px] md:text-xs font-bold border border-green-200 w-fit">
                                        Status: {currentUser.status || 'Applied'}
                                    </span>
                                </div>

                                {/* Activation Status */}
                                <div className="mb-5 md:mb-6">
                                    <button
                                        onClick={() => setShowActivationModal(true)}
                                        disabled={currentUser?.status !== 'Approved for Enrollment'}
                                        className={`w-full py-3 md:py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm md:text-base ${currentUser?.status === 'Approved for Enrollment' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <GraduationCap className="w-4 h-4 md:w-5 md:h-5" /> Activate Student Account
                                    </button>
                                    {currentUser?.status !== 'Approved for Enrollment' && (
                                        <p className="text-center text-[10px] md:text-xs text-gray-500 mt-2 font-medium flex justify-center items-center gap-1 px-2">
                                            <Info className="w-3 h-3 shrink-0" /> Activation unlocks after your department interview is completed and approved.
                                        </p>
                                    )}
                                </div>

                                {/* Attendance Widget */}
                                {hasStartedCurrentNat && (
                                    <div className={`border rounded-2xl p-4 md:p-6 transition-all duration-300 ${!hasFinishedCurrentNat ? 'bg-blue-50/50 border-blue-100 shadow-blue-500/5' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex justify-between items-center mb-4 md:mb-6">
                                            <h3 className={`font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider ${!hasFinishedCurrentNat ? 'text-blue-900' : 'text-gray-500'}`}>
                                                <Clock className="w-4 h-4 md:w-5 md:h-5" /> {supportsNatAttendance ? 'Attendance Log' : 'Exam Progress'}
                                            </h3>
                                            {!hasFinishedCurrentNat && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] md:text-xs font-bold animate-pulse">Live</span>
                                            )}
                                        </div>

                                        {supportsNatAttendance ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                                    <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><Clock className="w-8 h-8 md:w-12 md:h-12 text-blue-100 transform rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                        <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Started At</p>
                                                        <p className="font-mono text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                            {currentUser.time_in ? new Date(currentUser.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><LogOut className="w-8 h-8 md:w-12 md:h-12 text-gray-100 transform -rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                        <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Finished At</p>
                                                        <p className="font-mono text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                            {currentUser.time_out ? new Date(currentUser.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!hasFinishedCurrentNat && (
                                                    <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                                                        <span className="text-xs md:text-sm font-medium text-gray-500">Duration</span>
                                                        <span className="font-mono text-xl md:text-2xl font-bold text-blue-600 tabular-nums">{elapsedTime}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                                    <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><Clock className="w-8 h-8 md:w-12 md:h-12 text-blue-100 transform rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                        <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Started</p>
                                                        <p className="text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                            {hasStartedCurrentNat ? 'Yes' : 'Not yet'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><LogOut className="w-8 h-8 md:w-12 md:h-12 text-gray-100 transform -rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                        <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Completed</p>
                                                        <p className="text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                            {hasFinishedCurrentNat ? 'Yes' : 'Pending'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!hasFinishedCurrentNat && (
                                                    <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                                                        <span className="text-xs md:text-sm font-medium text-gray-500">Current Status</span>
                                                        <span className="text-sm md:text-base font-bold text-blue-600">{currentUser.status || 'Ongoing'}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Test Details */}
                            <div className="nat-section-card bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-indigo-900/5">
                                <h3 className="font-bold text-gray-900 mb-5 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Test Details
                                </h3>
                                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><Calendar className="w-4 h-4 md:w-5 md:h-5" /></div>
                                        <div>
                                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Test Date</p>
                                            <p className="font-semibold text-gray-900 text-sm md:text-base">{currentUser.test_date}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><Clock className="w-4 h-4 md:w-5 md:h-5" /></div>
                                        <div>
                                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Test Time</p>
                                            <p className="font-semibold text-gray-900 text-sm md:text-base">{currentUser.test_time ? formatTimeWindowLabel(currentUser.test_time) : 'Assigned on test day'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><MapPin className="w-4 h-4 md:w-5 md:h-5" /></div>
                                        <div>
                                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Venue</p>
                                            <p className="font-semibold text-gray-900 text-sm md:text-base">NORSU Main Campus</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="nat-section-card bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-amber-900/5">
                                <h3 className="font-bold text-gray-900 mb-5 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                                    <Check className="w-4 h-4 md:w-5 md:h-5 text-amber-500" /> Requirements to Bring
                                </h3>
                                {natRequirements.length === 0 ? (
                                    <p className="text-sm text-gray-500">No requirements have been posted yet. Please check again later.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {natRequirements.map((requirement, index) => (
                                            <div key={`${requirement}-${index}`} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                                                    {index + 1}
                                                </span>
                                                <p className="text-sm font-medium text-gray-800">{requirement}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Profile Summary */}
                        <div className="nat-section-card bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-blue-900/5 h-fit">
                            <h3 className="font-bold text-gray-900 mb-5 md:mb-6 flex items-center gap-2 border-b border-gray-100 pb-4 text-sm md:text-base">
                                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-500" /> Profile Summary
                            </h3>

                            <div className="space-y-5 md:space-y-6">
                                <div>
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-1">Full Name</p>
                                    <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{currentUser.first_name} {currentUser.middle_name} {currentUser.last_name} {currentUser.suffix}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-1">Contact</p>
                                    <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                                        <p className="flex items-center gap-2 text-gray-700 truncate"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.email}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.mobile}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.city}, {currentUser.province}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-2 md:mb-3">Course Preferences</p>
                                    <div className="space-y-2 md:space-y-3">
                                        <div className="bg-blue-50 p-2.5 md:p-3 rounded-xl border border-blue-100">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-blue-400 block mb-0.5 md:mb-1">1st Choice</span>
                                            <p className="text-xs md:text-sm font-bold text-blue-900 leading-tight">{currentUser.priority_course}</p>
                                        </div>
                                        <div className="px-2 md:px-3">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 block mb-0.5 md:mb-1">2nd Choice</span>
                                            <p className="text-[11px] md:text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_1}</p>
                                        </div>
                                        <div className="px-2 md:px-3">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 block mb-0.5 md:mb-1">3rd Choice</span>
                                            <p className="text-[11px] md:text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_2}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {toast && (
                    <div className={`nat-print-hidden fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[200] ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-green-600'}`}>
                        <div className="text-xl">{toast.type === 'error' ? '!' : toast.type === 'info' ? 'i' : 'OK'}</div>
                        <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : toast.type === 'info' ? 'Update' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                    </div>
                )}
            </NATLayout>
        );
    }


    // --- RENDER SCREEN: FORM (Default) ---
    return (
        <NATLayout
            title="Application Form"
            showBack={true}
            onBack={() => setCurrentScreen('welcome')}
            isDark={isDark}
            onToggleTheme={toggleTheme}
        >
            <ApplicationWizard
                currentStep={currentStep}
                formData={formData}
                fieldErrors={fieldErrors}
                isPrivacyOpen={isPrivacyOpen}
                hasRestoredDraft={hasRestoredDraft}
                loading={loading}
                availableCourses={availableCourses}
                availableDates={availableDates}
                selectedDateTimeSlots={selectedDateTimeSlots}
                supportsTestTime={supportsTestTime}
                resolveInputClassName={resolveInputClassName}
                handleChange={handleChange}
                handleDobChange={handleDobChange}
                handlePrivacyAgreementChange={handlePrivacyAgreementChange}
                onTogglePrivacyOpen={() => setIsPrivacyOpen((previous) => !previous)}
                onPreviousStep={() => {
                    setCurrentStep((previous) => previous - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onSubmit={handleSubmit}
                getCourseCapacityMeta={getCourseCapacityMeta}
            />

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-transparent" onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }}></div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="nat-success-modal bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-0 max-w-lg w-full relative z-10 shadow-2xl border border-white overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-10 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-2xl rounded-full"></div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                                className="w-24 h-24 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10"
                            >
                                <Check className="w-12 h-12" />
                            </motion.div>
                            <h2 className="text-3xl font-black text-white tracking-tight relative z-10">Application Received!</h2>
                        </div>
                        <div className="p-8 md:p-10 text-center">
                            <p className="text-slate-600 font-medium mb-8 text-lg leading-relaxed">
                                Your application for the NORSU Admission Test has been successfully submitted. We've sent a confirmation to <span className="font-bold text-slate-900">{formData.email}</span>.
                            </p>
                            <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-6 mb-8 text-left shadow-inner">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Your Reference ID</p>
                                <p className="text-2xl font-mono font-black text-slate-800 tracking-tight">{credentials?.referenceId}</p>
                                <div className="grid md:grid-cols-3 gap-4 mt-6">
                                    <div className="border border-purple-200/50 bg-purple-50 p-4 rounded-xl relative overflow-hidden group/card"><div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div><h3 className="font-bold text-purple-900 flex gap-2 items-center text-sm mb-1 relative z-10"><Calendar className="w-4 h-4" /> Test Date</h3><p className="text-lg font-black text-purple-700 relative z-10">{credentials?.testDate}</p></div>
                                    <div className="border border-blue-200/50 bg-blue-50 p-4 rounded-xl relative overflow-hidden group/card"><div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div><h3 className="font-bold text-blue-900 flex gap-2 items-center text-sm mb-1 relative z-10"><Clock className="w-4 h-4" /> Test Time</h3><p className="text-sm font-bold text-blue-700 leading-tight relative z-10">{credentials?.testTime ? formatTimeWindowLabel(credentials?.testTime) : 'Assigned on test day'}</p></div>
                                    <div className="border border-indigo-200/50 bg-indigo-50 p-4 rounded-xl relative overflow-hidden group/card"><div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div><h3 className="font-bold text-indigo-900 flex gap-2 items-center text-sm mb-1 relative z-10"><MapPin className="w-4 h-4" /> Venue</h3><p className="text-sm font-bold text-indigo-700 leading-tight relative z-10">NORSU Main Campus, Dumaguete City</p></div>
                                </div>
                            </div>
                            <button onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }} className="nat-primary-action w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-900/20 hover:-translate-y-1 active:scale-95 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2">Continue to Status <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {toast && (
                <div className={`nat-print-hidden fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[200] ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? '!' : toast.type === 'info' ? 'i' : 'OK'}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : toast.type === 'info' ? 'Update' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}
        </NATLayout>
    );
};

export default NATPortal;
