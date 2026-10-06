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
    this.actor = scene.add.sprite(x,this.y-18,"angelo_veil").setDepth(69)
      .setScale(scaleForHeight("angelo_veil",142,"idle"));
    applyOrigin(this.actor,"angelo_veil");
    this.actor.play("angelo_veil:idle");
    this.cage = scene.add.sprite(x,this.y,"veil_cage").setDepth(72)
      .setScale(scaleForHeight("veil_cage",210,"idle"));
    applyOrigin(this.cage,"veil_cage");
    this.cage.play("veil_cage:idle");
  }

  lookAt(x: number) {
    if (!this.freed && this.actor.active) this.actor.setFlipX(x<this.x);
  }

  react(kind: "look" | "grip" | "shake" | "cheer" | "idle", ms = 1300) {
    if (this.freed) return;
    this.holdUntil = this.scene.time.now+ms;
    this.actor.play(kind === "cheer" ? "angelo_veil:wave" : kind === "idle" ? "angelo_veil:idle" : "angelo_veil:talk",true);
  }

  update(time: number, hp: number, maxHp: number, attacking: boolean) {
    if (this.freed || !this.actor.active || time<this.holdUntil) return;
    this.actor.play(hp/maxHp < .3 ? "angelo_veil:wave" : attacking ? "angelo_veil:talk" : "angelo_veil:idle",true);
  }

  async release(): Promise<Phaser.GameObjects.Sprite> {
    this.freed = true;
    this.cage.play("veil_cage:crack");
    Audio.sfx("wall_break");
    this.scene.fx("crystal_shot","impact",this.x,this.y-88,.45);
    await this.scene.wait(300);
    this.cage.play("veil_cage:open");
    await this.scene.wait(450);
    this.actor.setDepth(74).play("angelo_veil:idle");
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
