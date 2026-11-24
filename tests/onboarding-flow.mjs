import assert from 'node:assert/strict';
import { OnboardingFlow } from '../gesture/onboarding/flow.js';

const base = { present: false, x: .5, y: .5, mode: 'aim', pan: { x: 0, y: 0 }, cardVisible: false, roomOpen: false, canReturn: false };
function run(flow, from, to, input, step = 33) {
  let snap; for (let t = from; t <= to; t += step) snap = flow.update(t, { ...base, ...(typeof input === 'function' ? input(t) : input) });
  return snap;
}

// Intro: title only, then the wave prompt appears on its own.
{
  const f = new OnboardingFlow();
  let s = run(f, 0, 3000, { present: true, x: .5 });
  assert.equal(s.state, 'intro');
  assert.equal(f.allows('rotate'), false);
  s = run(f, 3033, 3400, {});
  assert.equal(s.state, 'welcome');
}
// Welcome: nothing happens without a hand, and nothing on the globe is allowed.
{
  const f = new OnboardingFlow(); f._go('welcome', 0);
  let s = run(f, 0, 10000, {});
  assert.equal(s.state, 'welcome');
  assert.equal(s.lost, false, 'no "raise your hand" nag on the welcome screen');
  assert.equal(f.allows('rotate'), false); assert.equal(f.allows('hover'), false);
}

// A side-to-side wave starts the tutorial; a still hand does not (until the hold fallback).
{
  const f = new OnboardingFlow(); f._go('welcome', 0);
  let s = run(f, 0, 1500, { present: true, x: .5 });
  assert.equal(s.state, 'welcome', 'still hand is not a wave');
  const wave = (t) => ({ present: true, x: .5 + .08 * Math.sin(t / 130) });
  s = run(f, 1533, 3000, wave);
  assert.equal(f.next, 'grab'); assert.equal(s.celebrating, true);
  s = run(f, 3033, 4500, wave);
  assert.equal(s.state, 'grab');
}
{
  const f = new OnboardingFlow(); f._go('welcome', 0);
  const s = run(f, 0, 6500, { present: true, x: .5 });
  assert.equal(f.next, 'grab', 'a steady raised hand eventually begins too');
  assert.equal(s.celebrating, true);
}
// Small jitter does not count as a wave.
{
  const f = new OnboardingFlow(); f._go('welcome', 0);
  run(f, 0, 3000, (t) => ({ present: true, x: .5 + .01 * Math.sin(t / 60) }));
  assert.equal(f.celebrateUntil, 0);
}

// Grab: hover is blocked; only movement while grabbing fills progress.
{
  const f = new OnboardingFlow(); f._go('grab', 0);
  assert.equal(f.allows('rotate'), true); assert.equal(f.allows('hover'), false); assert.equal(f.allows('enter'), false);
  let s = run(f, 0, 1000, { present: true, mode: 'aim', pan: { x: .02, y: 0 } });
  assert.equal(s.progress, 0, 'aiming movement is not grabbing');
  assert.equal(s.gripping, false);
  s = run(f, 1033, 1400, { present: true, mode: 'navigate', pan: { x: .01, y: 0 } });
  assert.ok(s.progress > 0 && s.progress < 1); assert.equal(s.gripping, true);
  s = run(f, 1433, 2000, { present: true, mode: 'navigate', pan: { x: .01, y: 0 } });
  assert.equal(s.celebrating, true);
  s = run(f, 2033, 3500, { present: true });
  assert.equal(s.state, 'touch');
}

// Touch: a card that flickers for a frame is not enough.
{
  const f = new OnboardingFlow(); f._go('touch', 0);
  let s = run(f, 0, 100, { present: true, cardVisible: true });
  s = run(f, 133, 200, { present: true, cardVisible: false });
  assert.equal(s.celebrating, false);
  s = run(f, 233, 600, { present: true, cardVisible: true });
  assert.equal(s.celebrating, true);
}

// Visit: the pinch illustration reacts to a real pinch only.
{
  const f = new OnboardingFlow(); f._go('visit', 0);
  let s = run(f, 0, 100, { present: true, cardVisible: true, pinch: .2 });
  assert.equal(s.pinching, false); assert.equal(s.needsCard, false);
  s = run(f, 133, 200, { present: true, cardVisible: true, pinch: .9 });
  assert.equal(s.pinching, true);
}

// Visit → return → done → free.
{
  const f = new OnboardingFlow(); f._go('visit', 0);
  let s = run(f, 0, 100, { present: true, cardVisible: false });
  assert.equal(s.needsCard, true);
  s = run(f, 133, 200, { present: true, roomOpen: true });
  assert.equal(s.state, 'return');
  s = run(f, 233, 3000, { present: true, roomOpen: true, canReturn: true });
  assert.equal(s.canReturn, true);
  s = run(f, 3033, 3100, { present: true, roomOpen: false });
  assert.equal(s.state, 'done');
  s = run(f, 3133, 8000, {});
  assert.equal(s.state, 'free'); assert.equal(f.active, false); assert.equal(f.allows('enter'), true);
}

// Entering a room early (e.g. during touch) skips straight to the return step.
{
  const f = new OnboardingFlow(); f._go('touch', 0);
  const s = run(f, 0, 100, { present: true, roomOpen: true });
  assert.equal(s.state, 'return');
}

// Hand lost mid-lesson → prompt after a short delay; hints only grow while a hand is present.
{
  const f = new OnboardingFlow(); f._go('touch', 0);
  let s = run(f, 0, 1000, {});
  assert.equal(s.lost, false);
  s = run(f, 1033, 1500, {});
  assert.equal(s.lost, true);
  s = run(f, 1533, 30000, {});
  assert.equal(s.hint, 0, 'no escalation while nobody is there');
  s = run(f, 30033, 40000, { present: true });
  assert.equal(s.hint, 1);
  s = run(f, 40033, 50000, { present: true });
  assert.equal(s.hint, 2);
}

// Operator controls.
{
  const f = new OnboardingFlow();
  assert.equal(f.state, 'intro');
  f.skip(0); assert.equal(f.state, 'welcome');
  f.skip(0); assert.equal(f.state, 'grab');
  f.skip(0); assert.equal(f.state, 'touch');
  f.skip(0); assert.equal(f.state, 'visit');
  f.skip(0); assert.equal(f.state, 'done', 'skip never fakes a room visit');
  f.reset(0); assert.equal(f.state, 'intro');
}

console.log('onboarding-flow: ok');
