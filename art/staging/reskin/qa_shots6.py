from playwright.sync_api import sync_playwright
OUT = 'art/staging/reskin'
BASE = 'http://127.0.0.1:41811/'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 810}, has_touch=True)
    page.goto(BASE + '?level=1-1&res=1.5', wait_until='networkidle')
    page.wait_for_function("() => window.__game?.scene.getScene('Game')?.player", timeout=60000)
    page.wait_for_timeout(1500)
    page.keyboard.down('ArrowRight'); page.wait_for_timeout(1100); page.keyboard.up('ArrowRight')
    page.wait_for_timeout(400)
    page.evaluate("() => { const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('hammer'); s.publishWeapons(); }")
    page.wait_for_timeout(300)
    page.keyboard.press('j'); page.wait_for_timeout(210)
    page.screenshot(path=f'{OUT}/shot_v3_hammer.png')
    page.wait_for_timeout(600)
    page.evaluate("() => { const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('ray'); s.publishWeapons(); }")
    page.wait_for_timeout(300)
    page.keyboard.press('j'); page.wait_for_timeout(190)
    page.screenshot(path=f'{OUT}/shot_v3_ray.png')
    b.close()
print('V3 SHOTS DONE')
