import { SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";

const path =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/tile1.ksplat";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const butterfly = new SplatMesh({ url: path });
butterfly.quaternion.set(1, 0, 0, 0);
butterfly.position.set(0, 0, -3);
scene.add(butterfly);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  butterfly.rotation.y += 0.01;
});
