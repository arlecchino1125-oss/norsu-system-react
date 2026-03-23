# Performance Fixes — Implementation Plan

Based on the [performance audit](file:///C:/Users/kizug/.gemini/antigravity/brain/ee41c674-33d9-47ab-ab8f-12c226bf51f3/performance_audit.md), this plan details every fix grouped into 6 phases. Phases are ordered by impact ÷ effort.

---

## User Review Required

> [!IMPORTANT]
> **Phase 4 (Event Aggregation)** recommends creating a Supabase RPC function or database view. This requires access to your Supabase dashboard to run SQL. I'll provide the SQL, but **you** will need to run it in Supabase.

> [!WARNING]
> **Phase 6 (Admissions Query)** also requires a new Supabase RPC. If you'd prefer to skip server-side changes entirely, I can do a client-side-only optimization instead (cache department/course lookups). Let me know.

---

## Phase 1 — Eliminate Post-Mutation Full Refetches (P0, Critical)

**Problem:** After every action (approve, schedule, reject, forward, complete), the entire list is re-fetched. Since realtime subscriptions already push changes back, this creates **double fetches**.

**Strategy:** After a successful edge function call, **optimistically update local state** with the known status change. The realtime subscription already handles syncing if anything else changed. Remove the manual `fetchX()` calls after mutations.

---

### [MODIFY] [CounselingPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx)

**Lines 163–201 — [handleScheduleSubmit](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#162-184) and [handleCompleteSession](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#185-202)**

Remove [fetchCounseling()](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#115-129) after actions. The realtime subscription at line 134 already handles this via [upsertCounselingRequest](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#29-33).

```diff
 // handleScheduleSubmit (line ~179)
  showToastMessage('Session Scheduled Successfully', 'success');
  setShowScheduleModal(false);
  setScheduleData({ date: '', time: '', notes: '' });
- fetchCounseling();

 // handleCompleteSession (line ~197)
  showToastMessage('Session marked as complete.', 'success');
  setShowCompleteModal(false);
- fetchCounseling();
```

---

### [MODIFY] [SupportRequestsPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx)

**Lines 178–216 — [handleForwardSupport](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx#178-203) and [handleFinalizeSupport](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx#204-217)**

Same fix — remove [fetchSupport()](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx#121-132) after actions. The realtime at line 136 already upserts via [upsertSupportRequest](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx#31-35).

```diff
 // handleForwardSupport (line ~200)
  showToast?.("Request forwarded to Dean.", 'success');
  setShowSupportModal(false);
  setLetterFile(null);
- fetchSupport();

 // handleFinalizeSupport (line ~214)
  showToast?.("Request completed and student notified.", 'success');
  setShowSupportModal(false);
- fetchSupport();
```

---

### [MODIFY] [DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx)

**Lines 507, 538, 595 — `admissionsState.refresh()` after schedule/approve/reject**

Admissions doesn't have a realtime subscription, so instead of a full refresh (6 queries), we'll do a **targeted single-record refetch** after the action and patch the local array.

Add a helper inside the component:

```typescript
const patchAdmissionRow = (id: string, updates: Partial<any>) => {
    admissionsState.setRows((prev: any[]) =>
        prev.map((row) => (String(row.id) === String(id) ? { ...row, ...updates } : row))
    );
};
```

Then replace `admissionsState.refresh()` with `patchAdmissionRow(app.id, { status: newStatus })` or remove the row from the list entirely when it leaves the current filter.

> [!NOTE]
> This requires exposing `setRows` from [useDeptData](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/dept/useDeptData.ts#14-379). I'll add it to the hook's return value.

---

### [MODIFY] [useDeptData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/dept/useDeptData.ts)

Expose `setRows` for each data state so that parent components can optimistically patch after mutations, and change the existing realtime handlers to use **upsert** instead of full refetch:

```diff
 // Realtime handler for students (line ~231)
-.on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
-    refreshStudents();
-})
+.on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload: any) => {
+    if (payload.eventType === 'DELETE') {
+        setStudents(prev => prev.filter(r => r.id !== payload.old?.id));
+    } else if (payload.new) {
+        setStudents(prev => {
+            const filtered = prev.filter(r => r.id !== payload.new.id);
+            return [...filtered, payload.new].sort((a, b) =>
+                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
+            );
+        });
+    }
+})
```

Apply the same pattern to the counseling, support, and events realtime handlers.

Return `setRows` functions in the hook's return object so [DeptDashboard](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx#69-1116) can call them.

---

### [MODIFY] [useSupabaseData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/useSupabaseData.ts)

**Lines 57–62 — Replace full refetch in generic realtime handler with upsert logic**

```diff
 .on(
     'postgres_changes',
     { event: '*', schema: 'public', table: table },
-    () => {
-        fetchData();
-    }
+    (payload: any) => {
+        if (payload.eventType === 'DELETE') {
+            setData(prev => prev.filter((row: any) => row.id !== payload.old?.id));
+        } else if (payload.new) {
+            setData(prev => {
+                const filtered = prev.filter((row: any) => row.id !== payload.new.id);
+                return [payload.new as T, ...filtered];
+            });
+        }
+    }
 )
```

---

## Phase 2 — Switch `count: 'exact'` to `count: 'estimated'` (P0, High)

**Problem:** 23 queries use `count: 'exact'`, forcing PostgreSQL full table scans on every paginated page load.

**Strategy:** Change to `count: 'estimated'` for all paginated list queries. Keep `count: 'exact'` only for dashboard stat cards that use `head: true` (since those are lightweight).

---

### [MODIFY] [deptService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts)

Replace all `count: 'exact'` with `count: 'estimated'` in paginated queries:

```diff
-    .select('*', { count: 'exact' })
+    .select('*', { count: 'estimated' })
```

**Applies to functions:** [getStudentsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#178-196), [getCounselingRequestsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#197-215), [getSupportRequestsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#216-234), [getEventsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts#114-130)

---

### [MODIFY] [studentPortalService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts)

Same change — all paginated list functions:

```diff
-    .select('*', { count: 'exact' })
+    .select('*', { count: 'estimated' })
```

**Applies to:** [getEventsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts#114-130), `getFormsPage`, [getStudentCounselingRequestsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts#158-176), [getStudentSupportRequestsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts#177-195), `getNotificationsPage`

---

### [MODIFY] [careStaffService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/careStaffService.ts)

```diff
-    .select('*', { count: 'exact' })
+    .select('*', { count: 'estimated' })
```

**Applies to:** [getStudentsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#178-196)

---

### [MODIFY] [natService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/natService.ts)

```diff
-    .select('*', { count: 'exact' })
+    .select('*', { count: 'estimated' })
```

---

### Keep `count: 'exact'` in [CareStaffDashboardView.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CareStaffDashboardView.tsx) for the dashboard stat cards

These already use `head: true` (no row data transferred), and exact counts are expected on dashboard cards. **No change needed here.**

---

## Phase 3 — Consolidate Edge Function Invocation Helper (P1, Low Effort)

**Problem:** The same `getSession()` → [invoke()](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/NATPortal.tsx#182-207) → error-parsing pattern is **copy-pasted** into 5+ files (~50 lines each = ~250 duplicated lines).

---

### [NEW] [invokeEdgeFunction.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/lib/invokeEdgeFunction.ts)

Create a single shared utility:

```typescript
import { supabase } from './supabase';
import { buildEdgeFunctionHeaders } from './functionHeaders';

const readFunctionErrorMessage = async (responseLike: any): Promise<string> => {
    if (!responseLike) return '';
    try {
        const payload = await responseLike.clone().json();
        if (payload?.error) return String(payload.error);
        if (payload?.message) return String(payload.message);
    } catch {
        try {
            const text = await responseLike.clone().text();
            return String(text || '').trim();
        } catch {
            return '';
        }
    }
    return '';
};

/**
 * Invoke a Supabase Edge Function with automatic auth session
 * injection and standardized error handling.
 */
export const invokeEdgeFunction = async <T = any>(
    fnName: string,
    body: Record<string, any>,
    options?: { requireAuth?: boolean }
): Promise<T> => {
    const requireAuth = options?.requireAuth ?? true;
    let accessToken: string | null = null;

    if (requireAuth) {
        const { data: authData } = await supabase.auth.getSession();
        accessToken = authData.session?.access_token ?? null;
        if (!accessToken) {
            throw new Error(
                'Your login session has expired. Please sign in again.'
            );
        }
    }

    const { data, error, response } = await supabase.functions.invoke(fnName, {
        body,
        headers: buildEdgeFunctionHeaders(accessToken),
    });

    if (error) {
        const detail = await readFunctionErrorMessage(response || error?.context);
        if (String(error.message || '').includes('non-2xx')) {
            throw new Error(detail || 'Session could not be verified. Please sign in again.');
        }
        throw new Error(detail || error.message || `Failed to call ${fnName}.`);
    }

    if (!data?.success) {
        throw new Error(data?.error || `Failed to call ${fnName}.`);
    }

    return data as T;
};
```

### Then update consumers:

**[MODIFY] [CounselingPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx)** — Remove local [readFunctionErrorMessage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#69-87) + [invokeManagedCareServicesFunction](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#88-114) (~45 lines). Import `invokeEdgeFunction` instead:

```diff
-const readFunctionErrorMessage = async (responseLike: any) => { ... };
-const invokeManagedCareServicesFunction = async (body: any) => { ... };
+import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';

 // In handlers, replace:
-await invokeManagedCareServicesFunction({ mode: 'schedule-counseling', ... });
+await invokeEdgeFunction('manage-care-services', { mode: 'schedule-counseling', ... });
```

**Same pattern for:** [SupportRequestsPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx), [DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx), [StudentPortal.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/StudentPortal.tsx), [AdminDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/AdminDashboard.tsx)

---

## Phase 4 — Move Event Aggregation to Server (P1, Medium Effort)

**Problem:** [useEventsData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/useEventsData.ts) fetches **all rows** from `event_attendance` and `event_feedback`, then filters/aggregates in JavaScript.

---

### Option A: Supabase RPC (Recommended)

Create this SQL function in your Supabase dashboard:

```sql
CREATE OR REPLACE FUNCTION get_event_stats()
RETURNS TABLE (
    event_id uuid,
    attendee_count bigint,
    feedback_count bigint,
    avg_rating numeric
) LANGUAGE sql STABLE AS $$
    SELECT
        e.id AS event_id,
        COALESCE(a.cnt, 0) AS attendee_count,
        COALESCE(f.cnt, 0) AS feedback_count,
        f.avg_rating
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) AS cnt
        FROM event_attendance
        GROUP BY event_id
    ) a ON a.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) AS cnt, AVG(rating) AS avg_rating
        FROM event_feedback
        GROUP BY event_id
    ) f ON f.event_id = e.id;
$$;
```

### [MODIFY] [useEventsData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/useEventsData.ts)

Replace the two full-table fetches + client-side loop with a single RPC call:

```diff
-const [{ data: attData }, { data: fbData }] = await Promise.all([
-    supabase.from('event_attendance').select('event_id'),
-    supabase.from('event_feedback').select('event_id, rating')
-]);
+const { data: statsData } = await supabase.rpc('get_event_stats');
+const statsMap = new Map(
+    (statsData || []).map((s: any) => [s.event_id, s])
+);

 // Then for each event:
-const evAtts = (attData || []).filter(a => a.event_id === ev.id);
-const evFbs = (fbData || []).filter(f => f.event_id === ev.id);
-enriched.attendeeCount = evAtts.length;
-enriched.feedbackCount = evFbs.length;
-enriched.avgRating = /* calculated */;
+const stats = statsMap.get(ev.id) || {};
+enriched.attendeeCount = stats.attendee_count || 0;
+enriched.feedbackCount = stats.feedback_count || 0;
+enriched.avgRating = stats.avg_rating ? Number(stats.avg_rating).toFixed(1) : null;
```

### Option B: Client-Side Only (No Server Changes)

If you can't run SQL right now, add `.select('event_id')` with a `.in()` filter to only fetch attendance/feedback for the currently loaded events:

```typescript
const eventIds = (eventsData || []).map(e => e.id);
const [{ data: attData }, { data: fbData }] = await Promise.all([
    supabase.from('event_attendance').select('event_id').in('event_id', eventIds),
    supabase.from('event_feedback').select('event_id, rating').in('event_id', eventIds)
]);
```

This still aggregates client-side but limits the payload to only relevant rows.

---

## Phase 5 — Reduce Polling Overhead (P2, Low Effort)

---

### [MODIFY] [NATPortal.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/NATPortal.tsx)

**Line 401 — Session refresh interval: 30s → 120s**

```diff
-const interval = setInterval(() => { void refreshSession(); }, 30000);
+const interval = setInterval(() => { void refreshSession(); }, 120000);
```

**Line 350 — Time check interval: 60s → 300s**, and add a `performance.now()` offset to avoid repeated external API calls:

```diff
-const interval = setInterval(checkTime, 60000);
+const interval = setInterval(checkTime, 300000);
```

---

### [MODIFY] [DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx)

**Line ~57 — Extract live clock into an isolated component** so the 1-second `setInterval` doesn't re-render the entire 1116-line component:

The existing [useLiveClock](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx#53-68) hook should be isolated. If [DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx) destructures the time at the top level, every tick re-renders the entire tree. Instead:

```typescript
// Create a small ClockWidget component
const ClockWidget = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return <span>{time.toLocaleTimeString()}</span>;
};
```

Use `<ClockWidget />` in the JSX instead of destructuring the hook's return value at the [DeptDashboard](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx#69-1116) top level.

---

## Phase 6 — Optimize Admissions Query Cascade (P2, Medium Effort)

**Problem:** [getDepartmentApplicationsPage](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#392-433) runs **6 queries** sequentially (2 lookups + 4 parallel data queries), merges in JS, then paginates in JS.

---

### Option A: Supabase RPC (Recommended)

```sql
CREATE OR REPLACE FUNCTION get_department_applications(
    dept_name text,
    status_filter text DEFAULT NULL,
    search_filter text DEFAULT NULL,
    page_offset int DEFAULT 0,
    page_limit int DEFAULT 25
)
RETURNS TABLE (
    row_data jsonb,
    total_count bigint
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    course_names text[];
BEGIN
    SELECT array_agg(c.name)
    INTO course_names
    FROM courses c
    JOIN departments d ON c.department_id = d.id
    WHERE d.name = dept_name;

    IF course_names IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        to_jsonb(a.*) AS row_data,
        COUNT(*) OVER() AS total_count
    FROM applications a
    WHERE (
        (a.priority_course = ANY(course_names) AND (a.current_choice = 1 OR a.current_choice IS NULL))
        OR (a.alt_course_1 = ANY(course_names) AND a.current_choice = 2)
        OR (a.alt_course_2 = ANY(course_names) AND a.current_choice = 3)
    )
    AND (status_filter IS NULL OR a.status = status_filter)
    AND (search_filter IS NULL OR (
        a.first_name ILIKE '%' || search_filter || '%'
        OR a.last_name ILIKE '%' || search_filter || '%'
        OR a.email ILIKE '%' || search_filter || '%'
    ))
    ORDER BY a.created_at DESC
    OFFSET page_offset
    LIMIT page_limit;
END;
$$;
```

### Option B: Client-Side Cache (No Server Changes)

Cache the department → course name lookup so [getDepartmentCourseNames](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts#334-362) doesn't run two queries every time:

```typescript
const courseNameCache = new Map<string, { names: string[]; ts: number }>();

export const getDepartmentCourseNames = async (deptName: string): Promise<string[]> => {
    const cached = courseNameCache.get(deptName);
    if (cached && Date.now() - cached.ts < 300_000) return cached.names;
    
    // ... existing fetch logic ...
    courseNameCache.set(deptName, { names: result, ts: Date.now() });
    return result;
};
```

This reduces 6 queries to 4 on subsequent calls (cache hit on lookup queries).

---

## Files Changed Summary

| Phase | File | Change Type |
|---|---|---|
| 1 | [src/pages/carestaff/CounselingPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx) | Remove [fetchCounseling()](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/CounselingPage.tsx#115-129) after mutations |
| 1 | [src/pages/carestaff/SupportRequestsPage.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx) | Remove [fetchSupport()](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/carestaff/SupportRequestsPage.tsx#121-132) after mutations |
| 1 | [src/pages/DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx) | Replace `admissionsState.refresh()` with local patch |
| 1 | [src/hooks/dept/useDeptData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/dept/useDeptData.ts) | RT handlers → upsert; expose `setRows` |
| 1 | [src/hooks/useSupabaseData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/useSupabaseData.ts) | RT handler → upsert instead of full refetch |
| 2 | [src/services/deptService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts) | `count: 'exact'` → `'estimated'` |
| 2 | [src/services/studentPortalService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/studentPortalService.ts) | `count: 'exact'` → `'estimated'` |
| 2 | [src/services/careStaffService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/careStaffService.ts) | `count: 'exact'` → `'estimated'` |
| 2 | [src/services/natService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/natService.ts) | `count: 'exact'` → `'estimated'` |
| 3 | `src/lib/invokeEdgeFunction.ts` | **[NEW]** Shared edge function helper |
| 3 | 5 consumer files | Remove local duplicates, import shared helper |
| 4 | [src/hooks/useEventsData.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/hooks/useEventsData.ts) | Replace full-table fetches with RPC or `.in()` |
| 5 | [src/pages/NATPortal.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/NATPortal.tsx) | Increase polling intervals |
| 5 | [src/pages/DeptDashboard.tsx](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/pages/DeptDashboard.tsx) | Extract clock widget |
| 6 | [src/services/deptService.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/services/deptService.ts) | Cache lookups or use RPC |

---

## Verification Plan

### Automated Tests

There are no existing user-authored tests in the project (only [src/test/setup.ts](file:///K:/THESIS/THESIS/norsu-system-react%20-%20Copy%20%282%29%20-%20Copy/src/test/setup.ts)). The project has Vitest configured.

**New test file:** `src/lib/invokeEdgeFunction.test.ts`
- Test the shared `invokeEdgeFunction` helper:
  - Mock `supabase.auth.getSession()` returning a session → verify `x-supabase-auth` header is set
  - Mock `supabase.auth.getSession()` returning `null` + `requireAuth: true` → verify it throws
  - Mock `supabase.functions.invoke` returning `{ success: false, error: 'msg' }` → verify error is thrown
  - Mock a non-2xx error with `response.json()` → verify detailed error is extracted
- **Run:** `npm run test`

### Manual Verification

> [!TIP]
> Since these are performance changes across all portals, the most practical verification is manual testing. Here's a checklist:

**Phase 1 — Post-mutation refetch removal:**
1. Open the **CARE Staff → Counseling** page
2. Open browser DevTools → Network tab, filter to `supabase` requests
3. Schedule a counseling session
4. ✅ **Verify:** You should see **only 1** network request (the edge function call), NOT a second request refetching all counseling requests
5. Repeat for: Forward Support, Complete Counseling, Complete Support

**Phase 2 — `count: 'estimated'`:**
1. Open any paginated list page (e.g., Dept → Students)
2. Open DevTools → Network tab
3. Check the Supabase query: the `Prefer` header should contain `count=estimated` instead of `count=exact`
4. ✅ **Verify:** Page still shows pagination and total count (may differ by a small amount from exact)

**Phase 3 — Consolidated helper:**
1. Perform any action that calls an edge function (schedule, approve, etc.)
2. ✅ **Verify:** Action succeeds with same UX as before
3. ✅ **Verify:** Error messages still show correctly if you temporarily disconnect from the internet

**Phase 4 — Event aggregation:**
1. Open the Events page on any portal
2. ✅ **Verify:** Attendance count and average rating still display correctly
3. Open DevTools → Network tab
4. ✅ **Verify:** No `event_attendance` or `event_feedback` full-table fetch requests (should see a single `rpc/get_event_stats` call instead)

**Phase 5 — Polling:**
1. Log in to NATPortal → dashboard
2. Open DevTools → Network tab, wait 2+ minutes
3. ✅ **Verify:** Session refresh calls appear every ~120s (not every 30s)
4. Open DeptDashboard, verify the clock still ticks correctly

**Phase 6 — Admissions:**
1. Open Dept Portal → Admissions screening
2. ✅ **Verify:** List still loads correctly with proper pagination
3. Approve/reject an applicant
4. ✅ **Verify:** List updates without a full 6-query reload
