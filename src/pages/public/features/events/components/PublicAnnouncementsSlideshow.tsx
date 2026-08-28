import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, GraduationCap, Calendar, Clock, MapPin, X, ArrowUpRight, Sparkles } from 'lucide-react';
import type { PublicEvent } from '../publicEventsService';
import { formatTimeRangeLabel } from '../../../../../utils/eventFormat';

export interface UnifiedSlideItem {
    id: string;
    itemType: 'announcement' | 'event' | 'scholarship';
    badgeLabel: string;
    title: string;
    description: string;
    dateLabel?: string;
    timeLabel?: string;
    location?: string;
    requirements?: string;
    rawItem: any;
}

interface PublicAnnouncementsSlideshowProps {
    announcements?: PublicEvent[];
    events?: PublicEvent[];
    scholarships?: any[];
    isLoading?: boolean;
    onOpenEvents?: (event?: any) => void;
    onOpenScholarships?: (scholarship?: any) => void;
}

export default function PublicAnnouncementsSlideshow({
    announcements = [],
    events = [],
    scholarships = [],
    isLoading = false,
    onOpenEvents,
    onOpenScholarships
}: PublicAnnouncementsSlideshowProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UnifiedSlideItem | null>(null);

    // Combine announcements, active events, and active scholarships into unified slides
    const slideItems: UnifiedSlideItem[] = useMemo(() => {
        const announcementSlides: UnifiedSlideItem[] = announcements.map((item) => ({
            id: `announcement-${item.id}`,
            itemType: 'announcement',
            badgeLabel: item.type || 'Announcement',
            title: item.title || 'Untitled Notice',
            description: item.description || '',
            dateLabel: item.event_date || item.created_at
                ? new Date(item.event_date || item.created_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : undefined,
            location: item.location || undefined,
            rawItem: item
        }));

        const eventSlides: UnifiedSlideItem[] = events.map((item) => {
            const dateFormatted = item.event_date
                ? new Date(item.event_date).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : undefined;
            const timeFormatted = item.event_time ? formatTimeRangeLabel(item.event_time, item.end_time || undefined) : undefined;
            const fullDateLabel = dateFormatted ? (timeFormatted ? `${dateFormatted} • ${timeFormatted}` : dateFormatted) : undefined;

            return {
                id: `event-${item.id}`,
                itemType: 'event',
                badgeLabel: item.type || 'Event',
                title: item.title || 'Untitled Event',
                description: item.description || '',
                dateLabel: fullDateLabel,
                timeLabel: timeFormatted,
                location: item.location || undefined,
                rawItem: item
            };
        });

        const scholarshipSlides: UnifiedSlideItem[] = scholarships.map((item) => ({
            id: `scholarship-${item.id}`,
            itemType: 'scholarship',
            badgeLabel: 'Scholarship',
            title: item.title || 'Untitled Scholarship',
            description: item.description || '',
            dateLabel: item.deadline
                ? `Deadline: ${new Date(item.deadline).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })}`
                : undefined,
            requirements: item.requirements || '',
            rawItem: item
        }));

        return [...announcementSlides, ...eventSlides, ...scholarshipSlides];
    }, [announcements, events, scholarships]);

    const total = slideItems.length;

    // Reset index if slides list changes
    useEffect(() => {
        if (currentIndex >= total && total > 0) {
            setCurrentIndex(0);
        }
    }, [total, currentIndex]);

    const handleNext = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev + 1) % total);
    }, [total]);

    const handlePrev = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev - 1 + total) % total);
    }, [total]);

    // Auto-advance timer (5.5s)
    useEffect(() => {
        if (total <= 1 || isPaused || selectedItem) {
            return;
        }

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % total);
        }, 5500);

        return () => clearInterval(timer);
    }, [total, isPaused, selectedItem]);

    if (isLoading) {
        return (
            <div className="mx-4 mb-3 animate-pulse rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:mx-5 sm:mb-4 sm:rounded-2xl sm:p-4">
                <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 rounded-full bg-white/20 sm:h-4 sm:w-28" />
                    <div className="h-3.5 w-10 rounded-full bg-white/20 sm:h-4 sm:w-12" />
                </div>
                <div className="mt-2.5 h-4 w-3/4 rounded bg-white/20 sm:mt-3 sm:h-5" />
                <div className="mt-1.5 h-3.5 w-full rounded bg-white/15 sm:mt-2 sm:h-4" />
            </div>
        );
    }

    if (total === 0) {
        return null;
    }

    const current = slideItems[currentIndex];

    return (
        <>
            <div
                className="group relative mx-4 mb-3 overflow-hidden rounded-xl border border-white/20 bg-white/15 p-3 shadow-lg shadow-black/10 backdrop-blur-md transition-all hover:border-white/35 hover:bg-white/20 animate-fade-in sm:mx-5 sm:mb-4 sm:rounded-2xl sm:p-4"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Header row: Badge + Counter + Navigation arrows */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {current.itemType === 'scholarship' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-200 shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
                                <GraduationCap className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                                <span>Scholarship</span>
                            </span>
                        ) : current.itemType === 'event' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-sky-400/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-sky-200 shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
                                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                                <span>{current.badgeLabel}</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-200 shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
                                <Megaphone className="h-2.5 w-2.5 animate-bounce sm:h-3 sm:w-3" aria-hidden="true" />
                                <span>{current.badgeLabel}</span>
                            </span>
                        )}
                        {total > 1 && (
                            <span className="text-[9px] font-bold text-white/50 sm:text-[10px]">
                                {currentIndex + 1} of {total}
                            </span>
                        )}
                    </div>

                    {total > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrev();
                                }}
                                aria-label="Previous announcement"
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:scale-105 hover:border-white/40 hover:bg-white/25 hover:text-white active:scale-95 sm:h-7 sm:w-7"
                            >
                                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                                aria-label="Next announcement"
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:scale-105 hover:border-white/40 hover:bg-white/25 hover:text-white active:scale-95 sm:h-7 sm:w-7"
                            >
                                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Card Content (Clickable to open full detail) */}
                <button
                    type="button"
                    onClick={() => setSelectedItem(current)}
                    className="mt-2 block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:mt-2.5"
                >
                    <h3 className="line-clamp-1 text-[13px] font-extrabold leading-snug tracking-tight text-white transition-colors group-hover:text-amber-100 sm:text-[15px]">
                        {current.title}
                    </h3>
                    {current.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/80 sm:mt-1 sm:text-xs">
                            {current.description}
                        </p>
                    )}

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-white/60 sm:mt-2.5 sm:pt-2 sm:text-[11px]">
                        {current.dateLabel ? (
                            <span className="flex items-center gap-1 font-medium">
                                {current.itemType === 'scholarship' ? (
                                    <Clock className="h-2.5 w-2.5 text-white/50 sm:h-3 sm:w-3" />
                                ) : (
                                    <Calendar className="h-2.5 w-2.5 text-white/50 sm:h-3 sm:w-3" />
                                )}
                                {current.dateLabel}
                            </span>
                        ) : <span />}
                        <span className="inline-flex items-center gap-1 font-bold text-amber-200 transition-transform group-hover:translate-x-0.5">
                            {current.itemType === 'scholarship' ? 'View scholarship' : current.itemType === 'event' ? 'View event' : 'Read notice'} <span aria-hidden="true">&rarr;</span>
                        </span>
                    </div>
                </button>

                {/* Dot pagination indicators */}
                {total > 1 && (
                    <div className="mt-2 flex items-center justify-center gap-1 sm:mt-2.5 sm:gap-1.5">
                        {slideItems.map((item, idx) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(idx);
                                }}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`h-1 rounded-full transition-all duration-300 sm:h-1.5 ${
                                    idx === currentIndex
                                        ? 'w-5 bg-white shadow-sm sm:w-6'
                                        : 'w-1 bg-white/30 hover:bg-white/60 sm:w-1.5'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for viewing full announcement, event, or scholarship details */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-slate-900 p-6 text-white shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            {selectedItem.itemType === 'scholarship' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    Scholarship Opportunity
                                </span>
                            ) : selectedItem.itemType === 'event' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-300">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {selectedItem.badgeLabel}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
                                    <Megaphone className="h-3.5 w-3.5" />
                                    {selectedItem.badgeLabel}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                aria-label="Close modal"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <h2 className="mt-4 text-xl font-extrabold leading-snug tracking-tight text-white sm:text-2xl">
                            {selectedItem.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4 text-xs text-white/60">
                            {selectedItem.dateLabel && (
                                <span className="flex items-center gap-1.5">
                                    {selectedItem.itemType === 'scholarship' ? (
                                        <Clock className="h-3.5 w-3.5 text-white/40" />
                                    ) : (
                                        <Calendar className="h-3.5 w-3.5 text-white/40" />
                                    )}
                                    {selectedItem.dateLabel}
                                </span>
                            )}
                            {selectedItem.location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-white/40" />
                                    {selectedItem.location}
                                </span>
                            )}
                        </div>

                        <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/85 sm:text-base">
                            {selectedItem.description ? (
                                <p className="whitespace-pre-line">{selectedItem.description}</p>
                            ) : (
                                <p className="italic text-white/50">No additional details provided.</p>
                            )}

                            {selectedItem.requirements && (
                                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs sm:text-sm">
                                    <p className="font-bold text-white/90">Requirements & Qualifications:</p>
                                    <p className="mt-1 whitespace-pre-line text-white/70">{selectedItem.requirements}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-2 pt-2">
                            {selectedItem.itemType === 'scholarship' && onOpenScholarships && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedItem(null);
                                        onOpenScholarships(selectedItem.rawItem);
                                    }}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:from-rose-500 hover:to-pink-500 active:scale-[0.98]"
                                >
                                    <span>View & Apply in Scholarships</span>
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                            )}
                            {selectedItem.itemType === 'event' && onOpenEvents && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedItem(null);
                                        onOpenEvents(selectedItem.rawItem);
                                    }}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98]"
                                >
                                    <span>Open in Events & Attendance</span>
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className={`rounded-xl bg-white/15 py-3 text-xs sm:text-sm font-bold text-white transition-all hover:bg-white/25 active:scale-[0.98] ${
                                    (selectedItem.itemType === 'scholarship' && onOpenScholarships) ||
                                    (selectedItem.itemType === 'event' && onOpenEvents)
                                        ? 'px-5'
                                        : 'w-full'
                                }`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
