# SPEC: Angely's World — Dead-Code Cleanup (Phase 1)

Status: approved (2026-10-19, Angelo)
Version: 1.0
Date: 2026-10-19

## What it is

A systematic removal of all unreferenced code and assets from the Angely's
World 2D game repo (github.com/Angelo0402/angelys-world-game, branch `main`),
so the codebase contains only what the game actually uses. This is Phase 1 of
the stabilization plan; Phase 2 fixes the 3 known gameplay bugs on the clean
tree.

## The problem it solves

Months of rapid iteration left dead weight in the repo: unused TypeScript
files and exports, asset manifest entries nothing loads, and files in
`public/assets/` no manifest references. Dead code hides real bugs, slows
every future fix ("is this used somewhere?"), and dead assets bloat the APK
(~47MB) and can surface as broken/missing textures on device. Angelo's
standing complaint — "es full bugs" — is partly a codebase-hygiene problem.
You cannot fix code one by one if you cannot tell which code matters.

## Non-goals

- This is NOT the 3-bug fix (Sovereign portrait, Ch.9 boss sword, Last Boss
  HP). Those are Phase 2, on the cleaned tree.
- This does NOT touch `art/` (211MB of source files). Not shipped in the APK;
  separate decision later.
- This does NOT add features, game-feel, or refactor working code. Pure
  deletion of the unreferenced.
- This does NOT change gameplay, physics, camera, or controls in any way.

## The shape of it

Four deletion passes, each verified before the next:

1. **Checkpoint.** Commit the current tree on `main` so every deletion is
   recoverable via git. Normalize the local checkout to `main`.
2. **TypeScript pass.** Find `.ts` files not reachable from `src/main.ts`
   through imports (transitive), and dead exports inside reachable files.
   Delete unreferenced files; prune dead exports. `tsc` must pass after.
3. **Asset-manifest pass.** Find keys in `src/assets/sprites.gen.ts` and
   `src/audio/manifest` (and any other manifest) that no code references.
   Remove the entries. Full `vite build` must pass after.
4. **Filesystem pass.** Find files under `public/assets/` not listed in any
   manifest and not referenced by URL string in code. Delete them.
5. **Rebuild + device test.** `tsc`, `vite build`, `capacitor sync`,
   `gradle assembleDebug` locally; Angelo installs the APK on his phone and
   confirms the game runs (chapter select → gameplay, no new black screens).

Definition of "referenced" (the only thing that survives):
- A `.ts` file: imported, transitively, from `src/main.ts`.
- An asset key: its string appears in `src/**/*.ts`, or it is listed in a
  manifest consumed by `queueAssets`.
- A file in `public/assets/`: listed in `sprites.gen.ts` / audio manifest,
  or referenced by URL string in code.

Dynamic-loading caveat: if code constructs asset keys at runtime from string
parts, a naive grep misses them. The scan must flag dynamic key patterns for
human review before deleting those entries — this is the one place where
"unreferenced" needs a second look.

## Open questions

1. None remaining — all grilling questions resolved 2026-10-19. (art/
   disposition deferred to later, recorded in LEDGER.md.)
