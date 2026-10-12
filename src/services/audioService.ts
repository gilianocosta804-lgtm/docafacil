// Audio and Speech synthesis service for driver dock calls

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private isVoiceEnabled: boolean = true;
  private volume: number = 0.9;

  constructor() {
    // AudioContext will be initialized on first user gesture
    const savedSound = localStorage.getItem('docafacil_sound_enabled');
    const savedVoice = localStorage.getItem('docafacil_voice_enabled');
    const savedVol = localStorage.getItem('docafacil_volume');

    if (savedSound !== null) this.isSoundEnabled = savedSound === 'true';
    if (savedVoice !== null) this.isVoiceEnabled = savedVoice === 'true';
    if (savedVol !== null) this.volume = parseFloat(savedVol);
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    localStorage.setItem('docafacil_sound_enabled', String(enabled));
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    localStorage.setItem('docafacil_voice_enabled', String(enabled));
  }

  public getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('docafacil_volume', String(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Play logistics / airport calling chime
  public playChime(): Promise<void> {
    if (!this.isSoundEnabled) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.volume * 0.8, now);
        masterGain.connect(ctx.destination);

        // Sequence of melodic notes: D5 (587.33Hz), F#5 (739.99Hz), A5 (880.00Hz), D6 (1174.66Hz)
        const notes = [
          { freq: 587.33, start: 0, duration: 0.35 },
          { freq: 739.99, start: 0.18, duration: 0.35 },
          { freq: 880.00, start: 0.36, duration: 0.45 },
          { freq: 1174.66, start: 0.54, duration: 0.9 },
        ];

        notes.forEach(({ freq, start, duration }) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + start);

          // Envelope: fast attack, gradual exponential decay
          noteGain.gain.setValueAtTime(0.001, now + start);
          noteGain.gain.linearRampToValueAtTime(0.8, now + start + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(now + start);
          osc.stop(now + start + duration);
        });

        setTimeout(resolve, 1500);
      } catch (err) {
        console.warn('Audio playback error (waiting for user interaction):', err);
        resolve();
      }
    });
  }

  // Speak announcement using Web Speech API in Portuguese
  public speakCall(motoristaNome: string, docaNome: string, rota?: string): Promise<void> {
    if (!this.isVoiceEnabled || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel(); // Stop prior speeches

        const message = rota
          ? `Atenção: Motorista ${motoristaNome}. Compareça à ${docaNome} para carregamento da rota ${rota}.`
          : `Atenção: Motorista ${motoristaNome}. Compareça imediatamente à ${docaNome} para carregamento.`;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.95; // slightly slower for logistics clarity
        utterance.pitch = 1.0;
        utterance.volume = this.volume;

        // Try finding a pt-BR voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'));
        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);

        // Safety fallback timeout
        setTimeout(resolve, 6000);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        resolve();
      }
    });
  }

  // Full alert combo: Chime then Voice
  public async playDockAlert(motoristaNome: string, docaNome: string, rota?: string) {
    await this.playChime();
    if (this.isVoiceEnabled) {
      await this.speakCall(motoristaNome, docaNome, rota);
    }
  }
}

export const audioService = new AudioService();
