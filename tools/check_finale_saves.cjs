const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const cases=[
  {raw:{level:18,weapons:['bow'],music:false,sfx:true},level:18,weapons:['bow']},
  {raw:{level:19,weapons:['hammer'],music:true,sfx:false},level:18,weapons:['hammer']},
  {raw:{level:20,weapons:['wand'],cleared:true,music:false,sfx:true},level:18,weapons:['wand']},
  {raw:{level:21,weapons:['ray','wand','bow'],cleared:true,music:false,sfx:true},level:19,weapons:['bow','wand','ray']},
  {raw:{level:21,weapons:['sword'],finaleSeen:true,music:true,sfx:false},level:19,weapons:['sword']},
  {raw:{level:25,weapons:['ray','bow'],cleared:true,music:false,sfx:true},level:19,weapons:['bow','ray']},
  {raw:{level:27,weapons:['sword','bow'],cleared:true,music:true,sfx:false},level:19,weapons:['sword','bow']},
  {raw:{unlocked:4,sword:true,cleared:true,music:false,sfx:false},level:14,weapons:['sword']},
  {raw:{level:19,chapterLayoutVersion:2,weapons:['ray'],music:false,sfx:false},level:19,weapons:['ray']},
  {raw:{level:17,weapons:['ray'],music:true,sfx:true},level:17,weapons:['ray']},
 ];
 const result={checks:[],cases:[],fixtures:'Saved-data injection; 9-2 gem goal and near-portal positioning assisted, actual right-arrow portal entry and Splash input verified.'};
 try{
 for(let i=0;i<cases.length;i++){
  const c=cases[i],context=await b.newContext();
  await context.addInitScript(raw=>{if(!localStorage.getItem('angelys-world-save-v1'))localStorage.setItem('angelys-world-save-v1',JSON.stringify(raw))},c.raw);
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:41811/?level='+['11-1','12-1','13-2'][i%3],{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__game?.scene.isActive('Title'),{timeout:30000});
  const state=await p.evaluate(async()=>{
   const cfg=await import('/src/config.ts'),save=await import('/src/save.ts');
   const migrated={...save.loadSave()};save.updateSave({});
   return {chapters:Object.keys(cfg.CHAPTERS).map(Number),levels:cfg.LEVELS.length,last:cfg.LAST_LEVEL,
     finalLevels:cfg.LEVELS.slice(-2).map(l=>({chapter:l.chapter,index:l.index,name:l.name})),
     hasRetired:['bg11','splash11','bg12','splash13','leafslime','candywitch'].some(k=>window.__game.textures.exists(k)),
     crystalBackdrop:window.__game.textures.get('bg10').getSourceImage().width,migrated};
  });
  assert.equal(state.levels,20);assert.equal(state.last,19);assert.deepEqual(state.chapters,[1,2,3,4,5,6,7,8,9,10]);assert.equal(state.hasRetired,false);assert.equal(state.crystalBackdrop,1920);
  assert.deepEqual(state.finalLevels,[{chapter:10,index:18,name:'Shattered Causeway'},{chapter:10,index:19,name:'The Veil Crown'}]);
  assert.equal(state.migrated.level,c.level);assert.equal(state.migrated.chapterLayoutVersion,2);assert.deepEqual(state.migrated.weapons,c.weapons);
  assert.equal(state.migrated.music,c.raw.music);assert.equal(state.migrated.sfx,c.raw.sfx);assert.equal(state.migrated.finaleSeen,c.raw.finaleSeen===true);
  await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>window.__game?.scene.isActive('Title'),{timeout:30000});
  state.reloaded=await p.evaluate(async()=>({...((await import('/src/save.ts')).loadSave())}));
  assert.equal(state.reloaded.level,c.level,'Migration must not subtract twice');assert.equal(state.reloaded.chapterLayoutVersion,2);
  state.reset=await p.evaluate(async()=>(await import('/src/save.ts')).updateSave({level:0,weapons:[],cleared:false,finaleSeen:false}));
  assert.equal(state.reset.level,0);assert.equal(state.reset.finaleSeen,false);assert.equal(state.reset.cleared,false);assert.deepEqual(errors,[]);
  result.cases.push(state);await context.close();
 }
 const p=await b.newPage({viewport:{width:1440,height:810}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:41811/?level=9-2&res=1',{waitUntil:'networkidle'});
 await p.waitForFunction(()=>window.__game?.scene.getScene('Game')?.player,{timeout:30000});
 await p.evaluate(()=>{const s=window.__game.scene.getScene('Game');s.player.grantShield();s.setGoal(s.info.need);s.player.body.reset(s.portal.cx-100,s.portal.baseY-s.player.body.height/2-2)});
 await p.keyboard.down('ArrowRight');await p.waitForFunction(()=>window.__game.scene.isActive('Splash'),null,{timeout:8000});await p.keyboard.up('ArrowRight');
 const splash=await p.evaluate(()=>window.__game.scene.getScene('Splash').children.list.map(x=>x.text).filter(Boolean));
 assert(splash.includes('CHAPTER 10: THE CRYSTAL VEIL'));assert(splash.includes('LEVEL 10-1: SHATTERED CAUSEWAY'));
 const dir=path.resolve('../finale-evidence');fs.mkdirSync(dir,{recursive:true});await p.screenshot({path:path.join(dir,'web-chapter9-to10.png')});
 await p.waitForTimeout(600);await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__game.scene.isActive('Game'),{timeout:8000});
 const next=await p.evaluate(()=>{const s=window.__game.scene.getScene('Game');return {chapter:s.info.chapter,stage:s.info.stage,index:s.info.index,background:s.chapter.background}});
 assert.deepEqual(next,{chapter:10,stage:1,index:18,background:'bg10'});assert.deepEqual(errors,[]);
 result.progression={splash,next,errors};
 result.checks=['10 chapters/20 levels; Crystal Veil now10-1/10-2; removed Mosswood/11/12/13 textures and links','Legacy Mosswood/Crystal Veil saves map once to18/19; weapons/audio/finaleSeen preserved; layout2 reload stable','Legacy sword/chapter migration retained; reset returns to0','Actual portal input from9-2 enters Chapter10 splash and10-1'];
 fs.writeFileSync(path.join(dir,'save-levels-test.json'),JSON.stringify(result,null,2));console.log(result.checks);
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
