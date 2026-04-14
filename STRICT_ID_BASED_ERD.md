# Strict ID-Based ERD for NORSU CARE Center System

This version follows the requested workflow and strictly applies the structural rules:

- every entity uses an auto-generated integer primary key named `entity_name_id`
- foreign keys use `referenced_entity_id`
- attributes use lowercase with underscores
- duplicate data is reduced by separating repeating or different data into proper entities

This is a logical, implementation-ready ERD for the current system. It is stricter than the current physical schema in `supabase/schema.sql`, which still uses some UUID keys, text-based foreign keys, and combined fields.

## STEP 1: UNDERSTAND THE SYSTEM

### System Purpose

The system is a multi-portal student services and admissions platform for the NORSU CARE Center. It manages NAT applications, interview scheduling, student account activation, student services, scholarships, events, forms, feedback, and role-based staff operations.

### Users

- applicant
- student
- care staff
- department head / department admissions staff
- admin

### Core Operations

- submit NAT application
- choose preferred courses
- schedule admission test and interview activities
- review applicant status and interview results
- activate student accounts
- manage student profiles
- submit and process counseling requests
- submit and process support requests
- publish scholarships and accept scholarship applications
- create events, attendance logs, and event feedback
- create forms and collect assessment answers
- record office visits
- send notifications and collect service feedback

## STEP 2: EXTRACT FEATURES

Major system functionalities:

1. department and course management
2. staff account management
3. NAT scheduling and applicant registration
4. applicant course choice handling
5. interview scheduling and rescheduling
6. student profile management
7. NAT requirement management
8. counseling request management
9. support request management
10. scholarship management
11. event management
12. assessment form management
13. office visit logbook
14. student notifications
15. general service feedback

## STEP 3: CONVERT FEATURES -> ENTITIES

Main entities derived from the features:

- department
- course
- staff_account
- nat_schedule
- application
- application_choice
- interview_schedule
- student
- nat_requirement
- application_requirement
- counseling_request
- support_request
- scholarship
- scholarship_application
- event
- event_attendance
- event_feedback
- form
- question
- submission
- answer
- office_visit_reason
- office_visit
- notification
- general_feedback

## STEP 4: EXTRACT ATTRIBUTES

Attributes were taken only from actual system inputs and outputs such as:

- applicant registration fields
- interview scheduling forms
- student profile forms
- counseling and support request forms
- scholarship posting and application forms
- event creation, attendance, and feedback forms
- needs assessment forms and analytics outputs
- office visit logbook entries
- notifications and service feedback entries

## STEP 5: DEFINE RELATIONSHIPS

Relationships are based on ownership and real-world process flow:

- one department manages many courses and staff accounts
- one NAT schedule can be used by many applications
- one application can contain many course choices
- one application can have many interview schedule records because rescheduling is allowed
- one student can create many counseling requests, support requests, submissions, office visits, notifications, and feedback records
- one scholarship can receive many scholarship applications
- one event can have many attendance and feedback records
- one form can contain many questions and many submissions
- one submission can contain many answers

## A. ENTITIES AND ATTRIBUTES

Department
- department_id (PK)
- department_name

Course
- course_id (PK)
- department_id (FK)
- course_name
- capacity
- application_limit
- course_status

StaffAccount
- staff_account_id (PK)
- department_id (FK)
- username
- full_name
- role
- email
- date_created

NatSchedule
- nat_schedule_id (PK)
- schedule_date
- venue
- slot_count
- time_window
- is_active
- date_created

Application
- application_id (PK)
- nat_schedule_id (FK)
- first_name
- middle_name
- last_name
- suffix
- email
- mobile_number
- civil_status
- nationality
- street
- city
- province
- zip_code
- place_of_birth
- date_of_birth
- age
- sex
- gender_identity
- facebook_url
- reference_code
- username
- application_status
- date_created

ApplicationChoice
- application_choice_id (PK)
- application_id (FK)
- course_id (FK)
- choice_order

InterviewSchedule
- interview_schedule_id (PK)
- application_id (FK)
- interview_date
- interview_time
- venue
- panel_name
- queue_status
- schedule_status
- date_created

Student
- student_id (PK)
- application_id (FK)
- course_id (FK)
- student_number
- first_name
- middle_name
- last_name
- suffix
- year_level
- student_status
- email
- mobile_number
- address
- profile_picture_url
- profile_completed
- date_created

NatRequirement
- nat_requirement_id (PK)
- requirement_name
- date_created

ApplicationRequirement
- application_requirement_id (PK)
- application_id (FK)
- nat_requirement_id (FK)
- requirement_status
- remarks

CounselingRequest
- counseling_request_id (PK)
- student_id (FK)
- department_id (FK)
- request_type
- description
- scheduled_datetime
- request_status
- resolution_notes
- confidential_notes
- feedback_comment
- feedback_rating
- date_created

