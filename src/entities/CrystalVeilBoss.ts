import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { GROUND_Y } from "../config";
import type { GameScene } from "../scenes/GameScene";
import type { DamageKind } from "./Enemy";

const HEIGHT = 228;
type Phase = 1 | 2 | 3;
type State = "intro" | "walk" | "claw" | "slam" | "shoot" | "burst" | "erupt" | "beam" | "hurt" | "recover" | "enrage" | "dead";
export const VEIL_BOSS_NAME = "CRYSTAL VEIL";

/** Chapter 10: face the target, telegraph, strike, then expose the core. */
export class CrystalVeilBoss {
  readonly maxHp = 160;
  hp = this.maxHp;
  phase: Phase = 1;
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
  private flashUntil = 0;
  private attackIndex = 0;
  private action = 0;
  private timers = new Set<Phaser.Time.TimerEvent>();
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
  get attacking() { return ["claw","slam","shoot","burst","erupt","beam"].includes(this.state); }
  get harmful() {
    const now = this.scene.time.now;
    return this.state === "walk" || (["claw","slam"].includes(this.state) && now >= this.strikeFrom && now < this.strikeUntil);
  }
  get vulnerable() { return !["intro","enrage","dead"].includes(this.state); }

  hitbox() {
    const reach = this.state === "claw" && this.harmful ? 100 : 0;
    return new Phaser.Geom.Rectangle(this.x - 48 - (this.dir < 0 ? reach : 0), GROUND_Y - HEIGHT + 32, 96 + reach, HEIGHT - 36);
  }

  begin() {
    this.state = "walk";
    this.readyAt = this.scene.time.now + 900;
    this.sprite.play("crystalveil:walk", true);
  }

  update(time: number, delta: number) {
    if (!this.sprite.active) return;
    if (this.flashUntil && time >= this.flashUntil) {
      this.sprite.clearTint();
      this.flashUntil = 0;
    }
    if (this.scene.player.alive && this.state === "walk") {
      const dx = this.scene.player.x - this.x;
      this.dir = dx < 0 ? -1 : 1;
      this.sprite.setFlipX(this.dir < 0);
      if (Math.abs(dx) > 170) {
        const speed = [0,96,125,150][this.phase];
        this.x = Phaser.Math.Clamp(this.x + this.dir * speed * Math.min(delta,50)/1000, this.arena.x0+120, this.arena.x1-120);
        this.sprite.play("crystalveil:walk",true);
      } else this.sprite.play("crystalveil:idle",true);
      if (time >= this.readyAt) this.chooseAttack(time, Math.abs(dx));
    } else if (["hurt","recover"].includes(this.state) && time >= this.until) {
      this.sprite.clearTint();
      this.state = "walk";
      this.readyAt = time + 90;
    }
    this.sprite.setPosition(this.x, GROUND_Y + 4);
    this.shadow.setPosition(this.x, GROUND_Y + 6);
    this.glow.setPosition(this.x, GROUND_Y - 104).setAlpha(this.alive ? .2 + this.phase*.045 + Math.sin(time/220)*.035 : 0);
  }

  private chooseAttack(time: number, distance: number) {
    // Predictable escalation, independent of framerate and Math.random().
    const patterns: State[][] = [
      [], ["shoot","claw","slam"], ["burst","slam","erupt","claw"], ["beam","erupt","burst","claw","slam"]
    ];
    let next = patterns[this.phase][this.attackIndex++ % patterns[this.phase].length];
    if (next === "claw" && distance > 210) next = "shoot";
    if (next === "shoot" && distance < 150) next = "claw";
    if (next === "claw") this.melee(time,false);
    else if (next === "slam") this.melee(time,true);
    else if (next === "erupt") this.erupt(time);
    else if (next === "beam") this.beam(time);
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
    const clip = (SPRITES.crystalveil.anims as Record<string, { start: number }>)[anim];
    this.glow.setTint(0xb57cff);
    this.sprite.anims.stop();
    this.sprite.setFrame(clip.start);
    this.later(ms*.5, () => this.sprite.setFrame(clip.start+1));
    this.later(ms, () => { this.sprite.setFrame(clip.start+2); fire(); });
    this.later(ms+active,() => {
      this.cancelAction();
      this.state = "recover";
      this.until = this.scene.time.now + recovery;
      this.sprite.clearTint().play("crystalveil:stagger",true);
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
    this.windup(burst ? "burst" : "shoot",burst ? "summon" : "shoot",time,650*[0,1,.9,.8][this.phase],280,this.recovery(),() => {
      Audio.sfx("ghost_orb");
      const count = burst ? (this.phase === 3 ? 5 : 3) : this.phase === 1 ? 1 : 2;
      for (let i=0;i<count;i++) {
        const angle = count === 1 ? 0 : Phaser.Math.DegToRad(-24+48*i/(count-1));
        const speed = 245+this.phase*30;
        this.scene.spawnProjectile("crystal_shot",this.x+this.dir*74,GROUND_Y-108,
          this.dir*Math.cos(angle)*speed,Math.sin(angle)*speed,scaleForHeight("crystal_shot",30,"fly"));
      }
    });
    this.mark(this.x+this.dir*85,85);
  }

  private erupt(time: number) {
    const px = this.scene.player.x;
    const spots = (this.phase === 3 ? [px-150,px,px+150] : [px,px+180*this.dir])
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
    this.windup("beam","charge",time,850,650,this.recovery()+100,() => {
      Audio.sfx("ghost_orb");
      const ray = this.track(this.scene.add.sprite(mid,GROUND_Y-92,"crystalveil_beam")
        .setDepth(47).setDisplaySize(width*1.14,106).setFlipX(this.dir<0).setAlpha(.95));
      ray.play("crystalveil_beam:beam");
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
    this.hp = Math.max(0,this.hp-amount);
    Audio.sfx("boss_hit");
    this.scene.onBossHp(this.hp,this.maxHp,amount);
    if (!this.hp) { this.die(); return true; }
    const phase: Phase = this.hp <= this.maxHp*.3 ? 3 : this.hp <= this.maxHp*.6 ? 2 : 1;
    if (phase > this.phase) {
      this.cancelAction();
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
      this.phase = phase;
      this.attackIndex = 0;
      this.state = "enrage";
      this.sprite.play("crystalveil:enrage",true);
      Audio.sfx("boss_roar");
      this.scene.onBossPhase2();
      this.scene.cameras.main.flash(220,110,70,170);
      this.later(1100,() => {
        this.state = "walk";
        this.readyAt = this.scene.time.now+300;
        this.glow.setTint(0xb57cff);
      });
    } else {
      this.sprite.setTintFill(0xffffff);
      this.flashUntil = time+90;
      // Wind-ups and strikes finish even when hit. Heavy weapons briefly
      // stagger a walking boss; its attack schedule does not restart.
      if (kind !== "stomp" && amount >= 3 && this.state === "walk") {
        this.state = "hurt";
        this.until = time+160;
        this.sprite.play("crystalveil:hurt",true);
      }
    }
    return true;
  }

  private die() {
    this.cancelAction();
    this.state = "dead";
    this.sprite.anims.timeScale = 1;
    this.sprite.clearTint().play("crystalveil:dead",true);
    Audio.sfx("boss_defeat");
    this.scene.cameras.main.shake(450,.006);
    this.scene.onBossDefeated();
  }

  vanish() {
    this.cancelAction();
    this.scene.tweens.add({targets:[this.sprite,this.shadow,this.glow],alpha:0,duration:650});
  }
}
