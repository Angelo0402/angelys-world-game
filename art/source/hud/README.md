# Reference HUD and weapon icons

Seven original OpenAI-generated weapon icons are preserved in `weapons.png`. `generation.json` records the prompt and reviewed extraction rectangles. Run `python tools/build_hud.py` with Pillow to reproduce the individual, padded 128 x 128 lossless WebP icons. The normal sprite build also exports them.

`src/ui/gameHudArt.ts` draws the gold/purple jewel buttons and blue glass joystick into 2x canvas textures once per game. The screenshot's HUD is reproduced with five large hearts, a centered goal and level label, a gold weapon slot, sound/pause circles, SWAP, weapon attack, and JUMP. Keyboard and controller hints remain contextual. Every owned weapon has its own icon and name, shared between the slot and attack button. Empty and single-weapon states hide the unavailable controls.

`tools/check_hud.cjs` exercises real touch swaps through all seven weapons, health updates, mute, pause/resume, three simultaneous touch points, release cleanup, and weapon-slot taps. Browser coverage also changes viewport sizes. It accepts the same Playwright/Android CDP configuration as the Chapter 11 checker and captures Android screens with adb. Test fixtures grant weapons and a shield for deterministic coverage.
