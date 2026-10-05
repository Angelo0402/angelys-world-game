# Angely's World — Asset Creation Specs for ChatGPT

This document defines the EXACT format for all game assets. Follow it precisely so assets drop into the game without rework.

## ENEMY SPRITE SHEETS

### Layout
- **Grid**: 4 rows × 5 columns = 20 frames total
- **Background**: Solid BLACK (#000000), no transparency in the source
- **Spacing**: Leave black padding between frames so each frame can be auto-detected
- **Frame size**: All frames roughly the same size (±10% variation OK)

### Row meanings (top to bottom)
| Row | Frames | Animation | Description |
|-----|--------|-----------|-------------|
| 1 | 0–4 | idle/walk | Standing or walking loop |
| 2 | 5–9 | move/attack-windup | Walking, dashing, or preparing attack |
| 3 | 10–14 | attack | Attack animation (fire breath, swipe, etc.) |
| 4 | 15–19 | hurt/dead | 15–16: hurt flinch, 17: dizzy, 18–19: death/collapse |

### Size rules
- Source frames: ~200–300px per frame (square-ish)
- Final in-game height: 54–116px depending on enemy tier:
  - Small enemies: 54–74px (bat, blob, beetle)
  - Medium enemies: 80–96px (skeleton, ghost, mushroom)
  - Large enemies: 104–116px (golem, yeti)
- Character must be CENTERED in each frame
- Character must face RIGHT in all frames

### Style
- Match the existing game art style (look at current enemies for reference)
- Bold outlines, vibrant colors, readable at small sizes
- No text, watermarks, or labels on the sheet

---

## PLATFORM / TILE PACKS

### Format
- Individual pieces on BLACK background
- Each piece separated by black space
- Save pieces individually as transparent PNG/WebP after extraction

### Themes needed (one pack per theme)
1. Forest (green mossy stone)
2. Crystal/Shadow (dark blue with glowing crystals)
3. Lava/Volcano (dark rock with lava cracks)
4. Ice/Frozen (blue-white ice)
5. Desert (sandy stone)
6. Ocean/Underwater (teal stone with coral)
7. Sky/Cloud (white marble with gold)
8. Ruins (dark purple stone)

### Pieces per pack (minimum)
- 2× small square block
- 2× long horizontal platform
- 2× floating island (with pointed bottom)
- 1× vertical pillar/column
- 1× decorative arch or gate
- Spikes or hazards (theme-appropriate)

---

## BACKGROUNDS

### Format
- **Single image per background** (not a grid)
- **Dimensions**: 1920×1080 (16:9 landscape)
- **Format**: JPG quality 85
- **Style**: Painterly, vibrant, matches the game's colorful look

### Backgrounds needed (one per chapter theme)
1. Forest (bright green, waterfalls)
2. Ruins (dark stone, night, moon)
3. Volcano (lava, dark cave)
4. Frozen (ice mountains, aurora)
5. Shadow (purple castle, dark)
6. Sky (floating islands, clouds)
7. Sea (underwater, coral)
8. Desert (sand, sunset)
9. Squishy Valley (colorful, playful)

### Composition rules
- Horizon line at ~60% from top (ground area at bottom)
- Leave the center relatively clear (gameplay happens there)
- Rich detail on left/right edges (parallax feel)
- NO characters, enemies, or text in backgrounds

---

## NAMING CONVENTION

Name files clearly so the integrator knows what each is:
- Enemies: `enemy_<name>_<theme>.png` (e.g., `enemy_icewolf_frozen.png`)
- Tiles: `<theme>_tiles.png` (e.g., `forest_tiles.png`)
- Backgrounds: `bg_<theme>.png` (e.g., `bg_volcano.png`)

---

## QUALITY CHECKLIST (before sending)

- [ ] Black background (not transparent, not white) on sprite sheets
- [ ] All 20 frames present for enemies (4×5 grid)
- [ ] Character faces RIGHT in every frame
- [ ] No cut-off limbs or overlapping frames
- [ ] Consistent character size across all frames
- [ ] Backgrounds are 1920×1080, no text or characters
- [ ] Tile pieces are separated by black space
