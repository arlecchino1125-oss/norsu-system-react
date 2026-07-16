import React, { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { getArchiveSchemaErrorMessage } from '../../../utils';
import type { AdminPanelKey } from '../../../types';

interface CollegesPanelProps {
    departmentsData: any[];
    coursesData: any[];
    renderExpandablePanel: (props: any) => React.ReactNode;
    showToast: (msg: string, type?: string) => void;
    refetchDepartments: () => void;
}

export function CollegesPanel({ departmentsData, coursesData, renderExpandablePanel, showToast, refetchDepartments }: CollegesPanelProps) {
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [newDeptName, setNewDeptName] = useState<string>('');

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedDepartmentId = Number(departmentId);
        return coursesData.filter((course: any) => Number(course.department_id) === normalizedDepartmentId);
    };

    const departments = departmentsData.map(d => d.name);

    const handleAddDepartment = async () => {
        const name = newDeptName.trim();
        if (isAddingDepartment) return;
        if (!name) return;
        if (departments.includes(name)) { showToast('College already exists.', 'error'); return; }
        setIsAddingDepartment(true);
        try {
            const { error } = await supabase.from('departments').insert([{ name }]);
            if (error) throw error;

            showToast(`College "${name}" added.`);
            setNewDeptName('');
            refetchDepartments();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, "Couldn't save college."), 'error');
        } finally {
            setIsAddingDepartment(false);
        }
    };

    const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100';

    return (
        <div className="mt-8">
            {renderExpandablePanel({
                panelKey: 'colleges' as AdminPanelKey,
                title: `Colleges (${departmentsData.length})`,
                description: 'College and course data is fixed; add a college if a new one is established. Colleges are no longer archived.',
                icon: <Building2 className="h-5 w-5" />,
                badge: `${departmentsData.length} colleges`,
                bodyClassName: 'space-y-6 p-6 sm:p-7',
                headerActions: (
                    <div className="grid w-full gap-3 lg:w-[360px]">
                        <input disabled={isAddingDepartment} className={inputClass} placeholder="New college name..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()} />
                        <button type="button" disabled={isAddingDepartment} onClick={handleAddDepartment} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><Plus className={`h-4 w-4 ${isAddingDepartment ? 'animate-spin' : ''}`} /> {isAddingDepartment ? 'Adding...' : 'Add College'}</button>
                    </div>
                ),
                children: (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total Colleges</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{departmentsData.length}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mapped Courses</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{coursesData.length}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {departmentsData.length === 0 && <p className="text-sm text-slate-400">No colleges yet. Add one above.</p>}
                            {departmentsData.map((dept: any) => {
                                const linkedCourseCount = getDepartmentCourses(dept.id).length;

                                return (
                                    <span key={dept.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                                        {dept.name}
                                        {linkedCourseCount > 0 && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                {linkedCourseCount} course{linkedCourseCount === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </>
                )
            })}
        </div>
    );
}
