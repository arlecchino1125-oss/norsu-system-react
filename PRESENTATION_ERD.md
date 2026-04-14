# Presentation-Ready ERD for NORSU CARE Center System

This ERD is based on the current repository implementation and follows a feature-driven, implementation-ready approach.

## A. ENTITIES AND ATTRIBUTES

### Core Master Data

- `Department`
  - PK: `id`
  - Attributes: `name`

- `Course`
  - PK: `id`
  - Attributes: `name`, `capacity`, `application_limit`, `status`, `created_at`
  - FK: `department_id -> Department.id`

- `StaffAccount`
  - PK: `id`
  - Attributes: `username`, `full_name`, `role`, `email`, `auth_user_id`, `created_at`
  - FK: `department -> Department.name`

- `Student`
  - PK: `id`
  - Attributes: `student_id`, `first_name`, `last_name`, `middle_name`, `course`, `year_level`, `status`, `email`, `mobile`, `address`, `profile_picture_url`, `profile_completed`, `auth_user_id`, `created_at`
  - FK: `department -> Department.name`, `course -> Course.name`

### Admissions / NAT

- `AdmissionSchedule`
  - PK: `id`
  - Attributes: `date`, `venue`, `slots`, `time_windows`, `is_active`, `created_at`

- `Application`
  - PK: `id`
  - Attributes: `reference_id`, `first_name`, `last_name`, `middle_name`, `email`, `mobile`, `status`, `interview_date`, `interview_queue_status`, `interview_venue`, `interview_panel`, `created_at`
  - FK: `priority_course -> Course.name`, `alt_course_1 -> Course.name`, `alt_course_2 -> Course.name`, `test_date -> AdmissionSchedule.date`, `student_id -> Student.student_id`

- `EnrolledStudent`
  - PK: `student_id`
  - Attributes: `assigned_to_email`, `course`, `year_level`, `status`, `is_used`, `created_at`
  - FK: `course -> Course.name`

- `NATRequirement`
  - PK: `id`
  - Attributes: `name`, `created_at`

### Student Services

- `CounselingRequest`
  - PK: `id`
  - Attributes: `student_name`, `request_type`, `description`, `status`, `scheduled_date`, `resolution_notes`, `confidential_notes`, `feedback`, `rating`, `created_at`
  - FK: `student_id -> Student.student_id`, `department -> Department.name`

- `SupportRequest`
  - PK: `id`
  - Attributes: `student_name`, `support_type`, `description`, `documents_url`, `status`, `care_notes`, `care_documents_url`, `dept_notes`, `resolution_notes`, `created_at`
  - FK: `student_id -> Student.student_id`, `department -> Department.name`

- `Scholarship`
  - PK: `id`
  - Attributes: `title`, `description`, `requirements`, `deadline`, `created_at`

- `ScholarshipApplication`
  - PK: `id`
  - Attributes: `status`, `created_at`
  - FK: `scholarship_id -> Scholarship.id`, `student_id -> Student.student_id`

- `Notification`
  - PK: `id`
  - Attributes: `message`, `is_read`, `created_at`
  - FK: `student_id -> Student.student_id`

- `OfficeVisitReason`
  - PK: `id`
  - Attributes: `reason`, `is_active`, `created_at`

- `OfficeVisit`
  - PK: `id`
  - Attributes: `student_name`, `time_in`, `time_out`, `status`
  - FK: `student_id -> Student.student_id`, `reason -> OfficeVisitReason.reason`

- `GeneralFeedback`
  - PK: `id`
  - Attributes: `student_name`, `client_type`, `service_availed`, `cc1`, `cc2`, `cc3`, `sqd0`, `sqd1`, `sqd2`, `sqd3`, `sqd4`, `sqd5`, `sqd6`, `sqd7`, `sqd8`, `suggestions`, `email`, `created_at`
  - FK: no enforced foreign key in schema snapshot, but records are student-submitted and carry `student_id`

### Events

- `Event`
  - PK: `id`
  - Attributes: `title`, `type`, `description`, `location`, `event_date`, `event_time`, `end_time`, `latitude`, `longitude`, `created_at`

- `EventAttendance`
  - PK: `id`
  - Attributes: `student_name`, `checked_in_at`, `time_in`, `time_out`, `proof_url`, `latitude`, `longitude`
  - FK: `event_id -> Event.id`, `student_id -> Student.student_id`, `department -> Department.name`

- `EventFeedback`
  - PK: `id`
  - Attributes: `student_name`, `rating`, `feedback`, `submitted_at`, `q1_score`, `q2_score`, `q3_score`, `q4_score`, `q5_score`, `q6_score`, `q7_score`, `open_best`, `open_suggestions`, `open_comments`
  - FK: `event_id -> Event.id`, `student_id -> Student.student_id`

