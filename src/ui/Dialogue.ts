import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { FONT, FONT_DISPLAY, GAME_H, GAME_W } from "../config";
import { Gamepad, PAD } from "../input/gamepad";
import { SPEAKERS, type DialogueLine } from "../story/umbra";
import { drawPlaque } from "./frame";

const BAR_H = 62;
const CPS = 44;
const BOX = { x: 120, y: GAME_H - 198, w: GAME_W - 240, h: 166 };
const SUB = { x: 270, y: GAME_H - 138, w: 700, h: 112 };

/**
 * Cutscene letterbox plus a subtitle box: portrait, speaker name and typewriter
 * text. Blocking dialogue advances on tap / A / Space / Enter and can be skipped;
 * subtitles show one line briefly without stopping play.
 */
export class Dialogue {
  private scene: Phaser.Scene;
  private top: Phaser.GameObjects.Rectangle;
  private bottom: Phaser.GameObjects.Rectangle;
  private topLine: Phaser.GameObjects.Rectangle;
  private bottomLine: Phaser.GameObjects.Rectangle;
  private box: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private ringFront: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private skip: Phaser.GameObjects.Text;
  private skipBg: Phaser.GameObjects.Graphics;
  private catcher: Phaser.GameObjects.Rectangle;
  private lines: DialogueLine[] = [];
  private index = 0;
  private shown = 0;
  private full = "";
  private startedAt = 0;
  private done?: () => void;
  private onLine?: (line: DialogueLine) => void;
  private subUntil = 0;
  private blocking = false;
  private openedAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.top = scene.add.rectangle(0, -BAR_H, GAME_W, BAR_H, 0x07040f).setOrigin(0).setDepth(200);
    this.bottom = scene.add.rectangle(0, GAME_H, GAME_W, BAR_H, 0x07040f).setOrigin(0).setDepth(200);
    this.topLine = scene.add.rectangle(0, -3, GAME_W, 3, 0xffd36b).setOrigin(0).setDepth(200);
    this.bottomLine = scene.add.rectangle(0, GAME_H, GAME_W, 3, 0xffd36b).setOrigin(0).setDepth(200);
    this.catcher = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.001).setOrigin(0).setDepth(201).setVisible(false);
    this.catcher.setInteractive();
    this.catcher.on("pointerup", (p: Phaser.Input.Pointer) => {
      const z = scene.cameras.main.zoom;
      if (p.x / z > GAME_W - 170 && p.y / z < 70) this.skipAll();
      else this.advance();
    });

    this.panel = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.ringFront = scene.add.graphics();
    this.portrait = scene.add.image(0, 0, "portrait_umbra");
    this.name = scene.add.text(0, 0, "", {
      fontFamily: FONT_DISPLAY, fontSize: "22px", fontStyle: "bold", color: "#ffffff", stroke: "#12081f", strokeThickness: 4, letterSpacing: 0.6,
    });
    this.text = scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "22px", color: "#fff8ea", lineSpacing: 8, stroke: "#12081f", strokeThickness: 4 });
    this.prompt = scene.add
      .text(0, 0, "NEXT", { fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: "#ffd36b", stroke: "#2a1640", strokeThickness: 4, letterSpacing: 1.2 })
      .setOrigin(1, 1);
    scene.tweens.add({ targets: this.prompt, alpha: 0.3, duration: 480, yoyo: true, repeat: -1 });
    this.box = scene.add.container(0, 0, [this.panel, this.ring, this.portrait, this.ringFront, this.name, this.text, this.prompt]).setDepth(202).setVisible(false);
    this.skipBg = scene.add.graphics().setDepth(202).setVisible(false);
    this.skip = scene.add
      .text(GAME_W - 28, 18, "SKIP", { fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: "#f4ecff", stroke: "#12081f", strokeThickness: 4, letterSpacing: 1 })
      .setOrigin(1, 0)
      .setDepth(203)
      .setVisible(false);

    const kb = scene.input.keyboard;
    const onKey = (e: KeyboardEvent) => {
      if (!this.blocking) return;
      if (e.code === "Escape") this.skipAll();
      else if (["Space", "Enter", "KeyJ", "KeyK", "KeyZ", "KeyX", "ArrowUp", "KeyW"].includes(e.code)) this.advance();
    };
    kb?.on("keydown", onKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb?.off("keydown", onKey));
  }

  get active() {
    return this.blocking;
  }

  cinema(on: boolean) {
    const t = this.scene.tweens;
    t.add({ targets: this.top, y: on ? 0 : -BAR_H, duration: 450, ease: "Sine.inOut" });
    t.add({ targets: this.bottom, y: on ? GAME_H - BAR_H : GAME_H, duration: 450, ease: "Sine.inOut" });
    t.add({ targets: this.topLine, y: on ? BAR_H - 3 : -3, duration: 450, ease: "Sine.inOut" });
    t.add({ targets: this.bottomLine, y: on ? GAME_H - BAR_H : GAME_H, duration: 450, ease: "Sine.inOut" });
  }

  play(lines: DialogueLine[], done: () => void, onLine?: (line: DialogueLine) => void) {
    this.lines = lines;
    this.index = 0;
    this.done = done;
    this.onLine = onLine;
    this.blocking = true;
    this.openedAt = this.scene.time.now;
    this.catcher.setVisible(true);
    this.skip.setVisible(true).setText(Gamepad.connected ? "MENU  SKIP" : "SKIP");
    this.layoutSkip();
    this.show(lines[0], BOX);
  }

  subtitle(line: DialogueLine, ms = 3800) {
    if (this.blocking) return;
    this.show(line, SUB);
    this.subUntil = this.scene.time.now + ms;
  }

  private show(line: DialogueLine, r: typeof BOX) {
    const sp = SPEAKERS[line.who];
    const left = sp.side === "left";
    const pr = r.h - 34;
    const px = left ? r.x + 18 + pr / 2 : r.x + r.w - 18 - pr / 2;
    const py = r.y + r.h / 2;
    const accent = sp.accent;
    const small = r === SUB;
    this.panel.clear();
    drawPlaque(this.panel, r.x, r.y, r.w, r.h, {
      radius: small ? 16 : 22,
      fill: 0x12081c,
      fillAlpha: 0.94,
      stroke: accent,
      accent: 0xfff6d8,
      gems: false,
    });
    this.portrait.setTexture(sp.portrait(line)).setPosition(px, py).setDisplaySize(pr, pr);
    this.ring.clear();
    this.ring.fillStyle(0x12081f, 1).fillCircle(px, py, pr / 2 + 1);
    this.ring.lineStyle(4, 0x1a0c28, 1).strokeCircle(px, py, pr / 2 + 4);
    this.ring.lineStyle(2.5, accent, 1).strokeCircle(px, py, pr / 2 + 4);
    this.ringFront.clear().lineStyle(1.5, 0xfff6d8, 0.85).strokeCircle(px, py, pr / 2 - 3);
    const tx = left ? r.x + pr + 44 : r.x + 28;
    const tw = r.w - pr - 80;
    const nameSize = small ? 16 : 22;
    const nameY = r.y + (small ? 10 : 16);
    this.name.setText(sp.name).setColor(sp.color).setPosition(tx, nameY).setFontSize(nameSize);
    const plateH = small ? 22 : 30;
    const plateW = this.name.width + 22;
    this.panel.fillStyle(accent, 0.16).fillRoundedRect(tx - 10, nameY - 4, plateW, plateH, 9);
    this.panel.lineStyle(1.25, accent, 0.7).strokeRoundedRect(tx - 10, nameY - 4, plateW, plateH, 9);
    this.text.setPosition(tx, nameY + plateH + 6).setFontSize(small ? 18 : 22).setWordWrapWidth(tw);
    this.prompt.setText(Gamepad.connected ? "A   NEXT" : "NEXT");
    this.prompt.setPosition(left ? r.x + r.w - 22 : r.x + r.w - pr - 36, r.y + r.h - 14).setVisible(false);
    this.full = line.text;
    this.shown = 0;
    this.text.setText("");
    this.startedAt = this.scene.time.now;
    this.box.setVisible(true).setAlpha(1);
    this.box.setData("who", line.who);
    if (r === BOX) this.onLine?.(line);
  }

  private advance() {
    if (!this.blocking || this.scene.time.now - this.openedAt < 250) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.text.setText(this.full);
      return;
    }
    this.index++;
    Audio.sfx("button");
    if (this.index >= this.lines.length) this.finish();
    else this.show(this.lines[this.index], BOX);
  }

  private skipAll() {
    if (!this.blocking) return;
    this.finish();
  }

  private layoutSkip() {
    const w = this.skip.width + 28;
    const h = 32;
    const x = this.skip.x - this.skip.width - 14;
    const y = this.skip.y - 6;
    this.skipBg.clear();
    drawPlaque(this.skipBg, x, y, w, h, { radius: 12, fill: 0x140c24, fillAlpha: 0.82, stroke: 0xc9b6e8, gems: false });
    this.skipBg.setVisible(true);
  }

  private finish() {
    this.blocking = false;
    this.catcher.setVisible(false);
    this.skip.setVisible(false);
    this.skipBg.setVisible(false);
    this.box.setVisible(false);
    const cb = this.done;
    this.done = undefined;
    this.onLine = undefined;
    cb?.();
  }

  update(time: number) {
    if (this.blocking) {
      if (Gamepad.justPressed(PAD.MENU) || Gamepad.justPressed(PAD.VIEW)) this.skipAll();
      else if (Gamepad.justPressed(PAD.A) || Gamepad.justPressed(PAD.B) || Gamepad.justPressed(PAD.X)) this.advance();
    } else if (this.box.visible && this.subUntil && time > this.subUntil) {
      this.subUntil = 0;
      this.scene.tweens.add({ targets: this.box, alpha: 0, duration: 300, onComplete: () => this.box.setVisible(false) });
    }
    if (!this.box.visible || this.shown >= this.full.length) {
      if (this.blocking && this.box.visible) this.prompt.setVisible(true);
      return;
    }
    const n = Math.min(this.full.length, Math.floor(((time - this.startedAt) / 1000) * CPS));
    if (n > this.shown) {
      if (Math.floor(n / 2) !== Math.floor(this.shown / 2) && this.full[n - 1] !== " ") {
        const who = this.box.getData("who");
        Audio.sfx(who === "umbra" ? "voice_umbra" : who === "angelo" ? "voice_angelo" : "voice_angely");
      }
      this.shown = n;
      this.text.setText(this.full.slice(0, n));
    }
  }
}
