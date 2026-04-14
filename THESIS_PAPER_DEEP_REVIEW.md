# Deep Review of `CHAPTER 1,2,3,4.docx`

Date reviewed: 2026-04-04

Basis of review:
- Thesis text extracted from `paper_review_tmp/chapter_1_2_3_4.txt`
- Actual codebase routes, pages, and Supabase functions in this repository

## Bottom Line

Your paper and your system are mostly aligned in their core idea.

The strongest matches are:
- CARE-centered student support workflow
- NAT application and admission flow
- student account activation
- counseling and additional support workflows
- scholarship application intake
- events, attendance, and feedback
- office logbook / digital visit logging
- role-based portals

The biggest problems are not major concept errors. They are mostly:
- wording that is broader than the implemented system
- a few internal inconsistencies inside the paper
- a few claims that should be softened so they are easier to defend
- a few technical claims that are only partially supported by the current codebase

My overall judgment:
- The paper is defendable.
- The system is strong enough to support the paper.
- The paper needs tightening so it describes the system precisely, confidently, and safely.

## Important Boundary

I can verify:
- whether the paper's described features exist in the codebase
- whether the user roles, workflows, and architecture claims match the system
- whether the chapter narratives are internally consistent

I cannot fully verify from the codebase alone:
- whether the raw survey responses are authentic
- whether every weighted mean was computed correctly
- whether deployment, training, and migration actually happened in the real campus unless you have separate proof

So for the question "does the data match the codebase?":
- Conceptually, yes, the survey findings and requested features generally match the system that was built.
- Statistically, I cannot certify the raw data calculations from source code alone.

## Overall Verdict

### What clearly matches well

- The system really does have five practical role areas: Applicant, Student, CARE Staff, Department Head, and Admin.
- NAT-related workflows are implemented through the NAT portal and admissions functions.
- Student account activation after approval is implemented.
- Counseling, support requests, needs assessment forms, scholarship applications, event attendance, and feedback are all implemented in the student-facing system.
- CARE Staff tools for analytics, forms, audit logs, logbook, NAT management, scholarships, and events are present.
- Department Head tools for admissions screening, interview scheduling, counseling decisions, support approvals, exports, and reports are present.
- The application-to-student conversion logic described in Chapter 3 is supported by the backend: the `applications` row is used to build the `students` row, then the application record is deleted.

### What is only partially true or needs safer wording

- Admin access to "analytics and reports" is overstated. The admin dashboard is much more focused on account management, student snapshots, resets, and audit monitoring.
- Applicants do not really "manage interviews" in the same sense that staff do. They can track status and wait for department action, but they are not the ones scheduling or rescheduling interviews.
- "Scholarship processing" sounds broader than what is clearly visible in the code. The system definitely supports scholarship posting, application submission, applicant viewing, and export. A full approval or rejection workflow for scholarship applications is not clearly implemented in the current codebase.
- Repeated "clearance issuance" language is risky. The code clearly supports office visit logging and reasons, but not a dedicated clearance-processing module.
- "Automated topic aggregation" for needs assessment is too strong unless you can demonstrate it during defense. The code clearly supports forms and analytics dashboards, but the paper should avoid promising more than you can show.
- Staff self-service security settings are described in the UI, but the current `manage-staff-accounts` edge function only exposes cleanup/delete modes in the source file I checked. That means staff email/password/profile update flows appear only partially backed by the current backend.

### What is internally inconsistent inside the paper

- The paper switches between `CARE Center Management System` and `Student Support and CARE Center Management System`. Pick one official project title and use it everywhere.
- The CARE acronym is inconsistent with `Empowerment`, `Enhancement`, and `Enhancement/Empowerment`.
- The Statement of the Problem has only three major question groups, but the conceptual framework later refers to `Statement Of the Problem Question 4`.
- Chapter 1 says the system is accessible to students, CARE staff, and administrators, but Chapter 3 correctly shows five user roles including Applicants and Department Heads.
- `Benavides et al., 2023` appears in Chapter 1, while the related literature and references list it as `Benavides et al., 2020`.
- `Research Instrument` appears twice as a heading.
- The reference section appears to include duplicated or annotated entries. If your school wants standard APA-style references, the explanatory notes in the reference list should be removed or moved to a separate research matrix.

