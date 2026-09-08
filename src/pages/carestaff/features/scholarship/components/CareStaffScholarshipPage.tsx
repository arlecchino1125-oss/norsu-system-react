import { useState } from 'react';
import { Plus, XCircle, Download, RefreshCw, Edit, User, Users } from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { useCareStaffScholarship } from '../hooks/useCareStaffScholarship';
import type { CareStaffScholarshipPageProps } from '../hooks/useCareStaffScholarship';

const EMPTY_SCHOLARSHIP_FORM = {
    title: '',
    description: '',
    requirements: '',
    deadline: '',
    application_method: 'portal',
    application_url: '',
    is_active: true
};

const ScholarshipFormModal = ({ isEditing, loading, form, setForm, onClose, onSave }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-scale-in">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                <h3 className="font-bold text-lg">{isEditing ? 'Edit Scholarship' : 'Add New Scholarship'}</h3>
                <Button variant="ghost" size="sm" aria-label="Close scholarship form" onClick={onClose}>
                    <XCircle className="text-gray-400 hover:text-gray-600" />
                </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div><label htmlFor="scholarship-title" className="block text-xs font-bold text-gray-500 mb-1">Scholarship Title</label><input id="scholarship-title" className="w-full border rounded-lg p-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Academic Excellence 2026" /></div>
                <div>
                    <label htmlFor="scholarship-description" className="mb-1 block text-xs font-bold text-gray-500">Description</label>
                    <textarea
                        id="scholarship-description"
                        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-6 text-gray-800 outline-none transition-colors placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                        rows={8}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Overview..."
                    />
                </div>
                <div>
                    <label htmlFor="scholarship-requirements" className="mb-1 block text-xs font-bold text-gray-500">Requirements</label>
                    <textarea
                        id="scholarship-requirements"
                        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-6 text-gray-800 outline-none transition-colors placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                        rows={8}
                        value={form.requirements}
                        onChange={e => setForm({ ...form, requirements: e.target.value })}
                        placeholder="List requirements..."
                    />
                </div>
                <div><label htmlFor="scholarship-deadline" className="block text-xs font-bold text-gray-500 mb-1">Deadline</label><input id="scholarship-deadline" type="date" className="w-full border rounded-lg p-2 text-sm" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>

                <div>
                    <label htmlFor="scholarship-application-method" className="block text-xs font-bold text-gray-500 mb-1">Application Method</label>
                    <select
                        id="scholarship-application-method"
                        className="w-full border rounded-lg p-2 text-sm bg-white"
                        value={form.application_method || 'portal'}
                        onChange={e => setForm({ ...form, application_method: e.target.value })}
                    >
                        <option value="portal">Apply Through Portal</option>
                        <option value="external_link">External Link</option>
                        <option value="express_interest">Express Interest / Reservation</option>
                    </select>
                </div>

                {form.application_method === 'external_link' && (
                    <div>
                        <label htmlFor="scholarship-application-url" className="block text-xs font-bold text-gray-500 mb-1">Application URL</label>
                        <input
                            id="scholarship-application-url"
                            type="url"
                            className="w-full border rounded-lg p-2 text-sm"
                            value={form.application_url || ''}
                            onChange={e => setForm({ ...form, application_url: e.target.value })}
                            placeholder="https://example.com/apply"
                        />
                    </div>
                )}

                {isEditing && (
                    <div>
                    <label htmlFor="scholarship-status" className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                    <select
                        id="scholarship-status"
                            className="w-full border rounded-lg p-2 text-sm bg-white"
                            value={form.is_active === false ? 'closed' : 'open'}
                            onChange={e => setForm({ ...form, is_active: e.target.value === 'open' })}
                        >
                            <option value="open">Open (Visible to Students)</option>
                            <option value="closed">Closed (Hidden from Students)</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <Button variant="primary" size="lg" className="w-full" isLoading={loading} onClick={onSave} disabled={loading}>
                    {isEditing ? 'Save Changes' : 'Post Scholarship'}
                </Button>
            </div>
        </div>
    </div>
);

const ApplicantsModal = ({ scholarship, loading, error, applicants, getStudentFullName, onExport, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-scale-in">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
                <div><h3 className="font-bold text-lg">Applicants List</h3><p className="text-xs text-gray-500">{scholarship.title}</p></div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" leftIcon={<Download size={14} />} onClick={onExport}>Export Excel</Button>
                    <Button variant="ghost" size="sm" aria-label="Close scholarship applicants" onClick={onClose}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading applicants...</div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                ) : applicants.length === 0 ? <div className="text-center py-12 text-gray-400">No applicants yet.</div> : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student Name</th><th className="px-6 py-3">Course &amp; Year</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Date Applied</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {applicants.map((app: any) => (
                                <tr key={app.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3"><p className="font-bold text-gray-900">{getStudentFullName(app)}</p><p className="text-xs text-gray-500">{app.student?.email || '-'}</p></td>
                                    <td className="px-6 py-3 text-gray-600">{`${app.student?.course || ''}${app.student?.course && app.student?.year_level ? ' - ' : ''}${app.student?.year_level || ''}` || '-'}</td>
                                    <td className="px-6 py-3 text-gray-600">{app.student?.mobile || '-'}</td>
                                    <td className="px-6 py-3 text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    </div>
);

const ScholarshipDetailModal = ({ scholarship, onEdit, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-slate-950/30 p-2 backdrop-blur-[2px] sm:p-3" onClick={onClose}>
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-scale-in" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">{scholarship.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">Deadline: {scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Close scholarship details" onClick={onClose}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scholarship.description || 'No description provided.'}</p>
                </section>
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Requirements</h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scholarship.requirements || 'No requirements listed.'}</p>
                </section>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <Button variant="primary" onClick={onEdit}>
                    Edit Scholarship
                </Button>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
        </div>
    </div>
);

const CareStaffScholarshipPage = ({ functions }: CareStaffScholarshipPageProps) => {
    const {
        loading,
        isRefreshingData,
        isEditing,
        setIsEditing,
        parsedScholarships,
        parsedClosedScholarships,
        showScholarshipModal,
        setShowScholarshipModal,
        showApplicantModal,
        setShowApplicantModal,
        applicantsLoading,
        applicantsError,
        scholarshipForm,
        setScholarshipForm,
        applicantsList,
        selectedScholarship,
        detailScholarship,
        setDetailScholarship,
        handleSaveScholarship,
        handleViewApplicants,
        handleRefreshData,
        getStudentFullName,
        handleExportApplicants,
        handleExportApplicantsForScholarship
    } = useCareStaffScholarship({ functions });
    const [section, setSection] = useState<'active' | 'closed'>('active');
    const visibleScholarships = section === 'active' ? parsedScholarships : parsedClosedScholarships;

    const openAddScholarship = () => {
        setIsEditing(false);
        setScholarshipForm({ ...EMPTY_SCHOLARSHIP_FORM });
        setShowScholarshipModal(true);
    };

    const openEditScholarship = (scholarship: any) => {
        setIsEditing(true);
        setScholarshipForm(scholarship);
        setShowScholarshipModal(true);
    };

    const closeScholarshipForm = () => {
        setShowScholarshipModal(false);
        setIsEditing(false);
        setScholarshipForm({ ...EMPTY_SCHOLARSHIP_FORM });
    };

    return (
        <div className="relative flex h-full min-h-0 flex-col gap-4 animate-fade-in">
            {/* Header Banner (Dark Gradient) */}
            <div
                style={{ background: 'linear-gradient(135deg, #1e0f40 0%, #2d1b69 100%)' }}
                className="rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Scholarship Management</h1>
                    <p className="mt-1 text-xs md:text-sm font-medium text-purple-300/70">Manage active scholarships and view applicants.</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                        <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={openAddScholarship}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer"
                    >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Add Scholarship</span>
                    </button>
                </div>
            </div>

            {/* Pill Tabs Toolbar */}
            <div className="flex items-center gap-2.5" role="tablist" aria-label="Scholarship status">
                <button
                    type="button"
                    role="tab"
                    aria-selected={section === 'active'}
                    aria-label={`Active (${parsedScholarships.length})`}
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs transition-all cursor-pointer ${
                        section === 'active'
                            ? 'bg-purple-600 text-white shadow-sm border border-purple-600 font-bold'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 font-semibold'
                    }`}
                    onClick={() => setSection('active')}
                >
                    <span>Active</span>
                    <span
                        className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            section === 'active' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {parsedScholarships.length}
                    </span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={section === 'closed'}
                    aria-label={`Closed (${parsedClosedScholarships.length})`}
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs transition-all cursor-pointer ${
                        section === 'closed'
                            ? 'bg-purple-600 text-white shadow-sm border border-purple-600 font-bold'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 font-semibold'
                    }`}
                    onClick={() => setSection('closed')}
                >
                    <span>Closed</span>
                    <span
                        className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            section === 'closed' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {parsedClosedScholarships.length}
                    </span>
                </button>
            </div>

            {/* Content Area */}
            <section role="tabpanel" aria-label={`${section === 'active' ? 'Active' : 'Closed'} scholarships`}>
                {visibleScholarships.length === 0 ? (
                    <div className="rounded-2xl md:rounded-3xl border border-dashed border-gray-200 bg-white/60 p-12 md:p-16 min-h-[380px] flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400 mb-4 shadow-xs">
                            <User size={22} className="text-purple-400 stroke-[1.5]" />
                        </div>
                        <p className="font-bold text-sm text-gray-800">
                            {section === 'active' ? 'No active scholarships found.' : 'No closed scholarships found.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {section === 'active' ? 'Click "Add Scholarship" to create one.' : 'Closed scholarships will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {visibleScholarships.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => setDetailScholarship(s)}
                                className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200/60 transition-all duration-200 cursor-pointer min-h-[190px]"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                            <User size={18} className="stroke-[1.75]" />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {section === 'closed' ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                                                    Closed
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                    Open
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 font-medium">
                                                Deadline: {s.deadline ? new Date(s.deadline).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-sm md:text-[15px] text-gray-900 leading-snug line-clamp-3 mt-3 mb-4 hover:text-purple-600 transition-colors">
                                        {s.title}
                                    </h3>
                                </div>
                                <div className="pt-3 border-t border-gray-100/80 flex items-center justify-between text-xs">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleViewApplicants(s);
                                        }}
                                        className="flex items-center gap-1.5 font-medium text-gray-500 hover:text-purple-600 transition-colors cursor-pointer"
                                    >
                                        <Users size={14} className="text-gray-400" />
                                        <span>View Applicants</span>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {section === 'active' && (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditScholarship(s);
                                                }}
                                                title="Edit Scholarship"
                                                className="flex items-center gap-1 font-medium text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
                                            >
                                                <Edit size={13} />
                                                <span>Edit</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleExportApplicantsForScholarship(s);
                                            }}
                                            className="flex items-center gap-1.5 font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                        >
                                            <Download size={14} className="text-emerald-500" />
                                            <span>Export</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Modals */}
            {showScholarshipModal && (
                <ScholarshipFormModal
                    isEditing={isEditing}
                    loading={loading}
                    form={scholarshipForm}
                    setForm={setScholarshipForm}
                    onClose={closeScholarshipForm}
                    onSave={handleSaveScholarship}
                />
            )}

            {showApplicantModal && selectedScholarship && (
                <ApplicantsModal
                    scholarship={selectedScholarship}
                    loading={applicantsLoading}
                    error={applicantsError}
                    applicants={applicantsList}
                    getStudentFullName={getStudentFullName}
                    onExport={handleExportApplicants}
                    onClose={() => setShowApplicantModal(false)}
                />
            )}

            {detailScholarship && (
                <ScholarshipDetailModal
                    scholarship={detailScholarship}
                    onEdit={() => {
                        setDetailScholarship(null);
                        openEditScholarship(detailScholarship);
                    }}
                    onClose={() => setDetailScholarship(null)}
                />
            )}
        </div>
    );
};

export default CareStaffScholarshipPage;
