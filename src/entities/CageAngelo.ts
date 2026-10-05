import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";

const CAGE_H = 168;

/**
 * Angelo stays inside the provided jail art the whole fight so the front bars
 * always draw over him. After the rescue he is swapped to a free walk sprite.
 */
export class CageAngelo {
  readonly cage: Phaser.GameObjects.Sprite;
  readonly x: number;
  readonly y: number;
  private scene: GameScene;
  private poseUntil = 0;
  private lastHp = 1;
  private free?: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, x: number) {
    this.scene = scene;
    this.x = x;
    this.y = GROUND_Y - 268;
    this.cage = scene.add.sprite(x, this.y, "angelo_cage").setDepth(72);
    this.cage.setScale(scaleForHeight("angelo_cage", CAGE_H, "idle"));
    applyOrigin(this.cage, "angelo_cage");
    this.cage.play("angelo_cage:idle");
  }

  lookAt(x: number) {
    this.cage.setFlipX(x < this.x);
    this.free?.setFlipX(x < (this.free.x ?? this.x));
  }

  react(kind: "look" | "grip" | "shake" | "cheer" | "idle", ms = 1400) {
    if (this.free) return;
    this.cage.play(`angelo_cage:${kind}`, true);
    this.poseUntil = this.scene.time.now + ms;
  }

  update(time: number, bossHp: number, maxHp: number, attacking: boolean) {
    if (this.free) return;
    const ratio = bossHp / Math.max(1, maxHp);
    if (attacking && time > this.poseUntil) this.react(ratio < 0.35 ? "shake" : "grip", 900);
    else if (ratio < this.lastHp - 0.08) {
      this.react(ratio < 0.4 ? "cheer" : "look", 1100);
      this.lastHp = ratio;
    } else if (time > this.poseUntil) this.cage.play("angelo_cage:idle", true);
  }

  /** Cage pops open. Angelo drops onto the arena floor as a free sprite. */
  async release(): Promise<Phaser.GameObjects.Sprite> {
    const scene = this.scene;
    this.cage.play("angelo_cage:cheer", true);
    scene.cameras.main.shake(280, 0.006);
    scene.fx("fx_spark", "hit", this.x, this.y - 40, 0.7, 0x9fd0ff);
    scene.fx("fx_dust", "puff", this.x, this.y, 0.45, 0x9aa4b8);
    await scene.wait(500);
    scene.tweens.add({ targets: this.cage, alpha: 0, y: this.y + 18, duration: 420, onComplete: () => this.cage.destroy() });
    const angelo = scene.add.sprite(this.x, GROUND_Y + 4, "angelo_cell").setDepth(58);
    angelo.setScale(scaleForHeight("angelo_cell", 148, "idle"));
    applyOrigin(angelo, "angelo_cell");
    angelo.play("angelo_cell:idle");
    this.free = angelo;
    return angelo;
  }

  destroy() {
    this.cage.destroy();
    this.free?.destroy();
    this.free = undefined;
  }
}
