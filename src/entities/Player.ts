import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import type { SpriteKey } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { MAX_HEARTS, WEAPON_ORDER, type WeaponId } from "../config";
import type { FrameInput } from "../input/controls";
import type { GameScene } from "../scenes/GameScene";

const SPEED = 280;
export const PUSH_SPEED = 140;
const SWIM_SPEED = 230;
const SWIM_STROKE = 430;
const SWIM_GRAVITY = 420;
const SWIM_MAX_FALL = 240;
const SPRING_V = 1180;
const GROUND_ACCEL = 2600;
const GROUND_DECEL = 3400;
const AIR_ACCEL = 1700;
const JUMP_V = 840;
/** Extra gravity while rising with jump released (short hops) and while falling (snappier arcs). */
const LOW_JUMP_GRAVITY = 2200;
const FALL_GRAVITY = 700;
const MAX_FALL = 1050;
const STOMP_BOUNCE = 560;
const COYOTE_MS = 150;
const BUFFER_MS = 160;
const INVULN_MS = 1100;
const HEIGHT = 112;

type PState = "normal" | "attack" | "hurt" | "pickup" | "dead" | "celebrate" | "frozen";

/** Ground speeds (px/s) at which walk/run play at their authored frame rate, so feet don't slide. */
const WALK_ANIM_SPEED = 170;
const RUN_ANIM_SPEED = 300;

export class Player {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private scene: GameScene;
  private sheet?: SpriteKey;
  private scales: Record<string, number>;
  hearts = MAX_HEARTS;
  facing: 1 | -1 = 1;
  state: PState = "normal";
  weapons: WeaponId[] = [];
  weapon: WeaponId | null = null;
  /** Ground friction multiplier (ice < 1). */
  grip = 1;
  /** Set by the scene each frame while Angely leans on a crate. */
  pushing = false;
  /** Underwater: JUMP is a swim stroke usable anytime and gravity is light. */
  swim = false;
  private lastStroke = 0;
  private nextBreath = 0;
  private nextTrail = 0;
  private bubbles: Phaser.GameObjects.Particles.ParticleEmitter;
  prevBottom = 0;
  private attackWeapon: WeaponId = "sword";
  private shotFired = false;
  private boosted = false;
  private lastGrounded = 0;
  private jumpBufferedAt = -1000;
  private jumpCut = false;
  private invulnUntil = 0;
  private stateUntil = 0;
  private attackStart = 0;
  private attackHits = new Set<unknown>();
  private airAttack = false;
  private wasGrounded = true;
  private lastFallSpeed = 0;
  private landUntil = 0;
  private moveAnimUntil = 0;

  constructor(scene: GameScene, x: number, y: number) {
    this.scene = scene;
    this.rect = scene.add.rectangle(x, y, 40, 96, 0x00ff00, 0).setVisible(false);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(800, MAX_FALL);
    this.scales = {
      angely: scaleForHeight("angely", HEIGHT, "idle"),
      // Every player sheet is exported at the same character scale (hair-normalised).
      angely_sword: scaleForHeight("angely", HEIGHT, "idle"),
      angely_bow: scaleForHeight("angely", HEIGHT, "idle"),
      angely_hammer: scaleForHeight("angely", HEIGHT, "idle"),
      angely_boomerang: scaleForHeight("angely", HEIGHT, "idle"),
      angely_wand: scaleForHeight("angely", HEIGHT, "idle"),
      angely_ray: scaleForHeight("angely", HEIGHT, "idle"),
      angely_swim: scaleForHeight("angely", HEIGHT, "idle"),
    };
    this.bubbles = scene.add
      .particles(0, 0, "bubble", {
        lifespan: { min: 900, max: 1500 },
        speedX: { min: -18, max: 18 },
        speedY: { min: -70, max: -30 },
        gravityY: -120,
        scale: { start: 0.22, end: 0.5 },
        alpha: { start: 0.95, end: 0 },
        emitting: false,
      })
      .setDepth(61);
    this.shadow = scene.add.image(x, y, "shadow").setAlpha(0.3).setDepth(30);
    this.sprite = scene.add.sprite(x, y, "angely").setDepth(60);
    this.setAnim("angely", "idle");
  }

