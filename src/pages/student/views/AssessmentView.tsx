import React, { lazy, Suspense } from 'react';

const AssessmentFormModal = lazy(() => import('../forms/AssessmentFormModal'));

export default function AssessmentView({
    loadingForm,
    formsList,
    completedForms,
    openAssessmentForm,
    showAssessmentModal,
    activeForm,
    personalInfo,
    setShowAssessmentModal,
    onAssessmentSubmitted,
    showSuccessModal,
    setShowSuccessModal,
    showToast,
    Icons
}: any) {
    return (
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 page-transition">
            <div>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Needs Assessment Tool</h2>
                <p className="text-sm text-gray-400 mb-6 sm:mb-8 animate-fade-in-up">Complete the inventory to help us understand your needs and provide better support.</p>
            </div>
            {loadingForm ? (
                <div className="flex items-center justify-center py-16 sm:py-20">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="ml-3 text-gray-400 text-sm">Loading forms...</p>
                </div>
            ) : formsList.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 sm:p-12 shadow-sm text-center card-hover animate-fade-in-up">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-gray-500 font-medium">No assessment forms are currently available.</p>
                    <p className="text-xs text-gray-400 mt-1">Check back later for new assessments from the care staff.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formsList.map((form: any, idx: number) => {
                        const isDone = completedForms.has(form.id);
                        return (
                            <button
                                key={form.id}
                                onClick={() => openAssessmentForm(form)}
                                disabled={isDone}
                                className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-5 sm:p-6 shadow-sm transition-all text-left group animate-fade-in-up ${isDone ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-blue-100/50 hover:shadow-lg hover:border-blue-200 cursor-pointer card-hover'}`}
                                style={{ animationDelay: `${idx * 80}ms` }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isDone ? 'bg-gray-400 shadow-gray-400/20' : 'bg-gradient-to-br from-blue-500 to-sky-400 shadow-blue-500/20'}`}>
                                        <Icons.Assessment />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'text-gray-500 bg-gray-100' : 'text-emerald-600 bg-emerald-50'}`}>
                                        {isDone ? 'Completed' : 'Active'}
                                    </span>
                                </div>
                                <h3 className={`font-bold text-sm mb-4 transition-colors ${isDone ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>{form.title}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span>📅 {new Date(form.created_at).toLocaleDateString()}</span>
                                </div>
                                {!isDone && <div className="mt-4 text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Open details →</div>}
                            </button>
                        );
                    })}
                </div>
            )}

            {showAssessmentModal && activeForm && (
                <Suspense fallback={null}>
                    <AssessmentFormModal
                        form={activeForm}
                        isOpen={showAssessmentModal}
                        studentId={personalInfo.studentId}
                        onClose={() => setShowAssessmentModal(false)}
                        onSubmitted={onAssessmentSubmitted}
                        showToast={showToast}
                    />
                </Suspense>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-sm p-6 sm:p-8 shadow-2xl text-center border border-purple-100/50 animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Assessment Submitted!</h3>
                        <p className="text-sm text-gray-500 mb-6">Thank you for completing the assessment. Your responses have been recorded and will be used to provide you with better support.</p>
                        <button onClick={() => setShowSuccessModal(false)} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}
