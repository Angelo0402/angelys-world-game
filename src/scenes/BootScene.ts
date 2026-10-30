import Phaser from "phaser";
import { buildFeelTextures, buildSharedTextures, createAnimations, queueAssets } from "../assets/manifest";
import { FONT, GAME_H, GAME_W, LAST_CHAPTER, LEVELS } from "../config";
import { fitCamera } from "../render";
import { coverImage } from "../ui/screen";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    fitCamera(this);
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    this.add
      .text(cx, cy - 50, "ANGELY'S WORLD", { fontFamily: FONT, fontSize: "44px", fontStyle: "bold", color: "#fff4d6", stroke: "#2a1640", strokeThickness: 8 })
      .setOrigin(0.5).setDepth(10);
    const barBg = this.add.rectangle(cx, cy + 20, 420, 22, 0x2a1640).setStrokeStyle(3, 0xffd36b).setDepth(10);
    const bar = this.add.rectangle(cx - 206, cy + 20, 0, 12, 0xff8a3d).setOrigin(0, 0.5).setDepth(10);
    const label = this.add.text(cx, cy + 58, "Loading 0%", { fontFamily: FONT, fontSize: "18px", color: "#fff4d6" }).setOrigin(0.5).setDepth(10);
    this.load.on("progress", (p: number) => {
      bar.width = 412 * p;
      label.setText(`Loading ${Math.round(p * 100)}%`);
    });
    // Boot art (ChatGPT, 2026-10-25): queued first so it appears early,
    // behind the title/bar (depth 10). If it fails to load, the bare
    // title + bar screen remains — the loaderror handler below logs it.
    this.load.image("boot_bg", "assets/runtime/backdrops/boot_bg.jpg");
    // Pause menu art (2026-10-30, diseño de Angelo): fondo del pause nuevo.
    this.load.image("pause_menu_art", "assets/runtime/backdrops/pause_menu.png");
    this.load.once("filecomplete-image-boot_bg", () => {
      coverImage(this, "boot_bg").setDepth(0);
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[assets] failed to load ${file.key} (${file.src})`);
    });
    void barBg;
    queueAssets(this.load);
    // Story cutscene videos. The third load.video arg is noAudio: it MUST be
    // false — passing true mutes every clip in-game (found 2026-10-24: that
    // flag, not the files, is why no cutscene ever had sound). Clips carry
    // their own sound; videos without an audio track just play silent.
    for (const key of ["intro", "umbra_falls", "worm_intro", "worm_victory", "veil_intro", "veil_52_intro", "veil_epic_intro", "veil_transform_1", "veil_pov_cutscene", "final_boss_intro", "final_boss_phase2_kill", "finale1", "finale2"]) {
      this.load.video(key, `assets/video/${key}.mp4`, false);
    }
    this.load.image("the_end_art", "assets/the_end_art.png");
    // Per-chapter Game Over art (2026-10-26): painted panels, one per
    // chapter, shown by HudScene.showGameOver. Keys gameover_ch1..ch10.
    for (let ch = 1; ch <= 10; ch++) {
      this.load.image(`gameover_ch${ch}`, `assets/gameover/gameover_ch${ch}.png`);
    }
  }

  create() {
    createAnimations(this.anims);
    buildSharedTextures(this);
    buildFeelTextures(this);
    // ?level=3-2 (or a 0-based index) and ?chapter=N jump straight into play, for testing.
    const params = new URLSearchParams(location.search);
    const lv = params.get("level");
    const ch = Number(params.get("chapter"));
    let index = -1;
    if (lv) {
      const m = /^(\d+)-(\d+)$/.exec(lv);
      index = m ? LEVELS.findIndex((l) => l.chapter === Number(m[1]) && l.stage === Number(m[2])) : Number(lv);
    } else if (ch >= 1 && ch <= LAST_CHAPTER) index = (ch - 1) * 2;
    if (index >= 0 && index < LEVELS.length) {
      this.scene.start("Game", { level: index });
      return;
    }
    this.scene.start("Title");
  }
}
