const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const out=path.resolve('../browser-evidence');fs.mkdirSync(out,{recursive:true});
const result={checks:[],errors:[],screenshots:[]};
let runningBrowser, runningPage;
async function run(page, url, prefix) {
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('[assets] failed'))result.errors.push(m.text())});
 if(url) await page.goto(url,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__game?.scene.getScene('Game')?.player,{timeout:60000});
 const state=()=>page.evaluate(()=>{const s=window.__game.scene.getScene('Game');return {
   state:s.veilState,hp:s.boss?.hp,phase:s.boss?.phase,alive:s.player.alive,playerX:s.player.x,
   cameraX:s.cameras.main.worldView.x,cameraY:s.cameras.main.worldView.y,
   portal:s.portal.isOpen,visible:s.player.sprite.visible}});
 const shot=async name=>{
  const file=path.join(out,prefix+'-'+name+'.png');
  if(prefix==='android') {
   const adb=path.join(process.env.ANDROID_HOME,'platform-tools','adb.exe');
   const remote='/sdcard/angelys-ch11-test.png';
   execFileSync(adb,['-s','emulator-5554','shell','screencap','-p',remote],{stdio:'pipe'});
   execFileSync(adb,['-s','emulator-5554','pull',remote,file],{stdio:'pipe'});
  } else await page.screenshot({path:file});
  result.screenshots.push(file);
 };
 const activeDialogue=()=>page.waitForFunction(()=>window.__game.scene.getScene('Hud')?.dialogue?.active,{timeout:25000});
 const skip=async()=>{await activeDialogue();await page.keyboard.press('Escape')};
 if((await state()).state==='idle'){
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(()=>window.__game.scene.getScene('Game').veilState==='intro',{timeout:30000});
  await page.keyboard.up('ArrowRight');
 }
 await activeDialogue();await page.waitForTimeout(450);await shot('intro');await skip();
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').veilState==='fight',{timeout:20000});
 await page.waitForTimeout(300);
 const first=await state();assert(Math.abs(first.cameraX-1400)<2);assert(Math.abs(first.cameraY)<2);
 result.checks.push(prefix+': intro + arena framing');
 await page.waitForTimeout(2000);await shot('arena');
 await page.keyboard.press('j',{delay:100});
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.hp<28,{timeout:8000});
 result.checks.push(prefix+': actual keyboard ray damages boss');
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.grantShield();s.player.body.reset(s.boss.x-108,452);s.player.facing=1;});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss.state==='claw'&&s.time.now<s.boss.strikeFrom},{timeout:12000});
 assert.equal(await page.evaluate(()=>window.__game.scene.getScene('Game').boss.harmful),false);
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss.state==='claw'&&s.boss.harmful},{timeout:4000});
 await shot('claw-active');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.state==='recover',{timeout:4000});
 assert.equal(await page.evaluate(()=>window.__game.scene.getScene('Game').boss.vulnerable),true);
 result.checks.push(prefix+': claw telegraph harmless, strike harmful, recovery vulnerable');
 // Cancel a real attack through the public damage entry point; retain the old marks to detect ghosts.
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss.attacking&&s.time.now<s.boss.strikeFrom},{timeout:12000});
 const interrupted=await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');
 window.__oldVeilEffects=[...s.boss.effects];return s.boss.takeDamage(1,'sword',s.player.x)});
 assert(interrupted);await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>window.__oldVeilEffects.every(x=>!x.active)),true);
 result.checks.push(prefix+': interrupted attack removes previous markers/timers');
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.grantShield();s.player.body.reset(1620,452);s.player.facing=1;s.boss.takeDamage(11,'sword',s.player.x)});
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.phase===2,{timeout:5000});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss.state==='erupt'&&s.time.now<s.boss.strikeFrom},{timeout:15000});
 await shot('phase2-warning');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').hazards.getLength()>0,{timeout:5000});
 await shot('phase2-spikes');result.checks.push(prefix+': phase2 crystals visibly warned then activated');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.state==='recover',{timeout:5000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.grantShield();s.boss.takeDamage(8,'sword',s.player.x)});
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.phase===3,{timeout:5000});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss.state==='beam'&&s.time.now<s.boss.strikeFrom},{timeout:15000});
 await shot('phase3-warning');
 await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').hazards.getLength()>0,{timeout:5000});
 await shot('phase3-beam');result.checks.push(prefix+': phase3 beam warned + rendered + jump input');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').boss.state==='recover',{timeout:5000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.grantShield();s.player.body.reset(s.boss.x-300,452);s.player.facing=1;});
 // Finish using actual weapon input; damage injection above covers the phase transitions.
 for(let i=0;i<16;i++){if((await state()).state!=='fight')break;await page.keyboard.press('j',{delay:100});await page.waitForTimeout(550);}
 assert.equal((await state()).hp,0);
 await activeDialogue();await shot('defeat');await skip();
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.veilState==='rescue'&&s.veilCage.actor.y>=500&&window.__game.scene.getScene('Hud').dialogue.active},{timeout:25000});
 await shot('rescue');await skip();
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').children.list.some(x=>x.texture?.key==='veil_reunion'&&x.active),{timeout:10000});
 await page.waitForTimeout(900);await shot('hug');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').veilState==='angelo_exit'&&window.__game.scene.getScene('Hud').dialogue.active,{timeout:20000});
 await shot('farewell');await skip();
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').veilState==='done',{timeout:25000});
 const done=await state();assert(done.portal&&done.visible&&done.alive);
 assert.equal(await page.evaluate(()=>window.__game.scene.getScene('Game').boss.timers.size),0);
 await shot('portal-open');
 result.checks.push(prefix+': defeat, cage opens, actor lands, full-body hug, farewell, open portal');
 const x=done.playerX;
 await page.keyboard.down(x>2040?'ArrowLeft':'ArrowRight');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').ending,{timeout:8000});
 await page.keyboard.up(x>2040?'ArrowLeft':'ArrowRight');
 await page.waitForFunction(()=>window.__game.scene.isActive('Splash'),{timeout:8000});
 result.checks.push(prefix+': exit transitions to next level');
}
(async()=>{
 const native=Boolean(process.env.CH11_CDP_URL);
 const browser=native ? await chromium.connectOverCDP(process.env.CH11_CDP_URL,{noDefaults:true}) : await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const page=native ? browser.contexts()[0].pages()[0] : await browser.newPage({viewport:{width:1440,height:810}});
 runningBrowser=browser;runningPage=page;
 await run(page,native ? 'https://localhost/?level=11-2&res=1.5' : 'http://127.0.0.1:41811/?level=11-2&res=1.5',native ? 'android' : 'web');
 assert.deepEqual(result.errors,[]);
 fs.writeFileSync(path.join(out,native ? 'android-boss-test.json' : 'boss-test.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(async e=>{await runningPage?.screenshot({path:path.join(out,'failure-runtime.png')});
 const snapshot=await runningPage?.evaluate(()=>{const s=window.__game.scene.getScene('Game');return {state:s.veilState,bossState:s.boss?.state,hp:s.boss?.hp,playerState:s.player.state,weapon:s.player.weapon,hearts:s.player.hearts,arrows:s.arrows?.getLength(),player:s.player.x,boss:s.boss?.x}}).catch(()=>null);
 fs.writeFileSync(path.join(out,'boss-test-failure.json'),JSON.stringify({...result,failure:e.stack,snapshot},null,2));
 console.error(e);await runningBrowser?.close();process.exitCode=1});
