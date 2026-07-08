import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createDeferredChannelCleanup } from '../../../lib/realtime';
import { supabase } from '../../../lib/supabase';
import { COUNSELING_STATUS, SUPPORT_STATUS, getCounselingScheduledDate, isCounselingCalendarVisible } from '../../../utils/workflow';
import type {
    CounselingNotificationRow,
    NotificationItem,
    RealtimeChangePayload,
    SupportNotificationRow,
    ToastHandler
} from '../types';
import { PROFILE_NOTIFICATION_ACTIONS, STAFF_BELL_LIMIT } from '../utils';

const parseTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
};

const isSameLocalDay = (value: string | null, base = new Date()) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return (
        date.getFullYear() === base.getFullYear() &&
        date.getMonth() === base.getMonth() &&
        date.getDate() === base.getDate()
    );
};

const formatTodayTimeLabel = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const getNotificationIdentity = (item: NotificationItem) => {
    if (item.id !== undefined && item.id !== null) {
        if (typeof item.id === 'string') return item.id;
        if (item.message) return `message-${item.id}`;
        if (item.action) return `action-${item.id}`;
        return `item-${item.id}`;
    }
    return `${item.message || item.action || 'notification'}-${item.sort_at || item.created_at || ''}`;
};

const getNotificationSortTime = (item: NotificationItem) =>
    new Date(item.sort_at || item.created_at || 0).getTime();

