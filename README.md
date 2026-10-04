# Angely's World

A mobile-first 2.5D side-scrolling platformer built with Phaser 3, TypeScript and Vite. The installable Android file is `Angelys-World.apk` in the root of this repo (landscape). Copy it to a phone and allow installs from unknown sources.

## Run it

```bash
npm run setup      # required once: fresh npm ci + Gradle download (do not copy node_modules)
npm run dev        # http://localhost:41731 (also reachable on your LAN for phone testing)
npm run build      # production build in dist/
npm run apk        # debug APK for sideloading (needs Android Studio / Android SDK)
```

Do **not** copy `node_modules` from another computer or from a zip. Vite 8 uses Rolldown, and that package needs a native binding for *this* OS (`@rolldown/binding-linux-x64-gnu`, `binding-win32-x64-msvc`, `binding-darwin-arm64`, …). A copied folder is almost always missing that file. `npm run setup` deletes `node_modules` and runs `npm ci` so npm installs the right binding.

The first Android build also has to download Gradle 8.11.1 (the wrapper zip is not in git — it is ~100 MB). `npm run setup` does that download into `.gradle-home/` so `npm run apk` does not stall on “Downloading https://services.gradle.org/…”. You still need the Android SDK / Android Studio on the machine that produces the APK.

## Build the Android APK

