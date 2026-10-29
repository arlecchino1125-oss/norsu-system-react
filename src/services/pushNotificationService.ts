import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';

export const DEFAULT_VAPID_PUBLIC_KEY =
    'BDHQjaZ2ktph5MkmLx3X-hKT3fOdJqA73-5ylq7LF6Z00Cc8Ur7rMcYFOq2Ei26ytIM-fGwYfDTF1WHGeeAcuO4';

export interface PublicPushBroadcastRecord {
    id: number;
    category: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    created_by?: string | null;
    created_at: string;
}

export interface SendPushBroadcastInput {
    category: 'Announcement' | 'Event' | 'Scholarship' | string;
    title: string;
    body: string;
    url?: string;
    tag?: string;
}

export const getVapidPublicKey = (): string => {
    const envKey = (import.meta.env?.VITE_VAPID_PUBLIC_KEY || '').trim();
    return envKey || DEFAULT_VAPID_PUBLIC_KEY;
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

export const savePublicPushSubscription = async (args: {
    endpoint: string;
    p256dh: string;
    auth: string;
    studentId?: string | null;
    userAgent?: string | null;
}): Promise<void> => {
    const { data, error } = await rpc('public_save_push_subscription', {
        p_endpoint: args.endpoint,
        p_p256dh: args.p256dh,
        p_auth: args.auth,
        p_student_id: args.studentId || null,
        p_user_agent: args.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null)
    });

    if (error) throw error;
    if (data && data.success === false) {
        throw new Error(data.error || 'Could not save push subscription.');
    }
};

export const removePublicPushSubscription = async (endpoint: string): Promise<void> => {
    const { error } = await rpc('public_remove_push_subscription', {
        p_endpoint: endpoint
    });
    if (error) throw error;
};

export const getRecentPublicPushNotifications = async (
    sinceIso?: string | null
): Promise<PublicPushBroadcastRecord[]> => {
    const { data, error } = await rpc('public_get_recent_push_notifications', {
        p_since: sinceIso || null
    });
    if (error) return [];
    return (data || []) as PublicPushBroadcastRecord[];
};

const truncateNotificationBody = (text: string, maxLen = 160): string => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'Tap to view full details on the NORSU-G CARE Center Public Hub.';
    return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
};

export const sendPublicPushBroadcast = async (input: SendPushBroadcastInput): Promise<void> => {
    const category = input.category || 'Announcement';
    const title = String(input.title || '').trim();
    const body = truncateNotificationBody(input.body);
    const url = input.url || '/public';
    const tag = input.tag || `care-${category.toLowerCase()}-${Date.now()}`;

    if (!title) return;

    try {
        await invokeEdgeFunction('manage-care-services', {
            requireAuth: true,
            body: {
                mode: 'send-push-broadcast',
                category,
                title,
                body,
                url,
                tag
            }
        });
    } catch {
        // Non-blocking: announcement/event/scholarship creation itself already succeeded
    }
};

