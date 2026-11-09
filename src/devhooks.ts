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
import { Audio } from "./audio/AudioManager";

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
  // Harness demos (dev only): snowball snow-shed effect + special light.
  // They call public GameScene demo methods; inert unless called.
  w.demo_snowball = () => {
    const gs = safe(() => game.scene.getScene("Game")) as AnyObj | null;
    if (!gs || gs.sys?.isActive?.() === false) return null;
    return safe(() => (gs as AnyObj).demoSnowball?.());
  };
  w.demo_special = () => {
    const gs = safe(() => game.scene.getScene("Game")) as AnyObj | null;
    if (!gs || gs.sys?.isActive?.() === false) return null;
    return safe(() => (gs as AnyObj).demoSpecial?.());
  };
  // v65 harness: audio state for the 1-1 music check (AudioContext state +
  // which track the scheduler thinks is playing). Dev-only read.
  w.__audio_state = () => {
    const A = Audio as unknown as AnyObj;
    return JSON.stringify({
      ctxState: A.ctx?.state ?? null,
      current: A.current ?? null,
      timer: !!A.timer,
      step: A.step ?? null,
      musicOn: Audio.musicOn,
      ducked: A.ducked ?? null,
      musicGain: A.musicBus?.gain?.value ?? null,
    });
  };
  // v65 harness: spawn a Yeti 90px back from the first real pit edge in the
  // current level, patrolling toward it, player parked 600px behind (out of
  // the 520px sight range so it keeps patrolling instead of chasing).
  // Returns the spawn/edge geometry so the harness can track the walk.
  w.__debug_yeti_edge = () => {
    const gs = safe(() => game.scene.getScene("Game")) as AnyObj | null;
    if (!gs || gs.sys?.isActive?.() === false) return null;
    return safe(() => {
      const grounds = gs.level?.ground as Array<{ x0: number; x1: number; y: number }> | undefined;
      if (!grounds?.length) return "no-ground";
      const sorted = [...grounds].sort((a, b) => a.x0 - b.x0);
      let seg: { x0: number; x1: number; y: number } | null = null;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1].x0 - sorted[i].x1 >= 120) {
          seg = sorted[i];
          break;
        }
      }
      if (!seg) return "no-pit-edge";
      const x = seg.x1 - 90;
      const e = gs.spawnEnemy("yeti", x, seg.y - 60);
      if (!e) return "spawn-failed";
      e.dir = 1;
      e.state = "patrol";
      e.stateUntil = (gs.time?.now ?? 0) + 30000;
      const p = gs.player as AnyObj | undefined;
      if (p?.body?.reset) p.body.reset(x - 600, seg.y - 60);
      return JSON.stringify({ edgeX: seg.x1, edgeY: seg.y, yetiX: Math.round(e.x), yetiBottom: Math.round(e.body.bottom) });
    });
  };
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
