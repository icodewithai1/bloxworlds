// Bundle only the Babylon.js pieces we use into one ESM file
const esbuild = require('esbuild');
const fs = require('fs');
fs.writeFileSync('babylon-entry.js', `
export { Engine } from '@babylonjs/core/Engines/engine.js';
export { Scene } from '@babylonjs/core/scene.js';
export { Vector3, Color3, Color4, Quaternion, Matrix, Axis, Space } from '@babylonjs/core/Maths/math.js';
export { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
export { Mesh } from '@babylonjs/core/Meshes/mesh.js';
export { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
export { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
export { ShadowGeneratorSceneComponent } from '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';

`);
esbuild.build({
  entryPoints: ['babylon-entry.js'],
  bundle: true, format: 'esm', minify: true,
  outfile: '../vendor/babylon.min.js',
  target: 'es2020'
}).then(() => {
  const kb = (fs.statSync('../vendor/babylon.min.js').size/1024).toFixed(0);
  console.log('vendor/babylon.min.js:', kb, 'KB');
  fs.unlinkSync('babylon-entry.js');
});
