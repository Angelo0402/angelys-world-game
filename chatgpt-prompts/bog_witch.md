# ChatGPT Prompt: Bog Witch Sprite Sheet (Swamp Chapter Enemy)

## Sprite Sheet Specifications (BE VERY PRECISE)

Create a 2D game sprite sheet with the following EXACT specifications:

**Dimensions:**
- Total image size: 4400 pixels wide × 1100 pixels tall
- Grid layout: 20 columns × 5 rows = 100 frames total
- Each frame: 220 × 220 pixels (exactly)
- Background: TRANSPARENT (not black, not white - transparent PNG)

**Frame Layout (each row is one animation, 20 frames per animation):**

Row 1 (frames 0-19): IDLE animation
- The witch hovers/floats in place, bobbing gently up and down
- Cloak billowing, hat tipping, hands gesturing mystically
- Green magical particles swirling around her

Row 2 (frames 20-39): WALK/MOVE animation
- The witch glides forward through the air, cloak trailing behind
- Leaning into movement, hat streaming back, magical trail
- 20 frames for smooth, fluid gliding motion

Row 3 (frames 40-59): ATTACK animation
- The witch raises both hands, green magic gathering between palms
- Eyes glowing bright, mouth open chanting
- Hurls a bolt of swamp magic forward, cloak flaring dramatically

Row 4 (frames 60-79): HURT animation
- The witch recoils, clutching her arm, hat tilting
- Eyes widening in surprise, magical aura flickering
- Body jerking back, cloak wrapping protectively

Row 5 (frames 80-99): DEAD animation
- The witch spirals downward, cloak wrapping around her
- Magical energy dissipating into green wisps
- Hat falling off, body fading into swamp mist
- Last frames: only hat and fading sparkles remain

## Character Design (BE SPECIFIC)

**Bog Witch - Swamp Hag:**

- **Body:** Elderly female humanoid, hunched posture, floating (no legs visible, cloak covers lower body)
- **Skin:** Sickly green (#7AB648), wrinkled, warts on nose and chin
- **Clothing:**
  - Tattered dark purple cloak (#4A2C6B) with green trim, billowing
  - Pointed witch hat, bent tip, dark purple with green band and a small skull pin
  - Fingerless gloves, bony fingers with long nails
- **Face:**
  - Large hooked nose with wart
  - Glowing purple eyes (#B366FF)
  - Wide grin showing crooked teeth
  - Long gray-green hair escaping from hat
- **Details:**
  - Wooden staff with a glowing green crystal orb (in left hand)
  - Right hand free for casting spells
  - Green magical aura, fireflies circling
  - Moss and small mushrooms growing on cloak shoulders
- **Size in frame:** Witch should occupy ~75% of the 220×220 frame (about 165 pixels tall)
- **Facing:** 3/4 view, facing RIGHT (for 2D platformer)
- **Art style:** Colorful cartoon, similar to Disney/Pixar villains, clean lines, vibrant colors

## Critical Requirements

1. **EXACT grid alignment:** Each 220×220 cell must contain ONE complete witch pose. No witch should cross cell boundaries.
2. **Consistent size:** The witch must be the SAME SIZE in every frame
3. **Centered:** Witch centered horizontally in each cell
4. **Transparent background:** Absolutely no background color - transparent PNG
5. **20 frames per animation:** Each row must show clear progression of movement
6. **Smooth motion:** Frames should flow logically from one to the next
7. **Floating:** Witch hovers - feet never touch ground, cloak flows as if underwater

## What to Avoid

- Do NOT use black background (must be transparent)
- Do NOT vary the witch size between frames
- Do NOT cut off parts of the witch at cell edges
- Do NOT make the animations too subtle - Angelo wants VISIBLE, dynamic movement
- Do NOT add text, watermarks, or UI elements
- Do NOT give her legs/feet - she floats, cloak covers lower body

## Output Format

Single PNG file, 4400×1100 pixels, transparent background, containing all 100 frames in the specified grid layout.
