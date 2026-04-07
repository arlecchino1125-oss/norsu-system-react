import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';

type CounselingFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onSubmitted?: () => void | Promise<void>;
};

const createInitialCounselingForm = () => ({
    reason_for_referral: '',
    personal_actions_taken: '',
    date_duration_of_concern: ''
});

export default function CounselingFormModal({
    isOpen,
    onClose,
    personalInfo,
    showToast,
    onSubmitted
}: CounselingFormModalProps) {
    const [form, setForm] = useState(createInitialCounselingForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(createInitialCounselingForm());
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!form.reason_for_referral.trim()) {
            showToast('Please provide your reason for requesting counseling.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                course_year: `${personalInfo.course || ''} - ${personalInfo.year || ''}`,
                contact_number: personalInfo.mobile || '',
                request_type: 'Self-Referral',
                description: form.reason_for_referral,
                reason_for_referral: form.reason_for_referral,
                personal_actions_taken: form.personal_actions_taken,
                date_duration_of_concern: form.date_duration_of_concern,
                department: personalInfo.department,
                status: 'Submitted'
            } as any;

            const { error } = await supabase.from('counseling_requests').insert([payload]);
            if (error) throw error;

            await onSubmitted?.();
            showToast('Counseling Request Submitted!');
            onClose();
            setForm(createInitialCounselingForm());
        } catch (error: any) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel sm:p-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL FOR COUNSELING FORM</h3>
                        <p className="text-xs text-gray-400 mt-1">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div><label htmlFor="counsel-student-name" className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input id="counsel-student-name" name="counsel-student-name" readOnly value={`${personalInfo.firstName} ${personalInfo.lastName}`} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                    <div><label htmlFor="counsel-course-year" className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input id="counsel-course-year" name="counsel-course-year" readOnly value={`${personalInfo.course || ''} - ${personalInfo.year || ''}`} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                    <div className="md:col-span-2 md:w-1/2"><label htmlFor="counsel-contact" className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input id="counsel-contact" name="counsel-contact" readOnly value={personalInfo.mobile || 'Not set'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                </div>
                <div className="mb-4">
                    <label htmlFor="counsel-reason" className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling <span className="text-red-400">*</span></label>
                    <p className="text-[10px] text-gray-400 mb-2">Briefly describe your reason/s for seeking counseling.</p>
                    <textarea id="counsel-reason" name="counsel-reason" rows={4} value={form.reason_for_referral} onChange={(event) => setForm((prev) => ({ ...prev, reason_for_referral: event.target.value }))} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="Describe your reason/s for seeking counseling..."></textarea>
                </div>
                <div className="mb-4">
                    <label htmlFor="counsel-actions" className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                    <p className="text-[10px] text-gray-400 mb-2">What have you done to address your concern?</p>
                    <textarea id="counsel-actions" name="counsel-actions" rows={3} value={form.personal_actions_taken} onChange={(event) => setForm((prev) => ({ ...prev, personal_actions_taken: event.target.value }))} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="Describe any steps you've taken..."></textarea>
                </div>
                <div className="mb-6">
                    <label htmlFor="counsel-duration" className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                    <textarea id="counsel-duration" name="counsel-duration" rows={2} value={form.date_duration_of_concern} onChange={(event) => setForm((prev) => ({ ...prev, date_duration_of_concern: event.target.value }))} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="e.g. Since January 2026, approximately 3 weeks..."></textarea>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
                    <button onClick={onClose} className="w-full bg-white/80 border border-purple-100/50 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all sm:w-auto">Cancel</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
