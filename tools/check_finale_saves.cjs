const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const cases=[
  {raw:{level:25,weapons:['ray','wand','bow'],cleared:true,music:false,sfx:true},level:21,weapons:['bow','wand','ray']},
  {raw:{level:27,weapons:['sword','bow'],cleared:true,music:true,sfx:false},level:21,weapons:['sword','bow']},
  {raw:{unlocked:4,sword:true,cleared:true,music:false,sfx:false},level:14,weapons:['sword']},
 ];
 const result={checks:[],cases:[]};
 for(let i=0;i<cases.length;i++){
  const c=cases[i],context=await b.newContext();
  await context.addInitScript(raw=>localStorage.setItem('angelys-world-save-v1',JSON.stringify(raw)),c.raw);
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:41811/?level='+(i===1?'13-2':'12-1'),{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__game?.scene.isActive('Title'),{timeout:30000});
  const state=await p.evaluate(async()=>{
   const cfg=await import('/src/config.ts'),save=await import('/src/save.ts');
   const migrated={...save.loadSave()};
   const reset=save.updateSave({level:0,weapons:[],cleared:false,finaleSeen:false});
   return {chapters:Object.keys(cfg.CHAPTERS).map(Number),levels:cfg.LEVELS.length,last:cfg.LAST_LEVEL,
     hasRetired:window.__game.textures.exists('bg12')||window.__game.textures.exists('splash13'),
     migrated,reset};
  });
  assert.equal(state.levels,22);assert.equal(state.last,21);assert.equal(state.chapters.length,11);assert.equal(state.hasRetired,false);
  assert.equal(state.migrated.level,c.level);assert.deepEqual(state.migrated.weapons,c.weapons);
  assert.equal(state.migrated.music,c.raw.music);assert.equal(state.migrated.sfx,c.raw.sfx);assert.equal(state.migrated.finaleSeen,false);
  assert.equal(state.reset.level,0);assert.equal(state.reset.finaleSeen,false);assert.equal(state.reset.cleared,false);assert.deepEqual(errors,[]);
  result.cases.push(state);await context.close();
 }
 result.checks=['11 chapters/22 levels; no retired textures; obsolete 12-1/13-2 links return to title','Chapter12/13 saves clamp to final level, preserve weapons/audio; old Queen Umbra flag does not skip ending','Legacy sword/chapter migration retained; reset returns to level0 without legacy cleared migration'];
 const dir=path.resolve('../finale-evidence');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'save-levels-test.json'),JSON.stringify(result,null,2));console.log(result.checks);await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
