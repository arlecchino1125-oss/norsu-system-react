import React from 'react';
import { Activity, Search } from 'lucide-react';
import { formatAuditDetails, type StaffAuditLogRow } from '../../../../../lib/staffAudit';
import { getStaffRoleBadgeClass } from '../../../utils';
import type { AdminPanelKey, AuditRoleFilter } from '../../../types';

const AUDIT_PAGE_SIZE = 25;

interface AuditPanelProps {
    auditLogs: StaffAuditLogRow[];
    auditLoading: boolean;
    auditTotalCount: number;
    auditRoleFilter: AuditRoleFilter;
    setAuditRoleFilter: (role: AuditRoleFilter) => void;
    auditSearch: string;
    setAuditSearch: (search: string) => void;
    auditPage: number;
    setAuditPage: (page: number | ((prev: number) => number)) => void;
    renderExpandablePanel: (props: any) => React.ReactNode;
}

export function AuditPanel({
    auditLogs,
    auditLoading,
    auditTotalCount,
    auditRoleFilter,
    setAuditRoleFilter,
    auditSearch,
    setAuditSearch,
    auditPage,
    setAuditPage,
    renderExpandablePanel
}: AuditPanelProps) {
    const auditPageCount = Math.max(1, Math.ceil(auditTotalCount / AUDIT_PAGE_SIZE));
    const visibleAuditStart = auditTotalCount === 0 ? 0 : ((auditPage - 1) * AUDIT_PAGE_SIZE) + 1;
    const visibleAuditEnd = Math.min(auditTotalCount, auditPage * AUDIT_PAGE_SIZE);

    const careAuditCount = auditLogs.filter((log) => log.actor_role === 'Care Staff').length;
    const departmentAuditCount = auditLogs.filter((log) => log.actor_role === 'Department Head').length;
    const activeAuditDepartments = new Set(
        auditLogs
            .map((log) => String(log.actor_department || '').trim())
            .filter(Boolean)
    ).size;

    return renderExpandablePanel({
        panelKey: 'audit' as AdminPanelKey,
        title: 'Staff Audit Monitor',
        description: 'Recent activity from all staff roles (Admin, CARE Staff, Department Head, Registrar). Student actions are excluded from this monitor.',
        icon: <Activity className="h-5 w-5" />,
        badge: `${auditTotalCount} logs`,
        bodyClassName: '',
        headerActions: (
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <select
                    value={auditRoleFilter}
                    onChange={(e) => setAuditRoleFilter(e.target.value as AuditRoleFilter)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                >
                    <option value="All">All Staff Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Care Staff">CARE Staff</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Registrar">Registrar</option>
                </select>
                <div className="relative sm:w-80">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search user, action, department..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                    />
                </div>
            </div>
        ),
        children: (
            <>
                <div className="grid gap-4 p-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Visible CARE Actions</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{careAuditCount}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Visible Department Actions</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{departmentAuditCount}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Colleges On Page</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{activeAuditDepartments}</p>
                    </div>
                </div>

                <div className="max-h-[560px] overflow-auto border-t border-slate-200/80">
                    <table className="min-w-[880px] w-full text-left text-sm">
                        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50/95 text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">Staff</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Loading staff audit logs...</td>
                                </tr>
                            ) : auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">No matching staff audit activity found.</td>
                                </tr>
                            ) : (
                                auditLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                                        <td className="px-6 py-5 font-mono text-xs text-slate-500">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900">{log.user_name || '-'}</div>
                                            <div className="mt-1 text-xs text-slate-400">{log.actor_department || 'No college assigned'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStaffRoleBadgeClass(log.actor_role)}`}>
                                                {log.actor_role || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-medium text-slate-800">{log.action || '-'}</div>
                                            {(log.entity_table || log.entity_id) && (
                                                <div className="mt-1 text-xs text-slate-400">
                                                    {String(log.entity_table || '').trim() || 'record'}
                                                    {log.entity_id ? ` - ${log.entity_id}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 leading-6 text-slate-600">{formatAuditDetails(log.details)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 text-sm text-slate-500 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                        <p>
                            Showing <span className="font-semibold text-slate-700">{visibleAuditStart}</span> to <span className="font-semibold text-slate-700">{visibleAuditEnd}</span> of <span className="font-semibold text-slate-700">{auditTotalCount}</span> matching audit logs
                        </p>
                        <p className="text-xs text-slate-400">
                            Search and role filters now run on the server, so older matches are included even when the table grows past 100 records.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                            disabled={auditPage === 1 || auditLoading}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                            Page {auditPage} of {auditPageCount}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.min(auditPageCount, prev + 1))}
                            disabled={auditPage >= auditPageCount || auditLoading}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </>
        )
    });
}
