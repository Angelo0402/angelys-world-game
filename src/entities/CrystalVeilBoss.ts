import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 228;
const SHATTERED_HEIGHT = 245;
const SOV_HEIGHT = 248;
type Phase = 1 | 2 | 3;
type Form = "veil" | "shattered" | "sovereign";
type State = "intro" | "walk" | "claw" | "slam" | "shoot" | "burst" | "erupt" | "beam" | "aim" | "rain" | "radial" | "dash" | "teleport" | "barrage" | "hurt" | "recover" | "enrage" | "dead";

/** Chapter 10: face the target, telegraph, strike, then expose the core. */
export class CrystalVeilBoss {
  maxHp = 160;
  hp = this.maxHp;
  phase: Phase = 1;
  /** Three forms, ONE health pool (2026-10-20 regeneration): the crystal
   *  beast, the shattered brute, and the Sovereign who rises at phase 3. */
  form: Form = "veil";
  x: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private state: State = "intro";
  private dir: 1 | -1 = -1;
  private until = 0;
  private readyAt = 0;
  private strikeFrom = 0;
  private strikeUntil = 0;
  private hitUntil = 0;
  private beamVariant = 0;
  private dashTarget = 0;
  private flashUntil = 0;
  private attackIndex = 0;
  private action = 0;
  private timers = new Set<Phaser.Time.TimerEvent>();
  /** Deadline for leaving a non-walk state; the watchdog below enforces it. */
  private stateUntil = 0;
  /** True while the Sovereign transformation waits on its intro dialogue. */
  private holdState = false;
  private effects = new Set<Phaser.GameObjects.GameObject>();
  private scene: GameScene;
  private arena: { x0: number; x1: number };

