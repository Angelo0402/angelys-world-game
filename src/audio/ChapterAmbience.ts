import Phaser from 'phaser';

/**
 * Per-chapter ambient sound (v89, Angelo 2026-11-14).
 *
 * Mix: music 5 (0.05), voice 50 (0.50), ambient 75 (0.75). The ambient
 * carries the scene; the music stays barely there underneath.
 *
 * All procedural (WebAudio oscillators + filtered noise, NO audio files),
 * following the GraveyardMusic pattern: Phaser's WebAudio context (so the
 * v87 setBackground suspend covers it), output gain 0.75, start on first
 * pointerdown (audio unlock), stop on scene transitions, destroy on
 * scene shutdown. Follows the MUSIC toggle via Audio.setAmbienceOutput
 * (setOutput), not SFX. Chapter 11 keeps its own GraveyardMusic.
 */

const AMBIENT_LEVEL = 0.75;

const random = (min: number, max: number) => min + Math.random() * (max - min);

interface WindLayer {
  type: BiquadFilterType;
  freq: number;
  gain: number;
  /** Slow gain swell (Hz) + depth, for breathing wind/waves. */
  lfoHz?: number;
  lfoDepth?: number;
}

interface DroneLayer {
  freqs: number[];
  gain: number;
}

interface EventDef {
  /** Random delay range (seconds) between calls. min === max = steady. */
  min: number;
  max: number;
  play: (at: number) => void;
}

interface Recipe {
  wind?: WindLayer;
  drone?: DroneLayer;
  events: EventDef[];
}

export class ChapterAmbience {
  private scene: Phaser.Scene;
  private ctx: AudioContext;
  private chapter: number;

  private output!: GainNode;
  private noiseBuf?: AudioBuffer;

  private started = false;
  private paused = false;
  private stopped = false;
  private destroyed = false;

  /** MUSIC toggle state — setOutput() stores it; start()/onResume() read it. */
  private outputOn = true;

  private graphNodes: AudioNode[] = [];
  private activeSources = new Set<AudioScheduledSourceNode>();
  private timers: number[] = [];

  constructor(scene: Phaser.Scene, chapter: number) {
    this.scene = scene;
    this.chapter = chapter;

    const manager = scene.sound as unknown as {
      context?: AudioContext;
      destination?: AudioNode;
    };
    if (!manager.context || !manager.destination) {
      throw new Error('ChapterAmbience requires Phaser WebAudio.');
    }
    this.ctx = manager.context;

    this.output = this.keepNode(this.ctx.createGain());
    this.output.gain.value = 0.0001;
    this.output.connect(manager.destination);

    scene.events.on('pause', this.onPause);
    scene.events.on('resume', this.onResume);
    scene.events.once('shutdown', this.destroy);
    scene.events.once('destroy', this.destroy);

    scene.input.once('pointerdown', this.startOnPointerDown);
    // Mid-session level entries: the context is already running (audio
    // unlocked long ago), so start at once instead of waiting for a tap.
    if (this.ctx.state === 'running') void this.start();
  }

  private startOnPointerDown = (): void => {
    void this.start();
  };

  private keepNode<T extends AudioNode>(node: T): T {
    this.graphNodes.push(node);
    return node;
  }

  private keepSource<T extends AudioScheduledSourceNode>(source: T): T {
    this.activeSources.add(source);
    source.addEventListener(
      'ended',
      () => {
        this.activeSources.delete(source);
        try {
          source.disconnect();
        } catch {}
      },
      { once: true },
    );
    return source;
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }

  private getNoise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private loopNoise(w: WindLayer): void {
    const c = this.ctx;
    const now = c.currentTime;
    const src = this.keepSource(c.createBufferSource());
    src.buffer = this.getNoise();
    src.loop = true;
    const filter = this.keepNode(c.createBiquadFilter());
    filter.type = w.type;
    filter.frequency.value = w.freq;
    const gain = this.keepNode(c.createGain());
    gain.gain.value = w.gain;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    if (w.lfoHz && w.lfoDepth) {
      const lfo = this.keepSource(c.createOscillator());
      const lfoGain = this.keepNode(c.createGain());
      lfo.frequency.value = w.lfoHz;
      lfoGain.gain.value = w.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
    }
    src.start(now);
  }

