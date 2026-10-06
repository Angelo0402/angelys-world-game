# Chapter 11 rebuild

The selected original artwork in this directory was generated with OpenAI image generation. `generation_v2.json` records the prompts and selected sources. `layout.json` explicitly records each source frame's rectangle and pivot; the packer never guesses grid cuts or removes detached crystal fragments.

Runtime assets use fixed transparent cells:

| Asset | Cell | Frames |
| --- | --- | --- |
| Crystal Veil boss | 384 x 384 | 48 |
| Each of four chapter enemies | 256 x 256 | 16 |
| Angelo | 256 x 256 | 16 |
| Cage / reunion | 384 x 384 | 4 each |
| Projectile / impacts / beam | 256 x 256 | 12 / 8 / 4 |
| Background / splash | 1920 x 1080 | 1 each |

Rebuild with Python 3 and Pillow: `python tools/build_chapter11.py`. Validate all 160 runtime frames with `python tools/check_chapter11.py`. The regular sprite build also invokes the chapter packer and bypasses the legacy Crystal Veil cutter.

Chapter 11-1 now has a hand-authored route, four enemy types, stepping stones, two checkpoints, and a gated portal. Chapter 11-2 has a three-phase boss with visible attack warnings, cancelable timers and hazards, an independent cage/actor, a full-body reunion, and Angelo's blue-rift exit.

Validation: `npm run build`, `npx cap sync android`, Android `:app:assembleDebug`, asset checks, browser route checks, and installed Android WebView boss/rescue checks passed. Browser checks require Playwright and a dev server on port 41811. `tools/check_chapter11.cjs` also accepts `CH11_CDP_URL` for an attached Android WebView and `ANDROID_HOME` for device screenshots. These scripted checks grant a shield and inject damage for deterministic phase coverage; they are not unaided playthroughs. Physical-device testing and release signing have not been performed. This build uses Android's debug signature.
