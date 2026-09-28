# Portal Workflows

Workflow reference for the five user-facing portals of the NORSU-G CARE system.
Last updated: 2026-07-14.

The big picture — one applicant travels through all five portals:

```
NAT Portal (apply) → CARE Center (schedule/encode NAT) → Dept Portal (interview/approve)
    → student enrolls → Student Portal (activate + profile + services)
    → CARE Center / Dept Portal (process service requests) → Registrar (view/export records)
```

---

## 1. NAT Portal (public application)

**Who:** The general public — young people applying to take the NORSU Admission Test. No account needed to start.
**Entry:** `src/pages/NATPortal.tsx`, wizard in `src/pages/public/nat/`.

### Applying

1. Applicant opens the public NAT portal (availability itself is permission-gated; staff can close the portal).
2. Accepts the **data privacy consent** (required before submit).
3. Completes a 3-step wizard (drafts are auto-saved and restored if the browser closes):
   - **Personal Info** — name, DOB, age, sex, civil status, etc.
   - **Course Selection** — picks a priority course; **the college is automatically derived from the course**. Also picks the **exam venue, date, and time slot**. Each course has an application limit — full or closed courses cannot be selected.
   - **Contact Details** — address, mobile, and the **email + password** that become their portal credentials.
4. On submit the applicant gets an **Application Status summary screen** showing their name, priority course, reference ID, and their **username/password** — they are told to save these.

### Temporary applicant session

- Logging in with those credentials opens a **temporary NAT session** (token-based, persisted via `src/lib/natApplicantSession.ts`, auto-refreshed every 90 seconds, with an expiry).
- Inside the session the applicant can only **view their own application**: status, exam schedule/venue, and results as staff update them.
- Security: three failed logins flag the username for a security check; login is protected by Turnstile.

### Application status lifecycle

```
Submitted → (CARE schedules exam) → Ongoing → results encoded:
    "Qualified for Interview (1st Choice)"  or  "Failed"
→ (Dept) "Interview Scheduled" → "Approved for Enrollment" or "Application Unsuccessful"
→ "Enrolled"
```

The applicant watches this progress from their NAT session; CARE Center and the Department portal drive the transitions (see §3 and §4).

---

## 2. Student Portal

**Who:** Enrolled students. This is where they activate an account, complete their student profile for staff to use (scholarships, services), and access all student services.
**Entry:** `src/pages/student/` (`StudentPortalPage.tsx`), activation in `features/auth/`.

### Account activation (open intake)

1. Student opens the activation wizard (`ActivationWizard.tsx`) and enters: **student ID number, course, full name, address, mobile, email, DOB, sex, and a password**.
2. Registration is **open intake** — the student ID is *not* validated against a master list, because the registrar has not/will not export real student ID numbers into the database.
   - The **enrollment key** mechanism (which would validate IDs against real records) exists but is **switched off** via the activation policy toggle (`requireEnrollmentKey` in `studentActivationPolicy`, controlled by staff governance).
3. Consequences of open intake, and how they're handled:
   - **Wrong student ID entered** → fixed later by CARE staff using the **ID Swap** feature (§3, Population).
   - **Correct ID already taken by someone else's mistake** → that student can't register with it; staff free the ID with the same swap/edit tools, then the student proceeds.
4. On success the student sees their credentials and logs in (username or email + password).

### Profile completion

- After first login, a **profile completion gate** (`useStudentProfileCompletionGate` + `ProfileCompletionModal`) prompts the student to finish their profile — this is the data staff rely on for scholarships and services.
- The profile wizard steps: **Education → Family Background → Guardian → Emergency Contact → Socio-Economic → Scholarships → Activities → Finish**, plus profile photo and document uploads (previewed and stored per category).

### Services (portal views)

