# PAQUETE COMPLETO PARA CHATGPT — SPRITES NUEVOS DE ANGELY'S WORLD
## Misión: recrear las hojas de sprites con los diseños nuevos, SIN cambiar
## tamaños, retículas ni animaciones. Las hojas deben entrar al juego tal cual.

---

# 1. LOS DISEÑOS (usa las fotos/hojas de identidad adjuntas como referencia)

## ANGELY — DISEÑO NUEVO (cambia)
Niña LATINA de ~7 años, piel morena clara, **pelo marrón oscuro RIZO y con
volumen, largo hasta la cintura, con su LAZO ROSA GRANDE** arriba (su firma).
Pecas en la nariz. Aretes dorados pequeños. Cara y pelo EXACTOS a su hoja de
identidad aprobada (media-generation-angely-identity-sheet-v2) y a sus fotos
reales adjuntas.
Ropa del juego: **camisa crema con dos corazones (uno marrón, uno rosa) al
frente**, shorts teal, tenis rojos.
- En `angely_swim`: el mismo personaje con traje de baño (mantener pelo rizo
  y lazo).
- En `angely_finale` y `angely_finale_back`: mismo diseño nuevo; la de
  espalda se ve por detrás (el lazo y el rizo se ven desde atrás).

## ANGELO — DISEÑO FIJO (de su hoja de identidad aprobada v2)
Hombre LATINO joven, piel morena clara, **pelo negro corto tipo buzz con
fade y línea marcada**, cejas fuertes, **AFEITADO COMPLETO (sin barba, sin
bigote, sin parche)**, arete pequeño, **cadena con medallón**, **tatuaje de
LABIOS ROJOS en el cuello**, hoodie azul royal con cuello sherpa crema,
pantalón charcoal, tenis grises.

## BOSSES Y ENEMIGOS — DISEÑO SIN CAMBIOS
Se recrean con el MISMO diseño que ya tienen (usa las hojas actuales como
referencia visual), solo se redibujan limpios en la misma retícula.
Umbra: hechicera joven, piel lavanda pálida, pelo violeta oscuro larguísimo,
corona alta de cristal violeta (SIN sombrero), túnica violeta con estrellas,
staff con orbe. Sovereign (sovereign2): reina de cristal violeta, corona de
picos, núcleo rosa brillante en el pecho. Crystal Veil (crystalveil +
veil_form2): bestia de cristal y su forma rota con corona y núcleo rosa.
Coloso: gólem de piedra gigante agrietado. Los demás: su diseño actual.

---

# 2. REGLAS DE PRODUCCIÓN (obligatorias, sin excepciones)

1. **UNA hoja por archivo**, con el nombre EXACTO indicado (ej. `angely.png`).
2. **Fondo TRANSPARENTE** en todas las hojas. Nunca negro, nunca blanco.
3. **Tamaño de hoja y de frame EXACTOS** como dice cada ficha. La retícula
   (columnas x filas) no cambia. Los frames van en orden, de izquierda a
   derecha y de arriba a abajo, empezando en el frame 0.
4. **El personaje mira hacia la DERECHA** en todas las hojas de acción
   (correr, atacar, saltar). Izquierda solo si la ficha lo dice.
5. **Ningún frame se corta**: el personaje entero cabe en su celda, con
   margen. Nada de partes fuera de la celda ni pegadas al borde.
6. **Consistencia total**: misma cara, mismo pelo, misma ropa en TODOS los
   frames de TODAS las hojas del personaje. Si un frame se ve como otra
   persona, se rehace ese frame.
7. **Sin texto, sin etiquetas, sin números, sin marcas de agua** dentro de
   la hoja.
8. **Ninguna dimensión puede pasar de 4096px** (regla dura del juego).
9. Entrega en **PNG con transparencia**, sin comprimir con pérdida.
10. Cada animación respeta su rango de frames y su conteo EXACTO: si dice
    "run: frames 5-12 (8 frames)", son 8 dibujos distintos y progresivos
    de ese movimiento, ni uno más ni uno menos.

---

# 3. FICHAS COMPLETAS (extraídas del código del juego — la verdad oficial)

## A. ANGELY (jugadora — TODAS sus hojas)

