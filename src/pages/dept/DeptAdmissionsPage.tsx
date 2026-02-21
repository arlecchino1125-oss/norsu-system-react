import React, { useState } from 'react';
import { CheckCircle, XCircle, Calendar, User, Mail, Phone, CalendarDays } from 'lucide-react';

const DeptAdmissionsPage = ({
    applicants,
    handleApproveApplicant,
    handleRejectApplicant,
    handleScheduleInterview
}: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const filteredApplicants = applicants.filter((app: any) => {
        const searchString = `${app.first_name || ''} ${app.last_name || ''} ${app.reference_id || ''}`.toLowerCase();
        const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Admissions Screening</h2>
                    <p className="text-sm text-gray-500 mt-1 pl-4">Review and interview applicants interested in your department.</p>
                </div>
            </div>

            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Search by name or reference ID..."
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-1/4 px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                    <option value="All">All Statuses</option>
                    <option value="Qualified for Interview (1st Choice)">1st Choice (Pending)</option>
                    <option value="Forwarded to 2nd Choice for Interview">2nd Choice (Pending)</option>
                    <option value="Forwarded to 3rd Choice for Interview">3rd Choice (Pending)</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredApplicants.map((app: any) => (
                    <div key={app.id} className="bg-white border text-left flex flex-col justify-between border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        {app.status.includes('Interview Scheduled') && (
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm">Interviewed Scheduled</div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-sm">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{app.first_name} {app.last_name}</h3>
                                    <p className="text-xs text-gray-500 font-mono tracking-wide">{app.reference_id}</p>
                                </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-1 rounded-md font-bold text-center">
                                Priority Level: {app.current_choice}
                            </span>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail size={16} className="text-gray-400" /> {app.email}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone size={16} className="text-gray-400" /> {app.mobile}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                <CalendarDays size={16} className="text-gray-400" /> Applying for: {app.current_choice === 1 ? app.priority_course : app.current_choice === 2 ? app.alt_course_1 : app.alt_course_2}
                            </div>
                            {app.interview_date && (
                                <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                    <Calendar size={14} /> Interview: {app.interview_date}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-auto">
                            {!app.status.includes('Interview Scheduled') ? (
                                <button onClick={() => handleScheduleInterview(app)} className="md:col-span-3 flex justify-center items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-blue-100">
                                    <Calendar size={16} /> Schedule Interview
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => handleApproveApplicant(app)} className="flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 px-3 py-2 rounded-xl text-sm font-bold transition-all">
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button onClick={() => handleRejectApplicant(app)} className="flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 px-3 py-2 rounded-xl text-sm font-bold transition-all">
                                        <XCircle size={16} /> Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {filteredApplicants.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-gray-100 border-dashed">
                        <User size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">No pending admissions found for your department.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeptAdmissionsPage;
