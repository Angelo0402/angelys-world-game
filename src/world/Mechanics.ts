import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { PROPS } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GAME_H, GROUND_Y, type ChapterDef } from "../config";
import { PUSH_SPEED, type Player } from "../entities/Player";
import type { GameScene } from "../scenes/GameScene";
import { backPlatform } from "./backing";
import { BLOCK_H, BLOCK_W, CRATE_SIZE, type LevelDef, type MineDef, type MoverDef, type PlatformDef, type Spot, type TargetDef, type WallDef } from "./level";

interface Wall {
  def: WallDef;
  body: Phaser.GameObjects.Rectangle;
  parts: Phaser.GameObjects.GameObject[];
  broken: boolean;
  /** Breakable walls announce themselves with a voice bark, once each. */
  barked?: boolean;
  /** Hammer hits landed (breakable walls only). Breaks at def.hits ?? 3. */
  hits: number;
  /** Pulsing gold glint overlay, alive until the first hit. */
  glint?: Phaser.GameObjects.Graphics;
  glintTween?: Phaser.Tweens.Tween;
  /** v79: per-block crack/shard overlays (non-breakable walls only). Kept
   *  OUT of `parts` — wallHit/breakWall call setTexture on parts. */
  dressing?: Phaser.GameObjects.Graphics[];
}

/** Breakable-wall block stage textures (baked cracks, approved sprites). */
const WALLBLOCK_STAGE = ["wallblock_intact", "wallblock_cracked", "wallblock_heavy"];
const WALLBLOCK_CHUNKS = 12;

interface Crate {
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  img: Phaser.GameObjects.Image;
  home: Spot;
  lastSfx: number;
  /** Last push-dust burst (own timer — dust runs ~200ms, sfx stays 260ms). */
  lastDust: number;
  /** v79: moving-box dressing — gold glow outline + travel chevrons. */
  boxGlow: Phaser.GameObjects.Graphics;
  boxArrows: Phaser.GameObjects.Graphics;
  boxPhase: number;
  /** Last push direction (1 = right, -1 = left); chevrons point this way. */
  lastPush: 1 | -1;
}

interface Mine {
  def: MineDef;
  img: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Rectangle;
}

interface Mover {
  def: MoverDef;
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  img: Phaser.GameObjects.Image;
  surface: number;
}

interface Crumble {
  x: number;
  y: number;
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  img: Phaser.GameObjects.Image;
  state: "solid" | "shaking" | "gone";
  until: number;
}

interface Target {
  def: TargetDef;
  img: Phaser.GameObjects.Image;
  hit: boolean;
  bridge: { rect: Phaser.GameObjects.Rectangle; img: Phaser.GameObjects.Image; y: number }[];
}

interface Hint {
  x: number;
  y?: number;
  text: string | (() => string);
  shown: boolean;
  when?: () => boolean;
  id?: string;
}

const PLATFORM_ART: Record<PlatformDef["prop"], "plat_l" | "plat_m" | "plat_s"> = {
  plat_log: "plat_l",
  plat_float: "plat_m",
  plat_medium: "plat_m",
  plat_small: "plat_m",
  plat_float_small: "plat_s",
};

type Surface = { x0: number; x1: number; y: number };

/**
 * The level's puzzle pieces: walls, pushable crates, springs, moving platforms,
 * crumbling platforms, star targets that raise bridges and hammer-breakable walls.
 */
export class Mechanics {
  readonly wallGroup: Phaser.Physics.Arcade.StaticGroup;
  readonly crateGroup: Phaser.Physics.Arcade.Group;
  readonly moverGroup: Phaser.Physics.Arcade.Group;
  readonly bridgeGroup: Phaser.Physics.Arcade.StaticGroup;
  private scene: GameScene;
  private chapter: ChapterDef;
  private walls: Wall[] = [];
  private crates: Crate[] = [];
  private springs: { x: number; y: number; sprite: Phaser.GameObjects.Sprite; base: number; last: number }[] = [];
  private mines: Mine[] = [];
  private movers: Mover[] = [];
  private crumbles: Crumble[] = [];
  private targets: Target[] = [];
  private hints: Hint[] = [];
  /** True while the yellow crate-push hint toast is on screen (v81). */
  private crateHintVisible = false;
  private swordWarned = false;
  private moverClock = 0;
  /** Landing-on-crate detection. Player has no public landed hook (its
   *  grounded transition — wasGrounded / lastFallSpeed — is private), so
   *  Mechanics tracks the grounded transition + fall speed itself. */
  private prevGrounded = true;
  private prevFallVy = 0;