const dedupeAndLimitNotifications = (items: NotificationItem[]) => {
    const seen = new Set<string>();
    return items
        .filter((item) => {
            const key = getNotificationIdentity(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => getNotificationSortTime(b) - getNotificationSortTime(a))
        .slice(0, STAFF_BELL_LIMIT);
};

const prependNotification = (prev: NotificationItem[], next: NotificationItem | null) =>
    next ? dedupeAndLimitNotifications([next, ...prev]) : prev;

const getStudentLabel = (studentName?: string | null, studentId?: string | null) => {
    const trimmedName = String(studentName || '').trim();
    if (trimmedName) return trimmedName;
    const trimmedId = String(studentId || '').trim();
    return trimmedId ? `student ${trimmedId}` : 'a student';
};

const mapSupportSubmittedNotification = (request: SupportNotificationRow): NotificationItem => {
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-submitted-${request.id}`,
        message: `New support request from ${studentLabel}${supportType ? ` for ${supportType}` : ''}.`,
        created_at: request.created_at || null,
        sort_at: request.created_at || null,
    };
};

const mapSupportReferredNotification = (
    request: SupportNotificationRow,
    alertAt?: string | null
): NotificationItem => {
    const deptNotes = parseJsonRecord(request.dept_notes);
    const occurredAt = alertAt || parseTimestamp(deptNotes?.date_acted) || request.created_at || null;
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-referred-${request.id}`,
        message: `Support case for ${studentLabel}${supportType ? ` (${supportType})` : ''} was referred back to CARE.`,
        created_at: occurredAt,
        sort_at: occurredAt,
    };
};

const mapCounselingReferredNotification = (
    request: CounselingNotificationRow,
    alertAt?: string | null
): NotificationItem => {
    const occurredAt = alertAt || request.created_at || null;
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const requestType = String(request.request_type || '').trim();
    return {
        id: `staff-counseling-referred-${request.id}`,
        message: `Counseling case for ${studentLabel}${requestType ? ` (${requestType})` : ''} was referred to CARE.`,
        created_at: occurredAt,
        sort_at: occurredAt,
    };
};

const mapCounselingScheduledTodayNotification = (
    request: CounselingNotificationRow,
    alertAt?: string | null
): NotificationItem | null => {
    const scheduledAt = parseTimestamp(getCounselingScheduledDate(request));
    if (!isSameLocalDay(scheduledAt)) return null;

    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const requestType = String(request.request_type || '').trim();
    return {
        id: `staff-counseling-scheduled-${request.id}`,
        message: `Counseling session with ${studentLabel}${requestType ? ` (${requestType})` : ''} is scheduled today.`,
        created_at: alertAt || request.created_at || scheduledAt,
        sort_at: alertAt || scheduledAt,
        time_label: formatTodayTimeLabel(scheduledAt),
    };
};

const mapSupportVisitScheduledTodayNotification = (
    request: SupportNotificationRow,
    alertAt?: string | null
): NotificationItem | null => {
    const deptNotes = parseJsonRecord(request.dept_notes);
    const scheduledAt = parseTimestamp(deptNotes?.scheduled_date);
    if (!isSameLocalDay(scheduledAt)) return null;

    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-visit-scheduled-${request.id}`,
        message: `Support visit with ${studentLabel}${supportType ? ` (${supportType})` : ''} is scheduled today.`,
        created_at: alertAt || request.created_at || scheduledAt,
        sort_at: alertAt || scheduledAt,
        time_label: formatTodayTimeLabel(scheduledAt),
    };
};

export function useCareStaffData(showToastMessage: ToastHandler) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notificationsLoaded, setNotificationsLoaded] = useState(false);

    // ponytail: Fetch bell notifications via React Query on-demand, cache is preserved during tab navigation.
    const { data: fetchedNotifications, isFetching: notificationsLoading, refetch } = useQuery({
        queryKey: ['care_staff_bell_notifications'],
        queryFn: async () => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(todayStart.getDate() + 1);

            const [
                { data: auditRows },
                { data: profileNotificationRows },
                { data: supportSubmittedRows },
                { data: supportReferredRows },
                { data: counselingReferredRows },
                { data: counselingScheduledRows },
                { data: supportVisitRows }
            ] = await Promise.all([
                supabase
                    .from('audit_logs')
                    .select('id, action, details, created_at')
                    .in('action', PROFILE_NOTIFICATION_ACTIONS)
                    .order('created_at', { ascending: false })
                    .limit(STAFF_BELL_LIMIT),
                supabase
                    .from('notifications')
                    .select('id, message, created_at')
                    .like('message', '[PROFILE UPDATE]%')
                    .order('created_at', { ascending: false })
                    .limit(STAFF_BELL_LIMIT),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at')
                    .eq('status', SUPPORT_STATUS.SUBMITTED)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at, dept_notes')
                    .eq('status', SUPPORT_STATUS.REFERRED_TO_CARE)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('counseling_requests')
                    .select('id, student_id, student_name, request_type, status, created_at')
                    .eq('status', COUNSELING_STATUS.REFERRED)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('counseling_requests')
                    .select('id, student_id, student_name, request_type, status, created_at, scheduled_date')
                    .in('status', [COUNSELING_STATUS.STAFF_SCHEDULED, COUNSELING_STATUS.SCHEDULED])
                    .gte('scheduled_date', todayStart.toISOString())
                    .lt('scheduled_date', tomorrowStart.toISOString())
                    .order('scheduled_date', { ascending: true })
                    .limit(10),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at, dept_notes')
                    .eq('status', SUPPORT_STATUS.VISIT_SCHEDULED)
                    .order('created_at', { ascending: false })
                    .limit(100)
            ]);

            return dedupeAndLimitNotifications([
                ...((auditRows || []) as NotificationItem[]),
                ...((profileNotificationRows || []) as NotificationItem[]),
                ...((supportSubmittedRows || []) as SupportNotificationRow[]).map((row) => mapSupportSubmittedNotification(row)),
                ...((supportReferredRows || []) as SupportNotificationRow[]).map((row) => mapSupportReferredNotification(row)),
                ...((counselingReferredRows || []) as CounselingNotificationRow[]).map((row) => mapCounselingReferredNotification(row)),
                ...((counselingScheduledRows || []) as CounselingNotificationRow[])
                    .map((row) => mapCounselingScheduledTodayNotification(row))
                    .filter(Boolean) as NotificationItem[],
                ...((supportVisitRows || []) as SupportNotificationRow[])
                    .map((row) => mapSupportVisitScheduledTodayNotification(row))
                    .filter(Boolean) as NotificationItem[]
            ]);
        },
        enabled: false,
        staleTime: 60000
    });

    useEffect(() => {
        if (fetchedNotifications) {
            setNotifications(fetchedNotifications);
            setNotificationsLoaded(true);
        }
    }, [fetchedNotifications]);

    const handleOpenNotifications = useCallback(() => {
        if (notificationsLoaded || notificationsLoading) return;
        void refetch().catch((error) => {
            console.error('Failed to sync care staff notifications:', error);
            showToastMessage('Failed to load notifications.', 'error');
        });
    }, [refetch, notificationsLoaded, notificationsLoading, showToastMessage]);

    useEffect(() => {
        const removeProfileNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: RealtimeChangePayload) => {
                    const action = payload?.new?.action;
                    if (typeof action !== 'string' || !PROFILE_NOTIFICATION_ACTIONS.includes(action)) {
                        return;
                    }
                    if (payload.new) {
                        setNotifications((prev) => prependNotification(prev, payload.new as NotificationItem));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeProfileNotificationsFallbackChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_notifications_fallback')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: RealtimeChangePayload) => {
                    const message = String(payload?.new?.message || '');
                    if (!message.startsWith('[PROFILE UPDATE]')) {
                        return;
                    }
                    if (payload.new) {
                        setNotifications((prev) => prependNotification(prev, payload.new as NotificationItem));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeSupportNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_service_notifications_support')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_requests' }, (payload: RealtimeChangePayload<SupportNotificationRow>) => {
                    if (!payload.new) return;
                    if (payload.new.status === SUPPORT_STATUS.SUBMITTED) {
                        setNotifications((prev) => prependNotification(prev, mapSupportSubmittedNotification(payload.new as SupportNotificationRow)));
                    }
                    if (payload.new.status === SUPPORT_STATUS.REFERRED_TO_CARE) {
                        setNotifications((prev) => prependNotification(prev, mapSupportReferredNotification(payload.new as SupportNotificationRow, new Date().toISOString())));
                    }
                    if (payload.new.status === SUPPORT_STATUS.VISIT_SCHEDULED) {
                        setNotifications((prev) => prependNotification(prev, mapSupportVisitScheduledTodayNotification(payload.new as SupportNotificationRow, new Date().toISOString())));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests' }, (payload: RealtimeChangePayload<SupportNotificationRow>) => {
                    if (!payload.new) return;

                    const nextStatus = payload.new.status;
                    const prevStatus = payload.old?.status;
                    const alertAt = new Date().toISOString();

                    if (nextStatus === SUPPORT_STATUS.REFERRED_TO_CARE && prevStatus !== SUPPORT_STATUS.REFERRED_TO_CARE) {
                        setNotifications((prev) => prependNotification(prev, mapSupportReferredNotification(payload.new as SupportNotificationRow, alertAt)));
                    }

                    const nextScheduledAt = parseTimestamp(parseJsonRecord(payload.new.dept_notes)?.scheduled_date);
                    const prevScheduledAt = parseTimestamp(parseJsonRecord(payload.old?.dept_notes)?.scheduled_date);
                    if (
                        nextStatus === SUPPORT_STATUS.VISIT_SCHEDULED &&
                        (prevStatus !== SUPPORT_STATUS.VISIT_SCHEDULED || nextScheduledAt !== prevScheduledAt)
                    ) {
                        setNotifications((prev) => prependNotification(prev, mapSupportVisitScheduledTodayNotification(payload.new as SupportNotificationRow, alertAt)));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeCounselingNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_service_notifications_counseling')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'counseling_requests' }, (payload: RealtimeChangePayload<CounselingNotificationRow>) => {
                    if (!payload.new) return;
                    const alertAt = new Date().toISOString();
                    if (payload.new.status === COUNSELING_STATUS.REFERRED) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingReferredNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                    if (isCounselingCalendarVisible(payload.new.status)) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingScheduledTodayNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests' }, (payload: RealtimeChangePayload<CounselingNotificationRow>) => {
                    if (!payload.new) return;

                    const nextStatus = payload.new.status;
                    const prevStatus = payload.old?.status;
                    const alertAt = new Date().toISOString();

                    if (nextStatus === COUNSELING_STATUS.REFERRED && prevStatus !== COUNSELING_STATUS.REFERRED) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingReferredNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }

                    const nextScheduledAt = parseTimestamp(getCounselingScheduledDate(payload.new as CounselingNotificationRow));
                    const prevScheduledAt = parseTimestamp(getCounselingScheduledDate(payload.old as CounselingNotificationRow | undefined));
                    if (
                        isCounselingCalendarVisible(nextStatus) &&
                        (prevStatus !== nextStatus || nextScheduledAt !== prevScheduledAt)
                    ) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingScheduledTodayNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        return () => {
            removeProfileNotificationsChannel();
            removeProfileNotificationsFallbackChannel();
            removeSupportNotificationsChannel();
            removeCounselingNotificationsChannel();
        };
    }, []);

    return {
        notifications,
        notificationsLoading,
        handleOpenNotifications
    };
}
