import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { AdminPanelKey } from '../types';

interface AdminAlertsProps {
    adminAlerts: {
        label: string;
        value: number;
        hint: string;
        tone: string;
    }[];
    renderExpandablePanel: (props: any) => React.ReactNode;
}

export function AdminAlerts({ adminAlerts, renderExpandablePanel }: AdminAlertsProps) {
    return (
        <div className="mt-6 mb-8">
            {renderExpandablePanel({
                panelKey: 'alerts' as AdminPanelKey,
                title: 'Role-Based Alerts',
                description: 'Quick admin-only signals for access setup, linking, and cleanup.',
                icon: <AlertCircle className="h-5 w-5" />,
                badge: `${adminAlerts.length} cards`,
                bodyClassName: 'p-6 sm:p-7',
                children: (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        {adminAlerts.map((alert) => (
                            <div key={alert.label} className={`rounded-[24px] border p-5 shadow-sm shadow-slate-200/60 ${alert.tone}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{alert.label}</p>
                                        <p className="mt-3 text-3xl font-semibold text-slate-900">{alert.value}</p>
                                    </div>
                                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-current opacity-70" />
                                </div>
                                <p className="mt-4 text-xs leading-5 opacity-90">{alert.hint}</p>
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    );
}