The game is already wrapped with [Capacitor](https://capacitorjs.com). The `android/` folder is the native project.

1. Install [Android Studio](https://developer.android.com/studio) (it installs the Android SDK and a JDK).
2. On first open, let it download the SDK (API 35) if it asks.
3. From this folder:

```bash
npm install
npm run android:sync    # builds the web game and copies it into android/
npm run android:open    # opens the project in Android Studio
```

4. In Android Studio: wait for Gradle to finish, plug in a phone (USB debugging) or start an emulator, then press **Run**.
5. To make an APK you can copy to a phone:

```bash
npm run apk
```

The file lands at `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to the phone and install it (you may have to allow “install from unknown sources”).

For a Play Store / signed release APK:

```bash
npm run apk:release
```

That needs your own keystore. In Android Studio: **Build → Generate Signed App Bundle / APK**.

The APK is locked to **landscape**, uses the game icon and splash, hides the status bar, and treats the Android back button as pause (Esc). It does **not** need a server: the whole game is bundled inside the app.

Handy URL flags:

- `?level=3-2` jumps straight into a level (`?chapter=2` starts that chapter's first level).
- `?touch` shows the touch controls on desktop.
- `?debug` draws the physics bodies.
- `?res=1.5` forces the render resolution (1 to 2).

## Gameplay

Ten chapters, two levels each. Levels differ in how they play, not just in their obstacles:

- **Modes:** `run` (free side-scrolling), `chase` (the screen scrolls by itself while a collapse or an avalanche chases Angely), `climb` (a one-screen-wide vertical tower) and `swim` (underwater: JUMP is a swim stroke).
- **Goals:** defeat N enemies, collect N star gems, or just reach the (already open) portal.
- **Terrain:** flat ground, low hills or tall cliffs, so the ground height changes from stretch to stretch.

| Level | Name | Mode / goal | What's new |
| --- | --- | --- | --- |
| 1-1 | Mushroom Meadow | run / 8 enemies | Stomping, platforms, a spring over a tall wall |
| 1-2 | Old Oak Hills | run / 6 gems | Hills; push crates against walls too tall to jump; moving platforms |
| 2-1 | Moonlit Gate | run / 10 enemies | Crystal Sword, cliffs, crumbling ledges |
| 2-2 | Crumbling Halls | chase / reach | The halls collapse behind you |
| 3-1 | Ember Tunnels | run / 10 enemies | Star Bow: shoot star targets to raise bridges over lava |
| 3-2 | Magma Lift | run / 6 gems | Lifts up very tall walls |
| 4-1 | Slippery Slopes | run / 12 enemies | Ember Hammer smashes cracked walls; slippery ice |
| 4-2 | Avalanche Run | chase / reach | An avalanche, over icy hills |
| 5-1 | Shadow Bridge | run / 12 enemies | Every mechanic, shadow-touched enemies |
| 5-2 | Umbra's Throne | boss | Queen Umbra, then part two: the Colossus and Angelo |
| 6-1 | Sky Tower | climb / reach | Vertical tower; Moon Boomerang |
| 6-2 | Storm Spire | climb / reach | A storm flood rises from below |
| 7-1 | Sunken Temple | swim / 10 enemies | Swimming, spiky urchins, gates; Star Wand |
| 7-2 | Coral Palace | swim / 8 gems | Swim the palace and collect every star gem |
| 8-1 | Cog Dunes | run / 12 enemies | Clockwork Desert: moths, armored gear crabs, sand wisps |
| 8-2 | Dune Worm | boss | The sand worm. Hit it while it is above the dune |
| 9-1 | Gumdrop Trail | run / 10 enemies | Squishy Valley; the Bubble Ray |
| 9-2 | Bubble Falls | run / 6 gems | Springs, cliffs, and star gems |
| 10-1 | Comet Grove | run / 10 enemies | Star Orchard: starlings, moonhares, seed lamps, comet pups |
| 10-2 | Meteor Run | chase / reach | A meteor shower chases Angely to the portal |

Part two of 5-2 is a cutscene where Angely doesn't fight. A giant golem rises, her dad Angelo (blue hoodie) arrives through a blue portal, defeats it, talks with her and leaves ("Angely, I'll be watching you. I'll be back. I have stuff to do, but be careful."). His frames come from the character sheet in `art/source/angelo_reference_sheet.png`. The lines are in `src/story/angelo.ts`.

New enemies in chapters 6 and 7 (storm bird, thunder cloud imp, jellyfish, anglerfish) have 30 animation frames each: 10 move, 10 attack, 4 hurt and 6 defeat.

Weapons (Angely keeps every weapon she finds; swap between them):

- **Crystal Sword**: fast melee slash, also in the air.
- **Star Bow**: arrows with gentle auto-aim at enemies in front, Umbra and star targets.
- **Ember Hammer**: slow, two damage, a ground shockwave that hits nearby enemies, breaks armour and cracked walls.
- **Moon Boomerang**: flies out and curves back, hitting everything on the way there and back.
- **Star Wand**: three stars that home in on the nearest enemies.

Queen Umbra: walking into her arena starts a cutscene. The camera locks, she floats in, and she speaks to Angely in subtitles at the bottom (advance with tap, A, Space or Enter; SKIP or Menu skips). During the fight she cycles orb volleys, an orb rain with ground markers, a low swoop you jump over (after which she kneels, tired and open to stomps), a ground slam with shockwaves, and minion summons. At half health she gets faster. When she falls there's a farewell scene, and the portal home appears. The dialogue lives in `src/story/umbra.ts`.

- Sealed portals show how many enemies or gems are left, and an arrow points to an open portal.
- At most two enemies stay alive near Angely. Scripted bosses are unchanged. Enemies left far behind despawn so new ones can spawn, and a kill goal never stalls.
- Angely has 5 hearts. Every hit removes half a heart, then just over a second of invulnerability stops the next hit from landing immediately. Heart pickups restore one full heart. The HUD shows a half heart.
- Falling into a pit or lava costs half a heart and respawns you at the last checkpoint flag.
- Unlocked levels, weapons and the final victory are saved in `localStorage`. Older chapter saves migrate automatically.

Controls: on touch screens, use the left joystick (a small push walks, a full push runs), JUMP, the weapon button (SWORD / BOW / HAMMER), SWAP, and pause. On a keyboard, use A/D or the arrow keys to move, W, Up or Space to jump, J or K to attack, Q, E or L to swap weapons, and Esc to pause. Walking into a crate pushes it.

Xbox (or any standard) controller: left stick or D-pad to move (a light push walks), A to jump, X, B, RB or RT to attack, Y or LB to swap weapons, and Menu or View to pause. Menus work with the controller too: D-pad or stick moves the gold focus ring, A selects, B goes back or resumes. Touch controls hide while a controller is connected. Browsers only report a controller after you press one of its buttons.

## Assets

- `art/source/angely_reference_sheet.png` is the character sheet you supplied. The push, bow and hammer animations were drawn from it in the game's style, and the dialogue portraits are cropped from its expressions.
- `art/source/gen/` holds the current art: player, enemy, prop, item, portal and VFX sheets plus backgrounds and chapter splashes, all generated in one consistent style on flat white (or black, for effects) backgrounds. The older hand-supplied atlases are kept in `art/source/` for reference.
- `tools/atlas_config.py` maps each animation to frames. `G(atlas, row, first, last)` picks frames from the rows that `tools/segment.py` detects automatically. Player sheets are normalised to the same character size using her hair area; enemy sheets are normalised by walk height.
- `public/assets/runtime/` holds the cut WebP sheets the game loads, exported at about 2x on-screen size. These are generated, so don't edit them by hand.

## Sharpness and frame rate

The game is laid out at 1280x576, but the canvas is allocated at up to 2x that (`src/render.ts`) so it maps about 1:1 onto phone pixels in fullscreen. If the frame rate stays under ~52 fps, the resolution steps down by 0.25x (to a minimum of 1x) and the device remembers it. Use `?res=1` to `?res=2` to force a value.

To regenerate after changing art or frame mappings (requires `pip install pillow numpy scipy`):

```bash
npm run sprites    # rewrites public/assets/runtime/ and src/assets/sprites.gen.ts
```

`python3 tools/show_sheet.py angely` renders a labelled preview of any sheet to `/tmp/aw/`.

## Audio

Every sound is currently a WebAudio synth placeholder (`src/audio/AudioManager.ts`), with music and SFX kept separate. To use real files, such as ElevenLabs effects, drop them into `public/assets/audio/` and list them in `src/audio/manifest.ts`, for example `jump: "jump.mp3"`. A listed file automatically replaces its synth placeholder.

## Project layout

```
src/
  main.ts                 Phaser config (Scale.FIT, variable-step Arcade physics)
  render.ts               device-resolution canvas, camera zoom, adaptive quality
  config.ts               chapters, the 20 levels and their set pieces, weapons
  scenes/                 Boot, Title (level select), Splash, Game, Hud
  entities/               Player, Enemy (idle > patrol/chase > windup > attack > hurt > dead), enemyTypes, Boss (Queen Umbra)
  world/level.ts          deterministic level layout assembled from set pieces
  world/Mechanics.ts      walls, crates, springs, moving/crumbling platforms, targets, cracked walls
  world/Portal.ts         arch + vortex clipped to the opening, lock counter, enter animation
  story/umbra.ts          boss cutscene dialogue
  ui/Dialogue.ts          letterbox, subtitle box with portraits and typewriter text
  input/controls.ts       keyboard + shared touch state
  input/gamepad.ts        controller polling (standard / Xbox mapping)
  ui/padMenu.ts           controller focus navigation for menus
  audio/                  synth audio manager + file manifest
```
