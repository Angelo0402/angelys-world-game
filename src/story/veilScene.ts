import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import type { SpriteKey } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import { VEIL_FAREWELL, VEIL_RESCUE } from "./crystalveil";
import type { DialogueLine } from "./umbra";

/** Own every finale timer/tween: restarting cannot revive the old actors. */
class FinaleShot {
  live = true;
  private actors = new Set<Phaser.GameObjects.Sprite>();
  private pending = new Set<() => void>();
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.dispose,this);
  }

  sprite(key: SpriteKey,anim: string,x: number,y: number,height: number,depth = 75) {
    const s = this.scene.add.sprite(x,y,key).setDepth(depth).setScale(scaleForHeight(key,height,anim));
    applyOrigin(s,key);
    s.play(`${key}:${anim}`);
    this.actors.add(s);
    s.once(Phaser.GameObjects.Events.DESTROY,() => this.actors.delete(s));
    return s;
  }

  delay(ms: number) {
    return new Promise<boolean>(resolve => {
      const finish = () => { this.pending.delete(cancel); resolve(this.live); };
      const timer = this.scene.time.delayedCall(ms,finish);
      const cancel = () => { timer.remove(false); finish(); };
      this.pending.add(cancel);
    });
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<boolean>(resolve => {
      const finish = () => { this.pending.delete(cancel); resolve(this.live); };
      const tween = this.scene.tweens.add({...config,onComplete:finish});
      const cancel = () => { tween.stop(); finish(); };
      this.pending.add(cancel);
    });
  }

  say(lines: DialogueLine[],onLine: (line: DialogueLine) => void) {
    return new Promise<boolean>(resolve => {
      const finish = () => { this.pending.delete(cancel); resolve(this.live); };
      const cancel = () => finish();
      this.pending.add(cancel);
      void this.scene.say(lines,line => { if (this.live) onLine(line); }).then(finish);
    });
  }

  dispose() {
    if (!this.live) return;
    this.live = false;
    this.pending.forEach(cancel => cancel());
    this.pending.clear();
    this.actors.forEach(s => s.destroy());
    this.actors.clear();
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.dispose,this);
  }
}

/** Reunion, hand-off, shared rear-view departure, then a fully closed blue gate. */
export async function veilFinale(scene: GameScene,angelo: Phaser.GameObjects.Sprite) {
  const shot = new FinaleShot(scene);
  const p = scene.player;
  p.freeze();
  p.body.setAllowGravity(false).setVelocity(0,0);
  p.sprite.setVisible(false);
  const girl = shot.sprite("angely","idle",p.x,GROUND_Y+4,112);
  angelo.setFlipX(true).play("angelo:idle",true);
  if (!await shot.say(VEIL_RESCUE,line => {
    angelo.play(`angelo:${line.who === "angelo" ? "talk" : "smile"}`,true);
    girl.play(`angely:${line.who === "angely" ? "talk" : "idle"}`,true);
  })) return false;

  angelo.play("angelo:crouch");
  girl.play("angely:run",true);
  if (!await shot.tween({targets:girl,x:angelo.x-48,duration:600,ease:"Sine.easeInOut"})) return false;
  const meet = angelo.x-38;
  girl.setVisible(false);
  angelo.setVisible(false);
  const hug = shot.sprite("angelo_hug","approach",meet,GROUND_Y+4,142);
  if (!await shot.delay(650)) return false;
  hug.play("angelo_hug:hug",true);
  Audio.sfx("heart_pickup");
  if (!await shot.delay(1900)) return false;
  hug.play("angelo_hug:pat");
  if (!await shot.delay(900)) return false;
  hug.destroy();

  scene.veilState = "together";
  girl.setPosition(meet-40,GROUND_Y+4).setVisible(true).play("angely:celebrate",true);
  angelo.setPosition(meet+40,GROUND_Y+4).setVisible(true).setFlipX(true).play("angelo:idle",true);
  const portalX = scene.level.arena!.x0+340;
  const gate = shot.sprite("portal","open",portalX,GROUND_Y-122,260,64).setAlpha(0);
  const gateScale = gate.scale;
  gate.setScale(gateScale*.1);
  Audio.sfx("portal_unlock");
  if (!await shot.tween({targets:gate,alpha:1,scale:gateScale,duration:950,ease:"Sine.easeOut"})) return false;
  if (!await shot.say(VEIL_FAREWELL,line => {
    angelo.play(`angelo:${line.who === "angelo" ? "reach" : "smile"}`,true);
    girl.play(`angely:${line.who === "angely" ? "talk" : "reach"}`,true);
  })) return false;
  // Offer the hand on screen before the joined walking sprites take over.
  angelo.play("angelo:wave",true);
  girl.play("angely:walk",true);
  if (!await shot.delay(800)) return false;
  angelo.setVisible(false);
  girl.setVisible(false);
  // The painted pair walks left. Mirror only when the gate is to their right.
  const pair = shot.sprite("angelo_hug","walk",meet,GROUND_Y+4,155).setFlipX(portalX > meet);
  if (!await shot.tween({targets:pair,x:portalX,duration:Math.max(1500,Math.abs(meet-portalX)*7),ease:"Sine.easeInOut"})) return false;
  pair.destroy();

  scene.veilState = "portal_exit";
  // Turn away before the joined rear-view walk. No face is shown here.
  const dadBack = shot.sprite("angelo","walk",portalX-38,GROUND_Y+4,142);
  const girlBack = shot.sprite("angely","walk",portalX+38,GROUND_Y+4,112);
  dadBack.anims.stop();
  girlBack.anims.stop();
  if (!await shot.delay(550)) return false;
  dadBack.destroy();
  girlBack.destroy();
  const away = shot.sprite("angelo_hug","walk",portalX,GROUND_Y+4,155);
  away.setData("finalePair",true);
  Audio.sfx("portal_enter");
  if (!await shot.tween({targets:away,y:GROUND_Y-42,scale:away.scale*.62,duration:2100,ease:"Sine.easeIn"})) return false;
  // Both cross the threshold together behind the glowing gate.
  away.setDepth(63);
  if (!await shot.tween({targets:away,y:GROUND_Y-88,scale:away.scale*.45,alpha:0,duration:1000,ease:"Sine.easeIn"})) return false;
  away.destroy();
  angelo.destroy();
  girl.destroy();
  if (!await shot.delay(450)) return false;
  gate.play("final_portal:close");
  if (!await shot.delay(700)) return false;
  if (!await shot.tween({targets:gate,alpha:0,scaleX:gateScale*.04,scaleY:gateScale*.04,duration:350})) return false;
  gate.destroy();
  if (!await shot.delay(850)) return false;
  shot.dispose();
  return true;
}
