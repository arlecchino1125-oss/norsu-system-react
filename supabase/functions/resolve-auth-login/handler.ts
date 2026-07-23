export type AuthenticatedLogin = {
    session: Record<string, unknown>;
    user: { id?: string | null };
};

export type StaffLoginAccount = {
    email: string | null;
    authUserId: string | null;
    role: string;
    isArchived: boolean;
};

export type StudentLoginAccount = {
    email: string | null;
    authUserId: string | null;
    status: string | null;
    isArchived?: boolean;
};

export type AuthLoginDependencies = {
    findStaff: (input: { username: string; email: string }) => Promise<StaffLoginAccount | null>;
    findStudent: (input: { studentId: string; email: string }) => Promise<StudentLoginAccount | null>;
    authenticate: (email: string, password: string) => Promise<AuthenticatedLogin | null>;
    revokeSession: () => Promise<void>;
    dummyEmail: string;
    responseHeaders?: Record<string, string>;
};

const json = (
    body: Record<string, unknown>,
    status: number,
    headers: Record<string, string> = {}
) => new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
});

const invalidLogin = (dependencies: AuthLoginDependencies) =>
    json({ success: false, error: 'Invalid login details.' }, 401, dependencies.responseHeaders);

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

export const handleAuthLogin = async (request: Request, dependencies: AuthLoginDependencies) => {
    const body = await request.json();
    const mode = String(body.mode || '').trim();
    const password = String(body.password || '');

    let account: StaffLoginAccount | StudentLoginAccount | null = null;
    let accountAllowed = false;

    if (mode === 'authenticate-staff-login') {
        const username = String(body.username || '').trim();
        const email = normalizeEmail(body.email);
        const requiredRole = String(body.requiredRole || '').trim();
        account = username || email
            ? await dependencies.findStaff({ username, email })
            : null;
        accountAllowed = Boolean(
            account
            && !('isArchived' in account && account.isArchived)
            && 'role' in account
            && account.role === requiredRole
            && account.authUserId
            && normalizeEmail(account.email)
        );
    } else if (mode === 'authenticate-student-login') {
        const studentId = String(body.studentId || '').trim();
        const email = normalizeEmail(body.email);
        account = studentId || email
            ? await dependencies.findStudent({ studentId, email })
            : null;
        accountAllowed = Boolean(
            account
            && !account.isArchived
            && 'status' in account
            && account.status === 'Active'
            && account.authUserId
            && normalizeEmail(account.email)
        );
    } else {
        return json({ success: false, error: 'Unsupported login mode.' }, 400, dependencies.responseHeaders);
    }

    const email = accountAllowed && account
        ? normalizeEmail(account.email)
        : dependencies.dummyEmail;
    const authenticated = await dependencies.authenticate(email, password);
    const matchesAccount = Boolean(
        accountAllowed
        && authenticated?.session
        && authenticated.user?.id
        && authenticated.user.id === account?.authUserId
    );

    if (!matchesAccount) {
        if (authenticated?.session) {
            await dependencies.revokeSession().catch(() => undefined);
        }
        return invalidLogin(dependencies);
    }

    return json({ success: true, session: authenticated!.session }, 200, dependencies.responseHeaders);
};
