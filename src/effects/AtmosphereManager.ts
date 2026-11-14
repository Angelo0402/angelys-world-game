import Phaser from "phaser";
import { GAME_H, GAME_W, GROUND_Y } from "../config";

/**
 * Chapter atmosphere: one reusable system, skinned per chapter.
 *
 * Everything here is procedural (canvas-generated textures, glow sprites,
 * TileSprite layers, particle emitters, tweens). No new image assets, no
 * Phaser dynamic lights, no Arcade Physics bodies on any ambient object.
 *
 * Budgets (mobile hard limits): 20-50 ambient particles visible per
 * chapter, 80 max in heavy atmosphere. Particle counts below are computed
 * as lifespan / frequency and stay inside those bounds.
 * v60 (Angelo, 2026-11-05): ambient x3 in ALL chapters by his explicit order
 * -- counts now run up to ~120 alive in ch4 snow. Watch phone perf; if it
 * stutters, this is the first knob to turn back down.
 *
 * v61 (Angelo, 2026-11-06): the game looks "very dry, very dead" -- he wants
 * a RAY-TRACING LOOK across the WHOLE GAME, not only during the special:
 * lights that visibly BOUNCE off ice, floor and walls. This file adds an
 * always-on, subtle light layer on top of the existing presets, still fully
 * procedural and still NO Phaser dynamic lights (those would need GameScene
 * wiring -- see report): (a) GOD RAYS -- slow-drifting additive tapered
 * light shafts, angled per chapter; (b) BOUNCE GLOW -- soft pools of warm /
 * cool light on the floor under bright spots, gently pulsing; (c) FLOOR
 * SHEEN -- a thin reflective highlight strip along the top of the ground in
 * ice / water chapters, never a mirror. NO violet wash anywhere: tints are
 * warm gold, cool ice-blue, teal or white per chapter. All light alphas are
 * kept low (0.06-0.24, bumped ~1.5x after the first settled QA still, which
 * showed the first pass too faint) so the light reads as bounce, not fog.
 * The light layer itself adds ZERO new particle emitters -- rays / pools /
 * sheen are sprites + tweens only. NOTE: buildFrozen also gained a small
 * ice-glints emitter during v61 (atmo_star, ~8 alive, depth 20 -- NOT part
 * of this light layer; it was added to the file by another agent while this
 * work was in progress, kept because it is on-theme and harmless). With it,
 * ch4 runs ~128 alive at real speed (120 snow + 8 glints) -- still the
 * file's heaviest chapter, same knob to turn down first if the phone stutters.
 *
 * Depth plan: far layers behind gameplay (-55..-30), glow accents at 20
 * (above ground, below entities), at most one sparse foreground layer per
 * chapter (ch4 streaks / ch5 front fog at 60), water overlays at 91-93.
 * Everything stays below the HUD.
 */
