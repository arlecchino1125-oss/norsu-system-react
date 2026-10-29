import React, { useState } from 'react';
import { Building2, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { getArchiveSchemaErrorMessage, getCollegeCode } from '../../../utils';

interface CollegesPanelProps {
    departmentsData: any[];
    coursesData: any[];
    onOpenModal: () => void;
    showToast: (msg: string, type?: string) => void;
    refetchDepartments: () => void;
}

export function CollegesPanel({
    departmentsData,
    coursesData,
    onOpenModal,
    showToast,
    refetchDepartments
}: CollegesPanelProps) {
    const [newCollegeName, setNewCollegeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedId = Number(departmentId);
        return coursesData.filter((c: any) => Number(c.department_id) === normalizedId);
    };

    const handleAddCollege = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newCollegeName.trim();
        if (!name || isAdding) return;
        if (departmentsData.some(d => d.name.toLowerCase() === name.toLowerCase())) {
            showToast('College already exists.', 'error');
            return;
        }

        setIsAdding(true);
        try {
            const { error } = await supabase.from('departments').insert([{ name }]);
            if (error) throw error;
            showToast(`College "${name}" added.`);
            setNewCollegeName('');
            refetchDepartments();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, "Couldn't save college."), 'error');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3.5 font-['Outfit',sans-serif]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                            Institutional Colleges
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Master department list; colleges are permanent once established.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onOpenModal}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                    <ExternalLink size={12} className="text-slate-400" />
                    <span>Courses</span>
                </button>
            </div>

            {/* 3x2 Grid of College Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {departmentsData.map(dept => {
                    const courses = getDepartmentCourses(dept.id);
                    const code = getCollegeCode(dept.name);

                    return (
                        <div
                            key={dept.id}
                            onClick={onOpenModal}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 hover:bg-slate-100/80 hover:border-slate-200 transition cursor-pointer text-left group"
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-emerald-800 tracking-wide">
                                    {code}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                    {courses.length} crs
                                </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 truncate mt-1 group-hover:text-slate-900 transition-colors" title={dept.name}>
                                {dept.name}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Inline Quick-Add Form */}
            <form onSubmit={handleAddCollege} className="flex gap-2 pt-0.5">
                <input
                    type="text"
                    value={newCollegeName}
                    onChange={e => setNewCollegeName(e.target.value)}
                    placeholder="New college name..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                />
                <button
                    type="submit"
                    disabled={isAdding || !newCollegeName.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                    {isAdding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>+ Add College</span>
                </button>
            </form>
        </div>
    );
}
