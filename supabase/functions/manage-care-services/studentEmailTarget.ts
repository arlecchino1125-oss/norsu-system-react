const toText = (value: unknown, fallback = '') => {
    const text = String(value ?? '').trim();
    return text || fallback;
};

const normalizeEmail = (value: unknown) => {
    const email = String(value ?? '').trim().toLowerCase();
    return email || null;
};

const buildDisplayName = (...parts: unknown[]) => {
    const joined = parts.flatMap((part) => {
        const namePart = String(part ?? '').trim();
        return namePart ? [namePart] : [];
    }).join(' ');

    return joined || 'Student';
};

export const getStudentEmailTarget = async (
    adminClient: any,
    studentId: unknown,
    fallbackName?: string | null
) => {
    const nextStudentId = String(studentId || '').trim();
    if (!nextStudentId) {
        return {
            email: null,
            name: toText(fallbackName, 'Student')
        };
    }

    const { data, error } = await adminClient
        .from('students')
        .select('email, first_name, last_name')
        .eq('student_id', nextStudentId)
        .maybeSingle();

    if (error) throw error;

    const resolvedName = buildDisplayName(data?.first_name, data?.last_name);

    return {
        email: normalizeEmail(data?.email),
        name: resolvedName === 'Student'
            ? toText(fallbackName, 'Student')
            : resolvedName
    };
};
