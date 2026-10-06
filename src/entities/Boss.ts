import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

type BState = "intro" | "idle" | "volley" | "rain" | "swoop" | "tired" | "slam" | "summon" | "dead";
type Attack = Exclude<BState, "intro" | "idle" | "tired" | "dead">;

export const BOSS_NAME = "QUEEN UMBRA";
export const HOVER_Y = GROUND_Y - 205;
const HEIGHT = 230;
const ORB_TINT = 0xd9a6ff;

/**
 * Queen Umbra floats over the arena and cycles through telegraphed attacks:
 * orb volleys, an orb rain with ground markers, a low swoop to jump over (after
 * which she kneels, tired and open to stomps), a ground slam with shockwaves and
 * minion summons. Below half health she speeds up and fires more orbs.
 */
export class Boss {
  readonly maxHp = 26;
  hp = this.maxHp;
  phase: 1 | 2 = 1;
  state: BState = "intro";
  x: number;
  y: number;
  dir: 1 | -1 = -1;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Particles.ParticleEmitter;
  private warn: Phaser.GameObjects.Text;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private until = 0;
  private stepAt = 0;
  private sub = 0;
  private hitUntil = 0;
  private last: Attack | null = null;
  private targetX = 0;
  private count = 0;
  private baseScale: number;
  private underSince = 0;

  constructor(scene: GameScene, x: number, y: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.y = y;
    this.baseScale = scaleForHeight("umbra", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 2, "shadow").setAlpha(0.35).setDepth(30).setTint(0x2a0f4a);
    this.aura = scene.add
      .particles(0, 0, "dot", {
        x: { min: -40, max: 40 },
        y: { min: 40, max: 100 },
        speedY: { min: 10, max: 50 },
        speedX: { min: -20, max: 20 },
        lifespan: 900,
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: [0x3a1466, 0x6a2fb0, 0x1a0830],
        frequency: 45,
      })
      .setDepth(44);
    this.sprite = scene.add.sprite(x, y, "umbra").setDepth(45).setScale(this.baseScale);
    applyOrigin(this.sprite, "umbra");
    this.sprite.play("umbra:idle");
    this.warn = scene.add
      .text(x, y, "!", { fontFamily: "Trebuchet MS", fontSize: "54px", fontStyle: "bold", color: "#ff5ad1", stroke: "#1b0f2e", strokeThickness: 8 })
      .setOrigin(0.5, 1)
      .setDepth(95)
      .setVisible(false);
    this.sync();
  }

  get alive() {
    return this.state !== "dead";
  }

  /** Touching her hurts, except while she kneels after a swoop. */
  get harmful() {
    return this.state !== "intro" && this.state !== "dead" && this.state !== "tired";
  }

  get vulnerable() {
    return this.state !== "intro" && this.state !== "dead";
  }

  hitbox(): Phaser.Geom.Rectangle {
    if (this.state === "swoop" && this.sub === 2) return new Phaser.Geom.Rectangle(this.x - 100, this.y - 42, 200, 84);
    if (this.state === "tired") return new Phaser.Geom.Rectangle(this.x - 60, GROUND_Y - 140, 120, 140);
    return new Phaser.Geom.Rectangle(this.x - 48, this.y - 95, 96, 190);
  }

  private get speed() {
    return this.phase === 2 ? 1.35 : 1;
  }

  begin() {
    this.enterIdle(this.scene.time.now, 900);
  }

  private enterIdle(time: number, ms = 800) {
    this.state = "idle";
    this.sub = 0;
    this.until = time + ms / this.speed;
    const mid = (this.arena.x0 + this.arena.x1) / 2;
    const px = this.scene.player.x;
    this.targetX = px < mid ? this.arena.x1 - 230 - Math.random() * 160 : this.arena.x0 + 230 + Math.random() * 160;
    this.sprite.setAngle(0).play("umbra:idle", true);
  }

