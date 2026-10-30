import Phaser from "phaser";
import type { GameScene } from "../scenes/GameScene";
import { GROUND_Y } from "../config";

/**
 * Reusable boss animation / reaction / VFX system (Angelo, 2026-10-27).
 *
 * Rules it enforces (from the task brief):
 * - The sprite stays clean. Wind lines, trails, glows, shakes and flashes are
 *   Phaser runtime effects, never baked into the artwork.
 * - Body leads, secondary motion follows: squash & stretch, overshoot and a
 *   damped settle stand in for per-part lag (the sheets are single-layer, so
 *   true hair/cloth lag would need layered art — that is future work, not
 *   something to fake by covering the sprite in particles).
 * - Readability before spectacle: light feedback for light hits, strong
 *   feedback only for strong hits. Existing GameScene helpers (hitStop,
 *   spawnShockwave) are reused, never duplicated.
 * - Palette is the boss's own. Umbra's default below is violet / magenta /
 *   dark purple with a red-core accent; other bosses pass their own palette.
 *
 * Reaction model: BossFeel owns VFX + body tweens only. It NEVER steals the
 * sprite's animation except through the boss's own state machine — react()
 * plays no anims. The boss chooses anims; feel adds the motion around them.
 * Events with no clean gameplay hook yet (parried, blocked, playerEscape)
 * are reserved API: calling them is safe and does nothing until wired.
 */
export type BossReaction =
  | "damage"
  | "heavyDamage"
  | "interrupted"
  | "missed"
  | "playerClose"
  | "playerEscape"
  | "phaseChange"
  | "lowHealth"
  | "enrage"
  | "stun"
  | "knockback"
  | "leapLand"
  | "recover"
  | "defeat"
  | "parried"
  | "blocked";

export interface BossPalette {
  deep: number;
  violet: number;
  light: number;
  magenta: number;
  core: number;
}

/** Queen Umbra's visual language. No blue, no green, no unrelated colors. */
export const UMBRA_PALETTE: BossPalette = {
  deep: 0x3a1466,
  violet: 0x8b4dcc,
  light: 0xd9a6ff,
  magenta: 0xff5ad1,
  core: 0xff2d55,
};

/**
 * Per-character tuning. This is the ONLY place a boss differs: the system
 * never reads frame counts, cell dimensions, or animation names, so swapping
 * a sprite sheet later means changing this config, not the logic.
 */
export interface FeelConfig {
  palette?: BossPalette;
  quality?: "high" | "medium" | "low";
  ghostCap?: number;
  ghostLife?: number;
  ghostEvery?: number;
  streakEvery?: number;
  fragEvery?: number;
  hitStopLight?: number;
  hitStopStrong?: number;
  dashHitStop?: number;
  impactShakeMs?: number;
  impactShakeAmp?: number;
  phaseShakeMs?: number;
  phaseShakeAmp?: number;
  zoomAmount?: number;
  lowHpPuffEvery?: number;
}

export class BossFeel {
  /** Set by the boss when HP drops to the low-health band. Drives puffs only. */
  lowHp = false;

  /**
   * Visual quality only — gameplay is identical at every level.
   * high: full effects. medium: ~60% counts, slower trails. low: no trail
   * ghosts or streaks, minimal bursts. Default high.
   */
  quality: "high" | "medium" | "low" = "high";

  private bodyTween: Phaser.Tweens.Tween | null = null;
  private ghosts: Phaser.GameObjects.Image[] = [];
  private dashing = false;
  private trailAt = 0;
  private streakAt = 0;
  private fragAt = 0;
  private lowAt = 0;

  private scene: GameScene;
  private sprite: Phaser.GameObjects.Sprite;
  private baseScale: number;
  private palette: BossPalette;
  private ghostCap: number;
  private ghostLife: number;
  private ghostEvery: number;
  private streakEvery: number;
  private fragEvery: number;
  private hitStopLight: number;
  private hitStopStrong: number;
  private dashHitStop: number;
  private impactShakeMs: number;
  private impactShakeAmp: number;
  private phaseShakeMs: number;
  private phaseShakeAmp: number;
  private zoomAmount: number;
  private lowHpPuffEvery: number;

