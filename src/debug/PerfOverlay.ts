import Phaser from "phaser";
import { FONT, GAME_W } from "../config";

/**
 * DEBUG-ONLY perf overlay (Angelo, 2026-11-06 voice call: "Ese no va para
 * producción. Eso solamente es para ahora.").
 *
 * The overlay lives in this one module behind ONE flag so that production
 * is a one-line change and no overlay code is scattered through the HUD:
 *
 *   ?fps=1 in the URL  -> overlay shows (dev harness / debug builds).
 *   anything else       -> nothing is created, nothing runs, zero overhead.
 *                          Default OFF -- production can never show it by
 *                          accident; there is no build-time flag to forget.
 *
 * HudScene is the only caller: it constructs PerfOverlay (after the
 * cinemaTop snapshot, so setCinema never hides it) and calls update()
 * once per frame. When the flag is false, HudScene never constructs it.
 *
 * Readout: "60 FPS · 16.6ms · 0 drops" in the free top-right corner
 * (pill right edge x = GAME_W - 12, y 10-32). "ms" is the per-frame render
 * time (EMA of game.loop.rawDelta), NEVER network latency. "drops" counts
 * frames with rawDelta > 33ms (over 2x the 60fps budget) since the scene
 * started. Text refreshes 2x/sec so it never jitters.
 *
 * NOTE (v64): ms/drops MUST read game.loop.rawDelta, NOT game.loop.delta.
 * Phaser 3.90 smooths + clamps `delta` to the 16.7ms target (TimeStep.
 * smoothDelta), so `delta` reads 16.7ms even while the real frame rate is
 * 5 FPS -- an overlay built on it would say "16.6ms · 0 drops" forever
 * and never show a hitch. `rawDelta` is the actual elapsed time between
 * updates, uncapped and unsmoothed (verified in the v64 harness: rawDelta
 * ~150-250ms at ~5 FPS while delta sat pinned at 16.7ms).
 */
export const PERF_OVERLAY_ENABLED =
  new URLSearchParams(location.search).get("fps") === "1";

export class PerfOverlay {
  private scene: Phaser.Scene;
  private text!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Graphics;
  private emaMs = 16.6;
  private drops = 0;
  private lastText = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.graphics().setDepth(90);
    this.text = scene.add
      .text(0, 0, "", { fontFamily: FONT, fontSize: "11px", fontStyle: "bold", color: "#e8dcff" })
      .setOrigin(1, 0)
      .setDepth(91);
    this.refresh();
  }

  /** Accumulate every frame; refresh the text 2x/sec. */
  update(time: number): void {
    // rawDelta, NOT delta: Phaser clamps + smooths `delta` to the 16.7ms
    // target, so it never shows a slow frame (see header note).
    const delta = this.scene.game.loop.rawDelta;
    this.emaMs += (delta - this.emaMs) * 0.1;
    if (delta > 33) this.drops++;
    if (time - this.lastText >= 500) {
      this.lastText = time;
      this.refresh();
    }
  }

  /** Set the perf text and redraw the pill behind it to fit. */
  private refresh(): void {
    const fps = Math.round(this.scene.game.loop.actualFps);
    this.text.setText(`${fps} FPS · ${this.emaMs.toFixed(1)}ms · ${this.drops} drops`);
    const w = Math.ceil(this.text.width) + 16;
    const h = Math.ceil(this.text.height) + 8;
    const x = GAME_W - 12 - w;
    const y = 10;
    this.bg.clear();
    this.bg.fillStyle(0x0b0716, 0.55).fillRoundedRect(x, y, w, h, 9);
    this.text.setPosition(GAME_W - 12 - 8, y + 4);
  }
}
