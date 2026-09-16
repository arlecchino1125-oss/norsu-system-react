# UI Adjustments, Pagination, and Gender Identifiers in Evaluation & Attendees

## Summary
Add pagination and gender identifiers (Sex Assigned at Birth: Female/Male, and Gender Identity: Cis-gender, Transgender, Non-binary, etc.) to both the **Event Evaluation Results** modal and the **Attendees List** modal, matching the style from the Analytics page (`CareStaffAnalyticsPage`). Also include Sex and Gender Identity in all exported Excel data.

---

## User Review Required

> [!IMPORTANT]
> The demographics breakdown will match the Analytics page pattern:
> - **Sex Assigned at Birth**: Female (rose pill/card), Male (sky pill/card), Other / Unset.
> - **Gender Identity**: CIS Gender, Transgender, Non-binary, Prefer not to say, Other.
> - **Exported Data**: Both Evaluation Results export and Attendees export will now include `Sex Assigned at Birth` and `Gender Identity` columns alongside `Student ID`.

---

## Proposed Changes

### 1. Event Evaluation Service & Responses
#### [MODIFY] [eventEvaluationService.ts](file:///c:/Users/kizug/Desktop/CARE%20LOCAL/CARESYSTEM%20ORIGINAL/src/pages/carestaff/features/events/eventEvaluationService.ts)
- Update `EvaluationResponse` interface to include `sex?: string | null` and `gender_identity?: string | null`.
- In `getEvaluationResults`, update the Supabase query to include `sex, gender_identity` in `students(...)`.
- Map `sex` and `gender_identity` into the returned `EvaluationResponse` objects.

### 2. Event Evaluation Results Modal
#### [MODIFY] [EventEvaluationResultsModal.tsx](file:///c:/Users/kizug/Desktop/CARE%20LOCAL/CARESYSTEM%20ORIGINAL/src/pages/carestaff/features/events/components/EventEvaluationResultsModal.tsx)
- **Respondent Demographics**: Add a collapsible "Respondent Demographics" panel matching `CareStaffAnalyticsPage` with counts & percentages for Female/Male and Gender Identity.
- **Filter**: Add a gender/sex filter dropdown (`All genders`, `Female`, `Male`, etc.) alongside existing filters.
- **Listing Table**:
  - Add a **Gender** column with visual pills for Sex (Female = rose, Male = sky) and Gender Identity (purple).
  - Add pagination controls (`ITEMS_PER_PAGE = 20`, page indicator, Prev / Next buttons).
  - Reset pagination on search or filter change.
- **Respondent Detail View**: Display `Sex Assigned at Birth` and `Gender Identity` in the student header info grid.
- **Export to Excel**: Include `Sex Assigned at Birth` and `Gender Identity` in the identity headers and data rows.

### 3. Events Hook & Attendees Data
#### [MODIFY] [useCareStaffEvents.tsx](file:///c:/Users/kizug/Desktop/CARE%20LOCAL/CARESYSTEM%20ORIGINAL/src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx)
- In `handleViewAttendees`, select `sex, gender_identity` when querying the `students` table for attendee enrichment.
- Attach `sex` and `gender_identity` to enriched attendee records.
- In `expectedQuery`, include `sex, gender_identity` for expected students.

### 4. Attendees Modal & Export
#### [MODIFY] [CareStaffEventsPage.tsx](file:///c:/Users/kizug/Desktop/CARE%20LOCAL/CARESYSTEM%20ORIGINAL/src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx)
- In `AttendeesModal`:
  - **Demographics Badges**: Add Female and Male count pills in the summary stats bar (e.g. `{femaleCount} Female`, `{maleCount} Male`), and a collapsible Demographics panel like the Analytics page.
  - **Gender Filter**: Add gender filter dropdown to the filter row.
  - **Listing Table**: Display gender identifiers (Female/Male pill and Gender Identity) under or next to the student name, plus student ID.
  - **Export to Excel**: Add `Student ID`, `Sex Assigned at Birth`, and `Gender Identity` to the exported spreadsheet columns and rows.
- In `AbsentModal`:
  - Include `Sex` and `Gender Identity` in the exported headers and rows.

---

## Verification Plan

### Automated Tests
Run existing and updated test suites:
- `npm test -- src/pages/carestaff/features/events/components/EventEvaluationResultsModal.test.tsx`
- `npm test -- src/pages/carestaff/features/events/components/CareStaffEventsPage.test.tsx`
- Add unit tests verifying:
  - Evaluation results modal renders gender pills, demographics section, and pagination controls.
  - Export columns include `Sex Assigned at Birth` and `Gender Identity`.
  - Attendees modal displays female/male counts and exports gender details.

### Manual Verification
1. Open an Event Evaluation Results modal with submissions:
   - Check the collapsible Respondent Demographics panel (Female & Male cards, Gender Identity cards).
   - Check the table pagination (Page 1 of N, Prev/Next navigation, slice of 20 items per page).
   - Verify the Gender column displays appropriate pills.
   - Click "Export all" / "Export filtered" and verify the generated Excel contains `Student ID`, `Name`, `Sex Assigned at Birth`, `Gender Identity`, etc.
2. Open the Attendees modal for an event:
   - Check Female/Male count badges and demographics breakdown.
   - Check gender badges on attendee rows.
   - Click "Export" and verify exported Excel includes `Student ID`, `Sex Assigned at Birth`, and `Gender Identity`.
