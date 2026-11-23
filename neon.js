import * as THREE from 'three';

// Genuine open geometry: no sphere or depth-only shell conceals the rear wires.
export function createNeonGlobe(parent){
 const root=new THREE.Group();root.visible=false;parent.add(root);
 const grid=new THREE.Group();root.add(grid);
 let coastGeometry=null,gridGeometry=null;
 function material(color,radius,opacity,glow=false){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:glow?THREE.AdditiveBlending:THREE.NormalBlending,
   uniforms:{color:{value:new THREE.Color(color)},radius:{value:radius},opacity:{value:opacity},rear:{value:.22},power:{value:1}},
   vertexShader:`uniform float radius;varying vec3 vNormal,vView;varying float facing;void main(){vec3 p=position+normal*(radius-.004);vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;facing=dot(normalize(normalMatrix*normalize(position)),normalize(-mv.xyz));gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`uniform vec3 color;uniform float opacity,rear,power;varying vec3 vNormal,vView;varying float facing;void main(){float roundness=pow(max(dot(normalize(vNormal),normalize(vView)),0.),.65);float depth=mix(rear,1.,smoothstep(-.12,.12,facing));gl_FragColor=vec4(color*power,opacity*roundness*depth);\n#include <colorspace_fragment>\n}`});
 }
 const cageMat=material('#806a50',.0024,.9);
 const coreMat=material('#ffe8bc',.004,1,true),innerMat=material('#ffad62',.013,.24,true),outerMat=material('#ffad62',.033,.085,true);
 // Merge the tube segments so each light layer needs only one draw call.
 function makeTubes(paths){const positions=[],normals=[],indices=[];let offset=0;
  for(const points of paths){if(points.length<3)continue;const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');const geometry=new THREE.TubeGeometry(curve,Math.max(points.length*2,24),.004,5,false);
   const p=geometry.attributes.position.array,n=geometry.attributes.normal.array;for(const v of p)positions.push(v);for(const v of n)normals.push(v);for(const i of geometry.index.array)indices.push(i+offset);offset+=p.length/3;geometry.dispose();}
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setIndex(indices);return result;
 }
 function point(lat,lon,r=2){const p=THREE.MathUtils.degToRad(lon+180),t=THREE.MathUtils.degToRad(lat);return new THREE.Vector3(-Math.cos(p)*Math.cos(t),Math.sin(t),Math.sin(p)*Math.cos(t)).multiplyScalar(r)}
 const gridPaths=[];
 for(let lat=-75;lat<=75;lat+=15){const path=[];for(let lon=-180;lon<=180;lon+=3)path.push(point(lat,lon));gridPaths.push(path)}
 for(let lon=-180;lon<180;lon+=15){const path=[];for(let lat=-90;lat<=90;lat+=3)path.push(point(lat,lon));gridPaths.push(path)}
 gridGeometry=makeTubes(gridPaths);grid.add(new THREE.Mesh(gridGeometry,cageMat));
 return {root,setLand(data){
  if(coastGeometry)return;
  const paths=[];
  for(const f of data.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
   for(const poly of polys)for(const ring of poly){const points=ring.map(([lon,lat])=>point(lat,lon,2.018));if(points.length>3)paths.push(points)}}
  coastGeometry=makeTubes(paths);
  for(const mat of [outerMat,innerMat,coreMat]){const mesh=new THREE.Mesh(coastGeometry,mat);mesh.frustumCulled=false;root.add(mesh)}
 },apply(config){root.visible=config.viewMode==='neon';grid.visible=config.grid;
  cageMat.uniforms.color.value.set(config.cageColor);cageMat.uniforms.opacity.value=config.cageBrightness;
  const color=new THREE.Color(config.neonColor);coreMat.uniforms.color.value.copy(color).lerp(new THREE.Color('#fff8e8'),.6);innerMat.uniforms.color.value.copy(color);outerMat.uniforms.color.value.copy(color);
  for(const [mat,r]of [[coreMat,.004],[innerMat,.013],[outerMat,.033]]){mat.uniforms.radius.value=r*config.neonWidth;mat.uniforms.rear.value=config.rearVisibility;mat.uniforms.power.value=config.neonGlow;}
  cageMat.uniforms.rear.value=config.rearVisibility;
 }};
}