  constructor(scene: GameScene, sprite: Phaser.GameObjects.Sprite, baseScale: number, config: FeelConfig = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.baseScale = baseScale;
    this.palette = config.palette ?? UMBRA_PALETTE;
    this.quality = config.quality ?? "high";
    const q = this.quality;
    this.ghostCap = config.ghostCap ?? 4;
    this.ghostLife = config.ghostLife ?? 220;
    this.ghostEvery = config.ghostEvery ?? (q === "high" ? 60 : q === "medium" ? 120 : Number.POSITIVE_INFINITY);
    this.streakEvery = config.streakEvery ?? (q === "high" ? 160 : q === "medium" ? 320 : Number.POSITIVE_INFINITY);
    this.fragEvery = config.fragEvery ?? 180;
    this.hitStopLight = config.hitStopLight ?? 40;
    this.hitStopStrong = config.hitStopStrong ?? 70;
    this.dashHitStop = config.dashHitStop ?? 60;
    this.impactShakeMs = config.impactShakeMs ?? 150;
    this.impactShakeAmp = config.impactShakeAmp ?? 0.008;
    this.phaseShakeMs = config.phaseShakeMs ?? 300;
    this.phaseShakeAmp = config.phaseShakeAmp ?? 0.008;
    this.zoomAmount = config.zoomAmount ?? 1.05;
    this.lowHpPuffEvery = config.lowHpPuffEvery ?? (q === "high" ? 700 : q === "medium" ? 1000 : 1400);
  }

  // ---- Body motion: squash & stretch, overshoot, settle -------------------
  // sync() repositions the sprite every frame but never touches scale or
  // angle, so scale tweens here are safe. Only the stored body tween is ever
  // stopped, so unrelated sprite tweens (death fades) are never killed.

