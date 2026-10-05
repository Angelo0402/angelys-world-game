import Phaser from "phaser";
import { applyOrigin, scaleForHeight } from "../assets/manifest";
import { SPRITES } from "../assets/sprites.gen";
import { Audio } from "../audio/AudioManager";
import { CHAPTERS, FONT, GAME_H, GAME_W, LEVELS, MAX_HEARTS, levelLabel, type WeaponId } from "../config";
import { resetTouch, touchState } from "../input/controls";
import { Gamepad } from "../input/gamepad";
import { PadMenu } from "../ui/padMenu";
import { Button, titleText } from "../ui/Button";
import { Dialogue } from "../ui/Dialogue";
import { useTouchUi } from "../ui/screen";
import type { DialogueLine } from "../story/umbra";
import { drawLock } from "./TitleScene";
import { fitCamera } from "../render";

const JOY_R = 78;
const JOY_HOME = { x: 132, y: GAME_H - 124 };
/** Joystick tuning: small deadzone, short travel to full speed. */
const JOY_DEADZONE = 0.08;   // thumb travel 0-8% = no movement (prevents drift)
const JOY_TRAVEL = 0.35;     // 8% -> 43% ramps 0 -> full speed
const JOY_MIN_OUT = 0.35;    // minimum output once past deadzone (35% speed)
const JUMP = { x: GAME_W - 96, y: GAME_H - 108, r: 68 };
const ATTACK = { x: GAME_W - 228, y: GAME_H - 96, r: 50 };
const SWAP = { x: GAME_W - 168, y: GAME_H - 198, r: 32 };
const WEAPON_STYLE: Record<WeaponId, { label: string; color: number; img: string }> = {
  sword: { label: "SWORD", color: 0x3ecbff, img: "btn-sword" },
  bow: { label: "BOW", color: 0x3ecbff, img: "btn-bow" },
  hammer: { label: "HAMMER", color: 0x3ecbff, img: "btn-hammer" },
  boomerang: { label: "RANG", color: 0x3ecbff, img: "btn-rang" },
  wand: { label: "WAND", color: 0x3ecbff, img: "btn-wand" },
  cog: { label: "COG", color: 0x3ecbff, img: "btn-cog" },
  ray: { label: "RAY", color: 0x3ecbff, img: "btn-ray" },
};

interface GoalState {
  kind: "kills" | "gems" | "reach" | "boss";
  have: number;
  need: number;
}

export class HudScene extends Phaser.Scene {
  private levelIndex = 0;
  private hearts: Phaser.GameObjects.Sprite[] = [];
  private killPanel!: Phaser.GameObjects.Container;
  private killText!: Phaser.GameObjects.Text;
  private lockIcon!: Phaser.GameObjects.Graphics;
  private bossPanel!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossChip!: Phaser.GameObjects.Rectangle;
  private weaponSlot!: Phaser.GameObjects.Container;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weaponKey!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private menu?: PadMenu;
  private dialogue!: Dialogue;
  private cinema = false;
  private touchUi!: Phaser.GameObjects.Container;
  private joyBase!: Phaser.GameObjects.Container;
  private joyKnob!: Phaser.GameObjects.Container;
  private jumpBtn!: Phaser.GameObjects.Container;
  private attackBtn!: Phaser.GameObjects.Container;
  private swapBtn!: Phaser.GameObjects.Container;
  private joyId = -1;
  private joyOrigin = new Phaser.Math.Vector2();
  private jumpId = -1;
  private attackId = -1;
  private showTouch = false;
  private lowPulse?: Phaser.Tweens.Tween;

  constructor() {
    super("Hud");
  }

  preload() {
    for (const k of ["btn-jump", "btn-swap", "btn-sword", "btn-bow", "btn-hammer", "btn-rang", "btn-wand", "btn-cog", "btn-ray"])
      this.load.image(k, `assets/ui/${k}.png`);
  }

