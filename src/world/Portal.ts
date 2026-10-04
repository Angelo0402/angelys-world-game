import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { GROUND_Y } from "../config";
import { drawLock } from "../scenes/TitleScene";

const ARCH_H = 190;
// The arch's inner opening in source-frame pixels (portal.webp): a rectangle with a
// semicircular top. Everything inside the arch is clipped to this shape.
const OPEN = { cx: 172, left: 110, right: 234, arcY: 134, bottom: 354 };

/**
 * Stone arch with a swirling vortex clipped to its opening. Sealed it shows a dim
 * swirl, a lock and the number of enemies left; open, the runes glow and the
 * vortex spins up, pulling sparkles inward.
 */
export class Portal {
  readonly x: number;
  /** World-space centre of the opening (where Angely is drawn in). */
  readonly cx: number;
  readonly cy: number;
  /** Floor the arch stands on. */
  readonly baseY: number;
  isOpen = false;
  private scene: Phaser.Scene;
  private arch: Phaser.GameObjects.Sprite;
  private runes: Phaser.GameObjects.Sprite;
  private inside: Phaser.GameObjects.Rectangle;
  private vortex: Phaser.GameObjects.Image;
  private vortexInner: Phaser.GameObjects.Image;
  private core: Phaser.GameObjects.Image;
  private halo: Phaser.GameObjects.Image;
  private floorGlow: Phaser.GameObjects.Image;
  private lock: Phaser.GameObjects.Graphics;
  private count: Phaser.GameObjects.Text;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private spin = 0.0007;

