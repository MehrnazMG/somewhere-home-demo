// The pinned r170 OrbitControls owns damping, Y-up and pole limits for BOTH inputs.
// Match its mouse-drag mapping: both axes use the viewport height.
// Keeping rotation out of world.quaternion prevents cumulative roll and inversion.
export function orbitHandPan(controls, dx, dy, width, height) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || height <= 0) return;
  const gain = controls.rotateSpeed;
  controls._rotateLeft(2 * Math.PI * dx * width / height * gain);
  controls._rotateUp(2 * Math.PI * dy * gain);
}
