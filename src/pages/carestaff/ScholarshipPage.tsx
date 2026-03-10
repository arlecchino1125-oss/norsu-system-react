import React, { useState } from 'react';
import { Plus, Award, Trash2, XCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Scholarship } from '../../types/models';
import { splitFullName } from '../../utils/nameUtils';
import type { CareStaffDashboardFunctions } from './types';

interface ScholarshipApplicantStudent {
    student_id: string;
    first_name?: string | null;
    last_name?: string | null;
    middle_name?: string | null;
    suffix?: string | null;
    sex?: string | null;
    dob?: string | null;
    course?: string | null;
    year_level?: string | null;
    father_name?: string | null;
    father_last_name?: string | null;
    father_given_name?: string | null;
    father_middle_name?: string | null;
    mother_name?: string | null;
    mother_last_name?: string | null;
    mother_given_name?: string | null;
    mother_middle_name?: string | null;
    street?: string | null;
    address?: string | null;
    zip_code?: string | null;
    mobile?: string | null;
    email?: string | null;
    is_pwd?: boolean | null;
    pwd_type?: string | null;
    indigenous_group?: string | null;
}

interface ScholarshipApplicantRecord {
    id: number;
    created_at: string;
    scholarship_id: string | number;
    student_id: string;
    status?: string | null;
    student?: ScholarshipApplicantStudent | null;
}

interface ScholarshipPageProps {
    functions?: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const ScholarshipPage = ({ functions }: ScholarshipPageProps) => {
    const { showToast } = functions || {};

    // Data States from Custom Hook
    const { data: scholarships, loading: loadingScholarships, refetch: fetchScholarships } = useSupabaseData<Scholarship>({
        table: 'scholarships',
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });

    const [loading, setLoading] = useState(false);

    // Modal State
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [showApplicantModal, setShowApplicantModal] = useState(false);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [applicantsError, setApplicantsError] = useState('');

    // Form & Data State
    const [scholarshipForm, setScholarshipForm] = useState<Partial<Scholarship>>({ title: '', description: '', requirements: '', deadline: '' });
    const [applicantsList, setApplicantsList] = useState<ScholarshipApplicantRecord[]>([]);
    const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);

    // Form & Data State
    const handleAddScholarship = async () => {
        if (!scholarshipForm.title || !scholarshipForm.deadline) {
            if (showToast) showToast("Title and Deadline are required.", "error");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('scholarships').insert([{
                ...scholarshipForm
            }]);
            if (error) throw error;
            if (showToast) showToast("Scholarship added successfully!");
            setShowScholarshipModal(false);
            setScholarshipForm({ title: '', description: '', requirements: '', deadline: '' });
            fetchScholarships();
        } catch (err: any) {
            if (showToast) showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchApplicantsByScholarship = async (scholarshipId: string) => {
        const { data, error } = await supabase
            .from('scholarship_applications')
            .select('id, created_at, scholarship_id, student_id, status')
            .eq('scholarship_id', scholarshipId)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const applications = (data || []) as ScholarshipApplicantRecord[];
        const studentIds = [...new Set(applications.map((row) => row.student_id).filter(Boolean))];
        if (studentIds.length === 0) return applications;

        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('student_id, first_name, last_name, middle_name, suffix, sex, dob, course, year_level, father_name, father_last_name, father_given_name, father_middle_name, mother_name, mother_last_name, mother_given_name, mother_middle_name, street, address, zip_code, mobile, email, is_pwd, pwd_type, indigenous_group')
            .in('student_id', studentIds);
        if (studentsError) throw studentsError;

        const studentMap = new Map<string, ScholarshipApplicantStudent>();
        ((students || []) as ScholarshipApplicantStudent[]).forEach((student) => {
            studentMap.set(student.student_id, student);
        });

        return applications.map((application) => ({
            ...application,
            student: studentMap.get(application.student_id) || null
        }));
    };

    const handleViewApplicants = async (scholarship: Scholarship) => {
        if (!scholarship?.id) {
            if (showToast) showToast("Invalid scholarship record.", "error");
            return;
        }
        setSelectedScholarship(scholarship);
        setApplicantsList([]);
        setApplicantsError('');
        setShowApplicantModal(true);
        setApplicantsLoading(true);
        try {
            const rows = await fetchApplicantsByScholarship(scholarship.id);
            setApplicantsList(rows);
        } catch (err: any) {
            setApplicantsError(err.message || 'Failed to fetch applicants.');
            if (showToast) showToast("Failed to fetch applicants: " + err.message, "error");
        } finally {
            setApplicantsLoading(false);
        }
    };

    const toYearLevelCode = (value: any) => {
        const match = String(value || '').match(/\d+/);
        if (!match) return '';
        const parsed = parseInt(match[0], 10);
        return Number.isFinite(parsed) ? parsed : '';
    };

    const toSexCode = (value: any) => {
        if (value === 0 || value === 1) return value;
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized) return '';
        if (normalized.startsWith('m')) return 0;
        if (normalized.startsWith('f')) return 1;
        return '';
    };

    const formatIsoDate = (value: any) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toISOString().slice(0, 10);
    };

