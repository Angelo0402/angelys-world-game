import { GROUND_Y, type LevelInfo, type LevelMode, type PieceKind, type WeaponId } from "../config";

export interface Segment {
  x0: number;
  x1: number;
  /** Top (walkable) y of this stretch of ground. */
  y: number;
}

export interface Spot {
  x: number;
  y: number;
}

export interface PlatformDef {
  x: number;
  y: number;
  prop: "plat_float" | "plat_float_small" | "plat_log" | "plat_medium" | "plat_small";
}

/** A column of stone blocks standing on y (or hanging down from y when `hang`), centred on x. */
export interface WallDef {
  x: number;
  y: number;
  blocks: number;
  breakable?: boolean;
  hang?: boolean;
}

/** One-way platform shuttling between two points (top surface coordinates). */
export interface MoverDef {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  period: number;
}

/** Spiked urchin bobbing along a line. */
export interface MineDef {
  x: number;
  y: number;
  dx: number;
  dy: number;
  period: number;
  phase: number;
}

export interface TargetDef {
  x: number;
  y: number;
  bridge: PlatformDef[];
}

export interface LevelDef {
  mode: LevelMode;
  width: number;
  /** Highest world y the camera may show (climb levels go far above 0). */
  top: number;
  ground: Segment[];
  platforms: PlatformDef[];
  /** Wide platforms where ground enemies may spawn (climb levels). */
  landings: { x0: number; x1: number; y: number }[];
  hearts: Spot[];
  checkpoints: Spot[];
  spikes: Spot[];
  walls: WallDef[];
  crates: Spot[];
  springs: Spot[];
  movers: MoverDef[];
  crumbles: Spot[];
  targets: TargetDef[];
  mines: MineDef[];
  gems: Spot[];
  /** Star Shield pickups: 15 seconds where nothing can hurt Angely. */
  stars: Spot[];
  portal: Spot;
  weapon?: { x: number; y: number; kind: WeaponId };
  arena?: { x0: number; x1: number };
  flood?: boolean;
}

export const BLOCK_W = 80;
export const BLOCK_H = 70;
export const CRATE_SIZE = 78;
export const CLIMB_W = 1280;
const GATE_GAP = 300;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyLevel(mode: LevelMode): LevelDef {
  return {
    mode, width: 0, top: 0, ground: [], platforms: [], landings: [], hearts: [], checkpoints: [], spikes: [], walls: [], crates: [],
    springs: [], movers: [], crumbles: [], targets: [], mines: [], gems: [], stars: [], portal: { x: 0, y: GROUND_Y },
  };
}

export function buildLevel(info: LevelInfo): LevelDef {
  const r = rng(info.seed);
  const L = info.boss && info.chapter === 8 ? duneArena(emptyLevel("run"))
    : info.boss ? bossLevel(emptyLevel("run"))
    : info.mode === "climb" ? buildClimb(info, r)
    : buildSide(info, r);
  placeStars(L);
  return L;
}

