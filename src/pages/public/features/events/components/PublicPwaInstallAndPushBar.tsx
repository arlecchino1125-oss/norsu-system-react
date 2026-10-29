import React from 'react';
import { Bell, BellRing, Download, Share, PlusSquare, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface PublicPwaInstallAndPushBarProps {
    isStandalone: boolean;
    isIos: boolean;
    pushSupported: boolean;
    pushEnabled: boolean;
    isSubscribing: boolean;
    showInstallModal: boolean;
    setShowInstallModal: (open: boolean) => void;
    onInstallClick: () => void;
    onTogglePush: () => void;
}

export default function PublicPwaInstallAndPushBar({
    isStandalone,
    isIos,
    pushSupported,
    pushEnabled,
    isSubscribing,
    showInstallModal,
    setShowInstallModal,
    onInstallClick,
    onTogglePush
}: PublicPwaInstallAndPushBarProps) {
    return (
        <>
            <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 sm:mx-5 sm:mb-4">
                {!isStandalone && (
                    <button
                        type="button"
                        onClick={onInstallClick}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-[11px] font-bold text-white shadow-sm backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/25 active:scale-[0.98] sm:flex-none sm:px-3.5 sm:py-2 sm:text-xs"
                    >
                        <Download className="h-3.5 w-3.5 text-amber-200 sm:h-4 sm:w-4" aria-hidden="true" />
                        <span>Download App</span>
                    </button>
                )}

                {pushSupported && (
                    <button
                        type="button"
                        onClick={onTogglePush}
                        disabled={isSubscribing}
                        aria-pressed={pushEnabled}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold shadow-sm backdrop-blur-md transition-all active:scale-[0.98] disabled:opacity-60 sm:flex-none sm:px-3.5 sm:py-2 sm:text-xs ${
                            pushEnabled
                                ? 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'
                                : 'border-white/25 bg-white/15 text-white hover:border-white/40 hover:bg-white/25'
                        }`}
                    >
                        {pushEnabled ? (
                            <>
                                <BellRing className="h-3.5 w-3.5 text-emerald-300 sm:h-4 sm:w-4" aria-hidden="true" />
                                <span>{isSubscribing ? 'Updating…' : 'Alerts Enabled'}</span>
                            </>
                        ) : (
                            <>
                                <Bell className="h-3.5 w-3.5 text-amber-200 sm:h-4 sm:w-4" aria-hidden="true" />
                                <span>{isSubscribing ? 'Enabling…' : 'Enable Push Alerts'}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {showInstallModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowInstallModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pwa-install-guide-title"
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-900 p-6 text-white shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-400/30">
                                    <Smartphone className="h-6 w-6 text-violet-300" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-300">
                                        Install Public Hub App
                                    </span>
                                    <h2 id="pwa-install-guide-title" className="text-lg font-extrabold leading-tight text-white">
                                        Add CARE Hub to Home Screen
                                    </h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInstallModal(false)}
                                aria-label="Close install instructions"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-white/75 sm:text-sm">
                            Install the NORSU-G CARE Center Public Hub on your device for 1-tap access and instant push notifications for announcements, events, and scholarships.
                        </p>

                        {isIos ? (
                            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs sm:text-sm">
                                <p className="font-bold text-amber-200">On iPhone or iPad (Safari):</p>
                                <div className="flex items-start gap-2.5 text-white/85">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold">
                                        1
                                    </span>
                                    <p className="flex-1">
                                        Tap the <span className="inline-flex items-center gap-1 font-bold text-white"><Share className="inline h-3.5 w-3.5 text-sky-300" /> Share</span> button at the bottom of Safari.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2.5 text-white/85">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold">
                                        2
                                    </span>
                                    <p className="flex-1">
                                        Scroll down and tap <span className="inline-flex items-center gap-1 font-bold text-white"><PlusSquare className="inline h-3.5 w-3.5 text-emerald-300" /> Add to Home Screen</span>, then tap <span className="font-bold text-white">Add</span>.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2.5 text-white/85">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold">
                                        3
                                    </span>
                                    <p className="flex-1">
                                        Open the app from your Home Screen and tap <span className="font-bold text-emerald-300">Enable Push Alerts</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs sm:text-sm">
                                <p className="font-bold text-amber-200">How to install from your browser:</p>
                                <div className="flex items-start gap-2.5 text-white/85">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold">
                                        1
                                    </span>
                                    <p className="flex-1">
                                        Tap the browser menu <span className="font-bold text-white">⋮</span> (top-right corner in Chrome/Edge) or the address bar install icon.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2.5 text-white/85">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold">
                                        2
                                    </span>
                                    <p className="flex-1">
                                        Choose <span className="font-bold text-white">Install app</span> or <span className="font-bold text-white">Add to Home screen</span>.
                                    </p>
                                </div>
                                <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                                    <span>Once installed, it launches directly into the Public Hub!</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowInstallModal(false)}
                            className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:from-violet-500 hover:to-purple-500 active:scale-[0.98] sm:text-sm"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

