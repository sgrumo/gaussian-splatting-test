import "./style.css";

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LCCRender } from "./sdk/lcc-0.5.0.js";

const test_lcc_url =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/san_giovanni/";

const raycaster = new THREE.Raycaster();

let collisionMeshes: THREE.Mesh[] = [];

const getGroundHeight = (position: THREE.Vector3): number | null => {
  if (collisionMeshes.length === 0) return null;

  const castOrigin = position.clone().add(new THREE.Vector3(0, 0, 0.5)); // start slightly above
  raycaster.set(castOrigin, new THREE.Vector3(0, 0, -1));

  const intersects = raycaster.intersectObjects(collisionMeshes, false);
  return intersects.length > 0 ? intersects[0].point.z : null;
};

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
camera.position.set(0, -5, 2.2); // instead of 3
const minHeight = 2.2; // desired camera height above ground
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

const lccObject = LCCRender.load(
  {
    camera,
    scene,
    dataPath: test_lcc_url,
    renderLib: THREE,
    canvas: renderer.domElement,
    renderer: renderer,
  },
  () => {
    console.log("✅ LCC scene loaded.");
  },
  undefined,
  () => console.error("❌ LCC load error")
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const CAMERA_SPEED = 0.1;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

const direction = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 0, 1);

document.onkeydown = (ev: KeyboardEvent) => {
  switch (ev.code) {
    case "KeyA":
    case "ArrowLeft":
      moveLeft = true;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = true;
      break;
    case "KeyW":
    case "ArrowUp":
      moveForward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = true;
      break;
  }
};

document.onkeyup = (ev: KeyboardEvent) => {
  switch (ev.code) {
    case "KeyA":
    case "ArrowLeft":
      moveLeft = false;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = false;
      break;
    case "KeyW":
    case "ArrowUp":
      moveForward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = false;
      break;
    case "Space":
      moveUp = false;
      break;
    case "ShiftLeft":
      moveDown = false;
      break;
  }
};

const updateCamera = () => {
  camera.getWorldDirection(direction);
  const forward = direction.clone().setZ(0).normalize();
  right.crossVectors(forward, up).normalize();

  let newPosition = camera.position.clone();

  if (moveForward) newPosition.addScaledVector(forward, CAMERA_SPEED);
  if (moveBackward)
    newPosition.addScaledVector(forward.clone().negate(), CAMERA_SPEED);
  if (moveRight) newPosition.addScaledVector(right, CAMERA_SPEED);
  if (moveLeft)
    newPosition.addScaledVector(right.clone().negate(), CAMERA_SPEED);
  if (moveUp) newPosition.add(new THREE.Vector3(0, 0, CAMERA_SPEED));
  if (moveDown) newPosition.add(new THREE.Vector3(0, 0, -CAMERA_SPEED));

  const groundHeight = getGroundHeight(newPosition);
  if (groundHeight !== null) {
    const targetZ = groundHeight + minHeight;
    if (Math.abs(targetZ - camera.position.z) < 1.5) {
      newPosition.z = targetZ;
    }
  }

  if (lccObject.hasCollision()) {
    const center = {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
    };
    const radius = 1;
    const noDelta = true;
    let intersectResult = lccObject.intersectsSphere({
      center,
      radius,
      noDelta,
    });
    if (!intersectResult.hit) {
      console.log("Collision occurs, delta: ", intersectResult.delta);
      camera.position.copy(newPosition);

      controls.target.copy(camera.position).addScaledVector(direction, 1);
      controls.update();
    }
  }
};

const render = () => {
  updateCamera();
  LCCRender.update();
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(render);
