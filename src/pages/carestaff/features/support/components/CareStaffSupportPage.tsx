import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../../../lib/supabase';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { loadJsPdf } from '../../../../../lib/exportVendors';
import {
    FileText, CheckCircle, Send, AlertTriangle,
    Filter, ClipboardList, GraduationCap, XCircle, Download, Paperclip, RefreshCw
} from 'lucide-react';
import StatusBadge from '../../../../../components/StatusBadge';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import { formatDate, generateExportFilename } from '../../../../../utils/formatters';
import { buildStudentAddress } from '../../../../../utils/studentFields';
import {
    getStoredAssetEntries,
    openStoredAsset
} from '../../../../../utils/storageAssets';
import type { CareStaffDashboardFunctions } from '../../../types';
import {
    CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES,
    SUPPORT_STATUS,
    isCareStaffSupportDeptUpdate
} from '../../../../../utils/workflow';
import PaginationControls from '../../../../../components/PaginationControls';
import { Button } from '../../../../../components/ui/Button';
import { useCareStaffSupport, SUPPORT_DOCUMENT_ACCEPT, SUPPORT_REQUESTS_PAGE_SIZE } from '../hooks/useCareStaffSupport';
import type { CareStaffSupportPageProps } from '../hooks/useCareStaffSupport';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } }
} as const;

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
} as const;

