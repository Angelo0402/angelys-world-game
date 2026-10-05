import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import type { GameScene } from "../scenes/GameScene";
import type { EnemyType } from "./enemyTypes";

export type DamageKind = "stomp" | "sword" | "arrow" | "hammer" | "cog";

type State = "spawn" | "idle" | "patrol" | "chase" | "windup" | "active" | "recover" | "hurt" | "dead";

export class Enemy {
  readonly type: EnemyType;
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private warn: Phaser.GameObjects.Text;
  private scene: GameScene;
  private scale: number;
  hp: number;
  state: State = "spawn";
  dir: 1 | -1 = -1;
  private stateUntil = 0;
  private nextAttack = 0;
  private hoverY = 0;
  private hitDone = false;
  private dead = false;
  private tint?: number;
  isElite = false;

  /** Make this enemy ELITE: golden tint, 2x HP */
  makeElite() {
    this.isElite = true;
    this.hp = this.type.hp * 2;
    this.sprite.setTint(0xffd700); // Golden tint
  }

  constructor(scene: GameScene, type: EnemyType, x: number, y: number, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.type = type;
    this.hp = type.hp;
    this.scale = scaleForHeight(type.key, type.height, "idle");
    const meta = SPRITES[type.key];
    const w = meta.frameWidth * this.scale * type.body[0] * 0.75;
    const h = type.height * type.body[1];
    this.rect = scene.add.rectangle(x, y, w, h, 0xff0000, 0).setVisible(false);
    scene.physics.add.existing(this.rect);
    group.add(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(!type.flying);
    this.body.setMaxVelocity(900, 1200);
    this.rect.setData("enemy", this);

    this.shadow = scene.add.image(x, y, "shadow").setAlpha(0.28).setDepth(30);
    this.sprite = scene.add.sprite(x, y, type.key).setScale(this.scale).setDepth(40);
    applyOrigin(this.sprite, type.key);
    this.sprite.play(`${type.key}:idle`);
    this.tint = scene.chapter.enemyTint;
    this.restoreTint();
    this.warn = scene.add
      .text(x, y, "!", { fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold", color: "#ff4d4d", stroke: "#2a1640", strokeThickness: 6 })
      .setOrigin(0.5, 1)
      .setDepth(95)
      .setVisible(false);
    this.hoverY = y;
    this.dir = scene.player.x < x ? -1 : 1;
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 300 });
    this.setState("idle", 350 + Math.random() * 400);
    this.nextAttack = scene.time.now + 900 + Math.random() * 800;
  }

  get x() {
    return this.body.center.x;
  }
  get alive() {
    return !this.dead;
  }
  get harmful() {
    return !this.dead && this.state !== "hurt" && this.state !== "spawn";
  }

  private restoreTint() {
    if (this.tint) this.sprite.setTint(this.tint);
    else this.sprite.clearTint();
  }

  private setState(s: State, ms = 0) {
    this.state = s;
    this.stateUntil = this.scene.time.now + ms;
  }

  private play(anim: string, ignoreIfPlaying = true) {
    this.sprite.play(`${this.type.key}:${anim}`, ignoreIfPlaying);
  }

  update(time: number, frozen: boolean) {
    if (this.dead) return;
    const t = this.type;
    const player = this.scene.player;
    const dx = player.x - this.x;
    const dy = player.body.center.y - this.body.center.y;
    const adx = Math.abs(dx);
    const laneTol = t.flying ? 320 : 130;
    const sees = adx < 520 && Math.abs(dy) < laneTol + 60 && player.alive;

    if (frozen) {
      this.body.setVelocityX(0);
      if (t.flying) this.body.setVelocityY(0);
      this.sync();
      return;
    }

    switch (this.state) {
      case "idle":
        this.body.setVelocityX(0);
        this.play("idle");
        if (time > this.stateUntil) this.setState(sees ? "chase" : "patrol", 1500 + Math.random() * 1500);
        break;
      case "patrol":
        this.play("walk");
        this.walk(this.dir, t.speed * 0.6);
        if (sees) this.setState("chase");
        else if (time > this.stateUntil) this.setState("idle", 600 + Math.random() * 600);
        break;
      case "chase": {
        this.play("walk");
        this.dir = dx < 0 ? -1 : 1;
        const keep = t.keepDistance ?? 0;
        if (t.flying) {
          const targetX = player.x - this.dir * (t.attack === "dive" ? 120 : keep);
          const vx = Phaser.Math.Clamp((targetX - this.x) * 2, -t.speed, t.speed);
          this.body.setVelocityX(vx);
        } else if (adx > keep) {
          this.walk(this.dir, t.speed);
        } else {
          this.body.setVelocityX(0);
        }
        if (!sees) this.setState("patrol", 2000);
        else if (time > this.nextAttack && adx < t.range && Math.abs(dy) < laneTol) this.startWindup();
        break;
      }
      case "windup":
        this.body.setVelocityX(0);
        this.dir = dx < 0 ? -1 : 1;
        this.sprite.setTint(Math.floor(time / 90) % 2 ? 0xff7a7a : 0xffffff);
        if (time > this.stateUntil) {
          this.restoreTint();
          this.warn.setVisible(false);
          this.execute();
        }
        break;
      case "active":
        this.activeUpdate(time);
        break;
      case "recover":
        if (!t.flying || t.attack !== "dive") this.body.setVelocityX(0);
        if (time > this.stateUntil) this.setState("chase");
        break;
      case "hurt":
        this.body.velocity.x *= 0.9;
        if (time > this.stateUntil) this.setState("chase");
        break;
    }

    if (t.flying && !(this.state === "active" && t.attack === "dive")) {
      const target = this.hoverY + Math.sin(time / 380 + this.rect.x * 0.01) * 16;
      this.body.setVelocityY((target - this.body.center.y) * 3);
    }

    if (!t.flying && this.body.top > 700) {
      this.remove();
      return;
    }
    this.sync();
  }

  /** Walk without stepping off ledges; turns around at pit edges. */
  private walk(dir: 1 | -1, speed: number) {
    this.dir = dir;
    if (this.type.flying) {
      this.body.setVelocityX(dir * speed);
      return;
    }
    const ahead = this.x + dir * (this.body.halfWidth + 12);
    const onGround = this.body.blocked.down || this.body.touching.down;
    const bumped = dir > 0 ? this.body.blocked.right || this.body.touching.right : this.body.blocked.left || this.body.touching.left;
    if (bumped && this.state === "patrol") {
      this.dir = (dir * -1) as 1 | -1;
      return;
    }
    if (onGround && !this.scene.hasFooting(ahead, this.body.bottom)) {
      this.body.setVelocityX(0);
      if (this.state === "patrol") this.dir = (dir * -1) as 1 | -1;
      return;
    }
    this.body.setVelocityX(dir * speed);
  }

  private startWindup() {
    const t = this.type;
    this.setState("windup", t.windup);
    this.play("attack", false);
    this.sprite.anims.pause(this.sprite.anims.currentAnim!.frames[0]);
    this.warn.setVisible(true);
    Audio.sfx("enemy_telegraph");
  }

  private execute() {
    const t = this.type;
    const scene = this.scene;
    const player = scene.player;
    this.sprite.anims.resume();
    this.nextAttack = scene.time.now + t.cooldown + Math.random() * 600;
    this.hitDone = false;
    Audio.sfx(t.attackSfx);
    switch (t.attack) {
      case "shoot": {
        const p = t.projectile!;
        const ox = this.x + this.dir * this.body.halfWidth;
        const oy = this.body.center.y - (t.flying ? 0 : this.body.halfHeight * 0.2);
        let vx = this.dir * p.speed;
        let vy = 0;
        if (p.aimed) {
          const ang = Phaser.Math.Angle.Between(ox, oy, player.x, player.body.center.y);
          vx = Math.cos(ang) * p.speed;
          vy = Math.sin(ang) * p.speed;
        }
        scene.spawnProjectile(p.sheet, ox, oy, vx, vy, p.scale, p.tint);
        this.setState("recover", 450);
        break;
      }
      case "roll":
        this.setState("active", 900);
        break;
      case "lunge":
        this.setState("active", 260);
        break;
      case "dive": {
        const ang = Phaser.Math.Angle.Between(this.x, this.body.center.y, player.x, player.body.center.y);
        this.body.setVelocity(Math.cos(ang) * 460, Math.sin(ang) * 460);
        this.setState("active", 650);
        break;
      }
      case "melee":
        this.setState("active", 220);
        break;
      case "slam":
        scene.cameras.main.shake(180, 0.006);
        scene.groundSlam(this.x + this.dir * 40, this.body.bottom, 190);
        this.setState("recover", 700);
        break;
      case "lava":
        scene.spawnLava(this.x + this.dir * 50, this.body.bottom);
        this.setState("recover", 500);
        break;
    }
  }

  private activeUpdate(time: number) {
    const t = this.type;
    const scene = this.scene;
    switch (t.attack) {
      case "roll":
        this.walk(this.dir, t.speed * 4.2);
        this.sprite.angle += this.dir * 18;
        break;
      case "lunge":
        this.walk(this.dir, t.speed * 3.2);
        break;
      case "melee":
        this.body.setVelocityX(0);
        if (!this.hitDone) {
          this.hitDone = true;
          const reach = new Phaser.Geom.Rectangle(
            this.dir > 0 ? this.x : this.x - t.range,
            this.body.top - 10,
            t.range,
            this.body.height + 20,
          );
          if (Phaser.Geom.Rectangle.Overlaps(reach, scene.player.bounds())) scene.player.hurt(this.x);
        }
        break;
      case "dive":
        break;
    }
    if (time > this.stateUntil) {
      this.sprite.angle = 0;
      if (t.attack === "dive") this.body.setVelocity(0, 0);
      this.setState("recover", 420);
    }
  }

  /** Returns false when the hit was blocked (armored front). */
  takeDamage(amount: number, kind: DamageKind, fromX: number): boolean {
    if (this.dead) return false;
    const fromSide = fromX < this.x ? -1 : 1;
    const blockable = kind === "sword" || kind === "arrow";
    if (this.type.armoredFront && blockable && fromSide === this.dir && this.state !== "hurt") {
      Audio.sfx("sword_clink");
      this.scene.fx("fx_spark", "hit", this.x + fromSide * this.body.halfWidth, this.body.center.y, 0.3, 0xbfe9ff);
      this.body.setVelocityX(-fromSide * 180);
      return false;
    }
    this.hp -= amount;
    this.warn.setVisible(false);
    this.sprite.angle = 0;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.sprite.active && this.restoreTint());
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    Audio.sfx("enemy_hit");
    this.play("hurt", false);
    this.body.setVelocityX(-fromSide * 260);
    if (!this.type.flying && kind !== "stomp") this.body.setVelocityY(kind === "hammer" ? -320 : -180);
    this.setState("hurt", 380);
    this.nextAttack = Math.max(this.nextAttack, this.scene.time.now + 700);
    return true;
  }

