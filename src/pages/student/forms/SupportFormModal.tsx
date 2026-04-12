import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';

type SupportFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onSubmitted?: () => void | Promise<void>;
};

const SUPPORT_CATEGORIES = [
    'Persons with Disabilities (PWDs)',
    'Indigenous Peoples (IPs) & Cultural Communities',
    'Working Students',
    'Economically Challenged Students',
    'Students with Special Learning Needs',
    'Rebel Returnees',
    'Orphans',
    'Senior Citizens',
    'Homeless Students',
    'Solo Parenting',
    'Pregnant Women',
    'Women in Especially Difficult Circumstances'
];

const createInitialSupportForm = () => ({
    categories: [] as string[],
    otherCategory: '',
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    files: [] as File[]
});

export default function SupportFormModal({
    isOpen,
    onClose,
    personalInfo,
    showToast,
    onSubmitted
}: SupportFormModalProps) {
    const [form, setForm] = useState(createInitialSupportForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(createInitialSupportForm());
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (form.categories.length === 0 && !form.otherCategory) {
            showToast('Please select at least one category.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const docUrls: string[] = [];
            if (form.files.length > 0) {
                for (const file of form.files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${personalInfo.studentId}_support_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('support_documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    docUrls.push(fileName);
                }
            }

            const description = `[Q1 Description]: ${form.q1}\n[Q2 Previous Support]: ${form.q2}\n[Q3 Required Support]: ${form.q3}\n[Q4 Other Needs]: ${form.q4}`.trim();
            const finalCategories = [...form.categories];
            if (form.otherCategory) {
                finalCategories.push(`Other: ${form.otherCategory}`);
            }

            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                department: personalInfo.department,
                support_type: finalCategories.join(', '),
                description,
                documents_url: docUrls.length > 0 ? JSON.stringify(docUrls) : null,
                status: 'Submitted'
            } as any;

            const { error } = await supabase.from('support_requests').insert([payload]);
            if (error) throw error;

            await onSubmitted?.();
            showToast('Support Request Submitted!');
            onClose();
            setForm(createInitialSupportForm());
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
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel">
                <div className="flex justify-between items-center p-4 border-b shrink-0 sm:p-6">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                        <p className="text-xs text-gray-500">Guihulngan Campus</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 text-xl hover:text-gray-600">x</button>
                </div>

                <div className="p-4 overflow-y-auto space-y-6 sm:p-6 sm:space-y-8">
                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Student Information</h4>
                        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div><p className="block text-xs font-bold text-gray-500">Full Name</p><div className="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Date Filed</p><div className="font-semibold">{new Date().toLocaleDateString()}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Date of Birth</p><div className="font-semibold">{personalInfo.dob}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Program - Year Level</p><div className="font-semibold">{personalInfo.course} - {personalInfo.year}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Cell Phone Number</p><div className="font-semibold">{personalInfo.mobile}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Email Address</p><div className="font-semibold">{personalInfo.email}</div></div>
                            <div className="col-span-2"><p className="block text-xs font-bold text-gray-500">Home Address</p><div className="font-semibold">{personalInfo.address}</div></div>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Category (Check all that apply)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SUPPORT_CATEGORIES.map((category, index) => (
                                <label key={category} htmlFor={`support-cat-${index}`} className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                        id={`support-cat-${index}`}
                                        name={`support-cat-${index}`}
                                        type="checkbox"
                                        checked={form.categories.includes(category)}
                                        onChange={(event) => {
                                            const categories = event.target.checked
                                                ? [...form.categories, category]
                                                : form.categories.filter((entry) => entry !== category);
                                            setForm((prev) => ({ ...prev, categories }));
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded shrink-0 mt-0.5"
                                    />
                                    {category}
                                </label>
                            ))}
                            <div className="col-span-1 mt-2 flex flex-col items-start gap-3 md:col-span-2 sm:flex-row sm:items-center">
                                <input id="support-cat-other-check" name="support-cat-other-check" type="checkbox" checked={!!form.otherCategory} readOnly className="w-4 h-4 text-blue-600 rounded shrink-0" />
                                <label htmlFor="support-other-specify" className="text-sm whitespace-nowrap">Others, specify:</label>
                                <input id="support-other-specify" name="support-other-specify" value={form.otherCategory} onChange={(event) => setForm((prev) => ({ ...prev, otherCategory: event.target.value }))} className="border-b border-gray-300 focus:border-blue-600 outline-none px-2 py-1 text-sm flex-1 min-w-0 bg-transparent" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">A. Your Studies</h4>
                        <p className="text-xs text-gray-500 mb-3">Which program(s) did you apply for? (Auto-filled)</p>
                        <div className="space-y-3">
                            <div><label htmlFor="support-priority1" className="block text-xs font-bold text-gray-500">1st Priority</label><input id="support-priority1" name="support-priority1" disabled value={personalInfo.priorityCourse} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                            <div><label htmlFor="support-priority2" className="block text-xs font-bold text-gray-500">2nd Priority</label><input id="support-priority2" name="support-priority2" disabled value={personalInfo.altCourse1} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                            <div><label htmlFor="support-priority3" className="block text-xs font-bold text-gray-500">3rd Priority</label><input id="support-priority3" name="support-priority3" disabled value={personalInfo.altCourse2} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-sm text-blue-800 mb-2 uppercase tracking-wider">B. Particulars of your disability or special learning need</h4>
                        <p className="text-xs text-gray-500 mb-4 italic">We would like to gain a better understanding of the kind of support that you may need. However, we might not be able to assist in all the ways that you require, but it might help us with our planning in future.</p>
                        <div className="space-y-4">
                            <div><label htmlFor="support-q1" className="block text-xs font-bold text-gray-700 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</label><textarea id="support-q1" name="support-q1" rows={2} value={form.q1} onChange={(event) => setForm((prev) => ({ ...prev, q1: event.target.value }))} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                            <div><label htmlFor="support-q2" className="block text-xs font-bold text-gray-700 mb-1">2. What kind of support did you receive at your previous school?</label><textarea id="support-q2" name="support-q2" rows={2} value={form.q2} onChange={(event) => setForm((prev) => ({ ...prev, q2: event.target.value }))} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                            <div><label htmlFor="support-q3" className="block text-xs font-bold text-gray-700 mb-1">3. What support or assistance do you require from NORSU-Guihulngan Campus to enable you to fully participate in campus activities...?</label><textarea id="support-q3" name="support-q3" rows={3} value={form.q3} onChange={(event) => setForm((prev) => ({ ...prev, q3: event.target.value }))} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                            <div><label htmlFor="support-q4" className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea id="support-q4" name="support-q4" rows={2} value={form.q4} onChange={(event) => setForm((prev) => ({ ...prev, q4: event.target.value }))} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                        </div>
                    </section>

                    <div className="mb-6">
                        <label htmlFor="support-documents" className="block text-xs font-bold text-gray-700 mb-2">Upload Supporting Documents (Medical/Psychological Proof) - Max 4 files</label>
                        <input
                            id="support-documents"
                            name="support-documents"
                            type="file"
                            multiple
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                const newFiles = Array.from(event.target.files || []);
                                const files = [...form.files, ...newFiles].slice(0, 4);
                                setForm((prev) => ({ ...prev, files }));
                                event.target.value = '';
                            }}
                            disabled={form.files.length >= 4}
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{form.files.length}/4 files selected</p>
                        {form.files.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {form.files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                                        </div>
                                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, files: prev.files.filter((_, fileIndex) => fileIndex !== index) }))} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 p-4 border-t border-purple-100/50 shrink-0 sm:flex-row sm:p-6">
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Application'}</button>
                    <button onClick={onClose} className="w-full px-8 py-3 bg-white/80 border border-purple-100/50 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all sm:w-auto">Cancel</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
