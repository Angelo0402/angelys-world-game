import { GROUND_Y } from "../config";
import type { LevelDef } from "./level";

/**
 * Chapter 10-1 "Shattered Causeway" — authored route, rebuilt 2026-10-20.
 * Rules kept from the original design: every gap has a safe stepping stone or
 * a ferry, and every wall / crate / spike / checkpoint sits ON the ground
 * segment it belongs to (y === that segment's top), so nothing floats.
 * Jump budget (Player JUMP_V 840 @ gravity 1900): ~185 px rise, ~290 px range;
 * gaps here are <= 190 px, terrace steps <= 70 px.
 */
export function crystalCauseway(L: LevelDef): LevelDef {
  L.width = 9200;
  L.ground.push(
    { x0: -200, x1: 1300, y: GROUND_Y },        // G1 start terrace
    { x0: 1470, x1: 2750, y: GROUND_Y - 70 },   // G2 high terrace
    { x0: 2920, x1: 4200, y: GROUND_Y - 30 },   // G3 mid terrace
    { x0: 4560, x1: 5900, y: GROUND_Y },        // G4 after the ferry pit
    { x0: 6080, x1: 7450, y: GROUND_Y - 60 },   // G5 high terrace
    { x0: 7640, x1: 9200, y: GROUND_Y }         // G6 final run to the portal
  );
  L.platforms.push(
    { x: 600, y: GROUND_Y - 108, prop: "plat_log" },
    { x: 950, y: GROUND_Y - 202, prop: "plat_medium" },
    { x: 1385, y: GROUND_Y - 42, prop: "plat_float" },   // stepping stone, pit 1
    { x: 2250, y: GROUND_Y - 178, prop: "plat_medium" },
    { x: 3100, y: GROUND_Y - 138, prop: "plat_float" },
    { x: 3400, y: GROUND_Y - 212, prop: "plat_medium" },
    { x: 5650, y: GROUND_Y - 108, prop: "plat_medium" },
    { x: 5990, y: GROUND_Y - 42, prop: "plat_float" },   // stepping stone, pit 3
    { x: 7050, y: GROUND_Y - 168, prop: "plat_medium" },
    { x: 7545, y: GROUND_Y - 90, prop: "plat_float" },   // stepping stone, pit 4
    { x: 7950, y: GROUND_Y - 108, prop: "plat_log" },
    { x: 8300, y: GROUND_Y - 202, prop: "plat_medium" }
  );
  // Ferry across the one wide pit (4200 -> 4560).
  L.movers.push({ x0: 4310, y0: GROUND_Y - 62, x1: 4470, y1: GROUND_Y - 62, period: 3600 });
  L.crumbles.push(
    { x: 2835, y: GROUND_Y - 102 },             // bridge over pit 2
    { x: 6550, y: GROUND_Y - 152 },
    { x: 6720, y: GROUND_Y - 192 }
  );
  L.spikes.push(
    { x: 820, y: GROUND_Y },
    { x: 2400, y: GROUND_Y - 70 },
    { x: 3750, y: GROUND_Y - 30 },
    { x: 5450, y: GROUND_Y },
    { x: 6900, y: GROUND_Y - 60 },
    { x: 8620, y: GROUND_Y }
  );
  L.crates.push(
    { x: 1750, y: GROUND_Y - 70 },              // on G2, before the cracked wall
    { x: 4760, y: GROUND_Y }                    // on G4: climb it to clear the 2-block wall
  );
  L.walls.push(
    { x: 2050, y: GROUND_Y - 70, blocks: 1, breakable: true },  // stands on G2
    { x: 4980, y: GROUND_Y, blocks: 2 }                          // stands on G4
  );
  L.hearts.push(
    { x: 950, y: GROUND_Y - 248 },
    { x: 3400, y: GROUND_Y - 258 },
    { x: 5650, y: GROUND_Y - 154 },
    { x: 7050, y: GROUND_Y - 214 },
    { x: 8300, y: GROUND_Y - 248 }
  );
  L.checkpoints.push(
    { x: 1560, y: GROUND_Y - 70 },
    { x: 3950, y: GROUND_Y - 30 },
    { x: 6200, y: GROUND_Y - 60 },
    { x: 7800, y: GROUND_Y }
  );
  L.portal = { x: 8950, y: GROUND_Y };
  return L;
}

export function crystalCrownArena(L: LevelDef): LevelDef {
  const x0 = 1400, x1 = x0 + 1280;
  L.width = x1 + 220;
  L.ground.push({ x0: -200, x1: x1 + 400, y: GROUND_Y });
  L.platforms.push(
    { x: 620, y: GROUND_Y - 90, prop: "plat_log" },
    { x: 980, y: GROUND_Y - 115, prop: "plat_medium" },
    { x: x0 + 250, y: GROUND_Y - 130, prop: "plat_medium" },
    { x: x1 - 390, y: GROUND_Y - 130, prop: "plat_medium" }
  );
  L.hearts.push({ x: 1050, y: GROUND_Y - 42 }, { x: x0 + 250, y: GROUND_Y - 173 });
  L.arena = { x0, x1 };
  L.portal = { x: (x0 + x1) / 2, y: GROUND_Y };
  return L;
}
