This revert point restores the router shell before Phase 7 route-level code splitting.

Purpose:
- lazy-load the largest top-level portal routes
- keep auth/bootstrap/router shell eager
- add a shared Suspense loading fallback for route transitions

Backed up files:
- src/App.tsx

Notes:
- Phase 7 adds route-level lazy loading for Admin, Department, Care Staff, NAT, Student Portal, and Student Login.
- To restore, copy the backed up file from this folder back into the project.
