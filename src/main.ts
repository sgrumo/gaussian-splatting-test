import "./style.css";

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LCCRender } from "./sdk/lcc-0.5.0.js";

// const test_lcc_url =
//   "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/LCC_Results/";
const test_lcc_url = "http://localhost:5173/lcc/san_giovanni";

const raycaster = new THREE.Raycaster();
const COLLISION_DISTANCE = 0.5;

let lccGroup: THREE.Group | null = null;
let collisionMeshes: THREE.Mesh[] = [];

const checkCollision = (
  position: THREE.Vector3,
  direction: THREE.Vector3
): boolean => {
  if (!lccGroup || collisionMeshes.length === 0) return false;

  raycaster.set(position, direction.clone().normalize());
  const intersection = LCCRender.raycast(raycaster);
  console.log(intersection);

  if (intersection) {
    const distance = position.distanceTo(
      new THREE.Vector3(intersection.x, intersection.y, intersection.z)
    );
    return distance < COLLISION_DISTANCE;
  }

  return false;
};

const extractCollisionMeshes = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      collisionMeshes.push(child);
    }
  });
};

const getGroundHeight = (position: THREE.Vector3): number | null => {
  if (!lccGroup || collisionMeshes.length === 0) return null;

  const downDirection = new THREE.Vector3(0, 0, -1);
  raycaster.set(position, downDirection);

  const intersects = raycaster.intersectObjects(collisionMeshes, false);

  if (intersects.length > 0) {
    return intersects[0].point.z;
  }

  return null;
};

const loadLCC = (
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  dataPath: string
) => {
  LCCRender.load(
    {
      camera,
      scene,
      dataPath,
      renderLib: THREE,
      canvas: renderer.domElement,
      renderer: renderer,
    },
    (mesh: THREE.Group) => {
      setTimeout(() => {
        extractCollisionMeshes(mesh);
      }, 500);
    },
    (percent: number) => {
      console.log("Lcc object loading: " + (percent * 100).toFixed(1) + "%");
    },
    () => {
      console.error("Lcc object loading failure");
    }
  );
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
camera.position.set(0, -5, 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

loadLCC(camera, scene, renderer, test_lcc_url);

const handleResize = () => {
  const { innerWidth, innerHeight } = window;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
};

window.addEventListener("resize", handleResize);

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

const updateCamera = () => {
  camera.getWorldDirection(direction);

  const forwardDirection = direction.clone();
  forwardDirection.z = 0;
  forwardDirection.normalize();

  right.crossVectors(forwardDirection, up).normalize();

  let newPosition = camera.position.clone();

  if (moveForward) {
    const testPosition = newPosition
      .clone()
      .addScaledVector(forwardDirection, CAMERA_SPEED);
    if (!checkCollision(testPosition, forwardDirection)) {
      newPosition = testPosition;
    }
  }
  if (moveBackward) {
    const backwardDirection = forwardDirection.clone().negate();
    const testPosition = newPosition
      .clone()
      .addScaledVector(backwardDirection, CAMERA_SPEED);

    if (!checkCollision(testPosition, backwardDirection)) {
      newPosition = testPosition;
    }
  }
  if (moveRight) {
    const testPosition = newPosition
      .clone()
      .addScaledVector(right, CAMERA_SPEED);
    if (!checkCollision(testPosition, right)) {
      newPosition = testPosition;
    }
  }
  if (moveLeft) {
    const leftDirection = right.clone().negate();
    const testPosition = newPosition
      .clone()
      .addScaledVector(leftDirection, CAMERA_SPEED);
    if (!checkCollision(testPosition, leftDirection)) {
      newPosition = testPosition;
    }
  }
  if (moveUp) {
    newPosition.z += CAMERA_SPEED;
  }
  if (moveDown) {
    newPosition.z -= CAMERA_SPEED;
  }

  const groundHeight = getGroundHeight(newPosition);
  if (groundHeight !== null) {
    const minHeightAboveGround = 1.8;
    newPosition.z = Math.max(
      newPosition.z,
      groundHeight + minHeightAboveGround
    );
  }

  // visualizeCollision(camera.position, direction, collisionDetected);

  camera.position.copy(newPosition);

  controls.target.copy(camera.position).addScaledVector(direction, 1);
  controls.update();
};

const render = () => {
  updateCamera();
  LCCRender.update();
  renderer.render(scene, camera);
};

const animate = () => {
  renderer.setAnimationLoop(() => {
    render();
  });
};

animate();
