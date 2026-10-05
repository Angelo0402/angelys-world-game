import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { CHAPTERS, FONT, GAME_H, GAME_W, levelLabel, levelsOf, type ChapterId } from "../config";
import { loadSave, updateSave } from "../save";
import { Button, titleText } from "../ui/Button";
import { coverImage, requestFullscreenLandscape, useTouchUi } from "../ui/screen";
import { fitCamera } from "../render";
import { Gamepad } from "../input/gamepad";
import { PadMenu, type NavItem } from "../ui/padMenu";

export class TitleScene extends Phaser.Scene {
  /** Co-op state carried through Title -> Splash -> Game. Set from scene data. */
  private coop = false;
  private p1Char?: string;
  private p2Char?: string;

  constructor() {
    super("Title");
  }

  create(data: { select?: boolean; coop?: boolean; p1Char?: string; p2Char?: string }) {
    fitCamera(this);
    Audio.music("music_title");
    Audio.duck(false);
    this.cameras.main.fadeIn(500, 18, 13, 31);
    this.coop = !!data?.coop;
    this.p1Char = data?.p1Char;
    this.p2Char = data?.p2Char;
    if (data?.select) {
      coverImage(this, "title_bg").setTint(0x9a94c0);
      this.add.rectangle(0, 0, GAME_W, GAME_H, 0x120d1f, 0.3).setOrigin(0);
      this.showChapterSelect();
    } else {
      this.showTitle();
    }
    this.padStatus(data?.select ? 22 : GAME_H - 4, !!data?.select);
  }

