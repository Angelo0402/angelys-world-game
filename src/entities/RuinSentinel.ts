import Phaser from "phaser";
import { applyOrigin } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 220;
const FRAME_H = 256;
/** Sprite origin row in frame px (originY 0.98): 250.88. Feet sit at the frame centre + off + h/2. */
const ORIGIN_ROW = 0.98 * FRAME_H;
const FRAME_CENTRE = FRAME_H / 2;

/**
 * Per-animation figure fit, measured from the sentinel sheet's alpha pixels
 * (2026-11-06 harness, same pattern as UMBRA_FIT): `h` = the animation's
 * TRUE max figure height in source px, `off` = how far the figure's vertical
 * centre sits below the frame centre (mean over frames), in source px. The
 * manifest claims h: 200 for every anim, so the old fixed scale 220/200 =
 * 1.10 rendered her 265-282px instead of 220 — 24-28% too tall, overflowing
 * her 120x220 hitbox by ~50-60px. Calibrating by true height keeps every
 * movement exactly 220px.
 * `off` uses the VISIBLE prefix for attack/dead: the slam/throw state lasts
 * only 600ms (~7 frames, f33-39) and the dead sprite hides 900ms after
 * death (~7 frames, f66-72), so the means cover what the player ever sees
 * (full-anim means: attack +14.5, dead +38.0).
 * NOTE: the red on her body is baked into the sheet art (glowing red/orange
 * chest cracks/core, ~6% of opaque pixels in every anim) — no red tint or
 * glow exists in code (hit flash is white). Recolouring the cracks needs an
 * art change; nothing in code can remove it.
 */
const SENTINEL_FIT: Record<"idle" | "walk" | "attack" | "hurt" | "dead", { h: number; off: number }> = {
  idle: { h: 248, off: 4.3 },
  walk: { h: 255, off: 0.8 },
  attack: { h: 256, off: 10.4 },
  hurt: { h: 241, off: 9.0 },
  dead: { h: 202, off: 26.5 },
};

/**
 * Ruin Sentinel - the Chapter 2-2 boss.
 * A stone golem that walks toward Angely, slams the ground (shockwave),
 * and hurls rocks. No cutscene - pure fight.
 */
