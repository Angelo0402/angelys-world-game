const { chromium } = require('playwright');
const path = require('node:path');
const out = path.resolve('art/staging/reskin');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, hasTouch: true });
  const base = 'http://127.0.0.1:41811/';
  const waitPlayer = () => page.waitForFunction(() => window.__game?.scene.getScene('Game')?.player, null, { timeout: 60000 });
  // 1-1 idle
  await page.goto(base + '?level=1-1&res=1.5', { waitUntil: 'networkidle' });
  await waitPlayer(); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'shot_11_idle.png') });
  // 1-1 run
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(out, 'shot_11_run.png') });
  await page.keyboard.up('ArrowRight');
  // 1-1 sword equipped (new angely_sword idle)
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.player.giveWeapon('sword'); s.publishWeapons(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, 'shot_11_sword.png') });
  // 5-2 area (compare with his device screenshot chapter)
  await page.goto(base + '?level=5-2&res=1.5', { waitUntil: 'networkidle' });
  await waitPlayer(); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'shot_52_spawn.png') });
  await browser.close();
  console.log('SHOTS DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
