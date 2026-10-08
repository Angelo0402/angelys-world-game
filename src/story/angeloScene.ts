import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import { ANGELO_ARRIVES, ANGELO_FAREWELL, ANGELO_TALK, COLOSSUS_APPEARS, COLOSSUS_SMASH } from "./angelo";
import { ANGELO_AFTER_WORM, ANGELO_LEAVES_RIFT } from "./worm";
import { BlueRift } from "./BlueRift";

const ANGELO_H = 140;
const COLOSSUS_H = 340;
const RIFT_H = 230;
const RIFT_SQUASH = 0.46;
/** Horizontal distance from Angely to the centre of the shared hug sprite. */
const HUG_DX = 34;

type Tween = Phaser.Types.Tweens.TweenBuilderConfig;

/**
 * Angelo's blue rift: two counter-rotating vortex layers and a bright core inside a
 * squashed (elliptical) container, a soft halo, a floor glow and sparks that stream
 * into the centre. Built from shapes, so nothing is ever cropped.
 */
export class Rift {
  readonly x: number;
  readonly y: number;
  private scene: GameScene;
  private body: Phaser.GameObjects.Container;
  private outer: Phaser.GameObjects.Image;
  private inner: Phaser.GameObjects.Image;
  private core: Phaser.GameObjects.Image;
  private halo: Phaser.GameObjects.Image;
  private floor: Phaser.GameObjects.Image;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private t = 0;

