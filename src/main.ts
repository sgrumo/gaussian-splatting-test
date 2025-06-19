import "./style.css";

import {
  SparkControls,
  SparkRenderer,
  SplatEdit,
  SplatEditRgbaBlendMode,
  SplatEditSdf,
  SplatEditSdfType,
  SplatMesh,
  XrHands,
} from "@sparkjsdev/spark";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

const path =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/tile1.ksplat";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.up.set(0, 1, 0);
camera.lookAt(0, 0, 0);
camera.position.set(-7, 5, -5);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const controls = new SparkControls({
  canvas: renderer.domElement,
});

const localFrame = new THREE.Group();
scene.add(localFrame);

const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });
localFrame.add(spark);
localFrame.add(camera);

const splatMesh = new SplatMesh({
  url: path,
});

splatMesh.quaternion.set(1, 0, 0, 0);
splatMesh.scale.setScalar(1);

scene.add(splatMesh);

const vrButton = VRButton.createButton(renderer, {
  optionalFeatures: ["hand-tracking"],
  requiredFeatures: ["local-floor"],
});

let xrHands: XrHands | null = null;
if (vrButton) {
  // WebXR is available, so show the button
  document.body.appendChild(vrButton);

  xrHands = new XrHands();
  const handMesh = xrHands.makeGhostMesh();
  handMesh.editable = false;
  localFrame.add(handMesh);
}

const edit = new SplatEdit({
  rgbaBlendMode: SplatEditRgbaBlendMode.ADD_RGBA,
  sdfSmooth: 0.02,
  softEdge: 0.02,
});

localFrame.add(edit);
const sdfs = new Map();

let lastCameraPos = new THREE.Vector3(0, 0, 0);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.body.appendChild(renderer.domElement);

renderer.setAnimationLoop((time: number, xrFrame: XRFrame) => {
  if (lastCameraPos.distanceTo(camera.position) > 0.5) {
    localFrame.position.copy(camera.position).multiplyScalar(-1);
  }
  lastCameraPos.copy(camera.position);

  if (xrHands) {
    // Updates the xrHands object with coordinates
    // and also updates ghost mesh
    xrHands.update({ xr: renderer.xr, xrFrame });

    // Create interactor SDFs for each hand tip
    for (const hand of ["left", "right"]) {
      for (const [index, tip] of ["t3", "i4", "m4", "r4", "p4"].entries()) {
        const key = `${hand}-${tip}`;
        if (!sdfs.has(key)) {
          const sdf = new SplatEditSdf({
            type: SplatEditSdfType.SPHERE,
            radius: 0.03,
            color: new THREE.Color(
              index % 5 < 3 ? 1 : 0,
              (index % 5) % 2,
              index % 5 > 1 ? 1 : 0
            ),
            opacity: 0,
          });
          sdfs.set(key, sdf);
        }

        const sdf = sdfs.get(key);
        sdf.displace.set(
          0.01 * Math.sin(time * 0.007 + index * 1),
          0.01 * Math.sin(time * 0.002 + index * 2),
          0.01 * Math.sin(time * 0.009 + index * 3)
        );

        if (xrHands.hands[hand] && xrHands.hands[hand][tip]) {
          // Make the SDF follow the hand tips
          sdf.position.copy(xrHands.hands[hand][tip].position);
          edit.add(sdf);
        } else {
          // Remove the SDF when the hand is not detected
          edit.remove(sdf);
        }
      }
    }
  }

  renderer.render(scene, camera);
  controls.update(camera);
});

// document.body.appendChild(renderer.domElement);
// document.body.appendChild(VRButton.createButton(renderer));

// renderer.xr.enabled = true;
// renderer.xr.setReferenceSpaceType("local");
// renderer.xr.setFoveation(1);

// const splat = new SplatMesh({ url: path });
// splat.quaternion.set(1, 0, 0, 0);
// splat.position.set(0, 0, 0);
// scene.add(splat);

// const NumFrames = 20;
// const UpdateInterval = 1000 / NumFrames;
// let lastUpdateTime = 0;

// renderer.setAnimationLoop(() => {
//   const now = performance.now();
//   if (now - lastUpdateTime < UpdateInterval) return;
//   lastUpdateTime = now;

//   renderer.render(scene, camera);
//   controls.update();
// });
