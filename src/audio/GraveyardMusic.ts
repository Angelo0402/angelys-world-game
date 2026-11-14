import Phaser from 'phaser';

const BPM = 68;
const BEAT = 60 / BPM;
const LOOP_BEATS = 32;
const LOOP_SECONDS = LOOP_BEATS * BEAT;

const midiHz = (m: number) =>
  440 * Math.pow(2, (m - 69) / 12);

const random = (min: number, max: number) =>
  min + Math.random() * (max - min);

const clamp = (v: number) =>
  Math.max(0, Math.min(1, v));

type MusicEvent =
  | {
      kind: 'pad';
      at: number;
      notes: number[];
      duration: number;
    }
  | {
      kind: 'bell';
      at: number;
      midi: number;
      beats: number;
      velocity: number;
    };

const CHORDS = [
  { bar: 0, notes: [50, 53, 57, 60, 64] }, // Dm9
  { bar: 2, notes: [46, 53, 57, 62, 65] }, // Bbmaj7
  { bar: 4, notes: [43, 50, 53, 57, 58] }, // Gm9
  { bar: 6, notes: [45, 52, 55, 58, 61] }  // A7b9
];

const MELODY = [
  [0, 1, 69, .75, .42],
  [0, 2.5, 77, .5, .32],
  [0, 3.25, 76, .5, .28],

  [1, 0, 74, 1.5, .42],
  [1, 2, 73, .75, .30],
  [1, 3, 69, .75, .34],

  [2, .5, 65, .75, .32],
  [2, 1.5, 69, .75, .36],
  [2, 2.5, 74, 1.25, .42],

  [3, 0, 73, .75, .32],
  [3, 1, 69, .75, .34],
  [3, 2, 65, 1.5, .30],

  [4, 0, 67, .75, .30],
  [4, 1, 70, .75, .35],
  [4, 2, 74, .75, .42],
  [4, 3, 69, .75, .32],

  [5, 0, 67, 1.5, .36],
  [5, 2, 65, .75, .30],
  [5, 3, 62, .75, .28],

  [6, 0, 64, .75, .30],
  [6, 1, 67, .75, .34],
  [6, 2, 70, .75, .36],
  [6, 3, 73, .75, .42],

  [7, 0, 69, 1.5, .38],
  [7, 2, 64, .75, .30],
  [7, 3, 62, .75, .34]
] as const;

function buildSequence(): MusicEvent[] {
  const events: MusicEvent[] = [];

  for (const chord of CHORDS) {
    events.push({
      kind: 'pad',
      at: chord.bar * 4 * BEAT,
      notes: chord.notes,
      duration: 8 * BEAT
    });
  }

  for (const [bar, beat, midi, duration, velocity] of MELODY) {
    events.push({
      kind: 'bell',
      at: (bar * 4 + beat) * BEAT,
      midi,
      beats: duration,
      velocity
    });
  }

  return events.sort((a, b) => a.at - b.at);
}

export class GraveyardMusic {
  private scene: Phaser.Scene;
  private ctx: AudioContext;

  private output!: GainNode;
  private compressor!: DynamicsCompressorNode;

  private musicBus!: GainNode;
  private ambienceBus!: GainNode;

  private padBus!: GainNode;
  private bellBus!: GainNode;
  private droneBus!: GainNode;

  private delay!: DelayNode;
  private feedback!: GainNode;

  private readonly events = buildSequence();

  private eventIndex = 0;
  private loopStart = 0;

  private nextCricketAt = 0;
  private nextOwlAt = 0;

  private started = false;
  private paused = false;
  private destroyed = false;

  /** MUSIC toggle state (v89): setOutput() stores it; start()/onResume()
   *  respect it so a toggled-off track never comes back on its own. */
  private outputOn = true;

  // FIX (review 2026-11-13): setMix() used to be silently clobbered —
  // start() and onResume() hard-coded 0.76/0.72. The mix now lives in
  // fields so a setMix() call survives pause/resume.
  private musicMix = 0.76;
  private ambienceMix = 0.72;
  private readonly masterLevel = 0.82;

  private windStarted = false;