  constructor(scene: GameScene, x: number) {
    this.scene = scene;
    this.x = x;
    this.y = GROUND_Y - RIFT_H / 2 + 6;
    const vs = RIFT_H / (SPRITES.vortex.frameHeight * 0.9);
    const ring = scene.add.graphics();
    const r = RIFT_H / 2;
    ring.fillStyle(0x0a1640, 0.95).fillCircle(0, 0, r * 0.96);
    ring.lineStyle(10, 0x3d7bff, 0.55).strokeCircle(0, 0, r * 0.97);
    ring.lineStyle(4, 0xbfe0ff, 0.9).strokeCircle(0, 0, r * 0.93);
    this.outer = scene.add.image(0, 0, "vortex", 0).setScale(vs).setTint(0x3d7bff).setBlendMode(Phaser.BlendModes.ADD);
    this.inner = scene.add.image(0, 0, "vortex", 0).setScale(vs * 0.62).setFlipX(true).setTint(0x9fd0ff).setBlendMode(Phaser.BlendModes.ADD);
    this.core = scene.add.image(0, 0, "glow").setDisplaySize(r * 1.1, r * 1.1).setBlendMode(Phaser.BlendModes.ADD);
    this.body = scene.add.container(x, this.y, [ring, this.outer, this.inner, this.core]).setDepth(57).setScale(0, 0);
    this.halo = scene.add.image(x, this.y, "glow").setDepth(56).setTint(0x3d7bff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.halo.setDisplaySize(RIFT_H * 1.3, RIFT_H * 1.6);
    this.floor = scene.add.image(x, GROUND_Y + 2, "glow").setDepth(56).setTint(0x9fd0ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.floor.setDisplaySize(RIFT_H * 1.4, 36);
    this.sparks = scene.add
      .particles(x, this.y, "dot", {
        emitZone: { type: "edge", source: new Phaser.Geom.Ellipse(0, 0, RIFT_H * RIFT_SQUASH * 1.5, RIFT_H * 1.15), quantity: 48 },
        moveToX: 0,
        moveToY: 0,
        lifespan: 650,
        scale: { start: 0.42, end: 0.05 },
        alpha: { start: 1, end: 0.2 },
        tint: [0x4f8dff, 0x9fd0ff, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 35,
        emitting: false,
      })
      .setDepth(58);
    scene.events.on("update", this.tick, this);
  }

  private tick(_t: number, delta: number) {
    this.t += delta;
    this.outer.rotation -= delta * 0.0022;
    this.inner.rotation += delta * 0.0036;
    const pulse = 0.85 + Math.sin(this.t * 0.006) * 0.15;
    this.core.setAlpha(0.55 * pulse);
    this.halo.setAlpha(this.halo.getData("on") ? 0.55 * pulse : this.halo.alpha);
  }

  open() {
    Audio.sfx("portal_unlock");
    this.sparks.start();
    this.halo.setData("on", true);
    this.scene.tweens.add({ targets: this.floor, alpha: 0.7, duration: 500 });
    return new Promise<void>((res) =>
      this.scene.tweens.add({
        targets: this.body,
        scaleX: { from: 0.05, to: RIFT_SQUASH },
        scaleY: { from: 0.1, to: 1 },
        duration: 650,
        ease: "Back.easeOut",
        onComplete: () => res(),
      }),
    );
  }

  /** A quick bright swell, used when someone steps through. */
  surge() {
    this.scene.tweens.add({ targets: this.body, scaleX: RIFT_SQUASH * 1.12, scaleY: 1.06, duration: 140, yoyo: true, ease: "Sine.easeOut" });
    this.scene.fx("fx_spark", "hit", this.x, this.y, 0.8, 0x9fd0ff);
  }

  close() {
    Audio.sfx("portal_enter");
    this.sparks.stop();
    this.halo.setData("on", false);
    this.scene.tweens.add({ targets: [this.halo, this.floor], alpha: 0, duration: 420 });
    return new Promise<void>((res) =>
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 0,
        scaleY: 0.05,
        duration: 420,
        ease: "Back.easeIn",
        onComplete: () => {
          this.scene.fx("fx_spark", "hit", this.x, this.y, 0.9, 0xffffff);
          this.destroy();
          res();
        },
      }),
    );
  }

  private destroy() {
    this.scene.events.off("update", this.tick, this);
    this.body.destroy();
    this.halo.destroy();
    this.floor.destroy();
    this.scene.time.delayedCall(700, () => this.sparks.destroy());
  }
}

/**
 * Part two of Umbra's Throne. Angely doesn't fight here: a giant golem rises out of
 * the floor, her dad Angelo steps out of a blue rift, takes it down, talks with her
 * and leaves the same way he came.
 */
export async function angeloCutscene(scene: GameScene, arena: { x0: number; x1: number }) {
  const cam = scene.cameras.main;
  const player = scene.player;
  const tweens = scene.tweens;
  const tween = (cfg: Tween) => new Promise<void>((res) => tweens.add({ ...cfg, onComplete: () => res() }));

  scene.scriptX = arena.x0 + 430;
  await scene.wait(900);
  player.facing = 1;

  // ---- the Colossus rises (its art faces left, toward Angely)
  const gx = arena.x1 - 330;
  const golem = scene.add.sprite(gx, GROUND_Y + COLOSSUS_H, "colossus").setDepth(44);
  golem.setScale(scaleForHeight("colossus", COLOSSUS_H, "idle"));
  applyOrigin(golem, "colossus");
  golem.play("colossus:idle");
  Audio.sfx("boss_roar");
  cam.shake(2400, 0.007);
  const dust = scene.time.addEvent({ delay: 120, repeat: 18, callback: () => scene.fx("fx_dust", "puff", gx + Phaser.Math.Between(-150, 150), GROUND_Y, 0.55, 0x9a9090) });
  await tween({ targets: golem, y: GROUND_Y + 6, duration: 2400, ease: "Sine.easeOut" });
  dust.remove();
  golem.play("colossus:roar");
  Audio.sfx("boss_roar");
  cam.shake(900, 0.012);
  await scene.wait(900);
  golem.play("colossus:idle");
  await scene.say(COLOSSUS_APPEARS);

  for (let i = 0; i < 2; i++) {
    await tween({ targets: golem, x: golem.x - 120, duration: 520, ease: "Quad.easeInOut" });
    Audio.sfx("ground_slam");
    cam.shake(220, 0.01);
    scene.fx("fx_dust", "puff", golem.x, GROUND_Y, 0.6, 0x9a9090);
  }
  golem.play("colossus:smash");
  Audio.sfx("hammer_smash");
  cam.shake(500, 0.02);
  scene.fx("fx_explode", "boom", golem.x - 170, GROUND_Y - 30, 0.6, 0xffc35a);
  player.body.setVelocity(-220, -360);
  await scene.wait(700);
  golem.play("colossus:idle");
  await scene.say(COLOSSUS_SMASH);

  // ---- Angelo's rift
  const rift = new BlueRift(scene, arena.x0 + 130);
  cam.flash(300, 120, 170, 255);
  await rift.open();
  await scene.wait(250);

  // One sheet, one scale: every Angelo pose is exported at the same character size.
  const angelo = scene.add.sprite(rift.x, GROUND_Y + 4, "angelo").setDepth(58);
  angelo.setScale(scaleForHeight("angelo", ANGELO_H, "idle"));
  applyOrigin(angelo, "angelo");
  const pose = (anim: string) => angelo.play(`angelo:${anim}`, true);
  const played = (anim: string) =>
    new Promise<void>((res) => {
      angelo.play(`angelo:${anim}`);
      angelo.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => res());
    });
  const runTo = async (x: number, msPerPx = 1.5, anim = "run") => {
    angelo.setFlipX(x < angelo.x);
    pose(anim);
    await tween({ targets: angelo, x, duration: Math.max(260, Math.abs(angelo.x - x) * msPerPx) });
    pose("idle");
  };
  const hitStop = (ms: number) => {
    tweens.pauseAll();
    angelo.anims.pause();
    golem.anims.pause();
    return scene.wait(ms).then(() => {
      tweens.resumeAll();
      angelo.anims.resume();
      golem.anims.resume();
    });
  };

