import { BACKDROPS, PROPS, SPRITES, type SpriteKey } from "../../src/assets/sprites.gen";
import {
  CHAPTERS,
  GROUND_Y,
  LEVELS,
  MAX_HEARTS,
  WEAPON_NAMES,
  WEAPON_ORDER,
  type ChapterId,
  type LevelInfo,
  type WeaponId,
} from "../../src/config";
import { ENEMY_TYPES } from "../../src/entities/enemyTypes";
import { addWeapon, loadSave } from "../../src/save";
import { BLOCK_H, BLOCK_W, CRATE_SIZE, buildLevel, type LevelDef } from "../../src/world/level";
import { Actor, makeProp } from "./actor";
import { Audio } from "./audio";
import { wx, wy } from "./coords";
import type { Input } from "./input";
import { Light3D, Node3D, PlayRenderer, Node2_5D } from "./PlayRenderer";

const SPEED = 280;
const JUMP_V = 860;
const GRAVITY = 2400;
const FALL_G = 780;
const MAX_FALL = 1100;
const COYOTE = 0.14;
const INVULN = 1.05;
const PLAYER_H = 96;
const PLAYER_W = 40;

const FOG: Record<number, number> = {
  1: 0x152418, 2: 0x16122a, 3: 0x2a1208, 4: 0x0c1a28,
  5: 0x140818, 6: 0x182438, 7: 0x062028, 8: 0x2a1c0c,
  9: 0x241428, 10: 0x142414, 11: 0x181028, 12: 0x281008, 13: 0x081820,
};
const GROUND_COL: Record<number, number> = {
  1: 0x3d6a32, 2: 0x3a3558, 3: 0x6a2e18, 4: 0xcfe8ff,
  5: 0x2a2048, 6: 0x8aa6c8, 7: 0x1a5a68, 8: 0xb8883a,
  9: 0xc46aa8, 10: 0x4a7a32, 11: 0x6a58b0, 12: 0x8a3a18, 13: 0x2a7a88,
};

type Solid = { x: number; y: number; w: number; h: number; oneWay?: boolean; kind?: string; id?: string };
type Crate = Solid & { vx: number };
type Shot = { x: number; y: number; vx: number; vy: number; life: number; friendly: boolean; dmg: number; actor: Actor; home?: boolean };
type Mob = {
  actor: Actor;
  kind: string;
  hp: number;
  vx: number;
  vy: number;
  cd: number;
  wind: number;
  state: "idle" | "wind" | "atk" | "hurt" | "dead";
  hurt: number;
};

export type PlayHud = {
  hearts: (n: number, shield: number) => void;
  weapon: (name: string) => void;
  goal: (text: string) => void;
  tip: (text: string) => void;
  banner: (text: string | null) => void;
};

export type PlayResult = "playing" | "won" | "dead" | "exit";

export class PlaySession {
  result: PlayResult = "playing";
  private renderer: PlayRenderer;
  private input: Input;
  private hud: PlayHud;
  private info: LevelInfo;
  private level: LevelDef;
  private ch: ChapterId;
  private nodes: string[] = [];
  private solids: Solid[] = [];
  private crates: Crate[] = [];
  private player!: Actor;
  private px = 180;
  private py = GROUND_Y;
  private vx = 0;
  private vy = 0;
  private grounded = false;
  private coyote = 0;
  private hearts = MAX_HEARTS;
  private invuln = 0;
  private shield = 0;
  private weapons: WeaponId[] = [];
  private weapon: WeaponId | null = null;
  private atk = 0;
  private atkName: WeaponId | null = null;
  private airAtk = false;
  private kills = 0;
  private gems = 0;
  private portalOpen = false;
  private spawnT = 0;
  private mobs: Mob[] = [];
  private shots: Shot[] = [];
  private pickups: { x: number; y: number; kind: "heart" | "gem" | "star" | "weapon"; weapon?: WeaponId; actor: Actor; taken?: boolean }[] = [];
  private springs: { x: number; y: number; actor: Actor }[] = [];
  private spikes: { x: number; y: number }[] = [];
  private mines: { x: number; y: number; def: LevelDef["mines"][0]; actor: Actor }[] = [];
  private movers: { def: LevelDef["movers"][0]; solid: Solid; node: InstanceType<typeof Node3D>; t: number }[] = [];
  private crumbles: { solid: Solid; node: InstanceType<typeof Node3D>; life: number | null }[] = [];
  private targets: { x: number; y: number; actor: Actor; hit: boolean; bridges: InstanceType<typeof Node2_5D>[] }[] = [];
  private breakWalls: { solid: Solid; node: InstanceType<typeof Node3D>; hp: number }[] = [];
  private portal?: Actor;
  private checkpoint = { x: 180, y: GROUND_Y };
  private floodY = 9000;
  private t = 0;
  private boss?: { kind: "umbra" | "worm" | "veil"; hp: number; max: number; actor: Actor; phase: number; cd: number; extra?: Actor };
  private hug?: Actor;
  private cage?: Actor;
  private wonT = 0;
  private deadT = 0;
  private swim = false;
  private backdrop?: InstanceType<typeof Node2_5D>;
  private mid?: InstanceType<typeof Node2_5D>;

  constructor(renderer: PlayRenderer, input: Input, hud: PlayHud, index: number) {
    this.renderer = renderer;
    this.input = input;
    this.hud = hud;
    this.info = LEVELS[index];
    this.ch = this.info.chapter;
    this.level = buildLevel(this.info);
    this.swim = this.info.mode === "swim";
    this.weapons = [...loadSave().weapons];
    this.weapon = this.weapons[0] ?? null;
  }