## Highest-Priority Fixes Before Defense

1. Standardize the official system title across all chapters.
2. Standardize the CARE acronym meaning and stop alternating between `Enhancement` and `Empowerment`.
3. Fix the `Question 4` conceptual-framework reference because your SOP only shows three main questions.
4. Rewrite the scope section so it includes all real system roles: Applicant, Student, CARE Staff, Department Head, and Admin.
5. Tone down claims about admin analytics/reporting.
6. Tone down claims that applicants manage interviews.
7. Replace `clearance issuance` wording with `office visit logging`, `transaction logging`, or `clearance-related visits` unless there is a separate clearance module you have not yet shown.
8. Remove or soften unsupported cutover claims like training, data migration, and full deployment unless you have actual documentation.
9. Clarify that faculty respondents are workflow stakeholders, while the implemented portal role is specifically `Department Head`.
10. Clean the references and duplicated headings.

## Chapter 1 Review

### What is already strong

- The problem background is relevant and grounded in real administrative pain points.
- The rationale for digitizing CARE operations is clear.
- TAM and RAD both fit the nature of the project.
- The scope of student-support operations generally reflects the real system modules.

### Main issues in Chapter 1

#### 1. Your opening language is slightly broader than the system

At line 55, the paper mentions:
- counseling
- academic advising
- resource facilitation
- empowerment programs

The codebase strongly supports:
- counseling
- assessment / NAT workflows
- support resources
- scholarships
- needs assessment forms
- events and feedback

It does not very clearly present itself as a full academic advising system.

Recommendation:
- Replace `academic advising` with `student support, assessment, and referral services`
- Keep the introduction centered on CARE operations, not general advising

#### 2. The paper repeatedly mentions clearances in a way that may overpromise

This appears in several parts of Chapter 1.

Safer wording:
- `office visit logging and transaction tracking`
- `clearance-related visits and general inquiries`
- `manual office transactions`

Why:
- The codebase clearly supports `office_visits` and `office_visit_reasons`
- It does not clearly expose a full dedicated `clearance issuance` workflow

#### 3. The Statement of the Problem objective sentence needs grammar repair

Current idea:
- `analyze, design, develop, and implement CARE Center Management System`

Better:
- `analyze, design, develop, and evaluate a CARE Center Management System`

Or if you truly deployed it:
- `analyze, design, develop, implement, and evaluate a CARE Center Management System`

This reads more academically complete and grammatically correct.

#### 4. The conceptual framework has a major internal inconsistency

The SOP shows only three main question groups:
- current procedures
- challenges
- essential features/components

But the conceptual framework later says:
- `Statement Of the Problem Question 4`

This should be fixed immediately because a panel can catch it quickly.

Best fix:
- Change that sentence so the cutover or evaluation phase is linked to the evaluation dimensions already listed under Question 3 or to the pilot evaluation phase of the methodology.

#### 5. Scope and Limitation under-describes the actual system

The scope says the system is accessible to:
- students
- CARE staff
- administrators

But the actual system clearly includes:
- Applicants
- Students
- CARE Staff
- Department Heads
- Admin

Recommendation:
- Revise the scope so it matches the actual implemented access model

#### 6. `basic security measures only` is conservative, and that is okay

This statement is not a problem.

In fact, it may be safer than overclaiming, because the codebase has:
- protected routes
- role-based access
- audit logs
- security OTP flows for students
- RLS hardening migrations

But staff-side self-service security support looks partially wired in the backend, so staying conservative is better than overselling.

#### 7. The term `indigent` does not match the visible UI wording

The paper uses wording like:
- `working student, indigent`

The UI more clearly uses:
- `Economically Challenged Students`
- `Working Students`
- `Persons with Disabilities`
- `Indigenous Peoples`
- `Orphans`
- and other support categories

Recommendation:
- Standardize paper language to the actual category labels you use in the UI or explain that `indigent` corresponds to `economically challenged students`

#### 8. Chapter 1 has editorial cleanup issues