### `angely` — hoja 4069x1052px · frame 313x263px · retícula 13 columnas x 4 filas = 52 frames · origen (0.5781, 0.9848)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈243px
- **walk**: frames 4–9 (6 frames) · 9 fps · loop · altura en juego ≈239px
- **run**: frames 10–17 (8 frames) · 14 fps · loop · altura en juego ≈228px
- **start**: frames 18–20 (3 frames) · 18 fps · una vez · altura en juego ≈248px
- **stop**: frames 21–23 (3 frames) · 14 fps · una vez · altura en juego ≈243px
- **jump**: frames 24–27 (4 frames) · 20 fps · una vez · altura en juego ≈232px
- **air**: frames 28–28 (1 frames) · 1 fps · loop · altura en juego ≈220px
- **fall**: frames 29–30 (2 frames) · 6 fps · loop · altura en juego ≈246px
- **land**: frames 31–31 (1 frames) · 1 fps · una vez · altura en juego ≈208px
- **hurt**: frames 32–33 (2 frames) · 10 fps · una vez · altura en juego ≈204px
- **celebrate**: frames 34–37 (4 frames) · 7 fps · loop · altura en juego ≈222px
- **defeat**: frames 38–40 (3 frames) · 5 fps · una vez · altura en juego ≈180px
- **push**: frames 41–46 (6 frames) · 9 fps · loop · altura en juego ≈220px

### `angely_sword` — hoja 3970x975px · frame 397x325px · retícula 10 columnas x 3 filas = 30 frames · origen (0.4558, 0.9877)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈206px
- **slash**: frames 4–8 (5 frames) · 18 fps · una vez · altura en juego ≈198px
- **jump_attack**: frames 9–12 (4 frames) · 14 fps · una vez · altura en juego ≈212px
- **pickup**: frames 13–15 (3 frames) · 4 fps · una vez · altura en juego ≈262px
- **hurt**: frames 16–17 (2 frames) · 8 fps · una vez · altura en juego ≈219px
- **defeat**: frames 18–20 (3 frames) · 5 fps · una vez · altura en juego ≈180px

### `angely_bow` — hoja 1120x222px · frame 224x222px · retícula 5 columnas x 1 filas = 5 frames · origen (0.3886, 0.982)
- **shoot**: frames 0–4 (5 frames) · 18 fps · una vez · altura en juego ≈210px

### `angely_hammer` — hoja 1205x285px · frame 241x285px · retícula 5 columnas x 1 filas = 5 frames · origen (0.6999, 0.986)
- **smash**: frames 0–4 (5 frames) · 12 fps · una vez · altura en juego ≈267px

### `angely_boomerang` — hoja 1100x224px · frame 220x224px · retícula 5 columnas x 1 filas = 5 frames · origen (0.5699, 0.9821)
- **throw**: frames 0–4 (5 frames) · 18 fps · una vez · altura en juego ≈212px

### `angely_wand` — hoja 1245x293px · frame 249x293px · retícula 5 columnas x 1 filas = 5 frames · origen (0.3564, 0.9863)
- **cast**: frames 0–4 (5 frames) · 16 fps · una vez · altura en juego ≈218px

### `angely_ray` — hoja 1458x251px · frame 243x251px · retícula 6 columnas x 1 filas = 6 frames · origen (0.475, 0.9841)
- **shoot**: frames 0–5 (6 frames) · 16 fps · una vez · altura en juego ≈235px

### `angely_swim` — hoja 3800x287px · frame 190x287px · retícula 20 columnas x 1 filas = 20 frames · origen (0.5, 0.5)
- **swim**: frames 0–7 (8 frames) · 12 fps · loop · altura en juego ≈180px
- **float**: frames 8–13 (6 frames) · 7 fps · loop · altura en juego ≈236px
- **up**: frames 14–17 (4 frames) · 14 fps · una vez · altura en juego ≈245px
- **hurt**: frames 18–19 (2 frames) · 10 fps · una vez · altura en juego ≈238px

### `angely_finale` — hoja 2048x1024px · frame 256x256px · retícula 8 columnas x 4 filas = 32 frames · origen (0.5, 0.80078125)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈115px
- **walk**: frames 4–11 (8 frames) · 10 fps · loop · altura en juego ≈109px
- **talk**: frames 12–15 (4 frames) · 6 fps · loop · altura en juego ≈101px
- **run**: frames 16–23 (8 frames) · 12 fps · loop · altura en juego ≈113px
- **reach**: frames 24–27 (4 frames) · 5 fps · loop · altura en juego ≈118px
- **happy**: frames 28–31 (4 frames) · 5 fps · loop · altura en juego ≈109px

