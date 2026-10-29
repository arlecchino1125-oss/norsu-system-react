import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import {
    getRecentPublicPushNotifications,
    getVapidPublicKey,
    removePublicPushSubscription,
    savePublicPushSubscription,
    urlBase64ToUint8Array,
    type PublicPushBroadcastRecord
} from '../../../../../services/pushNotificationService';

const PUSH_ENABLED_KEY = 'norsu_public_push_enabled';
const LAST_SEEN_PUSH_KEY = 'norsu_public_push_last_seen';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

const checkIsStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    const matchStandalone =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = Boolean((window.navigator as any)?.standalone);
    return matchStandalone || iosStandalone;
};

const checkIsIos = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
};

const checkInitialPushEnabled = (): boolean => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
        return (
            localStorage.getItem(PUSH_ENABLED_KEY) === '1' &&
            Notification.permission === 'granted'
        );
    } catch {
        return false;
    }
};

interface UsePublicPwaPushOptions {
    studentId?: string | null;
    showToast: (message: string, type?: string) => void;
    onNavigateUrl?: (url: string) => void;
    onBroadcastReceived?: () => void;
}

export function usePublicPwaPush({
    studentId,
    showToast,
    onNavigateUrl,
    onBroadcastReceived
}: UsePublicPwaPushOptions) {
    const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
    const [pushEnabled, setPushEnabled] = useState<boolean>(checkInitialPushEnabled);
    const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
    const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

    const isIos = checkIsIos();
    const pushSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        ('Notification' in window || isIos);

    // Register Service Worker and listen for notification click messages
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        let mounted = true;

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                if (mounted) {
                    swRegistrationRef.current = reg;
                }
            })
            .catch(() => {
                /* Service worker registration may be unavailable in restricted webviews */
            });

        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
                onNavigateUrl?.(String(event.data.url));
            }
        };

        navigator.serviceWorker.addEventListener?.('message', handleSwMessage);
        return () => {
            mounted = false;
            navigator.serviceWorker.removeEventListener?.('message', handleSwMessage);
        };
    }, [onNavigateUrl]);

    // Listen for native PWA install prompt & appinstalled events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsStandalone(true);
            setDeferredPrompt(null);
            setShowInstallModal(false);
            showToast('App installed! You can now launch CARE Hub from your home screen.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [showToast]);

    // Sync studentId with existing push subscription when student signs in
    useEffect(() => {
        if (!pushEnabled || !studentId || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager?.getSubscription())
            .then((sub) => {
                if (!sub) return;
                const json = sub.toJSON();
                if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                    void savePublicPushSubscription({
                        endpoint: json.endpoint,
                        p256dh: json.keys.p256dh,
                        auth: json.keys.auth,
                        studentId
                    }).catch(() => undefined);
                }
            })
            .catch(() => undefined);
    }, [pushEnabled, studentId]);

    const displayBroadcastNotification = useCallback(
        async (record: PublicPushBroadcastRecord) => {
            if (typeof window === 'undefined' || !('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;

            try {
                const reg =
                    swRegistrationRef.current ||
                    (await navigator.serviceWorker?.ready);
                if (reg?.showNotification) {
                    await reg.showNotification(record.title, {
                        body: record.body,
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png',
                        tag: record.tag || `care-broadcast-${record.id}`,
                        data: {
                            url: record.url || '/public',
                            category: record.category
                        }
                    });
                }
            } catch {
                /* Ignore notification display errors */
            }
        },
        []
    );

    // Listen for live broadcasts & catch up on recent broadcasts while pushEnabled is active
    useEffect(() => {
        if (!pushEnabled) return;

        let cancelled = false;

        const checkMissedBroadcasts = async () => {
            try {
                const lastSeen = localStorage.getItem(LAST_SEEN_PUSH_KEY);
                if (!lastSeen) {
                    localStorage.setItem(LAST_SEEN_PUSH_KEY, new Date().toISOString());
                    return;
                }
                const missed = await getRecentPublicPushNotifications(lastSeen);
                if (cancelled || missed.length === 0) return;

                const newest = missed[0]?.created_at;
                if (newest) {
                    localStorage.setItem(LAST_SEEN_PUSH_KEY, newest);
                }
                for (const item of missed.slice(0, 2).reverse()) {
                    await displayBroadcastNotification(item);
                }
                onBroadcastReceived?.();
            } catch {
                /* Non-critical */
            }
        };

        void checkMissedBroadcasts();

        const channel = supabase
            .channel('public-hub-push-broadcasts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'public_push_notifications'
                },
                (payload) => {
                    const record = payload.new as PublicPushBroadcastRecord;
                    if (!record?.title) return;
                    try {
                        localStorage.setItem(
                            LAST_SEEN_PUSH_KEY,
                            record.created_at || new Date().toISOString()
                        );
                    } catch {
                        /* Ignore storage errors */
                    }
                    void displayBroadcastNotification(record);
                    onBroadcastReceived?.();
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            void supabase.removeChannel(channel);
        };
    }, [displayBroadcastNotification, onBroadcastReceived, pushEnabled]);

    const handleInstallClick = useCallback(async () => {
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    setDeferredPrompt(null);
                }
                return;
            } catch {
                /* Fall through to manual guide modal */
            }
        }
        setShowInstallModal(true);
    }, [deferredPrompt]);

    const handleTogglePush = useCallback(async () => {
        if (isSubscribing) return;

        // If on iOS and not yet installed to Home Screen, guide user to install first
        if (isIos && !isStandalone && !('Notification' in window)) {
            setShowInstallModal(true);
            showToast('Add CARE Hub to your Home Screen first to enable iOS push notifications.', 'error');
            return;
        }

        if (typeof window === 'undefined' || !('Notification' in window)) {
            showToast('Push notifications are not supported in this browser.', 'error');
            return;
        }

        setIsSubscribing(true);
        try {
            if (pushEnabled) {
                // Disable push notifications
                if ('serviceWorker' in navigator) {
                    const reg =
                        swRegistrationRef.current ||
                        (await navigator.serviceWorker.getRegistration('/'));
                    const existingSub = await reg?.pushManager?.getSubscription();
                    if (existingSub) {
                        const endpoint = existingSub.endpoint;
                        await existingSub.unsubscribe().catch(() => undefined);
                        if (endpoint) {
                            await removePublicPushSubscription(endpoint).catch(() => undefined);
                        }
                    }
                }
                try {
                    localStorage.removeItem(PUSH_ENABLED_KEY);
                } catch {
                    /* Ignore */
                }
                setPushEnabled(false);
                showToast('Announcement push notifications turned off.');
                return;
            }

            // Enable push notifications
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showToast('Please allow notifications in your browser settings to receive alerts.', 'error');
                return;
            }

            let reg = swRegistrationRef.current;
            if (!reg && 'serviceWorker' in navigator) {
                reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                swRegistrationRef.current = reg;
                await navigator.serviceWorker.ready;
            }

            if (reg?.pushManager) {
                try {
                    let sub = await reg.pushManager.getSubscription();
                    if (!sub) {
                        const applicationServerKey = urlBase64ToUint8Array(getVapidPublicKey());
                        sub = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: applicationServerKey as BufferSource
                        });
                    }
                    const json = sub.toJSON();
                    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                        await savePublicPushSubscription({
                            endpoint: json.endpoint,
                            p256dh: json.keys.p256dh,
                            auth: json.keys.auth,
                            studentId: studentId || null
                        });
                    }
                } catch (pushSubErr) {
                    console.warn('Web Push subscription fallback to service worker notifications:', pushSubErr);
                }
            }

            try {
                localStorage.setItem(PUSH_ENABLED_KEY, '1');
                localStorage.setItem(LAST_SEEN_PUSH_KEY, new Date().toISOString());
            } catch {
                /* Ignore storage errors */
            }

            setPushEnabled(true);

            if (reg?.showNotification) {
                await reg
                    .showNotification('NORSU-G CARE Hub Alerts Enabled', {
                        body: 'You will now receive push notifications for new announcements, events, and scholarships.',
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png',
                        tag: 'care-push-welcome',
                        data: { url: '/public' }
                    })
                    .catch(() => undefined);
            }

            showToast('Push notifications enabled for announcements!');
        } catch (err: any) {
            showToast(err?.message || 'Could not update notification settings.', 'error');
        } finally {
            setIsSubscribing(false);
        }
    }, [isIos, isStandalone, isSubscribing, pushEnabled, showToast, studentId]);

    return {
        isStandalone,
        isIos,
        canInstallNatively: Boolean(deferredPrompt),
        showInstallModal,
        setShowInstallModal,
        pushSupported,
        pushEnabled,
        isSubscribing,
        handleInstallClick,
        handleTogglePush
    };
}

