# Sprite pack nuevo — Jaula de cristal + Boss de 3 formas
Preparado 2026-10-20. Estilo/genética obligatoria en TODOS los prompts:
mismo arte del juego (cel-shaded suave, contornos oscuros, paleta cristal
violeta/azul del Capítulo 10), fondo TRANSPARENTE, un solo personaje por
frame, sin texto, sin bordes cortados, pies completos con margen.

Personajes (consistencia):
- Angelo: adulto joven ~30, hoodie azul royal, pantalón charcoal,
  tenis grises, pelo negro corto.
- Angely: niña, pelo negro largo, camisa crema, shorts teal, tenis rojos.

## 1. JAULA DE CRISTAL CON ANGELO ADENTRO (sprite único, la pieza clave)
Problema que resuelve: hoy Angelo es un sprite detrás de barras gruesas y
se pierde. En este arte Angelo va DIBUJADO dentro de la jaula: cara
despejada entre barras de cristal más finas y separadas al centro.

Prompt base (ChatGPT, generar como hoja de poses separadas, NO grid pegado):
"2D game sprite, side view: a hanging cage made of violet and blue crystal
bars with a diamond keyhole lock, matching a crystal palace world. Inside
stands Angelo (young adult man, royal blue hoodie, charcoal pants, gray
sneakers, short black hair), FULLY VISIBLE: his face is clear between two
widely spaced thin crystal bars in the center, hands gripping the bars.
Transparent background, cel-shaded game art, dark outlines."

Poses (una imagen por pose, mismo tamaño de jaula en todas):
1. idle: de pie agarrando las barras, mirando hacia afuera, preocupado leve.
2. grip/shake: sacudiendo las barras, expresión de esfuerzo.
3. worried: manos en la cara / mirando hacia abajo, triste.
4. cheer: puño arriba, sonriendo (cuando Angely va ganando).
5. open: LA MISMA jaula ya abierta (puerta de cristal abierta, candado
   roto) y VACÍA — para el momento de la liberación.

Entrega ideal: PNG transparente por pose, jaula de ~700px de alto.
Integración (muse): empaco como hoja 384, anims idle/grip/worry/cheer/open.

## 2. BOSS NUEVO — 3 FORMAS (una por checkpoint de fase)
Mismo esqueleto de pelea actual (160 HP, fases, oleadas). Solo cambia el
arte: la forma cambia al bajar de 66% y de 33%.

Prompt base por forma:
"2D game boss sprite, side view facing LEFT: a crystal golem sovereign,
[DESCRIPCIÓN DE FORMA]. Violet and blue living crystal, glowing core,
cel-shaded game art, dark outlines, transparent background."

- Forma 1 "Crystal Veil" (100–66%): bestia de cristal a cuatro patas /
  guardián con corona de cristal pequeña.
- Forma 2 "Shattered Veil" (66–33%): la misma criatura erguida, corona
  rota, más cristales y núcleo expuesto brillante — se nota el daño.
- Forma 3 "The Veil Sovereign" (33–0%): forma final humanoide alta,
  corona completa de cristal, capa de fragmentos flotantes.

Poses por forma (una imagen por pose):
idle (2), walk (4 pasos), attack (3: carga, golpe, recuperación),
hurt (1), dead (2: colapso). Entrega: PNG transparente por pose.
Integración (muse): empaco hojas de 384 con layout revisado frame a frame.

## 3. EFECTOS (sin arte nuevo — se programan, del GAMEFEEL_PLAYBOOK)
- Hit-stop 60–90ms en golpes fuertes y al cambiar de fase.
- Flash blanco del boss al recibir daño (ya existe) + partículas de
  cristal al cambiar de forma (fx existentes).
- Shockwave + shake de cámara en cada checkpoint de fase.
- Slow-mo breve (0.3×, 600ms) en el golpe final + explosión de cristales.
- Ice spikes del erupt: ya implementados; subirles el telegraph visual.