export class AtmosphereManager {
  private scene: Phaser.Scene;
  readonly chapter: number;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private drifters: { obj: Phaser.GameObjects.TileSprite; vx: number; vy: number }[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private destroyed = false;
  private butterflyCount = 0; // ch1 butterflies (containers, not plain images)
  private lightCount = 0; // v61 light-layer sprites (rays + pools + sheen + aurora)

  constructor(scene: Phaser.Scene, chapter: number) {
    this.scene = scene;
    this.chapter = chapter;
    ensureTextures(scene);
    switch (chapter) {
      case 1: this.buildForest(); break;
      case 2: this.buildRuins(); break;
      case 3: this.buildVolcano(); break;
      case 4: this.buildFrozen(); break;
      case 5: this.buildCastle(); break;
      case 6: this.buildSky(); break;
      case 7: this.buildSunken(); break;
      case 8: this.buildDesert(); break;
      case 9: this.buildCandy(); break;
      case 10: this.buildVeil(); break;
      // F1 PRUEBA (features cron 2026-11-13): dedicated graveyard preset.
      // Replaces the castle reuse. Phaser built-ins only, no new sprites.
      // Screen-anchored like every other preset, so fog/wisps follow the
      // camera into the underground phase too. NOT integrated into an APK
      // until Angelo passes the schematic GIF verdict.
      case 11: this.buildGraveyard(); break;
      default: break;
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
  }

  /** Keep screen-anchored emitters glued to the camera view (same pattern the old generic ambient emitter used). */
  place(view: Phaser.Geom.Rectangle) {
    for (const e of this.emitters) e.setPosition(view.x, view.y);
  }

  private onUpdate = (_time: number, delta: number) => {
    if (this.destroyed) return;
    const dt = delta / 1000;
    for (const d of this.drifters) {
      d.obj.tilePositionX += d.vx * dt;
      d.obj.tilePositionY += d.vy * dt;
    }
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    for (const e of this.emitters) e.stop();
    for (const o of this.objects) {
      const anyO = o as unknown as { destroy?: () => void };
      if (anyO.destroy) anyO.destroy();
    }
    this.objects = [];
    this.emitters = [];
    this.drifters = [];
  }

  /** Harness QA hook: live particle counts per emitter + object totals. */
  debugCounts() {
    return {
      chapter: this.chapter,
      emitters: this.emitters.map((e) => ({ key: e.texture.key, alive: e.getAliveParticleCount() })),
      objects: this.objects.length,
      drifters: this.drifters.length,
      butterflies: this.butterflyCount,
      lightLayers: this.lightCount,
    };
  }

  // ------------------------------------------------------------ helpers

  private emit(texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number) {
    const e = this.scene.add.particles(0, 0, texture, config);
    e.setDepth(depth);
    this.emitters.push(e);
    this.objects.push(e);
    return e;
  }

  private img(texture: string, x: number, y: number, depth: number, scrollFixed = true) {
    const im = this.scene.add.image(x, y, texture).setDepth(depth);
    if (scrollFixed) im.setScrollFactor(0);
    this.objects.push(im);
    return im;
  }

  private layer(texture: string, x: number, y: number, w: number, h: number, depth: number, alpha: number, vx: number, vy = 0) {
    const t = this.scene.add.tileSprite(x, y, w, h, texture).setOrigin(0, 0).setDepth(depth).setAlpha(alpha);
    t.setScrollFactor(0);
    this.drifters.push({ obj: t, vx, vy });
    this.objects.push(t);
    return t;
  }

  private flicker(target: Phaser.GameObjects.Image, a0: number, a1: number, minMs: number, maxMs: number) {
    const d = Phaser.Math.Between(minMs, maxMs);
    this.scene.tweens.add({
      targets: target, alpha: a1, duration: d, yoyo: true, repeat: -1,
      delay: Phaser.Math.Between(0, 400),
    });
    void a0;
  }

  // ------------------------------------------------------------ v61 light layer
  // All helpers are screen-anchored (scrollFactor 0, like the existing
  // glows), additive, and low-alpha by design. Depths follow the file plan:
  // rays / aurora far behind gameplay (-52..-48), pools + sheen at 20
  // (above ground, below entities), everything below the HUD.

  /** One tapered god-ray shaft, slowly breathing and drifting sideways. */
  private godRay(x: number, angle: number, w: number, tint: number, a0: number, a1: number) {
    const r = this.img("atmo_ray", x, GAME_H / 2, -48);
    r.setDisplaySize(w, GAME_H * 1.2).setAngle(angle).setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(a0);
    this.lightCount++;
    this.scene.tweens.add({
      targets: r, alpha: a1, duration: Phaser.Math.Between(3200, 4800),
      yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 800),
    });
    this.scene.tweens.add({
      targets: r, x: x + 16, duration: Phaser.Math.Between(5200, 7200),
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    return r;
  }

  /** Soft pool of bounced light on the floor (under a torch, crystal, sun patch). */
  private bouncePool(x: number, y: number, w: number, h: number, tint: number, a0: number, a1: number) {
    const g = this.img("glow", x, y, 20);
    g.setDisplaySize(w, h).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(a0);
    this.lightCount++;
    const sx = g.scaleX, sy = g.scaleY;
    this.scene.tweens.add({
      targets: g, alpha: a1, scaleX: sx * 1.06, scaleY: sy * 1.06,
      duration: Phaser.Math.Between(2400, 3800), yoyo: true, repeat: -1,
      delay: Phaser.Math.Between(0, 600),
    });
    return g;
  }

  /** Thin reflective highlight along the top of the ground (ice / water only). */
  private floorSheen(tint: number, a0: number, a1: number, h = 10, yOff = 0) {
    const s = this.img("atmo_streak", GAME_W / 2, GROUND_Y + 3 + yOff, 20);
    s.setDisplaySize(GAME_W, h).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(a0);
    this.lightCount++;
    this.scene.tweens.add({
      targets: s, alpha: a1, duration: Phaser.Math.Between(3000, 4200),
      yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 500),
    });
    return s;
  }

  /** Wide soft aurora band across the sky (ch4 only). */
  private auroraBand(y: number, h: number, tint: number, a0: number, a1: number) {
    const b = this.img("atmo_fog", GAME_W / 2, y, -52);
    b.setDisplaySize(GAME_W, h).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(a0);
    this.lightCount++;
    this.scene.tweens.add({
      targets: b, alpha: a1, duration: Phaser.Math.Between(4200, 6000),
      yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 900),
    });
    this.scene.tweens.add({
      targets: b, x: GAME_W / 2 + 30, duration: Phaser.Math.Between(8000, 11000),
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    return b;
  }

  // ------------------------------------------------------------ chapters

  /** 1. The Enchanted Forest: 12 wandering butterflies + ~45 pollen motes. (v60: x3)
   * v61: real yellow/pink butterflies cut from Angelo's ch1 sheet (see
   * manifest BUTTERFLY_FILES) replace the old canvas wings, inside the same
   * container (halo + wings) so the halo follows the hop. The art is already
   * coloured -- no tint on the image, only the halo takes the matching tint.
   * Art is 72px wide; scale 0.32-0.45 keeps it ~23-32px on screen
   * (Angely is 112px -- a butterfly should read small next to her). */
  private buildForest() {
    const flies: [string, number][] = [["atmo_butterfly_yellow", 0xffd94d], ["atmo_butterfly_pink", 0xff7ab8]];
    for (let i = 0; i < 12; i++) {
      const s = Phaser.Math.FloatBetween(0.32, 0.45);
      const [key, tint] = flies[i % flies.length];
      const halo = this.scene.add.image(0, 0, "glow").setTint(tint)
        .setDisplaySize(30, 30).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.30);
      const b = this.scene.add.image(0, 0, key).setScale(s);
      const c = this.scene.add.container(
        Phaser.Math.Between(80, GAME_W - 80), Phaser.Math.Between(70, GAME_H - 150), [halo, b],
      ).setDepth(-30).setScrollFactor(0);
      this.objects.push(c);
      this.butterflyCount++;
      // Wing flap: squeeze scaleX on a fast yoyo.
      this.scene.tweens.add({ targets: b, scaleX: s * 0.35, duration: Phaser.Math.Between(130, 200), yoyo: true, repeat: -1 });
      // Halo breathes with the flap so the glow never looks detached.
      this.scene.tweens.add({ targets: halo, alpha: 0.42, duration: Phaser.Math.Between(900, 1400), yoyo: true, repeat: -1 });
      const hop = () => {
        if (this.destroyed) return;
        const nx = Phaser.Math.Between(60, GAME_W - 60);
        const ny = Phaser.Math.Between(60, GAME_H - 140);
        const dist = Math.hypot(nx - c.x, ny - c.y);
        this.scene.tweens.add({
          targets: c, x: nx, y: ny, duration: Phaser.Math.Clamp(dist * 4, 1400, 2800),
          ease: "Sine.easeInOut", onComplete: hop,
        });
      };
      this.scene.time.delayedCall(Phaser.Math.Between(0, 600), hop);
    }
    // v61: warm sun shafts through the canopy + sun patches bouncing on the floor.
    this.godRay(300, 16, 120, 0xffe9a8, 0.14, 0.22);
    this.godRay(620, 14, 90, 0xfff6c8, 0.12, 0.18);
    this.godRay(950, 18, 150, 0xffe9a8, 0.13, 0.20);
    this.godRay(1150, 15, 80, 0xfff6c8, 0.10, 0.16);
    this.bouncePool(280, GROUND_Y - 12, 320, 70, 0xffe9a8, 0.14, 0.20);
    this.bouncePool(760, GROUND_Y - 12, 280, 60, 0xfff6c8, 0.12, 0.17);
    this.bouncePool(1120, GROUND_Y - 12, 300, 65, 0xffe9a8, 0.13, 0.19);
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 4200, speedY: { min: -26, max: -6 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.32, end: 0 }, alpha: { start: 0.85, end: 0 },
      tint: 0xfff27a, blendMode: Phaser.BlendModes.ADD, frequency: 93, // 4200/93 = 45 alive (v60: x3)
    }, -40);
  }

