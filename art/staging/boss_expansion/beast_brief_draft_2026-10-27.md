# BORRADOR — Brief de generación Bestia (Crystal Beast, fase 1 del jefe final)

- **Fecha:** 2026-10-27 · **Estado:** BORRADOR — falta la línea de estilo (Angelo decide:
  HD 3D como la bruja / mismo diseño actual, mejor movimiento).
- **Método:** ChatGPT por navegador, sesión nueva, **SOLO TEXTO** (las subidas de
  archivos fallan repetidamente — no depender de adjuntar la referencia).
  **Una tira por movimiento, cada una en su propio mensaje/pedido.** Nunca
  amontonar movimientos en una sola imagen.
- **Regla GIF-first:** nada se integra sin que Angelo apruebe el GIF.

## Descripción del personaje (verificada contra la hoja actual crystalveil.webp)

Cuadrúpedo de cristal, postura baja de acecho, **mirando a la DERECHA** (la hoja
actual mira a la derecha; el juego la espeja con flipX — NO generar mirando a
la izquierda). Cuerpo de placas cristalinas facetadas negro-morado oscuro.
Fila de púas grandes de cristal magenta-morado a lo largo del lomo, más grandes
hacia los hombros y la cabeza. Cabeza angular, ojos rojos brillantes, mandíbula
abierta con colmillos. **Núcleo rojo brillante en el pecho** (estrella roja).
Cola larga que se curva hacia arriba, terminada en un racimo de cristal magenta.
Patas gruesas con garras magenta. Humareda morada oscura saliendo del lomo
(forma parte de la criatura, mantenerla en cada cuadro, moviéndose natural).
Familia de color: negro/morado cristal + brillo magenta + núcleos ROJOS.
Nunca azul. Cuerpo completo en cada cuadro.

## Bloque común (copiar en CADA prompt, después del movimiento)

> Same character as described: quadruped crystal beast, low prowling stance,
> facing RIGHT, black-purple faceted crystal plates, large magenta-purple
> crystal spikes along the back, glowing red eyes, open fanged jaw, glowing
> red core in the chest, long tail curving up with a magenta crystal tip,
> thick legs with magenta claws, dark purple smoke wisps rising from its back.
> Rendered in bulky HD 3D style, volumetric and dimensional like a high-detail
> 3D game render, detailed faceted crystal surfaces, dramatic lighting — the
> same character design, NOT a redesign, NOT flat cartoon, NOT glossy Pixar.
> Full body in every frame. All frames in a single horizontal row, left to
> right, in true animation order, evenly spaced, each frame cleanly separated.
> Solid pure flat black background, no gradient, no vignette. No text, no
> scenery, no extra characters, no watermark. No baked effects: no dust clouds,
> no impact stars, no projectiles, no ground cracks, no aura bursts painted
> in — the game engine adds those. [ESTILO DECIDIDO 2026-10-27: HD 3D como la
> bruja — voluminoso, mismo diseño de la Bestia, solo cambia el render.]

## Ronda 1 — Bestia (8 tiras, una por mensaje)

1. **idle, 24 frames:** subtle breathing idle, weight shifting, head swaying
   slightly, tail tip flicking, red core pulsing, smoke drifting, ready stance.
2. **walk, 30 frames:** complete quadruped walk cycle with head movement,
   legs alternate with big strides, passing poses, feet lifting off the
   ground, body bobbing, tail swaying, every frame clearly different.
3. **claw, 20 frames:** foreleg draws back, then a fast horizontal claw swipe
   with crystal claws extended, follow-through, return to guard.
4. **slam, 20 frames:** rears up, both forelegs raise high, then smash down
   toward the ground, body compresses, recover to stance.
5. **shoot, 20 frames:** head/chest toward the player, crystal energy gathers
   at the mouth/chest, fires forward, recoil, return to stance.
6. **summon, 20 frames:** rears slightly, head up, energy rises around the
   body, minion energy gathering, settle back to stance.
7. **hurt, 12 frames:** flinch backward from a hit, body recoils, head turns
   away, shakes it off, back to guard.
8. **dead, 20 frames:** collapse sequence, legs buckle, falls to the ground,
   crystals dim, red core fades out, lies still.

## Ronda 2 (después, si hace falta)

dash, erupt, enrage, stagger — o reutilizar los actuales si el movimiento ya
se lee bien. Decidir tras la ronda 1.

## Notas de auditoría (2026-10-27, no repetir estos errores)

- Hoja actual: celdas 456×354, 8×9 = 72 cuadros. Casi todo son anims de 3-4
  cuadros; caminar 8; salto 1 solo cuadro.
- Solo 8 anims se usan de verdad (idle, walk, dash, stagger, erupt, enrage,
  hurt, dead). claw, slam, shoot, summon, aim, sky, radial, double, leap
  están definidos pero nunca se ven.
- Los ataques NO se animan: el sistema windup muestra solo 3 poses fijas
  (start, start+1, start+2) y luego stagger. La integración debe conectar los
  ataques para que se muevan de verdad (disparo en el cuadro de impacto, como
  el Sentinel: slam/throw disparan en el cuadro 12).
- Bruto (veil_form2): mismo patrón; shoot/summon/charge son copias de 2
  cuadros; leap 1 cuadro. Su ronda viene después de la Bestia.
- Alturas en juego: Bestia 228, Bruto 245. HP 100, fase 2 a ≤60.
- Contar los cuadros a mano al recibir cada tira — nunca presentar el conteo
  del agente del navegador como hecho.
