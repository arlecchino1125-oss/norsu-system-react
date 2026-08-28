import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseScholarship, isScholarshipExpired, normalizeScholarshipUrl } from '../../../../../utils/scholarshipHelpers';

const Icons = {
    Scholarship: () => (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
    ),
    Clock: () => (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    Search: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    ),
    ChevronDown: ({ expanded }: { expanded?: boolean }) => (
        <svg className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
        </svg>
    ),
    ExternalLink: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
    Login: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
    )
};

const formatDeadline = (value: string | null) => {
    if (!value) return 'No deadline specified';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No deadline specified';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

import type { PublicStudent } from '../publicEventsService';
import { submitPublicScholarshipApplication } from '../publicEventsService';

interface PublicScholarshipsViewProps {
    scholarshipsList: any[];
    isLoading: boolean;
    isError: boolean;
    identity?: { student: PublicStudent } | null;
    onRequireSignIn?: () => void;
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PublicScholarshipsView({
    scholarshipsList,
    isLoading,
    isError,
    identity,
    onRequireSignIn,
    showToast
}: PublicScholarshipsViewProps) {
    const navigate = useNavigate();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'portal' | 'external'>('all');
    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

    const handleApplyDirectly = async (scholarship: any) => {
        if (!identity) {
            onRequireSignIn?.();
            return;
        }

        if (appliedIds.has(scholarship.id)) {
            showToast?.('You have already applied for this scholarship.', 'info');
            return;
        }

        setApplyingId(scholarship.id);
        try {
            await submitPublicScholarshipApplication({
                studentId: identity.student.student_id,
                scholarshipId: scholarship.id
            });

            setAppliedIds(prev => new Set(prev).add(scholarship.id));
            showToast?.('Scholarship application submitted! You can track your status in your Student Portal.', 'success');
        } catch (err: any) {
            showToast?.(err.message || 'Failed to submit scholarship application.', 'error');
        } finally {
            setApplyingId(null);
        }
    };

    // Strictly show only active, non-expired (open) scholarships
    const parsedScholarships = useMemo(() => {
        return (scholarshipsList || [])
            .map(parseScholarship)
            .filter((s: any) => !isScholarshipExpired(s.deadline));
    }, [scholarshipsList]);

    const filteredScholarships = useMemo(() => {
        return parsedScholarships.filter(item => {
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query || 
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.requirements?.toLowerCase().includes(query);

            if (!matchesQuery) return false;

            const isExternal = item.application_method === 'external_link' || Boolean(item.application_url?.trim());

            if (filterType === 'portal') return !isExternal;
            if (filterType === 'external') return isExternal;
            return true;
        });
    }, [parsedScholarships, searchQuery, filterType]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-rose-600 mb-4"></div>
                <p className="text-sm font-bold text-slate-600">Loading scholarships...</p>
                <p className="mt-1 text-xs text-slate-400">Fetching active opportunities from CARE Center</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">⚠️</div>
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">Could not load scholarships</h3>
                <p className="text-sm leading-relaxed text-slate-500">Please check your internet connection or try again shortly.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-3.5 pt-3.5 pb-16 space-y-3 sm:px-4 sm:pt-5 sm:pb-20 sm:space-y-4 animate-fade-in">
            {/* ── Search & Filter Controls ── */}
            <div className="space-y-2">
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 sm:pl-3.5">
                        <Icons.Search />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search scholarships by title or keywords..."
                        className="w-full rounded-xl border border-black/[0.08] bg-white py-2.5 pl-9 pr-3 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 shadow-sm sm:rounded-2xl sm:py-3 sm:pl-10 sm:pr-4 sm:text-xs"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[11px] font-bold text-slate-400 hover:text-slate-600 sm:pr-3.5 sm:text-xs"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] sm:text-xs">
                    <button
                        type="button"
                        onClick={() => setFilterType('all')}
                        className={`shrink-0 rounded-lg px-2.5 py-1 sm:rounded-xl sm:px-3 sm:py-1.5 font-bold transition-all ${filterType === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        All ({parsedScholarships.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('portal')}
                        className={`shrink-0 rounded-lg px-2.5 py-1 sm:rounded-xl sm:px-3 sm:py-1.5 font-bold transition-all ${filterType === 'portal' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Student Portal
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('external')}
                        className={`shrink-0 rounded-lg px-2.5 py-1 sm:rounded-xl sm:px-3 sm:py-1.5 font-bold transition-all ${filterType === 'external' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Official Website
                    </button>
                </div>
            </div>

            {/* ── Scholarship Cards List ── */}
            {filteredScholarships.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-2xl sm:p-8">
                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 sm:mb-3 sm:h-12 sm:w-12 sm:rounded-2xl">
                        <Icons.Scholarship />
                    </div>
                    <h3 className="text-xs font-black text-slate-900 sm:text-sm">No scholarships found</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                        {searchQuery ? 'Try clearing your search filters.' : 'There are currently no active scholarships listed. Please check back later!'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5 sm:space-y-3">
                    {filteredScholarships.map((item) => {
                        const isExpanded = expandedId === item.id;
                        const expired = isScholarshipExpired(item.deadline);
                        const isExternal = item.application_method === 'external_link' || Boolean(item.application_url?.trim());
                        const hasUrl = Boolean(item.application_url?.trim());

                        return (
                            <div
                                key={item.id}
                                className="w-full overflow-hidden rounded-xl border border-black/[0.07] bg-white text-left shadow-sm transition-all duration-200 sm:rounded-2xl"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="flex w-full flex-col px-3.5 py-3 text-left transition-colors hover:bg-slate-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 sm:px-4 sm:py-4"
                                >
                                    <div className="flex w-full items-start justify-between gap-2.5 sm:gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex flex-wrap items-center gap-1 sm:mb-1.5 sm:gap-1.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider ${
                                                    expired 
                                                        ? 'bg-slate-100 text-slate-500 border border-slate-200' 
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {expired ? 'Closed' : 'Open'}
                                                </span>

                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider ${
                                                    isExternal
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                                }`}>
                                                    {isExternal ? '🌐 Official Website' : '🏛️ Student Portal'}
                                                </span>
                                            </div>

                                            <h3 className="text-[13.5px] font-bold leading-snug text-slate-900 sm:text-[15px]">
                                                {item.title}
                                            </h3>
                                        </div>

                                        <div className="mt-1 shrink-0 text-slate-400">
                                            <Icons.ChevronDown expanded={isExpanded} />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                        <Icons.Clock />
                                        <span>Deadline: <strong className={expired ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>{formatDeadline(item.deadline)}</strong></span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-black/[0.05] bg-slate-50/50 px-4 pb-5 pt-4">
                                        <div className="space-y-4">
                                            {item.description && (
                                                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Overview &amp; Description</h4>
                                                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            )}

                                            {item.requirements && (
                                                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Eligibility &amp; Requirements</h4>
                                                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                                                        {item.requirements}
                                                    </p>
                                                </div>
                                            )}

                                            {/* ── Redirection Actions ── */}
                                            <div className="pt-1">
                                                {expired ? (
                                                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-center">
                                                        <p className="text-xs font-bold text-slate-500">
                                                            Applications for this scholarship are currently closed (deadline has passed).
                                                        </p>
                                                    </div>
                                                ) : isExternal ? (
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (hasUrl) {
                                                                    const targetUrl = normalizeScholarshipUrl(item.application_url);
                                                                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                                                }
                                                            }}
                                                            disabled={!hasUrl}
                                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <Icons.ExternalLink />
                                                            {hasUrl ? 'Apply on Official Website ↗' : 'Application Link Unavailable'}
                                                        </button>
                                                        <p className="text-center text-[10px] font-semibold text-slate-400">
                                                            This will open the official application website in a new tab.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyDirectly(item)}
                                                            disabled={applyingId === item.id || appliedIds.has(item.id)}
                                                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-black text-white shadow-sm transition active:scale-[0.98] ${
                                                                appliedIds.has(item.id)
                                                                    ? 'bg-emerald-600 cursor-default'
                                                                    : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {appliedIds.has(item.id) ? (
                                                                <>✓ Application Submitted</>
                                                            ) : applyingId === item.id ? (
                                                                <>Submitting Application...</>
                                                            ) : identity ? (
                                                                <>Apply with Student ID ({identity.student.student_id}) →</>
                                                            ) : (
                                                                <>Enter Student ID to Apply →</>
                                                            )}
                                                        </button>
                                                        <p className="text-center text-[10px] font-semibold text-slate-400">
                                                            Your application will be recorded directly in your student profile.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