  create() {
    fitCamera(this);
    this.levelIndex = (this.registry.get("level") as number) ?? 0;
    this.overlay = undefined;
    this.menu = undefined;
    this.cinema = false;
    this.joyId = this.jumpId = this.attackId = -1;
    this.hearts = [];
    this.lowPulse = undefined;
    this.input.addPointer(3);
    this.showTouch = useTouchUi(this) && !Gamepad.connected;
    ensureSwordIcon(this);

    this.buildTopBar();
    this.buildBossBar();
    this.buildWeaponSlot();
    this.buildTouchControls();
    this.dialogue = new Dialogue(this);

    this.toastText = this.add
      .text(GAME_W / 2, 112, "", { fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#fff4d6", stroke: "#2a1640", strokeThickness: 6, align: "center" })
      .setOrigin(0.5)
      .setDepth(150)
      .setAlpha(0);
    this.bannerText = titleText(this, GAME_W / 2, GAME_H / 2 - 60, "", 64, "#9ff5ff").setAlpha(0).setDepth(150);

    const reg = this.registry.events;
    const onData = (_p: unknown, key: string, value: unknown) => {
      if (key === "hearts") this.setHearts(value as number);
      if (key === "goal") this.setGoal(value as GoalState);
      if (key === "weapon" || key === "weapons") this.refreshWeapon();
      if (key === "boss") this.setBoss(value as { name: string; hp: number; max: number } | null);
    };
    reg.on("changedata", onData);
    const ge = this.game.events;
    const handlers: Record<string, (...a: never[]) => void> = {
      "hud:toast": (t: string) => this.toast(t),
      "hud:banner": (t: string) => this.banner(t),
      "hud:paused": () => this.showPause(),
      "hud:gameover": (d: { level: number; goal: GoalState }) => this.showGameOver(d),
      "hud:victory": () => this.showVictory(),
      "hud:cinema": (on: boolean) => this.setCinema(on),
      "hud:dialogue": (d: { lines: DialogueLine[]; done: () => void; onLine?: (l: DialogueLine) => void }) => this.dialogue.play(d.lines, d.done, d.onLine),
      "hud:subtitle": (l: DialogueLine) => this.dialogue.subtitle(l),
    };
    for (const [k, fn] of Object.entries(handlers)) ge.on(k, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      reg.off("changedata", onData);
      for (const [k, fn] of Object.entries(handlers)) ge.off(k, fn);
      resetTouch();
    });
    const offPad = Gamepad.onConnectionChange((on) => {
      this.showTouch = useTouchUi(this) && !on;
      resetTouch();
      this.syncTouchVisibility();
      this.refreshWeapon();
      if (!this.overlay && !this.cinema) this.toast(on ? "Controller connected\nA: jump   X/B: attack   Y: swap   Menu: pause" : "Controller disconnected");
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offPad);

    this.setHearts(this.registry.get("hearts") ?? MAX_HEARTS);
    this.setGoal(this.registry.get("goal") ?? { kind: "kills", have: 0, need: 0 });
    this.setBoss(this.registry.get("boss") ?? null);
    this.refreshWeapon();
  }

  update(time: number) {
    this.dialogue.update(time);
  }

  // ---------------------------------------------------------------- top bar

  private buildTopBar() {
    // Premium compact HUD (Angelo ref): small dark pills, no portrait, 20% smaller.
    const panel = this.add.graphics();
    panel.fillStyle(0x14082a, 0.55).fillRoundedRect(14, 10, 210, 48, 18);
    panel.lineStyle(2, 0x7a4dff, 0.6).strokeRoundedRect(14, 10, 210, 48, 18);
    for (let i = 0; i < MAX_HEARTS; i++) {
      const h = this.add.sprite(40 + i * 30, 34, "heart", SPRITES.heart.anims.glow.start);
      h.setScale(scaleForHeight("heart", 18));
      applyOrigin(h, "heart");
      this.hearts.push(h);
    }

    const kp = this.add.graphics();
    kp.fillStyle(0x1b0f2e, 0.5).fillRoundedRect(GAME_W / 2 - 120, 10, 240, 44, 15);
    this.killText = this.add
      .text(GAME_W / 2 + 14, 32, "", { fontFamily: FONT, fontSize: "21px", fontStyle: "bold", color: "#fff4d6", stroke: "#2a1640", strokeThickness: 4 })
      .setOrigin(0.5);
    this.lockIcon = this.add.graphics();
    const lvl = this.add
      .text(GAME_W / 2, 74, `LEVEL ${levelLabel(LEVELS[this.levelIndex])}  •  ${LEVELS[this.levelIndex].name.toUpperCase()}`, {
        fontFamily: FONT, fontSize: "14px", fontStyle: "bold", color: "#e8dcff", stroke: "#1b0f2e", strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.killPanel = this.add.container(0, 0, [kp, this.killText, this.lockIcon, lvl]);

    const pause = this.add.container(GAME_W - 40, 34);
    const pg = this.add.graphics();
    pg.fillStyle(0x1b0f2e, 0.55).fillCircle(0, 0, 22).lineStyle(2, 0xffd36b, 0.9).strokeCircle(0, 0, 22);
    pg.fillStyle(0xfff4d6, 1).fillRoundedRect(-8, -10, 6, 20, 2).fillRoundedRect(2, -10, 6, 20, 2);
    pause.add(pg).setSize(52, 52).setInteractive({ useHandCursor: true });
    pause.on("pointerup", () => {
      if (this.overlay || this.cinema) return;
      Audio.sfx("button");
      this.game.events.emit("pause-request");
    });

    const mute = this.add.container(GAME_W - 96, 34);
    const mg = this.add.graphics();
    const drawMute = () => {
      mg.clear();
      mg.fillStyle(0x1b0f2e, 0.55).fillCircle(0, 0, 19).lineStyle(2, 0xffd36b, 0.9).strokeCircle(0, 0, 19);
      mg.fillStyle(0xfff4d6, 1).fillRect(-9, -4, 6, 8).fillTriangle(-5, -4, 3, -10, 3, 10).fillTriangle(-5, 4, 3, -10, 3, 10);
      if (!Audio.musicOn && !Audio.sfxOn) mg.lineStyle(3, 0xff5a5a, 1).lineBetween(-11, -11, 11, 11);
      else mg.lineStyle(2, 0xfff4d6, 1).beginPath().arc(5, 0, 7, -0.9, 0.9).strokePath();
    };
    drawMute();
    mute.add(mg).setSize(46, 46).setInteractive({ useHandCursor: true });
    mute.on("pointerup", () => {
      const on = !(Audio.musicOn || Audio.sfxOn);
      Audio.setMusic(on);
      Audio.setSfx(on);
      Audio.sfx("button");
      drawMute();
    });
  }

  private buildBossBar() {
    const w = 520;
    const g = this.add.graphics();
    g.fillStyle(0x0d0618, 0.75).fillRoundedRect(GAME_W / 2 - w / 2, 10, w, 64, 18);
    g.lineStyle(3, 0xb57cff, 1).strokeRoundedRect(GAME_W / 2 - w / 2, 10, w, 64, 18);
    const name = this.add
      .text(GAME_W / 2, 16, "QUEEN UMBRA", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e0b8ff", stroke: "#12081f", strokeThickness: 5 })
      .setOrigin(0.5, 0);
    const back = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0x2a1640).setOrigin(0, 0.5);
    this.bossChip = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0xffffff).setOrigin(0, 0.5);
    this.bossFill = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0xb57cff).setOrigin(0, 0.5);
    const frame = this.add.rectangle(GAME_W / 2, 50, 462, 18).setStrokeStyle(2, 0xffffff, 0.6);
    this.bossPanel = this.add.container(0, 0, [g, name, back, this.bossChip, this.bossFill, frame]).setVisible(false);
  }

  private setBoss(b: { name: string; hp: number; max: number } | null) {
    const on = !!b;
    this.killPanel.setVisible(!on && !LEVELS[this.levelIndex].boss);
    if (!on) {
      if (this.bossPanel.visible) this.tweens.add({ targets: this.bossPanel, alpha: 0, duration: 400, onComplete: () => this.bossPanel.setVisible(false).setAlpha(1) });
      return;
    }
    if (!this.bossPanel.visible) {
      this.bossPanel.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.bossPanel, alpha: 1, duration: 400 });
    }
    const k = Phaser.Math.Clamp(b.hp / b.max, 0, 1);
    this.bossFill.width = 460 * k;
    this.bossFill.setFillStyle(k > 0.5 ? 0xb57cff : 0xff5ad1);
    this.tweens.killTweensOf(this.bossChip);
    this.tweens.add({ targets: this.bossChip, width: 460 * k, delay: 250, duration: 400 });
  }

