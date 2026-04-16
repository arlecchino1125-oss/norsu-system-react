Department console-noise cleanup revert point created on 2026-03-22 14:53:00.

Restores the files captured before the console-noise fixes in this pass:
- src/hooks/dept/useDeptData.ts
- src/services/deptService.ts

Backup contents live under:
- src/hooks/dept/useDeptData.ts
- src/services/deptService.ts

Use this revert point if the deferred realtime subscription setup or the per-tab admissions RPC cache needs to be rolled back.