  constructor(scene: Phaser.Scene, x: number, visible = true, floorY = GROUND_Y) {
    this.scene = scene;
    this.x = x;
    const meta = SPRITES.portal;
    const s = scaleForHeight("portal", ARCH_H);
    const ox = meta.originX * meta.frameWidth;
    const oy = meta.originY * meta.frameHeight;
    this.baseY = floorY;
    const baseY = floorY + 4;
    const wx = (fx: number) => x + (fx - ox) * s;
    const wy = (fy: number) => baseY + (fy - oy) * s;
    const r = (OPEN.right - OPEN.left) / 2;
    this.cx = wx(OPEN.cx);
    this.cy = wy((OPEN.arcY - r + OPEN.bottom) / 2);
    const w = r * 2 * s;
    const h = (OPEN.bottom - OPEN.arcY + r) * s;

    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillRect(wx(OPEN.left), wy(OPEN.arcY), w, wy(OPEN.bottom) - wy(OPEN.arcY)).fillCircle(this.cx, wy(OPEN.arcY), r * s);
    const mask = shape.createGeometryMask();

    this.halo = scene.add.image(this.cx, this.cy, "glow").setDepth(15.2).setTint(0x9f7bff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.halo.setDisplaySize(w * 4, h * 2);
    this.floorGlow = scene.add.image(this.cx, floorY + 2, "glow").setDepth(15.3).setTint(0x9ff5ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.floorGlow.setDisplaySize(w * 3.4, 40);

    this.inside = scene.add.rectangle(this.cx, this.cy, w + 4, h + 4, 0x150d2a).setDepth(15.4).setMask(mask);
    const vs = (h * 1.25) / (SPRITES.vortex.frameHeight * 0.92);
    this.vortex = scene.add.image(this.cx, this.cy, "vortex", 0).setDepth(15.5).setScale(vs).setTint(0x4a4466).setAlpha(0.5).setMask(mask);
    this.vortexInner = scene.add
      .image(this.cx, this.cy, "vortex", 0)
      .setDepth(15.6)
      .setScale(vs * 0.6)
      .setFlipX(true)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setMask(mask);
    this.core = scene.add.image(this.cx, this.cy, "glow").setDepth(15.7).setTint(0xffffff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setMask(mask);
    this.core.setDisplaySize(w * 1.1, w * 1.1);
    this.sparks = scene.add
      .particles(this.cx, this.cy, "dot", {
        emitZone: { type: "random", source: new Phaser.Geom.Ellipse(0, 0, w * 1.1, h * 1.05) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
        moveToX: 0,
        moveToY: 0,
        scale: { start: 0.32, end: 0.04 },
        alpha: { start: 0, end: 1, ease: "Sine.in" },
        lifespan: 800,
        tint: [0x9ff5ff, 0xffffff, 0xd2b4ff],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 40,
        emitting: false,
      })
      .setDepth(15.8)
      .setMask(mask);

    this.arch = scene.add.sprite(x, baseY, "portal").setDepth(16).setScale(s).setTint(0x8a86a0);
    applyOrigin(this.arch, "portal");
    this.runes = scene.add.sprite(x, baseY, "portal").setDepth(16.1).setScale(s).setTint(0x9ff5ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    applyOrigin(this.runes, "portal");

    this.lock = scene.add.graphics().setDepth(17);
    drawLock(this.lock, this.cx, this.cy - 14, 0.9);
    this.count = scene.add
      .text(this.cx, this.cy + 34, "", { fontFamily: "Trebuchet MS", fontSize: "22px", fontStyle: "bold", color: "#ffd36b", stroke: "#1b0f2e", strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(17);
    if (!visible) this.setVisible(false);
  }

  private parts() {
    return [this.arch, this.runes, this.inside, this.vortex, this.vortexInner, this.core, this.halo, this.floorGlow, this.lock, this.count, this.sparks];
  }

  setVisible(on: boolean) {
    for (const p of this.parts()) p.setVisible(on);
    if (on && this.isOpen) this.lock.setVisible(false);
  }

  get visible() {
    return this.arch.visible;
  }

  setRemaining(n: number, word = "left") {
    if (!this.isOpen) this.count.setText(n > 0 ? `${n} ${word}` : "");
  }

  /** Fade in (the boss arena's portal is hidden until Umbra falls). */
  appear() {
    this.setVisible(true);
    this.arch.setAlpha(0);
    this.inside.setAlpha(0);
    this.scene.tweens.add({ targets: [this.arch, this.inside], alpha: 1, duration: 700 });
  }

  open(instant = false) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.count.setText("");
    this.arch.clearTint();
    const d = instant ? 0 : 1;
    this.scene.tweens.add({ targets: this.lock, alpha: 0, duration: 300 * d, onComplete: () => this.lock.setVisible(false) });
    const full = this.vortex.scale;
    this.vortex.clearTint().setAlpha(1).setScale(full * 0.15);
    this.scene.tweens.add({ targets: this.vortex, scale: full, duration: 800 * d + 1, ease: "Back.out" });
    this.scene.tweens.add({ targets: this.vortexInner, alpha: 0.6, duration: 800 * d + 1 });
    this.scene.tweens.add({ targets: this.inside, fillColor: 0x2a1460, duration: 400 * d + 1 });
    this.scene.tweens.add({ targets: this.floorGlow, alpha: 0.5, duration: 600 * d + 1 });
    this.sparks.start();
    this.spin = 0.0045;
  }

  update(time: number, delta: number) {
    this.vortex.rotation -= this.spin * delta;
    this.vortexInner.rotation -= this.spin * 1.8 * delta;
    if (!this.isOpen) return;
    const t = time / 1000;
    this.halo.setAlpha(0.38 + Math.sin(t * 2.2) * 0.1);
    this.core.setAlpha(0.35 + Math.sin(t * 3.4) * 0.15);
    this.runes.setAlpha(0.22 + Math.sin(t * 2.2) * 0.12);
  }

  /** Pull a sprite into the vortex. */
  swallow(target: Phaser.GameObjects.Sprite, onDone: () => void) {
    this.spin = 0.012;
    this.scene.tweens.add({ targets: this.core, alpha: 1, scale: this.core.scale * 1.8, duration: 700, ease: "Quad.in" });
    this.scene.tweens.add({
      targets: target,
      x: this.cx,
      y: this.cy + 40,
      scale: target.scale * 0.05,
      angle: 720,
      alpha: 0,
      duration: 950,
      ease: "Quad.in",
      onComplete: onDone,
    });
  }
}
