# LEDGER: Angely's World

Started: 2026-10-19 (first TGL session)

## Decisions

- 2026-10-19 — Plan goal: fix the 2D game code one by one from GitHub + aggressive dead-code cleanup. (3D-from-scratch rejected: would discard months of work; 3D is a future second project after the 2D game ships.)
- 2026-10-19 — Priority: dead-code cleanup FIRST, then the 3 known bugs (Sovereign portrait, Ch.9 boss sword logic, Last Boss HP).
- 2026-10-19 — Cleanup scope: aggressive total — delete everything not referenced. Definition of "referenced": TS file reachable via imports from src/main.ts (transitive); asset key used in src/**/*.ts or listed in a manifest; public/assets file listed in sprites.gen.ts / audio manifest.
- 2026-10-19 — Execution: delete all unreferenced without per-item approval list. Safety: git commit checkpoint before any deletion (100% recoverable via git).
- 2026-10-19 — art/ (211MB source files) explicitly OUT of this cleanup — not in the APK, separate decision later.
- 2026-10-19 — Verification: local build (tsc + vite + capacitor + gradle) + Angelo device test. GitHub Actions builds black-screen on his phone; only local builds are trusted.
- 2026-10-19 — Branch: main only (standing rule). Local checkout was on master, synced with main at 03cf86a; slice 0 normalizes to main.
- 2026-10-19 — Plan approved v1.0 by Angelo ("Aprobado, dale"). Attack mode authorized.

## Reversals

- (none yet)

## What worked

- (to fill during attack mode)

## Friction (harness feedback)

- (to fill during attack mode)

## Open questions

- 2026-10-19 — art/ 211MB: archive, keep, or move out of repo? (deferred, not part of this plan)
- 2026-10-19 — Phase 2 (3 known bugs) spec'd after cleanup verifies clean on device.