  async start() {
    const urls = new Set<string>();
    const addSheet = (k: SpriteKey) => urls.add(SPRITES[k].file);
    addSheet("angely");
    addSheet("angely_sword");
    addSheet("angely_bow");
    addSheet("angely_hammer");
    addSheet("angely_boomerang");
    addSheet("angely_wand");
    addSheet("angely_ray");
    addSheet("angely_swim");
    addSheet("portal");
    addSheet("heart");
    addSheet("stargem");
    addSheet("starshield");
    addSheet("spring");
    addSheet("flag");
    addSheet("fx_orb");
    addSheet("fx_bolt");
    addSheet("fx_fireball");
    addSheet("fx_dust");
    addSheet("fx_slash");
    addSheet("fx_star");
    addSheet("fx_arrow");
    addSheet("weapon_boomerang");
    addSheet("weapon_cog");
    addSheet("crystal_shot");
    for (const k of CHAPTERS[this.ch].enemies) if (k in SPRITES) addSheet(k as SpriteKey);
    if (this.info.boss && this.ch === 5) addSheet("umbra");
    if (this.info.boss && this.ch === 8) addSheet("sandworm");
    if (this.info.boss && this.ch === 11) {
      addSheet("crystalveil");
      addSheet("crystalveil_beam");
      addSheet("angelo_cage");
      addSheet("angelo_hug");
    }
    urls.add(BACKDROPS[`bg${this.ch}` as keyof typeof BACKDROPS]);
    const gid = this.ch as number;
    for (const key of [`ground_${gid}`, `plat_l_${gid}`, `plat_m_${gid}`, `plat_s_${gid}`, `spikes_${gid}`, `crate_${gid}`, `block_${gid}`] as const) {
      if (key in PROPS) urls.add(PROPS[key as keyof typeof PROPS].file);
    }
    await Promise.all([...urls].map((u) => this.renderer.texture(u)));

    this.renderer.setClear(FOG[this.ch], this.ch === 4 || this.ch === 6 ? 0.016 : 0.022);
    this.buildWorld();
    this.player = new Actor(this.renderer, this.swim ? "angely_swim" : "angely", this.px, this.py, 112);
    this.checkpoint = { x: this.px, y: this.py };
    this.hud.tip(this.info.tip);
    this.hud.weapon(this.weapon ? WEAPON_NAMES[this.weapon] : "Stomp");
    this.hud.hearts(this.hearts, 0);
    this.refreshGoal();
    Audio.music(this.info.boss ? "music_boss" : CHAPTERS[this.ch].music);
    this.renderer.followTarget(wx(this.px), wy(this.py) + 0.4, true);
  }

  update(dt: number) {
    if (this.result !== "playing") {
      this.wonT += dt;
      this.deadT += dt;
      this.player.tick(dt);
      this.boss?.actor.tick(dt);
      this.hug?.tick(dt);
      this.cage?.tick(dt);
      this.renderer.followTarget(wx(this.px), wy(this.py) + 0.4);
      this.parallax();
      this.renderer.render();
      return;
    }
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.coyote = this.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    this.playerMove(dt);
    this.worldMove(dt);
    this.spawn(dt);
    this.mobsThink(dt);
    this.shotsThink(dt);
    this.pickupsThink();
    this.bossThink(dt);
    this.hazards();
    this.portalThink();
    this.player.tick(dt);
    for (const m of this.mobs) m.actor.tick(dt);
    for (const s of this.shots) s.actor.tick(dt);
    for (const p of this.pickups) if (!p.taken) p.actor.tick(dt);
    this.portal?.tick(dt);
    this.boss?.actor.tick(dt);
    this.cage?.tick(dt);
    this.hug?.tick(dt);
    this.hud.hearts(this.hearts, this.shield);
    this.renderer.followTarget(wx(this.px), wy(this.py) + (this.info.mode === "climb" ? 1.4 : 0.4));
    this.parallax();
    this.renderer.render();
  }

  destroy() {
    this.player?.destroy();
    this.portal?.destroy();
    this.boss?.actor.destroy();
    this.boss?.extra?.destroy();
    this.cage?.destroy();
    this.hug?.destroy();
    for (const m of this.mobs) m.actor.destroy();
    for (const s of this.shots) s.actor.destroy();
    for (const p of this.pickups) p.actor.destroy();
    for (const s of this.springs) s.actor.destroy();
    for (const m of this.mines) m.actor.destroy();
    for (const t of this.targets) t.actor.destroy();
    for (const n of this.nodes) this.renderer.removeNode(n);
    this.nodes = [];
  }

  private addProp(file: string, x: number, y: number, w: number, h: number, z = 0, originY = 1) {
    const node = makeProp(this.renderer, file, x, y, w, h, z, originY);
    this.track(node.id);
    return node;
  }

  private track(id: string) {
    this.nodes.push(id);
    return id;
  }

