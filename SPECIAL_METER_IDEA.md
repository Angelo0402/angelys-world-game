# Special Meter — idea en diseño (NO IMPLEMENTADA)

**Fecha:** 2026-10-26 · **Autor de la idea:** Angelo · **Estado:** DISEÑO, pendiente de respuesta de ChatGPT. NO tocar el juego todavía.

## La idea (palabras de Angelo)
Un especial que se llena al matar 8 enemigos. Cuando se llena, el jugador puede hacer un
especial que haga mucho damage.

## Contexto del juego (para el diseño)
- Plataforma 2D en Phaser, Android, niveles con metas de kills (8–12 enemigos por nivel
  en muchos niveles) y de gemas.
- Armas: espada, arco, martillo, boomerang, varita, rayo, sierra.
- Bosses con barra de HP (el boss final tiene 2 segmentos de fase).
- Game feel ya implementado: hit-stop, recoil, shake, flash blanco, partículas de impacto,
  poof, mercy frames, impact frame en escala de grises, secuencia de kill (slow-mo → freeze → flash).
- HUD actual: corazones, arma, botón SWAP, botón JUMP, contador de enemigos/gemas.

## Restricciones duras
- NUNCA mostrar damage numbers flotantes (rechazado por Angelo dos veces, 2026-10-25 y 2026-10-26).
- No tocar física, controles ni cámara base — solo capas de feel y HUD.
- El especial debe ser legible sin números: brillo, sonido, animación, sacudida.

## Preguntas abiertas (para ChatGPT)
1. ¿Cómo se muestra el medidor en el HUD y cómo se telegrafía que está lleno?
2. ¿Qué hace el especial? Opciones a evaluar: burst que limpia pantalla, golpe único pesado,
   modo temporal potenciado. Pros y contras de cada una.
3. Balance: 8 kills por carga, ¿cooldown? ¿Funciona contra bosses (daño parcial, stun, nada)?
4. ¿Cómo se activa (botón nuevo, doble-tap, automático al llenarse)?
5. Bosquejo de implementación en Phaser (estado en Player/GameScene, elemento HUD, input,
   efecto) con costo de rendimiento móvil (barato/medio/caro).

## Respuesta de ChatGPT (2026-10-26, chat "Prioritize Crystal Boss Package")
Diseño recomendado, guardado sin implementar:

- **Medidor:** 8 segmentos visibles junto al HUD de arma/vida. Cada kill llena un segmento.
  Al llenarse: brillo fuerte + pulso cada ~1.2s + sonido de carga. Texto "SPECIAL READY"
  solo ~800ms, luego solo brillo.
- **Qué hace (recomendado: burst + sabor por arma):** ataque radial que golpea enemigos
  en un radio grande. Presentación por arma: espada = slash 360°, arco = lluvia de flechas,
  martillo = shockwave de suelo, boomerang = órbita gigante, varita = explosión arcana,
  rayo = pulso de energía, sierra = ciclón de sierra. Opciones descartadas como principal:
  golpe único gigante (bueno para bosses, malo si fallas) y modo potenciado 4–6s (más
  balanceo, para después).
- **Balance:** sin cooldown de tiempo — los 8 kills SON el cooldown. Al usarlo vuelve a 0.
  Sin overflow: si está lleno, los kills no acumulan. Bosses NO inmunes: el especial les
  quita una porción visible de la barra (rango interno de ajuste, nunca mostrado) y les da
  un stagger corto de 200–350ms. Contra el boss final, el daño no cruza fases: se detiene
  en el checkpoint de fase. No se puede activar en muerte, cutscene, intro de boss,
  transición de fase ni nivel completado.
- **Activación:** botón dedicado SPECIAL, siempre visible. Vacío = oscuro. Lleno = brillo
  + pulso. Un tap lo suelta. Nada de doble-tap ni automático (el jugador decide cuándo).
- **Implementación Phaser (costo barato):** estado `special { kills, maxKills 8, ready,
  active }`; evento central `enemy-killed` (los enemigos no saben del medidor); HUD con
  ~10 objetos (fondo, 8 segmentos, glow, botón); al activar, chequeo de distancia
  (radio ~280) sobre enemigos activos, sin cuerpo físico permanente; secuencia en 3
  tiempos: anticipación 80–120ms → release → recovery 150–250ms; efectos: glow del
  jugador + anillo expansivo + 12–20 partículas + flash/shake/poof existentes. Sin otro
  shader de pantalla completa.
- **Sin damage numbers en ninguna parte** (restricción respetada por ChatGPT).

**Estado: SOLO DISEÑO. Nada implementado en el juego.**