- duplicate `Research Instrument` heading
- inconsistent capitalization like `Statement Of the Problem`
- inconsistent naming of the system
- inconsistent CARE acronym expansion

### Suggested Chapter 1 wording revisions

#### Suggested revision for the main objective

Use this:

> The main objective of the study is to analyze existing manual workflows, design and develop a web-based CARE Center Management System for NORSU-Guihulngan City Campus, and evaluate its potential to improve the efficiency, accessibility, timeliness, and overall delivery of student support services.

Why this is better:
- grammatically cleaner
- more academic
- safer than claiming full implementation if you only have a prototype or pilot

#### Suggested revision for the background focus paragraph

Use this:

> At NORSU-Guihulngan, the CARE Center handles several administrative student-support functions, including counseling coordination, NAT-related application workflows, student needs assessment forms, additional support requests, scholarship application intake, event participation monitoring, and office visit logging. These activities are heavily dependent on manual records and disconnected files, which slow retrieval, increase staff workload, and make coordination with academic departments more difficult. To address these issues, the study proposes a web-based CARE Center Management System that centralizes records, digitizes service workflows, and provides role-based access for the major users involved in student support operations.

This version is closer to the actual system.

#### Suggested revision for the conceptual framework cutover sentence

Current version is risky because it refers to `Question 4`.

Use this instead:

> Finally, the Cutover or pilot implementation phase involves testing the developed system in realistic scenarios and evaluating whether it addresses the identified needs in terms of efficiency, ease of use, accessibility, timeliness, and user satisfaction.

#### Suggested revision for Scope and Limitation

Use this:

> The study focuses on the design and development of a web-based CARE Center Management System for NORSU-Guihulngan City Campus. The system covers major administrative workflows of the CARE Center, including NAT-related application handling, student account activation, counseling requests and referrals, additional support requests, scholarship application intake, needs assessment forms, office visit logging, and event attendance and feedback tracking. The system supports role-based access for Applicants, Students, CARE Staff, Department Heads, and Admin users.

This is much closer to the codebase.

## Chapter 2 Review

### What matches well

- The respondent count is internally consistent:
  - 643 students
  - 50 faculty
  - 7 CARE staff
  - total = 700
- The general story told by the data matches the system:
  - students struggle with manual processes
  - staff and faculty can function within the manual system but still experience heavy burden
  - all groups strongly prefer the digital system
- The top pain points align with implemented modules:
  - record retrieval -> centralized student records
  - manual applicant screening -> department admissions tools
  - logbook congestion -> digital office visit log
  - event attendance issues -> digital attendance workflow
  - support-request tracking -> department and CARE staff request queues

### What needs improvement

#### 1. Do not present weighted means as proof of universal agreement

Examples of wording to avoid:
- `unanimous`
- `proves`
- `seamless adoption`

Why:
- a weighted mean shows aggregate tendency, not unanimous individual agreement
- a survey cannot prove seamless real-world adoption

Safer wording:
- `indicates strong acceptance`
- `suggests high user readiness`
- `shows favorable evaluation`

#### 2. Be careful with `highest possible ratings`

If an item is rated `4.71`, that is very high, but it is not the literal highest possible score of `5.00`.

Use:
- `highest-rated items`
- `top-rated indicators`

#### 3. Clarify the relationship between faculty respondents and actual system roles

This is important.

Your system role is not `Faculty` in general.
It is specifically closer to:
- `Department Head`
- possibly faculty stakeholders involved in referrals, screening, or endorsement

Recommendation:
- In Chapter 2 and Chapter 4, refer to faculty respondents as `faculty stakeholders` or `department-affiliated faculty respondents`
- Explain that they were included because they participate in referral, endorsement, or screening workflows, even if the implemented system role is more specific

#### 4. Distinguish between evaluation of a prototype and proof of long-term effectiveness

The data supports:
- perceived usefulness
- perceived ease
- acceptance
- alignment with user needs

The data does not fully prove:
- long-term campus-wide effectiveness
- long-term operational efficiency after months or years of deployment

Safer phrasing:
- `The evaluation suggests that users perceive the system as a practical and effective solution to the limitations of the manual process.`

