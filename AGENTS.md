# AGENTS.md · Somewhere home exploration demo

Read this file and README.md before changing this folder. These instructions apply to this repository and its descendants. User instructions take precedence. This is the active gesture/visit prototype; the sibling `globe-lab/`, the saved visual study and the imported `grab earth demo from codex` reference must not be changed or merged into unless explicitly requested.

## Current task boundary

Keep the existing globe/house visual style and support two comparison schemes:

1. **Fist drag + pinch click** — `FistPinch`, with pinch dragging disabled.
2. **Pinch drag + pinch-release click** — `PinchActions`, with dragging enabled.

The active click is a short pinch followed by release. Index-finger curl/flick clicking and comfort-position calibration are parked experiments, not current features. Do not reactivate them based on old comments, test filenames or their configuration values.

The runtime tracks one hand (`numHands: 1`). Two-hand zoom, control-hand arbitration, room creation, accounts, storage backend and 360-image dewarping are out of scope unless requested. Recognizing a browser camera does not mean its panoramic output is suitable for tracking.

## Run and dependencies

No framework, bundler, package installation or build step is required. `index.html` has an import map for local Three.js r170. Keep the matching `vendor/OrbitControls.js` and `vendor/LICENSE`.

For a portable/standalone checkout, serve **this folder**:

```bash
python3 serve.py 8000
```

Open `http://127.0.0.1:8000/`. The standalone `serve.py` serves this folder, supports another port as its first argument and sets no-cache headers. It works from renamed checkouts; no parent-project server is required. `file://` is not supported.

Camera access needs HTTPS or an accepted localhost origin. Runtime MediaPipe code/WASM/model URLs are in `gesture/config.js`; they currently require internet. Do not replace local maps/assets with temporary Figma URLs. No microphone or video-upload capability is part of this app.

## Architecture and active file map

