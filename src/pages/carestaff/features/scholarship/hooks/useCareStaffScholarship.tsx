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


export interface ScholarshipApplicantStudent {
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

export interface ScholarshipApplicantRecord {
    id: number;
    created_at: string;
    scholarship_id: string | number;
    student_id: string;
    status?: string | null;
    student?: ScholarshipApplicantStudent | null;
}

export interface CareStaffScholarshipPageProps {
    functions?: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const fetchApplicantsByScholarship = async (scholarshipId: string) => {
    const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, created_at, scholarship_id, student_id, status')
        .eq('scholarship_id', Number(scholarshipId))
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

export function useCareStaffScholarship({ functions }: any) {
    const { showToast } = functions || {};
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');

    // Data States from Custom Hook
    const { data: scholarships, refetch: fetchScholarships } = useSupabaseData<Scholarship>({
        table: 'scholarships',
        eq: { column: 'is_active', value: true },
        order: { column: 'created_at', ascending: false }
    });
    const { data: closedScholarships, refetch: fetchClosedScholarships } = useSupabaseData<Scholarship>({
        table: 'scholarships',
        eq: { column: 'is_active', value: false },
        order: { column: 'created_at', ascending: false }
    });

    const [loading, setLoading] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Derived states with metadata parsed
    const parsedScholarships = (scholarships || []).map(parseScholarship);
    const parsedClosedScholarships = (closedScholarships || []).map(parseScholarship);

    // Modal State
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [showApplicantModal, setShowApplicantModal] = useState(false);
    const [showClosedModal, setShowClosedModal] = useState(false);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [applicantsError, setApplicantsError] = useState('');

    // Form & Data State
    const [scholarshipForm, setScholarshipForm] = useState<Partial<Scholarship>>({ 
        title: '', 
        description: '', 
        requirements: '', 
        deadline: '',
        application_method: 'portal',
        application_url: '',
        is_active: true 
    });
    const [applicantsList, setApplicantsList] = useState<ScholarshipApplicantRecord[]>([]);
    const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
    const [detailScholarship, setDetailScholarship] = useState<Scholarship | null>(null);

    // Form & Data State
    const handleSaveScholarship = async () => {
        if (!scholarshipForm.title || !scholarshipForm.deadline) {
            if (showToast) showToast("Title and Deadline are required.", "error");
            return;
        }
        setLoading(true);
        try {
            const reqs = serializeRequirements(
                scholarshipForm.requirements || '',
                scholarshipForm.application_method || 'portal',
                scholarshipForm.application_url || ''
            );

            if (isEditing && scholarshipForm.id) {
                const { error } = await supabase
                    .from('scholarships')
                    .update({
                        title: scholarshipForm.title,
                        description: scholarshipForm.description,
                        requirements: reqs,
                        deadline: scholarshipForm.deadline,
                        is_active: scholarshipForm.is_active !== false
                    })
                    .eq('id', Number(scholarshipForm.id));
                if (error) throw error;
                if (showToast) showToast("Scholarship updated.");
            } else {
                const { error } = await supabase.from('scholarships').insert([{
                    title: scholarshipForm.title,
                    description: scholarshipForm.description,
                    requirements: reqs,
                    deadline: scholarshipForm.deadline,
                    is_active: true
                }]);
                if (error) throw error;
                if (showToast) showToast("Scholarship added.");
            }
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
            Promise.all([fetchScholarships(), fetchClosedScholarships()]);
        } catch (err: any) {
            if (showToast) showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
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
            setApplicantsError(err.message || "Couldn't load applicants..");
            if (showToast) showToast("Couldn't load applicants. ", "error");
        } finally {
            setApplicantsLoading(false);
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await Promise.all([fetchScholarships(), fetchClosedScholarships()]);
            showToast?.('Scholarships refreshed.', 'success');
        } finally {
            setIsRefreshingData(false);
        }
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
                buildStudentAddress(student),
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
            if (showToast) showToast("Couldn't export applicants. ", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteScholarship = async (id: string) => {
        if (!window.confirm("Close this scholarship and remove it from active student listings?")) return;
        try {
            await managedArchiveService.closeScholarship(id);
            if (showToast) showToast("Scholarship closed.");
            await Promise.all([fetchScholarships(), fetchClosedScholarships()]);
        } catch (err: any) {
            if (showToast) showToast(err.message, "error");
        }
    };

    return {
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
    };
}
