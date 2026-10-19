# PLAN: Angely's World — Dead-Code Cleanup (Phase 1)

Spec: ./SPEC.md
Status: approved (2026-10-19, Angelo)
Date: 2026-10-19

Repo: ~/workspace/angelys-world-game — branch `main` only.
Toolchain (from repo history): node node_modules/typescript/bin/tsc,
node node_modules/vite/bin/vite.js build,
node node_modules/@capacitor/cli/bin/capacitor sync android,
gradle assembleDebug from android/ with GRADLE_USER_HOME=/home/hatch/.gradle-fresh5
and -Djava.net.preferIPv4Stack=true. JDK: ~/workspace/.jdk/jdk-21.0.12.1+1.

## Slice 0: Checkpoint + normalize to main

- Files: (git state only; no source changes)
- Interfaces: n/a
- Tests: n/a
- Commands:
  1. `cd ~/workspace/angelys-world-game && git status --short` (must be clean or commit/stash first)
  2. `git checkout main && git log --oneline -1` (must show 03cf86a or newer)
  3. `git add -A && git commit -m "TGL Phase 1 checkpoint: pre-cleanup tree"` (only if dirty)
  4. `git tag tgl-phase1-checkpoint` (recovery point)
- Expected output: on `main`, clean tree, tag `tgl-phase1-checkpoint` exists.
- Review Focus: verify `git diff main master` is empty (both branches were
  synced); if not, stop and ask Angelo which one is truth.

## Slice 1: TypeScript dead-code pass

- Files: `src/**/*.ts` (46 files) — delete unreferenced files, prune dead exports.
- Interfaces: n/a (deletion only; no signature changes to reachable code).
- Tests:
  - `node node_modules/typescript/bin/tsc --noEmit` → zero errors.
  - Grep each deleted file's basename across `src/` → zero hits (proves unreferenced).
- Commands:
  1. Build import graph from `src/main.ts` (transitive). List `.ts` files NOT reachable.
  2. For each unreachable file, grep its filename across `src/`, `public/`, configs → confirm zero references.
  3. Delete confirmed-unreachable files.
  4. For reachable files, list exported symbols never imported elsewhere → prune (keep it conservative: only obviously dead exports, e.g. unused helpers).
  5. Run `tsc --noEmit`.
- Expected output: fewer `.ts` files, `tsc` clean, deletion list recorded in the slice report.
- Review Focus: dynamic `import()` with constructed strings — grep for
  `import(` with template literals; any match pauses that file's deletion for
  human review. Also: files referenced only from `tools/` or `scripts/` (dev
  tooling, not game code) are OUT of scope — do not delete.

## Slice 2: Asset-manifest orphan pass

- Files: `src/assets/sprites.gen.ts`, `src/assets/manifest.ts`, `src/audio/manifest*`, any other manifest under `src/`.
- Interfaces: n/a (entry removal only).
- Tests:
  - `node node_modules/vite/bin/vite.js build` → succeeds.
  - Every removed key grepped across `src/**/*.ts` → zero hits (excluding its own manifest line).
- Commands:
  1. Extract all keys from BACKDROPS, SPRITES, PROPS, AUDIO_FILES.
  2. Grep each key across `src/**/*.ts`.
  3. Flag keys with dynamic-construction patterns (template literals, string concat near loader calls) for human review — do NOT auto-delete these.
  4. Remove confirmed-orphan entries from the manifests.
  5. Run `vite build`.
- Expected output: smaller manifests, build succeeds, orphan-key list in the slice report.
- Review Focus: voice keys (chapter 10-2 voices were just registered — a key
  can look orphaned if voices are queued via a separate manifest path);
  `queueHudIcons` in `src/ui/gameHudArt` (icons queued outside the main
  manifest — treat its keys as referenced).

## Slice 3: public/assets filesystem orphan pass

- Files: `public/assets/**/*` (currently 38MB: runtime 32MB, audio 5.8MB).
- Interfaces: n/a.
- Tests:
  - Every deleted file's basename grepped across manifests + `src/` → zero hits.
  - `vite build` still succeeds (proves the bundle doesn't need them).
- Commands:
  1. List every file under `public/assets/`.
  2. Cross-check against all manifest file paths + URL strings in `src/`.
  3. Delete files with zero references.
  4. Run `vite build`.
- Expected output: smaller `public/assets/`, build succeeds, bytes saved reported.
- Review Focus: files referenced by hashed/renamed paths, and anything under
  `public/assets/runtime` loaded via runtime config rather than manifest —
  when in doubt, keep the file and log it as "kept: uncertain".

## Slice 4: Full local rebuild + device-test APK

- Files: `android/`, `dist/` (build outputs only).
- Interfaces: n/a.
- Tests:
  - `tsc --noEmit` → clean.
  - `vite build` → succeeds.
  - `capacitor sync android` → succeeds.
  - `gradle assembleDebug --console=plain --offline` from `android/` → APK produced.
  - APK installs on Angelo's phone; chapter select renders (no black screen); one gameplay chapter loads.
- Commands:
  1. `node node_modules/typescript/bin/tsc --noEmit`
  2. `node node_modules/vite/bin/vite.js build`
  3. `node node_modules/@capacitor/cli/bin/capacitor sync android`
  4. `cd android && gradle assembleDebug --console=plain --offline -Djava.net.preferIPv4Stack=true` (with GRADLE_USER_HOME=/home/hatch/.gradle-fresh5, JAVA_HOME=~/workspace/.jdk/jdk-21.0.12.1+1)
  5. Copy APK to `~/workspace/your_files/` and hand to Angelo.
- Expected output: installable APK, Angelo confirms on device it runs like
  before the cleanup (no regressions).
- Review Focus: this is the real gate — GitHub Actions builds black-screen
  on his phone, so ONLY the local build counts. If the device test fails,
  `git revert` to `tgl-phase1-checkpoint` and diagnose before re-attempting.

## Out of scope (explicit)

- The 3 known bugs (Phase 2). Game-feel additions (playbook). `art/` (211MB).
  Any refactor of reachable code. Any gameplay/physics/camera change.

## Ship ref

TGL templates/release-checklist.md — on Angelo's device-test approval:
record the approval (date) in SPEC.md + PLAN.md status lines, append the
after-action entry to LEDGER.md, then "go attack mode" becomes available for
Phase 2.
