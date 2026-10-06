# Chapter 11 finale artwork

112 new source frames, generated with OpenAI's native image generation tool. Angelo keeps his royal blue hoodie, charcoal pants and gray sneakers. Angely keeps her cream shirt, teal shorts, white socks and red sneakers. Rear-view sheets show the backs of their heads and clothes.

| Runtime sheet | Cell | Frames | Animations |
| --- | --- | --- | --- |
| angelo_finale | 256 x 256 | 32 | idle, walk, talk, kneel, reach, smile, wave |
| angely_finale | 256 x 256 | 32 | idle, walk, talk, run, reach, happy |
| Each solo rear sheet | 256 x 256 | 8 | walk away |
| final_pair_reunion | 384 x 384 | 8 | approach, hug, pat |
| final_pair_side | 384 x 384 | 8 | joined walk; mirrored in the leftward staging |
| final_pair_back | 384 x 384 | 8 | joined rear-view walk into the gate |
| final_portal | 512 x 512 | 8 | open pulse, close to spark |

The selected PNGs have native transparency. Padding refinements restored complete shoes and gave the portal glow space on all sides. No color key or component deletion is used. Source grids are uneven, so `layout.json` records every reviewed rectangle and pivot. A shared scale per source aligns the two solo sheets; runtime packing never fits poses independently. All exported frames have transparent safety margins and textures stay within 4096 pixels.

Rebuild: `python tools/build_finale.py` (Pillow and NumPy). The main sprite builder invokes this automatically. Validate all Chapter 11 and finale exports with `python tools/check_chapter11.py`.

The ending uses the new idle/talk/run/reach/happy sprites, the reunion pair and both rear sheets, then joins both characters in the hand-holding rear-view walk. Their scale and Y position recede together into one blue gate. Both disappear before the close animation; the gate is destroyed before the final screen. Restarting removes the finale's actors and pending callbacks.

Runtime checks: `node tools/check_chapter11.cjs` tests the final fight, ending, menu and restart. `node tools/check_portal5.cjs` tests the same portal in 5-2. Both support `CH11_CDP_URL` and `ANDROID_HOME` for an installed Android WebView. Fixtures position Angely, refresh a shield and inject phase damage; real keyboard ray damage and an actual downward stomp are separately checked. These are not unaided playthroughs.