  update(time: number, delta: number) {
    if (this.state === "dead" || this.state === "intro") {
      this.sync();
      return;
    }
    const dt = Math.min(delta, 50) / 1000;
    const player = this.scene.player;
    const dx = player.x - this.x;
    if (this.state !== "swoop") this.dir = dx < 0 ? -1 : 1;

    switch (this.state) {
      case "idle": {
        this.x += (this.targetX - this.x) * Math.min(1, dt * 2.2);
        this.y += (HOVER_Y + Math.sin(time / 600) * 14 - this.y) * Math.min(1, dt * 4);
        if (Math.abs(dx) < 130 && player.alive) {
          if (!this.underSince) this.underSince = time;
        } else this.underSince = 0;
        if (time > this.until || (this.underSince && time - this.underSince > 700)) this.chooseAttack(time);
        break;
      }
      case "volley":
        this.updateVolley(time);
        break;
      case "rain":
        this.updateRain(time);
        break;
      case "swoop":
        this.updateSwoop(time, dt);
        break;
      case "tired":
        if (time > this.until) {
          this.sprite.play("umbra:idle", true);
          this.scene.tweens.add({ targets: this, y: HOVER_Y, duration: 500, ease: "Sine.out" });
          this.enterIdle(time, 900);
        }
        break;
      case "slam":
        this.updateSlam(time);
        break;
      case "summon":
        if (time > this.until) this.enterIdle(time, 1000);
        break;
    }
    this.sync();
  }

  private chooseAttack(time: number) {
    this.underSince = 0;
    const close = Math.abs(this.scene.player.x - this.x) < 170;
    const weights: [Attack, number][] = [
      ["volley", 3],
      ["rain", this.phase === 2 ? 3 : 2],
      ["swoop", 2.5],
      ["slam", close ? 5 : 1],
      ["summon", this.count % 4 === 3 && this.scene.enemies.length < 2 ? 4 : 0],
    ];
    const pool = weights.filter(([a, w]) => w > 0 && a !== this.last);
    let roll = Math.random() * pool.reduce((s, [, w]) => s + w, 0);
    let pick: Attack = pool[0][0];
    for (const [a, w] of pool) {
      roll -= w;
      if (roll <= 0) {
        pick = a;
        break;
      }
    }
    this.last = pick;
    this.count++;
    this.state = pick;
    this.sub = 0;
    this.stepAt = time;
    if (pick === "volley" || pick === "rain" || pick === "summon") {
      this.sprite.play("umbra:cast", true);
      this.sprite.anims.pause(this.sprite.anims.currentAnim!.frames[0]);
      Audio.sfx("boss_cast");
      this.until = time + (pick === "rain" ? 500 : 650) / this.speed;
      if (pick === "summon") this.summon(time);
    }
  }

  private staffTip() {
    return { x: this.x + this.dir * 62, y: this.y - 70 };
  }