const CareStaffSupportPage = ({ functions, refreshSignal = 0 }: CareStaffSupportPageProps) => {
    const {
        showToast,
        lastExternalRefreshSignalRef,
        sortSupportByCreatedAt,
        supportReqs,
        setSupportReqs,
        supportTotal,
        setSupportTotal,
        supportCounts,
        setSupportCounts,
        currentPage,
        setCurrentPage,
        supportLoading,
        refreshTick,
        setRefreshTick,
        supportTab,
        setSupportTab,
        supportCategory,
        setSupportCategory,
        isRefreshingData,
        setIsRefreshingData,
        showSupportModal,
        setShowSupportModal,
        selectedSupportReq,
        setSelectedSupportReq,
        supportForm,
        setSupportForm,
        selectedStudent,
        setSelectedStudent,
        letterFile,
        setLetterFile,
        isForwardingSupport,
        setIsForwardingSupport,
        isFinalizingSupport,
        setIsFinalizingSupport,
        invokeManagedCareServicesFunction,
        queueProcessEmailNotification,
        parseDeptNotes,
        supportTabs,
        matchesSupportTab,
        visibleSupportReqs,
        applySupportTabFilter,
        applySupportCategoryFilter,
        handleRefreshData,
        openSupportModal,
        handleForwardSupport,
        handleLetterFileChange,
        handleFinalizeSupport,
        handlePrintSupport,
        renderDetailedDescription
    } = useCareStaffSupport({ functions, refreshSignal });

    return (
        <>
            <div>
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <ClipboardList size={24} className="text-purple-600" />
                            <h1 className="text-2xl font-bold text-gray-900">Additional Support Management</h1>
                        </div>
                        <p className="text-gray-500 text-sm">Manage and respond to student support requests across all categories</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        isLoading={isRefreshingData}
                        leftIcon={<RefreshCw size={16} />}
                        className="shadow-sm hover:text-purple-600"
                    >
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>

                {/* Stats Row */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8"
                >
                    {[
                        { label: 'Submitted', value: supportCounts[SUPPORT_STATUS.SUBMITTED] || 0, icon: <FileText size={24} />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-200/50' },
                        { label: 'Forwarded to Dept', value: supportCounts[SUPPORT_STATUS.FORWARDED_TO_DEPT] || 0, icon: <Send size={24} />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-200/50' },
                        { label: 'Visit Scheduled', value: supportCounts[SUPPORT_STATUS.VISIT_SCHEDULED] || 0, icon: <AlertTriangle size={24} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-200/50' },
                        { label: 'Dept Updates', value: supportCounts.dept_updates || 0, icon: <ClipboardList size={24} />, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-200/50' },
                        { label: 'Completed', value: supportCounts[SUPPORT_STATUS.COMPLETED] || 0, icon: <CheckCircle size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-200/50' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            className={`bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 border ${stat.border} shadow-sm relative overflow-hidden`}
                        >
                            <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-60 pointer-events-none`}></div>
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Tabs */}
                <div className="bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-full p-1.5 flex items-center justify-start gap-1 mb-8 overflow-x-auto max-w-fit shadow-sm relative z-10">
                    <AnimatePresence>
                        {supportTabs.map((tab) => {
                            const isActive = supportTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSupportTab(tab.id)}
                                    className={`relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors z-10 ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="supportTabBubble"
                                            className="absolute inset-0 bg-purple-600 rounded-full -z-10 shadow-md shadow-purple-200"
                                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab.label} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span></span>
                                </button>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-3 mb-8 bg-white/80 backdrop-blur-xl p-3 px-4 rounded-2xl border border-gray-200/60 w-fit shadow-sm">
                    <Filter size={18} className="text-gray-400" />
                    <select value={supportCategory} onChange={e => setSupportCategory(e.target.value)} className="text-sm font-bold text-gray-700 focus:outline-none bg-transparent cursor-pointer">
                        {['All', 'Working Student Support', 'Indigenous Persons Support', 'Orphan Support', 'Financial Hardship'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {supportLoading ? (
                    <LoadingSkeleton type="card" count={4} />
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                    >
                        <AnimatePresence>
                            {visibleSupportReqs.map(req => (
                                <motion.div
                                    key={req.id}
                                    variants={itemVariants}
                                    layout
                                    whileHover={{ scale: 1.01, y: -2 }}
                                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                    className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-gray-200/60 shadow-sm flex flex-col justify-between group overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-2xl flex items-center justify-center shadow-inner border border-purple-100/50">
                                                    <GraduationCap size={24} className="text-purple-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{req.student_name}</h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-sm text-gray-500 font-medium">{req.student_id}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-sm text-gray-500 font-medium">{formatDate(req.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <StatusBadge status={req.status} className="!text-sm !px-3 !py-1.5 shadow-sm" />
                                        </div>

                                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-6">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Support Categories</p>
                                            <div className="flex flex-wrap gap-2">
                                                {req.support_type ? req.support_type.split(', ').map((cat: string, i: number) => (
                                                    <span key={i} className="bg-white shadow-sm border border-gray-200/60 px-3 py-1 rounded-lg text-xs font-semibold text-gray-700">{cat}</span>
                                                )) : <span className="text-sm text-gray-500">None specified</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2 relative z-10">
                                        <Button
                                            variant="primary"
                                            onClick={() => openSupportModal(req)}
                                            leftIcon={<ClipboardList size={18} />}
                                            className="w-full !py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !shadow-lg hover:!shadow-purple-400/30 !transition-all !duration-300 !rounded-2xl text-base"
                                        >
                                            Manage Request
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
                {!supportLoading && visibleSupportReqs.length === 0 && <p className="text-center text-gray-500 py-8">No requests found in this stage.</p>}
                <div className="mt-6 rounded-xl border border-gray-100 shadow-sm">
                    <PaginationControls
                        page={currentPage}
                        pageSize={SUPPORT_REQUESTS_PAGE_SIZE}
                        total={supportTotal}
                        isLoading={supportLoading || isRefreshingData}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            {/* Support Modal - Enhanced Overlay */}
            <AnimatePresence>
                {showSupportModal && selectedSupportReq && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-transparent" onClick={() => setShowSupportModal(false)}></div>
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative bg-white/95 backdrop-blur-xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col rounded-[2.5rem] overflow-hidden border border-white/20"
                        >
                            <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div>
                                    <h3 className="font-bold text-2xl text-gray-900 tracking-tight">Support Application</h3>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">Review details and take action</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="secondary" onClick={handlePrintSupport} className="!rounded-xl !p-2.5 !bg-gray-50 hover:!bg-gray-100 hover:text-blue-600 shadow-sm border-gray-200 transition-colors" title="Print Application"><Download size={20} /></Button>
                                    <Button variant="ghost" onClick={() => setShowSupportModal(false)} className="!rounded-full !p-2 !text-gray-400 hover:!text-gray-600 hover:bg-gray-100 transition-colors"><XCircle size={24} /></Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth pb-12">
                                {/* Student Information Section */}
                                <section className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100/80 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                                    <h4 className="font-bold text-sm text-purple-600 mb-5 uppercase tracking-widest flex items-center gap-2 relative z-10">
                                        <GraduationCap size={16} /> Student Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm relative z-10">
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label><div className="font-semibold text-gray-900 text-base">{selectedSupportReq.student_name}</div></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date Filed</label><div className="font-semibold text-gray-900 text-base">{formatDate(selectedSupportReq.created_at)}</div></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date of Birth</label><div className="font-semibold text-gray-900 text-base">{selectedStudent?.dob || '-'}</div></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Program — Year</label><div className="font-semibold text-gray-900 text-base">{selectedSupportReq.course_year || `${selectedStudent?.course || '-'} - ${selectedStudent?.year_level || '-'}`}</div></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile</label><div className="font-semibold text-gray-900 text-base">{selectedStudent?.mobile || '-'}</div></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label><div className="font-semibold text-gray-900 text-base">{selectedStudent?.email || '-'}</div></div>
                                        <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Home Address</label><div className="font-semibold text-gray-900 text-base">{buildStudentAddress(selectedStudent) || '-'}</div></div>
                                    </div>
                                </section>

                                {/* Section A: Studies */}
                                <section>
                                    <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.priority_course || 'N/A'}</span></div>
                                        <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.alt_course_1 || 'N/A'}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.alt_course_2 || 'N/A'}</span></div>
                                    </div>
                                </section>

                                {/* Categories & Particulars */}
                                <section>
                                    <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">B. Particulars of Need</h4>
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-gray-600 mb-1">Categories:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedSupportReq.support_type ? selectedSupportReq.support_type.split(', ').map((cat: string, i: number) => (
                                                <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">{cat}</span>
                                            )) : <span className="text-xs text-gray-400">None</span>}
                                        </div>
                                    </div>
                                    {renderDetailedDescription(selectedSupportReq.description)}
                                    {selectedSupportReq.documents_url && (() => {
                                        const urls = getStoredAssetEntries(selectedSupportReq.documents_url);
                                        return urls.length > 0 ? (
                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1"><Paperclip size={12} /> Supporting Documents ({urls.length})</p>
                                                {urls.map((url: string, idx: number) => (
                                                    <Button
                                                        key={idx}
                                                        variant="ghost"
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await openStoredAsset('support_documents', url, 300, {
                                                                    category: 'support-student',
                                                                    requestId: Number(selectedSupportReq.id),
                                                                    index: idx
                                                                });
                                                            } catch (error: any) {
                                                                showToast?.(error.message || 'Unable to open the selected document.', 'error');
                                                            }
                                                        }}
                                                        leftIcon={<Download size={14} className="flex-shrink-0" />}
                                                        className="w-full !justify-start !py-1 !text-left text-sm font-medium !text-blue-700 hover:!text-blue-900 hover:underline !rounded-none !bg-transparent"
                                                    >
                                                        <span className="truncate">Document {idx + 1} — {decodeURIComponent(url.split('/').pop() || 'file')}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : null;
                                    })()}
                                </section>


                                {/* Action Section */}
                                <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-sm text-gray-700 mb-4 uppercase tracking-wider">Staff Actions</h4>

                                    {selectedSupportReq.status === SUPPORT_STATUS.SUBMITTED && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">CARE Staff Notes (For Dean)</label>
                                            <textarea rows={3} value={supportForm.care_notes} onChange={e => setSupportForm({ ...supportForm, care_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add endorsement notes..."></textarea>
                                            <div className="mt-3">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Attach Endorsement Letter (Optional)</label>
                                                <input type="file" accept={SUPPORT_DOCUMENT_ACCEPT} onChange={handleLetterFileChange} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                                                {letterFile && (
                                                    <div className="flex items-center gap-2 mt-1.5 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5">
                                                        <Paperclip size={12} className="text-yellow-600" />
                                                        <span className="text-xs text-gray-700 truncate flex-1">{letterFile.name}</span>
                                                        <Button variant="ghost" size="sm" type="button" onClick={() => setLetterFile(null)} className="!text-red-400 hover:!text-red-600 !p-0"><XCircle size={14} /></Button>
                                                    </div>
                                                )}
                                            </div>
                                            <Button variant="primary" disabled={isForwardingSupport} isLoading={isForwardingSupport} onClick={handleForwardSupport} className="w-full mt-3 !bg-yellow-500 hover:!bg-yellow-600 !py-2 !rounded-lg !shadow-none">{isForwardingSupport ? 'Forwarding...' : 'Forward to Dean'}</Button>
                                        </div>
                                    )}

                                    {selectedSupportReq.status === SUPPORT_STATUS.FORWARDED_TO_DEPT && (
                                        <div className="text-center text-sm text-gray-500 italic py-4">Waiting for Dean review...</div>
                                    )}

                                    {selectedSupportReq.status === SUPPORT_STATUS.VISIT_SCHEDULED && (() => {
                                        const deptUpdate = parseDeptNotes(selectedSupportReq.dept_notes);
                                        return (
                                            <div className="space-y-4">
                                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Department Visit Scheduled</p>
                                                    <p className="text-sm text-blue-900">
                                                        {deptUpdate?.scheduled_date || 'Schedule pending'}
                                                    </p>
                                                    {deptUpdate?.approval_notes && (
                                                        <p className="text-sm text-blue-800 mt-2 whitespace-pre-wrap">{deptUpdate.approval_notes}</p>
                                                    )}
                                                </div>
                                                <div className="text-center text-sm text-gray-500 italic py-2">
                                                    Waiting for the department visit outcome before CARE Staff completes the case.
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {(selectedSupportReq.status === SUPPORT_STATUS.APPROVED || selectedSupportReq.status === SUPPORT_STATUS.REJECTED) && (
                                        <div>
                                            <div className={`p-3 rounded-lg mb-3 ${selectedSupportReq.status === SUPPORT_STATUS.APPROVED ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                                <p className="text-xs font-bold uppercase">Dean's Decision: {selectedSupportReq.status}</p>
                                                <p className="text-sm mt-1">{selectedSupportReq.dept_notes || 'No notes provided.'}</p>
                                            </div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                            <textarea rows={3} value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                            <Button variant="primary" disabled={isFinalizingSupport} isLoading={isFinalizingSupport} onClick={handleFinalizeSupport} className="w-full mt-2 !bg-green-600 hover:!bg-green-700 !py-2 !rounded-lg !shadow-none">{isFinalizingSupport ? 'Completing...' : 'Notify Student & Complete'}</Button>
                                        </div>
                                    )}

                                    {(selectedSupportReq.status === SUPPORT_STATUS.REFERRED_TO_CARE || selectedSupportReq.status === SUPPORT_STATUS.RESOLVED_BY_DEPT) && (() => {
                                        let referral: any = null;
                                        try { referral = JSON.parse(selectedSupportReq.dept_notes); } catch { /* not JSON */ }
                                        return (
                                            <div>
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
                                                    <h5 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Send size={14} /> Department Referral Report
                                                    </h5>
                                                    {referral ? (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Referred By</p>
                                                                    <p className="text-sm font-semibold text-gray-900">{referral.referred_by || '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Date Acted / Visit Date</p>
                                                                    <p className="text-sm font-semibold text-gray-900">{referral.date_acted || '-'}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Actions Taken During Visit</p>
                                                                <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{referral.actions_taken || 'None provided'}</p>
                                                            </div>
                                                            {referral.comments && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Other Comments / Observations</p>
                                                                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{referral.comments}</p>
                                                                </div>
                                                            )}
                                                            {referral.signature && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Signature</p>
                                                                    <div className="bg-white p-2 rounded-lg border border-gray-200 inline-block">
                                                                        <img src={referral.signature} alt="Referrer Signature" className="max-h-20" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-600">{selectedSupportReq.dept_notes || 'No referral details provided.'}</p>
                                                    )}
                                                </div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                                <textarea rows={3} value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                                <Button variant="primary" disabled={isFinalizingSupport} isLoading={isFinalizingSupport} onClick={handleFinalizeSupport} className="w-full mt-2 !bg-green-600 hover:!bg-green-700 !py-2 !rounded-lg !shadow-none">{isFinalizingSupport ? 'Completing...' : 'Notify Student & Complete'}</Button>
                                            </div>
                                        );
                                    })()}

                                    {selectedSupportReq.status === SUPPORT_STATUS.COMPLETED && (
                                        <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded"><CheckCircle size={12} className="inline mr-1" /> Request Resolved</p>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CareStaffSupportPage;