  constructor(scene: GameScene, level: LevelDef, chapter: ChapterDef) {
    this.scene = scene;
    this.chapter = chapter;
    this.wallGroup = scene.physics.add.staticGroup();
    this.crateGroup = scene.physics.add.group();
    this.moverGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.bridgeGroup = scene.physics.add.staticGroup();
    ensureTargetTexture(scene);
    ensureUrchinTexture(scene);

    for (const w of level.walls) this.addWall(w);
    for (const c of level.crates) this.addCrate(c);
    for (const s of level.springs) this.addSpring(s);
    for (const m of level.mines) this.addMine(m);
    for (const m of level.movers) this.addMover(m);
    for (const c of level.crumbles) this.addCrumble(c.x, c.y);
    for (const t of level.targets) this.addTarget(t);
    this.wallGroup.refresh();
    this.bridgeGroup.refresh();
    const world = scene.physics.world;
    const onStep = (d: number) => this.stepMovers(d);
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep));
  }

  private prop(name: string) {
    return `${name}_${this.chapter.id}`;
  }

  // ----------------------------------------------------------------- build

  private addWall(def: WallDef) {
    const h = def.blocks * BLOCK_H;
    const dir = def.hang ? 1 : -1;
    const body = this.scene.add.rectangle(def.x, def.y + (dir * h) / 2, BLOCK_W, h).setVisible(false);
    this.wallGroup.add(body);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const dressing: Phaser.GameObjects.Graphics[] = [];
    const glint = def.breakable ? this.scene.add.graphics().setDepth(13.6).setAlpha(0.15) : undefined;
    for (let i = 0; i < def.blocks; i++) {
      const y = def.y + dir * BLOCK_H * (i + 0.5);
      // Breakable walls use the approved stage sprites (baked cracks); all
      // other walls keep their chapter block texture.
      const tex = def.breakable ? WALLBLOCK_STAGE[0] : this.prop("block");
      const img = this.scene.add.image(def.x, y, tex).setDisplaySize(BLOCK_W + 6, BLOCK_H + 8).setDepth(13 + i * 0.01);
      if (i % 2) img.setFlipX(true);
      // v63: ch4 has NO snow-designed wallblock set — WALLBLOCK_STAGE is one
      // shared texture for all chapters — so breakable walls get the same
      // cool ice-blue tint as ch4 crumbles (0xdfe9ff) to read as ice with
      // the existing art. A true snow-designed set still needs Angelo's art.
      if (def.breakable && this.chapter.id === 4) img.setTint(0xdfe9ff);
      // v79: a stack of identical blocks reads as one design pasted 3x.
      // Non-breakable blocks each get their own look — tint, size, offset
      // and a code-drawn crack — seeded from the wall position + block
      // index so the look is stable across restarts. VISUAL ONLY: the
      // physics body is the same BLOCK_W x BLOCK_H stack.
      if (!def.breakable) {
        const seed = def.x * 31 + i * 17;
        const rnd = (n: number) => {
          const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
          return s - Math.floor(s);
        };
        const tints = [0xe8f2ff, 0xcfe4ff, 0xf4fbff, 0xd6e9ff];
        // Consecutive palette entries per block: every block in a stack
        // gets a DIFFERENT tint (no two share one).
        const tintBase = Math.floor(rnd(1) * tints.length);
        img.setTint(tints[(tintBase + i) % tints.length]);
        img.setDisplaySize(BLOCK_W + 6 + (rnd(2) - 0.5) * 8, BLOCK_H + 8 + (rnd(3) - 0.5) * 6);
        const dx = (rnd(4) - 0.5) * 10;
        img.setX(def.x + dx);
        img.setFlipX(rnd(5) < 0.5);
        const crack = this.scene.add.graphics().setDepth(13.05 + i * 0.01);
        const cx = def.x + dx;
        crack.lineStyle(2, 0x9fc4e8, 0.85);
        crack.beginPath();
        const shape = Math.floor(rnd(6) * 3);
        if (shape === 0) crack.moveTo(cx - 18, y - 22).lineTo(cx - 2, y - 4).lineTo(cx - 14, y + 12).lineTo(cx + 4, y + 24);
        else if (shape === 1) crack.moveTo(cx + 16, y - 24).lineTo(cx + 2, y - 2).lineTo(cx + 12, y + 10).lineTo(cx - 4, y + 22);
        else crack.moveTo(cx - 20, y + 2).lineTo(cx - 4, y - 8).lineTo(cx + 8, y + 4).lineTo(cx + 20, y - 6);
        crack.strokePath();
        crack.lineStyle(2, 0xffffff, 0.5);
        crack.beginPath();
        const hx = rnd(7) < 0.5 ? cx - 24 : cx + 10;
        crack.moveTo(hx, y - 18).lineTo(hx + 12, y - 2).strokePath();
        dressing.push(crack);
      }
      parts.push(img);
      if (def.breakable) {
        const cx = def.x + (i % 2 ? 8 : -6);
        // Gold glint lines over the block, pulsing until the first hit.
        glint!.lineStyle(2, 0xffd94d, 0.9);
        glint!.beginPath().moveTo(cx - 4, y - BLOCK_H / 2 + 6).lineTo(cx + 8, y - 8).lineTo(cx - 6, y + 6).lineTo(cx + 4, y + BLOCK_H / 2 - 6).strokePath();
      }
    }
    const wall: Wall = { def, body, parts, broken: false, hits: 0, glint, dressing };
    if (glint) {
      wall.glintTween = this.scene.tweens.add({ targets: glint, alpha: { from: 0.15, to: 0.5 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
    this.walls.push(wall);
    if (def.hang) {
      // Gates (swim levels) explain themselves.
    } else if (def.breakable) {
      this.hints.push({
        x: def.x - 260,
        shown: false,
        when: () => !wall.broken,
        text: () => (this.scene.player.weapons.includes("hammer") ? "A cracked wall! Smash it with the HAMMER" : "A cracked wall... something heavy could break it"),
      });
    } else if (def.blocks === 2) {
      // Low wall under a gate.
    } else if (def.blocks === 3) {
      this.hints.push({ x: def.x - 520, text: "Too tall to jump! Push the crate against the wall and climb", shown: false, id: "crate-push" });
    } else if (def.blocks === 4) {
      this.hints.push({ x: def.x - 360, text: "Bounce on the spring to clear the wall!", shown: false });
    } else {
      this.hints.push({ x: def.x - 380, text: "Ride the lift to the top!", shown: false });
    }
  }

  /** Invisible arena barrier (boss fight). */
  addBarrier(x: number) {
    const body = this.scene.add.rectangle(x, GROUND_Y - 600, 40, 1400).setVisible(false);
    this.wallGroup.add(body);
    this.wallGroup.refresh();
  }

  private addCrate(home: Spot) {
    const x = home.x;
    const rect = this.scene.add.rectangle(x, home.y - CRATE_SIZE / 2 - 2, CRATE_SIZE - 4, CRATE_SIZE).setVisible(false);
    this.scene.physics.add.existing(rect);
    this.crateGroup.add(rect);
    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.pushable = false;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(400, 1100);
    const img = this.scene.add.image(x, rect.y, this.prop("crate")).setDisplaySize(CRATE_SIZE + 6, CRATE_SIZE + 6).setDepth(14);
    // v79: the pushable crate is the level's MOVING BOX — it must read as
    // one, not as another ice block. Warm amber/gold (vs the cold ice blue),
    // a pulsing gold glow outline, and animated chevrons that point along
    // the ground. Code-drawn overlays only; the crate texture, collision
    // and push feel are untouched.
    img.setTint(0xffd98a);
    const boxGlow = this.scene.add.graphics().setDepth(14.1);
    const boxArrows = this.scene.add.graphics().setDepth(14.2);
    const boxPhase = Phaser.Math.Between(0, 628) / 100;
    this.crates.push({ rect, body, img, home, lastSfx: 0, lastDust: 0, boxGlow, boxArrows, boxPhase, lastPush: 1 });
  }

  /** v79: redraw one crate's moving-box dressing (gold glow + travel chevrons). */
  private drawCrateBox(c: Crate, time: number) {
    const cx = c.img.x;
    const cy = c.img.y;
    const s = CRATE_SIZE + 6;
    const half = s / 2;
    const pulse = 0.55 + 0.25 * Math.sin(time / 300 + c.boxPhase);
    c.boxGlow.clear();
    c.boxGlow.lineStyle(3, 0xffc94d, pulse);
    c.boxGlow.strokeRoundedRect(cx - half - 3, cy - half - 3, s + 6, s + 6, 8);
    c.boxGlow.lineStyle(1, 0xfff3c4, pulse * 0.8);
    c.boxGlow.strokeRoundedRect(cx - half - 6, cy - half - 6, s + 12, s + 12, 10);
    // Chevrons march in the last push direction: they light up in sequence
    // and drift a few px, so the box reads as something that travels.
    const dir = c.lastPush;
    const slide = Math.sin(time / 500 + c.boxPhase) * 4 * dir;
    c.boxArrows.clear();
    for (let k = 0; k < 2; k++) {
      const a = 0.45 + 0.45 * Math.sin(time / 240 + c.boxPhase + k * Math.PI);
      const ox = cx + slide + dir * (k * 16 - 8);
      c.boxArrows.lineStyle(4, 0xffe9a8, Math.max(0.15, a));
      c.boxArrows.beginPath();
      c.boxArrows.moveTo(ox - dir * 7, cy - 10);
      c.boxArrows.lineTo(ox + dir * 5, cy);
      c.boxArrows.lineTo(ox - dir * 7, cy + 10);
      c.boxArrows.strokePath();
    }
  }

  private addSpring({ x, y }: Spot) {
    const springKey = "spring";
    const sprite = this.scene.add.sprite(x, y + 4, springKey).setDepth(15);
    sprite.setScale(scaleForHeight(springKey, 60));
    applyOrigin(sprite, springKey);
    this.springs.push({ x, y, sprite, base: sprite.scaleY, last: 0 });
  }

  private addMine(def: MineDef) {
    const img = this.scene.add.image(def.x, def.y, "urchin").setDepth(42).setScale(0.8);
    const zone = this.scene.add.rectangle(def.x, def.y, 46, 46).setVisible(false);
    this.scene.addHazard(zone);
    this.mines.push({ def, img, zone });
    if (this.mines.length === 1) this.hints.push({ x: def.x - 520, y: def.y, text: "Spiky urchins! Don't touch them", shown: false });
  }

  private platformImage(x: number, top: number, art: "plat_l" | "plat_m" | "plat_s") {
    const key = this.prop(art);
    const meta = PROPS[key as keyof typeof PROPS];
    const img = this.scene.add.image(x, top - meta.height * meta.surface, key).setOrigin(0.5, 0).setDisplaySize(meta.width, meta.height).setDepth(12);
    if (this.chapter.id === 6) {
      const back = backPlatform(this.scene, x, top, meta.width);
      // Keep the backing glued to moving/crumbling platforms.
      this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, () => back.setPosition(img.x, img.y + meta.height * meta.surface + 16).setAlpha(img.alpha * 0.55));
    }
    return { img, width: meta.width * 0.88, surface: meta.height * meta.surface };
  }

  private oneWayBody(x: number, top: number, w: number, group: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup) {
    const rect = this.scene.add.rectangle(x, top + 14, w, 28).setVisible(false);
    group.add(rect);
    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    return { rect, body };
  }

  private addMover(def: MoverDef) {
    const { img, width, surface } = this.platformImage(def.x0, def.y0, "plat_m");
    const { rect, body } = this.oneWayBody(def.x0, def.y0, width, this.moverGroup);
    body.setAllowGravity(false);
    body.setImmovable(true);
    img.setTint(0xfff1c8);
    this.movers.push({ def, rect, body, img, surface });
  }

  private addCrumble(x: number, y: number) {
    const { img } = this.platformImage(x, y, "plat_s");
    const { rect, body } = this.oneWayBody(x, y, 88, this.moverGroup);
    body.setAllowGravity(false);
    body.setImmovable(true);
    // v61: ch4's new ice platforms are already saturated blue; the old warm
    // beige tint turns them green. Cool tint for ch4, beige elsewhere.
    img.setTint(this.chapter.id === 4 ? 0xdfe9ff : 0xd9c3a5);
    this.crumbles.push({ x, y, rect, body, img, state: "solid", until: 0 });
    if (this.crumbles.length === 1 || Math.abs(this.crumbles[this.crumbles.length - 2].x - x) > 800) {
      this.hints.push({ x: x - 420, y, text: "Crumbling ledges! Don't stand still", shown: false });
    }
  }

  private addTarget(def: TargetDef) {
    const img = this.scene.add.image(def.x, def.y, "target").setDepth(20).setScale(0.45); // v63: 192px texture, same ~86px display
    this.scene.tweens.add({ targets: img, y: def.y - 10, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.scene.tweens.add({ targets: img, angle: 8, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    const bridge = def.bridge.map((p) => {
      const { img: pimg } = this.platformImage(p.x, p.y, PLATFORM_ART[p.prop]);
      pimg.setAlpha(0).setY(pimg.y + 220);
      const { rect, body } = this.oneWayBody(p.x, p.y, 128, this.bridgeGroup);
      body.enable = false;
      return { rect, img: pimg, y: pimg.y - 220 };
    });
    this.targets.push({ def, img, hit: false, bridge });
    const t = this.targets[this.targets.length - 1];
    this.hints.push({
      x: def.x - 520,
      shown: false,
      when: () => !t.hit,
      text: () => (this.scene.player.weapons.includes("bow") ? "Shoot the star with your BOW to raise a bridge!" : "A star target... you need something that shoots"),
    });
  }

  colliders(player: Player, enemyGroup: Phaser.Physics.Arcade.Group, ground: Phaser.Physics.Arcade.StaticGroup) {
    const p = this.scene.physics;
    p.add.collider(player.rect, this.wallGroup);
    p.add.collider(player.rect, this.crateGroup);
    p.add.collider(player.rect, this.moverGroup);
    p.add.collider(player.rect, this.bridgeGroup);
    p.add.collider(this.crateGroup, ground);
    p.add.collider(this.crateGroup, this.wallGroup);
    p.add.collider(this.crateGroup, this.crateGroup);
    p.add.collider(enemyGroup, this.wallGroup);
    p.add.collider(enemyGroup, this.crateGroup);
    p.add.collider(enemyGroup, this.bridgeGroup);
  }

  // ---------------------------------------------------------------- update

  /** Leaning into a crate on the same floor pushes it. Returns true while pushing. */
  pushCheck(player: Player, axis: number): boolean {
    const pb = player.body;
    let pushing = false;
    for (const c of this.crates) {
      const cb = c.body;
      const grounded = cb.blocked.down || cb.touching.down;
      let push = 0;
      if (axis !== 0 && player.grounded && grounded && Math.abs(pb.bottom - cb.bottom) < 12) {
        if (axis > 0 && cb.left - pb.right < 14 && cb.left - pb.right > -12) push = 1;
        if (axis < 0 && pb.left - cb.right < 14 && pb.left - cb.right > -12) push = -1;
      }
      if (push) {
        pushing = true;
        // v81: the moment she starts pushing the crate, the yellow hint box
        // goes away (Angelo 2026-11-12) — she already knows what to do.
        if (this.crateHintVisible) {
          this.crateHintVisible = false;
          this.scene.game.events.emit("hud:toast-hide");
        }
        // v79: chevrons point the way the crate was last pushed.
        c.lastPush = push > 0 ? 1 : -1;
        cb.setVelocityX(push * PUSH_SPEED * Math.abs(axis));
        const now = this.scene.time.now;
        const moving = Math.abs(cb.velocity.x) > 20;
        // SFX cadence unchanged: crate_push every 260ms while moving.
        if (moving && now - c.lastSfx > 260) {
          c.lastSfx = now;
          Audio.sfx("crate_push");
        }
        // v63: heavier push feel — bigger dust at BOTH bottom corners of
        // the crate plus at the player's feet, every ~200ms (own timer,
        // so dust is denser than the 260ms sfx).
        if (moving && now - c.lastDust > 200) {
          c.lastDust = now;
          this.scene.fx("fx_dust", "puff", cb.left + 4, cb.bottom, 0.3);
          this.scene.fx("fx_dust", "puff", cb.right - 4, cb.bottom, 0.3);
          this.scene.fx("fx_dust", "puff", pb.center.x, pb.bottom, 0.25);
        }
      } else {
        const grip = this.chapter.grip;
        cb.velocity.x *= grounded ? Math.pow(grip < 1 ? 0.96 : 0.0001, this.scene.game.loop.delta / 16.7) : 1;
        if (Math.abs(cb.velocity.x) < 4) cb.setVelocityX(0);
      }
    }
    return pushing;
  }

  /**
   * Movers are steered inside every fixed physics step (not once per frame) so their
   * velocity always lands exactly on the path; riders are carried by Arcade's friction.
   */
  private stepMovers(stepDelta: number) {
    // WORLD_STEP delivers delta in SECONDS, and MoverDef.period is authored
    // in SECONDS too (3.4, 4.2, 4.6, 5 in level.ts) — so the clock stays in
    // seconds. (Corrected 2026-10-22 evening: an earlier change multiplied
    // the clock by 1000 under the wrong belief that periods were in ms;
    // that made the phase race ~1000x, platforms teleported with velocities
    // in the thousands of px/s, and riders could not stand — Angelo caught
    // it on device in 3-1. The "creeping" seen before was the QA harness's
    // physics-step starvation at ~1 FPS, not a unit bug.)
    this.moverClock += stepDelta;
    const dt = stepDelta;
    const pb = this.scene.player?.body;
    for (const m of this.movers) {
      const mb = m.body;
      if (pb && pb.velocity.y >= 0 && Math.abs(pb.bottom - mb.top) < 4 && pb.right > mb.left && pb.left < mb.right) {
        pb.x += mb.deltaX();
      }
      const k = (1 - Math.cos(((this.moverClock + dt) / m.def.period) * Math.PI * 2)) / 2;
      const tx = Phaser.Math.Linear(m.def.x0, m.def.x1, k);
      const ty = Phaser.Math.Linear(m.def.y0, m.def.y1, k) + 14;
      m.body.setVelocity((tx - m.body.center.x) / dt, (ty - m.body.center.y) / dt);
    }
  }

  update(time: number, _delta: number) {
    const player = this.scene.player;

    // v63: landing on top of a crate — squash + dust burst + soft knock.
    // Player.update runs before this (GameScene.update), so grounded state
    // and fall speed are fresh. Landing = grounded transition after falling
    // faster than 200px/s, with the player's feet within 6px of a crate top
    // and horizontal overlap. Fires once per landing, never while standing.
    const grounded = player.grounded;
    if (!grounded) this.prevFallVy = player.body.velocity.y;
    if (grounded && !this.prevGrounded && this.prevFallVy > 200) {
      for (const c of this.crates) {
        const cb = c.body;
        const onTop =
          Math.abs(player.body.bottom - cb.top) < 6 && player.body.right > cb.left + 4 && player.body.left < cb.right - 4;
        if (!onTop) continue;
        const baseSX = c.img.scaleX;
        const baseSY = c.img.scaleY;
        this.scene.tweens.killTweensOf(c.img);
        c.img.setScale(baseSX, baseSY * 0.92);
        this.scene.tweens.add({ targets: c.img, scaleY: baseSY, duration: 150, ease: "Quad.out" });
        this.scene.fx("fx_dust", "puff", cb.center.x, cb.top, 0.35);
        this.scene.fx("fx_dust", "puff", cb.left + 6, cb.top, 0.25);
        this.scene.fx("fx_dust", "puff", cb.right - 6, cb.top, 0.25);
        // Soft impact knock, existing sfx (AudioManager "tok") — no new audio.
        Audio.sfx("tok");
      }
    }
    this.prevGrounded = grounded;

    for (const c of this.crates) {
      c.img.setPosition(c.rect.x, c.rect.y);
      // v79: keep the moving-box dressing glued to the crate.
      this.drawCrateBox(c, time);
      if (c.body.top > GAME_H + 60) {
        c.body.reset(c.home.x, c.home.y - CRATE_SIZE / 2 - 40);
        this.scene.fx("fx_dust", "puff", c.home.x, c.home.y, 0.4);
      }
    }

    for (const m of this.movers) m.img.setPosition(m.rect.x, m.rect.y - 14 - m.surface);

    for (const c of this.crumbles) {
      if (c.state === "solid") {
        const on = player.grounded && Math.abs(player.body.bottom - c.y) < 6 && Math.abs(player.x - c.x) < 60;
        if (on) {
          c.state = "shaking";
          c.until = time + 520;
          Audio.sfx("crumble");
        }
      } else if (c.state === "shaking") {
        c.img.x = c.x + Math.sin(time / 18) * 3;
        if (time > c.until) {
          c.state = "gone";
          c.until = time + 2600;
          c.body.enable = false;
          this.scene.fx("fx_dust", "puff", c.x, c.y + 10, 0.35);
          this.scene.tweens.add({ targets: c.img, y: c.img.y + 260, alpha: 0, angle: Phaser.Math.Between(-25, 25), duration: 520, ease: "Quad.in" });
        }
      } else if (time > c.until) {
        const near = Math.abs(player.x - c.x) < 70 && player.body.bottom > c.y - 10 && player.body.top < c.y + 30;
        if (!near) {
          c.state = "solid";
          c.body.enable = true;
          c.img.setPosition(c.x, c.img.y - 260).setAngle(0);
          this.scene.tweens.add({ targets: c.img, alpha: 1, duration: 300 });
        }
      }
    }

    for (const m of this.mines) {
      const k = Math.sin(((time / 1000) / m.def.period + m.def.phase) * Math.PI * 2);
      const x = m.def.x + m.def.dx * k;
      const y = m.def.y + m.def.dy * k;
      m.img.setPosition(x, y).setRotation(time / 700);
      m.zone.setPosition(x, y);
      (m.zone.body as Phaser.Physics.Arcade.Body).reset(x, y);
    }

    for (const s of this.springs) {
      const pb = player.body;
      if (time - s.last > 250 && pb.velocity.y >= -20 && Math.abs(player.x - s.x) < 36 && pb.bottom > s.y - 50 && pb.bottom <= s.y + 2) {
        s.last = time;
        player.springBounce();
        Audio.sfx("spring");
        this.scene.tweens.killTweensOf(s.sprite);
        s.sprite.setScale(s.sprite.scaleX, s.base * 0.55);
        this.scene.tweens.add({ targets: s.sprite, scaleY: s.base, duration: 380, ease: "Elastic.out" });
        this.scene.fx("fx_dust", "puff", s.x, s.y, 0.3);
      }
    }

    for (const h of this.hints) {
      if (h.shown || (h.when && !h.when())) continue;
      if (player.x > h.x && player.x < h.x + 420 && (h.y === undefined || Math.abs(player.body.bottom - h.y) < 300)) {
        h.shown = true;
        if (h.id === "crate-push") this.crateHintVisible = true;
        this.scene.toast(typeof h.text === "function" ? h.text() : h.text);
      }
    }

    // Voice reaction: the first time Angely gets close to a cracked wall she
    // calls out for the hammer (once per wall, never after it is smashed).
    for (const w of this.walls) {
      if (!w.def.breakable || w.broken || w.barked) continue;
      if (Math.abs(player.x - w.def.x) < 430 && Math.abs(player.body.bottom - w.def.y) < 320) {
        w.barked = true;
        this.scene.barkBreakableWall();
      }
    }
  }

  /** Walkable tops for drop shadows. */
  surfaces(): Surface[] {
    const out: Surface[] = [];
    for (const w of this.walls) if (!w.broken && !w.def.hang) out.push({ x0: w.def.x - BLOCK_W / 2, x1: w.def.x + BLOCK_W / 2, y: w.def.y - w.def.blocks * BLOCK_H });
    for (const c of this.crates) out.push({ x0: c.body.left, x1: c.body.right, y: c.body.top });
    for (const m of this.movers) out.push({ x0: m.body.left, x1: m.body.right, y: m.body.top });
    for (const c of this.crumbles) if (c.state !== "gone") out.push({ x0: c.x - 44, x1: c.x + 44, y: c.y });
    for (const t of this.targets) if (t.hit) for (const b of t.bridge) out.push({ x0: b.rect.x - 64, x1: b.rect.x + 64, y: b.rect.y - 14 });
    return out;
  }

  /** True when x is inside a standing wall (no ground spawns there). */
  blocked(x: number, margin = 60) {
    return this.walls.some((w) => !w.broken && !w.def.hang && Math.abs(w.def.x - x) < BLOCK_W / 2 + margin);
  }

  // ---------------------------------------------------------------- weapons

  /** Hammer impact: cracked walls take hits; they break at def.hits ?? 3. */
  hammerAt(r: Phaser.Geom.Rectangle) {
    let hit = false;
    for (const w of this.walls) {
      if (w.broken || !w.def.breakable) continue;
      const wr = new Phaser.Geom.Rectangle(w.def.x - BLOCK_W / 2 - 20, w.def.y - w.def.blocks * BLOCK_H, BLOCK_W + 40, w.def.blocks * BLOCK_H);
      if (Phaser.Geom.Rectangle.Overlaps(r, wr)) {
        hit = true;
        w.hits++;
        const maxHits = w.def.hits ?? 3;
        if (w.hits >= maxHits) this.breakWall(w);
        else this.wallHit(w, r, wr, maxHits);
      }
    }
    return hit;
  }

  /** Non-breaking hammer hit: tok, shake, chips, heavier cracks, bounce. */
  private wallHit(w: Wall, r: Phaser.Geom.Rectangle, wr: Phaser.Geom.Rectangle, maxHits: number) {
    const ix = Phaser.Math.Clamp((r.left + r.right) / 2, wr.left, wr.right);
    const iy = Phaser.Math.Clamp((r.top + r.bottom) / 2, wr.top, wr.bottom);
    Audio.sfx("tok");
    const almost = w.hits === maxHits - 1;
    if (almost) Audio.sfx("crunch");
    this.scene.cameras.main.shake(almost ? 200 : 120, almost ? 0.01 : 0.006);
    this.scene.fx("fx_dust", "puff", ix, iy, 0.3);
    for (let i = 0; i < 3; i++) this.scene.fx("fx_spark", "hit", ix + Phaser.Math.Between(-14, 14), iy + Phaser.Math.Between(-14, 14), 0.22, 0xffc35a);
    // Baked crack stage: hit 1 -> cracked sprite, hit 2 -> heavily cracked.
    const stage = WALLBLOCK_STAGE[Math.min(w.hits, WALLBLOCK_STAGE.length - 1)];
    for (const p of w.parts) (p as Phaser.GameObjects.Image).setTexture(stage);
    // Impact compress: the whole block visibly shudders (scale pulse, yoyo
    // back to its real scale). No new art needed.
    for (const p of w.parts) {
      const o = p as Phaser.GameObjects.Image;
      this.scene.tweens.add({ targets: o, scaleX: o.scaleX * 1.04, scaleY: o.scaleY * 0.96, duration: 80, yoyo: true });
    }
    // First hit kills the gold glint; the secret is out.
    if (w.hits === 1 && w.glint) {
      w.glintTween?.stop();
      w.glint.destroy();
      w.glint = undefined;
    }
    // Hammer bounces off the wall, away from it.
    this.scene.player.applyRecoil(this.scene.player.facing);
  }

  /** Sword against a cracked wall just clinks. */
  swordAt(r: Phaser.Geom.Rectangle) {
    for (const w of this.walls) {
      if (w.broken || !w.def.breakable) continue;
      const wr = new Phaser.Geom.Rectangle(w.def.x - BLOCK_W / 2, w.def.y - w.def.blocks * BLOCK_H, BLOCK_W, w.def.blocks * BLOCK_H);
      if (Phaser.Geom.Rectangle.Overlaps(r, wr)) {
        Audio.sfx("sword_clink");
        if (!this.swordWarned) {
          this.swordWarned = true;
          this.scene.toast(this.scene.player.weapons.includes("hammer") ? "Too hard for the sword. Switch to the HAMMER!" : "Too hard for the sword!");
        }
        return true;
      }
    }
    return false;
  }

  private breakWall(w: Wall) {
    w.broken = true;
    w.body.destroy();
    this.wallGroup.refresh();
    // The glint does not fly off with the blocks.
    w.glintTween?.stop();
    w.glint?.destroy();
    Audio.sfx("wall_break");
    this.scene.cameras.main.shake(260, 0.012);
    this.scene.fx("fx_dust", "puff", w.def.x - 40, w.def.y, 0.4);
    this.scene.fx("fx_dust", "puff", w.def.x + 40, w.def.y, 0.4);
    const dir = this.scene.player.x < w.def.x ? 1 : -1;
    // v63: debris gets a beat on the ground first. The fly/land tween runs
    // on its own (~450ms); the alpha fade is a separate tween that starts
    // after a 350ms delay and takes 650ms, so pieces stay visible ~1.0s
    // before destroy (was: fading from the first frame over 700+i*40ms).
    w.parts.forEach((p, i) => {
      const o = p as Phaser.GameObjects.Image;
      this.scene.tweens.add({
        targets: o,
        x: o.x + dir * Phaser.Math.Between(80, 260),
        y: w.def.y + 40 + Phaser.Math.Between(0, 60),
        angle: dir * Phaser.Math.Between(90, 300),
        duration: 450 + i * 40,
        ease: "Quad.in",
      });
      this.scene.tweens.add({
        targets: o,
        alpha: 0,
        delay: 350,
        duration: 650,
        onComplete: () => o.destroy(),
      });
    });
    // Rubble chunks (approved sprites) burst out alongside the flying blocks.
    const dir2 = dir;
    for (let i = 0; i < w.def.blocks; i++) {
      for (let k = 0; k < 2; k++) {
        const key = `wallblock_chunk${Phaser.Math.Between(0, WALLBLOCK_CHUNKS - 1)}`;
        if (!this.scene.textures.exists(key)) continue;
        const by = w.def.y - i * BLOCK_H;
        const c = this.scene.add.image(w.def.x + Phaser.Math.Between(-20, 20), by, key).setDepth(13.2);
        // v63: ch4 rubble reads as ice too (same 0xdfe9ff tint as the wall parts).
        if (this.chapter.id === 4) c.setTint(0xdfe9ff);
        const srcImg = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
        c.setScale(54 / Math.max(srcImg.width, srcImg.height));
        // v63: same beat-on-the-ground treatment as the wall parts — fly
        // first, fade after a 350ms delay over 650ms (~1.0s visible).
        this.scene.tweens.add({
          targets: c,
          x: c.x + dir2 * Phaser.Math.Between(40, 200),
          y: by + 50 + Phaser.Math.Between(0, 70),
          angle: dir2 * Phaser.Math.Between(90, 300),
          duration: 450 + i * 40 + k * 60,
          ease: "Quad.in",
        });
        this.scene.tweens.add({
          targets: c,
          alpha: 0,
          delay: 350,
          duration: 650,
          onComplete: () => c.destroy(),
        });
      }
    }
    for (let i = 0; i < w.def.blocks; i++) this.scene.fx("fx_dust", "puff", w.def.x + Phaser.Math.Between(-30, 30), w.def.y - i * BLOCK_H, 0.45);
    // Payoff: the gem behind the wall flies to the player.
    this.scene.flyGemToPlayer(w.def.x, w.def.y - (w.def.blocks * BLOCK_H) / 2);
  }

  /** Arrow vs star targets. Returns true if one was hit. */
  arrowAt(r: Phaser.Geom.Rectangle) {
    for (const t of this.targets) {
      if (t.hit) continue;
      const tr = new Phaser.Geom.Rectangle(t.img.x - 38, t.img.y - 38, 76, 76);
      if (!Phaser.Geom.Rectangle.Overlaps(r, tr)) continue;
      t.hit = true;
      Audio.sfx("target_hit");
      this.scene.fx("fx_spark", "hit", t.img.x, t.img.y, 0.5, 0xffe27a);
      this.scene.tweens.killTweensOf(t.img);
      this.scene.tweens.add({ targets: t.img, scale: 1.5, alpha: 0, angle: 360, duration: 600, onComplete: () => t.img.destroy() });
      this.scene.time.delayedCall(350, () => {
        Audio.sfx("bridge_rise");
        this.scene.cameras.main.shake(300, 0.003);
        t.bridge.forEach((b, i) => {
          this.scene.tweens.add({ targets: b.img, y: b.y, alpha: 1, duration: 520, delay: i * 110, ease: "Back.out" });
          this.scene.time.delayedCall(i * 110 + 300, () => {
            (b.rect.body as Phaser.Physics.Arcade.StaticBody).enable = true;
          });
        });
        this.scene.toast("A bridge rises!");
      });
      return true;
    }
    return false;
  }

  /** Unhit targets in front of the archer, for gentle auto-aim. */
  aimPoints(): { x: number; y: number }[] {
    return this.targets.filter((t) => !t.hit).map((t) => ({ x: t.img.x, y: t.img.y }));
  }
}

function ensureUrchinTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("urchin")) return;
  const g = scene.make.graphics({}, false);
  const c = 40;
  const spikes: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 28; i++) {
    const r = i % 2 ? 22 : 38;
    const a = (i * Math.PI) / 14;
    spikes.push(new Phaser.Math.Vector2(c + Math.cos(a) * r, c + Math.sin(a) * r));
  }
  g.fillStyle(0x2a1640, 1).fillPoints(spikes, true);
  g.fillStyle(0x8a3fd1, 1).fillCircle(c, c, 21);
  g.fillStyle(0xc77dff, 1).fillCircle(c - 5, c - 6, 11);
  g.fillStyle(0xffffff, 1).fillCircle(c - 7, c - 3, 4).fillCircle(c + 7, c - 3, 4);
  g.fillStyle(0x2a1640, 1).fillCircle(c - 6, c - 2, 2).fillCircle(c + 8, c - 2, 2);
  g.generateTexture("urchin", 80, 80);
  g.destroy();
}

function ensureTargetTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("target")) return;
  // v63: redrawn at 192x192 (was 96) with real volume — the old flat
  // concentric circles read as a flat sticker on the phone. Linear-gradient
  // disc (light top-left -> dark bottom-right), a bevelled star (dark offset
  // copy behind the bright star), and a gloss dot. Display scale in
  // addTarget is 0.45 so it still renders ~86px, just sharper + deeper.
  const S = 192;
  const c = S / 2;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x2a1640, 1).fillCircle(c, c, 94);
  g.fillGradientStyle(0xffe9a8, 0xffd36b, 0xffb347, 0xcc7a1a, 1).fillCircle(c, c, 88);
  g.fillStyle(0xff6f91, 1).fillCircle(c, c, 64);
  g.fillStyle(0xfff4d6, 1).fillCircle(c, c, 44);
  // Bevelled star: dark-gold offset copy, then the bright star on top.
  const star = (dx: number, dy: number, color: number) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 14 : 34;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(new Phaser.Math.Vector2(c + dx + Math.cos(a) * r, c + dy + Math.sin(a) * r));
    }
    g.fillStyle(color, 1).fillPoints(pts, true);
  };
  star(5, 7, 0xb97a00);
  star(0, 0, 0xffb000);
  // Gloss dot, upper-left, for the rounded-volume read.
  g.fillStyle(0xffffff, 0.35).fillCircle(c - 52, c - 56, 12);
  g.lineStyle(4, 0x2a1640, 1).strokeCircle(c, c, 88);
  g.generateTexture("target", S, S);
  g.destroy();
}