  private drone(d: DroneLayer): void {
    const c = this.ctx;
    const now = c.currentTime;
    const filter = this.keepNode(c.createBiquadFilter());
    filter.type = 'lowpass';
    // Let the highest drone partial through (ch10 crystal shimmer sits
    // at 2–3.2 kHz — a fixed 260 Hz filter would silence it entirely).
    filter.frequency.value = Math.max(260, Math.max(...d.freqs) * 2);
    const gain = this.keepNode(c.createGain());
    gain.gain.value = d.gain;
    filter.connect(gain);
    gain.connect(this.output);
    for (const f of d.freqs) {
      const osc = this.keepSource(c.createOscillator());
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start(now);
    }
  }

  /** One-shot oscillator blip with envelope + pan. */
  private tone(at: number, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, panValue = 0): void {
    const c = this.ctx;
    const osc = this.keepSource(c.createOscillator());
    const env = this.keepNode(c.createGain());
    const pan = this.keepNode(c.createStereoPanner());
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    pan.pan.value = panValue;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(vol, at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env);
    env.connect(pan);
    pan.connect(this.output);
    osc.start(at);
    osc.stop(at + dur + 0.03);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      pan.disconnect();
    };
  }

  /** One-shot filtered noise burst. */
  private noiseBurst(at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1): void {
    const c = this.ctx;
    const src = this.keepSource(c.createBufferSource());
    src.buffer = this.getNoise();
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const filter = this.keepNode(c.createBiquadFilter());
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = this.keepNode(c.createGain());
    env.gain.setValueAtTime(vol, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.output);
    src.start(at, Math.random());
    src.stop(at + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  }

  async start(): Promise<void> {
    if (this.started || this.stopped || this.destroyed) return;
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
    } catch {
      return;
    }
    if (this.destroyed || this.stopped || this.ctx.state !== 'running') return;
    this.started = true;
    this.paused = false;
    const recipe = this.recipe(this.chapter);
    if (recipe.wind) this.loopNoise(recipe.wind);
    if (recipe.drone) this.drone(recipe.drone);
    for (const ev of recipe.events) this.kickEvent(ev);
    this.output.gain.setTargetAtTime(this.outputOn ? AMBIENT_LEVEL : 0.0001, this.ctx.currentTime, 1.0);
  }

  private kickEvent(ev: EventDef): void {
    this.later(random(ev.min, ev.max) * 1000, () => {
      if (this.stopped || this.destroyed || !this.started) return;
      if (!this.paused && this.ctx.state === 'running') ev.play(this.ctx.currentTime + 0.05);
      this.kickEvent(ev);
    });
  }

  /**
   * MUSIC toggle: ramp the whole output to 0.75 or silence. Stores the
   * flag first, so a toggle before start() still holds.
   */
  setOutput(on: boolean): void {
    this.outputOn = on;
    if (this.destroyed || this.stopped || !this.started || this.paused) return;
    try {
      this.output.gain.setTargetAtTime(on ? AMBIENT_LEVEL : 0.0001, this.ctx.currentTime, 0.2);
    } catch {}
  }

  /** Stop the ambience (music switches while the scene stays alive).
   *  Terminal for this instance — a scene restart creates a new one. */
  stop(): void {
    if (this.destroyed || this.stopped || !this.started) {
      this.stopped = true;
      return;
    }
    this.stopped = true;
    this.scene.input.off('pointerdown', this.startOnPointerDown);
    const now = this.ctx.currentTime;
    try {
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setTargetAtTime(0.0001, now, 0.15);
    } catch {}
    this.clearTimers();
    const sources = [...this.activeSources];
    window.setTimeout(() => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {}
      }
    }, 900);
  }

  private onPause = (): void => {
    if (!this.started || this.destroyed || this.stopped) return;
    this.paused = true;
    try {
      this.output.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.07);
    } catch {}
  };

  private onResume = (): void => {
    if (!this.started || !this.paused || this.destroyed || this.stopped) return;
    this.paused = false;
    try {
      this.output.gain.setTargetAtTime(this.outputOn ? AMBIENT_LEVEL : 0.0001, this.ctx.currentTime, 1.0);
    } catch {}
  };

  private destroy = (): void => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopped = true;
    this.scene.events.off('pause', this.onPause);
    this.scene.events.off('resume', this.onResume);
    this.scene.input.off('pointerdown', this.startOnPointerDown);
    this.clearTimers();
    const now = this.ctx.currentTime;
    try {
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(0, now);
    } catch {}
    for (const source of this.activeSources) {
      try {
        source.stop(now);
      } catch {}
    }
    for (const node of this.graphNodes) {
      try {
        node.disconnect();
      } catch {}
    }
    this.activeSources.clear();
    this.graphNodes.length = 0;
  };

  // ------------------------------------------------------------ Recipes

  private recipe(chapter: number): Recipe {
    const bird = (at: number, base = 2800, vol = 0.05): void => {
      const n = Math.random() > 0.5 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        this.tone(at + i * 0.09, base + random(-300, 500), 0.07, 'sine', vol, base + random(400, 900), random(-0.6, 0.6));
      }
    };
    switch (chapter) {
      case 1: // Forest — birds + wind + leaves.
        return {
          wind: { type: 'lowpass', freq: 400, gain: 0.05, lfoHz: 0.07, lfoDepth: 0.015 },
          events: [
            { min: 2, max: 6, play: (at) => bird(at) },
            { min: 3, max: 7, play: (at) => this.noiseBurst(at, 0.35, 0.03, 'bandpass', 1200, 0.8) },
          ],
        };
      case 2: // Ruins — soft wind + water drips + faint drone.
        return {
          wind: { type: 'lowpass', freq: 300, gain: 0.04 },
          drone: { freqs: [55], gain: 0.02 },
          events: [{ min: 1.5, max: 4, play: (at) => this.tone(at, 900, 0.14, 'sine', 0.045, 300, random(-0.7, 0.7)) }],
        };
      case 3: // Volcano — fire crackle / wood burning + low rumble.
        return {
          drone: { freqs: [45], gain: 0.05 },
          wind: { type: 'lowpass', freq: 120, gain: 0.07 },
          events: [
            { min: 0.08, max: 0.4, play: (at) => this.noiseBurst(at, 0.06, 0.05, 'bandpass', 1500, 1.5) },
            { min: 2, max: 5, play: (at) => this.tone(at, 70, 0.4, 'sine', 0.05, 40, random(-0.5, 0.5)) },
          ],
        };
      case 4: // Frozen — cold wind + ice tinkles.
        return {
          wind: { type: 'bandpass', freq: 900, gain: 0.045, lfoHz: 0.05, lfoDepth: 0.02 },
          events: [{ min: 3, max: 7, play: (at) => this.tone(at, random(1800, 2600), 0.3, 'sine', 0.03, undefined, random(-0.7, 0.7)) }],
        };
      case 5: // Shadow castle — low drone + faint shimmer.
        return {
          drone: { freqs: [55, 55.7], gain: 0.05 },
          events: [{ min: 5, max: 9, play: (at) => this.tone(at, 1200, 0.5, 'sine', 0.02, undefined, random(-0.6, 0.6)) }],
        };
      case 6: // Sky tower — high wind + sparse distant birds.
        return {
          wind: { type: 'bandpass', freq: 700, gain: 0.05, lfoHz: 0.06, lfoDepth: 0.018 },
          events: [{ min: 4, max: 8, play: (at) => bird(at, 3200, 0.03) }],
        };
      case 7: // Sea temple — waves + bubbles.
        return {
          wind: { type: 'lowpass', freq: 500, gain: 0.08, lfoHz: 0.08, lfoDepth: 0.05 },
          events: [{ min: 1, max: 3, play: (at) => this.tone(at, 400, 0.18, 'sine', 0.04, 900, random(-0.6, 0.6)) }],
        };
      case 8: // Clockwork — gear ticks + soft chime.
        return {
          events: [
            { min: 0.5, max: 0.5, play: (at) => this.tone(at, 1200, 0.04, 'square', 0.035, undefined, random(-0.4, 0.4)) },
            {
              min: 8,
              max: 8,
              play: (at) => {
                this.tone(at, 1320, 1.2, 'sine', 0.035);
                this.tone(at, 1980, 1.0, 'sine', 0.02);
              },
            },
          ],
        };
      case 9: // Squish — bubbly pops.
        return {
          events: [
            { min: 0.4, max: 1.2, play: (at) => this.tone(at, 300, 0.12, 'sine', 0.05, 600, random(-0.6, 0.6)) },
            { min: 1, max: 2, play: (at) => this.tone(at, 500, 0.08, 'sine', 0.03, 750, random(-0.5, 0.5)) },
          ],
        };
      case 10: // Veil — crystal shimmer + sparse bell pings.
        return {
          drone: { freqs: [2000, 2600, 3200], gain: 0.012 },
          events: [{ min: 4, max: 8, play: (at) => this.tone(at, 1560, 1.5, 'sine', 0.045, undefined, random(-0.6, 0.6)) }],
        };
      default: // Unknown chapter — quiet wind only, never silent.
        return {
          wind: { type: 'lowpass', freq: 400, gain: 0.04 },
          events: [],
        };
    }
  }
}