### `angely_finale_back` — hoja 2048x256px · frame 256x256px · retícula 8 columnas x 1 filas = 8 frames · origen (0.5, 0.80078125)
- **walk**: frames 0–7 (8 frames) · 10 fps · loop · altura en juego ≈100px


## B. ANGELO

### `angelo` — hoja 3852x1004px · frame 321x251px · retícula 12 columnas x 4 filas = 48 frames · origen (0.313, 0.9841)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈231px
- **run**: frames 4–11 (8 frames) · 14 fps · loop · altura en juego ≈211px
- **talk**: frames 12–15 (4 frames) · 7 fps · loop · altura en juego ≈233px
- **wave**: frames 16–19 (4 frames) · 7 fps · loop · altura en juego ≈237px
- **arms**: frames 20–21 (2 frames) · 2 fps · loop · altura en juego ≈238px
- **welcome**: frames 22–23 (2 frames) · 5 fps · una vez · altura en juego ≈238px
- **stance**: frames 24–24 (1 frames) · 1 fps · loop · altura en juego ≈208px
- **crouch**: frames 25–25 (1 frames) · 1 fps · loop · altura en juego ≈189px
- **leap**: frames 26–26 (1 frames) · 1 fps · loop · altura en juego ≈229px
- **kick**: frames 27–28 (2 frames) · 12 fps · una vez · altura en juego ≈202px
- **drop**: frames 29–29 (1 frames) · 1 fps · loop · altura en juego ≈152px
- **punch**: frames 30–32 (3 frames) · 12 fps · una vez · altura en juego ≈209px
- **uppercut**: frames 33–34 (2 frames) · 10 fps · una vez · altura en juego ≈205px
- **land**: frames 35–35 (1 frames) · 1 fps · loop · altura en juego ≈173px
- **walk**: frames 36–43 (8 frames) · 8 fps · loop · altura en juego ≈220px

### `angelo_hug` — hoja 1533x252px · frame 219x252px · retícula 7 columnas x 1 filas = 7 frames · origen (0.5, 0.9841)
- **open**: frames 0–0 (1 frames) · 1 fps · loop · altura en juego ≈238px
- **kneel**: frames 1–1 (1 frames) · 1 fps · loop · altura en juego ≈212px
- **hug**: frames 2–5 (4 frames) · 3 fps · loop · altura en juego ≈230px
- **pat**: frames 6–6 (1 frames) · 1 fps · loop · altura en juego ≈244px

### `angelo_finale` — hoja 2048x1024px · frame 256x256px · retícula 8 columnas x 4 filas = 32 frames · origen (0.5, 0.80078125)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈145px
- **walk**: frames 4–11 (8 frames) · 10 fps · loop · altura en juego ≈140px
- **talk**: frames 12–15 (4 frames) · 6 fps · loop · altura en juego ≈139px
- **kneel**: frames 16–19 (4 frames) · 6 fps · una vez · altura en juego ≈126px
- **reach**: frames 20–23 (4 frames) · 5 fps · loop · altura en juego ≈141px
- **smile**: frames 24–27 (4 frames) · 4 fps · loop · altura en juego ≈144px
- **wave**: frames 28–31 (4 frames) · 6 fps · loop · altura en juego ≈143px

### `angelo_finale_back` — hoja 2048x256px · frame 256x256px · retícula 8 columnas x 1 filas = 8 frames · origen (0.5, 0.80078125)
- **walk**: frames 0–7 (8 frames) · 10 fps · loop · altura en juego ≈141px

### `angelo_cage` — hoja 3749x179px · frame 163x179px · retícula 23 columnas x 1 filas = 23 frames · origen (0.4601, 0.9777)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈173px
- **grip**: frames 4–8 (5 frames) · 8 fps · loop · altura en juego ≈169px
- **shake**: frames 9–13 (5 frames) · 10 fps · loop · altura en juego ≈169px
- **worry**: frames 14–20 (7 frames) · 7 fps · loop · altura en juego ≈156px
- **cheer**: frames 21–22 (2 frames) · 6 fps · loop · altura en juego ≈149px

