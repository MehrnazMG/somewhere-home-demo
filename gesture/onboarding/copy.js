// All onboarding words in one place, so the team can edit copy without touching logic.
// Design rules: every message is ONE line, and only ONE message is on screen at a time.
// Hints and warnings replace the step's line; they never appear underneath it.
export const COPY = {
  intro: 'Let’s Share our Stories of Home',
  welcome: {
    call: 'Wave your hand to begin',
    hello: 'Hello',
  },
  grab: {
    fist: { title: 'Make a fist and grab to rotate the globe',
      hints: ['Close your hand into a fist and hold it for a moment', 'Keep the fist closed and move your hand slowly left or right'] },
    pinch: { title: 'Pinch and drag to rotate the globe',
      hints: ['Pinch and keep it closed', 'Hold the pinch and move your hand slowly left or right'] },
    success: 'Well done',
  },
  touch: {
    title: 'Move your hand to touch a home',
    hints: ['Hold your hand over a glowing house', 'Turn the earth if no house is close, then hold over one'],
    success: 'Someone lives here',
  },
  // Shown with the big pinch illustration the first time a visitor's hand rests on a home.
  visit: {
    title: 'Pinch your fingers together, then let go to visit',
    needsCard: 'Move your hand back onto a home',
    hints: ['Keep your hand on the home and pinch quickly', 'Touch your thumb to your fingertips, then open your hand'],
  },
  done: 'You’re ready to explore',
  lost: 'Raise your hand so the camera can see it',
  camera: {
    off: 'Camera is off · click anywhere or press C to start',
    loading: 'Starting the camera…',
  },
};
