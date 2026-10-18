# Sprite & Asset Learnings — para Angely's World

Guardado: 2026-10-18. Propósito: referencia rápida cuando se necesiten sprites, animaciones o assets.
Dos fuentes: Ludo.ai (generación con IA) y @penusbmic (técnicas profesionales de pixel art).

---

## 1. LUDO.AI — generación de sprites con IA

**Qué es:** generador de assets para juegos con IA (ludo.ai). Legítimo, no hype.

**Capacidades clave:**
- Genera character sprites en **32 estilos de arte** (pixel 8/16/32-bit, cel-shaded, anime, hand-painted, etc.)
- **Style-reference generation** — mantiene UN estilo consistente entre todos los assets (crítico para que Angely se vea igual siempre)
- Anima sprites → sprite sheets PNG con transparencia (hasta 64 frames, 5 segundos)
- **641 motion presets** en 34 categorías (walk, run, idle, attack, hit, death...)
- 4 formas de animar: prompt de texto, keyframes dibujados (hasta 3), video de referencia, presets
- 12 tipos de assets animables: sprites, VFX, tiles, parallax layers, UI, icons, portraits, etc.
- Modelo pixel-art dedicado (Forge Pixel) que respeta la grilla de píxeles
- Exporta: spritesheet PNG, JSON metadata, GIF, frames individuales, MP4
- Soporta **Phaser** (nuestro engine), Unity, Godot, GameMaker
- **Licencia comercial incluida en todos los planes** — lo generado es tuyo
- MCP server + API + plugin de Unity

**Cuándo usarlo para Angely's World:**
- Animar un sprite rápido sin pelear con sheets manuales
- Generar variantes de enemigos en estilo consistente
- VFX (explosiones, hit effects) via presets
- NO reemplaza a ChatGPT para los assets principales hoy; es complemento para animación

**El pero:** freemium/pago. API key seria requiere plan Pro o Studio. Probar gratis primero.

---

## 2. @PENUSB MIC — técnicas pro de pixel art (Pixel Tips)

**Quién es:** pixel artist y animador profesional. Artista principal de **Dome Keeper** y **Shogun Showdown**. 169K seguidores. Se describe como "The World's Okayest Dad that Pixels".

**Qué enseña (Pixel Tips en sus reels):**
- **Straight-ahead vs pose-to-pose** — las dos escuelas de animación:
  - *Straight-ahead:* dibujar frame por frame en secuencia (más orgánico, bueno para efectos caóticos como fuego/humo)
  - *Pose-to-pose:* definir los keyframes principales primero, luego los intermedios (más controlado, mejor para personajes con timing preciso)
- **VFX complejos** — técnicas de mejora de efectos visuales en pixel art
- Trabaja en **Pixquare** (app iOS)

**Recursos comprables/usables:**
- Asset packs mensuales en itch.io: "The DARK Series", "STRANDED" (dark fantasy / sci-fi)
- Patreon con todos los tutoriales
- Bundle "Year Two - 12 Pixel Art Tutorials" (incluye archivos Aseprite)
- itch.io: penusbmic.itch.io

**Cuándo usarlo para Angely's World:**
- Referencia de calidad para juzgar nuestros sprites ("¿esto se ve pro o amateur?")
- Técnicas de animación cuando ChatGPT o Ludo generen algo que se ve "off"
- Sus asset packs como referencia de estilo o placeholders
- Si algún día contratamos/hacemos pixel art manual: sus tutoriales son el estándar

---

## 3. REGLAS VIGENTES DEL PROYECTO (no cambian)

- Sprite sheets del proyecto: 4 columnas × 5 filas = 20 frames (Idle, Movement, Attack, Hurt/Dead)
- Sheets ≤4096px por dimensión (límite GPU móvil)
- Angely: niña valiente, pelo negro largo, hoodie azul — consistencia visual obligatoria
- Orientación de personajes según spec del proyecto (típicamente mirando a la DERECHA)

---

## 4. DECISIÓN RÁPIDA: ¿qué usar cuándo?

| Necesidad | Herramienta |
|-----------|-------------|
| Asset principal de personaje (Angely, bosses) | ChatGPT (pipeline actual) |
| Animar un sprite existente rápido | Ludo.ai (presets o prompt) |
| VFX (explosión, hit, partículas) | Ludo.ai presets → o manual con técnica straight-ahead |
| Juzgar calidad / aprender técnica | @penusbmic Pixel Tips |
| Placeholder rápido con licencia limpia | Kenney (CC0) / itch.io / packs de penusbmic |
| Enemigo nuevo en estilo consistente | Ludo.ai con style-reference del juego |