  private graphNodes: AudioNode[] = [];
  private activeSources = new Set<AudioScheduledSourceNode>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Reuse Phaser's WebAudio context.
    const manager = scene.sound as unknown as {
      context?: AudioContext;
      destination?: AudioNode;
    };

    if (!manager.context || !manager.destination) {
      throw new Error(
        'GraveyardMusic requires Phaser WebAudio.'
      );
    }

    this.ctx = manager.context;

    this.createGraph(manager.destination);

    scene.events.on('update', this.tick);
    scene.events.on('pause', this.onPause);
    scene.events.on('resume', this.onResume);

    scene.events.once('shutdown', this.destroy);
    scene.events.once('destroy', this.destroy);

    // Browser audio unlock: first player interaction.
    // FIX (review 2026-11-13): named handler so destroy()/stop() can
    // remove it — the anonymous once() listener used to linger on the
    // input plugin after the scene was destroyed.
    scene.input.once('pointerdown', this.startOnPointerDown);
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

    source.addEventListener('ended', () => {
      this.activeSources.delete(source);
      try { source.disconnect(); } catch {}
    }, { once: true });

    return source;
  }

  private createGraph(destination: AudioNode): void {
    const c = this.ctx;

    this.output = this.keepNode(c.createGain());
    this.output.gain.value = 0.0001;

    this.compressor = this.keepNode(
      c.createDynamicsCompressor()
    );

    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.25;

    this.output.connect(this.compressor);
    this.compressor.connect(destination);

    this.musicBus = this.keepNode(c.createGain());
    this.ambienceBus = this.keepNode(c.createGain());

    this.musicBus.gain.value = 0;
    this.ambienceBus.gain.value = 0;

    this.musicBus.connect(this.output);
    this.ambienceBus.connect(this.output);

    this.padBus = this.keepNode(c.createGain());
    this.bellBus = this.keepNode(c.createGain());
    this.droneBus = this.keepNode(c.createGain());

    this.padBus.gain.value = 0.28;
    this.bellBus.gain.value = 0.52;
    this.droneBus.gain.value = 0.18;

    this.padBus.connect(this.musicBus);
    this.bellBus.connect(this.musicBus);
    this.droneBus.connect(this.musicBus);

    // Synthesized echo for the moon bells.
    this.delay = this.keepNode(c.createDelay(1.2));
    this.feedback = this.keepNode(c.createGain());

    const feedbackFilter = this.keepNode(
      c.createBiquadFilter()
    );

    const wet = this.keepNode(c.createGain());

    this.delay.delayTime.value = 0.55;
    this.feedback.gain.value = 0.19;

    feedbackFilter.type = 'lowpass';
    feedbackFilter.frequency.value = 1800;

    wet.gain.value = 0.12;

    this.bellBus.connect(this.delay);
    this.delay.connect(feedbackFilter);
    feedbackFilter.connect(this.feedback);
    this.feedback.connect(this.delay);

    this.delay.connect(wet);
    wet.connect(this.output);
  }

  async start(): Promise<void> {
    if (this.started || this.destroyed) return;

    try {
      if (this.ctx.state !== 'running') {
        await this.ctx.resume();
      }
    } catch {
      return;
    }

    if (this.destroyed || this.ctx.state !== 'running') return;

    this.started = true;
    this.paused = false;

    const now = this.ctx.currentTime;

    this.loopStart = now + 0.15;
    this.eventIndex = 0;

    this.nextCricketAt = now + 1.1;
    this.nextOwlAt = now + 5.2;

    this.startWindAndDrone();

    this.musicBus.gain.setTargetAtTime(
      this.musicMix, now, 1.4
    );

    this.ambienceBus.gain.setTargetAtTime(
      this.ambienceMix, now, 1.8
    );

    this.output.gain.setTargetAtTime(
      this.outputOn ? this.masterLevel : 0.0001, now, 1.0
    );
  }

  /**
   * MUSIC toggle (v89): ramp the whole output (music + ambience) to the
   * master level or to silence. Stores the flag first, so a toggle before
   * start() still holds — start()/onResume() both read outputOn. No-op
   * once stopped/destroyed: stop() owns the fade then, so a late toggle
   * can't resurrect it.
   */
  setOutput(on: boolean): void {
    this.outputOn = on;
    if (this.destroyed || !this.started || this.paused) return;
    try {
      this.output.gain.setTargetAtTime(on ? this.masterLevel : 0.0001, this.ctx.currentTime, 0.2);
    } catch {}
  }

  /**
   * Stop the music (victory / game-over switches where the scene stays
   * alive). Fades the master out, stops scheduling, and silences the
   * looping wind/drone sources after the fade. Terminal for this
   * instance — a scene restart creates a new GraveyardMusic. Full
   * cleanup still happens in destroy() on scene shutdown.
   */
  stop(): void {
    if (this.destroyed || !this.started) return;

    this.started = false;
    this.scene.input.off('pointerdown', this.startOnPointerDown);

    const now = this.ctx.currentTime;

    try {
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setTargetAtTime(0.0001, now, 0.15);
    } catch {}

    // The wind/drone oscillators loop forever; stop them once the fade
    // has run so they don't spin silently. One-shot bells/pads end on
    // their own; stop() on an already-ended source throws, hence the
    // try/catch. destroy() is the authoritative cleanup if the scene
    // shuts down first.
    const sources = [...this.activeSources];
    window.setTimeout(() => {
      for (const source of sources) {
        try { source.stop(); } catch {}
      }
    }, 900);
  }

  private tick = (): void => {
    if (
      !this.started ||
      this.paused ||
      this.destroyed ||
      this.ctx.state !== 'running'
    ) return;

    const now = this.ctx.currentTime;
    const horizon = now + 0.14;

    // Music lookahead scheduler.
    let guard = 0;

    while (guard++ < 128) {
      const event = this.events[this.eventIndex];
      const when = this.loopStart + event.at;

      if (when >= horizon) break;

      if (when >= now - 0.025) {
        if (event.kind === 'pad') {
          this.playChord(
            event.notes,
            when,
            event.duration
          );
        } else {
          this.playBell(
            event.midi,
            when,
            event.beats,
            event.velocity
          );
        }
      }

      this.eventIndex++;

      if (this.eventIndex >= this.events.length) {
        this.eventIndex = 0;
        this.loopStart += LOOP_SECONDS;
      }
    }

    // Irregular cricket calls.
    let cricketGuard = 0;

    while (
      this.nextCricketAt < horizon &&
      cricketGuard++ < 8
    ) {
      if (this.nextCricketAt > now - 0.02) {
        this.playCrickets(this.nextCricketAt);
      }

      this.nextCricketAt += random(1.05, 1.9);
    }

    // Distant owl calls.
    let owlGuard = 0;

    while (
      this.nextOwlAt < horizon &&
      owlGuard++ < 3
    ) {
      if (this.nextOwlAt > now - 0.02) {
        this.playOwlPair(this.nextOwlAt);
      }

      this.nextOwlAt += random(8, 13);
    }
  };

  private startWindAndDrone(): void {
    if (this.windStarted) return;

    const c = this.ctx;
    const now = c.currentTime;

    // Procedural wind noise. No audio file.
    const buffer = c.createBuffer(
      1,
      c.sampleRate * 2,
      c.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const wind = this.keepSource(c.createBufferSource());
    wind.buffer = buffer;
    wind.loop = true;

    const windFilter = this.keepNode(
      c.createBiquadFilter()
    );

    windFilter.type = 'lowpass';
    windFilter.frequency.value = 430;

    const windGain = this.keepNode(c.createGain());
    windGain.gain.value = 0.022;

    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambienceBus);

    const windLfo = this.keepSource(
      c.createOscillator()
    );

    const windLfoGain = this.keepNode(c.createGain());

    windLfo.frequency.value = 0.07;
    windLfoGain.gain.value = 0.006;

    windLfo.connect(windLfoGain);
    windLfoGain.connect(windGain.gain);

    const filterLfo = this.keepSource(
      c.createOscillator()
    );

    const filterLfoGain = this.keepNode(c.createGain());

    filterLfo.frequency.value = 0.035;
    filterLfoGain.gain.value = 120;

    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(windFilter.frequency);

    wind.start(now);
    windLfo.start(now);
    filterLfo.start(now);

    // Low D2 / A2 harmonic drone.
    const droneFilter = this.keepNode(
      c.createBiquadFilter()
    );

    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 260;

    const droneGain = this.keepNode(c.createGain());
    droneGain.gain.value = 0.035;

    droneFilter.connect(droneGain);
    droneGain.connect(this.droneBus);

    for (const midi of [38, 45]) {
      const osc = this.keepSource(
        c.createOscillator()
      );

      osc.type = 'sine';
      osc.frequency.value = midiHz(midi);

      osc.connect(droneFilter);
      osc.start(now);
    }

    const droneLfo = this.keepSource(
      c.createOscillator()
    );

    const droneLfoGain = this.keepNode(c.createGain());

    droneLfo.frequency.value = 0.03;
    droneLfoGain.gain.value = 0.004;

    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneGain.gain);
    droneLfo.start(now);

    this.windStarted = true;
  }

  private playChord(
    notes: number[],
    at: number,
    duration: number
  ): void {
    const c = this.ctx;

    for (const midi of notes) {
      const osc = this.keepSource(
        c.createOscillator()
      );

      const filter = c.createBiquadFilter();
      const env = c.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiHz(midi), at);
      osc.detune.setValueAtTime(random(-4, 4), at);

      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.65;

      env.gain.setValueAtTime(0.0001, at);
      env.gain.linearRampToValueAtTime(0.022, at + 1.25);
      env.gain.setValueAtTime(
        0.016,
        at + duration - 1.25
      );

      env.gain.exponentialRampToValueAtTime(
        0.0001,
        at + duration + 1.6
      );

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.padBus);

      osc.start(at);
      osc.stop(at + duration + 1.65);

      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        env.disconnect();
      };
    }
  }

  private playBell(
    midi: number,
    at: number,
    beats: number,
    velocity: number
  ): void {
    const freq = midiHz(midi);
    const decay = 0.8 + beats * 0.22;
    const pan = ((midi % 5) - 2) * 0.14;

    this.bellTone(
      freq, at, 0.12 * velocity, decay, pan
    );

    // Inharmonic metallic overtone.
    this.bellTone(
      freq * 2.71,
      at,
      0.028 * velocity,
      decay * 0.55,
      pan
    );
  }

  private bellTone(
    freq: number,
    at: number,
    peak: number,
    decay: number,
    panValue: number
  ): void {
    const osc = this.keepSource(
      this.ctx.createOscillator()
    );

    const env = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);

    pan.pan.value = panValue;

    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(peak, at + 0.008);
    env.gain.exponentialRampToValueAtTime(
      0.0001, at + decay
    );

    osc.connect(env);
    env.connect(pan);
    pan.connect(this.bellBus);

    osc.start(at);
    osc.stop(at + decay + 0.03);

    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      pan.disconnect();
    };
  }

  private playCrickets(at: number): void {
    const count = Math.random() > 0.55 ? 3 : 2;
    const base = random(3900, 4200);
    const pan = random(-0.75, 0.75);

    for (let i = 0; i < count; i++) {
      this.cricketPulse(
        at + i * 0.052,
        base + random(-130, 130),
        pan
      );
    }
  }

  private cricketPulse(
    at: number,
    freq: number,
    panValue: number
  ): void {
    const osc = this.keepSource(
      this.ctx.createOscillator()
    );

    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);

    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 5.5;

    pan.pan.value = panValue;

    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(0.018, at + 0.003);
    env.gain.exponentialRampToValueAtTime(
      0.0001, at + 0.034
    );

    osc.connect(filter);
    filter.connect(env);
    env.connect(pan);
    pan.connect(this.ambienceBus);

    osc.start(at);
    osc.stop(at + 0.04);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      env.disconnect();
      pan.disconnect();
    };
  }

  private playOwlPair(at: number): void {
    const pan = Math.random() > 0.5 ? -0.58 : 0.58;

    this.owlHoot(at, 480, 350, pan);
    this.owlHoot(at + 0.34, 430, 315, pan);
  }

  private owlHoot(
    at: number,
    startHz: number,
    endHz: number,
    panValue: number
  ): void {
    const osc = this.keepSource(
      this.ctx.createOscillator()
    );

    const env = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();

    const vibrato = this.keepSource(
      this.ctx.createOscillator()
    );

    const vibratoGain = this.ctx.createGain();

    osc.type = 'sine';

    osc.frequency.setValueAtTime(startHz, at);
    osc.frequency.exponentialRampToValueAtTime(
      endHz, at + 0.43
    );

    vibrato.frequency.value = 5.2;
    vibratoGain.gain.value = 4;

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    pan.pan.value = panValue;

    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(0.11, at + 0.05);
    env.gain.exponentialRampToValueAtTime(
      0.0001, at + 0.43
    );

    osc.connect(env);
    env.connect(pan);
    pan.connect(this.ambienceBus);

    osc.start(at);
    vibrato.start(at);

    osc.stop(at + 0.47);
    vibrato.stop(at + 0.47);

    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      pan.disconnect();
    };

    vibrato.onended = () => {
      vibrato.disconnect();
      vibratoGain.disconnect();
    };
  }

  setMix(music: number, ambience: number): void {
    // Stored, not just applied: start()/onResume() restore these values.
    this.musicMix = clamp(music);
    this.ambienceMix = clamp(ambience);

    const now = this.ctx.currentTime;

    this.musicBus.gain.setTargetAtTime(
      this.musicMix, now, 0.12
    );

    this.ambienceBus.gain.setTargetAtTime(
      this.ambienceMix, now, 0.12
    );
  }

  private onPause = (): void => {
    if (!this.started || this.destroyed) return;

    this.paused = true;

    const now = this.ctx.currentTime;

    this.musicBus.gain.setTargetAtTime(
      0.0001, now, 0.07
    );

    this.ambienceBus.gain.setTargetAtTime(
      0.0001, now, 0.07
    );

    // FIX (review 2026-11-13): the bell echo's wet path connects
    // straight to the output, bypassing both buses — scheduled echoes
    // used to keep ringing (quietly) while paused. Duck the master too.
    this.output.gain.setTargetAtTime(
      0.0001, now, 0.07
    );
  };

  private onResume = (): void => {
    if (!this.started || !this.paused || this.destroyed) return;

    void this.ctx.resume().then(() => {
      if (this.destroyed) return;

      this.paused = false;

      const now = this.ctx.currentTime;

      // Restart at the beginning of a clean musical loop.
      this.loopStart = now + 0.15;
      this.eventIndex = 0;

      this.nextCricketAt = now + 1.1;
      this.nextOwlAt = now + 5.2;

      this.musicBus.gain.setTargetAtTime(
        this.musicMix, now, 1.0
      );

      this.ambienceBus.gain.setTargetAtTime(
        this.ambienceMix, now, 1.3
      );

      this.output.gain.setTargetAtTime(
        this.outputOn ? this.masterLevel : 0.0001, now, 1.0
      );
    }).catch(() => {});
  };

  private destroy = (): void => {
    if (this.destroyed) return;

    this.destroyed = true;

    this.scene.events.off('update', this.tick);
    this.scene.events.off('pause', this.onPause);
    this.scene.events.off('resume', this.onResume);
    this.scene.input.off('pointerdown', this.startOnPointerDown);

    const now = this.ctx.currentTime;

    try {
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(0, now);
    } catch {}

    for (const source of this.activeSources) {
      try { source.stop(now); } catch {}
    }

    for (const node of this.graphNodes) {
      try { node.disconnect(); } catch {}
    }

    this.activeSources.clear();
    this.graphNodes.length = 0;
  };
}

// Wired in GameScene.create() for chapter 11 only (PRUEBA):
//
//   if (this.chapter.id === 11) {
//     this.graveyardMusic = new GraveyardMusic(this);
//   } else {
//     Audio.music(this.chapter.music);
//   }
//
// Victory / game-over switches stop it via graveyardMusic.stop();
// scene shutdown/destroy cleans it up via destroy().
