import Phaser from "phaser";

export interface PlaqueOpts {
  radius?: number;
  fill?: number;
  fillAlpha?: number;
  /** Outer rim. */
  stroke?: number;
  /** Inner hairline. */
  accent?: number;
  /** Corner diamonds. Leave off on dense or small panels. */
  gems?: boolean;
}

/** Shadowed fantasy panel: soft fill, gold rim, inner hairline. */
export function drawPlaque(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: PlaqueOpts = {}) {
  const radius = opts.radius ?? 20;
  const fill = opts.fill ?? 0x1b0f2e;
  const fillAlpha = opts.fillAlpha ?? 0.92;
  const stroke = opts.stroke ?? 0xffd36b;
  const accent = opts.accent ?? 0xfff6d8;
  g.fillStyle(0x07040f, 0.42).fillRoundedRect(x + 3, y + 5, w, h, radius);
  g.fillStyle(fill, fillAlpha).fillRoundedRect(x, y, w, h, radius);
  const sheenH = Math.min(18, Math.max(8, h * 0.22));
  if (w > 24 && h > sheenH + 12) {
    g.fillStyle(0xffffff, 0.06).fillRoundedRect(x + 10, y + 5, w - 20, sheenH, Math.max(6, radius * 0.4));
  }
  g.lineStyle(2.5, stroke, 1).strokeRoundedRect(x, y, w, h, radius);
  const inset = Math.min(7, Math.floor(Math.min(w, h) / 12));
  if (w > inset * 2 + 12 && h > inset * 2 + 12) {
    g.lineStyle(1.25, accent, 0.5).strokeRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(6, radius - inset));
  }
  if (opts.gems) {
    const d = Math.max(14, radius * 0.72);
    diamond(g, x + d, y + d, 4.5, stroke);
    diamond(g, x + w - d, y + d, 4.5, stroke);
    diamond(g, x + d, y + h - d, 4.5, stroke);
    diamond(g, x + w - d, y + h - d, 4.5, stroke);
  }
}

/** Centered hairline with a small diamond, for titles. */
export function drawRule(g: Phaser.GameObjects.Graphics, cx: number, y: number, w: number, color = 0xffd36b) {
  g.lineStyle(1.5, color, 0.9);
  g.lineBetween(cx - w / 2, y, cx - 12, y);
  g.lineBetween(cx + 12, y, cx + w / 2, y);
  diamond(g, cx, y, 5, color);
}

function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number) {
  g.fillStyle(color, 1);
  g.fillTriangle(x, y - r, x + r * 0.72, y, x, y + r);
  g.fillTriangle(x, y - r, x - r * 0.72, y, x, y + r);
  g.fillStyle(0xfff6d8, 0.95).fillCircle(x, y, Math.max(1, r * 0.22));
}
