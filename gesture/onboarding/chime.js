// Soft confirmation sounds (no audio files, no microphone). Hands have no haptics,
// so success needs a sound as well as a visible change. Browsers may keep audio
// muted until the first click/key press; it then unlocks silently.
export function createChime() {
  let ctx = null;
  const ensure = () => {
    try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { ctx = null; }
    return ctx && ctx.state === 'running' ? ctx : null;
  };
  function tone(freq, at, length, gain) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + at, osc = c.createOscillator(), amp = c.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(gain, t + .02); amp.gain.exponentialRampToValueAtTime(.0001, t + length);
    osc.connect(amp).connect(c.destination); osc.start(t); osc.stop(t + length + .05);
  }
  addEventListener('pointerdown', ensure, { once: true });
  addEventListener('keydown', ensure, { once: true });
  return {
    unlock: ensure,
    success() { tone(659.3, 0, .5, .09); tone(987.8, .11, .7, .07); },
    step() { tone(784, 0, .35, .04); },
  };
}
