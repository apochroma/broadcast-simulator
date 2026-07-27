import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Renders a real exported glTF camera model (instead of the hand-built CSS 3D
// rig) inside a canvas, turning it to match node.ptz.pan/tilt exactly like
// the CSS rig and the equirectangular panorama canvas already do. Loaded
// on-demand and repainted synchronously from app.js's own PTZ animation
// loops (joystick drag, preset-recall easing) rather than running its own
// requestAnimationFrame loop, so there's only ever one animation clock.
const loader = new GLTFLoader();
const modelCache = new Map(); // url -> Promise<THREE.Object3D> (template scene, cloned per instance)
const instances = new Map(); // nodeId -> instance

function loadModel(url) {
  if (!modelCache.has(url)) {
    modelCache.set(url, loader.loadAsync(url).then((gltf) => gltf.scene));
  }

  return modelCache.get(url);
}

function disposeInstance(nodeId) {
  const instance = instances.get(nodeId);

  if (!instance) {
    return;
  }

  instance.renderer.dispose();
  instances.delete(nodeId);
}

function createInstance(nodeId, canvas, url) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  camera.position.set(0, 0.15, 2.3);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(1.5, 2.5, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.45);
  rim.position.set(-2, 1, -1.5);
  scene.add(rim);

  const instance = {
    nodeId,
    canvas,
    renderer,
    scene,
    camera,
    panPivot: null,
    tiltPivot: null,
    ready: false,
    pendingPan: 0,
    pendingTilt: 0
  };

  loadModel(url).then((templateScene) => {
    const modelRoot = templateScene.clone(true);

    scene.add(modelRoot);
    instance.panPivot = modelRoot.getObjectByName("PanPivot") ?? modelRoot;
    instance.tiltPivot = modelRoot.getObjectByName("TiltPivot") ?? instance.panPivot;

    // The current export has two hierarchy issues for a proper pan/tilt rig:
    // TiltPivot is a sibling of PanPivot instead of nested under it (so tilt
    // wouldn't turn together with pan), and LensBody hangs directly off
    // PanPivot instead of TiltPivot (so it would pan but never tilt). Both
    // are fixed here — attach() preserves world transform — rather than
    // requiring another Blender export round-trip.
    if (instance.tiltPivot !== instance.panPivot && instance.tiltPivot.parent !== instance.panPivot) {
      instance.panPivot.attach(instance.tiltPivot);
    }

    const lensBody = modelRoot.getObjectByName("LensBody");

    if (lensBody && instance.tiltPivot && lensBody.parent !== instance.tiltPivot) {
      instance.tiltPivot.attach(lensBody);
    }

    frameCamera(instance, modelRoot);
    instance.ready = true;
    paint(instance);
  }).catch((error) => {
    console.error("PTZ 3D model failed to load:", url, error);
  });

  return instance;
}

// Frames the camera from the model's actual bounding box instead of a
// hardcoded distance, so it stays correctly composed as the geometry is
// refined and re-exported without needing manual re-tuning every time.
function frameCamera(instance, modelRoot) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const fitDistance = (maxDimension / 2) / Math.tan(THREE.MathUtils.degToRad(instance.camera.fov) / 2) * 1.4;

  instance.camera.position.set(center.x, center.y, center.z + fitDistance);
  instance.camera.lookAt(center);
  instance.camera.updateProjectionMatrix();
}

function resize(instance) {
  const rect = instance.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  instance.renderer.setSize(width, height, false);
  instance.camera.aspect = width / height;
  instance.camera.updateProjectionMatrix();
}

function paint(instance) {
  if (!instance.ready) {
    return;
  }

  // Negated to match the CSS rig's convention (rotateX(-tilt)): pushing the
  // joystick up must tilt the lens up, not down.
  instance.panPivot.rotation.y = THREE.MathUtils.degToRad(instance.pendingPan);
  instance.tiltPivot.rotation.x = THREE.MathUtils.degToRad(-instance.pendingTilt);
  resize(instance);
  instance.renderer.render(instance.scene, instance.camera);
}

function sync(nodeId, canvas, url, panDeg, tiltDeg) {
  let instance = instances.get(nodeId);

  if (!instance || instance.canvas !== canvas) {
    if (instance) {
      disposeInstance(nodeId);
    }

    instance = createInstance(nodeId, canvas, url);
    instances.set(nodeId, instance);
  }

  instance.pendingPan = panDeg;
  instance.pendingTilt = tiltDeg;
  paint(instance);
}

function pruneExcept(liveNodeIds) {
  Array.from(instances.keys())
    .filter((nodeId) => !liveNodeIds.has(nodeId))
    .forEach(disposeInstance);
}

window.PtzCameraModel3D = { sync, pruneExcept };

// app.js's initial bootstrap render() can run before this module finishes
// loading (module scripts execute after classic scripts), which would leave
// any model canvas blank until the next unrelated render. Trigger one more
// repaint pass now that the API actually exists.
if (typeof window.renderPtzCameraModels === "function") {
  window.renderPtzCameraModels();
}