  private bodyTo(sx: number, sy: number, ms: number, ease: string, onDone?: () => void): void {
    this.bodyTween?.stop();
    this.bodyTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * sx,
      scaleY: this.baseScale * sy,
      duration: ms,
      ease,
      onComplete: () => {
        this.bodyTween = null;
        onDone?.();
      },
    });
  }

  private restore(ms: number, ease = "Back.out(2)"): void {
    this.bodyTo(1, 1, ms, ease);
  }

  /** Anticipation: brief compression before an attack, then release. */
  anticipate(): void {
    this.bodyTo(1.07, 0.92, 130, "Quad.out", () => this.restore(170));
  }

  /** Landing compression: squash on impact, then recover. */
  squash(): void {
    this.bodyTo(1.08, 0.9, 120, "Quad.out", () => this.restore(190));
  }

  /** Overshoot after a fast move: stretch past neutral, then settle. */
  overshoot(): void {
    this.bodyTo(0.94, 1.08, 120, "Quad.out", () => this.settle());
  }

  /** Damped settle: the "secondary elements catch up" beat after an action. */
  settle(): void {
    this.bodyTo(1.03, 0.97, 90, "Sine.out", () => this.restore(150, "Sine.out"));
  }

  /** Small lean away from the attacker on a hit. Resets via the boss's idle. */
  recoil(away: 1 | -1): void {
    this.scene.tweens.add({
      targets: this.sprite,
      angle: away * -6,
      duration: 90,
      ease: "Quad.out",
    });
  }

  // ---- Dash presentation ---------------------------------------------------
  // Streaks + afterimage trail + sparks are spawned by the boss's dash state
  // each frame; they fade on their own, so a dropped frame never sticks.

  private streak(dir: 1 | -1, yOff = 0, len = 1.8): void {
    const img = this.scene.add
      .image(this.sprite.x - dir * 30, this.sprite.y + yOff, "feel_streak")
      .setDepth(this.sprite.depth - 1)
      .setAlpha(0.9)
      .setTint(this.palette.magenta)
      .setScale(len, 1);
    img.setRotation(dir > 0 ? 0 : Math.PI);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: 0.6,
      duration: 180,
      onComplete: () => img.destroy(),
    });
  }

  /** Dark afterimage: dark interior against the purple background, so the
   *  bright magenta streaks — not the echo — carry the speed read. */
  private trailGhost(): void {
    if (this.ghosts.length >= this.ghostCap) return;
    const g = this.scene.add
      .image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name)
      .setDepth(this.sprite.depth - 1)
      .setScale(this.sprite.scaleX, this.sprite.scaleY)
      .setFlipX(this.sprite.flipX)
      .setAngle(this.sprite.angle)
      .setAlpha(0.55)
      .setTint(this.palette.deep);
    this.ghosts.push(g);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: this.ghostLife,
      onComplete: () => {
        g.destroy();
        this.ghosts = this.ghosts.filter((o) => o !== g);
      },
    });
  }

  /** Narrow crystal fragment flying backward (dash exhaust, never random). */
  private fragmentBack(dir: 1 | -1): void {
    const img = this.scene.add
      .image(this.sprite.x - dir * (50 + Math.random() * 40), this.sprite.y + (Math.random() - 0.5) * 60, "feel_crystal")
      .setDepth(this.sprite.depth + 1)
      .setTint(Math.random() < 0.5 ? this.palette.violet : this.palette.magenta)
      .setScale(0.7)
      .setAlpha(0.95);
    this.scene.tweens.add({
      targets: img,
      x: img.x - dir * (150 + Math.random() * 60),
      y: img.y + (Math.random() - 0.5) * 120,
      alpha: 0,
      scale: 0.3,
      duration: 350,
      ease: "Quad.out",
      onComplete: () => img.destroy(),
    });
  }

  /** Call once when a dash dive starts. Explosive launch beat. */
  dashStart(dir: 1 | -1): void {
    this.dashing = true;
    this.streak(dir, -35, 2.4);
    this.streak(dir, 25, 2.0);
    this.trailGhost();
    this.burstBack(dir, 5);
  }

  /** Call every frame while diving. dir is the boss's facing. Self-arms so a
   *  dive entered without dashStart() still trails (never silent). */
  dashTick(now: number, dir: 1 | -1): void {
    this.dashing = true;
    if (now - this.trailAt > this.ghostEvery) {
      this.trailAt = now;
      this.trailGhost();
    }
    if (now - this.streakAt > this.streakEvery) {
      this.streakAt = now;
      this.streak(dir, -35, 2.4);
      this.streak(dir, 25, 2.0);
    }
    if (now - this.fragAt > this.fragEvery) {
      this.fragAt = now;
      this.fragmentBack(dir);
    }
  }

  /** Call once when the dash ends (land / interrupt / death). */
  dashEnd(): void {
    if (!this.dashing) return;
    this.dashing = false;
  }

  // ---- Bursts, rings, impact ----------------------------------------------

  /** Crystal-fragment burst around the sprite (phase change, defeat, ...). */
  burst(n = 10): void {
    this.burstAt(this.sprite.x, this.sprite.y, n);
  }

  /** Same burst at an arbitrary point (dash impact on the player, ...). */
  burstAt(x: number, y: number, n = 10): void {
    const total = Math.max(1, Math.round(n * (this.quality === "high" ? 1 : this.quality === "medium" ? 0.6 : 0.3)));
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 + Math.random() * 0.5;
      const d = 60 + Math.random() * 90;
      const img = this.scene.add
        .image(x, y, "feel_crystal")
        .setDepth(this.sprite.depth + 1)
        .setTint(i % 2 ? this.palette.light : this.palette.violet)
        .setScale(0.9);
      this.scene.tweens.add({
        targets: img,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        scale: 0.3,
        duration: 500,
        ease: "Quad.out",
        onComplete: () => img.destroy(),
      });
    }
  }

  /** Backward-biased burst: launch exhaust, never radial confetti. */
  burstBack(dir: 1 | -1, n = 5): void {
    const total = Math.max(1, Math.round(n * (this.quality === "high" ? 1 : this.quality === "medium" ? 0.6 : 0.3)));
    for (let i = 0; i < total; i++) {
      const img = this.scene.add
        .image(this.sprite.x, this.sprite.y, "feel_crystal")
        .setDepth(this.sprite.depth + 1)
        .setTint(i % 2 ? this.palette.magenta : this.palette.violet)
        .setScale(0.8)
        .setAlpha(0.95);
      this.scene.tweens.add({
        targets: img,
        x: this.sprite.x - dir * (80 + Math.random() * 90),
        y: this.sprite.y + (Math.random() - 0.5) * 90,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: "Quad.out",
        onComplete: () => img.destroy(),
      });
    }
  }

  /** Energy buildup: dots converge on the body during anticipation. */
  gatherBurst(): void {
    if (this.quality === "low") return;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = 90 + Math.random() * 40;
      const img = this.scene.add
        .image(this.sprite.x + Math.cos(a) * d, this.sprite.y + Math.sin(a) * d, "dot")
        .setDepth(this.sprite.depth + 1)
        .setTint(i % 2 ? this.palette.magenta : this.palette.violet)
        .setScale(0.8)
        .setAlpha(0.9);
      this.scene.tweens.add({
        targets: img,
        x: this.sprite.x,
        y: this.sprite.y,
        alpha: 0,
        scale: 0.2,
        duration: 280,
        ease: "Quad.in",
        onComplete: () => img.destroy(),
      });
    }
  }

  /**
   * Dash connect: hit-stop + burst at the contact point only. The game's
   * contact check already delivers flash (hurtFlash + impactFrame), shake
   * and directional knockback via player.hurt — duplicating them here would
   * double the shake and the flash.
   */
  dashImpact(x: number, y: number): void {
    this.scene.hitStop(this.dashHitStop);
    this.burstAt(x, y, 8);
  }

  /** Flat expanding ground ring at the boss's feet. */
  ring(): void {
    const img = this.scene.add
      .image(this.sprite.x, GROUND_Y + 2, "feel_ring")
      .setDepth(46)
      .setTint(this.palette.magenta)
      .setScale(0.6, 0.25)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: img,
      scaleX: 2.4,
      scaleY: 0.7,
      alpha: 0,
      duration: 350,
      ease: "Quad.out",
      onComplete: () => img.destroy(),
    });
  }

  /** Scaled impact feedback. Light hits never shake the screen. */
  impact(strength: "light" | "strong"): void {
    if (strength === "light") {
      this.scene.hitStop(this.hitStopLight);
      return;
    }
    this.scene.hitStop(this.hitStopStrong);
    this.scene.cameras.main.shake(this.impactShakeMs, this.impactShakeAmp);
  }

  /** Red-core flash at the chest: heavy-attack / phase-change accent. */
  coreFlash(): void {
    if (this.quality === "low") return;
    const img = this.scene.add
      .image(this.sprite.x, this.sprite.y - 40, "dot")
      .setDepth(this.sprite.depth + 1)
      .setTint(this.palette.core)
      .setScale(1.4)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scale: 0.6,
      duration: 220,
      onComplete: () => img.destroy(),
    });
  }

  /** Brief camera reframe for a phase change: punch in, then settle back. */
  private zoomPunch(): void {
    const cam = this.scene.cameras.main;
    // Base = the camera's CURRENT zoom (the render scale: 1 on desktop, up to 2
    // on phones). The punch is relative to it; restoring to a hardcoded 1 would
    // leave a scaled-up phone camera zoomed out after every phase change.
    const base = cam.zoom;
    cam.zoomTo(base * this.zoomAmount, 250);
    this.scene.time.delayedCall(260, () => {
      if (this.sprite.active) cam.zoomTo(base, 200);
    });
  }

  /** Periodic low-HP cue: a magenta puff. No tint fighting telegraphs. */
  lowHpTick(now: number): void {
    if (!this.lowHp) return;
    if (now - this.lowAt > this.lowHpPuffEvery) {
      this.lowAt = now;
      this.scene.fx("fx_spark", "hit", this.sprite.x, this.sprite.y - 40, 0.3, this.palette.magenta);
    }
  }

  // ---- Reaction entry point ------------------------------------------------
  // VFX + body tweens only. The boss's state machine owns all animation
  // choices; react() never calls sprite.play().

  react(event: BossReaction): void {
    switch (event) {
      case "playerClose":
        this.anticipate();
        break;
      case "missed":
        this.settle();
        this.scene.fx("fx_dust", "puff", this.sprite.x, GROUND_Y, 0.25);
        break;
      case "phaseChange":
        this.burst(12);
        this.ring();
        this.coreFlash();
        this.scene.cameras.main.flash(200, 150, 90, 220);
        this.scene.cameras.main.shake(this.phaseShakeMs, this.phaseShakeAmp);
        this.zoomPunch();
        break;
      case "enrage":
        this.burst(8);
        break;
      case "stun":
      case "leapLand":
        this.squash();
        break;
      case "recover":
        this.settle();
        break;
      case "interrupted":
        this.burst(4);
        break;
      case "defeat":
        this.dashEnd();
        this.burst(14);
        break;
      default:
        // damage / heavyDamage / knockback: the boss already flashes, shakes
        // and knocks back in takeDamage; parried / blocked / playerEscape /
        // lowHealth have no clean gameplay hook yet — reserved, safe no-ops.
        break;
    }
  }

  /** Stop trails and body motion (death / vanish / scene teardown). */
  kill(): void {
    this.dashEnd();
    this.bodyTween?.stop();
    this.bodyTween = null;
    for (const g of this.ghosts) g.destroy();
    this.ghosts = [];
  }
}
