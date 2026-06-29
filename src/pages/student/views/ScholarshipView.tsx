import React from 'react';
import { createPortal } from 'react-dom';

export default function ScholarshipView({
    scholarshipsList,
    myApplications,
    selectedScholarship,
    setSelectedScholarship,
    showScholarshipModal,
    setShowScholarshipModal,
    handleApplyScholarship,
    isApplyingScholarshipId,
    Icons
}: any) {
    return (
        <div className="space-y-6 page-transition">
            <div>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Scholarship Services</h2>
                <p className="text-sm text-gray-400 mb-6 sm:mb-8 animate-fade-in-up">View available scholarships and check your eligibility.</p>
            </div>
            {scholarshipsList.length === 0 ? (
                <div className="text-center py-10 sm:py-12 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-fade-in-up">
                    <p className="text-gray-400 italic">No scholarships available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {scholarshipsList.map((s: any, idx: number) => {
                        const isApplied = myApplications.some((app: any) => app.scholarship_id === s.id);
                        const isExpired = new Date(s.deadline) < new Date();
                        return (
                            <div
                                key={s.id}
                                onClick={() => { setSelectedScholarship(s); setShowScholarshipModal(true); }}
                                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all card-hover animate-fade-in-up cursor-pointer group"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={s.title}>{s.title}</h3>
                                    <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${isExpired ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {isExpired ? 'Closed' : 'Open'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400">
                                    <span>Deadline: {new Date(s.deadline).toLocaleDateString()}</span>
                                    {isApplied && <span className="font-bold text-blue-600 flex items-center gap-1"><Icons.CheckCircle /> Applied</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showScholarshipModal && selectedScholarship && createPortal(
                <div className="student-mobile-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'transparent' }} onClick={() => setShowScholarshipModal(false)} />

                    <div className="animate-scale-in student-mobile-modal-panel" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '18px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{selectedScholarship.title}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                                            {new Date(selectedScholarship.deadline) < new Date() ? 'Closed' : 'Open'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setShowScholarshipModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>×</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', background: '#f8fafc' }}>
                            <div className="space-y-6">
                                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedScholarship.description || 'No description provided.'}</p>
                                </div>

                                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requirements</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedScholarship.requirements || 'No specific requirements listed.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #e5e7eb' }}>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deadline</h4>
                                        <p className="text-sm font-bold text-gray-900">{new Date(selectedScholarship.deadline).toLocaleDateString()}</p>
                                    </div>
                                    <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #e5e7eb' }}>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</h4>
                                        <p className={`text-sm font-bold ${new Date(selectedScholarship.deadline) < new Date() ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {new Date(selectedScholarship.deadline) < new Date() ? 'Applications Closed' : 'Accepting Applications'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 18px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                            {(() => {
                                const method = selectedScholarship.application_method || 'portal';
                                const isExpired = new Date(selectedScholarship.deadline) < new Date();
                                const isApplied = myApplications.some((app: any) => app.scholarship_id === selectedScholarship.id);

                                if (method === 'external_link') {
                                    const hasUrl = !!String(selectedScholarship.application_url || '').trim();
                                    return (
                                        <button
                                            onClick={() => {
                                                if (hasUrl) {
                                                    window.open(selectedScholarship.application_url, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            disabled={!hasUrl}
                                            className="btn-press"
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: hasUrl ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#cbd5e1',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                cursor: hasUrl ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: hasUrl ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
                                                transition: 'all 0.25s ease'
                                            }}
                                        >
                                            {hasUrl ? 'Apply on Official Website' : 'Application link unavailable'}
                                        </button>
                                    );
                                }

                                if (method === 'express_interest') {
                                    return (
                                        <div className="space-y-2">
                                            {isApplied ? (
                                                <button disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <Icons.CheckCircle /> Interest Registered
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { handleApplyScholarship(selectedScholarship); }}
                                                    disabled={isExpired || isApplyingScholarshipId === String(selectedScholarship.id)}
                                                    className="btn-press"
                                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}
                                                >
                                                    {isExpired ? 'Deadline Passed' : (isApplyingScholarshipId === String(selectedScholarship.id) ? 'Registering...' : 'Express Interest')}
                                                </button>
                                            )}
                                            <p className="text-[11px] text-gray-400 text-center">
                                                * This registers interest for reservation. Additional requirements may be requested by CARE staff.
                                            </p>
                                        </div>
                                    );
                                }

                                // Default portal method
                                return isApplied ? (
                                    <button disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Icons.CheckCircle /> Application Submitted
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { handleApplyScholarship(selectedScholarship); }}
                                        disabled={isExpired || isApplyingScholarshipId === String(selectedScholarship.id)}
                                        className="btn-press"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isExpired || isApplyingScholarshipId === String(selectedScholarship.id) ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}
                                    >
                                        {isExpired ? 'Deadline Passed' : (isApplyingScholarshipId === String(selectedScholarship.id) ? 'Applying...' : 'Apply Now')}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