  rift.surge();
  angelo.setTintFill(0xbfe0ff).setAlpha(0);
  pose("run");
  tweens.add({ targets: angelo, alpha: 1, duration: 260 });
  await tween({ targets: angelo, x: rift.x + 150, duration: 520, ease: "Sine.easeOut" });
  angelo.clearTint();
  pose("land");
  scene.fx("fx_dust", "puff", angelo.x, GROUND_Y, 0.35, 0x9fd0ff);
  await scene.wait(220);
  pose("stance");
  await scene.say(ANGELO_ARRIVES);

  // ---- the fight
  const chest = () => ({ x: golem.x - 90, y: GROUND_Y - COLOSSUS_H * 0.55 });
  const hit = async (x: number, y: number, big = false) => {
    Audio.sfx(big ? "hammer_smash" : "sword_hit");
    scene.fx("fx_spark", "hit", x, y, big ? 1.1 : 0.7, 0x7fb5ff);
    scene.fx("fx_explode", "boom", x, y, big ? 0.7 : 0.4, 0x9fd0ff);
    cam.shake(big ? 500 : 180, big ? 0.02 : 0.008);
    golem.play("colossus:hurt", true);
    golem.setTintFill(0xffffff);
    scene.time.delayedCall(70, () => golem.clearTint());
    await hitStop(big ? 140 : 70);
  };

  await runTo(golem.x - 360, 1.0);
  pose("crouch");
  await scene.wait(110);
  Audio.sfx("jump");
  pose("leap");
  await tween({ targets: angelo, x: golem.x - 290, y: GROUND_Y - 190, duration: 300, ease: "Quad.easeOut" });
  pose("kick");
  await tween({ targets: angelo, x: golem.x - 230, y: GROUND_Y - 200, duration: 110, ease: "Quad.easeOut" });
  await hit(chest().x, chest().y);
  pose("drop");
  await tween({ targets: angelo, x: golem.x - 280, y: GROUND_Y + 4, duration: 320, ease: "Quad.easeIn" });
  pose("land");
  scene.fx("fx_dust", "puff", angelo.x, GROUND_Y, 0.3, 0x9a9090);
  await scene.wait(160);

