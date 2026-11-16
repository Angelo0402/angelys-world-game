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
import { PERF_OVERLAY_ENABLED, PerfOverlay } from "../debug/PerfOverlay";
import { ensureHudArt, hudDisc, WEAPON_LABELS } from "../ui/gameHudArt";

const JOY_R = 74;
const KNOB_R = 33;
const DEAD_ZONE = 0.08;
const JOY_HOME = { x: 140, y: GAME_H - 126 };
const JUMP = { x: GAME_W - 104, y: GAME_H - 108, r: 68 };
const ATTACK = { x: GAME_W - 238, y: GAME_H - 82, r: 50 };
const SPECIAL_BAR = { x: GAME_W / 2, y: 100, w: 340, h: 20 };

interface GoalState {
  kind: "kills" | "gems" | "coins" | "reach" | "boss";
  have: number;
  need: number;
}

export class HudScene extends Phaser.Scene {
  private levelIndex = 0;
  private hearts: Phaser.GameObjects.Sprite[] = [];
  private shieldText!: Phaser.GameObjects.Text;
  private gemIcon!: Phaser.GameObjects.Image;
  private killPanel!: Phaser.GameObjects.Container;
  private killText!: Phaser.GameObjects.Text;
  private lockIcon!: Phaser.GameObjects.Graphics;
  /** PRUEBA ch11: coin counter (top-right) — banked coins, future shop currency. */
  private coinIcon!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private bossPanel!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossChip!: Phaser.GameObjects.Rectangle;
  private bossBack!: Phaser.GameObjects.Rectangle;
  private bossName!: Phaser.GameObjects.Text;
  /** Veil fight (Angelo 2026-10-22): THREE phase bars, one per form —
   *  magenta Beast / violet Brute / red Sovereign, widths ∝ phase HP. */
  private bossSegs: { back: Phaser.GameObjects.Rectangle; chip: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; w: number }[] = [];
  private veilPhase = 0;
  private veilPulse?: Phaser.Tweens.Tween;
  /** Phase checkpoint marker on the veil boss bar (feel package 2026-10-26). */
  private bossCheckpoint?: Phaser.GameObjects.Container;
  /** Panel fade tween, tracked so a stale fade-out cannot hide the panel
   *  after a newer setBoss re-showed it (harness find 2026-10-26: the
   *  cinema-end null-then-boss sequence left the 10-2 bar hidden until the
   *  first HP change). The phase-change scale pop is a separate tween and
   *  is never touched by this field. */
  private bossPanelFade?: Phaser.Tweens.Tween;
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
  /** SPECIAL meter bar (v60, Angelo 2026-11-06): horizontal fill bar, top-center.
   * Replaces the old right-side circular button, which blocked incoming enemies. */
  private specialBar!: Phaser.GameObjects.Container;
  private specialFill!: Phaser.GameObjects.Graphics;
  private specialGlow!: Phaser.GameObjects.Graphics;
  private specialStars: Phaser.GameObjects.Text[] = [];
  private specialLabel!: Phaser.GameObjects.Text;
  private specialPulse?: Phaser.Tweens.Tween;
  private specialGlowTween?: Phaser.Tweens.Tween;
  private specialCharge = 0;
  private joyId = -1;
  private joyOrigin = new Phaser.Math.Vector2();
  private jumpId = -1;
  private attackId = -1;
  private showTouch = false;
  private lowPulse?: Phaser.Tweens.Tween;
  /** v94 PRUEBA: reactive HUD portrait (Angelo 2026-11-15) — circular
   *  frame top-left, next to the hearts. neutral default; hurt briefly on
   *  damage (with a jolt), scared while at 1 heart, happy briefly on heal
   *  back to full. Hearts keep their exact sprites/spacing. */
  private portraitImg?: Phaser.GameObjects.Image;
  private portraitTimer?: Phaser.Time.TimerEvent;
  private lastHearts = MAX_HEARTS;
  private cinemaTop: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[] = [];
  /** Perf overlay (v63 test build, DEBUG-ONLY): null when the flag in src/debug/PerfOverlay.ts is off. */
  private perfOverlay: PerfOverlay | null = null;

  constructor() {
    super("Hud");
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
    ensureHudArt(this);

    this.buildTopBar();
    this.buildBossBar();
    this.cinemaTop = this.children.list.slice() as typeof this.cinemaTop;
    // Perf overlay AFTER the cinemaTop snapshot on purpose -- setCinema
    // must never hide it (stays visible during cutscenes too). DEBUG-ONLY:
    // gated on the single PERF_OVERLAY_ENABLED flag in src/debug/PerfOverlay.ts.
    if (PERF_OVERLAY_ENABLED) this.perfOverlay = new PerfOverlay(this);
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
      if (key === "coins") this.setCoins(value as number);
      if (key === "weapon" || key === "weapons") this.refreshWeapon();
      if (key === "boss") this.setBoss(value as { name: string; hp: number; max: number; veilPhase?: number } | null);
      if (key === "shield") this.setShield(value as number);
      if (key === "special") this.setSpecial(value as number);
    };
    reg.on("changedata", onData);
    const ge = this.game.events;
    const handlers: Record<string, (...a: never[]) => void> = {
      "hud:toast": (t: string) => this.toast(t),
      "hud:toast-hide": () => this.hideToast(),
      "hud:banner": (t: string) => this.banner(t),
      "hud:paused": () => this.showPause(),
      "hud:gameover": (d: { level: number; goal: GoalState; bossHp?: number; bossMax?: number; bossPhase?: number }) => this.showGameOver(d),
      "hud:victory": () => this.showVictory(),
      "hud:cinema": (on: boolean) => this.setCinema(on),
      "hud:dialogue": (d: { lines: DialogueLine[]; done: () => void; onLine?: (l: DialogueLine) => void }) => this.dialogue.play(d.lines, d.done, d.onLine),
      "hud:subtitle": (l: DialogueLine) => this.dialogue.subtitle(l),
      "hud:voice": (l: DialogueLine) => this.dialogue.voiceOnly(l),
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

    // v94: seed lastHearts before the first setHearts so a level start at
    // full hearts does not read as a heal (no happy flash on every load).
    this.lastHearts = (this.registry.get("hearts") as number) ?? MAX_HEARTS;
    this.setHearts(this.registry.get("hearts") ?? MAX_HEARTS);
    this.setShield(this.registry.get("shield") ?? 0);
    this.setGoal(this.registry.get("goal") ?? { kind: "kills", have: 0, need: 0 });
    this.setCoins(this.registry.get("coins") ?? 0);
    this.setBoss(this.registry.get("boss") ?? null);
    this.refreshWeapon();
    this.setSpecial(this.registry.get("special") ?? 0);
  }