### `final_pair_reunion` — hoja 3072x384px · frame 384x384px · retícula 8 columnas x 1 filas = 8 frames · origen (0.5, 0.7994791666666666)
- **approach**: frames 0–3 (4 frames) · 6 fps · una vez · altura en juego ≈88px
- **hug**: frames 4–6 (3 frames) · 4 fps · loop · altura en juego ≈94px
- **pat**: frames 7–7 (1 frames) · 1 fps · una vez · altura en juego ≈94px

### `final_pair_side` — hoja 3072x384px · frame 384x384px · retícula 8 columnas x 1 filas = 8 frames · origen (0.5, 0.7994791666666666)
- **walk**: frames 0–7 (8 frames) · 10 fps · loop · altura en juego ≈209px

### `final_pair_back` — hoja 3072x384px · frame 384x384px · retícula 8 columnas x 1 filas = 8 frames · origen (0.5, 0.7994791666666666)
- **walk**: frames 0–7 (8 frames) · 10 fps · loop · altura en juego ≈202px


## C. BOSSES

### `umbra` — hoja 2980x640px · frame 298x320px · retícula 10 columnas x 2 filas = 20 frames · origen (0.5, 0.5)
- **idle**: frames 0–5 (6 frames) · 6 fps · loop · altura en juego ≈309px
- **cast**: frames 6–10 (5 frames) · 10 fps · una vez · altura en juego ≈288px
- **hurt**: frames 11–12 (2 frames) · 8 fps · una vez · altura en juego ≈250px
- **dead**: frames 13–16 (4 frames) · 8 fps · una vez · altura en juego ≈250px
- **taunt**: frames 17–19 (3 frames) · 6 fps · loop · altura en juego ≈309px

### `colossus` — hoja 2952x285px · frame 328x285px · retícula 9 columnas x 1 filas = 9 frames · origen (0.5854, 0.986)
- **idle**: frames 0–1 (2 frames) · 2 fps · loop · altura en juego ≈268px
- **roar**: frames 2–2 (1 frames) · 1 fps · loop · altura en juego ≈277px
- **smash**: frames 3–3 (1 frames) · 1 fps · loop · altura en juego ≈249px
- **hurt**: frames 4–5 (2 frames) · 6 fps · una vez · altura en juego ≈260px
- **fall**: frames 6–8 (3 frames) · 4 fps · una vez · altura en juego ≈192px

### `crystalveil` — hoja 3072x2304px · frame 384x384px · retícula 8 columnas x 6 filas = 48 frames · origen (0.5, 0.7994791666666666)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈168px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈171px
- **claw**: frames 8–11 (4 frames) · 8 fps · una vez · altura en juego ≈159px
- **slam**: frames 12–15 (4 frames) · 8 fps · una vez · altura en juego ≈155px
- **shoot**: frames 16–19 (4 frames) · 8 fps · una vez · altura en juego ≈165px
- **summon**: frames 20–23 (4 frames) · 8 fps · una vez · altura en juego ≈164px
- **charge**: frames 24–27 (4 frames) · 8 fps · una vez · altura en juego ≈154px
- **erupt**: frames 28–31 (4 frames) · 8 fps · una vez · altura en juego ≈173px
- **hurt**: frames 32–35 (4 frames) · 12 fps · una vez · altura en juego ≈171px
- **stagger**: frames 36–39 (4 frames) · 6 fps · una vez · altura en juego ≈165px
- **enrage**: frames 40–43 (4 frames) · 8 fps · loop · altura en juego ≈173px
- **dead**: frames 44–47 (4 frames) · 5 fps · una vez · altura en juego ≈152px

### `veil_form2` — hoja 1760x1408px · frame 352x352px · retícula 5 columnas x 4 filas = 20 frames · origen (0.5, 0.977)
- **idle**: frames 0–4 (5 frames) · None fps · loop · altura en juego ≈326px
- **walk**: frames 5–9 (5 frames) · None fps · loop · altura en juego ≈326px
- **claw**: frames 10–12 (3 frames) · None fps · una vez · altura en juego ≈326px
- **slam**: frames 12–14 (3 frames) · None fps · una vez · altura en juego ≈326px
- **shoot**: frames 10–11 (2 frames) · None fps · una vez · altura en juego ≈326px
- **summon**: frames 13–14 (2 frames) · None fps · una vez · altura en juego ≈326px
- **charge**: frames 10–11 (2 frames) · None fps · una vez · altura en juego ≈326px
- **erupt**: frames 11–13 (3 frames) · None fps · una vez · altura en juego ≈326px
- **hurt**: frames 15–15 (1 frames) · None fps · una vez · altura en juego ≈326px
- **stagger**: frames 15–15 (1 frames) · None fps · una vez · altura en juego ≈326px
- **enrage**: frames 10–11 (2 frames) · None fps · loop · altura en juego ≈326px
- **dead**: frames 16–19 (4 frames) · None fps · una vez · altura en juego ≈326px

