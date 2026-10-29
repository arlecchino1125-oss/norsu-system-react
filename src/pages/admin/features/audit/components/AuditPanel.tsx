import React, { useState, useMemo } from 'react';
import { Activity, ExternalLink, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { formatAuditDetails, type StaffAuditLogRow } from '../../../../../lib/staffAudit';
import { getStaffRoleBadgeClass } from '../../../utils';
import type { AuditRoleFilter } from '../../../types';

interface AuditPanelProps {
    auditLogs: StaffAuditLogRow[];
    auditLoading: boolean;
    auditTotalCount: number;
    auditRoleFilter: AuditRoleFilter;
    setAuditRoleFilter: (role: AuditRoleFilter) => void;
    auditSearch: string;
    setAuditSearch: (search: string) => void;
    onOpenModal: () => void;
}

export function AuditPanel({
    auditLogs,
    auditLoading,
    auditTotalCount,
    auditRoleFilter,
    setAuditRoleFilter,
    auditSearch,
    setAuditSearch,
    onOpenModal
}: AuditPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inlineRoleFilter, setInlineRoleFilter] = useState<string>('All');
    const [inlineSearch, setInlineSearch] = useState<string>('');

    // Most recent log for ticker
    const latestLog = auditLogs.length > 0 ? auditLogs[0] : null;

    // Filtered logs for inline feed
    const filteredInlineLogs = useMemo(() => {
        return auditLogs.filter(log => {
            if (inlineRoleFilter !== 'All' && log.actor_role !== inlineRoleFilter) {
                return false;
            }
            if (inlineSearch.trim()) {
                const term = inlineSearch.toLowerCase();
                const user = String(log.user_name || '').toLowerCase();
                const action = String(log.action || '').toLowerCase();
                const dept = String(log.actor_department || '').toLowerCase();
                const details = formatAuditDetails(log.details).toLowerCase();
                if (!user.includes(term) && !action.includes(term) && !dept.includes(term) && !details.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [auditLogs, inlineRoleFilter, inlineSearch]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden font-['Outfit',sans-serif]">
            {/* Minimized Header Bar */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                        <Activity className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-none">
                                Staff Audit Log
                            </h3>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0">
                                {auditLogs.length} recent
                            </span>
                        </div>
                        {latestLog && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                                Latest: <span className="font-bold text-slate-700">{latestLog.user_name || 'Staff'}</span> &middot; {latestLog.action}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onOpenModal}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                    >
                        <ExternalLink size={12} className="text-slate-400" />
                        <span className="hidden sm:inline">Modal</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                        <span>{isExpanded ? 'Hide' : 'Logs'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>
            </div>

            {/* Expanded Inline Notification Feed */}
            {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2.5 animate-fade-in">
                    {/* Compact Filter Bar */}
                    <div className="flex items-center gap-2 text-xs">
                        <select
                            value={inlineRoleFilter}
                            onChange={e => setInlineRoleFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="All">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Care Staff">CARE Staff</option>
                            <option value="Department Head">College Designate</option>
                            <option value="Registrar">Registrar</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={inlineSearch}
                                onChange={e => setInlineSearch(e.target.value)}
                                placeholder="Filter notifications..."
                                className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Scrollable Notification List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                        {filteredInlineLogs.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">
                                No recent notifications found.
                            </p>
                        ) : (
                            filteredInlineLogs.map(log => (
                                <div
                                    key={log.id}
                                    className="rounded-xl border border-slate-200/80 bg-white p-2.5 space-y-1 text-xs hover:border-slate-300 transition"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="font-extrabold text-slate-900 truncate">
                                                {log.user_name || 'Staff'}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-0.2 text-[9px] font-bold ${getStaffRoleBadgeClass(log.actor_role)}`}>
                                                {log.actor_role === 'Department Head' ? 'Designate' : log.actor_role || '-'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                            {log.created_at ? new Date(log.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-800">
                                        {log.action}
                                    </p>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                                        {formatAuditDetails(log.details)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
