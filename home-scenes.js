// Illustrative demo entries: both rooms remain available on the same globe.
const winterLocations=new Set([
  'Amsterdam, Netherlands','Taipei, Taiwan','Melbourne, Australia',
  'Marrakesh, Morocco','Mexico City, Mexico','Valparaíso, Chile'
]);
export function describeHome(home){
  const location=home.userData.name;
  const scene=winterLocations.has(location)?'winter':'blue';
  const title=scene==='winter'?'A warm room, with winter just outside.':location==='Ljubljana, Slovenia'?'This is my cozy Slovenia sitting room.':'My home feels cold and empty.';
  return {location,scene,title};
}