export class RuinSentinel {
  readonly maxHp = 20;
  hp = this.maxHp;
  x: number;
  y: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private state: "move" | "slam" | "throw" | "hurt" | "dead" = "move";
  private dir: 1 | -1 = 1;
  private until = 0;
  private nextAttack = 0;
  private hitUntil = 0;
  /** Sprite-Y correction so the FIGURE's feet (not the frame) sit on GROUND_Y. Set by playAnim. */
  private animYShift = 0;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.y = GROUND_Y;
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.35).setDepth(30);
    this.sprite = scene.add.sprite(x, this.y, "sentinel").setDepth(45);
    applyOrigin(this.sprite, "sentinel");
    this.playAnim("idle");
    this.sync();
  }

  get alive() {
    return this.state !== "dead";
  }

  get harmful() {
    return this.state !== "dead" && this.state !== "hurt";
  }

  get vulnerable() {
    return this.state !== "dead";
  }

  hitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 60, this.y - 220, 120, 220);
  }

  begin() {
    this.state = "move";
    this.nextAttack = this.scene.time.now + 1200;
  }

  /**
   * Play a Sentinel animation at a constant 220px rendered height (v63).
   * The sheet packs all movements at one global scale calibrated to a
   * placeholder h: 200, but the true figures are 202-256px tall, so one
   * fixed scale rendered her 265-282px. SENTINEL_FIT calibrates by the
   * measured max figure height, and animYShift puts the figure's FEET (not
   * the frame) on GROUND_Y: the origin row sits ORIGIN_ROW - FRAME_CENTRE
   * below the frame centre, the feet sit off + h/2 below it.
   */
  private playAnim(anim: "idle" | "walk" | "attack" | "hurt" | "dead"): void {
    const fit = SENTINEL_FIT[anim];
    const s = HEIGHT / fit.h;
    this.animYShift = -(fit.off + fit.h / 2 - (ORIGIN_ROW - FRAME_CENTRE)) * s;
    this.sprite.setScale(s);
    this.sprite.play(`sentinel:${anim}`, true);
  }

  update(time: number, delta: number) {
    if (this.state === "dead") {
      this.sync();
      return;
    }
    const dt = Math.min(delta, 50) / 1000;
    const player = this.scene.player;

    // Flash white when hit
    if (time < this.hitUntil) {
      this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else {
      this.sprite.clearTint();
    }

    switch (this.state) {
      case "move": {
        // Walk toward player
        const speed = 140;
        const dx = player.x - this.x;
        if (Math.abs(dx) > 80) {
          this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
          this.dir = dx > 0 ? 1 : -1;
          this.playAnim("walk");
        } else {
          this.playAnim("idle");
        }
        this.sprite.setFlipX(this.dir < 0);

        // Attack when in range or on timer
        if (time > this.nextAttack && player.alive) {
          if (Math.abs(dx) < 300) {
            this.startSlam(time);
          } else {
            this.startThrow(time);
          }
        }
        break;
      }
      case "slam": {
        this.playAnim("attack");
        if (time > this.until) {
          this.state = "move";
          this.nextAttack = time + 1400 + Math.random() * 600;
        }
        break;
      }
      case "throw": {
        this.playAnim("attack");
        if (time > this.until) {
          this.state = "move";
          this.nextAttack = time + 1400 + Math.random() * 600;
        }
        break;
      }
      case "hurt": {
        if (time > this.until) {
          this.state = "move";
        }
        break;
      }
    }
    // Keep inside arena
    this.x = Phaser.Math.Clamp(this.x, this.arena.x0 + 60, this.arena.x1 - 60);
    this.sync();
  }

  private startSlam(time: number) {
    this.state = "slam";
    Audio.sfx("boss_hit");
    this.scene.cameras.main.shake(250, 0.008);
    // Ground shockwave on both sides (as projectiles)
    const y = GROUND_Y - 30;
    this.scene.spawnProjectile("fx_dust", this.x - 80, y, -280, 0, 1.5);
    this.scene.spawnProjectile("fx_dust", this.x + 80, y, 280, 0, 1.5); this.scene.spawnProjectile("fx_dust", this.x - 40, y, -160, -300, 1.2); this.scene.spawnProjectile("fx_dust", this.x + 40, y, 160, -300, 1.2);
    this.until = time + 600;
  }

  private startThrow(time: number) {
    this.state = "throw";
    Audio.sfx("boss_cast");
    const player = this.scene.player;
    const dx = player.x - this.x;
    const dy = (GROUND_Y - 80) - (this.y - 160);
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 380;
    this.scene.spawnProjectile("fx_dust", this.x, this.y - 160, (dx / dist) * speed, (dy / dist) * speed, 1.2); this.scene.spawnProjectile("fx_dust", this.x, this.y - 160, (dx / dist) * speed * 0.94, (dy / dist) * speed - 80, 1.2); this.scene.spawnProjectile("fx_dust", this.x, this.y - 160, (dx / dist) * speed * 0.94, (dy / dist) * speed + 80, 1.2);
    this.until = time + 600;
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (this.state === "dead") return false;
    const time = this.scene.time.now;
    if (time < this.hitUntil) return false;

    this.hp -= amount;
    this.hitUntil = time + 300;
    this.scene.onBossHp(this.hp, this.maxHp, amount);

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    this.state = "hurt";
    this.playAnim("hurt");
    Audio.sfx("enemy_hit");
    this.until = time + 350;
    return true;
  }

  private die() {
    this.state = "dead";
    this.playAnim("dead");
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(500, 0.01);
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 100, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-60, 60), this.y - Phaser.Math.Between(0, 200), 0.35, 0xaa8855),
      );
    }
    this.scene.time.delayedCall(900, () => {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
    });
    this.scene.onBossDefeated();
  }

  private sync() {
    this.sprite.setPosition(this.x, this.y + this.animYShift);
    this.sprite.setFlipX(this.dir < 0);
    this.shadow.setPosition(this.x, GROUND_Y + 4).setScale(1.2, 0.4);
  }

  vanish() {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 600 });
  }
}

export const SENTINEL_NAME = "RUIN SENTINEL";
