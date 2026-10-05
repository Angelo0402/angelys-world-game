# ChatGPT Prompt: Frostwolf Sprite Sheet (Ice Chapter Enemy)

## Sprite Sheet Specifications (BE VERY PRECISE)

Create a 2D game sprite sheet with the following EXACT specifications:

**Dimensions:**
- Total image size: 4400 pixels wide × 1100 pixels tall
- Grid layout: 20 columns × 5 rows = 100 frames total
- Each frame: 220 × 220 pixels (exactly)
- Background: TRANSPARENT (not black, not white - transparent PNG)

**Frame Layout (each row is one animation, 20 frames per animation):**

Row 1 (frames 0-19): IDLE animation
- The wolf stands in place, breathing, tail swaying, ears twitching
- Subtle movements: chest rising/falling, head turning slightly, snow particles

Row 2 (frames 20-39): WALK animation  
- Full walk cycle: legs moving in sequence, body bobbing, tail flowing
- 20 frames for smooth, fluid walking motion

Row 3 (frames 40-59): ATTACK animation
- The wolf lunges forward, jaws open wide showing fangs
- Ice breath/spikes emanating from mouth
- Claws extended, body coiled then striking

Row 4 (frames 60-79): HURT animation
- The wolf recoils, flinches, shakes head
- Eyes squinting, body tensing then relaxing
- Ice crystals cracking/falling off

Row 5 (frames 80-99): DEAD animation
- The wolf collapses: legs buckle, body falls to ground
- Final breath visible as ice mist
- Eyes closing, body going still
- Last frames: lying motionless on ground

## Character Design (BE SPECIFIC)

**Frostwolf - Ice Elemental Wolf:**

- **Body:** Large arctic wolf, muscular build, thick fluffy fur
- **Fur colors:** 
  - Primary: Pure white (#FFFFFF) on chest, belly, and muzzle
  - Secondary: Ice blue (#7DD8F0) on back and sides
  - Accents: Deep frost blue (#2A7FBE) on legs and tail tip
- **Details:**
  - Ice crystals growing from shoulders and spine (light blue, translucent)
  - Glowing cyan eyes (#00FFFF) with intense stare
  - Frost breath visible in cold air
  - Sharp white fangs, black nose
  - Large paws with ice claws
  - Bushy tail with frosted tip
- **Size in frame:** Wolf should occupy ~70% of the 220×220 frame (about 150 pixels tall)
- **Facing:** Side view, facing RIGHT (for 2D platformer)
- **Art style:** Colorful cartoon, similar to Disney/Pixar, clean lines, vibrant colors
- **No outline:** Soft edges, no thick black outlines

## Critical Requirements

1. **EXACT grid alignment:** Each 220×220 cell must contain ONE complete wolf pose. No wolf should cross cell boundaries.
2. **Consistent size:** The wolf must be the SAME SIZE in every frame (do not scale up/down between frames)
3. **Centered:** Wolf centered horizontally in each cell, feet at bottom of cell
4. **Transparent background:** Absolutely no background color - transparent PNG
5. **20 frames per animation:** Each row must show clear progression of movement
6. **Smooth motion:** Frames should flow logically from one to the next

## What to Avoid

- Do NOT use black background (must be transparent)
- Do NOT vary the wolf size between frames
- Do NOT cut off parts of the wolf at cell edges
- Do NOT make the animations too subtle (Angelo wants VISIBLE, dynamic movement)
- Do NOT add text, watermarks, or UI elements

## Output Format

Single PNG file, 4400×1100 pixels, transparent background, containing all 100 frames in the specified grid layout.
