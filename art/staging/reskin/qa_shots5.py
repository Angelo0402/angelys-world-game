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
    page.evaluate("() => { const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('sword'); s.publishWeapons(); }")
    page.wait_for_timeout(700)
    page.screenshot(path=f'{OUT}/shot_v2_sword_final.png')
    page.evaluate("() => { const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('bow'); s.publishWeapons(); }")
    page.wait_for_timeout(300)
    page.keyboard.press('j'); page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/shot_v2_bow_final.png')
    b.close()
print('FINAL SHOTS DONE')
