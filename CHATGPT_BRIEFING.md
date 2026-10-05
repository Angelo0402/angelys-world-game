# Briefing para ChatGPT — Angely's World

## Qué es el juego
**Angely's World** es un juego platformer 2D para Android, protagonista: Angely (niña).
9 chapters: Forest, Ruins, Volcano, Frozen, Shadow, Sky, Sea, Desert, Squishy Valley.
Estilo visual: colorido, painterly, vibrante. Personajes con outlines bold.

## Tu rol en el equipo
- **TÚ (ChatGPT)**: Creas los assets visuales (enemigos, tiles, backgrounds)
- **muse**: Integra los assets al código del juego, compila el APK
- **Angelo**: Dirige, prueba en su teléfono, aprueba

## Specs de assets (OBLIGATORIO seguir)

### Enemigos — Sprite Sheets
- **Formato**: 5 sheets separados, uno por animación (idle, walk/move, attack, hurt, dead)
- **Frames por sheet**: 20 frames cada uno = 100 frames total por enemigo
- **Fondo**: TRANSPARENTE (PNG con alpha), NO negro, NO blanco
- **Tamaño**: ~200-300px por frame, alta resolución
- **Personaje**: centrado, mirando a la DERECHA en todos los frames
- **Consistencia**: mismo tamaño de personaje en TODAS las animaciones (idle, walk, attack, hurt, dead deben verse igual de grandes)
- **Sin** texto, watermarks, ni labels
- **Preservar** los originales en alta resolución

### Tiles/Plataformas
- Piezas individuales sobre fondo TRANSPARENTE
- Separadas por espacio transparente
- Temas: forest, crystal, lava, ice, desert, ocean, sky, ruins, swamp

### Backgrounds
- **1920×1080**, JPG
- Un tema por imagen (no grid)
- Centro despejado (ahí va el gameplay)
- Sin personajes ni texto

## Enemigos que se necesitan (prioridad)
1. **Forest**: slime hostil, jabalí, mushroom corrupto
2. **Ruins**: stone golem, cursed eye, scorpion
3. **Volcano**: fire spirit, magma golem
4. **Frozen**: ice golem (ya tenemos wolf, penguin, yeti)
5. **Shadow**: dark mage, shadow bat
6. **Sky**: sky serpent

## Nombres de archivo
- Enemigos: `enemy_<nombre>_<tema>.png`
- Tiles: `<tema>_tiles.png`
- Backgrounds: `bg_<tema>.png`

## Checklist antes de entregar
- [ ] Fondo transparente (no negro, no blanco) en sprite sheets
- [ ] 20 frames por animación, 5 animaciones = 100 frames total
- [ ] Personaje mira a la derecha siempre
- [ ] Tamaño consistente entre TODAS las animaciones (idle = walk = attack = hurt = dead)
- [ ] Sin partes cortadas
- [ ] Segmentación exacta y QA visual