    const getStudentLastName = (row: ScholarshipApplicantRecord) => row.student?.last_name || '';
    const getStudentGivenName = (row: ScholarshipApplicantRecord) => row.student?.first_name || '';
    const getStudentMiddleName = (row: ScholarshipApplicantRecord) => row.student?.middle_name || '';
    const getStudentFullName = (row: ScholarshipApplicantRecord) => {
        const student = row.student;
        if (student) {
            return [student.first_name, student.middle_name, student.last_name, student.suffix].filter(Boolean).join(' ');
        }
        return row.student_id;
    };
    const getParentParts = (student: ScholarshipApplicantStudent | null | undefined, prefix: 'father' | 'mother') => {
        const last = student?.[`${prefix}_last_name` as keyof ScholarshipApplicantStudent] as string | null | undefined;
        const given = student?.[`${prefix}_given_name` as keyof ScholarshipApplicantStudent] as string | null | undefined;
        const middle = student?.[`${prefix}_middle_name` as keyof ScholarshipApplicantStudent] as string | null | undefined;

        if (last || given || middle) {
            return {
                last: last || '',
                given: given || '',
                middle: middle || ''
            };
        }

        return splitFullName(student?.[`${prefix}_name` as keyof ScholarshipApplicantStudent] as string | null | undefined);
    };

    const exportApplicantRows = (rowsSource: ScholarshipApplicantRecord[], filenameBase: string) => {
        if (!rowsSource.length) {
            if (showToast) showToast("No applicants to export.", "error");
            return;
        }
        const headers = [
            "SEQ",
            "STUDENT ID",
            "LAST NAME",
            "GIVEN NAME",
            "EXT. NAME",
            "MIDDLE NAME",
            "SEX",
            "BIRTHDATE (yyyy-mm-dd)",
            "COMPLETE PROGRAM NAME",
            "YEAR LEVEL",
            "FATHER LAST NAME",
            "FATHER GIVEN NAME",
            "FATHER MIDDLE NAME",
            "MOTHER LAST NAME",
            "MOTHER GIVEN NAME",
            "MOTHER MIDDLE NAME",
            "STREET & BARANGAY",
            "ZIPCODE",
            "DISABILITY (if applicable)",
            "CONTACT NUMBER",
            "EMAIL ADDRESS",
            "INDIGENOUS PEOPLE GROUP"
        ];
        const rows = rowsSource.map((a, idx) => {
            const student = a.student;
            const fatherName = getParentParts(student, 'father');
            const motherName = getParentParts(student, 'mother');
            const disabilityInfo = student?.is_pwd ? (student.pwd_type || 'PWD') : '';
            return [
                idx + 1,
                a.student_id || '',
                getStudentLastName(a),
                getStudentGivenName(a),
                student?.suffix || '',
                getStudentMiddleName(a),
                toSexCode(student?.sex),
                formatIsoDate(student?.dob),
                student?.course || '',
                toYearLevelCode(student?.year_level),
                fatherName.last || '',
                fatherName.given || '',
                fatherName.middle || '',
                motherName.last || '',
                motherName.given || '',
                motherName.middle || '',
                student?.street || student?.address || '',
                student?.zip_code || '',
                disabilityInfo,
                student?.mobile || '',
                student?.email || '',
                student?.indigenous_group || ''
            ];
        });
        exportToExcel(headers, rows, `${filenameBase}_Applicants`);
    };

