import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ClipboardList, CheckCircle, Trash2, XCircle, Download, UploadCloud, Archive, HeartHandshake, Clock } from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { supabase } from '../../../../../lib/supabase';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { managedDeleteService } from '../../../../../services/managedDeleteService';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardContent } from '../../../../../components/ui/Card';
import type { CareStaffDashboardFunctions } from '../../../types';
import CareStaffVolunteerFormsTable from './CareStaffVolunteerFormsTable';
import CareStaffFacilitatorHours from './CareStaffFacilitatorHours';

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
    <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent>
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl"><ClipboardList size={24} /></div>
                <span className="text-xs text-gray-400">Updated: {form.lastUpdated}</span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-6">{form.title}</h3>
            <div className="flex gap-3">
                <Button variant="primary" size="md" className="flex-1" onClick={onEdit}>Edit Form</Button>
                <Button variant="secondary" size="md" onClick={onPreview} title="Preview"><CheckCircle size={16} /></Button>
                {canArchiveRecords && (
                    <Button variant="danger" size="md" onClick={onDeactivate} title="Deactivate Form"><Trash2 size={16} /></Button>
                )}
            </div>
        </CardContent>
    </Card>
);

const FormEditorModal = ({
    form, setForm, questions, canDeleteRecords,
    onQuestionChange, onAddQuestion, onRemoveQuestion, onBulkUpload, onClose, onSave
}: any) => (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
        <Card className="shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{form.id ? 'Edit Form' : 'Create Form'}</h3>
                <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6"><label htmlFor="care-form-title" className="block text-xs font-bold text-gray-700 mb-1">Form Title</label><input id="care-form-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Student Satisfaction Survey" /></div>
                <div className="mb-6"><label htmlFor="care-form-description" className="block text-xs font-bold text-gray-700 mb-1">Description</label><textarea id="care-form-description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Purpose of this form..."></textarea></div>
                <div className="flex justify-between items-center mb-3">
                    <p className="block text-xs font-bold text-gray-700">Questions (Likert Scale 1-5)</p>
                    <div className="flex gap-3">
                        <Button variant="ghost" size="sm" leftIcon={<Download size={14} />} onClick={handleDownloadTemplate}>Template</Button>
                        <label className="text-xs text-purple-600 font-bold hover:underline cursor-pointer flex items-center"><UploadCloud size={14} className="mr-1" /> Upload List<input type="file" accept=".txt,.csv" className="hidden" onChange={onBulkUpload} /></label>
                        <Button variant="ghost" size="sm" onClick={onAddQuestion}>+ Add Question</Button>
                    </div>
                </div>
                <div className="space-y-2">
                    {questions.map((q: any, idx: number) => {
                        const canRemoveQuestion = canDeleteRecords || !q.id;
                        return (
                            <div key={q.id ?? q.clientId} className="flex gap-2 items-center">
                                <div className="bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 text-gray-500 text-xs flex items-center h-full">{idx + 1}</div>
                                <input value={q.question_text} onChange={e => onQuestionChange(idx, e.target.value)} className={`flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600 ${canRemoveQuestion ? 'rounded-r-none' : 'rounded-r-lg'}`} placeholder="Enter question text..." />
                                {canRemoveQuestion && (
                                    <Button variant="danger" size="sm" className="border-l-0 rounded-l-none rounded-r-lg" onClick={() => onRemoveQuestion(idx)}><Trash2 size={14} /></Button>
                                )}
                            </div>
                        );
                    })}
                    {questions.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No questions added yet.</p>}
                </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={onSave}>Save Changes</Button>
            </div>
        </Card>
    </div>
);

