# ChatGPT Prompt: Swamp Crawler Sprite Sheet (Swamp Chapter Enemy)

## Sprite Sheet Specifications (BE VERY PRECISE)

Create a 2D game sprite sheet with the following EXACT specifications:

**Dimensions:**
- Total image size: 4400 pixels wide × 1100 pixels tall
- Grid layout: 20 columns × 5 rows = 100 frames total
- Each frame: 220 × 220 pixels (exactly)
- Background: TRANSPARENT (not black, not white - transparent PNG)

**Frame Layout (each row is one animation, 20 frames per animation):**

Row 1 (frames 0-19): IDLE animation
- The crawler sits in place, breathing heavily, jaw opening/closing slightly
- Tail swaying, eyes blinking, throat pouch inflating/deflating
- Drool dripping, small splashes

Row 2 (frames 20-39): WALK animation
- Full quadruped walk cycle: legs moving in sequence (left-front, right-back, etc.)
- Body swaying side to side, tail dragging and sweeping
- Belly nearly touching ground, claws digging into mud
- 20 frames for smooth, heavy, lumbering motion

Row 3 (frames 40-59): ATTACK animation
- The crawler rears up on hind legs, jaws opening WIDE (nearly 90 degrees)
- Forelegs raised with claws extended, tail lashing
- Lunges forward with jaws snapping shut, mud flying
- Roaring with throat pouch fully inflated

Row 4 (frames 60-79): HURT animation
- The crawler flinches, head jerking back, eyes squinting
- Body curling defensively, tail tucking
- Jaw snapping at air, shaking head to clear dizziness
- Mud and water splashing off its back

Row 5 (frames 80-99): DEAD animation
- The crawler stumbles, legs buckling one by one
- Body rolling onto its side, legs twitching then still
- Jaw falling open, tongue lolling out, eyes closing (X eyes or spirals)
- Final frames: lying motionless on back, belly exposed, flies circling

## Character Design (BE SPECIFIC)

**Swamp Crawler - Mutant Alligator/Toad Hybrid:**

- **Body:** Low-slung quadruped, like a fat alligator crossed with a toad
- **Colors:**
  - Primary: Murky swamp green (#5A7A3A) on back and head
  - Secondary: Yellowish belly (#C4B86A), soft and round
  - Accents: Dark olive spots (#3D5225) scattered on back
  - Mouth interior: Dark red (#8B2E2E)
- **Head:**
  - Wide, flat snout like an alligator, full of sharp white teeth
  - Two large eyes on top of head, yellow with vertical slit pupils
  - Nostril bumps on snout tip
  - Throat pouch under chin that inflates (like a frog)
- **Body details:**
  - Bumpy, warty skin texture
  - Short, stubby legs with webbed claws
  - Long thick tail, dragging behind, with dorsal spikes
  - Algae and moss growing on back
  - Small leeches attached to sides (detail)
- **Size in frame:** Crawler should occupy ~70% of the 220×220 frame width (about 155 pixels wide, 110 pixels tall - it's low and wide)
- **Facing:** Side view, facing RIGHT (for 2D platformer)
- **Art style:** Colorful cartoon monster, similar to Disney/Pixar creatures, clean lines, vibrant colors, slightly gross but cute

## Critical Requirements

1. **EXACT grid alignment:** Each 220×220 cell must contain ONE complete crawler pose. No crawler should cross cell boundaries.
2. **Consistent size:** The crawler must be the SAME SIZE in every frame
3. **Centered:** Crawler centered in each cell, belly near bottom of cell
4. **Transparent background:** Absolutely no background color - transparent PNG
5. **20 frames per animation:** Each row must show clear progression of movement
6. **Smooth motion:** Frames should flow logically from one to the next
7. **Low profile:** This is a ground crawler - keep it low, wide, and heavy-looking

## What to Avoid

- Do NOT use black background (must be transparent)
- Do NOT vary the crawler size between frames
- Do NOT cut off tail or snout at cell edges (leave padding)
- Do NOT make the animations too subtle - Angelo wants VISIBLE, dynamic movement
- Do NOT add text, watermarks, or UI elements
- Do NOT make it stand upright like a human - it's a quadruped crawler

## Output Format

Single PNG file, 4400×1100 pixels, transparent background, containing all 100 frames in the specified grid layout.
