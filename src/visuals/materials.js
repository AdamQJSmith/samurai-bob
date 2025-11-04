export function makeGradientTexture() {
  const data = new Uint8Array([
    255, 255, 255,
    200, 200, 200,
    140, 140, 140,
    90, 90, 90
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const gradientMap = makeGradientTexture();

export function makeToonMaterial(hex) {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hex),
    gradientMap
  });
}

