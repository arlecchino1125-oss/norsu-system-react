import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { getCounselingRequestsPage } from '../../../../../services/deptService';
import { COUNSELING_STATUS, isWithCareStaffCounseling } from '../../../../../utils/workflow';

const HISTORY_PAGE_SIZE = 200;
const HISTORY_PAGE_LIMIT = 10;

const getSafeDateLabel = (value: unknown) => {
    const parsed = new Date(String(value || ''));
    return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleDateString();
};

export function DeptHistoryModal({ showHistoryModal, setShowHistoryModal, selectedHistoryStudent, counselingRequests, setViewFormRecord, setViewFormMode, data }: any) {
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    useEffect(() => {
        if (!showHistoryModal || !selectedHistoryStudent) {
            setHistoryRecords([]);
            setHistoryError('');
            setIsHistoryLoading(false);
            return;
        }

        const department = String(data?.profile?.department || '').trim();
        const studentId = String(selectedHistoryStudent?.student_id || '').trim();
        if (!department || !studentId) {
            return;
        }

        let cancelled = false;
        const loadHistory = async () => {
            setIsHistoryLoading(true);
            setHistoryError('');
            try {
                const allRows: any[] = [];
                let total = 0;

                for (let page = 1; page <= HISTORY_PAGE_LIMIT; page += 1) {
                    const result = await getCounselingRequestsPage(
                        { department, studentId },
                        { page, pageSize: HISTORY_PAGE_SIZE },
                        { column: 'created_at', ascending: false }
                    );
                    const rows = result.rows || [];
                    allRows.push(...rows);
                    total = Number(result.total || rows.length);
                    if (allRows.length >= total || rows.length === 0) break;
                }

                if (!cancelled) {
                    setHistoryRecords(allRows);
                }
            } catch (error: any) {
                if (!cancelled) {
                    setHistoryRecords([]);
                    setHistoryError(String(error?.message || 'Failed to load full case history.'));
                }
            } finally {
                if (!cancelled) setIsHistoryLoading(false);
            }
        };

        void loadHistory();

        return () => {
            cancelled = true;
        };
    }, [data?.profile?.department, selectedHistoryStudent, showHistoryModal]);

    return (<>{/* History Modal */}
            {
                showHistoryModal && selectedHistoryStudent && (() => {
                    const selectedStudentId = String(selectedHistoryStudent?.student_id || '').trim();
                    const selectedStudentName = String(selectedHistoryStudent?.student_name || '').trim().toLowerCase();
                    const fallbackRecords = (counselingRequests || []).filter((r: any) => {
                        const rowStudentId = String(r?.student_id || '').trim();
                        if (selectedStudentId && rowStudentId) return rowStudentId === selectedStudentId;
                        return String(r?.student_name || '').trim().toLowerCase() === selectedStudentName;
                    });
                    const studentRecords = historyRecords.length > 0 ? historyRecords : fallbackRecords;

                    return (
                        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl dark:bg-gray-800">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white">Case History: {selectedHistoryStudent.student_name || 'Student'}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedHistoryStudent.student_id || 'Unavailable'}</p>
                                    </div>
                                    <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                    {isHistoryLoading && <p className="text-center text-gray-400 py-4">Loading full case history...</p>}
                                    {historyError && <p className="text-center text-rose-500 py-4">{historyError}</p>}
                                    {studentRecords.map((record: any, i: any) => (
                                        <div key={record?.id || i} className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                                            <div className="mb-1 flex justify-between">
                                                <span className="font-bold text-gray-900 dark:text-white">{record.request_type || 'Counseling request'}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{getSafeDateLabel(record.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">{record.reason_for_referral || record.description}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${record.status === COUNSELING_STATUS.COMPLETED ? 'bg-green-100 text-green-700' : record.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'bg-indigo-100 text-indigo-700' : isWithCareStaffCounseling(record.status) ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>{record.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'With CARE Staff' : record.status}</span>
                                            {/* Per-record action buttons */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button onClick={() => { setViewFormRecord(record); setViewFormMode('student'); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">View Student Form</button>
                                                {record.referred_by && (
                                                        <button onClick={() => { setViewFormRecord(record); setViewFormMode('referral'); }} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200">View Forwarded Form</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!isHistoryLoading && studentRecords.length === 0 && <p className="text-center text-gray-400 py-4">No records found.</p>}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }</>);}

