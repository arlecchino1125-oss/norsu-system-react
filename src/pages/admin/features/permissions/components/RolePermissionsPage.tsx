import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    Database,
    KeyRound,
    LayoutGrid,
    Loader2,
    RefreshCw,
    RotateCcw,
    Search,
    Shield,
    Workflow
} from 'lucide-react';
import { useAuth } from '../../../../../lib/useAuth';
import { permissionService } from '../../../../../services/permissionService';
import {
    getPermissionNotice,
    PERMISSION_STATUS_LABELS,
    humanizePermissionKey,
    ROLE_DISPLAY_LABELS,
    resolvePermissionDetails,
    ROLES,
    type PermissionRecord,
    type PermissionStatus,
    type PermissionType,
    type Role
} from '../../../../../types/permissions';
import { getSafeErrorMessage } from '../../../../../utils/errorMasking';
import { AsyncButton } from '../../../../../components/ui/Button';

type ToastState = {
    type: 'success' | 'error';
    message: string;
} | null;

type StatusFilter = 'all' | 'enabled' | 'blocked';

type CatalogItem = {
    permissionKey: string;
    title: string;
    targetPath: string;
    description: string;
    defaultAllowed: boolean;
    columns?: string[];
};

const TAB_CONFIG: Array<{
    key: PermissionType;
    label: string;
    icon: typeof Database;
    instructionHint: string;
}> = [
    {
        key: 'table',
        label: 'Tables & Columns',
        icon: Database,
        instructionHint: 'Expand any table card to toggle individual database columns and CRUD operations.'
    },
    {
        key: 'function',
        label: 'Functions (RPC)',
        icon: Workflow,
        instructionHint: 'Toggle switch to allow/deny access or expand to inspect function signature.'
    },
    {
        key: 'feature',
        label: 'Portal Pages',
        icon: LayoutGrid,
        instructionHint: 'Expand any page card to configure Hidden, Under Maintenance, or Coming Soon notices.'
    },
    {
        key: 'action',
        label: 'Actions',
        icon: KeyRound,
        instructionHint: 'Toggle switch to allow/deny access or expand to inspect function signature.'
    }
];

const SELECTABLE_ROLES: readonly Role[] = ['Admin', 'Care Staff', 'Department Head', 'Registrar', 'Student', 'Public'];

const ROLE_METADATA: Record<Role, {
    badgeClass: string;
    description: string;
}> = {
    Admin: {
        badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
        description: 'Institution-wide governance, staff provisioning, colleges, and RBAC policy.'
    },
    'Care Staff': {
        badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
        description: 'Student population, counseling, support requests, and care services.'
    },
    'Department Head': {
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        description: 'Admissions routing, interviews, department queues, and student rosters.'
    },
    Registrar: {
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        description: 'Student records inspection, demographic verification, and directory exports.'
    },
    Student: {
        badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        description: 'Student portal self-service, needs assessment, profile, and appointments.'
    },
    Public: {
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        description: 'Public entrance examinations, applicant tracking, and admission inquiries.'
    }
};