  /** 2. Moonlit Ruins: mist layers + moonbeams + ~36 blue motes. (v60: x3) */
  private buildRuins() {
    const mistBack = this.layer("atmo_fog", 0, GAME_H - 200, GAME_W, 180, -50, 0.35, 6);
    mistBack.setTint(0x8a7bd8);
    const mistFront = this.layer("atmo_fog", 0, GAME_H - 140, GAME_W, 140, -45, 0.5, 14);
    mistFront.setTint(0x9d8ce8);
    for (let i = 0; i < 9; i++) {
      const beam = this.img("atmo_beam", 80 + (i * (GAME_W - 160)) / 8, GAME_H / 2, -48);
      beam.setTint(0xb9c8ff).setDisplaySize(90, GAME_H).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: beam, alpha: 0.25, duration: Phaser.Math.Between(2600, 3600), yoyo: true, repeat: -1 });
      this.scene.tweens.add({ targets: beam, x: beam.x + 14, duration: Phaser.Math.Between(3600, 4800), yoyo: true, repeat: -1 });
    }
    // v61: the moonbeams already exist -- add their bounce on the floor.
    this.bouncePool(300, GROUND_Y - 12, 300, 60, 0xbdd2ff, 0.10, 0.15);
    this.bouncePool(700, GROUND_Y - 12, 320, 65, 0xbdd2ff, 0.11, 0.16);
    this.bouncePool(1080, GROUND_Y - 12, 280, 60, 0xbdd2ff, 0.10, 0.15);
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 100, max: GAME_H - 100 },
      lifespan: 4000, speedY: { min: -12, max: -4 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.25, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: 0x9fb8ff, blendMode: Phaser.BlendModes.ADD, frequency: 110, // 36 alive (v60: x3)
    }, -40);
  }

  /** 3. Volcanic Caves: ~87 rising ash motes + flickering lava glows. (v60: x3) */
  private buildVolcano() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: GAME_H,
      lifespan: 5000, speedY: { min: -70, max: -30 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.4, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: 0xff6a1a, blendMode: Phaser.BlendModes.ADD, frequency: 57, // 87 alive (v60: x3)
    }, -40);
    const spots: [number, number][] = [[200, GAME_H - 40], [640, GAME_H - 30], [1080, GAME_H - 45], [400, GAME_H - 35], [860, GAME_H - 42], [1200, GAME_H - 38], [80, GAME_H - 44], [520, GAME_H - 32], [980, GAME_H - 40]];
    for (const [x, y] of spots) {
      const g = this.img("glow", x, y, 20);
      g.setTint(0xff5a1a).setDisplaySize(260, 90).setBlendMode(Phaser.BlendModes.ADD);
      const sx = g.scaleX, sy = g.scaleY;
      const d = Phaser.Math.Between(700, 1300);
      this.scene.tweens.add({
        targets: g, alpha: 0.7, scaleX: sx * 1.04, scaleY: sy * 1.04,
        duration: d, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 400),
      });
      g.setAlpha(0.45);
    }
    // v61: faint warm shafts from cracks above + a lava-lit sheen on the floor.
    this.godRay(350, 20, 90, 0xffc27a, 0.09, 0.14);
    this.godRay(900, -18, 110, 0xffc27a, 0.08, 0.12);
    this.floorSheen(0xff7a2a, 0.10, 0.15, 8);
  }

  /** 4. Frozen Peaks: two snow layers (~120 total) + wind streaks. (v60: x3) */
  private buildFrozen() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: -10,
      lifespan: 24000, speedY: { min: 20, max: 45 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.3, end: 0.2 }, alpha: { start: 0.55, end: 0 },
      tint: 0xffffff, frequency: 320, // 75 alive (v60: x3)
    }, -40);
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: -10,
      lifespan: 8000, speedY: { min: 55, max: 95 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.55, end: 0.4 }, alpha: { start: 0.9, end: 0 },
      tint: 0xffffff, frequency: 177, // 45 alive (v60: x3)
    }, -38);
    // Wind streaks: one sparse foreground element, spawned on a slow timer (not per frame).
    const gust = () => {
      if (this.destroyed) return;
      const s = this.img("atmo_streak", GAME_W + 80, Phaser.Math.Between(40, GAME_H / 2), 60);
      s.setTint(0xffffff).setAlpha(0.35).setAngle(-25).setDisplaySize(180, 14);
      this.scene.tweens.add({
        targets: s, x: -120, alpha: 0, duration: 700, ease: "Quad.easeOut",
        onComplete: () => { s.destroy(); this.objects.splice(this.objects.indexOf(s), 1); },
      });
    };
    this.timers.push(this.scene.time.addEvent({ delay: 800, loop: true, callback: gust })); // (v60: x3)
    // v61 (the reference chapter): aurora glow in the sky, cold shafts
    // slanting through the snowfall, cool bounce pools under the crystals /
    // waterfalls, warm torch accents for contrast, and an ice sheen on the
    // ground. Tints are teal / ice-blue / warm amber only -- no violet wash.
    this.auroraBand(70, 130, 0x7dffc8, 0.14, 0.22);
    this.auroraBand(120, 90, 0x6fd8ff, 0.10, 0.16);
    this.godRay(260, -12, 90, 0xcfe8ff, 0.12, 0.18);
    this.godRay(640, -14, 120, 0xd8ecff, 0.11, 0.17);
    this.godRay(1020, -10, 80, 0xcfe8ff, 0.12, 0.18);
    this.bouncePool(240, GROUND_Y - 10, 280, 60, 0x9fd8ff, 0.14, 0.20);
    this.bouncePool(640, GROUND_Y - 10, 300, 65, 0x9fd8ff, 0.13, 0.19);
    this.bouncePool(1040, GROUND_Y - 10, 280, 60, 0xa8e0ff, 0.14, 0.20);
    this.bouncePool(880, GROUND_Y - 10, 200, 50, 0x9fd8ff, 0.12, 0.17);
    this.bouncePool(420, GROUND_Y - 60, 140, 140, 0xffb45e, 0.16, 0.24);
    this.bouncePool(860, GROUND_Y - 60, 140, 140, 0xffb45e, 0.16, 0.24);
    this.floorSheen(0xd8ecff, 0.16, 0.24, 10);
    this.floorSheen(0xbfe0ff, 0.06, 0.10, 26, 14);
    // v61: sparse specular glints twinkling on the ice near the floor.
    this.emit("atmo_star", {
      x: { min: 60, max: GAME_W - 60 }, y: { min: GAME_H - 170, max: GAME_H - 30 },
      lifespan: 1600, speedY: { min: -6, max: 0 }, speedX: { min: -4, max: 4 },
      scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      rotate: { start: 0, end: 90 },
      tint: 0xd8ecff, blendMode: Phaser.BlendModes.ADD, frequency: 200, // 8 alive
    }, 20);
  }

  /** 5. The Shadow Castle: shadow fog + torch glows flickering out of sync. (v60: x3 torches) */
  private buildCastle() {
    const back = this.layer("atmo_fog", 0, GAME_H - 180, GAME_W, 170, -50, 0.16, 5);
    back.setTint(0x2a1a4a);
    const front = this.layer("atmo_fog", 0, GAME_H - 120, GAME_W, 120, 60, 0.10, 9);
    front.setTint(0x1c1038);
    const torches: [number, number][] = [[240, 220], [640, 160], [1040, 260], [120, 260], [400, 180], [800, 200], [1160, 180], [60, 160], [520, 260]];
    for (const [x, y] of torches) {
      const g = this.img("glow", x, y, 20);
      g.setTint(0xffa030).setDisplaySize(150, 150).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
      this.flicker(g, 0.35, 0.65, 600, 1100);
    }
    // v61: cold shafts through the windows + warm torch bounce on the floor.
    this.godRay(400, 12, 80, 0x9fb8ff, 0.08, 0.13);
    this.godRay(880, -12, 90, 0x9fb8ff, 0.08, 0.13);
    this.bouncePool(240, GROUND_Y - 12, 220, 60, 0xffa030, 0.13, 0.18);
    this.bouncePool(640, GROUND_Y - 12, 240, 65, 0xffa030, 0.14, 0.19);
    this.bouncePool(1040, GROUND_Y - 12, 220, 60, 0xffa030, 0.13, 0.18);
  }

  /** F1 PRUEBA (features cron 2026-11-13) — 11. The Graveyard.
   * Moonlit graveyard, built ONLY from the file's existing helpers and
   * canvas textures (fog, beam, ray, glow, flake). No new sprites, no
   * Phaser dynamic lights, no new emitters beyond the one dust emitter.
   * Palette: cold moon blue-grey + faint grave green. Tints stay muted
   * (no saturated violet wash, per the v61 rule).
   * Layers: back fog (depth -50) + front fog wisp (depth 60, like ch5),
   * 5 cold moonbeams, 2 moon shafts, 2 moonlight floor pools, 3 faint
   * green grave glows, 6 wandering will-o'-wisps, ~36 slow dust motes.
   * Budget: 36 alive particles, ~20 objects — the file's lightest preset
   * after ch9. Everything is screen-anchored (scrollFactor 0), so the fog
   * and wisps follow the camera down into the underground phase. */
  private buildGraveyard() {
    // Ground fog, two depths: slow back bank + faster front wisp.
    const back = this.layer("atmo_fog", 0, GAME_H - 190, GAME_W, 170, -50, 0.30, 4);
    back.setTint(0x5a5478);
    const front = this.layer("atmo_fog", 0, GAME_H - 120, GAME_W, 130, 60, 0.12, 8);
    front.setTint(0x38324e);
    // Cold moonbeams through the dead trees (fewer + wider than ch2).
    for (let i = 0; i < 5; i++) {
      const beam = this.img("atmo_beam", 140 + i * 260, GAME_H / 2, -48);
      beam.setTint(0xaebadd).setDisplaySize(100, GAME_H).setAlpha(0.10).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: beam, alpha: 0.20, duration: Phaser.Math.Between(2800, 3800), yoyo: true, repeat: -1 });
      this.scene.tweens.add({ targets: beam, x: beam.x + 12, duration: Phaser.Math.Between(3800, 5000), yoyo: true, repeat: -1 });
    }
    // Moon shafts + moonlight pools on the ground.
    this.godRay(350, 14, 90, 0xc8d4f0, 0.08, 0.13);
    this.godRay(900, -14, 100, 0xc8d4f0, 0.08, 0.12);
    this.bouncePool(300, GROUND_Y - 12, 280, 60, 0x9fb0d8, 0.08, 0.12);
    this.bouncePool(900, GROUND_Y - 12, 280, 60, 0x9fb0d8, 0.08, 0.12);
    // Faint green grave glows — soft pools low over the grave mounds.
    this.bouncePool(180, GROUND_Y - 30, 180, 90, 0x7fb08a, 0.09, 0.14);
    this.bouncePool(640, GROUND_Y - 30, 200, 95, 0x7fb08a, 0.09, 0.13);
    this.bouncePool(1100, GROUND_Y - 30, 180, 90, 0x7fb08a, 0.08, 0.13);
    // Will-o'-wisps: small pale-green glows wandering slowly, flickering.
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(120, GAME_W - 120);
      const y = Phaser.Math.Between(140, GAME_H - 160);
      const w = this.img("glow", x, y, 20);
      w.setTint(0x9fe8b0).setDisplaySize(36, 36).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.30);
      this.flicker(w, 0.30, 0.55, 700, 1300);
      this.scene.tweens.add({
        targets: w, x: x + Phaser.Math.Between(-120, 120), y: y + Phaser.Math.Between(-36, 36),
        duration: Phaser.Math.Between(6000, 9000), yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }
    // Slow grey-green dust motes drifting down (~36 alive).
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 5000, speedY: { min: 8, max: 22 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.25, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: 0xb8c4a8, frequency: 140, // 5000/140 = ~36 alive
    }, -40);
  }

  /** 6. The Sky Tower: cloud parallax layers + ~60 sideways wind dust motes. (v60: x3) */
  private buildSky() {
    const back = this.layer("atmo_fog", 0, 0, GAME_W, 200, -55, 0.55, 4);
    back.setTint(0xffffff);
    const mid = this.layer("atmo_fog", 0, 120, GAME_W, 220, -50, 0.7, 10);
    mid.setTint(0xf2f5ff);
    const front = this.layer("atmo_fog", 0, 300, GAME_W, 260, -45, 0.8, 18);
    front.setTint(0xffffff);
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 4000, speedX: { min: 60, max: 120 }, speedY: { min: -10, max: 10 },
      scale: { start: 0.3, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: 0xffffff, frequency: 67, // 60 alive (v60: x3)
    }, -40);
    // v61: bright sun shafts above the clouds + sunlit cloud-floor pools.
    this.godRay(300, 16, 110, 0xfff3c8, 0.13, 0.20);
    this.godRay(700, 14, 90, 0xfff6d8, 0.12, 0.18);
    this.godRay(1080, 18, 120, 0xfff3c8, 0.11, 0.17);
    this.bouncePool(400, GROUND_Y - 12, 300, 60, 0xfff6d8, 0.09, 0.13);
    this.bouncePool(900, GROUND_Y - 12, 300, 60, 0xfff6d8, 0.09, 0.13);
  }

  /** 7. The Sunken Temple: ambient + scenery bubbles (~72) + caustics overlay. (v60: x3) */
  private buildSunken() {
    this.emit("bubble", {
      x: { min: 0, max: GAME_W }, y: GAME_H + 10,
      lifespan: 5200, speedY: { min: -120, max: -50 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.18, end: 0.42 }, alpha: { start: 0.55, end: 0 },
      tint: 0xdff8ff, frequency: 100, // 52 alive (v60: x3)
    }, 93);
    this.emit("bubble", {
      x: { min: 120, max: 180 }, y: GAME_H - 60,
      lifespan: 5200, speedY: { min: -90, max: -50 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.15, end: 0.35 }, alpha: { start: 0.6, end: 0 },
      tint: 0xdff8ff, frequency: 233, // 22 alive (v60: x3)
    }, 93);
    const ca = this.layer("atmo_caustics", 0, 0, GAME_W, GAME_H, 91, 0.10, 3, 1.5);
    ca.setBlendMode(Phaser.BlendModes.ADD);
    // v61: water shafts from the surface + a watery sheen on the temple floor.
    this.godRay(280, 10, 100, 0xbfefff, 0.13, 0.20);
    this.godRay(640, 12, 130, 0xbfefff, 0.12, 0.18);
    this.godRay(1000, 8, 90, 0xd0f4ff, 0.13, 0.19);
    this.bouncePool(360, GROUND_Y - 12, 260, 55, 0x8fe0ff, 0.10, 0.15);
    this.bouncePool(900, GROUND_Y - 12, 260, 55, 0x8fe0ff, 0.10, 0.15);
    this.floorSheen(0x9fe8ff, 0.12, 0.17, 10);
  }

  /** 8. The Clockwork Desert: bottom-only sand drift (~30) + rising heat streaks. (v60: x3) */
  private buildDesert() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: { min: GAME_H - 50, max: GAME_H - 10 },
      lifespan: 1200, speedX: { min: 40, max: 90 }, speedY: { min: -8, max: 4 },
      scale: { start: 0.35, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: 0xffd27a, frequency: 40, // 30 alive (v60: x3)
    }, -40);
    const xs = [180, 300, 440, 580, 720, 860, 1000, 1140, 1240];
    xs.forEach((x, i) => {
      const h = this.img("atmo_heat", x, GAME_H - 160, 20);
      h.setTint(0xffe8a0).setAlpha(0).setDisplaySize(46, 150);
      this.scene.tweens.add({
        targets: h, y: GAME_H - 280, alpha: 0.3, duration: 1400,
        yoyo: true, repeat: -1, delay: i * 500,
      });
    });
    // v61: hot sun shafts + warm bounce pools on the sand.
    this.godRay(320, 18, 110, 0xffe6a8, 0.11, 0.16);
    this.godRay(760, 16, 90, 0xffe6a8, 0.10, 0.15);
    this.godRay(1120, 20, 100, 0xffd27a, 0.10, 0.15);
    this.bouncePool(300, GROUND_Y - 12, 300, 60, 0xffd27a, 0.10, 0.15);
    this.bouncePool(850, GROUND_Y - 12, 300, 60, 0xffd27a, 0.11, 0.16);
  }

  /** 9. Squishy Valley: candy sparkles (~15). No reachable decor list exists, so particles only. (v60: x3) */
  private buildCandy() {
    this.emit("atmo_star", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 3000, speedY: { min: -14, max: 6 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      rotate: { start: 0, end: 360 },
      tint: 0xffb7e8, blendMode: Phaser.BlendModes.ADD, frequency: 200, // 15 alive (v60: x3)
    }, -40);
    // v61: soft pastel shafts + candy floor pools.
    this.godRay(350, 12, 90, 0xffd8f0, 0.10, 0.15);
    this.godRay(900, -12, 100, 0xffe8c8, 0.09, 0.14);
    this.bouncePool(400, GROUND_Y - 12, 260, 55, 0xffb7e8, 0.10, 0.14);
    this.bouncePool(880, GROUND_Y - 12, 260, 55, 0xffd8a8, 0.09, 0.14);
  }

  /** 10. The Crystal Veil: crystal motes (~45) + large shards (~6) + diagonal light sweeps. (v60: x3) */
  private buildVeil() {
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 4500, speedY: { min: -20, max: -6 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.3, end: 0 }, alpha: { start: 0.8, end: 0 },
      rotate: { start: 0, end: 180 },
      tint: 0xb7a6ff, blendMode: Phaser.BlendModes.ADD, frequency: 100, // 45 alive (v60: x3)
    }, -40);
    this.emit("atmo_shard", {
      x: { min: 0, max: GAME_W }, y: { min: 60, max: GAME_H - 80 },
      lifespan: 5000, speedY: { min: -16, max: -6 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.8, end: 0.3 }, alpha: { start: 0.7, end: 0 },
      rotate: { start: 0, end: 120 },
      tint: 0x8ff5ff, blendMode: Phaser.BlendModes.ADD, frequency: 833, // 6 alive (v60: x3)
    }, -40);
    for (let i = 0; i < 6; i++) {
      const beam = this.img("atmo_beam", -100, GAME_H / 2, -48);
      beam.setTint(0xc9a8ff).setDisplaySize(70, GAME_H).setAngle(24).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: beam, x: GAME_W + 100, duration: 12000, repeat: -1,
        repeatDelay: 4000, delay: i * 6000,
      });
    }
    // v61: cool crystal bounce pools + a faint floor sheen (cyan, not violet
    // -- the existing violet sweeps already carry that hue; no more added).
    this.bouncePool(300, GROUND_Y - 12, 280, 60, 0x8ff5ff, 0.13, 0.18);
    this.bouncePool(700, GROUND_Y - 12, 280, 60, 0x8ff5ff, 0.12, 0.17);
    this.bouncePool(1060, GROUND_Y - 12, 280, 60, 0xa8ecff, 0.13, 0.18);
    this.floorSheen(0xa8ecff, 0.09, 0.14, 8);
  }
}

