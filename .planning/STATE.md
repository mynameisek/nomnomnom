# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** v1.1 MVP App

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-25 — Milestone v1.1 started

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (v1.0)
- Total execution time: ~3 hours (v1.0, single session)

## Accumulated Context

### Decisions

- Web app Next.js (pas native) — QR → navigateur = zéro friction
- OpenAI par défaut, modèles configurables admin
- Parser menu générique (heuristiques + LLM)
- Test menu de référence: https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-25
Stopped at: Defining v1.1 requirements
Next: Complete requirements → roadmap