### `sovereign2` — hoja 1792x1344px · frame 224x224px · retícula 8 columnas x 6 filas = 48 frames · origen (0.48, 0.995)
- **idle**: frames 0–3 (4 frames) · None fps · loop · altura en juego ≈200px
- **walk**: frames 4–7 (4 frames) · None fps · loop · altura en juego ≈200px
- **claw**: frames 8–11 (4 frames) · None fps · una vez · altura en juego ≈200px
- **slam**: frames 12–15 (4 frames) · None fps · una vez · altura en juego ≈200px
- **shoot**: frames 16–19 (4 frames) · None fps · una vez · altura en juego ≈200px
- **summon**: frames 20–23 (4 frames) · None fps · una vez · altura en juego ≈200px
- **charge**: frames 24–27 (4 frames) · None fps · una vez · altura en juego ≈200px
- **erupt**: frames 28–31 (4 frames) · None fps · una vez · altura en juego ≈200px
- **hurt**: frames 32–35 (4 frames) · None fps · una vez · altura en juego ≈200px
- **stagger**: frames 36–39 (4 frames) · None fps · una vez · altura en juego ≈200px
- **enrage**: frames 40–43 (4 frames) · None fps · loop · altura en juego ≈200px
- **dead**: frames 44–47 (4 frames) · None fps · una vez · altura en juego ≈200px
- **attack**: frames 8–11 (4 frames) · None fps · una vez · altura en juego ≈200px

### `sovereign` — hoja 4082x500px · frame 314x250px · retícula 13 columnas x 2 filas = 26 frames · origen (0.5, 0.984)
- **idle**: frames 0–4 (5 frames) · 8 fps · loop · altura en juego ≈240px
- **walk**: frames 5–9 (5 frames) · 10 fps · loop · altura en juego ≈218px
- **attack**: frames 10–14 (5 frames) · 14 fps · una vez · altura en juego ≈203px
- **hurt**: frames 15–15 (1 frames) · 10 fps · una vez · altura en juego ≈230px
- **dead**: frames 16–19 (4 frames) · 8 fps · una vez · altura en juego ≈230px

### `sentinel` — hoja 2560x2560px · frame 256x256px · retícula 10 columnas x 10 filas = 100 frames · origen (0.5, 0.98)
- **idle**: frames 0–24 (25 frames) · 8 fps · loop · altura en juego ≈200px
- **walk**: frames 25–49 (25 frames) · 10 fps · loop · altura en juego ≈200px
- **attack**: frames 50–74 (25 frames) · 12 fps · una vez · altura en juego ≈200px
- **hurt**: frames 75–82 (8 frames) · 10 fps · una vez · altura en juego ≈200px
- **dead**: frames 83–99 (17 frames) · 8 fps · una vez · altura en juego ≈200px

### `sandworm` — hoja 3410x295px · frame 341x295px · retícula 10 columnas x 1 filas = 10 frames · origen (0.588, 0.9864)
- **rise**: frames 0–3 (4 frames) · 8 fps · una vez · altura en juego ≈271px
- **idle**: frames 4–4 (1 frames) · 1 fps · loop · altura en juego ≈284px
- **spit**: frames 5–6 (2 frames) · 10 fps · una vez · altura en juego ≈192px
- **hurt**: frames 7–7 (1 frames) · 8 fps · una vez · altura en juego ≈221px
- **dive**: frames 8–9 (2 frames) · 8 fps · una vez · altura en juego ≈208px

### `toxic` — hoja 2880x219px · frame 240x219px · retícula 12 columnas x 1 filas = 12 frames · origen (0.3708, 0.9817)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈188px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈188px
- **attack**: frames 8–9 (2 frames) · 10 fps · una vez · altura en juego ≈185px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈166px
- **dead**: frames 11–11 (1 frames) · 6 fps · una vez · altura en juego ≈156px

