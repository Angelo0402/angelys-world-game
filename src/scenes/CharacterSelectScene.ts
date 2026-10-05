import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import { FONT, GAME_H, GAME_W } from "../config";
import { COOP_UNIQUE_CHARACTERS, PLAYABLE_CHARACTERS, type PlayableCharacter } from "../config/characters";
import { Button, titleText } from "../ui/Button";
import { coverImage, requestFullscreenLandscape } from "../ui/screen";
import { fitCamera } from "../render";

export interface CharacterSelectData {
  coop?: boolean;
}

/**
 * Co-op character select.
 *
 * Flow: TitleScene CO-OP -> (room create/join) -> here ->
 *   P1 picks -> P2 picks -> READY -> Title chapter select (coop preserved) ->
 *   Splash -> Game (coop + character ids preserved).
 *
 * Cards are built from PLAYABLE_CHARACTERS, so adding a new hero later only
 * requires appending to that array — no UI changes.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private phase: "p1" | "p2" | "done" = "p1";
  private p1Char: string | null = null;
  private p2Char: string | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private readyBtn!: Button;
  private cards: { char: PlayableCharacter; card: Phaser.GameObjects.Container; badge: Phaser.GameObjects.Text; frame: Phaser.GameObjects.Graphics; draw: (focus: boolean) => void }[] = [];
  private focusIdx = 0;

  constructor() {
    super("CharacterSelect");
  }

  create(_data: CharacterSelectData) {
    fitCamera(this);
    Audio.music("music_title");
    this.cameras.main.fadeIn(400, 18, 13, 31);
    coverImage(this, "title_bg").setTint(0x6a6488);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x120d1f, 0.45).setOrigin(0);

    titleText(this, GAME_W / 2, 52, "CHOOSE YOUR HERO", 44, "#7ad4ff");

    this.prompt = this.add
      .text(GAME_W / 2, 110, "", {
        fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#fff4d6", stroke: "#1b0f2e", strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.buildCards();
    this.renderPrompt();

    this.readyBtn = new Button(this, GAME_W / 2, GAME_H - 74, "READY!", () => this.onReady(), {
      width: 300, height: 66, fontSize: 32, color: 0x3ecbff,
    });
    this.readyBtn.setVisible(false);

    // Button adds itself to the scene; no reference needed.
    new Button(this, 110, GAME_H - 74, "BACK", () => {
      Audio.sfx("button");
      this.scene.start("Title");
    }, { width: 170, height: 56, fontSize: 22, color: 0x7a5aa8 });

    // Keyboard nav: arrows move, Enter/Space picks.
    this.input.keyboard?.on("keydown-LEFT", () => this.moveFocus(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveFocus(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.pickFocused());
    this.input.keyboard?.on("keydown-SPACE", () => this.pickFocused());
    this.updateFocus();
  }

  private buildCards() {
    const chars = PLAYABLE_CHARACTERS;
    const n = chars.length;
    const CARD_W = 300, CARD_H = 320, GAP = 40;
    const totalW = n * CARD_W + (n - 1) * GAP;
    const startX = GAME_W / 2 - totalW / 2 + CARD_W / 2;
    const y = 300;

    chars.forEach((char, i) => {
      const cx = startX + i * (CARD_W + GAP);
      const card = this.add.container(cx, y);

      const frame = this.add.graphics();
      const draw = (focus: boolean) => {
        frame.clear();
        const picked = this.p1Char === char.id || this.p2Char === char.id;
        const border = picked ? 0xffd36b : focus ? 0xfff4a8 : char.color;
        frame.fillStyle(0x1b0f2e, 0.92).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20);
        frame.lineStyle(picked || focus ? 5 : 3, border, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20);
      };
      draw(false);
      card.add(frame);

      // Portrait: play the idle anim so the card feels alive.
      const portrait = this.add.sprite(0, -58, char.sprite, char.portraitFrame ?? 0);
      const ps = 190 / portrait.height;
      portrait.setScale(ps);
      try {
        portrait.play(`${char.sprite}:idle`);
      } catch {
        // Sprite has no idle anim — static portrait is fine.
      }
      card.add(portrait);

      const name = this.add.text(0, 88, char.name.toUpperCase(), {
        fontFamily: FONT, fontSize: "30px", fontStyle: "bold", color: "#ffffff", stroke: "#1b0f2e", strokeThickness: 5,
      }).setOrigin(0.5);
      const desc = this.add.text(0, 122, char.description, {
        fontFamily: FONT, fontSize: "17px", color: "#e8dcff", stroke: "#1b0f2e", strokeThickness: 3,
        wordWrap: { width: CARD_W - 40 }, align: "center",
      }).setOrigin(0.5, 0);
      card.add([name, desc]);

      const badge = this.add.text(CARD_W / 2 - 16, -CARD_H / 2 + 16, "", {
        fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#1b0f2e",
        backgroundColor: "#ffd36b", padding: { x: 10, y: 4 },
      }).setOrigin(1, 0).setVisible(false);
      card.add(badge);

      card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      card.on("pointerover", () => { this.focusIdx = i; this.updateFocus(); });
      card.on("pointerup", () => { this.focusIdx = i; this.pickFocused(); });

      this.cards.push({ char, card, badge, frame, draw });
    });
  }

  private moveFocus(dir: number) {
    const n = this.cards.length;
    this.focusIdx = (this.focusIdx + dir + n) % n;
    Audio.sfx("button");
    this.updateFocus();
  }

  private updateFocus() {
    this.cards.forEach((c, i) => c.draw(i === this.focusIdx));
  }

  /** Characters the current picker is allowed to choose. */
  private pickable(): PlayableCharacter[] {
    if (this.phase === "p1" || !COOP_UNIQUE_CHARACTERS) return PLAYABLE_CHARACTERS;
    const rest = PLAYABLE_CHARACTERS.filter((c) => c.id !== this.p1Char && !c.locked);
    // Only one hero exists: never soft-lock co-op — both players share Angely.
    return rest.length > 0 ? rest : PLAYABLE_CHARACTERS;
  }

  private pickFocused() {
    if (this.phase === "done") return;
    const entry = this.cards[this.focusIdx];
    if (!entry || entry.char.locked) return;
    if (!this.pickable().some((c) => c.id === entry.char.id)) {
      Audio.sfx("enemy_hit");
      return;
    }
    requestFullscreenLandscape(this);
    if (this.phase === "p1") {
      this.p1Char = entry.char.id;
      this.phase = "p2";
    } else {
      this.p2Char = entry.char.id;
      this.phase = "done";
    }
    Audio.sfx("heart_pickup");
    this.refreshCards();
    this.renderPrompt();
    this.updateFocus();
  }

  private refreshCards() {
    for (const c of this.cards) {
      const isP1 = this.p1Char === c.char.id;
      const isP2 = this.p2Char === c.char.id;
      c.badge.setVisible(isP1 || isP2);
      c.badge.setText(isP1 && isP2 ? "P1+P2" : isP1 ? "P1" : "P2");
      const takenByOther = this.phase === "p2" && isP1 && COOP_UNIQUE_CHARACTERS && this.pickable().every((p) => p.id !== c.char.id);
      c.card.setAlpha(takenByOther || c.char.locked ? 0.45 : 1);
      c.draw(this.cards[this.focusIdx] === c);
    }
    this.readyBtn.setVisible(this.phase === "done");
  }

  private renderPrompt() {
    if (this.phase === "p1") {
      this.prompt.setText("PLAYER 1 — tap your hero").setColor("#ffd36b");
    } else if (this.phase === "p2") {
      const solo = this.pickable().length === PLAYABLE_CHARACTERS.length && this.p1Char !== null;
      this.prompt.setText(solo ? "PLAYER 2 — only one hero: you both play Angely!" : "PLAYER 2 — tap your hero").setColor("#7ad4ff");
    } else {
      this.prompt.setText("Both players ready!").setColor("#9ff5ff");
    }
  }

  private onReady() {
    if (this.phase !== "done" || !this.p1Char || !this.p2Char) return;
    Audio.sfx("button");
    requestFullscreenLandscape(this);
    this.cameras.main.fadeOut(300, 18, 13, 31);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      // Back to Title's chapter select, but now in co-op mode with characters.
      this.scene.start("Title", { select: true, coop: true, p1Char: this.p1Char, p2Char: this.p2Char });
    });
  }
}
