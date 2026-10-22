from playwright.sync_api import sync_playwright
OUT = 'art/staging/reskin'
BASE = 'http://127.0.0.1:41811/'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 810}, has_touch=True)
    page.goto(BASE + '?level=1-1&res=1.5', wait_until='networkidle')
    page.wait_for_function("() => window.__game?.scene.getScene('Game')?.player", timeout=60000)
    page.wait_for_timeout(2500)
    # base idle reference (frame holds still)
    page.screenshot(path=f'{OUT}/shot_scale_base.png')
    for weapon, wait_ms in [('boomerang', 120), ('wand', 150)]:
        page.evaluate(f"""() => {{ const s = window.__game.scene.getScene('Game'); const p = s.player;
            p.giveWeapon('{weapon}'); s.publishWeapons();
            p.startAttack(s.time.now); p.stateUntil = s.time.now + 60000; }}""")
        page.wait_for_timeout(wait_ms)
        page.evaluate("() => { const s = window.__game.scene.getScene('Game'); s.player.sprite.anims.pause(); }")
        page.screenshot(path=f'{OUT}/shot_scale_{weapon}.png')
        page.evaluate("() => { const s = window.__game.scene.getScene('Game'); const p = s.player; p.sprite.anims.resume(); p.stateUntil = 0; }")
        page.wait_for_timeout(400)
    b.close()
print('SCALE SHOTS DONE')
