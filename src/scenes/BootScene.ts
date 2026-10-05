import Phaser from "phaser";
import { buildSharedTextures, createAnimations, queueAssets } from "../assets/manifest";
import { FONT, GAME_H, GAME_W, LAST_CHAPTER, LEVELS } from "../config";
import { fitCamera } from "../render";

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
      .setOrigin(0.5);
    const barBg = this.add.rectangle(cx, cy + 20, 420, 22, 0x2a1640).setStrokeStyle(3, 0xffd36b);
    const bar = this.add.rectangle(cx - 206, cy + 20, 0, 12, 0xff8a3d).setOrigin(0, 0.5);
    const label = this.add.text(cx, cy + 58, "Loading 0%", { fontFamily: FONT, fontSize: "18px", color: "#fff4d6" }).setOrigin(0.5);
    this.load.on("progress", (p: number) => {
      bar.width = 412 * p;
      label.setText(`Loading ${Math.round(p * 100)}%`);
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[assets] failed to load ${file.key} (${file.src})`);
    });
    void barBg;
    queueAssets(this.load);
  }

  create() {
    createAnimations(this.anims);
    buildSharedTextures(this);
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
