import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 228;
const SHATTERED_HEIGHT = 245;
type Phase = 1 | 2;
type Form = "veil" | "shattered";
type State = "intro" | "walk" | "claw" | "slam" | "shoot" | "burst" | "erupt" | "beam" | "aim" | "rain" | "radial" | "dash" | "teleport" | "barrage" | "hurt" | "recover" | "enrage" | "dead" | "spikes";

/** Chapter 10: face the target, telegraph, strike, then expose the core. */
export class CrystalVeilBoss {
  // Angelo 2026-10-24: lowered from 160, the fight was too hard.
  maxHp = 100;
  hp = this.maxHp;
  phase: Phase = 1;
  /** Two forms, ONE health pool (Angelo 2026-10-24: phase 3 removed):
   *  the crystal beast and the shattered brute. */
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
  private dashTarget = 0;
  private flashUntil = 0;
  private attackIndex = 0;
  private action = 0;
  private timers = new Set<Phaser.Time.TimerEvent>();
  /** Deadline for leaving a non-walk state; the watchdog below enforces it. */
  private stateUntil = 0;
  /** True while a transformation cutscene holds the boss. */
  private holdState = false;
  private effects = new Set<Phaser.GameObjects.GameObject>();
  /** Ice-spike attack timers, kept apart from `timers` so a windup recovery
   *  cancelAction() cannot cut the chain mid-eruption. */
  private spikeTimers = new Set<Phaser.Time.TimerEvent>();
  /** Live spike/crack visuals, managed manually (never in `effects`). */
  private spikeFx = new Set<Phaser.GameObjects.GameObject>();
  /** Frost patch pool (max 8): persistent images + hazard zones toggled
   *  on/off instead of creating/destroying physics bodies constantly. */
  private frostPool: { img: Phaser.GameObjects.Image; zone: Phaser.GameObjects.Rectangle; busy: boolean }[] = [];
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
  get attacking() { return ["claw","slam","shoot","burst","erupt","beam","aim","rain","radial","barrage","spikes"].includes(this.state); }
  get harmful() {
    const now = this.scene.time.now;
    return this.state === "walk" || (["claw","slam"].includes(this.state) && now >= this.strikeFrom && now < this.strikeUntil);
  }
  get vulnerable() { return !["intro","enrage","dead","teleport"].includes(this.state); }

  /** Sprite sheet + display height of the current form. */
  private get sheet() { return this.form === "shattered" ? "veil_form2" : "crystalveil"; }
  private get formHeight() { return this.form === "shattered" ? SHATTERED_HEIGHT : HEIGHT; }