/** One Star Shield per level, on open ground near the middle and clear of spikes. */
function placeStars(L: LevelDef) {
  const grounds = L.ground.filter((g) => g.x1 - g.x0 > 320);
  if (!grounds.length) return;
  const mid = Math.floor(grounds.length / 2);
  const order = grounds.map((_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  for (const i of order) {
    const g = grounds[i];
    for (const f of [0.5, 0.35, 0.65]) {
      const x = Math.round(g.x0 + (g.x1 - g.x0) * f);
      if (L.spikes.some((s) => Math.abs(s.x - x) < 90)) continue;
      L.stars.push({ x, y: g.y - 96 });
      return;
    }
  }
}

/**
 * Side-scrolling layout assembled from the level's set pieces, separated by pits.
 * Terrain lifts or lowers each stretch of ground (hills: low terraces, cliffs:
 * tall ones), so the skyline changes from level to level. Each piece starts at x
 * on fresh ground at height Y and returns where its last ground run ends.
 */
function buildSide(info: LevelInfo, r: () => number): LevelDef {
  const L = emptyLevel(info.mode);
  const gemSpots: Spot[] = [];
  let Y = GROUND_Y;
  const run = (x0: number, len: number, y = Y) => {
    L.ground.push({ x0, x1: x0 + len, y });
    return x0 + len;
  };
  const chase = info.mode === "chase";
  const swim = info.mode === "swim";

  let x = run(-200, chase ? 1300 : 1500);
  if (info.weapon) L.weapon = { x: 640, y: GROUND_Y - 80, kind: info.weapon };

  const pieces: Record<PieceKind, (x: number) => number> = {
    hops: (x) => {
      const len = 760 + Math.floor(r() * 160);
      L.platforms.push({ x: x + len * 0.35, y: Y - 125, prop: "plat_log" }, { x: x + len * 0.65, y: Y - 240, prop: "plat_float" });
      L.hearts.push({ x: x + len * 0.65, y: Y - 300 });
      gemSpots.push({ x: x + len * 0.35, y: Y - 190 });
      return run(x, len);
    },
    steps: (x) => {
      const len = 820 + Math.floor(r() * 160);
      L.platforms.push(
        { x: x + len * 0.25, y: Y - 120, prop: "plat_float_small" },
        { x: x + len * 0.5, y: Y - 230, prop: "plat_small" },
        { x: x + len * 0.75, y: Y - 130, prop: "plat_float_small" },
      );
      gemSpots.push({ x: x + len * 0.5, y: Y - 300 });
      return run(x, len);
    },
    spikes: (x) => {
      L.spikes.push({ x: x + 280, y: Y }, { x: x + 640, y: Y });
      L.platforms.push({ x: x + 460, y: Y - 135, prop: "plat_medium" });
      gemSpots.push({ x: x + 460, y: Y - 200 });
      return run(x, 950);
    },
    // The wall sits where the spring's arc is already above it (launch ~35 px before the spring).
    spring: (x) => {
      L.springs.push({ x: x + 330, y: Y });
      L.walls.push({ x: x + 480, y: Y, blocks: 4 });
      L.hearts.push({ x: x + 480, y: Y - 4 * BLOCK_H - 50 });
      gemSpots.push({ x: x + 420, y: Y - 4 * BLOCK_H - 130 });
      return run(x, 1000);
    },
    crateWall: (x) => {
      L.crates.push({ x: x + 260, y: Y });
      L.walls.push({ x: x + 720, y: Y, blocks: 3 });
      gemSpots.push({ x: x + 720, y: Y - 3 * BLOCK_H - 50 });
      return run(x, 1050);
    },
    movingBridge: (x) => {
      const a = run(x, 300);
      const pit = 460;
      L.movers.push({ x0: a + 90, y0: Y - 30, x1: a + pit - 90, y1: Y - 30, period: 3.4 });
      gemSpots.push({ x: a + pit / 2, y: Y - 150 });
      return run(a + pit, 700);
    },
    lift: (x) => {
      const wx = x + 640;
      L.walls.push({ x: wx, y: Y, blocks: 5 });
      const lx = wx - BLOCK_W / 2 - 74;
      L.movers.push({ x0: lx, y0: Y - 24, x1: lx, y1: Y - 5 * BLOCK_H - 4, period: 4.6 });
      L.hearts.push({ x: wx, y: Y - 5 * BLOCK_H - 50 });
      gemSpots.push({ x: lx, y: Y - 5 * BLOCK_H - 90 });
      return run(x, 1000);
    },
    crumble: (x) => {
      const a = run(x, 280);
      const pit = 580;
      L.crumbles.push({ x: a + 120, y: Y - 70 }, { x: a + 290, y: Y - 125 }, { x: a + 460, y: Y - 70 });
      gemSpots.push({ x: a + 290, y: Y - 195 });
      return run(a + pit, 700);
    },
    target: (x) => {
      const a = run(x, 320);
      const pit = 520;
      const bridge: PlatformDef[] = [64, 192, 320, 448].map((dx) => ({ x: a + dx, y: Y - 18, prop: "plat_medium" }));
      L.targets.push({ x: a + pit / 2, y: Y - 330, bridge });
      gemSpots.push({ x: a + pit / 2 + 60, y: Y - 90 });
      return run(a + pit, 700);
    },
    breakWall: (x) => {
      L.walls.push({ x: x + 500, y: Y, blocks: 4, breakable: true });
      gemSpots.push({ x: x + 620, y: Y - 40 });
      return run(x, 900);
    },
    mines: (x) => {
      const len = 1100;
      for (let i = 0; i < 4; i++) {
        L.mines.push({ x: x + 220 + i * 220, y: Y - 150 - (i % 2) * 70, dx: 0, dy: swim ? 150 : 90, period: 2.4 + i * 0.3, phase: i * 0.25 });
      }
      L.platforms.push({ x: x + 550, y: Y - 260, prop: "plat_float" });
      gemSpots.push({ x: x + 550, y: Y - 320 });
      return run(x, len);
    },
    // The hanging wall is sized from this stretch's floor so the opening is always
    // GATE_GAP tall, whatever the terrain height; the urchin sweeps through it.
    gate: (x) => {
      const gx = x + 480;
      L.walls.push({ x: gx, y: Y, blocks: 2 });
      const gapBottom = Y - 2 * BLOCK_H;
      const gapTop = gapBottom - GATE_GAP;
      const hang = Math.floor((gapTop + 20) / BLOCK_H);
      if (hang > 0) L.walls.push({ x: gx, y: -20, blocks: hang, hang: true });
      const top = hang > 0 ? -20 + hang * BLOCK_H : gapTop;
      L.mines.push({ x: gx, y: (top + gapBottom) / 2, dx: 0, dy: (gapBottom - top) / 2 - 40, period: 3, phase: 0 });
      gemSpots.push({ x: gx + 200, y: Y - 260 });
      return run(x, 950);
    },
  };

  const lift = info.terrain === "hills" ? [0, -60, -120] : info.terrain === "cliffs" ? [0, -90, -150] : [0];
  for (const kind of info.pieces) {
    const prev = Y;
    let next = GROUND_Y + lift[Math.floor(r() * lift.length)];
    if (next < prev - 140) next = prev - 140;
    let gap = 140 + Math.floor(r() * 30) + Math.min(info.chapter - 1, 4) * 3;
    // Jumping up a tall step needs a shorter pit.
    if (next < prev - 60) gap = 120;
    x += gap;
    Y = next;
    if (info.terrain === "hills" && r() < 0.5 && kind !== "crateWall") {
      // A short staircase of terraces before the piece.
      const step = Y < GROUND_Y - 60 ? 60 : -60;
      x = run(x, 260, Y + step);
      x = run(x, 260, Y + step / 2);
    }
    x = pieces[kind](x);
  }
  Y = GROUND_Y;
  x += 160;
  run(x, 1100);
  L.portal = { x: x + 760, y: GROUND_Y };
  L.width = x + 1000;
  L.ground[L.ground.length - 1].x1 = L.width + 200;

  L.checkpoints = chase ? [] : pickCheckpoints(L);
  L.hearts.push(...L.checkpoints.map((c) => ({ x: c.x + 90, y: c.y - 40 })));
  L.spikes = L.spikes.filter((s) => !L.checkpoints.some((c) => Math.abs(c.x - s.x) < 200));
  if (info.goal === "gems") L.gems = spread(gemSpots, info.need);
  return L;
}

/** Pick n spots spread evenly through the level. */
function spread(spots: Spot[], n: number) {
  if (spots.length <= n) return spots;
  const out: Spot[] = [];
  for (let i = 0; i < n; i++) out.push(spots[Math.floor(((i + 0.5) * spots.length) / n)]);
  return out;
}

const HALF_W: Record<PlatformDef["prop"], number> = { plat_log: 95, plat_float: 72, plat_medium: 72, plat_small: 72, plat_float_small: 50 };
const MOVER_HW = 72;
const CRUMBLE_HW = 44;

/**
 * Whether Angely can jump from surface a up (or down) to surface b. Her jump peaks
 * ~165 px high; the higher the target, the less sideways air time is left.
 */
function reachable(a: { x: number; y: number; hw: number }, b: { x: number; y: number; hw: number }) {
  const rise = a.y - b.y;
  const gap = Math.max(0, Math.abs(b.x - a.x) - a.hw - b.hw);
  if (rise > 145) return false;
  if (rise < -40) return gap <= 300;
  return gap <= (rise > 100 ? 65 : rise > 40 ? 140 : 200);
}

/**
 * A one-screen-wide tower. Sections stack upward (zigzag hops, lifts, springs,
 * crumbling rows, ferries, urchin fields), each ending on a wide landing; every
 * second landing has a checkpoint. The portal waits on the last landing.
 *
 * Every surface is chained to the one before it; wherever a hop would be out of
 * Angely's reach, small stepping platforms are inserted between them.
 */
function buildClimb(info: LevelInfo, r: () => number): LevelDef {
  const L = emptyLevel("climb");
  L.width = CLIMB_W;
  L.flood = info.flood;
  L.ground.push({ x0: -50, x1: CLIMB_W + 50, y: GROUND_Y });
  if (info.weapon) L.weapon = { x: 980, y: GROUND_Y - 80, kind: info.weapon };
  let y = GROUND_Y;
  /** Last surface Angely stands on; walking the ground means anywhere along it. */
  let last = { x: 640, y: GROUND_Y, hw: 600 };
  let dir = r() < 0.5 ? -1 : 1;
  const inside = (x: number, hw: number) => clamp(x, 40 + hw, CLIMB_W - 40 - hw);

  const step = (x: number, yy: number) => L.platforms.push({ x, y: yy, prop: "plat_float_small" });
  /** Make `to` reachable from `last`, inserting steps halfway as needed. */
  const bridge = (to: { x: number; y: number; hw: number }, depth = 0) => {
    if (reachable(last, to) || depth > 4) return;
    const mid = { x: (last.x + to.x) / 2, y: Math.round((last.y + to.y) / 2), hw: HALF_W.plat_float_small };
    if (Math.abs(to.x - last.x) < 140) mid.x = inside(last.x + (mid.x < 640 ? 170 : -170), mid.hw);
    bridge(mid, depth + 1);
    step(mid.x, mid.y);
    last = mid;
    bridge(to, depth + 1);
  };
  const reach = (x: number, yy: number, hw: number) => {
    const to = { x: inside(x, hw), y: yy, hw };
    bridge(to);
    last = to;
    return to.x;
  };
  const plat = (x: number, yy: number, prop: PlatformDef["prop"]) => {
    const px = reach(x, yy, HALF_W[prop]);
    L.platforms.push({ x: px, y: yy, prop });
    return px;
  };
  /** Next x for a hop: 140-190 px sideways, bouncing off the tower walls. */
  const walk = (hw: number) => {
    let x = last.x + dir * (140 + r() * 50);
    if (x < 40 + hw + 60 || x > CLIMB_W - 40 - hw - 60) {
      dir = -dir as 1 | -1;
      x = last.x + dir * (140 + r() * 50);
    }
    return inside(x, hw);
  };
  const landing = (yy: number, cx = 640) => {
    reach(cx, yy, 168);
    L.platforms.push({ x: cx - 84, y: yy, prop: "plat_log" }, { x: cx + 84, y: yy, prop: "plat_log" });
    L.landings.push({ x0: cx - 168, x1: cx + 168, y: yy });
  };

  type Section = () => void;
  const sections: Record<string, Section> = {
    zigzag: () => {
      for (let i = 0; i < 4; i++) {
        y -= 115 + Math.floor(r() * 15);
        const prop = i % 2 ? "plat_float" : "plat_float_small";
        const x = plat(walk(HALF_W[prop]), y, prop);
        if (i === 2) L.hearts.push({ x, y: y - 50 });
      }
    },
    lift: () => {
      const left = last.x > 640;
      const lx = left ? 230 : CLIMB_W - 230;
      reach(lx, y - 30, MOVER_HW);
      L.movers.push({ x0: lx, y0: y - 30, x1: lx, y1: y - 460, period: 5 });
      L.platforms.push({ x: left ? 760 : 520, y: y - 230, prop: "plat_float_small" });
      last = { x: lx, y: y - 460, hw: MOVER_HW };
      y -= 470;
      plat(left ? 420 : CLIMB_W - 420, y, "plat_float");
    },
    spring: () => {
      y -= 120;
      const sx = plat(walk(HALF_W.plat_float), y, "plat_float");
      L.springs.push({ x: sx, y });
      // The spring throws Angely ~330 px up, well past a normal jump.
      last = { x: sx, y: y - 200, hw: HALF_W.plat_float };
      y -= 330;
      plat(sx + (sx < 640 ? 160 : -160), y, "plat_float");
    },
    crumble: () => {
      for (let i = 0; i < 3; i++) {
        y -= 120;
        const x = reach(walk(CRUMBLE_HW), y, CRUMBLE_HW);
        L.crumbles.push({ x, y });
      }
    },
    ferry: () => {
      y -= 125;
      const fromLeft = last.x < 640;
      plat(fromLeft ? 180 : CLIMB_W - 180, y, "plat_float_small");
      y -= 120;
      const [a, b] = fromLeft ? [330, 950] : [950, 330];
      reach(a, y, MOVER_HW);
      L.movers.push({ x0: a, y0: y, x1: b, y1: y, period: 4.2 });
      last = { x: b, y, hw: MOVER_HW };
      y -= 120;
      plat(fromLeft ? CLIMB_W - 180 : 180, y, "plat_float_small");
    },
    mines: () => {
      for (let i = 0; i < 4; i++) {
        y -= 120;
        const x = plat(walk(HALF_W.plat_float), y, "plat_float");
        L.mines.push({ x: x < 640 ? x + 260 : x - 260, y: y - 60, dx: 160, dy: 0, period: 2.6 + i * 0.2, phase: i * 0.3 });
      }
    },
  };
  const order = info.flood
    ? ["zigzag", "ferry", "mines", "lift", "crumble", "spring", "mines", "zigzag"]
    : ["zigzag", "spring", "lift", "zigzag", "crumble", "ferry", "zigzag"];
  order.forEach((k, i) => {
    sections[k]();
    y -= 125;
    landing(y);
    if (i % 2 === 1) L.checkpoints.push({ x: 640 - 120, y });
    if (i % 3 === 2) L.hearts.push({ x: 640 + 110, y: y - 40 });
  });
  y -= 130;
  landing(y);
  y -= 130;
  landing(y);
  L.portal = { x: 640, y };
  L.top = y - 330;
  return L;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/** One screen. The camera stays put and the sand worm comes up through the floor. */
function duneArena(L: LevelDef): LevelDef {
  L.width = 1280;
  L.ground.push({ x0: -40, x1: 1400, y: GROUND_Y });
  L.arena = { x0: 20, x1: 1260 };
  L.portal = { x: 640, y: GROUND_Y };
  L.hearts.push({ x: 220, y: GROUND_Y - 40 }, { x: 1060, y: GROUND_Y - 40 });
  L.walls.push({ x: 430, y: GROUND_Y, blocks: 2 }, { x: 860, y: GROUND_Y, blocks: 2 });
  L.platforms.push({ x: 640, y: GROUND_Y - 160, prop: "plat_float" });
  return L;
}

/** A short approach, then a one-screen arena where Queen Umbra waits. */
function bossLevel(L: LevelDef): LevelDef {
  const x0 = 1700;
  const x1 = x0 + 1280;
  L.ground.push({ x0: -200, x1: x1 + 600, y: GROUND_Y });
  L.platforms.push(
    { x: 700, y: GROUND_Y - 130, prop: "plat_log" },
    { x: 1050, y: GROUND_Y - 230, prop: "plat_float" },
    { x: x0 + 270, y: GROUND_Y - 150, prop: "plat_medium" },
    { x: x1 - 270, y: GROUND_Y - 150, prop: "plat_medium" },
  );
  L.hearts.push({ x: 1050, y: GROUND_Y - 290 }, { x: 1400, y: GROUND_Y - 40 });
  L.arena = { x0, x1 };
  L.portal = { x: (x0 + x1) / 2, y: GROUND_Y };
  L.width = x1 + 200;
  return L;
}

/** Checkpoints at roughly a third and two thirds, on open ground away from puzzles. */
function pickCheckpoints(L: LevelDef): Spot[] {
  const busy = [...L.walls.map((w) => w.x), ...L.crates.map((c) => c.x), ...L.springs.map((s) => s.x), ...L.spikes.map((s) => s.x)];
  const spots = L.ground
    .filter((s) => s.x1 - s.x0 >= 600 && s.x0 > 1000)
    .map((s) => ({ x: s.x0 + 120, y: s.y }))
    .filter((c) => !busy.some((b) => Math.abs(b - c.x) < 220));
  const out: Spot[] = [];
  for (const f of [0.33, 0.66]) {
    const want = L.width * f;
    let best: Spot | undefined;
    for (const s of spots) if (!out.includes(s) && (!best || Math.abs(s.x - want) < Math.abs(best.x - want))) best = s;
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.x - b.x);
}

/** The ground stretch under x (with `margin` px kept clear of its edges). */
export function groundAt(ground: Segment[], x: number, margin = 0) {
  return ground.find((s) => x >= s.x0 + margin && x <= s.x1 - margin);
}

export function groundY(ground: Segment[], x: number, margin = 0): number | null {
  return groundAt(ground, x, margin)?.y ?? null;
}