| View | What the student does |
|---|---|
| Dashboard | Overview, announcements, quick actions, guided tour |
| My Profile | View/edit the multi-step profile, upload documents |
| Needs Assessment | Fill out the needs-assessment form for CARE review |
| Counseling | Request counseling → request enters the **department queue** first (status `Submitted`); dept schedules it or refers it to CARE; student sees status/schedule |
| Additional Support | Request support → goes to **CARE Center** (`Submitted`), which may forward to the department; student tracks status through completion |
| Scholarship | View and apply for scholarships |
| Events | See events targeted at them, register/confirm attendance |
| Feedback | Submit service feedback |
| Volunteer Form | Volunteer sign-up |
| Office visits | Log visits to the CARE office (logbook) |

Every view is permission-gated — staff can disable individual student features and the student sees an availability notice instead.

---

## 3. CARE Center (staff portal)

**Who:** CARE Center staff — the operational hub of the whole system.
**Entry:** `src/pages/CareStaffDashboard.tsx`, features in `src/pages/carestaff/features/`.

Tabs: Home, Dashboard, Population, Analytics, NAT, Counseling, Support, Events, Calendar, Scholarship, Forms, Feedback, Export Center, Settings, Audit, Logbook.

### Key workflows

**NAT management** (`features/nat`)
1. See all NAT applications with filters and pagination.
2. **Schedule exams** (venue/date/time via the schedule modal) → applicant status becomes `Ongoing` on exam day.
3. **Encode results**: pass → `Qualified for Interview (1st Choice)`, or `Failed`. Bulk pass supported via CSV upload (`reference_id, applicant_name`).
4. Passers become visible to the matching college's Department portal for interview screening; CARE keeps monitoring through `Approved for Enrollment` → `Enrolled`.

**Population** (`features/population`) — the master student directory
- Search/filter all registered students; view full profiles with documents by category.
- **Edit student records** (StudentEditModal).
- **ID Swap** (IdSwapModal): fixes students who activated with the wrong student ID — swaps/reassigns IDs between records. (Server-side: the `swap_student_ids` RPC is locked down so only staff paths can call it.)
- **Enrollment Keys** (EnrollmentKeysModal): manages the validation keys — currently dormant while `requireEnrollmentKey` is off.
- **Archive/restore** students; danger-zone bulk operations for data cleanup.

**Counseling** (`features/counseling`)
- **Central approval gate**: Student counseling requests (`Submitted`/`Pending`) land in CARE's "Needs Review" queue first. CARE evaluates each request:
  - **Approve** → status becomes `Approved` and routes to the matching College Department queue.
  - **Reject** → terminal `Rejected`.
- **Handling Returned & Forwarded Cases**:
  - College rejections return to CARE as `Returned_To_Care` (handled in the "Returned to CARE" tab). CARE can schedule in-house (`Staff_Scheduled`) or terminal-reject (`Rejected`).
  - College referrals forward to CARE as `Referred` ("Forwarded" tab).
  - CARE can schedule sessions for `Referred` and `Returned_To_Care` requests (`Staff_Scheduled`), and mark them `Completed`.
- **Outcome Statuses & Re-counseling (Menu Actions)**:
  - On completed sessions, authorized staff (`manage_counseling_outcome` permission) use the 3-dot / right-click / long-press menu to set official outcomes:
    - **Counseled**: Session successfully addressed the student's concerns.
    - **Monitoring**: Session addressed concerns; student placed under routine monitoring.
    - **Subject for 2nd Counseling**: Student requires follow-up counseling.
    - **Rescheduled**: Re-dates the same session row (status `Rescheduled`).
    - **Schedule Follow-up Session**: Creates a new linked request (`follow_up_of` parent ID) and marks parent `Subject_For_2nd_Counseling`.
  - All outcome statuses (`Completed`, `Counseled`, `Monitoring`, `Subject_For_2nd_Counseling`) remain fully eligible for student evaluation and feedback.

**Additional Support** (`features/support`)
- Queue of new requests (`Submitted`) → CARE reviews and **forwards to the student's department** (`Forwarded to Dept`).
- Monitors dept updates (`Visit Scheduled`, `Resolved by Dept`, `Referred to CARE`, `Approved`, `Rejected`) and closes the loop with `Completed`.

