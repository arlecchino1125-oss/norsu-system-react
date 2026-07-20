import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';
import { validateTextInput } from '../../../../../utils/inputSecurity';

interface StudentVolunteerFormProps {
    isOpen: boolean;
    onClose: () => void;
    personalInfo: any;
    showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    onSubmitted: () => void;
}

export default function StudentVolunteerForm({ isOpen, onClose, personalInfo, showToast, onSubmitted }: StudentVolunteerFormProps) {
    const [organizations, setOrganizations] = useState('');
    const [motivation, setMotivation] = useState('');
    const [skills, setSkills] = useState('');
    const [commitment, setCommitment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!motivation.trim() || !commitment.trim()) {
            showToast?.('Motivation and Commitment are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const cleanOrgs = validateTextInput(organizations, 'mediumText', { label: 'Organizations' });
            const cleanMotivation = validateTextInput(motivation, 'notes', { label: 'Motivation' });
            const cleanSkills = validateTextInput(skills, 'notes', { label: 'Skills' });
            const cleanCommitment = validateTextInput(commitment, 'mediumText', { label: 'Commitment' });

            const invalidText = [cleanOrgs, cleanMotivation, cleanSkills, cleanCommitment].find((check) => check.error);
            if (invalidText) {
                showToast?.(invalidText.error, 'error');
                setIsSubmitting(false);
                return;
            }

            const { error } = await supabase
                .from('peer_facilitator_applications')
                .insert([{
                    student_id: personalInfo.studentId,
                    organizations: cleanOrgs.value,
                    motivation: cleanMotivation.value,
                    skills: cleanSkills.value,
                    commitment: cleanCommitment.value,
                    status: 'pending'
                }]);

            if (error) throw error;

            showToast?.('Application submitted successfully!', 'success');
            onSubmitted();
        } catch (error: any) {
            console.error('Error submitting application:', error);
            showToast?.('Failed to submit application. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4" onClick={onClose}>
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="shrink-0 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Apply Now</p>
                            <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">Volunteer Application</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Your profile details (Name, Course, etc) will be automatically attached.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Your Details (auto-attached)</p>
                        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                            {([
                                ['Email', personalInfo?.email],
                                ['Name', [personalInfo?.firstName, personalInfo?.middleName ? `${String(personalInfo.middleName).charAt(0)}.` : '', personalInfo?.lastName, personalInfo?.suffix].filter(Boolean).join(' ')],
                                ['Student ID No.', personalInfo?.studentId],
                                ['Age', personalInfo?.age],
                                ['Sex', personalInfo?.sex],
                                ['College/Department', personalInfo?.department],
                                ['Academic Program & Year', [personalInfo?.course, personalInfo?.year].filter(Boolean).join(' - ')]
                            ] as [string, any][]).map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-[10px] font-bold uppercase text-slate-400">{label}</dt>
                                    <dd className="text-sm font-semibold text-slate-800">{value || 'Not set'}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-2 text-[10px] font-medium text-slate-400">Something wrong? Update it in My Profile before submitting.</p>
                    </div>

                    <form id="volunteer-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="volunteer-organizations" className="mb-1.5 block text-xs font-bold text-slate-700">Organizations Affiliated With (Optional)</label>
                            <input
                                id="volunteer-organizations"
                                type="text"
                                value={organizations}
                                onChange={(e) => setOrganizations(e.target.value)}
                                placeholder="E.g., Student Council, Math Club"
                                disabled={isSubmitting}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label htmlFor="volunteer-motivation" className="mb-1.5 block text-xs font-bold text-slate-700">Motivation <span className="text-rose-500">*</span></label>
                            <p className="mb-2 text-[10px] text-slate-500">Share about yourself, your experiences, and why you want to become a CARE Peer Facilitator.</p>
                            <textarea
                                id="volunteer-motivation"
                                value={motivation}
                                onChange={(e) => setMotivation(e.target.value)}
                                rows={4}
                                required
                                disabled={isSubmitting}
                                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label htmlFor="volunteer-skills" className="mb-1.5 block text-xs font-bold text-slate-700">Relevant Skills (Optional)</label>
                            <p className="mb-2 text-[10px] text-slate-500">List any skills like active listening, empathy, communication, etc.</p>
                            <textarea
                                id="volunteer-skills"
                                value={skills}
                                onChange={(e) => setSkills(e.target.value)}
                                rows={2}
                                disabled={isSubmitting}
                                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label htmlFor="volunteer-commitment" className="mb-1.5 block text-xs font-bold text-slate-700">Commitment <span className="text-rose-500">*</span></label>
                            <p className="mb-2 text-[10px] text-slate-500">Indicate the duration and frequency of your commitment.</p>
                            <input
                                id="volunteer-commitment"
                                type="text"
                                value={commitment}
                                onChange={(e) => setCommitment(e.target.value)}
                                required
                                placeholder="E.g., 2 hours per week for 1 semester"
                                disabled={isSubmitting}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </form>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="volunteer-form"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
