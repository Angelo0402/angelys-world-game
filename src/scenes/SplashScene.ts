import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { CHAPTERS, FONT, GAME_H, GAME_W, LEVELS, WEAPON_NAMES, levelLabel } from "../config";
import { titleText } from "../ui/Button";
import { coverImage } from "../ui/screen";
import { fitCamera } from "../render";
import { Gamepad } from "../input/gamepad";

export class SplashScene extends Phaser.Scene {
  constructor() {
    super("Splash");
  }

  create(data: { level?: number }) {
    fitCamera(this);
    const info = LEVELS[data.level ?? 0];
    const ch = CHAPTERS[info.chapter];
    Audio.music(ch.music);
    Audio.duck(true);
    Audio.sfx("chapter_transition");
    const img = coverImage(this, ch.splash);
    this.tweens.add({ targets: img, scale: img.scale * 1.06, duration: 6000, ease: "Sine.out" });
    this.add.rectangle(0, GAME_H - 172, GAME_W, 172, 0x120d1f, 0.62).setOrigin(0);
    this.add
      .text(GAME_W / 2, GAME_H - 156, `CHAPTER ${ch.id}: ${ch.name.toUpperCase()}`, { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e8dcff", stroke: "#2a1640", strokeThickness: 4 })
      .setOrigin(0.5);
    titleText(this, GAME_W / 2, GAME_H - 114, `LEVEL ${levelLabel(info)}: ${info.name.toUpperCase()}`, 36, info.boss ? "#e0b8ff" : "#ffe7a3");
    const what =
      info.goal === "kills" ? `Defeat ${info.need} enemies to unlock the portal`
        : info.goal === "gems" ? `Collect ${info.need} star gems to unlock the portal`
          : info.mode === "climb" ? "Climb the tower to the portal at the top"
            : info.mode === "chase" ? "Outrun the danger and reach the portal"
              : "Reach the portal";
    const goal = info.boss
      ? info.chapter === 11 ? "Face the Crystal Veil and free Angelo" : "Face Queen Umbra and bring the light back to every world"
      : `${info.weapon ? `Find the ${WEAPON_NAMES[info.weapon]}  •  ` : ""}${what}  •  ${info.tip}`;
    this.add
      .text(GAME_W / 2, GAME_H - 70, goal, { fontFamily: FONT, fontSize: "19px", color: "#fff4d6", stroke: "#2a1640", strokeThickness: 4, align: "center", wordWrap: { width: GAME_W - 120 } })
      .setOrigin(0.5);
    const tap = this.add
      .text(GAME_W / 2, GAME_H - 30, Gamepad.connected ? "Press A to begin" : "Tap to begin", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#ffd36b" })
      .setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.cameras.main.fadeIn(500, 0, 0, 0);

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      Audio.sfx("button");
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Game", { level: info.index }));
    };
    this.time.delayedCall(350, () => {
      this.input.once("pointerup", go);
      this.input.keyboard?.once("keydown", go);
      this.events.on(Phaser.Scenes.Events.UPDATE, () => {
        if (Gamepad.anyJustPressed()) go();
      });
    });
  }
}
