# MASTER PROMPT — Angely's World Game Fixes (2026-10-05)

## Context
Angelo is fixing Angely's World mobile game with two agents. Muse was ordered to DISCARD its old build (`~/workspace/angelys-world-game`) and work from the GitHub repo version (`https://github.com/Angelo0402/angelys-world-game/blob/main/Angelys-World.apk`) that another agent developed (chapters 1-13, star gem, Star Shield).

Working directory: `~/workspace/angelys-world-new/` (fresh clone of main branch)

## Changes Made

### 1. Remove Chase Mode from Levels 2-2 and 4-2
**File:** `src/config.ts`
- Level 2-2 "Crumbling Halls": changed `mode: "chase"` → `mode: "run"`, `goal: "reach"` → `goal: "kills"`, `need: 0` → `need: 10`, tip updated
- Level 4-2 "Avalanche Run": changed `mode: "chase"` → `mode: "run"`, `goal: "reach"` → `goal: "kills"`, `need: 0` → `need: 12`, tip updated
- Also removed "CHASE" label from level pills in TitleScene

### 2. Vertical Scrolling Chapter Selector
**File:** `src/scenes/TitleScene.ts` (method `showChapterSelect`)
- Changed from 4-column grid to single-column vertical scrolling list
- Cards: 1100×200px, thumbnail (360×168) on left, chapter info on right
- Level pills: 280×56px, positioned to the right of thumbnail
- Added drag-to-scroll with mask: `list.setMask()`, pointerdown/move/up handlers
- Scroll clamping: `Phaser.Math.Clamp(list.y + dy, LIST_TOP + LIST_H - contentH, LIST_TOP)`

### 3. Background Music Pause Fix
**File:** `src/audio/AudioManager.ts`
- Added `setBackground(hidden: boolean)` method
- On hidden: pauses `fileMusic`, clears procedural music timer, suspends AudioContext, pauses Phaser sound manager
- On visible: resumes AudioContext, resumes Phaser sounds, restarts procedural music if needed
- Event listeners: `visibilitychange`, `pagehide`/`pageshow`, `blur`/`focus`, Capacitor App `pause`/`resume`

### 4. Unlock All Levels and Weapons
**File:** `src/save.ts`
- Changed `DEFAULTS` from `{ level: 0, weapons: [] }` to `{ level: 27, weapons: ["sword", "bow", "hammer", "boomerang", "wand", "cog", "ray"] }`
- 28 levels (index 0-27), 7 weapons

## Build and Deploy
1. `npm run build` — TypeScript compiles, Vite builds successfully
2. `npx cap sync android` — syncs web assets to Android
3. APK built by repackaging base APK with new `assets/public/` (zipalign + apksigner with debug keystore)
4. APK copied to repo as `Angelys-World.apk`, committed and pushed to `main` branch
5. APK uploaded to temp storage and sent to Angelo via chat

## GitHub Commits (main branch)
- `573bd2c` — Remove chase from 2-2 and 4-2, vertical scroll map selector
- `90b888b` — Update APK
- `65caec1` — Unlock all levels and weapons by default
- `734eea9` — Update APK: all levels unlocked
- `d463afe` — Bigger chapter cards, background music fix
- `fe7fff8` — Update APK

## Verification Status
**Verified:**
- TypeScript compiles without errors (`npm run build` succeeds)
- All commits pushed to GitHub main branch
- APK builds, zipaligns, and signs correctly

**NOT verified (requires device testing):**
- Chapter select visual layout on phone screen
- Background music actually stops when app is closed/minimized
- Chase removal doesn't break level progression
- HUD matches reference screenshots

## Standing Rules (from Angelo)
- Every build ships with ALL chapters/levels unlocked
- Never send APK until changes are confirmed and verified
- When sending APK: include what's new + verification status
- Deliver as both temp link and direct chat attachment
- State full file size (phone downloads stall on partial files)