  private buildWorld() {
    const sun = new Light3D({
      name: "sun",
      lightKind: "directional",
      color: this.ch === 3 || this.ch === 12 ? "#ffb07a" : this.ch === 4 ? "#e8f4ff" : "#ffe6b0",
      intensity: 2.35,
      castShadow: true,
      position: { x: 6, y: 10, z: 7 },
    });
    this.renderer.addNode(sun);
    this.track(sun.id);
    const fill = new Light3D({
      name: "fill",
      lightKind: "point",
      color: "#b7d4ff",
      intensity: 1.15,
      castShadow: false,
      position: { x: 0, y: 3, z: 3 },
    });
    this.renderer.addNode(fill);
    this.track(fill.id);

    const bg = BACKDROPS[`bg${this.ch}` as keyof typeof BACKDROPS];
    this.backdrop = new Node2_5D({ type: "Sprite2_5D", name: "sky", position: { x: 8, y: 4.2, z: -22 } });
    this.backdrop.metadata = { width: 42, height: 16, texture: bg, originX: 0.5, originY: 0.5, depthWrite: false };
    this.renderer.addNode(this.backdrop);
    this.track(this.backdrop.id);
    this.mid = new Node2_5D({ type: "Sprite2_5D", name: "mid", position: { x: 8, y: 2.6, z: -12 } });
    this.mid.metadata = { width: 28, height: 11, texture: bg, originX: 0.5, originY: 0.5, opacity: 0.55, depthWrite: false };
    this.renderer.addNode(this.mid);
    this.track(this.mid.id);

    const gtex = `ground_${this.ch}` as keyof typeof PROPS;
    for (const g of this.level.ground) {
      const mid = (g.x0 + g.x1) / 2;
      const w = g.x1 - g.x0;
      const box = new Node3D({
        type: "Mesh3D",
        name: "ground",
        position: { x: wx(mid), y: wy(g.y) - 0.55, z: 0 },
      });
      box.metadata = { w: w / 80, h: 1.1, d: 3.2, color: GROUND_COL[this.ch], receive: true };
      this.renderer.addNode(box);
      this.track(box.id);
      if (gtex in PROPS) {
        const strips = Math.max(1, Math.round(w / 640));
        for (let i = 0; i < strips; i++) {
          const sx = g.x0 + (i + 0.5) * (w / strips);
          this.addProp(PROPS[gtex].file, sx, g.y + 6, Math.min(640, w / strips + 8), PROPS[gtex].height, 0.02, 0.15);
        }
      }
      this.solids.push({ x: mid, y: g.y, w, h: 90 });
    }

    const platFile = (prop: PlatformDef["prop"]) => {
      const id = this.ch;
      const key = (prop.includes("small") ? `plat_s_${id}` : prop.includes("medium") ? `plat_m_${id}` : `plat_l_${id}`) as keyof typeof PROPS;
      return key in PROPS ? PROPS[key] : PROPS[`plat_l_${id}` as keyof typeof PROPS];
    };
    for (const p of this.level.platforms) {
      const meta = platFile(p.prop);
      if (meta) this.addProp(meta.file, p.x, p.y, meta.width, meta.height, 0);
      this.solids.push({ x: p.x, y: p.y, w: meta?.width ?? 160, h: 28, oneWay: true });
    }
    for (const w of this.level.walls) {
      const h = w.blocks * BLOCK_H;
      const yTop = w.hang ? w.y : w.y - h;
      const box = new Node3D({
        type: "Mesh3D",
        name: "wall",
        position: { x: wx(w.x), y: wy(w.hang ? w.y : w.y) - (w.hang ? -h / 160 : h / 160), z: 0 },
      });
      box.metadata = { w: BLOCK_W / 80, h: h / 80, d: 1.6, color: GROUND_COL[this.ch], receive: true };
      this.renderer.addNode(box);
      this.track(box.id);
      const solid: Solid = { x: w.x, y: yTop + (w.hang ? 0 : h), w: BLOCK_W, h, kind: w.breakable ? "break" : "wall" };
      if (w.hang) {
        this.solids.push({ x: w.x, y: w.y + h, w: BLOCK_W, h, kind: "wall" });
      } else if (w.breakable) {
        this.breakWalls.push({ solid, node: box, hp: 2 });
        this.solids.push(solid);
      } else {
        this.solids.push({ x: w.x, y: w.y, w: BLOCK_W, h, kind: "wall" });
      }
    }
    for (const c of this.level.crates) {
      const key = `crate_${this.ch}` as keyof typeof PROPS;
      if (key in PROPS) this.addProp(PROPS[key].file, c.x, c.y, CRATE_SIZE, CRATE_SIZE, 0);
      this.crates.push({ x: c.x, y: c.y, w: CRATE_SIZE, h: CRATE_SIZE, vx: 0, kind: "crate" });
    }
    for (const s of this.level.springs) {
      this.springs.push({ x: s.x, y: s.y, actor: new Actor(this.renderer, "spring", s.x, s.y, 48) });
    }
    for (const s of this.level.spikes) this.spikes.push(s);
    for (const m of this.level.mines) {
      const a = new Actor(this.renderer, "stargem", m.x, m.y, 42);
      a.play(a.has("idle") ? "idle" : Object.keys(SPRITES.stargem.anims)[0]);
      this.renderer.setEmissive(a.node.id, 0xff4466, 0.8);
      this.mines.push({ x: m.x, y: m.y, def: m, actor: a });
    }
    for (const mv of this.level.movers) {
      const solid: Solid = { x: mv.x0, y: mv.y0, w: 180, h: 28, oneWay: true, kind: "mover" };
      const node = new Node3D({ type: "Mesh3D", name: "mover", position: { x: wx(mv.x0), y: wy(mv.y0) - 0.12, z: 0 } });
      node.metadata = { w: 2.2, h: 0.28, d: 1.8, color: GROUND_COL[this.ch], receive: true };
      this.renderer.addNode(node);
      this.track(node.id);
      this.solids.push(solid);
      this.movers.push({ def: mv, solid, node, t: 0 });
    }
    for (const c of this.level.crumbles) {
      const solid: Solid = { x: c.x, y: c.y, w: 150, h: 24, oneWay: true, kind: "crumble" };
      const node = new Node3D({ type: "Mesh3D", name: "crumble", position: { x: wx(c.x), y: wy(c.y) - 0.1, z: 0 } });
      node.metadata = { w: 1.9, h: 0.22, d: 1.6, color: 0x8a6a48, receive: true };
      this.renderer.addNode(node);
      this.track(node.id);
      this.solids.push(solid);
      this.crumbles.push({ solid, node, life: null });
    }
    for (const t of this.level.targets) {
      const a = new Actor(this.renderer, "stargem", t.x, t.y, 54);
      this.renderer.setEmissive(a.node.id, 0xffe08a, 1.2);
      const bridges: InstanceType<typeof Node2_5D>[] = [];
      for (const b of t.bridge) {
        const n = new Node3D({ type: "Mesh3D", name: "bridge", position: { x: wx(b.x), y: wy(b.y) - 0.12, z: 0 } });
        n.metadata = { w: 2, h: 0.24, d: 1.6, color: GROUND_COL[this.ch], opacity: 0.15 };
        this.renderer.addNode(n);
        this.track(n.id);
        bridges.push(n as unknown as InstanceType<typeof Node2_5D>);
      }
      this.targets.push({ x: t.x, y: t.y, actor: a, hit: false, bridges });
    }
    for (const h of this.level.hearts) this.pickups.push({ x: h.x, y: h.y, kind: "heart", actor: new Actor(this.renderer, "heart", h.x, h.y, 36) });
    for (const g of this.level.gems) this.pickups.push({ x: g.x, y: g.y, kind: "gem", actor: new Actor(this.renderer, "stargem", g.x, g.y, 40) });
    for (const s of this.level.stars) this.pickups.push({ x: s.x, y: s.y, kind: "star", actor: new Actor(this.renderer, "starshield", s.x, s.y, 44) });
    if (this.level.weapon) {
      const map: Record<WeaponId, SpriteKey> = {
        sword: "angely_sword",
        bow: "weapon_bow" in SPRITES ? "weapon_bow" : "angely_bow",
        hammer: "weapon_hammer" in SPRITES ? "weapon_hammer" : "angely_hammer",
        boomerang: "weapon_boomerang",
        wand: "weapon_wand" in SPRITES ? "weapon_wand" : "angely_wand",
        cog: "weapon_cog",
        ray: "weapon_ray" in SPRITES ? "weapon_ray" : "angely_ray",
      };
      const sheet = map[this.level.weapon.kind];
      this.pickups.push({
        x: this.level.weapon.x,
        y: this.level.weapon.y,
        kind: "weapon",
        weapon: this.level.weapon.kind,
        actor: new Actor(this.renderer, sheet, this.level.weapon.x, this.level.weapon.y, 56),
      });
    }
    for (const c of this.level.checkpoints) {
      this.track(new Actor(this.renderer, "flag", c.x, c.y, 70).node.id);
    }
    this.portal = new Actor(this.renderer, "portal", this.level.portal.x, this.level.portal.y, 140);
    this.px = 160;
    this.py = (this.level.ground[0]?.y ?? GROUND_Y) - 2;
    if (this.info.mode === "climb") {
      this.px = 640;
      this.py = this.level.ground[0]?.y ?? GROUND_Y;
    }
    if (this.level.flood) this.floodY = this.level.ground[0]?.y ?? GROUND_Y;

    if (this.info.boss && this.ch === 5) {
      const a = this.level.arena!;
      this.boss = { kind: "umbra", hp: 22, max: 22, actor: new Actor(this.renderer, "umbra", (a.x0 + a.x1) / 2, GROUND_Y - 180, 168, 0.2), phase: 0, cd: 1.2 };
    }
    if (this.info.boss && this.ch === 8) {
      this.boss = { kind: "worm", hp: 18, max: 18, actor: new Actor(this.renderer, "sandworm", 640, GROUND_Y + 40, 200), phase: 0, cd: 1.4 };
      this.boss.actor.play("idle");
    }
    if (this.info.boss && this.ch === 11) {
      const a = this.level.arena!;
      const cx = (a.x0 + a.x1) / 2;
      this.boss = { kind: "veil", hp: 26, max: 26, actor: new Actor(this.renderer, "crystalveil", cx + 180, GROUND_Y, 228), phase: 0, cd: 1.1 };
      this.cage = new Actor(this.renderer, "angelo_cage", cx, GROUND_Y - 268, 110, 0.15);
      this.cage.play("idle");
    }
  }

