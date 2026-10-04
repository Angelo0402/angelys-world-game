import Phaser from "phaser";
import { Gamepad, PAD, type NavDir } from "../input/gamepad";

export interface NavItem {
  x: number;
  y: number;
  focus(on: boolean): void;
  activate(): void;
}

/**
 * Controller navigation for a set of on-screen buttons: D-pad / left stick moves focus
 * to the nearest item in that direction, A activates it, B (or Menu) runs `back`.
 * Focus is only drawn while a controller is connected.
 */
export class PadMenu {
  private index: number;
  private shown = false;
  private readonly bornFrame: number;
  private alive = true;
  private scene: Phaser.Scene;
  private items: NavItem[];
  private opts: { initial?: number; back?: () => void; menuIsBack?: boolean };

  constructor(scene: Phaser.Scene, items: NavItem[], opts: { initial?: number; back?: () => void; menuIsBack?: boolean } = {}) {
    this.scene = scene;
    this.items = items;
    this.opts = opts;
    this.index = Math.min(opts.initial ?? 0, Math.max(0, items.length - 1));
    this.bornFrame = scene.game.loop.frame;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.sync();
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private sync() {
    const show = Gamepad.connected;
    if (show === this.shown) return;
    this.shown = show;
    this.items.forEach((it, i) => it.focus(show && i === this.index));
  }

  private move(dir: NavDir) {
    const cur = this.items[this.index];
    let best = -1;
    let bestScore = Infinity;
    this.items.forEach((it, i) => {
      if (i === this.index) return;
      const dx = it.x - cur.x;
      const dy = it.y - cur.y;
      const along = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
      const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      if (along <= 8) return;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) return;
    this.items[this.index].focus(false);
    this.index = best;
    this.items[best].focus(true);
  }

  private update() {
    if (!this.alive || this.items.length === 0) return;
    this.sync();
    // The press that opened this menu must not also trigger it.
    if (!Gamepad.connected || this.scene.game.loop.frame === this.bornFrame) return;
    const dir = Gamepad.nav();
    if (dir) this.move(dir);
    if (Gamepad.justPressed(PAD.A)) {
      this.items[this.index].activate();
      return;
    }
    if (this.opts.back && (Gamepad.justPressed(PAD.B) || (this.opts.menuIsBack && Gamepad.justPressed(PAD.MENU)))) {
      this.opts.back();
    }
  }
}
