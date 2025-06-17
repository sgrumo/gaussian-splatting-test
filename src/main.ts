import "./style.css";

import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
import * as THREE from "three";
const path =
  "https://quinck-open.s3.eu-west-1.amazonaws.com/gaussian-splatting/tile1.splat";

// const conf = {
//   "tile1.splat": {
//     cameraUp: [0, 1, 0],
//     initialCameraPosition: [-8, 4, -4],
//     initialCameraLookAt: [-2, 3, -10],
//   },
//   "tile2.splat": {
//     cameraUp: [0, 1, 0],
//     initialCameraPosition: [-8, 4, -4],
//     initialCameraLookAt: [-2, 3, -10],
//   },
//   "tile3.splat": {
//     cameraUp: [0, 1, 0],
//     initialCameraPosition: [-8, 4, -4],
//     initialCameraLookAt: [-2, 3, -10],
//   },
// };

const viewer = new GaussianSplats3D.Viewer({
  cameraUp: [0, 1, 0],
  initialCameraPosition: [-8, 4, -4],
  initialCameraLookAt: [-2, 3, -10],
  sphericalHarmonicsDegree: 2,
  dynamicScene: true,
  webXRMode: GaussianSplats3D.WebXRMode.VR,
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

const uiGroup = new THREE.Group();

const createVRButton = (_text: string, position: THREE.Vector3) => {
  // Create a simple 3D button
  const buttonGeometry = new THREE.BoxGeometry(1, 0.3, 0.1);
  const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
  const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
  button.position.copy(position);

  // Add text (you'd need a text geometry library for proper text)
  const textGeometry = new THREE.PlaneGeometry(0.8, 0.2);
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.z = 0.06;
  button.add(textMesh);

  return button;
};

const nextButton = createVRButton("Next Room", new THREE.Vector3(2, 1.5, -3));
// nextButton.userData.onClick = () => this.nextScene();
uiGroup.add(nextButton);

// Previous room button
const prevButton = createVRButton(
  "Previous Room",
  new THREE.Vector3(-2, 1.5, -3)
);
// prevButton.userData.onClick = () => this.previousScene();
uiGroup.add(prevButton);

viewer.threeScene.add(uiGroup);
