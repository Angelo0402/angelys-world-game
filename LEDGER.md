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

- 2026-10-19 — TGL Phase 1 attack mode completed all 4 slices: checkpoint on main (3692f67, tag tgl-phase1-checkpoint) → Slice 1 deleted 4 unreferenced .ts files + pruned 14 dead exports (46→42 files, tsc clean, commit 76450c7) → Slice 2 removed 11 orphan manifest entries (185→174 keys, vite build clean) → Slice 3 deleted 11 orphan asset files (~2.03MB saved) → Slice 4 full local build chain green, APK 45,272,216 bytes (~45.3MB, down from ~47.4MB), zip-test clean. Dynamic-loading patterns (weapon_*, ground_*, HUD icons via template literals) correctly detected and preserved.
- 2026-10-19 — Gradle daemon root cause found: daemon IPC was failing because the client connects over AF_INET6 to ::ffff:127.0.0.1 and the sandbox proxy intercepts it. Fix: export JAVA_OPTS="-Djava.net.preferIPv4Stack=true" AND pass -Dorg.gradle.jvmargs="-Xmx1536m -Dfile.encoding=UTF-8 -Djava.net.preferIPv4Stack=true" (the -D flag on the gradle CLI alone never reaches the forked daemon JVM). Without this, no local APK builds in this environment.

## Friction (harness feedback)

- (to fill during attack mode)

## Open questions

- 2026-10-19 — art/ 211MB: archive, keep, or move out of repo? (deferred, not part of this plan)
- 2026-10-19 — Phase 2 (3 known bugs) spec'd after cleanup verifies clean on device.

## 2026-10-20 — Crystal Veil voice mismatch (device-test finding, Angelo)
- Angelo device-tested the Phase-1 clean APK: game runs, but in the Crystal Veil intro the subtitle "Dad?! Hold on, I'll cut you free!" plays audio "Hey! Get away from my daughter!".
- Root cause PROVEN by transcribing all 53 voice MP3s (faster-whisper tiny): the 14 files wired to crystalveil.ts (angelo_01-07, angely_01-07) contain recordings for the Colossus/finale sequence (ANGELO_ARRIVES, ANGELO_TALK, ANGELO_FAREWELL). The Crystal Veil script lines were NEVER recorded. Orphan files (angelo_08-21, angely_08-32) belong to other scenes (desert boss, squishes teaser, alternate Veil script angely_23-30/angelo_16-21) — NOT junk, do not delete.
- Fix (commit 1f1a310, main): removed all 14 voice fields from src/story/crystalveil.ts. Scene is subtitle-only until real Veil voices are recorded. tsc clean, vite build clean, APK built locally (IPv4 recipe): ~/workspace/your_files/AngelysWorld-voicefix.apk (45,272,150 bytes, zip verified).
- Open creative options for Angelo: (a) record the real Veil lines → wire in minutes; (b) adopt the alternate recorded Veil script (angely_23-30/angelo_16-21) and rewrite subtitles to match; (c) bonus: wire finale recordings into angeloScene.ts where they belong (recordings merge some script lines, needs line-splitting decisions).

## 2026-10-20 (later) — Real Veil voices generated + wired (commit 5c991e0)
- Angelo chose ElevenLabs ("todavía quedan créditos, entra con google"). Generated the 14 Crystal Veil lines: Angelo = "Killian - Clear, Warm, Upbeat & Friendly", Angely = "Emmaline - young British girl", Eleven v4, MP3 44.1kHz. Credits: 5,993 → 5,553 remaining.
- Files saved as NEW keys veil_angelo_01-07 / veil_angely_01-07 (finale recordings untouched). ALL 14 content-verified by transcription against their subtitles before wiring.
- crystalveil.ts re-wired to veil_* keys; manifest type + AUDIO_FILES updated (preload is automatic via src/assets/manifest.ts). tsc/vite/capacitor/gradle green. APK: ~/workspace/your_files/AngelysWorld-voicefix-v2.apk (46,125,635 bytes, zip OK, 14 veil MP3s inside). Awaiting Angelo's device test.