### My judgment on Chapter 2

Chapter 2 is conceptually aligned with the built system.

The only caution is this:
- the codebase can support the feature story
- the codebase cannot independently verify the statistical calculations

So in defense, say:
- the data informed the required features
- the built modules reflect those required features
- the evaluation shows strong acceptance of the proposed workflow improvements

## Chapter 3 Review

### What strongly matches the codebase

#### 1. The five-user model is real

The paper identifies:
- Applicant
- Student
- CARE Staff
- Department Head
- Admin

This matches the implemented route structure and portal organization.

#### 2. The application-to-student transition matches the backend

The paper says the application is used to create an official student record and the original application entry is removed.

This matches the code:
- `activate-student-account/source/index.ts` reads from `applications`
- creates or updates `students`
- then deletes the original `applications` row

This is one of the strongest paper-to-code matches in the whole thesis.

#### 3. Student-side features are mostly described correctly

The student system really includes:
- profile management
- security settings
- needs assessment forms
- counseling requests
- additional support requests
- scholarship application intake
- events
- feedback

#### 4. CARE Staff and Department features are largely real

The codebase supports:
- admissions screening
- interview scheduling and rescheduling
- NAT management
- counseling coordination
- support approvals / forwarding
- forms
- analytics
- events
- exports
- audit logs
- office logbook

### What Chapter 3 overstates or should revise

#### 1. Admin `analytics and reports` is overstated

Current wording makes Admin sound like the main analytics/reporting user.

What the code more clearly shows:
- Admin manages staff accounts
- Admin monitors audit logs
- Admin manages department setup
- Admin handles student snapshots and resets

Recommendation:
- Rewrite admin as primarily an administrative control and audit role, not the main analytics user
- Move analytics/reporting emphasis to CARE Staff and partially to Department users

#### 2. Applicant `interview management` is overstated

Applicants can:
- apply
- monitor status
- wait for department decisions
- activate student access once approved

Applicants do not appear to directly manage interview scheduling or rescheduling the way staff do.

Recommendation:
- Replace `interview management` with `interview status tracking` or `admission status monitoring`

#### 3. Scholarship `processing` should be narrowed

The current code clearly supports:
- posting scholarships
- applying for scholarships
- viewing applicants
- exporting applicant data

It does not clearly show a full scholarship approval/rejection workflow.

Recommendation:
- replace `scholarship processing` with `scholarship posting, application intake, and applicant monitoring`

#### 4. `Automated topic aggregation` should be softened

The code clearly supports:
- forms
- submissions
- answers
- analytics dashboards

But if you cannot live-demo a clear topic aggregation feature, then say:
- `form analytics`
- `submission summaries`
- `response-based reporting`

instead of:
- `automated topic aggregation`

#### 5. Cutover claims are too strong unless documented

The paper says the final phase included:
- deployment in Guihulngan campus
- completed all security features
- user training
- data migration from the old system

These may be true in reality, but they are not proven by the codebase alone.

Recommendation:
- If you do have evidence, keep them and prepare documentation.
- If not, rewrite as:
  - `pilot deployment`
  - `initial security configuration`
  - `orientation for intended users`
  - `preparation for data migration`

#### 6. Staff security features look partially implemented

The front-end CARE Staff and Department dashboards call `manage-staff-accounts` modes like:
- `request-security-otp`
- `confirm-email-change`
- `confirm-password-change`
- `update-self-profile`

But the backend file I checked for `manage-staff-accounts` only exposes:
- `ping`
- `delete-account`
- `delete-all-except`

Why this matters:
- If your paper claims fully implemented staff self-service security settings, a technical panel may ask you to demonstrate them.

Safe defense move:
- describe staff security/profile settings as an available interface area that still requires backend completion if you cannot fully demo it

### Suggested rewrite for the User Application paragraph

Use this:

