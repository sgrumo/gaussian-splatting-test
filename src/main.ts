import "./style.css";

import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
const path = "assets/tile1.splat";

const conf = {
  "tile1.splat": {
    cameraUp: [0, 1, 0],
    initialCameraPosition: [-8, 4, -4],
    initialCameraLookAt: [-2, 3, -10],
  },
  "tile2.splat": {
    cameraUp: [0, 1, 0],
    initialCameraPosition: [-8, 4, -4],
    initialCameraLookAt: [-2, 3, -10],
  },
  "tile3.splat": {
    cameraUp: [0, 1, 0],
    initialCameraPosition: [-8, 4, -4],
    initialCameraLookAt: [-2, 3, -10],
  },
};

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
