import "./style.css";

import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
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
  70,
  window.innerWidth / window.innerHeight,
  0.2,
  500
);

camera.position.set(0, 0, 0);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const worldUp = new THREE.Vector3(0, 0, 1);

const minHeight = 2.2;
const controls = new OrbitControls(camera, renderer.domElement);

const sceneUrl =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/sangiovanni.ksplat";

const viewer = new GaussianSplats3D.Viewer({
  renderer: renderer,
  camera: camera,
  selfDrivenMode: true,
  threeScene: scene,
  sphericalHarmonicsDegree: 0,
  useBuiltInControls: false,
  rootElement: document.body,
});

viewer
  .addSplatScene(sceneUrl, {
    streamView: true,
    showLoadingUI: true,
    splatAlphaRemovalThreshold: 100,
    progressiveLoad: true,
  })
  .then(() => {
    viewer.start();
  });

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
    case "Space":
      moveUp = true;
      break;
    case "ShiftLeft":
      moveDown = true;
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

let vrControllers: XRInputSource[] = [];
let vrMovement = {
  forward: 0,
  right: 0,
  turn: 0,
};

const setupVRControllers = () => {
  const session = renderer.xr.getSession();

  if (!session) return;

  session.addEventListener("inputsourceschange", () => {
    vrControllers = [];

    for (const inputSource of session.inputSources) {
      if (inputSource.gamepad) {
        vrControllers.push(inputSource);
      }
    }
  });
};

const updateVRInput = () => {
  if (!renderer.xr.isPresenting) return;

  vrMovement = { forward: 0, right: 0, turn: 0 };

  for (const controller of vrControllers) {
    if (!controller.gamepad) continue;

    const gamepad = controller.gamepad;
    const axes = gamepad.axes;

    // Most VR controllers have:
    // Left controller: axes[2] = left/right, axes[3] = forward/back
    // Right controller: axes[2] = left/right, axes[3] = forward/back

    if (controller.handedness === "left" && axes.length >= 4) {
      // Left joystick for movement
      vrMovement.right += axes[2]; // X-axis: left/right strafe
      vrMovement.forward -= axes[3]; // Y-axis: forward/back (inverted)
    }

    if (controller.handedness === "right" && axes.length >= 4) {
      // Right joystick for turning
      vrMovement.turn += axes[2]; // X-axis: turn left/right
      // You could also use axes[3] for other controls like up/down
    }
  }

  // Apply deadzone to prevent drift
  const deadzone = 0.1;
  if (Math.abs(vrMovement.forward) < deadzone) vrMovement.forward = 0;
  if (Math.abs(vrMovement.right) < deadzone) vrMovement.right = 0;
  if (Math.abs(vrMovement.turn) < deadzone) vrMovement.turn = 0;
};

const updateCamera = () => {
  const now = performance.now();
  if (now - lastUpdateTime < UpdateInterval) return;
  lastUpdateTime = now;

  // Update VR input if in VR mode
  if (renderer.xr.isPresenting) {
    updateVRInput();
  }

  const hasKeyboardInput =
    moveForward || moveBackward || moveLeft || moveRight || moveUp || moveDown;
  const hasVRInput =
    Math.abs(vrMovement.forward) > 0 ||
    Math.abs(vrMovement.right) > 0 ||
    Math.abs(vrMovement.turn) > 0;

  if (!hasKeyboardInput && !hasVRInput) {
    return;
  }

  // Get camera's forward direction and flatten to horizontal plane
  camera.getWorldDirection(direction);
  const forward = direction.clone().setZ(0).normalize();

  // Check if forward vector is valid
  if (forward.length() === 0) {
    const cameraMatrix = camera.matrixWorld;
    forward
      .set(-cameraMatrix.elements[8], -cameraMatrix.elements[9], 0)
      .normalize();
  }

  right.crossVectors(forward, worldUp).normalize();

  let newPosition = camera.position.clone();

  // Handle keyboard input (existing code)
  if (moveForward) newPosition.addScaledVector(forward, CameraSpeed);
  if (moveBackward) newPosition.addScaledVector(forward, -CameraSpeed);
  if (moveRight) newPosition.addScaledVector(right, CameraSpeed);
  if (moveLeft) newPosition.addScaledVector(right, -CameraSpeed);
  if (moveUp) newPosition.add(new THREE.Vector3(0, 0, CameraSpeed));
  if (moveDown) newPosition.add(new THREE.Vector3(0, 0, -CameraSpeed));

  // Handle VR joystick input
  if (renderer.xr.isPresenting) {
    // Movement with left joystick
    newPosition.addScaledVector(forward, vrMovement.forward * CameraSpeed);
    newPosition.addScaledVector(right, vrMovement.right * CameraSpeed);

    // Snap turning with right joystick (optional - you can make this smooth)
    if (Math.abs(vrMovement.turn) > 0.8) {
      const turnAmount = vrMovement.turn > 0 ? -Math.PI / 6 : Math.PI / 6; // 30 degrees
      const currentRotation = new THREE.Euler().setFromQuaternion(
        camera.quaternion
      );
      currentRotation.z += turnAmount;
      camera.setRotationFromEuler(currentRotation);
    }
  }

  // Ground collision detection
  const groundHeight = getGroundHeight(newPosition);
  if (groundHeight !== null) {
    const targetZ = groundHeight + minHeight;
    if (Math.abs(targetZ - camera.position.z) < 1.5) {
      newPosition.z = targetZ;
    }
  }

  camera.position.copy(newPosition);

  // Only update controls if not in VR mode
  if (!renderer.xr.isPresenting) {
    controls.target.copy(camera.position).addScaledVector(direction, 1);
    controls.update();
  }
};

// renderer.xr.addEventListener("sessionstart", () => {
//   NumFrames = 30;
//   CameraSpeed = 0.05;

//   const session = renderer.xr.getSession();
//   const gl = renderer.getContext();
//   if (session) {
//     session.updateRenderState({
//       baseLayer: new XRWebGLLayer(session, gl, {
//         framebufferScaleFactor: 0.3, // Very aggressive - try 0.2 if still laggy
//       }),
//     });
//   }
//   renderer.xr.setFoveation(1.0);
//   controls.enabled = false;
//   setupVRControllers();
// });

// renderer.xr.addEventListener("sessionend", () => {
//   scene.position.set(0, 0, 0);
//   controls.enabled = true;
//   vrControllers = [];
// });

const render = () => {
  updateCamera();
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(render);
