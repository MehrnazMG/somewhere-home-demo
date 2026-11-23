// All tunable values for the installation live here, so the team can
// adjust feel during playtests without touching the logic.

export const CONFIG = {
  render: {
    maxPixelRatio: 1.5, // sharpness vs. speed on high-resolution screens
    msaa: 2, // edge smoothing samples (4 = smoother edges, slower)
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.82 },
    // Direction the "sun" comes from, in world space (fixed relative to the viewer,
    // so the side facing the room is always lit with a terminator on the right).
    sunDirection: [-0.55, 0.3, 0.78],
    clouds: false, // drifting cloud haze over the surface
    surfaceHaze: 0, // blue haze over the edge of the land (0 = none, 1 = full)
    atmosphereGlow: true, // thin blue halo outside the Earth's edge
  },

  camera: {
    fov: 35,
    distanceFar: 3.35, // whole Earth, dominating the screen
    distanceLocation: 2.25, // when a place is opened
  },

  navigation: {
    rotateGain: 1.0, // 1 = the spot under your hand follows your hand exactly; higher turns faster
    followRate: 16, // how tightly the globe follows input (higher = more direct, lower = floatier)
    travelRate: 2.4, // how gracefully it flies to a place (lower = slower)
    inertiaFriction: 5, // how quickly the spin settles after letting go (higher = stops sooner)
    flickSpeed: 1.2, // radians/second: slower than this when letting go → the globe stops dead
    pitchLimit: 1.05, // radians (~60°) up or down
    idleSpinSpeed: 0.04, // radians per second when nobody is present
    initialView: { lat: 26, lon: 30 },
  },

  focus: {
    // Holding still to select. Off: selecting is a pinch (or a mouse click).
    dwellEnabled: false,
    pickRadiusPx: 72, // how close the pointer must be to a light (scaled with screen height)
    dwellMarker: 1.4, // seconds of holding to open a place
    dwellHome: 0.9, // seconds of holding on a home to read its story
    dwellReturn: 1.2, // seconds of holding on "back to the world"
    magnet: 0.6, // how strongly the glove is pulled onto a focused house (0 = none, 1 = snaps). Used by bridge.js.
    releaseFactor: 2.0, // a chosen house stays chosen until the pointer is this many pick radii away (was 1.6; raised for the magnetic feel)
  },

  presence: {
    idleAfterSeconds: 12, // no one present → attract mode (slow spin, gentle invitation)
    closeLocationAfterSeconds: 30, // a place left open with nobody around closes itself
  },

  hands: {
    enabled: true,
    autoStart: false,
    visionModule: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
    wasmRoot: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    // Only the central part of the camera image maps to the full screen,
    // so nobody has to stretch to reach the edges.
    activeRegion: { x: 0.18, y: 0.14, width: 0.64, height: 0.62 },
    // Mirrored camera-preview coordinates. Keep width/height identical to the original.
    handedRegions: {Left: {x:.04,y:.30}, Right: {x:.32,y:.30}},
    handednessFrames: 5, // require a consistent label before switching the region
    handednessConfidence: .8,
    // Pinch (thumb + index touching) = click. Values are thumb–index gap ÷ palm size.
    reacquireAfterMs: 140, // reset movement after a tracking gap
    maxPalmJump: 0.22, // reject a sudden jump across the camera image
    reacquireFrames: 3, // require a consistent position before accepting a new hand
    reacquireRadius: 0.07,
    autoComfortMs: 1500, // observe a relaxed hand once per camera session
    autoComfortRadius: .025, // tolerated raw-camera palm movement
    autoComfortGapMs: 140, // interrupted tracking restarts observation
    pinchDragDistance: .018, // screen-fraction palm travel distinguishes a drag from a click
    pinchClickMinMs: 50,
    pinchClickMaxMs: 450, // a held pinch becomes a drag, not a release click
    // Scheme 1 (fist drag + pinch click) only: pinch can't drag there, so the click is forgiving.
    fistPinchClickMaxMs: 1000, // was 450 (shared). Slow first-time pinches were being cancelled.
    fistPinchMoveTolerance: .04, // was .018 (shared). Palm drift while closing the fingers cancelled clicks.
    wiperStraightAngle: 135, // allow a naturally relaxed index during a flick
    wiperDownAngle: 20, // straight index swings away from its resting direction
    wiperReturnAngle: 9, // return near the original direction to confirm
    wiperRestAngle: 6,
    wiperDownMs: 240, // distinguish a quick flick from slow aiming
    wiperReturnMs: 550,
    wiperPalmTolerance: .05, // whole-hand movement cancels a click
    clickArmMs: 180, // stable pointing before a click can begin
    clickMinMs: 70, // ignore a single noisy frame
    clickMaxMs: 430, // held curl becomes a grab, never a click
    clickCooldownMs: 280, // require a fresh pointing action between clicks
    grabHoldMs: 430, // a fist must settle before it moves the globe
    indexStraightAngle: 150,
    indexBentAngle: 115,
    pinchOn: 0.3, // closer than this → pinched
    pinchOff: 0.3, // further than this → released; smaller opening needed
    fistReach: 0.85, // index tip closer to the palm than this (× palm size) → a fist, not a pinch
    // Grabbing (fist) and moving turns the world, like holding a globe.
    grabGain: 1.0,
    grabDeadzone: 0.0015, // fist movements smaller than this (screen fraction) are ignored
    poseStableFrames: 4, // frames a new pose must hold before the mode switches
    lostAfterMs: 450, // hand missing this long → participant considered gone
    filter: { minCutoff: 0.9, beta: 2.0, dCutoff: 1.0 }, // One-Euro smoothing: lower minCutoff = steadier when still
  },

  textures: {
    // Tried in order. Drop higher-resolution maps into assets/textures/ with the
    // same file names to use them (and to run fully offline).
    sources: [
      './assets/textures/',
      'https://cdn.jsdelivr.net/npm/three-globe@2.37.4/example/img/',
      'https://cdn.jsdelivr.net/npm/three-globe/example/img/',
      'https://unpkg.com/three-globe/example/img/',
    ],
    timeoutMs: 8000, // give up on a source after this long and try the next
    day: 'earth-blue-marble.jpg',
    night: 'earth-night.jpg',
    water: 'earth-water.png',
    bump: 'earth-topology.png',
  },

  clusters: {
    radiusKm: 60, // places closer than this to each other share one light on the globe
    ringDegrees: 14, // radius of the ring on the globe (the camera adjusts, so this mostly sets how much map shows around it)
    ringScreenFraction: 0.33, // the ring's radius as a share of the screen's shorter side (the camera comes as close as needed)
  },


  ui: {
    cursor: 'glove', // 'glove' – the illustrated glove · 'hand' – 3D skeleton hand · 'knob' – a single knob of light
    gloveSize: 104, // glove cursor height in px at 1080p (scales with screen height)
    handScale: 0.6, // size of the 3D hand on screen (1 ≈ a real hand at arm's length on a large projection)
    handFollow: 24, // how tightly the 3D hand follows the tracked pose (higher = snappier, lower = smoother)
  },

  colors: {
    lamp: [1.0, 0.72, 0.42], // the warm light of a shared home
    atmosphere: [0.36, 0.6, 1.0],
    cityLights: [0.55, 0.72, 1.0],
  },
};