  private buildWeaponSlot() {
    const g = this.add.graphics();
    g.fillStyle(0x14082a, 0.6).fillRoundedRect(-24, -24, 48, 48, 13).lineStyle(2, 0xffd36b, 0.9).strokeRoundedRect(-24, -24, 48, 48, 13);
    this.weaponIcon = this.add.image(0, -2, "icon_sword").setDisplaySize(30, 30);
    this.weaponKey = this.add
      .text(24, 24, "", { fontFamily: FONT, fontSize: "11px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#7a5aa8", padding: { x: 4, y: 1 } })
      .setOrigin(1, 1);
    this.weaponSlot = this.add.container(38, 92, [g, this.weaponIcon, this.weaponKey]).setVisible(false);
    this.weaponSlot.setSize(54, 54).setInteractive({ useHandCursor: true });
    this.weaponSlot.on("pointerup", () => {
      if (!this.overlay && !this.cinema) touchState.swapQueued = true;
    });
  }

  private refreshWeapon() {
    const w = this.registry.get("weapon") as WeaponId | null;
    const list = (this.registry.get("weapons") as WeaponId[] | undefined) ?? [];
    this.weaponSlot.setVisible(!!w);
    if (w) {
      const key = w === "sword" ? "icon_sword" : `weapon_${w}`;
      this.weaponIcon.setTexture(key, 0);
      const s = 50 / Math.max(this.weaponIcon.frame.width, this.weaponIcon.frame.height);
      this.weaponIcon.setScale(s).setAngle(w === "sword" ? 0 : 20);
      this.weaponKey.setText(list.length > 1 ? (Gamepad.connected ? "Y" : this.showTouch ? "TAP" : "Q") : "").setVisible(list.length > 1);
      this.tweens.add({ targets: this.weaponSlot, scale: { from: 1.25, to: 1 }, duration: 220, ease: "Back.out" });
      this.drawAttackButton(w);
    }
    this.syncTouchVisibility();
  }

