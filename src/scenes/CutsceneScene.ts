import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";

/**
 * Full-screen video cutscene player (Angelo's ruling 2026-10-21: story beats
 * are VIDEOS, never in-engine dialogue). GameScene launches this scene on top
 * and pauses itself; when the queue finishes (or every clip fails), this
 * scene emits "cutscene:done" on the global game events, resumes Game and
 * stops itself. A clip can be skipped with a tap/click after 1.2 s. Every
 * clip has a watchdog so a stalled video can never soft-lock the game.
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
      const startedAt = this.time.now;
      let watchdog: Phaser.Time.TimerEvent | undefined;
      const cleanup = () => {
        watchdog?.remove(false);
        this.input.off("pointerdown", skip);
        video.destroy();
      };
      const skip = () => {
        if (this.time.now - startedAt < 1200) return;
        cleanup();
        settle();
      };
      const fit = () => {
        const vw = video.width || 1280;
        const vh = video.height || 720;
        const s = Math.max(GAME_W / vw, GAME_H / vh);
        video.setDisplaySize(vw * s, vh * s);
      };
      video.on("created", () => {
        fit();
        const dur = video.getDuration();
        const ms = Number.isFinite(dur) && dur > 0 ? dur * 1000 + 5000 : 45000;
        watchdog = this.time.delayedCall(ms, () => {
          console.warn(`[cutscene] watchdog fired for ${key}`);
          cleanup();
          settle();
        });
      });
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
    this.time.delayedCall(280, () => {
      this.game.events.emit("cutscene:done");
      this.scene.resume("Game");
      this.scene.stop();
    });
  }
}
