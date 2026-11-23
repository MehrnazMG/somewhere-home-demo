// All onboarding words in one place, so the team can edit copy without touching logic.
// Each step: key word on its own line (as in the wireframe), then two escalating hints.
export const COPY = {
  welcome: {
    title: 'Let’s Share our Stories of Home',
    call: 'Wave your hand to begin',
    seen: 'Hello! Now wave side to side.',
    hello: 'Hello.',
    cameraOff: 'Camera is off · click anywhere or press C to start',
    cameraLoading: 'Starting the camera…',
  },
  top: 'Let’s get you started.',
  grab: {
    fist: {
      title: ['Make a fist', 'and grab to rotate the globe'],
      hints: ['Close your hand into a fist and hold it for a moment.',
        'Make a fist, wait until the glove closes, then move your hand slowly left or right.'],
    },
    pinch: {
      title: ['Pinch', 'and drag to rotate the globe'],
      hints: ['Bring your thumb and index finger together and keep them closed.',
        'Keep the pinch closed, then move your whole hand slowly left or right.'],
    },
    success: 'The world turns with you.',
  },
  touch: {
    title: ['Point', 'to touch a home'],
    hints: ['Move your hand until the glove rests on a glowing house.',
      'No house nearby? Turn the earth first, then hold your hand over one.'],
    success: 'Someone lives here.',
  },
  visit: {
    title: ['Pinch', 'to visit'],
    needsCard: 'Point at a home again to open its card.',
    hints: ['Move onto the card, then pinch your thumb and index finger and let go.',
      'Keep your hand still on the card. A quick pinch and release opens the home.'],
  },
  return: 'Pinch “Back to globe” when you’re ready to leave.',
  done: ['You’re ready.', 'Explore the homes of the world.'],
  mouse: {
    intro: 'No camera here · you can use the mouse instead',
    welcome: 'No camera here · wiggle the mouse side to side to wave',
    grab: 'No camera here · drag with the mouse to grab',
    touch: 'No camera here · move the mouse over a house',
    visit: 'No camera here · click the card to pinch',
    return: 'No camera here · click “Back to globe”',
  },
  lost: 'Raise your hand so the camera can see it.',
};
