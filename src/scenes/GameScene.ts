import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { PROPS, SPRITES, type SpriteKey } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import {
  CHAPTERS, GAME_H, GAME_W, GROUND_Y, LAST_LEVEL, LEVELS, MAX_HEARTS, WEAPON_NAMES, WEAPON_ORDER, levelLabel, weaponsBefore,
  type ChapterDef, type LevelInfo, type WeaponId,
} from "../config";
import { Boss, BOSS_NAME, HOVER_Y } from "../entities/Boss";
import { RuinSentinel, SENTINEL_NAME } from "../entities/RuinSentinel";
import { Enemy, type DamageKind } from "../entities/Enemy";
import { ENEMY_TYPES, type ProjectileSheet } from "../entities/enemyTypes";
import { Player } from "../entities/Player";
import { KeyboardInput, NO_INPUT, resetTouch, touchState, type FrameInput } from "../input/controls";
import { Gamepad } from "../input/gamepad";
import { addWeapon, loadSave, unlockLevel, updateSave } from "../save";
import { angeloCutscene, angeloPraise, reunionHug, Rift } from "../story/angeloScene";
import { CageAngelo } from "../entities/CageAngelo";
import { CrystalVeilBoss } from "../entities/CrystalVeilBoss";
import { Sandworm } from "../entities/Sandworm";
import { VEIL_DEFEAT, VEIL_FAREWELL, VEIL_INTRO, VEIL_NAME, VEIL_PHASE2, VEIL_PHASE3, VEIL_RESCUE } from "../story/crystalveil";
import { WORM_INTRO, WORM_NAME } from "../story/worm";
import { UMBRA_DEFEAT, UMBRA_INTRO, UMBRA_PHASE2, type DialogueLine } from "../story/umbra";
import { useTouchUi } from "../ui/screen";
import { buildLevel, groundAt, groundY, type LevelDef, type PlatformDef, type Spot } from "../world/level";
import { Mechanics } from "../world/Mechanics";
import { backPlatform } from "../world/backing";
import { DioramaLook } from "../world/DioramaLook";
import { Portal } from "../world/Portal";
import { fitCamera } from "../render";

const BG_ZOOM = 1.25;
const ARROW_SPEED = 980;
const DESPAWN_X = 1500;
const DESPAWN_Y = 950;

const PLATFORM_ART: Record<PlatformDef["prop"], "plat_l" | "plat_m" | "plat_s"> = {
  plat_log: "plat_l",
  plat_float: "plat_m",
  plat_medium: "plat_m",
  plat_small: "plat_m",
  plat_float_small: "plat_s",
};

interface Pickup {
  sprite: Phaser.GameObjects.Sprite;
  baseY: number;
  taken: boolean;
}

export interface Goal {
  kind: LevelInfo["goal"];
  have: number;
  need: number;
}

