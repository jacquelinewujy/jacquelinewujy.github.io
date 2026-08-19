// Interactive Rhino model viewer for the Architecture page only.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const viewer = document.querySelector('#architecture-model-viewer');

if (viewer) {
  const status = viewer.querySelector('.model-viewer-status');
  const modelPath = viewer.dataset.modelPath;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let renderer;
  let scene;
  let camera;
  let controls;
  let model;
  let loader;
  let animationFrameId = 0;
  let viewerIsVisible = true;

  const showError = () => {
    viewer.classList.add('has-error');
    status.textContent = 'We couldn’t load the interactive model. Please try again later.';
  };

  const requestRender = () => {
    if (!viewerIsVisible || animationFrameId || !renderer || !scene || !camera) return;
    animationFrameId = window.requestAnimationFrame(renderFrame);
  };

  const renderFrame = () => {
    animationFrameId = 0;
    const dampingIsActive = controls?.update() ?? false;
    renderer.render(scene, camera);
    if (dampingIsActive) requestRender();
  };

  const resizeViewer = () => {
    if (!renderer || !camera) return;
    const width = viewer.clientWidth;
    const height = viewer.clientHeight;
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  };

  const applyEffectiveRhinoVisibility = (object) => {
    const layers = object.userData?.layers;
    if (!Array.isArray(layers)) {
      return {
        matchedLayers: 0,
        hiddenObjects: 0,
        hiddenByParentLayer: 0,
        hiddenByObject: 0,
        hiddenByMode: 0,
      };
    }

    const layerById = new Map(layers.map((layer) => [layer.id, layer]));
    const layerVisibilityCache = new Map();
    const getEffectiveLayerVisibility = (layer, visited = new Set()) => {
      if (!layer) return true;
      if (layerVisibilityCache.has(layer.id)) return layerVisibilityCache.get(layer.id);
      if (visited.has(layer.id)) return true;

      visited.add(layer.id);
      const ownVisibility = layer.visible === undefined ? true : Boolean(layer.visible);
      const parentLayer = layerById.get(layer.parentLayerId);
      const effectiveVisibility = ownVisibility && getEffectiveLayerVisibility(parentLayer, visited);
      layerVisibilityCache.set(layer.id, effectiveVisibility);
      return effectiveVisibility;
    };

    const modeIsHidden = (mode) => {
      const modeName = typeof mode === 'string' ? mode : mode?.name;
      return mode?.hidden === true || (typeof modeName === 'string' && /hidden/i.test(modeName));
    };

    let matchedLayers = 0;
    let hiddenObjects = 0;
    let hiddenByParentLayer = 0;
    let hiddenByObject = 0;
    let hiddenByMode = 0;
    const rows = [];
    const violationsBeforeCorrection = [];

    object.traverse((child) => {
      const attributes = child.userData?.attributes;
      if (!attributes) return;

      const layerIndex = Number(attributes.layerIndex);
      const layer = Number.isInteger(layerIndex) ? layers[layerIndex] : undefined;
      const parentLayer = layerById.get(layer?.parentLayerId);
      const layerVisible = layer?.visible === undefined ? true : Boolean(layer.visible);
      const parentLayersVisible = parentLayer ? getEffectiveLayerVisibility(parentLayer) : true;
      const objectVisible = attributes.visible === undefined ? true : Boolean(attributes.visible);
      const hiddenMode = modeIsHidden(attributes.mode);
      const loaderVisible = child.visible !== false;
      const effectiveVisibility = loaderVisible
        && objectVisible
        && !hiddenMode
        && layerVisible
        && parentLayersVisible;

      const row = {
        objectName: child.name || attributes.name || '',
        objectId: attributes.id || attributes.objectId || '',
        layerIndex: attributes.layerIndex,
        layerName: layer?.name || '',
        layerVisible,
        parentLayer: parentLayer?.name || '',
        parentLayerVisible: parentLayer?.visible,
        allParentLayersVisible: parentLayersVisible,
        attributesVisible: attributes.visible,
        attributesMode: attributes.mode?.name || attributes.mode || '',
        objectVisible,
        hiddenMode,
        loaderVisible,
        resultingThreeVisible: effectiveVisibility,
      };

      if (loaderVisible && (!objectVisible || hiddenMode || !layerVisible || !parentLayersVisible)) {
        violationsBeforeCorrection.push(row);
      }

      child.visible = effectiveVisibility;
      rows.push(row);
      if (layer) matchedLayers += 1;
      if (!child.visible) hiddenObjects += 1;
      if (layerVisible && !parentLayersVisible) hiddenByParentLayer += 1;
      if (!objectVisible) hiddenByObject += 1;
      if (hiddenMode) hiddenByMode += 1;
    });

    const violationsAfterCorrection = rows.filter((row) => (
      row.resultingThreeVisible
      && (!row.objectVisible
        || row.hiddenMode
        || !row.layerVisible
        || !row.allParentLayersVisible)
    ));

    console.info('Rhino objects visible after effective visibility:');
    console.table(rows.filter((row) => row.resultingThreeVisible));
    console.info('Rhino visibility violations before correction:');
    console.table(violationsBeforeCorrection);
    console.info('Rhino visibility violations after correction:');
    console.table(violationsAfterCorrection);

    return {
      matchedLayers,
      hiddenObjects,
      hiddenByParentLayer,
      hiddenByObject,
      hiddenByMode,
      violationsBeforeCorrection: violationsBeforeCorrection.length,
      violationsAfterCorrection: violationsAfterCorrection.length,
    };
  };

  const applyMissingMaterialFallbacks = (object) => {
    let neutralMaterial;
    const getNeutralMaterial = () => {
      if (!neutralMaterial) {
        neutralMaterial = new THREE.MeshStandardMaterial({
          color: 0xd8d5cf,
          roughness: 0.82,
          metalness: 0,
          side: THREE.DoubleSide,
        });
      }
      return neutralMaterial;
    };

    let fallbackCount = 0;

    object.traverse((child) => {
      if (!child.isMesh) return;
      const isUsableMaterial = (material) => {
        if (!material?.isMaterial) return false;
        if (!material.color) return true;
        return [material.color.r, material.color.g, material.color.b].every(Number.isFinite);
      };

      if (Array.isArray(child.material)) {
        if (child.material.length === 0) {
          child.material = getNeutralMaterial();
          fallbackCount += 1;
          return;
        }

        let needsFallback = false;
        const resolvedMaterials = child.material.map((material) => {
          if (isUsableMaterial(material)) return material;
          needsFallback = true;
          fallbackCount += 1;
          return getNeutralMaterial();
        });
        if (needsFallback) child.material = resolvedMaterials;
        return;
      }

      if (!isUsableMaterial(child.material)) {
        child.material = getNeutralMaterial();
        fallbackCount += 1;
      }
    });

    return fallbackCount;
  };

  const getVisibleBounds = (object) => {
    const bounds = new THREE.Box3().makeEmpty();
    const geometryBounds = new THREE.Box3();

    object.updateMatrixWorld(true);
    object.traverseVisible((child) => {
      if (!child.geometry) return;
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      if (!child.geometry.boundingBox) return;

      geometryBounds.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      bounds.union(geometryBounds);
    });

    return bounds;
  };

  const frameModel = (object) => {
    const initialBounds = getVisibleBounds(object);
    if (initialBounds.isEmpty()) throw new Error('The Rhino model contains no visible geometry.');

    const initialCenter = initialBounds.getCenter(new THREE.Vector3());
    object.position.sub(initialCenter);
    object.updateMatrixWorld(true);

    const bounds = getVisibleBounds(object);
    const size = bounds.getSize(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
      throw new Error('The Rhino model bounds are invalid.');
    }

    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const heightDistance = size.y / (2 * Math.tan(verticalFov / 2));
    const widthDistance = size.x / (2 * Math.tan(horizontalFov / 2));
    const cameraDistance = (Math.max(heightDistance, widthDistance) + size.z / 2) * 1.35;
    const viewDirection = new THREE.Vector3(1, 0.7, 1).normalize();

    camera.position.copy(viewDirection.multiplyScalar(cameraDistance));
    camera.near = Math.max(largestDimension / 10000, 0.01);
    camera.far = cameraDistance + largestDimension * 10;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = Math.max(largestDimension * 0.12, camera.near * 2);
    controls.maxDistance = Math.max(largestDimension * 8, cameraDistance * 2);
    controls.update();
    controls.saveState();
  };

  const initializeViewer = () => {
    try {
      scene = new THREE.Scene();
      const background = getComputedStyle(document.documentElement).getPropertyValue('--wash').trim() || '#f5f5f5';
      scene.background = new THREE.Color(background);

      camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
      camera.up.set(0, 0, 1);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      viewer.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !reducedMotion.matches;
      controls.dampingFactor = 0.08;
      controls.enablePan = true;
      controls.autoRotate = false;
      controls.addEventListener('change', requestRender);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xc9c7c1, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(4, 7, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
      fillLight.position.set(-4, 2, -3);
      scene.add(fillLight);

      resizeViewer();

      loader = new Rhino3dmLoader();
      loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/');
      loader.load(
        modelPath,
        (loadedModel) => {
          try {
            model = loadedModel;
            const effectiveVisibility = applyEffectiveRhinoVisibility(model);
            const materialFallbackCount = applyMissingMaterialFallbacks(model);
            console.info(`Effective Rhino visibility applied: ${JSON.stringify(effectiveVisibility)}.`);
            console.info(`Neutral material fallbacks applied: ${materialFallbackCount}.`);
            scene.add(model);
            frameModel(model);
            status.hidden = true;
            viewer.classList.add('is-ready');
            requestRender();
          } catch (error) {
            console.error('The architecture model could not be prepared for display.', error);
            showError();
          }
        },
        undefined,
        (error) => {
          console.error('The architecture model failed to load.', error);
          showError();
        },
      );
    } catch (error) {
      console.error('The architecture viewer could not be initialized.', error);
      showError();
    }
  };

  const resizeObserver = new ResizeObserver(resizeViewer);
  resizeObserver.observe(viewer);

  const visibilityObserver = new IntersectionObserver((entries) => {
    viewerIsVisible = entries[0]?.isIntersecting ?? true;
    if (viewerIsVisible) requestRender();
  });
  visibilityObserver.observe(viewer);

  reducedMotion.addEventListener('change', (event) => {
    if (!controls) return;
    controls.enableDamping = !event.matches;
    requestRender();
  });

  window.addEventListener('pagehide', () => {
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    controls?.dispose();
    loader?.dispose();
    model?.traverse((child) => {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material?.dispose());
    });
    renderer?.dispose();
  }, { once: true });

  initializeViewer();
}
