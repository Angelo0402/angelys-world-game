import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";

/** Chapter-specific artwork; earlier chapters keep their own reunion. */
export async function veilReunion(scene: GameScene, angelo: Phaser.GameObjects.Sprite) {
  const p = scene.player;
  angelo.setFlipX(true).play("angelo_veil:walk",true);
  const meet = p.x+84;
  await new Promise<void>(resolve => scene.tweens.add({targets:angelo,x:meet,duration:450,onComplete:() => resolve()}));
  p.facing = 1;
  const pair = scene.add.sprite(p.x+42,GROUND_Y+4,"veil_reunion").setDepth(75)
    .setScale(scaleForHeight("veil_reunion",142,"hug"));
  applyOrigin(pair,"veil_reunion");
  p.sprite.setVisible(false);
  angelo.setVisible(false);
  pair.play("veil_reunion:open");
  await scene.wait(350);
  pair.play("veil_reunion:hug");
  Audio.sfx("heart_pickup");
  for (let i=0;i<4;i++) {
    scene.time.delayedCall(i*240,() => {
      if (!pair.active) return;
      const heart = scene.add.sprite(pair.x-32+i*18,GROUND_Y-90,"heart").setDepth(76).setDisplaySize(18,18);
      scene.tweens.add({targets:heart,y:heart.y-72,alpha:0,duration:1100,onComplete:() => heart.destroy()});
    });
  }
  await scene.wait(1500);
  pair.play("veil_reunion:pat");
  await scene.wait(800);
  pair.destroy();
  p.sprite.setVisible(true);
  angelo.setVisible(true).play("angelo_veil:idle",true);
}
