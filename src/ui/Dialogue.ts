import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import type { SfxName } from "../audio/manifest";
import { FONT, GAME_H, GAME_W } from "../config";
import { Gamepad, PAD } from "../input/gamepad";
import { SPEAKERS, type DialogueLine } from "../story/umbra";

const BAR_H = 62;
const CPS = 44;
const BOX = { x: 140, y: GAME_H - 182, w: GAME_W - 280, h: 150 };
const SUB = { x: 290, y: GAME_H - 132, w: 660, h: 104 };

/**
 * Cutscene letterbox plus a subtitle box: portrait, speaker name and typewriter
 * text. Blocking dialogue advances on tap / A / Space / Enter and can be skipped;
 * subtitles show one line briefly without stopping play.
 */
export class Dialogue {
  private scene: Phaser.Scene;
  private top: Phaser.GameObjects.Rectangle;
  private bottom: Phaser.GameObjects.Rectangle;
  private box: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private skip: Phaser.GameObjects.Text;
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
    this.top = scene.add.rectangle(0, -BAR_H, GAME_W, BAR_H, 0x000000).setOrigin(0).setDepth(200);
    this.bottom = scene.add.rectangle(0, GAME_H, GAME_W, BAR_H, 0x000000).setOrigin(0).setDepth(200);
    this.catcher = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.001).setOrigin(0).setDepth(201).setVisible(false);
    this.catcher.setInteractive();
    this.catcher.on("pointerup", (p: Phaser.Input.Pointer) => {
      const z = scene.cameras.main.zoom;
      if (p.x / z > GAME_W - 170 && p.y / z < 70) this.skipAll();
      else this.advance();
    });

    this.panel = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.portrait = scene.add.image(0, 0, "portrait_umbra");
    this.name = scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#ffffff", stroke: "#12081f", strokeThickness: 6 });
    this.text = scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "23px", color: "#fff8ea", lineSpacing: 6, stroke: "#12081f", strokeThickness: 3 });
    this.prompt = scene.add.text(0, 0, "▼", { fontFamily: FONT, fontSize: "20px", color: "#ffd36b" }).setOrigin(1, 1);
    scene.tweens.add({ targets: this.prompt, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
    this.box = scene.add.container(0, 0, [this.panel, this.ring, this.portrait, this.name, this.text, this.prompt]).setDepth(202).setVisible(false);
    this.skip = scene.add
      .text(GAME_W - 24, 20, "SKIP ▸▸", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#cfc6e8" })
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
  }

  play(lines: DialogueLine[], done: () => void, onLine?: (line: DialogueLine) => void) {
    this.lines = lines;
    this.index = 0;
    this.done = done;
    this.onLine = onLine;
    this.blocking = true;
    this.openedAt = this.scene.time.now;
    this.catcher.setVisible(true);
    this.skip.setVisible(true).setText(Gamepad.connected ? "SKIP: Menu ▸▸" : "SKIP ▸▸");
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
    this.panel.clear();
    this.panel.fillStyle(0x0d0618, 0.9).fillRoundedRect(r.x, r.y, r.w, r.h, 20);
    this.panel.lineStyle(3, accent, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, 20);
    this.portrait.setTexture(sp.portrait(line)).setPosition(px, py).setDisplaySize(pr, pr);
    this.ring.clear().lineStyle(4, accent, 1).strokeCircle(px, py, pr / 2 + 1);
    const tx = left ? r.x + pr + 44 : r.x + 26;
    const tw = r.w - pr - 76;
    const small = r === SUB;
    this.name.setText(sp.name).setColor(sp.color).setPosition(tx, r.y + (small ? 8 : 14)).setFontSize(small ? 19 : 24);
    this.text.setPosition(tx, r.y + (small ? 36 : 50)).setFontSize(small ? 18 : 23).setWordWrapWidth(tw);
    this.prompt.setPosition(left ? r.x + r.w - 18 : r.x + r.w - pr - 50, r.y + r.h - 12).setVisible(false);
    this.full = line.text;
    this.shown = 0;
    this.text.setText("");
    this.startedAt = this.scene.time.now;
    this.box.setVisible(true).setAlpha(1);
    this.box.setData("who", line.who);
    // Voice acting: play the line's clip once (cuts off the previous one).
    if (line.voice) Audio.playVoice(line.voice as SfxName);
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
    Audio.stopVoice();
    this.finish();
  }

  private finish() {
    this.blocking = false;
    Audio.stopVoice();
    this.catcher.setVisible(false);
    this.skip.setVisible(false);
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
      // Typewriter blips only when there is no real voice clip for this line.
      const voice = this.lines[this.index]?.voice;
      if ((!voice || !Audio.hasVoice(voice)) && Math.floor(n / 2) !== Math.floor(this.shown / 2) && this.full[n - 1] !== " ") {
        const who = this.box.getData("who");
        Audio.sfx(who === "umbra" || who === "sovereign" ? "voice_umbra" : who === "angelo" ? "voice_angelo" : "voice_angely");
      }
      this.shown = n;
      this.text.setText(this.full.slice(0, n));
    }
  }
}
