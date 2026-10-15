// An original, generated soundtrack: no samples, no licensing. A I–V–vi–IV loop in D major at 104 BPM
// whose layers change with the story. Everything is synthesized with the Web Audio API.

export type Section = "intro" | "groove" | "tension" | "build" | "peak" | "duck" | "hush" | "outro";

interface Mix {
  pad: number;
  bass: "none" | "long" | "eighths";
  kick: "none" | "four" | "roll";
  hats: "none" | "off" | "sixteenths";
  clap: boolean;
  arp: number;
  /** Lowpass on the whole band, Hz */
  tone: number;
  level: number;
}

const MIXES: Record<Section, Mix> = {
  intro: { pad: 1, bass: "long", kick: "none", hats: "off", clap: false, arp: 0, tone: 2400, level: 0.8 },
  groove: { pad: 0.8, bass: "eighths", kick: "four", hats: "off", clap: true, arp: 0, tone: 9000, level: 1 },
  tension: { pad: 0.6, bass: "eighths", kick: "four", hats: "off", clap: false, arp: 0, tone: 900, level: 0.9 },
  build: { pad: 0.9, bass: "long", kick: "roll", hats: "sixteenths", clap: false, arp: 0.4, tone: 1600, level: 1 },
  peak: { pad: 1, bass: "eighths", kick: "four", hats: "sixteenths", clap: true, arp: 1, tone: 12000, level: 1 },
  duck: { pad: 0.7, bass: "long", kick: "none", hats: "none", clap: false, arp: 0.3, tone: 1800, level: 0.35 },
  hush: { pad: 0, bass: "none", kick: "none", hats: "none", clap: false, arp: 0, tone: 1800, level: 0 },
  outro: { pad: 1, bass: "long", kick: "none", hats: "off", clap: false, arp: 0.6, tone: 3500, level: 0.7 },
};

const BPM = 104;
const STEP = 60 / BPM / 4;
const LOOKAHEAD = 0.15;
const VOLUME = 0.42;