### `stormgolem` — hoja 2048x512px · frame 256x256px · retícula 8 columnas x 2 filas = 16 frames · origen (0.5, 0.80078125)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈109px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈112px
- **attack**: frames 8–11 (4 frames) · 10 fps · una vez · altura en juego ≈112px
- **hurt**: frames 12–13 (2 frames) · 10 fps · una vez · altura en juego ≈114px
- **dead**: frames 14–15 (2 frames) · 5 fps · una vez · altura en juego ≈79px

### `magmagolem` — hoja 3666x313px · frame 282x313px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5176, 0.9872)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈260px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈260px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈296px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈260px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈183px

### `galaxmaw` — hoja 2048x512px · frame 256x256px · retícula 8 columnas x 2 filas = 16 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈106px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈100px
- **attack**: frames 8–11 (4 frames) · 10 fps · una vez · altura en juego ≈99px
- **hurt**: frames 12–13 (2 frames) · 10 fps · una vez · altura en juego ≈95px
- **dead**: frames 14–15 (2 frames) · 5 fps · una vez · altura en juego ≈85px

### `shardknight` — hoja 2048x512px · frame 256x256px · retícula 8 columnas x 2 filas = 16 frames · origen (0.5, 0.80078125)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈92px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈91px
- **attack**: frames 8–11 (4 frames) · 10 fps · una vez · altura en juego ≈83px
- **hurt**: frames 12–13 (2 frames) · 10 fps · una vez · altura en juego ≈75px
- **dead**: frames 14–15 (2 frames) · 5 fps · una vez · altura en juego ≈62px

### `yeti` — hoja 3926x267px · frame 302x267px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4638, 0.985)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈254px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈254px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈252px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈218px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈192px

### `golem` — hoja 3341x294px · frame 257x294px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4995, 0.9864)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈241px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈241px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈283px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈218px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈175px


## D. ENEMIGOS

### `mushroom` — hoja 2223x182px · frame 171x182px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4766, 0.978)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈171px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈171px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈168px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈116px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈90px

### `beetle` — hoja 2132x163px · frame 164x163px · retícula 13 columnas x 1 filas = 13 frames · origen (0.493, 0.9755)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈153px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈153px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈130px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈140px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈109px

### `leafimp` — hoja 3380x208px · frame 260x208px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4397, 0.9808)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈196px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈196px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈185px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈181px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈145px

### `firefly` — hoja 1963x154px · frame 151x154px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈141px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈141px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈125px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈127px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈95px

### `ghost` — hoja 2613x203px · frame 201x203px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈191px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈191px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈180px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈177px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈151px

### `lantern` — hoja 2444x204px · frame 188x204px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈195px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈195px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈192px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈179px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈159px

### `skeleton` — hoja 3107x247px · frame 239x247px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5091, 0.9838)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈221px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈221px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈222px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈208px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈182px

### `firebat` — hoja 2951x164px · frame 227x164px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈149px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈149px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈127px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈149px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈137px

### `lavablob` — hoja 2665x162px · frame 205x162px · retícula 13 columnas x 1 filas = 13 frames · origen (0.3877, 0.9753)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈131px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈131px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈145px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈73px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈61px

### `crab` — hoja 2977x180px · frame 229x180px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4235, 0.9778)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈163px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈163px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈160px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈148px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈136px

### `cogmoth` — hoja 3016x176px · frame 232x176px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈157px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈157px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈103px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈144px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈112px

### `gearcrab` — hoja 3575x178px · frame 275x178px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4276, 0.9775)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈170px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈170px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈167px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈170px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈135px

### `sandwisp` — hoja 3627x190px · frame 279x190px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈161px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈161px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈173px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈167px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈127px

### `blob` — hoja 3146x234px · frame 242x234px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.9829)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈172px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈172px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈185px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈173px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈159px

### `squish` — hoja 2977x246px · frame 229x246px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.9837)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈192px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈192px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈229px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈184px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈151px

### `frostwolf` — hoja 3666x180px · frame 282x180px · retícula 13 columnas x 1 filas = 13 frames · origen (0.4206, 0.9778)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈169px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈169px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈147px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈169px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈132px

### `icewisp` — hoja 2080x170px · frame 160x170px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈151px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈151px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈139px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈142px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈148px

