import Phaser from "phaser";
import type { MusicTrack } from "../config";
import { loadSave, updateSave } from "../save";
import { AUDIO_FILES, type SfxName } from "./manifest";

interface SongDef {
  bpm: number;
  root: number;
  scale: number[];
  chords: number[];
  lead: (number | null)[];
  bass: OscillatorType;
  leadWave: OscillatorType;
  loop: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

const SONGS: Record<MusicTrack, SongDef> = {
  music_title: {
    bpm: 92, root: 60, scale: MAJOR, chords: [0, 5, 3, 4], bass: "triangle", leadWave: "sine", loop: true,
    lead: [4, null, 2, 4, 5, null, 4, 2, 0, null, 2, null, 4, null, null, null],
  },
  music_forest: {
    bpm: 120, root: 62, scale: MAJOR, chords: [0, 4, 5, 3], bass: "triangle", leadWave: "square", loop: true,
    lead: [0, 2, 4, 7, 4, 2, 4, null, 5, 4, 2, 4, 0, null, 2, null],
  },
  music_ruins: {
    bpm: 96, root: 57, scale: DORIAN, chords: [0, 3, 6, 4], bass: "sine", leadWave: "triangle", loop: true,
    lead: [0, null, 4, null, 3, 2, null, 0, 6, null, 4, null, 2, null, null, null],
  },
  music_volcano: {
    bpm: 138, root: 52, scale: MINOR, chords: [0, 5, 6, 4], bass: "sawtooth", leadWave: "square", loop: true,
    lead: [0, 0, 7, 0, 6, 0, 4, 3, 0, 0, 7, 0, 8, 7, 6, 4],
  },
  music_frozen: {
    bpm: 108, root: 64, scale: MINOR, chords: [0, 5, 2, 6], bass: "triangle", leadWave: "sine", loop: true,
    lead: [7, null, 4, 9, null, 7, 4, null, 2, 4, null, 7, 9, null, 11, null],
  },
  music_shadow: {
    bpm: 100, root: 55, scale: MINOR, chords: [0, 5, 3, 6], bass: "sawtooth", leadWave: "triangle", loop: true,
    lead: [0, null, 3, null, 2, 0, null, 4, 3, null, 2, null, 0, null, -1, null],
  },
  music_boss: {
    bpm: 152, root: 50, scale: MINOR, chords: [0, 0, 5, 6], bass: "sawtooth", leadWave: "square", loop: true,
    lead: [0, 7, 0, 6, 0, 5, 4, 3, 0, 7, 0, 8, 7, 6, 5, 4],
  },
  music_sky: {
    bpm: 126, root: 65, scale: MAJOR, chords: [0, 3, 4, 5], bass: "triangle", leadWave: "triangle", loop: true,
    lead: [4, 7, 9, 7, 4, null, 2, 4, 7, null, 9, 11, 9, 7, 4, null],
  },
  music_sea: {
    bpm: 84, root: 57, scale: DORIAN, chords: [0, 5, 3, 4], bass: "sine", leadWave: "sine", loop: true,
    lead: [0, null, 2, 4, null, 2, 0, null, 4, null, 5, 4, 2, null, null, null],
  },
  music_clock: {
    bpm: 116, root: 62, scale: DORIAN, chords: [0, 4, 5, 3], bass: "square", leadWave: "triangle", loop: true,
    lead: [0, 4, 7, 4, 0, null, 2, 4, 7, 9, 7, 4, 2, 0, null, null],
  },
  music_squish: {
    bpm: 132, root: 67, scale: MAJOR, chords: [0, 4, 5, 3], bass: "triangle", leadWave: "square", loop: true,
    lead: [0, 4, 7, 4, 5, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0, null],
  },
  music_game_over: {
    bpm: 80, root: 57, scale: MINOR, chords: [0], bass: "triangle", leadWave: "sine", loop: false,
    lead: [4, null, 3, null, 2, null, 1, null, 0, null, null, null, null, null, null, null],
  },
  music_victory: {
    bpm: 140, root: 60, scale: MAJOR, chords: [0, 4], bass: "triangle", leadWave: "square", loop: false,
    lead: [0, 2, 4, 7, null, 4, 7, null, 9, 9, 9, 11, 14, null, null, null],
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioManagerImpl {
  private game?: Phaser.Game;
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noiseBuf?: AudioBuffer;
  private current?: MusicTrack;
  private fileMusic?: Phaser.Sound.BaseSound;
  private timer?: number;
  private step = 0;
  private nextTime = 0;
  private ducked = false;
  private lastPlayed = new Map<string, number>();

  init(game: Phaser.Game) {
    this.game = game;
    const unlock = () => {
      this.ensureCtx();
      this.ctx?.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  get musicOn() {
    return loadSave().music;
  }
  get sfxOn() {
    return loadSave().sfx;
  }

  setMusic(on: boolean) {
    updateSave({ music: on });
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(on ? this.musicLevel() : 0, this.ctx.currentTime, 0.1);
    if (this.fileMusic) (this.fileMusic as Phaser.Sound.WebAudioSound).setMute?.(!on);
  }

  setSfx(on: boolean) {
    updateSave({ sfx: on });
  }

  duck(on: boolean) {
    this.ducked = on;
    if (this.musicBus && this.ctx && this.musicOn) {
      this.musicBus.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.25);
    }
    if (this.fileMusic) (this.fileMusic as Phaser.Sound.WebAudioSound).setVolume?.(on ? 0.35 : 1);
  }

  private musicLevel() {
    return (this.ducked ? 0.35 : 1) * 0.5;
  }

  private ensureCtx() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? this.musicLevel() : 0;
    this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.current) {
      const t = this.current;
      this.current = undefined;
      this.music(t);
    }
  }

  // ---------------------------------------------------------------- SFX

  sfx(name: SfxName) {
    if (!this.sfxOn) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < 45) return;
    this.lastPlayed.set(name, now);
    if (AUDIO_FILES[name] && this.game?.cache.audio.exists(name)) {
      this.game.sound.play(name);
      return;
    }
    this.ensureCtx();
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "jump": this.tone(t, 330, 0.16, "square", 0.18, 660); break;
      case "stomp": this.tone(t, 220, 0.12, "square", 0.25, 520); this.noise(t, 0.08, 0.2, 1800, "lowpass"); break;
      case "sword_swing": this.noise(t, 0.16, 0.35, 900, "bandpass", 5200); break;
      case "sword_hit": this.noise(t, 0.1, 0.4, 3000, "highpass"); this.tone(t, 180, 0.12, "sawtooth", 0.2, 90); break;
      case "sword_clink": this.tone(t, 1400, 0.18, "triangle", 0.25, 1300); this.tone(t, 2100, 0.12, "sine", 0.15); break;
      case "enemy_hit": this.tone(t, 300, 0.1, "square", 0.2, 150); break;
      case "enemy_defeat": this.tone(t, 520, 0.08, "square", 0.18, 780); this.tone(t + 0.08, 780, 0.14, "square", 0.16, 1040); this.noise(t, 0.2, 0.15, 1200, "lowpass"); break;
      case "enemy_telegraph": this.tone(t, 880, 0.07, "sine", 0.12); break;
      case "puff_attack": this.noise(t, 0.25, 0.25, 600, "lowpass", 200); break;
      case "bat_dive": this.tone(t, 900, 0.3, "sawtooth", 0.08, 300); break;
      case "ghost_orb": this.tone(t, 400, 0.35, "sine", 0.2, 800); this.tone(t, 404, 0.35, "sine", 0.15, 808); break;
      case "lantern_bolt": this.tone(t, 1200, 0.2, "square", 0.1, 600); break;
      case "skeleton_swing": this.noise(t, 0.14, 0.3, 700, "bandpass", 2600); break;
      case "fire_spit": this.noise(t, 0.3, 0.35, 400, "lowpass", 1800); break;
      case "fire_impact": this.noise(t, 0.3, 0.4, 900, "lowpass", 200); break;
      case "lava_burst": this.noise(t, 0.5, 0.35, 300, "lowpass", 900); this.tone(t, 70, 0.4, "sawtooth", 0.15, 50); break;
      case "ground_slam": this.tone(t, 90, 0.35, "sine", 0.5, 40); this.noise(t, 0.3, 0.3, 400, "lowpass"); break;
      case "player_hurt": this.tone(t, 520, 0.22, "sawtooth", 0.22, 180); break;
      case "heart_pickup": [0, 4, 7, 12].forEach((n, i) => this.tone(t + i * 0.06, midi(76 + n), 0.14, "triangle", 0.2)); break;
      case "sword_pickup": [0, 4, 7, 12, 16].forEach((n, i) => this.tone(t + i * 0.09, midi(67 + n), 0.3, "square", 0.14)); break;
      case "checkpoint": this.tone(t, midi(72), 0.12, "triangle", 0.2); this.tone(t + 0.12, midi(79), 0.25, "triangle", 0.2); break;
      case "portal_unlock": [0, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(t + i * 0.07, midi(64 + n), 0.5, "sine", 0.16)); break;
      case "portal_enter": this.tone(t, 200, 0.8, "sine", 0.25, 1600); this.noise(t, 0.8, 0.12, 2000, "bandpass", 6000); break;
      case "fall": this.tone(t, 700, 0.6, "triangle", 0.22, 90); break;
      case "chapter_transition": this.noise(t, 0.6, 0.15, 400, "bandpass", 4000); break;
      case "button": this.tone(t, 660, 0.05, "square", 0.12); break;
      case "low_health": this.tone(t, 880, 0.09, "square", 0.12); this.tone(t + 0.14, 880, 0.09, "square", 0.12); break;
      case "bow_shoot": this.tone(t, 1200, 0.12, "triangle", 0.18, 500); this.noise(t, 0.1, 0.2, 4000, "highpass"); break;
      case "arrow_hit": this.tone(t, 900, 0.08, "square", 0.14, 1400); break;
      case "hammer_swing": this.noise(t, 0.3, 0.3, 500, "bandpass", 1600); break;
      case "hammer_smash": this.tone(t, 120, 0.4, "sine", 0.55, 45); this.noise(t, 0.35, 0.45, 700, "lowpass", 120); break;
      case "wall_break": this.noise(t, 0.6, 0.5, 900, "lowpass", 150); [0, 0.08, 0.17].forEach((d) => this.tone(t + d, 160 - d * 300, 0.18, "square", 0.12, 60)); break;
      case "crate_push": this.noise(t, 0.12, 0.12, 260, "lowpass"); break;
      case "spring": this.tone(t, 220, 0.3, "sine", 0.3, 880); this.tone(t, 330, 0.25, "triangle", 0.12, 1320); break;
      case "crumble": this.noise(t, 0.4, 0.3, 500, "lowpass", 200); break;
      case "target_hit": [0, 7, 12, 19].forEach((n, i) => this.tone(t + i * 0.06, midi(72 + n), 0.25, "triangle", 0.16)); break;
      case "bridge_rise": this.tone(t, 110, 0.6, "triangle", 0.2, 330); break;
      case "weapon_swap": this.tone(t, 520, 0.06, "square", 0.12, 780); this.tone(t + 0.06, 1040, 0.08, "triangle", 0.12); break;
      case "weapon_pickup": [0, 4, 7, 12, 16, 19].forEach((n, i) => this.tone(t + i * 0.08, midi(69 + n), 0.3, "triangle", 0.16)); break;
      case "boss_roar": this.tone(t, 110, 1.4, "sawtooth", 0.3, 55); this.tone(t, 116, 1.4, "sawtooth", 0.22, 58); this.noise(t, 1.2, 0.25, 500, "lowpass", 140); break;
      case "boss_cast": this.tone(t, 300, 0.5, "sine", 0.22, 900); this.tone(t, 450, 0.5, "triangle", 0.1, 1350); break;
      case "boss_hit": this.tone(t, 260, 0.14, "square", 0.24, 130); this.noise(t, 0.12, 0.3, 2400, "highpass"); break;
      case "boss_swoop": this.noise(t, 0.6, 0.4, 300, "bandpass", 2600); break;
      case "boss_defeat": [0, -3, -7, -12].forEach((n, i) => this.tone(t + i * 0.22, midi(55 + n), 0.5, "sawtooth", 0.18)); this.noise(t, 1.4, 0.3, 1200, "lowpass", 100); break;
      case "voice_umbra": this.tone(t, 150 + Math.random() * 40, 0.08, "sawtooth", 0.05, 120); break;
      case "voice_angely": this.tone(t, 620 + Math.random() * 120, 0.06, "triangle", 0.06, 700); break;
      case "gem": [0, 7, 12].forEach((n, i) => this.tone(t + i * 0.05, midi(84 + n), 0.18, "triangle", 0.18)); break;
      case "swim": this.noise(t, 0.18, 0.12, 900, "bandpass", 2400); this.tone(t, 500, 0.08, "sine", 0.06, 900); break;
      case "boomerang": this.noise(t, 0.4, 0.2, 1200, "bandpass", 3000); this.tone(t, 700, 0.3, "triangle", 0.08, 1100); break;
      case "cog": this.tone(t, 180, 0.12, "square", 0.16, 90); this.noise(t, 0.16, 0.22, 1400, "bandpass", 2200); break;
      case "ray": this.tone(t, 880, 0.08, "square", 0.12, 1400); this.tone(t, 1320, 0.1, "sine", 0.08, 600); break;
      case "wand_charge": this.tone(t, 900, 0.2, "sine", 0.1, 1800); break;
      case "wand_cast": [0, 4, 7].forEach((n, i) => this.tone(t + i * 0.04, midi(88 + n), 0.2, "sine", 0.12)); break;
      case "voice_angelo": this.tone(t, 260 + Math.random() * 60, 0.07, "square", 0.04, 220); break;
      case "player_defeat": [0, -2, -4, -7].forEach((n, i) => this.tone(t + i * 0.16, midi(67 + n), 0.22, "triangle", 0.2)); break;
    }
  }

