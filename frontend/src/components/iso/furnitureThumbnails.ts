/**
 * Furniture thumbnail generator.
 *
 * The Decorate palette used to show every item as a generic "+" button, so
 * players couldn't tell a Fridge from a Microwave without reading the label.
 * This module renders each catalog GLB to a small PNG *once* — using a single
 * shared offscreen WebGL renderer — and caches the data URL. The palette then
 * shows those as plain <img>, giving a real 3D-rendered preview of each piece
 * without spinning up a live <Canvas> (and a WebGL context) per button, which
 * would blow the browser's context budget next to the editor's own scene.
 *
 * One renderer, reused for every model, torn down once the work drains.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

const SIZE = 192; // square px — crisp on retina at the ~36px display size

// path → rendered PNG data URL (module-level so it survives remounts)
const cache = new Map<string, string>();
// path → in-flight render, so concurrent callers share one render pass
const inflight = new Map<string, Promise<string>>();

let renderer: THREE.WebGLRenderer | null = null;
let loader: GLTFLoader | null = null;
let liveJobs = 0;

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      // Required so toDataURL() can read the pixels after render().
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

/** Free the shared GPU resources once nothing is left to render. */
function maybeDisposeRenderer() {
  if (liveJobs <= 0 && renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}

/**
 * Render `path` (a .glb URL) to a PNG data URL. Cached + de-duped, so calling
 * it repeatedly for the same model is cheap.
 */
export function getFurnitureThumbnail(path: string): Promise<string> {
  const cached = cache.get(path);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(path);
  if (pending) return pending;

  liveJobs += 1;
  const job = (async () => {
    if (!loader) loader = new GLTFLoader();
    const gltf = await loader.loadAsync(path);

    const model = gltf.scene.clone(true);

    // Centre the model on the origin and read its size so we can frame any
    // piece — tiny books or a tall fridge — at a consistent fill.
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const scene = new THREE.Scene();
    scene.add(model);
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    // Three-quarter "showroom" angle so depth reads clearly.
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const dist = maxDim * 2.3;
    cam.position.set(dist * 0.85, dist * 0.7, dist * 0.95);
    cam.lookAt(0, 0, 0);

    const r = getRenderer();
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');

    cache.set(path, url);
    disposeObject(model);
    return url;
  })();

  inflight.set(path, job);
  return job.finally(() => {
    inflight.delete(path);
    liveJobs -= 1;
    maybeDisposeRenderer();
  });
}
