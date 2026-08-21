import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function PublicPrivacyFooter() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <footer className="mt-auto border-t border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-4 text-center">
            <div className="mx-auto max-w-lg">
                {/* Compact Bar (always visible) */}
                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-500">
                    <span>© 2026 NORSU CARE (Guihulngan Campus)</span>
                    <span className="text-slate-300">•</span>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="inline-flex items-center gap-1 font-bold text-violet-600 hover:text-violet-700 hover:underline transition"
                    >
                        <span>🛡️</span>
                        <span>Privacy Policy</span>
                        <span className="text-[9px]">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <a
                        href="mailto:cjbustajod@gmail.com"
                        className="text-slate-400 hover:text-slate-700 transition"
                        title="Developer contact"
                    >
                        Contact
                    </a>
                </div>

                {/* Collapsible Privacy Card */}
                {isOpen && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left text-xs leading-relaxed text-slate-600 space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-100 text-[10px]">
                                    🛡️
                                </span>
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 truncate">
                                    NORSU CARE Center Management System — Guihulngan Campus
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-700"
                            >
                                Close ▲
                            </button>
                        </div>

                        <p className="text-[11px] leading-relaxed text-slate-600">
                            Student information, appointment requests, visit logbooks, and evaluations collected through this portal are processed strictly for guidance, student welfare support, and institutional records at <strong>NORSU-Guihulngan Campus</strong> in accordance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                        </p>

                        <div className="space-y-1 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                            <p>• <strong>Campus Exclusivity:</strong> This system is exclusively deployed for students, visitors, and personnel of NORSU-Guihulngan Campus.</p>
                            <p>• <strong>Confidentiality:</strong> Submissions are secured and accessible only to authorized CARE Center personnel.</p>
                            <p>• <strong>Student Rights:</strong> You have the right to request access to or correction of your submitted records.</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                            <span>Developer Contact: <a href="mailto:cjbustajod@gmail.com" className="font-bold text-violet-600 hover:underline">cjbustajod@gmail.com</a></span>
                            <Link
                                to="/privacy-policy"
                                className="font-bold text-violet-600 hover:underline"
                            >
                                Full University Policy →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </footer>
    );
}
