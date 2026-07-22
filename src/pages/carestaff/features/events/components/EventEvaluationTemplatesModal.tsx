import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';

import Modal from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import EventEvaluationBuilderModal from './EventEvaluationBuilderModal';
import { deleteEvaluation, listTemplates, type EvaluationForm } from '../eventEvaluationService';

interface EventEvaluationTemplatesModalProps {
    open: boolean;
    onClose: () => void;
    showToast: (message: string, type?: string) => void;
}

export default function EventEvaluationTemplatesModal({ open, onClose, showToast }: EventEvaluationTemplatesModalProps) {
    const [editing, setEditing] = useState<EvaluationForm | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);

    // React Query rather than useState + useEffect: matches how the rest of the
    // staff portal caches server lists, and keeps the fetch out of an effect body.
    const { data: templates = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['event-evaluation-templates'],
        queryFn: listTemplates,
        enabled: open,
        staleTime: 60000
    });

    const refresh = async () => {
        await refetch();
    };

    const handleDelete = async (template: EvaluationForm) => {
        try {
            await deleteEvaluation(template.id);
            // Event evaluations built from this template are copies, so they are
            // unaffected -- nothing students already answered disappears.
            showToast('Template deleted. Evaluations already attached to events are unaffected.', 'success');
            await refresh();
        } catch {
            showToast('Could not delete that template.', 'error');
        }
    };

    return (
        <>
            <Modal
                open={open && !isBuilderOpen}
                onClose={onClose}
                size="lg"
                title="Evaluation Templates"
                subtitle="Reusable question sets you can copy onto any event."
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                        <Button
                            variant="primary"
                            onClick={() => { setEditing(null); setIsBuilderOpen(true); }}
                            leftIcon={<Plus size={14} />}
                        >
                            New Template
                        </Button>
                    </>
                }
            >
                {isLoading ? (
                    <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
                ) : isError ? (
                    <p className="py-10 text-center text-sm text-red-500">Could not load templates.</p>
                ) : templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                        <ClipboardList size={28} className="mx-auto text-gray-300" />
                        <p className="mt-3 text-sm font-bold text-gray-700">No templates yet</p>
                        <p className="mt-1 text-xs text-gray-500">Build one here, then copy it onto any event's evaluation.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {templates.map((template) => (
                            <div key={template.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-4">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900">{template.title}</h4>
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{template.description || 'No description.'}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setEditing(template); setIsBuilderOpen(true); }}>Edit</Button>
                                    <Button variant="ghost" size="sm" aria-label={`Delete template ${template.title}`} onClick={() => void handleDelete(template)} leftIcon={<Trash2 size={14} className="text-red-500" />} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {isBuilderOpen && (
                <EventEvaluationBuilderModal
                    open={isBuilderOpen}
                    onClose={() => { setIsBuilderOpen(false); setEditing(null); }}
                    eventId={null}
                    existingForm={editing}
                    showToast={showToast}
                    onSaved={refresh}
                />
            )}
        </>
    );
}
