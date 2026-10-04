import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { FONT, FONT_DISPLAY } from "../config";
import type { NavItem } from "./padMenu";

export interface ButtonOpts {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container implements NavItem {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private color: number;
  disabled: boolean;
  private focused = false;
  private hot = false;
  private focusTween?: Phaser.Tweens.Tween;
  private onClick: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = opts.width ?? 260;
    this.bh = opts.height ?? 60;
    this.color = opts.color ?? 0xff8a3d;
    this.disabled = !!opts.disabled;
    this.onClick = onClick;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: `${opts.fontSize ?? 26}px`,
        fontStyle: "bold",
        color: opts.textColor ?? "#fffaf2",
        stroke: "#2a1640",
        strokeThickness: 5,
        letterSpacing: 0.8,
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.draw(false);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerover", () => {
      if (this.disabled) return;
      this.hot = true;
      this.draw(false);
    });
    this.on("pointerdown", () => {
      if (this.disabled) return;
      this.draw(true);
    });
    this.on("pointerout", () => {
      this.hot = false;
      this.draw(false);
    });
    this.on("pointerup", () => {
      if (this.disabled) return;
      this.hot = false;
      this.draw(false);
      Audio.sfx("button");
      onClick();
    });
    scene.add.existing(this);
  }

  focus(on: boolean) {
    this.focused = on;
    this.draw(false);
    this.focusTween?.stop();
    this.focusTween = this.scene.tweens.add({ targets: this.bg, scale: on ? 1.06 : 1, duration: 120, ease: "Quad.out" });
    this.scene.tweens.add({ targets: this.label, scale: on ? 1.06 : 1, duration: 120, ease: "Quad.out" });
  }

  activate() {
    if (this.disabled) return;
    Audio.sfx("button");
    this.onClick();
  }

  setText(t: string) {
    this.label.setText(t);
    return this;
  }

  private draw(pressed: boolean) {
    const w = this.bw;
    const h = this.bh;
    const g = this.bg;
    g.clear();
    const c = this.disabled ? 0x5a5470 : this.color;
    const y = pressed ? 3 : 0;
    const radius = Math.min(22, h * 0.42);
    if (!pressed) g.fillStyle(0x07040f, 0.4).fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, radius);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2 + y, w, h, radius);
    g.fillStyle(0xffffff, pressed ? 0.1 : this.hot ? 0.34 : 0.22).fillRoundedRect(-w / 2 + 5, -h / 2 + 4 + y, w - 10, h * 0.4, Math.max(8, radius * 0.55));
    g.lineStyle(1.5, 0xfff6d8, this.disabled ? 0.25 : 0.75).strokeRoundedRect(-w / 2 + 4, -h / 2 + 4 + y, w - 8, h - 8, Math.max(8, radius - 4));
    g.lineStyle(2.5, 0x2a1640, 0.9).strokeRoundedRect(-w / 2, -h / 2 + y, w, h, radius);
    g.lineStyle(1.75, 0xffd36b, this.disabled ? 0.28 : 1).strokeRoundedRect(-w / 2 - 1, -h / 2 - 1 + y, w + 2, h + 2, radius + 1);
    if (this.focused) g.lineStyle(3, 0xfff4a8, 1).strokeRoundedRect(-w / 2 - 7, -h / 2 - 7 + y, w + 14, h + 14, radius + 6);
    this.label.setY(pressed ? 4 : 0);
    this.label.setAlpha(this.disabled ? 0.6 : 1);
  }
}

export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = "#fff4d6") {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#14081f",
      strokeThickness: Math.max(5, Math.round(size / 9)),
      letterSpacing: size >= 48 ? 2 : 1,
      shadow: {
        offsetX: 0,
        offsetY: Math.max(2, Math.round(size / 14)),
        color: "#3a1868",
        blur: Math.max(6, Math.round(size / 8)),
        fill: true,
        stroke: false,
      },
    })
    .setOrigin(0.5);
}
