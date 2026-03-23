# Presentation ERD

Simplified ERD based on `supabase/schema.sql` for presentation use.
Only the major modules, tables, and key columns are included.

## Figure 1: Admissions and Academic Structure

```mermaid
erDiagram
    DEPARTMENTS {
        bigint id PK
        text name
    }

    COURSES {
        bigint id PK
        bigint department_id FK
        text name
        integer application_limit
        text status
    }

    ADMISSION_SCHEDULES {
        bigint id PK
        date date
        text venue
        integer slots
        boolean is_active
    }

    APPLICATIONS {
        uuid id PK
        text priority_course FK
        date test_date FK
        text reference_id
        text first_name
        text last_name
        text email
        text status
    }

    STUDENTS {
        bigint id PK
        text course FK
        text department FK
        text student_id
        text first_name
        text last_name
        text year_level
        text status
    }

    STAFF_ACCOUNTS {
        bigint id PK
        text department FK
        text username
        text full_name
        text role
        text email
    }

    DEPARTMENTS ||--o{ COURSES : has
    DEPARTMENTS ||--o{ STUDENTS : groups
    DEPARTMENTS ||--o{ STAFF_ACCOUNTS : manages
    COURSES ||--o{ APPLICATIONS : chosen_in
    ADMISSION_SCHEDULES ||--o{ APPLICATIONS : scheduled_on
    COURSES ||--o{ STUDENTS : enrolls
```

## Figure 2: Student Services and Scholarship

```mermaid
erDiagram
    STUDENTS {
        bigint id PK
        text student_id
        text first_name
        text last_name
        text course
        text year_level
        text status
    }

    COUNSELING_REQUESTS {
        bigint id PK
        text student_id FK
        text department FK
        text request_type
        text status
        timestamptz scheduled_date
    }

    SUPPORT_REQUESTS {
        bigint id PK
        text student_id FK
        text department FK
        text support_type
        text status
        text resolution_notes
    }

    SCHOLARSHIPS {
        bigint id PK
        text title
        date deadline
        text description
    }

    SCHOLARSHIP_APPLICATIONS {
        bigint id PK
        bigint scholarship_id FK
        text student_id FK
        text status
    }

    STUDENTS ||--o{ COUNSELING_REQUESTS : submits
    STUDENTS ||--o{ SUPPORT_REQUESTS : submits
    STUDENTS ||--o{ SCHOLARSHIP_APPLICATIONS : applies_for
    SCHOLARSHIPS ||--o{ SCHOLARSHIP_APPLICATIONS : receives
```

## Figure 3: Needs Assessment and Forms Module

```mermaid
erDiagram
    FORMS {
        bigint id PK
        text title
        text description
        boolean is_active
    }

    QUESTIONS {
        bigint id PK
        bigint form_id FK
        text question_text
        text question_type
        integer order_index
    }

    SUBMISSIONS {
        bigint id PK
        bigint form_id FK
        text student_id FK
        timestamptz submitted_at
    }

    ANSWERS {
        bigint id PK
        bigint submission_id FK
        bigint question_id FK
        integer answer_value
        text answer_text
    }

    STUDENTS {
        bigint id PK
        text student_id
        text first_name
        text last_name
    }

    FORMS ||--o{ QUESTIONS : contains
    FORMS ||--o{ SUBMISSIONS : collects
    STUDENTS ||--o{ SUBMISSIONS : submits
    SUBMISSIONS ||--o{ ANSWERS : stores
    QUESTIONS ||--o{ ANSWERS : answered_by
```

## Figure 4: Events and Participation

```mermaid
erDiagram
    EVENTS {
        bigint id PK
        text title
        text type
        date event_date
        text location
    }

    EVENT_ATTENDANCE {
        bigint id PK
        bigint event_id FK
        text student_id FK
        timestamptz time_in
        timestamptz time_out
        text proof_url
    }

    EVENT_FEEDBACK {
        bigint id PK
        bigint event_id FK
        text student_id FK
        integer rating
        text feedback
        timestamptz submitted_at
    }

    STUDENTS {
        bigint id PK
        text student_id
        text first_name
        text last_name
    }

    EVENTS ||--o{ EVENT_ATTENDANCE : tracks
    EVENTS ||--o{ EVENT_FEEDBACK : gathers
    STUDENTS ||--o{ EVENT_ATTENDANCE : attends
    STUDENTS ||--o{ EVENT_FEEDBACK : gives
```

## Notes

- Needs assessment is represented through the `FORMS`, `QUESTIONS`, `SUBMISSIONS`, and `ANSWERS` module.
- Scholarship is included because it is an active student support feature in the current schema and codebase.
- Minor or technical tables such as `audit_logs`, `notifications`, `security_change_otps`, and `office_visit_reasons` are intentionally omitted for clarity.
