# Angely's World — Plan de Expansión a 20 Chapters

## Chapters existentes (1-9)
1. The Enchanted Forest — forest
2. Moonlit Ruins — ruins
3. Volcanic Caves — volcano
4. Frozen Peaks — frozen
5. The Shadow Castle — shadow
6. The Sky Tower — sky
7. (sea)
8. (desert)
9. Squishy Valley

## Nuevos chapters (10-20)

### 10. Crystal Caves
- **Tema:** Cuevas con cristales brillantes azules/púrpuras
- **Enemigos:** crystal_spider, gem_golem (ChatGPT generando)
- **Background:** bg10 — cueva oscura con cristales luminosos
- **Pit:** pit | **Grip:** 1

### 11. Swamp of Whispers
- **Tema:** Pantano oscuro con niebla verde
- **Enemigos:** swamp_crawler, bog_witch
- **Background:** bg11 — pantano con árboles retorcidos
- **Pit:** pit (agua) | **Grip:** 0.8

### 12. Jungle Depths
- **Tema:** Jungla densa y vibrante
- **Enemigos:** jungle_panther, vine_serpent
- **Background:** bg12 — jungla con luz filtrada
- **Pit:** pit | **Grip:** 1

### 13. Storm Peaks
- **Tema:** Montañas con tormentas eléctricas
- **Enemigos:** storm_harpy, thunder_golem
- **Background:** bg13 — picos con rayos
- **Pit:** pit | **Grip:** 0.9

### 14. Haunted Graveyard
- **Tema:** Cementerio embrujado de noche
- **Enemigos:** grave_ghost, skeleton_warrior
- **Background:** bg14 — cementerio con luna llena
- **Pit:** pit | **Grip:** 1

### 15. Candy Kingdom
- **Tema:** Mundo de dulces colorido
- **Enemigos:** candy_golem, licorice_snake
- **Background:** bg15 — tierra de dulces
- **Pit:** pit (chocolate) | **Grip:** 1

### 16. Deep Ocean Trench
- **Tema:** Fosa oceánica oscura
- **Enemigos:** angler_fish, trench_crab
- **Background:** bg16 — fondo marino profundo
- **Pit:** pit (agua) | **Grip:** 0.7

### 17. Clockwork Factory
- **Tema:** Fábrica mecánica con engranajes
- **Enemigos:** gear_bot, spring_jacker
- **Background:** bg17 — fábrica con engranajes gigantes
- **Pit:** pit (aceite) | **Grip:** 1

### 18. Cosmic Void
- **Tema:** Espacio exterior con estrellas
- **Enemigos:** void_walker, star_eater
- **Background:** bg18 — espacio con nebulosas
- **Pit:** pit (vacío) | **Grip:** 0.6 (baja gravedad)

### 19. Dragon's Lair
- **Tema:** Guarida de dragón con lava
- **Enemigos:** baby_dragon, fire_knight
- **Background:** bg19 — cueva con tesoro y lava
- **Pit:** lava | **Grip:** 1

### 20. Umbra's Throne
- **Tema:** Trono final de Queen Umbra — castillo oscuro
- **Enemigos:** umbra_guard, shadow_lord + **FINAL BOSS: Queen Umbra**
- **Background:** bg20 — trono oscuro con energía púrpura
- **Pit:** pit | **Grip:** 1

## Assets necesarios por chapter
- 2 enemigos × 20 frames = 40 frames por chapter
- 1 background 1920×1080
- Total: 22 enemigos + 11 backgrounds

## Orden de generación
1. ✅ Forest slime (recibido)
2. 🔄 Crystal Spider + Gem Golem (ChatGPT generando)
3. ⏳ Resto en orden 11→20

## Estado actual (2026-10-04 ~20:45 EDT)

### Completado con assets reales de ChatGPT:
- Chapter 10 (Crystal Caves): crystal_spider ✓, gem_golem ✓, bg10 ✓
- Chapter 11 (Swamp of Whispers): swamp_crawler ✓, bog_witch ✓, bg11 ✓

### Backgrounds generados (todos):
- bg10-bg20 + splash10-splash20 ✓ (generados con media pipeline)

### Placeholders (compilan, listos para reemplazar):
- Chapter 12: jungle_tiger, vine_serpent
- Chapter 13: storm_roc, thunder_golem
- Chapter 14: ghost_knight, zombie_hound
- Chapter 15: candy_golem, licorice_witch
- Chapter 16: abyss_shark, jellyfish_queen
- Chapter 17: clockwork_soldier, gear_spider
- Chapter 18: void_walker, star_eater
- Chapter 19: baby_dragon, fire_imp
- Chapter 20: umbra_guard, shadow_lord

### Build:
- TypeScript: ✓ pasa
- Vite build: ✓ pasa
- 40 levels (2 por chapter) configurados

### Nota:
Angelo tomó control del browser (user_controlled) para manejar ChatGPT directamente.
El loop de assets continúa cuando él genere los sprites restantes.

## Mecánicas sorpresa agregadas (2026-10-04 noche)

### 1. Sistema de Combo de Kills
- Kills consecutivos dentro de 3 segundos aumentan el combo
- Cada 5 kills: banner "X KILL COMBO!" + sonido
- El combo se resetea si pasan 3 segundos sin matar
- Archivos: src/scenes/GameScene.ts (combo, comboTimer, maxCombo, updateCombo)

### 2. Enemigos ELITE (dorados)
- 5% de probabilidad al spawnear (no en bosses)
- Tint dorado (0xffd700), 2x HP
- 3x probabilidad de drops de power-ups
- Banner "ELITE ENEMY!" al aparecer
- Archivos: src/scenes/GameScene.ts (spawnEnemy), src/entities/Enemy.ts (makeElite, isElite)