    const handleExportApplicants = () => {
        exportApplicantRows(applicantsList, selectedScholarship?.title || 'Scholarship');
    };

    const handleExportApplicantsForScholarship = async (scholarship: Scholarship) => {
        if (!scholarship?.id) {
            if (showToast) showToast("Invalid scholarship record.", "error");
            return;
        }
        setLoading(true);
        try {
            const rows = await fetchApplicantsByScholarship(scholarship.id);
            exportApplicantRows(rows, scholarship.title || 'Scholarship');
        } catch (err: any) {
            if (showToast) showToast("Failed to export applicants: " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteScholarship = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this scholarship?")) return;
        try {
            const { error } = await supabase.from('scholarships').delete().eq('id', id);
            if (error) throw error;
            if (showToast) showToast("Scholarship deleted.");
            fetchScholarships();
        } catch (err: any) {
            if (showToast) showToast(err.message, "error");
        }
    };

    return (
        <div>
            {/* Main Page Content */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage active scholarships and view applicants.</p>
                </div>
                <button onClick={() => setShowScholarshipModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200 transition-all duration-300">
                    <Plus size={14} /> Add Scholarship
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scholarships.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Award size={20} />
                                </div>
                                <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                    Deadline: {s.deadline ? new Date(s.deadline).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{s.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-3 mb-4">{s.description}</p>
                        </div>
                        <div className="pt-4 border-t border-gray-50 flex gap-2">
                            <button onClick={() => handleViewApplicants(s)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition">View Applicants</button>
                            <button onClick={() => handleExportApplicantsForScholarship(s)} className="py-2 px-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition">Export</button>
                            <button onClick={() => s.id && handleDeleteScholarship(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
                {scholarships.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p>No active scholarships found. Click "Add Scholarship" to create one.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showScholarshipModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Add New Scholarship</h3>
                            <button onClick={() => setShowScholarshipModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Scholarship Title</label><input className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.title} onChange={e => setScholarshipForm({ ...scholarshipForm, title: e.target.value })} placeholder="e.g. Academic Excellence 2026" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={scholarshipForm.description} onChange={e => setScholarshipForm({ ...scholarshipForm, description: e.target.value })} placeholder="Overview..." /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Requirements</label><textarea className="w-full border rounded-lg p-2 text-sm" rows={3} value={scholarshipForm.requirements} onChange={e => setScholarshipForm({ ...scholarshipForm, requirements: e.target.value })} placeholder="List requirements..." /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Deadline</label><input type="date" className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.deadline} onChange={e => setScholarshipForm({ ...scholarshipForm, deadline: e.target.value })} /></div>
                            <button onClick={handleAddScholarship} disabled={loading} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition mt-2">{loading ? 'Adding...' : 'Post Scholarship'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showApplicantModal && selectedScholarship && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh] animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Applicants List</h3><p className="text-xs text-gray-500">{selectedScholarship.title}</p></div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleExportApplicants} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition"><Download size={14} /> Export Excel</button>
                                <button onClick={() => setShowApplicantModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
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
        </div>
    );
};

export default ScholarshipPage;
