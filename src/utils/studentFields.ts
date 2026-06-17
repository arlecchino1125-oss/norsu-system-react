export const buildStudentAddress = (student?: {
    street?: string | null;
    city?: string | null;
    province?: string | null;
    zip_code?: string | null;
    region?: string | null;
} | null) => {
    const parts = [
        student?.street,
        student?.city,
        student?.province,
        student?.zip_code,
        student?.region
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    if (parts.length > 0) {
        return parts.join(', ');
    }

    return '';
};

export const getStudentEmergencyContact = (student?: {
    emergency_number?: string | null;
} | null) =>
    String(student?.emergency_number || '').trim();

export const getStudentSex = (student?: {
    sex?: string | null;
} | null) =>
    String(student?.sex || '').trim();
