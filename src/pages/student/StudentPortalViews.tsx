import React from 'react';
import { supabase } from '../../lib/supabase';
import { createPortal } from 'react-dom';
import { renderProfileView } from './views/ProfileView';
import { FeedbackView } from './views/FeedbackView';
import { ServiceIntroModal } from './views/ServiceIntroModal';
export { ServiceIntroModal } from './views/ServiceIntroModal';

// Helper: renders assessment, counseling, support, scholarship, feedback, profile views
export function renderRemainingViews(p: any) {
    const { activeView, activeForm, loadingForm, formQuestions, formsList, assessmentForm, handleInventoryChange, submitAssessment, openAssessmentForm, showAssessmentModal, setShowAssessmentModal, showSuccessModal, setShowSuccessModal, isSubmitting, showCounselingForm, setShowCounselingForm, counselingForm, setCounselingForm, submitCounselingRequest, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, selectedSupportRequest, setSelectedSupportRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, showCounselingRequestsModal, setShowCounselingRequestsModal, showSupportRequestsModal, setShowSupportRequestsModal, supportForm, setSupportForm, personalInfo, submitSupportRequest, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship, setActiveView, feedbackPrefill, setFeedbackPrefill } = p;
    return (
        <>
            {/* SERVICE INTRO MODALS */}
            {activeView === 'assessment' && <ServiceIntroModal serviceKey="assessment" />}
            {activeView === 'counseling' && <ServiceIntroModal serviceKey="counseling" />}
            {activeView === 'support' && <ServiceIntroModal serviceKey="support" />}
            {activeView === 'scholarship' && <ServiceIntroModal serviceKey="scholarship" />}
            {activeView === 'feedback' && <ServiceIntroModal serviceKey="feedback" />}
            {activeView === 'profile' && <ServiceIntroModal serviceKey="profile" />}

            {/* ASSESSMENT VIEW */}
            {activeView === 'assessment' && (
                <div className="max-w-5xl mx-auto page-transition">
                    <h2 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Needs Assessment Tool</h2>
                    <p className="text-sm text-gray-400 mb-8 animate-fade-in-up">Complete the inventory to help us understand your needs and provide better support.</p>
                    {loadingForm ? <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div><p className="ml-3 text-gray-400 text-sm">Loading forms...</p></div> : formsList.length === 0 ? (
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-12 shadow-sm text-center card-hover animate-fade-in-up">
                            <div className="text-5xl mb-4">📋</div>
                            <p className="text-gray-500 font-medium">No assessment forms are currently available.</p>
                            <p className="text-xs text-gray-400 mt-1">Check back later for new assessments from the care staff.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {formsList.map((form: any, idx: number) => {
                                const isDone = completedForms.has(form.id);
                                return (
                                    <button key={form.id} onClick={() => openAssessmentForm(form)} disabled={isDone} className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-6 shadow-sm transition-all text-left group animate-fade-in-up ${isDone ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-blue-100/50 hover:shadow-lg hover:border-blue-200 cursor-pointer card-hover'}`} style={{ animationDelay: `${idx * 80}ms` }}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isDone ? 'bg-gray-400 shadow-gray-400/20' : 'bg-gradient-to-br from-blue-500 to-sky-400 shadow-blue-500/20'}`}><Icons.Assessment /></div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'text-gray-500 bg-gray-100' : 'text-emerald-600 bg-emerald-50'}`}>{isDone ? '✓ Completed' : 'Active'}</span>
                                        </div>
                                        <h3 className={`font-bold text-sm mb-1 transition-colors ${isDone ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>{form.title}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{form.description || 'Click to view and complete this assessment.'}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <span>📅 {new Date(form.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {!isDone && <div className="mt-4 text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Start Assessment →</div>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ASSESSMENT FORM MODAL */}
                    {showAssessmentModal && activeForm && createPortal(
                        <div className="student-mobile-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            {/* Backdrop */}
                            <div className="animate-backdrop" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAssessmentModal(false)} />

                            {/* Modal */}
                            <div className="animate-scale-in student-mobile-modal-panel" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{activeForm.title}</h3>
                                            <p style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px', lineHeight: 1.4 }}>{activeForm.description || 'Please answer all questions honestly.'}</p>
                                            {formQuestions.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                                    <div style={{ flex: 1, maxWidth: '180px', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.round((Object.keys(assessmentForm.responses).length / formQuestions.length) * 100)}%`, background: 'linear-gradient(90deg, #7dd3fc, #6ee7b7)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                                                    </div>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.7 }}>{Object.keys(assessmentForm.responses).length}/{formQuestions.length}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setShowAssessmentModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>✕</button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
                                    {formQuestions.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', textAlign: 'center' }}>
                                            <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #dbeafe', borderTopColor: '#3b82f6', marginBottom: '16px' }} />
                                            <p style={{ color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>Loading questions...</p>
                                            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Please wait while we prepare your assessment.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {formQuestions.map((q: any, idx: number) => (
                                                <div key={q.id} style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: `1.5px solid ${assessmentForm.responses[q.id] !== undefined ? '#93c5fd' : '#e5e7eb'}`, boxShadow: assessmentForm.responses[q.id] !== undefined ? '0 2px 8px rgba(59,130,246,0.08)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s ease' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                                        <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0, background: assessmentForm.responses[q.id] !== undefined ? '#3b82f6' : '#e5e7eb', color: assessmentForm.responses[q.id] !== undefined ? '#fff' : '#9ca3af', transition: 'all 0.25s ease' }}>{idx + 1}</span>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', lineHeight: 1.6, margin: 0, paddingTop: '2px' }}>{q.question_text}</p>
                                                    </div>
                                                    {q.question_type === 'text' || q.question_type === 'open_ended' ? (
                                                        <div style={{ marginLeft: '38px' }}>
                                                            <textarea style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} rows={2} placeholder="Type your answer here..." value={assessmentForm.responses[q.id] || ''} onChange={e => handleInventoryChange(q.id, e.target.value)} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ marginLeft: '38px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                                                {[1, 2, 3, 4, 5].map(v => (
                                                                    <button key={v} onClick={() => handleInventoryChange(q.id, v)} style={{ flex: 1, height: '44px', borderRadius: '10px', border: `2px solid ${assessmentForm.responses[q.id] === v ? '#3b82f6' : '#e5e7eb'}`, background: assessmentForm.responses[q.id] === v ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#fff', color: assessmentForm.responses[q.id] === v ? '#fff' : '#6b7280', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease', transform: assessmentForm.responses[q.id] === v ? 'scale(1.05)' : 'scale(1)', boxShadow: assessmentForm.responses[q.id] === v ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}>{v}</button>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Disagree</span>
                                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Agree</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                                    <button onClick={submitAssessment} disabled={isSubmitting || formQuestions.length === 0} className="btn-press" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isSubmitting || formQuestions.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isSubmitting || formQuestions.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isSubmitting || formQuestions.length === 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}>
                                        {isSubmitting ? (
                                            <><div className="animate-spin" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Submitting...</>
                                        ) : (
                                            <><svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg> Submit Assessment</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        , document.body)}

                    {/* SUCCESS MODAL */}
                    {showSuccessModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Assessment Submitted!</h3>
                                <p className="text-sm text-gray-500 mb-6">Thank you for completing the assessment. Your responses have been recorded and will be used to provide you with better support.</p>
                                <button onClick={() => setShowSuccessModal(false)} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Done</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* COUNSELING VIEW */}
            {activeView === 'counseling' && (
                <div className="max-w-6xl mx-auto space-y-6 page-transition relative">
                    <div className="mb-6 animate-fade-in-up flex justify-between items-start">
                        <div><h2 className="text-2xl font-extrabold mb-1 text-gray-800">Counseling Services</h2><p className="text-sm text-gray-400">Request counseling support and view your requests</p></div>
                        <button onClick={() => setShowCounselingRequestsModal(true)} className="relative flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-purple-100/50 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 transition-all shadow-sm btn-press">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Your Requests
                            {counselingRequests.length > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{counselingRequests.length}</span>}
                        </button>
                    </div>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '80ms' }}><div className="p-3 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-xl shadow-lg shadow-blue-500/20"><Icons.Counseling /></div><div><p className="text-2xl font-black">{counselingRequests.length}</p><p className="text-xs text-gray-400 font-bold uppercase">Total Requests</p></div></div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '160ms' }}><div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl shadow-lg shadow-amber-500/20"><Icons.Clock /></div><div><p className="text-2xl font-black">{counselingRequests.filter((r: any) => ['Referred', 'Scheduled'].includes(r.status)).length}</p><p className="text-xs text-gray-400 font-bold uppercase">Pending</p></div></div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '240ms' }}><div className="p-3 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"><Icons.CheckCircle /></div><div><p className="text-2xl font-black">{counselingRequests.filter((r: any) => r.status === 'Completed').length}</p><p className="text-xs text-gray-400 font-bold uppercase">Completed</p></div></div>
                    </div>
                    {/* CTA Card — always visible */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-12 text-center shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
                        <h3 className="font-bold text-lg mb-2">Need Counseling Support?</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">Our counseling services are here to help you with academic stress, personal concerns, and general wellbeing.</p>
                        <button onClick={() => setShowCounselingForm(true)} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Request Counseling</button>
                    </div>
                    {/* Self-Referral Modal */}
                    {showCounselingForm && createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL FOR COUNSELING FORM</h3>
                                        <p className="text-xs text-gray-400 mt-1">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                    </div>
                                    <button onClick={() => setShowCounselingForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div><label htmlFor="counsel-student-name" className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input id="counsel-student-name" name="counsel-student-name" readOnly value={`${personalInfo.firstName} ${personalInfo.lastName}`} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label htmlFor="counsel-course-year" className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input id="counsel-course-year" name="counsel-course-year" readOnly value={`${personalInfo.course || ''} - ${personalInfo.year || ''}`} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div className="md:col-span-2 md:w-1/2"><label htmlFor="counsel-contact" className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input id="counsel-contact" name="counsel-contact" readOnly value={personalInfo.mobile || 'Not set'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="counsel-reason" className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling <span className="text-red-400">*</span></label>
                                    <p className="text-[10px] text-gray-400 mb-2">Briefly describe your reason/s for seeking counseling.</p>
                                    <textarea id="counsel-reason" name="counsel-reason" rows={4} value={counselingForm.reason_for_referral} onChange={e => setCounselingForm({ ...counselingForm, reason_for_referral: e.target.value })} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="Describe your reason/s for seeking counseling..."></textarea>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="counsel-actions" className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                                    <p className="text-[10px] text-gray-400 mb-2">What have you done to address your concern?</p>
                                    <textarea id="counsel-actions" name="counsel-actions" rows={3} value={counselingForm.personal_actions_taken} onChange={e => setCounselingForm({ ...counselingForm, personal_actions_taken: e.target.value })} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="Describe any steps you've taken..."></textarea>
                                </div>
                                <div className="mb-6">
                                    <label htmlFor="counsel-duration" className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                                    <textarea id="counsel-duration" name="counsel-duration" rows={2} value={counselingForm.date_duration_of_concern} onChange={e => setCounselingForm({ ...counselingForm, date_duration_of_concern: e.target.value })} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" placeholder="e.g. Since January 2026, approximately 3 weeks..."></textarea>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={submitCounselingRequest} disabled={isSubmitting} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
                                    <button onClick={() => setShowCounselingForm(false)} className="bg-white/80 border border-purple-100/50 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                                </div>
                            </div>
                        </div>
                        , document.body)}
                    {/* Counseling Requests Modal */}
                    {showCounselingRequestsModal && createPortal(
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-50 student-mobile-modal-overlay" onClick={() => setShowCounselingRequestsModal(false)}>
                            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-fade-in-up student-mobile-modal-drawer-panel" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex-shrink-0">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="text-lg font-extrabold">Your Requests</h3><p className="text-xs text-purple-200 mt-0.5">{counselingRequests.length} total request{counselingRequests.length !== 1 ? 's' : ''}</p></div>
                                        <button onClick={() => setShowCounselingRequestsModal(false)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-lg">✕</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {counselingRequests.length === 0 ? (
                                        <div className="text-center py-12"><p className="text-gray-400 text-sm">No requests found.</p></div>
                                    ) : counselingRequests.map((req: any, idx: number) => (
                                        <div key={req.id} onClick={() => { setShowCounselingRequestsModal(false); openRequestModal(req); }} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-200 transition-all" style={{ animationDelay: `${idx * 60}ms` }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-lg">📝</span>
                                                    <span className="text-sm font-bold text-gray-900">{req.request_type || 'Self-Referral'}</span>
                                                </div>
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${req.status === 'Submitted' ? 'bg-gray-100 text-gray-600' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : req.status === 'Referred' ? 'bg-purple-100 text-purple-700' : req.status === 'Staff_Scheduled' ? 'bg-indigo-100 text-indigo-700' : req.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : req.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{req.status === 'Submitted' ? 'Pending Review' : req.status === 'Staff_Scheduled' ? 'With CARE Staff' : req.status === 'Referred' ? 'Forwarded' : req.status}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">{formatFullDate(new Date(req.created_at))}</p>
                                            <p className="text-[10px] text-purple-500 font-bold mt-2">Click to view full form →</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        , document.body)}
                    {/* Request Details Modal */}
                    {selectedRequest && createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL FOR COUNSELING FORM</h3>
                                        <p className="text-xs text-gray-400 mt-1">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Submitted: {formatFullDate(new Date(selectedRequest.created_at))}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedRequest.status === 'Submitted' ? 'bg-gray-100 text-gray-600' : selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' : selectedRequest.status === 'Referred' ? 'bg-purple-100 text-purple-700' : selectedRequest.status === 'Staff_Scheduled' ? 'bg-indigo-100 text-indigo-700' : selectedRequest.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{selectedRequest.status === 'Submitted' ? 'Pending Review' : selectedRequest.status === 'Staff_Scheduled' ? 'With CARE Staff' : selectedRequest.status === 'Referred' ? 'Forwarded to CARE Staff' : selectedRequest.status}</span>
                                        <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                    </div>
                                </div>
                                {/* Read-only form fields — same layout as self-referral */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input readOnly value={selectedRequest.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={selectedRequest.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div className="md:col-span-2 md:w-1/2"><label className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input readOnly value={selectedRequest.contact_number || 'Not set'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling</label>
                                    <textarea readOnly rows={4} value={selectedRequest.reason_for_referral || selectedRequest.description || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                                    <textarea readOnly rows={3} value={selectedRequest.personal_actions_taken || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                                    <textarea readOnly rows={2} value={selectedRequest.date_duration_of_concern || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                </div>
                                {/* Status-specific info cards */}
                                <div className="space-y-3 mt-6">
                                    {selectedRequest.referred_by && (
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100"><p className="text-xs font-bold text-purple-800 uppercase mb-1">Forwarded to CARE Staff by</p><p className="text-sm text-purple-900">{selectedRequest.referred_by}</p></div>
                                    )}
                                    {selectedRequest.scheduled_date && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-center"><Icons.Clock className="text-blue-600" /><div><p className="text-xs font-bold text-blue-800 uppercase">Scheduled Session</p><p className="text-sm text-blue-900">{new Date(selectedRequest.scheduled_date).toLocaleString()}</p></div></div>
                                    )}
                                    {selectedRequest.status === 'Rejected' && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100"><p className="text-xs font-bold text-red-800 uppercase mb-1">Request Rejected</p><p className="text-sm text-red-900 leading-relaxed">{selectedRequest.resolution_notes || 'Your request has been reviewed and was not approved at this time.'}</p></div>
                                    )}
                                    {selectedRequest.status === 'Completed' && selectedRequest.resolution_notes && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100"><p className="text-xs font-bold text-green-800 uppercase mb-1">Counselor's Advice</p><p className="text-sm text-green-900 leading-relaxed">{selectedRequest.resolution_notes}</p></div>
                                    )}
                                    {selectedRequest.status === 'Completed' && (
                                        <div className="border-t pt-6">
                                            <h4 className="font-bold text-sm mb-4">Counseling Feedback</h4>
                                            {(selectedRequest.rating || (typeof selectedRequest.feedback === 'string' && selectedRequest.feedback.startsWith('[CSM]'))) ? (
                                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                                                    {selectedRequest.rating ? (
                                                        <div className="flex justify-center gap-1 text-yellow-500 mb-2">
                                                            {[1, 2, 3, 4, 5].map(n => <div key={n} className="scale-75"><Icons.Star filled={n <= selectedRequest.rating} /></div>)}
                                                        </div>
                                                    ) : null}
                                                    <p className="text-sm text-yellow-800 italic">
                                                        {selectedRequest.feedback?.startsWith('[CSM]')
                                                            ? 'Feedback submitted through the CSM form.'
                                                            : `"${selectedRequest.feedback || 'No comment provided.'}"`}
                                                    </p>
                                                    <p className="text-[10px] text-yellow-600 mt-2 font-bold uppercase">Thank you for your feedback!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                        Please complete the Client Satisfaction Measurement (CSM) form for this completed counseling session.
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setFeedbackPrefill({
                                                                source: 'counseling',
                                                                counselingRequestId: selectedRequest.id,
                                                                service_availed: selectedRequest.request_type ? `Counseling - ${selectedRequest.request_type}` : 'Counseling Services',
                                                            });
                                                            setSelectedRequest(null);
                                                            setActiveView('feedback');
                                                        }}
                                                        className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all"
                                                    >
                                                        Open CSM Feedback Form
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        , document.body)}
                </div>
            )}

            {/* SUPPORT VIEW */}
            {activeView === 'support' && (
                <div className="max-w-6xl mx-auto space-y-6 page-transition">
                    {/* Header with Your Requests button */}
                    <div className="flex justify-between items-start animate-fade-in-up">
                        <div><h2 className="text-2xl font-extrabold mb-1 text-gray-800">Additional Support</h2><p className="text-sm text-gray-400">For students with disabilities or special needs</p></div>
                        <button onClick={() => setShowSupportRequestsModal(true)} className="relative flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-purple-100/50 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 transition-all shadow-sm btn-press">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Your Requests
                            {supportRequests.length > 0 && <span className="bg-teal-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{supportRequests.length}</span>}
                        </button>
                    </div>
                    {/* Introduction Text */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up">
                        <div className="text-center mb-8 border-b border-purple-100/50 pb-6">
                            <h2 className="font-bold text-xl text-gray-900">NEGROS ORIENTAL STATE UNIVERSITY</h2>
                            <p className="text-sm text-gray-500">Office of the Campus Student Affairs and Services</p>
                            <p className="text-sm text-gray-500">Guihulngan Campus</p>
                            <h3 className="font-extrabold text-lg mt-4 bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                        </div>
                        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                            <section><h4 className="font-bold text-gray-900 mb-2">1. We welcome your application</h4><p>We welcome applications from students with disabilities or special learning needs. By completing this form, you help us to form a clearer picture of your needs, which will enable us to see how we could support you, should you be admitted.</p><p className="mt-2">As in the case of all other applicants, first of all we consider your academic merits and whether you comply with the admission criteria for the program that you want to apply for. Then we will consider what is reasonable and practical for the specific program to which you have applied.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">2. We protect your information</h4><p>We will respect your privacy and keep your information confidential. However, we have to share relevant information with key academic, administrative and support staff members. They need such information to determine how we might best support you, should you be admitted for studies at NORSU–Guihulngan Campus.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">3. Submit this form, along with the supporting documents, to your application profile</h4><p>Please submit the completed form and all supporting documents (e.g. any copies of medical or psychological proof of your condition and/or disability) when you apply. We must receive all your documents by the closing date for applications. We cannot process your application unless we have all the necessary information.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">4. Should you need assistance or information</h4><p>Contact the Student Affairs and Services Office to learn about the kind of support the University offers.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">5. When you arrive on campus</h4><p>We present an orientation session for students with disabilities and special needs every year. It takes place at the first month of the academic year, as part of the orientation program for newcomer students.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">6. How can we reach you?</h4><p>When we receive your form, we send it to the faculty to which you are applying so that they can determine whether they can support you. The personal information you provide here also allows us to locate your application swiftly.</p></section>
                        </div>
                        <div className="mt-8 pt-6 border-t border-purple-100/50 flex justify-center">
                            <button onClick={() => setShowSupportModal(true)} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-400 hover:to-sky-300 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 btn-press">
                                Proceed to Application Form <Icons.ArrowRight />
                            </button>
                        </div>
                    </div>

                    {/* Support Requests Modal */}
                    {showSupportRequestsModal && createPortal(
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-50 student-mobile-modal-overlay" onClick={() => setShowSupportRequestsModal(false)}>
                            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-fade-in-up student-mobile-modal-drawer-panel" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-5 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex-shrink-0">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="text-lg font-extrabold">Your Support Requests</h3><p className="text-xs text-teal-200 mt-0.5">{supportRequests.length} total request{supportRequests.length !== 1 ? 's' : ''}</p></div>
                                        <button onClick={() => setShowSupportRequestsModal(false)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-lg">✕</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {supportRequests.length === 0 ? (
                                        <div className="text-center py-12"><p className="text-gray-400 text-sm">No requests found.</p></div>
                                    ) : supportRequests.map((req: any, idx: number) => (
                                        <div key={req.id} onClick={() => setSelectedSupportRequest(req)} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer" style={{ animationDelay: `${idx * 60}ms` }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg">{req.support_type}</span>
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${req.status === 'Resolved by Dept' ? 'bg-green-100 text-green-700' : req.status === 'Referred to CARE' ? 'bg-orange-100 text-orange-700' : req.status === 'Visit Scheduled' ? 'bg-blue-100 text-blue-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">{formatFullDate(new Date(req.created_at))}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        , document.body)}

                    {selectedSupportRequest && createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 student-mobile-modal-overlay" onClick={() => setSelectedSupportRequest(null)}>
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-purple-100/50 animate-scale-in student-mobile-modal-panel" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex justify-between items-center shrink-0">
                                    <h3 className="font-extrabold text-lg">Support Request Details</h3>
                                    <button onClick={() => setSelectedSupportRequest(null)} className="text-white hover:text-teal-200">✕</button>
                                </div>
                                <div className="p-6 space-y-8 overflow-y-auto">
                                    {/* Status Badge */}
                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Status</p>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${selectedSupportRequest.status === 'Completed' ? 'bg-green-100 text-green-700' : selectedSupportRequest.status === 'Resolved by Dept' ? 'bg-green-100 text-green-700' : selectedSupportRequest.status === 'Referred to CARE' ? 'bg-orange-100 text-orange-700' : selectedSupportRequest.status === 'Visit Scheduled' ? 'bg-blue-100 text-blue-700' : selectedSupportRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {selectedSupportRequest.status}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Date Submitted</p>
                                            <p className="text-sm font-medium">{formatFullDate(new Date(selectedSupportRequest.created_at))}</p>
                                        </div>
                                    </div>

                                    {/* Resolution Letter — shows who resolved and their message */}
                                    {(() => {
                                        // Determine if there's a resolution and who it came from
                                        const isDeptResolved = selectedSupportRequest.status === 'Resolved by Dept';
                                        const isCompleted = selectedSupportRequest.status === 'Completed';
                                        let resolutionText = '';
                                        let resolvedBy = '';

                                        if (isDeptResolved && selectedSupportRequest.dept_notes) {
                                            // Dean resolved it — dept_notes is plain text
                                            try {
                                                const parsed = JSON.parse(selectedSupportRequest.dept_notes);
                                                // If it's JSON (referral data), it's not a direct resolution
                                                if (parsed.referred_by) {
                                                    resolutionText = '';
                                                } else {
                                                    resolutionText = selectedSupportRequest.dept_notes;
                                                }
                                            } catch {
                                                resolutionText = selectedSupportRequest.dept_notes;
                                            }
                                            resolvedBy = 'Department Head / Dean';
                                        } else if (isCompleted && selectedSupportRequest.resolution_notes) {
                                            resolutionText = selectedSupportRequest.resolution_notes;
                                            resolvedBy = 'CARE Staff';
                                        }

                                        if (!resolutionText) return null;

                                        return (
                                            <details className="rounded-xl overflow-hidden border border-emerald-200 shadow-sm group">
                                                <summary className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                                    <div className="flex items-center gap-2 text-white">
                                                        <Icons.CheckCircle />
                                                        <span className="font-bold text-sm">Resolution Letter</span>
                                                        <svg className="w-4 h-4 text-white/70 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-emerald-100 bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                        {isDeptResolved ? 'Resolved' : 'Completed'}
                                                    </span>
                                                </summary>
                                                <div className="bg-emerald-50/50 p-5 space-y-3">
                                                    <div className="flex items-center gap-2 text-xs text-emerald-800">
                                                        <span className="font-bold uppercase tracking-wider">From:</span>
                                                        <span className="font-semibold bg-white px-2.5 py-1 rounded-lg border border-emerald-100">{resolvedBy}</span>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm">
                                                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{resolutionText}</p>
                                                    </div>
                                                    <p className="text-[10px] text-emerald-600 font-medium text-right italic">
                                                        Your support request has been addressed. Contact the office if you have further concerns.
                                                    </p>
                                                </div>
                                            </details>
                                        );
                                    })()}

                                    <hr className="border-gray-200" />
                                    <h4 className="font-bold text-sm text-blue-800 uppercase tracking-wider opacity-80">Original Request Form</h4>

                                    {/* Student Info */}
                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100 opacity-90 pointer-events-none">
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Student Information</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold">{new Date(selectedSupportRequest.created_at).toLocaleDateString()}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold">{personalInfo.dob}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Program – Year Level</label><div className="font-semibold">{personalInfo.course} - {personalInfo.year}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Cell Phone Number</label><div className="font-semibold">{personalInfo.mobile}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Email Address</label><div className="font-semibold">{personalInfo.email}</div></div>
                                            <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold">{personalInfo.address}</div></div>
                                        </div>
                                    </section>

                                    {/* Category */}
                                    <section className="opacity-90 pointer-events-none">
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Category</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {['Persons with Disabilities (PWDs)', 'Indigenous Peoples (IPs) & Cultural Communities', 'Working Students', 'Economically Challenged Students', 'Students with Special Learning Needs', 'Rebel Returnees', 'Orphans', 'Senior Citizens', 'Homeless Students', 'Solo Parenting', 'Pregnant Women', 'Women in Especially Difficult Circumstances'].map(cat => (
                                                <label key={cat} className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={(selectedSupportRequest.support_type || '').includes(cat)} readOnly className="w-4 h-4 text-blue-600 rounded" /> {cat}</label>
                                            ))}
                                            {selectedSupportRequest.support_type?.includes('Other:') && (() => {
                                                const match = selectedSupportRequest.support_type.match(/Other:\s*(.+)$/);
                                                return match ? (
                                                    <div className="col-span-2 flex items-center gap-2 mt-2">
                                                        <input type="checkbox" checked readOnly className="w-4 h-4 text-blue-600 rounded" />
                                                        <span className="text-sm text-gray-600">Others, specify:</span>
                                                        <input value={match[1]} readOnly className="border-b border-gray-300 px-2 py-1 text-sm flex-1 bg-transparent text-gray-600" />
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </section>

                                    {/* Section A */}
                                    <section className="opacity-90 pointer-events-none">
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">A. Your Studies</h4>
                                        <div className="space-y-3">
                                            <div><label className="block text-xs font-bold text-gray-500">1st Priority</label><input disabled value={personalInfo.priorityCourse} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500">2nd Priority</label><input disabled value={personalInfo.altCourse1} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500">3rd Priority</label><input disabled value={personalInfo.altCourse2} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                        </div>
                                    </section>

                                    {/* Section B */}
                                    <section className="opacity-90 pointer-events-none">
                                        <h4 className="font-bold text-sm text-blue-800 mb-2 uppercase tracking-wider">B. Particulars of your disability or special learning need</h4>
                                        <div className="space-y-4 mt-4">
                                            {(() => {
                                                const desc = selectedSupportRequest.description || '';
                                                let q1 = '', q2 = '', q3 = '', q4 = '';
                                                if (desc.includes('[Q1 Description]:')) {
                                                    const getPart = (startToken: string, endToken: string | null) => {
                                                        const start = desc.indexOf(startToken);
                                                        if (start === -1) return '';
                                                        const end = endToken ? desc.indexOf(endToken, start) : -1;
                                                        return end === -1 ? desc.substring(start + startToken.length).trim() : desc.substring(start + startToken.length, end).trim();
                                                    };
                                                    q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
                                                    q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
                                                    q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
                                                    q4 = getPart('[Q4 Other Needs]:', null);
                                                } else {
                                                    q1 = desc;
                                                }
                                                return (
                                                    <>
                                                        <div><label className="block text-xs font-bold text-gray-700 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</label><textarea rows={2} value={q1} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                        <div><label className="block text-xs font-bold text-gray-700 mb-1">2. What kind of support did you receive at your previous school?</label><textarea rows={2} value={q2} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                        <div><label className="block text-xs font-bold text-gray-700 mb-1">3. What support or assistance do you require from NORSU–Guihulngan Campus to enable you to fully participate in campus activities...?</label><textarea rows={3} value={q3} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                        <div><label className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea rows={2} value={q4} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </section>

                                    {/* Uploaded Documents */}
                                    {selectedSupportRequest.documents_url && (() => {
                                        let urls: string[] = [];
                                        try {
                                            const parsed = JSON.parse(selectedSupportRequest.documents_url);
                                            urls = Array.isArray(parsed) ? parsed : [selectedSupportRequest.documents_url];
                                        } catch { urls = [selectedSupportRequest.documents_url]; }
                                        return urls.length > 0 ? (
                                            <section className="mt-2">
                                                <h4 className="font-bold text-sm text-blue-800 mb-3 uppercase tracking-wider">Supporting Documents</h4>
                                                <div className="space-y-2">
                                                    {urls.map((url: string, idx: number) => (
                                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group">
                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-blue-700 truncate">Document {idx + 1}</p>
                                                                <p className="text-xs text-blue-500 truncate">{decodeURIComponent(url.split('/').pop() || '')}</p>
                                                            </div>
                                                            <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        </a>
                                                    ))}
                                                </div>
                                            </section>
                                        ) : null;
                                    })()}
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                                    <button onClick={() => setSelectedSupportRequest(null)} className="px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 font-bold text-sm shadow-sm transition-all focus:ring-2 focus:ring-teal-500 focus:outline-none focus:ring-offset-1">Close</button>
                                </div>
                            </div>
                        </div>
                        , document.body)}

                    {showSupportModal && createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel">
                                <div className="flex justify-between items-center p-6 border-b shrink-0">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                                        <p className="text-xs text-gray-500">Guihulngan Campus</p>
                                    </div>
                                    <button onClick={() => setShowSupportModal(false)} className="text-gray-400 text-xl hover:text-gray-600">✕</button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-8">
                                    {/* Student Info */}
                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Student Information</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="block text-xs font-bold text-gray-500">Full Name</p><div className="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</div></div>
                                            <div><p className="block text-xs font-bold text-gray-500">Date Filed</p><div className="font-semibold">{new Date().toLocaleDateString()}</div></div>
                                            <div><p className="block text-xs font-bold text-gray-500">Date of Birth</p><div className="font-semibold">{personalInfo.dob}</div></div>
                                            <div><p className="block text-xs font-bold text-gray-500">Program – Year Level</p><div className="font-semibold">{personalInfo.course} - {personalInfo.year}</div></div>
                                            <div><p className="block text-xs font-bold text-gray-500">Cell Phone Number</p><div className="font-semibold">{personalInfo.mobile}</div></div>
                                            <div><p className="block text-xs font-bold text-gray-500">Email Address</p><div className="font-semibold">{personalInfo.email}</div></div>
                                            <div className="col-span-2"><p className="block text-xs font-bold text-gray-500">Home Address</p><div className="font-semibold">{personalInfo.address}</div></div>
                                        </div>
                                    </section>

                                    {/* Category */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Category (Check all that apply)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {['Persons with Disabilities (PWDs)', 'Indigenous Peoples (IPs) & Cultural Communities', 'Working Students', 'Economically Challenged Students', 'Students with Special Learning Needs', 'Rebel Returnees', 'Orphans', 'Senior Citizens', 'Homeless Students', 'Solo Parenting', 'Pregnant Women', 'Women in Especially Difficult Circumstances'].map((cat, idx) => (
                                                <label key={cat} htmlFor={`support-cat-${idx}`} className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"><input id={`support-cat-${idx}`} name={`support-cat-${idx}`} type="checkbox" checked={supportForm.categories.includes(cat)} onChange={(e) => { const newCats = e.target.checked ? [...supportForm.categories, cat] : supportForm.categories.filter((c: any) => c !== cat); setSupportForm({ ...supportForm, categories: newCats }); }} className="w-4 h-4 text-blue-600 rounded shrink-0 mt-0.5" /> {cat}</label>
                                            ))}
                                            <div className="col-span-1 md:col-span-2 flex items-center gap-3 mt-2">
                                                <input id="support-cat-other-check" name="support-cat-other-check" type="checkbox" checked={!!supportForm.otherCategory} readOnly className="w-4 h-4 text-blue-600 rounded shrink-0" />
                                                <label htmlFor="support-other-specify" className="text-sm whitespace-nowrap">Others, specify:</label>
                                                <input id="support-other-specify" name="support-other-specify" value={supportForm.otherCategory} onChange={e => setSupportForm({ ...supportForm, otherCategory: e.target.value })} className="border-b border-gray-300 focus:border-blue-600 outline-none px-2 py-1 text-sm flex-1 min-w-0 bg-transparent" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section A */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">A. Your Studies</h4>
                                        <p className="text-xs text-gray-500 mb-3">Which program(s) did you apply for? (Auto-filled)</p>
                                        <div className="space-y-3">
                                            <div><label htmlFor="support-priority1" className="block text-xs font-bold text-gray-500">1st Priority</label><input id="support-priority1" name="support-priority1" disabled value={personalInfo.priorityCourse} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label htmlFor="support-priority2" className="block text-xs font-bold text-gray-500">2nd Priority</label><input id="support-priority2" name="support-priority2" disabled value={personalInfo.altCourse1} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label htmlFor="support-priority3" className="block text-xs font-bold text-gray-500">3rd Priority</label><input id="support-priority3" name="support-priority3" disabled value={personalInfo.altCourse2} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                        </div>
                                    </section>

                                    {/* Section B */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-2 uppercase tracking-wider">B. Particulars of your disability or special learning need</h4>
                                        <p className="text-xs text-gray-500 mb-4 italic">We would like to gain a better understanding of the kind of support that you may need. However, we might not be able to assist in all the ways that you require, but it might help us with our planning in future.</p>
                                        <div className="space-y-4">
                                            <div><label htmlFor="support-q1" className="block text-xs font-bold text-gray-700 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</label><textarea id="support-q1" name="support-q1" rows={2} value={supportForm.q1} onChange={e => setSupportForm({ ...supportForm, q1: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label htmlFor="support-q2" className="block text-xs font-bold text-gray-700 mb-1">2. What kind of support did you receive at your previous school?</label><textarea id="support-q2" name="support-q2" rows={2} value={supportForm.q2} onChange={e => setSupportForm({ ...supportForm, q2: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label htmlFor="support-q3" className="block text-xs font-bold text-gray-700 mb-1">3. What support or assistance do you require from NORSU–Guihulngan Campus to enable you to fully participate in campus activities...?</label><textarea id="support-q3" name="support-q3" rows={3} value={supportForm.q3} onChange={e => setSupportForm({ ...supportForm, q3: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label htmlFor="support-q4" className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea id="support-q4" name="support-q4" rows={2} value={supportForm.q4} onChange={e => setSupportForm({ ...supportForm, q4: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                        </div>
                                    </section>

                                    <div className="mb-6">
                                        <label htmlFor="support-documents" className="block text-xs font-bold text-gray-700 mb-2">Upload Supporting Documents (Medical/Psychological Proof) — Max 4 files</label>
                                        <input id="support-documents" name="support-documents" type="file" multiple onChange={(e: any) => {
                                            const newFiles = Array.from(e.target.files || []) as File[];
                                            const combined = [...(supportForm.files || []), ...newFiles].slice(0, 4);
                                            setSupportForm({ ...supportForm, files: combined });
                                            e.target.value = '';
                                        }} disabled={(supportForm.files || []).length >= 4} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50" />
                                        <p className="text-[10px] text-gray-400 mt-1">{(supportForm.files || []).length}/4 files selected</p>
                                        {(supportForm.files || []).length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {(supportForm.files || []).map((f: File, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            <span className="text-xs text-gray-700 truncate">{f.name}</span>
                                                            <span className="text-[10px] text-gray-400 flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                                                        </div>
                                                        <button type="button" onClick={() => {
                                                            const updated = (supportForm.files || []).filter((_: any, i: number) => i !== idx);
                                                            setSupportForm({ ...supportForm, files: updated });
                                                        }} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 p-6 border-t border-purple-100/50 shrink-0">
                                    <button onClick={submitSupportRequest} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Application'}</button>
                                    <button onClick={() => setShowSupportModal(false)} className="px-8 py-3 bg-white/80 border border-purple-100/50 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                                </div>
                            </div>
                        </div>
                        , document.body)
                    }
                </div >
            )}

            {/* SCHOLARSHIP VIEW */}
            {
                activeView === 'scholarship' && (
                    <div className="page-transition">
                        <h2 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Scholarship Services</h2>
                        <p className="text-sm text-gray-400 mb-8 animate-fade-in-up">View available scholarships and check your eligibility.</p>
                        {scholarshipsList.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-fade-in-up">
                                <p className="text-gray-400 italic">No scholarships available at the moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {scholarshipsList.map((s: any, idx: number) => {
                                    const isApplied = myApplications.some((app: any) => app.scholarship_id === s.id);
                                    const isExpired = new Date(s.deadline) < new Date();
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => { setSelectedScholarship(s); setShowScholarshipModal(true); }}
                                            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm hover:shadow-lg transition-all card-hover animate-fade-in-up cursor-pointer group"
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={s.title}>{s.title}</h3>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isExpired ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isExpired ? 'Closed' : 'Open'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs text-gray-400">
                                                <span>Deadline: {new Date(s.deadline).toLocaleDateString()}</span>
                                                {isApplied && <span className="font-bold text-blue-600 flex items-center gap-1"><Icons.CheckCircle /> Applied</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Scholarship Details Modal (Redesigned) */}
                        {showScholarshipModal && selectedScholarship && createPortal(
                            <div className="student-mobile-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                                {/* Backdrop */}
                                <div className="animate-backdrop" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setShowScholarshipModal(false)} />

                                {/* Modal */}
                                <div className="animate-scale-in student-mobile-modal-panel" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                                    {/* Header */}
                                    <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{selectedScholarship.title}</h3>
                                                <div className="flex gap-2 mt-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm`}>
                                                        {new Date(selectedScholarship.deadline) < new Date() ? 'Closed' : 'Open'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowScholarshipModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>✕</button>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
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

                                            <div className="grid grid-cols-2 gap-4">
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

                                    {/* Footer */}
                                    <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                                        {myApplications.some((app: any) => app.scholarship_id === selectedScholarship.id) ? (
                                            <button disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <Icons.CheckCircle /> Application Submitted
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { handleApplyScholarship(selectedScholarship); setShowScholarshipModal(false); }}
                                                disabled={new Date(selectedScholarship.deadline) < new Date()}
                                                className="btn-press"
                                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: new Date(selectedScholarship.deadline) < new Date() ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: new Date(selectedScholarship.deadline) < new Date() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: new Date(selectedScholarship.deadline) < new Date() ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}
                                            >
                                                {new Date(selectedScholarship.deadline) < new Date() ? 'Deadline Passed' : 'Apply Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            , document.body)}
                    </div>
                )
            }

            {/* FEEDBACK VIEW - PLACEHOLDER Part 2 */}
            {activeView === 'feedback' && <FeedbackView Icons={Icons} personalInfo={personalInfo} feedbackPrefill={feedbackPrefill} setFeedbackPrefill={setFeedbackPrefill} />}

            {/* PROFILE VIEW - PLACEHOLDER Part 2 */}
            {activeView === 'profile' && renderProfileView(p)}
        </>
    );
}