### Assessment Forms

- `Form`
  - PK: `id`
  - Attributes: `title`, `description`, `is_active`, `created_at`

- `Question`
  - PK: `id`
  - Attributes: `question_text`, `question_type`, `scale_min`, `scale_max`, `order_index`, `created_at`
  - FK: `form_id -> Form.id`

- `Submission`
  - PK: `id`
  - Attributes: `submitted_at`
  - FK: `form_id -> Form.id`, `student_id -> Student.student_id`

- `Answer`
  - PK: `id`
  - Attributes: `answer_value`, `answer_text`, `created_at`
  - FK: `submission_id -> Submission.id`, `question_id -> Question.id`

### Supporting Operational Tables

- `SecurityChangeOtp`
  - PK: `id`
  - Attributes: `auth_user_id`, `account_type`, `purpose`, `target_email`, `otp_hash`, `expires_at`, `consumed_at`, `attempt_count`, `created_at`

- `AuditLog`
  - PK: `id`
  - Attributes: `user_name`, `action`, `details`, `created_at`

- `StudentActivationSetting`
  - PK: `id`
  - Attributes: `require_enrollment_key`, `updated_at`, `updated_by`

## B. RELATIONSHIPS

### Core Relationships

- One Department can have many Courses (1:N).
- One Department can have many StaffAccounts (1:N).
- One Department can have many Students (1:N).
- One Course can have many Students (1:N).
- One Course can have many EnrolledStudents (1:N).

### Admissions Relationships

- One AdmissionSchedule can have many Applications (1:N).
- One Course can be selected by many Applications as a priority course (1:N).
- One Course can be selected by many Applications as alternative course 1 (1:N).
- One Course can be selected by many Applications as alternative course 2 (1:N).
- One Student may be linked to an admitted Application after activation/enrollment (logical 1:1 or 1:N depending on policy; current schema does not fully enforce this).

### Student Services Relationships

- One Student can have many CounselingRequests (1:N).
- One Department can handle many CounselingRequests (1:N).
- One Student can have many SupportRequests (1:N).
- One Department can handle many SupportRequests (1:N).
- One Scholarship can have many ScholarshipApplications (1:N).
- One Student can have many ScholarshipApplications (1:N).
- One Student can have many Notifications (1:N).
- One OfficeVisitReason can have many OfficeVisits (1:N).
- One Student can have many OfficeVisits (1:N).

### Events Relationships

- One Event can have many EventAttendance records (1:N).
- One Student can have many EventAttendance records (1:N).
- One Event can have many EventFeedback records (1:N).
- One Student can have many EventFeedback records (1:N).

### Assessment Relationships

- One Form can have many Questions (1:N).
- One Form can have many Submissions (1:N).
- One Student can have many Submissions (1:N).
- One Submission can have many Answers (1:N).
- One Question can have many Answers (1:N).

## C. TEXT-BASED ERD STRUCTURE

### Core Structure

`Department ----< Course`

`Department ----< StaffAccount`

`Department ----< Student`

`Course ----< Student`

`Course ----< EnrolledStudent`

### Admissions Structure

`AdmissionSchedule ----< Application`

`Course ----< Application`

`Student ----< Application`

### Student Services Structure

`Student ----< CounselingRequest >---- Department`

`Student ----< SupportRequest >---- Department`

`Scholarship ----< ScholarshipApplication >---- Student`

`Student ----< Notification`

`OfficeVisitReason ----< OfficeVisit >---- Student`

`Student ----< GeneralFeedback`

### Events Structure

`Event ----< EventAttendance >---- Student`

`Department ----< EventAttendance`

`Event ----< EventFeedback >---- Student`

### Assessment Structure

`Form ----< Question`

`Form ----< Submission ----< Answer`

`Question ----< Answer`

`Student ----< Submission`

## D. OPTIONAL IMPROVEMENTS

- Replace text-based foreign keys such as `department -> Department.name` and `course -> Course.name` with numeric ID foreign keys for stronger referential integrity.
- Normalize course preferences in `Application` into an `ApplicationChoice` table instead of storing `priority_course`, `alt_course_1`, and `alt_course_2` as separate columns.
- Add an `ApplicationRequirement` table to connect `NATRequirement` to each applicant and track statuses such as submitted, missing, verified, or waived.
- If interview panels need member-level tracking, add `InterviewPanel` and `InterviewPanelMember` instead of keeping `interview_panel` as plain text.
- Link `GeneralFeedback` to `Student.student_id` with an enforced FK for cleaner reporting consistency.
- Formally retire or migrate the legacy `needs_assessments` table, since the active normalized design already uses `Form`, `Question`, `Submission`, and `Answer`.
