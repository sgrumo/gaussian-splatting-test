import "./style.css";

import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
import * as THREE from "three";
const path =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/tile1.ksplat";

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0xffffff);
renderer.xr.enabled = true;
renderer.xr.setFoveation(0.5);

document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.2,
  500
);

camera.position.set(-8, 4, -4);
const worldUp = new THREE.Vector3(0, 1, 0);
camera.up.copy(worldUp);
camera.lookAt(new THREE.Vector3(-2, 3, -10));

// const controls = new OrbitControls(camera, renderer.domElement);

const viewer = new GaussianSplats3D.Viewer({
  // cameraUp: [0, 1, 0],
  // initialCameraPosition: [-8, 4, -4],
  // initialCameraLookAt: [-2, 3, -10],
  renderer: renderer,
  camera: camera,
  sphericalHarmonicsDegree: 2,
  splatAlphaRemovalThreshold: 5,
  dynamicScene: true,
  webXRSessionInit: {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    requiredFeatures: ["local-floor"],
  },
  enableSIMDInSort: true,
  showLoadingUI: true,
});

viewer
  .addSplatScene(path, {
    progressiveLoad: false,
    splatAlphaRemovalThreshold: 5,
    rotation: [1, 0, 0, 0],
  })
  .then(() => {
    viewer.start();
    console.log("Press 'I' key to toggle debug info");
  });

const render = () => {
  renderer.render(scene, camera);
  viewer.update();
  viewer.render(renderer);
};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);