  get x() {
    return this.body.center.x;
  }
  get y() {
    return this.body.center.y;
  }
  get alive() {
    return this.state !== "dead";
  }
  get grounded() {
    return this.body.blocked.down || this.body.touching.down;
  }
  get invulnerable() {
    return this.scene.time.now < this.invulnUntil;
  }

  starPower = false;

  /** Mario-style star: immune + touch kills enemies. */
  setStarPower(on: boolean) {
    this.starPower = on;
    // sparkle effect while active
    if (on) {
      this.scene.tweens.add({ targets: this.sprite, alpha: 0.6, duration: 150, yoyo: true, repeat: -1 });
    } else {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAlpha(1);
    }
  }

  // ---- Modular power-up buffs ----
  shieldActive = false;
  speedMultiplier = 1;
  swordDamageMultiplier = 1;
  magnetActive = false;
  slowTimeActive = false;

  /** Shield: blocks one hit, then breaks. */
  setShield(on: boolean) {
    this.shieldActive = on;
    if (on) {
      this.scene.tweens.add({ targets: this.sprite, scale: this.sprite.scale * 1.05, duration: 200, yoyo: true });
    }
  }

  setSpeedBoost(on: boolean) {
    this.speedMultiplier = on ? 1.5 : 1;
  }

  setPowerSword(on: boolean) {
    this.swordDamageMultiplier = on ? 2 : 1;
  }

  setMagnet(on: boolean) {
    this.magnetActive = on;
  }

  setSlowTime(on: boolean) {
    this.slowTimeActive = on;
  }

  /** Clear all temporary buffs (on death/restart). */
  clearBuffs() {
    this.setStarPower(false);
    this.setShield(false);
    this.setSpeedBoost(false);
    this.setPowerSword(false);
    this.setMagnet(false);
    this.setSlowTime(false);
  }

  get hasSword() {
    return this.weapon === "sword";
  }

  giveWeapon(w: WeaponId, equip = true) {
    if (!this.weapons.includes(w)) this.weapons = WEAPON_ORDER.filter((x) => x === w || this.weapons.includes(x));
    if (equip || !this.weapon) this.weapon = w;
  }

  /** Cycles to the next owned weapon. Returns the new weapon, or null if there is nothing to swap to. */
  swapWeapon(): WeaponId | null {
    if (this.weapons.length < 2 || !this.weapon || this.state === "attack") return null;
    const i = this.weapons.indexOf(this.weapon);
    this.weapon = this.weapons[(i + 1) % this.weapons.length];
    return this.weapon;
  }

  springBounce() {
    this.body.setVelocityY(-SPRING_V);
    this.jumpCut = false;
    this.boosted = true;
    this.lastGrounded = -1000;
    this.jumpBufferedAt = -1000;
  }

  bounds() {
    return new Phaser.Geom.Rectangle(this.body.x, this.body.y, this.body.width, this.body.height);
  }

  private setAnim(sheet: SpriteKey, anim: string, restart = false) {
    if (sheet !== this.sheet) {
      this.sheet = sheet;
      this.sprite.setScale(this.scales[sheet]);
      applyOrigin(this.sprite, sheet);
    }
    this.sprite.play(`${sheet}:${anim}`, !restart);
  }

