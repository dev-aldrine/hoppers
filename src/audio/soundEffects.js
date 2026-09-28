// Procedural Web Audio API Sound Effects Synthesizer & BGM Manager

class SoundEffectsManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmAudio = null;
    this.bgmStarted = false;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initBgm(src = '/bgm.mp3') {
    if (typeof window === 'undefined') return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.preload = 'none';
      this.bgmAudio.src = src;
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.35;
    }
  }

  playBgm() {
    this.initBgm();
    if (this.bgmAudio && !this.isMuted) {
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.bgmStarted = true;
          })
          .catch((err) => {
            // Autoplay policy prevented playback, will play on next user gesture
          });
      }
    }
  }

  pauseBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.bgmAudio) {
      if (this.isMuted) {
        this.bgmAudio.pause();
      } else {
        this.playBgm();
      }
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  // Cartoon "Boing" / Hop Sound
  playHop(pitchMultiplier = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pitch bend upwards for springy boing effect
      const startFreq = 180 * pitchMultiplier;
      const endFreq = 420 * pitchMultiplier;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.8, now + 0.22);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  // Coin / Buy Transaction Chime
  playBuyChime(solAmount = 0.1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

      freqs.forEach((f, idx) => {
        const noteTime = now + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch (e) {}
  }

  // Whale Mega Fanfare for large buys
  playWhaleFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 293.66, t: 0.0, d: 0.15 }, // D4
        { f: 369.99, t: 0.12, d: 0.15 }, // F#4
        { f: 440.00, t: 0.24, d: 0.18 }, // A4
        { f: 587.33, t: 0.38, d: 0.6 },  // D5 high sustain
      ];

      notes.forEach(({ f, t, d }) => {
        const noteTime = now + t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + d + 0.05);
      });
    } catch (e) {}
  }

  // 🏆 Grand Prize Pool Winner Fanfare
  playWinnerFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const fanfareNotes = [
        { f: 523.25, t: 0.0, d: 0.12 },  // C5
        { f: 523.25, t: 0.14, d: 0.12 }, // C5
        { f: 523.25, t: 0.28, d: 0.12 }, // C5
        { f: 659.25, t: 0.42, d: 0.25 }, // E5
        { f: 783.99, t: 0.70, d: 0.20 }, // G5
        { f: 1046.50, t: 0.95, d: 0.8 }, // C6 high triumphant victory
      ];

      fanfareNotes.forEach(({ f, t, d }) => {
        const noteTime = now + t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, noteTime);

        gain.gain.setValueAtTime(0.35, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + d + 0.05);
      });
    } catch (e) {}
  }
}

export const soundManager = new SoundEffectsManager();
