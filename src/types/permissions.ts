export const ROLES = ['Admin', 'Care Staff', 'Department Head', 'Student', 'Public', 'Registrar'] as const;
export const PERMISSION_TYPES = ['table', 'function', 'feature', 'action'] as const;
export const PERMISSION_STATUSES = ['enabled', 'hidden', 'maintenance', 'coming_soon'] as const;

export type Role = typeof ROLES[number];
export type PermissionType = typeof PERMISSION_TYPES[number];
export type PermissionStatus = typeof PERMISSION_STATUSES[number];

export const ROLE_DISPLAY_LABELS: Record<Role, string> = {
    Admin: 'Admin',
    'Care Staff': 'Care Staff',
    'Department Head': 'Department Head',
    Student: 'Student',
    Public: 'Public NAT Portal',
    Registrar: 'Registrar'
};

export type RolePermission = {
    id?: string;
    role: Role;
    permission_type: PermissionType;
    permission_key: string;
    is_allowed: boolean;
    status?: PermissionStatus | null;
    notice_text?: string | null;
    description?: string | null;
    created_at?: string;
    created_by?: string | number | null;
    updated_at?: string;
};

export type ResolvedPermissionState = {
    isAllowed: boolean;
    status: PermissionStatus;
    noticeText: string | null;
    description: string | null;
};

export type PermissionRecord = Record<string, ResolvedPermissionState>;

export const TABLE_PERMISSIONS = [
    'students',
    'applications',
    'enrolled_students',
    'counseling_requests',
    'support_requests',
    'events',
    'scholarships',
    'scholarship_applications',
    'forms',
    'audit_logs',
    'departments',
    'courses',
    'notifications',
    'office_visits',
    'general_feedback',
    'event_attendance',
    'event_feedback',
    'submissions',
    'answers',
    'nat_requirements',
    'security_change_otps',
    'staff_accounts',
    'office_visit_reasons'
] as const;

export const FUNCTION_PERMISSIONS = [
    'manage-student-accounts',
    'manage-care-services',
    'manage-department-admissions',
    'manage-department-services'
] as const;

export const ACTION_PERMISSIONS = [
    'reset_student_data',
    'export_data',
    'archive_records',
    'restore_records',
    'delete_records',
    'approve_applications',
    'schedule_interviews',
    'manage_own_department',
    'update_profile',
    'change_security_credentials',
    'complete_assessment',
    'request_counseling',
    'request_support',
    'apply_scholarship',
    'manage_event_attendance',
    'complete_office_visit',
    'submit_feedback'
] as const;

export const FEATURE_PERMISSIONS = {
    admin: ['*'],
    careStaff: [
        'student_population',
        'student_analytics',
        'nat_management',
        'counseling',
        'support_requests',
        'events',
        'scholarships',
        'forms',
        'feedback',
        'audit_logs',
        'office_logbook',
        'export_center',
        'calendar',
        'settings'
    ],
    departmentHead: [
        'admissions',
        'interview_queue',
        'counseling_queue',
        'support_approvals',
        'students',
        'counseled',
        'events',
        'reports',
        'calendar',
        'export_center',
        'settings'
    ],
    student: [
        'dashboard',
        'profile',
        'assessment',
        'counseling',
        'support',
        'scholarship',
        'events',
        'feedback'
    ],
    publicPortal: [
        'nat_portal'
    ],
    registrar: [
        'registrar_portal',
        'student_population',
        'export_center'
    ]
} as const;

export const FEATURE_PERMISSION_KEYS = Array.from(
    new Set([
        ...FEATURE_PERMISSIONS.careStaff,
        ...FEATURE_PERMISSIONS.departmentHead,
        ...FEATURE_PERMISSIONS.student,
        ...FEATURE_PERMISSIONS.publicPortal,
        ...FEATURE_PERMISSIONS.registrar
    ])
);