> The system supports five main user roles: Applicant, Student, CARE Staff, Department Head, and Admin. Applicants use the portal to complete NAT-related application steps, monitor their admission status, and activate student access once approved for enrollment. Students use the portal to manage their profile and account settings, complete forms, apply for scholarships, participate in events, submit feedback, and request counseling and additional support services. CARE Staff oversee core CARE operations such as NAT management, student population records, forms, analytics, events, scholarships, feedback, office logbook monitoring, and audit tracking. Department Heads handle admissions screening, interview scheduling, counseling decisions, and support-related actions within their academic unit. Admin users primarily manage staff accounts, department setup, student access maintenance, and audit monitoring.

This version is much safer and more accurate.

## Chapter 4 Review

### What is good already

- The recommendations section is ambitious and future-oriented.
- The overall conclusion is aligned with the system's purpose.
- The summary of findings follows the narrative established in Chapter 2.

### What should be revised

#### 1. Avoid `automatically recorded and validated`

That line is too strong.

The system does automatically record many transactions, but `validated` implies strict verification across all modules.

Safer alternatives:
- `automatically recorded and easier to monitor`
- `digitally recorded and centrally tracked`
- `captured in a centralized database for monitoring and retrieval`

#### 2. Be careful with full implementation language

If this is still primarily a thesis prototype or pilot, use:
- `developed`
- `pilot-tested`
- `evaluated`

If you say:
- `implemented`
- `ready for long-term use`
- `fully deployed`

be prepared to show actual deployment evidence.

#### 3. Faculty wording should be narrowed

The conclusion currently mentions `faculty members` very broadly.

Safer:
- `faculty stakeholders involved in referrals, screening, or departmental coordination`
- or simply `department-affiliated users`

### Suggested rewrite for the conclusion

Use this:

> This study developed a web-based CARE Center Management System for NORSU-Guihulngan City Campus to improve the administrative delivery of student support services. The system digitizes key workflows such as NAT-related application handling, student account activation, counseling and additional support requests, office visit logging, scholarship application intake, event attendance, and feedback collection. By centralizing records and role-based workflows in one platform, the system reduces dependence on paper-based tracking and makes monitoring, retrieval, and coordination more efficient. The evaluation results suggest that students, faculty stakeholders, and CARE staff view the system as a practical response to the delays, record-management problems, and service bottlenecks of the manual process.

This sounds cleaner, safer, and more defensible.

## Paper vs Codebase Alignment Table

| Paper Claim | Assessment | Notes |
| --- | --- | --- |
| Five user roles exist | Match | Applicant, Student, CARE Staff, Department Head, Admin are all represented in the system structure |
| NAT workflows are part of the system | Match | Strongly supported by the NAT portal and admissions functions |
| Student account activation after approval exists | Match | Strongly supported |
| Application record is converted to student record then removed | Match | Strongly supported by backend logic |
| Counseling requests and approvals are digitized | Match | Strongly supported |
| Additional support workflows are digitized | Match | Strongly supported |
| Needs assessment forms exist | Match | Supported by form management and student submission flows |
| Event attendance and feedback exist | Match | Strongly supported |
| Office logbook exists | Match | Strongly supported |
| Scholarship application processing exists | Partial | Application intake is clear; full approval/rejection workflow is not clearly visible |
| Admin can access analytics and reports | Partial / overstated | Admin is more focused on accounts, reset tools, student snapshot, and audit monitoring |
| Applicants manage interviews | Partial / overstated | Applicants mainly track status; staff manage interview actions |
| Automated topic aggregation exists | Partial | Analytics exist, but the exact aggregation claim should be demonstrated or softened |
| Staff security settings are fully implemented | Partial / risky | UI exists, but backend support looks incomplete in the checked function source |
| System scope covers only students, staff, and administrators | Mismatch | Actual system also includes Applicants and Department Heads |
| Cutover included deployment, training, migration, and completed security | Unsupported from code alone | Keep only if you have external proof |

## Does the Paper Match the System Overall?

Yes, mostly.

My honest answer is:
- the paper matches the overall system direction very well
- the paper matches many of the real modules directly
- the remaining issues are mostly precision issues, not fatal mismatches

If you fix the wording and internal inconsistencies, the paper will feel much more polished and much easier to defend.

## Does the Data Match the Codebase?

### Yes, in concept

