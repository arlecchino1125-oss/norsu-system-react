import { useState } from 'react';
import { Plus, Award, XCircle, Download, RefreshCw, Edit } from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
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
        <div>
            {/* Main Page Content */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage active scholarships and view applicants.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        isLoading={isRefreshingData}
                        leftIcon={!isRefreshingData ? <RefreshCw size={16} /> : undefined}
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                    >
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <Button variant="primary" leftIcon={<Plus size={14} />} onClick={openAddScholarship}>
                        Add Scholarship
                    </Button>
                </div>
            </div>

            <div className="mb-6 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Scholarship status">
                <button
                    type="button"
                    role="tab"
                    aria-selected={section === 'active'}
                    className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${section === 'active' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    onClick={() => setSection('active')}
                >
                    Active ({parsedScholarships.length})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={section === 'closed'}
                    className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${section === 'closed' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    onClick={() => setSection('closed')}
                >
                    Closed ({parsedClosedScholarships.length})
                </button>
            </div>

            <section role="tabpanel" aria-label={`${section === 'active' ? 'Active' : 'Closed'} scholarships`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleScholarships.map(s => (
                    <Card key={s.id} hoverEffect className="p-6 flex flex-col justify-between cursor-pointer" onClick={() => setDetailScholarship(s)}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${section === 'active' ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-200' : 'bg-slate-500 shadow-slate-200'}`}>
                                    <Award size={20} />
                                </div>
                                <div className="flex items-center gap-2">
                                    {section === 'closed' && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">Closed</span>}
                                    <div className="rounded bg-gray-50 px-2 py-1 text-xs font-bold text-gray-500">
                                        Deadline: {s.deadline ? new Date(s.deadline).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-4">{s.title}</h3>
                        </div>
                        <div className="pt-4 border-t border-gray-50 flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={(event) => { event.stopPropagation(); handleViewApplicants(s); }}>View Applicants</Button>
                            {section === 'active' && <Button variant="ghost" size="sm" className="bg-purple-50 text-purple-700 hover:bg-purple-100" leftIcon={<Edit size={14} />} onClick={(event) => { event.stopPropagation(); openEditScholarship(s); }} title="Edit Scholarship">Edit</Button>}
                            <Button variant="ghost" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" onClick={(event) => { event.stopPropagation(); handleExportApplicantsForScholarship(s); }}>Export</Button>
                        </div>
                    </Card>
                ))}
                {visibleScholarships.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p>{section === 'active' ? 'No active scholarships found. Click "Add Scholarship" to create one.' : 'No closed scholarships yet.'}</p>
                    </div>
                )}
            </div>
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
