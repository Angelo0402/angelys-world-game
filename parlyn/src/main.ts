import { CHAPTERS, LAST_LEVEL, LEVELS, levelLabel, levelsOf, type ChapterId } from "../../src/config";
import { BACKDROPS } from "../../src/assets/sprites.gen";
import { loadSave, unlockLevel } from "../../src/save";
import { Audio } from "./audio";
import { Input } from "./input";
import { PlayRenderer } from "./PlayRenderer";
import { PlaySession, type PlayHud } from "./play";

type Screen = "title" | "select" | "splash" | "play" | "pause";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function paramLevel(): number | null {
  const q = new URLSearchParams(location.search);
  const raw = q.get("level");
  if (raw?.includes("-")) {
    const [c, s] = raw.split("-").map(Number);
    const hit = LEVELS.find((l) => l.chapter === c && l.stage === s);
    if (hit) return hit.index;
  }
  if (raw && !Number.isNaN(Number(raw))) return Math.max(0, Math.min(LAST_LEVEL, Number(raw)));
  const ch = Number(q.get("chapter"));
  if (ch) return LEVELS.find((l) => l.chapter === ch)?.index ?? null;
  return null;
}

class App {
  private input = new Input();
  private renderer: PlayRenderer;
  private session: PlaySession | null = null;
  private screen: Screen = "title";
  private splashUntil = 0;
  private pending = 0;
  private starting = false;
  private last = performance.now();

  constructor() {
    const stage = $("stage");
    this.renderer = new PlayRenderer(stage);
    this.input.bindHud($("hud"));
    this.bindUi();
    this.show("title");
    Audio.music("music_title");
    const jump = paramLevel();
    if (jump != null) {
      this.pending = jump;
      this.openSplash(jump);
    }
    requestAnimationFrame(this.loop);
  }

  private bindUi() {
    $("btn-play").onclick = () => {
      Audio.resume();
      Audio.sfx("button");
      this.showSelect();
    };
    $("btn-resume").onclick = () => this.resume();
    $("btn-select").onclick = () => {
      this.session?.destroy();
      this.session = null;
      this.showSelect();
    };
    $("btn-retry").onclick = () => this.openSplash(this.pending);
    $("overlay-ok").onclick = () => this.overlayAction();
    this.fillSelect();
  }

  private fillSelect() {
    const root = $("chapter-list");
    root.innerHTML = "";
    const ids = (Object.keys(CHAPTERS).map(Number) as ChapterId[]).sort((a, b) => a - b);
    for (const id of ids) {
      const ch = CHAPTERS[id];
      const card = document.createElement("article");
      card.className = "chapter";
      const splash = BACKDROPS[ch.splash as keyof typeof BACKDROPS];
      card.innerHTML = `<div class="thumb" style="background-image:url('${splash}')"></div>
        <div class="info"><div class="kicker">Chapter ${id}</div><h2>${ch.name}</h2><div class="stages"></div></div>`;
      const stages = card.querySelector(".stages")!;
      for (const level of levelsOf(id)) {
        const b = document.createElement("button");
        b.className = "stage" + (level.boss ? " boss" : "");
        b.textContent = `${levelLabel(level)}  ${level.name}`;
        b.onclick = () => {
          Audio.resume();
          Audio.sfx("button");
          this.pending = level.index;
          this.openSplash(level.index);
        };
        stages.appendChild(b);
      }
      root.appendChild(card);
    }
  }

  private show(screen: Screen) {
    this.screen = screen;
    $("title-screen").hidden = screen !== "title";
    $("select-screen").hidden = screen !== "select";
    $("splash-screen").hidden = screen !== "splash";
    $("play-hud").hidden = screen !== "play" && screen !== "pause";
    $("pause-screen").hidden = screen !== "pause";
    $("touch").hidden = screen !== "play" && screen !== "pause";
    $("engine-tag").hidden = screen === "title";
  }

  private showSelect() {
    this.show("select");
    Audio.music("music_title");
  }

  private openSplash(index: number) {
    const info = LEVELS[index];
    $("splash-art").style.backgroundImage = `url('${BACKDROPS[CHAPTERS[info.chapter].splash as keyof typeof BACKDROPS]}')`;
    $("splash-kicker").textContent = `${levelLabel(info)}  ·  ${info.mode.toUpperCase()}${info.boss ? "  ·  BOSS" : ""}`;
    $("splash-title").textContent = info.name;
    $("splash-tip").textContent = info.tip;
    this.show("splash");
    this.splashUntil = performance.now() + 1600;
    this.pending = index;
    Audio.sfx("button");
  }

  private async startPlay() {
    this.session?.destroy();
    this.session = new PlaySession(this.renderer, this.input, this.hud(), this.pending);
    $("loading").hidden = false;
    await this.session.start();
    $("loading").hidden = true;
    this.show("play");
    $("level-name").textContent = `${levelLabel(LEVELS[this.pending])}  ${LEVELS[this.pending].name}`;
  }

  private hud(): PlayHud {
    return {
      hearts: (n, shield) => {
        $("hearts").textContent = "❤".repeat(Math.max(0, n)) + "♡".repeat(Math.max(0, 5 - n));
        $("shield").hidden = shield <= 0;
        $("shield").textContent = shield > 0 ? `SHIELD ${Math.ceil(shield)}s` : "";
      },
      weapon: (name) => {
        $("weapon").textContent = name;
      },
      goal: (text) => {
        $("goal").textContent = text;
      },
      tip: (text) => {
        $("tip").textContent = text;
      },
      banner: (text) => {
        $("banner").hidden = !text;
        $("banner").textContent = text ?? "";
      },
    };
  }

  private overlayAction() {
    $("end-card").hidden = true;
    if (this.session?.result === "won") {
      const next = this.pending + 1;
      unlockLevel(next);
      this.session.destroy();
      this.session = null;
      if (next <= LAST_LEVEL) {
        this.pending = next;
        this.openSplash(next);
      } else this.showSelect();
    } else if (this.session?.result === "dead") {
      this.session.destroy();
      this.session = null;
      this.openSplash(this.pending);
    }
  }

  private resume() {
    this.show("play");
  }

  private loop = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.input.poll();
    if (this.screen === "splash" && now >= this.splashUntil && !this.starting) {
      this.starting = true;
      void this.startPlay().finally(() => {
        this.starting = false;
      });
    }
    if (this.screen === "play" && this.input.pausePressed) {
      this.show("pause");
      this.input.consume();
    } else if (this.screen === "pause" && this.input.pausePressed) {
      this.resume();
      this.input.consume();
    }
    if (this.screen === "play" && this.session) {
      this.session.update(dt);
      if (this.session.result === "won" || this.session.result === "dead") {
        const won = this.session.result === "won";
        $("end-card").hidden = false;
        $("end-title").textContent = won ? "Stage clear" : "Try again";
        $("end-body").textContent = won
          ? `${LEVELS[this.pending].name} is done. The next path is open.`
          : "Angely still has a way through. Jump in again.";
        $("overlay-ok").textContent = won ? (this.pending < LAST_LEVEL ? "Next" : "Chapters") : "Retry";
      }
    }
    if (this.screen === "title" || this.screen === "select" || this.screen === "splash") {
      this.renderer.setClear(0x120d1f, 0.03);
      this.renderer.followTarget(0, 1.2, true);
      this.renderer.render();
    }
    this.input.consume();
    requestAnimationFrame(this.loop);
  };
}

void loadSave();
new App();