The data story matches the codebase because the complaints and requested features line up with actual implemented modules:
- difficulty retrieving records -> centralized records
- manual endorsements and approvals -> department queues and staff queues
- logbook congestion -> digital office visits
- event attendance problems -> digital attendance and feedback
- support-request tracking problems -> support workflows

### No, not provable in computation from code alone

I cannot verify from source code alone:
- whether each weighted mean is correctly computed
- whether every table was calculated correctly
- whether all 700 questionnaire responses are genuine

So the safest academic wording is:
- `The data is consistent with the functional direction of the developed system`

## Likely Defense Questions You Should Prepare For

### 1. Why are faculty respondents included if the system role is Department Head?

Suggested answer:
- Faculty respondents were included as workflow stakeholders because they participate in referral, endorsement, or screening processes. However, the implemented staff-facing academic-unit role in the system is represented more specifically by the Department Head account.

### 2. Is this a fully deployed system or a developed and evaluated prototype?

Suggested answer:
- The study developed and evaluated a working web-based system aligned with real campus workflows. If full campus deployment is still ongoing, describe the current state as pilot implementation or prototype evaluation rather than university-wide operational deployment.

### 3. Can you prove the system handles scholarship processing end-to-end?

Suggested answer:
- The current system clearly supports scholarship posting, application intake, applicant viewing, and applicant export. If approval workflows are still under refinement, present that honestly as a current scope boundary.

### 4. Why does the paper mention clearances?

Suggested answer:
- The system digitizes office visit and transaction logging that can support clearance-related office visits, but the paper should avoid implying a full standalone clearance-processing subsystem unless that module is explicitly implemented.

### 5. How does the paper prove system security?

Suggested answer:
- The system uses role-based access, authentication controls, audit logging, and secured database structures. However, the study frames security conservatively and does not claim enterprise-grade or fully comprehensive security.

## Final Recommendation

If you only have time for a few fixes, do these first:

1. Fix the title and acronym consistency everywhere.
2. Fix the SOP `Question 4` inconsistency.
3. Update the scope to include all real roles.
4. Rewrite the Chapter 3 user-role paragraph.
5. Soften the Admin, Applicant, Scholarship, Clearance, and Cutover claims.
6. Clean the conclusion so it says `recorded and tracked`, not `recorded and validated`.
7. Clean the references and duplicated headings.

## Final Judgment

You do not need to rewrite the whole paper.

What you need is a precision pass.

The system is already strong enough to support a solid thesis.
The paper just needs to describe that system more accurately, more consistently, and more defensibly.

## Feature Alignment for Chapter 3 Wording

### Clearly implemented and safe to claim

- five real user roles: Applicant, Student, CARE Staff, Department Head, and Admin
- NAT application flow, status tracking, interview scheduling by departments, and student account activation after approval
- student needs assessment forms and submissions
- student counseling requests and department/CARE scheduling workflows
- additional support requests with forwarding, scheduling, resolution, and referral flows
- scholarship posting, student application intake, applicant viewing, and applicant export
- event posting, attendance monitoring, proof tracking, and event feedback
- office visit logging and digital transaction tracking
- shared calendar views, exports, and staff audit logs

### Present more carefully in the paper

- `academic advising`
  The system is more clearly a CARE-centered student support, assessment, referral, and coordination platform than a full academic advising system.
- `clearance issuance`
  The code clearly supports office visit logging and transaction tracking, not a dedicated standalone clearance-processing module.
- `admin analytics and reports`
  Admin is more clearly an account-management, student-access, and audit-monitoring role than the main analytics user.
- `applicant interview management`
  Applicants can monitor status and proceed with activation when approved, but interview scheduling and rescheduling are handled by department users.
- `scholarship processing`
  The implemented scope clearly covers scholarship posting, application intake, applicant viewing, and export. Avoid implying a full end-to-end approval workflow unless you can show it elsewhere.

## Suggested Rewrite for System Analysis

The proposed system, entitled the NORSU-Guihulngan Student Support and CARE Center Management System, is designed to address the inefficiencies in the current administrative operations of the CARE Center at Negros Oriental State University - Guihulngan City Campus. At present, many core services still depend on manual records, paper forms, physical logbooks, and fragmented files. These practices slow down service delivery, make records difficult to retrieve, increase repetitive encoding work, and create delays in coordinating student concerns across the CARE Center and the academic departments.

