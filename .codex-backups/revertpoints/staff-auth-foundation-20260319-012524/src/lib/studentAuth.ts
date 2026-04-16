const STUDENT_AUTH_DOMAIN = 'students.norsu.local';

export const buildStudentAuthEmail = (studentId: string) =>
    `${String(studentId || '').trim()}@${STUDENT_AUTH_DOMAIN}`;

export const sanitizeStudentSession = (student: any, authUser?: { id?: string; email?: string } | null) => {
    const { password, ...safeStudent } = student || {};
    const authUserId = authUser?.id || safeStudent.auth_user_id || null;
    const authEmail = authUser?.email
        || safeStudent.auth_email
        || (safeStudent.student_id ? buildStudentAuthEmail(safeStudent.student_id) : null);

    return {
        ...safeStudent,
        auth_user_id: authUserId,
        auth_email: authEmail,
        role: 'Student',
        userType: 'student',
        user: authUserId || authEmail
            ? {
                id: authUserId,
                email: authEmail
            }
            : undefined
    };
};