  private padStatus(y: number, top = false) {
    const label = this.add
      .text(GAME_W / 2, y, "", { fontFamily: FONT, fontSize: top ? "12px" : "14px", color: "#e8dcff", stroke: "#1b0f2e", strokeThickness: 4 })
      .setOrigin(0.5, top ? 0 : 1)
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

    const play = new Button(this, GAME_W / 2 - 140, GAME_H - 78, "PLAY", () => {
      requestFullscreenLandscape(this);
      menu.destroy();
      this.cameras.main.fadeOut(260, 18, 13, 31);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.restart({ select: true }));
    }, { width: 260, height: 62, fontSize: 32 });
    play.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: play, alpha: 1, scale: 1, duration: 520, delay: 900, ease: "Back.out" });
    this.tweens.add({ targets: play, scale: 1.05, duration: 900, delay: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    const coop = new Button(this, GAME_W / 2 + 140, GAME_H - 78, "CO-OP", () => {
      requestFullscreenLandscape(this);
      this.showCoopMenu();
    }, { width: 260, height: 62, fontSize: 32, color: 0x3ecbff });
    coop.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: coop, alpha: 1, scale: 1, duration: 520, delay: 1000, ease: "Back.out" });

    const hint = this.add
      .text(GAME_W / 2, GAME_H - 30, "", { fontFamily: FONT, fontSize: "16px", color: "#fff4d6", stroke: "#1b0f2e", strokeThickness: 4 })
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

  /** Co-op multiplayer: create or join a room with a 6-char code. */
  private showCoopMenu() {
    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0818, 0.92).fillRect(0, 0, GAME_W, GAME_H);
    overlay.add(bg);

    const title = this.add.text(GAME_W / 2, 140, "CO-OP MULTIPLAYER", {
      fontFamily: FONT, fontSize: "42px", fontStyle: "bold", color: "#7ad4ff", stroke: "#0d0818", strokeThickness: 6,
    }).setOrigin(0.5);
    overlay.add(title);

    const status = this.add.text(GAME_W / 2, 200, "Play with a friend!", {
      fontFamily: FONT, fontSize: "22px", color: "#fff4d6", stroke: "#0d0818", strokeThickness: 4,
    }).setOrigin(0.5);
    overlay.add(status);

    const createBtn = new Button(this, GAME_W / 2, 300, "CREATE ROOM", async () => {
      status.setText("Creating room...");
      try {
        const { multiplayer } = await import("../net/multiplayer");
        const code = await multiplayer.createRoom();
        status.setText(`Room code: ${code}\nShare it with your friend!`);
        // Show big code
        const codeText = this.add.text(GAME_W / 2, 380, code, {
          fontFamily: FONT, fontSize: "72px", fontStyle: "bold", color: "#ffd36b", stroke: "#0d0818", strokeThickness: 8,
        }).setOrigin(0.5);
        overlay.add(codeText);
        status.setText("Waiting for friend to join...");
        multiplayer.joinRoom(code);
        multiplayer.on("player-joined", () => {
          status.setText("Friend joined! Starting...");
          this.time.delayedCall(1000, () => this.scene.start("CharacterSelect", { coop: true }));
        });
      } catch {
        status.setText("Failed to create room. Check connection.");
      }
    }, { width: 320, height: 64, fontSize: 28 });
    overlay.add(createBtn);

    const joinBtn = new Button(this, GAME_W / 2, 390, "JOIN ROOM", () => {
      status.setText("Enter the 6-letter code:");
      // Simple prompt (mobile keyboards work with this)
      const code = window.prompt("Enter room code:");
      if (code && code.length === 6) {
        import("../net/multiplayer").then(({ multiplayer }) => {
          status.setText("Joining...");
          multiplayer.joinRoom(code.toUpperCase());
          multiplayer.on("welcome", () => {
            status.setText("Joined! Starting...");
            this.time.delayedCall(1000, () => this.scene.start("CharacterSelect", { coop: true }));
          });
          multiplayer.on("disconnected", () => status.setText("Connection failed."));
        });
      }
    }, { width: 320, height: 64, fontSize: 28, color: 0x3ecbff });
    overlay.add(joinBtn);

    const backBtn = new Button(this, GAME_W / 2, 500, "BACK", () => {
      overlay.destroy();
    }, { width: 200, height: 52, fontSize: 24 });
    overlay.add(backBtn);
  }

  private showChapterSelect() {
    const save = loadSave();
    titleText(this, GAME_W / 2, 34, "CHOOSE A LEVEL", 34);
    if (this.coop) {
      // Co-op indicator so testers know the mode survived the transition.
      const p1 = this.p1Char ?? "angely";
      const p2 = this.p2Char ?? "angely";
      this.add.text(GAME_W / 2, 62, `CO-OP  •  P1: ${p1.toUpperCase()}   P2: ${p2.toUpperCase()}`, {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#7ad4ff", stroke: "#1b0f2e", strokeThickness: 4,
      }).setOrigin(0.5).setDepth(60);
    }
    // Chapters from config — adapts to any chapter count.
    const ids = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b) as ChapterId[];
    const nav: NavItem[] = [];
    let initial = 0;
    let picked = false;
    const start = (index: number) => {
      if (picked) return;
      picked = true;
      Audio.sfx("button");
      requestFullscreenLandscape(this);
      this.cameras.main.fadeOut(300, 18, 13, 31);
      this.cameras.main.once("camerafadeoutcomplete", () =>
        this.scene.start("Splash", { level: index, coop: this.coop, p1Char: this.p1Char, p2Char: this.p2Char }),
      );
    };

    // ---- vertical scroll list, big thumbnails (Angelo: scroll de arriba para abajo) ----
    const LIST_TOP = 72;
    const LIST_H = GAME_H - LIST_TOP - 14;
    const CARD_W = 1060;
    const CARD_H = 208;
    const GAP = 18;
    const list = this.add.container(GAME_W / 2, LIST_TOP);
    const maskG = this.add.graphics().fillRect(0, LIST_TOP, GAME_W, LIST_H);
    list.setMask(maskG.createGeometryMask());

    let y = CARD_H / 2;
    ids.forEach((id) => {
      const ch = CHAPTERS[id];
      const stages = levelsOf(id);
      const locked = stages[0].index > save.level;
      const card = this.add.container(0, y);
      const gold = id === 5 ? 0xd2a4ff : 0xffd36b;
      const frame = this.add.graphics();
      frame.fillStyle(0x1b0f2e, 0.88).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
      frame.lineStyle(4, locked ? 0x5a5470 : gold, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
      card.add(frame);

      // big thumbnail, left
      const TW = 330, TH = 176;
      const tx = -CARD_W / 2 + 16 + TW / 2;
      const img = this.add.image(tx, 0, ch.splash);
      img.setScale(Math.max(TW / img.width, TH / img.height));
      img.setCrop((img.width - TW / img.scale) / 2, (img.height - TH / img.scale) / 2, TW / img.scale, TH / img.scale);
      if (locked) img.setTint(0x333344);
      const thumbFrame = this.add.graphics();
      thumbFrame.lineStyle(3, locked ? 0x5a5470 : gold, 0.9).strokeRoundedRect(tx - TW / 2, -TH / 2, TW, TH, 12);
      card.add([img, thumbFrame]);
      if (locked) {
        const lock = this.add.graphics();
        drawLock(lock, tx, 0, 1.1);
        card.add(lock);
      }

      // chapter info, right of thumbnail
      const infoX = -CARD_W / 2 + 16 + TW + 28;
      const num = this.add.text(infoX, -CARD_H / 2 + 36, `CHAPTER ${id}`, {
        fontFamily: FONT, fontSize: "20px", fontStyle: "bold",
        color: id === 5 ? "#e4c5ff" : "#ffe08a", stroke: "#120c28", strokeThickness: 3,
      }).setOrigin(0, 0.5);
      const name = this.add.text(infoX, -CARD_H / 2 + 68, ch.name, {
        fontFamily: FONT, fontSize: "30px", fontStyle: "bold",
        color: locked ? "#bbb4d0" : "#ffffff", stroke: "#120c28", strokeThickness: 5,
      }).setOrigin(0, 0.5);
      card.add([num, name]);

      // big tappable level pills
      stages.forEach((l, k) => {
        const pw = 300, ph = 58;
        const px = infoX + k * (pw + 16);
        const py = 54;
        const open = l.index <= save.level;
        const pill = this.add.container(px + pw / 2, py);
        const g = this.add.graphics();
        const draw = (focus: boolean) => {
          g.clear();
          g.fillStyle(open ? (l.boss ? 0x5a2a8a : 0x3a2560) : 0x241a36, 0.95).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 14);
          g.lineStyle(focus ? 4 : 2, focus ? 0xfff4a8 : open ? gold : 0x4a4460, 1).strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 14);
        };
        draw(false);
        const kind = l.boss ? "BOSS" : l.mode === "climb" ? "VERTICAL" : l.mode === "chase" ? "CHASE" : l.mode === "swim" ? "SWIM" : l.goal === "gems" ? "GEMS" : "";
        const label = this.add.text(0, -11, kind ? `${levelLabel(l)} \u2022 ${kind}` : levelLabel(l), {
          fontFamily: FONT, fontSize: "19px", fontStyle: "bold",
          color: open ? (l.boss ? "#e0b8ff" : "#ffe08a") : "#aaa2c0", stroke: "#241a36", strokeThickness: 3,
        }).setOrigin(0.5);
        const nm = this.add.text(0, 13, l.name, {
          fontFamily: FONT, fontSize: "16px", fontStyle: "bold",
          color: open ? "#ffffff" : "#aaa2c0", stroke: "#241a36", strokeThickness: 2,
        }).setOrigin(0.5);
        pill.add([g, label, nm]);
        if (open && l.index < save.level) {
          const star = this.add.text(pw / 2 - 14, -ph / 2 + 13, "\u2605", { fontFamily: FONT, fontSize: "22px", color: "#ffd36b" }).setOrigin(0.5);
          pill.add(star);
        }
        if (!open) {
          const lk = this.add.graphics();
          drawLock(lk, pw / 2 - 20, 0, 0.5);
          pill.add(lk);
        } else {
          pill.setSize(pw, ph).setInteractive({ useHandCursor: true });
          pill.on("pointerover", () => draw(true));
          pill.on("pointerout", () => draw(false));
          pill.on("pointerup", () => start(l.index));
          if (l.index === save.level) initial = nav.length;
          nav.push({ x: GAME_W / 2 + px + pw / 2, y: LIST_TOP + y + py, focus: (on) => draw(on), activate: () => start(l.index) });
        }
        card.add(pill);
      });

      list.add(card);
      y += CARD_H + GAP;
    });
    const contentH = y - GAP + CARD_H / 2;

    // drag to scroll
    let dragY = 0;
    let scrolling = false;
    const maxScroll = Math.max(0, contentH - LIST_H);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => { dragY = p.y; scrolling = true; });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!scrolling || !p.isDown) return;
      const dy = p.y - dragY;
      dragY = p.y;
      if (Math.abs(dy) > 2) list.y = Phaser.Math.Clamp(list.y + dy, LIST_TOP + LIST_H - contentH, LIST_TOP);
    });
    this.input.on("pointerup", () => { scrolling = false; });
    if (maxScroll > 0 && nav[initial]) {
      list.y = Phaser.Math.Clamp(LIST_TOP - (nav[initial].y - LIST_TOP - LIST_H / 2), LIST_TOP - maxScroll, LIST_TOP);
    }

    if (save.level > 0 || save.weapons.length) {
      const reset = new Button(this, GAME_W - 96, 34, "RESET", () => {
        if (window.confirm("Reset all progress? Unlocked levels and weapons will be lost.")) {
          updateSave({ level: 0, weapons: [], cleared: false });
          this.scene.restart({ select: true, coop: this.coop, p1Char: this.p1Char, p2Char: this.p2Char });
        }
      }, { width: 130, height: 40, fontSize: 16, color: 0x7a5aa8 });
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
