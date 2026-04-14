# Core Services and Composite-Key ERD for NORSU CARE Center System

This version proceeds from the idea that your **core features are your services**.  
So before defining keys, the system is organized around the services the platform actually delivers.

## 1. CORE FEATURES FIRST: THESE ARE YOUR SERVICES

Based on the current system, your **core service features** are:

### 1. NAT and Admissions Service

This is the intake service for applicants.

Main functions:
- applicant registration
- NAT schedule selection
- applicant status tracking
- course preference submission
- interview scheduling and rescheduling
- admissions decision workflow
- requirement tracking

### 2. Student Account and Profile Service

This is the service that transforms an admitted applicant into an active student record.

Main functions:
- student account activation
- profile completion
- student information maintenance
- academic identity and course assignment

### 3. Needs Assessment Service

This is the assessment service used to understand student needs and wellness concerns.

Main functions:
- publish assessment forms
- manage questions
- collect submissions
- store answers
- support analytics and trend review

### 4. Counseling Service

This is the counseling workflow service for student concerns and referrals.

Main functions:
- submit counseling requests
- review and schedule sessions
- document resolutions
- collect counseling feedback

### 5. Student Support Service

This is the support workflow for requests that may require CARE Staff and department action.

Main functions:
- submit support requests
- attach supporting documents
- review by staff and department
- record notes and final resolution

### 6. Scholarship Service

This is the service for student grant and scholarship opportunities.

Main functions:
- publish scholarships
- receive scholarship applications
- track scholarship application status

### 7. Events and Participation Service

This is the event service for campus activities and student participation.

Main functions:
- create events
- record attendance
- collect post-event evaluations

### 8. Feedback and Follow-Up Service

This is the service layer for communication and service evaluation.

Main functions:
- send notifications
- collect general service feedback
- track office visits

## 2. SUPPORTING FEATURES, NOT CORE SERVICES

These are important, but they mainly support service delivery rather than being the services themselves:

- department management
- course management
- staff account management
- analytics
- export tools
- audit logging
- security OTP handling

## 3. SERVICE-DRIVEN ENTITY GROUPING

### Shared Master Data

- department
- course
- staff_account
- student

### NAT and Admissions Service

- nat_schedule
- application
- application_choice
- interview_schedule
- nat_requirement
- application_requirement

### Needs Assessment Service

- form
- question
- submission
- answer

### Counseling Service

- counseling_request

### Student Support Service

- support_request

### Scholarship Service

- scholarship
- scholarship_application

### Events and Participation Service

- event
- event_attendance
- event_feedback

### Feedback and Follow-Up Service

- office_visit_reason
- office_visit
- notification
- general_feedback

## 4. WHERE COMPOSITE PRIMARY KEYS MAKE SENSE

These are the tables where the row is defined mainly by its relationship to another record:

- `application_choice`
  - one application has multiple ranked choices
  - better identified by `application_id + choice_order`

- `application_requirement`
  - one application can have many requirements
  - one requirement can belong to many applications
  - better identified by `application_id + nat_requirement_id`

- `scholarship_application`
  - one student applies to one scholarship
  - better identified by `scholarship_id + student_id`

- `event_attendance`
  - one student attends one event
  - better identified by `event_id + student_id`

- `event_feedback`
  - one student submits one feedback record per event
  - better identified by `event_id + student_id`

- `answer`
  - one submission stores one answer per question
  - better identified by `submission_id + question_id`

These are **good places to use PK columns that also act as FK columns**.

## 5. CORE SERVICE ERD WITH COMPOSITE KEYS

## A. ENTITIES AND ATTRIBUTES

### Shared Master Data

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

### NAT and Admissions Service

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
- application_id (PK, FK)
- choice_order (PK)
- course_id (FK)

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

NatRequirement
- nat_requirement_id (PK)
- requirement_name
- date_created

ApplicationRequirement
- application_id (PK, FK)
- nat_requirement_id (PK, FK)
- requirement_status
- remarks

### Needs Assessment Service

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
- submission_id (PK, FK)
- question_id (PK, FK)
- answer_value
- answer_text
- date_created

### Counseling Service

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

### Student Support Service

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

### Scholarship Service

Scholarship
- scholarship_id (PK)
- title
- description
- requirements
- deadline
- date_created

ScholarshipApplication
- scholarship_id (PK, FK)
- student_id (PK, FK)
- application_status
- date_created

### Events and Participation Service

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
- event_id (PK, FK)
- student_id (PK, FK)
- check_in_time
- check_out_time
- proof_url
- latitude
- longitude

EventFeedback
- event_id (PK, FK)
- student_id (PK, FK)
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

### Feedback and Follow-Up Service

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

### Shared Structure

- One Department can have many Courses (1:N)
- One Department can have many StaffAccounts (1:N)
- One Course can have many Students (1:N)
- One Application can become one Student (1:1, optional)

### NAT and Admissions Service

- One NatSchedule can have many Applications (1:N)
- One Application can have many ApplicationChoices (1:N)
- One Course can appear in many ApplicationChoices (1:N)
- One Application can have many InterviewSchedules (1:N)
- One Application can have many ApplicationRequirements (1:N)
- One NatRequirement can appear in many ApplicationRequirements (1:N)

### Needs Assessment Service

- One Form can have many Questions (1:N)
- One Form can have many Submissions (1:N)
- One Student can have many Submissions (1:N)
- One Submission can have many Answers (1:N)
- One Question can have many Answers (1:N)

### Counseling and Support Services

- One Student can have many CounselingRequests (1:N)
- One Department can handle many CounselingRequests (1:N)
- One Student can have many SupportRequests (1:N)
- One Department can handle many SupportRequests (1:N)

### Scholarship Service

- One Scholarship can have many ScholarshipApplications (1:N)
- One Student can have many ScholarshipApplications (1:N)

### Events and Participation Service

- One Event can have many EventAttendance records (1:N)
- One Student can have many EventAttendance records (1:N)
- One Event can have many EventFeedback records (1:N)
- One Student can have many EventFeedback records (1:N)

### Feedback and Follow-Up Service

- One OfficeVisitReason can have many OfficeVisits (1:N)
- One Student can have many OfficeVisits (1:N)
- One Student can have many Notifications (1:N)
- One Student can have many GeneralFeedback records (1:N)

## C. TEXT-BASED ERD STRUCTURE

Department ----< Course
Department ----< StaffAccount
Course ----< Student
Application ---- Student

NatSchedule ----< Application ----< ApplicationChoice >---- Course
Application ----< InterviewSchedule
Application ----< ApplicationRequirement >---- NatRequirement

Form ----< Question
Form ----< Submission ----< Answer
Question ----< Answer
Student ----< Submission

Student ----< CounselingRequest >---- Department
Student ----< SupportRequest >---- Department

Scholarship ----< ScholarshipApplication >---- Student

Event ----< EventAttendance >---- Student
Event ----< EventFeedback >---- Student

OfficeVisitReason ----< OfficeVisit >---- Student
Student ----< Notification
Student ----< GeneralFeedback

## D. OPTIONAL IMPROVEMENTS

- If you want the design to stay closest to the current schema, keep the physical database as is and treat this document as the cleaner logical ERD.
- Add unique rules where appropriate, such as one `course_id` per `application_id + choice_order`.
- If interview history needs stronger tracking, add `scheduled_by_staff_account_id` to `interview_schedule`.
- If requirement uploads must be stored per applicant, add `document_url`, `submitted_at`, and `verified_by_staff_account_id` to `application_requirement`.
- If you want a cleaner service-first presentation, show only the service clusters and move `department`, `course`, and `staff_account` to a separate master-data diagram.
