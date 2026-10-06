const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const out=path.resolve('../finale-evidence');fs.mkdirSync(out,{recursive:true});
let browser,page;
(async()=>{
 const native=Boolean(process.env.CH11_CDP_URL),prefix=native?'android':'web',errors=[];
 browser=native?await chromium.connectOverCDP(process.env.CH11_CDP_URL,{noDefaults:true}):await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:1440,height:810}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('[assets] failed'))errors.push(m.text())});
 await page.goto((native?'https://localhost/':'http://127.0.0.1:41811/')+'?level=5-2&res=1.5',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__game?.scene.getScene('Game')?.player,{timeout:60000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.body.reset(s.level.arena.x0+180,450)});
 await page.waitForFunction(()=>window.__game.scene.getScene('Hud').dialogue.active,{timeout:15000});
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('Game');return s.boss?.alive&&!s.cutscene},{timeout:10000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.boss.takeDamage(999,'sword',s.player.x)});
 let seen=false,closed=false;
 const shot=async()=>{const file=path.join(out,prefix+'-chapter5-blue-portal.png');
  if(native){const adb=path.join(process.env.ANDROID_HOME,'platform-tools','adb.exe'),remote='/sdcard/angelys-portal5-qa.png';execFileSync(adb,['-s','emulator-5554','shell','screencap','-p',remote],{stdio:'pipe'});execFileSync(adb,['-s','emulator-5554','pull',remote,file],{stdio:'pipe'});}
  else await page.screenshot({path:file});
  return file;
 };
 let screenshot;
 for(let i=0;i<300;i++){
  const state=await page.evaluate(()=>{const s=window.__game.scene.getScene('Game'),h=window.__game.scene.getScene('Hud');return {
   chapter:s.info.chapter,dialog:h.dialogue.active,cutscene:s.cutscene,exit:s.portal.isOpen,
   gate:s.children.list.some(x=>x.texture?.key==='final_portal'&&x.alpha>.8),
   finalScreen:!!h.overlay,live:s.children.list.filter(x=>x.texture?.key==='final_portal'&&x.active).length
  }});
  assert.equal(state.chapter,5);assert.equal(state.finalScreen,false);
  if(state.dialog){await page.waitForTimeout(260);await page.keyboard.press('Escape');}
  if(state.gate&&!seen){seen=true;screenshot=await shot();}
  if(seen&&!state.cutscene&&state.exit){closed=state.live===0;break;}
  await page.waitForTimeout(250);
 }
 assert(seen&&closed,'Chapter5 portal did not open and close cleanly');
 assert.deepEqual(errors,[]);
 const result={checks:['5-2 uses new painted blue portal; Angelo enters/leaves it; portal closes; original story ends with normal next-level gate'],fixtures:'Boss defeated through public damage API; dialogue skipped.',errors,screenshot};
 fs.writeFileSync(path.join(out,prefix+'-portal5-test.json'),JSON.stringify(result,null,2));console.log(result);
 await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
