import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";

const CAGE_H = 168;
const ANGELO_H = 140;

/**
 * Jail art already has Angelo behind the bars, so the cage is one sprite during
 * the fight. After the lock breaks he is swapped to the regular Angelo sheet.
 */
export class CageAngelo {
  readonly cage: Phaser.GameObjects.Sprite;
  readonly x: number;
  readonly y: number;
  private scene: GameScene;
  private lastRatio = 1;
  private freed = false;

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
  }

  react(_kind: "look" | "grip" | "shake" | "cheer" | "idle", _ms = 1400) {
    /* Cage holds one idle loop so the bars never pop between mismatched frames. */
  }

  update(_time: number, bossHp: number, maxHp: number, attacking: boolean) {
    if (this.freed || !this.cage.active) return;
    const ratio = bossHp / Math.max(1, maxHp);
    if (attacking) this.cage.play("angelo_cage:grip", true);
    else if (ratio < this.lastRatio - 0.12) {
      this.lastRatio = ratio;
      this.cage.play(ratio < 0.4 ? "angelo_cage:cheer" : "angelo_cage:idle", true);
    } else this.cage.play("angelo_cage:idle", true);
  }

  async release(): Promise<Phaser.GameObjects.Sprite> {
    const scene = this.scene;
    this.freed = true;
    if (this.cage.active) this.cage.play("angelo_cage:cheer", true);
    scene.cameras.main.shake(280, 0.006);
    scene.fx("fx_spark", "hit", this.x, this.y - 40, 0.7, 0x9fd0ff);
    scene.fx("fx_dust", "puff", this.x, this.y, 0.45, 0x9aa4b8);
    await scene.wait(450);
    scene.tweens.add({ targets: this.cage, alpha: 0, y: this.y + 18, duration: 400, onComplete: () => this.cage.destroy() });
    const angelo = scene.add.sprite(this.x, this.y, "angelo").setDepth(58);
    angelo.setScale(scaleForHeight("angelo", ANGELO_H, "idle"));
    applyOrigin(angelo, "angelo");
    angelo.play("angelo:idle");
    await new Promise<void>((res) =>
      scene.tweens.add({ targets: angelo, y: GROUND_Y + 4, duration: 480, ease: "Quad.easeIn", onComplete: () => res() }),
    );
    angelo.play("angelo:idle");
    scene.fx("fx_dust", "puff", angelo.x, GROUND_Y, 0.35, 0x9fd0ff);
    await scene.wait(160);
    return angelo;
  }

  destroy() {
    this.cage.destroy();
  }
}
