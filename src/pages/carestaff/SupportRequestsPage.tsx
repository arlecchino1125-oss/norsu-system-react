import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    FileText, CheckCircle, Send, AlertTriangle,
    Filter, ClipboardList, GraduationCap, XCircle, Download, Paperclip
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { jsPDF } from 'jspdf';

const SupportRequestsPage = ({ functions }: any) => {
    const { showToast } = functions || {};

    // Data State
    const [supportReqs, setSupportReqs] = useState<any[]>([]);
    const [supportTab, setSupportTab] = useState<string>('queue');
    const [supportCategory, setSupportCategory] = useState<string>('All');

    // Modal State
    const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
    const [selectedSupportReq, setSelectedSupportReq] = useState<any>(null);
    const [supportForm, setSupportForm] = useState<any>({ care_notes: '', resolution_notes: '' });
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // Fetch data
    const fetchSupport = async () => {
        try {
            const { data, error } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setSupportReqs(data || []);
        } catch (error: any) {
            console.error('Error fetching support requests:', error);
            showToast?.('Failed to load support requests', 'error');
        }
    };

    useEffect(() => {
        fetchSupport();

        const channel = supabase.channel('care_support_isolated')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, (payload: any) => {
                fetchSupport();
                if (payload.eventType === 'INSERT') {
                    showToast?.(`New Support Request Received`, 'info');
                } else if (payload.eventType === 'UPDATE') {
                    showToast?.(`Support Request Updated`, 'info');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Handlers
    const openSupportModal = async (req: any) => {
        setSelectedSupportReq(req);
        setSupportForm({ care_notes: req.care_notes || '', resolution_notes: req.resolution_notes || '' });
        setSelectedStudent(null);
        if (req.student_id) {
            const { data } = await supabase.from('students').select('*').eq('student_id', req.student_id).maybeSingle();
            setSelectedStudent(data);
        }
        setShowSupportModal(true);
    };

    const handleForwardSupport = async () => {
        if (!supportForm.care_notes) { showToast?.("Please add notes for Dept Head.", 'error'); return; }
        try {
            await supabase.from('support_requests').update({ status: 'Forwarded to Dept', care_notes: supportForm.care_notes }).eq('id', selectedSupportReq.id);
            showToast?.("Request forwarded to Department Head.", 'success');
            setShowSupportModal(false);
            fetchSupport();
        } catch (err: any) { showToast?.(err.message, 'error'); }
    };

    const handleFinalizeSupport = async () => {
        if (!supportForm.resolution_notes) { showToast?.("Please add resolution notes.", 'error'); return; }
        try {
            await supabase.from('support_requests').update({ status: 'Completed', resolution_notes: supportForm.resolution_notes }).eq('id', selectedSupportReq.id);
            await supabase.from('notifications').insert([{ student_id: selectedSupportReq.student_id, message: `Your support request regarding ${selectedSupportReq.support_type} has been updated.` }]);
            showToast?.("Request completed and student notified.", 'success');
            setShowSupportModal(false);
            fetchSupport();
        } catch (err: any) { showToast?.(err.message, 'error'); }
    };

    const handlePrintSupport = () => {
        const doc = new jsPDF({ format: 'legal' });
        const req = selectedSupportReq;
        const student = selectedStudent;
        const pageW = doc.internal.pageSize.getWidth();

        const marginTop = 25.4;
        const marginLeft = 38.1;
        const marginRight = 25.4;
        const contentW = pageW - marginLeft - marginRight;

        // Header
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('Kagawasan Avenue, Dumaguete City', marginLeft, marginTop);
        doc.text('Phone: (63) (35) 522-5050    Fax: 225-4751    Email: norsu@norsu.edu.ph', marginLeft, marginTop + 3);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('OFFICE OF THE CAMPUS STUDENT AFFAIRS AND SERVICES,', marginLeft + contentW / 2, marginTop + 10, { align: 'center' });
        doc.text('GUIHULNGAN CAMPUS', marginLeft + contentW / 2, marginTop + 15, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT', marginLeft + contentW / 2, marginTop + 24, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        let y = marginTop + 32;

        const drawFieldRow = (label: any, value: any, x: any, fieldW: any, yPos: any) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(label, x, yPos);
            const labelW = doc.getTextWidth(label) + 2;
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || ''), x + labelW, yPos);
            doc.setDrawColor(0, 0, 0);
            doc.line(x + labelW, yPos + 1, x + fieldW, yPos + 1);
        };

        const halfW = contentW / 2 - 4;
        const rightX = marginLeft + halfW + 8;

        drawFieldRow('Full Name:', req.student_name || '', marginLeft, halfW, y);
        drawFieldRow('Date Filed:', req.created_at ? new Date(req.created_at).toLocaleDateString() : '', rightX, halfW, y);
        y += 7;
        drawFieldRow('Date of Birth:', student?.dob || '', marginLeft, halfW, y);
        drawFieldRow('Program-Year Level:', `${student?.course || ''} ${student?.year_level ? '- ' + student.year_level : ''}`.trim(), rightX, halfW, y);
        y += 7;
        drawFieldRow('Cell Phone Number:', student?.mobile || '', marginLeft, halfW, y);
        y += 7;
        drawFieldRow('Email Address:', student?.email || '', marginLeft, halfW, y);
        y += 7;
        drawFieldRow('Home Address:', student?.address || '', marginLeft, contentW, y);
        y += 9;

        // Category Section
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Category (check all that apply):', marginLeft, y);
        y += 5;

        const allCategories = [
            'Persons with Disabilities (PWDs)', 'Indigenous Peoples (IPs) & Cultural Communities',
            'Working Students', 'Economically Challenged Students',
            'Students with Special Learning Needs', 'Rebel Returnees',
            'Orphans', 'Senior Citizens', 'Homeless Students', 'Solo Parenting',
            'Pregnant Women', 'Women in Especially Difficult Circumstances',
        ];

        const selectedCats = (req.support_type || '').split(', ').map((c: any) => c.trim());
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const catColW = contentW / 2;

        allCategories.forEach((cat: string, i: number) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = marginLeft + col * catColW;
            const cy = y + row * 5;
            const isChecked = selectedCats.some((sc: any) => cat.toLowerCase().includes(sc.toLowerCase()) || sc.toLowerCase().includes(cat.toLowerCase()));

            doc.setDrawColor(0, 0, 0);
            if (isChecked) {
                doc.setFillColor(0, 0, 0);
                doc.rect(cx, cy - 3, 3, 3, 'FD');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text('✓', cx + 0.5, cy - 0.5);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            } else {
                doc.setFillColor(255, 255, 255);
                doc.rect(cx, cy - 3, 3, 3, 'FD');
            }
            doc.text(cat, cx + 5, cy);
        });

        const otherRow = Math.ceil(allCategories.length / 2);
        y += otherRow * 5 + 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Action Taken:', marginLeft, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${req.status}`, marginLeft + 25, y);
        y += 6;
        if (req.care_notes) {
            doc.text(`CARE Notes: ${req.care_notes}`, marginLeft, y);
            y += 6;
        }
        if (req.dept_notes) {
            doc.text(`Dept Head Notes: ${req.dept_notes}`, marginLeft, y);
            y += 6;
        }
        if (req.resolution_notes) {
            doc.text(`Final Resolution: ${req.resolution_notes}`, marginLeft, y);
            y += 6;
        }

        const footerY = doc.internal.pageSize.getHeight() - 25.4;
        doc.setFontSize(6);
        doc.setDrawColor(200, 200, 200);
        doc.line(marginLeft, footerY, marginLeft + contentW, footerY);
        doc.text('Generated by NORSU CARE System', marginLeft, footerY + 4);
        doc.text('Page 1 of 1', marginLeft + contentW, footerY + 4, { align: 'right' });

        doc.save(`Additional_Support_${(req.student_name || 'unknown').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast?.('Support form downloaded successfully!', 'success');
    };

    const renderDetailedDescription = (desc: any) => {
        if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
        const q1Index = desc.indexOf('[Q1 Description]:');
        if (q1Index === -1) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{desc}</p>;

        const getPart = (key: string, nextKey: string | null) => {
            const start = desc.indexOf(key);
            if (start === -1) return null;
            let end = nextKey ? desc.indexOf(nextKey) : -1;
            if (end === -1) end = desc.length;
            return desc.substring(start + key.length, end).trim();
        };

        const q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
        const q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
        const q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
        const q4 = getPart('[Q4 Other Needs]:', null);

        return (
            <div className="space-y-4 mt-3">
                {q1 && <div><p className="text-xs font-bold text-gray-600 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q1}</p></div>}
                {q2 && <div><p className="text-xs font-bold text-gray-600 mb-1">2. What kind of support did you receive at your previous school?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q2}</p></div>}
                {q3 && <div><p className="text-xs font-bold text-gray-600 mb-1">3. What support or assistance do you require from NORSU to fully participate in campus activities?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q3}</p></div>}
                {q4 && <div><label className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea rows={2} readOnly value={q4 || ''} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700"></textarea></div>}
            </div>
        );
    };

    return (
        <>
            <div>
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <ClipboardList size={24} className="text-purple-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Additional Support Management</h1>
                    </div>
                    <p className="text-gray-500 text-sm">Manage and respond to student support requests across all categories</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'New Requests', value: supportReqs.filter(r => r.status === 'Submitted').length, icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'With Dept Head', value: supportReqs.filter(r => r.status === 'Forwarded to Dept').length, icon: <Send size={20} />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                        { label: 'Action Needed', value: supportReqs.filter(r => r.status === 'Approved' || r.status === 'Rejected').length, icon: <AlertTriangle size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
                        { label: 'Completed', value: supportReqs.filter(r => r.status === 'Completed').length, icon: <CheckCircle size={20} />, color: 'text-green-500', bg: 'bg-green-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3 ${stat.color}`}>{stat.icon}</div>
                            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="bg-gray-100 rounded-full p-1 flex items-center justify-start gap-2 mb-6 overflow-x-auto max-w-fit">
                    <button onClick={() => setSupportTab('queue')} className={`px-6 py-2 rounded-full text-sm font-bold transition ${supportTab === 'queue' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Request Queue ({supportReqs.filter(r => r.status !== 'Approved' && r.status !== 'Completed' && r.status !== 'Rejected').length})</button>
                    <button onClick={() => setSupportTab('approved')} className={`px-6 py-2 rounded-full text-sm font-bold transition ${supportTab === 'approved' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Approved / Monitoring ({supportReqs.filter(r => r.status === 'Approved' || r.status === 'Completed' || r.status === 'Rejected').length})</button>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-xl border border-gray-100 w-fit">
                    <Filter size={16} className="text-gray-400" />
                    <select value={supportCategory} onChange={e => setSupportCategory(e.target.value)} className="text-xs font-bold text-gray-700 focus:outline-none bg-transparent">
                        {['All', 'Working Student Support', 'Indigenous Persons Support', 'Orphan Support', 'Financial Hardship'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {supportReqs
                        .filter(req => {
                            if (supportTab === 'queue') return req.status !== 'Approved' && req.status !== 'Completed' && req.status !== 'Rejected';
                            return req.status === 'Approved' || req.status === 'Completed' || req.status === 'Rejected';
                        })
                        .filter(req => supportCategory === 'All' || (req.support_type && req.support_type.includes(supportCategory)))
                        .map(req => (
                            <div key={req.id} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-100/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200/50"><GraduationCap size={18} className="text-white" /></div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{req.student_name}</h4>
                                                <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()} • {req.student_id}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium mb-2">{req.support_type}</p>
                                </div>
                                <div className="flex gap-3 border-t border-gray-100/50 pt-4 mt-auto">
                                    <button onClick={() => openSupportModal(req)} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01]"><ClipboardList size={16} /> Manage Request</button>
                                </div>
                            </div>
                        ))}
                </div>
                {supportReqs.length === 0 && <p className="text-center text-gray-500 py-8">No requests found.</p>}
            </div>

            {/* Support Modal - Enhanced Side Panel */}
            {showSupportModal && selectedSupportReq && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop" onClick={() => setShowSupportModal(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl shadow-purple-900/10 flex flex-col animate-slide-in-right">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 gradient-text">Support Application</h3>
                                <p className="text-xs text-gray-500 mt-1">Review details and take action</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrintSupport} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-blue-600 transition" title="Print Application"><Download size={16} /></button>
                                <button onClick={() => setShowSupportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Student Information Section */}
                            <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm text-purple-600 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Student Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold text-gray-900">{selectedSupportReq.student_name}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold text-gray-900">{new Date(selectedSupportReq.created_at).toLocaleDateString()}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold text-gray-900">{selectedStudent?.dob || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Program — Year</label><div className="font-semibold text-gray-900">{selectedStudent?.course || '-'} - {selectedStudent?.year_level || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Mobile</label><div className="font-semibold text-gray-900">{selectedStudent?.mobile || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Email</label><div className="font-semibold text-gray-900">{selectedStudent?.email || '-'}</div></div>
                                    <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold text-gray-900">{selectedStudent?.address || '-'}</div></div>
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
                                {selectedSupportReq.documents_url && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                        <a href={selectedSupportReq.documents_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline font-bold flex items-center gap-2"><Paperclip size={14} /> View Supporting Documents</a>
                                    </div>
                                )}
                            </section>

                            {/* Action Section */}
                            <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-700 mb-4 uppercase tracking-wider">Staff Actions</h4>

                                {selectedSupportReq.status === 'Submitted' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">CARE Staff Notes (For Dept Head)</label>
                                        <textarea rows={3} value={supportForm.care_notes} onChange={e => setSupportForm({ ...supportForm, care_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add endorsement notes..."></textarea>
                                        <button onClick={handleForwardSupport} className="w-full mt-2 bg-yellow-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-yellow-600">Forward to Dept Head</button>
                                    </div>
                                )}

                                {selectedSupportReq.status === 'Forwarded to Dept' && (
                                    <div className="text-center text-sm text-gray-500 italic py-4">Waiting for Department Head review...</div>
                                )}

                                {(selectedSupportReq.status === 'Approved' || selectedSupportReq.status === 'Rejected') && (
                                    <div>
                                        <div className={`p-3 rounded-lg mb-3 ${selectedSupportReq.status === 'Approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            <p className="text-xs font-bold uppercase">Dept Head Decision: {selectedSupportReq.status}</p>
                                            <p className="text-sm mt-1">{selectedSupportReq.dept_notes || 'No notes provided.'}</p>
                                        </div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                        <textarea rows={3} value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                        <button onClick={handleFinalizeSupport} className="w-full mt-2 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700">Notify Student & Complete</button>
                                    </div>
                                )}

                                {selectedSupportReq.status === 'Completed' && (
                                    <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded"><CheckCircle size={12} className="inline mr-1" /> Request Resolved</p>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SupportRequestsPage;
