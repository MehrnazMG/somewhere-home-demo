# Somewhere · Home exploration demo

A local/browser prototype for exploring people's sense of home through a 3D globe. Point at a glowing house, open its preview card, visit a shared room, and return to the globe.

This handoff is intended for team testing, including an external 360 camera. It contains **two gesture schemes for comparison**. It now opens with a **hand onboarding** (see below). It does not include home creation, a backend, two-hand interaction, or gesture-based zoom.

Handoff baseline: **20 November 2026**. This README describes the current implementation; earlier experiments still present in the source are not necessarily active. Coding agents should also read [AGENTS.md](AGENTS.md).

## Open the demo

### Local copy: no installation or build step

You need a desktop browser with WebGL and camera access, Python 3 to serve the files, and an internet connection for the hand tracker. Use desktop Chrome as the initial test browser and record which browser/version you actually use.

1. Open a terminal **in this demo folder**, the folder containing `index.html`.
2. Start a local server:

   ```bash
   python3 serve.py 8000
   ```

   On Windows, use `py -3` instead of `python3` if needed.
3. Open **http://127.0.0.1:8000/** on that same computer.
4. Keep the terminal open. Stop the server with `Ctrl+C` when finished.

This repository is the standalone demo: run the command from its root. The included server always serves the folder containing `serve.py`, even if the checkout is renamed. It sends no-cache headers so source edits are not mixed with cached modules. Do not double-click `index.html`: modules, maps and camera access require a web server.

If port 8000 is busy, use `python3 serve.py 8001` and open the address it prints. You can also use another static web server, but hard-refresh after edits if it caches modules.

### Hosted page

