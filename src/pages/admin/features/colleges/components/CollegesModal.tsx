import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { getArchiveSchemaErrorMessage, getCollegeCode } from '../../../utils';

interface CollegesModalProps {
    isOpen: boolean;
    onClose: () => void;
    departmentsData: any[];
    coursesData: any[];
    showToast: (msg: string, type?: string) => void;
    refetchDepartments: () => void;
}

export function CollegesModal({
    isOpen,
    onClose,
    departmentsData,
    coursesData,
    showToast,
    refetchDepartments
}: CollegesModalProps) {
    const [newCollegeName, setNewCollegeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleAdd = async (e: React.FormEvent) => {
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

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedId = Number(departmentId);
        return coursesData.filter((c: any) => Number(c.department_id) === normalizedId);
    };

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Outfit',sans-serif]">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="colleges-modal-title"
                className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="colleges-modal-title" className="font-extrabold text-base text-slate-900 leading-tight">
                                Institutional Colleges &amp; Assigned Programs
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                College and course master data is permanent; establish a new college below when needed.
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

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                    {/* Add College Form */}
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            value={newCollegeName}
                            onChange={e => setNewCollegeName(e.target.value)}
                            placeholder="New college name (e.g. COE - College of Engineering)..."
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                        />
                        <button
                            type="submit"
                            disabled={isAdding || !newCollegeName.trim()}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                        >
                            {isAdding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                            <span>+ Add College</span>
                        </button>
                    </form>

                    {/* 2-Column Grid of Colleges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {departmentsData.map(dept => {
                            const courses = getDepartmentCourses(dept.id);
                            const code = getCollegeCode(dept.name);

                            return (
                                <div
                                    key={dept.id}
                                    className="rounded-2xl border border-slate-200/80 p-4 bg-white space-y-2 hover:border-slate-300 transition shadow-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-[11px] tracking-wide">
                                            {code}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {courses.length} courses
                                        </span>
                                    </div>

                                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                        {dept.name}
                                    </h4>

                                    {courses.length > 0 ? (
                                        <ul className="space-y-1 pt-1 border-t border-slate-100 text-xs text-slate-600">
                                            {courses.map((course: any) => (
                                                <li key={course.id} className="truncate flex items-start gap-1.5">
                                                    <span className="text-slate-400 leading-tight">&bull;</span>
                                                    <span className="truncate">{course.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                                            No courses assigned to this college yet.
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

