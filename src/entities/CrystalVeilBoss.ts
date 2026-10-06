import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 228;
type Phase = 1 | 2 | 3;
type State = "intro" | "walk" | "claw" | "slam" | "shoot" | "burst" | "erupt" | "beam" | "hurt" | "stagger" | "enrage" | "dead";

export const VEIL_BOSS_NAME = "CRYSTAL VEIL";

/**
 * Crystal Veil stays on the arena floor. Every attack has a wind-up, then a
 * short damage window. Phase 2 at 60% HP, phase 3 at 30% HP.
 */
export class CrystalVeilBoss {
  readonly maxHp = 28;
  hp = this.maxHp;
  phase: Phase = 1;
  x: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private glow: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private scene: GameScene;
  private arena: { x0: number; x1: number };
  private state: State = "intro";
  private dir: 1 | -1 = -1;
  private until = 0;
  private nextShot = 0;
  private hitUntil = 0;
  private actionLock = false;
  private beam?: Phaser.GameObjects.GameObject;
  private beamZone?: Phaser.GameObjects.Rectangle;
  private spikes: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    const sc = scaleForHeight("crystalveil", HEIGHT, "idle");
    this.shadow = scene.add.image(x, GROUND_Y + 4, "shadow").setAlpha(0.42).setDepth(30).setTint(0x2a1048).setScale(1.5, 0.5);
    this.glow = scene.add.image(x, GROUND_Y - 90, "glow").setDepth(45).setTint(0xb57cff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28).setDisplaySize(220, 180);
    this.sprite = scene.add.sprite(x, GROUND_Y + 4, "crystalveil").setDepth(46).setScale(sc);
    applyOrigin(this.sprite, "crystalveil");
    this.sprite.play("crystalveil:idle");
    this.sync();
  }

  get y() {
    return GROUND_Y - 100;
  }
  get alive() {
    return this.state !== "dead";
  }
  get attacking() {
    return ["claw", "slam", "shoot", "burst", "erupt", "beam"].includes(this.state);
  }
  get harmful() {
    return this.state === "claw" || this.state === "slam" || this.state === "walk";
  }
  get vulnerable() {
    return this.state !== "intro" && this.state !== "dead" && this.state !== "enrage";
  }

  hitbox(): Phaser.Geom.Rectangle {
    const reach = this.state === "claw" ? 90 : this.state === "slam" ? 40 : 0;
    const left = this.dir > 0 ? this.x - 52 : this.x - 52 - reach;
    return new Phaser.Geom.Rectangle(left, GROUND_Y - HEIGHT + 28, 104 + reach, HEIGHT - 34);
  }

  begin() {
    this.state = "walk";
    this.nextShot = this.scene.time.now + 900;
    this.sprite.play("crystalveil:walk", true);
  }

  update(time: number, delta: number) {
    if (this.state === "dead") {
      this.sync();
      return;
    }
    if (this.state === "intro" || this.state === "enrage") {
      this.sync();
      return;
    }
    const p = this.scene.player;
    const dx = p.x - this.x;
    this.dir = dx >= 0 ? 1 : -1;
    this.sprite.setFlipX(this.dir < 0);
    const adx = Math.abs(dx);
    const speed = this.phase === 3 ? 118 : this.phase === 2 ? 92 : 68;
      if (this.state === "walk" && !this.actionLock) {
      const minX = this.arena.x0 + 110;
      const maxX = this.arena.x1 - 110;
      if (adx > 120) {
        this.x = Phaser.Math.Clamp(this.x + this.dir * speed * (delta / 1000), minX, maxX);
        if (this.sprite.anims.currentAnim?.key !== "crystalveil:walk") this.sprite.play("crystalveil:walk", true);
      } else if (this.sprite.anims.currentAnim?.key !== "crystalveil:idle") this.sprite.play("crystalveil:idle", true);
      if (adx < 160 && time > this.until) this.startClaw(time);
      else if (adx < 240 && time > this.until + 200 && Math.random() < 0.012 * this.phase) this.startSlam(time);
      else if (adx > 210 && time > this.nextShot) this.pickRanged(time, adx);
    } else if (time > this.until && this.state !== "walk") {
      this.clearHazards();
      this.state = "walk";
      this.actionLock = false;
    }
    this.glow.setAlpha((this.phase === 3 ? 0.55 : this.phase === 2 ? 0.4 : 0.26) + Math.sin(time / 180) * 0.06);
    this.sync();
  }

  private pickRanged(time: number, adx: number) {
    if (this.phase >= 3 && Math.random() < 0.35) this.startBeam(time);
    else if (this.phase >= 2 && Math.random() < 0.45) this.startBurst(time);
    else if (this.phase >= 2 && adx > 160 && Math.random() < 0.4) this.startErupt(time);
    else this.startShot(time);
  }

  private startClaw(time: number) {
    this.state = "claw";
    this.actionLock = true;
    this.sprite.play("crystalveil:claw", true);
    Audio.sfx("skeleton_swing");
    this.until = time + 920;
  }

  private startSlam(time: number) {
    this.state = "slam";
    this.actionLock = true;
    this.sprite.play("crystalveil:slam", true);
    Audio.sfx("ground_slam");
    this.scene.time.delayedCall(380, () => {
      if (this.state !== "slam") return;
      this.scene.groundSlam(this.x, GROUND_Y, this.phase === 3 ? 210 : 160);
      this.scene.spawnShockwave(this.x, 1, 0xc59bff);
      this.scene.spawnShockwave(this.x, -1, 0xc59bff);
    });
    this.until = time + 900;
  }

  private startShot(time: number) {
    this.state = "shoot";
    this.actionLock = true;
    this.sprite.play("crystalveil:shoot", true);
    Audio.sfx("ghost_orb");
    this.scene.time.delayedCall(220, () => {
      if (!this.alive) return;
      const sp = this.phase === 3 ? 320 : this.phase === 2 ? 270 : 220;
      this.scene.spawnProjectile("crystal_shot", this.x + this.dir * 70, GROUND_Y - 110, this.dir * sp, -10, 0.22);
    });
    this.nextShot = time + (this.phase === 3 ? 1100 : this.phase === 2 ? 1500 : 2100);
    this.until = time + 900;
  }

  private startBurst(time: number) {
    this.state = "burst";
    this.actionLock = true;
    this.sprite.play("crystalveil:summon", true);
    Audio.sfx("ghost_orb");
    this.scene.time.delayedCall(360, () => {
      if (!this.alive) return;
      const n = this.phase === 3 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = Phaser.Math.DegToRad(-28 + (56 * i) / Math.max(1, n - 1));
        const sp = 240 + this.phase * 20;
        this.scene.spawnProjectile("crystal_shot", this.x + this.dir * 50, GROUND_Y - 120, this.dir * Math.cos(a) * sp, Math.sin(a) * sp, 0.2);
      }
    });
    this.nextShot = time + 1800;
    this.until = time + 980;
  }

  private startErupt(time: number) {
    this.state = "erupt";
    this.actionLock = true;
    this.sprite.play("crystalveil:erupt", true);
    const px = this.scene.player.x;
    const spots = this.phase === 3 ? [px, px - 160, px + 160] : [px, px + this.dir * 180];
    for (const x of spots) this.telegraphSpike(x);
    this.nextShot = time + 1600;
    this.until = time + 1100;
  }

  private telegraphSpike(x: number) {
    const mark = this.scene.add.image(x, GROUND_Y - 8, "glow").setTint(0xff7ad9).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(70, 28).setDepth(32).setAlpha(0.2);
    this.scene.tweens.add({ targets: mark, alpha: 0.85, duration: 420, yoyo: true });
    this.scene.time.delayedCall(520, () => {
      mark.destroy();
      if (!this.alive) return;
      const s = this.scene.add.sprite(x, GROUND_Y + 4, "crystalveil_fx").setDepth(40);
      s.setScale(scaleForHeight("crystalveil_fx", 90, "spikes"));
      applyOrigin(s, "crystalveil_fx");
      s.play("crystalveil_fx:spikes");
      const zone = this.scene.add.rectangle(x, GROUND_Y - 30, 46, 70).setVisible(false);
      this.scene.hazards.add(zone);
      this.spikes.push(s, zone);
      this.scene.time.delayedCall(900, () => {
        zone.destroy();
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 220, onComplete: () => s.destroy() });
      });
    });
  }

  private startBeam(time: number) {
    this.state = "beam";
    this.actionLock = true;
    this.sprite.play("crystalveil:charge", true);
    Audio.sfx("boss_roar");
    const mark = this.scene.add.rectangle(this.x + this.dir * 320, GROUND_Y - 90, 640, 18, 0xff7ad9, 0.18).setDepth(40);
    this.scene.tweens.add({ targets: mark, alpha: 0.55, duration: 280, yoyo: true, repeat: 1 });
    this.scene.time.delayedCall(620, () => {
      mark.destroy();
      if (!this.alive || this.state !== "beam") return;
      Audio.sfx("ghost_orb");
      const beam = this.scene.add
        .image(this.x + this.dir * 300, GROUND_Y - 90, "glow")
        .setTint(0xe8b0ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(640, 56)
        .setAlpha(0.92)
        .setDepth(47);
      const zone = this.scene.add.rectangle(this.x + this.dir * 300, GROUND_Y - 90, 620, 48).setVisible(false);
      this.scene.hazards.add(zone);
      this.beam = beam;
      this.beamZone = zone;
      this.scene.time.delayedCall(700, () => {
        zone.destroy();
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 200, onComplete: () => beam.destroy() });
        this.beam = undefined;
        this.beamZone = undefined;
      });
    });
    this.nextShot = time + 2200;
    this.until = time + 1500;
  }

  takeDamage(amount: number, _kind: DamageKind, _fromX: number): boolean {
    if (!this.vulnerable) return false;
    const now = this.scene.time.now;
    if (now < this.hitUntil) return false;
    this.hitUntil = now + 240;
    this.hp = Math.max(0, this.hp - amount);
    Audio.sfx("boss_hit");
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.sprite.active && this.state !== "dead" && this.sprite.clearTint());
    this.scene.onBossHp(this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.phase === 1 && this.hp <= this.maxHp * 0.6) void this.enterPhase(2);
    else if (this.phase === 2 && this.hp <= this.maxHp * 0.3) void this.enterPhase(3);
    else {
      this.state = Math.random() < 0.35 ? "stagger" : "hurt";
      this.sprite.play(this.state === "stagger" ? "crystalveil:stagger" : "crystalveil:hurt", true);
      this.until = now + (this.state === "stagger" ? 520 : 280);
    }
    return true;
  }

  private async enterPhase(next: Phase) {
    this.phase = next;
    this.actionLock = true;
    this.state = "enrage";
    this.hitUntil = this.scene.time.now + 900;
    this.clearHazards();
    this.sprite.play("crystalveil:enrage", true);
    Audio.sfx("boss_roar");
    this.scene.onBossPhase2();
    this.scene.cameras.main.flash(280, 180, 120, 255);
    await this.scene.wait(900);
    if (!this.alive) return;
    this.state = "walk";
    this.actionLock = false;
    this.until = this.scene.time.now + 200;
  }

  private die() {
    this.state = "dead";
    this.actionLock = true;
    this.clearHazards();
    this.scene.tweens.killTweensOf(this);
    this.sprite.clearTint().play("crystalveil:dead", true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(700, 0.012);
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 120, () =>
        this.scene.fx("fx_explode", "boom", this.x + Phaser.Math.Between(-70, 70), GROUND_Y - Phaser.Math.Between(20, 150), 0.34, 0xb08cff),
      );
    }
    this.scene.onBossDefeated();
  }

  vanish() {
    this.clearHazards();
    this.scene.tweens.add({ targets: [this.sprite, this.shadow, this.glow], alpha: 0, duration: 700 });
  }

  private clearHazards() {
    this.beamZone?.destroy();
    this.beam?.destroy();
    this.beam = undefined;
    this.beamZone = undefined;
    for (const s of this.spikes) s.destroy();
    this.spikes = [];
  }

  private sync() {
    this.sprite.setPosition(this.x, GROUND_Y + 4);
    this.shadow.setPosition(this.x, GROUND_Y + 6);
    this.glow.setPosition(this.x, GROUND_Y - 90);
  }
}
