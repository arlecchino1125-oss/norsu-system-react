import React from 'react';
import { CalendarDays } from 'lucide-react';

const BOARD_SECTIONS = [
    {
        key: 'Interview Scheduled',
        title: 'Interview Scheduled',
        emptyLabel: 'No scheduled applicants for this date.'
    },
    {
        key: 'Approved for Enrollment',
        title: 'Approved for Enrollment',
        emptyLabel: 'No approved applicants for this date.'
    }
];

const getActiveCourseName = (app: any) => {
    const currentChoice = Number(app?.current_choice || 1);
    if (currentChoice === 2) return app?.alt_course_1;
    if (currentChoice === 3) return app?.alt_course_2;
    return app?.priority_course;
};

const DeptInterviewQueuePage = ({
    queueDate,
    setQueueDate,
    queueRows,
    isLoadingQueue,
    queueError,
    refreshInterviewQueue
}: any) => {
    const normalizedRows = Array.isArray(queueRows) ? queueRows : [];
    const groupedRows = BOARD_SECTIONS.reduce((acc, section) => {
        acc[section.key] = normalizedRows.filter((row: any) => String(row?.status || '').trim() === section.key);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Interview Queue Board</h2>
                    <p className="text-sm text-gray-500 mt-1 pl-4">Simple read-only lists for scheduled interviews and approved applicants.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <CalendarDays size={16} className="text-gray-400" />
                        <input
                            type="date"
                            value={queueDate}
                            onChange={(event) => setQueueDate(event.target.value)}
                            className="bg-transparent text-sm text-gray-700 outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={refreshInterviewQueue}
                        disabled={Boolean(isLoadingQueue)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoadingQueue ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {BOARD_SECTIONS.map((section) => (
                    <span
                        key={section.key}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                        {section.title}: {groupedRows[section.key]?.length || 0}
                    </span>
                ))}
            </div>

            {queueError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {queueError}
                </div>
            )}

            <div className="space-y-4">
                {BOARD_SECTIONS.map((section) => (
                    <div key={section.key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                            <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                            <span className="text-xs font-semibold text-gray-500">
                                {groupedRows[section.key]?.length || 0}
                            </span>
                        </div>

                        {(groupedRows[section.key] || []).length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                {section.emptyLabel}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3">Applicant</th>
                                            <th className="px-4 py-3">Reference ID</th>
                                            <th className="px-4 py-3">Course</th>
                                            <th className="px-4 py-3">Schedule</th>
                                            <th className="px-4 py-3">Venue</th>
                                            <th className="px-4 py-3">Panel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(groupedRows[section.key] || []).map((app: any, index: number) => (
                                            <tr key={app.id} className={index !== groupedRows[section.key].length - 1 ? 'border-b border-gray-100' : ''}>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900">{app.first_name} {app.last_name}</div>
                                                    {app.email && <div className="text-xs text-gray-500">{app.email}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{app.reference_id || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700">{getActiveCourseName(app) || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700">{app.interview_date || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700">{app.interview_venue || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700">{app.interview_panel || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeptInterviewQueuePage;
