from playwright.sync_api import sync_playwright
OUT = 'art/staging/reskin'
BASE = 'http://127.0.0.1:41811/'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 810}, has_touch=True)
    page.goto(BASE + '?level=1-1&res=1.5', wait_until='networkidle')
    page.wait_for_function("() => window.__game?.scene.getScene('Game')?.player", timeout=60000)
    page.wait_for_timeout(1500)
    page.mouse.click(720, 400)
    page.keyboard.down('ArrowRight'); page.wait_for_timeout(1100); page.keyboard.up('ArrowRight')
    page.wait_for_timeout(400)
    for weapon in ['hammer', 'ray']:
        page.evaluate(f"() => {{ const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('{weapon}'); s.publishWeapons(); }}")
        page.wait_for_timeout(300)
        page.keyboard.down('j')
        for k in range(5):
            page.wait_for_timeout(85)
            page.screenshot(path=f'{OUT}/shot_v3_{weapon}_{k}.png')
        page.keyboard.up('j')
        page.wait_for_timeout(700)
    b.close()
print('BURST DONE')
