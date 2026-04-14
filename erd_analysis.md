# ERD Analysis for NORSU CARE Center System

This analysis follows the requested workflow and is based on the current repository implementation, especially:

- `supabase/schema.sql`
- approved feature scope in `APPROVED_FEATURE_CHECKLIST.md`
- application routes and modules under `src/pages`

## System Description Used for Analysis

The system is a multi-portal student services and admissions platform for NORSU CARE Center. It supports NAT applicant intake, admissions scheduling and interview handling, student profile management, counseling and support workflows, scholarship applications, events, form-based assessments, office logbook tracking, notifications, and role-based staff administration.

## STEP 1: Understand the System

### Main Purpose of the System

- Manage applicant intake through the NAT portal.
- Support the transition from applicant to enrolled student and activated student account.
- Deliver student services through the Student Portal and staff dashboards.
- Give Admin, Department, and CARE Staff role-based control over records, workflows, and reporting.

### Types of Users Involved

- Applicant / NAT examinee
- Student
- CARE Staff
- Department Head / department admissions staff
- Admin

### Key Operations Performed

- Submit NAT application and track applicant status
- Schedule and reschedule interviews
- Manage interview outcomes and admissions decisions
- Activate student portal accounts using enrollment records
- Maintain student profiles
- Submit and process counseling requests
- Submit and process support requests
- Publish scholarships and accept scholarship applications
- Create events, record attendance, and collect event feedback
- Create forms, collect submissions, and analyze answers
- Record office visits
- Send notifications and collect service feedback
- Manage departments, courses, staff accounts, and master records

## STEP 2: Extract System Features

Major functional modules confirmed from the codebase and schema:

1. Authentication and role-based access
2. NAT application and applicant status tracking
3. Admissions scheduling, interview queue, and interview updates
4. Student account activation and enrollment verification
5. Student profile management
6. Counseling request and referral management
7. Support request and approval management
8. Scholarship management
9. Event management, attendance, and event evaluation
10. Needs assessment / form management
11. Office visit logbook
12. Notifications
13. General feedback / service quality feedback
14. Admin master data management for departments, courses, and staff
15. Security OTP handling for email/password changes
16. Audit logging

## STEP 3: Convert Features -> Entities

### Core Master Data

- Department
- Course
- StaffAccount
- Student

### Admissions / NAT

- AdmissionSchedule
- Application
- EnrolledStudent
- NATRequirement

### Student Services

- CounselingRequest
- SupportRequest
- Scholarship
- ScholarshipApplication
- Notification
- OfficeVisitReason
- OfficeVisit
- GeneralFeedback

### Events

- Event
- EventAttendance
- EventFeedback

### Assessment Forms

- Form
- Question
- Submission
- Answer

### Supporting Operational Tables

- SecurityChangeOtp
- AuditLog
- StudentActivationSetting

## STEP 4: Extract Attributes From Data Flow

Only practical attributes already present in the implementation were kept. Repeating profile fields were trimmed to the most useful ERD-level attributes.

### Department

- `id`
- `name`

### Course

- `id`
- `name`
- `department_id`
- `capacity`
- `application_limit`
- `status`
- `created_at`

### StaffAccount

- `id`
- `username`
- `full_name`
- `role`
- `department`
- `email`
- `auth_user_id`
- `created_at`

### Student

- `id`
- `student_id`
- `first_name`
- `last_name`
- `middle_name`
- `course`
- `year_level`
- `department`
- `status`
- `email`
- `mobile`
- `address`
- `profile_picture_url`
- `profile_completed`
- `auth_user_id`
- `created_at`

### AdmissionSchedule

- `id`
- `date`
- `venue`
- `slots`
- `time_windows`
- `is_active`
- `created_at`

### Application

- `id`
- `reference_id`
- `first_name`
- `last_name`
- `middle_name`
- `email`
- `mobile`
- `priority_course`
- `alt_course_1`
- `alt_course_2`
- `test_date`
- `status`
- `interview_date`
- `interview_queue_status`
- `interview_venue`
- `interview_panel`
- `student_id`
- `created_at`

