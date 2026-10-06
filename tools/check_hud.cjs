const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const out=path.resolve('../browser-evidence');fs.mkdirSync(out,{recursive:true});
const weapons=['sword','bow','hammer','boomerang','wand','cog','ray'];
const result={checks:[],errors:[],screenshots:[]};
let browser;
(async()=>{
 const native=Boolean(process.env.CH11_CDP_URL),prefix=native?'hud-android':'hud-web';
 browser=native?await chromium.connectOverCDP(process.env.CH11_CDP_URL,{noDefaults:true}):await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:1440,height:810},hasTouch:true});
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('[assets] failed'))result.errors.push(m.text())});
 const cdp=await page.context().newCDPSession(page);
 const point=async(x,y)=>page.evaluate(({x,y})=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+x*r.width/1280,y:r.top+y*r.height/576}}, {x,y});
 const tap=async(x,y)=>{const p=await point(x,y);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300)};
 const shot=async(name)=>{
  const file=path.join(out,prefix+'-'+name+'.png');
  if(native){const adb=path.join(process.env.ANDROID_HOME,'platform-tools','adb.exe'),remote='/sdcard/angelys-hud-test.png';
   execFileSync(adb,['-s','emulator-5554','shell','screencap','-p',remote],{stdio:'pipe'});
   execFileSync(adb,['-s','emulator-5554','pull',remote,file],{stdio:'pipe'});
  }else await page.screenshot({path:file});
  result.screenshots.push(file);
 };
 const fixture=async(list)=>page.evaluate(list=>{const s=window.__game.scene.getScene('Game');
  s.player.weapons=[];s.player.weapon=null;for(const w of list)s.player.giveWeapon(w,false);
  s.publishWeapons();s.player.grantShield();},list);
 const hud=()=>page.evaluate(()=>{const g=window.__game,h=g.scene.getScene('Hud'),s=g.scene.getScene('Game');
  const inner=h.attackBtn.list[0];return {weapon:s.player.weapon,slot:h.weaponIcon.texture.key,attack:inner?.list.find(x=>x.texture?.key.startsWith('hud_weapon_'))?.texture.key,
   label:inner?.list.find(x=>x.type==='Text')?.text,attackVisible:h.attackBtn.visible,swapVisible:h.swapBtn.visible,
   touchVisible:h.touchUi.visible,hearts:h.hearts.length,fullHearts:h.hearts.filter(x=>x.getData('full')).length,
   x:s.player.x,y:s.player.body.y,velocity:s.player.body.velocity.y,state:s.player.state,
   joy:h.joyId,jump:h.jumpId,attackId:h.attackId,paused:g.scene.isPaused('Game'),
   sound:h.children.list.flatMap(x=>x.list||[]).find(x=>x.texture?.key.startsWith('hud_sound'))?.texture.key}});
 await page.goto((native?'https://localhost/':'http://127.0.0.1:41811/')+'?level=3-2&touch&res=2',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__game?.scene.getScene('Hud')?.attackBtn,{timeout:60000});
 await page.waitForTimeout(3500);
 await fixture(weapons);
 assert.equal((await hud()).hearts,5);assert((await hud()).touchVisible);
 for(const w of weapons){const h=await hud();assert.equal(h.weapon,w);assert.equal(h.slot,'hud_weapon_'+w);assert.equal(h.attack,h.slot);assert.equal(h.label,w.toUpperCase());
  await shot(w);await tap(1078,396);}
 assert.equal((await hud()).weapon,'sword');result.checks.push(prefix+': real touch SWAP cycles 7 distinct matching slot/attack icons and labels');
 await page.evaluate(()=>window.__game.registry.set('hearts',3));assert.equal((await hud()).fullHearts,3);
 await page.evaluate(()=>window.__game.registry.set('hearts',1));assert.equal((await hud()).fullHearts,1);
 await page.evaluate(()=>window.__game.registry.set('hearts',5));assert.equal((await hud()).fullHearts,5);
 result.checks.push(prefix+': 5 large hearts reflect damage and recovery');
 const sound=(await hud()).sound;await tap(1134,40);assert.notEqual((await hud()).sound,sound);await tap(1134,40);assert.equal((await hud()).sound,sound);
 result.checks.push(prefix+': sound button toggles mute and restores sound');
 await tap(1202,40);assert((await hud()).paused);assert.equal((await hud()).touchVisible,false);await shot('paused');
 await tap(640,193);assert.equal((await hud()).paused,false);assert((await hud()).touchVisible);
 result.checks.push(prefix+': pause/resume clears and restores controls');
 await page.waitForFunction(()=>window.__game.scene.getScene('Game').player.grounded,{timeout:6000});
 const before=await hud(),joy=await point(140,450),move=await point(195,450),jump=await point(1176,468),attack=await point(1042,494);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...joy,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...move,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...move,id:1},{...jump,id:2}]});
 await page.waitForTimeout(120);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...move,id:1},{...jump,id:2},{...attack,id:3}]});
 await page.waitForTimeout(120);const held=await hud();
 assert(held.x>before.x+12);assert(held.y<before.y-15);assert.equal(held.state,'attack');assert(held.joy>=0&&held.jump>=0&&held.attackId>=0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
 const released=await hud();assert.equal(released.joy,-1);assert.equal(released.jump,-1);assert.equal(released.attackId,-1);
 result.checks.push(prefix+': 3 simultaneous fingers move, jump, attack, and release');
 await page.waitForTimeout(1000);await fixture([]);assert.equal((await hud()).attackVisible,false);assert.equal((await hud()).swapVisible,false);
 await fixture(['sword']);assert((await hud()).attackVisible);assert.equal((await hud()).swapVisible,false);
 await fixture(weapons);await tap(52,120);assert.equal((await hud()).weapon,'bow');
 result.checks.push(prefix+': empty/single weapon visibility and TAP slot switching');
 if(!native){await page.setViewportSize({width:960,height:540});await shot('small-screen');await tap(1078,396);assert.equal((await hud()).weapon,'hammer');
  await page.setViewportSize({width:1920,height:864});await shot('wide-screen');await tap(1078,396);assert.equal((await hud()).weapon,'boomerang');
  result.checks.push(prefix+': touch coordinates work at small and wide viewport sizes');}
 assert.deepEqual(result.errors,[]);
 fs.writeFileSync(path.join(out,prefix+'-test.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(async e=>{fs.writeFileSync(path.join(out,'hud-test-failure.json'),JSON.stringify({...result,failure:e.stack},null,2));console.error(e);await browser?.close();process.exitCode=1});
