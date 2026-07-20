import { supabase } from '../lib/supabase';

const TABLE_NAME = 'dept_student_annotations';
const SELECT_COLUMNS = 'id, student_id, department, note, is_at_risk, created_by, updated_by, created_at, updated_at';
const FETCH_BATCH_SIZE = 1000;

export interface DeptStudentAnnotation {
    id: number;
    student_id: number;
    department: string;
    note: string;
    is_at_risk: boolean;
    created_by?: string | null;
    updated_by?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface AnnotationFilter {
    hasNote?: boolean;
    atRisk?: boolean;
}

const annotationTable = () => (supabase as any).from(TABLE_NAME);

const normalizeStudentIds = (studentIds: Array<string | number | null | undefined>): number[] => (
    Array.from(new Set(
        studentIds.flatMap((value) => {
            const id = Number(value);
            return Number.isFinite(id) && id > 0 ? [id] : [];
        })
    ))
);

export const buildStudentAnnotationMap = (annotations: DeptStudentAnnotation[]) => (
    annotations.reduce<Record<string, DeptStudentAnnotation[]>>((acc, annotation) => {
        const key = String(annotation.student_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(annotation);
        return acc;
    }, {})
);

export const getDeptStudentAnnotations = async (
    studentIds: Array<string | number | null | undefined>,
    department?: string
): Promise<DeptStudentAnnotation[]> => {
    const ids = normalizeStudentIds(studentIds);
    if (ids.length === 0) return [];

    let query = annotationTable()
        .select(SELECT_COLUMNS)
        .in('student_id', ids)
        .order('updated_at', { ascending: false });

    const cleanDepartment = String(department || '').trim();
    if (cleanDepartment) {
        query = query.eq('department', cleanDepartment);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DeptStudentAnnotation[];
};

export const getDeptStudentAnnotationMap = async (
    studentIds: Array<string | number | null | undefined>,
    department?: string
) => buildStudentAnnotationMap(await getDeptStudentAnnotations(studentIds, department));

export const deleteDeptStudentAnnotation = async (params: {
    studentId: string | number;
    department: string;
}) => {
    const studentId = Number(params.studentId);
    const department = String(params.department || '').trim();
    if (!Number.isFinite(studentId) || studentId <= 0 || !department) return;

    const { error } = await annotationTable()
        .delete()
        .eq('student_id', studentId)
        .eq('department', department);
    if (error) throw error;
};

export const saveDeptStudentAnnotation = async (params: {
    studentId: string | number;
    department: string;
    note?: string | null;
    isAtRisk?: boolean;
}): Promise<DeptStudentAnnotation | null> => {
    const studentId = Number(params.studentId);
    const department = String(params.department || '').trim();
    const note = String(params.note || '').trim();
    const isAtRisk = Boolean(params.isAtRisk);

    if (!Number.isFinite(studentId) || studentId <= 0) {
        throw new Error('A valid student row ID is required.');
    }
    if (!department) {
        throw new Error('A valid department is required.');
    }

    if (!note && !isAtRisk) {
        await deleteDeptStudentAnnotation({ studentId, department });
        return null;
    }

    const { data, error } = await annotationTable()
        .upsert(
            {
                student_id: studentId,
                department,
                note,
                is_at_risk: isAtRisk
            },
            { onConflict: 'student_id,department' }
        )
        .select(SELECT_COLUMNS)
        .single();

    if (error) throw error;
    return data as DeptStudentAnnotation;
};

export const getCareAnnotationStudentIds = async (filter: AnnotationFilter): Promise<number[]> => {
    if (!filter.hasNote && !filter.atRisk) return [];

    const ids: number[] = [];
    let start = 0;

    while (true) {
        let query = annotationTable()
            .select('student_id')
            .order('updated_at', { ascending: false });

        if (filter.hasNote) {
            query = query.neq('note', '');
        }
        if (filter.atRisk) {
            query = query.eq('is_at_risk', true);
        }

        const { data, error } = await query.range(start, start + FETCH_BATCH_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach((row: any) => {
            const id = Number(row.student_id);
            if (Number.isFinite(id) && id > 0) ids.push(id);
        });

        if (data.length < FETCH_BATCH_SIZE) break;
        start += FETCH_BATCH_SIZE;
    }

    return Array.from(new Set(ids));
};