  constructor(scene: GameScene, x: number, arena: { x0: number; x1: number }) {
    this.scene = scene;
    this.arena = arena;
    this.x = x;
    this.shadow = scene.add.image(x, GROUND_Y + 5, "shadow").setDepth(30).setAlpha(.38).setDisplaySize(160,28);
    this.glow = scene.add.image(x, GROUND_Y - 100, "glow").setDepth(45).setTint(0xb57cff)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(.22).setDisplaySize(210,210);
    this.sprite = scene.add.sprite(x, GROUND_Y + 4, "crystalveil").setDepth(46)
      .setScale(scaleForHeight("crystalveil", HEIGHT, "idle")).setFlipX(true);
    applyOrigin(this.sprite, "crystalveil");
    this.sprite.play("crystalveil:idle");
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelAction());
  }

  get y() { return GROUND_Y - 110; }
  get alive() { return this.state !== "dead"; }
  get attacking() { return ["claw","slam","shoot","burst","erupt","beam","aim","rain","radial","barrage"].includes(this.state); }
  get harmful() {
    const now = this.scene.time.now;
    return this.state === "walk" || (["claw","slam"].includes(this.state) && now >= this.strikeFrom && now < this.strikeUntil);
  }
  get vulnerable() { return !["intro","enrage","dead","teleport"].includes(this.state); }

  /** Sprite sheet + display height of the current form. */
  private get sheet() { return this.form === "sovereign" ? "sovereign2" : this.form === "shattered" ? "veil_form2" : "crystalveil"; }
  private get formHeight() { return this.form === "sovereign" ? SOV_HEIGHT : this.form === "shattered" ? SHATTERED_HEIGHT : HEIGHT; }

  hitbox() {
    const reach = this.state === "claw" && this.harmful ? 100 : 0;
    const w = this.form === "sovereign" ? 124 : this.form === "shattered" ? 112 : 96;
    const h = this.formHeight;
    return new Phaser.Geom.Rectangle(this.x - w / 2 - (this.dir < 0 ? reach : 0), GROUND_Y - h + 32, w + reach, h - 36);
  }

  begin() {
    this.state = "walk";
    this.readyAt = this.scene.time.now + 900;
    this.sprite.play(`${this.sheet}:walk`, true);
  }

  update(time: number, delta: number) {
    if (!this.sprite.active) return;
    if (this.flashUntil && time >= this.flashUntil) {
      this.sprite.clearTint();
      this.flashUntil = 0;
    }
    // Watchdog: attack/enrage states exit through timed callbacks, and a
    // callback can be dropped (e.g. the player died the same frame). Never
    // let the boss freeze mid-pose — force it back to walking.
    if (!this.holdState && this.stateUntil && time > this.stateUntil
      && !["walk", "intro", "dead", "hurt", "recover"].includes(this.state)) {
      this.cancelAction();
      this.state = "walk";
      this.readyAt = time + 350;
      this.sprite.clearTint();
      // A dropped callback mid-blink used to strand the boss invisible
      // forever: cancelAction() removes blinkTo's arrival timer, whose
      // callback owned the fade back in. Recovery must restore full
      // visibility itself — kill any orphaned fade tween, then alpha 1.
      // (Harness find 2026-10-23: one >700ms frame jump across a
      // teleport left her at alpha 0 while she kept fighting.)
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAlpha(1);
      this.sprite.play(`${this.sheet}:idle`, true);
    }
    if (this.state === "dash") {
      const step = 660 * Math.min(delta, 50) / 1000;
      const dx = this.dashTarget - this.x;
      if (Math.abs(dx) <= step || time > this.stateUntil) {
        if (Math.abs(dx) <= step) this.x = this.dashTarget;
        this.state = "walk";
        this.sprite.anims.timeScale = 1;
        this.readyAt = time + 200;
      } else {
        this.x += Math.sign(dx) * step;
      }
    }
    if (this.scene.player.alive && this.state === "walk") {
      const dx = this.scene.player.x - this.x;
      this.dir = dx < 0 ? -1 : 1;
      this.sprite.setFlipX(this.dir < 0);
      const speed = this.form === "sovereign" ? 215 : [0,132,158,182][this.phase];
      if (Math.abs(dx) > 170) {
        this.x = Phaser.Math.Clamp(this.x + this.dir * speed * Math.min(delta,50)/1000, this.arena.x0+120, this.arena.x1-120);
        this.sprite.play(`${this.sheet}:walk`,true);
      } else if (this.scene.player.sprite.y < GROUND_Y - 150) {
        // Angelo 2026-10-23: he froze under her platform and read as stuck
        // on a block. When she is overhead, he steps OUT to striking range
        // instead of standing under her.
        const out = (dx > 4 ? -1 : dx < -4 ? 1 : this.x < (this.arena.x0 + this.arena.x1) / 2 ? -1 : 1) as 1 | -1;
        this.dir = out;
        this.sprite.setFlipX(this.dir < 0);
        this.x = Phaser.Math.Clamp(this.x + out * speed * Math.min(delta,50)/1000, this.arena.x0+120, this.arena.x1-120);
        this.sprite.play(`${this.sheet}:walk`,true);
      } else this.sprite.play(`${this.sheet}:idle`,true);
      if (time >= this.readyAt) this.chooseAttack(time, Math.abs(dx));
    } else if (["hurt","recover"].includes(this.state) && time >= this.until) {
      this.sprite.clearTint();
      // Angelo 2026-10-23: he must MOVE. Every third recovery ends in a
      // dash across the arena instead of standing back up in place.
      if (this.state === "recover" && this.attackIndex % 3 === 2 && this.scene.player.alive) this.startDash(time);
      else {
        this.state = "walk";
        this.readyAt = time + 90;
      }
    }
    this.sprite.setPosition(this.x, GROUND_Y + 4);
    this.shadow.setPosition(this.x, GROUND_Y + 6);
    this.glow.setPosition(this.x, GROUND_Y - 104).setAlpha(this.alive ? .2 + this.phase*.045 + Math.sin(time/220)*.035 : 0);
  }

  /** Aura color of the current form/phase, restored after attack telegraphs. */
  private auraTint() {
    return this.form === "sovereign" ? 0xff9df3 : this.phase === 3 ? 0xff5d7a : this.phase === 2 ? 0xffa94d : 0xb57cff;
  }

  /** Fast repositioning dash THROUGH the player's position to the far
   *  side — the boss crosses the arena instead of pacing in place. */
  private startDash(time: number) {
    const px = this.scene.player.x;
    const side = px > this.x ? 1 : -1;
    this.dashTarget = Phaser.Math.Clamp(px + side * 300, this.arena.x0 + 120, this.arena.x1 - 120);
    this.state = "dash";
    this.stateUntil = time + 620;
    this.dir = this.dashTarget >= this.x ? 1 : -1;
    this.sprite.setFlipX(this.dir < 0);
    // New dash pose (2026-10-23 sheets); older sheets fall back to a
    // sped-up walk.
    const meta = (SPRITES as Record<string, { anims: Record<string, unknown> }>)[this.sheet];
    if (meta.anims.dash) {
      this.sprite.play(`${this.sheet}:dash`, true);
      this.sprite.anims.timeScale = 1;
    } else {
      this.sprite.play(`${this.sheet}:walk`, true);
      this.sprite.anims.timeScale = 2.4;
    }
    Audio.sfx("ghost_orb");
  }

  /** The white-flash teleport move (Angelo 2026-10-23): she flashes
   *  WHITE and fades out, then reappears on the other side white and
   *  settles back into color. Caller owns the state; this only moves. */
  private blinkTo(target: number, arriveInMs: number) {
    this.scene.fx("crystal_shot", "impact", this.x, GROUND_Y - 110, .9);
    Audio.sfx("ghost_orb");
    this.sprite.setTintFill(0xffffff);
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 160, ease: "Quad.In" });
    this.later(arriveInMs, () => {
      this.x = target;
      const px = this.scene.player.x;
      this.dir = px >= this.x ? 1 : -1;
      this.sprite.setFlipX(this.dir < 0);
      this.scene.fx("crystal_shot", "impact", this.x, GROUND_Y - 110, .9);
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 230, ease: "Quad.Out" });
    });
    this.later(arriveInMs + 110, () => this.sprite.clearTint());
  }

  /** Sovereign reposition: teleport behind the player, fight on at once. */
  private teleportStrike(time: number) {
    this.state = "teleport";
    this.stateUntil = time + 900;
    const px = this.scene.player.x;
    const side = px > this.x ? 1 : -1;
    const target = Phaser.Math.Clamp(px - side * 300, this.arena.x0 + 120, this.arena.x1 - 120);
    this.blinkTo(target, 200);
    this.later(480, () => {
      if (this.state === "teleport") {
        this.state = "walk";
        this.readyAt = this.scene.time.now + 120;
      }
    });
  }

  /** Aimed triple, fired instantly (the barrage's own volley). */
  private fireAimed() {
    Audio.sfx("ghost_orb");
    const muzzleX = this.x + this.dir * 74, muzzleY = GROUND_Y - 108;
    const tx = this.scene.player.x, ty = this.scene.player.sprite.y - 52;
    const base = Math.atan2(ty - muzzleY, tx - muzzleX);
    const speed = 320 + this.phase * 30;
    for (const off of [-0.12, 0, 0.12]) {
      const a = base + off;
      this.scene.spawnProjectile("crystal_shot", muzzleX, muzzleY,
        Math.cos(a) * speed, Math.sin(a) * speed, scaleForHeight("crystal_shot", 30, "fly"));
    }
  }

  /** Radial 8-way, fired instantly (the barrage's finale). */
  private fireRadial() {
    Audio.sfx("ghost_orb");
    const cx = this.x, cy = GROUND_Y - 118, speed = 238;
    for (let k = 0; k < 10; k++) {
      const deg = k * 36;
      if (deg === 72 || deg === 108) continue;
      const a = Phaser.Math.DegToRad(deg);
      this.scene.spawnProjectile("crystal_shot", cx, cy,
        Math.cos(a) * speed, Math.sin(a) * speed, scaleForHeight("crystal_shot", 30, "fly"));
    }
  }

  /** SUPER ATTACK (Angelo 2026-10-23): teleport to one side of the
   *  player, fire an aimed volley, teleport THROUGH to the other side,
   *  and finish with a radial burst. She is suddenly everywhere. */
  private barrage(time: number) {
    this.state = "barrage";
    this.stateUntil = time + 3800;
    const land = (sign: number) => Phaser.Math.Clamp(
      this.scene.player.x + sign * 340, this.arena.x0 + 120, this.arena.x1 - 120);
    const firstSign = this.scene.player.x > this.x ? -1 : 1;
    this.blinkTo(land(firstSign), 200);
    this.later(620, () => this.fireAimed());
    this.later(1080, () => this.blinkTo(land(this.dir), 200));
    this.later(1700, () => this.fireRadial());
    this.later(2250, () => {
      if (this.state === "barrage") {
        this.state = "walk";
        this.readyAt = this.scene.time.now + 500;
      }
    });
  }

  private chooseAttack(time: number, distance: number) {
    // The Sovereign blinks across the arena every third attack — she does
    // not walk at you, she is suddenly behind you. The Brute learned the
    // trick too (Angelo 2026-10-23: the boss must move much more).
    const blinkTurn = (this.form === "sovereign" && this.attackIndex % 3 === 2)
      || (this.form === "shattered" && this.attackIndex % 4 === 3);
    if (blinkTurn) {
      this.attackIndex++;
      // The Sovereign TELEPORTS with Angelo's white-flash effect (color ->
      // white -> gone, then white -> color on the other side, 2026-10-23).
      // The Brute just blinks — crude, like him.
      if (this.form === "sovereign") { this.teleportStrike(time); return; }
      const px = this.scene.player.x;
      this.scene.fx("crystal_shot", "impact", this.x, GROUND_Y - 110, .9);
      Audio.sfx("ghost_orb");
      const side = px > this.x ? 1 : -1;
      this.x = Phaser.Math.Clamp(px - side * 300, this.arena.x0 + 120, this.arena.x1 - 120);
      this.dir = side;
      this.sprite.setFlipX(this.dir < 0);
      this.scene.fx("crystal_shot", "impact", this.x, GROUND_Y - 110, .9);
      this.readyAt = time + 430;
      return;
    }
    // Predictable escalation, independent of framerate and Math.random().
    // Projectile-forward since 2026-10-23 (Angelo): aimed volleys, crystal
    // rain and radial bursts join the fans; the beam stays in phase 3 only.
    const patterns: State[][] = [
      [], ["shoot","aim","claw","slam"], ["burst","aim","slam","rain","claw"], ["beam","barrage","aim","radial","erupt","rain","burst"]
    ];
    let next = patterns[this.phase][this.attackIndex++ % patterns[this.phase].length];
    if (next === "claw" && distance > 210) next = "shoot";
    if (next === "shoot" && distance < 150) next = "claw";
    if (next === "aim" && distance < 120) next = "claw";
    if (next === "claw") this.melee(time,false);
    else if (next === "slam") this.melee(time,true);
    else if (next === "erupt") this.erupt(time);
    else if (next === "beam") this.beam(time);
    else if (next === "aim") this.aimedVolley(time);
    else if (next === "rain") this.crystalRain(time);
    else if (next === "radial") this.radialBurst(time);
    else if (next === "barrage") this.barrage(time);
    else this.volley(time,next === "burst");
  }

  private later(ms: number, fn: () => void, guarded = true) {
    const token = this.action;
    let timer: Phaser.Time.TimerEvent;
    timer = this.scene.time.delayedCall(ms, () => {
      this.timers.delete(timer);
      if (!this.sprite.active || !this.alive || !this.scene.player.alive) return;
      if (guarded && token !== this.action) return;
      fn();
    });
    this.timers.add(timer);
  }

  private track<T extends Phaser.GameObjects.GameObject>(effect: T): T {
    this.effects.add(effect);
    effect.once(Phaser.GameObjects.Events.DESTROY, () => this.effects.delete(effect));
    return effect;
  }

  private cancelAction() {
    this.action++;
    this.timers.forEach(timer => timer.remove(false));
    this.timers.clear();
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    this.strikeFrom = this.strikeUntil = 0;
  }

  private windup(state: State, anim: string, time: number, ms: number, active: number, recovery: number, fire: () => void) {
    this.cancelAction();
    this.state = state;
    this.strikeFrom = time + ms;
    this.strikeUntil = this.strikeFrom + active;
    this.stateUntil = time + ms + active + recovery + 900;
    const meta = (SPRITES as Record<string, { anims: Record<string, { start: number }> }>)[this.sheet];
    const clip = meta.anims[anim] ?? meta.anims.attack;
    this.glow.setTint(0xb57cff);
    this.sprite.anims.stop();
    this.sprite.setFrame(clip.start);
    this.later(ms*.5, () => this.sprite.setFrame(clip.start+1));
    this.later(ms, () => { this.sprite.setFrame(clip.start+2); fire(); });
    this.later(ms+active,() => {
      this.cancelAction();
      this.state = "recover";
      this.until = this.scene.time.now + recovery;
      this.sprite.clearTint().play(`${this.sheet}:${this.form === "sovereign" ? "hurt" : "stagger"}`,true);
      this.sprite.anims.timeScale = 1;
      this.glow.setTint(0x7affed);
    });
  }

  private mark(x: number, width: number) {
    const mark = this.track(this.scene.add.rectangle(x,GROUND_Y-5,width,12,0xff78cf,.35).setDepth(33));
    this.scene.tweens.add({targets:mark,alpha:.85,duration:220,yoyo:true,repeat:2});
    return mark;
  }

  private melee(time: number, slam: boolean) {
    const ms = (slam ? 740 : 620) * [0,1,.9,.8][this.phase];
    this.windup(slam ? "slam" : "claw",slam ? "slam" : "claw",time,ms,200,this.recovery(),() => {
      Audio.sfx(slam ? "ground_slam" : "skeleton_swing");
      this.scene.cameras.main.shake(160,slam ? .004 : .002);
      if (slam) {
        this.scene.spawnShockwave(this.x,1,0xc59bff);
        this.scene.spawnShockwave(this.x,-1,0xc59bff);
        this.scene.fx("crystal_shot","impact",this.x,GROUND_Y-12,.45);
      } else this.scene.fx("crystal_shot","impact",this.x+this.dir*108,GROUND_Y-110,.3);
    });
    this.mark(this.x+(slam ? 0 : this.dir*90),slam ? 250 : 170);
  }

  private volley(time: number, burst: boolean) {
    this.windup(burst ? "burst" : "shoot",burst ? "double" : "shoot",time,650*[0,1,.9,.8][this.phase],280,this.recovery(),() => {
      Audio.sfx("ghost_orb");
      const count = this.form === "sovereign" ? 5 : burst ? (this.phase === 3 ? 5 : 3) : this.phase === 1 ? 1 : 2;
      for (let i=0;i<count;i++) {
        const angle = count === 1 ? 0 : Phaser.Math.DegToRad(-24+48*i/(count-1));
        const speed = 245+this.phase*30;
        this.scene.spawnProjectile("crystal_shot",this.x+this.dir*74,GROUND_Y-108,
          this.dir*Math.cos(angle)*speed,Math.sin(angle)*speed,scaleForHeight("crystal_shot",30,"fly"));
      }
    });
    this.mark(this.x+this.dir*85,85);
  }

  /** Aimed triple shot AT the player's position (Angelo 2026-10-23:
   *  projectile attacks over everything). Small spread, real tracking —
   *  standing still stops being safe. */
  private aimedVolley(time: number) {
    this.windup("aim", "aim", time, 560 * [0,1,.9,.8][this.phase], 240, this.recovery(), () => {
      Audio.sfx("ghost_orb");
      const muzzleX = this.x + this.dir * 74, muzzleY = GROUND_Y - 108;
      const tx = this.scene.player.x, ty = this.scene.player.sprite.y - 52;
      const base = Math.atan2(ty - muzzleY, tx - muzzleX);
      const speed = 320 + this.phase * 30;
      for (const off of [-0.12, 0, 0.12]) {
        const a = base + off;
        this.scene.spawnProjectile("crystal_shot", muzzleX, muzzleY,
          Math.cos(a) * speed, Math.sin(a) * speed, scaleForHeight("crystal_shot", 30, "fly"));
      }
      // The Sovereign adds a SEEKER ORB (Angelo 2026-10-23: different
      // projectiles) — slower than the shards, but it bends after her.
      if (this.form === "sovereign") {
        this.scene.spawnProjectile("fx_orb", muzzleX, muzzleY,
          Math.cos(base) * 205, Math.sin(base) * 205,
          scaleForHeight("fx_orb", 54, "fly"), 0xffb0f5, undefined, true);
      }
    });
    this.mark(this.x + this.dir * 85, 85);
  }

  /** Crystal rain: shards fall over the player's stretch of floor,
   *  telegraphed on the ground first. Punishes camping one spot. */
  private crystalRain(time: number) {
    const px = this.scene.player.x;
    const offsets = this.phase >= 3 ? [-260,-170,-85,0,85,170,260] : [-170,-85,0,85,170];
    const spots = offsets.map(o => Phaser.Math.Clamp(px + o, this.arena.x0 + 40, this.arena.x1 - 40));
    this.windup("rain", "sky", time, 820 * [0,1,.9,.8][this.phase], 420, this.recovery(), () => {
      Audio.sfx("ghost_orb");
      for (const x of spots) {
        this.scene.spawnProjectile("crystal_shot", x, GROUND_Y - 440,
          0, 305, scaleForHeight("crystal_shot", 30, "fly"));
      }
    });
    spots.forEach(x => this.mark(x, 60));
  }

  /** Radial burst: crystal shards in every direction except straight
   *  down into the floor — the gap underneath is the dodge lane. */
  private radialBurst(time: number) {
    this.windup("radial", "radial", time, 700, 300, this.recovery(), () => this.fireRadial());
    this.mark(this.x, 120);
  }

  private erupt(time: number) {
    const px = this.scene.player.x;
    const spots = (this.form === "sovereign" ? [px-300,px-150,px,px+150,px+300] : this.phase === 3 ? [px-150,px,px+150] : [px,px+180*this.dir])
      .map(x => Phaser.Math.Clamp(x,this.arena.x0+50,this.arena.x1-50));
    this.windup("erupt","erupt",time,900*[0,1,.9,.8][this.phase],480,this.recovery(),() => {
      Audio.sfx("ground_slam");
      for (const x of spots) {
        const s = this.track(this.scene.add.sprite(x,GROUND_Y+4,"crystalveil_fx").setDepth(40)
          .setScale(scaleForHeight("crystalveil_fx",96,"spikes")));
        applyOrigin(s,"crystalveil_fx");
        s.play("crystalveil_fx:spikes");
        const zone = this.track(this.scene.add.rectangle(x,GROUND_Y-40,42,76).setVisible(false));
        this.scene.hazards.add(zone);
      }
    });
    spots.forEach(x => this.mark(x,66));
  }

  private beam(time: number) {
    const origin = this.x+this.dir*76;
    const width = this.dir > 0 ? this.arena.x1-origin : origin-this.arena.x0;
    const mid = origin+this.dir*width/2;
    // The charge itself rumbles the ground — a big hit is coming.
    this.scene.cameras.main.shake(850,.0035);
    this.windup("beam","charge",time,850,650,this.recovery()+100,() => {
      Audio.sfx("ghost_orb");
      // A beam this size has to hit the CAMERA too: a frozen beat, then a
      // hard shake that lasts the whole blast so it reads as a huge attack.
      this.scene.hitStop(70);
      this.scene.cameras.main.shake(620,.015);
      // The blast runs off BOTH edges of the camera — an attack this big
      // has no visible end anywhere on screen, so it never reads as cut.
      // (The hazard zone below still spans only the arena, as telegraphed.)
      const spanL = -240, spanR = this.arena.x1+460;
      const ray = this.track(this.scene.add.sprite((spanL+spanR)/2,GROUND_Y-92,"crystalveil_beam")
        .setDepth(47).setDisplaySize(spanR-spanL,106).setFlipX(this.dir<0).setAlpha(.95));
      ray.play(`crystalveil_beam:beam_${"abc"[this.beamVariant++ % 3]}`);
      const zone = this.track(this.scene.add.rectangle(mid,GROUND_Y-92,Math.max(12,width-24),40).setVisible(false));
      this.scene.hazards.add(zone);
    });
    const warning = this.track(this.scene.add.rectangle(mid,GROUND_Y-92,width,5,0xff8bdc,.55).setDepth(42));
    this.scene.tweens.add({targets:warning,alpha:.12,duration:250,yoyo:true,repeat:2});
    Audio.sfx("boss_roar");
  }

  private recovery() { return [0,450,380,320][this.phase]; }

  takeDamage(amount: number, kind: DamageKind, _fromX: number) {
    const time = this.scene.time.now;
    if (!this.vulnerable || time < this.hitUntil) return false;
    this.hitUntil = time+260;
    // A stomp still bounces Angely, but cannot stun-lock the final boss.
    if (kind === "stomp") amount = .25;
    const before = this.hp;
    this.hp = Math.max(0,this.hp-amount);
    if (amount >= 2 && kind !== "stomp") this.scene.hitStop(60); // heavy hits land with a frozen beat
    // Bounded heart drops: one at each quarter of the fight's health, so a
    // long final fight stays survivable without flooding the arena.
    for (const threshold of [120, 80, 40]) {
      if (before > threshold && this.hp <= threshold) this.scene.bossHeartDrop(this.x);
    }
    Audio.sfx("boss_hit");
    this.scene.onBossHp(this.hp,this.maxHp,amount);
    if (!this.hp) {
      // Only the Sovereign form truly dies; an earlier form at zero is a
      // failsafe that forces the rise instead (thresholds normally catch it).
      if (this.form !== "sovereign") { this.phase = 3; this.transform(); return true; }
      this.die(); return true;
    }
    const phase: Phase = this.form === "sovereign" ? 3 : this.hp <= this.maxHp*.3 ? 3 : this.hp <= this.maxHp*.6 ? 2 : 1;
    if (phase > this.phase) {
      this.cancelAction();
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
      this.phase = phase;
      this.attackIndex = 0;
      // Phase 3 IS the Sovereign's rise — she takes over from here.
      if (phase === 3) { this.transform(); return true; }
      // Phase 2: the beast stands and shatters into the brute. The form
      // swap stays hidden behind the transformation cutscene (Angelo,
      // 2026-10-22); the boss is held until GameScene calls beginPhase2().
      if (phase === 2) this.swapForm("shattered");
      this.state = "enrage";
      this.holdState = true;
      this.stateUntil = 0;
      this.sprite.play(`${this.sheet}:enrage`,true);
      Audio.sfx("boss_roar");
      this.scene.onBossPhase2();
      this.scene.cameras.main.flash(220,110,70,170);
    } else {
      this.sprite.setTintFill(0xffffff);
      this.flashUntil = time+90;
      // Wind-ups and strikes finish even when hit. Heavy weapons briefly
      // stagger a walking boss; its attack schedule does not restart.
      if (kind !== "stomp" && amount >= 3 && this.state === "walk") {
        this.state = "hurt";
        this.until = time+160;
        this.sprite.play(`${this.sheet}:hurt`,true);
      }
    }
    return true;
  }

  /** Swap the sprite to another form's sheet (its own scale and origin). */
  private swapForm(form: Form) {
    this.form = form;
    this.sprite.clearTint();
    this.sprite.anims.stop();
    this.sprite.setTexture(this.sheet);
    applyOrigin(this.sprite, this.sheet);
    this.sprite.setScale(scaleForHeight(this.sheet, this.formHeight, "idle"));
    this.glow.setTint(this.auraTint());
  }

  /** Phase 3: the Sovereign rises — same health pool, her own sheet and
   *  moves; invulnerable while her rise line plays over live combat. */
  private transform() {
    this.cancelAction();
    this.form = "sovereign";
    this.state = "enrage"; // invulnerable while the Sovereign speaks
    this.holdState = true; // the subtitle beat, not a timer, ends this state
    this.stateUntil = 0;
    if (this.hp <= 0) this.hp = 24; // failsafe last stand
    this.phase = 3;
    this.attackIndex = 0;
    Audio.sfx("boss_roar");
    this.scene.cameras.main.flash(300, 150, 90, 220);
    this.scene.cameras.main.shake(500, .008);
    this.sprite.clearTint();
    this.sprite.anims.stop();
    this.sprite.setTexture(this.sheet);
    applyOrigin(this.sprite, this.sheet);
    this.sprite.setScale(scaleForHeight(this.sheet, SOV_HEIGHT, "idle"));
    this.sprite.play(`${this.sheet}:idle`);
    this.glow.setTint(0xff9df3);
    this.scene.onBossHp(this.hp, this.maxHp, 0);
    this.scene.onSovereignRise();
  }

  /** Called by the scene when the phase-2 transformation cutscene ends:
   *  the Brute starts fighting. */
  beginPhase2() {
    if (this.state === "dead" || this.form !== "shattered") return;
    this.holdState = false;
    this.state = "walk";
    this.readyAt = this.scene.time.now+300;
    this.glow.setTint(this.auraTint());
    this.sprite.play(`${this.sheet}:walk`,true);
  }

  /** Called by the scene when the Sovereign's intro dialogue ends. */
  beginSovereign() {
    if (this.state === "dead" || this.form !== "sovereign") return;
    this.holdState = false;
    this.state = "walk";
    this.readyAt = this.scene.time.now + 700;
    this.sprite.play(`${this.sheet}:walk`, true);
  }

  private die() {
    this.cancelAction();
    this.state = "dead";
    this.sprite.anims.timeScale = 1;
    this.sprite.clearTint().play(`${this.sheet}:dead`,true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(450,.006);
    this.scene.onBossDefeated();
  }

  vanish() {
    this.cancelAction();
    this.scene.tweens.add({targets:[this.sprite,this.shadow,this.glow],alpha:0,duration:650});
  }
}
