import React, { useState } from 'react';
import { Plus, Award, Trash2, XCircle, Download, RefreshCw, Archive, Edit } from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { supabase } from '../../../../../lib/supabase';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { useSupabaseData } from '../../../../../hooks/useSupabaseData';
import { Scholarship } from '../../../../../types/models';
import { splitFullName } from '../../../../../utils/nameUtils';
import { buildStudentAddress } from '../../../../../utils/studentFields';
import type { CareStaffDashboardFunctions } from '../../../types';
import { parseScholarship, serializeRequirements } from '../../../../../utils/scholarshipHelpers';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import { useCareStaffScholarship } from '../hooks/useCareStaffScholarship';
import type { CareStaffScholarshipPageProps } from '../hooks/useCareStaffScholarship';

const CareStaffScholarshipPage = ({ functions }: CareStaffScholarshipPageProps) => {
    const {
        showToast,
        canPerformAction,
        canArchiveRecords,
        scholarships,
        fetchScholarships,
        closedScholarships,
        fetchClosedScholarships,
        loading,
        setLoading,
        isRefreshingData,
        setIsRefreshingData,
        isEditing,
        setIsEditing,
        parsedScholarships,
        parsedClosedScholarships,
        showScholarshipModal,
        setShowScholarshipModal,
        showApplicantModal,
        setShowApplicantModal,
        showClosedModal,
        setShowClosedModal,
        applicantsLoading,
        setApplicantsLoading,
        applicantsError,
        setApplicantsError,
        scholarshipForm,
        setScholarshipForm,
        applicantsList,
        setApplicantsList,
        selectedScholarship,
        setSelectedScholarship,
        detailScholarship,
        setDetailScholarship,
        handleSaveScholarship,
        fetchApplicantsByScholarship,
        handleViewApplicants,
        handleRefreshData,
        toYearLevelCode,
        toSexCode,
        formatIsoDate,
        getStudentLastName,
        getStudentGivenName,
        getStudentMiddleName,
        getStudentFullName,
        getParentParts,
        exportApplicantRows,
        handleExportApplicants,
        handleExportApplicantsForScholarship,
        handleDeleteScholarship
    } = useCareStaffScholarship({ functions });

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
                        leftIcon={<Archive size={16} />}
                        onClick={() => setShowClosedModal(true)}
                    >
                        Closed ({parsedClosedScholarships.length})
                    </Button>
                    <Button
                        variant="secondary"
                        isLoading={isRefreshingData}
                        leftIcon={!isRefreshingData ? <RefreshCw size={16} /> : undefined}
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                    >
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={14} />}
                        onClick={() => {
                            setIsEditing(false);
                            setScholarshipForm({
                                title: '',
                                description: '',
                                requirements: '',
                                deadline: '',
                                application_method: 'portal',
                                application_url: '',
                                is_active: true
                            });
                            setShowScholarshipModal(true);
                        }}
                    >
                        Add Scholarship
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parsedScholarships.map(s => (
                    <Card key={s.id} hoverEffect className="p-6 flex flex-col justify-between cursor-pointer" onClick={() => setDetailScholarship(s)}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Award size={20} />
                                </div>
                                <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                    Deadline: {s.deadline ? new Date(s.deadline).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-4">{s.title}</h3>
                        </div>
                        <div className="pt-4 border-t border-gray-50 flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={(event) => { event.stopPropagation(); handleViewApplicants(s); }}>View Applicants</Button>
                            <Button variant="ghost" size="sm" className="bg-purple-50 text-purple-700 hover:bg-purple-100" leftIcon={<Edit size={14} />} onClick={(event) => { event.stopPropagation(); setIsEditing(true); setScholarshipForm(s); setShowScholarshipModal(true); }} title="Edit Scholarship">Edit</Button>
                            <Button variant="ghost" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" onClick={(event) => { event.stopPropagation(); handleExportApplicantsForScholarship(s); }}>Export</Button>
                            {canArchiveRecords && (
                                <Button variant="ghost" size="sm" className="bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={(event) => { event.stopPropagation(); if (s.id) handleDeleteScholarship(s.id); }} title="Close Scholarship"><Trash2 size={16} /></Button>
                            )}
                        </div>
                    </Card>
                ))}
                {parsedScholarships.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p>No active scholarships found. Click "Add Scholarship" to create one.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showScholarshipModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{isEditing ? 'Edit Scholarship' : 'Add New Scholarship'}</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowScholarshipModal(false);
                                    setIsEditing(false);
                                    setScholarshipForm({
                                        title: '',
                                        description: '',
                                        requirements: '',
                                        deadline: '',
                                        application_method: 'portal',
                                        application_url: '',
                                        is_active: true
                                    });
                                }}
                            >
                                <XCircle className="text-gray-400 hover:text-gray-600" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Scholarship Title</label><input className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.title} onChange={e => setScholarshipForm({ ...scholarshipForm, title: e.target.value })} placeholder="e.g. Academic Excellence 2026" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={scholarshipForm.description} onChange={e => setScholarshipForm({ ...scholarshipForm, description: e.target.value })} placeholder="Overview..." /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Requirements</label><textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={scholarshipForm.requirements} onChange={e => setScholarshipForm({ ...scholarshipForm, requirements: e.target.value })} placeholder="List requirements..." /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Deadline</label><input type="date" className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.deadline} onChange={e => setScholarshipForm({ ...scholarshipForm, deadline: e.target.value })} /></div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Application Method</label>
                                <select 
                                    className="w-full border rounded-lg p-2 text-sm bg-white" 
                                    value={scholarshipForm.application_method || 'portal'} 
                                    onChange={e => setScholarshipForm({ ...scholarshipForm, application_method: e.target.value })}
                                >
                                    <option value="portal">Apply Through Portal</option>
                                    <option value="external_link">External Link</option>
                                    <option value="express_interest">Express Interest / Reservation</option>
                                </select>
                            </div>

                            {scholarshipForm.application_method === 'external_link' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Application URL</label>
                                    <input 
                                        type="url" 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                        value={scholarshipForm.application_url || ''} 
                                        onChange={e => setScholarshipForm({ ...scholarshipForm, application_url: e.target.value })} 
                                        placeholder="https://example.com/apply" 
                                    />
                                </div>
                            )}

                            {isEditing && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                                    <select 
                                        className="w-full border rounded-lg p-2 text-sm bg-white" 
                                        value={scholarshipForm.is_active === false ? 'closed' : 'open'} 
                                        onChange={e => setScholarshipForm({ ...scholarshipForm, is_active: e.target.value === 'open' })}
                                    >
                                        <option value="open">Open (Visible to Students)</option>
                                        <option value="closed">Closed (Hidden from Students)</option>
                                    </select>
                                </div>
                            )}

                            <Button variant="primary" size="lg" className="w-full mt-2" isLoading={loading} onClick={handleSaveScholarship} disabled={loading}>
                                {isEditing ? 'Save Changes' : 'Post Scholarship'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showApplicantModal && selectedScholarship && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh] animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Applicants List</h3><p className="text-xs text-gray-500">{selectedScholarship.title}</p></div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" leftIcon={<Download size={14} />} onClick={handleExportApplicants}>Export Excel</Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowApplicantModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {applicantsLoading ? (
                                <div className="text-center py-12 text-gray-400">Loading applicants...</div>
                            ) : applicantsError ? (
                                <div className="text-center py-12 text-red-500">{applicantsError}</div>
                            ) : applicantsList.length === 0 ? <div className="text-center py-12 text-gray-400">No applicants yet.</div> : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student Name</th><th className="px-6 py-3">Course &amp; Year</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Date Applied</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {applicantsList.map((app, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
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
            )}

            {detailScholarship && (
                <div className="fixed inset-0 bg-transparent z-[60] flex items-center justify-center p-4" onClick={() => setDetailScholarship(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-in" onClick={(event) => event.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-start gap-4 bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{detailScholarship.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">Deadline: {detailScholarship.deadline ? new Date(detailScholarship.deadline).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setDetailScholarship(null)}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Description</h4>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detailScholarship.description || 'No description provided.'}</p>
                            </section>
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Requirements</h4>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detailScholarship.requirements || 'No requirements listed.'}</p>
                            </section>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-between items-center">
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setDetailScholarship(null);
                                    setIsEditing(true);
                                    setScholarshipForm(detailScholarship);
                                    setShowScholarshipModal(true);
                                }}
                            >
                                Edit Scholarship
                            </Button>
                            <Button variant="secondary" onClick={() => setDetailScholarship(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {showClosedModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-lg">Closed Scholarships</h3>
                                <p className="text-xs text-gray-500">These scholarships are hidden from students but kept for reporting and applicant history.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowClosedModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {parsedClosedScholarships.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No closed scholarships yet.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {parsedClosedScholarships.map((scholarship) => (
                                        <Card key={`closed-scholarship-${scholarship.id}`} hoverEffect className="p-5 bg-slate-50 rounded-xl border-slate-200 cursor-pointer" onClick={() => setDetailScholarship(scholarship)}>
                                            <div className="flex justify-between items-start gap-3">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{scholarship.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Deadline: {scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">Closed</span>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <Button variant="ghost" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={(event) => { event.stopPropagation(); handleViewApplicants(scholarship); }}>View Applicants</Button>
                                                <Button variant="ghost" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" onClick={(event) => { event.stopPropagation(); handleExportApplicantsForScholarship(scholarship); }}>Export</Button>
                                            </div>
                                        </Card>
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

export default CareStaffScholarshipPage;