## 2026-10-20 (morning) — Queen Umbra voices wired (commit pending hash in git log)
- Angelo confirmed Veil voices work ("las líneas se escucharon"). Umbra fight was silent: her 10 recordings existed but umbra.ts had zero voice fields.
- Transcription verified umbra_01-10 match her script lines 1:1 in order (minor performance-wording variance). Wired all + Angely's replies (angely_01/02/03/04). angely_02's take adds "from every world" vs subtitle — flagged to Angelo.
- Also transcribed sovereign_01-04: they ARE the Veil Sovereign's lines ("I am the Veil Sovereign... kneel, child", crown-shatter lines) — recorded, but no script lines exist for the Sovereign in story files yet. Parked with the boss-overhaul work.
- Final boss (Colossus) overhaul: Angelo parked it explicitly ("eso se da para otro día").

## 2026-10-20 (07:20) — Gameplay barks live (commit in git log)
- Angelo: Umbra fight confirmed good; Angely's gameplay voice/barks were silent; asked for ~10 varied, non-repetitive lines.
- Audit: 8 bark MP3s existed + registered, ZERO code triggers. Transcribed: Let's go! / Woohoo! / Got one. / Ouch. / Again again! / That was close. / Star power! / Bye-bye!
- Generated 3 new with Emmaline (ElevenLabs, 26 credits; balance 5,489): Take that! (attack), Gotcha! (stomp), I did it! (celebrate) — all transcription-verified.
- Built src/audio/barks.ts (cooldown 3s, no-repeat, probability gates, voiceBusy guard) + hooks in Player (jump/attack/hurt/celebrate) and GameScene (start/stomp/pickups/star shield/game over). APK: ~/workspace/your_files/AngelysWorld-barks.apk. Awaiting device test.

## 2026-10-20 (11:25) — Worm/Colossus scenes voiced + 23 contextual barks (commit in git log)
- Angelo device-tested barks build: liked it; asked for MANY more barks, world-specific/reactive (Squishy example), and reported the post-Sand-Worm Angelo scene playing silent (screenshot: "I figured out the brass part myself.").
- Fixed silent scenes with EXISTING recordings ($0): worm.ts all four scenes (angelo_10-14, angely_16-22) and angelo.ts Colossus sequence (angelo_01-09, angely_05-10); merged takes wired to first line. All verified by transcription.
- Generated 23 contextual barks (Emmaline; 574 credits; balance 4,915): 11 chapter-entry lines, 5 Squishy Valley, 7 reactive. All 23 transcription-verified (base model re-check on 3 suspects — all correct).
- Triggers: ENTRY_BARKS map at level start; first-sight per enemy type; squish stomp/hurt pools via Player.hurt optional pool param; low-HP via onHeartsChanged; pit fall; checkpoint; weapon pickup; goal complete. bark_rx_boss ("that one is BIG") generated but NOT wired — every boss intro is voiced dialogue; wiring it would collide. APK: ~/workspace/your_files/AngelysWorld-context-barks.apk. Awaiting device test.

## Voice identity (VERIFIED 2026-10-20 from ElevenLabs history)
- Angely = "Fena - Girly, Young and Sassy Hero"; Angelo = "Brian - Deep, Resonant and Comforting" (originals, ~Oct 6 gens).
- Emmaline/Killian takes (Oct 20 morning) were WRONG voices; all replaced with Fena/Brian on 2026-10-20: veil_* (14), ctx barks (23), angely_bark_09-11, enemy-reaction set (46). All transcription-verified.
- Enemy reactions: SIGHT_BARKS (per type), HURT_BARKS (per type; projectiles carry fromKey), STOMP_BARKS (per family) in src/audio/barks.ts.
- bark_hurt_jellyfish line reworded for clarity: "Ouch! That jellyfish stung me!"