  hitbox() {
    const reach = this.state === "claw" && this.harmful ? 100 : 0;
    const w = this.form === "shattered" ? 112 : 96;
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
      // A windup timeScale must not leak into the recovered idle.
      this.sprite.anims.timeScale = 1;
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
      const speed = [0,132,158][this.phase];
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
    return this.phase === 2 ? 0xffa94d : 0xb57cff;
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

  private chooseAttack(time: number, distance: number) {
    // The Brute blinks across the arena every fourth attack (Angelo
    // 2026-10-23: the boss must move much more).
    const blinkTurn = this.form === "shattered" && this.attackIndex % 4 === 3;
    if (blinkTurn) {
      this.attackIndex++;
      // The Brute just blinks — crude, like him.
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
    // Projectile-forward since 2026-10-23 (Angelo): aimed volleys and
    // crystal rain join the fans.
    const patterns: State[][] = [
      [], ["shoot","aim","claw","slam","spikes"], ["burst","aim","slam","rain","claw","spikes"]
    ];
    let next = patterns[this.phase][this.attackIndex++ % patterns[this.phase].length];
    if (next === "claw" && distance > 210) next = "shoot";
    if (next === "shoot" && distance < 150) next = "claw";
    if (next === "aim" && distance < 120) next = "claw";
    if (next === "claw") this.melee(time,false);
    else if (next === "slam") this.melee(time,true);
    else if (next === "aim") this.aimedVolley(time);
    else if (next === "rain") this.crystalRain(time);
    else if (next === "spikes") this.iceSpikes(time);
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
    this.clearSpikes();
    this.strikeFrom = this.strikeUntil = 0;
  }

  /** Delayed call for the ice-spike chain, independent of `timers`. */
  private spikeLater(ms: number, fn: () => void) {
    let timer: Phaser.Time.TimerEvent;
    timer = this.scene.time.delayedCall(ms, () => {
      this.spikeTimers.delete(timer);
      if (!this.sprite.active || !this.alive || !this.scene.player.alive) return;
      fn();
    });
    this.spikeTimers.add(timer);
  }

  /** Drop every live spike visual/timer/zone and release the frost pool. */
  private clearSpikes() {
    this.spikeTimers.forEach(timer => timer.remove(false));
    this.spikeTimers.clear();
    this.spikeFx.forEach(fx => fx.destroy());
    this.spikeFx.clear();
    // Zones are group members: a plain destroy() left dead entries listed
    // by getChildren() in harness reads, so remove explicitly first. Any
    // live spike zone dies with the aborted attack (transition/death).
    for (const h of [...this.scene.hazards.getChildren()]) {
      const zone = h as Phaser.GameObjects.Rectangle;
      if (zone.getData("spike")) {
        this.scene.hazards.remove(zone, false, false);
        zone.destroy();
      }
    }
    for (const p of this.frostPool) {
      (p.zone.body as Phaser.Physics.Arcade.Body).enable = false;
      p.img.setAlpha(0);
      p.busy = false;
    }
  }

  private windup(state: State, anim: string, time: number, ms: number, active: number, recovery: number, fire: () => void) {
    this.cancelAction();
    this.state = state;
    this.strikeFrom = time + ms;
    this.strikeUntil = this.strikeFrom + active;
    this.stateUntil = time + ms + active + recovery + 900;
    const meta = (SPRITES as Record<string, { anims: Record<string, { start: number; end?: number; frameRate?: number; fps?: number }> }>)[this.sheet];
    const clip = meta.anims[anim] ?? meta.anims.attack;
    this.glow.setTint(0xb57cff);
    // Attack wiring (2026-10-27): play the real attack animation instead of
    // three frozen poses. The anim is stretched to span the whole strike
    // window (windup + active), so the strike pose lands on the fire
    // moment — but fire() itself still runs at exactly ms, so damage
    // windows, projectile timing and difficulty do not change. Only
    // frozen poses become motion.
    if (clip) {
      const frames = (clip.end ?? clip.start) - clip.start + 1;
      const rate = clip.frameRate ?? clip.fps ?? 24;
      const animMs = (frames / rate) * 1000;
      this.sprite.play(`${this.sheet}:${meta.anims[anim] ? anim : "attack"}`, true);
      this.sprite.anims.timeScale = animMs / (ms + active);
    } else {
      this.sprite.anims.stop();
    }
    this.later(ms, () => { fire(); });
    this.later(ms+active,() => {
      this.cancelAction();
      this.state = "recover";
      this.until = this.scene.time.now + recovery;
      this.sprite.clearTint().play(`${this.sheet}:stagger`,true);
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
    const ms = (slam ? 740 : 620) * [0,1,.9][this.phase];
    this.windup(slam ? "slam" : "claw",slam ? "slam" : "claw",time,ms,200,this.recovery(),() => {
      Audio.sfx(slam ? "ground_slam" : "skeleton_swing");
      this.scene.cameras.main.shake(160,slam ? .004 : .002);
      if (slam) {
        this.scene.spawnShockwave(this.x,1,0xc59bff);
        this.scene.spawnShockwave(this.x,-1,0xc59bff);
        this.scene.spawnShockRing(this.x);
        this.scene.fx("crystal_shot","impact",this.x,GROUND_Y-12,.45);
      } else this.scene.fx("crystal_shot","impact",this.x+this.dir*108,GROUND_Y-110,.3);
    });
    this.mark(this.x+(slam ? 0 : this.dir*90),slam ? 250 : 170);
  }

  private volley(time: number, burst: boolean) {
    this.windup(burst ? "burst" : "shoot",burst ? "double" : "shoot",time,650*[0,1,.9][this.phase],280,this.recovery(),() => {
      Audio.sfx("ghost_orb");
      const count = burst ? 3 : this.phase === 1 ? 1 : 2;
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
    this.windup("aim", "aim", time, 560 * [0,1,.9][this.phase], 240, this.recovery(), () => {
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
    });
    this.mark(this.x + this.dir * 85, 85);
  }

  /** Crystal rain: shards fall over the player's stretch of floor,
   *  telegraphed on the ground first. Punishes camping one spot. */
  private crystalRain(time: number) {
    const px = this.scene.player.x;
    const offsets = [-170,-85,0,85,170];
    const spots = offsets.map(o => Phaser.Math.Clamp(px + o, this.arena.x0 + 40, this.arena.x1 - 40));
    this.windup("rain", "sky", time, 820 * [0,1,.9][this.phase], 420, this.recovery(), () => {
      Audio.sfx("ghost_orb");
      for (const x of spots) {
        this.scene.spawnProjectile("crystal_shot", x, GROUND_Y - 440,
          0, 305, scaleForHeight("crystal_shot", 30, "fly"));
      }
    });
    spots.forEach(x => this.mark(x, 60));
  }

  private recovery() { return [0,450,380][this.phase]; }

  /** Ice Spikes, the Crystal Veil signature attack (feel package 2026-10-26).
   *  Telegraph cracks -> chain toward the player's X computed ONCE -> fan-out
   *  near the player -> oversized final spike -> frost left behind. Spikes
   *  hurt through short-lived hazard zones; frost patches are pooled (max 8)
   *  and only hazardous in Phase 2. Runs on its own timers, not windup(),
   *  so the chain cannot be cut by a recovery cancelAction(). */
  private iceSpikes(time: number) {
    const px = this.scene.player.x;
    const dir = px >= this.x ? 1 : -1;
    const dist = Math.min(Math.abs(px - this.x), 440);
    const count = Phaser.Math.Clamp(Math.round(dist / 44), 4, 10);
    const step = dist / count;
    // Approach chain, then a 3-lane fan at the player's feet; the center
    // fan spike is the oversized final hit.
    const spots: { x: number; final: boolean }[] = [];
    for (let i = 0; i < count - 3; i++) spots.push({ x: this.x + dir * step * (i + 1), final: false });
    spots.push({ x: px - 70, final: false });
    spots.push({ x: px + 70, final: false });
    spots.push({ x: px, final: true });
    this.state = "spikes";
    this.stateUntil = time + 550 + spots.length * 70 + 1400 + 900;
    this.sprite.play(`${this.sheet}:erupt`, true);
    Audio.sfx("boss_cast");
    // Telegraph: frost cracks under every future spike, pulsing 450-650ms.
    for (const s of spots) {
      const crack = this.scene.add.image(s.x, GROUND_Y - 6, "feel_crack").setDepth(33).setAlpha(0.2);
      this.spikeFx.add(crack);
      this.scene.tweens.add({ targets: crack, alpha: 0.9, scaleX: 1.1, duration: 500, yoyo: true, repeat: 0 });
    }
    spots.forEach((s, i) => {
      const at = 550 + i * 70;
      this.spikeLater(at, () => this.eruptSpike(s.x, s.final));
      this.spikeLater(at + 650, () => this.shatterSpike(s.x, s.final, i));
    });
    // Cracks fade once their spike erupts.
    this.spikeLater(550, () => {
      for (const fx of [...this.spikeFx]) {
        if ((fx as Phaser.GameObjects.Image).texture?.key === "feel_crack") {
          this.scene.tweens.add({ targets: fx, alpha: 0, duration: 200, onComplete: () => { this.spikeFx.delete(fx); fx.destroy(); } });
        }
      }
    });
    this.spikeLater(550 + spots.length * 70 + 1200, () => {
      if (this.state === "spikes" && this.alive) {
        this.state = "walk";
        this.readyAt = this.scene.time.now + 380;
        this.sprite.play(`${this.sheet}:walk`, true);
      }
    });
  }

  private eruptSpike(x: number, final: boolean) {
    const scale = final ? 1.3 : 1;
    const img = this.scene.add.image(x, GROUND_Y, "feel_spike").setOrigin(0.5, 1).setDepth(34).setScale(scale, 0);
    this.spikeFx.add(img);
    const zone = this.scene.add.rectangle(x, GROUND_Y - 40, 46, 80).setVisible(false);
    this.scene.hazards.add(zone);
    zone.setData("spike", true);
    // Exact link back to the zone: shatter removes it by reference, never
    // by x-match, and explicitly removes it from the hazards group (a plain
    // destroy() left dead entries listed by getChildren() in harness reads).
    img.setData("spikeZone", zone);
    this.scene.tweens.add({
      targets: img, scaleY: scale * 1.05, duration: 90, ease: "Back.out",
      onComplete: () => this.scene.tweens.add({ targets: img, scaleY: scale, duration: 50 }),
    });
    if (final) {
      Audio.sfx("ghost_orb");
      Audio.sfx("ground_slam");
      this.scene.spawnShockRing(x);
      this.scene.cameras.main.shake(200, 0.004);
    }
  }

  private shatterSpike(x: number, final: boolean, index: number) {
    // Remove this spike's image + hazard zone, leave frost behind. The zone
    // goes by stored reference with an explicit group removal, so no dead
    // entry lingers in the hazards list.
    for (const fx of [...this.spikeFx]) {
      const img = fx as Phaser.GameObjects.Image;
      if (img.texture?.key === "feel_spike" && Math.abs(img.x - x) < 2) {
        this.spikeFx.delete(fx);
        const zone = img.getData("spikeZone") as Phaser.GameObjects.Rectangle | undefined;
        if (zone) {
          this.scene.hazards.remove(zone, false, false);
          zone.destroy();
        }
        img.destroy();
      }
    }
    this.scene.fx("crystal_shot", "impact", x, GROUND_Y - 60, final ? 0.45 : 0.3);
    // Frost: Phase 1 visual only; Phase 2 the final spike and every 3rd
    // chain spike stay hazardous for 2s.
    const hazardous = this.phase === 2 && (final || index % 3 === 0);
    this.leaveFrost(x, hazardous);
  }

  private frostSlot() {
    let slot = this.frostPool.find(p => !p.busy);
    if (slot) return slot;
    if (this.frostPool.length >= 8) return undefined;
    const img = this.scene.add.image(0, 0, "feel_frost").setDepth(32).setAlpha(0);
    const zone = this.scene.add.rectangle(0, GROUND_Y - 8, 70, 26).setVisible(false);
    this.scene.hazards.add(zone);
    zone.setData("frost", true);
    (zone.body as Phaser.Physics.Arcade.Body).enable = false;
    slot = { img, zone, busy: false };
    this.frostPool.push(slot);
    return slot;
  }

  private leaveFrost(x: number, hazardous: boolean) {
    const slot = this.frostSlot();
    if (!slot) return;
    slot.busy = true;
    slot.img.setPosition(x, GROUND_Y - 8).setAlpha(hazardous ? 0.6 : 0.4);
    if (hazardous) {
      slot.zone.setPosition(x, GROUND_Y - 8);
      (slot.zone.body as Phaser.Physics.Arcade.Body).enable = true;
      this.spikeLater(2000, () => {
        (slot.zone.body as Phaser.Physics.Arcade.Body).enable = false;
        this.scene.tweens.add({ targets: slot.img, alpha: 0, duration: 250, onComplete: () => { slot.busy = false; } });
      });
    } else {
      this.spikeLater(1500, () => {
        this.scene.tweens.add({ targets: slot.img, alpha: 0, duration: 400, onComplete: () => { slot.busy = false; } });
      });
    }
  }

  takeDamage(amount: number, kind: DamageKind, fromX: number) {
    const time = this.scene.time.now;
    if (!this.vulnerable || time < this.hitUntil) {
      // Phase-transition hold: immune, NOT intangible. Sword hits still
      // connect visually (crystal spark + dull clink) but change nothing:
      // no HP loss, no hit-stop, no recoil.
      if (this.state === "enrage" && this.holdState) {
        this.scene.fx("crystal_shot", "impact", fromX, GROUND_Y - 110, 0.22);
        Audio.sfx("sword_clink");
      }
      return false;
    }
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
    if (!this.hp) { this.scene.onBossHp(this.hp,this.maxHp,amount); this.die(); return true; }
    const phase: Phase = this.hp <= this.maxHp*.6 ? 2 : 1;
    if (phase > this.phase) {
      // Clamp at the threshold: a heavy hit must not shave Phase 2 HP.
      this.hp = this.maxHp * 0.6;
      this.scene.onBossHp(this.hp,this.maxHp,amount);
      this.clearSpikes();
      this.cancelAction();
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
      this.phase = phase;
      this.attackIndex = 0;
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
      // Normal hit: report HP so the HUD bar tracks every hit (the death
      // and crossing branches report their own values above).
      this.scene.onBossHp(this.hp,this.maxHp,amount);
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