  private die() {
    this.dead = true;
    this.state = "dead";
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.warn.destroy();
    Audio.sfx("enemy_defeat");
    // Recalculate scale for dead animation to maintain consistent visual size
    this.sprite.setScale(scaleForHeight(this.type.key, this.type.height, "dead"));
    this.play("dead", false);
    if (this.type.flying) {
      this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y + 40, duration: 400, ease: "Quad.in" });
    }
    this.scene.onEnemyKilled(this);
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      delay: 650,
      duration: 350,
      onComplete: () => this.destroyVisuals(),
    });
  }

  /** Despawn without counting a kill (fell into a pit, left the level). */
  remove() {
    if (this.dead) return;
    this.dead = true;
    this.body.enable = false;
    this.warn.destroy();
    this.destroyVisuals();
  }

  private destroyVisuals() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.rect.destroy();
  }

  private sync() {
    const s = this.sprite;
    const flyingSheet = SPRITES[this.type.key].originY < 0.75;
    s.x = this.x;
    s.y = flyingSheet ? this.body.center.y : this.body.bottom + 1;
    s.setFlipX(this.dir < 0);
    s.setDepth(40 + this.body.bottom / 100);
    this.warn.setPosition(s.x, this.body.top - 8);
    const surface = this.scene.surfaceBelow(this.x, this.body.bottom);
    if (surface === null) {
      this.shadow.setVisible(false);
    } else {
      const gap = Math.max(0, surface - this.body.bottom);
      const k = Phaser.Math.Clamp(1 - gap / 300, 0.35, 1);
      this.shadow
        .setVisible(true)
        .setPosition(this.x, surface + 2)
        .setScale((this.body.width / 52) * k, 0.8 * k)
        .setAlpha(0.3 * k);
    }
  }
}