  private setHearts(n: number) {
    this.hearts.forEach((h, i) => {
      const full = i < n;
      h.setTint(full ? 0xffffff : 0x3a3450).setAlpha(full ? 1 : 0.6);
      if (!full && h.getData("full") !== false) {
        this.tweens.add({ targets: h, scale: { from: h.scale * 1.5, to: h.scale }, duration: 250 });
      }
      h.setData("full", full);
    });
    this.lowPulse?.stop();
    const base = scaleForHeight("heart", 18);
    this.hearts.forEach((h) => h.setScale(base));
    if (n === 1) {
      this.lowPulse = this.tweens.add({ targets: this.hearts[0], scale: base * 1.25, duration: 350, yoyo: true, repeat: -1 });
    }
  }

  private setGoal(g: GoalState) {
    const info = LEVELS[this.levelIndex];
    const shown = Math.min(g.have, g.need);
    this.lockIcon.clear();
    const x = GAME_W / 2 - 122;
    if (g.kind === "reach") {
      this.killText.setText(info.mode === "climb" ? "CLIMB TO THE TOP!" : info.mode === "chase" ? "RUN TO THE PORTAL!" : "REACH THE PORTAL").setFontSize(23);
      this.killText.setX(GAME_W / 2 + 14).setColor("#9ff5ff");
      this.lockIcon.fillStyle(0x9ff5ff, 1).fillTriangle(x - 10, 46, x + 12, 39, x - 10, 30);
      return;
    }
    this.killText.setFontSize(26).setX(GAME_W / 2 + 18).setColor("#fff4d6");
    this.killText.setText(`${g.kind === "gems" ? "GEMS" : "ENEMIES"} ${String(shown).padStart(2, "0")} / ${g.need}`);
    const k = g.have;
    const goal = g.need;
    if (k < goal) {
      if (g.kind === "gems") this.lockIcon.fillStyle(0x5ee7ff, 1).fillTriangle(x, 24, x + 12, 39, x, 54).fillTriangle(x, 24, x - 12, 39, x, 54);
      else drawLock(this.lockIcon, x, 36, 0.55);
    } else {
      this.lockIcon.fillStyle(0x9ff5ff, 1).fillCircle(x, 39, 13);
      this.lockIcon.lineStyle(4, 0x2a1640, 1).beginPath().moveTo(x - 6, 39).lineTo(x - 1, 45).lineTo(x + 7, 32).strokePath();
      this.killText.setColor("#9ff5ff");
    }
    if (k > 0) this.tweens.add({ targets: this.killText, scale: { from: 1.15, to: 1 }, duration: 160 });
  }

