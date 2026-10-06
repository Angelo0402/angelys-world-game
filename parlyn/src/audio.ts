import type { MusicTrack } from "../../src/config";
import { loadSave } from "../../src/save";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const SONGS: Record<MusicTrack, { bpm: number; root: number; lead: (number | null)[]; wave: OscillatorType }> = {
  music_title: { bpm: 92, root: 60, wave: "sine", lead: [4, null, 2, 4, 5, null, 4, 2, 0, null, 2, null, 4, null, null, null] },
  music_forest: { bpm: 120, root: 62, wave: "triangle", lead: [0, 2, 4, 7, 4, 2, 4, null, 5, 4, 2, 4, 0, null, 2, null] },
  music_ruins: { bpm: 96, root: 57, wave: "triangle", lead: [0, null, 4, null, 3, 2, null, 0, 6, null, 4, null, 2, null, null, null] },
  music_volcano: { bpm: 138, root: 52, wave: "square", lead: [0, 0, 7, 0, 6, 0, 4, 3, 0, 0, 7, 0, 8, 7, 6, 4] },
  music_frozen: { bpm: 108, root: 64, wave: "sine", lead: [7, null, 4, 9, null, 7, 4, null, 2, 4, null, 7, 9, null, 11, null] },
  music_shadow: { bpm: 100, root: 55, wave: "triangle", lead: [0, null, 3, null, 2, 0, null, 4, 3, null, 2, null, 0, null, -1, null] },
  music_boss: { bpm: 152, root: 50, wave: "square", lead: [0, 7, 0, 6, 0, 5, 4, 3, 0, 7, 0, 8, 7, 6, 5, 4] },
  music_sky: { bpm: 126, root: 65, wave: "triangle", lead: [4, 7, 9, 7, 4, null, 2, 4, 7, null, 9, 11, 9, 7, 4, null] },
  music_sea: { bpm: 84, root: 57, wave: "sine", lead: [0, null, 2, 4, null, 2, 0, null, 4, null, 5, 4, 2, null, null, null] },
  music_clock: { bpm: 116, root: 62, wave: "triangle", lead: [0, 4, 7, 4, 0, null, 2, 4, 7, 9, 7, 4, 2, 0, null, null] },
  music_squish: { bpm: 132, root: 67, wave: "square", lead: [0, 4, 7, 4, 5, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0, null] },
  music_game_over: { bpm: 80, root: 57, wave: "sine", lead: [4, null, 3, null, 2, null, 1, null, 0, null, null, null, null, null, null, null] },
  music_victory: { bpm: 140, root: 60, wave: "square", lead: [0, 2, 4, 7, null, 4, 7, null, 9, 9, 9, 11, 14, null, null, null] },
};

class Synth {
  private ctx?: AudioContext;
  private master?: GainNode;
  private timer?: number;
  private step = 0;
  private track: MusicTrack | null = null;

  private ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
  }

  resume() {
    this.ensure();
    void this.ctx?.resume();
  }

  music(track: MusicTrack) {
    if (!loadSave().music) return;
    this.ensure();
    if (this.track === track) return;
    this.track = track;
    this.step = 0;
    if (this.timer) window.clearInterval(this.timer);
    const song = SONGS[track];
    const beat = 60000 / song.bpm / 2;
    this.timer = window.setInterval(() => {
      if (!loadSave().music || !this.ctx || !this.master) return;
      const note = song.lead[this.step % song.lead.length];
      this.step++;
      if (note == null) return;
      this.tone(midi(song.root + note), 0.18, song.wave, 0.07);
    }, beat);
  }

  sfx(kind: string) {
    if (!loadSave().sfx) return;
    this.ensure();
    if (!this.ctx) return;
    const map: Record<string, [number, number, OscillatorType]> = {
      jump: [520, 0.12, "square"],
      stomp: [180, 0.1, "sawtooth"],
      sword_swing: [340, 0.08, "square"],
      sword_hit: [220, 0.1, "sawtooth"],
      enemy_hit: [160, 0.09, "square"],
      enemy_defeat: [140, 0.2, "triangle"],
      player_hurt: [110, 0.18, "sawtooth"],
      heart_pickup: [660, 0.12, "sine"],
      checkpoint: [480, 0.16, "triangle"],
      portal_unlock: [400, 0.22, "sine"],
      portal_enter: [300, 0.3, "triangle"],
      bow_shoot: [700, 0.08, "square"],
      hammer_smash: [90, 0.16, "sawtooth"],
      spring: [640, 0.14, "triangle"],
      button: [500, 0.06, "square"],
      player_defeat: [90, 0.4, "sine"],
      fall: [80, 0.2, "triangle"],
      gem: [880, 0.1, "sine"],
    };
    const hit = map[kind] ?? [320, 0.08, "sine"];
    this.tone(hit[0], hit[1], hit[2], 0.09);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    this.track = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.02);
  }
}

export const Audio = new Synth();
