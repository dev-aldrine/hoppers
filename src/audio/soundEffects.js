// Silent Audio / Sound Effects Manager (All sounds disabled)

class SoundEffectsManager {
  constructor() {
    this.isMuted = true;
  }

  initContext() {}
  initBgm() {}
  playBgm() {}
  pauseBgm() {}
  setMuted() { return true; }
  toggleMute() { return true; }
  playHop() {}
  playBuyChime() {}
  playWhaleFanfare() {}
  playWinnerFanfare() {}
}

export const soundManager = new SoundEffectsManager();
