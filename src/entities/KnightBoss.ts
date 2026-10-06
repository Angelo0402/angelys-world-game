import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 210;

/**
 * The Veil Sovereign stays on the arena floor. He walks Angely down, swings a
 * crescent up close, throws orbs at range, dashes across the arena with a
 * telegraphed lunge, and slams the ground for a shockwave. Phase 2: faster,
 * triple orb spread, shorter telegraphs.
 */
export class KnightBoss {
  readonly maxHp = 20;
  hp = this.maxHp;
  phase: 1 | 2 = 1;
  x: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private state: "intro" | "walk" | "slash" | "shoot" | "dash" | "slam" | "hurt" | "dead" = "intro";
  private dir: 1 | -1 = -1;
  private until = 0;
  private nextShot = 0;
  private nextDash = 0;
  private nextSlam = 0;
  private hitUntil = 0;
  private baseScale: number;
  private dashFrom = 0;
  private dashTo = 0;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.baseScale = scaleForHeight("sovereign", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.38).setDepth(30).setTint(0x2a1048);
    this.sprite = scene.add.sprite(x, GROUND_Y, "sovereign").setDepth(46).setScale(this.baseScale);
    applyOrigin(this.sprite, "sovereign");
    this.sprite.play("sovereign:idle");
    this.sync();
  }

  /** Chest height, so shots and the wand aim at the armor instead of the floor. */
  get y() {
    return GROUND_Y - 110;
  }
  get alive() {
    return this.state !== "dead";
  }
  get harmful() {
    return this.state === "walk" || this.state === "slash" || this.state === "shoot";
  }
  get vulnerable() {
    return this.state !== "intro" && this.state !== "dead";
  }

  hitbox(): Phaser.Geom.Rectangle {
    const reach = this.state === "slash" ? 78 : 0;
    const left = this.dir > 0 ? this.x - 40 : this.x - 40 - reach;
    return new Phaser.Geom.Rectangle(left, GROUND_Y - HEIGHT + 24, 80 + reach, HEIGHT - 30);
  }

  begin() {
    this.state = "walk";
    const now = this.scene.time.now;
    this.nextShot = now + 1000;
    this.nextDash = now + 4000;
    this.nextSlam = now + 6000;
    this.sprite.play("sovereign:walk", true);
  }

  update(time: number, delta: number) {
    if (this.state === "dead") {
      this.sync();
      return;
    }
    if (this.state !== "intro") {
      const dx = this.scene.player.x - this.x;
      this.dir = dx >= 0 ? 1 : -1;
      this.sprite.setFlipX(this.dir < 0);
      const adx = Math.abs(dx);
      const speed = this.phase === 2 ? 130 : 95;
      if (this.state === "walk") {
        const minX = this.arena.x0 + 90;
        const maxX = this.arena.x1 - 90;
        if (adx > 110) {
          this.x = Phaser.Math.Clamp(this.x + this.dir * speed * (delta / 1000), minX, maxX);
          this.sprite.play("sovereign:walk", true);
        } else this.sprite.play("sovereign:idle", true);
        // Attack selection: closest-range slam, mid-range slash, long-range shot, periodic dash
        if (adx < 130 && time > this.nextSlam) this.startSlam(time);
        else if (adx < 150 && time > this.until) this.startSlash(time);
        else if (adx > 230 && time > this.nextShot) this.startShot(time);
        else if (adx > 300 && time > this.nextDash) this.startDash(time);
      } else if (this.state === "dash") {
        // Lunge toward target
        const t = 1 - Math.max(0, this.until - time) / 450;
        this.x = Phaser.Math.Linear(this.dashFrom, this.dashTo, Math.min(1, t));
        if (time > this.until) {
          this.state = "walk";
          this.scene.cameras.main.shake(200, 0.004);
        }
      } else if (time > this.until) {
        this.state = "walk";
      }
    }
    this.sync();
  }

  private startSlash(time: number) {
    this.state = "slash";
    this.sprite.play("sovereign:attack", true);
    Audio.sfx("skeleton_swing");
    this.until = time + (this.phase === 2 ? 500 : 700);
  }

  private startShot(time: number) {
    this.state = "shoot";
    this.sprite.play("sovereign:attack", true);
    Audio.sfx("ghost_orb");
    const sp = this.phase === 2 ? 280 : 220;
    if (this.phase === 2) {
      // Triple spread: aim at player with ±15° spread
      for (const ang of [-0.26, 0, 0.26]) {
        const vx = this.dir * sp * Math.cos(ang);
        const vy = sp * Math.sin(ang) - 20;
        this.scene.spawnProjectile("fx_orb", this.x + this.dir * 64, GROUND_Y - 118, vx, vy, 0.4, 0xc59bff);
      }
      this.nextShot = time + 1700;
    } else {
      this.scene.spawnProjectile("fx_orb", this.x + this.dir * 64, GROUND_Y - 118, this.dir * sp, -20, 0.4, 0xc59bff);
      this.nextShot = time + 2000;
    }
    this.until = time + 520;
  }

  private startDash(time: number) {
    this.state = "dash";
    this.dashFrom = this.x;
    // Dash to just past the player's current position, clamped to arena
    const target = Phaser.Math.Clamp(
      this.scene.player.x + this.dir * 40,
      this.arena.x0 + 90,
      this.arena.x1 - 90
    );
    this.dashTo = target;
    this.sprite.play("sovereign:walk", true);
    Audio.sfx("skeleton_swing");
    // Telegraph flash
    this.sprite.setTintFill(0xc59bff);
    this.scene.time.delayedCall(120, () => this.sprite.clearTint());
    this.until = time + 450;
    this.nextDash = time + (this.phase === 2 ? 3500 : 5500);
  }

  private startSlam(time: number) {
    this.state = "slam";
    this.sprite.play("sovereign:attack", true);
    Audio.sfx("boss_roar");
    this.until = time + (this.phase === 2 ? 800 : 1000);
    // Delayed shockwave on both sides
    this.scene.time.delayedCall(this.phase === 2 ? 350 : 500, () => {
      if (this.state === "dead") return;
      this.scene.cameras.main.shake(300, 0.008);
      Audio.sfx("boss_roar");
      for (const s of [-1, 1]) {
        this.scene.spawnProjectile("fx_orb", this.x + s * 70, GROUND_Y - 40, s * 180, -80, 0.5, 0x9a6bff);
      }
      this.scene.fx("fx_explode", "boom", this.x, GROUND_Y - 30, 0.5, 0xb08cff);
    });
    this.nextSlam = time + (this.phase === 2 ? 5000 : 8000);
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (!this.vulnerable) return false;
    const now = this.scene.time.now;
    if (now < this.hitUntil) return false;
    this.hitUntil = now + 260;
    this.hp = Math.max(0, this.hp - amount);
    Audio.sfx("boss_hit");
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.active && this.state !== "dead" && this.sprite.clearTint());
    this.scene.onBossHp(this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    this.state = "hurt";
    this.sprite.play("sovereign:hurt", true);
    this.until = now + 320;
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.hitUntil = now + 700;
      Audio.sfx("boss_roar");
      this.scene.onBossPhase2();
    }
    return true;
  }

  private die() {
    this.state = "dead";
    this.scene.tweens.killTweensOf(this);
    this.sprite.clearTint().play("sovereign:dead", true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(600, 0.01);
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 140, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-60, 60), GROUND_Y - Phaser.Math.Between(20, 140), 0.32, 0xb08cff),
      );
    }
    this.scene.onBossDefeated();
  }

  vanish() {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 800 });
  }

  private sync() {
    this.sprite.setPosition(this.x, GROUND_Y + 4);
    this.shadow.setPosition(this.x, GROUND_Y + 6).setScale(1.15, 0.42);
  }
}
