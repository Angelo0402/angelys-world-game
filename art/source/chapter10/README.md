# Chapter 10 rebuild

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

Rebuild with Python 3, Pillow, and NumPy: `python tools/build_chapter10.py`, then `python tools/build_finale.py`. Validate all 272 Chapter 10/finale runtime frames with `python tools/check_chapter10.py`. The regular sprite build invokes both packers and bypasses the legacy Crystal Veil cutter.

Chapter 10-1 has a hand-authored route, mixed existing enemies, stepping stones, two checkpoints, and a gated portal. Chapter 10-2 is the final level: 160 HP, 0.25 stomp damage, faster three-phase attacks, capped mixed enemy waves and bounded heart drops. Boss attacks continue when hit; phase changes, death and shutdown cancel pending hazards. The cage/actor remain independent. The new finale sprites in `../finale/` show a happy reunion, offered hand and both characters departing from behind through the same blue portal. The portal closes before “TO BE CONTINUED...” and “BACK TO LEVELS”. No next chapter follows.

Validation: `npm run build`, `npx cap sync android`, Android `:app:assembleDebug`, asset checks, browser route checks, and installed Android WebView boss/rescue checks passed. Browser checks require Playwright and a dev server on port 41811. `tools/check_chapter10.cjs` also accepts `CH11_CDP_URL` for an attached Android WebView and `ANDROID_HOME` for device screenshots. These scripted checks grant a shield and inject damage for deterministic phase coverage; they are not unaided playthroughs. Physical-device testing and release signing have not been performed. This build uses Android's debug signature.
