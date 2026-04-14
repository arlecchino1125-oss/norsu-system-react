# Schema Cleanup Plan

This plan defines a cleaner target schema for the NORSU CARE Center system so the database is easier to reason about, easier to draw in one ERD, and safer to extend.

## Why the current schema feels messy

The current schema works, but it is hard to model cleanly because it mixes:

- identity data
- master data
- service transactions
- denormalized display fields

### Main problems in the current schema

1. Generic column names
- Many tables use `id`, `name`, `status`, and `department` without context.
- This makes the ERD harder to read because keys do not explain what they identify.

2. Text-based foreign keys
- Several tables reference `departments.name`, `courses.name`, or `students.student_id`.
- This is fragile and makes renames harder.

3. Mixed actor and service data
- `staff_accounts` currently stores Admin, Care Staff, and Department Head in one flat structure.
- `applications` stores applicant details, applicant login details, interview state, and course choices in one record.

4. Repeated department and student display values
- Some service tables store `student_name`, `department`, or similar values that can be derived through relationships.

5. Service boundaries are not obvious
- Counseling, support, events, scholarships, NAT, and forms all exist, but the schema does not visually separate them into clean modules.

## Recommended cleanup direction

Use a layered schema:

1. Identity layer
- shared account records
- role-specific profile tables

2. Master data layer
- departments
- courses
- NAT schedules
- NAT requirements
- office visit reasons

3. Service layer
- applications and admissions
- students and student services
- scholarships
- events
- forms and assessments
- feedback and notifications

4. Support layer
- audit logs
- security OTPs
- student activation settings

## Recommended user/account structure

Do **not** duplicate all login columns across separate admin and staff tables.

Instead, use:

- `accounts`
  - shared login/auth identity
- `admin_profiles`
  - profile table for admins
- `care_staff_profiles`
  - profile table for CARE Staff
- `department_staff_profiles`
  - profile table for department-side users

This keeps login fields centralized while still separating internal roles clearly in the ERD.

### Why this is better than one flat `staff_accounts` table

- Admin is now clearly separated from department and CARE roles.
- Department assignment lives only where it actually applies.
- Shared account fields are not duplicated.
- The ERD becomes cleaner because role-specific responsibilities are clearer.

## Recommended naming rules

### Table names

Use plural snake_case table names consistently.

Examples:
- `departments`
- `courses`
- `accounts`
- `applications`
- `counseling_requests`

### Primary keys

Use explicit key names:

- `department_id`
- `course_id`
- `account_id`
- `application_id`
- `student_id`

### Foreign keys

Always reference the target key by name:

- `department_id`
- `course_id`
- `account_id`
- `student_id`

Do not reference text labels like `department` or `course`.

## Recommended structural changes by area

### 1. Identity and internal roles

Replace:
- `staff_accounts`

With:
- `accounts`
- `admin_profiles`
- `care_staff_profiles`
- `department_staff_profiles`

### 2. Applicants and admissions

Keep applicant profile data in `applications`, but move repeating or relationship-heavy data into separate tables:

- `application_choices`
- `interview_schedules`
- `application_requirements`

This removes too much responsibility from `applications`.

### 3. Students

Keep `students` as the main enrolled-student profile table, but:

- use `student_id` as the surrogate PK
- use `student_number` as the business identifier
- remove direct `department` text where it can be derived from `course_id`

### 4. Department ownership

Departments should be referenced by:

- `department_id`

Courses belong to departments, and department staff belong to departments.
Students should normally derive department through course unless there is a real business reason to store both.

### 5. Service tables

Service tables should store only what belongs to the transaction:

- `counseling_requests`
- `support_requests`
- `scholarship_applications`
- `event_attendance`
- `event_feedback`
- `submissions`
- `answers`
- `office_visits`
- `notifications`
- `general_feedback`

Avoid storing repeated labels like `student_name` unless you intentionally need immutable historical snapshots.

## Tables that should use composite keys

These are good candidates for composite PKs because the relationship defines the row:

- `application_choices`
  - `(application_id, choice_order)`
- `application_requirements`
  - `(application_id, nat_requirement_id)`
- `scholarship_applications`
  - `(scholarship_id, student_id)`
- `event_attendance`
  - `(event_id, student_id)`
- `event_feedback`
  - `(event_id, student_id)`
- `answers`
  - `(submission_id, question_id)`

## Recommended target modules for the all-in-one ERD

### Identity
- `accounts`
- `admin_profiles`
- `care_staff_profiles`
- `department_staff_profiles`

### Master data
- `departments`
- `courses`
- `nat_schedules`
- `nat_requirements`
- `office_visit_reasons`

### Admissions
- `applications`
- `application_choices`
- `interview_schedules`
- `application_requirements`

### Student profile
- `students`
- `enrollment_registry`

### Services
- `counseling_requests`
- `support_requests`
- `scholarships`
- `scholarship_applications`
- `events`
- `event_attendance`
- `event_feedback`
- `forms`
- `questions`
- `submissions`
- `answers`
- `office_visits`
- `notifications`
- `general_feedback`

### Support
- `audit_logs`
- `security_change_otps`
- `student_activation_settings`

## Migration strategy

Do this in phases instead of one destructive rewrite.

### Phase 1: Introduce clean tables
- Create new v2 tables with proper key names.
- Do not remove old tables yet.

### Phase 2: Backfill relationships
- Copy current data into the new structure.
- Resolve text-based department and course references into IDs.

### Phase 3: Update application code
- Switch frontend and edge functions to use the new names and relationships.

### Phase 4: Remove legacy fields
- Drop old text-based foreign keys and duplicated fields only after all code has moved.

## Recommendation

The best next step is:

1. approve a cleaned target schema
2. generate a v2 ERD from that schema
3. write migration SQL after the target is stable

That gives you a clean database design without breaking the current system too early.