// ------------------------------------------------------------ textures

function ensureTextures(scene: Phaser.Scene) {
  const tex = scene.textures;
  const canvas = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (tex.exists(key)) return;
    const t = tex.createCanvas(key, w, h)!;
    draw(t.getContext());
    t.refresh();
  };

  // Soft irregular fog blob (tinted per chapter).
  canvas("atmo_fog", 256, 128, (ctx) => {
    const blob = (x: number, y: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(70, 80, 70, 0.8); blob(140, 60, 85, 0.6); blob(200, 85, 65, 0.7);
  });

  // Soft round flake (ash, snow, sand, wind dust).
  canvas("atmo_flake", 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  });

  // Butterfly: white wings (tinted per butterfly) + dark body.
  canvas("atmo_butterfly", 48, 32, (ctx) => {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath(); ctx.ellipse(13, 15, 11, 9, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(35, 15, 11, 9, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a2a33";
    ctx.beginPath(); ctx.ellipse(24, 16, 2.2, 7, 0, 0, Math.PI * 2); ctx.fill();
  });

  // Vertical beam: bright core fading sideways and top/bottom.
  canvas("atmo_beam", 64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    ctx.globalCompositeOperation = "destination-in";
    const v = ctx.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.25, "rgba(0,0,0,1)");
    v.addColorStop(0.75, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 64, 256);
  });

  // Tapered god-ray shaft (v61): narrow at the top (light source), widening
  // toward the floor, fading top and bottom. Tinted per chapter at use.
  canvas("atmo_ray", 96, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 96, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 256);
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.moveTo(31, 0); ctx.lineTo(65, 0); ctx.lineTo(96, 256); ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    const v = ctx.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.2, "rgba(0,0,0,1)");
    v.addColorStop(0.8, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 96, 256);
  });

  // Dappled caustics: arcs + soft blobs, read as underwater light at low alpha.
  canvas("atmo_caustics", 256, 256, (ctx) => {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 30, Math.random() * 3, Math.random() * 3 + 1.2);
      ctx.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 8 + Math.random() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.30)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });

  // Four-point sparkle for candy.
  canvas("atmo_star", 24, 24, (ctx) => {
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.moveTo(12, 1); ctx.quadraticCurveTo(14, 9, 23, 12); ctx.quadraticCurveTo(14, 15, 12, 23);
    ctx.quadraticCurveTo(10, 15, 1, 12); ctx.quadraticCurveTo(10, 9, 12, 1);
    ctx.fill();
  });

  // Horizontal soft streak for wind gusts.
  canvas("atmo_streak", 128, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 16);
    ctx.globalCompositeOperation = "destination-in";
    const v = ctx.createLinearGradient(0, 0, 0, 16);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.5, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 128, 16);
  });

  // Vertical heat streak, fading top and bottom.
  canvas("atmo_heat", 32, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 128);
    ctx.globalCompositeOperation = "destination-in";
    const h = ctx.createLinearGradient(0, 0, 32, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, 32, 128);
  });

  // Crystal shard (diamond).
  canvas("atmo_shard", 16, 32, (ctx) => {
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(15, 12); ctx.lineTo(8, 32); ctx.lineTo(1, 12);
    ctx.closePath(); ctx.fill();
  });
}
