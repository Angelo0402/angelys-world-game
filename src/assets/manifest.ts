import Phaser from "phaser";
import { AUDIO_FILES } from "../audio/manifest";
import { BACKDROPS, PROPS, SPRITES, type SpriteKey } from "./sprites.gen";
import { queueHudIcons } from "../ui/gameHudArt";

/** Breakable-wall block stages + rubble chunks (approved ChatGPT sprites,
 *  cut from green, installed as .webp next to the chapter props). Loaded
 *  explicitly here instead of PROPS so sprites.gen.ts stays generator-owned. */
const WALLBLOCK_FILES: Record<string, string> = {
  wallblock_intact: "assets/runtime/props/wallblock_intact.webp",
  wallblock_cracked: "assets/runtime/props/wallblock_cracked.webp",
  wallblock_heavy: "assets/runtime/props/wallblock_heavy.webp",
};
for (let i = 0; i < 12; i++) WALLBLOCK_FILES[`wallblock_chunk${i}`] = `assets/runtime/props/wallblock_chunk${i}.webp`;

export function queueAssets(load: Phaser.Loader.LoaderPlugin) {
  queueHudIcons(load);
  for (const [key, url] of Object.entries(BACKDROPS)) load.image(key, url);
  for (const [key, meta] of Object.entries(SPRITES)) {
    load.spritesheet(key, meta.file, { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
  }
  for (const [key, meta] of Object.entries(PROPS)) load.image(key, meta.file);
  for (const [key, file] of Object.entries(WALLBLOCK_FILES)) load.image(key, file);
  for (const [key, file] of Object.entries(AUDIO_FILES)) load.audio(key, `assets/audio/${file}`);
}


export function createAnimations(anims: Phaser.Animations.AnimationManager) {
  for (const [sheet, meta] of Object.entries(SPRITES)) {
    for (const [name, a] of Object.entries(meta.anims)) {
      const key = `${sheet}:${name}`;
      if (anims.exists(key)) continue;
      anims.create({
        key,
        frames: anims.generateFrameNumbers(sheet, { start: a.start, end: a.end }),
        // Defs mix two conventions: most sheets use `fps`, but 69 anims
        // (crystalveil, veil_form2, sovereign2, crystal_imp, crystal_golem,
        // crystal_cage_new) use `frameRate`. Reading only `fps` left those
        // anims with msPerFrame NaN — their frames never advanced, so the
        // Final Boss slid around as a frozen statue. Read both.
        frameRate: (a as { fps?: number; frameRate?: number }).fps
          ?? (a as { fps?: number; frameRate?: number }).frameRate,
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

/** Boss-encounter feel textures (2026-10-26 package): all procedural, no
 *  image assets. Created lazily-safe: each guarded by textures.exists. */
export function buildFeelTextures(scene: Phaser.Scene) {
  const t = scene.textures;
  if (!t.exists("feel_spike")) {
    // Ice shard, point up, base at the bottom (sprite origin 0.5,1 grows it
    // out of the ground when scaleY tweens 0 -> 1).
    const tex = t.createCanvas("feel_spike", 64, 128)!;
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, "rgba(190,230,255,0.9)");
    grad.addColorStop(1, "rgba(150,120,255,0.85)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(52, 70);
    ctx.lineTo(44, 126);
    ctx.lineTo(20, 126);
    ctx.lineTo(12, 70);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(30, 110);
    ctx.stroke();
    tex.refresh();
  }
  if (!t.exists("feel_crack")) {
    // Frost crack lines on the ground: telegraph for an incoming spike.
    const tex = t.createCanvas("feel_crack", 96, 48)!;
    const ctx = tex.getContext();
    ctx.strokeStyle = "rgba(200,240,255,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 24);
    ctx.lineTo(48, 20);
    ctx.lineTo(90, 26);
    ctx.moveTo(48, 20);
    ctx.lineTo(38, 8);
    ctx.moveTo(48, 20);
    ctx.lineTo(58, 36);
    ctx.moveTo(30, 22);
    ctx.lineTo(24, 34);
    ctx.stroke();
    tex.refresh();
  }
  if (!t.exists("feel_frost")) {
    // Soft lingering frost patch left behind by a shattered spike.
    const tex = t.createCanvas("feel_frost", 96, 48)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(48, 24, 2, 48, 24, 46);
    g.addColorStop(0, "rgba(210,240,255,0.55)");
    g.addColorStop(1, "rgba(210,240,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(48, 24, 46, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
  if (!t.exists("feel_ring")) {
    // Ground shockwave ring: expanded flat (scaleY < scaleX at use).
    const tex = t.createCanvas("feel_ring", 128, 128)!;
    const ctx = tex.getContext();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 40, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
  }
  if (!t.exists("feel_crystal")) {
    // Small diamond icon for the boss-bar phase checkpoint.
    const tex = t.createCanvas("feel_crystal", 32, 32)!;
    const ctx = tex.getContext();
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(30, 16);
    ctx.lineTo(16, 30);
    ctx.lineTo(2, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(197,155,255,1)";
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(24, 16);
    ctx.lineTo(16, 24);
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }
  if (!t.exists("feel_streak")) {
    // Horizontal wind streak for dash presentation (BossFeel): bright violet
    // core fading to transparent at both ends, tinted per boss at use.
    const tex = t.createCanvas("feel_streak", 160, 24)!;
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 160, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.65, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(80, 12, 78, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(80, 12, 60, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
}
