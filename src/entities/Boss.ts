import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { BossFeel, UMBRA_PALETTE } from "./bossFeel";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

type BState = "intro" | "idle" | "volley" | "rain" | "swoop" | "tired" | "slam" | "summon" | "dead" | "hurt" | "enrage";
type Attack = Exclude<BState, "intro" | "idle" | "tired" | "dead" | "hurt">;

export const BOSS_NAME = "QUEEN UMBRA";
export const HOVER_Y = GROUND_Y - 255;
const HEIGHT = 450;
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
  /** Reusable feel system (BossFeel): squash/stretch, dash FX, reactions. */
  private feel: BossFeel;
  private lowHp = false;
  /** True while the dive suppresses her aura (restored on tired / interrupt). */
  private auraOff = false;
  /** Dash connected with the player once this dive (impact fires once). */
  private dashHitPlayer = false;
  /** 5-2 only (Angelo, 2026-10-24): second bar + POV cutscene mid-fight. */
  private povCutscene: boolean;
  /** Current HP bar: 1, 2, or 3 (final stand after the cutscene). */
  private bar = 1;

  constructor(scene: GameScene, x: number, y: number, arena: { x0: number; x1: number }, povCutscene = false) {
    this.povCutscene = povCutscene;
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
    // Explicit config: swapping her sheet later means editing this object,
    // not the feel logic. Defaults cover every field not listed here.
    this.feel = new BossFeel(scene, this.sprite, this.baseScale, { palette: UMBRA_PALETTE });
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
    if (this.state === "swoop" && this.sub === 2) return new Phaser.Geom.Rectangle(this.x - 202, this.y - 76, 403, 151);
    if (this.state === "tired") return new Phaser.Geom.Rectangle(this.x - 155, GROUND_Y - 252, 310, 252);
    return new Phaser.Geom.Rectangle(this.x - 160, this.y - 225, 320, 450);
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
        // A foreign one-shot (phase-change enrage) must not freeze idle.
        if (!this.sprite.anims.isPlaying) this.sprite.play("umbra:idle", true);
        if (Math.abs(dx) < 130 && player.alive) {
          if (!this.underSince) {
            this.underSince = time;
            this.feel.react("playerClose");
          }
        } else this.underSince = 0;
        const low = this.hp > 0 && this.hp <= this.maxHp * 0.25;
        if (low !== this.lowHp) {
          this.lowHp = low;
          this.feel.lowHp = low;
        }
        if (low) this.feel.lowHpTick(time);
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
        if (!this.sprite.anims.isPlaying) this.sprite.play("umbra:hurt", true);
        if (time > this.until) {
          this.sprite.play("umbra:idle", true);
          this.scene.tweens.add({ targets: this, y: HOVER_Y, duration: 500, ease: "Sine.out" });
          // Recovery settle: hair/gown catch up after the kneel.
          this.feel.settle();
          this.enterIdle(time, 900);
        }
        break;
      case "hurt": {
        this.y += (HOVER_Y + Math.sin(time / 600) * 14 - this.y) * Math.min(1, dt * 4);
        // NOTE: `until` here was set in takeDamage from scene.time.now, so it
        // must be compared on that same clock, not the update `time` param.
        if (this.scene.time.now > this.until) this.enterIdle(time, 100);
        break;
      }
      case "slam":
        this.updateSlam(time);
        break;
      case "summon":
        if (time > this.until) this.enterIdle(time, 1000);
        break;
      case "enrage": {
        // Phase-change reaction: roar pose holds, then she resumes hunting.
        if (time > this.until) this.enterIdle(time, 900);
        break;
      }
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
    // Anticipation beat for every attack: brief compression before the move.
    this.feel.anticipate();
    // Swoop only: energy gathers on her body during the telegraph.
    if (pick === "swoop") this.feel.gatherBurst();
    if (pick === "volley" || pick === "rain" || pick === "summon") {
      // HD attack anims (2026-10-27): rain calls crystals from the sky, summon
      // plays its own motion; volley keeps cast. Summon is NOT paused — its
      // 650ms window shows most of the 8-frame motion unpaused.
      const anim = pick === "rain" ? "umbra:sky" : pick === "summon" ? "umbra:summon" : "umbra:cast";
      this.sprite.play(anim, true);
      if (pick !== "summon") this.sprite.anims.pause(this.sprite.anims.currentAnim!.frames[0]);
      Audio.sfx("boss_cast");
      this.until = time + (pick === "rain" ? 500 : pick === "summon" ? 850 : 650) / this.speed;
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
        this.scene.spawnProjectile("fx_orb", tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5, ORB_TINT, undefined, false, undefined, ORB_TINT);
      }
      Audio.sfx("ghost_orb");
      this.until = time + 850;
    } else {
      if (time > this.until) this.enterIdle(time);
      else if (!this.sprite.anims.isPlaying) this.sprite.play("umbra:cast", true);
    }
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
          this.scene.spawnProjectile("fx_orb", x, -30, 0, 620, 0.5, ORB_TINT, undefined, false, undefined, ORB_TINT);
        });
      });
      this.until = time + 1400;
    } else {
      if (time > this.until) this.enterIdle(time, 1100);
      else if (!this.sprite.anims.isPlaying) this.sprite.play("umbra:sky", true);
    }
  }

  private updateSwoop(time: number, dt: number) {
    const { x0, x1 } = this.arena;
    if (this.sub === 0) {
      // Glide to the edge she is closest to, then telegraph.
      const edge = this.x < (x0 + x1) / 2 ? x0 + 120 : x1 - 120;
      this.targetX = edge;
      this.sub = 1;
      this.sprite.play("umbra:idle", true);
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
        this.sprite.play("umbra:dash", true);
        this.feel.dashStart(this.dir);
        // The round aura dots read as floating orbs during a fast dive, so
        // they stop for the dive and return when she lands or is interrupted.
        this.aura.stop();
        this.auraOff = true;
        this.dashHitPlayer = false;
        Audio.sfx("boss_swoop");
      }
      return;
    }
    if (this.sub === 3) return; // overshoot slide: the tween drives x.
    if (this.sub === 2) {
      if (!this.sprite.anims.isPlaying) this.sprite.play("umbra:dash", true);
      this.feel.dashTick(time, this.dir);
      this.x += this.dir * 860 * this.speed * dt;
      this.y = GROUND_Y - 52;
      // Dash connect (once per dive): hit-stop + burst here; the game's
      // contact check already gives flash, shake and knockback via hurt.
      if (
        !this.dashHitPlayer &&
        this.scene.player.alive &&
        Phaser.Geom.Rectangle.Overlaps(this.hitbox(), this.scene.player.rect.getBounds())
      ) {
        this.dashHitPlayer = true;
        this.feel.dashImpact(this.scene.player.x, this.scene.player.sprite.y - 50);
      }
      const end = this.dir > 0 ? x1 - 110 : x0 + 110;
      if ((this.dir > 0 && this.x >= end) || (this.dir < 0 && this.x <= end)) {
        this.x = end;
        this.sub = 3;
        // Miss: overshoot slide instead of an instant stop, then recovery.
        this.scene.tweens.add({
          targets: this,
          x: end + this.dir * 55,
          duration: 220,
          ease: "Quad.out",
          onComplete: () => this.enterTired(time),
        });
      }
    }
  }

  /** Recovery after a dive: kneel, tired and open to stomps. */
  private enterTired(time: number): void {
    this.state = "tired";
    this.sprite.setAngle(0);
    this.feel.dashEnd();
    if (this.auraOff) {
      this.aura.start();
      this.auraOff = false;
    }
    this.feel.react("leapLand");
    this.sprite.play("umbra:hurt", true);
    this.y = GROUND_Y - 74;
    this.until = time + (this.phase === 2 ? 1500 : 2000);
    this.scene.cameras.main.shake(160, 0.006);
    this.scene.toast("She's tired: attack now!");
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 300, () => this.state === "tired" && this.scene.fx("fx_spark", "hit", this.x + Phaser.Math.Between(-30, 30), GROUND_Y - 150, 0.22, 0xffe27a));
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
        this.sprite.play("umbra:slam", true);
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
            this.feel.squash();
            this.feel.coreFlash();
          },
        });
      }
    } else if (this.sub === 3 && time > this.until) {
      this.scene.tweens.add({ targets: this, y: HOVER_Y, duration: 450, ease: "Sine.out" });
      // Recovery: a whiff reads as a settle + dust, a connected slam as a settle.
      if (Math.abs(this.scene.player.x - this.x) > 220) this.feel.react("missed");
      else this.feel.settle();
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

  takeDamage(amount: number, _kind: DamageKind, fromX: number): boolean {
    if (!this.vulnerable) return false;
    const now = this.scene.time.now;
    if (now < this.hitUntil) return false;
    this.hitUntil = now + 200;
    // A hit interrupts a dive: the suppressed aura must come back.
    if (this.auraOff) {
      this.aura.start();
      this.auraOff = false;
    }
    const prevHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    Audio.sfx("boss_hit");
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.active && this.state !== "dead" && this.sprite.clearTint());
    this.scene.onBossHp(this.hp, this.maxHp, amount);
    // Heavy = a big single hit, or crossing a half/quarter-HP boundary.
    const heavy =
      amount >= 3 ||
      (prevHp > this.maxHp / 2 && this.hp <= this.maxHp / 2) ||
      (prevHp > this.maxHp / 4 && this.hp <= this.maxHp / 4);
    this.feel.impact(heavy ? "strong" : "light");
    if (this.hp <= 0) {
      // 5-2 second bar (Angelo, 2026-10-24): the first emptying refills a
      // full second bar and she keeps fighting at phase-2 speed; the
      // second emptying holds her for the POV cutscene, and the fight
      // continues after it with a final stand (half bar). Other chapters
      // die as before.
      if (this.povCutscene && this.bar === 1) {
        this.bar = 2;
        this.hp = this.maxHp;
        this.phase = 2;
        Audio.sfx("boss_roar");
        // Phase-change reaction: enrage pose + crystal burst (flash/shake kept).
        this.sprite.setAngle(0).play("umbra:enrage", true);
        this.feel.react("phaseChange");
        this.scene.cameras.main.flash(300, 150, 90, 220);
        this.scene.cameras.main.shake(500, .008);
        this.scene.onBossHp(this.hp, this.maxHp, 0);
        return true;
      }
      if (this.povCutscene && this.bar === 2) {
        this.bar = 3;
        this.state = "intro"; // held: idle update, not vulnerable, not harmful
        this.sprite.clearTint();
        this.scene.onUmbraPovCutscene();
        return true;
      }
      this.die();
      return true;
    }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.hitUntil = now + 900;
      Audio.sfx("boss_roar");
      this.scene.onBossPhase2();
      // Phase-change reaction owns this beat: enrage pose + burst, then hunt.
      // The hurt block below skips while enraging so it cannot steal the pose.
      this.state = "enrage";
      this.sub = 0;
      this.until = now + 600;
      this.warn.setVisible(false);
      this.scene.tweens.killTweensOf(this);
      this.sprite.setAngle(0).play("umbra:enrage", true);
      this.feel.react("phaseChange");
    }
    // Hurt response (Angelo, 2026-10-24): a hit interrupts her and she visibly
    // reels instead of tanking it — hurt anim, knockback away from the attacker,
    // then she strikes back almost immediately. Tired is already a kneeling
    // response, so a hit there just deals damage without cutting the window.
    if (this.state !== "hurt" && this.state !== "tired" && this.state !== "enrage") {
      const wasAttack =
        this.state === "volley" || this.state === "rain" || this.state === "swoop" ||
        this.state === "slam" || this.state === "summon";
      this.state = "hurt";
      this.sub = 0;
      this.until = now + 500;
      this.warn.setVisible(false);
      this.scene.tweens.killTweensOf(this);
      this.sprite.setAngle(0).play("umbra:hurt", true);
      const away = this.x < fromX ? -1 : 1;
      const targetX = Phaser.Math.Clamp(this.x + away * 90, this.arena.x0 + 110, this.arena.x1 - 110);
      this.scene.tweens.add({ targets: this, x: targetX, duration: 280, ease: "Quad.out" });
      if (wasAttack) this.feel.react("interrupted");
      this.feel.recoil(away);
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
    this.feel.react("defeat");
    this.scene.cameras.main.shake(700, 0.01);
    this.scene.tweens.add({ targets: this, y: GROUND_Y - 100, duration: 900, ease: "Quad.out" });
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 160, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-70, 70), this.y + Phaser.Math.Between(-90, 60), 0.35, i % 2 ? 0xffe27a : 0xb08cff),
      );
    }
    this.scene.onBossDefeated();
  }

  /** Called by the scene when the POV cutscene ends: the fight continues
   *  with a final stand (half bar); emptying it kills her. */
  resumeAfterPov() {
    if (this.state === "dead") return;
    this.hp = Math.ceil(this.maxHp / 2);
    this.phase = 2;
    this.scene.onBossHp(this.hp, this.maxHp, 0);
    this.enterIdle(this.scene.time.now, 900);
  }

  /** Play the authored four-frame dissolve and let its purple fragments rise away. */
  async playDeath() {
    this.warn.setVisible(false);
    this.aura.stop();
    this.sprite.setAlpha(1).play("umbra:dead", true);
    const ashes = this.scene.add
      .particles(this.x, this.y, "dot", {
        x: { min: -80, max: 80 },
        y: { min: -90, max: 80 },
        speedY: { min: -155, max: -45 },
        speedX: { min: -55, max: 55 },
        lifespan: { min: 900, max: 1800 },
        scale: { start: 0.75, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xe0b8ff, 0xb57cff, 0x6a2fb0],
        frequency: 45,
      })
      .setDepth(46);
    for (let i = 0; i < 12; i++) {
      this.scene.time.delayedCall(i * 105, () => {
        this.scene.fx("fx_spark", "hit", this.x + Phaser.Math.Between(-72, 72), this.y + Phaser.Math.Between(-105, 65), 0.28, i % 2 ? 0xe0b8ff : 0x8b4dcc);
      });
    }
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, scaleX: 3.1, scaleY: 0.35, duration: 1250, ease: "Sine.easeOut" });
    await this.scene.wait(1050);
    this.scene.tweens.add({ targets: this, y: this.y - 26, duration: 850, ease: "Sine.easeIn" });
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 850, ease: "Sine.easeIn" });
    await this.scene.wait(850);
    ashes.stop();
    this.scene.time.delayedCall(1800, () => ashes.destroy());
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