  update(time: number, delta: number, input: FrameInput) {
    const dt = Math.min(delta, 50) / 1000;
    const body = this.body;
    const grounded = this.grounded;
    if (grounded) {
      this.lastGrounded = time;
      this.jumpCut = false;
      if (!this.wasGrounded && body.velocity.y >= 0) {
        this.scene.fx("fx_dust", "puff", this.x, body.bottom, 0.22);
        if (this.lastFallSpeed > 380 && this.state === "normal") {
          this.landUntil = time + 120;
          this.setAnim("angely", "land", true);
        }
      }
    }
    this.wasGrounded = grounded;
    if (!grounded) this.lastFallSpeed = body.velocity.y;

    if (this.state === "dead" || this.state === "celebrate" || this.state === "frozen" || this.state === "pickup") {
      body.setVelocityX(this.state === "dead" ? body.velocity.x * 0.92 : 0);
      this.sync(time);
      return;
    }

    if (this.state === "hurt" && time > this.stateUntil) this.state = "normal";
    if (this.state === "attack" && time > this.stateUntil) this.state = "normal";

    if (input.jumpPressed) this.jumpBufferedAt = time;

    if (this.state !== "hurt") {
      let speed = this.swim ? SWIM_SPEED : SPEED;
      speed *= this.speedMultiplier; // speed boots power-up
      if (this.slowTimeActive) speed *= 2; // compensate for world timeScale=2 during slow_time
      if (this.state === "attack" && !this.airAttack) speed *= this.attackWeapon === "hammer" ? 0.1 : 0.25;
      if (this.pushing) speed = PUSH_SPEED;
      const target = input.axis * speed;
      const vx = body.velocity.x;
      const braking = target === 0 || Math.sign(target) !== Math.sign(vx);
      const accel = !grounded ? AIR_ACCEL : braking ? GROUND_DECEL * this.grip : GROUND_ACCEL * Math.max(0.45, this.grip);
      const step = accel * dt;
      body.setVelocityX(Math.abs(target - vx) <= step ? target : vx + Math.sign(target - vx) * step);
      if (input.axis !== 0 && this.state !== "attack") this.facing = input.axis > 0 ? 1 : -1;

      if (this.swim) {
        this.swimUpdate(time, input.jumpHeld);
        if (input.attackPressed && this.weapon && this.state === "normal") this.startAttack(time);
        if (this.state === "attack") this.attackUpdate(time);
        this.pickAnim(time, input.axis);
        this.sync(time);
        return;
      }
      const canJump = time - this.lastGrounded < COYOTE_MS;
      if (time - this.jumpBufferedAt < BUFFER_MS && canJump && body.velocity.y >= -10) {
        body.setVelocityY(-JUMP_V);
        this.jumpBufferedAt = -1000;
        this.lastGrounded = -1000;
        Audio.sfx("jump");
        this.scene.fx("fx_dust", "puff", this.x, body.bottom, 0.2);
      }
      if (body.velocity.y >= 0) this.boosted = false;
      if (this.boosted) body.setGravityY(0);
      else if (body.velocity.y < 0 && (!input.jumpHeld || this.jumpCut)) body.setGravityY(LOW_JUMP_GRAVITY);
      else if (body.velocity.y > 0 && !grounded) body.setGravityY(FALL_GRAVITY);
      else body.setGravityY(0);

      if (input.attackPressed && this.weapon && this.state === "normal") this.startAttack(time);
    }

    if (this.state === "attack") this.attackUpdate(time);

    this.pickAnim(time, input.axis);
    this.sync(time);
  }

  /** Each JUMP press is a stroke upward; holding JUMP slows sinking. */
  private swimUpdate(time: number, held: boolean) {
    const body = this.body;
    if (time - this.jumpBufferedAt < BUFFER_MS && time - this.lastStroke > 200) {
      this.jumpBufferedAt = -1000;
      this.lastStroke = time;
      body.setVelocityY(Math.min(body.velocity.y, 0) - SWIM_STROKE);
      if (body.velocity.y < -SWIM_STROKE * 1.3) body.setVelocityY(-SWIM_STROKE * 1.3);
      Audio.sfx("swim");
      this.breathe(Phaser.Math.Between(3, 5));
      this.nextBreath = time + 1800;
    }
    if (time > this.nextBreath) {
      this.breathe(Phaser.Math.Between(1, 2));
      this.nextBreath = time + Phaser.Math.Between(1500, 2300);
    }
    if (Math.abs(body.velocity.x) > 150 && time > this.nextTrail) {
      this.nextTrail = time + 260;
      this.bubbles.emitParticleAt(this.x - this.facing * 30, body.center.y + 18, 1);
    }
    // World gravity is 1900; underwater Angely only feels a little of it.
    body.setGravityY(held && body.velocity.y > 0 ? -1820 : -1900 + SWIM_GRAVITY);
    if (body.velocity.y > SWIM_MAX_FALL) body.setVelocityY(SWIM_MAX_FALL);
  }

