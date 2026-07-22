import { useCallback, useState } from 'react';
import {
    getAttendanceHistory,
    getRatedEventIds
} from '../../../../../services/studentPortalService';
import { isStudentEligibleForEvent } from '../../../../../utils/eventAudience';
import { validateTextInput } from '../../../../../utils/inputSecurity';
import type { StudentDatasetRefreshKey } from '../../../hooks/useStudentPortalRefresh';
import { uploadAttendanceProof } from '../attendanceProofStorage';

type RunDatasetRefresh = (
    key: StudentDatasetRefreshKey,
    refreshFn: () => Promise<unknown>,
    options?: { force?: boolean }
) => Promise<boolean>;

interface UseStudentEventActionsArgs {
    personalInfo: any;
    runDatasetRefresh: RunDatasetRefresh;
    refreshEventsCached: (options?: { force?: boolean }) => Promise<unknown>;
    showToast: (message: string, type?: string) => void;
    supabaseClient: any;
}

const isRegistrationEvent = (event: any) => event?.participation_mode === 'registration_required';

const isRegistrationDeadlinePassed = (event: any) => {
    if (!event?.registration_deadline) return false;
    const deadline = new Date(event.registration_deadline);
    return !Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime();
};

const calculateDistanceMeters = (
    userLat: number,
    userLng: number,
    targetLat: number,
    targetLng: number
) => {
    const earthRadiusMeters = 6371e3;
    const userLatRadians = userLat * Math.PI / 180;
    const targetLatRadians = targetLat * Math.PI / 180;
    const latDeltaRadians = (targetLat - userLat) * Math.PI / 180;
    const lngDeltaRadians = (targetLng - userLng) * Math.PI / 180;
    const halfChordDistance = Math.sin(latDeltaRadians / 2) * Math.sin(latDeltaRadians / 2)
        + Math.cos(userLatRadians) * Math.cos(targetLatRadians)
        * Math.sin(lngDeltaRadians / 2) * Math.sin(lngDeltaRadians / 2);
    const angularDistance = 2 * Math.atan2(Math.sqrt(halfChordDistance), Math.sqrt(1 - halfChordDistance));
    return earthRadiusMeters * angularDistance;
};

const getGeolocationErrorMessage = (error: any) => {
    if (error.code === 1) return "Permission denied. Please allow location access.";
    if (error.code === 2) return "Position unavailable. Ensure GPS/WiFi is on.";
    if (error.code === 3) return "Location request timed out.";
    return "Location check failed.";
};

// Proof requirements are per-event toggles set by CARE staff on event creation.
// Legacy events created before the toggles existed have no flags: photo stays required, geofence stays off.
export const isPhotoRequired = (event: any) => event?.require_photo !== false;
export const isGeofenceEnforced = (event: any) => Boolean(event?.require_geolocation);