### EnrolledStudent

- `student_id`
- `assigned_to_email`
- `course`
- `year_level`
- `status`
- `is_used`
- `created_at`

### NATRequirement

- `id`
- `name`
- `created_at`

### CounselingRequest

- `id`
- `student_id`
- `student_name`
- `department`
- `request_type`
- `description`
- `status`
- `scheduled_date`
- `resolution_notes`
- `confidential_notes`
- `feedback`
- `rating`
- `created_at`

### SupportRequest

- `id`
- `student_id`
- `student_name`
- `department`
- `support_type`
- `description`
- `documents_url`
- `status`
- `care_notes`
- `care_documents_url`
- `dept_notes`
- `resolution_notes`
- `created_at`

### Scholarship

- `id`
- `title`
- `description`
- `requirements`
- `deadline`
- `created_at`

### ScholarshipApplication

- `id`
- `scholarship_id`
- `student_id`
- `status`
- `created_at`

### Event

- `id`
- `title`
- `type`
- `description`
- `location`
- `event_date`
- `event_time`
- `end_time`
- `latitude`
- `longitude`
- `created_at`

### EventAttendance

- `id`
- `event_id`
- `student_id`
- `student_name`
- `checked_in_at`
- `time_in`
- `time_out`
- `proof_url`
- `latitude`
- `longitude`
- `department`

### EventFeedback

- `id`
- `event_id`
- `student_id`
- `student_name`
- `rating`
- `feedback`
- `submitted_at`
- `q1_score` to `q7_score`
- `open_best`
- `open_suggestions`
- `open_comments`

### Form

- `id`
- `title`
- `description`
- `is_active`
- `created_at`

### Question

- `id`
- `form_id`
- `question_text`
- `question_type`
- `scale_min`
- `scale_max`
- `order_index`
- `created_at`

### Submission

- `id`
- `form_id`
- `student_id`
- `submitted_at`

### Answer

- `id`
- `submission_id`
- `question_id`
- `answer_value`
- `answer_text`
- `created_at`

### OfficeVisitReason

- `id`
- `reason`
- `is_active`
- `created_at`

### OfficeVisit

- `id`
- `student_id`
- `student_name`
- `reason`
- `time_in`
- `time_out`
- `status`

### Notification

- `id`
- `student_id`
- `message`
- `is_read`
- `created_at`

### GeneralFeedback

- `id`
- `student_id`
- `student_name`
- `client_type`
- `service_availed`
- `cc1`
- `cc2`
- `cc3`
- `sqd0` to `sqd8`
- `suggestions`
- `email`
- `created_at`

### Supporting Tables

#### SecurityChangeOtp

- `id`
- `auth_user_id`
- `account_type`
- `purpose`
- `target_email`
- `otp_hash`
- `expires_at`
- `consumed_at`
- `attempt_count`
- `created_at`

#### AuditLog

- `id`
- `user_name`
- `action`
- `details`
- `created_at`

#### StudentActivationSetting

- `id`
- `require_enrollment_key`
- `updated_at`
- `updated_by`

## STEP 5: Define Relationships

### Core Relationships

- One Department can have many Courses.
- One Department can have many StaffAccounts.
- One Department can have many Students.
- One Course can have many Students.
- One Course can have many EnrolledStudents.

### Admissions Relationships

- One AdmissionSchedule can have many Applications.
- One Course can be chosen by many Applications as priority course.
- One Course can be chosen by many Applications as alternative course 1.
- One Course can be chosen by many Applications as alternative course 2.
- One Student may be linked to an Application after enrollment through `applications.student_id`.

### Student Services Relationships

- One Student can have many CounselingRequests.
- One Department can receive many CounselingRequests.
- One Student can have many SupportRequests.
- One Department can receive many SupportRequests.
- One Scholarship can have many ScholarshipApplications.
- One Student can have many ScholarshipApplications.
- One Student can have many Notifications.
- One OfficeVisitReason can have many OfficeVisits.
- One Student can have many OfficeVisits.
- One Student can submit many GeneralFeedback records.

### Events Relationships