  private parallax() {
    if (this.backdrop) {
      this.backdrop.position.x = wx(this.px) * 0.42 + 4;
      this.renderer.sync(this.backdrop);
    }
    if (this.mid) {
      this.mid.position.x = wx(this.px) * 0.72 + 2;
      this.renderer.sync(this.mid);
    }
  }

  private playerMove(dt: number) {
    if (this.input.swapPressed && this.weapons.length > 1 && this.atk <= 0) {
      const i = this.weapons.indexOf(this.weapon ?? this.weapons[0]);
      this.weapon = this.weapons[(i + 1) % this.weapons.length];
      this.hud.weapon(WEAPON_NAMES[this.weapon]);
      Audio.sfx("button");
    }
    const want = this.input.x;
    const accel = this.grounded ? 2600 : 1700;
    const grip = CHAPTERS[this.ch].grip;
    if (this.atk <= 0) {
      if (want !== 0) {
        this.vx += want * accel * dt;
        this.facing(want < 0 ? -1 : 1);
      } else {
        this.vx *= Math.pow(1 - 8 * grip, dt);
      }
      const max = SPEED * (Math.abs(want) > 0.7 ? 1 : 0.55);
      this.vx = Math.max(-max, Math.min(max, this.vx));
    }

    if (this.swim) {
      this.vy += 420 * dt;
      if (this.input.jumpPressed) {
        this.vy = -430;
        Audio.sfx("jump");
      }
      this.vy = Math.max(-520, Math.min(240, this.vy));
    } else {
      if ((this.grounded || this.coyote > 0) && this.input.jumpPressed) {
        this.vy = -JUMP_V;
        this.grounded = false;
        this.coyote = 0;
        Audio.sfx("jump");
      }
      if (this.vy < 0 && !this.input.jump) this.vy += GRAVITY * dt;
      else this.vy += (this.vy > 0 ? GRAVITY + FALL_G : GRAVITY) * dt;
      this.vy = Math.min(MAX_FALL, this.vy);
    }

    if (this.input.attackPressed && this.atk <= 0 && this.weapon) this.startAttack();

    this.px += this.vx * dt;
    this.py += this.vy * dt;
    this.collide(dt);
    this.px = Math.max(40, Math.min(this.level.width || 4000, this.px));
    if (this.info.mode === "climb") this.px = Math.max(80, Math.min(1200, this.px));

    for (const s of this.springs) {
      if (Math.abs(this.px - s.x) < 40 && this.py > s.y - 20 && this.py < s.y + 30 && this.vy > 0) {
        this.vy = -1180;
        this.grounded = false;
        s.actor.play("idle", true);
        Audio.sfx("spring");
      }
    }

    this.player.setPos(this.px, this.py);
    if (this.atk > 0) {
      this.atk -= dt;
      if (this.atk <= 0) {
        this.atkName = null;
        this.player = this.reSheet(this.swim ? "angely_swim" : "angely");
      } else this.hitScan();
    } else if (this.swim) {
      this.player.play(this.input.jump ? "up" : Math.abs(this.vx) > 40 ? "swim" : "float");
    } else if (!this.grounded) this.player.play(this.vy < 0 ? "jump" : "fall");
    else if (Math.abs(this.vx) > 40) this.player.play(Math.abs(this.vx) > 180 ? "run" : "walk");
    else this.player.play("idle");

    if (this.py > GROUND_Y + 280 || (this.level.flood && this.py > this.floodY)) this.hurt(1, true);
  }