  angelo.play("angelo:punch");
  await scene.wait(90);
  await hit(chest().x, GROUND_Y - 150);
  await scene.wait(90);
  await hit(chest().x + 12, GROUND_Y - 175);
  await new Promise<void>((res) => angelo.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => res()));

  pose("crouch");
  await scene.wait(140);
  angelo.play("angelo:uppercut");
  cam.flash(220, 160, 200, 255);
  await tween({ targets: angelo, y: GROUND_Y - 150, x: angelo.x + 30, duration: 200, ease: "Quad.easeOut" });
  await hit(chest().x, chest().y - 40, true);
  pose("drop");
  await tween({ targets: angelo, x: golem.x - 400, y: GROUND_Y + 4, duration: 400, ease: "Quad.easeIn" });
  pose("land");
  golem.play("colossus:fall");
  Audio.sfx("wall_break");
  cam.shake(1200, 0.018);
  for (let i = 0; i < 8; i++) scene.time.delayedCall(i * 120, () => scene.fx("fx_dust", "puff", golem.x + Phaser.Math.Between(-160, 160), GROUND_Y, 0.7, 0x9a9090));
  await scene.wait(900);
  pose("stance");
  await scene.wait(700);

  // ---- father and daughter
  await runTo(player.x + 150, 1.6, "walk");
  angelo.setFlipX(angelo.x > player.x);
  player.facing = angelo.x > player.x ? 1 : -1;
  pose("arms");
  const react = (who: string) => pose(who === "angelo" ? "talk" : "arms");
  await scene.say(ANGELO_TALK, (l) => react(l.who));
  await played("welcome");
  pose("idle");
  await scene.say(ANGELO_FAREWELL, (l) => pose(l.who === "angelo" ? "talk" : "wave"));

  await reunionHug(scene, angelo);

  // ---- he leaves through his rift
  await runTo(rift.x + 40, 1.4, "walk");
  rift.surge();
  angelo.setTintFill(0xbfe0ff);
  await tween({ targets: angelo, x: rift.x, alpha: 0, scaleX: angelo.scaleX * 0.4, duration: 320, ease: "Quad.easeIn" });
  angelo.destroy();
  await scene.wait(250);
  await rift.close();

  // ---- the rubble crumbles away so the exit portal behind it is clear
  Audio.sfx("wall_break");
  cam.shake(500, 0.008);
  for (let i = 0; i < 10; i++) scene.time.delayedCall(i * 90, () => scene.fx("fx_dust", "puff", golem.x + Phaser.Math.Between(-170, 170), GROUND_Y - Phaser.Math.Between(0, 120), 0.7, 0x9a9090));
  await tween({ targets: golem, alpha: 0, y: golem.y + 60, scaleY: golem.scaleY * 0.6, duration: 900, ease: "Quad.easeIn" });
  golem.destroy();
  await scene.wait(400);
}