  // ---------------------------------------------------------------- touch

  private buildTouchControls() {
    this.touchUi = this.add.container(0, 0).setDepth(80);
    this.joyBase = this.joystick(JOY_HOME.x, JOY_HOME.y);
    this.joyKnob = this.knob(JOY_HOME.x, JOY_HOME.y);
    this.jumpBtn = this.makeImageButton(JUMP.x, JUMP.y, JUMP.r, "JUMP", "btn-jump");
    this.attackBtn = this.add.container(ATTACK.x, ATTACK.y);
    this.swapBtn = this.makeImageButton(SWAP.x, SWAP.y, SWAP.r, "SWAP", "btn-swap");
    this.touchUi.add([this.joyBase, this.joyKnob, this.jumpBtn, this.attackBtn, this.swapBtn]);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on("gameout", () => {
      resetTouch();
      this.joyId = this.jumpId = this.attackId = -1;
      this.resetJoy();
    });
    this.syncTouchVisibility();
  }

  private syncTouchVisibility() {
    if (!this.touchUi) return;
    const w = this.registry.get("weapon") as WeaponId | null;
    const list = (this.registry.get("weapons") as WeaponId[] | undefined) ?? [];
    this.touchUi.setVisible(this.showTouch && !this.overlay && !this.cinema);
    this.attackBtn.setVisible(!!w);
    this.swapBtn.setVisible(list.length > 1);
  }

  private drawAttackButton(w: WeaponId) {
    const st = WEAPON_STYLE[w];
    this.attackBtn.removeAll(true);
    const inner = this.makeImageButton(0, 0, ATTACK.r, st.label, st.img);
    this.attackBtn.add(inner);
  }

  /** Generated-art button: icon image with label overlaid. */
  private makeImageButton(x: number, y: number, r: number, label: string, imgKey: string) {
    const c = this.add.container(x, y);
    const img = this.add.image(0, 0, imgKey);
    img.setScale((r * 2.15) / Math.max(img.width, img.height));
    const t = this.add
      .text(0, r * 0.52, label, { fontFamily: FONT, fontSize: `${Math.round(r * 0.26)}px`, fontStyle: "bold", color: "#ffffff", stroke: "#17132f", strokeThickness: 5 })
      .setOrigin(0.5);
    c.add([img, t]);
    return c;
  }