export const DEFAULT_ROLE_PERMISSION_SEEDS: Record<Role, Record<PermissionType, string[]>> = {
    Admin: {
        table: ['*'],
        function: ['*'],
        feature: ['*'],
        action: ['*']
    },
    'Care Staff': {
        table: [
            'students',
            'applications',
            'enrolled_students',
            'counseling_requests',
            'support_requests',
            'events',
            'scholarships',
            'scholarship_applications',
            'forms',
            'audit_logs',
            'departments',
            'courses',
            'notifications',
            'office_visits',
            'general_feedback',
            'event_attendance',
            'submissions',
            'answers',
            'nat_requirements'
        ],
        function: [
            'manage-student-accounts',
            'manage-care-services'
        ],
        feature: [...FEATURE_PERMISSIONS.careStaff],
        action: [
            'reset_student_data',
            'export_data',
            'archive_records',
            'restore_records'
        ]
    },
    'Department Head': {
        table: [
            'applications',
            'enrolled_students',
            'counseling_requests',
            'support_requests',
            'events',
            'courses',
            'departments',
            'students',
            'notifications',
            'office_visits'
        ],
        function: [
            'manage-department-admissions',
            'manage-department-services'
        ],
        feature: [...FEATURE_PERMISSIONS.departmentHead],
        action: [
            'approve_applications',
            'schedule_interviews',
            'manage_own_department',
            'archive_records',
            'restore_records'
        ]
    },
    Student: {
        table: [
            'students',
            'counseling_requests',
            'support_requests',
            'forms',
            'events',
            'event_attendance',
            'event_feedback',
            'scholarships',
            'scholarship_applications',
            'notifications',
            'office_visits',
            'office_visit_reasons',
            'general_feedback',
            'security_change_otps',
            'submissions',
            'enrolled_students',
            'courses'
        ],
        function: [
            'manage-student-accounts'
        ],
        feature: [...FEATURE_PERMISSIONS.student],
        action: [
            'update_profile',
            'change_security_credentials',
            'complete_assessment',
            'request_counseling',
            'request_support',
            'apply_scholarship',
            'manage_event_attendance',
            'complete_office_visit',
            'submit_feedback'
        ]
    },
    Public: {
        table: [],
        function: [],
        feature: [...FEATURE_PERMISSIONS.publicPortal],
        action: []
    },
    Registrar: {
        table: ['students', 'courses', 'departments'],
        function: [],
        feature: [...FEATURE_PERMISSIONS.registrar],
        action: ['export_data']
    }
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionType, Record<string, string>> = {
    table: {
        students: 'Student master records, profile data, and academic standing.',
        applications: 'NAT and admissions application records.',
        enrolled_students: 'Enrollment-key and student activation source records.',
        counseling_requests: 'Counseling queue items and resolution records.',
        support_requests: 'Support service requests and approval workflow records.',
        events: 'Campus event publishing and scheduling data.',
        scholarships: 'Scholarship offerings and lifecycle details.',
        scholarship_applications: 'Student scholarship application submissions.',
        forms: 'Needs assessment and dynamic form definitions.',
        audit_logs: 'Cross-role activity monitoring and accountability records.',
        departments: 'Department and college structure metadata.',
        courses: 'Course-to-department routing data.',
        notifications: 'Student-facing notifications triggered by staff workflows.',
        office_visits: 'Office logbook and in-person visit history.',
        general_feedback: 'General feedback submissions from students.',
        event_attendance: 'Event attendance and participation records.',
        event_feedback: 'Student event evaluation and rating records.',
        submissions: 'Dynamic form submission records.',
        answers: 'Per-question form response records.',
        nat_requirements: 'NAT requirement definitions and checklist items.',
        security_change_otps: 'One-time passcode records for security-sensitive actions.',
        staff_accounts: 'Staff directory and linked-access account records.',
        office_visit_reasons: 'Reference options for office-visit time-in reasons.'
    },
    function: {
        'manage-student-accounts': 'Staff-only student account operations, resets, and student-auth maintenance.',
        'manage-care-services': 'CARE counseling and support workflow management.',
        'manage-department-admissions': 'Department interview scheduling and admissions decisions.',
        'manage-department-services': 'Department counseling, support approvals, and referrals.'
    },
    feature: {
        student_population: 'Student population dashboards and filters.',
        student_analytics: 'Analytics cards, charts, and student trend reporting.',
        nat_management: 'NAT queue and admission-management workspace.',
        counseling: 'Counseling requests, queue handling, and session feedback workflows.',
        support_requests: 'CARE support-request queue and completion flows.',
        events: 'Event calendar, publishing, and activity updates.',
        scholarships: 'Scholarship listing and student scholarship operations.',
        forms: 'Form builder and submissions management.',
        feedback: 'Student feedback, evaluations, and review tools.',
        audit_logs: 'Staff audit review screens and governance reporting.',
        office_logbook: 'Walk-in or office-visit tracking workspace.',
        export_center: 'CSV and operational export tools.',
        calendar: 'Shared calendar views for staff scheduling.',
        settings: 'Portal-level settings and governance controls.',
        admissions: 'Department admissions dashboard and application routing views.',
        interview_queue: 'Interview-queue management and status updates.',
        counseling_queue: 'Department counseling queue handling.',
        support_approvals: 'Department support approval and scheduling tools.',
        students: 'Department student roster and profile views.',
        counseled: 'Completed counseling history and follow-up records.',
        reports: 'Department reporting and summary outputs.',
        dashboard: 'Student home dashboard with notifications, history, and quick links.',
        profile: 'Student profile viewing and editing experience.',
        assessment: 'Needs assessment forms and completion history.',
        support: 'Additional support request workflow.',
        scholarship: 'Student scholarship browsing and application tracking.',
        nat_portal: 'Public NAT application, status, and applicant login portal.',
        registrar_portal: 'Dedicated portal for the Registrar.'
    },
    action: {
        reset_student_data: 'Perform the CARE destructive student-data reset workflow.',
        export_data: 'Generate and download staff export files.',
        archive_records: 'Archive, close, deactivate, or retire records without hard deletion.',
        restore_records: 'Restore previously archived records back into active use.',
        delete_records: 'Permanently delete records from the system.',
        approve_applications: 'Approve applications routed to a department.',
        schedule_interviews: 'Schedule or reschedule admissions interviews.',
        manage_own_department: 'Manage records limited to the actor\'s assigned department.',
        update_profile: 'Update the student profile, profile picture, and academic self-service fields.',
        change_security_credentials: 'Change the student email or password through OTP verification.',
        complete_assessment: 'Submit available needs assessment forms.',
        request_counseling: 'Create counseling requests and submit session feedback.',
        request_support: 'Create additional support requests.',
        apply_scholarship: 'Apply to scholarship opportunities.',
        manage_event_attendance: 'Time in, time out, and rate student events.',
        complete_office_visit: 'Complete office-visit time in or time out actions.',
        submit_feedback: 'Submit student feedback and general evaluations.'
    }
};

export const PERMISSION_STATUS_LABELS: Record<PermissionStatus, string> = {
    enabled: 'Enabled',
    hidden: 'Hidden',
    maintenance: 'Under Maintenance',
    coming_soon: 'Coming Soon'
};

export const toPermissionLookupKey = (permissionType: PermissionType, permissionKey: string) =>
    `${permissionType}:${permissionKey}`;

export const normalizePermissionStatus = (
    status: string | null | undefined,
    isAllowed = true
): PermissionStatus => {
    const normalizedStatus = String(status || '').trim();
    if (PERMISSION_STATUSES.includes(normalizedStatus as PermissionStatus)) {
        return normalizedStatus as PermissionStatus;
    }

    return isAllowed ? 'enabled' : 'hidden';
};

export const createResolvedPermissionState = (
    overrides: Partial<ResolvedPermissionState> = {}
): ResolvedPermissionState => {
    const isAllowed = Boolean(overrides.isAllowed);
    return {
        isAllowed,
        status: normalizePermissionStatus(overrides.status, isAllowed),
        noticeText: overrides.noticeText ?? null,
        description: overrides.description ?? null
    };
};

export const buildPermissionRecord = (permissions: RolePermission[]): PermissionRecord =>
    permissions.reduce<PermissionRecord>((accumulator, permission) => {
        accumulator[toPermissionLookupKey(permission.permission_type, permission.permission_key)] = createResolvedPermissionState({
            isAllowed: Boolean(permission.is_allowed),
            status: permission.status,
            noticeText: permission.notice_text ?? null,
            description: permission.description ?? null
        });
        return accumulator;
    }, {});

export const resolvePermissionDetails = (
    permissions: PermissionRecord,
    permissionType: PermissionType,
    permissionKey: string
): ResolvedPermissionState => {
    const exactKey = toPermissionLookupKey(permissionType, permissionKey);
    if (Object.prototype.hasOwnProperty.call(permissions, exactKey)) {
        return permissions[exactKey];
    }

    const wildcardKey = toPermissionLookupKey(permissionType, '*');
    if (Object.prototype.hasOwnProperty.call(permissions, wildcardKey)) {
        return permissions[wildcardKey];
    }

    return createResolvedPermissionState({
        isAllowed: false,
        status: 'hidden'
    });
};

export const isPermissionAccessible = (permission: ResolvedPermissionState) =>
    Boolean(permission.isAllowed) && permission.status === 'enabled';

export const isPermissionVisible = (permission: ResolvedPermissionState) =>
    Boolean(permission.isAllowed) && permission.status !== 'hidden';

export const resolvePermissionState = (
    permissions: PermissionRecord,
    permissionType: PermissionType,
    permissionKey: string
) => isPermissionAccessible(resolvePermissionDetails(permissions, permissionType, permissionKey));

export const resolvePermissionVisibility = (
    permissions: PermissionRecord,
    permissionType: PermissionType,
    permissionKey: string
) => isPermissionVisible(resolvePermissionDetails(permissions, permissionType, permissionKey));

export const getKnownPermissionKeysByType = (permissionType: PermissionType, role?: Role) => {
    if (role) {
        return [...(DEFAULT_ROLE_PERMISSION_SEEDS[role]?.[permissionType] || [])];
    }

    if (permissionType === 'table') return [...TABLE_PERMISSIONS];
    if (permissionType === 'function') return [...FUNCTION_PERMISSIONS];
    if (permissionType === 'action') return [...ACTION_PERMISSIONS];
    return [...FEATURE_PERMISSION_KEYS];
};

export const humanizePermissionKey = (value: string) =>
    value
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (match) => match.toUpperCase());

export const getPermissionNotice = (
    permission: ResolvedPermissionState,
    permissionLabel: string
) => {
    const customNotice = String(permission.noticeText || '').trim();
    if (customNotice) {
        return customNotice;
    }

    if (permission.status === 'maintenance') {
        return `${permissionLabel} is currently under maintenance. Please check back later.`;
    }

    if (permission.status === 'coming_soon') {
        return `${permissionLabel} is not open yet. Please check back soon.`;
    }

    return `${permissionLabel} is currently unavailable.`;
};
