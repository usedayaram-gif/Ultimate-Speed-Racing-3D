import { Language } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine synth nodes
  private engineRunning = false;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Nitro synth nodes
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  // Tire screech
  private screechGain: GainNode | null = null;

  // Police siren
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenActive = false;

  // Music sequencer
  private musicTimer: number | null = null;
  private musicStep = 0;

  private muted = false;
  private sfxVolume = 0.75;
  private musicVolume = 0.45;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(sfx: number, music: number, muted: boolean): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.45, now, 0.03);
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public startRaceAudio(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.engineRunning) return;

    this.engineRunning = true;
    const now = this.ctx.currentTime;

    // Dual-oscillator sports V8/V12 engine synth
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.setValueAtTime(55, now);
    this.engineOsc2.frequency.setValueAtTime(110, now);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(240, now);
    this.engineFilter.Q.setValueAtTime(2.5, now);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.14, now);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start(now);
    this.engineOsc2.start(now);

    // Filtered white noise for Nitro & Tire Screech
    const noiseBuf = this.createNoiseBuffer();
    if (noiseBuf) {
      const nitroSrc = this.ctx.createBufferSource();
      nitroSrc.buffer = noiseBuf;
      nitroSrc.loop = true;
      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'bandpass';
      this.nitroFilter.frequency.setValueAtTime(900, now);
      this.nitroFilter.Q.setValueAtTime(1.2, now);
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0, now);
      nitroSrc.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);
      nitroSrc.start(now);

      const screechSrc = this.ctx.createBufferSource();
      screechSrc.buffer = noiseBuf;
      screechSrc.loop = true;
      const screechFilter = this.ctx.createBiquadFilter();
      screechFilter.type = 'bandpass';
      screechFilter.frequency.setValueAtTime(1650, now);
      screechFilter.Q.setValueAtTime(6.0, now);
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0, now);
      screechSrc.connect(screechFilter);
      screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.sfxGain);
      screechSrc.start(now);
    }

    // Police siren node (muted until police chase active)
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, now);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start(now);

    this.startMusicLoop();
  }

  public updateRaceAudio(
    rpmRatio: number,
    throttle: boolean,
    nitroActive: boolean,
    driftAmount: number,
    policeActive: boolean,
    policeProximity: number,
    timeSeconds: number
  ): void {
    if (!this.ctx || !this.engineRunning) return;
    const now = this.ctx.currentTime;

    const baseFreq = 48 + rpmRatio * 145 + (nitroActive ? 38 : 0);
    this.engineOsc1?.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2?.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.04);
    this.engineFilter?.frequency.setTargetAtTime(
      180 + rpmRatio * 950 + (throttle ? 280 : 0) + (nitroActive ? 500 : 0),
      now,
      0.05
    );
    this.engineGain?.gain.setTargetAtTime(throttle ? 0.2 : 0.1, now, 0.06);

    if (this.nitroGain && this.nitroFilter) {
      this.nitroGain.gain.setTargetAtTime(nitroActive ? 0.24 : 0, now, 0.05);
      this.nitroFilter.frequency.setTargetAtTime(nitroActive ? 1400 : 600, now, 0.08);
    }

    if (this.screechGain) {
      const screechLevel = Math.min(0.16, Math.max(0, (driftAmount - 0.35) * 0.25));
      this.screechGain.gain.setTargetAtTime(screechLevel, now, 0.04);
    }

    if (this.sirenOsc && this.sirenGain) {
      if (policeActive) {
        const wail = 620 + Math.sin(timeSeconds * 6.5) * 240;
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
        const vol = 0.03 + policeProximity * 0.09;
        this.sirenGain.gain.setTargetAtTime(vol, now, 0.06);
        this.sirenActive = true;
      } else if (this.sirenActive) {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
        this.sirenActive = false;
      }
    }
  }

  public stopRaceAudio(): void {
    this.engineRunning = false;
    this.sirenActive = false;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.sirenOsc?.stop();
    } catch {
      // ignore already stopped
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.nitroGain = null;
    this.nitroFilter = null;
    this.screechGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.stopMusicLoop();
  }

  public playCollision(intensity = 0.8): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);

    gain.gain.setValueAtTime(0.35 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playNearMiss(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCoin(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [880, 1318.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.16, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.19);
    });
  }

  public playCountdownStep(value: number, lang: Language): void {
    this.unlock();
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const isGo = value === 0;
      osc.frequency.setValueAtTime(isGo ? 987.77 : 523.25, now);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.4 : 0.2));
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + (isGo ? 0.42 : 0.22));
    }

    if (!this.muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const text =
          value === 0
            ? lang === 'hi'
              ? 'जाओ!'
              : 'Go!'
            : String(value);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        utter.rate = 1.15;
        utter.volume = Math.min(1, this.sfxVolume);
        window.speechSynthesis.speak(utter);
      } catch {
        // Speech synthesis optional
      }
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null) return;
    const bassLine = [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42];
    const leadLine = [220, 0, 261.63, 293.66, 329.63, 0, 293.66, 261.63];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.engineRunning) return;
      const now = this.ctx.currentTime;
      const step = this.musicStep % bassLine.length;

      // Bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassLine[step], now);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      bassGain.gain.setValueAtTime(0.22, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bassOsc.connect(filter);
      filter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.2);

      // Lead arpeggio
      const leadFreq = leadLine[step];
      if (leadFreq > 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadFreq, now);
        leadGain.gain.setValueAtTime(0.09, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(now);
        leadOsc.stop(now + 0.17);
      }

      this.musicStep++;
    }, 210);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
