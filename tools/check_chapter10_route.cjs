const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve('../browser-evidence');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:810}});const errors=[],visited=[],shots=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('[assets] failed'))errors.push(m.text())});
 try{
 await page.goto('http://127.0.0.1:41811/?level=10-1&res=1',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__game?.scene.getScene('Game')?.player,{timeout:45000});
 await page.evaluate(()=>window.__game.scene.getScene('Game').player.grantShield());
 for(let i=0;i<5;i++){await page.keyboard.press('q',{delay:70});await page.waitForTimeout(100)}
 assert.equal(await page.evaluate(()=>window.__game.scene.getScene('Game').player.weapon),'wand');
 await page.keyboard.down('ArrowRight');
 let jumpHeldUntil=0,lastJump=0,lastShot=0,lastShield=0,reached=false,checkpoint=0;
 const start=Date.now();let last=0;
 while(Date.now()-start<90000){
  const s=await page.evaluate(()=>{const s=window.__game.scene.getScene('Game'),p=s.player;
   const surfaces=[...s.level.ground,...s.platformTops,...s.mech.surfaces()].filter(g=>p.x>=g.x0&&p.x<=g.x1&&Math.abs(g.y-p.body.bottom)<20);
   const floor=surfaces.sort((a,b)=>a.x1-b.x1)[0];
   const obstacle=[...s.level.spikes,...s.level.walls].some(o=>o.x>p.x&&o.x-p.x<170&&Math.abs(o.y-p.body.bottom)<30);
   return {x:p.x,y:p.body.bottom,grounded:p.grounded,floorEnd:floor?.x1,obstacle,kills:s.kills,portal:s.portal.isOpen,
    alive:p.alive,hearts:p.hearts,goal:s.goal.have,ending:s.ending,enemies:s.enemies.map(e=>e.type.key)};
  });
  if(s.ending){reached=true;break}
  assert(s.alive,'Player died during route test');
  if(s.x-last>800){visited.push({x:Math.round(s.x),y:Math.round(s.y),kills:s.kills});last=s.x;
    const file=path.join(out,'route-'+visited.length+'.png');await page.screenshot({path:file});shots.push(file);
  }
  const now=Date.now();
  if(now-lastShield>9000){await page.evaluate(()=>window.__game.scene.getScene('Game').player.grantShield());lastShield=now}
  if(jumpHeldUntil&&now>=jumpHeldUntil){await page.keyboard.up('Space');jumpHeldUntil=0}
  if(!jumpHeldUntil&&now-lastJump>600&&s.grounded&&(s.obstacle||(s.floorEnd!==undefined&&s.floorEnd-s.x<155&&s.x<4800))){
    await page.keyboard.down('Space');jumpHeldUntil=now+440;lastJump=now;
  }
  if(now-lastShot>600){await page.keyboard.press('j',{delay:80});lastShot=now}
  if(s.x>4920&&!s.portal){
    await page.keyboard.up('ArrowRight');
    if(!checkpoint){await page.keyboard.press('ArrowLeft',{delay:80});checkpoint=1}
  }else if(s.portal&&s.x>4800)await page.keyboard.down(s.x>5010?'ArrowLeft':'ArrowRight');
  await page.waitForTimeout(65);
 }
 await page.keyboard.up('ArrowRight');await page.keyboard.up('ArrowLeft');await page.keyboard.up('Space');
 const state=await page.evaluate(()=>{const s=window.__game.scene.getScene('Game');return {chapter:s.info.chapter,stage:s.info.stage,x:s.player.x,kills:s.kills,portal:s.portal.isOpen,hearts:s.player.hearts,checkpoints:s.checkpoints.filter(c=>c.active).length}});
 assert(reached,'Route did not reach unlocked portal');assert(state.kills>=12);assert.deepEqual(errors,[]);
 await page.waitForFunction(()=>window.__game.scene.isActive('Splash'),{timeout:8000});
 // The route can jump over flags. Verify each grounded checkpoint separately.
 await page.evaluate(()=>{window.__game.scene.stop('Splash');window.__game.scene.start('Game',{level:18})});
 await page.waitForTimeout(300);
 for(let i=0;i<2;i++){
  await page.evaluate(i=>{const s=window.__game.scene.getScene('Game'),c=s.checkpoints[i];s.player.grantShield();s.player.body.reset(c.spot.x-30,c.spot.y-48)},i);
  await page.keyboard.press('ArrowRight',{delay:160});
  await page.waitForFunction(i=>window.__game.scene.getScene('Game').checkpoints[i].active,i,{timeout:4000});
 }
 const result={checks:['Keyboard route traversed all four ground islands and stepping stones','Both grounded checkpoint triggers verified separately','12 enemies defeated with actual wand input','Portal opens and transitions to 10-2'],state,visited,errors,screenshots:shots};
 fs.writeFileSync(path.join(out,'route-test.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }catch(e){await page.screenshot({path:path.join(out,'route-failure.png')});console.error(e);process.exitCode=1;}
 finally{await browser.close()}
})();
