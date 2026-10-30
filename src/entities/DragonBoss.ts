import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 220;

/**
 * Dragon Boss - the Chapter 2-2 boss (replaces the Ruin Sentinel, 2026-10-28).
 * A charcoal dragon with purple crystal spikes that walks toward Angely and
 * spits magenta fireballs. No cutscene - pure fight.
 * Sprite set: idle 32, walk 32, fire 16, hurt 8, dead 16 (104 frames).
 */
export class DragonBoss {
  readonly maxHp = 20;
  hp = this.maxHp;
  x: number;
  y: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private state: "move" | "fire" | "hurt" | "dead" = "move";
  private dir: 1 | -1 = 1;
  private until = 0;
  private nextAttack = 0;
  private hitUntil = 0;
  private baseScale: number;
  private fireSpawned = false;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.y = GROUND_Y;
    this.baseScale = scaleForHeight("dragon", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.35).setDepth(30);
    this.sprite = scene.add.sprite(x, this.y, "dragon").setDepth(45).setScale(this.baseScale);
    applyOrigin(this.sprite, "dragon");
    this.sprite.play("dragon:idle");
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
    return new Phaser.Geom.Rectangle(this.x - 80, this.y - 200, 160, 200);
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
          this.sprite.play("dragon:walk", true);
        } else {
          this.sprite.play("dragon:idle", true);
        }
        this.sprite.setFlipX(this.dir < 0);

        // Spit fireballs on timer (ranged only - no melee anim in the set)
        if (time > this.nextAttack && player.alive) {
          this.startFire(time);
        }
        break;
      }
      case "fire": {
        this.sprite.play("dragon:fire", true);
        // Spawn the fireball mid-anim, when the jaw opens (~550ms at 12fps)
        if (!this.fireSpawned && time > this.until - 850) {
          this.fireSpawned = true;
          this.spitFireball();
        }
        if (time > this.until) {
          this.state = "move";
          this.nextAttack = time + 1600 + Math.random() * 800;
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
    this.x = Phaser.Math.Clamp(this.x, this.arena.x0 + 80, this.arena.x1 - 80);
    this.sync();
  }

  private startFire(time: number) {
    this.state = "fire";
    this.fireSpawned = false;
    Audio.sfx("boss_cast");
    this.until = time + 1400;
  }

  private spitFireball() {
    const player = this.scene.player;
    // Mouth offset in sheet px, scaled: forward + up (rearing head)
    const mx = this.x + this.dir * 80 * this.baseScale;
    const my = this.y - 150 * this.baseScale;
    const dx = player.x - mx;
    const dy = (GROUND_Y - 80) - my;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 380;
    this.scene.spawnProjectile("dragon_fire", mx, my, (dx / dist) * speed, (dy / dist) * speed, 1.2);
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
    this.sprite.play("dragon:hurt", true);
    Audio.sfx("enemy_hit");
    this.until = time + 350;
    return true;
  }

  private die() {
    this.state = "dead";
    this.sprite.play("dragon:dead", true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(500, 0.01);
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 100, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-60, 60), this.y - Phaser.Math.Between(0, 200), 0.35, 0xaa8855),
      );
    }
    this.scene.time.delayedCall(1200, () => {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
    });
    this.scene.onBossDefeated();
  }

  private sync() {
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setFlipX(this.dir < 0);
    this.shadow.setPosition(this.x, GROUND_Y + 4).setScale(1.6, 0.4);
  }

  vanish() {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 600 });
  }
}

export const DRAGON_NAME = "CRYSTAL DRAGON";
