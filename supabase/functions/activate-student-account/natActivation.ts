type NatApplication = {
    id: string;
    status?: unknown;
    [key: string]: unknown;
};

type NatSessionInput = {
    token?: unknown;
    browserId?: unknown;
};

type RequireNatSession = (
    input: NatSessionInput
) => Promise<{ application: NatApplication }>;

type NatActivationCompletionProbe = {
    student?: {
        student_id?: unknown;
        auth_user_id?: unknown;
    } | null;
    archive?: {
        source_application_id?: unknown;
        activated_student_id?: unknown;
    } | null;
    studentError?: unknown;
    archiveError?: unknown;
};

type ExpectedNatActivation = {
    applicationId: string;
    studentId: string;
    authUserId: string;
};

export type NatActivationCompletionState = 'committed' | 'unknown';

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

export const classifyNatActivationCompletion = (
    probe: NatActivationCompletionProbe,
    expected: ExpectedNatActivation
): NatActivationCompletionState => {
    if (probe.studentError || probe.archiveError) {
        return 'unknown';
    }

    const studentMatches =
        String(probe.student?.student_id || '') === expected.studentId &&
        String(probe.student?.auth_user_id || '') === expected.authUserId;
    const archiveMatches =
        String(probe.archive?.source_application_id || '') === expected.applicationId &&
        String(probe.archive?.activated_student_id || '') === expected.studentId;

    if (studentMatches && archiveMatches) {
        return 'committed';
    }

    return 'unknown';
};

export const requireApprovedNatActivation = async (
    input: NatSessionInput & { applicationId?: unknown },
    requireSession: RequireNatSession
) => {
    const { application } = await requireSession({
        token: input.token,
        browserId: input.browserId
    });

    if (String(application.status || '') !== 'Approved for Enrollment') {
        throw withStatus('Student account activation is not available yet.', 403);
    }

    return application;
};
