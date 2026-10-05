import Phaser from "phaser";
import { AUDIO_FILES } from "../audio/manifest";
import { BACKDROPS, PROPS, SPRITES, type SpriteKey } from "./sprites.gen";

export function queueAssets(load: Phaser.Loader.LoaderPlugin) {
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
  buildPowerUpTextures(scene);
}

/** Generated power-up pickup icons (64x64). */
function buildPowerUpTextures(scene: Phaser.Scene) {
  const defs: [string, (g: Phaser.GameObjects.Graphics) => void][] = [
    ["power_star", (g) => {
      // Golden 5-point star
      g.fillStyle(0xffd93b, 1);
      const cx = 32, cy = 32, r1 = 26, r2 = 11;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? r1 : r2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath(); g.fillPath();
      g.lineStyle(3, 0x8a5a00, 1); g.strokePath();
      g.fillStyle(0xffffff, 0.85); g.fillCircle(24, 24, 5);
    }],
    ["power_shield", (g) => {
      // Blue shield (polygon approximation)
      g.fillStyle(0x3ba7ff, 1);
      g.beginPath();
      g.moveTo(32, 6); g.lineTo(54, 14); g.lineTo(54, 32);
      g.lineTo(48, 46); g.lineTo(32, 58); g.lineTo(16, 46);
      g.lineTo(10, 32); g.lineTo(10, 14); g.closePath(); g.fillPath();
      g.lineStyle(3, 0x0d3b66, 1); g.strokePath();
      g.fillStyle(0xbfe6ff, 1); g.fillCircle(32, 30, 8);
    }],
    ["power_speed", (g) => {
      // Yellow lightning bolt
      g.fillStyle(0xffe93b, 1);
      g.beginPath();
      g.moveTo(38, 4); g.lineTo(16, 36); g.lineTo(28, 36);
      g.lineTo(24, 60); g.lineTo(48, 26); g.lineTo(34, 26);
      g.closePath(); g.fillPath();
      g.lineStyle(3, 0x8a6a00, 1); g.strokePath();
    }],
    ["power_sword", (g) => {
      // Silver sword diagonal
      g.lineStyle(8, 0xc0c8d8, 1);
      g.beginPath(); g.moveTo(14, 50); g.lineTo(46, 18); g.strokePath();
      g.lineStyle(3, 0x5a6478, 1);
      g.beginPath(); g.moveTo(14, 50); g.lineTo(46, 18); g.strokePath();
      g.fillStyle(0x8a5a2a, 1); g.fillRect(8, 46, 18, 6);
      g.fillStyle(0xffd93b, 1); g.fillCircle(44, 16, 5);
    }],
    ["power_magnet", (g) => {
      // Red/white horseshoe magnet
      g.lineStyle(12, 0xff4d4d, 1);
      g.beginPath(); g.arc(32, 28, 16, Math.PI, 0, false); g.strokePath();
      g.lineStyle(12, 0xffffff, 1);
      g.beginPath(); g.moveTo(16, 28); g.lineTo(16, 44); g.strokePath();
      g.beginPath(); g.moveTo(48, 28); g.lineTo(48, 44); g.strokePath();
      g.fillStyle(0xcccccc, 1);
      g.fillRect(10, 40, 12, 8); g.fillRect(42, 40, 12, 8);
    }],
    ["power_slow", (g) => {
      // Cyan clock
      g.fillStyle(0x9be8ff, 1); g.fillCircle(32, 32, 24);
      g.lineStyle(4, 0x0d5a7a, 1); g.strokeCircle(32, 32, 24);
      g.lineStyle(5, 0x0d5a7a, 1);
      g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 16); g.strokePath();
      g.beginPath(); g.moveTo(32, 32); g.lineTo(44, 36); g.strokePath();
      g.fillStyle(0x0d5a7a, 1); g.fillCircle(32, 32, 4);
    }],
    ["heart_extra", (g) => {
      // Pink heart with plus
      g.fillStyle(0xff5a8a, 1);
      g.fillCircle(22, 22, 12); g.fillCircle(42, 22, 12);
      g.fillTriangle(12, 28, 52, 28, 32, 52);
      g.lineStyle(3, 0x8a1a3a, 1); g.strokeCircle(22, 22, 12); g.strokeCircle(42, 22, 12);
      g.fillStyle(0xffffff, 1); g.fillRect(28, 14, 8, 20); g.fillRect(22, 20, 20, 8);
    }],
  ];
  for (const [key, draw] of defs) {
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
}