  private facing(dir: 1 | -1) {
    this.player.facing = dir;
  }

  private reSheet(sheet: SpriteKey) {
    const facing = this.player.facing;
    this.player.destroy();
    const next = new Actor(this.renderer, sheet, this.px, this.py, 112);
    next.facing = facing;
    this.player = next;
    return next;
  }

  private collide(_dt: number) {
    this.grounded = false;
    const all = [...this.solids, ...this.crates];
    const left = this.px - PLAYER_W / 2;
    const right = this.px + PLAYER_W / 2;
    const feet = this.py;
    const head = this.py - PLAYER_H;
    for (const s of all) {
      const sl = s.x - s.w / 2;
      const sr = s.x + s.w / 2;
      const top = s.kind === "wall" ? s.y - s.h : s.y;
      const bot = s.kind === "wall" ? s.y : s.y + s.h;
      const overlapX = right > sl + 4 && left < sr - 4;
      if (!overlapX) continue;
      if (s.oneWay || s.kind === "mover" || s.kind === "crumble" || !s.kind) {
        if (this.vy >= 0 && feet >= top - 18 && feet <= top + 28 && head < top) {
          this.py = top;
          this.vy = 0;
          this.grounded = true;
          if (s.kind === "crumble") {
            const c = this.crumbles.find((x) => x.solid === s);
            if (c && c.life == null) c.life = 0.55;
          }
        }
      } else if (s.kind === "wall" || s.kind === "break") {
        if (feet > top + 8 && head < bot - 8) {
          if (this.px < s.x) this.px = sl - PLAYER_W / 2;
          else this.px = sr + PLAYER_W / 2;
          this.vx = 0;
        }
      }
    }
    for (const c of this.crates) {
      if (Math.abs(this.px - c.x) < 50 && Math.abs(this.py - c.y) < 50 && this.grounded) {
        c.x += this.input.x * 140 * _dt;
        c.x = Math.max(40, Math.min((this.level.width || 3000) - 40, c.x));
      }
    }
  }

  private worldMove(dt: number) {
    for (const m of this.movers) {
      m.t += dt;
      const u = (Math.sin((m.t / m.def.period) * Math.PI * 2) + 1) / 2;
      m.solid.x = m.def.x0 + (m.def.x1 - m.def.x0) * u;
      m.solid.y = m.def.y0 + (m.def.y1 - m.def.y0) * u;
      m.node.position.x = wx(m.solid.x);
      m.node.position.y = wy(m.solid.y) - 0.12;
      this.renderer.sync(m.node as never);
    }
    for (const c of this.crumbles) {
      if (c.life == null) continue;
      c.life -= dt;
      this.renderer.setOpacity(c.node.id, Math.max(0, c.life / 0.55));
      if (c.life <= 0) {
        this.solids = this.solids.filter((s) => s !== c.solid);
        this.renderer.removeNode(c.node.id);
        c.life = -99;
        Audio.sfx("enemy_defeat");
      }
    }
    for (const m of this.mines) {
      const u = (Math.sin((this.t / m.def.period) * Math.PI * 2 + m.def.phase) + 1) / 2;
      m.x = m.def.x + m.def.dx * (u - 0.5) * 2;
      m.y = m.def.y + m.def.dy * (u - 0.5) * 2;
      m.actor.setPos(m.x, m.y);
    }
    if (this.level.flood) this.floodY -= 38 * dt;
  }

  private spawn(dt: number) {
    if (this.info.boss) return;
    const ch = CHAPTERS[this.ch];
    this.spawnT += dt;
    const alive = this.mobs.filter((m) => m.state !== "dead").length;
    if (alive >= ch.maxAlive || this.spawnT < ch.spawnEvery) return;
    this.spawnT = 0;
    const kind = ch.enemies[Math.floor(Math.random() * ch.enemies.length)];
    const type = ENEMY_TYPES[kind];
    if (!type) return;
    const ahead = this.px + (this.player.facing >= 0 ? 520 : -520);
    const g = this.level.ground.find((s) => ahead > s.x0 + 40 && ahead < s.x1 - 40) ?? this.level.ground[0];
    if (!g) return;
    const x = Math.max(g.x0 + 40, Math.min(g.x1 - 40, ahead + (Math.random() * 160 - 80)));
    const y = type.flying ? g.y - 160 - Math.random() * 80 : g.y;
    const actor = new Actor(this.renderer, type.key, x, y, type.height);
    this.mobs.push({ actor, kind, hp: type.hp, vx: 0, vy: 0, cd: type.cooldown / 1000, wind: 0, state: "idle", hurt: 0 });
  }

  private mobsThink(dt: number) {
    for (const m of this.mobs) {
      if (m.state === "dead") {
        if (m.actor.animDone()) {
          m.actor.destroy();
        }
        continue;
      }
      const type = ENEMY_TYPES[m.kind];
      m.hurt = Math.max(0, m.hurt - dt);
      m.cd = Math.max(0, m.cd - dt);
      const dx = this.px - m.actor.x;
      m.actor.facing = dx < 0 ? -1 : 1;
      if (m.state === "hurt") {
        if (m.hurt <= 0) m.state = "idle";
        continue;
      }
      if (m.state === "wind") {
        m.wind -= dt;
        m.actor.play(m.actor.has("attack") ? "attack" : "idle");
        if (m.wind <= 0) {
          m.state = "atk";
          this.mobAttack(m);
        }
        continue;
      }
      if (m.state === "atk") {
        if (m.actor.animDone() || m.cd > 0) m.state = "idle";
        continue;
      }
      const dist = Math.abs(dx);
      const speed = type.speed * (type.flying ? 1 : 1);
      if (type.keepDistance && dist < type.keepDistance) m.actor.x -= Math.sign(dx) * speed * dt * 0.6;
      else if (dist > 70) m.actor.x += Math.sign(dx) * speed * dt;
      if (type.flying) m.actor.y += Math.sin(this.t * 2 + m.actor.x) * 18 * dt;
      else {
        const g = this.level.ground.find((s) => m.actor.x > s.x0 && m.actor.x < s.x1);
        if (g) m.actor.y = g.y;
      }
      m.actor.play(Math.abs(dx) > 40 && m.actor.has("walk") ? "walk" : "idle");
      if (dist < type.range && m.cd <= 0) {
        m.state = "wind";
        m.wind = type.windup / 1000;
      }
      if (!type.flying && this.vy > 120 && Math.abs(this.px - m.actor.x) < 36 && this.py < m.actor.y - 10 && this.py > m.actor.y - type.height) {
        this.stomp(m);
      } else if (Math.abs(this.px - m.actor.x) < 38 && Math.abs(this.py - m.actor.y) < type.height * 0.55) {
        this.hurt(1, false);
      }
    }
    this.mobs = this.mobs.filter((m) => m.state !== "dead" || !m.actor.animDone());
  }

