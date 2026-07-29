import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ClipboardList, Trash2, XCircle, Download, UploadCloud, Archive, Eye, Pencil } from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { supabase } from '../../../../../lib/supabase';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { managedDeleteService } from '../../../../../services/managedDeleteService';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardContent } from '../../../../../components/ui/Card';
import type { CareStaffDashboardFunctions } from '../../../types';

interface CareStaffFormsPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    refreshSignal?: number;
}

const FORM_COLUMNS = 'id, title, description, is_active, created_at';
const QUESTION_COLUMNS = 'id, form_id, question_text, question_type, scale_min, scale_max, order_index, created_at';

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

const FormCard = ({ form, canArchiveRecords, onEdit, onPreview, onDeactivate }: any) => (
    <Card className="h-full transition-shadow duration-200 hover:shadow-md">
        <CardContent className="flex h-full flex-col !p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><ClipboardList size={20} /></div>
                <span className="text-xs font-medium text-gray-500">Updated {form.lastUpdated}</span>
            </div>
            <h3 className="mb-4 flex-1 text-base font-bold text-gray-900">{form.title}</h3>
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <Button variant="primary" size="sm" className="flex-1 whitespace-nowrap" leftIcon={<Pencil size={14} />} onClick={onEdit}>Edit</Button>
                <Button variant="secondary" size="sm" className="flex-1 whitespace-nowrap" leftIcon={<Eye size={14} />} onClick={onPreview}>Preview</Button>
                {canArchiveRecords && (
                    <Button variant="ghost" size="sm" className="flex-1 whitespace-nowrap text-amber-700 hover:bg-amber-50 hover:text-amber-800" leftIcon={<Archive size={14} />} onClick={onDeactivate} aria-label="Deactivate Form">Deactivate</Button>
                )}
            </div>
        </CardContent>
    </Card>
);

const isTextQuestion = (question: any) => question?.question_type === 'text' || question?.question_type === 'open_ended';

