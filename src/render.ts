import Phaser from "phaser";
import { GAME_H, GAME_W } from "./config";

/**
 * The game is laid out in a fixed 1280x576 logical space, but the canvas is allocated at
 * RENDER_SCALE times that so it maps ~1:1 onto device pixels (sharp in fullscreen on
 * phones). Every scene camera zooms by the same factor, so game code never sees it.
 */
const MAX_SCALE = 2;
const MIN_SCALE = 1;
const STORE_KEY = "angelys-world-render-scale";
export const RENDER_SCALE_EVENT = "render-scale";

function deviceScale() {
  const dpr = window.devicePixelRatio || 1;
  // Size for fullscreen, not the current window, so entering fullscreen stays sharp.
  const px = Math.max(window.screen.width, window.screen.height, window.innerWidth) * dpr;
  return Phaser.Math.Clamp(Math.ceil((px / GAME_W) * 4) / 4, MIN_SCALE, MAX_SCALE);
}

function initialScale() {
  const q = new URLSearchParams(location.search).get("res");
  if (q) return Phaser.Math.Clamp(Number(q) || 1, MIN_SCALE, MAX_SCALE);
  const saved = Number(localStorage.getItem(STORE_KEY));
  return saved ? Math.min(saved, deviceScale()) : deviceScale();
}

let scale = initialScale();

export function renderScale() {
  return scale;
}

export const CANVAS_W = () => Math.round(GAME_W * scale);
export const CANVAS_H = () => Math.round(GAME_H * scale);

/**
 * Zoom a scene's main camera to logical units. Fixed-screen scenes (title, HUD) pin the
 * camera origin to the top-left so screen = logical * scale; the scrolling game scene
 * keeps the centred origin that Phaser's follow and bounds logic expect.
 */
export function fitCamera(scene: Phaser.Scene, scrolling = false) {
  const apply = () => {
    const cam = scene.cameras.main;
    cam.setZoom(scale);
    if (!scrolling) cam.setOrigin(0, 0);
  };
  apply();
  scene.game.events.on(RENDER_SCALE_EVENT, apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(RENDER_SCALE_EVENT, apply));
}

/** Text is rasterised once; give it enough pixels for the zoomed camera. */
export function patchTextResolution() {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
  };
  const orig = factory.text;
  factory.text = function (x, y, text, style) {
    return orig.call(this, x, y, text, { resolution: scale, ...style });
  };
}

function setScale(game: Phaser.Game, next: number) {
  scale = next;
  localStorage.setItem(STORE_KEY, String(next));
  game.scale.resize(CANVAS_W(), CANVAS_H());
  game.events.emit(RENDER_SCALE_EVENT, next);
}

/**
 * Keep 60 fps on slower phones: if the frame rate stays low, step the canvas resolution
 * down (sharpness matters less than smoothness). The choice is remembered per device.
 */
export function startPerfGuard(game: Phaser.Game) {
  if (new URLSearchParams(location.search).has("res")) return;
  let samples: number[] = [];
  let warmup = 0;
  game.events.on(Phaser.Core.Events.STEP, (_t: number, delta: number) => {
    if (document.hidden) return;
    if (warmup < 180) {
      warmup++;
      return;
    }
    samples.push(delta);
    if (samples.length < 120) return;
    samples.sort((a, b) => a - b);
    const median = samples[60];
    samples = [];
    if (1000 / median < 52 && scale > MIN_SCALE) {
      setScale(game, Math.max(MIN_SCALE, scale - 0.25));
      warmup = 60;
    }
  });
}
