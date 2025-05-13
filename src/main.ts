import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LCCRender } from "./sdk/lcc-0.5.0.js";

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.setClearColor(0xffffff);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.up.set(0, 0, 1);
camera.position.set(0, -5, 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

LCCRender.load(
  {
    camera,
    scene,
    dataPath:
      "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/LCC_Results/",
    renderLib: THREE,
    canvas: renderer.domElement,
    renderer: renderer,
  },
  (mesh: unknown) => {
    console.log("lcc loaded", mesh);
  },
  (percent: number) => {
    console.log("Lcc object loading: " + (percent * 100).toFixed(1) + "%");
  },
  () => {
    console.error("Lcc object loading failure");
  }
);

const render = () => {
  LCCRender.update();
  renderer.render(scene, camera);
};

const animate = () => {
  renderer.setAnimationLoop(() => {
    render();
  });
};

animate();
