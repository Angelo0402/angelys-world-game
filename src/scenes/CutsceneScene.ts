import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";
import { fitCamera } from "../render";
import { Audio } from "../audio/AudioManager";

/**
 * Full-screen video cutscene player (Angelo's ruling 2026-10-21: story beats
 * are VIDEOS, never in-engine dialogue). GameScene launches this scene on top
 * and pauses itself; when the queue finishes (or every clip fails), this
 * scene emits "cutscene:done" on the global game events, resumes Game and
 * stops itself. A clip can be skipped with a tap/click after 1.2 s. Every
 * clip has a watchdog so a stalled video can never soft-lock the game.
 * Plus a 15 s start guard (2026-11-01, final-boss freeze): if a clip never
 * starts, it fails forward instead of hanging Game paused forever.
 */
export class CutsceneScene extends Phaser.Scene {
  private clips: string[] = [];

  constructor() {
    super("Cutscene");
  }

  init(data: { clips?: string[] }) {
    this.clips = [...(data.clips ?? [])];
  }

  create() {
    fitCamera(this);
    // Clips carry their own sound (loader passes noAudio=false since
    // 2026-10-24 — the old noAudio=true flag muted every cutscene). Keep
    // the game music at full level, never ducked, under the video.
    Audio.duck(false);
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    void this.playNext();
  }

  private async playNext() {
    const key = this.clips.shift();
    if (!key) {
      this.finish();
      return;
    }
    await this.playOne(key);
    await this.playNext();
  }

  private playOne(key: string): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      let video: Phaser.GameObjects.Video;
      try {
        if (!this.game.cache.video.exists(key)) {
          settle();
          return;
        }
        video = this.add.video(GAME_W / 2, GAME_H / 2, key);
      } catch (error) {
        console.warn(`[cutscene] cannot play ${key}:`, error);
        settle();
        return;
      }
      const startedAt = performance.now();
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      let startGuard: ReturnType<typeof setTimeout> | undefined;
      const el = video.video as HTMLVideoElement | undefined;
      const onVideoError = () => {
        console.warn(`[cutscene] video error for ${key}`);
        cleanup();
        settle();
      };
      const cleanup = () => {
        if (watchdog) clearTimeout(watchdog);
        if (startGuard) {
          clearTimeout(startGuard);
          startGuard = undefined;
        }
        el?.removeEventListener("error", onVideoError);
        this.input.off("pointerdown", skip);
        video.destroy();
      };
      // Start guard (2026-11-01, freeze del final boss): el watchdog de
      // duración solo se armaba en "created". Si el video falla antes de
      // arrancar en el teléfono, no había salida y Game quedaba pausado
      // para siempre. 15 s sin "created" y el clip se da por fallido: el
      // juego sigue al final en vez de quedarse congelado.
      startGuard = setTimeout(() => {
        console.warn(`[cutscene] start guard fired for ${key}`);
        cleanup();
        settle();
      }, 15000);
      el?.addEventListener("error", onVideoError);
      const skip = () => {
        if (performance.now() - startedAt < 1200) return;
        cleanup();
        settle();
      };
      const fit = () => {
        const el = video.video as HTMLVideoElement | undefined;
        const vw = el?.videoWidth || video.width || 1280;
        const vh = el?.videoHeight || video.height || 720;
        const s = Math.max(GAME_W / vw, GAME_H / vh);
        video.setDisplaySize(vw * s, vh * s);
      };
      video.on("created", () => {
        fit();
        // El video arrancó: el watchdog de duración toma el relevo.
        if (startGuard) {
          clearTimeout(startGuard);
          startGuard = undefined;
        }
        const dur = video.getDuration();
        const ms = Number.isFinite(dur) && dur > 0 ? dur * 1000 + 5000 : 45000;
        // Real-time watchdog (not scene time): even if rendering crawls,
        // a stalled clip can never hold the game hostage.
        watchdog = setTimeout(() => {
          console.warn(`[cutscene] watchdog fired for ${key}`);
          cleanup();
          settle();
        }, ms);
      });
      video.on("playing", () => fit());
      video.on("complete", () => {
        cleanup();
        settle();
      });
      this.input.on("pointerdown", skip);
      try {
        video.play(false);
      } catch (error) {
        console.warn(`[cutscene] play() failed for ${key}:`, error);
        cleanup();
        settle();
      }
    });
  }

  private finish() {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    // Real timer, not scene time: the hand-back to Game must not depend on
    // the renderer's frame rate.
    setTimeout(() => {
      this.game.events.emit("cutscene:done");
      this.scene.resume("Game");
      this.scene.stop();
    }, 300);
  }
}
