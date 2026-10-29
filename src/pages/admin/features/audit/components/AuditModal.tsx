import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatAuditDetails, type StaffAuditLogRow } from '../../../../../lib/staffAudit';
import { getStaffRoleBadgeClass } from '../../../utils';
import type { AuditRoleFilter } from '../../../types';

const AUDIT_PAGE_SIZE = 25;

interface AuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    auditLogs: StaffAuditLogRow[];
    auditLoading: boolean;
    auditTotalCount: number;
    auditRoleFilter: AuditRoleFilter;
    setAuditRoleFilter: (role: AuditRoleFilter) => void;
    auditSearch: string;
    setAuditSearch: (search: string) => void;
    auditPage: number;
    setAuditPage: (page: number | ((prev: number) => number)) => void;
}

export function AuditModal({
    isOpen,
    onClose,
    auditLogs,
    auditLoading,
    auditTotalCount,
    auditRoleFilter,
    setAuditRoleFilter,
    auditSearch,
    setAuditSearch,
    auditPage,
    setAuditPage
}: AuditModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const auditPageCount = Math.max(1, Math.ceil(auditTotalCount / AUDIT_PAGE_SIZE));
    const visibleAuditStart = auditTotalCount === 0 ? 0 : ((auditPage - 1) * AUDIT_PAGE_SIZE) + 1;
    const visibleAuditEnd = Math.min(auditTotalCount, auditPage * AUDIT_PAGE_SIZE);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Outfit',sans-serif]">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="audit-modal-title"
                className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="audit-modal-title" className="font-extrabold text-base text-slate-900 leading-tight">
                                Staff Audit Monitor
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Recent activity from all staff roles (Admin, CARE Staff, College Designate, Registrar). Student actions are excluded.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer shrink-0"
                        aria-label="Close dialog"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <select
                            aria-label="Filter audit logs by staff role"
                            value={auditRoleFilter}
                            onChange={(e) => setAuditRoleFilter(e.target.value as AuditRoleFilter)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition"
                        >
                            <option value="All">All Staff Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Care Staff">CARE Staff</option>
                            <option value="Department Head">College Designate</option>
                            <option value="Registrar">Registrar</option>
                        </select>
                        <span className="text-xs text-slate-400 font-medium">
                            Showing {auditLogs.length} events
                        </span>
                    </div>

                    <div className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            placeholder="Search user, action, college..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition"
                        />
                    </div>
                </div>

                {/* Body Table */}
                <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                    <table className="min-w-[840px] w-full text-left text-xs">
                        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50/95 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 backdrop-blur z-10">
                            <tr>
                                <th className="px-5 py-3.5 font-bold">Timestamp</th>
                                <th className="px-5 py-3.5 font-bold">Staff</th>
                                <th className="px-5 py-3.5 font-bold">Role</th>
                                <th className="px-5 py-3.5 font-bold">Action</th>
                                <th className="px-5 py-3.5 font-bold">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {auditLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400">
                                        Loading staff audit activity...
                                    </td>
                                </tr>
                            ) : auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400">
                                        No matching staff audit activity found.
                                    </td>
                                </tr>
                            ) : (
                                auditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-extrabold text-slate-900">{log.user_name || '-'}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{log.actor_department || 'No college assigned'}</div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${getStaffRoleBadgeClass(log.actor_role)}`}>
                                                {log.actor_role === 'Department Head' ? 'College Designate' : log.actor_role || '-'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-bold text-slate-800">{log.action || '-'}</div>
                                            {(log.entity_table || log.entity_id) && (
                                                <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                                                    {String(log.entity_table || '').trim() || 'record'} {log.entity_id ? `· ${log.entity_id}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600 leading-snug max-w-xs break-words">
                                            {formatAuditDetails(log.details)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
                    <p className="font-medium">
                        Showing <span className="font-bold text-slate-800">{visibleAuditStart}</span>&ndash;<span className="font-bold text-slate-800">{visibleAuditEnd}</span> of <span className="font-bold text-slate-800">{auditTotalCount.toLocaleString()}</span> logs
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                            disabled={auditPage === 1 || auditLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft size={13} />
                            <span>Prev</span>
                        </button>
                        <span className="font-bold text-slate-700">
                            {auditPage} / {auditPageCount}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.min(auditPageCount, prev + 1))}
                            disabled={auditPage >= auditPageCount || auditLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <span>Next</span>
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

