This revert point restores the care-staff realtime cleanup changes made on 2026-03-22.

Purpose:
- reduce dev console websocket warnings caused by React StrictMode mount/unmount cycles
- keep realtime behavior intact for care-staff dashboard and tab pages

Files backed up in this revert point:
- src/pages/CareStaffDashboard.tsx
- src/pages/carestaff/CareStaffDashboardView.tsx
- src/pages/carestaff/CounselingPage.tsx
- src/pages/carestaff/SupportRequestsPage.tsx
- src/pages/carestaff/AuditLogsPage.tsx
- src/pages/carestaff/OfficeLogbookPage.tsx

To restore:
- copy the backed up files from this folder back into the project
