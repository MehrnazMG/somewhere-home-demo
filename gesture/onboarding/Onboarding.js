import { OnboardingFlow } from './flow.js';
import { COPY } from './copy.js';
import { createChime } from './chime.js';

const GLOVES = ['normal', 'hover', 'pinch', 'click', 'grab'];
/**
 * Overlay + controller for the hand onboarding. The globe is not touched here:
 * the bridge asks `allows()` before rotating, hovering or entering.
 */
export function createOnboarding({ getScheme, homes, projectHome, globeCenter, cameraStatus, startCamera, enabled = true }) {
  const flow = new OnboardingFlow();
  let mouseMode = false;
  let started = false; // the intro timer starts on the first rendered frame, not while the page is still loading
  const chime = createChime();
  const root = document.createElement('div');
  root.className = 'onboarding';
  root.innerHTML = `
    <section class="ob-welcome" aria-label="Welcome">
      <h1 class="ob-headline">${COPY.welcome.title}</h1>
      <div class="ob-wave-zone"><img class="ob-palm" src="./assets/onboarding/palm.png" alt="" draggable="false"><p class="ob-call">${COPY.welcome.call}</p></div>
      <p class="ob-seen" aria-live="polite"></p>
      <button class="ob-operator" type="button" hidden></button>
    </section>
    <p class="ob-top">${COPY.top}<span class="ob-dots" aria-hidden="true"><i></i><i></i><i></i></span></p>
    <div class="ob-target" aria-hidden="true"><i></i><i></i></div>
    <div class="ob-ghost" aria-hidden="true"><div class="ob-ghost-move">${GLOVES.map((g) => `<img data-g="${g}" src="./assets/cursor/${g}.png" alt="" draggable="false">`).join('')}<span class="ob-ghost-ripple"></span></div></div>
    <p class="ob-mouse" aria-live="polite"></p>
    <div class="ob-caption" role="status" aria-live="polite">
      <img class="ob-illus" alt="" draggable="false">
      <p class="ob-title"><span class="ob-key"></span><span class="ob-rest"></span></p>
      <p class="ob-success"></p>
      <div class="ob-progress"><span></span></div>
      <p class="ob-hint"></p>
    </div>
    <p class="ob-return" aria-live="polite">${COPY.return}</p>
    <div class="ob-done"><p>${COPY.done[0]}</p><p>${COPY.done[1]}</p></div>`;
  document.body.appendChild(root);
  document.body.classList.add('onboarding-on');
  const $ = (s) => root.querySelector(s);
  const el = {
    key: $('.ob-key'), rest: $('.ob-rest'), hint: $('.ob-hint'), success: $('.ob-success'), bar: $('.ob-progress span'),
    seen: $('.ob-seen'), illus: $('.ob-illus'), op: $('.ob-operator'), ghost: $('.ob-ghost'), target: $('.ob-target'), dots: [...root.querySelectorAll('.ob-dots i')],
  };
  const card = document.getElementById('homeCard');

  el.op.addEventListener('click', () => { chime.unlock(); startCamera(); });
  root.querySelector('.ob-welcome').addEventListener('click', () => { chime.unlock(); if (cameraStatus() !== 'running') startCamera(); });

  let target = null, lastState = '';
  const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  function chooseTarget() {
    const center = globeCenter();
    if (target) { const p = projectHome(target); if (p.visible) return p; }
    let best = null, bestPoint = null, bestDistance = Infinity;
    for (const home of homes) {
      const p = projectHome(home); if (!p.visible) continue;
      const d = Math.hypot(p.x - center.x, p.y - center.y);
      if (d < bestDistance) { best = home; bestPoint = p; bestDistance = d; }
    }
    target = best; return bestPoint;
  }

  function place(node, x, y) { node.style.setProperty('--x', `${x}px`); node.style.setProperty('--y', `${y}px`); }

  function render(s) {
    const scheme = getScheme() === 'pinch' ? 'pinch' : 'fist';
    root.dataset.state = s.state;
    document.body.dataset.onboarding = s.state;
    root.classList.toggle('is-celebrating', s.celebrating);
    root.classList.toggle('is-lost', s.lost && !mouseMode);
    root.classList.toggle('has-hand', s.present);
    root.classList.toggle('can-return', s.state === 'return' && s.canReturn);
    el.dots.forEach((d, i) => { d.classList.toggle('is-done', i < s.step); d.classList.toggle('is-now', i === s.step); });

    if (s.state === 'intro' || s.state === 'welcome') {
      const status = cameraStatus();
      el.op.hidden = status === 'running';
      set(el.op, status === 'loading' ? COPY.welcome.cameraLoading : COPY.welcome.cameraOff);
      set(el.seen, s.celebrating ? COPY.welcome.hello : s.present ? COPY.welcome.seen : '');
    }

    const lesson = s.state === 'grab' ? COPY.grab[scheme] : COPY[s.state];
    if (['grab', 'touch', 'visit'].includes(s.state)) {
      set(el.key, lesson.title[0]); set(el.rest, lesson.title[1]);
      const hint = s.lost && !mouseMode ? COPY.lost : s.needsCard ? COPY.visit.needsCard : s.hint ? lesson.hints[s.hint - 1] : '';
      set(el.hint, hint);
      set(el.success, s.state === 'grab' ? COPY.grab.success : s.state === 'touch' ? COPY.touch.success : '');
      el.bar.style.transform = `scaleX(${s.state === 'grab' ? s.progress : 0})`;
      root.querySelector('.ob-progress').hidden = s.state !== 'grab';
      // The fist illustration (from the design) leads the grab step; the pinch scheme reuses the pinch glove.
      const illus = s.state === 'grab' ? (scheme === 'pinch' ? './assets/cursor/pinch.png' : './assets/onboarding/fist.png') : '';
      if (el.illus.getAttribute('src') !== illus) { if (illus) el.illus.src = illus; else el.illus.removeAttribute('src'); }
      el.illus.hidden = !illus;
    }

    // Demonstration ghost: shown when nobody is acting yet, or when the visitor is struggling.
    let demo = '';
    const struggling = s.hint > 0 || !s.present;
    target = s.state === 'touch' || s.state === 'visit' ? target : null;
    if (!s.celebrating) {
      if (s.state === 'grab' && struggling && scheme === 'pinch') { demo = 'pinch-drag'; const c = globeCenter(); place(el.ghost, c.x, c.y); }
      if (s.state === 'touch' || s.needsCard) {
        const p = chooseTarget();
        if (p) {
          place(el.target, p.x, p.y - 22);
          if (struggling) { const c = globeCenter(); demo = 'touch'; place(el.ghost, p.x, p.y - 22); el.ghost.style.setProperty('--fx', `${c.x - p.x}px`); el.ghost.style.setProperty('--fy', `${c.y - p.y + 22}px`); }
        }
      } else if (s.state === 'visit' && !card.hidden && struggling) {
        const r = card.getBoundingClientRect(); demo = 'visit'; place(el.ghost, r.left + r.width * .5, r.top + r.height * .62);
      }
    }
    root.classList.toggle('show-target', !!target && !s.celebrating && (s.state === 'touch' || s.needsCard));
    if (el.ghost.dataset.demo !== demo) el.ghost.dataset.demo = demo;

    for (const e of s.events) if (e === 'success') chime.success(); else if (e === 'step' && s.state !== 'free') chime.step();
    if (s.state === 'free' && lastState !== 'free') document.body.classList.remove('onboarding-on');
    if (s.state !== 'free' && lastState === 'free') document.body.classList.add('onboarding-on');
    lastState = s.state;
  }

  const api = {
    get state() { return flow.state; },
    get active() { return flow.active; },
    allows: (what) => flow.allows(what),
    update(now, input) {
      if (!started && flow.state === 'intro') { started = true; flow.reset(now); }
      mouseMode = !!input.mouseStandIn;
      render(flow.update(now, input));
      const tip = mouseMode ? COPY.mouse[flow.state] || '' : '';
      const node = root.querySelector('.ob-mouse'); if (node.textContent !== tip) node.textContent = tip;
      root.classList.toggle('is-mouse', mouseMode);
    },
    reset() { target = null; flow.reset(performance.now()); },
    skip() { flow.skip(performance.now()); },
    unlockSound: () => chime.unlock(),
    dispose() { root.remove(); document.body.classList.remove('onboarding-on'); delete document.body.dataset.onboarding; },
  };
  if (!enabled) flow.finish(0);
  return api;
}