const PERMISSION_CATALOG: Record<Role, Record<PermissionType, CatalogItem[]>> = {
    Admin: {
        table: [
            {
                permissionKey: 'staff_accounts',
                title: 'Staff Accounts',
                targetPath: 'public.staff_accounts',
                description: 'Staff directory, login accounts, and administrative assignments.',
                defaultAllowed: true,
                columns: ['id', 'username', 'email', 'role', 'college', 'status']
            },
            {
                permissionKey: 'role_permissions',
                title: 'Role Permissions',
                targetPath: 'public.role_permissions',
                description: 'Institutional RBAC matrix governing table, function, page, and action access.',
                defaultAllowed: true,
                columns: ['id', 'role', 'permission_type', 'permission_key', 'is_allowed']
            },
            {
                permissionKey: 'audit_logs',
                title: 'Audit Logs',
                targetPath: 'public.audit_logs',
                description: 'Cross-role activity monitoring, security tracking, and accountability records.',
                defaultAllowed: true,
                columns: ['id', 'staff_id', 'action', 'resource', 'details', 'timestamp']
            },
            {
                permissionKey: 'colleges',
                title: 'Colleges',
                targetPath: 'public.colleges',
                description: 'Institutional colleges, dean assignments, and departments structure.',
                defaultAllowed: true,
                columns: ['id', 'code', 'name', 'created_at']
            },
            {
                permissionKey: 'departments',
                title: 'Departments',
                targetPath: 'public.departments',
                description: 'Academic department units and college departmental hierarchy.',
                defaultAllowed: true,
                columns: ['id', 'college_id', 'name', 'code']
            },
            {
                permissionKey: 'courses',
                title: 'Courses',
                targetPath: 'public.courses',
                description: 'Degree programs, academic courses, and department-to-program routing.',
                defaultAllowed: true,
                columns: ['id', 'college_id', 'name', 'code', 'created_at']
            },
            {
                permissionKey: 'students',
                title: 'Students',
                targetPath: 'public.students',
                description: 'Student master records, directory entries, and academic standing.',
                defaultAllowed: true,
                columns: ['id', 'student_id', 'first_name', 'last_name', 'email']
            },
            {
                permissionKey: 'enrolled_students',
                title: 'Enrolled Students',
                targetPath: 'public.enrolled_students',
                description: 'Enrollment registry, academic rosters, and student activation sources.',
                defaultAllowed: true,
                columns: ['id', 'student_id', 'course_id', 'year_level']
            },
            {
                permissionKey: 'applications',
                title: 'Applications',
                targetPath: 'public.applications',
                description: 'NAT entrance exam applications and admissions registration records.',
                defaultAllowed: true,
                columns: ['id', 'student_id', 'program', 'status']
            },
            {
                permissionKey: 'notifications',
                title: 'Notifications',
                targetPath: 'public.notifications',
                description: 'Institutional broadcast alerts and automated system notifications.',
                defaultAllowed: true,
                columns: ['id', 'user_id', 'message', 'read']
            },
            {
                permissionKey: 'security_change_otps',
                title: 'Security Change Otps',
                targetPath: 'public.security_change_otps',
                description: 'One-time security credentials and verification token records.',
                defaultAllowed: true,
                columns: ['id', 'user_id', 'otp_code', 'expires_at']
            },
            {
                permissionKey: 'counseling_evaluation_answers',
                title: 'Counseling Evaluation Answers',
                targetPath: 'public.counseling_evaluation_answers',
                description: 'Confidential student counseling session responses and psychological notes.',
                defaultAllowed: false,
                columns: ['id', 'session_id', 'student_id', 'score', 'comments', 'created_at']
            },
            {
                permissionKey: 'needs_assessment_answers',
                title: 'Needs Assessment Answers',
                targetPath: 'public.needs_assessment_answers',
                description: 'Confidential student needs assessment responses protected by guidance confidentiality.',
                defaultAllowed: false,
                columns: ['id', 'form_id', 'student_id', 'question_id', 'answer', 'created_at']
            }
        ],
        function: [
            {
                permissionKey: 'provision_staff_account',
                title: 'Provision Staff Account',
                targetPath: 'rpc.provision_staff_account',
                description: 'Server-side RPC to create, configure, and assign roles to staff accounts.',
                defaultAllowed: true
            },
            {
                permissionKey: 'update_role_permissions',
                title: 'Update Role Permissions',
                targetPath: 'rpc.update_role_permissions',
                description: 'Server-side RPC to update role permission entries with admin audit logging.',
                defaultAllowed: true
            },
            {
                permissionKey: 'rename_swap_student_ids',
                title: 'Rename Swap Student Ids',
                targetPath: 'rpc.rename_swap_student_ids',
                description: 'Server-side atomic RPC to safely reassign or swap student IDs.',
                defaultAllowed: true
            },
            {
                permissionKey: 'cleanup_orphaned_auth_links',
                title: 'Cleanup Orphaned Auth Links',
                targetPath: 'rpc.cleanup_orphaned_auth_links',
                description: 'Server-side maintenance RPC to reconcile auth users with staff accounts.',
                defaultAllowed: true
            }
        ],
        feature: [
            {
                permissionKey: 'account_management',
                title: 'Account Management',
                targetPath: '/account-management',
                description: 'Admin control room for staff provisioning, colleges, and audit monitoring.',
                defaultAllowed: true
            },
            {
                permissionKey: 'rbac_control_center',
                title: 'RBAC Control Center',
                targetPath: '/rbac-control-center',
                description: 'Full role-based access control and system permissions management.',
                defaultAllowed: true
            },
            {
                permissionKey: 'staff_audit_monitor',
                title: 'Staff Audit Monitor',
                targetPath: '/staff-audit-monitor',
                description: 'Full cross-role staff activity logs and compliance history.',
                defaultAllowed: true
            },
            {
                permissionKey: 'colleges_&_master_data',
                title: 'Colleges & Master Data',
                targetPath: '/colleges-&-master-data',
                description: 'Academic college hierarchy, department codes, and master programs.',
                defaultAllowed: true
            },
            {
                permissionKey: 'student_access_overview',
                title: 'Student Access Overview',
                targetPath: '/student-access-overview',
                description: 'Student authentication health, credential verification, and ID maintenance.',
                defaultAllowed: true
            },
            {
                permissionKey: 'governance_boundaries',
                title: 'Governance Boundaries',
                targetPath: '/governance-boundaries',
                description: 'Domain responsibility matrix and operational compliance rules.',
                defaultAllowed: true
            }
        ],
        action: [
            {
                permissionKey: 'create_&_revoke_staff_logins',
                title: 'Create & Revoke Staff Logins',
                targetPath: 'action.create_&_revoke_staff_logins',
                description: 'Issue new staff credentials, change assignments, or revoke access.',
                defaultAllowed: true
            },
            {
                permissionKey: 'modify_rbac_matrix',
                title: 'Modify RBAC Matrix',
                targetPath: 'action.modify_rbac_matrix',
                description: 'Adjust permissions for any role across tables, functions, pages, and actions.',
                defaultAllowed: true
            },
            {
                permissionKey: 'add_institutional_college',
                title: 'Add Institutional College',
                targetPath: 'action.add_institutional_college',
                description: 'Establish permanent institutional colleges and department structures.',
                defaultAllowed: true
            },
            {
                permissionKey: 'execute_student_id_swap',
                title: 'Execute Student ID Swap',
                targetPath: 'action.execute_student_id_swap',
                description: 'Execute student identification swaps and auth profile reconciliations.',
                defaultAllowed: true
            },
            {
                permissionKey: 'bulk_reset_student_data',
                title: 'Bulk Reset Student Data',
                targetPath: 'action.bulk_reset_student_data',
                description: 'Perform destructive bulk purge or reset of student records and responses.',
                defaultAllowed: false
            }
        ]
    },
    'Care Staff': {
        table: [
            { permissionKey: 'students', title: 'Students', targetPath: 'public.students', description: 'Student master records and profile information.', defaultAllowed: true, columns: ['id', 'student_id', 'first_name', 'last_name', 'email'] },
            { permissionKey: 'applications', title: 'Applications', targetPath: 'public.applications', description: 'NAT and admissions application records.', defaultAllowed: true, columns: ['id', 'student_id', 'program', 'status'] },
            { permissionKey: 'enrolled_students', title: 'Enrolled Students', targetPath: 'public.enrolled_students', description: 'Enrollment key and activation records.', defaultAllowed: true, columns: ['id', 'student_id', 'course_id', 'year_level'] },
            { permissionKey: 'counseling_requests', title: 'Counseling Requests', targetPath: 'public.counseling_requests', description: 'Counseling queue items and resolution notes.', defaultAllowed: true, columns: ['id', 'student_id', 'counselor_id', 'status', 'scheduled_at', 'notes'] },
            { permissionKey: 'support_requests', title: 'Support Requests', targetPath: 'public.support_requests', description: 'Support service requests and approval workflow records.', defaultAllowed: true, columns: ['id', 'student_id', 'service_type', 'status', 'created_at'] },
            { permissionKey: 'events', title: 'Events', targetPath: 'public.events', description: 'Campus event publishing and scheduling data.', defaultAllowed: true, columns: ['id', 'title', 'location', 'event_date', 'max_attendees', 'status'] },
            { permissionKey: 'scholarships', title: 'Scholarships', targetPath: 'public.scholarships', description: 'Scholarship offerings and lifecycle details.', defaultAllowed: true, columns: ['id', 'title', 'slots', 'deadline', 'status'] },
            { permissionKey: 'scholarship_applications', title: 'Scholarship Applications', targetPath: 'public.scholarship_applications', description: 'Student scholarship application submissions.', defaultAllowed: true, columns: ['id', 'student_id', 'scholarship_id', 'status', 'submitted_at'] },
            { permissionKey: 'needs_assessment_forms', title: 'Needs Assessment Forms', targetPath: 'public.needs_assessment_forms', description: 'Needs assessment and dynamic form definitions.', defaultAllowed: true, columns: ['id', 'title', 'academic_year', 'target_group', 'status', 'created_at'] },
            { permissionKey: 'audit_logs', title: 'Audit Logs', targetPath: 'public.audit_logs', description: 'Staff action audit log records.', defaultAllowed: true, columns: ['id', 'staff_id', 'action', 'resource', 'details', 'timestamp'] },
            { permissionKey: 'departments', title: 'Departments', targetPath: 'public.departments', description: 'Department and college structure metadata.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code'] },
            { permissionKey: 'courses', title: 'Courses', targetPath: 'public.courses', description: 'Course-to-department routing data.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code', 'created_at'] },
            { permissionKey: 'notifications', title: 'Notifications', targetPath: 'public.notifications', description: 'Student-facing notifications triggered by staff.', defaultAllowed: true, columns: ['id', 'user_id', 'message', 'read'] },
            { permissionKey: 'office_visits', title: 'Office Visits', targetPath: 'public.office_visits', description: 'Office logbook and in-person visit history.', defaultAllowed: true, columns: ['id', 'student_id', 'reason', 'time_in', 'time_out'] },
            { permissionKey: 'general_feedback', title: 'General Feedback', targetPath: 'public.general_feedback', description: 'General feedback submissions from students.', defaultAllowed: true, columns: ['id', 'student_id', 'rating', 'feedback', 'created_at'] },
            { permissionKey: 'event_attendance', title: 'Event Attendance', targetPath: 'public.event_attendance', description: 'Event attendance and participation records.', defaultAllowed: true, columns: ['id', 'event_id', 'student_id', 'status'] },
            { permissionKey: 'event_feedback', title: 'Event Feedback', targetPath: 'public.event_feedback', description: 'Student event evaluations and ratings.', defaultAllowed: true, columns: ['id', 'event_id', 'student_id', 'rating'] },
            { permissionKey: 'needs_assessment_submissions', title: 'Needs Assessment Submissions', targetPath: 'public.needs_assessment_submissions', description: 'Form submission receipts and student timestamps.', defaultAllowed: true, columns: ['id', 'form_id', 'student_id', 'submitted_at', 'status'] },
            { permissionKey: 'needs_assessment_answers', title: 'Needs Assessment Answers', targetPath: 'public.needs_assessment_answers', description: 'Per-question responses for needs assessment.', defaultAllowed: true, columns: ['id', 'form_id', 'student_id', 'question_id', 'answer', 'created_at'] },
            { permissionKey: 'nat_requirements', title: 'NAT Requirements', targetPath: 'public.nat_requirements', description: 'NAT checklist criteria and admission rules.', defaultAllowed: true, columns: ['id', 'title', 'description', 'is_active'] }
        ],
        function: [
            { permissionKey: 'manage_student_accounts', title: 'Manage Student Accounts', targetPath: 'rpc.manage_student_accounts', description: 'Staff-only student account operations and student-auth maintenance.', defaultAllowed: true },
            { permissionKey: 'manage_care_services', title: 'Manage Care Services', targetPath: 'rpc.manage_care_services', description: 'CARE counseling and support workflow management.', defaultAllowed: true },
            { permissionKey: 'manage_r2_documents', title: 'Manage R2 Documents', targetPath: 'rpc.manage_r2_documents', description: 'Presigned file uploads and document vault management.', defaultAllowed: true },
            { permissionKey: 'record_staff_audit', title: 'Record Staff Audit', targetPath: 'rpc.record_staff_audit', description: 'Server-side staff action auditing and accountability RPC.', defaultAllowed: true }
        ],
        feature: [
            { permissionKey: 'student_population', title: 'Student Population', targetPath: '/student-population', description: 'Student roster dashboards and filter controls.', defaultAllowed: true },
            { permissionKey: 'student_analytics', title: 'Student Analytics', targetPath: '/student-analytics', description: 'Needs assessment survey insights and trends.', defaultAllowed: true },
            { permissionKey: 'nat_management', title: 'NAT Management', targetPath: '/nat-management', description: 'NAT applicant queue and admissions scheduling.', defaultAllowed: true },
            { permissionKey: 'counseling', title: 'Counseling', targetPath: '/counseling', description: 'Counseling intake and session queue handling.', defaultAllowed: true },
            { permissionKey: 'support_requests', title: 'Support Requests', targetPath: '/support-requests', description: 'CARE support request management.', defaultAllowed: true },
            { permissionKey: 'events', title: 'Events', targetPath: '/events', description: 'Campus activity publishing and registration.', defaultAllowed: true },
            { permissionKey: 'scholarships', title: 'Scholarships', targetPath: '/scholarships', description: 'Scholarship program applications and approvals.', defaultAllowed: true },
            { permissionKey: 'forms', title: 'Forms Builder', targetPath: '/forms', description: 'Custom assessment and questionnaire builder.', defaultAllowed: true },
            { permissionKey: 'feedback', title: 'Feedback & Reviews', targetPath: '/feedback', description: 'Student feedback and satisfaction analytics.', defaultAllowed: true },
            { permissionKey: 'audit_logs', title: 'Audit Logs Monitor', targetPath: '/audit-logs', description: 'Staff activity logs and governance audit.', defaultAllowed: true },
            { permissionKey: 'office_logbook', title: 'Office Logbook', targetPath: '/office-logbook', description: 'Walk-in student visit tracking and records.', defaultAllowed: true },
            { permissionKey: 'export_center', title: 'Export Center', targetPath: '/export-center', description: 'Operational spreadsheet and report generator.', defaultAllowed: true },
            { permissionKey: 'calendar', title: 'Staff Calendar', targetPath: '/calendar', description: 'Guidance and staff shared appointment calendar.', defaultAllowed: true },
            { permissionKey: 'settings', title: 'Settings', targetPath: '/settings', description: 'Staff workspace preferences and notifications.', defaultAllowed: true },
            { permissionKey: 'demographics', title: 'Student Demographics', targetPath: '/demographics', description: 'Demographic breakdowns and cohort analysis.', defaultAllowed: true },
            { permissionKey: 'evaluations', title: 'Counseling Evaluations', targetPath: '/evaluations', description: 'Counseling session evaluations and outcome notes.', defaultAllowed: true }
        ],
        action: [
            { permissionKey: 'export_data', title: 'Export Data', targetPath: 'action.export_data', description: 'Generate and download institutional data reports.', defaultAllowed: true },
            { permissionKey: 'archive_records', title: 'Archive Records', targetPath: 'action.archive_records', description: 'Archive inactive student and service records.', defaultAllowed: true },
            { permissionKey: 'restore_records', title: 'Restore Records', targetPath: 'action.restore_records', description: 'Restore previously archived student records.', defaultAllowed: true },
            { permissionKey: 'manage_counseling_outcome', title: 'Manage Counseling Outcome', targetPath: 'action.manage_counseling_outcome', description: 'Record outcome status on completed counseling sessions.', defaultAllowed: true },
            { permissionKey: 'schedule_sessions', title: 'Schedule Sessions', targetPath: 'action.schedule_sessions', description: 'Schedule counseling and support appointment timeslots.', defaultAllowed: true },
            { permissionKey: 'broadcast_notifications', title: 'Broadcast Notifications', targetPath: 'action.broadcast_notifications', description: 'Send mass notification messages to student cohorts.', defaultAllowed: true },
            { permissionKey: 'verify_documents', title: 'Verify Documents', targetPath: 'action.verify_documents', description: 'Verify student NAT and scholarship document uploads.', defaultAllowed: true },
            { permissionKey: 'review_evaluations', title: 'Review Evaluations', targetPath: 'action.review_evaluations', description: 'Review student counseling feedback and ratings.', defaultAllowed: true },
            { permissionKey: 'record_attendance', title: 'Record Attendance', targetPath: 'action.record_attendance', description: 'Mark attendance status for campus event participants.', defaultAllowed: true },
            { permissionKey: 'bulk_reset_student_data', title: 'Bulk Reset Student Data', targetPath: 'action.bulk_reset_student_data', description: 'Destructive purge of student records (restricted to Admin).', defaultAllowed: false }
        ]
    },
    'Department Head': {
        table: [
            { permissionKey: 'applications', title: 'Applications', targetPath: 'public.applications', description: 'Department admissions applications.', defaultAllowed: true, columns: ['id', 'student_id', 'program', 'status'] },
            { permissionKey: 'enrolled_students', title: 'Enrolled Students', targetPath: 'public.enrolled_students', description: 'Department course enrollment rosters.', defaultAllowed: true, columns: ['id', 'student_id', 'course_id', 'year_level'] },
            { permissionKey: 'counseling_requests', title: 'Counseling Requests', targetPath: 'public.counseling_requests', description: 'Department counseling queue.', defaultAllowed: true, columns: ['id', 'student_id', 'counselor_id', 'status'] },
            { permissionKey: 'support_requests', title: 'Support Requests', targetPath: 'public.support_requests', description: 'Department student support approvals.', defaultAllowed: true, columns: ['id', 'student_id', 'service_type', 'status'] },
            { permissionKey: 'events', title: 'Events', targetPath: 'public.events', description: 'College and department events.', defaultAllowed: true, columns: ['id', 'title', 'location', 'event_date'] },
            { permissionKey: 'courses', title: 'Courses', targetPath: 'public.courses', description: 'Department course catalog.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code'] },
            { permissionKey: 'departments', title: 'Departments', targetPath: 'public.departments', description: 'Assigned college department info.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code'] },
            { permissionKey: 'students', title: 'Students', targetPath: 'public.students', description: 'Student directory for assigned department.', defaultAllowed: true, columns: ['id', 'student_id', 'first_name', 'last_name', 'email'] },
            { permissionKey: 'notifications', title: 'Notifications', targetPath: 'public.notifications', description: 'Department alerts and updates.', defaultAllowed: true, columns: ['id', 'user_id', 'message', 'read'] },
            { permissionKey: 'office_visits', title: 'Office Visits', targetPath: 'public.office_visits', description: 'Department walk-in logbook.', defaultAllowed: true, columns: ['id', 'student_id', 'reason', 'time_in', 'time_out'] },
            { permissionKey: 'audit_logs', title: 'Audit Logs', targetPath: 'public.audit_logs', description: 'System-wide staff audit logs (restricted).', defaultAllowed: false, columns: ['id', 'staff_id', 'action', 'timestamp'] }
        ],
        function: [
            { permissionKey: 'manage_department_admissions', title: 'Department Admissions RPC', targetPath: 'rpc.manage_department_admissions', description: 'Department interview scheduling and admissions decisions.', defaultAllowed: true },
            { permissionKey: 'manage_department_services', title: 'Department Services RPC', targetPath: 'rpc.manage_department_services', description: 'Department counseling, support approvals, and referrals.', defaultAllowed: true },
            { permissionKey: 'record_staff_audit', title: 'Record Staff Audit', targetPath: 'rpc.record_staff_audit', description: 'Audit action logging for department staff.', defaultAllowed: true }
        ],
        feature: [
            { permissionKey: 'admissions', title: 'Admissions Queue', targetPath: '/admissions', description: 'Department admissions dashboard.', defaultAllowed: true },
            { permissionKey: 'interview_queue', title: 'Interview Queue', targetPath: '/interview-queue', description: 'Admissions interview scheduling.', defaultAllowed: true },
            { permissionKey: 'counseling_queue', title: 'Counseling Queue', targetPath: '/counseling-queue', description: 'Department counseling triage.', defaultAllowed: true },
            { permissionKey: 'support_approvals', title: 'Support Approvals', targetPath: '/support-approvals', description: 'Department support approvals.', defaultAllowed: true },
            { permissionKey: 'students', title: 'Student Roster', targetPath: '/students', description: 'Department student list.', defaultAllowed: true },
            { permissionKey: 'counseled', title: 'Counseled History', targetPath: '/counseled', description: 'Completed counseling records.', defaultAllowed: true },
            { permissionKey: 'events', title: 'Department Events', targetPath: '/events', description: 'College event management.', defaultAllowed: true },
            { permissionKey: 'reports', title: 'Department Reports', targetPath: '/reports', description: 'Academic performance reports.', defaultAllowed: true },
            { permissionKey: 'peer_facilitators', title: 'Peer Facilitators', targetPath: '/peer-facilitators', description: 'College peer facilitator program.', defaultAllowed: true },
            { permissionKey: 'calendar', title: 'Department Calendar', targetPath: '/calendar', description: 'Department schedule calendar.', defaultAllowed: true },
            { permissionKey: 'export_center', title: 'Export Center', targetPath: '/export-center', description: 'Department CSV exports.', defaultAllowed: true },
            { permissionKey: 'settings', title: 'Department Settings', targetPath: '/settings', description: 'Department configuration.', defaultAllowed: true },
            { permissionKey: 'rbac_control_center', title: 'RBAC Control Center', targetPath: '/rbac-control-center', description: 'System RBAC (restricted to Admin).', defaultAllowed: false }
        ],
        action: [
            { permissionKey: 'approve_applications', title: 'Approve Applications', targetPath: 'action.approve_applications', description: 'Approve admissions applications.', defaultAllowed: true },
            { permissionKey: 'schedule_interviews', title: 'Schedule Interviews', targetPath: 'action.schedule_interviews', description: 'Schedule admissions interviews.', defaultAllowed: true },
            { permissionKey: 'manage_own_department', title: 'Manage Own Department', targetPath: 'action.manage_own_department', description: 'Update department-scoped settings.', defaultAllowed: true },
            { permissionKey: 'delete_records', title: 'Delete Records', targetPath: 'action.delete_records', description: 'Hard record deletion (restricted).', defaultAllowed: false }
        ]
    },
    Registrar: {
        table: [
            { permissionKey: 'students', title: 'Students', targetPath: 'public.students', description: 'Student directory and records.', defaultAllowed: true, columns: ['id', 'student_id', 'first_name', 'last_name', 'email'] },
            { permissionKey: 'enrolled_students', title: 'Enrolled Students', targetPath: 'public.enrolled_students', description: 'Enrollment registry and rosters.', defaultAllowed: true, columns: ['id', 'student_id', 'course_id', 'year_level'] },
            { permissionKey: 'courses', title: 'Courses', targetPath: 'public.courses', description: 'Official course offerings.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code'] },
            { permissionKey: 'departments', title: 'Departments', targetPath: 'public.departments', description: 'Department organizational units.', defaultAllowed: true, columns: ['id', 'college_id', 'name', 'code'] },
            { permissionKey: 'colleges', title: 'Colleges', targetPath: 'public.colleges', description: 'College directory master records.', defaultAllowed: true, columns: ['id', 'code', 'name', 'created_at'] },
            { permissionKey: 'applications', title: 'Applications', targetPath: 'public.applications', description: 'Admissions applicant verification.', defaultAllowed: true, columns: ['id', 'student_id', 'program', 'status'] },
            { permissionKey: 'notifications', title: 'Notifications', targetPath: 'public.notifications', description: 'Registrar alerts and notifications.', defaultAllowed: true, columns: ['id', 'user_id', 'message', 'read'] },
            { permissionKey: 'audit_logs', title: 'Audit Logs', targetPath: 'public.audit_logs', description: 'Registrar audit log inspection.', defaultAllowed: true, columns: ['id', 'staff_id', 'action', 'timestamp'] },
            { permissionKey: 'counseling_requests', title: 'Counseling Requests', targetPath: 'public.counseling_requests', description: 'Counseling records (restricted to Care Staff).', defaultAllowed: false, columns: ['id', 'student_id', 'status'] },
            { permissionKey: 'needs_assessment_answers', title: 'Needs Assessment Answers', targetPath: 'public.needs_assessment_answers', description: 'Student assessment answers (restricted).', defaultAllowed: false, columns: ['id', 'student_id', 'answer'] }
        ],
        function: [
            { permissionKey: 'manage_student_accounts', title: 'Manage Student Accounts', targetPath: 'rpc.manage_student_accounts', description: 'Correct student profile information and enrollment keys.', defaultAllowed: true },
            { permissionKey: 'provision_staff_account', title: 'Provision Staff Account', targetPath: 'rpc.provision_staff_account', description: 'Staff account provisioning (restricted to Admin).', defaultAllowed: false }
        ],
        feature: [
            { permissionKey: 'registrar_portal', title: 'Registrar Portal', targetPath: '/registrar', description: 'Dedicated portal for registrar workflows.', defaultAllowed: true },
            { permissionKey: 'student_population', title: 'Student Population', targetPath: '/student-population', description: 'Directory view of all enrolled students.', defaultAllowed: true },
            { permissionKey: 'export_center', title: 'Export Center', targetPath: '/export-center', description: 'Official enrollment exports.', defaultAllowed: true },
            { permissionKey: 'colleges_master', title: 'Colleges & Master Data', targetPath: '/colleges', description: 'Inspect academic departments.', defaultAllowed: true },
            { permissionKey: 'calendar', title: 'Registrar Calendar', targetPath: '/calendar', description: 'Enrollment calendar deadlines.', defaultAllowed: true },
            { permissionKey: 'account_management', title: 'Account Management', targetPath: '/account-management', description: 'Admin management (restricted to Admin).', defaultAllowed: false }
        ],
        action: [
            { permissionKey: 'export_data', title: 'Export Data', targetPath: 'action.export_data', description: 'Generate certified enrollment reports.', defaultAllowed: true },
            { permissionKey: 'verify_enrollment', title: 'Verify Enrollment', targetPath: 'action.verify_enrollment', description: 'Validate student enrollment status.', defaultAllowed: true },
            { permissionKey: 'update_student_profile', title: 'Update Student Profile', targetPath: 'action.update_student_profile', description: 'Correct official student credentials.', defaultAllowed: true },
            { permissionKey: 'print_reports', title: 'Print Reports', targetPath: 'action.print_reports', description: 'Export official registrar documentation.', defaultAllowed: true },
            { permissionKey: 'archive_records', title: 'Archive Records', targetPath: 'action.archive_records', description: 'Record archival (restricted).', defaultAllowed: false },
            { permissionKey: 'modify_rbac_matrix', title: 'Modify RBAC Matrix', targetPath: 'action.modify_rbac_matrix', description: 'Modify RBAC matrix (restricted to Admin).', defaultAllowed: false }
        ]
    },
    Student: {
        table: [
            { permissionKey: 'students', title: 'Students', targetPath: 'public.students', description: 'Own student profile and credentials.', defaultAllowed: true, columns: ['id', 'student_id', 'first_name', 'last_name', 'email'] },
            { permissionKey: 'counseling_requests', title: 'Counseling Requests', targetPath: 'public.counseling_requests', description: 'Own counseling appointment requests.', defaultAllowed: true, columns: ['id', 'student_id', 'status', 'scheduled_at'] },
            { permissionKey: 'support_requests', title: 'Support Requests', targetPath: 'public.support_requests', description: 'Own support service requests.', defaultAllowed: true, columns: ['id', 'student_id', 'service_type', 'status'] },
            { permissionKey: 'needs_assessment_forms', title: 'Needs Assessment Forms', targetPath: 'public.needs_assessment_forms', description: 'Available needs assessment questionnaires.', defaultAllowed: true, columns: ['id', 'title', 'academic_year', 'status'] },
            { permissionKey: 'needs_assessment_submissions', title: 'Needs Assessment Submissions', targetPath: 'public.needs_assessment_submissions', description: 'Own assessment submission records.', defaultAllowed: true, columns: ['id', 'form_id', 'student_id', 'submitted_at'] },
            { permissionKey: 'events', title: 'Events', targetPath: 'public.events', description: 'Public campus events and activities.', defaultAllowed: true, columns: ['id', 'title', 'location', 'event_date'] },
            { permissionKey: 'event_attendance', title: 'Event Attendance', targetPath: 'public.event_attendance', description: 'Own event time-in records.', defaultAllowed: true, columns: ['id', 'event_id', 'student_id', 'status'] },
            { permissionKey: 'event_feedback', title: 'Event Feedback', targetPath: 'public.event_feedback', description: 'Own event ratings and evaluations.', defaultAllowed: true, columns: ['id', 'event_id', 'student_id', 'rating'] },
            { permissionKey: 'scholarships', title: 'Scholarships', targetPath: 'public.scholarships', description: 'Available scholarship listings.', defaultAllowed: true, columns: ['id', 'title', 'slots', 'deadline'] },
            { permissionKey: 'scholarship_applications', title: 'Scholarship Applications', targetPath: 'public.scholarship_applications', description: 'Own scholarship applications.', defaultAllowed: true, columns: ['id', 'student_id', 'scholarship_id', 'status'] },
            { permissionKey: 'notifications', title: 'Notifications', targetPath: 'public.notifications', description: 'Personal student alerts and updates.', defaultAllowed: true, columns: ['id', 'user_id', 'message', 'read'] },
            { permissionKey: 'audit_logs', title: 'Audit Logs', targetPath: 'public.audit_logs', description: 'Administrative audit logs (restricted).', defaultAllowed: false, columns: ['id', 'action'] }
        ],
        function: [
            { permissionKey: 'manage_student_profile', title: 'Student Profile RPC', targetPath: 'rpc.manage_student_profile', description: 'Update profile information and password credentials.', defaultAllowed: true },
            { permissionKey: 'submit_assessment', title: 'Submit Assessment RPC', targetPath: 'rpc.submit_assessment', description: 'Submit needs assessment answers securely.', defaultAllowed: true }
        ],
        feature: [
            { permissionKey: 'dashboard', title: 'Student Dashboard', targetPath: '/dashboard', description: 'Student home workspace and active items.', defaultAllowed: true },
            { permissionKey: 'profile', title: 'Student Profile', targetPath: '/profile', description: 'Profile info and academic details.', defaultAllowed: true },
            { permissionKey: 'assessment', title: 'Needs Assessment', targetPath: '/assessment', description: 'Complete annual student needs assessment.', defaultAllowed: true },
            { permissionKey: 'counseling', title: 'Counseling Appointments', targetPath: '/counseling', description: 'Book appointments with guidance counselors.', defaultAllowed: true },
            { permissionKey: 'support', title: 'CARE Support', targetPath: '/support', description: 'Request emergency assistance and support.', defaultAllowed: true },
            { permissionKey: 'scholarship', title: 'Scholarship Portal', targetPath: '/scholarship', description: 'Browse and apply for student scholarships.', defaultAllowed: true },
            { permissionKey: 'events', title: 'Campus Events', targetPath: '/events', description: 'View and RSVP to student campus events.', defaultAllowed: true },
            { permissionKey: 'feedback', title: 'Student Feedback', targetPath: '/feedback', description: 'Submit feedback to school administration.', defaultAllowed: true },
            { permissionKey: 'volunteer', title: 'Volunteer & Peer Support', targetPath: '/volunteer', description: 'Peer facilitator volunteer programs.', defaultAllowed: true }
        ],
        action: [
            { permissionKey: 'update_profile', title: 'Update Profile', targetPath: 'action.update_profile', description: 'Edit personal self-service information.', defaultAllowed: true },
            { permissionKey: 'change_security_credentials', title: 'Change Security Credentials', targetPath: 'action.change_security_credentials', description: 'Update login email and password.', defaultAllowed: true },
            { permissionKey: 'complete_assessment', title: 'Complete Assessment', targetPath: 'action.complete_assessment', description: 'Submit needs assessment responses.', defaultAllowed: true },
            { permissionKey: 'request_counseling', title: 'Request Counseling', targetPath: 'action.request_counseling', description: 'Submit counseling intake requests.', defaultAllowed: true },
            { permissionKey: 'apply_scholarship', title: 'Apply Scholarship', targetPath: 'action.apply_scholarship', description: 'Submit scholarship applications.', defaultAllowed: true },
            { permissionKey: 'export_data', title: 'Export Data', targetPath: 'action.export_data', description: 'Administrative data export (restricted).', defaultAllowed: false }
        ]
    },
    Public: {
        table: [
            { permissionKey: 'applications', title: 'NAT Applications', targetPath: 'public.applications', description: 'Public entrance exam applications.', defaultAllowed: true, columns: ['id', 'student_id', 'program', 'status'] },
            { permissionKey: 'nat_requirements', title: 'NAT Requirements', targetPath: 'public.nat_requirements', description: 'Publicly readable exam criteria.', defaultAllowed: true, columns: ['id', 'title', 'description', 'is_active'] },
            { permissionKey: 'events', title: 'Public Events', targetPath: 'public.events', description: 'Publicly announced campus events.', defaultAllowed: true, columns: ['id', 'title', 'location', 'event_date'] },
            { permissionKey: 'scholarships', title: 'Public Scholarships', targetPath: 'public.scholarships', description: 'Public scholarship listings.', defaultAllowed: true, columns: ['id', 'title', 'slots', 'deadline'] },
            { permissionKey: 'students', title: 'Student Records', targetPath: 'public.students', description: 'Internal student directory (restricted).', defaultAllowed: false, columns: ['id', 'email'] }
        ],
        function: [
            { permissionKey: 'submit_nat_application', title: 'Submit NAT Application RPC', targetPath: 'rpc.submit_nat_application', description: 'Submit new entrance exam application without login.', defaultAllowed: true },
            { permissionKey: 'check_application_status', title: 'Check Application Status RPC', targetPath: 'rpc.check_application_status', description: 'Query admission status using applicant reference code.', defaultAllowed: true }
        ],
        feature: [
            { permissionKey: 'nat_portal', title: 'Public NAT Portal', targetPath: '/nat-portal', description: 'Public entrance examination and application portal.', defaultAllowed: true },
            { permissionKey: 'application_tracker', title: 'Application Tracker', targetPath: '/track-status', description: 'Track NAT entrance examination results.', defaultAllowed: true },
            { permissionKey: 'public_announcements', title: 'Public Announcements', targetPath: '/announcements', description: 'Public bulletin and admissions updates.', defaultAllowed: true },
            { permissionKey: 'admin_dashboard', title: 'Admin Dashboard', targetPath: '/admin', description: 'Administrative management (restricted).', defaultAllowed: false }
        ],
        action: [
            { permissionKey: 'submit_application', title: 'Submit Application', targetPath: 'action.submit_application', description: 'Submit entrance examination application.', defaultAllowed: true },
            { permissionKey: 'check_results', title: 'Check Results', targetPath: 'action.check_results', description: 'Look up examination results.', defaultAllowed: true },
            { permissionKey: 'modify_rbac_matrix', title: 'Modify RBAC Matrix', targetPath: 'action.modify_rbac_matrix', description: 'Administrative controls (restricted).', defaultAllowed: false }
        ]
    }
};

