import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";

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
      butterflies: this.objects.filter((o) => (o as Phaser.GameObjects.Image).texture?.key === "atmo_butterfly").length,
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

  // ------------------------------------------------------------ chapters

  /** 1. The Enchanted Forest: 4 wandering butterflies + ~15 pollen motes. */
  private buildForest() {
    const tints = [0xff7ab8, 0xffc46b, 0x9fd8ff, 0xd8a8ff];
    for (let i = 0; i < 4; i++) {
      const s = Phaser.Math.FloatBetween(0.8, 1.25);
      const b = this.img("atmo_butterfly", Phaser.Math.Between(80, GAME_W - 80), Phaser.Math.Between(70, GAME_H - 150), -30);
      b.setTint(tints[i]).setScale(s);
      // Wing flap: squeeze scaleX on a fast yoyo.
      this.scene.tweens.add({ targets: b, scaleX: s * 0.35, duration: Phaser.Math.Between(130, 200), yoyo: true, repeat: -1 });
      const hop = () => {
        if (this.destroyed) return;
        const nx = Phaser.Math.Between(60, GAME_W - 60);
        const ny = Phaser.Math.Between(60, GAME_H - 140);
        const dist = Math.hypot(nx - b.x, ny - b.y);
        this.scene.tweens.add({
          targets: b, x: nx, y: ny, duration: Phaser.Math.Clamp(dist * 4, 1400, 2800),
          ease: "Sine.easeInOut", onComplete: hop,
        });
      };
      this.scene.time.delayedCall(Phaser.Math.Between(0, 600), hop);
    }
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 4200, speedY: { min: -26, max: -6 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.32, end: 0 }, alpha: { start: 0.85, end: 0 },
      tint: 0xfff27a, blendMode: Phaser.BlendModes.ADD, frequency: 280, // 4200/280 = 15 alive
    }, -40);
  }

  /** 2. Moonlit Ruins: mist layers + moonbeams + ~12 blue motes. */
  private buildRuins() {
    const mistBack = this.layer("atmo_fog", 0, GAME_H - 200, GAME_W, 180, -50, 0.35, 6);
    mistBack.setTint(0x8a7bd8);
    const mistFront = this.layer("atmo_fog", 0, GAME_H - 140, GAME_W, 140, -45, 0.5, 14);
    mistFront.setTint(0x9d8ce8);
    for (let i = 0; i < 3; i++) {
      const beam = this.img("atmo_beam", 220 + i * 420, GAME_H / 2, -48);
      beam.setTint(0xb9c8ff).setDisplaySize(90, GAME_H).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: beam, alpha: 0.25, duration: Phaser.Math.Between(2600, 3600), yoyo: true, repeat: -1 });
      this.scene.tweens.add({ targets: beam, x: beam.x + 14, duration: Phaser.Math.Between(3600, 4800), yoyo: true, repeat: -1 });
    }
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 100, max: GAME_H - 100 },
      lifespan: 4000, speedY: { min: -12, max: -4 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.25, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: 0x9fb8ff, blendMode: Phaser.BlendModes.ADD, frequency: 330, // 12 alive
    }, -40);
  }

  /** 3. Volcanic Caves: ~29 rising ash motes + flickering lava glows. */
  private buildVolcano() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: GAME_H,
      lifespan: 5000, speedY: { min: -70, max: -30 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.4, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: 0xff6a1a, blendMode: Phaser.BlendModes.ADD, frequency: 170, // 29 alive
    }, -40);
    const spots: [number, number][] = [[200, GAME_H - 40], [640, GAME_H - 30], [1080, GAME_H - 45]];
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
  }

  /** 4. Frozen Peaks: two snow layers (~40 total) + occasional wind streaks. */
  private buildFrozen() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: -10,
      lifespan: 24000, speedY: { min: 20, max: 45 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.3, end: 0.2 }, alpha: { start: 0.55, end: 0 },
      tint: 0xffffff, frequency: 960, // 25 alive
    }, -40);
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: -10,
      lifespan: 8000, speedY: { min: 55, max: 95 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.55, end: 0.4 }, alpha: { start: 0.9, end: 0 },
      tint: 0xffffff, frequency: 530, // 15 alive
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
    this.timers.push(this.scene.time.addEvent({ delay: 2400, loop: true, callback: gust }));
  }

  /** 5. The Shadow Castle: shadow fog + torch glows flickering out of sync. */
  private buildCastle() {
    const back = this.layer("atmo_fog", 0, GAME_H - 180, GAME_W, 170, -50, 0.16, 5);
    back.setTint(0x2a1a4a);
    const front = this.layer("atmo_fog", 0, GAME_H - 120, GAME_W, 120, 60, 0.10, 9);
    front.setTint(0x1c1038);
    const torches: [number, number][] = [[240, 220], [640, 160], [1040, 260]];
    for (const [x, y] of torches) {
      const g = this.img("glow", x, y, 20);
      g.setTint(0xffa030).setDisplaySize(150, 150).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
      this.flicker(g, 0.35, 0.65, 600, 1100);
    }
  }

  /** 6. The Sky Tower: cloud parallax layers + ~20 sideways wind dust motes. */
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
      tint: 0xffffff, frequency: 200, // 20 alive
    }, -40);
  }

  /** 7. The Sunken Temple: ambient + scenery bubbles (~24) + caustics overlay. */
  private buildSunken() {
    this.emit("bubble", {
      x: { min: 0, max: GAME_W }, y: GAME_H + 10,
      lifespan: 5200, speedY: { min: -120, max: -50 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.18, end: 0.42 }, alpha: { start: 0.55, end: 0 },
      tint: 0xdff8ff, frequency: 300, // 17 alive
    }, 93);
    this.emit("bubble", {
      x: { min: 120, max: 180 }, y: GAME_H - 60,
      lifespan: 5200, speedY: { min: -90, max: -50 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.15, end: 0.35 }, alpha: { start: 0.6, end: 0 },
      tint: 0xdff8ff, frequency: 700, // 7 alive
    }, 93);
    const ca = this.layer("atmo_caustics", 0, 0, GAME_W, GAME_H, 91, 0.10, 3, 1.5);
    ca.setBlendMode(Phaser.BlendModes.ADD);
  }

  /** 8. The Clockwork Desert: bottom-only sand drift (~10) + rising heat streaks. No distortion shader. */
  private buildDesert() {
    this.emit("atmo_flake", {
      x: { min: 0, max: GAME_W }, y: { min: GAME_H - 50, max: GAME_H - 10 },
      lifespan: 1200, speedX: { min: 40, max: 90 }, speedY: { min: -8, max: 4 },
      scale: { start: 0.35, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: 0xffd27a, frequency: 120, // 10 alive
    }, -40);
    const xs = [300, 640, 980];
    xs.forEach((x, i) => {
      const h = this.img("atmo_heat", x, GAME_H - 160, 20);
      h.setTint(0xffe8a0).setAlpha(0).setDisplaySize(46, 150);
      this.scene.tweens.add({
        targets: h, y: GAME_H - 280, alpha: 0.3, duration: 1400,
        yoyo: true, repeat: -1, delay: i * 500,
      });
    });
  }

  /** 9. Squishy Valley: candy sparkles at a very low rate (~5). No reachable decor list exists, so particles only. */
  private buildCandy() {
    this.emit("atmo_star", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 3000, speedY: { min: -14, max: 6 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      rotate: { start: 0, end: 360 },
      tint: 0xffb7e8, blendMode: Phaser.BlendModes.ADD, frequency: 600, // 5 alive
    }, -40);
  }

  /** 10. The Crystal Veil: crystal motes (~15) + rare large shards (~2) + diagonal light sweeps. */
  private buildVeil() {
    this.emit("dot", {
      x: { min: 0, max: GAME_W }, y: { min: 40, max: GAME_H - 60 },
      lifespan: 4500, speedY: { min: -20, max: -6 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.3, end: 0 }, alpha: { start: 0.8, end: 0 },
      rotate: { start: 0, end: 180 },
      tint: 0xb7a6ff, blendMode: Phaser.BlendModes.ADD, frequency: 300, // 15 alive
    }, -40);
    this.emit("atmo_shard", {
      x: { min: 0, max: GAME_W }, y: { min: 60, max: GAME_H - 80 },
      lifespan: 5000, speedY: { min: -16, max: -6 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.8, end: 0.3 }, alpha: { start: 0.7, end: 0 },
      rotate: { start: 0, end: 120 },
      tint: 0x8ff5ff, blendMode: Phaser.BlendModes.ADD, frequency: 2500, // 2 alive
    }, -40);
    for (let i = 0; i < 2; i++) {
      const beam = this.img("atmo_beam", -100, GAME_H / 2, -48);
      beam.setTint(0xc9a8ff).setDisplaySize(70, GAME_H).setAngle(24).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: beam, x: GAME_W + 100, duration: 12000, repeat: -1,
        repeatDelay: 4000, delay: i * 6000,
      });
    }
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