  /** Bubbles escaping from Angely's mouth. */
  private breathe(n: number) {
    const horizontal = this.sheet === "angely_swim" && this.sprite.anims.currentAnim?.key === "angely_swim:swim";
    const mx = this.x + this.facing * (horizontal ? 44 : 14);
    const my = horizontal ? this.body.center.y - 14 : this.body.top + 20;
    for (let i = 0; i < n; i++) this.scene.time.delayedCall(i * 70, () => this.bubbles.emitParticleAt(mx + Phaser.Math.Between(-3, 3), my, 1));
  }

  private attackUpdate(time: number) {
    const body = this.body;
    const t = time - this.attackStart;
    if (this.attackWeapon === "ray") {
      if (!this.shotFired && t > 170) {
        this.shotFired = true;
        this.scene.shootRay(this.x + this.facing * 48, body.top + body.height * 0.38, this.facing);
      }
      return;
    }
    if (this.attackWeapon === "cog") {
      if (!this.shotFired && t > 140) {
        this.shotFired = true;
        this.scene.throwCog(this.x + this.facing * 46, body.top + body.height * 0.32, this.facing);
      }
      return;
    }
    if (this.attackWeapon === "boomerang") {
      if (!this.shotFired && t > 150) {
        this.shotFired = true;
        this.scene.throwBoomerang(this.x + this.facing * 40, body.top + body.height * 0.3, this.facing);
      }
      return;
    }
    if (this.attackWeapon === "wand") {
      if (!this.shotFired && t > 190) {
        this.shotFired = true;
        this.scene.castStars(this.x + this.facing * 50, body.top + body.height * 0.25, this.facing);
      }
      return;
    }
    if (this.attackWeapon === "bow") {
      if (!this.shotFired && t > 110) {
        this.shotFired = true;
        this.scene.shootArrow(this.x + this.facing * 46, body.top + body.height * 0.36, this.facing);
      }
      return;
    }
    if (this.attackWeapon === "hammer") {
      if (!this.shotFired && t > 250) {
        this.shotFired = true;
        const reach = 160;
        const r = new Phaser.Geom.Rectangle(this.facing > 0 ? this.x - 30 : this.x - reach, body.top - 30, reach + 30, body.height + 50);
        this.scene.hammerHit(r, this.attackHits, this.x + this.facing * 90, body.bottom, this.grounded);
      }
      return;
    }
    if (t > 50 && t < 250) {
      const reach = this.airAttack ? 120 : 130;
      const r = new Phaser.Geom.Rectangle(
        this.facing > 0 ? this.x - 20 : this.x - reach,
        body.top - (this.airAttack ? 40 : 30),
        reach + 20,
        body.height + (this.airAttack ? 80 : 40),
      );
      this.scene.swordHit(r, this.attackHits);
    }
  }

  private startAttack(time: number) {
    const w = this.weapon!;
    if (w === "boomerang" && this.scene.boomerangOut) return;
    this.state = "attack";
    this.attackWeapon = w;
    this.attackStart = time;
    this.attackHits.clear();
    this.shotFired = false;
    this.airAttack = !this.grounded;
    if (w === "ray") {
      this.stateUntil = time + 400;
      this.setAnim("angely_ray", "shoot", true);
      Audio.sfx("ray");
    } else if (w === "cog") {
      this.stateUntil = time + 280;
      this.setAnim("angely_boomerang", "throw", true);
    } else if (w === "boomerang") {
      this.stateUntil = time + 300;
      this.setAnim("angely_boomerang", "throw", true);
    } else if (w === "wand") {
      this.stateUntil = time + 340;
      this.setAnim("angely_wand", "cast", true);
      Audio.sfx("wand_charge");
    } else if (w === "bow") {
      this.stateUntil = time + 300;
      this.setAnim("angely_bow", "shoot", true);
    } else if (w === "hammer") {
      this.stateUntil = time + 450;
      this.setAnim("angely_hammer", "smash", true);
      Audio.sfx("hammer_swing");
    } else {
      this.stateUntil = time + (this.airAttack ? 360 : 320);
      this.setAnim("angely_sword", this.airAttack ? "jump_attack" : "slash", true);
      Audio.sfx("sword_swing");
    }
  }

