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
}

interface Crate {
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  img: Phaser.GameObjects.Image;
  home: Spot;
  lastSfx: number;
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
  private swordWarned = false;
  private moverClock = 0;

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
    const key = `${name}_${this.chapter.id}`;
    // Fall back to chapter 9 assets for chapters 10+ (not yet created)
    if ((PROPS as any)[key]) return key;
    return `${name}_9`;
  }

  // ----------------------------------------------------------------- build

  private addWall(def: WallDef) {
    const h = def.blocks * BLOCK_H;
    const dir = def.hang ? 1 : -1;
    const body = this.scene.add.rectangle(def.x, def.y + (dir * h) / 2, BLOCK_W, h).setVisible(false);
    this.wallGroup.add(body);
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < def.blocks; i++) {
      const y = def.y + dir * BLOCK_H * (i + 0.5);
      const img = this.scene.add.image(def.x, y, this.prop("block")).setDisplaySize(BLOCK_W + 6, BLOCK_H + 8).setDepth(13 + i * 0.01);
      if (i % 2) img.setFlipX(true);
      parts.push(img);
      if (def.breakable) {
        img.setTint(0xe8d6c0);
        const g = this.scene.add.graphics().setDepth(13.5);
        g.lineStyle(3, 0x2a1a12, 0.85);
        const cx = def.x + (i % 2 ? 8 : -6);
        g.beginPath().moveTo(cx - 4, y - BLOCK_H / 2 + 6).lineTo(cx + 8, y - 8).lineTo(cx - 6, y + 6).lineTo(cx + 4, y + BLOCK_H / 2 - 6).strokePath();
        g.beginPath().moveTo(cx + 8, y - 8).lineTo(cx + 26, y - 2).strokePath();
        g.beginPath().moveTo(cx - 6, y + 6).lineTo(cx - 24, y + 14).strokePath();
        parts.push(g);
      }
    }
    const wall: Wall = { def, body, parts, broken: false };
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
      this.hints.push({ x: def.x - 520, text: "Too tall to jump! Push the crate against the wall and climb", shown: false });
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
    this.crates.push({ rect, body, img, home, lastSfx: 0 });
  }

  private addSpring({ x, y }: Spot) {
    const sprite = this.scene.add.sprite(x, y + 4, "spring").setDepth(15);
    sprite.setScale(scaleForHeight("spring", 60));
    applyOrigin(sprite, "spring");
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
    img.setTint(0xd9c3a5);
    this.crumbles.push({ x, y, rect, body, img, state: "solid", until: 0 });
    if (this.crumbles.length === 1 || Math.abs(this.crumbles[this.crumbles.length - 2].x - x) > 800) {
      this.hints.push({ x: x - 420, y, text: "Crumbling ledges! Don't stand still", shown: false });
    }
  }

  private addTarget(def: TargetDef) {
    const img = this.scene.add.image(def.x, def.y, "target").setDepth(20).setScale(0.9);
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
        cb.setVelocityX(push * PUSH_SPEED * Math.abs(axis));
        const now = this.scene.time.now;
        if (Math.abs(cb.velocity.x) > 20 && now - c.lastSfx > 260) {
          c.lastSfx = now;
          Audio.sfx("crate_push");
          this.scene.fx("fx_dust", "puff", cb.center.x - push * CRATE_SIZE * 0.45, cb.bottom, 0.16);
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

    for (const c of this.crates) {
      c.img.setPosition(c.rect.x, c.rect.y);
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
        this.scene.toast(typeof h.text === "function" ? h.text() : h.text);
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

  /** Hammer impact: smash cracked walls touching the swing. */
  hammerAt(r: Phaser.Geom.Rectangle) {
    let broke = false;
    for (const w of this.walls) {
      if (w.broken || !w.def.breakable) continue;
      const wr = new Phaser.Geom.Rectangle(w.def.x - BLOCK_W / 2 - 20, w.def.y - w.def.blocks * BLOCK_H, BLOCK_W + 40, w.def.blocks * BLOCK_H);
      if (Phaser.Geom.Rectangle.Overlaps(r, wr)) {
        this.breakWall(w);
        broke = true;
      }
    }
    return broke;
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
    Audio.sfx("wall_break");
    this.scene.cameras.main.shake(260, 0.012);
    const dir = this.scene.player.x < w.def.x ? 1 : -1;
    w.parts.forEach((p, i) => {
      const o = p as Phaser.GameObjects.Image;
      this.scene.tweens.add({
        targets: o,
        x: o.x + dir * Phaser.Math.Between(80, 260),
        y: w.def.y + 40 + Phaser.Math.Between(0, 60),
        angle: dir * Phaser.Math.Between(90, 300),
        alpha: 0,
        duration: 700 + i * 40,
        ease: "Quad.in",
        onComplete: () => o.destroy(),
      });
    });
    for (let i = 0; i < w.def.blocks; i++) this.scene.fx("fx_dust", "puff", w.def.x + Phaser.Math.Between(-30, 30), w.def.y - i * BLOCK_H, 0.45);
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
  const g = scene.make.graphics({}, false);
  const c = 48;
  g.fillStyle(0x2a1640, 1).fillCircle(c, c, 46);
  g.fillStyle(0xffd36b, 1).fillCircle(c, c, 42);
  g.fillStyle(0xff6f91, 1).fillCircle(c, c, 32);
  g.fillStyle(0xfff4d6, 1).fillCircle(c, c, 22);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 7 : 17;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(c + Math.cos(a) * r, c + Math.sin(a) * r));
  }
  g.fillStyle(0xffb000, 1).fillPoints(pts, true);
  g.lineStyle(3, 0x2a1640, 1).strokeCircle(c, c, 42);
  g.generateTexture("target", 96, 96);
  g.destroy();
}