```text
Camera -> HandTrackingSource -> IntentState -> bridge -> OrbitControls / home visit
                                input        adapter       existing globe
```

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css` | DOM, globe test controls, preview card, room UI and responsive styles. |
| `app.js` | Three.js renderer, globe and 3D houses, settings, mouse picking, frame loop, graphics cleanup, wiring to gestures/visits. |
| `dream-defaults.js` | Saved visual baseline. Browser-local settings can override it. |
| `dream.js`, `neon.js`, `stars.js` | Globe materials and shared star background; avoid visual changes in interaction-only work. |
| `home-scenes.js` | Sample location -> scene/title mapping. Blue and winter scenes coexist. |
| `home-visit.js` | Hover card, card transit grace, room entry, delayed return and lifecycle. |
| `scene-contrast.js` | Compose background layers offscreen and choose text/button ink from local luminance. |
| `gesture/config.js` | Tracking/gesture/focus tunables. Also contains inherited settings unused by this renderer. |
| `gesture/input/HandTrackingSource.js` | Camera start/stop/switch, MediaPipe, landmark validation, palm mapping, left/right region choice and gesture dispatch. |
| `gesture/input/IntentState.js` | Device-independent input snapshot and action queue. |
| `gesture/input/gestures.js` | Borrowed landmark helpers and One-Euro smoothing. |
| `gesture/input/TrackingGate.js` | Reject invalid/clipped/jumping landmarks and require stable re-entry. |
| `gesture/input/FistPinch.js` | Held fist navigation plus click-only pinch. |
| `gesture/input/PinchActions.js` | Pinch thresholds, click/drag decision, click pointer lock and release cancellation. |
| `gesture/camera-devices.js` | Enumerated video-device options and exact-device capture constraints. |
| `gesture/bridge.js` | UI controls, input -> navigation/hover/card/return, device-list refresh. |
| `gesture/orbit-navigation.js` | Feed hand movement into the same bounded orbit used by mouse input. |
| `gesture/onboarding/flow.js` | Onboarding state machine (no DOM): wave detection, step success rules, hint escalation, tracking-loss prompt and `allows()` gating. |
| `gesture/onboarding/Onboarding.js`, `copy.js`, `chime.js`, `onboarding.css` | Onboarding overlay, editable copy, ghost-hand demos, target highlight and confirmation sounds. |
| `gesture/ui/GloveCursor.js` | Illustrated cursor states and palm-aligned image hotspots. Normal/hover/click use the open palm (`assets/cursor/palm.png`, same art as the welcome palm); pinch and grab keep their gloves. No spark lines; active states get a stronger shadow. |
| `gesture/globe/geo.js` | Borrowed math helpers; currently used for cursor damping. |
| `assets/` | Local map data, cursor PNGs and Figma room/icon assets. |
| `tests/*.mjs` | Node checks with local fixtures; no real camera required. |

`FingerClick.js`, `WiperClick.js` and `AutoComfort.js` remain for earlier experiments. `HandTrackingSource` still uses angle helpers/diagnostics, but its current interaction engines are FistPinch and PinchActions. Follow actual imports/calls, not obsolete header comments.

Parts of `gesture/config.js` were copied from the reference demo. In particular, changing inherited `CONFIG.navigation.rotateGain`, camera/render/cluster settings does not necessarily change this app. Active hand rotation is owned by `app.js` OrbitControls and `gesture/orbit-navigation.js`. Search every use before tuning a setting.

## Input contracts

Input sources report intentions rather than changing the globe directly:

```js
intent.register(id, priority);
intent.setState(id, { present, mode: 'aim' | 'navigate', x, y, pinch, hands });
intent.pan(dx, dy); // fractions of the screen
intent.emit('confirm');
const frame = intent.frame(); // consume once per display frame
```

`frame()` consumes queued movement/events. Do not read it twice in the normal render loop or add a second source that also rotates the globe. The scheme-switch method deliberately flushes stale intentions.

Both schemes ultimately produce `confirm` and navigation deltas. The bridge routes a confirmation onto the **card**, onto a focused **house** (by design request, Nov 2026: pinching the house itself opens it), or onto an available return button. With the mouse, a house click still only reveals its card.

## Preserve these tested behaviours

### Stable palm and fresh drag anchors

- All active poses locate the cursor from wrist/knuckle palm centre, never switch between fingertip and palm.
- Align glove artwork around the palm in every active drawing.
- Entering/re-entering grab records a new relative reference. The first grab frame must not turn the globe.
- Tracking loss, rejected jumps, hand-region changes and scheme switches cancel unfinished clicks and clear drag anchors. Reacquisition must not import an old movement delta.

### Upright, bounded rotation

Use the existing OrbitControls path for mouse and hand rotation. The globe's world rotation stays at its visual baseline; do not incrementally multiply camera-relative world quaternions. That previously accumulated roll and felt wrong.

`orbit-navigation.js` calls `_rotateLeft` and `_rotateUp` on the pinned r170 controls. Keep the version/mapping compatible. Preserve Y-up, the polar-angle limits, continuous horizontal rotation, distance and existing damping. The globe can approach either pole but must not cross over and invert. Do not increase rotation gain as an incidental improvement.

### Click/drag separation

- Pinch activation uses the existing palm-normalized gap and index-reach check. Keep click and fist interpretation separate.
- Scheme 1: fist holds for ~430 ms; pinch is click-only. A pinch moved too far or held too long is cancelled, never converted into dragging.
- Scheme 2: pinch movement starts dragging; holding beyond the click window also becomes a drag. Release after any drag must not click, including movement detected on the release frame.
- Current pinch-on/off ratios are **0.3 / 0.3**, by explicit test preference. Click duration is **50–450 ms**, movement threshold **0.018 screen fractions** for scheme 2. Do not silently restore earlier 0.5/0.4 release values or add different hysteresis while fixing another issue.
- Scheme 1 only (Nov 2026, fixing “pinch doesn't work on the first attempt”): because its pinch can never drag, the click is forgiving: `fistPinchClickMaxMs` **1000** (was 450) and `fistPinchMoveTolerance` **0.04** (was 0.018). A pinch already in progress also ignores a momentary fist reading instead of being reset. Scheme 2 keeps the strict values.
- Fresh pinch states wait for fingers to open first. A pending click holds the pointing position so closing fingers does not move the selected target.

### Left/right mapping and tracking

The mapping rectangles use mirrored-preview coordinates, with width `.64` and height `.62`: Left starts at `x=.04`, Right at `x=.32`, both at `y=.30`. Unknown handedness falls back to a centred, lower region. Changes require five confident consistent labels (confidence `.8`). Reset filters/anchor when changing the mapping. Do not resize these regions while testing their position.

The video passed into MediaPipe is unmirrored; preview drawing and pointer mapping mirror coordinates. Validate hand labels on actual camera output before changing mirroring, especially with virtual/360 cameras. Do not infer handedness from which side of the frame a hand occupies.

TrackingGate guards raw camera landmarks before screen clamping. Keep its stable-entry and discontinuity guards; screen clamping alone turns false landmarks into corner jumps.

### Hand onboarding

Shown at the start of every page load (one visitor session); `?tutorial=off` disables it for testing. Order: intro (title over a half-visible earth, 3.2 s from the first frame) → welcome (earth rises to centre; the palm illustration waves once a hand is seen; a wave, or a steady raised hand for 6 s, shows “Hello” for 1.6 s) → make a fist and turn the earth (fist illustration only; scheme 2 shows the pinch glove) → move the hand (open-palm cursor) to touch a home (card stays up 250 ms; visitor-facing copy never mentions the index finger) → first hover on a home turns the live cursor into the pinch glove looping a pinch (`onboarding.cursorDemo` → `GloveCursor` `demo`), with the guide line → pinch the house or its card to visit → room → closing message → free use. Design rules: one hand on screen at a time (the live glove is hidden on the title, wave and grab screens; ghost demos only appear while no hand is visible) and one line of text at a time (hints and the lost-hand warning replace the step line). Each step stays until the gesture succeeds. The bridge must ask `onboarding.allows('rotate'|'hover'|'enter')` before acting; the onboarding never rotates the globe or opens rooms itself. Hints escalate after 9 s and 18 s of *hand-present* time. Copy lives in `copy.js`. Onboarding text and the room title use the Zarathustra typeface (`assets/fonts/Zarathustra.otf`, SIL OFL 1.1 — keep `Zarathustra-OFL.txt` beside it); Georgia is only a fallback. The cursor is magnetic: a focused house pulls the glove `CONFIG.focus.magnet` (0.6) of the way onto it, and focus holds until `releaseFactor` (raised 1.6 → 2.0) pick radii away. The cursor itself still follows the palm. The welcome screen lowers `#stage` with a CSS transform, so hover/picking is disabled there.

### Hover and room lifecycle

- House light switches on at the next render frame, without a gradual activation ramp or waiting for an image. Fade-out can remain soft.
- Card/text appear immediately; unresolved image layers use a fixed-size placeholder. Only the image fades in after loading.
- Retain the ~800 ms transit grace and hold the card while the mouse/hand is over it.
- Preserve front/edge visibility limits and do not select hidden/rear houses.
- Room entry hides the globe UI; ~2 seconds later the return button fades in. Hidden return buttons cannot receive hand confirmation.
- Return keeps camera view, zoom, style settings and scheme. Re-entry restarts the delay; stale callbacks must not reveal controls in a closed room.
- Adaptive contrast samples background layers only, separately behind each text/button region; not every frame and not via screen capture.

### Camera lifecycle

Use `cameraVideoConstraints`: an explicit device gets an exact `deviceId` without an additional front-camera constraint. Do not force a 16:9 output; use actual video dimensions for tracking/debug geometry.

Keep the loading guard, stop-before-restart switch, stale-start generation checks, track cleanup, GPU->CPU tracker fallback, disconnection messaging and refreshed device list. Releasing/recreating a tracking source must not recreate the globe's renderer. Camera switching does not change visual settings or scheme. Audio remains off.

## Current UI and persistence

The page opens in `clean` mode. The footer (Show controls, Save image and mouse instructions) remains hidden. H exposes the operator style panel; C toggles tracking, D toggles diagnostics, Esc leaves a room, T restarts the hand onboarding and N skips its current step. These are operator controls, not tutorial steps.

- `home-globe-gestures-v1`: visual settings.
- `home-gesture-mode-v1`: selected scheme (`fist` or `pinch`).
- `home-gesture-auto-comfort-v1`: retained experiment preference; the constructor currently disables automatic comfort calibration regardless.

A new origin/browser does not inherit a tester's saved settings. Do not overwrite `dream-defaults.js` from personal browser adjustments unless requested.

## Assets, portability and scope

Reuse the existing scenes and icons. Ljubljana retains the original blue room; selected sample markers use the winter composition. The current scene content/place labels are illustrative, not a backend of real submissions. Keep the local white outline SVG at intrinsic dimensions inside its scaled artwork group. Keep vendor licence and map data with distributions.

The globe started from the team's visual study. IntentState, landmark helpers, camera pipeline and glove assets originated in the supplied reference gesture demo and were adapted here. Do not replace this app with that reference renderer/marker system.

Before publishing, run `python3 tools/stamp-version.py`: it versions every script/stylesheet in `index.html` (and nested ES-module imports through the import map) by content hash, so GitHub Pages' 10-minute browser cache never serves stale code. Don't hand-edit the `?v=` stamps.

For a future standalone/GitHub export, package the demo source plus assets/vendor and docs; exclude development screenshots and unrelated parent-project files. Keep the standalone `./` header link and portable `serve.py`; do not reintroduce dependencies on sibling project folders. Use relative runtime assets so a project subpath works. Publishing has its own task; do not invent repository or hosted links in documentation.

## Verification

From this folder, run relevant active tests after behaviour changes; run all for a handoff:

```bash
for test in tests/*.mjs; do
  node "$test" || exit 1
done
```

Active tests cover `onboarding-flow`, `camera-devices`, `pinch-actions`, `palm-anchor`, `tracking-gate`, `orbit-navigation`, `home-visit`, and `scene-contrast`. `finger-click`, `wiper-click`, and `auto-comfort` are historical tests; passing them does not mean those features are enabled.

Check syntax of modified browser modules, which do not rely on a Node package manifest:

```bash
node --input-type=module --check < path/to/modified-file.js
```

For UI/interaction changes, verify in the browser: initial simplified UI; both schemes; camera-menu visibility; hover -> card -> room -> delayed return; both scenes; upright turns/pole limits; no console errors. Test real camera tracking and device switching where hardware is available, and report what could not be physically verified. Do not claim the unit tests validate a 360 camera or real gesture accuracy.

For documentation-only work, validate commands/paths and distinguish current behaviour from retained experiments; no webcam activation is required. Keep README and this file aligned when changing user-facing behaviour. Tune one factor at a time, and record the old/new value and test result.