  private pickAnim(time: number, axis: number) {
    this.sprite.anims.timeScale = 1;
    if (this.state === "attack") return;
    const sword = this.hasSword;
    if (this.swim) {
      const vx = Math.abs(this.body.velocity.x);
      if (this.state === "hurt") this.setAnim("angely_swim", "hurt");
      else if (time - this.lastStroke < 360 && vx < 140) this.setAnim("angely_swim", "up");
      else if (vx > 60) {
        this.setAnim("angely_swim", "swim");
        this.sprite.anims.timeScale = Phaser.Math.Clamp(vx / 200, 0.7, 1.3);
      } else this.setAnim("angely_swim", "float");
      return;
    }
    if (this.state === "hurt") {
      this.setAnim(sword ? "angely_sword" : "angely", "hurt");
      return;
    }
    const body = this.body;
    if (!this.grounded) {
      const vy = body.velocity.y;
      if (vy < -260) this.setAnim("angely", "jump");
      else if (vy < 220) this.setAnim("angely", "air");
      else this.setAnim("angely", "fall");
      return;
    }
    if (this.pushing && axis !== 0) {
      this.setAnim("angely", "push");
      return;
    }
    if (time < this.landUntil && Math.abs(body.velocity.x) < 200) return;
    const speed = Math.abs(body.velocity.x);
    const anim = this.sprite.anims.currentAnim?.key ?? "";
    const pushing = axis !== 0 && Math.sign(axis) === Math.sign(body.velocity.x || axis);
    if (!pushing && speed > 200 && !anim.endsWith(":stop")) {
      this.moveAnimUntil = time + 220;
      this.setAnim("angely", "stop", true);
      return;
    }
    if (pushing && speed < 120 && (anim.endsWith(":idle") || anim.endsWith(":land"))) {
      this.moveAnimUntil = time + 160;
      this.setAnim("angely", "start", true);
      return;
    }
    if (time < this.moveAnimUntil && (anim.endsWith(":stop") || anim.endsWith(":start"))) return;
    if (speed > 225) {
      this.setAnim("angely", "run");
      this.sprite.anims.timeScale = Phaser.Math.Clamp(speed / RUN_ANIM_SPEED, 0.7, 1.3);
    } else if (speed > 15) {
      this.setAnim("angely", "walk");
      this.sprite.anims.timeScale = Phaser.Math.Clamp(speed / WALK_ANIM_SPEED, 0.6, 1.4);
    } else this.setAnim(sword ? "angely_sword" : "angely", "idle");
  }

  stompBounce(jumpHeld: boolean) {
    this.body.setVelocityY(-(jumpHeld ? JUMP_V * 0.95 : STOMP_BOUNCE));
    this.jumpCut = !jumpHeld;
    this.lastGrounded = -1000;
  }

