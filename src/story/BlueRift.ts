import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";

/** Chapter 5 uses the same painted blue gate as the final family departure. */
export class BlueRift {
  readonly x: number;
  readonly y = GROUND_Y-122;
  private scene: GameScene;
  private sprite: Phaser.GameObjects.Sprite;
  private scale: number;
  private closed = false;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: GameScene,x: number) {
    this.scene = scene;
    this.x = x;
    this.scale = scaleForHeight("final_portal",260,"open");
    this.sprite = scene.add.sprite(x,this.y,"final_portal").setDepth(57).setScale(this.scale*.1).setAlpha(0);
    applyOrigin(this.sprite,"final_portal");
    this.sprite.play("final_portal:open");
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
  }

  open() {
    Audio.sfx("portal_unlock");
    return new Promise<void>(resolve => this.scene.tweens.add({
      targets:this.sprite,alpha:1,scale:this.scale,duration:650,ease:"Sine.easeOut",onComplete:() => resolve()
    }));
  }

  surge() {
    if (this.closed) return;
    this.scene.tweens.add({targets:this.sprite,scale:this.scale*1.06,duration:140,yoyo:true,ease:"Sine.easeOut"});
  }

  close() {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    Audio.sfx("portal_enter");
    this.sprite.play("final_portal:close");
    return new Promise<void>(resolve => {
      this.timer = this.scene.time.delayedCall(700,() => {
        this.scene.tweens.add({targets:this.sprite,alpha:0,scale:this.scale*.04,duration:350,onComplete:() => {
          this.destroy();
          resolve();
        }});
      });
    });
  }

  private destroy() {
    this.timer?.remove(false);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
  }
}
