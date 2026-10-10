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

  /** White/grey dust puff spreading sideways on landing. */
  landDust(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: 350,
      speed: { min: 30, max: 70 },
      angle: { min: 180, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffffff, 0xcccccc],
      quantity: 10,
    });
    emitter.setDepth(50);
    emitter.explode(10);
    this.scene.time.delayedCall(450, () => emitter.destroy());
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
