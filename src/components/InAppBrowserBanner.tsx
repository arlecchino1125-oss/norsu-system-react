// claude
import { useState } from 'react';
import { ExternalLink, Copy, Check, X } from 'lucide-react';
import { isInAppBrowser } from '../lib/inAppBrowser';

const DISMISS_KEY = 'inapp_browser_banner_dismissed';

const wasDismissed = () => {
    try {
        return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
};

/**
 * Nudges students who opened the app inside Facebook / Facebook Lite's in-app
 * browser to reopen it in Chrome or Safari, where autofill works and the login
 * session actually persists. Renders nothing outside of those webviews, so staff
 * on desktops never see it. Dismissal is remembered for the browsing session.
 */
export default function InAppBrowserBanner() {
    const [hidden, setHidden] = useState(() => !isInAppBrowser() || wasDismissed());
    const [copied, setCopied] = useState(false);

    if (hidden) return null;

    const dismiss = () => {
        setHidden(true);
        try {
            sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* storage may be blocked in the webview; dismissing for this view is enough */
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard often blocked in webviews — user can still copy from the address bar */
        }
    };

    return (
        <div
            role="region"
            aria-label="Open in a full browser"
            className="relative z-50 flex items-start gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-100 sm:px-6"
        >
            <ExternalLink className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">You're in Facebook's in-app browser</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-200/90">
                    Logins can fail here. For a reliable sign-in, tap the{' '}
                    <span className="font-semibold">⋯</span> menu (top corner) and choose{' '}
                    <span className="font-semibold">Open in browser</span>, or copy the link below.
                </p>
                <button
                    type="button"
                    onClick={copyLink}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-white dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-50 dark:hover:bg-amber-900/70"
                >
                    {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied ? 'Link copied' : 'Copy link'}
                </button>
            </div>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="-mr-1 shrink-0 rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
                <X className="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    );
}