// D, A, Bm, G
const CHORDS = [
  { pad: [62, 66, 69], bass: 38 },
  { pad: [61, 64, 69], bass: 45 },
  { pad: [59, 62, 66], bass: 47 },
  { pad: [59, 62, 67], bass: 43 },
];
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Soundtrack {
  private ctx: BaseAudioContext;
  private out: GainNode;
  private band: BiquadFilterNode;
  private delay: DelayNode;
  private noise: AudioBuffer;
  private mix: Mix = MIXES.intro;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private muted = false;

  constructor(ctx: BaseAudioContext = new AudioContext()) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.band = ctx.createBiquadFilter();
    this.band.type = "lowpass";
    this.band.frequency.value = this.mix.tone;
    this.band.Q.value = 0.7;
    this.band.connect(comp).connect(this.out).connect(ctx.destination);

    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    this.delay.connect(feedback).connect(this.delay);
    this.delay.connect(this.band);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Call from a click: browsers only allow audio to start after a user gesture. */
  start(section: Section = "intro") {
    if (this.timer) return;
    if (this.ctx instanceof AudioContext) void this.ctx.resume();
    this.setSection(section);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.fadeTo(this.target(), 1.5);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.fadeTo(0, 0.4);
  }

  setSection(section: Section) {
    this.mix = MIXES[section];
    this.band.frequency.setTargetAtTime(this.mix.tone, this.ctx.currentTime, 0.6);
    this.fadeTo(this.target(), 0.8);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.fadeTo(this.target(), 0.25);
  }

  /** Suspend while the tab is hidden so we're not playing to nobody. */
  setHidden(hidden: boolean) {
    if (!(this.ctx instanceof AudioContext)) return;
    void (hidden ? this.ctx.suspend() : this.ctx.resume());
  }

  /** Lets an offline render run the same scheduler without timers. */
  renderUntil(seconds: number) {
    this.nextTime = 0.05;
    this.fadeTo(this.target(), 0.5);
    while (this.nextTime < seconds) this.tick();
  }

  private target() {
    return this.muted ? 0 : VOLUME * this.mix.level;
  }

  private fadeTo(value: number, seconds: number) {
    const g = this.out.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
  }

  private schedule() {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) this.tick();
  }

  private tick() {
    const t = this.nextTime;
    const s = this.step % 64;
    const beat = s % 16;
    const chord = CHORDS[Math.floor(s / 16)]!;
    const m = this.mix;

    if (beat === 0 && m.pad > 0) this.pad(t, chord.pad, m.pad);
    if (m.bass === "long" && beat === 0) this.bass(t, chord.bass, STEP * 15);
    if (m.bass === "eighths" && s % 2 === 0) this.bass(t, chord.bass + (beat === 14 ? 12 : 0), STEP * 1.6);
    if (m.kick === "four" && s % 4 === 0) this.kick(t);
    if (m.kick === "roll" && (s % 4 === 0 || (beat >= 8 && s % 2 === 0) || (beat >= 12 && s % 1 === 0))) this.kick(t, 0.6);
    if (m.hats === "off" && s % 4 === 2) this.hat(t, 0.5);
    if (m.hats === "sixteenths") this.hat(t, s % 2 ? 0.25 : 0.45);
    if (m.clap && s % 8 === 4) this.clap(t);
    if (m.arp > 0) this.arp(t, chord.pad[[0, 1, 2, 1][s % 4]!]! + 12 + (Math.floor(s / 4) % 2 ? 12 : 0), m.arp);

    this.nextTime += STEP;
    this.step++;
  }

  private env(t: number, peak: number, attack: number, hold: number, release: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return g;
  }

  private pad(t: number, notes: number[], level: number) {
    const bar = STEP * 16;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.linearRampToValueAtTime(1800, t + bar * 0.5);
    filter.frequency.linearRampToValueAtTime(900, t + bar);
    const g = this.env(t, 0.05 * level, 0.35, bar - 0.6, 0.5);
    filter.connect(g).connect(this.band);
    for (const n of notes) {
      for (const detune of [-7, 7]) {
        const o = this.ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = hz(n);
        o.detune.value = detune;
        o.connect(filter);
        o.start(t);
        o.stop(t + bar + 0.2);
      }
    }
  }

  private bass(t: number, note: number, length: number) {
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz(note);
    const g = this.env(t, 0.32, 0.01, Math.max(0.01, length - 0.12), 0.1);
    o.connect(g).connect(this.band);
    o.start(t);
    o.stop(t + length + 0.05);
  }

  private kick(t: number, level = 1) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = this.env(t, 0.9 * level, 0.002, 0.02, 0.22);
    o.connect(g).connect(this.band);
    o.start(t);
    o.stop(t + 0.3);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, release: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(t, peak, 0.001, 0.005, release);
    src.connect(f).connect(g).connect(this.band);
    src.start(t, Math.random() * 0.5);
    src.stop(t + release + 0.05);
  }

  private hat(t: number, level: number) {
    this.noiseHit(t, "highpass", 7500, 0.09 * level, 0.05);
  }

  private clap(t: number) {
    this.noiseHit(t, "bandpass", 1600, 0.22, 0.14);
  }

  private arp(t: number, note: number, level: number) {
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.value = hz(note);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2600;
    const g = this.env(t, 0.035 * level, 0.003, 0.02, STEP * 1.2);
    o.connect(f).connect(g);
    g.connect(this.band);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + STEP * 2);
  }
}

/** Which part of the track plays under each slide. */
export const SECTION_FOR_SLIDE: Record<string, Section> = {
  intro: "intro",
  ghost: "tension",
  rejections: "tension",
  "persona-intro": "build",
  persona: "peak",
  offer: "peak",
  anthem: "duck",
  forecast: "peak",
  summary: "outro",
};