  private mobAttack(m: Mob) {
    const type = ENEMY_TYPES[m.kind];
    m.cd = type.cooldown / 1000;
    Audio.sfx(type.attackSfx);
    if (type.attack === "shoot" && type.projectile) {
      const ang = Math.atan2(this.py - 40 - m.actor.y, this.px - m.actor.x);
      this.spawnShot(type.projectile.sheet, m.actor.x, m.actor.y - type.height * 0.5, Math.cos(ang) * type.projectile.speed, Math.sin(ang) * type.projectile.speed, false, 1);
    } else if (Math.abs(this.px - m.actor.x) < type.range && Math.abs(this.py - m.actor.y) < 90) {
      this.hurt(1, false);
    }
  }

  private spawnShot(sheet: SpriteKey, x: number, y: number, vx: number, vy: number, friendly: boolean, dmg: number, home = false) {
    const actor = new Actor(this.renderer, sheet, x, y, 36);
    if (actor.has("fly")) actor.play("fly");
    this.shots.push({ x, y, vx, vy, life: 2.4, friendly, dmg, actor, home });
  }

  private shotsThink(dt: number) {
    for (const s of this.shots) {
      if (s.home) {
        let best: Mob | undefined;
        let bestD = 9999;
        for (const m of this.mobs) {
          if (m.state === "dead") continue;
          const d = Math.hypot(m.actor.x - s.x, m.actor.y - s.y);
          if (d < bestD) {
            bestD = d;
            best = m;
          }
        }
        if (best) {
          const ang = Math.atan2(best.actor.y - 40 - s.y, best.actor.x - s.x);
          s.vx += Math.cos(ang) * 800 * dt;
          s.vy += Math.sin(ang) * 800 * dt;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.actor.setPos(s.x, s.y);
      if (!s.friendly && Math.abs(s.x - this.px) < 28 && Math.abs(s.y - (this.py - 48)) < 40) {
        this.hurt(s.dmg, false);
        s.life = 0;
      }
      if (s.friendly) {
        for (const m of this.mobs) {
          if (m.state === "dead") continue;
          if (Math.abs(s.x - m.actor.x) < 42 && Math.abs(s.y - m.actor.y + 40) < 50) {
            this.hitMob(m, s.dmg);
            s.life = 0;
          }
        }
        if (this.boss && this.boss.hp > 0 && Math.abs(s.x - this.boss.actor.x) < 70 && Math.abs(s.y - this.boss.actor.y + 80) < 90) {
          this.hitBoss(s.dmg);
          s.life = 0;
        }
        for (const t of this.targets) {
          if (!t.hit && Math.abs(s.x - t.x) < 40 && Math.abs(s.y - t.y) < 40) this.raiseTarget(t);
        }
      }
    }
    const keep: Shot[] = [];
    for (const s of this.shots) {
      if (s.life > 0) keep.push(s);
      else s.actor.destroy();
    }
    this.shots = keep;
  }

  private startAttack() {
    if (!this.weapon) return;
    this.atkName = this.weapon;
    this.airAtk = !this.grounded;
    const sheet: Record<WeaponId, SpriteKey> = {
      sword: "angely_sword",
      bow: "angely_bow",
      hammer: "angely_hammer",
      boomerang: "angely_boomerang",
      wand: "angely_wand",
      cog: "angely_sword",
      ray: "angely_ray",
    };
    const anim: Record<WeaponId, string> = {
      sword: this.airAtk ? "jump_attack" : "slash",
      bow: "shoot",
      hammer: "smash",
      boomerang: "throw",
      wand: "cast",
      cog: "slash",
      ray: "shoot",
    };
    this.reSheet(sheet[this.weapon]);
    this.player.play(anim[this.weapon], true);
    this.atk = this.weapon === "hammer" ? 0.55 : this.weapon === "bow" || this.weapon === "wand" ? 0.42 : 0.36;
    Audio.sfx(this.weapon === "bow" ? "bow_shoot" : this.weapon === "hammer" ? "hammer_smash" : "sword_swing");
    if (this.weapon === "bow") {
      const dir = this.player.facing;
      this.spawnShot("fx_arrow", this.px + dir * 30, this.py - 56, dir * 520, -20, true, 1);
    }
    if (this.weapon === "wand") {
      for (let i = 0; i < 3; i++) this.spawnShot("fx_star", this.px, this.py - 70, this.player.facing * (220 + i * 40), -120 + i * 80, true, 1, true);
    }
    if (this.weapon === "boomerang") {
      this.spawnShot("weapon_boomerang", this.px, this.py - 50, this.player.facing * 380, -40, true, 1);
    }
    if (this.weapon === "ray") {
      this.spawnShot("fx_bolt", this.px + this.player.facing * 40, this.py - 52, this.player.facing * 640, 0, true, 1);
    }
  }

  private hitScan() {
    const w = this.atkName;
    if (!w) return;
    const dir = this.player.facing;
    const reach = w === "hammer" || w === "cog" ? 110 : 78;
    const x = this.px + dir * 50;
    const dmg = w === "hammer" ? 2 : 1;
    for (const m of this.mobs) {
      if (m.state === "dead" || m.hurt > 0) continue;
      if (Math.abs(m.actor.x - x) < reach && Math.abs(m.actor.y - this.py) < 80) this.hitMob(m, dmg);
    }
    if (this.boss && this.boss.hp > 0 && Math.abs(this.boss.actor.x - x) < reach + 30) this.hitBoss(dmg);
    if (w === "hammer") {
      for (const b of this.breakWalls) {
        if (b.hp > 0 && Math.abs(b.solid.x - this.px) < 90) {
          b.hp = 0;
          this.solids = this.solids.filter((s) => s !== b.solid);
          this.renderer.removeNode(b.node.id);
          Audio.sfx("hammer_smash");
        }
      }
    }
  }

  private stomp(m: Mob) {
    this.vy = -560;
    this.hitMob(m, 1);
    Audio.sfx("stomp");
  }

  private hitMob(m: Mob, dmg: number) {
    if (m.state === "dead") return;
    const type = ENEMY_TYPES[m.kind];
    if (type.armoredFront && Math.sign(this.px - m.actor.x) === m.actor.facing) dmg = Math.max(0, dmg - 1);
    if (dmg <= 0) return;
    m.hp -= dmg;
    m.hurt = 0.28;
    m.state = "hurt";
    m.actor.play(m.actor.has("hurt") ? "hurt" : "idle", true);
    Audio.sfx("enemy_hit");
    if (m.hp <= 0) {
      m.state = "dead";
      m.actor.play(m.actor.has("dead") ? "dead" : m.actor.has("defeat") ? "defeat" : "hurt", true);
      this.kills++;
      this.refreshGoal();
      Audio.sfx("enemy_defeat");
      if (type.heartDrop && Math.random() < type.heartDrop) {
        this.pickups.push({ x: m.actor.x, y: m.actor.y - 20, kind: "heart", actor: new Actor(this.renderer, "heart", m.actor.x, m.actor.y - 20, 36) });
      }
    }
  }

  private hitBoss(dmg: number) {
    if (!this.boss || this.boss.hp <= 0) return;
    this.boss.hp -= dmg;
    this.boss.actor.play(this.boss.actor.has("hurt") ? "hurt" : "idle", true);
    Audio.sfx("enemy_hit");
    this.refreshGoal();
    if (this.boss.kind === "veil" && this.cage) this.cage.play(this.boss.hp < this.boss.max * 0.35 ? "cheer" : "shake", true);
    if (this.boss.hp <= 0) this.winBoss();
  }

  private winBoss() {
    if (!this.boss) return;
    this.boss.hp = 0;
    this.boss.actor.play(this.boss.actor.has("dead") ? "dead" : "hurt", true);
    this.portalOpen = true;
    this.refreshGoal();
    Audio.sfx("portal_unlock");
    Audio.music("music_victory");
    if (this.boss.kind === "veil" && this.cage) {
      this.cage.destroy();
      this.cage = undefined;
      this.hug = new Actor(this.renderer, "angelo_hug", this.boss.actor.x - 40, GROUND_Y, 120);
      this.hug.play("open", true);
    }
    this.hud.banner("The portal opens");
  }

  private bossThink(dt: number) {
    if (!this.boss || this.boss.hp <= 0) {
      if (this.hug) {
        if (this.hug.anim === "open" && this.hug.animDone()) this.hug.play("hug");
      }
      return;
    }
    const b = this.boss;
    b.cd -= dt;
    const arena = this.level.arena ?? { x0: 200, x1: 1100 };
    if (b.kind === "umbra") {
      b.actor.y = GROUND_Y - 170 + Math.sin(this.t * 1.4) * 24;
      b.actor.x += Math.sign(this.px - b.actor.x) * 40 * dt;
      b.actor.x = Math.max(arena.x0 + 80, Math.min(arena.x1 - 80, b.actor.x));
      b.actor.facing = this.px < b.actor.x ? -1 : 1;
      if (b.cd <= 0) {
        b.phase = (b.phase + 1) % 3;
        b.cd = b.hp < b.max / 2 ? 1.5 : 2.1;
        if (b.phase === 0) {
          b.actor.play("cast", true);
          for (let i = 0; i < 5; i++) {
            const ang = -0.6 + i * 0.3;
            this.spawnShot("fx_orb", b.actor.x, b.actor.y - 40, Math.cos(ang) * (this.px < b.actor.x ? -240 : 240), Math.sin(ang) * 180, false, 1);
          }
        } else if (b.phase === 1) {
          b.actor.play("idle");
          this.spawnShot("fx_orb", b.actor.x, b.actor.y, Math.sign(this.px - b.actor.x) * 320, 80, false, 1);
        } else {
          b.actor.y = GROUND_Y - 40;
        }
      }
      if (Math.abs(this.px - b.actor.x) < 70 && Math.abs(this.py - b.actor.y) < 90) this.hurt(1, false);
    }
    if (b.kind === "worm") {
      if (b.phase === 0) {
        b.actor.y = Math.max(GROUND_Y - 10, b.actor.y - 160 * dt);
        b.actor.play("rise");
        if (b.actor.y <= GROUND_Y - 8) {
          b.phase = 1;
          b.cd = 0.8;
          b.actor.play("idle");
        }
      } else if (b.phase === 1) {
        if (b.cd <= 0) {
          b.actor.play("spit", true);
          this.spawnShot("fx_dust", b.actor.x, b.actor.y - 80, Math.sign(this.px - b.actor.x) * 280, -40, false, 1);
          b.phase = 2;
          b.cd = 1.6;
        }
      } else {
        if (b.cd <= 0) {
          b.actor.play("dive", true);
          b.phase = 0;
          b.actor.y = GROUND_Y + 80;
          b.actor.x = Math.max(180, Math.min(1100, this.px + (Math.random() * 200 - 100)));
          b.cd = 0.4;
        }
      }
      if (this.vy > 80 && Math.abs(this.px - b.actor.x) < 80 && this.py < b.actor.y && b.phase === 1) {
        this.vy = -500;
        this.hitBoss(1);
      }
    }
    if (b.kind === "veil") {
      b.actor.x += Math.sign(this.px - b.actor.x) * 55 * dt;
      b.actor.x = Math.max(arena.x0 + 90, Math.min(arena.x1 - 90, b.actor.x));
      b.actor.facing = this.px < b.actor.x ? -1 : 1;
      const g = this.level.ground[0];
      if (g) b.actor.y = g.y;
      if (b.cd <= 0) {
        b.phase = (b.phase + 1) % 4;
        b.cd = 1.8;
        if (b.phase === 0) {
          b.actor.play("claw", true);
          if (Math.abs(this.px - b.actor.x) < 130) this.hurt(1, false);
        } else if (b.phase === 1) {
          b.actor.play("slam", true);
          if (Math.abs(this.px - b.actor.x) < 160 && this.grounded) this.hurt(1, false);
        } else if (b.phase === 2) {
          b.actor.play("shoot", true);
          const ang = Math.atan2(this.py - 40 - (b.actor.y - 80), this.px - b.actor.x);
          this.spawnShot("crystal_shot", b.actor.x, b.actor.y - 90, Math.cos(ang) * 340, Math.sin(ang) * 340, false, 1);
        } else {
          b.actor.play("charge", true);
          const beam = new Actor(this.renderer, "crystalveil_beam", b.actor.x + b.actor.facing * 80, b.actor.y - 40, 160);
          beam.play("beam");
          window.setTimeout(() => beam.destroy(), 900);
          if (Math.sign(this.px - b.actor.x) === b.actor.facing && Math.abs(this.py - b.actor.y) < 140) this.hurt(1, false);
          if (this.cage) this.cage.play("worry", true);
        }
      } else b.actor.play(Math.abs(this.px - b.actor.x) > 40 ? "walk" : "idle");
      if (this.cage) {
        if (b.hp < b.max * 0.35) this.cage.play("cheer");
      }
    }
  }

  private pickupsThink() {
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.actor.y = p.y + Math.sin(this.t * 3 + p.x) * 6;
      p.actor.sync();
      if (Math.abs(this.px - p.x) < 42 && Math.abs(this.py - p.y) < 70) {
        p.taken = true;
        p.actor.destroy();
        if (p.kind === "heart") {
          this.hearts = Math.min(MAX_HEARTS, this.hearts + 1);
          Audio.sfx("heart_pickup");
        } else if (p.kind === "gem") {
          this.gems++;
          this.refreshGoal();
          Audio.sfx("gem");
        } else if (p.kind === "star") {
          this.shield = 15;
          Audio.sfx("checkpoint");
        } else if (p.kind === "weapon" && p.weapon) {
          if (!this.weapons.includes(p.weapon)) this.weapons = WEAPON_ORDER.filter((w) => w === p.weapon || this.weapons.includes(w));
          this.weapon = p.weapon;
          addWeapon(p.weapon);
          this.hud.weapon(WEAPON_NAMES[p.weapon]);
          Audio.sfx("sword_swing");
          this.hud.banner(`${WEAPON_NAMES[p.weapon]}!`);
        }
      }
    }
    for (const c of this.level.checkpoints) {
      if (Math.abs(this.px - c.x) < 50 && this.py < c.y + 20) this.checkpoint = { x: c.x, y: c.y };
    }
  }

  private hazards() {
    for (const s of this.spikes) {
      if (Math.abs(this.px - s.x) < 36 && this.py > s.y - 20 && this.py < s.y + 40) this.hurt(1, false);
    }
    for (const m of this.mines) {
      if (Math.abs(this.px - m.x) < 36 && Math.abs(this.py - m.y) < 40) this.hurt(1, false);
    }
  }

  private raiseTarget(t: { hit: boolean; bridges: InstanceType<typeof Node2_5D>[]; x: number; y: number; actor: Actor }) {
    t.hit = true;
    Audio.sfx("portal_unlock");
    const def = this.level.targets.find((x) => x.x === t.x);
    if (!def) return;
    for (const b of def.bridge) this.solids.push({ x: b.x, y: b.y, w: 160, h: 24, oneWay: true });
    for (const n of t.bridges) this.renderer.setOpacity(n.id, 1);
  }

  private portalThink() {
    if (!this.portal) return;
    const need = this.info.need;
    if (this.info.goal === "kills") this.portalOpen = this.kills >= need;
    if (this.info.goal === "gems") this.portalOpen = this.gems >= need;
    if (this.info.goal === "reach") this.portalOpen = true;
    if (this.info.goal === "boss") this.portalOpen = !!this.boss && this.boss.hp <= 0;
    this.renderer.setEmissive(this.portal.node.id, this.portalOpen ? 0x7af0ff : 0x334455, this.portalOpen ? 1.1 : 0.15);
    if (this.portalOpen && Math.abs(this.px - this.portal.x) < 50 && Math.abs(this.py - this.portal.y) < 80) {
      Audio.sfx("portal_enter");
      this.result = "won";
      this.hud.banner("Stage clear");
    }
  }

  private refreshGoal() {
    if (this.info.goal === "kills") this.hud.goal(`Enemies ${this.kills}/${this.info.need}`);
    else if (this.info.goal === "gems") this.hud.goal(`Gems ${this.gems}/${this.info.need}`);
    else if (this.info.goal === "boss") this.hud.goal(this.boss ? `Boss ${Math.max(0, this.boss.hp)}/${this.boss.max}` : "Boss");
    else this.hud.goal("Reach the portal");
  }

  private hurt(n: number, pit: boolean) {
    if (this.shield > 0 || this.invuln > 0 || this.result !== "playing") return;
    this.hearts -= n;
    this.invuln = INVULN;
    Audio.sfx(pit ? "fall" : "player_hurt");
    this.player.play("hurt", true);
    this.hud.hearts(this.hearts, this.shield);
    if (this.hearts <= 0) {
      this.result = "dead";
      this.player.play(this.player.has("defeat") ? "defeat" : "hurt", true);
      Audio.music("music_game_over");
      Audio.sfx("player_defeat");
      this.hud.banner("Angely fell");
      return;
    }
    if (pit) {
      this.px = this.checkpoint.x;
      this.py = this.checkpoint.y;
      this.vx = 0;
      this.vy = 0;
    }
  }
}
