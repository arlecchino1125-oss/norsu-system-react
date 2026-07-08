import React from 'react';
import { Shield } from 'lucide-react';
import type { AdminPanelKey } from '../../../types';

interface GovernancePanelProps {
    renderExpandablePanel: (props: any) => React.ReactNode;
}

export function GovernancePanel({ renderExpandablePanel }: GovernancePanelProps) {
    return renderExpandablePanel({
        panelKey: 'governance' as AdminPanelKey,
        title: 'Governance Boundaries',
        description: 'Admin stays responsible for institution-wide governance. Operational student workflows stay with the roles that own those domains day to day.',
        icon: <Shield className="h-5 w-5" />,
        badge: 'Role map',
        className: 'lg:col-span-2',
        bodyClassName: '',
        children: (
            <>
                <div className="grid gap-4 p-6 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Admin Owns</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                            <li>Staff account creation, archiving, and role assignment</li>
                            <li>College and department master-data setup</li>
                            <li>Email record cleanup and institution-wide maintenance tasks</li>
                            <li>Cross-role audit monitoring and institution-wide alerts</li>
                        </ul>
                    </div>
                    <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">CARE Staff Owns</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                            <li>Student population, NAT, activation policy, and student-service workflows</li>
                            <li>Restricted student-data reset controls inside advanced settings</li>
                            <li>OTP-protected destructive actions with reason capture and audit logs</li>
                            <li>Operational case handling instead of institution-wide governance</li>
                        </ul>
                    </div>
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Department Heads Own</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                            <li>Admissions and department-level student follow-up</li>
                            <li>First-line counseling and support workflows inside their college</li>
                            <li>Operational reporting for their assigned programs</li>
                            <li>Not the institution-wide list of colleges or admin maintenance tools</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-slate-200/80 bg-slate-50/70 px-6 py-5 text-sm leading-6 text-slate-600">
                    Student reset controls have moved out of admin and into CARE Staff advanced controls, where they are hidden behind OTP verification, typed confirmation, a written reason, and staff audit logging.
                </div>
            </>
        )
    });
}