/** Shared hug: hide both actors, play the hug sheet, float hearts, then restore them. */
export async function reunionHug(scene: GameScene, angelo: Phaser.GameObjects.Sprite) {
  const player = scene.player;
  const tweens = scene.tweens;
  const tween = (cfg: Tween) => new Promise<void>((res) => tweens.add({ ...cfg, onComplete: () => res() }));
  const pose = (anim: string) => angelo.play(`angelo:${anim}`, true);
  angelo.setFlipX(angelo.x > player.x);
  player.facing = angelo.x > player.x ? 1 : -1;
  pose("walk");
  const meet = player.x + (angelo.x > player.x ? HUG_DX * 2 : -HUG_DX * 2);
  await tween({ targets: angelo, x: meet, duration: Math.max(280, Math.abs(angelo.x - meet) * 1.8) });
  pose("idle");
  angelo.setFlipX(angelo.x > player.x);
  player.facing = angelo.x > player.x ? 1 : -1;
  await scene.wait(160);
  const hugH = 168;
  const hug = scene.add.sprite((player.x + angelo.x) / 2, GROUND_Y + 4, "angelo_hug").setDepth(59);
  hug.setScale(scaleForHeight("angelo_hug", hugH, "hug"));
  applyOrigin(hug, "angelo_hug");
  angelo.setVisible(false);
  player.sprite.setVisible(false);
  const playHug = async (key: string, ms: number) => {
    const full = `angelo_hug:${key}`;
    if (scene.anims.exists(full)) hug.play(full, true);
    await scene.wait(ms);
  };
  await playHug("open", 520);
  await playHug("hug", 80);
  Audio.sfx("heart_pickup");
  const hearts = scene.add
    .particles(hug.x, GROUND_Y - 110, "heart", {
      frame: 0,
      x: { min: -60, max: 60 },
      speedY: { min: -120, max: -55 },
      speedX: { min: -32, max: 32 },
      scale: { start: 18 / SPRITES.heart.frameHeight, end: 36 / SPRITES.heart.frameHeight },
      alpha: { start: 1, end: 0 },
      rotate: { min: -24, max: 24 },
      lifespan: 1800,
      frequency: 90,
    })
    .setDepth(60);
  await scene.wait(1600);
  await playHug("kiss", 1400);
  await playHug("hold", 1400);
  hearts.stop();
  await playHug("pat", 1100);
  hug.destroy();
  player.sprite.setVisible(true);
  angelo.setVisible(true);
  pose("wave");
  await scene.wait(700);
  scene.time.delayedCall(1400, () => hearts.destroy());
}

/** After the dune worm falls. Angelo praises Angely, hugs her, and leads her on. */
export async function angeloPraise(scene: GameScene, arena: { x0: number; x1: number }) {
  const cam = scene.cameras.main;
  const player = scene.player;
  const tweens = scene.tweens;
  const tween = (cfg: Tween) => new Promise<void>((res) => tweens.add({ ...cfg, onComplete: () => res() }));

  const rift = new Rift(scene, arena.x0 + 160);
  cam.flash(280, 120, 170, 255);
  await rift.open();
  await scene.wait(200);

  const angelo = scene.add.sprite(rift.x, GROUND_Y + 4, "angelo").setDepth(58);
  angelo.setScale(scaleForHeight("angelo", ANGELO_H, "idle"));
  applyOrigin(angelo, "angelo");
  const pose = (anim: string) => angelo.play(`angelo:${anim}`, true);
  rift.surge();
  angelo.setAlpha(0);
  pose("run");
  tweens.add({ targets: angelo, alpha: 1, duration: 220 });
  await tween({ targets: angelo, x: player.x + 120, duration: 700, ease: "Sine.easeOut" });
  angelo.setFlipX(angelo.x > player.x);
  player.facing = angelo.x > player.x ? 1 : -1;
  pose("talk");
  await scene.say(ANGELO_AFTER_WORM, (l) => pose(l.who === "angelo" ? "talk" : "arms"));

  await reunionHug(scene, angelo);
  pose("idle");
  await scene.say(ANGELO_LEAVES_RIFT, (l) => pose(l.who === "angelo" ? "talk" : "idle"));

  angelo.setFlipX(rift.x < angelo.x);
  pose("walk");
  await tween({ targets: angelo, x: rift.x, duration: Math.max(400, Math.abs(angelo.x - rift.x) * 2) });
  pose("idle");
  rift.surge();
  Audio.sfx("portal_enter");
  angelo.setTintFill(0xbfe0ff);
  await tween({ targets: angelo, alpha: 0, scaleX: angelo.scaleX * 0.4, duration: 280 });
  angelo.destroy();
  await scene.wait(200);
  await rift.close();
}