SupportRequest
- support_request_id (PK)
- student_id (FK)
- department_id (FK)
- support_type
- description
- student_document_url
- care_note
- care_document_url
- department_note
- resolution_note
- request_status
- date_created

Scholarship
- scholarship_id (PK)
- title
- description
- requirements
- deadline
- date_created

ScholarshipApplication
- scholarship_application_id (PK)
- scholarship_id (FK)
- student_id (FK)
- application_status
- date_created

Event
- event_id (PK)
- title
- event_type
- description
- location
- event_date
- start_time
- end_time
- latitude
- longitude
- date_created

EventAttendance
- event_attendance_id (PK)
- event_id (FK)
- student_id (FK)
- check_in_time
- check_out_time
- proof_url
- latitude
- longitude

EventFeedback
- event_feedback_id (PK)
- event_id (FK)
- student_id (FK)
- rating
- feedback_comment
- q1_score
- q2_score
- q3_score
- q4_score
- q5_score
- q6_score
- q7_score
- best_part
- suggestion
- additional_comment
- date_submitted

Form
- form_id (PK)
- title
- description
- is_active
- date_created

Question
- question_id (PK)
- form_id (FK)
- question_text
- question_type
- scale_min
- scale_max
- question_order

Submission
- submission_id (PK)
- form_id (FK)
- student_id (FK)
- date_submitted

Answer
- answer_id (PK)
- submission_id (FK)
- question_id (FK)
- answer_value
- answer_text
- date_created

OfficeVisitReason
- office_visit_reason_id (PK)
- reason_name
- is_active
- date_created

OfficeVisit
- office_visit_id (PK)
- office_visit_reason_id (FK)
- student_id (FK)
- time_in
- time_out
- visit_status

Notification
- notification_id (PK)
- student_id (FK)
- message
- is_read
- date_created

GeneralFeedback
- general_feedback_id (PK)
- student_id (FK)
- client_type
- service_availed
- cc1
- cc2
- cc3
- sqd0
- sqd1
- sqd2
- sqd3
- sqd4
- sqd5
- sqd6
- sqd7
- sqd8
- suggestion
- email
- date_created

## B. RELATIONSHIPS

- One Department can have many Courses (1:N)
- One Department can have many StaffAccounts (1:N)
- One Course can have many ApplicationChoices (1:N)
- One Course can have many Students (1:N)
- One NatSchedule can have many Applications (1:N)
- One Application can have many ApplicationChoices (1:N)
- One Application can have many InterviewSchedules (1:N)
- One Application can have many ApplicationRequirements (1:N)
- One Application can create one Student record after admission (1:1, optional)
- One NatRequirement can have many ApplicationRequirements (1:N)
- One Student can have many CounselingRequests (1:N)
- One Department can have many CounselingRequests (1:N)
- One Student can have many SupportRequests (1:N)
- One Department can have many SupportRequests (1:N)
- One Scholarship can have many ScholarshipApplications (1:N)
- One Student can have many ScholarshipApplications (1:N)
- One Event can have many EventAttendance records (1:N)
- One Student can have many EventAttendance records (1:N)
- One Event can have many EventFeedback records (1:N)
- One Student can have many EventFeedback records (1:N)
- One Form can have many Questions (1:N)
- One Form can have many Submissions (1:N)
- One Student can have many Submissions (1:N)
- One Submission can have many Answers (1:N)
- One Question can have many Answers (1:N)
- One OfficeVisitReason can have many OfficeVisits (1:N)
- One Student can have many OfficeVisits (1:N)
- One Student can have many Notifications (1:N)
- One Student can have many GeneralFeedback records (1:N)

## C. TEXT-BASED ERD STRUCTURE

Department ----< Course
Department ----< StaffAccount
NatSchedule ----< Application ----< ApplicationChoice >---- Course
Application ----< InterviewSchedule
Application ----< ApplicationRequirement >---- NatRequirement
Application ---- Student

Student ----< CounselingRequest >---- Department
Student ----< SupportRequest >---- Department
Scholarship ----< ScholarshipApplication >---- Student

Event ----< EventAttendance >---- Student
Event ----< EventFeedback >---- Student

Form ----< Question
Form ----< Submission ----< Answer
Question ----< Answer
Student ----< Submission

OfficeVisitReason ----< OfficeVisit >---- Student
Student ----< Notification
Student ----< GeneralFeedback

## D. OPTIONAL IMPROVEMENTS

- If you want this logical ERD to match the current database exactly, convert only the key names and keep the existing physical field types during migration.
- Add unique constraints to prevent duplicate records where needed, such as one scholarship application per student per scholarship and one event attendance record per student per event.
- If interview history needs full audit tracking, keep `interview_schedule` as a history table and add a `is_current` field.
- If the institution wants to track uploaded requirement files per applicant, extend `application_requirement` with `document_url` and `verified_by_staff_account_id`.
- If account security and audit logging are part of the final scope, add supporting entities such as `security_change_otp` and `audit_log`.
