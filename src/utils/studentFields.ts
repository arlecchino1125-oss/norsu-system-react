export const buildStudentAddress = (student?: {
    street?: string | null;
    city?: string | null;
    province?: string | null;
    zip_code?: string | null;
    address?: string | null;
} | null) => {
    const parts = [
        student?.street,
        student?.city,
        student?.province,
        student?.zip_code
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    if (parts.length > 0) {
        return parts.join(', ');
    }

    return String(student?.address || '').trim();
};

export const getStudentEmergencyContact = (student?: {
    emergency_number?: string | null;
    emergency_contact?: string | null;
} | null) =>
    String(student?.emergency_number || student?.emergency_contact || '').trim();

export const getStudentSex = (student?: {
    sex?: string | null;
} | null) =>
    String(student?.sex || '').trim();
