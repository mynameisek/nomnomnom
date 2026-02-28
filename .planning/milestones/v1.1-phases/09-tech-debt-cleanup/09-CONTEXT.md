# Phase 9: Tech Debt Cleanup - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve accumulated tech debt: type safety, code deduplication, and documentation alignment. No new user-facing features. Strictly the 4 items from the roadmap success criteria, plus any obvious low-hanging fruit discovered during audit.

</domain>

<decisions>
## Implementation Decisions

### ALLOWED_MODELS deduplication
- Create a shared `lib/constants.ts` (or add to existing shared file) with a single `ALLOWED_MODELS` definition
- Export as `as const` array + derive a union type (`AllowedModel`) from it
- Both `app/actions/admin.ts` (server action) and `components/admin/AdminDashboard.tsx` (client component) import from the shared file
- Shared file must NOT be a 'use server' file — plain TypeScript module so both server and client can import it
- If Next.js bundler issues arise with the shared import, use a `lib/models.ts` dedicated file (no 'use server' / 'use client' directive)

### Menu type alignment
- Add `hit_count: number` and `parse_time_ms: number | null` to the `Menu` interface in `lib/types/menu.ts`
- Audit all fields against the actual `supabase/schema.sql` to catch any other mismatches — fix all at once, not just these two
- No DB migration needed — fields already exist in the schema, just missing from the TypeScript type

### Documentation sync
- Full audit of REQUIREMENTS.md checkboxes against actual implementation status — update all checkboxes to reflect reality
- Create Phase 5 VERIFICATION.md by running the verifier agent against the scan pipeline requirements (SCAN-01 through SCAN-05, INFR-04)
- Update ROADMAP.md progress table to reflect phases 4-8 actual completion status (some show "Not started" but are complete)

### Cleanup scope
- Stick to the 4 roadmap items as primary scope
- If obvious issues are discovered during audit (e.g., unused imports, dead code in touched files), fix them in the same commit — but don't go hunting
- No refactoring beyond what's needed to resolve the 4 items

### Claude's Discretion
- File naming and organization for the shared constants module
- Exact structure of Phase 5 VERIFICATION.md
- Whether to combine documentation fixes into one commit or split by file

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude's judgment on all implementation details with best optimization and best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-tech-debt-cleanup*
*Context gathered: 2026-02-26*
