// Dev-only harness hooks for the develop-web-game loop (adapted skill).
// Installed from main.ts. These functions are INERT unless called from
// the browser console or a harness script: they never run during normal
// play, change no gameplay state on their own, and ship harmlessly.
//
// - window.render_game_to_text(): JSON snapshot of current game state.
// - window.advanceTime(ms): advance the game loop by fixed 1/60s steps.
//   The live RAF loop keeps running underneath, so a harness run at
//   ~1 FPS may add roughly one extra RAF step per wall second; for
//   pose/state checks that noise is negligible, and for frame-exact
//   work the harness freezes poses first (see AGENTS.md harness rules).

import Phaser from "phaser";

type AnyObj = Record<string, any>;

function safe(fn: () => unknown): unknown {
  try {
    return fn();
  } catch {
    return null;
  }
}

function renderState(game: Phaser.Game): Record<string, unknown> {
  const out: Record<string, unknown> = {
    scenes: safe(() => game.scene.getScenes(true).map((s) => s.scene.key)),
  };
  const gs = safe(() => game.scene.getScene("Game")) as AnyObj | null;
  if (!gs || gs.sys?.isActive?.() === false) return out;
  const player = gs.player as AnyObj | undefined;
  const boss = safe(() => gs.registry?.get("boss")) as AnyObj | null;
  out.level = {
    chapter: gs.info?.chapter ?? gs.chapter?.name ?? null,
    stage: gs.info?.stage ?? null,
    cutscene: gs.cutscene ?? null,
    veilState: gs.veilState ?? null,
  };
  out.player = player
    ? {
        x: Math.round(player.x ?? player.rect?.x ?? 0),
        y: Math.round(player.y ?? player.rect?.y ?? 0),
        hearts: player.hearts ?? null,
        alive: player.alive ?? null,
      }
    : null;
  out.boss = boss
    ? {
        name: boss.name ?? boss.constructor?.name ?? null,
        hp: boss.hp ?? null,
        maxHp: boss.maxHp ?? null,
        state: boss.state ?? null,
      }
    : null;
  out.enemies = Array.isArray(gs.enemies) ? gs.enemies.length : null;
  return out;
}

export function installDevHooks(game: Phaser.Game): void {
  const w = window as AnyObj;
  w.render_game_to_text = () => JSON.stringify(renderState(game));
  let vTime = -1;
  w.advanceTime = (ms: number) => {
    const steps = Math.max(1, Math.round((ms || 0) / (1000 / 60)));
    if (vTime < 0) vTime = performance.now();
    for (let i = 0; i < steps; i++) {
      vTime += 1000 / 60;
      game.step(vTime, 1000 / 60);
    }
    return JSON.stringify(renderState(game));
  };
}
