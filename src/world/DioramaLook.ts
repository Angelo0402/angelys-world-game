import Phaser from "phaser";
import { GAME_H, GAME_W, type ChapterDef } from "../config";

/**
 * 2.5D presentation borrowed from Diorama (o3de-diorama): layered parallax,
 * a directional "sun" glow, ground bounce light, atmospheric haze, a vignette,
 * and near-camera silhouettes so the stage reads as a diorama instead of a flat card.
 */
const LOOK: Record<number, { sun: number; haze: number; bounce: number }> = {
  1: { sun: 0xffe08a, haze: 0x6a9a48, bounce: 0x8ad45a },
  2: { sun: 0xc4d0ff, haze: 0x3a2a68, bounce: 0x8898ff },
  3: { sun: 0xff7a32, haze: 0x5a1810, bounce: 0xff6a22 },
  4: { sun: 0xe8f6ff, haze: 0x6a88aa, bounce: 0xc8e8ff },
  5: { sun: 0xc59bff, haze: 0x2a1048, bounce: 0x9a64ff },
  6: { sun: 0xfff0b8, haze: 0x90a8d0, bounce: 0xffffff },
  7: { sun: 0x7ad4ff, haze: 0x0d4a5a, bounce: 0x4ec8e0 },
  8: { sun: 0xffc878, haze: 0x5a3a18, bounce: 0xe0a040 },
  9: { sun: 0xff8ad4, haze: 0x4a1860, bounce: 0xff64c8 },
  10: { sun: 0xd0a0ff, haze: 0x1a1438, bounce: 0xb57cff },
};

export class DioramaLook {
  private sky: Phaser.GameObjects.Image;
  private mid: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Image;
  private bounce: Phaser.GameObjects.Image;
  private haze: Phaser.GameObjects.Rectangle;
  private vignette: Phaser.GameObjects.Image;
  private near: Phaser.GameObjects.Image[] = [];
  private colors: { sun: number; haze: number; bounce: number };

  constructor(scene: Phaser.Scene, far: Phaser.GameObjects.Image, chapter: ChapterDef) {
    this.colors = LOOK[chapter.id] ?? LOOK[1];
    const key = far.texture.key;
    const zoom = far.scaleX;

    this.sky = scene.add.image(0, 0, key).setOrigin(0).setDepth(-120).setScale(zoom * 1.12).setAlpha(0.72);
    this.sky.setTint(0x8a90a8);
    this.mid = scene.add.image(0, 0, key).setOrigin(0).setDepth(-70).setScale(zoom * 1.04).setAlpha(0);
    this.mid.setTint(0x1a1428);

    this.sun = scene.add
      .image(0, 0, "glow")
      .setDepth(-90)
      .setTint(this.colors.sun)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.42)
      .setDisplaySize(720, 280);
    this.bounce = scene.add
      .image(0, 0, "glow")
      .setDepth(11.2)
      .setTint(this.colors.bounce)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setDisplaySize(GAME_W * 1.15, 90);
    this.haze = scene.add
      .rectangle(0, 0, GAME_W + 8, GAME_H + 8, this.colors.haze, 0.09)
      .setOrigin(0)
      .setDepth(86);
    this.vignette = scene.add.image(0, 0, "vignette").setDepth(97).setDisplaySize(GAME_W + 24, GAME_H + 24).setAlpha(0.9);

    const groundKey = `ground_${chapter.id}`;
    if (scene.textures.exists(groundKey)) {
      for (let i = 0; i < 4; i++) {
        const sil = scene.add
          .image(0, 0, groundKey)
          .setOrigin(0.5, 1)
          .setDepth(-15)
          .setTint(0x0a0814)
          .setAlpha(0.4)
          .setScale(2.8 + i * 0.2, 2.1);
        this.near.push(sil);
      }
    }
  }

  place(
    view: Phaser.Geom.Rectangle,
    far: Phaser.GameObjects.Image,
    span: number,
    t: number,
    ty: number,
  ) {
    const skyT = t * 0.42;
    const midT = t * 0.72;
    const extraSky = this.sky.displayHeight - GAME_H;
    const extraMid = this.mid.displayHeight - GAME_H;
    this.sky.setPosition(view.x - (this.sky.displayWidth - GAME_W) * skyT, view.y - extraSky * (ty * 0.55));
    this.mid.setPosition(view.x - (this.mid.displayWidth - GAME_W) * midT, view.y - extraMid * (ty * 0.8 + 0.08));
    this.sun.setPosition(view.x + GAME_W * 0.72, view.y + 70);
    this.bounce.setPosition(view.x + GAME_W / 2, view.bottom - 28);
    this.haze.setPosition(view.x - 4, view.y - 4);
    this.vignette.setPosition(view.centerX, view.centerY);

    const step = GAME_W * 0.7;
    const shift = (view.x * 1.22) % step;
    this.near.forEach((sil, i) => {
      sil.setPosition(view.x - 80 + i * step - shift, view.y + GAME_H * 0.82);
    });
    void far;
    void span;
  }
}
