import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getPublicEventStatus,
    getPublicEvents,
    ratePublicEvent,
    timeInPublicEvent,
    timeOutPublicEvent,
    verifyPublicStudent,
    type PublicEvent,
    type PublicEventStatus,
    type PublicStudent
} from '../publicEventsService';
import { isEventConcluded } from '../../../../../utils/eventWindows';
import { validateTextInput } from '../../../../../utils/inputSecurity';

const CACHE_KEY = 'norsu_public_event_identity';
const CACHE_DURATION = 20 * 60 * 1000;

export interface PublicIdentity {
    student: PublicStudent;
    timestamp: number;
}

const readStoredIdentity = (): PublicIdentity | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PublicIdentity;
        if (!parsed?.student?.student_id) return null;
        if (Date.now() - parsed.timestamp >= CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
};

/**
 * Student ID is the whole identity for this portal. It is verified against the
 * students table on sign in, and re-sent with every write so the database
 * resolves the real student row itself.
 */
export const usePublicIdentity = () => {
    const [identity, setIdentity] = useState<PublicIdentity | null>(readStoredIdentity);

    // Without this the header keeps claiming "Signed in" for as long as the tab
    // stays open, even though every action would be asking for credentials again.
    useEffect(() => {
        if (!identity) return;
        // Clamped rather than branched: readStoredIdentity already drops expired
        // entries, so a non-positive remainder just means "expire now".
        const remaining = Math.max(0, identity.timestamp + CACHE_DURATION - Date.now());
        const timer = setTimeout(() => {
            localStorage.removeItem(CACHE_KEY);
            setIdentity(null);
        }, remaining);
        return () => clearTimeout(timer);
    }, [identity]);

    const verify = useCallback(async (studentId: string) => {
        const student = await verifyPublicStudent(studentId);
        const next: PublicIdentity = { student, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        setIdentity(next);
        return next;
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem(CACHE_KEY);
        setIdentity(null);
    }, []);

    return { identity, verify, signOut };
};

const EMPTY_STATUS: PublicEventStatus[] = [];

export const usePublicEventsData = (identity: PublicIdentity | null) => {
    const queryClient = useQueryClient();
    const studentId = identity?.student.student_id;

    const { data: rawEvents, isLoading, isError } = useQuery({
        queryKey: ['public_events', studentId],
        queryFn: () => getPublicEvents(studentId),
        staleTime: 2 * 60 * 1000
    });

    const { data: statuses = EMPTY_STATUS } = useQuery({
        queryKey: ['public_event_status', studentId],
        queryFn: () => getPublicEventStatus(studentId as string),
        enabled: Boolean(studentId),
        staleTime: 2 * 60 * 1000
    });

    // The audience narrowing now happens inside public_get_active_events, which
    // has the student row and does not have to hand the browser a department
    // and course to do it. Only the visibility rule is left here.
    const eventsList = useMemo(
        () => (rawEvents || []).filter((event: PublicEvent) => !isEventConcluded(event)),
        [rawEvents]
    );

    const statusMap = useMemo(() => {
        const map: Record<number, PublicEventStatus> = {};
        statuses.forEach((row) => { map[row.event_id] = row; });
        return map;
    }, [statuses]);

    const refreshStatus = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ['public_event_status', studentId] }),
        [queryClient, studentId]
    );
    const refreshEvents = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ['public_events', studentId] }),
        [queryClient, studentId]
    );

    return { eventsList, statusMap, isLoading, isError, refreshStatus, refreshEvents };
};

interface UsePublicEventActionsArgs {
    identity: PublicIdentity | null;
    showToast: (message: string, type?: string) => void;
    refreshStatus: () => Promise<unknown>;
    refreshEvents: () => Promise<unknown>;
}

const EMPTY_RATING_FORM = {
    eventId: null as number | null,
    title: '',
    q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0,
    open_best: '',
    open_suggestions: '',
    open_comments: '',
    date_of_activity: ''
};

export const usePublicEventActions = ({ identity, showToast, refreshStatus, refreshEvents }: UsePublicEventActionsArgs) => {
    const [timingInEventId, setTimingInEventId] = useState<number | null>(null);
    const [timingOutEventId, setTimingOutEventId] = useState<number | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingForm, setRatingForm] = useState(EMPTY_RATING_FORM);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    // Both paths refresh the status on failure too. "Already timed in" means the
    // cached status is behind the database, and refetching is what corrects the
    // button instead of leaving it clickable and repeating the same error.
    const handleTimeIn = useCallback(async (event: any) => {
        if (!identity || timingInEventId) return;
        setTimingInEventId(event.id);
        try {
            await timeInPublicEvent(Number(event.id), identity.student.student_id);
            showToast('Time in successful.');
            await Promise.all([refreshStatus(), refreshEvents()]);
        } catch (err: any) {
            showToast(err.message || 'Something went wrong.', 'error');
            await refreshStatus();
        } finally {
            setTimingInEventId(null);
        }
    }, [identity, refreshEvents, refreshStatus, showToast, timingInEventId]);

    const handleTimeOut = useCallback(async (event: any) => {
        if (!identity || timingOutEventId) return;
        setTimingOutEventId(event.id);
        try {
            await timeOutPublicEvent(Number(event.id), identity.student.student_id);
            showToast('Time out successful.');
            await refreshStatus();
        } catch (err: any) {
            showToast(err.message || 'Something went wrong.', 'error');
            await refreshStatus();
        } finally {
            setTimingOutEventId(null);
        }
    }, [identity, refreshStatus, showToast, timingOutEventId]);

    const handleRateEvent = useCallback((event: any) => {
        setRatingForm({
            ...EMPTY_RATING_FORM,
            eventId: Number(event.id),
            title: event.title,
            date_of_activity: event.event_date || event.created_at || ''
        });
        setShowRatingModal(true);
    }, []);

    const submitRating = useCallback(async () => {
        if (!identity || isSubmittingRating || !ratingForm.eventId) return;

        const scores = [ratingForm.q1, ratingForm.q2, ratingForm.q3, ratingForm.q4, ratingForm.q5, ratingForm.q6, ratingForm.q7];
        if (scores.some((score) => score === 0)) {
            showToast('Rate all criteria.', 'error');
            return;
        }

        const bestCheck = validateTextInput(ratingForm.open_best, 'notes', { multiline: true, label: 'What you liked best' });
        const suggestionsCheck = validateTextInput(ratingForm.open_suggestions, 'notes', { multiline: true, label: 'Suggestions' });
        const commentsCheck = validateTextInput(ratingForm.open_comments, 'notes', { multiline: true, label: 'Other comments' });
        const invalid = [bestCheck, suggestionsCheck, commentsCheck].find((check) => !check.valid);
        if (invalid?.error) {
            showToast(invalid.error, 'error');
            return;
        }

        setIsSubmittingRating(true);
        try {
            await ratePublicEvent(
                ratingForm.eventId,
                identity.student.student_id,
                scores,
                bestCheck.value,
                suggestionsCheck.value,
                commentsCheck.value
            );
            showToast('Evaluation submitted.');
            setShowRatingModal(false);
            await refreshStatus();
        } catch (err: any) {
            showToast(err.message || 'Something went wrong.', 'error');
        } finally {
            setIsSubmittingRating(false);
        }
    }, [identity, isSubmittingRating, ratingForm, refreshStatus, showToast]);

    return {
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
    };
};