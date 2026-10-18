import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 220;

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
  private baseScale: number;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.y = GROUND_Y;
    this.baseScale = scaleForHeight("sentinel", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.35).setDepth(30);
    this.sprite = scene.add.sprite(x, this.y, "sentinel").setDepth(45).setScale(this.baseScale);
    applyOrigin(this.sprite, "sentinel");
    this.sprite.play("sentinel:idle");
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

  update(time: number, delta: number) {
    if (this.state === "dead") {
      this.sync();
      return;
    }
    const dt = Math.min(delta, 50) / 1000;
    const player = this.scene.player;

    // Flash white when hit
    if (time < this.hitUntil) {
      this.sprite.setTintFill(0xffffff);
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
          this.sprite.play("sentinel:walk", true);
        } else {
          this.sprite.play("sentinel:idle", true);
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
        this.sprite.play("sentinel:attack", true);
        if (time > this.until) {
          this.state = "move";
          this.nextAttack = time + 1400 + Math.random() * 600;
        }
        break;
      }
      case "throw": {
        this.sprite.play("sentinel:attack", true);
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
    this.sprite.play("sentinel:hurt", true);
    Audio.sfx("enemy_hit");
    this.until = time + 350;
    return true;
  }

  private die() {
    this.state = "dead";
    this.sprite.play("sentinel:dead", true);
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
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setFlipX(this.dir < 0);
    this.shadow.setPosition(this.x, GROUND_Y + 4).setScale(1.2, 0.4);
  }

  vanish() {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 600 });
  }
}

export const SENTINEL_NAME = "RUIN SENTINEL";
