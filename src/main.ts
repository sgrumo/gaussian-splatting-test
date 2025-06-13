import "./style.css";

import { Splat, SplatLoader } from "@pmndrs/vanilla";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const raycaster = new THREE.Raycaster();

let collisionMeshes: THREE.Mesh[] = [];

const getGroundHeight = (position: THREE.Vector3): number | null => {
  if (collisionMeshes.length === 0) return null;

  const castOrigin = position.clone().add(new THREE.Vector3(0, 0, 0.5));
  raycaster.set(castOrigin, new THREE.Vector3(0, 0, -1));

  const intersects = raycaster.intersectObjects(collisionMeshes, false);
  return intersects.length > 0 ? intersects[0].point.z : null;
};

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0xffffff);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.up.set(0, 1, 0);
camera.position.set(5, 5, 3);

const minHeight = 2.2;
const controls = new OrbitControls(camera, renderer.domElement);

const loader = new SplatLoader(renderer);

const sceneSplat = await loader.loadAsync(
  `assets/sangiovanni-cut3-compressed.splat`
);

const shoe1 = new Splat(sceneSplat, camera, { alphaTest: 0.1 });
shoe1.position.set(0, 0, 0);
scene.add(shoe1);

controls.enableDamping = false;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;
renderer.xr.setFoveation(0.5);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let CameraSpeed = 0.1;
let lastUpdateTime = 0;

let NumFrames = 60;
const UpdateInterval = 1000 / NumFrames;

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
  const now = performance.now();
  if (now - lastUpdateTime < UpdateInterval) return;
  lastUpdateTime = now;

  if (!moveForward && !moveBackward && !moveLeft && !moveRight) {
    return;
  }

  camera.getWorldDirection(direction);
  const forward = direction.clone().setZ(0).normalize();
  right.crossVectors(forward, up).normalize();

  let newPosition = camera.position.clone();

  if (moveForward) newPosition.addScaledVector(forward, CameraSpeed);
  if (moveBackward)
    newPosition.addScaledVector(forward.clone().negate(), CameraSpeed);
  if (moveRight) newPosition.addScaledVector(right, CameraSpeed);
  if (moveLeft)
    newPosition.addScaledVector(right.clone().negate(), CameraSpeed);
  if (moveUp) newPosition.add(new THREE.Vector3(0, 0, CameraSpeed));
  if (moveDown) newPosition.add(new THREE.Vector3(0, 0, -CameraSpeed));

  const groundHeight = getGroundHeight(newPosition);
  if (groundHeight !== null) {
    const targetZ = groundHeight + minHeight;
    if (Math.abs(targetZ - camera.position.z) < 1.5) {
      newPosition.z = targetZ;
    }
  }

  // if (lccObject.hasCollision()) {
  // const center = {
  //   x: newPosition.x,
  //   y: newPosition.y,
  //   z: newPosition.z,
  // };
  // const radius = 1;
  // const noDelta = true;
  // let intersectResult = lccObject.intersectsSphere({
  //   center,
  //   radius,
  //   noDelta,
  // });
  // if (!intersectResult.hit) {
  camera.position.copy(newPosition);

  controls.target.copy(camera.position).addScaledVector(direction, 1);
  controls.update();
  // }
  // }
};

// renderer.xr.addEventListener("sessionstart", () => {
//   const desiredPosition = camera.position.clone();

//   const offsetPosition = new THREE.Vector3(
//     desiredPosition.x,
//     desiredPosition.y,
//     desiredPosition.z
//   );

//   const transform = new THREE.Matrix4().makeTranslation(
//     offsetPosition.x,
//     offsetPosition.y,
//     offsetPosition.z
//   );
//   const referenceSpace = renderer.xr.getReferenceSpace();
//   if (referenceSpace) {
//     renderer.xr.setReferenceSpaceType("local-floor");
//   }
// });

renderer.xr.addEventListener("sessionstart", () => {
  NumFrames = 30;
  CameraSpeed = 0.05;
  const session = renderer.xr.getSession();

  if (session) {
    const gl = renderer.getContext();
    const layer = session.renderState.baseLayer;
    if (layer) {
      session.updateRenderState({
        baseLayer: new XRWebGLLayer(session, gl, {
          framebufferScaleFactor: 0.7,
        }),
      });
    }
  }

  const offset = camera.position.clone();
  scene.position.set(-offset.x, -offset.y, -offset.z);

  controls.enabled = false;
});

renderer.xr.addEventListener("sessionend", () => {
  scene.position.set(0, 0, 0);
  controls.enabled = true;
});

const render = () => {
  updateCamera();
  // LCCRender.update();
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(render);
