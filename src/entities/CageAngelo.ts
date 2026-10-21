import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";

/** The lattice and actor are independent: bars never change with a human pose. */
export class CageAngelo {
  readonly cage: Phaser.GameObjects.Sprite;
  readonly actor: Phaser.GameObjects.Sprite;
  readonly x: number;
  readonly y = GROUND_Y - 98;
  private freed = false;
  private holdUntil = 0;
  private scene: GameScene;

  constructor(scene: GameScene, x: number) {
    this.scene = scene;
    this.x = x;
    // Every sprite uses ITS OWN sheet for texture, scale and origin. Mixing
    // sheets (angelo scale + angelo_finale anims) shrank Angelo to half size
    // and left his legs dangling below the cage floor.
    // The actor is the 5-2 boss-fight Angelo (the design Angelo picked),
    // placed from a verified composite: 185 tall, feet on the NEW cage's
    // platform (y-73), face landing in a side bay clear of lock and pillars;
    // lookAt mirrors the x-offset so the face uses the far bay when flipped.
    this.actor = scene.add.sprite(x-15,this.y-73,"angelo").setDepth(69)
      .setScale(scaleForHeight("angelo",185,"idle"));
    applyOrigin(this.actor,"angelo");
    this.actor.play("angelo:idle");
    // The NEW crystal cage (generated 2026-10-20: thin, wide-spaced bars,
    // single still frame) drawn over the actor. Release swaps back to the
    // veil_cage sheet for its crack/open anims.
    this.cage = scene.add.sprite(x,this.y,"crystal_cage_new").setDepth(72)
      .setScale(scaleForHeight("crystal_cage_new",330,"idle"));
    applyOrigin(this.cage,"crystal_cage_new");
    this.cage.play("crystal_cage_new:idle");
  }

  lookAt(x: number) {
    if (this.freed || !this.actor.active) return;
    const flip = x<this.x;
    this.actor.setFlipX(flip);
    this.actor.x = this.x + (flip ? 15 : -15);
  }

  react(kind: "look" | "grip" | "shake" | "cheer" | "idle", ms = 1300) {
    if (this.freed) return;
    this.holdUntil = this.scene.time.now+ms;
    this.actor.play(kind === "cheer" ? "angelo:wave" : kind === "idle" ? "angelo:idle" : "angelo:talk",true);
  }

  update(time: number, hp: number, maxHp: number, attacking: boolean) {
    if (this.freed || !this.actor.active || time<this.holdUntil) return;
    this.actor.play(hp/maxHp < .3 ? "angelo:wave" : attacking ? "angelo:talk" : "angelo:idle",true);
  }

  async release(): Promise<Phaser.GameObjects.Sprite> {
    this.freed = true;
    // Swap the cage sprite to the veil_cage sheet (its own scale/origin) so
    // the crack/open anims render at their measured size.
    this.cage.setScale(scaleForHeight("veil_cage",299,"idle"));
    applyOrigin(this.cage,"veil_cage");
    this.cage.play("veil_cage:crack");
    Audio.sfx("wall_break");
    this.scene.fx("crystal_shot","impact",this.x,this.y-88,.45);
    await this.scene.wait(300);
    this.cage.play("veil_cage:open");
    await this.scene.wait(450);
    this.actor.setDepth(74).play("angelo:idle");
    this.scene.tweens.add({targets:this.cage,alpha:0,duration:600,onComplete:() => this.cage.destroy()});
    await new Promise<void>(resolve => this.scene.tweens.add({
      targets:this.actor,y:GROUND_Y+4,duration:550,ease:"Quad.easeIn",onComplete:() => resolve()
    }));
    this.actor.setDepth(58);
    this.scene.fx("fx_dust","puff",this.x,GROUND_Y,.25,0xbcdfff);
    return this.actor;
  }

  destroy() {
    this.cage.destroy();
    this.actor.destroy();
  }
}
