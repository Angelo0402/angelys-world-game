import Phaser from "phaser";
import { AUDIO_FILES } from "../audio/manifest";
import { BACKDROPS, PROPS, SPRITES, type SpriteKey } from "./sprites.gen";
import { queueHudIcons } from "../ui/gameHudArt";

export function queueAssets(load: Phaser.Loader.LoaderPlugin) {
  queueHudIcons(load);
  for (const [key, url] of Object.entries(BACKDROPS)) load.image(key, url);
  for (const [key, meta] of Object.entries(SPRITES)) {
    load.spritesheet(key, meta.file, { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
  }
  for (const [key, meta] of Object.entries(PROPS)) load.image(key, meta.file);
  for (const [key, file] of Object.entries(AUDIO_FILES)) load.audio(key, `assets/audio/${file}`);
}

export const animKey = (sheet: SpriteKey, anim: string) => `${sheet}:${anim}`;

export function createAnimations(anims: Phaser.Animations.AnimationManager) {
  for (const [sheet, meta] of Object.entries(SPRITES)) {
    for (const [name, a] of Object.entries(meta.anims)) {
      const key = `${sheet}:${name}`;
      if (anims.exists(key)) continue;
      anims.create({
        key,
        frames: anims.generateFrameNumbers(sheet, { start: a.start, end: a.end }),
        frameRate: a.fps,
        repeat: a.repeat,
      });
    }
  }
}

/** Applies the sheet's feet/center anchor so sprite.x/y is the logical position. */
export function applyOrigin(sprite: Phaser.GameObjects.Sprite, sheet: SpriteKey) {
  const m = SPRITES[sheet];
  sprite.setOrigin(m.originX, m.originY);
}

/** Scale that makes the sheet's idle (or first) animation `px` tall on screen. */
export function scaleForHeight(sheet: SpriteKey, px: number, anim?: string) {
  const anims = SPRITES[sheet].anims as Record<string, { h: number }>;
  const a = anims[anim ?? Object.keys(anims)[0]];
  return px / a.h;
}

export function buildSharedTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("dot")) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture("dot", 16, 16);
    g.clear();
    g.fillStyle(0x000000, 1).fillEllipse(32, 10, 64, 20);
    g.generateTexture("shadow", 64, 20);
    g.destroy();
  }
  if (!scene.textures.exists("bubble")) {
    const tex = scene.textures.createCanvas("bubble", 32, 32)!;
    const ctx = tex.getContext();
    const fill = ctx.createRadialGradient(13, 12, 1, 16, 16, 15);
    fill.addColorStop(0, "rgba(255,255,255,0.35)");
    fill.addColorStop(0.7, "rgba(190,240,255,0.12)");
    fill.addColorStop(1, "rgba(190,240,255,0.5)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(235,252,255,0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(11, 10, 4, 2.6, -0.6, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
  if (!scene.textures.exists("glow")) {
    const tex = scene.textures.createCanvas("glow", 128, 128)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    tex.refresh();
  }
  if (!scene.textures.exists("vignette")) {
    const tex = scene.textures.createCanvas("vignette", 256, 144)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(128, 72, 46, 128, 72, 150);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.52, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(6,3,14,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 144);
    tex.refresh();
  }
}
