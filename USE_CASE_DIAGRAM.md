# Use Case Diagram

This version combines the five actors into a cleaner, presentation-ready diagram based on the main flows in the current codebase.

## Clean Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor Applicant
actor Student
actor "Department Head" as DepartmentHead
actor "CARE Staff" as CareStaff
actor Admin

rectangle "NORSU-G CARE Center Management System" {
  usecase "Access Portal\nand Authenticate" as UC1
  usecase "Admission Application\nand NAT Scheduling" as UC2
  usecase "Account Activation,\nProfile Setup, and Security" as UC3
  usecase "Counseling and\nSupport Services" as UC4
  usecase "Scholarships, Events,\nForms, and Feedback" as UC5
  usecase "Department Admissions\nand Student Cases" as UC6
  usecase "Records, Reports,\nand Analytics" as UC7
  usecase "Staff and Department\nAdministration" as UC8
}

Applicant --> UC1
Applicant --> UC2
Applicant --> UC3

Student --> UC1
Student --> UC3
Student --> UC4
Student --> UC5

DepartmentHead --> UC1
DepartmentHead --> UC4
DepartmentHead --> UC6
DepartmentHead --> UC7

CareStaff --> UC1
CareStaff --> UC2
CareStaff --> UC4
CareStaff --> UC5
CareStaff --> UC7

Admin --> UC1
Admin --> UC7
Admin --> UC8
@enduml
```

## Straightforward Summary

- Applicant: accesses the NAT portal, applies for admission, selects a NAT schedule, and activates an account.
- Student: accesses the student portal, completes profile and security setup, requests services, and joins scholarships, events, forms, and feedback.
- Department Head: accesses the department portal, handles admissions and student cases, processes counseling and support workflows, and views records and reports.
- CARE Staff: accesses the CARE portal, manages NAT-related processes, student services, scholarships, events, forms, feedback, and analytics.
- Admin: accesses the admin portal, monitors records and reports, and manages staff accounts and departments.