const FormPreviewModal = ({ form, onClose }: any) => (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
        <Card className="shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Preview: {form.title}</h3>
                <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h2>
                    <p className="text-gray-500 mb-8">{form.description}</p>
                    <div className="space-y-6">
                        {form.questions && form.questions.map((q: any, idx: number) => (
                            <div key={q.id} className="border-b border-gray-100 pb-4 last:border-0">
                                <p className="block text-sm font-bold text-gray-700 mb-3">{idx + 1}. {q.question_text}</p>
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
                        <Button variant="primary" className="w-full opacity-50 cursor-not-allowed" disabled>Submit Form</Button>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
                <Button variant="secondary" onClick={onClose}>Close Preview</Button>
            </div>
        </Card>
    </div>
);

const DeactivateFormModal = ({ form, isDeleting, onCancel, onConfirm }: any) => (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
        <Card className="shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 size={24} /></div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Deactivate Form</h3>
                    <p className="text-sm text-gray-500">Students will no longer see this form in the portal.</p>
                </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-700 font-medium mb-1">You are about to deactivate:</p>
                <p className="text-sm font-bold text-amber-800">&ldquo;{form.title}&rdquo;</p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                    <li>The form stops appearing in student views</li>
                    <li>Existing questions remain stored</li>
                    <li>Existing submissions and answers stay available</li>
                </ul>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isDeleting}>Cancel</Button>
                <Button variant="danger" className="flex-1" onClick={onConfirm} isLoading={isDeleting} leftIcon={<Trash2 size={14} />}>
                    Deactivate Form
                </Button>
            </div>
        </Card>
    </div>
);

const InactiveFormsModal = ({ forms, onClose }: any) => (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
        <Card className="shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Inactive Forms</h3>
                    <p className="text-sm text-gray-500 mt-1">These forms are hidden from students but kept with their questions, submissions, and answers.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
                {forms.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No inactive forms yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                .from('forms')
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
                .from('forms')
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
    const [activeTab, setActiveTab] = useState<'assessments' | 'volunteers' | 'hours'>('assessments');

    useEffect(() => {
        if (refreshSignal === lastExternalRefreshSignalRef.current) return;
        lastExternalRefreshSignalRef.current = refreshSignal;
        if (activeTab === 'assessments') {
            void fetchForms();
        }
    }, [activeTab, fetchForms, refreshSignal]);

    const handlePreview = async (form) => {
        const { data: questions } = await supabase
            .from('questions')
            .select(QUESTION_COLUMNS)
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setPreviewForm({ ...form, questions: questions || [] });
        setShowPreview(true);
    };

    const handleEdit = async (form) => {
        setEditingForm({ ...form });
        const { data: questions } = await supabase
            .from('questions')
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
                .from('forms')
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

    const addQuestion = () => {
        setEditingQuestions([...editingQuestions, { clientId: crypto.randomUUID(), question_text: '' }]);
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
                    <h1 className="text-2xl font-bold text-gray-900">Form Management</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage assessment forms and peer facilitator applications.</p>
                </div>
                {activeTab === 'assessments' && (
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" leftIcon={<Archive size={16} />} onClick={() => setShowInactiveModal(true)}>
                            Inactive Forms ({inactiveForms.length})
                        </Button>
                        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleCreate}>
                            Create New Form
                        </Button>
                    </div>
                )}
            </div>

            <div className="mb-6 flex gap-2 border-b border-gray-200 overflow-x-auto">
                <button type="button"
                    onClick={() => setActiveTab('assessments')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assessments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList size={16} /> Needs Assessments
                    </div>
                </button>
                <button type="button"
                    onClick={() => setActiveTab('volunteers')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'volunteers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <HeartHandshake size={16} /> Peer Facilitators
                    </div>
                </button>
                <button type="button"
                    onClick={() => setActiveTab('hours')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'hours' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Clock size={16} /> Facilitator Hours
                    </div>
                </button>
            </div>

            {activeTab === 'assessments' ? (
                <>
                    {loading ? <div className="text-center py-12 text-gray-500">Loading forms...</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            ) : activeTab === 'volunteers' ? (
                <CareStaffVolunteerFormsTable functions={functions} refreshSignal={refreshSignal} />
            ) : (
                <CareStaffFacilitatorHours refreshSignal={refreshSignal} />
            )}
        </div>
    );
};

export default CareStaffFormsPage;