const ResetDefaultsModal = ({
    selectedRoleLabel,
    isResetting,
    onCancel,
    onConfirm
}: {
    selectedRoleLabel: string;
    isResetting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Reset to default permissions?</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        This will replace the current <strong className="text-slate-800">{selectedRoleLabel}</strong> permission set with seeded defaults from the institutional catalog. Custom overrides will be restored.
                    </p>
                </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={isResetting}
                    onClick={onConfirm}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isResetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{isResetting ? 'Resetting...' : 'Confirm Reset'}</span>
                </button>
            </div>
        </div>
    </div>
);

const PermissionToast = ({ toast }: { toast: ToastState }) => {
    if (!toast) return null;
    return (
        <div className="fixed right-5 top-5 z-50 w-full max-w-sm animate-in fade-in slide-in-from-top-3">
            <div className={`rounded-xl border px-4 py-3 shadow-xl backdrop-blur-xs bg-white ${
                toast.type === 'success' ? 'border-emerald-200 text-slate-800' : 'border-rose-200 text-slate-800'
            }`}>
                <div className="flex items-start gap-2.5">
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                    )}
                    <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
                </div>
            </div>
        </div>
    );
};

export default function RolePermissionsPage() {
    const navigate = useNavigate();
    const { session } = useAuth() as any;
    const queryClient = useQueryClient();

    const [selectedRole, setSelectedRole] = useState<Role>('Admin');
    const [activeTab, setActiveTab] = useState<PermissionType>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [localPermissionRecord, setLocalPermissionRecord] = useState<PermissionRecord>({});
    const [toast, setToast] = useState<ToastState>(null);
    const [savingKeys, setSavingKeys] = useState<string[]>([]);
    const [noticeDrafts, setNoticeDrafts] = useState<Record<string, string>>({});
    const [expandedPermissionKeys, setExpandedPermissionKeys] = useState<string[]>([]);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(message) : message;
        setToast({ message: safeMessage, type });
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const timeoutId = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    const { data: dbPermissionsRecord, isLoading: loading } = useQuery({
        queryKey: ['role_permissions', selectedRole],
        queryFn: async () => {
            return await permissionService.getPermissionsForRole(selectedRole);
        }
    });

    const activePermissionsMap = useMemo(() => {
        return {
            ...(dbPermissionsRecord || {}),
            ...localPermissionRecord
        };
    }, [dbPermissionsRecord, localPermissionRecord]);

    const activeCatalog = useMemo(() => {
        return PERMISSION_CATALOG[selectedRole] || PERMISSION_CATALOG.Admin;
    }, [selectedRole]);

    const activeTabItems = useMemo(() => {
        const catalogItems = activeCatalog[activeTab] || [];
        return catalogItems.map((item) => {
            const lookupKey = `${activeTab}:${item.permissionKey}`;
            const resolved = activePermissionsMap[lookupKey];
            const isAllowed = resolved !== undefined ? resolved.isAllowed : item.defaultAllowed;
            const status: PermissionStatus = resolved?.status || (isAllowed ? 'enabled' : 'hidden');
            const noticeText = resolved?.noticeText || null;
            return {
                ...item,
                lookupKey: `${selectedRole}:${activeTab}:${item.permissionKey}`,
                isAllowed,
                status,
                noticeText
            };
        });
    }, [activeCatalog, activePermissionsMap, activeTab, selectedRole]);

    const filteredTabItems = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return activeTabItems.filter((item) => {
            if (statusFilter === 'enabled' && !item.isAllowed) return false;
            if (statusFilter === 'blocked' && item.isAllowed) return false;

            if (!query) return true;
            return (
                item.title.toLowerCase().includes(query) ||
                item.targetPath.toLowerCase().includes(query) ||
                item.permissionKey.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
            );
        });
    }, [activeTabItems, searchTerm, statusFilter]);

    const tabStats = useMemo(() => {
        const getStatsForType = (type: PermissionType) => {
            const items = activeCatalog[type] || [];
            let allowed = 0;
            items.forEach((item) => {
                const lookupKey = `${type}:${item.permissionKey}`;
                const resolved = activePermissionsMap[lookupKey];
                const isAllowed = resolved !== undefined ? resolved.isAllowed : item.defaultAllowed;
                if (isAllowed) allowed++;
            });
            return {
                enabled: allowed,
                total: items.length,
                blocked: items.length - allowed
            };
        };

        return {
            table: getStatsForType('table'),
            function: getStatsForType('function'),
            feature: getStatsForType('feature'),
            action: getStatsForType('action')
        };
    }, [activeCatalog, activePermissionsMap]);

    const roleStats = useMemo(() => {
        const stats: Record<Role, { enabled: number; total: number }> = {
            Admin: { enabled: 0, total: 0 },
            'Care Staff': { enabled: 0, total: 0 },
            'Department Head': { enabled: 0, total: 0 },
            Registrar: { enabled: 0, total: 0 },
            Student: { enabled: 0, total: 0 },
            Public: { enabled: 0, total: 0 }
        };

        SELECTABLE_ROLES.forEach((r) => {
            const roleCat = PERMISSION_CATALOG[r];
            if (!roleCat) return;

            let total = 0;
            let enabled = 0;

            (['table', 'function', 'feature', 'action'] as PermissionType[]).forEach((type) => {
                const items = roleCat[type] || [];
                total += items.length;
                items.forEach((item) => {
                    if (r === selectedRole) {
                        const lookupKey = `${type}:${item.permissionKey}`;
                        const resolved = activePermissionsMap[lookupKey];
                        const isAllowed = resolved !== undefined ? resolved.isAllowed : item.defaultAllowed;
                        if (isAllowed) enabled++;
                    } else {
                        if (item.defaultAllowed) enabled++;
                    }
                });
            });

            stats[r] = { enabled, total };
        });

        return stats;
    }, [activePermissionsMap, selectedRole]);

    const handleSelectRole = useCallback((role: Role) => {
        setSelectedRole(role);
        setLocalPermissionRecord({});
        setExpandedPermissionKeys([]);
        setSearchTerm('');
        setStatusFilter('all');
    }, []);

    const handleSelectTab = useCallback((tab: PermissionType) => {
        setActiveTab(tab);
        setSearchTerm('');
        setStatusFilter('all');
        setExpandedPermissionKeys([]);
    }, []);

    const handleToggle = useCallback(async (
        permissionKey: string,
        currentValue: boolean,
        currentStatus: PermissionStatus,
        currentNoticeText: string | null,
        description: string,
        itemTitle: string
    ) => {
        const nextValue = !currentValue;
        const savingKey = `${selectedRole}:${activeTab}:${permissionKey}`;
        setSavingKeys((prev) => [...prev, savingKey]);

        setLocalPermissionRecord((prev) => ({
            ...prev,
            [`${activeTab}:${permissionKey}`]: {
                isAllowed: nextValue,
                status: nextValue ? 'enabled' : 'hidden',
                noticeText: currentNoticeText,
                description
            }
        }));

        try {
            await permissionService.updatePermission({
                role: selectedRole,
                permissionType: activeTab,
                permissionKey,
                isAllowed: nextValue,
                status: nextValue ? 'enabled' : 'hidden',
                noticeText: currentNoticeText,
                description
            }, session);

            await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
            showToast(`${itemTitle} ${nextValue ? 'enabled' : 'disabled'} for ${ROLE_DISPLAY_LABELS[selectedRole]}.`);
        } catch {
            showToast(`Couldn't update ${itemTitle}.`, 'error');
        } finally {
            setSavingKeys((prev) => prev.filter((k) => k !== savingKey));
        }
    }, [activeTab, queryClient, selectedRole, session, showToast]);

    const handleStatusChange = useCallback(async (
        permissionKey: string,
        nextStatus: PermissionStatus,
        currentNoticeText: string | null,
        description: string,
        itemTitle: string
    ) => {
        const isAllowed = nextStatus !== 'hidden';
        const savingKey = `${selectedRole}:${activeTab}:${permissionKey}`;
        setSavingKeys((prev) => [...prev, savingKey]);

        setLocalPermissionRecord((prev) => ({
            ...prev,
            [`${activeTab}:${permissionKey}`]: {
                isAllowed,
                status: nextStatus,
                noticeText: currentNoticeText,
                description
            }
        }));

        try {
            await permissionService.updatePermission({
                role: selectedRole,
                permissionType: activeTab,
                permissionKey,
                isAllowed,
                status: nextStatus,
                noticeText: currentNoticeText,
                description
            }, session);

            await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
            showToast(`${itemTitle} status updated to ${PERMISSION_STATUS_LABELS[nextStatus]}.`);
        } catch {
            showToast(`Couldn't update status for ${itemTitle}.`, 'error');
        } finally {
            setSavingKeys((prev) => prev.filter((k) => k !== savingKey));
        }
    }, [activeTab, queryClient, selectedRole, session, showToast]);

    const handleSaveNotice = useCallback(async (
        permissionKey: string,
        item: {
            isAllowed: boolean;
            status: PermissionStatus;
            description: string;
            noticeText: string | null;
            title: string;
        }
    ) => {
        const savingKey = `${selectedRole}:${activeTab}:${permissionKey}`;
        const nextNoticeText = noticeDrafts[savingKey] ?? item.noticeText ?? '';
        setSavingKeys((prev) => [...prev, savingKey]);

        try {
            await permissionService.updatePermission({
                role: selectedRole,
                permissionType: activeTab,
                permissionKey,
                isAllowed: item.isAllowed,
                status: item.status,
                noticeText: nextNoticeText,
                description: item.description
            }, session);

            setNoticeDrafts((prev) => {
                const nextDrafts = { ...prev };
                delete nextDrafts[savingKey];
                return nextDrafts;
            });

            await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
            showToast(`Saved notice for ${item.title}.`);
        } catch {
            showToast(`Couldn't save notice for ${item.title}.`, 'error');
        } finally {
            setSavingKeys((prev) => prev.filter((k) => k !== savingKey));
        }
    }, [activeTab, noticeDrafts, queryClient, selectedRole, session, showToast]);

    const handleResetToDefaults = useCallback(async () => {
        if (selectedRole === 'Admin') {
            setIsResetModalOpen(false);
            showToast('Admin access is permanent and fixed.', 'error');
            return;
        }

        setIsResetting(true);
        try {
            await permissionService.resetRoleToDefaults(selectedRole, session);
            await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
            setLocalPermissionRecord({});
            showToast(`${ROLE_DISPLAY_LABELS[selectedRole]} permissions have been reset to defaults.`);
        } catch {
            showToast(`Couldn't reset permissions for ${ROLE_DISPLAY_LABELS[selectedRole]}.`, 'error');
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
        }
    }, [queryClient, selectedRole, session, showToast]);

    const toggleExpansion = useCallback((lookupKey: string) => {
        setExpandedPermissionKeys((prev) =>
            prev.includes(lookupKey) ? prev.filter((k) => k !== lookupKey) : [...prev, lookupKey]
        );
    }, []);

    const expandAll = useCallback(() => {
        setExpandedPermissionKeys(filteredTabItems.map((item) => item.lookupKey));
    }, [filteredTabItems]);

    const collapseAll = useCallback(() => {
        setExpandedPermissionKeys([]);
    }, []);

    const activeRoleMeta = ROLE_METADATA[selectedRole] || ROLE_METADATA.Admin;
    const currentTabMeta = TAB_CONFIG.find((t) => t.key === activeTab) || TAB_CONFIG[0];
    const currentStats = tabStats[activeTab];

    if (session?.role !== 'Admin') {
        return (
            <div className="min-h-screen bg-[#F3F7F9] font-['Outfit',sans-serif] px-4 py-12">
                <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                        <Shield className="h-6 w-6" />
                    </div>
                    <h1 className="mt-4 text-xl font-extrabold text-slate-900">Admin Access Required</h1>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Role permission controls and database policies are restricted to the Admin Control Room.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/dashboard')}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3F7F9] font-['Outfit',sans-serif]">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 space-y-4">

                {/* Section A: Executive Hero Header */}
                <div
                    className="relative rounded-2xl px-5 py-4 text-white overflow-hidden shadow-md space-y-4"
                    style={{
                        background: 'linear-gradient(135deg, #0b2327 0%, #0f3d39 52%, #0a2024 100%)'
                    }}
                >
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background: 'radial-gradient(ellipse at 35% 0%, rgba(16, 185, 129, 0.20) 0%, transparent 65%)'
                        }}
                    />

                    {/* Top Row: Title + Operational Controls */}
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white leading-none">
                                    RBAC Control Center
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-emerald-200">
                                    ROLE PERMISSIONS
                                </span>
                            </div>
                            <p className="text-emerald-100/70 text-xs truncate max-w-3xl">
                                Manage database table & column policies, RPC functions, portal page availability, and operational actions for each system role.
                            </p>
                        </div>

                        {/* Top Buttons Bar */}
                        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/dashboard')}
                                className="py-1.5 px-3 rounded-lg bg-white text-slate-900 font-bold text-xs shadow-2xs hover:bg-slate-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Back to Dashboard</span>
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    permissionService.clearRoleCache(selectedRole);
                                    await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
                                    showToast('Permissions refreshed.');
                                }}
                                className="py-1.5 px-3 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/35 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                <span>Refresh Permissions</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(true)}
                                className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/90 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset to Defaults</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/privacy-policy')}
                                className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/90 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <Shield className="h-3.5 w-3.5" />
                                <span>Privacy Policy</span>
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: 6-Role Selector Bar */}
                    <div className="relative z-10 flex overflow-x-auto pb-1 sm:pb-0 gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-6">
                        {SELECTABLE_ROLES.map((role) => {
                            const isSelected = selectedRole === role;
                            const stats = roleStats[role] || { enabled: 0, total: 0 };
                            return (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleSelectRole(role)}
                                    className={`px-3.5 py-2 rounded-xl flex items-center justify-between gap-2.5 text-xs transition cursor-pointer flex-shrink-0 min-w-[150px] sm:min-w-0 ${
                                        isSelected
                                            ? 'bg-white text-slate-900 font-extrabold shadow-sm'
                                            : 'bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white font-semibold'
                                    }`}
                                >
                                    <span className="truncate">{ROLE_DISPLAY_LABELS[role]}</span>
                                    <span
                                        className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums font-black ${
                                            isSelected
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-white/15 text-emerald-200'
                                        }`}
                                    >
                                        {stats.enabled}/{stats.total}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section B: Content Toolbar & Card Workspace */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5">

                    {/* Controls Row: Category Tabs + Search + Status Filter + Expand/Collapse */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

                        {/* 4 Category Tabs */}
                        <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-2 flex-shrink-0">
                            {TAB_CONFIG.map((tab) => {
                                const isActive = activeTab === tab.key;
                                const stats = tabStats[tab.key];
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => handleSelectTab(tab.key)}
                                        className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer flex-shrink-0 ${
                                            isActive
                                                ? 'bg-slate-900 text-white font-bold shadow-xs'
                                                : 'border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold tabular-nums ${
                                                isActive
                                                    ? 'bg-emerald-400 text-slate-950'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {stats.enabled}/{stats.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search + Status Filter + Expand / Collapse */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Search box */}
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={`Search ${activeTab === 'table' ? 'tables' : activeTab === 'function' ? 'functions' : activeTab === 'feature' ? 'pages' : 'actions'}...`}
                                    className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 w-44 sm:w-52 focus:bg-white focus:outline-emerald-500 focus:border-emerald-500 transition"
                                />
                            </div>

                            {/* Status Filter Segmented Button */}
                            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                        statusFilter === 'all'
                                            ? 'bg-white text-slate-900 font-extrabold shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    All ({currentStats.total})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('enabled')}
                                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                        statusFilter === 'enabled'
                                            ? 'bg-white text-slate-900 font-extrabold shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    Enabled ({currentStats.enabled})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('blocked')}
                                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                        statusFilter === 'blocked'
                                            ? 'bg-white text-slate-900 font-extrabold shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    Blocked ({currentStats.blocked})
                                </button>
                            </div>

                            {/* Expand All / Collapse All */}
                            <button
                                type="button"
                                onClick={expandAll}
                                className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                            >
                                Expand All
                            </button>
                            <button
                                type="button"
                                onClick={collapseAll}
                                disabled={expandedPermissionKeys.length === 0}
                                className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>

                    {/* Subheader: Active Role Badge & Description + Instruction Hint */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${activeRoleMeta.badgeClass}`}>
                                {ROLE_DISPLAY_LABELS[selectedRole]}
                            </span>
                            <span className="text-xs text-slate-500 font-medium truncate">
                                {activeRoleMeta.description}
                            </span>
                        </div>
                        <div className="text-xs text-slate-400 font-normal flex-shrink-0">
                            {currentTabMeta.instructionHint}
                        </div>
                    </div>

                    {/* Cards Grid: 3-column responsive grid */}
                    <div className="pt-1">
                        {loading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                                <p className="mt-3 text-xs font-semibold text-slate-500">Loading RBAC permissions...</p>
                            </div>
                        ) : filteredTabItems.length === 0 ? (
                            <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <Search className="mx-auto h-7 w-7 text-slate-400" />
                                <p className="mt-2 text-sm font-bold text-slate-800">No permissions matched your filter</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Try clearing your search term or switching the status filter to All.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {filteredTabItems.map((item) => {
                                    const isExpanded = expandedPermissionKeys.includes(item.lookupKey);
                                    const isSaving = savingKeys.includes(item.lookupKey);
                                    const isBlocked = !item.isAllowed;

                                    return (
                                        <div
                                            key={item.lookupKey}
                                            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
                                        >
                                            {/* Card Top Row */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                                            {item.title}
                                                        </h3>
                                                        {isBlocked && (
                                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                                Blocked
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Monospace Subtitle */}
                                                    <p className="font-mono text-xs text-slate-400 mt-0.5 tracking-tight truncate">
                                                        {activeTab === 'table' && (
                                                            <>
                                                                {item.targetPath} · {item.isAllowed && item.columns ? `${item.columns.length}/${item.columns.length}` : '0/6'} cols
                                                            </>
                                                        )}
                                                        {activeTab === 'function' && item.targetPath}
                                                        {activeTab === 'feature' && item.targetPath}
                                                        {activeTab === 'action' && item.targetPath}
                                                    </p>
                                                </div>

                                                {/* Switch Toggle + Chevron */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Switch Toggle */}
                                                    <button
                                                        type="button"
                                                        disabled={isSaving}
                                                        onClick={() => handleToggle(
                                                            item.permissionKey,
                                                            item.isAllowed,
                                                            item.status,
                                                            item.noticeText,
                                                            item.description,
                                                            item.title
                                                        )}
                                                        className={`relative inline-flex h-6.5 w-12 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                                            item.isAllowed ? 'bg-emerald-500' : 'bg-slate-200'
                                                        } ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
                                                        aria-label={`Toggle ${item.title}`}
                                                    >
                                                        <span
                                                            className={`inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white shadow-xs transition-transform ${
                                                                item.isAllowed ? 'translate-x-5.5 text-emerald-600' : 'translate-x-0.5 text-slate-300'
                                                            }`}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                                            ) : item.isAllowed ? (
                                                                <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                                                            ) : null}
                                                        </span>
                                                    </button>

                                                    {/* Chevron Expander */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpansion(item.lookupKey)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                                        aria-expanded={isExpanded}
                                                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
                                                    >
                                                        <ChevronDown
                                                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                                                isExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expandable Details Area */}
                                            {isExpanded && (
                                                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-3">
                                                    <p className="text-xs text-slate-500 leading-relaxed">
                                                        {item.description}
                                                    </p>

                                                    {/* Tab 1: Tables & Columns */}
                                                    {activeTab === 'table' && (
                                                        <div className="space-y-2.5">
                                                            {/* CRUD Operations */}
                                                            <div>
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                                    CRUD Operations
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((op) => (
                                                                        <span
                                                                            key={op}
                                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                                                item.isAllowed
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                                                            }`}
                                                                        >
                                                                            {op}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Column List */}
                                                            {item.columns && item.columns.length > 0 && (
                                                                <div>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                                        Column-Level Policies ({item.isAllowed ? item.columns.length : 0}/{item.columns.length})
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {item.columns.map((col) => (
                                                                            <span
                                                                                key={col}
                                                                                className={`font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                                                                                    item.isAllowed
                                                                                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                                                                                        : 'bg-slate-50/50 text-slate-400 border-slate-100 line-through'
                                                                                }`}
                                                                            >
                                                                                {col}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Tab 2: Functions (RPC) */}
                                                    {activeTab === 'function' && (
                                                        <div>
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                                RPC Signature & Security
                                                            </div>
                                                            <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 space-y-1">
                                                                <div className="font-semibold text-slate-800">
                                                                    FUNCTION {item.targetPath}() RETURNS jsonb
                                                                </div>
                                                                <div className="text-slate-400 text-[10px]">
                                                                    SECURITY DEFINER · EXECUTE GRANTED TO authenticated
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tab 3: Portal Pages */}
                                                    {activeTab === 'feature' && (
                                                        <div className="space-y-2.5">
                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                <label className="block">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                                        Page Status
                                                                    </span>
                                                                    <select
                                                                        value={item.status}
                                                                        disabled={isSaving}
                                                                        onChange={(e) => handleStatusChange(
                                                                            item.permissionKey,
                                                                            e.target.value as PermissionStatus,
                                                                            item.noticeText,
                                                                            item.description,
                                                                            item.title
                                                                        )}
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
                                                                    >
                                                                        <option value="enabled">Enabled</option>
                                                                        <option value="hidden">Hidden</option>
                                                                        <option value="maintenance">Under Maintenance</option>
                                                                        <option value="coming_soon">Coming Soon</option>
                                                                    </select>
                                                                </label>
                                                                <div className="text-[11px] leading-relaxed text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-2">
                                                                    Hidden removes page from navigation. Maintenance and Coming Soon show the locked notice.
                                                                </div>
                                                            </div>

                                                            <label className="block">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                                    Locked Page Notice
                                                                </span>
                                                                <textarea
                                                                    rows={2}
                                                                    value={noticeDrafts[item.lookupKey] ?? item.noticeText ?? ''}
                                                                    disabled={isSaving}
                                                                    onChange={(e) => setNoticeDrafts((prev) => ({
                                                                        ...prev,
                                                                        [item.lookupKey]: e.target.value
                                                                    }))}
                                                                    placeholder={getPermissionNotice({
                                                                        isAllowed: item.isAllowed,
                                                                        status: item.status,
                                                                        noticeText: item.noticeText,
                                                                        description: item.description
                                                                    }, item.title)}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                                                                />
                                                            </label>

                                                            <div className="flex gap-2">
                                                                <AsyncButton
                                                                    type="button"
                                                                    disabled={isSaving}
                                                                    onClick={() => handleSaveNotice(item.permissionKey, item)}
                                                                    className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                                                                >
                                                                    Save Notice
                                                                </AsyncButton>
                                                                <button
                                                                    type="button"
                                                                    disabled={isSaving}
                                                                    onClick={() => {
                                                                        setNoticeDrafts((prev) => {
                                                                            const nextDrafts = { ...prev };
                                                                            delete nextDrafts[item.lookupKey];
                                                                            return nextDrafts;
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                                                                >
                                                                    Clear Draft
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tab 4: Actions */}
                                                    {activeTab === 'action' && (
                                                        <div>
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                                Action Execution Policy
                                                            </div>
                                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                                                                <div>
                                                                    Audit Tracking: <span className="font-semibold text-emerald-700">Active Logging in public.audit_logs</span>
                                                                </div>
                                                                <div className="text-slate-400 text-[10px]">
                                                                    Permission Check: Requires explicit grant in public.role_permissions
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reset Defaults Confirmation Modal */}
            {isResetModalOpen && (
                <ResetDefaultsModal
                    selectedRoleLabel={ROLE_DISPLAY_LABELS[selectedRole]}
                    isResetting={isResetting}
                    onCancel={() => setIsResetModalOpen(false)}
                    onConfirm={handleResetToDefaults}
                />
            )}

            {/* Floating Toast Notification */}
            {toast && <PermissionToast toast={toast} />}
        </div>
    );
}