### `penguin` — hoja 2470x170px · frame 190x170px · retícula 13 columnas x 1 filas = 13 frames · origen (0.5379, 0.9765)
- **idle**: frames 0–3 (4 frames) · 5 fps · loop · altura en juego ≈161px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈161px
- **attack**: frames 8–9 (2 frames) · 7 fps · una vez · altura en juego ≈154px
- **hurt**: frames 10–10 (1 frames) · 8 fps · una vez · altura en juego ≈151px
- **dead**: frames 11–12 (2 frames) · 6 fps · una vez · altura en juego ≈119px

### `thunderimp` — hoja 4077x326px · frame 151x163px · retícula 27 columnas x 2 filas = 54 frames · origen (0.5, 0.5)
- **idle**: frames 0–9 (10 frames) · 10 fps · loop · altura en juego ≈99px
- **walk**: frames 10–19 (10 frames) · 14 fps · loop · altura en juego ≈99px
- **attack**: frames 20–29 (10 frames) · 16 fps · una vez · altura en juego ≈121px
- **hurt**: frames 30–33 (4 frames) · 12 fps · una vez · altura en juego ≈112px
- **dead**: frames 34–39 (6 frames) · 10 fps · una vez · altura en juego ≈123px

### `stormbird` — hoja 4060x364px · frame 145x182px · retícula 28 columnas x 2 filas = 56 frames · origen (0.5, 0.5)
- **idle**: frames 0–9 (10 frames) · 10 fps · loop · altura en juego ≈129px
- **walk**: frames 10–19 (10 frames) · 14 fps · loop · altura en juego ≈129px
- **attack**: frames 20–29 (10 frames) · 16 fps · una vez · altura en juego ≈133px
- **hurt**: frames 30–33 (4 frames) · 12 fps · una vez · altura en juego ≈124px
- **dead**: frames 34–39 (6 frames) · 10 fps · una vez · altura en juego ≈145px

### `jellyfish` — hoja 4004x374px · frame 143x187px · retícula 28 columnas x 2 filas = 56 frames · origen (0.5, 0.5)
- **idle**: frames 0–9 (10 frames) · 10 fps · loop · altura en juego ≈150px
- **walk**: frames 10–19 (10 frames) · 14 fps · loop · altura en juego ≈150px
- **attack**: frames 20–29 (10 frames) · 16 fps · una vez · altura en juego ≈152px
- **hurt**: frames 30–33 (4 frames) · 12 fps · una vez · altura en juego ≈161px
- **dead**: frames 34–39 (6 frames) · 10 fps · una vez · altura en juego ≈165px

### `anglerfish` — hoja 4032x310px · frame 126x155px · retícula 32 columnas x 2 filas = 64 frames · origen (0.5, 0.5)
- **idle**: frames 0–9 (10 frames) · 10 fps · loop · altura en juego ≈107px
- **walk**: frames 10–19 (10 frames) · 14 fps · loop · altura en juego ≈107px
- **attack**: frames 20–29 (10 frames) · 16 fps · una vez · altura en juego ≈110px
- **hurt**: frames 30–33 (4 frames) · 12 fps · una vez · altura en juego ≈133px
- **dead**: frames 34–39 (6 frames) · 10 fps · una vez · altura en juego ≈123px

### `voidwraith` — hoja 2048x512px · frame 256x256px · retícula 8 columnas x 2 filas = 16 frames · origen (0.5, 0.5)
- **idle**: frames 0–3 (4 frames) · 6 fps · loop · altura en juego ≈120px
- **walk**: frames 4–7 (4 frames) · 8 fps · loop · altura en juego ≈112px
- **attack**: frames 8–11 (4 frames) · 10 fps · una vez · altura en juego ≈105px
- **hurt**: frames 12–13 (2 frames) · 10 fps · una vez · altura en juego ≈108px
- **dead**: frames 14–15 (2 frames) · 5 fps · una vez · altura en juego ≈106px

---

# 4. ORDEN DE TRABAJO SUGERIDO
1. `angely` (la hoja principal) — aprobar esta primero antes de seguir.
2. Variantes de Angely (sword/bow/hammer/boomerang/wand/ray/swim/finale).
3. `angelo` + hug + finale.
4. Bosses: umbra, colossus, crystalveil, veil_form2, sovereign2.
5. Enemigos por capítulo.

# 5. AL ENTREGAR CADA HOJA
- Nombre de archivo exacto + PNG transparente.
- Confirma: dimensiones de la hoja, tamaño de frame y conteo total.
- Muse integra, corta y verifica frame por frame contra esta ficha.