  private joystick(x: number, y: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = JOY_R;
    g.lineStyle(10, 0x7ec8ff, 0.95).strokeCircle(0, 0, r);
    g.lineStyle(3, 0xffffff, 0.45).strokeCircle(0, 0, r - 9);
    for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
      const d = r - 20;
      const cx = Math.cos(a);
      const sy = Math.sin(a);
      const nx = -sy;
      const ny = cx;
      g.fillStyle(0xd7eeff, 0.95);
      g.fillTriangle(cx * (d + 11), sy * (d + 11), cx * (d - 4) + nx * 7, sy * (d - 4) + ny * 7, cx * (d - 4) - nx * 7, sy * (d - 4) - ny * 7);
    }
    c.add(g);
    return c;
  }

  private knob(x: number, y: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x9eb0c4, 1).fillCircle(3, 4, 28);
    g.fillStyle(0xffffff, 1).fillCircle(0, 0, 28);
    g.fillStyle(0xffffff, 0.95).fillEllipse(-7, -9, 18, 11);
    g.lineStyle(2, 0xd7e4f2, 1).strokeCircle(0, 0, 28);
    c.add(g);
    return c;
  }


  /** Pointer position in logical (1280x576) units; the canvas itself is render-scaled. */
  private logical(p: Phaser.Input.Pointer) {
    const z = this.cameras.main.zoom;
    return { id: p.id, x: p.x / z, y: p.y / z };
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.overlay || this.cinema || !this.showTouch) return;
    const p = this.logical(ptr);
    if (p.y < 80 && (p.x > GAME_W - 150 || p.x < 260)) return;
    if (p.x < 100 && p.y < 160) return;
    const d = (b: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y);
    if (d(JUMP) < JUMP.r + 18 && this.jumpId < 0) {
      this.jumpId = p.id;
      touchState.jumpHeld = true;
      touchState.jumpQueued = true;
      this.jumpBtn.setScale(0.9);
      return;
    }
    if (this.swapBtn.visible && d(SWAP) < SWAP.r + 10) {
      touchState.swapQueued = true;
      this.swapBtn.setScale(0.88);
      this.time.delayedCall(120, () => this.swapBtn.setScale(1));
      return;
    }
    if (this.attackBtn.visible && d(ATTACK) < ATTACK.r + 14 && this.attackId < 0) {
      this.attackId = p.id;
      touchState.attackQueued = true;
      this.attackBtn.setScale(0.9);
      return;
    }
    if (p.x < GAME_W * 0.5 && this.joyId < 0) {
      this.joyId = p.id;
      const x = Phaser.Math.Clamp(p.x, JOY_R + 16, GAME_W * 0.46 - JOY_R);
      const y = Phaser.Math.Clamp(p.y, 130, GAME_H - JOY_R - 8);
      this.joyOrigin.set(x, y);
      this.joyBase.setPosition(x, y).setAlpha(1);
      this.joyKnob.setPosition(x, y);
      this.onMove(ptr);
    }
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (ptr.id !== this.joyId) return;
    const p = this.logical(ptr);
    const dx = p.x - this.joyOrigin.x;
    const dy = p.y - this.joyOrigin.y;
    const len = Math.min(JOY_R, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    this.joyKnob.setPosition(this.joyOrigin.x + Math.cos(ang) * len, this.joyOrigin.y + Math.sin(ang) * len);
    // Analog: a small push walks, a full push runs. Small dead zone so resting thumbs don't drift.
    const ax = Phaser.Math.Clamp(dx / JOY_R, -1, 1);
    const mag = Math.abs(ax) < JOY_DEADZONE ? 0 : Math.min(1, (Math.abs(ax) - JOY_DEADZONE) / JOY_TRAVEL);
    touchState.axis = Math.sign(ax) * (mag === 0 ? 0 : JOY_MIN_OUT + (1 - JOY_MIN_OUT) * mag);
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.joyId) {
      this.joyId = -1;
      touchState.axis = 0;
      this.resetJoy();
    }
    if (p.id === this.jumpId) {
      this.jumpId = -1;
      touchState.jumpHeld = false;
      this.jumpBtn.setScale(1);
    }
    if (p.id === this.attackId) {
      this.attackId = -1;
      this.attackBtn.setScale(1);
    }
  }

  private resetJoy() {
    this.joyBase.setPosition(JOY_HOME.x, JOY_HOME.y);
    this.joyKnob.setPosition(JOY_HOME.x, JOY_HOME.y);
  }

  // -------------------------------------------------------------- messages

  private setCinema(on: boolean) {
    this.cinema = on;
    this.dialogue.cinema(on);
    resetTouch();
    this.joyId = this.jumpId = this.attackId = -1;
    this.resetJoy();
    this.syncTouchVisibility();
    this.tweens.add({ targets: [this.weaponSlot], alpha: on ? 0 : 1, duration: 300 });
    if (on) this.toastText.setAlpha(0);
  }

  private toast(text: string) {
    if (this.cinema) return;
    this.tweens.killTweensOf(this.toastText);
    const y = this.bossPanel.visible ? 128 : 124;
    this.toastText.setText(text).setAlpha(0).setY(y + 12);
    this.tweens.add({ targets: this.toastText, alpha: 1, y, duration: 220 });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2600, duration: 400 });
  }

  private banner(text: string) {
    this.tweens.killTweensOf(this.bannerText);
    this.bannerText.setText(text).setAlpha(1).setScale(0.3);
    this.tweens.add({ targets: this.bannerText, scale: 1, duration: 450, ease: "Back.out" });
    this.tweens.add({ targets: this.bannerText, alpha: 0, delay: 1700, duration: 500 });
  }

  // -------------------------------------------------------------- overlays

  private openOverlay(height: number) {
    resetTouch();
    this.joyId = this.jumpId = this.attackId = -1;
    this.resetJoy();
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0716, 0.72).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x1b0f2e, 0.94).fillRoundedRect(GAME_W / 2 - 300, GAME_H / 2 - height / 2, 600, height, 28);
    panel.lineStyle(4, 0xffd36b, 1).strokeRoundedRect(GAME_W / 2 - 300, GAME_H / 2 - height / 2, 600, height, 28);
    c.add([dim, panel]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.overlay = c;
    this.syncTouchVisibility();
    return c;
  }

  private closeOverlay() {
    this.menu?.destroy();
    this.menu = undefined;
    this.overlay?.destroy();
    this.overlay = undefined;
    this.syncTouchVisibility();
  }

  private controlsHelp() {
    if (Gamepad.connected) return "Stick / D-pad: move   A: jump (and swim)   X / B: attack   Y: swap weapon   Menu: resume";
    if (this.showTouch) return "Joystick: move   JUMP: jump & stomp   Weapon button: attack   SWAP: change weapon";
    return "A/D or arrows: move   W/Space: jump   J/K: attack   Q: swap weapon   Esc: pause";
  }

  private showPause() {
    if (this.overlay) return;
    const c = this.openOverlay(440);
    const top = GAME_H / 2 - 220;
    c.add(titleText(this, GAME_W / 2, top + 50, "PAUSED", 46));
    const resume = new Button(this, GAME_W / 2, top + 125, "RESUME", () => {
      this.closeOverlay();
      Audio.duck(false);
      this.scene.resume("Game");
    }, { width: 300, height: 58 });
    const restart = new Button(this, GAME_W / 2 - 130, top + 200, "RESTART", () => this.restartLevel(), { width: 230, height: 52, fontSize: 22, color: 0x7a5aa8 });
    const select = new Button(this, GAME_W / 2 + 130, top + 200, "LEVELS", () => this.toChapterSelect(), { width: 230, height: 52, fontSize: 22, color: 0x7a5aa8 });
    const music = new Button(this, GAME_W / 2 - 130, top + 275, `MUSIC: ${Audio.musicOn ? "ON" : "OFF"}`, () => {
      Audio.setMusic(!Audio.musicOn);
      music.setText(`MUSIC: ${Audio.musicOn ? "ON" : "OFF"}`);
    }, { width: 230, height: 52, fontSize: 22, color: 0x3f8f6a });
    const sfx = new Button(this, GAME_W / 2 + 130, top + 275, `SFX: ${Audio.sfxOn ? "ON" : "OFF"}`, () => {
      Audio.setSfx(!Audio.sfxOn);
      sfx.setText(`SFX: ${Audio.sfxOn ? "ON" : "OFF"}`);
    }, { width: 230, height: 52, fontSize: 22, color: 0x3f8f6a });
    const help = this.add
      .text(GAME_W / 2, top + 352, this.controlsHelp(), { fontFamily: FONT, fontSize: "15px", color: "#cfc6e8", align: "center", wordWrap: { width: 560 } })
      .setOrigin(0.5);
    c.add([resume, restart, select, music, sfx, help]);
    this.menu = new PadMenu(this, [resume, restart, select, music, sfx], { back: () => resume.activate(), menuIsBack: true });
  }

  private showGameOver(d: { level: number; goal: GoalState }) {
    this.time.delayedCall(10, () => {
      if (this.overlay) this.closeOverlay();
      const info = LEVELS[d.level];
      const c = this.openOverlay(420);
      const top = GAME_H / 2 - 210;
      c.add(this.add.text(GAME_W / 2, top + 42, "ANGELY'S WORLD", { fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#ffd36b" }).setOrigin(0.5));
      c.add(titleText(this, GAME_W / 2, top + 100, "GAME OVER", 64, "#ff7a7a"));
      c.add(
        this.add
          .text(GAME_W / 2, top + 165, `Level ${levelLabel(info)}: ${info.name}  •  ${CHAPTERS[info.chapter].name}`, { fontFamily: FONT, fontSize: "20px", color: "#fff4d6" })
          .setOrigin(0.5),
      );
      const g = d.goal;
      const line =
        g.kind === "boss" ? (info.chapter === 8 ? "The dune is still moving... get back up, Angely!" : "Queen Umbra is waiting... don't give up, Angely!")
          : g.kind === "reach" ? "So close! Try again, Angely!"
            : `${g.kind === "gems" ? "Star gems" : "Enemies defeated"}: ${Math.min(g.have, g.need)} / ${g.need}`;
      c.add(this.add.text(GAME_W / 2, top + 200, line, { fontFamily: FONT, fontSize: "21px", fontStyle: "bold", color: "#9ff5ff" }).setOrigin(0.5));
      const again = new Button(this, GAME_W / 2, top + 280, "TRY AGAIN", () => this.restartLevel(), { width: 320, height: 64, fontSize: 30 });
      const select = new Button(this, GAME_W / 2, top + 360, "LEVEL SELECT", () => this.toChapterSelect(), { width: 300, height: 52, fontSize: 22, color: 0x7a5aa8 });
      c.add([again, select]);
      this.menu = new PadMenu(this, [again, select]);
    });
  }

  private showVictory() {
    const c = this.openOverlay(460);
    const top = GAME_H / 2 - 230;
    c.add(titleText(this, GAME_W / 2, top + 58, "YOU DID IT, ANGELY!", 50, "#ffe7a3"));
    c.add(
      this.add
        .text(GAME_W / 2, top + 112, "The Sky Tower and the Sunken Temple shine again.\nAll seven worlds are full of light. Dad would be proud!", {
          fontFamily: FONT, fontSize: "20px", color: "#fff4d6", align: "center",
        })
        .setOrigin(0.5),
    );
    const s = this.add.sprite(GAME_W / 2, top + 300, "angely");
    s.setScale(scaleForHeight("angely", 130, "celebrate"));
    applyOrigin(s, "angely");
    s.play("angely:celebrate");
    c.add(s);
    const again = new Button(this, GAME_W / 2 - 150, top + 392, "PLAY AGAIN", () => {
      this.scene.stop("Game");
      this.scene.start("Splash", { level: 0 });
    }, { width: 260, height: 56, fontSize: 24 });
    const levels = new Button(this, GAME_W / 2 + 150, top + 392, "LEVELS", () => this.toChapterSelect(), { width: 260, height: 56, fontSize: 24, color: 0x7a5aa8 });
    c.add([again, levels]);
    this.menu = new PadMenu(this, [again, levels]);
    this.add
      .particles(GAME_W / 2, -10, "dot", {
        x: { min: -GAME_W / 2, max: GAME_W / 2 },
        speedY: { min: 80, max: 200 },
        lifespan: 4000,
        scale: { start: 0.5, end: 0.2 },
        tint: [0xffd36b, 0xff8fb0, 0x9ff5ff, 0xb08cff],
        frequency: 40,
      })
      .setDepth(99);
  }

  private restartLevel() {
    Audio.duck(false);
    this.scene.start("Game", { level: this.levelIndex });
  }

  private toChapterSelect() {
    this.scene.stop("Game");
    this.scene.start("Title", { select: true });
  }
}

/** Crystal sword icon for the weapon slot (the sword has no standalone sprite). */
function ensureSwordIcon(scene: Phaser.Scene) {
  if (scene.textures.exists("icon_sword")) return;
  const g = scene.make.graphics({}, false);
  g.translateCanvas(48, 48);
  g.rotateCanvas(-Math.PI / 4);
  g.fillStyle(0x2a1640, 1).fillRect(-9, -42, 18, 62).fillRect(-22, 14, 44, 13).fillRect(-6, 20, 12, 24);
  g.fillStyle(0x9ff5ff, 1).fillTriangle(0, -44, -7, -32, 7, -32).fillRect(-6, -33, 12, 48);
  g.fillStyle(0xe6fdff, 1).fillRect(-2, -32, 3, 44);
  g.fillStyle(0xffc35a, 1).fillRect(-19, 16, 38, 8);
  g.fillStyle(0x8a5a2b, 1).fillRect(-4, 24, 8, 16);
  g.fillStyle(0xffc35a, 1).fillCircle(0, 42, 5);
  g.generateTexture("icon_sword", 96, 96);
  g.destroy();
}
