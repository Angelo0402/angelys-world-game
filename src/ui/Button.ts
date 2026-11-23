import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { DESIGN, DESIGN_CSS, FONT_DISPLAY } from "./design";
import type { NavItem } from "./padMenu";

interface ButtonOpts {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
  // When true, the click fires on pointerdown (once per pointer) instead of
  // pointerup. For phones whose WebView loses pointerup: a tap must not die.
  fireOnDown?: boolean;
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
  private fireOnDown: boolean;
  private firedPointers = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = opts.width ?? 260;
    this.bh = opts.height ?? 60;
    // DESIGN TEST: the one accent is Angely's bow pink (was orange).
    this.color = opts.color ?? DESIGN.bow;
    this.disabled = !!opts.disabled;
    this.onClick = onClick;
    this.fireOnDown = !!opts.fireOnDown;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_DISPLAY,
        fontSize: `${opts.fontSize ?? 26}px`,
        fontStyle: "bold",
        color: opts.textColor ?? "#ffffff",
        stroke: DESIGN_CSS.ink,
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.draw(false);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.disabled) return;
      this.draw(true);
      if (!this.fireOnDown || this.firedPointers.has(pointer.id)) return;
      this.firedPointers.add(pointer.id);
      Audio.sfx("button");
      this.onClick();
    });
    this.on("pointerout", () => this.draw(false));
    this.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.disabled) return;
      this.draw(false);
      // Already fired on down: swallow the up so one tap never double-fires.
      if (this.firedPointers.delete(pointer.id)) return;
      Audio.sfx("button");
      this.onClick();
    });
    this.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => {
      this.firedPointers.delete(pointer.id);
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
    g.fillStyle(DESIGN.veilDeep, 0.55).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, h / 2.4);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2.4);
    g.fillStyle(0xffffff, pressed ? 0.12 : 0.28).fillRoundedRect(-w / 2 + 6, -h / 2 + 4 + (pressed ? 4 : 0), w - 12, h * 0.38, h / 3.2);
    g.lineStyle(3, DESIGN.ink, 1).strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2.4);
    if (this.focused) g.lineStyle(4, DESIGN.gold, 1).strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, h / 2.2);
    this.label.setY(pressed ? 4 : 0);
    this.label.setAlpha(this.disabled ? 0.6 : 1);
  }
}

export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string = DESIGN_CSS.cream) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: DESIGN_CSS.ink,
      strokeThickness: Math.max(4, size / 7),
      shadow: { offsetX: 0, offsetY: size / 14, color: "#000000", blur: 0, fill: true, stroke: true },
    })
    .setOrigin(0.5);
}
