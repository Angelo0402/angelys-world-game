from playwright.sync_api import sync_playwright
OUT = 'art/staging/reskin'
BASE = 'http://127.0.0.1:41811/'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 810}, has_touch=True)
    page.goto(BASE + '?level=1-1&res=1.5', wait_until='networkidle')
    page.wait_for_function("() => window.__game?.scene.getScene('Game')?.player", timeout=60000)
    page.wait_for_timeout(1500)
    for weapon in ['hammer', 'ray']:
        page.evaluate(f"""() => {{ const s = window.__game.scene.getScene('Game');
            s.player.giveWeapon('{weapon}'); s.publishWeapons();
            s.player.startAttack(s.time.now); }}""")
        page.wait_for_timeout(170)
        page.screenshot(path=f'{OUT}/shot_v3_{weapon}_action.png')
        page.wait_for_timeout(600)
    b.close()
print('ACTION SHOTS DONE')