export class GameScene extends Phaser.Scene {
  info!: LevelInfo;
  chapter!: ChapterDef;
  level!: LevelDef;
  player!: Player;
  enemies: Enemy[] = [];
  kills = 0;
  boss?: Boss | Sandworm | CrystalVeilBoss | RuinSentinel;
  veilCage?: CageAngelo;
  veilState: "idle" | "intro" | "fight" | "defeat" | "rescue" | "angelo_exit" | "angely_exit" | "done" = "idle";
  mech!: Mechanics;
  portal!: Portal;
  cutscene = false;
  scriptX: number | null = null;
  boomerangOut = false;
  private goal!: Goal;
  private keyboard!: KeyboardInput;
  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private arrows!: Phaser.Physics.Arcade.Group;
  hazards!: Phaser.Physics.Arcade.Group;
  private platformTops: { x0: number; x1: number; y: number }[] = [];
  private far!: Phaser.GameObjects.Image;
  private look?: DioramaLook;
  private hearts: Pickup[] = [];
  private gems: Pickup[] = [];
  private stars: Pickup[] = [];
  private shieldShown = -1;
  private checkpoints: { spot: Spot; sprite: Phaser.GameObjects.Sprite; active: boolean }[] = [];
  private respawn: Spot = { x: 160, y: GROUND_Y - 80 };
  private portalArrow!: Phaser.GameObjects.Container;
  private ambient!: Phaser.GameObjects.Particles.ParticleEmitter;
  private swordStone?: Phaser.GameObjects.Sprite;
  private weaponPickup?: { sprite: Phaser.GameObjects.Sprite; kind: WeaponId; glow: Phaser.GameObjects.Particles.ParticleEmitter };
  private nextSpawn = 0;
  private nextDespawn = 0;
  private aiFrozen = false;
  private ending = false;
  private bossStarted = false;
  private bossShade?: Phaser.GameObjects.Rectangle;
  private bossDamage = 0;
  private lastPortalHint = 0;
  private pauseBlockedUntil = 0;
  private lastLowHealth = 0;
  private jumpHeld = false;
  // chase
  private chaseOn = false;
  private chaseX = 0;
  private chaseWall?: Phaser.GameObjects.Container;
  private chaseDust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private chaseStartAt = 0;
  // climb flood
  private floodY = 0;
  private floodStartAt = 0;
  private flood?: Phaser.GameObjects.Container;
  // swim
  private water?: Phaser.GameObjects.Rectangle;
  private bubbles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Game");
  }

  init(data: { level?: number }) {
    this.info = LEVELS[Phaser.Math.Clamp(data.level ?? 0, 0, LAST_LEVEL)];
    this.chapter = CHAPTERS[this.info.chapter];
    this.enemies = [];
    this.kills = 0;
    this.hearts = [];
    this.gems = [];
    this.stars = [];
    this.shieldShown = -1;
    this.checkpoints = [];
    this.platformTops = [];
    this.look = undefined;
    this.swordStone = undefined;
    this.weaponPickup = undefined;
    this.boss = undefined;
    this.veilCage?.destroy();
    this.veilCage = undefined;
    this.veilState = "idle";
    this.aiFrozen = false;
    this.ending = false;
    this.cutscene = false;
    this.scriptX = null;
    this.boomerangOut = false;
    this.bossStarted = false;
    this.bossShade = undefined;
    this.bossDamage = 0;
    this.nextSpawn = 0;
    this.nextDespawn = 0;
    this.chaseOn = false;
    this.chaseWall = undefined;
    this.chaseDust = undefined;
    this.flood = undefined;
    this.water = undefined;
    this.bubbles = undefined;
  }

  create() {
    fitCamera(this, true);
    const info = this.info;
    const L = (this.level = buildLevel(info));
    const W = L.width;
    const climb = L.mode === "climb";
    const swim = L.mode === "swim";
    if (climb) {
      this.physics.world.setBounds(0, L.top - 600, W, GAME_H + 600 - (L.top - 600));
      this.cameras.main.setBounds(0, L.top, W, GAME_H - L.top);
    } else if (swim) {
      this.physics.world.setBounds(0, -20, W, GAME_H + 620);
      this.cameras.main.setBounds(0, 0, W, GAME_H);
    } else {
      this.physics.world.setBounds(0, -600, W, GAME_H + 1200);
      this.cameras.main.setBounds(0, 0, W, GAME_H);
    }
    this.physics.world.setBoundsCollision(true, true, swim, false);
    this.cameras.main.setBackgroundColor(0x120d1f);

    this.buildBackground();
    this.groundGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    this.enemyGroup = this.physics.add.group();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.arrows = this.physics.add.group({ allowGravity: false });
    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
    this.buildGround();
    this.buildPlatforms();
    this.mech = new Mechanics(this, L, this.chapter);
    this.buildProps();

    const startX = climb ? 300 : 160;
    const startY = (groundY(L.ground, startX) ?? GROUND_Y) - 60;
    this.respawn = { x: startX, y: startY - 20 };
    this.player = new Player(this, startX, startY);
    this.player.grip = this.chapter.grip;
    this.player.swim = swim;
    this.setupWeapons();

    this.physics.add.collider(this.player.rect, this.groundGroup);
    this.physics.add.collider(this.player.rect, this.platformGroup);
    this.physics.add.collider(this.enemyGroup, this.groundGroup);
    this.physics.add.collider(this.enemyGroup, this.platformGroup);
    this.mech.colliders(this.player, this.enemyGroup, this.groundGroup);
    this.physics.add.overlap(this.player.rect, this.enemyGroup, (_p, e) => this.onPlayerTouchEnemy(e as Phaser.GameObjects.Rectangle));
    this.physics.add.overlap(this.player.rect, this.projectiles, (_p, pr) => this.onProjectileHitPlayer(pr as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.projectiles, this.groundGroup, (pr) => this.impactProjectile(pr as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.projectiles, this.mech.wallGroup, (pr) => this.impactProjectile(pr as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.arrows, this.groundGroup, (a) => this.breakArrow(a as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.arrows, this.mech.wallGroup, (a) => this.breakArrow(a as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.arrows, this.mech.crateGroup, (a) => this.breakArrow(a as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player.rect, this.hazards, (_p, h) => {
      if (!this.cutscene) this.player.hurt((h as Phaser.GameObjects.Rectangle).x);
    });

    const cam = this.cameras.main;
    if (L.mode === "chase") {
      cam.setScroll(0, 0);
      this.buildChaseWall();
    } else if (climb) {
      cam.startFollow(this.player.rect, true, 0.12, 0.12, 0, 40);
      cam.setDeadzone(260, 120);
    } else if (this.info.boss && this.info.chapter === 8) {
      cam.setScroll(0, 0);
    } else {
      cam.startFollow(this.player.rect, true, 0.12, 0.1, 0, 60);
      cam.setDeadzone(140, 160);
    }
    cam.fadeIn(450, 0, 0, 0);
    if (L.flood) this.buildFlood();
    if (swim) this.buildWater();

    this.keyboard = new KeyboardInput(this);
    resetTouch();
    this.goal = { kind: info.goal, have: 0, need: info.goal === "gems" ? this.gems.length : info.need };
    this.registry.set("level", info.index);
    this.registry.set("hearts", MAX_HEARTS);
    this.registry.set("goal", { ...this.goal });
    this.registry.set("portalOpen", this.portal.isOpen);
    this.registry.set("boss", null);
    this.publishWeapons();

    Audio.music(this.chapter.music);
    Audio.duck(false);

    this.scene.launch("Hud");
    this.scene.bringToTop("Hud");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killAll();
      this.time.removeAllEvents();
    });
    this.game.events.on("pause-request", this.pauseGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("pause-request", this.pauseGame, this));

    if (this.weaponPickup || this.swordStone) {
      const name = WEAPON_NAMES[this.level.weapon!.kind];
      this.time.delayedCall(900, () => this.toast(`The ${name} glows nearby. Go grab it!`));
      this.time.delayedCall(4200, () => this.toast(info.tip));
    } else {
      this.time.delayedCall(900, () => this.toast(info.tip));
    }
    this.chaseStartAt = this.time.now + 2600;
    this.floodStartAt = this.time.now + 4000;

    if (new URLSearchParams(location.search).has("debug")) this.physics.world.createDebugGraphic();
  }

  // ------------------------------------------------------------------ build

  private buildBackground() {
    // One zoomed image instead of a mirrored tile: no seams. It drifts slowly across the
    // whole level for parallax and is re-placed in world space every frame (see update).
    const key = this.chapter.background;
    // Solid backdrop behind the image so no black bars ever show through
    const bgColor = this.chapter.id === 5 ? 0x1a0f2e : 0x0d0a1a;
    this.add.rectangle(0, 0, GAME_W + 400, GAME_H + 400, bgColor).setOrigin(0).setDepth(-101).setScrollFactor(0);
    this.far = this.add.image(0, 0, key).setOrigin(0).setDepth(-100);
    const zoom = Math.max(GAME_W / this.far.width, GAME_H / this.far.height) * BG_ZOOM;
    this.far.setScale(zoom);
    // The sky tower's bright sky would wash out its white platforms.
    if (this.chapter.id === 6) this.far.setTint(0xaebbe0);
    const amb = this.chapter.ambient;
    this.ambient = this.add
      .particles(0, 0, "dot", {
        x: { min: 0, max: GAME_W },
        y: { min: 40, max: GAME_H - 60 },
        lifespan: 4200,
        speedY: { min: -26, max: -6 },
        speedX: { min: -14, max: 14 },
        scale: { start: 0.32, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: amb.color,
        blendMode: Phaser.BlendModes.ADD,
        frequency: 4200 / amb.count,
      })
      .setDepth(-40);
        // DioramaLook disabled: it was causing a black horizontal bar across the screen.
    // this.look = new DioramaLook(this, this.far, this.chapter);
  }

  /** Keeps screen-fixed layers in world space so they follow the zoomed camera exactly. */
  private placeScreenLayers() {
    const view = this.cameras.main.worldView;
    const climb = this.level.mode === "climb";
    const span = Math.max(1, this.level.width - GAME_W);
    const t = Phaser.Math.Clamp(view.x / span, 0, 1);
    const extra = this.far.displayHeight - GAME_H;
    // Climbing: the sky drifts down slowly as Angely rises.
    const ty = climb ? Phaser.Math.Clamp((view.y - this.level.top) / Math.max(1, GAME_H - this.level.top), 0, 1) : 0.6;
    this.far.setPosition(view.x - (this.far.displayWidth - GAME_W) * t, view.y - extra * ty);
    this.ambient.setPosition(view.x, view.y);
    this.water?.setPosition(view.x, view.y);
    this.bubbles?.setPosition(view.x, view.y);
    this.look?.place(view, this.far, span, t, ty);
  }

  private buildGround() {
    const c = this.chapter.id;
    const key = `ground_${c}`;
    const meta = PROPS[key as keyof typeof PROPS];
    const fill = ({
      1: 0x3b2414, 2: 0x2a2d3c, 3: 0x1d1418, 4: 0x2c3a52, 5: 0x1c1230, 6: 0xd8dcef, 7: 0x1d4a5a,
      8: 0x3a2a14, 9: 0x6a1878, 10: 0x1c3a16, 11: 0x1a1438, 12: 0x1d1418, 13: 0x0d3048,
    } as Record<number, number>)[c] ?? 0x1b0f2e;
    const ground = this.level.ground;
    for (const seg of ground) {
      // The art's walkable edge (top of the grass / stone) sits exactly on the segment's y.
      const top = seg.y - meta.height * meta.surface;
      const len = seg.x1 - seg.x0;
      const body = this.add.rectangle(seg.x0 + len / 2, seg.y + 400, len, 800).setVisible(false);
      this.groundGroup.add(body);
      this.add.rectangle(seg.x0 + len / 2, top + meta.height * 0.5, len - 6, GAME_H + 200, fill).setOrigin(0.5, 0).setDepth(9);
      const n = Math.max(1, Math.round(len / meta.width));
      const w = len / n;
      for (let i = 0; i < n; i++) {
        this.add
          .image(seg.x0 + w * i + w / 2, top, key)
          .setOrigin(0.5, 0)
          .setDisplaySize(w + 2, meta.height)
          .setDepth(10 + (i % 2) * 0.01 + (seg.y < GROUND_Y ? 0.02 : 0));
      }
    }
    this.groundGroup.refresh();
    if (this.chapter.pitKind === "lava") {
      for (let i = 0; i < ground.length - 1; i++) {
        const x0 = ground[i].x1;
        const x1 = ground[i + 1].x0;
        if (x1 - x0 < 8) continue;
        const lava = this.add.rectangle((x0 + x1) / 2, GAME_H - 18, x1 - x0 + 30, 36, 0xff5a1a).setDepth(8);
        this.tweens.add({ targets: lava, alpha: 0.75, duration: 600 + i * 37, yoyo: true, repeat: -1 });
        this.add.rectangle((x0 + x1) / 2, GAME_H - 46, x1 - x0 + 30, 30, 0xffb347, 0.25).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        this.time.addEvent({
          delay: 1800 + i * 211,
          loop: true,
          callback: () => {
            if (Math.abs(this.cameras.main.midPoint.x - (x0 + x1) / 2) < GAME_W) {
              this.fx("fx_lava", "burst", Phaser.Math.Between(x0 + 20, x1 - 20), GAME_H - 6, 0.35);
            }
          },
        });
      }
    }
  }

  private buildPlatforms() {
    const c = this.chapter.id;
    for (const p of this.level.platforms) {
      const key = `${PLATFORM_ART[p.prop]}_${c}`;
      const meta = PROPS[key as keyof typeof PROPS];
      this.add
        .image(p.x, p.y - meta.height * meta.surface, key)
        .setOrigin(0.5, 0)
        .setDisplaySize(meta.width, meta.height)
        .setDepth(12);
      if (this.chapter.id === 6) backPlatform(this, p.x, p.y, meta.width);
      const bw = meta.width * 0.88;
      const body = this.add.rectangle(p.x, p.y + 14, bw, 28).setVisible(false);
      this.platformGroup.add(body);
      const b = body.body as Phaser.Physics.Arcade.StaticBody;
      b.checkCollision.down = false;
      b.checkCollision.left = false;
      b.checkCollision.right = false;
      this.platformTops.push({ x0: p.x - bw / 2, x1: p.x + bw / 2, y: p.y });
    }
    this.platformGroup.refresh();
  }

  private buildProps() {
    const L = this.level;
    const spikes = PROPS[`spikes_${this.chapter.id}` as keyof typeof PROPS];
    for (const s of L.spikes) {
      const w = spikes.width * 0.8;
      const h = spikes.height * 0.8;
      this.add.image(s.x, s.y + 4, `spikes_${this.chapter.id}`).setOrigin(0.5, 1).setDisplaySize(w, h).setDepth(14);
      const zone = this.add.rectangle(s.x, s.y - Math.min(h, 50) / 2, w * 0.75, Math.min(h, 50)).setVisible(false);
      this.hazards.add(zone);
    }

    for (const spot of L.checkpoints) {
      const spr = this.add.sprite(spot.x, spot.y + 4, "flag").setDepth(15);
      spr.setScale(scaleForHeight("flag", 92));
      applyOrigin(spr, "flag");
      spr.play("flag:down").setTint(0x9a94b0);
      this.checkpoints.push({ spot, sprite: spr, active: false });
    }

    for (const h of L.hearts) this.addHeart(h.x, h.y);
    for (const g of L.gems) this.gems.push(this.addBobber("stargem", g.x, g.y, 46));
    for (const s of L.stars) this.stars.push(this.addBobber("starshield", s.x, s.y, 52));

    this.portal = new Portal(this, L.portal.x, !this.info.boss, L.portal.y);
    if (this.info.chapter === 11 && this.info.boss && L.arena) {
      this.veilCage = new CageAngelo(this, (L.arena.x0 + L.arena.x1) / 2);
    }
    if (this.info.goal === "reach") this.portal.open(true);
    else this.portal.setRemaining(this.info.goal === "gems" ? L.gems.length : this.info.need, this.info.goal === "gems" ? "gems" : "left");
    this.buildPortalArrow();
  }

  /** Points at the open portal while it's off screen. */
  private buildPortalArrow() {
    const g = this.add.graphics();
    g.fillStyle(0x9ff5ff, 1).fillTriangle(18, 0, -12, -18, -12, 18);
    g.lineStyle(3, 0x1b0f2e, 1).strokeTriangle(18, 0, -12, -18, -12, 18);
    const t = this.add
      .text(-22, 0, "PORTAL", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#9ff5ff", stroke: "#1b0f2e", strokeThickness: 5 })
      .setOrigin(1, 0.5);
    this.portalArrow = this.add.container(0, 0, [g, t]).setDepth(96).setVisible(false);
  }

  private setupWeapons() {
    const save = loadSave();
    const owned = new Set<WeaponId>([...save.weapons, ...weaponsBefore(this.info.index)]);
    if (owned.size !== save.weapons.length) updateSave({ weapons: WEAPON_ORDER.filter((w) => owned.has(w)) });
    const list = WEAPON_ORDER.filter((w) => owned.has(w));
    for (const w of list) this.player.giveWeapon(w, false);
    if (list.length) this.player.weapon = list[list.length - 1];

    const wp = this.level.weapon;
    if (!wp || owned.has(wp.kind)) return;
    if (wp.kind === "sword") {
      this.swordStone = this.add.sprite(wp.x, wp.y + 84, "sword_stone").setDepth(15);
      this.swordStone.setScale(scaleForHeight("sword_stone", 92));
      applyOrigin(this.swordStone, "sword_stone");
      this.add
        .particles(wp.x, wp.y + 30, "dot", {
          speed: { min: 10, max: 40 },
          scale: { start: 0.35, end: 0 },
          lifespan: 1000,
          tint: 0x9ff5ff,
          blendMode: Phaser.BlendModes.ADD,
          frequency: 90,
        })
        .setDepth(16)
        .setName("swordGlow");
      return;
    }
    const key = `weapon_${wp.kind}` as SpriteKey;
    const sprite = this.add.sprite(wp.x, wp.y, key).setDepth(50);
    sprite.setScale(scaleForHeight(key, 84));
    applyOrigin(sprite, key);
    this.tweens.add({ targets: sprite, y: wp.y - 12, angle: 6, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    const tints: Record<string, number[]> = { bow: [0x9ff5ff, 0xff8fd8], hammer: [0xffc35a, 0xffe7a3], boomerang: [0xbfe6ff, 0xffffff], wand: [0xffe27a, 0xff8fd8], cog: [0xffc35a, 0xfff1c2], ray: [0xff7ad9, 0x9ef6ff] };
    const glow = this.add
      .particles(wp.x, wp.y, "dot", {
        speed: { min: 10, max: 50 },
        scale: { start: 0.4, end: 0 },
        lifespan: 1100,
        tint: tints[wp.kind],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 70,
      })
      .setDepth(49);
    this.weaponPickup = { sprite, kind: wp.kind, glow };
  }

  private publishWeapons() {
    this.registry.set("weapons", [...this.player.weapons]);
    this.registry.set("weapon", this.player.weapon);
  }

  private addHeart(x: number, y: number) {
    const spr = this.add.sprite(x, y, "heart").setDepth(50);
    spr.setScale(scaleForHeight("heart", 34));
    applyOrigin(spr, "heart");
    spr.play("heart:glow");
    const p: Pickup = { sprite: spr, baseY: y, taken: false };
    this.tweens.add({ targets: spr, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.hearts.push(p);
    return p;
  }

  addHazard(zone: Phaser.GameObjects.Rectangle) {
    this.hazards.add(zone);
  }

  // ----------------------------------------------------------- level modes

  /** The collapse (ruins) or avalanche (ice) that chases Angely in chase levels. */
  private buildChaseWall() {
    const ice = this.chapter.id === 4;
    const color = ice ? 0xf2f8ff : 0x3a3048;
    const body = this.add.rectangle(-40, -100, 120, GAME_H + 300, color).setOrigin(0, 0);
    const edge = this.add.image(80, GAME_H / 2, "glow").setTint(ice ? 0xffffff : 0x8a7fa8).setDisplaySize(220, GAME_H * 1.6).setAlpha(0.8);
    this.chaseWall = this.add.container(0, 0, [body, edge]).setDepth(70);
    this.chaseDust = this.add
      .particles(0, 0, "dot", {
        x: { min: -20, max: 110 },
        y: { min: -40, max: GAME_H },
        speedX: { min: 40, max: 160 },
        speedY: ice ? { min: 40, max: 160 } : { min: 120, max: 320 },
        scale: { start: ice ? 1.1 : 0.9, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 900,
        tint: ice ? [0xffffff, 0xe6f6ff, 0xcfe8ff] : [0x6a5f80, 0x8a7a9a, 0x4a4060],
        frequency: 16,
      })
      .setDepth(71);
  }

  private updateChase(time: number, delta: number) {
    const cam = this.cameras.main;
    const p = this.player;
    const maxX = this.level.width - GAME_W;
    if (!this.chaseOn && (time > this.chaseStartAt || p.x > 700) && p.alive && !this.cutscene) {
      this.chaseOn = true;
      Audio.sfx("boss_roar");
      cam.shake(600, 0.006);
      const rush = this.chapter.id === 4 ? "AVALANCHE!" : this.chapter.id === 8 ? "SANDSTORM!" : "RUN!";
      this.game.events.emit("hud:banner", rush);
    }
    if (this.chaseOn && !this.ending && p.alive) {
      const k = Phaser.Math.Clamp(this.chaseX / maxX, 0, 1);
      const speed = 96 + 36 * k;
      this.chaseX = Math.min(maxX, this.chaseX + (speed * delta) / 1000);
      if (Math.floor(time / 900) !== Math.floor((time - delta) / 900)) cam.shake(200, 0.0025);
    }
    const target = Phaser.Math.Clamp(Math.max(this.chaseX, p.x - 820), 0, maxX);
    cam.setScroll(target, 0);
    if (!this.chaseOn) this.chaseX = Math.max(0, Math.min(target, p.x - 500));
    const left = this.chaseOn ? this.chaseX : -400;
    this.chaseWall?.setPosition(left, 0);
    this.chaseDust?.setPosition(left, 0);
    if (this.chaseOn && p.alive && !this.ending && p.x < this.chaseX + 90) {
      this.toast("Caught! Keep running!");
      p.fall(...this.safeSpotAhead());
    }
  }

  /** Solid ground a little ahead of the chase wall, for respawning. */
  private safeSpotAhead(): [number, number] {
    for (let x = this.chaseX + 380; x < this.chaseX + 1100; x += 20) {
      const seg = groundAt(this.level.ground, x, 50);
      if (seg && !this.mech.blocked(x)) return [x, seg.y - 80];
    }
    return [this.respawn.x, this.respawn.y];
  }

  /** Climb levels: the storm flood rising from below. */
  private buildFlood() {
    this.floodY = GROUND_Y + 220;
    const body = this.add.rectangle(0, 0, GAME_W + 200, 1600, 0x22073d, 0.9).setOrigin(0, 0);
    const top = this.add.image(GAME_W / 2, 0, "glow").setTint(0xb57cff).setDisplaySize(GAME_W * 2.2, 120).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
    const sparks = this.add.particles(0, 0, "dot", {
      x: { min: 0, max: GAME_W },
      y: { min: -10, max: 20 },
      speedY: { min: -90, max: -20 },
      lifespan: 700,
      scale: { start: 0.5, end: 0 },
      tint: [0xd2a4ff, 0xfff27a],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 30,
    });
    this.flood = this.add.container(-100, this.floodY, [body, top, sparks]).setDepth(75);
  }

  private updateFlood(time: number, delta: number) {
    if (!this.flood) return;
    const p = this.player;
    if (time > this.floodStartAt && !this.ending && !this.cutscene && p.alive) {
      if (this.floodStartAt && time - delta <= this.floodStartAt) this.toast("The storm is rising! CLIMB!");
      const climbed = Phaser.Math.Clamp((GROUND_Y - this.floodY) / (GROUND_Y - this.level.top), 0, 1);
      // Never fall too far behind Angely, never rush her.
      const lag = this.floodY - p.body.bottom;
      const speed = (34 + 22 * climbed) * (lag > 700 ? 3 : 1);
      this.floodY -= (speed * delta) / 1000;
      if (Math.floor(time / 2600) !== Math.floor((time - delta) / 2600)) {
        this.cameras.main.flash(120, 140, 90, 200);
        Audio.sfx("boss_swoop");
      }
    }
    this.flood.setY(this.floodY);
    for (const e of this.enemies) if (e.alive && e.body.top > this.floodY + 20) e.remove();
    if (p.alive && !this.ending && p.body.bottom > this.floodY + 24) {
      this.toast("Swept by the storm!");
      p.fall(this.respawn.x, this.respawn.y);
      this.floodY = Math.max(this.floodY, this.respawn.y + 560);
    }
  }

  private buildWater() {
    this.water = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e6fb8, 0.16).setOrigin(0).setDepth(94);
    this.bubbles = this.add
      .particles(0, 0, "dot", {
        x: { min: 0, max: GAME_W },
        y: GAME_H + 10,
        speedY: { min: -120, max: -50 },
        speedX: { min: -10, max: 10 },
        lifespan: 5200,
        scale: { start: 0.18, end: 0.42 },
        alpha: { start: 0.55, end: 0 },
        tint: 0xdff8ff,
        frequency: 110,
      })
      .setDepth(93);
  }

  // ----------------------------------------------------------------- update

  update(time: number, delta: number) {
    let input = this.keyboard.read();
    this.jumpHeld = input.jumpHeld;
    if (input.pausePressed && !this.cutscene) this.pauseGame();

    if (this.level.mode === "chase") this.updateChase(time, delta);
    this.placeScreenLayers();
    this.portal.update(time, delta);

    if (this.ending) {
      this.player.update(time, delta, NO_INPUT);
      return;
    }
    if (this.cutscene) input = this.scriptedInput();
    if (input.swapPressed) this.swapWeapon();

    this.player.pushing = this.mech.pushCheck(this.player, input.axis);
    this.player.update(time, delta, input);
    this.veilCage?.lookAt(this.player.x);
    if (this.boss && this.veilCage) this.veilCage.update(time, this.boss.hp, this.boss.maxHp, "attacking" in this.boss && !!this.boss.attacking);
    const shield = this.player.shieldLeft() > 0 ? Math.ceil(this.player.shieldLeft() / 1000) : 0;
    if (shield !== this.shieldShown) {
      this.shieldShown = shield;
      this.registry.set("shield", shield);
    }
    const frozen = this.aiFrozen || this.cutscene;
    for (const e of this.enemies) e.update(time, frozen);
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.boss && !this.cutscene) this.boss.update(time, delta);
    else this.boss?.update(time, 0);
    this.mech.update(time, delta);
    this.updateFlood(time, delta);

    this.checkFall();
    this.checkPickups(time);
    this.updateProjectiles();
    this.updateArrows();
    this.checkBoss();
    if (time > this.nextDespawn) this.despawnFar(time);
    if (!frozen && !this.info.boss) this.spawnTick(time);
    this.updatePortalArrow(time);

    if (this.player.hearts === 1 && this.player.alive && time - this.lastLowHealth > 4000) {
      this.lastLowHealth = time;
      Audio.sfx("low_health");
    }
  }

  private scriptedInput(): FrameInput {
    let axis = 0;
    if (this.scriptX !== null) {
      const dx = this.scriptX - this.player.x;
      if (Math.abs(dx) > 10) axis = Math.sign(dx) * 0.55;
      else this.scriptX = null;
    }
    return { ...NO_INPUT, axis };
  }

  private swapWeapon() {
    const w = this.player.swapWeapon();
    if (!w) return;
    Audio.sfx("weapon_swap");
    this.publishWeapons();
  }

  private updatePortalArrow(time: number) {
    const view = this.cameras.main.worldView;
    const climb = this.level.mode === "climb";
    const off = climb ? this.portal.cy < view.y + 10 : this.portal.cx > view.right - 20 || this.portal.cx < view.x + 20;
    const show = this.portal.isOpen && !this.ending && !this.cutscene && off && this.portal.visible;
    this.portalArrow.setVisible(show);
    if (!show) return;
    const bob = Math.sin(time / 160) * 8;
    const label = this.portalArrow.list[1] as Phaser.GameObjects.Text;
    if (climb) {
      this.portalArrow.setPosition(view.centerX + 260, view.y + 130 - bob).setAngle(-90).setScale(1);
      label.setAngle(90).setOrigin(0.5, -0.6).setScale(1);
      return;
    }
    const right = this.portal.cx > view.right;
    this.portalArrow.setAngle(0).setPosition(right ? view.right - 40 + bob : view.x + 40 - bob, view.y + 190);
    this.portalArrow.setScale(right ? 1 : -1, 1);
    label.setAngle(0).setScale(right ? 1 : -1, 1).setOrigin(right ? 1 : 0, 0.5);
  }

  private checkFall() {
    const p = this.player;
    if (!p.alive) return;
    const limit = this.chapter.pitKind === "lava" ? GAME_H - 24 : GAME_H + 80;
    if (p.body.bottom > limit) {
      if (this.chapter.pitKind === "lava") this.fx("fx_lava", "burst", p.x, GAME_H - 4, 0.45);
      if (this.level.mode === "chase" && this.chaseOn) p.fall(...this.safeSpotAhead());
      else p.fall(this.respawn.x, this.respawn.y);
    }
  }

  private setGoal(have: number) {
    this.goal.have = have;
    this.registry.set("goal", { ...this.goal });
    const left = this.goal.need - have;
    this.portal.setRemaining(left, this.goal.kind === "gems" ? "gems" : "left");
    if (left <= 0 && !this.portal.isOpen) this.openPortal();
  }

  private checkPickups(time: number) {
    const pb = this.player.bounds();
    for (const h of this.hearts) {
      if (h.taken) continue;
      const hb = new Phaser.Geom.Rectangle(h.sprite.x - 18, h.sprite.y - 18, 36, 36);
      if (!Phaser.Geom.Rectangle.Overlaps(pb, hb)) continue;
      if (this.player.heal()) {
        h.taken = true;
        Audio.sfx("heart_pickup");
        this.tweens.killTweensOf(h.sprite);
        this.tweens.add({ targets: h.sprite, scale: h.sprite.scale * 2, alpha: 0, y: h.sprite.y - 30, duration: 350, onComplete: () => h.sprite.destroy() });
        this.fx("fx_spark", "hit", h.sprite.x, h.sprite.y, 0.25, 0xff8fb0);
      }
    }
    this.hearts = this.hearts.filter((h) => !h.taken);

    for (const g of this.gems) {
      if (g.taken) continue;
      const gb = new Phaser.Geom.Rectangle(g.sprite.x - 22, g.sprite.y - 22, 44, 44);
      if (!Phaser.Geom.Rectangle.Overlaps(pb, gb)) continue;
      g.taken = true;
      Audio.sfx("gem");
      this.tweens.killTweensOf(g.sprite);
      this.tweens.add({ targets: g.sprite, scale: 1.6, alpha: 0, y: g.sprite.y - 40, duration: 400, onComplete: () => g.sprite.destroy() });
      this.fx("fx_spark", "hit", g.sprite.x, g.sprite.y, 0.35, 0x9ff5ff);
      const have = this.goal.have + 1;
      this.setGoal(have);
      if (have < this.goal.need) this.toast(`Star gem ${have} / ${this.goal.need}`);
    }

    for (const s of this.stars) {
      if (s.taken) continue;
      const sb = new Phaser.Geom.Rectangle(s.sprite.x - 24, s.sprite.y - 24, 48, 48);
      if (!Phaser.Geom.Rectangle.Overlaps(pb, sb)) continue;
      s.taken = true;
      Audio.sfx("heart_pickup");
      this.player.grantShield();
      this.tweens.killTweensOf(s.sprite);
      this.tweens.add({ targets: s.sprite, scale: s.sprite.scale * 1.8, alpha: 0, y: s.sprite.y - 36, duration: 380, onComplete: () => s.sprite.destroy() });
      this.fx("fx_spark", "hit", s.sprite.x, s.sprite.y, 0.45, 0xfff27a);
      this.toast("Star Shield! Nothing can touch you for 15 seconds.");
    }
    this.stars = this.stars.filter((s) => !s.taken);

    for (const c of this.checkpoints) {
      if (!c.active && Math.abs(this.player.x - c.spot.x) < 40 && Math.abs(this.player.body.bottom - c.spot.y) < 30 && this.player.alive) {
        c.active = true;
        this.respawn = { x: c.spot.x, y: c.spot.y - 80 };
        c.sprite.clearTint().play("flag:up");
        Audio.sfx("checkpoint");
        this.toast("Checkpoint!");
        this.fx("fx_spark", "hit", c.spot.x, c.spot.y - 70, 0.3, 0xffe27a);
      }
    }

    if (this.swordStone && Math.abs(this.player.x - this.swordStone.x) < 50 && this.player.grounded && this.player.alive) {
      this.collectSword();
    }
    const wp = this.weaponPickup;
    if (wp && Math.abs(this.player.x - wp.sprite.x) < 50 && Math.abs(this.player.body.center.y - wp.sprite.y) < 110 && this.player.alive) {
      this.collectWeapon();
    }

    const nearPortal = Math.abs(this.player.x - this.portal.cx) < 40 && Math.abs(this.player.body.bottom - this.portal.baseY) < 60;
    if (nearPortal && this.player.alive && !this.cutscene && this.portal.visible) {
      if (this.portal.isOpen) this.enterPortal();
      else if (time - this.lastPortalHint > 3000) {
        this.lastPortalHint = time;
        const left = this.goal.need - this.goal.have;
        this.toast(this.goal.kind === "gems" ? `The portal is sealed. Find ${left} more star gem${left === 1 ? "" : "s"}!` : `The portal is sealed. Defeat ${left} more enemies!`);
      }
    }
  }

  private weaponToast(w: WeaponId) {
    const pad = Gamepad.connected;
    const touch = useTouchUi(this) && !pad;
    const attack = touch ? `tap ${w.toUpperCase()}` : pad ? "press X" : "press J";
    const swap = this.player.weapons.length > 1 ? (touch ? " • SWAP to change" : pad ? " • Y to swap" : " • Q to swap") : "";
    const what: Record<WeaponId, string> = { sword: "attack", bow: "shoot arrows", hammer: "smash", boomerang: "throw it (it comes back!)", wand: "cast homing stars", cog: "throw the saw (it cuts through armor)", ray: "zap a pink bolt" };
    this.toast(`${WEAPON_NAMES[w]} found! ${attack[0].toUpperCase()}${attack.slice(1)} to ${what[w]}${swap}`);
  }

  private collectSword() {
    const stone = this.swordStone!;
    this.swordStone = undefined;
    this.player.facing = stone.x > this.player.x ? 1 : -1;
    this.player.playPickup(() => {
      this.player.giveWeapon("sword");
      this.publishWeapons();
      this.weaponToast("sword");
    });
    addWeapon("sword");
    Audio.sfx("sword_pickup");
    this.cameras.main.flash(300, 200, 240, 255);
    stone.setTint(0x777788);
    (this.children.getByName("swordGlow") as Phaser.GameObjects.Particles.ParticleEmitter | null)?.stop();
    this.fx("fx_spark", "hit", stone.x, stone.y - 60, 0.45, 0x9ff5ff);
  }

  private collectWeapon() {
    const wp = this.weaponPickup!;
    this.weaponPickup = undefined;
    addWeapon(wp.kind);
    wp.glow.stop();
    this.tweens.killTweensOf(wp.sprite);
    Audio.sfx("weapon_pickup");
    this.cameras.main.flash(300, 255, 230, 180);
    this.fx("fx_spark", "hit", wp.sprite.x, wp.sprite.y, 0.5, 0xffe27a);
    this.tweens.add({ targets: wp.sprite, x: this.player.x, y: this.player.body.top - 60, scale: wp.sprite.scale * 1.3, angle: 0, duration: 400, ease: "Back.out" });
    this.tweens.add({ targets: wp.sprite, alpha: 0, delay: 900, duration: 300, onComplete: () => wp.sprite.destroy() });
    this.player.playPickup(() => {
      this.player.giveWeapon(wp.kind);
      this.publishWeapons();
      this.weaponToast(wp.kind);
    }, false);
  }

  // ----------------------------------------------------------------- combat

  private onPlayerTouchEnemy(rect: Phaser.GameObjects.Rectangle) {
    const e = rect.getData("enemy") as Enemy | undefined;
    const p = this.player;
    if (!e || !e.alive || !p.alive || this.ending || this.cutscene) return;
    const stomping = p.body.velocity.y > 40 && p.prevBottom <= e.body.top + 18 + p.body.velocity.y * 0.02;
    if (stomping) {
      p.stompBounce(this.keyboardJumpHeld());
      Audio.sfx("stomp");
      this.fx("fx_dust", "puff", e.x, e.body.top + 10, 0.28);
      e.takeDamage(1, "stomp", p.x);
      return;
    }
    if (e.harmful) p.hurt(e.x);
  }

  private keyboardJumpHeld() {
    return this.jumpHeld || touchState.jumpHeld;
  }

  private enemyBounds(e: Enemy) {
    return new Phaser.Geom.Rectangle(e.body.x, e.body.y, e.body.width, e.body.height);
  }

  /** Damage everything overlapping r once (tracked in hits). Returns true if anything was hit. */
  private hitArea(r: Phaser.Geom.Rectangle, hits: Set<unknown>, dmg: number, kind: DamageKind, fromX: number, tint?: number) {
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive || hits.has(e) || !Phaser.Geom.Rectangle.Overlaps(r, this.enemyBounds(e))) continue;
      hits.add(e);
      if (e.takeDamage(dmg, kind, fromX)) this.fx("fx_spark", "hit", e.x, e.body.center.y, 0.28, tint);
      any = true;
    }
    if (this.boss?.vulnerable && !hits.has(this.boss) && Phaser.Geom.Rectangle.Overlaps(r, this.boss.hitbox())) {
      hits.add(this.boss);
      this.boss.takeDamage(dmg, kind, fromX);
      any = true;
    }
    return any;
  }

  swordHit(r: Phaser.Geom.Rectangle, hits: Set<unknown>) {
    const before = hits.size;
    this.hitArea(r, hits, 1, "sword", this.player.x);
    if (hits.size > before) {
      Audio.sfx("sword_hit");
      this.cameras.main.shake(70, 0.004);
    }
    if (!hits.has(this.mech) && this.mech.swordAt(r)) hits.add(this.mech);
    this.projectiles.getChildren().forEach((obj) => {
      const pr = obj as Phaser.Physics.Arcade.Sprite;
      if (pr.active && Phaser.Geom.Rectangle.Overlaps(r, pr.getBounds())) this.impactProjectile(pr);
    });
  }

  hammerHit(r: Phaser.Geom.Rectangle, hits: Set<unknown>, impactX: number, floorY: number, grounded: boolean) {
    Audio.sfx("hammer_smash");
    this.cameras.main.shake(160, grounded ? 0.01 : 0.005);
    if (grounded) {
      this.fx("fx_dust", "puff", impactX - 30, floorY, 0.4);
      this.fx("fx_dust", "puff", impactX + 30, floorY, 0.4);
      this.fx("fx_spark", "hit", impactX, floorY - 20, 0.4, 0xffc35a);
    }
    for (const e of this.enemies) {
      if (!e.alive || hits.has(e)) continue;
      const eb = this.enemyBounds(e);
      const shock = grounded && !e.type.flying && Math.abs(e.x - impactX) < 200 && Math.abs(e.body.bottom - floorY) < 30;
      if (!Phaser.Geom.Rectangle.Overlaps(r, eb) && !shock) continue;
      hits.add(e);
      if (e.takeDamage(Phaser.Geom.Rectangle.Overlaps(r, eb) ? 2 : 1, "hammer", this.player.x)) this.fx("fx_spark", "hit", e.x, e.body.center.y, 0.32, 0xffc35a);
    }
    if (this.boss && !hits.has(this.boss) && Phaser.Geom.Rectangle.Overlaps(r, this.boss.hitbox())) {
      hits.add(this.boss);
      this.boss.takeDamage(2, "hammer", this.player.x);
    }
    this.mech.hammerAt(r);
  }

  /** Living targets for auto-aim and homing: enemies, Umbra and star targets. */
  private aimTargets() {
    const pts: { x: number; y: number; cone: number }[] = [
      ...this.enemies.filter((e) => e.alive).map((e) => ({ x: e.x, y: e.body.center.y, cone: 0.9 })),
      ...this.mech.aimPoints().map((p) => ({ ...p, cone: 2 })),
    ];
    if (this.boss?.vulnerable) pts.push({ x: this.boss.x, y: this.boss.y, cone: 1.2 });
    return pts;
  }

  shootArrow(x: number, y: number, dir: 1 | -1) {
    Audio.sfx("bow_shoot");
    let ang = dir > 0 ? 0 : Math.PI;
    // Gentle auto-aim toward the nearest target in front. Star targets hang high over
    // pits, so they get a much wider cone.
    let best = Infinity;
    for (const p of this.aimTargets()) {
      const dx = (p.x - x) * dir;
      const dy = p.y - y;
      if (dx < 20 || dx > 760 || Math.abs(dy) > dx * p.cone) continue;
      const d = dx + Math.abs(dy) * 1.5;
      if (d < best) {
        best = d;
        ang = Math.atan2(dy, p.x - x);
      }
    }
    this.launch("fx_arrow", x, y, ang, ARROW_SPEED, 22, "arrow", 900);
  }

  /** Spawns a player projectile that the per-frame arrow logic moves and resolves. */
  private launch(key: SpriteKey, x: number, y: number, ang: number, speed: number, h: number, kind: string, life: number) {
    const a = this.physics.add.sprite(x, y, key).setDepth(85);
    a.setScale(scaleForHeight(key, h));
    applyOrigin(a, key);
    this.arrows.add(a);
    const body = a.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(SPRITES[key].frameWidth * 0.5, SPRITES[key].frameHeight * 0.6);
    body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    a.setRotation(ang);
    a.setData("born", this.time.now);
    a.setData("life", life);
    a.setData("kind", kind);
    a.setData("hits", new Set());
    return a;
  }

  /** The moon boomerang flies out, then curves back to Angely, hitting everything on the way. */
  /** A fast pink bolt. It pops on the first thing it hits. */
  shootRay(x: number, y: number, dir: 1 | -1) {
    Audio.sfx("ray");
    this.launch("fx_ray", x, y, dir > 0 ? 0 : Math.PI, 1180, 26, "ray", 650);
  }

  /** The cog saw flies straight and keeps going through armored enemies. */
  throwCog(x: number, y: number, dir: 1 | -1) {
    Audio.sfx("cog");
    this.launch("weapon_cog", x, y, dir > 0 ? 0 : Math.PI, 920, 42, "cog", 780);
  }

  throwBoomerang(x: number, y: number, dir: 1 | -1) {
    if (this.boomerangOut) return;
    this.boomerangOut = true;
    Audio.sfx("boomerang");
    const b = this.launch("weapon_boomerang", x, y, dir > 0 ? 0 : Math.PI, 760, 46, "boomerang", 2600);
    b.setData("dir", dir);
  }

  /** The star wand releases three stars that home in on the nearest enemies. */
  castStars(x: number, y: number, dir: 1 | -1) {
    Audio.sfx("wand_cast");
    [-0.35, 0, 0.35].forEach((spread, i) => {
      const ang = (dir > 0 ? 0 : Math.PI) + spread * dir;
      const s = this.launch("fx_star", x, y, ang, 520, 20, "star", 1500);
      s.setData("seekAfter", this.time.now + 80 + i * 40);
    });
  }

  private updateArrows() {
    const now = this.time.now;
    const dt = this.game.loop.delta / 1000;
    this.arrows.getChildren().forEach((obj) => {
      const a = obj as Phaser.Physics.Arcade.Sprite;
      if (!a.active) return;
      const body = a.body as Phaser.Physics.Arcade.Body;
      const kind = a.getData("kind") as string;
      const age = now - (a.getData("born") as number);
      if (age > (a.getData("life") as number)) {
        this.breakArrow(a);
        return;
      }
      if (kind === "cog") a.rotation += 0.62;
      if (kind === "boomerang") {
        a.rotation += 0.45;
        const p = this.player;
        if (age > 420) {
          const ang = Math.atan2(p.body.center.y - a.y, p.x - a.x);
          const sp = Math.min(900, 300 + age);
          body.setVelocity(Phaser.Math.Linear(body.velocity.x, Math.cos(ang) * sp, 0.18), Phaser.Math.Linear(body.velocity.y, Math.sin(ang) * sp, 0.18));
          if (Phaser.Math.Distance.Between(a.x, a.y, p.x, p.body.center.y) < 40) {
            this.boomerangOut = false;
            a.destroy();
            return;
          }
          if (age > 600 && (a.getData("hits") as Set<unknown>).size && !a.getData("cleared")) {
            a.setData("cleared", true);
            (a.getData("hits") as Set<unknown>).clear();
          }
        } else body.velocity.x *= 0.985;
      } else if (kind === "star") {
        a.rotation += 0.2;
        if (now > (a.getData("seekAfter") as number)) {
          let tgt: { x: number; y: number } | null = null;
          let best = 650;
          for (const t of this.aimTargets()) {
            const d = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
            if (d < best) {
              best = d;
              tgt = t;
            }
          }
          if (tgt) {
            const ang = Math.atan2(tgt.y - a.y, tgt.x - a.x);
            const cur = Math.atan2(body.velocity.y, body.velocity.x);
            const turned = Phaser.Math.Angle.RotateTo(cur, ang, 8 * dt);
            body.setVelocity(Math.cos(turned) * 640, Math.sin(turned) * 640);
          }
        }
      }
      const r = new Phaser.Geom.Rectangle(a.x - 16, a.y - 12, 32, 24);
      if (this.mech.arrowAt(r)) {
        if (kind !== "boomerang") this.breakArrow(a);
        return;
      }
      const hits = a.getData("hits") as Set<unknown>;
      const cog = kind === "cog";
      const tint = cog ? 0xffc35a : kind === "star" ? 0xffe27a : kind === "ray" ? 0xff7ad9 : 0x9ff5ff;
      if (this.hitArea(r, hits, 1, cog ? "cog" : "arrow", a.x - body.velocity.x, tint)) {
        Audio.sfx(cog ? "cog" : "arrow_hit");
        if (!cog && kind !== "boomerang") this.breakArrow(a);
        else if (cog && hits.size >= 4) this.breakArrow(a);
      }
    });
  }

  private breakArrow(a: Phaser.Physics.Arcade.Sprite) {
    if (!a.active) return;
    if (a.getData("kind") === "boomerang") {
      // Boomerangs fly through walls and always come home (or expire).
      if (this.time.now - (a.getData("born") as number) < (a.getData("life") as number)) return;
      this.boomerangOut = false;
    }
    this.fx("fx_spark", "hit", a.x, a.y, 0.18, 0x9ff5ff);
    a.destroy();
  }

  onEnemyKilled(e: Enemy) {
    this.fx("fx_explode", "boom", e.x, e.body.center.y, 0.3);
    if (e.type.heartDrop && Math.random() < e.type.heartDrop) {
      const floor = this.surfaceBelow(e.x, e.body.bottom - 4) ?? e.body.bottom;
      const h = this.addHeart(e.x, (e.type.flying ? floor - 40 : Math.min(e.body.top, floor - 40)) - 30);
      this.tweens.add({ targets: h.sprite, scale: { from: 0, to: h.sprite.scale }, duration: 300, ease: "Back.out" });
    }
    if (this.info.boss) return;
    this.kills++;
    if (this.goal.kind === "kills") this.setGoal(this.kills);
  }

  private openPortal() {
    this.registry.set("portalOpen", true);
    this.portal.open();
    Audio.sfx("portal_unlock");
    this.cameras.main.flash(400, 180, 240, 255);
    this.game.events.emit("hud:banner", "PORTAL UNLOCKED!");
    this.time.delayedCall(1800, () => this.toast(this.portal.cx > this.player.x ? "Head right to the portal!" : "Head back to the portal!"));
  }

  private enterPortal() {
    if (this.ending) return;
    this.ending = true;
    const p = this.player;
    p.freeze();
    p.body.setAllowGravity(false);
    Audio.sfx("portal_enter");
    for (const e of this.enemies) e.remove();
    this.projectiles.clear(true, true);
    this.portal.swallow(p.sprite, () => {
      if (this.info.index < LAST_LEVEL) {
        const next = this.info.index + 1;
        unlockLevel(next);
        if (this.info.boss) updateSave({ cleared: true });
        this.cameras.main.fadeOut(500, 255, 255, 255);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.stop("Hud");
          this.scene.start("Splash", { level: next });
        });
      } else {
        updateSave({ cleared: true });
        this.cameras.main.flash(600, 255, 255, 255);
        Audio.music("music_victory");
        this.game.events.emit("hud:victory");
      }
    });
  }

  onHeartsChanged(n: number) {
    this.registry.set("hearts", n);
  }

  onPlayerDefeated(animated: boolean) {
    this.aiFrozen = true;
    this.projectiles.clear(true, true);
    this.time.delayedCall(animated ? 1400 : 700, () => {
      this.physics.pause();
      Audio.music("music_game_over");
      this.game.events.emit("hud:gameover", { level: this.info.index, goal: { ...this.goal } });
    });
  }

  private pauseGame() {
    if (this.ending || this.cutscene || this.time.now < this.pauseBlockedUntil || !this.player.alive || !this.scene.isActive()) return;
    resetTouch();
    this.scene.pause();
    Audio.duck(true);
    this.game.events.emit("hud:paused");
  }

  // ------------------------------------------------------------- boss fight

  private checkBoss() {
    const arena = this.level.arena;
    if (!arena) return;
    if (!this.bossStarted && this.player.x > arena.x0 + 120 && this.player.alive) {
      this.bossStarted = true;
      void this.bossIntro();
    }
    const b = this.boss;
    const p = this.player;
    if (!b || !p.alive || this.cutscene || !b.alive) return;
    const hb = b.hitbox();
    if (!Phaser.Geom.Rectangle.Overlaps(p.bounds(), hb)) return;
    const stomping = p.body.velocity.y > 40 && p.prevBottom <= hb.top + 22 + p.body.velocity.y * 0.02;
    if (stomping) {
      p.stompBounce(this.keyboardJumpHeld());
      Audio.sfx("stomp");
      this.fx("fx_dust", "puff", p.x, hb.top + 10, 0.3);
      b.takeDamage(2, "stomp", p.x);
    } else if (b.harmful) p.hurt(b.x);
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve));
  }

  say(lines: DialogueLine[], onLine?: (line: DialogueLine) => void) {
    return new Promise<void>((resolve) =>
      this.game.events.emit("hud:dialogue", {
        lines,
        onLine,
        done: () => {
          // The key that skipped the dialogue (Esc / Menu) must not also pause the game.
          this.pauseBlockedUntil = this.time.now + 450;
          resolve();
        },
      }),
    );
  }

  cinema(on: boolean, ms = 600) {
    this.game.events.emit("hud:cinema", on);
    this.cinemaCamera(on, ms);
  }

  private async sentinelIntro() {
    // No cutscene - the Sentinel just rises and fights.
    const arena = this.level.arena!;
    this.mech.addBarrier(arena.x0 - 20);
    this.mech.addBarrier(arena.x1 + 20);
    Audio.sfx("boss_roar");
    this.cameras.main.shake(600, 0.006);
    const sentinel = new RuinSentinel(this, arena.x1 - 200, arena);
    (this as any).boss = sentinel;
    this.registry.set("boss", { name: SENTINEL_NAME, hp: sentinel.hp, max: sentinel.maxHp });
    this.game.events.emit("hud:banner", SENTINEL_NAME);
    sentinel.begin();
  }

  private async wormIntro() {
    const arena = this.level.arena!;
    const cam = this.cameras.main;
    this.cutscene = true;
    cam.stopFollow();
    cam.setScroll(0, 0);
    Audio.stopMusic();
    this.cinema(true, 700);
    this.mech.addBarrier(arena.x0 - 20);
    this.mech.addBarrier(arena.x1 + 20);
    await this.wait(600);
    Audio.sfx("boss_roar");
    cam.shake(900, 0.008);
    const worm = new Sandworm(this, arena.x1 - 260, arena);
    this.boss = worm;
    await this.wait(1400);
    this.player.facing = 1;
    await this.say(WORM_INTRO);
    this.cinema(false, 500);
    this.registry.set("boss", { name: WORM_NAME, hp: worm.hp, max: worm.maxHp });
    this.game.events.emit("hud:banner", WORM_NAME);
    Audio.music("music_boss");
    worm.begin();
    this.cutscene = false;
  }

  private async wormOutro() {
    this.cutscene = true;
    this.registry.set("boss", null);
    for (const e of this.enemies) e.remove();
    this.projectiles.clear(true, true);
    Audio.stopMusic();
    await this.wait(900);
    this.cinema(true, 600);
    this.boss?.vanish();
    await this.wait(500);
    await angeloPraise(this, this.level.arena!);
    this.portal.appear();
    this.portal.open();
    Audio.sfx("portal_unlock");
    Audio.music("music_title");
    this.cinema(false, 500);
    this.game.events.emit("hud:banner", "TO THE SQUISHY VALLEY!");
    this.cutscene = false;
    this.time.delayedCall(1400, () => this.toast("The stone arch leads to the squishies. Angelo took the blue gate."));
  }

  private async veilIntro() {
    if (this.veilState !== "idle") return;
    this.veilState = "intro";
    const arena = this.level.arena!;
    const cam = this.cameras.main;
    const mid = (arena.x0 + arena.x1) / 2;
    this.cutscene = true;
    cam.stopFollow();
    Audio.stopMusic();
    this.game.events.emit("hud:cinema", true);
    this.mech.addBarrier(arena.x0 - 20);
    this.mech.addBarrier(arena.x1 + 20);
    this.scriptX = arena.x0 + 220;
    cam.setBounds(0, 0, this.level.width, GAME_H);
    const cage = this.veilCage ?? (this.veilCage = new CageAngelo(this, mid));
    cam.pan(cage.x, GAME_H / 2 - 40, 900, "Sine.easeInOut");
    await this.wait(1100);
    cage.react("grip", 1600);
    await this.wait(700);
    Audio.sfx("boss_roar");
    cam.shake(500, 0.007);
    cam.pan(mid + 180, GAME_H / 2, 800, "Sine.easeInOut");
    const boss = new CrystalVeilBoss(this, arena.x1 + 40, arena);
    boss.sprite.setAlpha(0);
    this.boss = boss;
    this.tweens.add({ targets: boss.sprite, alpha: 1, duration: 400 });
    this.tweens.add({ targets: boss, x: arena.x1 - 280, duration: 1400, ease: "Sine.out" });
    await this.wait(1500);
    this.player.facing = 1;
    try {
      await this.say(VEIL_INTRO);
    } finally {
      this.game.events.emit("hud:cinema", false);
      cam.pan(this.player.x, GAME_H / 2, 500, "Sine.easeInOut", true, (_c, p) => {
        if (p === 1) cam.startFollow(this.player.rect, true, 0.12, 0.1, 0, 60);
      });
      this.registry.set("boss", { name: VEIL_NAME, hp: boss.hp, max: boss.maxHp });
      this.game.events.emit("hud:banner", VEIL_NAME);
      Audio.music("music_boss");
      boss.begin();
      this.veilState = "fight";
      this.cutscene = false;
      this.scriptX = null;
    }
  }

  private async veilOutro() {
    if (this.veilState !== "fight") return;
    this.veilState = "defeat";
    this.cutscene = true;
    this.registry.set("boss", null);
    for (const e of this.enemies) e.remove();
    this.projectiles.clear(true, true);
    this.hazards.getChildren().forEach((h) => h.destroy());
    Audio.stopMusic();
    this.game.events.emit("hud:cinema", true);
    const cam = this.cameras.main;
    cam.stopFollow();
    await this.wait(2000);
    this.boss?.vanish();
    const cage = this.veilCage;
    if (cage) cam.pan(cage.x, GAME_H / 2 - 40, 700, "Sine.easeInOut");
    await this.wait(800);
    this.scriptX = cage ? cage.x - 90 : this.player.x;
    await this.say(VEIL_DEFEAT);
    await this.wait(400);
    this.veilState = "rescue";
    const angelo = cage ? await cage.release() : undefined;
    if (angelo) {
      this.scriptX = angelo.x - 70;
      await this.wait(500);
      this.scriptX = null;
      await this.say(VEIL_RESCUE);
      await reunionHug(this, angelo);
    } else await this.say(VEIL_RESCUE);
    this.veilState = "angelo_exit";
    const riftX = (this.level.arena!.x0 + this.level.arena!.x1) / 2 - 220;
    const rift = new Rift(this, riftX);
    cam.flash(240, 80, 140, 255);
    await rift.open();
    await this.say(VEIL_FAREWELL);
    if (angelo) {
      angelo.setFlipX(rift.x < angelo.x);
      angelo.play("angelo:run", true);
      await new Promise<void>((res) => this.tweens.add({ targets: angelo, x: rift.x, duration: Math.max(400, Math.abs(angelo.x - rift.x) * 2.2), onComplete: () => res() }));
      rift.surge();
      Audio.sfx("portal_enter");
      angelo.setTintFill(0xbfe0ff);
      await new Promise<void>((res) => this.tweens.add({ targets: angelo, alpha: 0, scaleX: angelo.scaleX * 0.4, duration: 280, onComplete: () => res() }));
      angelo.destroy();
    }
    await rift.close();
    this.veilState = "angely_exit";
    this.portal.appear();
    this.portal.open();
    Audio.sfx("portal_unlock");
    Audio.music("music_title");
    cam.pan(this.player.x, GAME_H / 2, 500, "Sine.easeInOut", true, (_c, p) => {
      if (p === 1) cam.startFollow(this.player.rect, true, 0.12, 0.1, 0, 60);
    });
    this.game.events.emit("hud:cinema", false);
    this.game.events.emit("hud:banner", "THE VEIL IS OPEN");
    this.cutscene = false;
    this.scriptX = null;
    this.veilState = "done";
    this.time.delayedCall(1100, () => this.toast("Angelo took the blue gate. Yours is the stone arch."));
  }

  private async bossIntro() {
    if (this.info.chapter === 2) {
      await this.sentinelIntro();
      return;
    }
    if (this.info.chapter === 8) {
      await this.wormIntro();
      return;
    }
    if (this.info.chapter === 11) {
      await this.veilIntro();
      return;
    }
    const arena = this.level.arena!;
    const cam = this.cameras.main;
    this.cutscene = true;
    this.projectiles.clear(true, true);
    Audio.stopMusic();
    cam.stopFollow();
    this.cinema(true, 1400);
    this.mech.addBarrier(arena.x0 - 20);
    this.mech.addBarrier(arena.x1 + 20);
    this.scriptX = arena.x0 + 300;
    const mid = (arena.x0 + arena.x1) / 2;
    this.bossShade = this.add.rectangle(mid, GAME_H / 2 + 100, GAME_W + 40, GAME_H + 300, 0x22003d, 0).setDepth(-30);
    await this.wait(1000);

    cam.shake(1600, 0.005);
    Audio.sfx("boss_roar");
    this.tweens.add({ targets: this.bossShade, fillAlpha: 0.42, duration: 1800 });
    const boss = new Boss(this, arena.x1 + 260, GROUND_Y - 430, arena);
    boss.dir = -1;
    boss.sprite.setAlpha(0);
    this.boss = boss;
    this.tweens.add({ targets: boss.sprite, alpha: 1, duration: 1200 });
    this.tweens.add({ targets: boss, x: arena.x1 - 300, y: HOVER_Y, duration: 2800, ease: "Sine.out" });
    await this.wait(1400);
    this.player.facing = 1;
    await this.wait(1500);

    // She keeps drifting closer while she talks.
    this.tweens.add({ targets: boss, x: arena.x1 - 420, duration: 9000, ease: "Sine.inOut" });
    await this.say(UMBRA_INTRO);

    this.cinema(false, 600);
    this.registry.set("boss", { name: BOSS_NAME, hp: boss.hp, max: boss.maxHp });
    this.game.events.emit("hud:banner", BOSS_NAME);
    Audio.music("music_boss");
    this.tweens.killTweensOf(boss);
    boss.begin();
    this.cutscene = false;
  }

  /**
   * During cutscenes the camera drops ~120 px (the ground fill runs far below the
   * floor) so the characters stand clear of the subtitle box.
   */
  private cinemaCamera(on: boolean, ms: number) {
    const cam = this.cameras.main;
    const mid = (this.level.arena!.x0 + this.level.arena!.x1) / 2;
    if (on) cam.setBounds(0, 0, this.level.width, GAME_H + 130);
    cam.pan(mid, GAME_H / 2 + (on ? 120 : 0), ms, "Sine.easeInOut", true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
      if (p === 1 && !on) cam.setBounds(0, 0, this.level.width, GAME_H);
    });
  }

  onBossHp(hp: number, max: number, dmg: number) {
    const name = this.info.chapter === 2 ? SENTINEL_NAME : this.info.chapter === 8 ? WORM_NAME : this.info.chapter === 11 ? VEIL_NAME : BOSS_NAME;
    this.registry.set("boss", { name, hp, max });
    this.cameras.main.shake(90, 0.005);
    this.bossDamage += dmg;
    if (this.bossDamage >= 7 && hp > 0 && this.info.chapter !== 11) {
      this.bossDamage = 0;
      const a = this.level.arena!;
      const h = this.addHeart(Phaser.Math.Between(a.x0 + 200, a.x1 - 200), GROUND_Y - 40);
      this.tweens.add({ targets: h.sprite, scale: { from: 0, to: h.sprite.scale }, duration: 300, ease: "Back.out" });
    }
  }

  onBossPhase2() {
    if (this.info.chapter === 11) {
      this.cameras.main.flash(300, 160, 120, 255);
      const phase = this.boss && "phase" in this.boss ? this.boss.phase : 2;
      this.game.events.emit("hud:subtitle", phase === 3 ? VEIL_PHASE3 : VEIL_PHASE2);
      return;
    }
    this.cameras.main.flash(300, 200, 120, 255);
    this.game.events.emit("hud:subtitle", UMBRA_PHASE2);
    if (this.bossShade) this.tweens.add({ targets: this.bossShade, fillAlpha: 0.55, duration: 800 });
  }

  onBossDefeated() {
    void this.bossOutro();
  }

  /** Umbra's farewell, or the dune reunion with Angelo. */
  /** Ruin Sentinel's defeat - no cutscene, portal opens directly. */
  private async wardenOutro() {
    this.registry.set("boss", null);
    for (const e of this.enemies) e.remove();
    this.projectiles.clear(true, true);
    this.hazards.getChildren().forEach((h) => h.getData("wave") && h.destroy());
    await this.wait(1200);
    this.boss!.vanish();
    this.cameras.main.flash(500, 200, 200, 200);
    await this.wait(800);
    this.portal.appear();
    this.portal.open();
    Audio.sfx("portal_unlock");
    this.game.events.emit("hud:banner", "TO THE VOLCANIC CAVES!");
    this.time.delayedCall(1600, () => this.toast("Step into the portal: your adventure continues!"));
  }

  private async bossOutro() {
    if (this.info.chapter === 2) {
      await this.wardenOutro();
      return;
    }
    if (this.info.chapter === 8) {
      await this.wormOutro();
      return;
    }
    if (this.info.chapter === 11) {
      await this.veilOutro();
      return;
    }
    this.cutscene = true;
    this.registry.set("boss", null);
    for (const e of this.enemies) e.remove();
    this.projectiles.clear(true, true);
    this.hazards.getChildren().forEach((h) => h.getData("wave") && h.destroy());
    Audio.stopMusic();
    await this.wait(1900);
    this.cinema(true, 700);
    this.player.facing = this.boss!.x > this.player.x ? 1 : -1;
    await this.wait(500);
    await this.say(UMBRA_DEFEAT);
    this.boss!.vanish();
    if (this.bossShade) this.tweens.add({ targets: this.bossShade, fillColor: 0xffe7a3, fillAlpha: 0, duration: 1800 });
    this.cameras.main.flash(700, 255, 240, 200);
    await this.wait(1400);

    await angeloCutscene(this, this.level.arena!);

    this.portal.appear();
    this.portal.open();
    Audio.sfx("portal_unlock");
    Audio.music("music_title");
    this.cinema(false, 600);
    this.game.events.emit("hud:banner", "TO THE SKY TOWER!");
    this.cutscene = false;
    this.time.delayedCall(1600, () => this.toast("Step into the portal: your adventure continues!"));
  }

  /** Ground shockwave travelling outward from Umbra's slam. */
  spawnShockwave(x: number, dir: 1 | -1, tint = 0xc58bff) {
    const zone = this.add.rectangle(x, GROUND_Y - 18, 46, 36).setVisible(false);
    this.hazards.add(zone);
    zone.setData("wave", true);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(dir * 430);
    const glow = this.add.image(x, GROUND_Y - 14, "glow").setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(110, 60).setDepth(31);
    const ev = this.time.addEvent({
      delay: 55,
      loop: true,
      callback: () => {
        if (!zone.active) return;
        glow.setPosition(zone.x, GROUND_Y - 14);
        this.fx("fx_dust", "puff", zone.x, GROUND_Y, 0.22, tint);
        const a = this.level.arena;
        if (a && (zone.x < a.x0 + 10 || zone.x > a.x1 - 10)) {
          zone.destroy();
          glow.destroy();
          ev.remove();
        }
      },
    });
  }

  // ------------------------------------------------------------ spawning

  /** Enemies left far behind are removed (not counted) so fresh ones can spawn near Angely. */
  private despawnFar(time: number) {
    this.nextDespawn = time + 500;
    const p = this.player;
    const view = this.cameras.main.worldView;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const far = Math.abs(e.x - p.x) > DESPAWN_X || Math.abs(e.body.center.y - p.body.center.y) > DESPAWN_Y;
      const behindChase = this.level.mode === "chase" && this.chaseOn && e.x < view.x - 100;
      if (far || behindChase) e.remove();
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private spawnTick(time: number) {
    const wormFight = this.info.boss && this.info.chapter === 8;
    if (this.info.boss && !wormFight) return;
    if (wormFight && (this.cutscene || !this.boss?.alive)) return;
    const killsGoal = this.goal.kind === "kills";
    if (killsGoal && this.portal.isOpen) return;
    const p = this.player;
    // Waiting at a sealed portal: enemies come faster so the count never stalls.
    const urgent = killsGoal && Math.abs(p.x - this.portal.cx) < 1200;
    const max = wormFight ? 1 : this.chapter.maxAlive + (urgent ? 1 : 0);
    if (time < this.nextSpawn || this.enemies.length >= max) return;
    if (!p.alive || (!wormFight && this.level.mode !== "climb" && p.x < 500)) {
      this.nextSpawn = time + 500;
      return;
    }
    this.nextSpawn = time + this.chapter.spawnEvery * 1000 * (wormFight ? 2.6 : 0.7 + Math.random() * 0.6) * (urgent ? 0.6 : 1);
    const pool = this.chapter.enemies;
    const type = ENEMY_TYPES[pool[Math.floor(Math.random() * pool.length)]];
    if (wormFight) {
      let x = Phaser.Math.Between(160, this.level.width - 160);
      if (Math.abs(x - p.x) < 180) x = Phaser.Math.Clamp(p.x + 280, 160, this.level.width - 160);
      if (!type.flying && this.mech.blocked(x)) x = Phaser.Math.Clamp(x + 140, 160, this.level.width - 160);
      this.spawnEnemy(type.key, x, type.flying ? GROUND_Y - 210 : GROUND_Y - 60);
      return;
    }
    if (this.level.mode === "climb") {
      this.spawnClimb(type.key, !!type.flying);
      return;
    }
    const view = this.cameras.main.worldView;
    const ahead = this.level.mode === "chase" ? 1 : Math.random() < 0.7 ? p.facing : -p.facing;
    const xs = [ahead > 0 ? view.right + 60 : view.x - 60, ahead > 0 ? view.x - 60 : view.right + 60];
    if (this.level.mode === "chase") xs.pop();
    // Fallback: inside the view, well away from Angely (they fade in).
    xs.push(p.x + ahead * Phaser.Math.Between(380, 560), p.x - ahead * Phaser.Math.Between(380, 560));
    for (const x of xs) {
      if (x < 80 || x > this.level.width - 80) continue;
      if (Math.abs(x - this.portal.cx) < 200) continue;
      if (this.level.mode === "chase" && x < view.x + 300) continue;
      const seg = groundAt(this.level.ground, x, 70);
      const floor = seg?.y ?? GROUND_Y;
      if (type.flying) {
        const y = this.level.mode === "swim" ? Phaser.Math.Between(110, floor - 120) : floor - 170 - Math.random() * 110;
        this.spawnEnemy(type.key, x, y);
        return;
      }
      if (seg && !this.mech.blocked(x)) {
        this.spawnEnemy(type.key, x, seg.y - 60);
        return;
      }
    }
  }

  private spawnClimb(key: string, flying: boolean) {
    const view = this.cameras.main.worldView;
    if (flying) {
      const side = Math.random() < 0.5;
      this.spawnEnemy(key, side ? 70 : this.level.width - 70, Phaser.Math.Between(view.y + 90, view.bottom - 160));
      return;
    }
    const p = this.player;
    const spots = this.level.landings.filter((l) => l.y > view.y + 60 && l.y < view.bottom - 40 && Math.abs(l.y - p.body.bottom) > 60);
    if (!spots.length) return;
    const l = spots[Math.floor(Math.random() * spots.length)];
    this.spawnEnemy(key, (l.x0 + l.x1) / 2, l.y - 60);
  }

  spawnEnemy(key: string, x: number, y: number) {
    const e = new Enemy(this, ENEMY_TYPES[key], x, y, this.enemyGroup);
    this.enemies.push(e);
    return e;
  }

  /** Top Y of the nearest surface at or below `fromY` (null over a pit). */
  surfaceBelow(x: number, fromY: number): number | null {
    let best: number | null = null;
    const consider = (p: { x0: number; x1: number; y: number }) => {
      if (x >= p.x0 && x <= p.x1 && p.y >= fromY - 4 && (best === null || p.y < best)) best = p.y;
    };
    this.platformTops.forEach(consider);
    this.mech?.surfaces().forEach(consider);
    this.level.ground.forEach(consider);
    return best;
  }

  /** Is there something to stand on at x, at the height of `bottom`? (enemy ledge checks) */
  hasFooting(x: number, bottom: number) {
    const s = this.surfaceBelow(x, bottom - 8);
    return s !== null && Math.abs(s - bottom) < 14;
  }

  // -------------------------------------------------------- projectiles/fx

  spawnProjectile(sheet: ProjectileSheet, x: number, y: number, vx: number, vy: number, scale: number, tint?: number) {
    const pr = this.physics.add.sprite(x, y, sheet).setDepth(80).setScale(scale);
    this.projectiles.add(pr);
    applyOrigin(pr, sheet);
    if (sheet === "fx_dust") pr.setFrame(SPRITES.fx_dust.anims.puff.start + 2);
    else pr.play(`${sheet}:fly`);
    if (tint) pr.setTint(tint);
    const body = pr.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const r = sheet === "crystal_shot" ? 22 : SPRITES[sheet].frameHeight * 0.3;
    body.setCircle(r, SPRITES[sheet].frameWidth / 2 - r, SPRITES[sheet].frameHeight / 2 - r);
    body.setVelocity(vx, vy);
    pr.setFlipX(vx < 0);
    pr.setRotation(sheet === "fx_dust" || sheet === "crystal_shot" ? 0 : Math.atan2(vy, Math.abs(vx)) * (vx < 0 ? -1 : 1));
    pr.setData("born", this.time.now);
    pr.setData("sheet", sheet);
  }

  private updateProjectiles() {
    const now = this.time.now;
    this.projectiles.getChildren().forEach((obj) => {
      const pr = obj as Phaser.Physics.Arcade.Sprite;
      if (now - (pr.getData("born") as number) > 3200) this.impactProjectile(pr);
    });
  }

  private onProjectileHitPlayer(pr: Phaser.Physics.Arcade.Sprite) {
    if (!pr.active || !this.player.alive || this.cutscene) return;
    this.player.hurt(pr.x);
    this.impactProjectile(pr);
  }

  private impactProjectile(pr: Phaser.Physics.Arcade.Sprite) {
    if (!pr.active) return;
    const sheet = pr.getData("sheet") as ProjectileSheet;
    if (sheet === "fx_fireball") Audio.sfx("fire_impact");
    if (sheet === "fx_dust") this.fx("fx_dust", "puff", pr.x, pr.y + 20, 0.3, 0xc9ff9a);
    else this.fx(sheet, "impact", pr.x, pr.y, pr.scale);
    pr.destroy();
  }

  fx(sheet: SpriteKey, anim: string, x: number, y: number, scale: number, tint?: number) {
    const s = this.add.sprite(x, y, sheet).setScale(scale).setDepth(90);
    applyOrigin(s, sheet);
    if (tint) s.setTint(tint);
    s.play(`${sheet}:${anim}`);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    return s;
  }

  groundSlam(x: number, y: number, radius: number) {
    this.fx("fx_dust", "puff", x - 40, y, 0.4);
    this.fx("fx_dust", "puff", x + 40, y, 0.4);
    const p = this.player;
    if (p.grounded && Math.abs(p.x - x) < radius && Math.abs(p.body.bottom - y) < 40) p.hurt(x);
  }

  spawnLava(x: number, floor: number) {
    if (!this.hasFooting(x, floor)) return;
    const s = this.fx("fx_lava", "burst", x, floor + 4, 0.32);
    s.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    const zone = this.add.rectangle(x, floor - 14, 70, 26).setVisible(false);
    this.hazards.add(zone);
    this.time.delayedCall(2200, () => {
      zone.destroy();
      this.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => s.destroy() });
    });
  }

  private addBobber(sheet: "stargem" | "starshield", x: number, y: number, height: number): Pickup {
    const spr = this.add.sprite(x, y, sheet).setDepth(50);
    spr.setScale(scaleForHeight(sheet, height));
    applyOrigin(spr, sheet);
    spr.play(`${sheet}:glow`);
    this.tweens.add({ targets: spr, y: y - 12, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    return { sprite: spr, baseY: y, taken: false };
  }

  toast(text: string) {
    this.game.events.emit("hud:toast", text);
  }

  get label() {
    return levelLabel(this.info);
  }
}
