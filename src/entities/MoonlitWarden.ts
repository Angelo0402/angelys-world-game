import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 180;
const HOVER_Y = GROUND_Y - 160;

/**
 * Moonlit Warden - the first boss (Chapter 2-2).
 * A large ghost that drifts side to side and fires moon orbs at Angely.
 * Simple, well-animated tutorial boss.
 */
export class MoonlitWarden {
  readonly maxHp = 12;
  hp = this.maxHp;
  x: number;
  y: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Particles.ParticleEmitter;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private state: "intro" | "move" | "shoot" | "hurt" | "dead" = "intro";
  private dir: 1 | -1 = 1;
  private until = 0;
  private nextShot = 0;
  private hitUntil = 0;
  private baseScale: number;
  private moveTarget = 0;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.y = HOVER_Y;
    this.baseScale = scaleForHeight("ghost", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.3).setDepth(30).setTint(0x1a2a4a);
    this.sprite = scene.add.sprite(x, this.y, "ghost").setDepth(45).setScale(this.baseScale * 1.6);
    applyOrigin(this.sprite, "ghost");
    this.sprite.play("ghost:idle");
    // Moonlight aura particles
    this.aura = scene.add
      .particles(0, 0, "dot", {
        x: { min: -30, max: 30 },
        y: { min: 20, max: 80 },
        speedY: { min: 10, max: 40 },
        speedX: { min: -15, max: 15 },
        lifespan: 800,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.4, end: 0 },
        tint: [0x9fd8ff, 0xcceaff, 0x6ab0ff],
        frequency: 80,
      })
      .setDepth(44);
    this.moveTarget = x;
    this.sync();
  }

  get alive() {
    return this.state !== "dead";
  }

  get harmful() {
    return this.state !== "dead" && this.state !== "intro" && this.state !== "hurt";
  }

  get vulnerable() {
    return this.state !== "dead" && this.state !== "intro";
  }

  hitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 50, this.y - 90, 100, 180);
  }

  begin() {
    this.state = "move";
    this.until = this.scene.time.now + 2000;
    this.nextShot = this.scene.time.now + 1500;
    this.pickMoveTarget();
  }

  private pickMoveTarget() {
    const mid = (this.arena.x0 + this.arena.x1) / 2;
    // Move to opposite side from player
    const px = this.scene.player.x;
    this.moveTarget = px < mid
      ? this.arena.x1 - 150 - Math.random() * 100
      : this.arena.x0 + 150 + Math.random() * 100;
    this.dir = this.moveTarget > this.x ? 1 : -1;
  }

  update(time: number, delta: number) {
    if (this.state === "dead" || this.state === "intro") {
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
        // Drift toward move target with sine hover
        const speed = 120;
        const dx = this.moveTarget - this.x;
        if (Math.abs(dx) > 10) {
          this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
          this.dir = dx > 0 ? 1 : -1;
        } else {
          this.pickMoveTarget();
        }
        this.y = HOVER_Y + Math.sin(time / 500) * 20;
        this.sprite.play("ghost:idle", true);
        this.sprite.setFlipX(this.dir < 0);

        // Shoot periodically
        if (time > this.nextShot && player.alive) {
          this.startShoot(time);
        }
        break;
      }
      case "shoot": {
        // Pause and fire
        this.sprite.play("ghost:attack", true);
        if (time > this.until) {
          this.state = "move";
          this.nextShot = time + 1800 + Math.random() * 800;
          this.pickMoveTarget();
        }
        break;
      }
      case "hurt": {
        if (time > this.until) {
          this.state = "move";
          this.pickMoveTarget();
        }
        break;
      }
    }
    this.sync();
  }

  private startShoot(time: number) {
    this.state = "shoot";
    this.sprite.play("ghost:attack", true);
    Audio.sfx("ghost_orb");
    // Fire moon orb at player
    const player = this.scene.player;
    const dx = player.x - this.x;
    const dy = (GROUND_Y - 60) - this.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 260;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    this.scene.spawnProjectile("fx_orb", this.x, this.y, vx, vy, 0.5, 0x9fd8ff);
    this.until = time + 600;
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (this.state === "dead" || this.state === "intro") return false;
    const time = this.scene.time.now;
    if (time < this.hitUntil) return false;

    this.hp -= amount;
    this.hitUntil = time + 300;
    this.scene.onBossHp(this.hp, this.maxHp, amount);

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    // Hurt reaction
    this.state = "hurt";
    this.sprite.play("ghost:hurt", true);
    Audio.sfx("enemy_hit");
    this.until = time + 400;
    return true;
  }

  private die() {
    this.state = "dead";
    this.aura.stop();
    this.sprite.play("ghost:dead", true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(500, 0.008);
    // Explosion particles
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 120, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-50, 50), this.y + Phaser.Math.Between(-60, 60), 0.3, 0x9fd8ff),
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
    this.shadow.setPosition(this.x, GROUND_Y + 4).setScale(1.0, 0.35);
    this.aura.setPosition(this.x, this.y - 40);
  }

  vanish() {
    this.aura.stop();
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 600 });
  }
}

export const WARDEN_NAME = "MOONLIT WARDEN";
