import React from 'react';
import { Users, RefreshCw } from 'lucide-react';
import type { AdminPanelKey } from '../../../types';

interface StudentOverviewPanelProps {
    studentsData: any[];
    applicationsCount: number;
    linkedStudentCount: number;
    authPendingStudentCount: number;
    setShowIdSwapModal: (show: boolean) => void;
    renderExpandablePanel: (props: any) => React.ReactNode;
}

export function StudentOverviewPanel({
    studentsData,
    applicationsCount,
    linkedStudentCount,
    authPendingStudentCount,
    setShowIdSwapModal,
    renderExpandablePanel
}: StudentOverviewPanelProps) {
    const activeStudentCount = studentsData.filter((student: any) => String(student.status || '').trim() === 'Active').length;
    const probationStudentCount = studentsData.filter((student: any) => String(student.status || '').trim() === 'Probation').length;

    const studentOverviewStats = [
        { label: 'Students', value: studentsData.length, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
        { label: 'Linked Auth', value: linkedStudentCount, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
        { label: 'Needs Auth', value: authPendingStudentCount, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
        { label: 'Applications', value: applicationsCount, tone: 'border-violet-200 bg-violet-50 text-violet-700' }
    ];

    return renderExpandablePanel({
        panelKey: 'studentOverview' as AdminPanelKey,
        title: 'Student Access Overview',
        description: 'Read-only student totals stay visible here for global health checks. Row-level student work and destructive student-data controls now live with CARE Staff.',
        icon: <Users className="h-5 w-5" />,
        badge: `${studentsData.length} records`,
        className: 'h-fit',
        bodyClassName: 'p-6',
        children: (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    {studentOverviewStats.map((stat) => (
                        <div key={stat.label} className={`rounded-2xl border p-4 ${stat.tone}`}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{stat.label}</p>
                            <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                        <span>Active students</span>
                        <span className="font-semibold text-slate-900">{activeStudentCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span>Probation students</span>
                        <span className="font-semibold text-slate-900">{probationStudentCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span>Linked auth cleanup required</span>
                        <span className={`font-semibold ${linkedStudentCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {linkedStudentCount > 0 ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowIdSwapModal(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Rename / Swap Student IDs</span>
                </button>
            </div>
        )
    });
}
