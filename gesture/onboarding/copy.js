// All onboarding words in one place, so the team can edit copy without touching logic.
// Design rules: every message is ONE line, and only ONE message is on screen at a time.
// Hints and warnings replace the step's line; they never appear underneath it.
export const COPY = {
  intro: 'Let’s Share our Stories of Home',
  welcome: {
    call: 'Wave your hand to begin',
    hello: 'Hello',
  },
  touch: {
    title: 'Use your index finger to touch a home',
    hints: ['Hold your finger over a glowing house', 'Turn the earth if no house is close, then hold over one'],
    success: 'Someone lives here',
  },
  visit: {
    title: 'Pinch to visit',
    needsCard: 'Touch a home again, then pinch',
    hints: ['Pinch your thumb and index finger on the house or its card', 'Keep your hand still, pinch quickly and let go'],
  },
  done: 'You’re ready to explore',
  lost: 'Raise your hand so the camera can see it',
  camera: {
    off: 'Camera is off · click anywhere or press C to start',
    loading: 'Starting the camera…',
  },
};