In the existing setup, important processes such as NAT-related application handling, interview scheduling, counseling requests, additional support requests, scholarship application intake, needs assessment forms, office visit logging, event participation, and feedback collection are not managed through a single integrated platform. Because records are handled separately, students experience difficulty tracking the progress of their requests, while staff spend significant time verifying documents, monitoring updates, and consolidating reports. Manual handling also increases the risk of incomplete records, inconsistent status updates, and delays in providing timely student support services.

To address these problems, the proposed system introduces an online web-based platform that centralizes the major administrative functions of the CARE Center. The system is designed to be accessed through the internet using browser-based portals, allowing authorized users to use the platform beyond purely manual and office-bound transactions. Applicants can complete NAT-related application steps, monitor their application status, and activate a student account once approved for enrollment. Students can access a portal where they can complete needs assessment forms, submit counseling and additional support requests, apply for available scholarships, participate in events, log office visits, submit feedback, and manage their profile and account security. On the staff side, CARE personnel can manage NAT workflows, forms, counseling coordination, support requests, scholarships, events, office logbook records, analytics, and exports. Department Heads can handle admissions screening, interview scheduling, counseling decisions, and support approvals, while Admin users oversee account administration, student access management, and staff audit monitoring.

The system follows a role-based and centralized data-management approach. Instead of relying on separate paper files and disconnected logs, records are stored in a structured database where authorized users can monitor request statuses, schedules, attendance, and service history more efficiently. This improves retrieval, reduces duplication of work, supports more accurate tracking of transactions, and strengthens coordination between the CARE Center and the departments. Shared calendar views, export tools, notifications, and audit logs further improve visibility, accountability, and reporting across the system.

From a technical perspective, the system follows an online client-server architecture in which users access the platform through internet-connected browser-based portals, while processing and data storage are handled through the application layer and a relational database. This architecture supports centralized records, remote accessibility, simultaneous multi-user access, role-based permissions, and more consistent handling of student support workflows. As a result, the proposed system provides a practical digital solution for improving the efficiency, accessibility, timeliness, and organization of CARE Center services at NORSU-Guihulngan City Campus.

## Suggested Rewrite for System Design

The overall design of the NORSU-Guihulngan Student Support and CARE Center Management System is structured to support coordinated online delivery of student support services and administrative workflows. The system follows an online three-tier client-server design that separates the presentation layer, application layer, and data layer. The presentation layer consists of browser-based portals for the Applicant, Student, CARE Staff, Department Head, and Admin users. The application layer manages authentication, role-based access, workflow processing, scheduling, notifications, exports, and other transaction logic. The data layer uses a relational database that stores and organizes records such as applications, student profiles, counseling requests, support requests, scholarships, forms, events, attendance, feedback, office visits, and audit logs. This layered design helps ensure that the system remains organized, maintainable, and scalable while supporting secure internet-based access.

The system's data flow diagrams illustrate how information moves among users, the online application, and the centralized database. Applicant data flows through NAT-related application processes, interview scheduling, admission decisions, and student account activation. Student-generated transactions such as needs assessment submissions, counseling requests, additional support requests, scholarship applications, office visit logs, event participation, and feedback are submitted through the portal, processed by authorized personnel, and stored for monitoring and reporting. Staff-side workflows also show the interaction between CARE Staff and Department Heads in handling admissions, counseling coordination, referrals, approvals, scheduling, and case resolution.

The Entity-Relationship Diagram (ERD) presents the relationships among the major entities of the system. These include applications, students, accounts, departments, courses, counseling requests, support requests, forms, questions, submissions, scholarships, scholarship applications, events, attendance records, feedback records, office visits, office visit reasons, notifications, and audit logs. Through these relationships, the database supports centralized and consistent data management, reduces unnecessary duplication, and allows the system to maintain accurate service histories and workflow statuses across different modules.

