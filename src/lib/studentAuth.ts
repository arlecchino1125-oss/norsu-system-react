export const sanitizeStudentSession = (student: any, authUser?: { id?: string; email?: string } | null) => {
    const { password, ...safeStudent } = student || {};
    const authUserId = authUser?.id || safeStudent.auth_user_id || null;
    const authEmail = authUser?.email
        || safeStudent.email
        || safeStudent.auth_email
        || null;

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
