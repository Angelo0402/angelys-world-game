// Browser regression checks. Uses the same Playwright dependency as the existing QA scripts.
// Start Vite on 41811, then run: node tools/check_sprite_runtime.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const native = Boolean(process.env.CH11_CDP_URL);
const out = path.resolve('output/playwright/' + (native ? 'android-sprite-regression' : 'sprite-regression'));
const spriteSource = fs.readFileSync('src/assets/sprites.gen.ts', 'utf8');
const sprites = JSON.parse(spriteSource.split('export const SPRITES = ')[1].split(' as const;')[0]);
fs.mkdirSync(out, { recursive: true });
const result = { checks: [], errors: [], audioWarnings: [], fixtures: 'Level starts and boss damage are injected; dialogues are skipped. This is not an unaided playthrough.' };
let browser;
(async () => {
  browser = native ? await chromium.connectOverCDP(process.env.CH11_CDP_URL, { noDefaults: true })
    : await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
  const page = native ? browser.contexts()[0].pages()[0] : await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const screenshot = async name => {
    const file = path.join(out, name);
    if (native) {
      const adb = path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe');
      const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
      execFileSync(adb, ['-s', serial, 'shell', 'screencap', '-p', '/sdcard/angelys-sprite-qa.png'], { timeout: 20000 });
      execFileSync(adb, ['-s', serial, 'pull', '/sdcard/angelys-sprite-qa.png', file], { timeout: 20000 });
    } else await page.screenshot({ path: file });
  };
  page.on('pageerror', e => result.errors.push(e.message));
  page.on('console', m => {
    const text = m.text();
    if (text.includes('[assets] failed') && text.includes('assets/audio/')) result.audioWarnings.push(text);
    else if (m.type() === 'error' || /Frame .*not found|Missing animation|\[assets\] failed/.test(text)) result.errors.push(text);
  });
  await page.goto((native ? 'https://localhost/' : 'http://127.0.0.1:41811/') + '?level=1-1');
  await page.waitForFunction(() => window.__game?.scene.getScene('Game')?.player, null, { timeout: 60000 });

  const atlas = await page.evaluate(SPRITES => {
    const game = window.__game, issues = [];
    let animations = 0, frames = 0;
    for (const [key, meta] of Object.entries(SPRITES)) {
      const texture = game.textures.get(key), source = texture.source[0];
      if (source.width > 4096 || source.height > 4096) issues.push(key + ': oversize');
      for (const [name, a] of Object.entries(meta.anims)) {
        const clip = game.anims.get(key + ':' + name);
        if (!clip || clip.frames.length !== a.end - a.start + 1) issues.push(key + ':' + name);
        for (let n = a.start; n <= a.end; n++) {
          if (!texture.has(n)) issues.push(key + ': missing ' + n);
          else {
            const frame = texture.get(n);
            if (frame.cutWidth !== meta.frameWidth || frame.cutHeight !== meta.frameHeight) issues.push(key + ': cut size ' + n);
          }
          frames++;
        }
        animations++;
      }
    }
    return { sheets: Object.keys(SPRITES).length, animations, frames, issues };
  }, sprites);
  assert.deepEqual(atlas.issues, []);
  result.checks.push(atlas);

  const levels = [...fs.readFileSync('src/config.ts', 'utf8').matchAll(/\{ chapter: (\d+), stage: (\d+), name:/g)]
    .map((m, index) => ({ index, name: `${m[1]}-${m[2]}` }));
  for (const level of levels) {
    await page.evaluate(index => {
      const game = window.__game;
      game.scene.stop('Hud'); game.scene.stop('Game'); game.scene.start('Game', { level: index });
    }, level.index);
    await page.waitForFunction(index => {
      const s = window.__game.scene.getScene('Game');
      return s.scene.isActive() && s.info.index === index && s.player?.sprite?.active;
    }, level.index);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      return { frame: s.player.sprite.frame.name, valid: s.player.sprite.texture.key !== '__MISSING' && Number.isFinite(s.player.sprite.scaleX) };
    });
    assert(state.valid, level.name + ' invalid player sprite');
    result.checks.push('Loaded ' + level.name);
  }
  console.log('All ' + levels.length + ' level starts passed');

  // Exercise normal and hammer hits: damage still applies, no text is spawned.
  await page.evaluate(() => { const g = window.__game; g.scene.stop('Hud'); g.scene.stop('Game'); g.scene.start('Game', { level: 0 }); });
  await page.waitForTimeout(500);
  const damage = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const textCount = () => s.children.list.filter(o => o.type === 'Text').length;
    s.spawnEnemy('golem', s.player.x + 140, s.player.body.bottom - 40);
    const e = s.enemies[s.enemies.length - 1], before = textCount(), hp = e.hp;
    e.takeDamage(1, 'sword', s.player.x);
    e.takeDamage(1, 'hammer', s.player.x);
    s.onBossHp(20, 26, 1);
    return { removed: hp - e.hp, addedText: textCount() - before, helperRemoved: typeof s.damageNumber === 'undefined' };
  });
  assert.equal(damage.removed, 2); assert.equal(damage.addedText, 0); assert(damage.helperRemoved);
  result.checks.push({ damage });

  // Defeat Umbra and finish the real post-boss sequence, including the blue portal.
  await page.evaluate(() => { const g = window.__game; g.scene.stop('Hud'); g.scene.stop('Game'); g.scene.start('Game', { level: 9 }); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.player.body.reset(s.level.arena.x0 + 180, 450); });
  await page.waitForFunction(() => window.__game.scene.getScene('Hud').dialogue.active, null, { timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return s.boss?.alive && !s.cutscene; });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.boss.takeDamage(999, 'sword', s.player.x); });
  let seen = false, completed = false;
  for (let i = 0; i < 260; i++) {
    const state = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      return { dialog: window.__game.scene.getScene('Hud').dialogue.active, cutscene: s.cutscene, open: s.portal.isOpen,
        gate: s.children.list.some(o => o.texture?.key === 'final_portal' && o.alpha > .8), scale: s.time.timeScale };
    });
    if (state.dialog) await page.keyboard.press('Escape');
    if (state.gate && !seen) { seen = true; await screenshot('chapter5-blue-portal.png'); }
    if (seen && state.open && !state.cutscene) { assert.equal(state.scale, 1); completed = true; break; }
    await page.waitForTimeout(250);
  }
  assert(completed, '5-2 post-boss scene did not finish');
  await screenshot('chapter5-exit-open.png');
  result.checks.push('5-2: boss defeated, blue portal opened/closed, cutscene completed, normal speed and exit restored');
  // Verify that entering the exit actually reaches Chapter 6.
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.player.body.reset(s.portal.cx, s.portal.baseY - s.player.body.halfHeight); });
  await page.waitForFunction(() => window.__game.scene.isActive('Splash'), null, { timeout: 10000 });
  result.checks.push('5-2 exit transitions to next-level Splash');
  assert.deepEqual(result.errors, []);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(async e => {
  result.errors.push(e.stack); fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.error(e); await browser?.close(); process.exitCode = 1;
});
