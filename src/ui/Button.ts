import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { FONT } from "../config";
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
        color: opts.textColor ?? "#ffffff",
        stroke: "#2a1640",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.draw(false);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => {
      if (this.disabled) return;
      this.draw(true);
    });
    this.on("pointerout", () => this.draw(false));
    this.on("pointerup", () => {
      if (this.disabled) return;
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
    g.fillStyle(0x1b0f2e, 0.55).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, h / 2.4);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2.4);
    g.fillStyle(0xffffff, pressed ? 0.12 : 0.28).fillRoundedRect(-w / 2 + 6, -h / 2 + 4 + (pressed ? 4 : 0), w - 12, h * 0.38, h / 3.2);
    g.lineStyle(3, 0x2a1640, 1).strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2.4);
    if (this.focused) g.lineStyle(4, 0xfff4a8, 1).strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, h / 2.2);
    this.label.setY(pressed ? 4 : 0);
    this.label.setAlpha(this.disabled ? 0.6 : 1);
  }
}

export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = "#fff4d6") {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#2a1640",
      strokeThickness: Math.max(4, size / 7),
      shadow: { offsetX: 0, offsetY: size / 14, color: "#000000", blur: 0, fill: true, stroke: true },
    })
    .setOrigin(0.5);
}
