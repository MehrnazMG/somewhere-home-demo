import { OnboardingFlow } from './flow.js';
import { COPY } from './copy.js';
import { createChime } from './chime.js';

// Ghost gloves demonstrate a gesture only while no live hand is in view,
// so the screen never shows two hands at once.
const GLOVES = ['normal', 'hover', 'pinch', 'click'];

/**
 * Overlay + controller for the hand onboarding. The globe is not touched here:
 * the bridge asks `allows()` before rotating, hovering or entering, and
 * `showsCursor` before drawing the live glove.
 */
export function createOnboarding({ getScheme = () => 'fist', homes, projectHome, globeCenter, cameraStatus, startCamera, enabled = true }) {
  const flow = new OnboardingFlow();
  let mouseMode = false;
  let started = false; // the intro timer starts on the first rendered frame, not while the page is still loading
  const chime = createChime();
  const root = document.createElement('div');
  root.className = 'onboarding';
  root.innerHTML = `
    <section class="ob-welcome" aria-label="Welcome">
      <h1 class="ob-headline">${COPY.intro}</h1>
      <div class="ob-wave-zone"><img class="ob-palm" src="./assets/onboarding/palm.png" alt="" draggable="false"><p class="ob-call" aria-live="polite"></p></div>
      <button class="ob-operator" type="button" hidden></button>
    </section>
    <div class="ob-grip" aria-hidden="true"><img alt="" draggable="false"><span class="ob-grip-bar"><i></i></span></div>
    <div class="ob-target" aria-hidden="true"><i></i><i></i></div>
    <div class="ob-ghost" aria-hidden="true"><div class="ob-ghost-move">${GLOVES.map((g) => `<img data-g="${g}" src="./assets/cursor/${g}.png" alt="" draggable="false">`).join('')}<span class="ob-ghost-ripple"></span></div></div>
    <p class="ob-line" role="status" aria-live="polite"></p>`;
  document.body.appendChild(root);
  document.body.classList.add('onboarding-on');
  const $ = (s) => root.querySelector(s);
  const el = { gripImg: $('.ob-grip img'), gripBar: $('.ob-grip-bar i'), call: $('.ob-call'), line: $('.ob-line'), op: $('.ob-operator'), ghost: $('.ob-ghost'), target: $('.ob-target') };
  const card = document.getElementById('homeCard');

  el.op.addEventListener('click', () => { chime.unlock(); startCamera(); });
  $('.ob-welcome').addEventListener('click', () => { chime.unlock(); if (cameraStatus() !== 'running') startCamera(); });

  let target = null, lastState = '';
  const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const place = (node, x, y) => { node.style.setProperty('--x', `${x}px`); node.style.setProperty('--y', `${y}px`); };

  function chooseTarget() {
    if (target) { const p = projectHome(target); if (p.visible) return p; }
    const center = globeCenter();
    let best = null, bestPoint = null, bestDistance = Infinity;
    for (const home of homes) {
      const p = projectHome(home); if (!p.visible) continue;
      const d = Math.hypot(p.x - center.x, p.y - center.y);
      if (d < bestDistance) { best = home; bestPoint = p; bestDistance = d; }
    }
    target = best; return bestPoint;
  }

  /** The single line of text for the current moment (or '' for none). */
  function lineFor(s) {
    const lost = s.lost && !mouseMode;
    switch (s.state) {
      case 'grab': {
        const lesson = COPY.grab[getScheme() === 'pinch' ? 'pinch' : 'fist'];
        if (s.celebrating) return COPY.grab.success;
        if (lost) return COPY.lost;
        return s.hint ? lesson.hints[s.hint - 1] : lesson.title;
      }
      case 'touch':
        if (s.celebrating) return COPY.touch.success;
        if (lost) return COPY.lost;
        return s.hint ? COPY.touch.hints[s.hint - 1] : COPY.touch.title;
      case 'visit':
        if (lost) return COPY.lost;
        if (s.needsCard) return COPY.visit.needsCard;
        return s.hint ? COPY.visit.hints[s.hint - 1] : COPY.visit.title;
      // In the room, the room's own place and title are the text; the Back button explains itself.
      case 'done': return COPY.done;
      default: return '';
    }
  }

  function render(s) {
    root.dataset.state = s.state;
    document.body.dataset.onboarding = s.state;
    root.classList.toggle('is-celebrating', s.celebrating);
    root.classList.toggle('has-hand', s.present);

    if (s.state === 'intro' || s.state === 'welcome') {
      const status = cameraStatus();
      // The camera notice is the only exception to "one text": without it nothing can start.
      el.op.hidden = status === 'running' || s.present;
      set(el.op, status === 'loading' ? COPY.camera.loading : COPY.camera.off);
      set(el.call, s.state === 'welcome' && s.celebrating ? COPY.welcome.hello : COPY.welcome.call);
    }
    set(el.line, lineFor(s));

    // Grab step: the fist illustration is the only hand. It closes/glows while the visitor grips.
    if (s.state === 'grab') {
      const src = getScheme() === 'pinch' ? './assets/cursor/pinch.png' : './assets/onboarding/fist.png';
      if (el.gripImg.getAttribute('src') !== src) el.gripImg.src = src;
      el.gripBar.style.transform = `scaleX(${s.progress})`;
    }
    root.classList.toggle('is-gripping', !!s.gripping);

    // Demonstration ghost: only while no live hand is visible.
    let demo = '';
    target = s.state === 'touch' || s.state === 'visit' ? target : null;
    const showRing = (s.state === 'touch' && !s.celebrating) || s.needsCard;
    if (showRing) {
      const p = chooseTarget();
      if (p) {
        place(el.target, p.x, p.y - 22);
        if (!s.present) {
          const c = globeCenter(); demo = 'touch'; place(el.ghost, p.x, p.y - 22);
          el.ghost.style.setProperty('--fx', `${c.x - p.x}px`); el.ghost.style.setProperty('--fy', `${c.y - p.y + 22}px`);
        }
      }
    } else if (s.state === 'visit' && !card.hidden && !s.present) {
      const r = card.getBoundingClientRect(); demo = 'visit'; place(el.ghost, r.left + r.width * .5, r.top + r.height * .62);
    }
    root.classList.toggle('show-target', showRing && !!target);
    if (el.ghost.dataset.demo !== demo) el.ghost.dataset.demo = demo;

    for (const e of s.events) if (e === 'success') chime.success(); else if (e === 'step' && s.state !== 'free') chime.step();
    if (s.state === 'free' && lastState !== 'free') document.body.classList.remove('onboarding-on');
    if (s.state !== 'free' && lastState === 'free') document.body.classList.add('onboarding-on');
    lastState = s.state;
  }

  const api = {
    get state() { return flow.state; },
    get active() { return flow.active; },
    /** On the title, wave and grab screens the illustration is the only hand. */
    get showsCursor() { return !['intro', 'welcome', 'grab'].includes(flow.state); },
    allows: (what) => flow.allows(what),
    update(now, input) {
      if (!started && flow.state === 'intro') { started = true; flow.reset(now); }
      mouseMode = !!input.mouseStandIn;
      render(flow.update(now, input));
    },
    reset() { target = null; flow.reset(performance.now()); },
    skip() { flow.skip(performance.now()); },
    unlockSound: () => chime.unlock(),
    dispose() { root.remove(); document.body.classList.remove('onboarding-on'); delete document.body.dataset.onboarding; },
  };
  if (!enabled) flow.finish(0);
  return api;
}
