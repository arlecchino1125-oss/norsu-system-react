import { useState, useEffect } from 'react';
import { Plus, ClipboardList, CheckCircle, Trash2, XCircle, Download, UploadCloud, Archive } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { managedArchiveService } from '../../services/managedArchiveService';
import { managedDeleteService } from '../../services/managedDeleteService';
import type { CareStaffDashboardFunctions } from './types';

interface FormManagementPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const FormManagementPage = ({ functions }: FormManagementPageProps) => {
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');
    const canDeleteRecords = canPerformAction('delete_records');
    const [forms, setForms] = useState<any[]>([]);
    const [inactiveForms, setInactiveForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchForms = async () => {
        setLoading(true);
        const [{ data: activeData }, { data: inactiveData }] = await Promise.all([
            supabase
                .from('forms')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false }),
            supabase
                .from('forms')
                .select('*')
                .eq('is_active', false)
                .order('created_at', { ascending: false })
        ]);

        if (activeData) {
            setForms(activeData.map(f => ({
                ...f,
                lastUpdated: new Date(f.created_at || Date.now()).toLocaleDateString()
            })));
        }
        if (inactiveData) {
            setInactiveForms(inactiveData.map(f => ({
                ...f,
                lastUpdated: new Date(f.created_at || Date.now()).toLocaleDateString()
            })));
        }
        setLoading(false);
    };

    useEffect(() => { fetchForms(); }, []);

    const [editingForm, setEditingForm] = useState(null);
    const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [previewForm, setPreviewForm] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showInactiveModal, setShowInactiveModal] = useState(false);

    const handlePreview = async (form) => {
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setPreviewForm({ ...form, questions: questions || [] });
        setShowPreview(true);
    };

    const handleEdit = async (form) => {
        setEditingForm({ ...form });
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setEditingQuestions(questions || []);
        setShowEditor(true);
    };

    const handleCreate = () => {
        setEditingForm({ title: '', description: '' });
        setEditingQuestions([]);
        setShowEditor(true);
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        try {
            const formPayload: any = {
                title: editingForm.title,
                description: editingForm.description,
                is_active: editingForm.is_active ?? true
            };
            if (editingForm.id) formPayload.id = editingForm.id;

            const { data: savedForm, error: formError } = await supabase
                .from('forms')
                .upsert([formPayload])
                .select()
                .single();

            if (formError) throw formError;

            if (editingQuestions.length > 0) {
                const questionsPayload = editingQuestions.map((q, idx) => {
                    const qData: any = {
                        form_id: savedForm.id,
                        question_text: q.question_text,
                        order_index: idx,
                        question_type: 'scale'
                    };
                    if (q.id) qData.id = q.id;
                    return qData;
                });

                const { error: qError } = await supabase
                    .from('questions')
                    .upsert(questionsPayload);

                if (qError) throw qError;
            }

            functions.showToast("Form saved successfully!");
            setShowEditor(false);
            fetchForms();
        } catch (err) { functions.showToast("Error: " + err.message, 'error'); }
    };

    const handleQuestionChange = (idx, val) => {
        const newQs = [...editingQuestions];
        newQs[idx] = { ...newQs[idx], question_text: val };
        setEditingQuestions(newQs);
    };

    const addQuestion = () => {
        setEditingQuestions([...editingQuestions, { question_text: '' }]);
    };

    const removeQuestion = async (idx) => {
        const q = editingQuestions[idx];
        try {
            if (q.id) {
                await managedDeleteService.deleteFormQuestion(Number(q.id));
            }
            const newQs = editingQuestions.filter((_, i) => i !== idx);
            setEditingQuestions(newQs);
        } catch (err: any) {
            functions.showToast('Error deleting question: ' + err.message, 'error');
        }
    };

    const handleBulkQuestionsUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event: any) => {
            const text = event.target.result as string;
            const lines = text.split(/\r?\n/).filter((line: string) => line.trim() !== '');

            if (lines.length === 0) { functions.showToast("No questions found in file.", 'error'); return; }

            const newQuestions = lines.map(line => ({ question_text: line.trim() }));
            setEditingQuestions(prev => [...prev, ...newQuestions]);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const content = "I feel stressed often\nI have trouble sleeping\nI need financial assistance";
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "questions_template.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleDeleteForm = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            await managedArchiveService.deactivateForm(Number(deleteConfirm.id));
            functions.showToast('Form deactivated. Existing submissions were kept.');
            setDeleteConfirm(null);
            await fetchForms();
        } catch (err) {
            functions.showToast('Error deactivating form: ' + err.message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Form Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage normalized survey forms and questions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowInactiveModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 shadow-sm transition">
                        <Archive size={16} /> Inactive Forms ({inactiveForms.length})
                    </button>
                    <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md transition">
                        <Plus size={16} /> Create New Form
                    </button>
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading forms...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {forms.map(form => (
                        <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl"><ClipboardList size={24} /></div>
                                <span className="text-xs text-gray-400">Updated: {form.lastUpdated}</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-6">{form.title}</h3>
                            <div className="flex gap-3">
                                <button onClick={() => handleEdit(form)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">Edit Form</button>
                                <button onClick={() => handlePreview(form)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition" title="Preview"><CheckCircle size={16} /></button>
                                {canArchiveRecords && (
                                    <button onClick={() => setDeleteConfirm(form)} className="px-4 py-2.5 border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition" title="Deactivate Form"><Trash2 size={16} /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Editor Modal */}
            {showEditor && editingForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">{editingForm.id ? 'Edit Form' : 'Create Form'}</h3>
                            <button onClick={() => setShowEditor(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6"><label className="block text-xs font-bold text-gray-700 mb-1">Form Title</label><input value={editingForm.title} onChange={e => setEditingForm({ ...editingForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Student Satisfaction Survey" /></div>
                            <div className="mb-6"><label className="block text-xs font-bold text-gray-700 mb-1">Description</label><textarea value={editingForm.description} onChange={e => setEditingForm({ ...editingForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Purpose of this form..."></textarea></div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-gray-700">Questions (Likert Scale 1-5)</label>
                                <div className="flex gap-3">
                                    <button onClick={handleDownloadTemplate} className="text-xs text-gray-500 hover:text-gray-700 font-bold hover:underline flex items-center"><Download size={14} className="mr-1" /> Template</button>
                                    <label className="text-xs text-purple-600 font-bold hover:underline cursor-pointer flex items-center"><UploadCloud size={14} className="mr-1" /> Upload List<input type="file" accept=".txt,.csv" className="hidden" onChange={handleBulkQuestionsUpload} /></label>
                                    <button onClick={addQuestion} className="text-xs text-blue-600 font-bold hover:underline">+ Add Question</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {editingQuestions.map((q, idx) => {
                                    const canRemoveQuestion = canDeleteRecords || !q.id;
                                    return (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <div className="bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 text-gray-500 text-xs flex items-center h-full">{idx + 1}</div>
                                            <input value={q.question_text} onChange={e => handleQuestionChange(idx, e.target.value)} className={`flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600 ${canRemoveQuestion ? 'rounded-r-none' : 'rounded-r-lg'}`} placeholder="Enter question text..." />
                                            {canRemoveQuestion && (
                                                <button onClick={() => removeQuestion(idx)} className="px-3 py-2 bg-red-50 text-red-500 border border-l-0 border-red-100 rounded-r-lg hover:bg-red-100 h-full"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                    );
                                })}
                                {editingQuestions.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No questions added yet.</p>}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setShowEditor(false)} className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleSaveForm} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Save Changes</button></div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Preview: {previewForm.title}</h3>
                            <button onClick={() => setShowPreview(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{previewForm.title}</h2>
                                <p className="text-gray-500 mb-8">{previewForm.description}</p>
                                <div className="space-y-6">
                                    {previewForm.questions && previewForm.questions.map((q, idx) => (
                                        <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                                            <label className="block text-sm font-bold text-gray-700 mb-3">{idx + 1}. {q.question_text}</label>
                                            <div className="flex justify-between px-2">
                                                {[1, 2, 3, 4, 5].map(val => (
                                                    <div key={val} className="flex flex-col items-center gap-1">
                                                        <div className="w-4 h-4 rounded-full border border-gray-300 bg-gray-50"></div>
                                                        <span className="text-[10px] text-gray-400">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <button disabled className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold opacity-50 cursor-not-allowed">Submit Form</button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setShowPreview(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Close Preview</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && canArchiveRecords && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 size={24} /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Deactivate Form</h3>
                                <p className="text-sm text-gray-500">Students will no longer see this form in the portal.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                            <p className="text-sm text-amber-700 font-medium mb-1">You are about to deactivate:</p>
                            <p className="text-sm font-bold text-amber-800">&ldquo;{deleteConfirm.title}&rdquo;</p>
                            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                <li>The form stops appearing in student views</li>
                                <li>Existing questions remain stored</li>
                                <li>Existing submissions and answers stay available</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleDeleteForm} disabled={isDeleting} className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition shadow-sm flex items-center justify-center gap-2">
                                {isDeleting ? (<><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Deactivating...</>) : (<><Trash2 size={14} /> Deactivate Form</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showInactiveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Inactive Forms</h3>
                                <p className="text-sm text-gray-500 mt-1">These forms are hidden from students but kept with their questions, submissions, and answers.</p>
                            </div>
                            <button onClick={() => setShowInactiveModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {inactiveForms.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No inactive forms yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {inactiveForms.map((form) => (
                                        <div key={`inactive-form-${form.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-gray-900">{form.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Created {form.lastUpdated}</p>
                                                </div>
                                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">Inactive</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-3 line-clamp-3">{form.description || 'No description provided.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormManagementPage;