export function useStudentEventActions({
    personalInfo,
    runDatasetRefresh,
    refreshEventsCached,
    showToast,
    supabaseClient
}: UseStudentEventActionsArgs) {
    const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({});
    const [registrationMap, setRegistrationMap] = useState<Record<string, any>>({});
    const [ratedEvents, setRatedEvents] = useState<any[]>([]);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingForm, setRatingForm] = useState<any>({ eventId: null, title: '', rating: 0, comment: '', q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, open_best: '', open_suggestions: '', open_comments: '' });
    const [proofFile, setProofFile] = useState<any>(null);
    const [isTimingIn, setIsTimingIn] = useState(false);
    const [timingOutEventId, setTimingOutEventId] = useState<string | null>(null);
    const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
    const [cancellingRegistrationEventId, setCancellingRegistrationEventId] = useState<string | null>(null);
    const [isSubmittingEventRating, setIsSubmittingEventRating] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!personalInfo.studentId) return;

        const [
            attendanceData,
            ratingData,
            registrationResult
        ] = await Promise.all([
            getAttendanceHistory(personalInfo.studentId),
            getRatedEventIds(personalInfo.studentId),
            supabaseClient
                .from('event_registrations')
                .select('id, event_id, student_id, student_name, email, department, course, year_level, section, status, registered_at, cancelled_at, updated_at')
                .eq('student_id', personalInfo.studentId)
        ]);

        if (attendanceData) {
            const map: Record<string, any> = {};
            attendanceData.forEach((record: any) => {
                map[record.event_id] = record;
            });
            setAttendanceMap(map);
        }

        if (registrationResult.error) {
            if (registrationResult.error.code !== '42P01') {
                throw registrationResult.error;
            }
            setRegistrationMap({});
        } else {
            const map: Record<string, any> = {};
            (registrationResult.data || []).forEach((registration: any) => {
                map[String(registration.event_id)] = registration;
            });
            setRegistrationMap(map);
        }

        setRatedEvents(ratingData || []);
    }, [personalInfo.studentId, supabaseClient]);

    const fetchHistoryCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('history', fetchHistory, options),
        [fetchHistory, runDatasetRefresh]
    );

    const handleRegisterEvent = useCallback(async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (!eventId || registeringEventId === eventId) return;
        if (!personalInfo.studentId) {
            showToast('Your student profile is still loading.', 'error');
            return;
        }
        if (!isRegistrationEvent(event)) {
            showToast('This event does not require registration.', 'error');
            return;
        }
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast('This event is not available for your student group.', 'error');
            return;
        }
        if (isRegistrationDeadlinePassed(event)) {
            showToast('The registration deadline for this event has passed.', 'error');
            return;
        }

        setRegisteringEventId(eventId);
        try {
            const { data, error } = await supabaseClient.rpc('register_student_for_event', {
                p_event_id: Number(event.id)
            });
            if (error) throw error;

            const registration = Array.isArray(data) ? data[0] : data;
            if (registration) {
                setRegistrationMap((prev: any) => ({
                    ...prev,
                    [String(registration.event_id)]: registration
                }));
            }

            // Non-OTP transactional emails are under construction while we wait
            // for the next email provider/enrollment window. For now, student
            // event registration does not send confirmation email.
            showToast('Registration successful.');
            await Promise.all([
                fetchHistoryCached({ force: true }),
                refreshEventsCached({ force: true })
            ]);
        } catch (err: any) {
            showToast("Couldn't register for event.", 'error');
        } finally {
            setRegisteringEventId(null);
        }
    }, [
        fetchHistoryCached,
        personalInfo,
        refreshEventsCached,
        registeringEventId,
        showToast,
        supabaseClient
    ]);

    const handleCancelRegistration = useCallback(async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (!eventId || cancellingRegistrationEventId === eventId) return;

        setCancellingRegistrationEventId(eventId);
        try {
            const { data, error } = await supabaseClient.rpc('cancel_student_event_registration', {
                p_event_id: Number(event.id)
            });
            if (error) throw error;

            const registration = Array.isArray(data) ? data[0] : data;
            if (registration) {
                setRegistrationMap((prev: any) => ({
                    ...prev,
                    [String(registration.event_id)]: registration
                }));
            }

            showToast('Registration cancelled.');
            await Promise.all([
                fetchHistoryCached({ force: true }),
                refreshEventsCached({ force: true })
            ]);
        } catch (err: any) {
            showToast("Couldn't cancel registration.", 'error');
        } finally {
            setCancellingRegistrationEventId(null);
        }
    }, [
        cancellingRegistrationEventId,
        fetchHistoryCached,
        refreshEventsCached,
        showToast,
        supabaseClient
    ]);

    const handleTimeIn = useCallback(async (event: any) => {
        if (isTimingIn) return;
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast("This event is not available for your student group.", 'error');
            return;
        }
        if (isRegistrationEvent(event) && !event.allow_walk_ins) {
            const registration = registrationMap[String(event.id)];
            const registrationStatus = String(registration?.status || '');
            if (!['Registered', 'Attended'].includes(registrationStatus)) {
                showToast("Register for the event before timing in.", 'error');
                return;
            }
        }
        if (isPhotoRequired(event) && !proofFile) {
            showToast("Upload a photo to time in.", 'error');
            return;
        }

        if (isGeofenceEnforced(event) && !navigator.geolocation) {
            showToast("Your browser doesn't support location services. by your browser.", 'error');
            return;
        }
        setIsTimingIn(true);

        const completeTimeIn = async (userLat: number | null, userLng: number | null) => {
            try {
                const { data: existingAttendance } = await supabaseClient
                    .from('event_attendance')
                    .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                    .eq('event_id', event.id)
                    .eq('student_id', personalInfo.studentId)
                    .maybeSingle();

                if (existingAttendance?.time_in) {
                    setAttendanceMap((prev: any) => ({ ...prev, [event.id]: existingAttendance }));
                    setProofFile(null);
                    showToast(existingAttendance.time_out
                        ? "Your attendance is already recorded for this event."
                        : "You have already timed in for this event.", 'error');
                    setIsTimingIn(false);
                    return;
                }

                const proofReference = isPhotoRequired(event) && proofFile
                    ? await uploadAttendanceProof(proofFile, Number(event.id))
                    : null;

                const { data, error } = await supabaseClient.rpc('record_student_event_attendance', {
                    p_event_id: Number(event.id),
                    p_action: 'check_in',
                    p_proof_url: proofReference,
                    p_latitude: userLat,
                    p_longitude: userLng
                });
                if (error) throw error;

                const attendance = Array.isArray(data) ? data[0] : data;
                if (!attendance) throw new Error('Attendance record was not returned.');

                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: attendance }));
                setProofFile(null);
                showToast("Time in successful.");
                await Promise.all([
                    fetchHistoryCached({ force: true }),
                    refreshEventsCached({ force: true })
                ]);
            } catch (err: any) {
                if (err.code === '23505') {
                    showToast("You have already timed in for this event.", 'error');
                    const { data } = await supabaseClient
                        .from('event_attendance')
                        .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                        .eq('event_id', event.id)
                        .eq('student_id', personalInfo.studentId)
                        .single();
                    if (data) setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data }));
                } else {
                    console.error("Time In Error:", err);
                    showToast('Something went wrong.', 'error');
                }
            } finally {
                setIsTimingIn(false);
            }
        };

        if (!isGeofenceEnforced(event)) {
            await completeTimeIn(null, null);
            return;
        }

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const maxDistanceMeters = 200;
            const distance = calculateDistanceMeters(userLat, userLng, targetLat, targetLng);

            if (distance > maxDistanceMeters) {
                showToast(`You are too far from campus (${Math.round(distance)}m).`, 'error');
                setIsTimingIn(false);
                return;
            }

            await completeTimeIn(userLat, userLng);
        }, (error: any) => {
            setIsTimingIn(false);
            showToast(getGeolocationErrorMessage(error), 'error');
        }, options);
    }, [
        isTimingIn,
        fetchHistoryCached,
        personalInfo,
        proofFile,
        refreshEventsCached,
        registrationMap,
        showToast,
        supabaseClient
    ]);

    const handleTimeOut = useCallback(async (event: any) => {
        const eventId = String(event?.id || '').trim();
        if (eventId && timingOutEventId === eventId) return;
        if (!isStudentEligibleForEvent(event, personalInfo)) {
            showToast("This event is not available for your student group.", 'error');
            return;
        }
        if (isGeofenceEnforced(event) && !navigator.geolocation) {
            showToast("Your browser doesn't support location services.", 'error');
            return;
        }
        if (eventId) {
            setTimingOutEventId(eventId);
        }

        const completeTimeOut = async (userLat: number | null, userLng: number | null) => {
            try {
                const { data, error } = await supabaseClient.rpc('record_student_event_attendance', {
                    p_event_id: Number(event.id),
                    p_action: 'check_out',
                    p_latitude: userLat,
                    p_longitude: userLng
                });

                if (error) throw error;
                const attendance = Array.isArray(data) ? data[0] : data;
                if (!attendance) {
                    showToast("No attendance record found. Please time in first.", 'error');
                    return;
                }
                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: attendance }));
                showToast("Time out successful.");
                await fetchHistoryCached({ force: true });
            } catch (err: any) {
                console.error("Time Out Error:", err);
                showToast('Something went wrong.', 'error');
            } finally {
                if (eventId) setTimingOutEventId(null);
            }
        };

        if (!isGeofenceEnforced(event)) {
            await completeTimeOut(null, null);
            return;
        }

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const maxDistanceMeters = 200;
            const distance = calculateDistanceMeters(userLat, userLng, targetLat, targetLng);

            if (distance > maxDistanceMeters) {
                showToast(`You are too far from the venue (${Math.round(distance)}m).`, 'error');
                if (eventId) setTimingOutEventId(null);
                return;
            }

            await completeTimeOut(userLat, userLng);
        }, () => {
            if (eventId) setTimingOutEventId(null);
            showToast("Location check failed. Enable location services.", 'error');
        }, options);
    }, [
        fetchHistoryCached,
        personalInfo,
        showToast,
        supabaseClient,
        timingOutEventId
    ]);

    const handleRateEvent = useCallback((event: any) => {
        setRatingForm({
            eventId: event.id,
            title: event.title,
            rating: 0,
            comment: '',
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            q5: 0,
            q6: 0,
            q7: 0,
            open_best: '',
            open_suggestions: '',
            open_comments: '',
            date_of_activity: event.event_date || event.created_at || new Date().toISOString()
        });
        setShowRatingModal(true);
    }, []);

    const submitRating = useCallback(async () => {
        if (isSubmittingEventRating) return;
        const scores = [ratingForm.q1, ratingForm.q2, ratingForm.q3, ratingForm.q4, ratingForm.q5, ratingForm.q6, ratingForm.q7];
        if (scores.some(score => score === 0)) {
            showToast("Rate all criteria.", 'error');
            return;
        }
        if (ratedEvents.includes(ratingForm.eventId)) {
            showToast("You have already rated this event.", 'error');
            setShowRatingModal(false);
            return;
        }

        const commentCheck = validateTextInput(ratingForm.comment, 'notes', { multiline: true, label: 'Event comment' });
        const bestCheck = validateTextInput(ratingForm.open_best, 'notes', { multiline: true, label: 'What you liked best' });
        const suggestionsCheck = validateTextInput(ratingForm.open_suggestions, 'notes', { multiline: true, label: 'Suggestions' });
        const openCommentsCheck = validateTextInput(ratingForm.open_comments, 'notes', { multiline: true, label: 'Other comments' });
        const invalidText = [commentCheck, bestCheck, suggestionsCheck, openCommentsCheck].find((check) => !check.valid);

        if (invalidText?.error) {
            showToast(invalidText.error, 'error');
            return;
        }

        const avgRating = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        setIsSubmittingEventRating(true);
        try {
            const { error } = await supabaseClient.from('event_feedback').insert([{
                event_id: ratingForm.eventId,
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                rating: avgRating,
                feedback: commentCheck.value,
                submitted_at: new Date().toISOString(),
                sex: personalInfo.sex || '',
                college: `${personalInfo.department || ''} - ${personalInfo.course || ''} (${personalInfo.year || ''})`,
                date_of_activity: ratingForm.date_of_activity ? new Date(ratingForm.date_of_activity).toISOString().split('T')[0] : null,
                q1_score: ratingForm.q1,
                q2_score: ratingForm.q2,
                q3_score: ratingForm.q3,
                q4_score: ratingForm.q4,
                q5_score: ratingForm.q5,
                q6_score: ratingForm.q6,
                q7_score: ratingForm.q7,
                open_best: bestCheck.value,
                open_suggestions: suggestionsCheck.value,
                open_comments: openCommentsCheck.value
            }]);
            if (error) throw error;
            setRatedEvents([...ratedEvents, ratingForm.eventId]);
            showToast("Evaluation submitted.");
            setShowRatingModal(false);
        } catch (err: any) {
            showToast('Something went wrong.', 'error');
        } finally {
            setIsSubmittingEventRating(false);
        }
    }, [
        isSubmittingEventRating,
        personalInfo.course,
        personalInfo.department,
        personalInfo.firstName,
        personalInfo.lastName,
        personalInfo.sex,
        personalInfo.studentId,
        personalInfo.year,
        ratedEvents,
        ratingForm,
        showToast,
        supabaseClient
    ]);

    return {
        attendanceMap,
        registrationMap,
        ratedEvents,
        showRatingModal,
        setShowRatingModal,
        ratingForm,
        setRatingForm,
        setProofFile,
        isTimingIn,
        timingOutEventId,
        registeringEventId,
        cancellingRegistrationEventId,
        isSubmittingEventRating,
        fetchHistory,
        fetchHistoryCached,
        handleRegisterEvent,
        handleCancelRegistration,
        handleTimeIn,
        handleTimeOut,
        handleRateEvent,
        submitRating
    };
}