The use case diagrams define how each user role interacts with the platform's core functions. Applicants use the system for NAT-related application steps, status monitoring, and student account activation after approval. Students use the portal to complete needs assessment forms, request counseling and additional support, apply for scholarships, participate in events, submit feedback, log office visits, and manage their profile and account security. CARE Staff manage NAT workflows, forms, counseling coordination, support requests, scholarships, events, analytics, exports, audit logs, and office logbook records. Department Heads handle admissions decisions, interview scheduling, counseling actions, and support approvals. Admin users manage staff accounts, monitor audit activity, and oversee student access administration. Together, these design components ensure that the system is logically structured, easier to maintain, and aligned with the operational needs of the CARE Center.

This chapter outlined the system analysis and design of the NORSU-Guihulngan Student Support and CARE Center Management System. The proposed design addresses the limitations of manual and fragmented CARE Center processes by providing an online, role-based, and centralized platform for student support operations. With both functional and non-functional requirements supported by a structured system architecture, data flow design, ERD, and use case models, the system is positioned to improve efficiency, accessibility, coordination, accountability, and overall service delivery at NORSU-Guihulngan City Campus.

## Suggested Hardware and Software Requirements

This section is not always required unless your school format or adviser specifically asks for it, but if you include it, it should match the actual online and web-based nature of the system.

### Hardware Requirements

The hardware requirements for the NORSU-Guihulngan Student Support and CARE Center Management System are categorized into server-side and client-side components to support local development, local testing, and internet-based access to the platform.

#### 1. Server Hardware Requirements

The server handles application hosting, backend processing, database connectivity, file storage, and overall system access. If cloud-based deployment is used, these resources may be provided by the hosting service instead of a dedicated on-campus physical server.

- **Processor:** Intel Core i5 or higher (or equivalent AMD processor)
- **Memory (RAM):** Minimum 8 GB
- **Storage:** At least 256 GB SSD
- **Network:** Stable broadband or fiber internet connection
- **Backup Device:** External storage or cloud backup for data protection and recovery

#### 2. Client Hardware Requirements

Client devices are used by Admin, CARE Staff, Department Heads, Applicants, and Students to access the system through browser-based portals.

- **Processor:** Dual-core processor or Intel Core i3 equivalent and higher
- **Memory (RAM):** Minimum 4 GB
- **Storage:** At least 64 GB available space
- **Display:** Minimum resolution of 1366 x 768
- **Input Devices:** Keyboard and mouse for desktop or laptop users; touchscreen support for mobile users
- **Network:** Local network or internet connectivity

#### 3. Peripheral Devices

These devices support daily office operations and documentation needs.

- **Printer:** For printing reports, exported records, and supporting documents
- **Scanner or Camera Device:** For digitizing attachments and uploaded files when needed
- **Router/Modem:** For internet access and network distribution
- **Switch/Wi-Fi Access Point:** For office connectivity when multiple users access the system simultaneously

### Software Requirements

The software requirements define the necessary tools, services, and platforms needed to develop, deploy, maintain, and operate the online system.

#### 1. Server Software

- **Operating System:** Windows or Linux for development, testing, or hosted deployment
- **Application Hosting Platform:** Vercel or any equivalent online hosting platform
- **Database Management System:** PostgreSQL through Supabase
- **Backend Service Platform:** Supabase
- **Server-Side Processing:** Supabase Edge Functions
- **Authentication and Storage Services:** Supabase Authentication and Supabase Storage

#### 2. Client Software

- **Operating System:** Windows, macOS, Linux, Android, or iOS
- **Web Browser:** Google Chrome, Mozilla Firefox, or Microsoft Edge
- **PDF Viewer:** For viewing exported reports, downloadable forms, and generated PDF files

#### 3. Development Tools

- **Code Editor:** Visual Studio Code or similar
- **Frontend Development Tools:** React, Vite, Tailwind CSS, TypeScript, JavaScript, HTML5, and CSS3
- **Runtime Environment:** Node.js 20 or higher
- **Package Manager:** npm
- **Local Development Environment:** Vite development server with Supabase project configuration
- **Version Control:** Git
- **Database and Backend Management Tool:** Supabase CLI, if needed for local testing and migrations
- **Design Tools:** Canva, Figma, or Miro