const FormEditorModal = ({
    form, setForm, questions, canDeleteRecords,
    onQuestionChange, onQuestionTypeChange, onAddQuestion, onRemoveQuestion, onBulkUpload, onClose, onSave
}: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <Card className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
                <h3 className="font-bold text-lg text-gray-900">{form.id ? 'Edit Form' : 'Create Form'}</h3>
                <Button variant="ghost" size="sm" aria-label="Close form editor" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="mb-6"><label htmlFor="care-form-title" className="block text-xs font-bold text-gray-700 mb-1">Form Title</label><input id="care-form-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Student Satisfaction Survey" /></div>
                <div className="mb-6"><label htmlFor="care-form-description" className="block text-xs font-bold text-gray-700 mb-1">Description</label><textarea id="care-form-description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Purpose of this form..."></textarea></div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="block text-xs font-bold text-gray-700">Questions</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="sm" leftIcon={<Download size={14} />} onClick={handleDownloadTemplate}>Download Template</Button>
                        <label className="flex min-h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-bold text-purple-600 hover:bg-purple-50"><UploadCloud size={14} className="mr-1.5" /> Upload Questions<input type="file" accept=".txt,.csv" className="hidden" onChange={onBulkUpload} /></label>
                        <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />} onClick={() => onAddQuestion('text')}>Add Text Field</Button>
                        <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />} onClick={() => onAddQuestion('scale')}>Add Question</Button>
                    </div>
                </div>
                <div className="space-y-2">
                    {questions.map((q: any, idx: number) => {
                        const canRemoveQuestion = canDeleteRecords || !q.id;
                        return (
                            <div key={q.id ?? q.clientId} className="flex gap-2 items-center">
                                <div className="bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 text-gray-500 text-xs flex items-center h-full">{idx + 1}</div>
                                <input aria-label={`Question ${idx + 1}`} value={q.question_text} onChange={e => onQuestionChange(idx, e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-none text-sm focus:outline-none focus:border-blue-600" placeholder="Enter question text..." />
                                <select
                                    aria-label={`Answer type for question ${idx + 1}`}
                                    value={isTextQuestion(q) ? 'text' : 'scale'}
                                    onChange={e => onQuestionTypeChange(idx, e.target.value)}
                                    className={`shrink-0 border border-l-0 border-gray-300 bg-white px-2 py-2 text-xs font-bold text-gray-600 focus:outline-none focus:border-blue-600 ${canRemoveQuestion ? 'rounded-none' : 'rounded-r-lg'}`}
                                >
                                    <option value="scale">Scale 1-5</option>
                                    <option value="text">Text answer</option>
                                </select>
                                {canRemoveQuestion && (
                                    <Button variant="danger" size="sm" className="border-l-0 rounded-l-none rounded-r-lg" aria-label={`Remove question ${idx + 1}`} onClick={() => onRemoveQuestion(idx)}><Trash2 size={14} /></Button>
                                )}
                            </div>
                        );
                    })}
                    {questions.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No questions added yet.</p>}
                </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={onSave}>Save Changes</Button>
            </div>
        </Card>
    </div>
);

const FormPreviewModal = ({ form, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <Card className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
                <h3 className="font-bold text-lg text-gray-900">Preview: {form.title}</h3>
                <Button variant="ghost" size="sm" aria-label="Close form preview" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 px-6 py-5">
                <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h2>
                    <p className="text-gray-500 mb-8">{form.description}</p>
                    <div className="space-y-6">
                        {form.questions && form.questions.map((q: any, idx: number) => (
                            <div key={q.id} className="border-b border-gray-100 pb-4 last:border-0">
                                <p className="block text-sm font-bold text-gray-700 mb-3">{idx + 1}. {q.question_text}</p>
                                {isTextQuestion(q) ? (
                                    <textarea disabled rows={3} className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400" placeholder="Student types their answer here..." />
                                ) : (
                                    <div className="flex justify-between px-2">
                                        {[1, 2, 3, 4, 5].map(val => (
                                            <div key={val} className="flex flex-col items-center gap-1">
                                                <div className="w-4 h-4 rounded-full border border-gray-300 bg-gray-50"></div>
                                                <span className="text-[10px] text-gray-400">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <Button variant="primary" className="w-full opacity-50 cursor-not-allowed" disabled>Submit Form</Button>
                    </div>
                </div>
            </div>
            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                <Button variant="secondary" onClick={onClose}>Close Preview</Button>
            </div>
        </Card>
    </div>
);

const DeactivateFormModal = ({ form, isDeleting, onCancel, onConfirm }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <Card className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Archive size={20} /></div>
                <div className="min-w-0">
                    <h3 className="font-bold text-lg text-gray-900">Deactivate Form</h3>
                    <p className="text-sm text-gray-500">Students will no longer see this form in the portal.</p>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="mx-auto max-w-2xl rounded-xl border border-amber-100 bg-amber-50 p-5">
                    <p className="mb-1 text-sm font-medium text-amber-700">You are about to deactivate:</p>
                    <p className="text-sm font-bold text-amber-800">&ldquo;{form.title}&rdquo;</p>
                    <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-700">
                        <li>The form stops appearing in student views</li>
                        <li>Existing questions remain stored</li>
                        <li>Existing submissions and answers stay available</li>
                    </ul>
                </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>Cancel</Button>
                <Button variant="danger" onClick={onConfirm} isLoading={isDeleting} leftIcon={<Archive size={14} />}>
                    Deactivate Form
                </Button>
            </div>
        </Card>
    </div>
);

const InactiveFormsModal = ({ forms, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <Card className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Inactive Forms</h3>
                    <p className="text-sm text-gray-500 mt-1">These forms are hidden from students but kept with their questions, submissions, and answers.</p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Close inactive forms" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {forms.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No inactive forms yet.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {forms.map((form: any) => (
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
        </Card>
    </div>
);

const CareStaffFormsPage = ({ functions, refreshSignal = 0 }: CareStaffFormsPageProps) => {
    const { canPerformAction } = usePermissions();
    const lastExternalRefreshSignalRef = useRef(refreshSignal);
    const canArchiveRecords = canPerformAction('archive_records');
    const canDeleteRecords = canPerformAction('delete_records');

    // ponytail: cache active forms to prevent redundant requests on tab switch
    const { data: forms = [], isLoading: loadingActive, refetch: refetchActive } = useQuery({
        queryKey: ['care-staff-active-forms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('needs_assessment_forms')
                .select(FORM_COLUMNS)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(f => ({
                ...f,
                lastUpdated: new Date(f.created_at || Date.now()).toLocaleDateString()
            }));
        },
        staleTime: 60000
    });

    // ponytail: cache inactive forms to prevent redundant requests on tab switch
    const { data: inactiveForms = [], isLoading: loadingInactive, refetch: refetchInactive } = useQuery({
        queryKey: ['care-staff-inactive-forms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('needs_assessment_forms')
                .select(FORM_COLUMNS)
                .eq('is_active', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(f => ({
                ...f,
                lastUpdated: new Date(f.created_at || Date.now()).toLocaleDateString()
            }));
        },
        staleTime: 60000
    });

    const loading = loadingActive || loadingInactive;

    const fetchForms = useCallback(async () => {
        await Promise.all([refetchActive(), refetchInactive()]);
    }, [refetchActive, refetchInactive]);

    const [editingForm, setEditingForm] = useState(null);
    const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [previewForm, setPreviewForm] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showInactiveModal, setShowInactiveModal] = useState(false);

    useEffect(() => {
        if (refreshSignal === lastExternalRefreshSignalRef.current) return;
        lastExternalRefreshSignalRef.current = refreshSignal;
        void fetchForms();
    }, [fetchForms, refreshSignal]);

    const handlePreview = async (form) => {
        const { data: questions } = await supabase
            .from('needs_assessment_questions')
            .select(QUESTION_COLUMNS)
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setPreviewForm({ ...form, questions: questions || [] });
        setShowPreview(true);
    };

    const handleEdit = async (form) => {
        setEditingForm({ ...form });
        const { data: questions } = await supabase
            .from('needs_assessment_questions')
            .select(QUESTION_COLUMNS)
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
                .from('needs_assessment_forms')
                .upsert([formPayload])
                .select(FORM_COLUMNS)
                .single();

            if (formError) throw formError;

            if (editingQuestions.length > 0) {
                const questionsPayload = editingQuestions.map((q, idx) => {
                    const qData: any = {
                        form_id: savedForm.id,
                        question_text: q.question_text,
                        order_index: idx,
                        question_type: isTextQuestion(q) ? 'text' : 'scale'
                    };
                    if (q.id) qData.id = q.id;
                    return qData;
                });

                const { error: qError } = await supabase
                    .from('needs_assessment_questions')
                    .upsert(questionsPayload);

                if (qError) throw qError;
            }

            functions.showToast("Form saved.");
            setShowEditor(false);
            fetchForms();
        } catch { functions.showToast('Something went wrong.', 'error'); }
    };

    const handleQuestionChange = (idx, val) => {
        const newQs = [...editingQuestions];
        newQs[idx] = { ...newQs[idx], question_text: val };
        setEditingQuestions(newQs);
    };

    const handleQuestionTypeChange = (idx, question_type) => {
        const newQs = [...editingQuestions];
        newQs[idx] = { ...newQs[idx], question_type };
        setEditingQuestions(newQs);
    };

    const addQuestion = (question_type = 'scale') => {
        setEditingQuestions([...editingQuestions, {
            clientId: crypto.randomUUID(),
            question_text: question_type === 'text' ? 'Others, please specify:' : '',
            question_type
        }]);
    };

    const removeQuestion = async (idx) => {
        const q = editingQuestions[idx];
        try {
            if (q.id) {
                await managedDeleteService.deleteFormQuestion(Number(q.id));
            }
            const newQs = editingQuestions.filter((_, i) => i !== idx);
            setEditingQuestions(newQs);
        } catch {
            functions.showToast('Error deleting question: ', 'error');
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

            const newQuestions = lines.map(line => ({ clientId: crypto.randomUUID(), question_text: line.trim() }));
            setEditingQuestions(prev => [...prev, ...newQuestions]);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleDeleteForm = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            await managedArchiveService.deactivateForm(Number(deleteConfirm.id));
            functions.showToast('Form deactivated. Existing submissions were kept.');
            setDeleteConfirm(null);
            await fetchForms();
        } catch {
            functions.showToast('Error deactivating form: ', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Needs Assessments</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage needs assessment forms.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" leftIcon={<Archive size={16} />} onClick={() => setShowInactiveModal(true)}>
                        Inactive Forms ({inactiveForms.length})
                    </Button>
                    <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleCreate}>
                        Create New Form
                    </Button>
                </div>
            </div>

            <>
                    {loading ? <div className="text-center py-12 text-gray-500">Loading forms...</div> : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {forms.map(form => (
                                <FormCard
                                    key={form.id}
                                    form={form}
                                    canArchiveRecords={canArchiveRecords}
                                    onEdit={() => handleEdit(form)}
                                    onPreview={() => handlePreview(form)}
                                    onDeactivate={() => setDeleteConfirm(form)}
                                />
                            ))}
                        </div>
                    )}

                    {showEditor && editingForm && (
                        <FormEditorModal
                            form={editingForm}
                            setForm={setEditingForm}
                            questions={editingQuestions}
                            canDeleteRecords={canDeleteRecords}
                            onQuestionChange={handleQuestionChange}
                            onQuestionTypeChange={handleQuestionTypeChange}
                            onAddQuestion={addQuestion}
                            onRemoveQuestion={removeQuestion}
                            onBulkUpload={handleBulkQuestionsUpload}
                            onClose={() => setShowEditor(false)}
                            onSave={handleSaveForm}
                        />
                    )}

                    {showPreview && previewForm && (
                        <FormPreviewModal form={previewForm} onClose={() => setShowPreview(false)} />
                    )}

                    {deleteConfirm && canArchiveRecords && (
                        <DeactivateFormModal
                            form={deleteConfirm}
                            isDeleting={isDeleting}
                            onCancel={() => setDeleteConfirm(null)}
                            onConfirm={handleDeleteForm}
                        />
                    )}

                    {showInactiveModal && (
                        <InactiveFormsModal forms={inactiveForms} onClose={() => setShowInactiveModal(false)} />
                    )}
                </>
        </div>
    );
};

export default CareStaffFormsPage;
