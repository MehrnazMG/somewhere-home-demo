import * as THREE from 'three';

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * Converts latitude/longitude to a point on the globe, matching how
 * THREE.SphereGeometry wraps an equirectangular texture
 * (lon 0 → +X, lon 90°E → −Z, north → +Y).
 */
export function latLonToVector3(lat, lon, radius = 1, out = new THREE.Vector3()) {
  const phi = lat * D2R;
  const lam = lon * D2R;
  return out.set(
    radius * Math.cos(phi) * Math.cos(lam),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(lam)
  );
}

/** Globe yaw (rotation about Y) that brings a longitude to face the viewer. */
export function yawForLongitude(lon) {
  return -Math.PI / 2 - lon * D2R;
}

/** Globe pitch (rotation about X) that brings a latitude to the centre. */
export function pitchForLatitude(lat) {
  return lat * D2R;
}

/** Returns the angle equivalent to `to` that is closest to `from`, for shortest-path turns. */
export function nearestAngle(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return from + d;
}

/** Frame-rate independent exponential smoothing. */
export function damp(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function formatCoordinates(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
}