**Other features**
- **Events**: create campus events, define audiences, track attendance.
- **Scholarship**: manage scholarship offerings and student applications.
- **Forms**: review submitted needs-assessment forms.
- **Feedback / Analytics**: student feedback review and population analytics.
- **Export Center**: bulk exports of student data (including counseling requests with follow-up links).
- **Logbook**: office-visit log.
- **Audit**: staff action audit trail.
- **Settings / Governance**: account security (OTP-verified email change, password change) and system policies — including the enrollment-key activation toggle and feature permissions that gate what every other portal can see.

---

## 4. Department / College Portal

**Who:** Department (college) staff — each account is scoped to its own college; they only see their college's applicants and students.
**Entry:** `src/pages/DeptDashboard.tsx`, features in `src/pages/dept/features/`.

Modules: Home, Admissions Screening, Interview Queue, Counseling, Counseled Students, Students, College Events, Additional Support, Calendar, Export Center, Reports, Settings.

### Key workflows

**Admissions Screening + Interview Queue** (`features/admissions`)
1. NAT passers whose priority course belongs to this college appear in **Admissions Screening**.
2. Dept schedules interviews (ApplicantScheduleModal) — with an **email preview/send** step to notify applicants → status `Interview Scheduled`.
3. **Interview Queue** shows the day's interviewees by date; absences are tracked (`Absent`).
4. After interviewing, dept marks each applicant **`Approved for Enrollment`** or **`Application Unsuccessful`**; approved applicants proceed to `Enrolled`.

**Counseling Queue + Counseled Students** (`features/counseling`)
1. Only requests approved by CARE (`Approved`) appear in the college's **For Review** queue.
2. College either:
   - **Approve & Schedule**: Sets session date/time → `Scheduled`.
   - **Reject**: Returns the case to CARE (`Returned_To_Care`) with explanation notes.
3. Conducting sessions: Department counselors conduct `Scheduled` or `Rescheduled` sessions, then:
   - Mark as **`Completed`**.
   - Or **Forward to CARE Staff** (`Referred`) if unresolved at the college level.
4. **Counseled Students**: Read-only history of completed and outcome-stamped sessions (`Completed`, `Counseled`, `Monitoring`, `Subject_For_2nd_Counseling`). Outcome status management is exclusively handled by CARE staff.

**Additional Support approvals** (`features/support`)
- Requests **forwarded by CARE** (`Forwarded to Dept`) appear here. Dept responds: schedule a visit (`Visit Scheduled`), resolve (`Resolved by Dept`), approve/reject, or send back (`Referred to CARE`). CARE then completes the case.

**Students** — the college's own student list with cascade filters (year level → course → section), search, and profile viewing.

**Other**: College Events with attendance, Reports, Export Center, shared staff Calendar, and Settings (profile, OTP email change, password). Every module is permission-gated; disabled modules show an availability view.

---

## 5. Registrar Portal

**Who:** Registrar office staff.
**Entry:** `src/pages/registrar/RegistrarPortal.tsx` → single feature: `RegistrarStudentPopulationPage.tsx`.

Deliberately narrow — **read-only viewing of student lists**:

1. Log in → land on the **Student Directory**.
2. **Search** (debounced) and **filter** by department, course, year level, and status, with pagination and sorting.
3. **View full student profiles**, including uploaded documents by the same profile categories CARE staff use (photo, documents, etc.). Incomplete profiles are flagged.
4. **Export to Excel** — pulls all students for export; profile export links expire after 7 days.

No editing, no workflow actions — the registrar consumes the data students entered in the Student Portal, which is also why activation is open intake (§2): the data flows *toward* the registrar, not from them.

---

## Cross-cutting notes

- **Permissions**: every portal/tab/feature is gated by the role-permission system (`usePermissions`, managed from the Admin portal's Role Permissions page). A disabled feature renders an availability notice rather than disappearing silently.
- **Status machines** for counseling and support live in [workflow.ts](src/utils/workflow.ts) — treat that file as the source of truth for which portal owns which status.
- There is also a sixth, internal **Admin portal** (staff accounts, colleges/courses, role permissions, governance, audit) that provisions and configures everything above; it is out of scope for this document since it has no student/applicant-facing workflow.
