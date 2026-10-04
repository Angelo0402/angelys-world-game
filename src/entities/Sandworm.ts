import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import { WORM_PHASE } from "../story/worm";
import type { DamageKind } from "./Enemy";

type WState = "intro" | "idle" | "spit" | "lunge" | "burrow" | "dead";

const HEIGHT = 250;

/**
 * The dune worm lives under the sand. It rears up, spits, lunges, then dives and
 * bursts out somewhere else. While it is underground it cannot be hit.
 */
export class Sandworm {
  readonly maxHp = 16;
  hp = this.maxHp;
  phase: 1 | 2 = 1;
  state: WState = "intro";
  x: number;
  y = GROUND_Y + 4;
  dir: 1 | -1 = -1;
  readonly sprite: Phaser.GameObjects.Sprite;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private until = 0;
  private hitUntil = 0;
  private risen = false;
  private bob = 0;

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.sprite = scene.add.sprite(x, this.y, "sandworm").setDepth(45);
    this.sprite.setScale(scaleForHeight("sandworm", HEIGHT, "idle"));
    applyOrigin(this.sprite, "sandworm");
    this.sprite.play("sandworm:rise");
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key === "sandworm:rise" && this.state === "intro") this.risen = true;
    });
  }

  get alive() {
    return this.state !== "dead";
  }

  get harmful() {
    return this.risen && this.state !== "dead" && this.state !== "burrow";
  }

  get vulnerable() {
    return this.risen && this.state !== "intro" && this.state !== "dead" && this.state !== "burrow";
  }

  hitbox() {
    if (!this.harmful) return new Phaser.Geom.Rectangle(0, 0, 0, 0);
    const left = this.dir < 0 ? this.x - 140 : this.x - 40;
    return new Phaser.Geom.Rectangle(left, GROUND_Y - HEIGHT + 10, 190, HEIGHT);
  }

  begin() {
    this.risen = true;
    this.state = "idle";
    this.sprite.play("sandworm:idle", true);
    this.until = this.scene.time.now + 700;
    this.facePlayer();
  }

  update(time: number, delta: number) {
    if (this.state === "dead") {
      this.sprite.setPosition(this.x, this.y);
      return;
    }
    this.bob += delta;
    const dt = Math.min(delta, 50) / 1000;
    if (this.state === "lunge" || this.state === "idle") {
      this.facePlayer();
      const step = (this.state === "lunge" ? (this.phase === 2 ? 280 : 210) : 48) * dt;
      const goal = Phaser.Math.Clamp(this.scene.player.x + this.dir * -80, this.arena.x0 + 90, this.arena.x1 - 90);
      this.x += Math.sign(goal - this.x) * Math.min(step, Math.abs(goal - this.x));
    }
    const wave = Math.sin(this.bob * 0.007);
    const thrash = this.risen && this.state !== "burrow" && this.state !== "intro";
    this.sprite.setPosition(this.x, this.y + (thrash ? wave * 14 : 0));
    this.sprite.setFlipX(this.dir > 0);
    if (thrash && (this.state === "idle" || this.state === "lunge")) this.sprite.setAngle(wave * 10);
    else this.sprite.setAngle(0);
    if (this.state === "intro" || time < this.until) return;
    if (this.state === "idle") this.pick(time);
    else if (this.state === "spit" || this.state === "lunge") {
      if (Math.random() < 0.45) this.burrow(time);
      else this.rest(time);
    } else if (this.state === "burrow") this.pop(time);
  }

  private rest(time: number) {
    this.state = "idle";
    this.sprite.play("sandworm:idle", true);
    this.until = time + (this.phase === 2 ? 900 : 1300);
  }

  private facePlayer() {
    this.dir = this.scene.player.x < this.x ? -1 : 1;
    this.sprite.setFlipX(this.dir > 0);
  }

  private pick(time: number) {
    this.facePlayer();
    const roll = Math.random();
    if (roll < 0.34) this.spit(time);
    else if (roll < 0.58) this.rain(time);
    else if (roll < 0.8) this.slam(time);
    else this.lunge(time);
  }

  /** Shots aimed at Angely, including when she is pinned in the left corner. */
  private spit(time: number) {
    this.state = "spit";
    this.sprite.play("sandworm:spit", true);
    Audio.sfx("boss_cast");
    const n = this.phase === 2 ? 2 : 2;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(120 + i * 160, () => {
        if (this.state === "dead") return;
        const fromY = GROUND_Y - HEIGHT * 0.62;
        const p = this.scene.player;
        const tx = p.x;
        const ty = p.body.center.y;
        const ang = Math.atan2(ty - fromY, tx - this.x);
        const sp = this.phase === 2 ? 340 : 280;
        this.scene.spawnProjectile("fx_orb", this.x, fromY, Math.cos(ang) * sp, Math.sin(ang) * sp, 0.55, 0xe6b15a);
        this.scene.fx("fx_dust", "puff", this.x, fromY, 0.35, 0xf0d29a);
      });
    }
    this.until = time + 200 + n * 160;
  }

  /** Sand falls across the whole arena, left corner included. */
  private rain(time: number) {
    this.state = "spit";
    this.sprite.play("sandworm:spit", true);
    Audio.sfx("boss_roar");
    const marks = this.phase === 2 ? [200, 640, 1080] : [320, 960];
    marks.forEach((x, i) => {
      this.scene.time.delayedCall(80 + i * 90, () => {
        if (this.state === "dead") return;
        this.scene.spawnProjectile("fx_dust", x, 30, 0, 280, 0.4, 0xf0d29a);
      });
    });
    this.until = time + 700 + marks.length * 90;
  }

  /** A sand wave runs the full floor, both ways, so no corner is safe. */
  private slam(time: number) {
    this.state = "lunge";
    this.sprite.play("sandworm:spit", true);
    Audio.sfx("ground_slam");
    this.scene.cameras.main.shake(220, 0.01);
    this.scene.spawnShockwave(this.x, this.dir, 0xe6b15a);
    this.until = time + 1100;
  }

  private lunge(time: number) {
    this.state = "lunge";
    this.facePlayer();
    this.sprite.play("sandworm:rise", true);
    Audio.sfx("boss_swoop");
    this.until = time + (this.phase === 2 ? 700 : 800);
  }

  private burrow(time: number) {
    this.state = "burrow";
    this.risen = false;
    this.sprite.play("sandworm:dive", true);
    Audio.sfx("crumble");
    this.scene.fx("fx_dust", "puff", this.x, GROUND_Y, 0.7, 0xe6c27a);
    this.until = time + 1100;
  }

  private pop(time: number) {
    const px = this.scene.player.x;
    const side = px < this.arena.x0 + 220 ? 1 : -1;
    this.x = Phaser.Math.Clamp(px + side * 220, this.arena.x0 + 120, this.arena.x1 - 120);
    this.facePlayer();
    this.sprite.play("sandworm:rise", true);
    Audio.sfx("boss_roar");
    this.scene.cameras.main.shake(280, 0.008);
    this.scene.fx("fx_dust", "puff", this.x, GROUND_Y, 0.8, 0xe6c27a);
    this.state = "idle";
    this.until = time + 500;
    this.scene.time.delayedCall(420, () => {
      if (this.state !== "dead") this.risen = true;
    });
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (!this.vulnerable) return false;
    const now = this.scene.time.now;
    if (now < this.hitUntil) return false;
    this.hitUntil = now + 220;
    this.hp = Math.max(0, this.hp - amount);
    Audio.sfx("boss_hit");
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.sprite.active && this.state !== "dead" && this.sprite.clearTint());
    this.scene.onBossHp(this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    this.sprite.play("sandworm:hurt", true);
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      Audio.sfx("boss_roar");
      this.scene.game.events.emit("hud:subtitle", WORM_PHASE[0]);
    }
    return true;
  }

  private die() {
    this.state = "dead";
    this.risen = false;
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(800, 0.012);
    this.sprite.play("sandworm:dive", true);
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 120, () => this.scene.fx("fx_dust", "puff", this.x + Phaser.Math.Between(-120, 80), GROUND_Y, 0.6, 0xe6c27a));
    }
    this.scene.time.delayedCall(700, () => this.scene.onBossDefeated());
  }

  vanish() {
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, y: this.y + 40, duration: 500 });
  }
}
