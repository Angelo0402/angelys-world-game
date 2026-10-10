# Prompts para ChatGPT — Más frames de animación para Angely

## Estado actual de animaciones de Angely
Sheet: `angely.webp` — frames de 313x263px, personaje mirando a la derecha

| Animación | Frames actuales | Frames objetivo |
|-----------|-----------------|-----------------|
| idle | 4 | 8 |
| run | 8 | 16 |
| jump | 4 | 8 |
| walk | 6 | 10 |
| fall | 2 | 4 |
| celebrate | 4 | 8 |

## Spec técnico (IMPORTANTE)
- Grid de 4 columnas x 5 filas = 20 frames por sheet
- Fondo negro sólido
- Cada frame ~313x263px (mismo tamaño que los actuales)
- Personaje SIEMPRE mirando a la derecha
- Mismo diseño de Angely: niña de 7 años, pelo largo negro, hoodie azul
- Estilo consistente con los sprites existentes

---

## PROMPT 1: Run cycle (16 frames) — PRIORIDAD ALTA

```
Create a 2D game sprite sheet: 4 columns x 5 rows = 20 frames total.
Character: Angely, a brave 7-year-old girl with long black hair, wearing a blue hoodie, facing RIGHT.

Animation: RUN CYCLE — 16 frames of smooth running motion.
Use frames 1-16 for the run cycle. Leave frames 17-20 empty/black.

Requirements:
- Solid black background
- Each frame approximately 313x263 pixels
- Character facing right in every frame
- Smooth running motion: legs pumping, arms swinging, hair flowing back, slight body lean forward
- Same art style as a colorful 2D platformer
- Frames should loop seamlessly (frame 16 connects back to frame 1)
```

## PROMPT 2: Idle breathing (8 frames) — PRIORIDAD ALTA

```
Create a 2D game sprite sheet: 4 columns x 5 rows = 20 frames total.
Character: Angely, a brave 7-year-old girl with long black hair, wearing a blue hoodie, facing RIGHT.

Animation: IDLE — 8 frames of subtle breathing/standing motion.
Use frames 1-8 for the idle animation. Leave frames 9-20 empty/black.

Requirements:
- Solid black background
- Each frame approximately 313x263 pixels
- Character facing right in every frame
- Subtle motion: gentle breathing (chest rising/falling), slight hair sway, occasional blink
- Relaxed standing pose, ready for adventure
- Same art style as a colorful 2D platformer
- Frames should loop seamlessly
```

## PROMPT 3: Jump (8 frames) — PRIORIDAD MEDIA

```
Create a 2D game sprite sheet: 4 columns x 5 rows = 20 frames total.
Character: Angely, a brave 7-year-old girl with long black hair, wearing a blue hoodie, facing RIGHT.

Animation: JUMP — 8 frames: crouch/anticipation (2) → launch upward (2) → peak/tuck (2) → start falling (2).
Use frames 1-8. Leave frames 9-20 empty/black.

Requirements:
- Solid black background
- Each frame approximately 313x263 pixels
- Character facing right in every frame
- Dynamic jumping motion: knees bending, then extending, arms going up, hair flowing
- Same art style as a colorful 2D platformer
```

## PROMPT 4: Walk cycle (10 frames) — PRIORIDAD MEDIA

```
Create a 2D game sprite sheet: 4 columns x 5 rows = 20 frames total.
Character: Angely, a brave 7-year-old girl with long black hair, wearing a blue hoodie, facing RIGHT.

Animation: WALK CYCLE — 10 frames of smooth walking motion.
Use frames 1-10 for the walk cycle. Leave frames 11-20 empty/black.

Requirements:
- Solid black background
- Each frame approximately 313x263 pixels
- Character facing right in every frame
- Natural walking: alternating leg steps, gentle arm swing, slight bounce
- Slower and more relaxed than running
- Same art style as a colorful 2D platformer
- Frames should loop seamlessly
```

---

## Después de generar

1. Descarga cada sheet
2. Pásamelos y yo los recorto, reduzco al tamaño original (313x263) e integro
3. Actualizo los rangos de frames en `sprites.gen.ts`
4. Rebuild y nuevo APK para probar
