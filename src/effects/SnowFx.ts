import Phaser from "phaser";

/**
 * Snow-shed effect for the Yeti's snowball (Angelo, 2026-11-06 — code only,
 * NO new sprites). The ball stays a plain round sprite; all the dynamism is
 * particles layered on top, Phaser-style:
 *
 *  - shed(): tiny snowflakes that fall off the ball while it flies. Called
 *    from the per-frame projectile update on the same timed-puff cadence as
 *    the existing afterimage trail — NO persistent emitter, so nothing leaks
 *    when a projectile dies or the scene clears its projectiles.
 *  - impact(): a white snow burst at the hit point + a snow-pile splat decal
 *    that stays on the floor for a few seconds, then fades. The pile is a
 *    plain ellipse (no art), capped so the floor never clutters.
 *  - ensureTexture(): runtime stand-in snowball texture (white ball, blue
 *    shading, teal crystals) until the real ChatGPT strip lands and is
 *    registered via atlas_config. Drawn once per scene, like special_light.
 */
export class SnowFx {
  private scene: Phaser.Scene;
  private splats: Array<{ pile: Phaser.GameObjects.Ellipse; sheen: Phaser.GameObjects.Ellipse }> = [];
  private static readonly MAX_SPLATS = 6;
  private static readonly SPLAT_MS = 4500;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Runtime stand-in snowball texture (96x96). No-op once the real art exists. */
  static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists("snowball")) return;
    const t = scene.textures.createCanvas("snowball", 96, 96)!;
    const ctx = t.getContext();
    // Ball: white with light-blue lower shading.
    const g = ctx.createRadialGradient(38, 34, 6, 48, 48, 46);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.65, "#eef6ff");
    g.addColorStop(1, "#bcd8f5");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 44, 0, Math.PI * 2);
    ctx.fill();
    // Dark outline so it reads at small size.
    ctx.strokeStyle = "rgba(40,60,90,0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(48, 48, 42, 0, Math.PI * 2);
    ctx.stroke();
    // Teal ice crystals embedded (also the visible rotation markers).
    ctx.fillStyle = "#2fd8c8";
    const crystal = (x: number, y: number, s: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    crystal(30, 30, 9, 0.4);
    crystal(64, 26, 7, -0.3);
    crystal(58, 62, 8, 0.9);
    crystal(28, 60, 6, 0.1);
    t.refresh();
  }

  /** A few snowflakes shed at the ball's current position. One-shot, self-cleaning. */
  shed(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, "dot", {
      lifespan: { min: 350, max: 550 },
      speed: { min: 8, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffffff, 0xdcefff, 0xbfe3ff],
      gravityY: 120,
      quantity: 3,
    });
    emitter.setDepth(79);
    emitter.explode(3);
    this.scene.time.delayedCall(650, () => emitter.destroy());
  }

  /** Impact: snow burst at the hit point + a pile decal that stays on the floor. */
  impact(x: number, y: number, floorY: number): void {
    const burst = this.scene.add.particles(x, y, "dot", {
      lifespan: { min: 300, max: 550 },
      speed: { min: 60, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xe8f4ff, 0xcfe8ff],
      gravityY: 500,
      quantity: 18,
    });
    burst.setDepth(89);
    burst.explode(18);
    this.scene.time.delayedCall(650, () => burst.destroy());

    // Floor pile: a flat white ellipse + a pale-blue sheen on top, grown in.
    const pile = this.scene.add.ellipse(x, floorY - 5, 96, 20, 0xffffff, 0.92).setDepth(82);
    const sheen = this.scene.add.ellipse(x, floorY - 8, 60, 10, 0xdcefff, 0.9).setDepth(83);
    pile.setScale(0.3, 1);
    sheen.setScale(0.3, 1);
    this.scene.tweens.add({ targets: [pile, sheen], scaleX: 1, duration: 180, ease: "Quad.out" });
    this.splats.push({ pile, sheen });
    if (this.splats.length > SnowFx.MAX_SPLATS) {
      const old = this.splats.shift();
      old?.pile.destroy();
      old?.sheen.destroy();
    }
    this.scene.time.delayedCall(SnowFx.SPLAT_MS, () => {
      this.scene.tweens.add({
        targets: [pile, sheen],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          pile.destroy();
          sheen.destroy();
        },
      });
    });
  }
}