  private updateVolley(time: number) {
    if (this.sub === 0) {
      if (Math.floor(time / 80) % 2) this.scene.fx("fx_spark", "hit", this.staffTip().x, this.staffTip().y, 0.2, 0xc58bff);
      if (time < this.until) return;
      this.sub = 1;
      this.sprite.anims.resume();
      const tip = this.staffTip();
      const p = this.scene.player;
      const base = Math.atan2(p.body.center.y - tip.y, p.x - tip.x);
      const n = this.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.24;
        const sp = 330 * this.speed;
        this.scene.spawnProjectile("fx_orb", tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5, ORB_TINT);
      }
      Audio.sfx("ghost_orb");
      this.until = time + 650;
    } else if (time > this.until) this.enterIdle(time);
  }

  private updateRain(time: number) {
    if (this.sub === 0) {
      if (time < this.until) return;
      this.sub = 1;
      this.sprite.anims.resume();
      const { x0, x1 } = this.arena;
      const n = this.phase === 2 ? 7 : 5;
      const xs = [Phaser.Math.Clamp(this.scene.player.x, x0 + 60, x1 - 60)];
      for (let tries = 0; xs.length < n && tries < 80; tries++) {
        const x = Phaser.Math.Between(x0 + 70, x1 - 70);
        if (xs.every((o) => Math.abs(o - x) > 130)) xs.push(x);
      }
      xs.forEach((x, i) => {
        const delay = i * 120;
        const mark = this.scene.add.ellipse(x, GROUND_Y + 2, 90, 20, 0xff5ad1, 0.0).setDepth(29).setStrokeStyle(3, 0xff9ae6, 0.9);
        this.scene.tweens.add({ targets: mark, fillAlpha: 0.45, scaleX: { from: 0.4, to: 1 }, duration: 260, delay, yoyo: true, repeat: 1 });
        this.scene.time.delayedCall(delay + 760, () => {
          mark.destroy();
          this.scene.spawnProjectile("fx_orb", x, -30, 0, 620, 0.5, ORB_TINT);
        });
      });
      this.until = time + 1400;
    } else if (time > this.until) this.enterIdle(time, 1100);
  }

  private updateSwoop(time: number, dt: number) {
    const { x0, x1 } = this.arena;
    if (this.sub === 0) {
      // Glide to the edge she is closest to, then telegraph.
      const edge = this.x < (x0 + x1) / 2 ? x0 + 120 : x1 - 120;
      this.targetX = edge;
      this.sub = 1;
      this.until = time + 900 / this.speed;
      this.warn.setVisible(true);
      Audio.sfx("enemy_telegraph");
    }
    if (this.sub === 1) {
      this.x += (this.targetX - this.x) * Math.min(1, dt * 4);
      this.y += (GROUND_Y - 52 - this.y) * Math.min(1, dt * 3);
      this.dir = this.x < (x0 + x1) / 2 ? 1 : -1;
      this.sprite.setAngle(this.dir * 78 * Math.min(1, 1 - (this.until - time) / 900));
      this.sprite.setTint(Math.floor(time / 90) % 2 ? 0xff9ae6 : 0xffffff);
      if (time > this.until) {
        this.sub = 2;
        this.warn.setVisible(false);
        this.sprite.clearTint();
        Audio.sfx("boss_swoop");
      }
      return;
    }
    if (this.sub === 2) {
      this.x += this.dir * 860 * this.speed * dt;
      this.y = GROUND_Y - 52;
      if (Math.floor(time / 40) % 2) this.scene.fx("fx_dust", "puff", this.x - this.dir * 80, GROUND_Y, 0.25, 0xb08cff);
      const end = this.dir > 0 ? x1 - 110 : x0 + 110;
      if ((this.dir > 0 && this.x >= end) || (this.dir < 0 && this.x <= end)) {
        this.x = end;
        this.state = "tired";
        this.sprite.setAngle(0);
        this.sprite.play("umbra:dead", true);
        this.sprite.anims.pause(this.sprite.anims.currentAnim!.frames[0]);
        this.y = GROUND_Y - 74;
        this.until = time + (this.phase === 2 ? 1500 : 2000);
        this.scene.cameras.main.shake(160, 0.006);
        this.scene.toast("She's tired: attack now!");
        for (let i = 0; i < 5; i++) {
          this.scene.time.delayedCall(i * 300, () => this.state === "tired" && this.scene.fx("fx_spark", "hit", this.x + Phaser.Math.Between(-30, 30), GROUND_Y - 150, 0.22, 0xffe27a));
        }
      }
    }
  }

  private updateSlam(time: number) {
    const t = time - this.stepAt;
    if (this.sub === 0) {
      this.warn.setVisible(true);
      this.sub = 1;
      this.until = time + 520 / this.speed;
      Audio.sfx("enemy_telegraph");
    }
    if (this.sub === 1) {
      this.sprite.setTint(Math.floor(time / 80) % 2 ? 0xff9ae6 : 0xffffff);
      this.y = HOVER_Y - Math.min(1, t / 400) * 40;
      if (time > this.until) {
        this.sub = 2;
        this.warn.setVisible(false);
        this.sprite.clearTint();
        this.scene.tweens.add({
          targets: this,
          y: GROUND_Y - 112,
          duration: 170,
          ease: "Quad.in",
          onComplete: () => {
            if (this.state !== "slam") return;
            Audio.sfx("ground_slam");
            this.scene.cameras.main.shake(260, 0.012);
            this.scene.spawnShockwave(this.x - 40, -1);
            this.scene.spawnShockwave(this.x + 40, 1);
            if (this.phase === 2) this.scene.time.delayedCall(420, () => this.state !== "dead" && (this.scene.spawnShockwave(this.x - 40, -1), this.scene.spawnShockwave(this.x + 40, 1)));
            this.until = this.scene.time.now + 700;
            this.sub = 3;
          },
        });
      }
    } else if (this.sub === 3 && time > this.until) {
      this.scene.tweens.add({ targets: this, y: HOVER_Y, duration: 450, ease: "Sine.out" });
      this.enterIdle(time, 900);
    }
  }

  private summon(time: number) {
    const { x0, x1 } = this.arena;
    const kinds = this.phase === 2 ? ["skeleton", "ghost", "frostwolf"] : ["skeleton", "ghost"];
    kinds.slice(0, 3 - this.scene.enemies.length).forEach((k, i) => {
      this.scene.time.delayedCall(250 + i * 250, () => {
        if (this.state === "dead") return;
        const x = i % 2 ? x1 - 90 : x0 + 90;
        const flying = k === "ghost";
        this.scene.fx("fx_explode", "boom", x, flying ? GROUND_Y - 220 : GROUND_Y - 50, 0.35, 0xb08cff);
        this.scene.spawnEnemy(k, x, flying ? GROUND_Y - 220 : GROUND_Y - 60);
      });
    });
    this.until = time + 1100;
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (!this.vulnerable) return false;
    const now = this.scene.time.now;
    if (now < this.hitUntil) return false;
    this.hitUntil = now + 200;
    this.hp = Math.max(0, this.hp - amount);
    Audio.sfx("boss_hit");
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.active && this.state !== "dead" && this.sprite.clearTint());
    this.scene.onBossHp(this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.hitUntil = now + 900;
      Audio.sfx("boss_roar");
      this.scene.onBossPhase2();
    }
    return true;
  }

  private die() {
    this.state = "dead";
    this.warn.setVisible(false);
    this.scene.tweens.killTweensOf(this);
    this.sprite.setAngle(0).clearTint();
    this.sprite.play("umbra:hurt", true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(700, 0.01);
    this.scene.tweens.add({ targets: this, y: GROUND_Y - 100, duration: 900, ease: "Quad.out" });
    this.scene.time.delayedCall(600, () => this.sprite.play("umbra:dead", true));
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 160, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-70, 70), this.y + Phaser.Math.Between(-90, 60), 0.35, i % 2 ? 0xffe27a : 0xb08cff),
      );
    }
    this.scene.time.delayedCall(1700, () => this.aura.stop());
    this.scene.onBossDefeated();
  }

  /** Fade out entirely (after the farewell lines). */
  vanish() {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 900 });
    this.aura.stop();
  }

  private sync() {
    const s = this.sprite;
    s.setPosition(this.x, this.y);
    s.setFlipX(this.dir < 0);
    this.aura.setPosition(this.x, this.y);
    this.warn.setPosition(this.x, this.y - (SPRITES.umbra.anims.idle.h * this.baseScale) / 2 - 10);
    const gap = Math.max(0, GROUND_Y - (this.y + 95));
    const k = Phaser.Math.Clamp(1 - gap / 320, 0.4, 1);
    this.shadow.setPosition(this.x, GROUND_Y + 2).setScale(2.2 * k, 1 * k).setAlpha(0.4 * k);
  }
}
