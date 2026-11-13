import Phaser from "phaser";

export class VisualFX {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Golden sparkles drifting behind a running player. */
  runTrail(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 400,
      speed: { min: 10, max: 30 },
      angle: { min: 160, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xffd966,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 4,
    });
    emitter.setDepth(50);
    emitter.explode(4);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  /** Landing dust, improved (game feel 1+6, v77 — Angelo-approved GIF 2026-11-12):
   *  9 soft puffs + 4 tiny specks. Soft = the shared "glow" radial texture
   *  (no hard edge), warm light-tan tint. Puffs spawn staggered 0-0.12s
   *  after landing, expand ease-out-cubic from r~4px to 10-20px, drift
   *  outward and up, and fade in fast then out over ~0.5s. Specks are 2px
   *  dots that shoot outward fast and die in ~0.25s. */
  landDust(x: number, y: number): void {
    const TINT = 0xe4dac6;
    // (start dx, outward drift, rise, final radius px, spawn delay ms, life ms)
    // dx/drift/rise/radius mirror the approved GIF (render2.py); the stagger
    // is compressed to the 0-0.12s window from the spec.
    const PUFFS: Array<[number, number, number, number, number, number]> = [
      [-34, -26, 12, 20, 0, 540],
      [-22, -18, 16, 15, 20, 500],
      [-11, -9, 20, 12, 40, 460],
      [0, 0, 22, 17, 0, 560],
      [11, 9, 19, 12, 60, 460],
      [22, 17, 15, 15, 40, 500],
      [34, 25, 11, 19, 80, 540],
      [-16, -12, 9, 10, 100, 420],
      [16, 12, 9, 10, 120, 420],
    ];
    for (const [dx, drift, rise, r, delay, life] of PUFFS) {
      this.scene.time.delayedCall(delay, () => {
        const img = this.scene.add.image(x + dx, y - 3, "glow").setTint(TINT).setDepth(50).setAlpha(0).setScale(0.06);
        this.scene.tweens.add({
          targets: img,
          scale: (r * 2) / 128,
          x: x + dx + drift,
          y: y - 3 - rise,
          duration: life,
          ease: "Cubic.easeOut",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            img.setAlpha(0.85 * Math.pow(Math.sin(Math.PI * tween.progress), 0.9));
          },
          onComplete: () => img.destroy(),
        });
      });
    }
    // Tiny fast specks (start dx, outward px, up px).
    const SPECKS: Array<[number, number, number]> = [
      [-18, -19, -14],
      [-8, -9, -18],
      [8, 9, -17],
      [18, 18, -13],
    ];
    for (const [dx, ox, oy] of SPECKS) {
      const dot = this.scene.add.image(x + dx, y - 4, "dot").setTint(0xe6deca).setDepth(50).setAlpha(0.9).setScale(0.15);
      this.scene.tweens.add({
        targets: dot,
        x: x + dx + ox,
        y: y - 4 + oy,
        alpha: 0,
        duration: 250,
        ease: "Quad.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Quick upward white puff when jumping. */
  jumpPoof(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 250,
      speed: { min: 20, max: 50 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xffffff,
      quantity: 6,
    });
    emitter.setDepth(50);
    emitter.explode(6);
    this.scene.time.delayedCall(350, () => emitter.destroy());
  }

  /** Bright yellow-white impact star burst for sword hits. */
  hitSpark(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 300,
      speed: { min: 80, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff066],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
    });
    emitter.setDepth(50);
    emitter.explode(12);
    this.scene.time.delayedCall(400, () => emitter.destroy());
  }