  update(time: number) {
    this.dialogue.update(time);
    // Perf overlay (v63 test build, DEBUG-ONLY): the module owns all state.
    this.perfOverlay?.update(time);
    // Stuck-touch guard: the phone WebView can swallow a pointerup entirely
    // (no up, no upoutside, no gameout), leaving joyId/jumpId/attackId
    // latched and Angely running on her own. If a tracked pointer is no
    // longer down, release it exactly as onUp would — same defensive pattern
    // as the TitleScene guard v2. onUp only reads p.id, so a synthetic
    // { id } is enough. The ids are snapshotted first so onUp's mutations
    // cannot disturb the loop. Double-release is harmless: onUp with a
    // non-matching id does nothing. (pointers lives on the InputManager,
    // not the scene InputPlugin, hence manager.pointers.)
    for (const id of [this.joyId, this.jumpId, this.attackId]) {
      if (id >= 0 && !this.input.manager.pointers.some((p) => p.id === id && p.isDown)) {
        this.onUp({ id } as Phaser.Input.Pointer);
      }
    }
  }

  // ---------------------------------------------------------------- top bar

  private buildTopBar() {
    // v94 PRUEBA: reactive portrait, circular frame top-left next to the
    // hearts (portrait 8..72, hearts panel 82..304). Ring + dark backing,
    // image clipped by a circular geometry mask. Hearts keep their exact
    // sprites and spacing — the whole group shifts right 64px to make room.
    const px = 40, py = 100, pr = 32;
    if (this.textures.exists("hud_portrait_neutral")) {
      const ring = this.add.graphics();
      ring.fillStyle(0x1a0b33, 1).fillCircle(px, py, pr + 3);
      ring.lineStyle(4, 0xffd75a, 1).strokeCircle(px, py, pr + 3);
      this.portraitImg = this.add.image(px, py, "hud_portrait_neutral").setDisplaySize(pr * 2, pr * 2);
      // Phaser 4 (Beam): GeometryMask is Canvas-only and no-ops under
      // WebGL — same as the Portal fix: Mask filter instead. The shape
      // is NOT added to the display list; the filter captures it directly.
      // v95 fix: the Mask filter captures the shape into a DynamicTexture
      // sized to the object's FRAME (256x256 here, NOT the 64x64 display
      // size — verified live: dynTex 256x256) and samples it in the
      // object's UV space. The circle must therefore be centred on the
      // FRAME (128,128) r128. World coords (40,100) land as a small
      // off-centre patch (sweep: std 15.7, face still invisible); display
      // coords (32,32) land in the corner and mask everything out
      // (std 0.0). Frame-centred is the correct mapping.
      const fw = this.portraitImg.frame.width;
      const fh = this.portraitImg.frame.height;
      const maskShape = this.make.graphics().fillStyle(0xffffff, 1).fillCircle(fw / 2, fh / 2, Math.min(fw, fh) / 2);
      this.portraitImg.enableFilters();
      this.portraitImg.filters!.internal.addMask(maskShape);
    }
    this.add.image(193, 100, "hud_hearts_panel").setDisplaySize(222, 52);
    for (let i = 0; i < MAX_HEARTS; i++) {
      const h = this.add.sprite(110 + i * 42, 102, "heart", SPRITES.heart.anims.glow.start);
      h.setScale(scaleForHeight("heart", 30));
      applyOrigin(h, "heart");
      this.hearts.push(h);
    }
    this.shieldText = this.add
      .text(318, 102, "", { fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: "#fff27a", stroke: "#2a1640", strokeThickness: 4 })
      .setOrigin(0, 0.5)
      .setVisible(false);

    const kp = this.add.image(GAME_W / 2, 39, "hud_goal_panel").setDisplaySize(300, 54);
    this.killText = this.add
      .text(GAME_W / 2 + 18, 39, "", { fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: "#fff4d6", stroke: "#2a1640", strokeThickness: 5 })
      .setOrigin(0.5);
    this.lockIcon = this.add.graphics();
    const lvl = this.add
      .text(GAME_W / 2, 74, `LEVEL ${levelLabel(LEVELS[this.levelIndex])}  •  ${LEVELS[this.levelIndex].name.toUpperCase()}`, {
        fontFamily: FONT, fontSize: "14px", fontStyle: "bold", color: "#e8dcff", stroke: "#1b0f2e", strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.gemIcon = this.add.image(GAME_W / 2 - 122, 39, "hud_gem").setDisplaySize(44, 54).setVisible(false);
    this.killPanel = this.add.container(0, 0, [kp, this.killText, this.lockIcon, this.gemIcon, lvl]);

    // PRUEBA ch11: coin counter, top-right (nothing else lives there). Gold
    // disc drawn in code + count. Joins cinemaTop via buildTopBar order.
    this.coinIcon = this.add.graphics();
    this.coinIcon.fillStyle(0xffd75a, 1).fillCircle(GAME_W - 130, 39, 15);
    this.coinIcon.fillStyle(0xffb52e, 1).fillCircle(GAME_W - 130, 39, 11);
    this.coinIcon.fillStyle(0xffe27a, 1).fillCircle(GAME_W - 130, 39, 7);
    this.coinText = this.add
      .text(GAME_W - 108, 39, "0", { fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#ffd75a", stroke: "#2a1640", strokeThickness: 5 })
      .setOrigin(0, 0.5);

    const pause = this.add.container(78, 40);
    pause.add(hudDisc(this, "hud_pause", 28)).setSize(64, 64).setInteractive({ useHandCursor: true });
    pause.on("pointerup", () => {
      if (this.overlay || this.cinema) return;
      Audio.sfx("button");
      this.game.events.emit("pause-request");
    });

    const mute = this.add.container(146, 40);
    const mg = hudDisc(this, "hud_sound", 24);
    const drawMute = () => {
      mg.setTexture(!Audio.musicOn && !Audio.sfxOn ? "hud_sound_off" : "hud_sound");
    };
    drawMute();
    mute.add(mg).setSize(56, 56).setInteractive({ useHandCursor: true });
    mute.on("pointerup", () => {
      const on = !(Audio.musicOn || Audio.sfxOn);
      Audio.setMusic(on);
      Audio.setSfx(on);
      Audio.sfx("button");
      drawMute();
    });

    this.buildSpecialBar();
  }

  /**
   * SPECIAL meter bar (v78 redesign, Angelo 2026-11-12: "más bonita"): gold
   * gradient fill with a top sheen, rounded bar, gold frame, gold glow pulse
   * when FULL, gold stars at each end. Same position/size as v60 (top-center,
   * y 90..110) — HUD layout untouched. Tapping the bar fires the SPECIAL
   * when full. Built here (not in touchUi) so the meter is visible on
   * desktop too, and so it joins cinemaTop and hides during cutscenes like
   * the rest of the top bar.
   */
  private buildSpecialBar() {
    const { x, y, w, h } = SPECIAL_BAR;
    const g = this.add.graphics();
    g.fillStyle(0x1b0f2e, 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(2, 0xffd75a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.specialFill = this.add.graphics();
    this.specialGlow = this.add.graphics();
    this.specialGlow.fillStyle(0xffd75a, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.specialGlow.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    // Two gold stars, one at each end -- the "SPECIAL" label sits in the middle.
    this.specialStars = [-1, 1].map((k) =>
      this.add
        .text(k * (w / 2 - 16), 0, "★", { fontFamily: FONT, fontSize: "16px", color: "#ffd75a", stroke: "#2a1640", strokeThickness: 3 })
        .setOrigin(0.5),
    );
    this.specialLabel = this.add
      .text(0, 0, "SPECIAL", { fontFamily: FONT, fontSize: "12px", fontStyle: "bold", color: "#ffe9a8", stroke: "#2a1640", strokeThickness: 3 })
      .setOrigin(0.5);
    this.specialBar = this.add.container(x, y, [g, this.specialFill, this.specialGlow, ...this.specialStars, this.specialLabel]);
  }

  /** Gold gradient fill for the SPECIAL meter (v78): vertical gold gradient
   * (light top -> deep gold bottom) + a lighter top sheen, rounded to the
   * bar. Redrawn only when the charge changes. */
  private drawSpecialFill(charge: number) {
    const { w, h } = SPECIAL_BAR;
    const pad = 3;
    const inner = w - pad * 2;
    const fw = Math.max(0, inner * Phaser.Math.Clamp(charge / 8, 0, 1));
    const g = this.specialFill;
    g.clear();
    if (fw <= 0) return;
    const fh = h - pad * 2;
    const r = Math.min(7, fw / 2, fh / 2);
    const x = -w / 2 + pad;
    const y = -fh / 2;
    g.fillGradientStyle(0xffe27a, 0xffe27a, 0xffb52e, 0xffb52e, 1);
    g.fillRoundedRect(x, y, fw, fh, r);
    const sh = Math.max(2, fh * 0.38);
    g.fillStyle(0xfff6c9, 0.55);
    g.fillRoundedRect(x + 1, y + 1, Math.max(0, fw - 2), sh, { tl: r, tr: r, bl: 0, br: 0 });
  }

  private buildBossBar() {
    const w = 520;
    const g = this.add.image(GAME_W / 2, 42, "hud_boss_panel").setDisplaySize(w, 64);
    const name = (this.bossName = this.add
      .text(GAME_W / 2, 16, "", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e0b8ff", stroke: "#12081f", strokeThickness: 5 })
      .setOrigin(0.5, 0));
    const back = (this.bossBack = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0x2a1640).setOrigin(0, 0.5));
    this.bossChip = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0xffffff).setOrigin(0, 0.5);
    this.bossFill = this.add.rectangle(GAME_W / 2 - 230, 50, 460, 16, 0xb57cff).setOrigin(0, 0.5);
    const frame = this.add.rectangle(GAME_W / 2, 50, 462, 18).setStrokeStyle(2, 0xffffff, 0.6);
    // Veil phase segments: 460 total = 182 + 4 + 274 (HP 40/60 of 100, Angelo 2026-10-24: 2 phases)
    const segCols = [0xff5ad1, 0xb57cff];
    const segDark = [0x3d1030, 0x241239];
    const segW = [182, 274];
    let sx = GAME_W / 2 - 230;
    this.bossSegs = segW.map((w, i) => {
      const sb = this.add.rectangle(sx, 50, w, 16, segDark[i]).setOrigin(0, 0.5).setVisible(false);
      const sc = this.add.rectangle(sx, 50, w, 16, 0xffffff).setOrigin(0, 0.5).setVisible(false);
      const sf = this.add.rectangle(sx, 50, w, 16, segCols[i]).setOrigin(0, 0.5).setVisible(false);
      sx += w + 4;
      return { back: sb, chip: sc, fill: sf, w };
    });
    const segObjs = this.bossSegs.flatMap((s) => [s.back, s.chip, s.fill]);
    // Phase checkpoint (feel package 2026-10-26): permanent divider + crystal
    // icon at the 60% threshold (bar center - 46 = left seg 182 + 4 gap / 2).
    // Veil bar only; hidden with the panel and for non-veil bosses.
    const divX = GAME_W / 2 - 46;
    this.bossCheckpoint = this.add.container(0, 0, [
      this.add.rectangle(divX, 50, 4, 18, 0xffffff).setOrigin(0.5),
      this.add.image(divX, 38, "feel_crystal").setDisplaySize(14, 14),
    ]).setVisible(false);
    this.bossPanel = this.add.container(0, 0, [g, name, back, this.bossChip, this.bossFill, ...segObjs, frame, this.bossCheckpoint]).setVisible(false);
  }

  private setBoss(b: { name: string; hp: number; max: number; veilPhase?: number } | null) {
    const on = !!b;
    this.killPanel.setVisible(!on && !LEVELS[this.levelIndex].boss);
    if (!on) {
      this.veilPhase = 0;
      this.veilPulse?.remove();
      this.veilPulse = undefined;
      this.bossPanelFade?.remove();
      this.bossPanelFade = undefined;
      if (this.bossPanel.visible) this.bossPanelFade = this.tweens.add({ targets: this.bossPanel, alpha: 0, duration: 400, onComplete: () => this.bossPanel.setVisible(false).setAlpha(1) });
      return;
    }
    // A pending fade-out must die here, or its onComplete hides the panel
    // after this re-show (the cinema-end null-then-boss sequence).
    this.bossPanelFade?.remove();
    this.bossPanelFade = undefined;
    if (!this.bossPanel.visible) {
      this.bossPanel.setVisible(true).setAlpha(0);
      this.bossPanelFade = this.tweens.add({ targets: this.bossPanel, alpha: 1, duration: 400 });
    } else {
      this.bossPanel.setAlpha(1);
    }
    this.bossName.setText(b.name);
    const veil = b.veilPhase !== undefined;
    this.bossBack.setVisible(!veil);
    this.bossChip.setVisible(!veil);
    this.bossFill.setVisible(!veil);
    this.bossSegs.forEach((s) => {
      s.back.setVisible(veil);
      s.chip.setVisible(veil);
      s.fill.setVisible(veil);
    });
    this.bossCheckpoint?.setVisible(veil);
    if (!veil) {
      const k = Phaser.Math.Clamp(b.hp / b.max, 0, 1);
      this.bossFill.width = 460 * k;
      this.bossFill.setFillStyle(k > 0.5 ? 0xb57cff : 0xff5ad1);
      this.tweens.killTweensOf(this.bossChip);
      this.tweens.add({ targets: this.bossChip, width: 460 * k, delay: 250, duration: 400 });
      return;
    }
    // Veil: two phase bars. Threshold mirrors CrystalVeilBoss (60%).
    const phase = b.veilPhase!;
    const t2 = b.max * 0.6;
    const ks = [
      Phaser.Math.Clamp((b.hp - t2) / (b.max - t2), 0, 1),
      Phaser.Math.Clamp(b.hp / t2, 0, 1),
    ];
    const cols = [0xff5ad1, 0xb57cff];
    const dark = [0x57163f, 0x342058];
    this.bossSegs.forEach((s, i) => {
      const done = phase > i + 1 || (i + 1 < phase);
      const dead = ks[i] <= 0;
      s.fill.width = s.w * ks[i];
      s.fill.setFillStyle(dead ? dark[i] : cols[i]);
      s.fill.setAlpha(dead ? 0.55 : 1);
      this.tweens.killTweensOf(s.chip);
      this.tweens.add({ targets: s.chip, width: s.w * ks[i], delay: 250, duration: 400 });
      void done;
    });
    // Near-threshold glow: within 15 HP above the threshold the checkpoint
    // sits at full brightness; otherwise it rests dimmer.
    const nearThreshold = phase === 1 && b.hp > t2 && b.hp <= t2 + 15;
    this.bossCheckpoint?.setAlpha(nearThreshold ? 1 : 0.65);
    if (phase !== this.veilPhase) {
      // Phase change: shatter flash over the bar that just died + panel pop.
      if (this.veilPhase > 0 && phase > this.veilPhase) {
        // Checkpoint crossing pulse: brief full-bright flash, then back to rest.
        if (this.bossCheckpoint) {
          this.bossCheckpoint.setAlpha(1);
          this.tweens.add({ targets: this.bossCheckpoint, alpha: 0.65, delay: 150, duration: 500 });
        }
        const dead = this.bossSegs[phase - 2];
        if (dead) {
          const flash = this.add.rectangle(dead.fill.x, 50, dead.w, 16, 0xffffff).setOrigin(0, 0.5).setAlpha(0.95);
          this.bossPanel.add(flash);
          this.tweens.add({ targets: flash, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
        }
        this.tweens.add({ targets: this.bossPanel, scaleX: 1.045, scaleY: 1.045, duration: 110, yoyo: true, ease: "Quad.out" });
      }
      this.veilPhase = phase;
      this.veilPulse?.remove();
      const active = this.bossSegs[phase - 1];
      if (active) this.veilPulse = this.tweens.add({ targets: active.fill, alpha: { from: 0.78, to: 1 }, duration: 540, yoyo: true, repeat: -1 });
    }
  }

  private buildWeaponSlot() {
    const g = hudDisc(this, "hud_weapon_slot", 42);
    this.weaponIcon = this.add.image(0, -4, "hud_weapon_sword");
    this.weaponKey = this.add
      .text(36, 36, "", { fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#7a5aa8", padding: { x: 5, y: 1 } })
      .setOrigin(1, 1);
    this.weaponSlot = this.add.container(52, 172, [g, this.weaponIcon, this.weaponKey]).setVisible(false);
    this.weaponSlot.setSize(92, 92).setInteractive({ useHandCursor: true });
    this.weaponSlot.on("pointerup", () => {
      if (!this.overlay && !this.cinema) touchState.swapQueued = true;
    });
  }

  private refreshWeapon() {
    const w = this.registry.get("weapon") as WeaponId | null;
    const list = (this.registry.get("weapons") as WeaponId[] | undefined) ?? [];
    this.weaponSlot.setVisible(!!w);
    if (w) {
      this.weaponIcon.setTexture(`hud_weapon_${w}`).setDisplaySize(60, 60);
      this.weaponKey.setText(list.length > 1 ? (Gamepad.connected ? "Y" : this.showTouch ? "TAP" : "Q") : "").setVisible(list.length > 1);
      this.tweens.add({ targets: this.weaponSlot, scale: { from: 1.25, to: 1 }, duration: 220, ease: "Back.out" });
      this.drawAttackButton(w);
    }
    this.syncTouchVisibility();
  }

  private setHearts(n: number) {
    const prev = this.lastHearts;
    this.lastHearts = n;
    this.hearts.forEach((h, i) => {
      const full = i < n;
      h.setTint(full ? 0xffffff : 0x3a3450).setAlpha(full ? 1 : 0.6);
      if (!full && h.getData("full") !== false) {
        this.tweens.add({ targets: h, scale: { from: h.scale * 1.5, to: h.scale }, duration: 250 });
      }
      h.setData("full", full);
    });
    this.lowPulse?.stop();
    const base = scaleForHeight("heart", 30);
    this.hearts.forEach((h) => h.setScale(base));
    if (n === 1) {
      this.lowPulse = this.tweens.add({ targets: this.hearts[0], scale: base * 1.25, duration: 350, yoyo: true, repeat: -1 });
    }
    // v94 PRUEBA: reactive portrait — damage / 1-heart fear / full-heal joy.
    // Hooks the existing hearts registry event only; no new damage logic.
    if (n < prev) {
      if (n === 1) this.setPortrait("scared");
      else this.setPortrait("hurt", true);
    } else if (n > prev) {
      if (n === MAX_HEARTS) this.setPortrait("happy", true);
      else this.setPortrait("neutral");
    } else if (n === 1) {
      this.setPortrait("scared");
    }
  }

  /** v94 PRUEBA: swap the HUD portrait. `brief` states (hurt/happy) return
   *  to neutral on a timer — unless hearts are still at 1, where scared
   *  stays. The hurt jolt shakes the image inside its fixed circular mask. */
  private setPortrait(state: "neutral" | "hurt" | "scared" | "happy", brief = false) {
    if (!this.portraitImg) return;
    this.portraitTimer?.remove(false);
    this.portraitTimer = undefined;
    this.portraitImg.setX(40).setTexture(`hud_portrait_${state}`);
    if (state === "hurt") {
      this.tweens.killTweensOf(this.portraitImg);
      this.tweens.add({ targets: this.portraitImg, x: "+=5", duration: 70, yoyo: true, repeat: 1 });
    }
    if (brief) {
      this.portraitTimer = this.time.delayedCall(state === "hurt" ? 900 : 1400, () => {
        if (this.lastHearts === 1) this.setPortrait("scared");
        else this.setPortrait("neutral");
      });
    }
  }

  private setShield(seconds: number) {
    const on = seconds > 0;
    this.shieldText.setVisible(on);
    if (!on) return;
    const colors = ["#fff27a", "#ff6ad5", "#7af0ff", "#ffffff", "#b6ff6a"];
    this.shieldText.setText(`★ ${seconds}s`).setColor(colors[seconds % colors.length]);
  }

  /** PRUEBA ch11: banked coin count (top-right). */
  private setCoins(n: number) {
    this.coinText.setText(String(Math.max(0, n)));
  }

  private setGoal(g: GoalState) {
    const info = LEVELS[this.levelIndex];
    const shown = Math.min(g.have, g.need);
    this.lockIcon.clear();
    this.gemIcon.setVisible(false);
    const x = GAME_W / 2 - 122;
    if (g.kind === "reach") {
      this.killText.setText(info.mode === "climb" ? "CLIMB TO THE TOP!" : info.mode === "chase" ? "RUN TO THE PORTAL!" : "REACH THE PORTAL").setFontSize(23);
      this.killText.setX(GAME_W / 2 + 14).setColor("#9ff5ff");
      this.lockIcon.fillStyle(0x9ff5ff, 1).fillTriangle(x - 10, 46, x + 12, 39, x - 10, 30);
      return;
    }
    this.killText.setFontSize(26).setX(GAME_W / 2 + 18).setColor("#fff4d6");
    this.killText.setText(`${g.kind === "gems" ? "GEMS" : g.kind === "coins" ? "COINS" : "ENEMIES"} ${String(shown).padStart(2, "0")} / ${g.need}`);
    const k = g.have;
    const goal = g.need;
    if (k < goal) {
      if (g.kind === "gems") {
        this.gemIcon.setPosition(x, 39).setVisible(true);
      } else drawLock(this.lockIcon, x, 36, 0.55);
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
    this.jumpBtn = this.makeRoundButton(JUMP.x, JUMP.y, JUMP.r, "JUMP", "hud_jump");
    this.attackBtn = this.add.container(ATTACK.x, ATTACK.y);
    // v60: no SPECIAL circle here anymore -- the meter lives in the top-center bar.
    this.touchUi.add([this.joyBase, this.joyKnob, this.jumpBtn, this.attackBtn]);

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
    this.touchUi.setVisible(this.showTouch && !this.overlay && !this.cinema);
    this.attackBtn.setVisible(!!w);
  }

  /** SPECIAL meter bar: gold gradient fill grows with charge; when FULL the
   * whole bar glows gold and the two gold stars twinkle (v78 redesign). */
  private setSpecial(charge: number) {
    this.specialCharge = charge;
    const full = charge >= 8;
    this.drawSpecialFill(charge);
    this.specialLabel.setColor(full ? "#ffe27a" : "#ffe9a8");
    if (full && !this.specialPulse) {
      this.specialPulse = this.tweens.add({ targets: this.specialBar, scale: { from: 1, to: 1.05 }, duration: 320, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      this.specialGlowTween = this.tweens.add({ targets: this.specialGlow, alpha: { from: 0.25, to: 0.65 }, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      this.specialStars.forEach((s, i) =>
        this.tweens.add({ targets: s, scale: { from: 1, to: 1.45 }, duration: 300, yoyo: true, repeat: -1, delay: i * 110, ease: "Sine.inOut" }),
      );
    } else if (!full && this.specialPulse) {
      this.specialPulse.remove();
      this.specialPulse = undefined;
      this.specialGlowTween?.remove();
      this.specialGlowTween = undefined;
      this.specialStars.forEach((s) => {
        this.tweens.killTweensOf(s);
        s.setScale(1);
      });
      this.specialGlow.setAlpha(0);
      this.specialBar.setScale(1);
    }
  }

  private drawAttackButton(w: WeaponId) {
    this.attackBtn.removeAll(true);
    const inner = this.makeRoundButton(0, 0, ATTACK.r, WEAPON_LABELS[w], "hud_attack");
    const icon = this.add.image(0, -10, `hud_weapon_${w}`).setDisplaySize(54, 54);
    inner.add(icon);
    // Keep the weapon name above the icon's transparent padding.
    inner.bringToTop(inner.getAt(1));
    this.attackBtn.add(inner);
  }

  // Roblox-style (2026-11-01, pedido de Angelo): SOLO la gráfica —
  // círculos grises simples como el joystick de Roblox. Comportamiento
  // sin cambio (visible en home, origen dinámico al tocar).
  private joystick(x: number, y: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x1a1a1a, 0.45).fillCircle(0, 0, JOY_R);
    c.add(g);
    return c;
  }

  private knob(x: number, y: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xd9d9d9, 0.85).fillCircle(0, 0, KNOB_R);
    c.add(g);
    return c;
  }

  private makeRoundButton(x: number, y: number, r: number, label: string, texture: string) {
    const c = this.add.container(x, y);
    const g = hudDisc(this, texture, r);
    const t = this.add
      .text(0, r * 0.46, label, {
        fontFamily: FONT,
        fontSize: `${Math.max(10, Math.round(r * (label.length > 7 ? 0.21 : label.length > 5 ? 0.26 : 0.3)))}px`,
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#2a1640",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    c.add([g, t]);
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
    if (p.y < 80 && (p.x > GAME_W - 182 || p.x < 260)) return;
    if (p.x < 260 && p.y < 225) return;
    const d = (b: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y);
    if (d(JUMP) < JUMP.r + 18 && this.jumpId < 0) {
      this.jumpId = p.id;
      touchState.jumpHeld = true;
      touchState.jumpQueued = true;
      this.jumpBtn.setScale(0.9);
      return;
    }
    if (this.attackBtn.visible && d(ATTACK) < ATTACK.r + 14 && this.attackId < 0) {
      this.attackId = p.id;
      touchState.attackQueued = true;
      this.attackBtn.setScale(0.9);
      return;
    }
    // v60: tap the top-center SPECIAL bar to fire it when full. The bar sits
    // above the playfield, so unlike the old right-side circle it never covers
    // incoming enemies. Tapping it early does nothing (no queue).
    if (Math.abs(p.x - SPECIAL_BAR.x) < SPECIAL_BAR.w / 2 + 12 && Math.abs(p.y - SPECIAL_BAR.y) < SPECIAL_BAR.h / 2 + 14) {
      if (this.specialCharge >= 8) touchState.specialQueued = true;
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
    const len = Math.min(JOY_R - KNOB_R, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    this.joyKnob.setPosition(this.joyOrigin.x + Math.cos(ang) * len, this.joyOrigin.y + Math.sin(ang) * len);
    // Analog: a small push walks, a full push runs. The dead zone only absorbs thumb jitter.
    const ax = Phaser.Math.Clamp(dx / JOY_R, -1, 1);
    const mag = Math.abs(ax) < DEAD_ZONE ? 0 : Math.min(1, (Math.abs(ax) - DEAD_ZONE) / 0.5);
    touchState.axis = Math.sign(ax) * (mag === 0 ? 0 : 0.45 + 0.55 * mag);
    // PRUEBA ch11: joystick vertical drives the ladder (hold up to climb the
    // whole ladder, hold down to come back down). Same dead-zone/ramp as X.
    const ay = Phaser.Math.Clamp(dy / JOY_R, -1, 1);
    const magY = Math.abs(ay) < DEAD_ZONE ? 0 : Math.min(1, (Math.abs(ay) - DEAD_ZONE) / 0.5);
    touchState.axisY = Math.sign(ay) * (magY === 0 ? 0 : 0.45 + 0.55 * magY);
    // v97 ladder-top drift fix: dominant-axis snapping. The game has no
    // diagonal movement (walk left/right OR climb up/down; JUMP is a
    // separate button), so the winning axis kills the losing one. Holding
    // UP can no longer bleed sideways into a walk off the ladder-top ledge.
    if (Math.abs(ay) > Math.abs(ax)) touchState.axis = 0;
    else if (Math.abs(ax) > Math.abs(ay)) touchState.axisY = 0;
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.joyId) {
      this.joyId = -1;
      touchState.axis = 0;
      touchState.axisY = 0;
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
    if (this.jumpId < 0) this.jumpBtn.setScale(1);
    if (this.attackId < 0) this.attackBtn.setScale(1);
  }

  // -------------------------------------------------------------- messages

  private setCinema(on: boolean) {
    this.cinema = on;
    this.cinemaTop.forEach(item => item.setVisible(!on));
    if (!on) this.setBoss(this.registry.get("boss") ?? null);
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
    // v95: the toast sat at y 124, crossing the SPECIAL bar (y 90–110 +
    // stars) — the 2026-11-15 audit's "tip overlaps the LEVEL banner".
    // Moved 24 px down so the 24 px text clears the bar.
    const y = this.bossPanel.visible ? 152 : 148;
    this.toastText.setText(text).setAlpha(0).setY(y + 12);
    this.tweens.add({ targets: this.toastText, alpha: 1, y, duration: 220 });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2600, duration: 400 });
  }

  /** v81: hide the yellow hint box immediately (crate push). */
  private hideToast() {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0);
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

  private showPause() {
    if (this.overlay) return;
    // Pause EXACTO (2026-10-30, pedido de Angelo): el arte concepto entero,
    // a pantalla completa (cover 1280x576; contain dejaba pilares oscuros
    // porque el arte 16:9 no llena el cuadro 1280x576) +
    // zonas invisibles sobre los 5 botones pintados, como el game-over art.
    // Los toggles MUSIC/SFX son la única excepción visual: cuando están en
    // OFF, el botón entero se vuelve rojo (misma forma, texto OFF en
    // blanco); en ON, la imagen es exactamente la enviada.
    resetTouch();
    this.joyId = this.jumpId = this.attackId = -1;
    this.resetJoy();
    const c = this.add.container(0, 0).setDepth(100);
    // Pilares oscuros + bloqueo de input por debajo.
    c.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0716, 1).setOrigin(0).setInteractive());
    // Arte: cover (llena la pantalla; recorte simétrico arriba/abajo,
    // ningún botón) o dim clásico si falta la textura.
    let dispX = 0;
    let dispY = 0;
    let dispW = GAME_W;
    let dispH = GAME_H;
    if (this.textures.exists("pause_menu_art")) {
      const img = this.add.image(GAME_W / 2, GAME_H / 2, "pause_menu_art");
      const s = Math.max(GAME_W / img.width, GAME_H / img.height);
      img.setScale(s);
      dispW = img.width * s;
      dispH = img.height * s;
      dispX = (GAME_W - dispW) / 2;
      dispY = (GAME_H - dispH) / 2;
      c.add(img);
    } else {
      c.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0716, 0.72).setOrigin(0));
    }
    type ZoneCtl = { x: number; y: number; focus: (on: boolean) => void; activate: () => void };
    const zone = (fx0: number, fx1: number, fy0: number, fy1: number, fn: () => void): ZoneCtl => {
      const zx = dispX + ((fx0 + fx1) / 2) * dispW;
      const zy = dispY + ((fy0 + fy1) / 2) * dispH;
      const zw = (fx1 - fx0) * dispW;
      const zh = (fy1 - fy0) * dispH;
      const r = this.add.rectangle(zx, zy, zw, zh, 0xffffff, 0).setInteractive({ useHandCursor: true });
      const frame = this.add.rectangle(zx, zy, zw, zh).setStrokeStyle(4, 0xffd36b).setAlpha(0);
      // Menú táctil (2026-11-02, fix pausa v51): disparar en pointerdown,
      // no solo pointerup — en el WebView del teléfono el pointerup se
      // pierde y los botones quedaban muertos. El Set evita doble
      // disparo cuando down y up llegan los dos (toggles MUSIC/SFX).
      const fired = new Set<number>();
      const fire = () => {
        Audio.sfx("button");
        fn();
      };
      r.on("pointerdown", (p: Phaser.Input.Pointer) => {
        fired.add(p.id);
        fire();
      });
      r.on("pointerup", (p: Phaser.Input.Pointer) => {
        if (fired.has(p.id)) {
          fired.delete(p.id);
          return;
        }
        fire();
      });
      r.on("pointerupoutside", (p: Phaser.Input.Pointer) => {
        fired.delete(p.id);
      });
      c.add([r, frame]);
      return {
        x: zx,
        y: zy,
        focus: (on: boolean) => {
          frame.setAlpha(on ? 1 : 0);
        },
        activate: () => {
          Audio.sfx("button");
          fn();
        },
      };
    };
    // Toggles OFF en ROJO (Angelo 2026-11-14, v89): el parche verde viejo
    // tapaba solo la palabra ON y su verde no coincidía con el botón —
    // se veía como un cuadrito pegado. Ahora el botón ENTERO se vuelve
    // rojo cuando está en OFF (misma forma de píldora, mismo texto en
    // blanco), y en ON se ve el botón verde pintado del arte.
    // v90: el cambio ya no es instantáneo — la píldora roja entra con un
    // pop (escala 0.85→1, Back.easeOut) y sale encogiéndose + fundido, así
    // el toggle se siente como un botón de verdad y no como un cambio de
    // color pegado (Angelo 2026-11-14: "cambia de color sin animación").
    const toggleOff = (fx0: number, fx1: number, fy0: number, fy1: number, label: string) => {
      const bx = dispX + fx0 * dispW;
      const by = dispY + fy0 * dispH;
      const bw = (fx1 - fx0) * dispW;
      const bh = (fy1 - fy0) * dispH;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      const g = this.add.graphics();
      // Píldora roja con borde oscuro, con inset para dejar ver el borde
      // dorado y las gemas del botón pintado. Dibujada relativa al centro
      // para que el pop de escala no la desplace.
      g.fillStyle(0x8f0f0f, 1).fillRoundedRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8, 14);
      g.fillStyle(0xd21f2b, 1).fillRoundedRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14, 11);
      g.fillStyle(0xe85a5a, 1).fillRoundedRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, (bh - 14) / 2, { tl: 11, tr: 11, bl: 0, br: 0 });
      const t = this.add
        .text(0, 0, label, { fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#ffffff", stroke: "#2a1640", strokeThickness: 5 })
        .setOrigin(0.5);
      const grp = this.add.container(cx, cy, [g, t]);
      c.add(grp);
      return grp;
    };
    /** Anima el toggle: al apagar, la píldora roja entra con pop; al
     *  prender, se encoge y se funde revelando el botón verde pintado. */
    const animateToggle = (grp: Phaser.GameObjects.Container, turningOff: boolean) => {
      this.tweens.killTweensOf(grp);
      if (turningOff) {
        grp.setVisible(true).setScale(0.85).setAlpha(0);
        this.tweens.add({ targets: grp, scale: 1, alpha: 1, duration: 220, ease: "Back.easeOut" });
      } else {
        this.tweens.add({
          targets: grp,
          scale: 0.85,
          alpha: 0,
          duration: 180,
          ease: "Quad.easeIn",
          onComplete: () => grp.setVisible(false).setScale(1).setAlpha(1),
        });
      }
    };
    const musicOff = toggleOff(583 / 1672, 836 / 1672, 677 / 941, 742 / 941, "MUSIC OFF");
    const sfxOff = toggleOff(857 / 1672, 1106 / 1672, 677 / 941, 742 / 941, "SFX: OFF");
    musicOff.setVisible(!Audio.musicOn);
    sfxOff.setVisible(!Audio.sfxOn);
    const resume = zone(610 / 1672, 1076 / 1672, 498 / 941, 570 / 941, () => {
      this.closeOverlay();
      Audio.duck(false);
      this.scene.resume("Game");
    });
    const restart = zone(565 / 1672, 835 / 1672, 594 / 941, 652 / 941, () => this.restartLevel());
    const select = zone(845 / 1672, 1115 / 1672, 594 / 941, 652 / 941, () => this.toChapterSelect());
    const music = zone(583 / 1672, 836 / 1672, 677 / 941, 742 / 941, () => {
      Audio.setMusic(!Audio.musicOn);
      animateToggle(musicOff, !Audio.musicOn);
    });
    const sfx = zone(857 / 1672, 1106 / 1672, 677 / 941, 742 / 941, () => {
      Audio.setSfx(!Audio.sfxOn);
      animateToggle(sfxOff, !Audio.sfxOn);
    });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.overlay = c;
    this.syncTouchVisibility();
    this.menu = new PadMenu(this, [resume, restart, select, music, sfx], { back: () => resume.activate(), menuIsBack: true });
  }
  private showGameOver(d: { level: number; goal: GoalState; bossHp?: number; bossMax?: number; bossPhase?: number }) {
    this.time.delayedCall(10, () => {
      if (this.overlay) this.closeOverlay();
      const info = LEVELS[d.level];
      const key = `gameover_ch${info.chapter}`;
      if (this.textures.exists(key)) {
        this.showGameOverArt(d, info, key);
        return;
      }
      // Asset failed to load: fall back to the plain text panel.
      this.showGameOverLegacy(d, info);
    });
  }

  /**
   * Game-over art (2026-10-26, landscape swap): the chapter's painted screen.
   * Landscape art (1870x841) goes FULL-BLEED cover on the 1280x576 canvas
   * (aspects differ by <0.1%, cropping is negligible); portrait art falls
   * back to the centered height-limited panel. The painted buttons ARE the
   * buttons: invisible zones sit over them, wired to the existing handlers.
   * No new visible buttons. Boss retry line (chapter 10) renders on a dark
   * strip at the bottom edge on full-bleed art. No damage stats, no DPS.
   */
  private showGameOverArt(d: { level: number; goal: GoalState; bossHp?: number; bossMax?: number; bossPhase?: number }, info: (typeof LEVELS)[number], key: string) {
    const hasBoss = info.chapter === 10 && d.bossHp !== undefined && d.bossMax !== undefined && d.bossMax > 0;
    const src = this.textures.get(key).getSourceImage() as unknown as { width?: number; height?: number } | null;
    const iw = src?.width ?? 941;
    const ih = src?.height ?? 1672;
    const isLandscape = iw > ih;
    resetTouch();
    this.joyId = this.jumpId = this.attackId = -1;
    this.resetJoy();
    const c = this.add.container(0, 0).setDepth(100);
    // Display rect of the art on the canvas.
    let dispX: number;
    let dispY: number;
    let dispW: number;
    let dispH: number;
    if (isLandscape) {
      const scale = Math.max(GAME_W / iw, GAME_H / ih);
      dispW = iw * scale;
      dispH = ih * scale;
      dispX = (GAME_W - dispW) / 2;
      dispY = (GAME_H - dispH) / 2;
      // Full-bleed: the art itself covers the canvas, no dim needed.
      c.add(this.add.image(GAME_W / 2, GAME_H / 2, key).setDisplaySize(dispW, dispH));
    } else {
      const panelH = hasBoss ? Math.floor(GAME_H * 0.92) : GAME_H;
      dispW = panelH * (941 / 1672);
      dispH = panelH;
      dispX = GAME_W / 2 - dispW / 2;
      dispY = 0;
      c.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0716, 0.72).setOrigin(0).setInteractive());
      c.add(this.add.image(GAME_W / 2, panelH / 2, key).setDisplaySize(dispW, dispH));
    }
    type ZoneCtl = { x: number; y: number; focus: (on: boolean) => void; activate: () => void };
    const zone = (fx0: number, fx1: number, fy0: number, fy1: number, fn: () => void): ZoneCtl => {
      const zx = dispX + ((fx0 + fx1) / 2) * dispW;
      const zy = dispY + ((fy0 + fy1) / 2) * dispH;
      const zw = (fx1 - fx0) * dispW;
      const zh = (fy1 - fy0) * dispH;
      const r = this.add.rectangle(zx, zy, zw, zh, 0xffffff, 0).setInteractive({ useHandCursor: true });
      const frame = this.add.rectangle(zx, zy, zw, zh).setStrokeStyle(4, 0xffd36b).setAlpha(0);
      // Menú táctil (2026-11-02, fix pausa v51): mismo fix que la pausa —
      // disparar en pointerdown, no solo pointerup. El Set evita doble
      // disparo cuando down y up llegan los dos.
      const fired = new Set<number>();
      const fire = () => {
        Audio.sfx("button");
        fn();
      };
      r.on("pointerdown", (p: Phaser.Input.Pointer) => {
        fired.add(p.id);
        fire();
      });
      r.on("pointerup", (p: Phaser.Input.Pointer) => {
        if (fired.has(p.id)) {
          fired.delete(p.id);
          return;
        }
        fire();
      });
      r.on("pointerupoutside", (p: Phaser.Input.Pointer) => {
        fired.delete(p.id);
      });
      c.add([r, frame]);
      return {
        x: zx,
        y: zy,
        // Focus ring only ever shows with a connected gamepad (PadMenu
        // calls focus only then); touch/mouse play sees just the art.
        focus: (on: boolean) => {
          frame.setAlpha(on ? 1 : 0);
        },
        activate: () => {
          Audio.sfx("button");
          fn();
        },
      };
    };
    const bossLine = () => {
      const pct = Math.floor((1 - (d.bossHp ?? 0) / (d.bossMax ?? 1)) * 100);
      const phase = d.bossPhase ?? 1;
      return `Llegaste a la fase ${phase}. Estuviste ${pct}% de la pelea.`;
    };
    let again: ZoneCtl;
    let select: ZoneCtl;
    if (isLandscape) {
      // Zones measured from the art itself (enlarged button-row crops of the
      // ch1 and ch10 panels, intersected): inside the painted pills on both.
      again = zone(0.45, 0.65, 0.70, 0.79, () => this.restartLevel());
      select = zone(0.69, 0.82, 0.70, 0.79, () => this.toChapterSelect());
      if (hasBoss) {
        c.add(this.add.rectangle(GAME_W / 2, GAME_H - 18, GAME_W, 36, 0x0b0716, 0.6).setOrigin(0.5));
        c.add(
          this.add
            .text(GAME_W / 2, GAME_H - 18, bossLine(), { fontFamily: FONT, fontSize: "19px", fontStyle: "bold", color: "#ffd36b" })
            .setOrigin(0.5),
        );
      }
    } else {
      // Portrait panel zones (measured 2026-10-26 on the ch1/ch10 panels).
      again = zone(0.21, 0.79, 0.606, 0.652, () => this.restartLevel());
      select = zone(0.25, 0.75, 0.694, 0.738, () => this.toChapterSelect());
      if (hasBoss) {
        c.add(
          this.add
            .text(GAME_W / 2, dispH + (GAME_H - dispH) / 2, bossLine(), { fontFamily: FONT, fontSize: "19px", fontStyle: "bold", color: "#ffd36b" })
            .setOrigin(0.5),
        );
      }
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.overlay = c;
    this.syncTouchVisibility();
    this.menu = new PadMenu(this, [again, select]);
  }

  private showGameOverLegacy(d: { level: number; goal: GoalState; bossHp?: number; bossMax?: number; bossPhase?: number }, info: (typeof LEVELS)[number]) {
    {
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
        g.kind === "boss"
          ? info.chapter === 8
            ? "The dune is still moving... get back up, Angely!"
            : info.chapter === 10
              ? "The Crystal Veil is still standing. Try again, Angely!"
              : "Queen Umbra is waiting... don't give up, Angely!"
          : g.kind === "reach" ? "So close! Try again, Angely!"
            : `${g.kind === "gems" ? "Star gems" : g.kind === "coins" ? "Coins collected" : "Enemies defeated"}: ${Math.min(g.have, g.need)} / ${g.need}`;
      c.add(this.add.text(GAME_W / 2, top + 200, line, { fontFamily: FONT, fontSize: "21px", fontStyle: "bold", color: "#9ff5ff" }).setOrigin(0.5));
      // Feel package 2026-10-26: final-boss retry progress. No damage stats,
      // no DPS, no floating numbers — just how far into the fight she got.
      if (info.chapter === 10 && d.bossHp !== undefined && d.bossMax) {
        const pct = Math.floor((1 - d.bossHp / d.bossMax) * 100);
        const phase = d.bossPhase ?? 1;
        c.add(this.add.text(GAME_W / 2, top + 232, `Llegaste a la fase ${phase}. Estuviste ${pct}% de la pelea.`, { fontFamily: FONT, fontSize: "19px", fontStyle: "bold", color: "#ffd36b" }).setOrigin(0.5));
      }
      const again = new Button(this, GAME_W / 2, top + 280, "TRY AGAIN", () => this.restartLevel(), { width: 320, height: 64, fontSize: 30 });
      const select = new Button(this, GAME_W / 2, top + 360, "LEVEL SELECT", () => this.toChapterSelect(), { width: 300, height: 52, fontSize: 22, color: 0x7a5aa8 });
      c.add([again, select]);
      this.menu = new PadMenu(this, [again, select]);
    }
  }

  private showVictory() {
    if (this.overlay) this.closeOverlay();
    resetTouch();
    this.cinema = true;
    this.dialogue.cinema(false);
    this.syncTouchVisibility();
    const c = this.add.container(0,0).setDepth(300);
    // End art (2026-10-24): full-bleed illustration, top-aligned cover so the
    // logo and Angely stay in frame and the art's own button stays off-screen
    // (the game's real button below handles the tap). Replaces the dark
    // "ANGELO & ANGELY" text screen.
    // THE END fix (2026-11-15, v95): the art must NOT be interactive. It has
    // no input handler, so its only effect was to join hit-testing — and in
    // Phaser 4 the hit-test sort orders by camera.renderList, which does not
    // contain the overlay until the first render AFTER it is created. A tap
    // in that first frame (easy on the phone: the finger is already coming
    // down as THE END appears, and video teardown can stall the first
    // render) sorts art-before-button (registration order), topOnly keeps
    // only the art, and the tap dies silently with no feedback — the exact
    // phone report (BACK TO LEVELS does nothing, game stuck on THE END).
    // With the art non-interactive the button is the overlay's ONLY
    // interactive object, so no sort can misroute the tap. Fall-through is
    // harmless: Hud.onDown guards on overlay/cinema and Game has no
    // interactive objects or scene input handlers.
    // CORRECTION (2026-11-16, v98, item 14): that theory was WRONG — the
    // render list is only used to SORT hits, never to exclude them, and the
    // art was never the problem. The button is NOT hittable until the next
    // game step after showVictory(), for TWO reasons (both verified in the
    // harness + Phaser 4.2.1 source: InputManager.inputCandidate,
    // InputPlugin queueForInsertion, Alpha setter):
    //  1) Alpha gate: c.setAlpha(0) clears renderFlags bit 2, so
    //     willRender(camera) is false for the container, and inputCandidate
    //     rejects the button because it checks every parentContainer too.
    //  2) Registration gate: setInteractive() only queues the button in
    //     InputPlugin._pendingInsertion; it joins the hit-test list _list
    //     in preUpdate, i.e. on the next game step.
    // A tap landing in that first-step window (easy on the phone: the finger
    // is already coming down as THE END appears, and video teardown can
    // stall the first frames) died silently.
    // Fix, two parts: (a) start the fade at alpha 0.01, not 0, so the
    // container renders (and the button is hittable) from creation — the
    // fade still looks identical; (b) a scene-level pointerdown catch that
    // activates the button when the tap lands inside its bounds while this
    // overlay is up — the plugin-level POINTER_DOWN fires even when no
    // object was hit, so it covers the pre-registration window. The
    // button's own handler runs first on settled taps; the overlay===c
    // guard stops a double fire.
    const art = this.add.image(GAME_W/2,0,"the_end_art").setOrigin(0.5,0).setDisplaySize(GAME_W,720);
    c.add(art);
    const levels = new Button(this,GAME_W/2,520,"BACK TO LEVELS",() => this.toChapterSelect(),{
      width:360,height:62,fontSize:26,color:0x426eaa,fireOnDown:true
    });
    c.add(levels);
    this.overlay = c;
    c.setAlpha(0.01);
    this.tweens.add({targets:c,alpha:1,duration:700});
    const onVictoryDown = (p: Phaser.Input.Pointer) => {
      if (this.overlay !== c) return;
      const q = this.logical(p);
      // Full button rect from its set size (360x62), NOT getBounds():
      // getBounds() only returns the label-text rect (~213x36) before the
      // first render, so edge taps on the visual button would still miss.
      const hw = levels.width / 2;
      const hh = levels.height / 2;
      if (q.x >= levels.x - hw && q.x <= levels.x + hw && q.y >= levels.y - hh && q.y <= levels.y + hh) {
        this.input.off("pointerdown", onVictoryDown);
        levels.activate();
      }
    };
    this.input.on("pointerdown", onVictoryDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,() => this.input.off("pointerdown", onVictoryDown));
    this.menu = new PadMenu(this,[levels],{back:() => levels.activate(),menuIsBack:true});
    const born = this.time.now;
    const onKey = (e: KeyboardEvent) => {
      if (this.time.now-born >= 500 && ["Enter","Space","Escape"].includes(e.code)) levels.activate();
    };
    this.input.keyboard?.on("keydown",onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,() => this.input.keyboard?.off("keydown",onKey));
  }
  private restartLevel() {
    this.closeOverlay();
    Audio.duck(false);
    this.scene.start("Game", { level: this.levelIndex });
  }

  private toChapterSelect() {
    this.closeOverlay();
    this.scene.stop("Game");
    this.scene.start("Title", { select: true });
  }
}
