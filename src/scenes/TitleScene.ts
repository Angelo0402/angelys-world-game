import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { CHAPTERS, FONT, FONT_DISPLAY, GAME_H, GAME_W, levelLabel, levelsOf, type ChapterId } from "../config";
import { loadSave, updateSave } from "../save";
import { Button, titleText } from "../ui/Button";
import { drawPlaque, drawRule } from "../ui/frame";
import { coverImage, requestFullscreenLandscape, useTouchUi } from "../ui/screen";
import { fitCamera } from "../render";
import { Gamepad } from "../input/gamepad";
import { PadMenu, type NavItem } from "../ui/padMenu";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(data: { select?: boolean }) {
    fitCamera(this);
    Audio.music("music_title");
    Audio.duck(false);
    this.cameras.main.fadeIn(500, 18, 13, 31);
    if (data?.select) {
      coverImage(this, "title_bg").setTint(0x9a94c0);
      this.add.rectangle(0, 0, GAME_W, GAME_H, 0x120d1f, 0.3).setOrigin(0);
      this.showChapterSelect();
      this.padStatus(18, GAME_H - 8, "left");
    } else {
      this.showTitle();
      this.padStatus(GAME_W / 2, GAME_H - 22, "center");
    }
  }

  private padStatus(x: number, y: number, align: "center" | "left") {
    const label = this.add
      .text(x, y, "", { fontFamily: FONT, fontSize: align === "left" ? "13px" : "14px", color: "#e8dcff", stroke: "#1b0f2e", strokeThickness: 4 })
      .setOrigin(align === "left" ? 0 : 0.5, 1)
      .setDepth(50);
    const render = () => {
      if (!Gamepad.supported) label.setText("Controller unavailable here: open the game over https:// or localhost").setColor("#ffc27a");
      else if (Gamepad.connected) label.setText(`Controller connected: ${Gamepad.name.replace(/\s*\(.*$/, "").slice(0, 48)}`).setColor("#9ff5ff");
      else label.setText("Xbox: press any button to connect  •  Stick move  •  A jump  •  X attack  •  Y swap");
    };
    render();
    const off = Gamepad.onConnectionChange(render);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private showTitle() {
    // The art is 16:9 and the game is wider: show all of it (logo included) over a
    // blurred, darkened cover copy, with soft gradients hiding the seams.
    const back = coverImage(this, "title_splash").setTint(0x6a6488);
    back.preFX?.addBlur(1, 2, 2, 1.2);
    const art = this.add.image(GAME_W / 2, GAME_H / 2, "title_splash");
    const base = GAME_H / art.height;
    const edge = this.add.graphics();
    const seam = (art.width * base) / 2;
    edge.fillGradientStyle(0x120d1f, 0x120d1f, 0x120d1f, 0x120d1f, 0, 0.85, 0, 0.85).fillRect(GAME_W / 2 - seam - 60, 0, 80, GAME_H);
    edge.fillGradientStyle(0x120d1f, 0x120d1f, 0x120d1f, 0x120d1f, 0.85, 0, 0.85, 0).fillRect(GAME_W / 2 + seam - 20, 0, 80, GAME_H);
    edge.fillStyle(0x120d1f, 0.85).fillRect(0, 0, GAME_W / 2 - seam - 60 + 1, GAME_H).fillRect(GAME_W / 2 + seam + 60 - 1, 0, GAME_W, GAME_H);
    edge.setAlpha(0.55);
    art.setScale(base * 1.05);
    this.tweens.add({ targets: art, scale: base, duration: 2600, ease: "Cubic.out" });
    this.tweens.add({ targets: art, scale: base * 1.02, duration: 7000, delay: 2600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    const shade = this.add.graphics();
    for (let i = 0; i < 16; i++) shade.fillStyle(0x120d1f, (i / 16) * 0.55).fillRect(0, GAME_H - 128 + i * 8, GAME_W, 8);

    this.add.particles(0, 0, "dot", {
      x: { min: 0, max: GAME_W },
      y: { min: 60, max: GAME_H },
      lifespan: { min: 2200, max: 4200 },
      speedY: { min: -26, max: -8 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xfff27a, 0x9ff5ff, 0xffb3e6, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 90,
    });

    const flash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0.55).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, delay: 250, onComplete: () => flash.destroy() });

    const dock = this.add.graphics();
    drawPlaque(dock, GAME_W / 2 - 360, GAME_H - 154, 720, 142, {
      radius: 26,
      fill: 0x140c24,
      fillAlpha: 0.62,
      stroke: 0xffd36b,
      gems: false,
    });

    const play = new Button(this, GAME_W / 2, GAME_H - 108, "PLAY", () => {
      requestFullscreenLandscape(this);
      menu.destroy();
      this.cameras.main.fadeOut(260, 18, 13, 31);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.restart({ select: true }));
    }, { width: 260, height: 62, fontSize: 32 });
    play.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: play, alpha: 1, scale: 1, duration: 520, delay: 900, ease: "Back.out" });
    this.tweens.add({ targets: play, scale: 1.05, duration: 900, delay: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    const hint = this.add
      .text(GAME_W / 2, GAME_H - 56, "", { fontFamily: FONT, fontSize: "15px", color: "#fff4d6", stroke: "#1b0f2e", strokeThickness: 4, letterSpacing: 0.4 })
      .setOrigin(0.5)
      .setAlpha(0);
    const renderHint = () =>
      hint.setText(
        Gamepad.connected
          ? "Stick to move  •  A jump  •  X attack  •  Y swap weapon  •  Menu pause"
          : useTouchUi(this)
            ? "Joystick to move  •  JUMP to stomp enemies"
            : "A/D or arrows to move  •  W / Space jump  •  J attack  •  Q swap weapon",
      );
    renderHint();
    const off = Gamepad.onConnectionChange(renderHint);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    this.tweens.add({ targets: hint, alpha: 1, duration: 500, delay: 1300 });

    const menu = new PadMenu(this, [play]);
  }

  private showChapterSelect() {
    const save = loadSave();
    titleText(this, GAME_W / 2, 28, "CHOOSE A LEVEL", 32).setDepth(6);
    const rule = this.add.graphics().setDepth(6);
    drawRule(rule, GAME_W / 2, 52, 300);
    const ids: ChapterId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const nav: NavItem[] = [];
    let initial = 0;
    let picked = false;
    const start = (index: number) => {
      if (picked) return;
      picked = true;
      Audio.sfx("button");
      requestFullscreenLandscape(this);
      this.cameras.main.fadeOut(300, 18, 13, 31);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Splash", { level: index }));
    };
    const CW = 392;
    const CH = 156;
    const GAP_X = 14;
    const GAP_Y = 6;
    const top = 62;
    ids.forEach((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = GAME_W / 2 + (col - 1) * (CW + GAP_X);
      const y = top + CH / 2 + row * (CH + GAP_Y);
      const ch = CHAPTERS[id];
      const stages = levelsOf(id);
      const locked = stages[0].index > save.level;
      const card = this.add.container(x, y + 10).setAlpha(0);
      const frame = this.add.graphics();
      const gold = id === 5 ? 0xd2a4ff : 0xffd36b;
      drawPlaque(frame, -CW / 2, -CH / 2, CW, CH, {
        radius: 18,
        fill: 0x160c28,
        fillAlpha: locked ? 0.84 : 0.78,
        stroke: locked ? 0x5a5470 : gold,
        accent: locked ? 0x8a84a0 : 0xfff6d8,
        gems: false,
      });
      const iw = CW - 20;
      const ih = 50;
      const img = this.add.image(0, -CH / 2 + 5 + ih / 2, ch.splash);
      img.setScale(Math.min(iw / img.width, ih / img.height));
      if (locked) img.setTint(0x333344);
      const num = this.add
        .text(0, -10, `CHAPTER ${id}`, { fontFamily: FONT_DISPLAY, fontSize: "13px", color: id === 5 ? "#e4c2ff" : "#ffd36b", letterSpacing: 1.1 })
        .setOrigin(0.5);
      const name = this.add
        .text(0, 4, ch.name, { fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: locked ? "#8a84a0" : "#ffffff", stroke: "#2a1640", strokeThickness: 4 })
        .setOrigin(0.5);
      card.add([frame, img, num, name]);
      if (locked) {
        const lock = this.add.graphics();
        drawLock(lock, 0, -CH / 2 + 5 + ih / 2, 0.68);
        card.add(lock);
      }
      stages.forEach((l, k) => {
        const ly = 28 + k * 26;
        const open = l.index <= save.level;
        const pill = this.add.container(0, ly);
        const g = this.add.graphics();
        const draw = (focus: boolean) => {
          g.clear();
          const px = -CW / 2 + 14;
          const py = -13;
          const pw = CW - 28;
          const ph = 26;
          g.fillStyle(open ? (l.boss ? 0x4a2278 : 0x2c1b4e) : 0x1a1428, 0.96).fillRoundedRect(px, py, pw, ph, 8);
          g.fillStyle(open ? gold : 0x3a3450, focus ? 1 : 0.9).fillRoundedRect(px, py, 5, ph, 2);
          g.lineStyle(focus ? 2.5 : 1.5, focus ? 0xfff4a8 : open ? gold : 0x4a4460, 1).strokeRoundedRect(px, py, pw, ph, 8);
        };
        draw(false);
        const kind = l.boss ? "BOSS" : l.mode === "climb" ? "VERTICAL" : l.mode === "chase" ? "CHASE" : l.mode === "swim" ? "SWIM" : l.goal === "gems" ? "GEMS" : "";
        const tag = this.add.text(-CW / 2 + 28, 0, kind ? `${levelLabel(l)}  •  ${kind}` : levelLabel(l), {
          fontFamily: FONT, fontSize: "13px", fontStyle: "bold", color: open ? (l.boss ? "#e0b8ff" : "#ffd36b") : "#6a6480", letterSpacing: 0.4,
        }).setOrigin(0, 0.5);
        const nm = this.add.text(0, 0, l.name, {
          fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: open ? "#ffffff" : "#6a6480",
        }).setOrigin(0, 0.5);
        nm.setX(tag.x + tag.width + 12);
        const room = CW / 2 - 34 - nm.x;
        if (nm.width > room) nm.setFontSize(Math.max(11, Math.floor((15 * room) / nm.width)));
        pill.add([g, tag, nm]);
        if (open && l.index < save.level) {
          const star = this.add.text(CW / 2 - 24, 0, "★", { fontFamily: FONT, fontSize: "18px", color: "#ffd36b" }).setOrigin(1, 0.5);
          pill.add(star);
        }
        if (!open) {
          const lk = this.add.graphics();
          drawLock(lk, CW / 2 - 36, -1, 0.4);
          pill.add(lk);
        }
        card.add(pill);
        if (!open) return;
        pill.setSize(CW - 28, 30).setInteractive({ useHandCursor: true });
        pill.on("pointerover", () => {
          draw(true);
          this.tweens.killTweensOf(pill);
          this.tweens.add({ targets: pill, scale: 1.035, duration: 110, ease: "Quad.out" });
        });
        pill.on("pointerout", () => {
          draw(false);
          this.tweens.killTweensOf(pill);
          this.tweens.add({ targets: pill, scale: 1, duration: 110, ease: "Quad.out" });
        });
        pill.on("pointerup", () => start(l.index));
        if (l.index === save.level) initial = nav.length;
        nav.push({ x, y: y + ly, focus: (on) => draw(on), activate: () => start(l.index) });
      });
      this.tweens.add({ targets: card, alpha: 1, y, duration: 320, delay: 40 * i, ease: "Cubic.out" });
    });
    if (save.level > 0 || save.weapons.length) {
      const reset = new Button(this, GAME_W - 88, 30, "RESET", () => {
        if (window.confirm("Reset all progress? Unlocked levels and weapons will be lost.")) {
          updateSave({ level: 0, weapons: [], cleared: false });
          this.scene.restart({ select: true });
        }
      }, { width: 128, height: 38, fontSize: 15, color: 0x7a5aa8 });
      reset.setDepth(6);
      nav.push(reset);
    }
    new PadMenu(this, nav, { initial, back: () => this.scene.restart({ select: false }) });
  }
}

export function drawLock(g: Phaser.GameObjects.Graphics, x: number, y: number, s = 1) {
  g.lineStyle(7 * s, 0xffd36b, 1);
  g.beginPath();
  g.arc(x, y - 8 * s, 14 * s, Math.PI, 0);
  g.strokePath();
  g.fillStyle(0xffd36b, 1).fillRoundedRect(x - 22 * s, y - 8 * s, 44 * s, 34 * s, 6 * s);
  g.fillStyle(0x2a1640, 1).fillCircle(x, y + 6 * s, 5 * s).fillRect(x - 2 * s, y + 6 * s, 4 * s, 10 * s);
}