  private tone(t: number, f: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, bus?: GainNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType, slideTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // -------------------------------------------------------------- Music

  music(track: MusicTrack) {
    if (this.current === track) return;
    this.stopMusic();
    this.current = track;
    if (AUDIO_FILES[track] && this.game?.cache.audio.exists(track)) {
      this.fileMusic = this.game.sound.add(track, { loop: SONGS[track].loop, volume: this.ducked ? 0.35 : 1 });
      (this.fileMusic as Phaser.Sound.WebAudioSound).setMute?.(!this.musicOn);
      this.fileMusic.play();
      return;
    }
    if (!this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicBus!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus!.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.musicBus!.gain.linearRampToValueAtTime(this.musicOn ? this.musicLevel() : 0, this.ctx.currentTime + 0.8);
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    this.fileMusic?.stop();
    this.fileMusic?.destroy();
    this.fileMusic = undefined;
    this.current = undefined;
  }

  private schedule() {
    if (!this.ctx || !this.current) return;
    const song = SONGS[this.current];
    const eighth = 60 / song.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const total = song.lead.length * song.chords.length;
      if (!song.loop && this.step >= song.lead.length) {
        window.clearInterval(this.timer);
        this.timer = undefined;
        return;
      }
      const i = this.step % total;
      const chord = song.chords[Math.floor(i / song.lead.length) % song.chords.length];
      const deg = song.lead[i % song.lead.length];
      const note = (d: number) => {
        const oct = Math.floor(d / song.scale.length);
        return song.root + oct * 12 + song.scale[((d % song.scale.length) + song.scale.length) % song.scale.length];
      };
      if (deg !== null) this.tone(this.nextTime, midi(note(deg + chord) + 12), eighth * 1.6, song.leadWave, 0.07, undefined, this.musicBus);
      if (i % 4 === 0) this.tone(this.nextTime, midi(note(chord) - 12), eighth * 3.5, song.bass, 0.16, undefined, this.musicBus);
      if (i % 2 === 1) this.tone(this.nextTime, midi(note(chord + 2)), eighth * 0.9, "sine", 0.04, undefined, this.musicBus);
      this.nextTime += eighth;
      this.step++;
    }
  }
}

export const Audio = new AudioManagerImpl();