  /** Flat expanding ring that makes a ground-level explosion read as a shockwave. */
  explosionShockwave(x: number, y: number, tint = 0xffb14a): void {
    const ring = this.scene.add.ellipse(x, y, 72, 22, tint, 0)
      .setStrokeStyle(5, tint, 0.95)
      .setScale(0.35)
      .setDepth(89)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.8,
      scaleY: 2.4,
      alpha: 0,
      duration: 420,
      ease: "Quad.out",
      onComplete: () => ring.destroy(),
    });
  }

  /** Purple-ish poof when an enemy dies. */
  enemyPoof(x: number, y: number, tint: number = 0x9b5de5): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 400,
      speed: { min: 40, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint,
      quantity: 14,
    });
    emitter.setDepth(50);
    emitter.explode(14);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  /** Rainbow sparkle burst for star pickup. */
  collectBurst(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 500,
      speed: { min: 50, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfff27a, 0x8ec5ff, 0xff9ff3],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 16,
    });
    emitter.setDepth(50);
    emitter.explode(16);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  /** Soft green pulsing glow tween on a sprite for 600ms, then removes itself. */
  healGlow(target: Phaser.GameObjects.Sprite): void {
    const originalTint = target.isTinted ? target.tintTopLeft : 0xffffff;
    target.setTintFill(0x7cfc9a);

    this.scene.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0.6 },
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        target.clearTint();
        target.setAlpha(1);
        if (originalTint !== 0xffffff) {
          target.setTint(originalTint);
        }
      },
    });
  }

  /** Dramatic boss entrance: purple shockwave ring + rising embers + ground dust. */
  bossEntrance(x: number, y: number): void {
    // Expanding shockwave ring (purple, additive)
    const ring = this.scene.add.particles(x, y, "dot", {
      lifespan: 700,
      speed: { min: 180, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xb57cff, 0x7b2ff7],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 24,
    });
    ring.setDepth(50);
    ring.explode(24);
    this.scene.time.delayedCall(800, () => ring.destroy());

    // Rising embers
    const embers = this.scene.add.particles(x, y + 60, "dot", {
      x: { min: -120, max: 120 },
      lifespan: 1200,
      speedY: { min: -160, max: -60 },
      speedX: { min: -30, max: 30 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff6b9d, 0xb57cff, 0xfff27a],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 60,
    });
    embers.setDepth(50);
    this.scene.time.delayedCall(1800, () => embers.destroy());

    // Ground dust burst
    this.landDust(x - 80, y + 120);
    this.landDust(x + 80, y + 120);
  }

  /** Heal burst (Angelo-approved GIF 2026-11-12, v80): small mint pluses
   *  rising from Angely's body, centered slightly left on her. 7 pluses,
   *  staggered 0-0.48s, rise ~50px over ~0.95s, fade out at the top; 8 tiny
   *  mint sparkles twinkle on her body + a faint mint glow. Plays on heart
   *  pickup (when it heals) and on checkpoint touch. Full life + heart =
   *  nothing — gated by Player.heal() in GameScene.checkPickups, so this
   *  method only ever runs on a real heal.
   *  v81 FIX: the anchor is a live position (getX/getY closures), not a
   *  snapshot — every element re-anchors to Angely each frame, so the
   *  effect rides with her when she walks instead of floating where she
   *  was standing (bug found by Angelo on v80, 2026-11-12). */
  healBurst(getX: () => number, getY: () => number): void {
    const MINT = 0x6ef2a8;
    // (dx, dy, size px, spawn delay ms) — mirrors the approved GIF.
    const PLUSES: Array<[number, number, number, number]> = [
      [-6, 10, 12, 0],
      [7, 0, 10, 80],
      [-2, -12, 13, 160],
      [9, 8, 9, 240],
      [-8, -2, 11, 320],
      [4, -18, 9, 400],
      [-10, 4, 10, 480],
    ];
    for (const [dx, dy, size, delay] of PLUSES) {
      this.scene.time.delayedCall(delay, () => {
        const img = this.scene.add.image(getX() + dx, getY() + dy, "heal_plus").setTint(MINT).setDepth(50).setAlpha(0).setScale(size / 32);
        this.scene.tweens.add({
          targets: img,
          duration: 950,
          ease: "Cubic.easeOut",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const p = tween.progress;
            // Re-anchor to her live position every frame; the rise is
            // relative to where she is NOW, not where she was at spawn.
            img.setPosition(getX() + dx + 2 * p, getY() + dy - 50 * p);
            img.setAlpha(p < 0.1 ? p / 0.1 : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1);
          },
          onComplete: () => img.destroy(),
        });
      });
    }
    // Tiny sparkles twinkling on her body — individual dots so each one
    // re-anchors to her live position like the pluses.
    const SPARKS: Array<[number, number, number]> = [
      [-12, -20, 0],
      [10, -15, 90],
      [-4, 5, 180],
      [13, 10, 270],
      [-9, -8, 360],
      [5, -22, 450],
      [-14, 12, 540],
      [8, 2, 630],
    ];
    for (const [sx, sy, delay] of SPARKS) {
      this.scene.time.delayedCall(delay, () => {
        const dot = this.scene.add.image(getX() + sx, getY() + sy, "dot").setTint(MINT).setDepth(50).setAlpha(0.9).setScale(0.35).setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: dot,
          duration: 700,
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const p = tween.progress;
            dot.setPosition(getX() + sx, getY() + sy);
            dot.setAlpha(0.9 * (1 - p));
            dot.setScale(0.35 * (1 - p));
          },
          onComplete: () => dot.destroy(),
        });
      });
    }
    // Faint mint glow on the body — rides with her too.
    const glow = this.scene.add.image(getX(), getY() - 10, "glow").setTint(MINT).setDepth(49).setAlpha(0).setScale(0.5);
    this.scene.tweens.add({
      targets: glow,
      duration: 820,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const p = tween.progress;
        glow.setPosition(getX(), getY() - 10);
        glow.setAlpha(p < 0.15 ? 0.22 * (p / 0.15) : 0.22 * (1 - (p - 0.15) / 0.85));
      },
      onComplete: () => glow.destroy(),
    });
  }

  /** Golden rising sparkle column for checkpoint activation. */
  checkpointSparkle(x: number, y: number): void {
    const sparks = this.scene.add.particles(x, y, "dot", {
      x: { min: -30, max: 30 },
      lifespan: 900,
      speedY: { min: -220, max: -100 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffe27a, 0xfff9c4, 0xffd966],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 40,
    });
    sparks.setDepth(50);
    this.scene.time.delayedCall(1400, () => sparks.destroy());

    // Quick flash ring at the base
    const flash = this.scene.add.particles(x, y, "dot", {
      lifespan: 400,
      speed: { min: 60, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xffe27a,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
    });
    flash.setDepth(50);
    flash.explode(12);
    this.scene.time.delayedCall(500, () => flash.destroy());
  }

  /** Red screen flash when the player takes damage. */
  hurtFlash(): void {
    this.scene.cameras.main.flash(180, 200, 30, 30);
  }
}