A static HTTPS host, such as GitHub Pages, can serve this folder. No application server is needed. Open the [online demo](https://zzpaths33-cyber.github.io/somewhere-home-demo/) or download the code from the [public repository](https://github.com/zzpaths33-cyber/somewhere-home-demo). Camera access requires HTTPS or a browser-recognized local origin such as localhost; opening an ordinary HTTP LAN address is not equivalent to localhost.

## Start hand control and choose a camera

1. Connect the camera and complete any manufacturer setup needed for it to appear as a browser video device.
2. Click **Enable hand control** and allow camera access. The demo does not request microphone access.
3. In **Camera**, choose the intended device. Device names may be hidden until permission is granted. If the list only shows Default camera, enable access first and check again.
4. Open **Camera view** to confirm that the feed really comes from the selected camera. It also shows landmarks, the interaction rectangle, hand label and gesture state.
5. Choose a **Gesture scheme**, then test the same tasks with each scheme.

Selecting another camera while tracking is running stops the old camera/tracker and starts the selected one. The globe, visual settings and gesture scheme are retained. The menu is unavailable while startup is in progress. Connecting/disconnecting devices refreshes the list.

### Important for the 360 camera test

The current demo accepts the video stream exposed by the browser. It **does not** dewarp an equirectangular image, choose a direction inside a panorama, stitch lenses, or convert a proprietary camera output into a webcam.

If the camera has a webcam mode, virtual-camera output, or manufacturer preview crop, test the intended output and record which mode was used. A successful connection does not prove that the hand tracker can recognize hands in the resulting image. Check hand size, distortion and tracking in Camera view before assessing interaction quality.

The requested resolution is ideally 960 × 540, not a forced output size. A camera may provide a different resolution/aspect ratio. The tracker reads the actual video dimensions.

## Compare the two gesture schemes

Both schemes use a stable **palm position** for the cursor and dragging. Changing hand shape should not move the cursor from fingertip to palm.

| Scheme | Rotate the globe | Select a card or return button |
| --- | --- | --- |
| **1 · Fist drag + pinch click** | Hold a fist briefly, then move the hand | Make a short, nearly stationary pinch and release |
| **2 · Pinch drag + pinch-release click** | Pinch and move the hand | Make a short, nearly stationary pinch and release |

A drag must **never** also click when released. In scheme 1, moving or holding a pinch cancels the click; it does not become a pinch drag. In scheme 2, moving or holding a pinch enters dragging. A short click currently lasts 50–450 ms; a fist settles for about 430 ms before dragging.

The pinch-on and pinch-release thresholds are currently both **0.3**, measured as finger gap relative to palm size, not centimetres. This deliberately makes release require little opening. Record unintended repeated presses or releases if they occur.

Switching schemes cancels any unfinished action. In a fresh pinch state, open the fingers before starting a new pinch. The browser remembers the selected scheme.

### Hand onboarding

Every page load starts a short tutorial for the next visitor, following the team wireframe and Meta's hand-onboarding guidance:

1. **Intro** — “Let’s Share our Stories of Home” (Roboto 46 bold) with the earth half-visible at the bottom.
2. **Welcome** — after ~3 s the earth rises to the centre and the text becomes “Wave your hand to begin” with a waving palm. A side-to-side wave starts; a steady raised hand also starts after ~4.5 s.
3. **Make a fist and grab to rotate the globe** (scheme 2: **Pinch and drag to rotate the globe**), with the fist illustration — a progress line fills as the visitor turns the globe. Houses can't be selected yet.
4. **Point to touch a home** — one house is ringed; done when its card opens.
5. **Pinch to visit** — done when the room opens. In the room, a reminder explains how to go back.
6. **You're ready** — then free exploration.

Each step waits until the visitor succeeds. A looping ghost glove demonstrates the gesture when no hand is visible or after ~9 s of trying; hints become more specific at ~9 s and ~18 s. If the hand leaves the camera mid-lesson, the hint line asks for it back. Success plays a short sound (browsers may need one click on the page first).

Operator keys: **T** restarts the tutorial for the next visitor, **N** skips the current step. Open the page with `?tutorial=off` to test without it. If camera permission was already granted, the camera starts by itself; otherwise click the welcome screen or press **C**. All tutorial wording is in `gesture/onboarding/copy.js`.

### Visit a home

1. Move the palm cursor toward a house until it lights up.
2. A preview card and its text appear immediately. Images can load afterward inside a fixed-size placeholder.
3. Move onto the **card**, then pinch and release to enter. Clicking the house itself only reveals its card.
4. Look around the room. After about **2 seconds**, **Back to globe** fades in.
5. Point at that button and pinch-release to return. The globe view and settings are preserved.

Cards have a short grace period while travelling from a house onto its card. Mouse hover/click and dragging are available as a fallback. The mouse wheel changes viewing distance; no hand-based zoom is implemented.

### Hand position and rotation

- The tracker currently detects **one hand**. It may follow a hand holding a phone instead of the intended control hand. Automatic control-hand arbitration is not implemented.
- The interaction area shifts lower and toward the detected left/right hand. It is a mapping area, not a hard boundary for detecting a hand.
- Palm tracking, hand re-entry checks and fresh drag anchors reduce jumps when changing pose or returning to the camera frame.
- The globe stays upright, stops at the north/south pole limits and cannot flip over. Horizontal rotation is continuous.
- Automatic/manual comfortable-position calibration and index-finger clicking are **not active** in this version.

## Controls and sample content

The test interface keeps Gesture scheme, Camera, Enable/Disable hand control and Camera view. The old Show controls, Save image and mouse-instruction footer are hidden.

| Key | Action |
| --- | --- |
| `C` | Toggle camera tracking |
| `D` | Toggle camera diagnostics |
| `H` | Show/hide the operator style panel |
| `Esc` | Leave an open room |
| `T` | Restart the hand onboarding (next visitor) |
| `N` | Skip the current onboarding step |

Avoid changing visual or tracking parameters between comparison runs unless that parameter is the test variable.

There are two illustrative room scenes:

- **Blue room:** Ljubljana and several other markers. Some entries say “My home feels cold and empty.”
- **Winter landscape + warm house:** Amsterdam, Taipei, Melbourne, Marrakesh, Mexico City and Valparaíso.

These are demo scenes attached to sample place names, not verified submissions from those places. The card matches the selected scene. Room title/location/return controls choose light or dark colours from the background behind each component. The title uses a local Georgia fallback because the Figma Zarathustra font is not included.

## Suggested test and feedback record

Use the same camera mode, seating position and tasks for both schemes. Change one factor at a time.

1. Confirm camera selection and feed format.
2. Try left and right hands; check the interaction rectangle and hand label.
3. Rotate sideways and vertically, stop, release and grab again.
4. Take the globe to both pole limits and reverse direction.
5. Hover a house, move onto its card, enter and return. Try both room scenes.
6. Move a hand out of the frame and bring it back. Check for cursor jumps, unwanted turns or clicks.
7. Note accidental grabs, failed releases, missed clicks and arm comfort. A phone held in the other hand is a useful known-limit test.

Copy this record for each run:

```text
Date / tester:
Code version or commit:
Computer / operating system / browser version:
Camera name / driver or virtual-camera software:
Camera output mode / actual resolution / aspect ratio:
Gesture scheme / hand used:
Approximate distance and lighting:
Task:
Expected result:
Observed result / frequency:
Diagnostic hand label and gesture state:
Any settings changed:
Screenshot or recording, if useful:
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Camera permission denied | Browser site permission and operating-system camera permission; retry Enable hand control. |
| Camera missing/busy | Check webcam/virtual-camera mode and driver; close other apps using it; reconnect and choose the device again. |
| Only Default camera is listed | Grant camera access first; device names/IDs may be restricted before permission. |
| Camera feed works but tracking does not | Check internet access to MediaPipe/model downloads, hand size/distortion in the 360 output, lighting and Camera view. |
| Wrong hand controls the globe | Only one hand is tracked; remove the other hand from view for this baseline test. |
| Hand controls feel unreachable | Check the Left/Right diagnostic label and camera mirroring. Record reversed labels rather than changing global mirroring blindly. |
| Click does nothing | Ensure the card/button is the target; make a brief pinch-release without dragging or holding. The room's return button is intentionally delayed. |
| Globe is blank or graphics pause | Try reloading; check WebGL availability and the console. The renderer includes recovery handling, but hardware/driver issues still need testing. |
| Different appearance on another computer | Visual settings are saved per browser and origin. A new origin/device starts from `dream-defaults.js`, not another tester's saved settings. |
| Changes do not appear | Hard-refresh; confirm which folder and server URL are being used. |

## Dependencies and checks

Runtime: plain HTML/CSS/JavaScript modules; local Three.js **r170** and OrbitControls; MediaPipe Tasks Vision **0.10.14** and the hand model load externally. Globe maps, room imagery and glove images are local. There is no npm installation or build step for running the demo. Video frames are processed in the browser; this application does not upload recordings or use a backend.

Node.js is needed only for automated checks, not for running the page. The checks have been run with Node 24. From the demo folder:

```bash
for test in tests/*.mjs; do
  node "$test" || exit 1
done
```

The finger-curl, finger-flick and automatic-calibration tests cover retained experiments, **not active UI features**. The active regression checks include camera selection, pinch click/drag separation, palm anchoring, tracking re-entry, bounded rotation, home visiting and scene contrast. Automated checks do not certify real-camera accuracy, a 360-camera setup, or the end-to-end gesture feel.

For source responsibilities, constraints and modification guidance, continue with [AGENTS.md](AGENTS.md).
