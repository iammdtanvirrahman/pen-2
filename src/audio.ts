import { GameSettings } from './types';

let audioCtx: AudioContext | null = null;

export function playSound(
  settings: GameSettings,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.2,
  rampFreq?: number
) {
  if (!settings.snd || !settings.vol) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (rampFreq) {
      osc.frequency.exponentialRampToValueAtTime(rampFreq, t + duration);
    }

    gain.gain.setValueAtTime(Math.max(0.0002, volume * settings.vol), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {
    // Audio may fail if user hasn't interacted yet
  }
}