  /** Damage from enemies, projectiles and hazards. Returns true if a heart was lost. */
  hurt(fromX: number): boolean {
    if (!this.alive || this.invulnerable || this.state === "celebrate" || this.state === "pickup") return false;
    if (this.starPower) return false; // star power: immune
    if (this.shieldActive) {
      this.setShield(false); // shield absorbs one hit
      Audio.sfx("sword_clink");
      this.invulnUntil = this.scene.time.now + INVULN_MS;
      return false;
    }
    this.hearts = Math.max(0, this.hearts - 1);
    this.scene.onHeartsChanged(this.hearts);
    Audio.sfx("player_hurt");
    this.scene.cameras.main.shake(160, 0.008);
    this.invulnUntil = this.scene.time.now + INVULN_MS;
    if (this.hearts <= 0) {
      this.die();
      return true;
    }
    const away = this.x < fromX ? -1 : 1;
    this.body.setVelocity(away * 280, -320);
    this.state = "hurt";
    this.stateUntil = this.scene.time.now + 360;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.sprite.setTint(0xff9090));
    this.scene.time.delayedCall(260, () => this.sprite.clearTint());
    return true;
  }

  heal(): boolean {
    if (this.hearts >= MAX_HEARTS || !this.alive) return false;
    this.hearts++;
    this.scene.onHeartsChanged(this.hearts);
    return true;
  }

  /** Pit or lava: lose one heart and return to the checkpoint. */
  fall(respawnX: number, respawnY: number) {
    if (!this.alive) return;
    Audio.sfx("fall");
    this.hearts = Math.max(0, this.hearts - 1);
    this.scene.onHeartsChanged(this.hearts);
    if (this.hearts <= 0) {
      this.state = "dead";
      this.body.setVelocity(0, 0);
      this.body.setAllowGravity(false);
      this.setAnim("angely", "dead", true);
      this.shadow.setVisible(false);
      this.scene.onPlayerDefeated(false);
      return;
    }
    this.body.reset(respawnX, respawnY);
    this.state = "normal";
    this.invulnUntil = this.scene.time.now + 1300;
    this.scene.cameras.main.flash(250, 255, 255, 255);
  }

  private die() {
    this.state = "dead";
    Audio.sfx("player_defeat");
    this.body.setVelocity(-this.facing * 120, -260);
    this.setAnim("angely", "defeat", true);
    this.scene.onPlayerDefeated(true);
  }

  /** Pulling the sword from its stone, or a short cheer for floating pickups. */
  playPickup(onDone: () => void, sword = true) {
    this.state = "pickup";
    this.body.setVelocity(0, this.body.velocity.y);
    if (sword) this.setAnim("angely_sword", "pickup", true);
    else this.setAnim("angely", "celebrate", true);
    this.scene.time.delayedCall(sword ? 1400 : 1100, () => {
      if (this.state === "pickup") this.state = "normal";
      onDone();
    });
  }

  celebrate() {
    this.state = "celebrate";
    this.body.setVelocity(0, 0);
    this.setAnim("angely", "celebrate", true);
  }

  freeze() {
    this.state = "frozen";
    this.body.setVelocity(0, 0);
  }

  unfreeze() {
    if (this.state === "frozen" || this.state === "celebrate") this.state = "normal";
  }

  private sync(time: number) {
    const s = this.sprite;
    s.x = this.x;
    const swimSheet = this.sheet === "angely_swim";
    s.y = swimSheet ? this.body.bottom - HEIGHT / 2 + 4 : this.body.bottom + 1;
    const tilt = swimSheet && s.anims.currentAnim?.key === "angely_swim:swim" ? Phaser.Math.Clamp(this.body.velocity.y / 900, -0.35, 0.35) * this.facing : 0;
    s.rotation = Phaser.Math.Linear(s.rotation, tilt, 0.2);
    s.setFlipX(this.facing < 0);
    s.setAlpha(this.invulnerable && this.alive && Math.floor(time / 70) % 2 ? 0.35 : 1);
    this.prevBottom = this.body.bottom;
    const surface = this.scene.surfaceBelow(this.x, this.body.bottom);
    if (surface === null || !s.visible) {
      this.shadow.setVisible(false);
    } else {
      const k = Phaser.Math.Clamp(1 - (surface - this.body.bottom) / 320, 0.3, 1);
      this.shadow.setVisible(true).setPosition(this.x, surface + 2).setScale(0.9 * k, 0.75 * k).setAlpha(0.32 * k);
    }
  }
}