- One Event can have many EventAttendance records.
- One Student can have many EventAttendance records.
- One Department can be referenced by many EventAttendance records.
- One Event can have many EventFeedback records.
- One Student can submit many EventFeedback records.

### Assessment Relationships

- One Form can have many Questions.
- One Form can have many Submissions.
- One Student can have many Submissions.
- One Submission can have many Answers.
- One Question can have many Answers.

### Supporting Relationships

- `SecurityChangeOtp`, `AuditLog`, and `StudentActivationSetting` are supporting tables.
- Their current links to Student or Staff account context are handled mostly through auth IDs or application logic, not strong foreign keys in the schema snapshot.

## STEP 6: Assign Keys

### Primary Keys

- Every entity above has a single-column primary key:
  - numeric identity keys for most operational tables
  - UUID for `Application`, `GeneralFeedback`, and `SecurityChangeOtp`
  - text primary key for `EnrolledStudent.student_id`

### Foreign Keys

- `Course.department_id -> Department.id`
- `StaffAccount.department -> Department.name`
- `Student.department -> Department.name`
- `Student.course -> Course.name`
- `Application.priority_course -> Course.name`
- `Application.alt_course_1 -> Course.name`
- `Application.alt_course_2 -> Course.name`
- `Application.test_date -> AdmissionSchedule.date`
- `Application.student_id -> Student.student_id`
- `EnrolledStudent.course -> Course.name`
- `CounselingRequest.department -> Department.name`
- `CounselingRequest.student_id -> Student.student_id`
- `SupportRequest.department -> Department.name`
- `SupportRequest.student_id -> Student.student_id`
- `ScholarshipApplication.scholarship_id -> Scholarship.id`
- `ScholarshipApplication.student_id -> Student.student_id`
- `Notification.student_id -> Student.student_id`
- `OfficeVisit.reason -> OfficeVisitReason.reason`
- `OfficeVisit.student_id -> Student.student_id`
- `EventAttendance.event_id -> Event.id`
- `EventAttendance.department -> Department.name`
- `EventAttendance.student_id -> Student.student_id`
- `EventFeedback.event_id -> Event.id`
- `EventFeedback.student_id -> Student.student_id`
- `Question.form_id -> Form.id`
- `Submission.form_id -> Form.id`
- `Submission.student_id -> Student.student_id`
- `Answer.submission_id -> Submission.id`
- `Answer.question_id -> Question.id`

## STEP 7: Simplify and Validate

### Simplifications Applied

- The ERD keeps one table per real feature area and avoids inventing derived entities.
- Cross-cutting utility tables are separated from the core business flow to keep the model readable.
- Repeating profile details in `students` were not exploded into extra family/address tables because the current implementation stores them in one profile record.

### Validation Notes

- The design is practical because it matches the current schema and portal workflows.
- The most important relationship pattern is `Student` as the center of service records.
- `Department` and `Course` work as shared master data for admissions and student services.
- `Form -> Question -> Submission -> Answer` is already normalized and should stay that way.

### Current Structural Weak Points

- Several foreign keys use `name` fields instead of numeric IDs.
- `applications` stores three separate course choice columns, which is denormalized.
- `nat_requirements` is currently a master list only and is not tied to specific applications.
- `SecurityChangeOtp` and `StudentActivationSetting` rely on auth/application logic more than relational constraints.
- A legacy `needs_assessments` table exists in migrations, but the active implementation uses `forms`, `questions`, `submissions`, and `answers`.

## Recommended Core ERD Scope

For presentation or defense, the cleanest implementation-ready ERD should emphasize these entities first:

- Department
- Course
- StaffAccount
- Student
- AdmissionSchedule
- Application
- CounselingRequest
- SupportRequest
- Scholarship
- ScholarshipApplication
- Event
- EventAttendance
- EventFeedback
- Form
- Question
- Submission
- Answer
- OfficeVisitReason
- OfficeVisit
- Notification
- GeneralFeedback

Then mention these as supporting tables:

- EnrolledStudent
- NATRequirement
- SecurityChangeOtp
- AuditLog
- StudentActivationSetting
