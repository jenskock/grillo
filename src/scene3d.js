import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { createDining, createKitchen, createLounge, createUmbrella } from './scene/furniture.js'
import {
  GARDEN,
  GATE,
  HEDGE,
  PRIVACY_PLANTERS,
  SHRUB,
  TERRACE,
  TREE,
  WEST_PLANTER,
  isLawn,
} from './scene/layout.js'
import { createMaterials } from './scene/materials.js'
import { createPergola } from './scene/pergola.js'
import {
  createExistingTerrace,
  createFence,
  createGarage,
  createGardenBed,
  createGround,
  createHouse,
  createPaving,
  createPlanter,
} from './scene/site.js'
import {
  createBamboo,
  createGrassClumps,
  createHedge,
  createLawn,
  createLeafyBlob,
  createPerennials,
  createTree,
  windTime,
} from './scene/vegetation.js'

const VIEWS = {
  overview: { camera: [23, 17, 30], target: [GARDEN.width / 2, 0.5, GARDEN.depth / 2] },
  grill: { camera: [8.6, 3.3, 10.2], target: [14.3, 0.9, 17.2] },
  dining: { camera: [12.15, 1.5, 16.45], target: [15.2, 1.0, 19.9] },
}

const MIN_CAMERA_HEIGHT = 0.35

const PENNISETUM = { color: '#7d9450', plume: '#d9c9a8', spread: 0.7 }
const MISCANTHUS = { color: '#6f8a48', spread: 0.45 }
const CAREX = { color: '#5f7a3a', spread: 0.9 }

function createPlanting(mats) {
  const group = new THREE.Group()

  group.add(createHedge({ x0: 0, x1: HEDGE.thickness, z0: 0, z1: GARDEN.depth, height: HEDGE.height }, 101))
  group.add(
    createHedge(
      { x0: GATE.x + GATE.width, x1: TERRACE.x, z0: GARDEN.depth - HEDGE.thickness, z1: GARDEN.depth, height: HEDGE.height },
      102
    )
  )

  // Existing evergreen shrub near the path
  group.add(createLeafyBlob({ x: SHRUB.x, y: 0.6, z: SHRUB.z, rx: 0.75, ry: 0.65, rz: 0.7 }, { seed: 21, leafSize: 0.1, hue: 0.3, light: 0.22 }))
  group.add(createLeafyBlob({ x: SHRUB.x + 0.45, y: 0.45, z: SHRUB.z + 0.3, rx: 0.5, ry: 0.45, rz: 0.5 }, { seed: 22, leafSize: 0.1, hue: 0.3, light: 0.24 }))

  // Bed in the paving notch: grasses, perennials, evergreen balls
  group.add(createGardenBed(mats))
  group.add(
    createGrassClumps(
      [
        { x: 12.0, z: 13.4, height: 1.45, count: 170, radius: 0.3, ...MISCANTHUS },
        { x: 11.5, z: 14.55, height: 0.7, count: 120, ...PENNISETUM },
        { x: 12.05, z: 14.4, height: 0.65, count: 110, ...PENNISETUM },
        { x: 11.25, z: 15.15, height: 0.35, count: 70, ...CAREX },
        { x: 11.75, z: 13.15, height: 0.35, count: 60, ...CAREX },
        { x: 11.6, z: 19.2, y: 0.45, height: 0.7, count: 110, ...PENNISETUM },
        { x: 11.6, z: 20.0, y: 0.45, height: 0.65, count: 100, ...PENNISETUM },
      ],
      31
    )
  )
  group.add(
    createPerennials(
      [
        { x: 11.55, z: 13.95, radius: 0.24, count: 46, height: 0.5, color: '#5b45a0' },
        { x: 11.95, z: 15.0, radius: 0.18, count: 32, height: 0.45, color: '#6a4fb0' },
        { x: 11.25, z: 14.25, radius: 0.16, count: 26, height: 0.65, color: '#ece6dc' },
        { x: 11.6, z: 19.6, y: 0.45, radius: 0.14, count: 22, height: 0.4, color: '#5b45a0' },
      ],
      41
    )
  )
  group.add(createLeafyBlob({ x: 11.6, y: 0.3, z: 15.05, rx: 0.3, ry: 0.27, rz: 0.3 }, { seed: 51, leafSize: 0.045, density: 1400, hue: 0.29, light: 0.22 }))
  group.add(createLeafyBlob({ x: 12.15, y: 0.24, z: 13.95, rx: 0.24, ry: 0.22, rz: 0.24 }, { seed: 52, leafSize: 0.045, density: 1400, hue: 0.29, light: 0.24 }))

  // Planters: west of the dining area, evergreen bamboo screen on the east boundary
  group.add(createPlanter({ ...WEST_PLANTER, height: 0.5 }, mats).group)
  let soilY = 0
  for (const area of PRIVACY_PLANTERS) {
    const planter = createPlanter({ ...area, height: 0.55 }, mats)
    soilY = planter.soilY
    group.add(planter.group)
  }
  group.add(createBamboo(PRIVACY_PLANTERS, { baseY: soilY, seed: 61 }))

  group.add(createLawn(isLawn, { bounds: { x0: 1, x1: GARDEN.width, z0: 3.4, z1: GARDEN.depth } }))
  return group
}

export function createScene3D(container) {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#d4dbd2', 0.012)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200)

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.maxPolarAngle = Math.PI * 0.8
  controls.minDistance = 1.2
  controls.maxDistance = 60
  controls.zoomSpeed = 1.3

  // Midday sun from south-south-west (south = +z), soft sky fill
  const hemi = new THREE.HemisphereLight('#e4ecf7', '#55643f', 0.35)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff0d9', 2.8)
  sun.position.set(GARDEN.width / 2 - 9, 24, GARDEN.depth / 2 + 15)
  sun.target.position.set(GARDEN.width / 2, 0, GARDEN.depth / 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.025
  sun.shadow.radius = 3
  Object.assign(sun.shadow.camera, { near: 5, far: 70, left: -17, right: 17, top: 17, bottom: -17 })
  scene.add(sun, sun.target)

  const mats = createMaterials(renderer)

  scene.add(createGround(mats))
  scene.add(createHouse(mats))
  scene.add(createExistingTerrace(mats))
  scene.add(createGarage(mats))
  scene.add(createFence(mats))
  scene.add(createPaving(mats))
  scene.add(createPlanting(mats))

  const pergola = createPergola(mats)
  scene.add(pergola.group)
  scene.add(createKitchen(mats))
  scene.add(createDining(mats))
  scene.add(createLounge(mats))
  scene.add(createUmbrella(mats))

  const tree = createTree(TREE, 7)
  scene.add(tree.group)

  // Post-processing: ambient occlusion for contact shadows, then tone mapping
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  const gtao = new GTAOPass(scene, camera, 1, 1)
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 12 })
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 })
  gtao.blendIntensity = 0.85
  composer.addPass(gtao)
  composer.addPass(new OutputPass())

  new HDRLoader().load(`${import.meta.env.BASE_URL}hdr/env.hdr`, (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = hdr
    scene.environmentIntensity = 0.6
    scene.background = hdr
    scene.backgroundBlurriness = 0.5
    scene.backgroundIntensity = 0.7
  })

  function setView(name) {
    const v = VIEWS[name]
    camera.position.set(...v.camera)
    controls.target.set(...v.target)
    controls.update()
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
  }

  // Fade the garden tree whenever it sits between camera and focus point.
  const segment = new THREE.Line3()
  const closest = new THREE.Vector3()
  let treeOpacity = 1
  function updateTreeFade(dt) {
    segment.set(camera.position, controls.target)
    const t = segment.closestPointToPointParameter(tree.center, true)
    segment.at(t, closest)
    const blocking = t > 0.02 && t < 0.98 && closest.distanceTo(tree.center) < tree.radius + 0.6
    const next = THREE.MathUtils.damp(treeOpacity, blocking ? 0.15 : 1, 6, dt)
    if (Math.abs(next - treeOpacity) > 0.002) {
      treeOpacity = next
      tree.setOpacity(treeOpacity)
    }
  }

  const timer = new THREE.Timer()
  let raf = 0
  let active = false

  function tick(timestamp) {
    if (!active) return
    raf = requestAnimationFrame(tick)
    timer.update(timestamp)
    const dt = Math.min(timer.getDelta(), 0.1)
    windTime.value += dt
    controls.update()
    if (camera.position.y < MIN_CAMERA_HEIGHT) camera.position.y = MIN_CAMERA_HEIGHT
    pergola.update(dt)
    updateTreeFade(dt)
    composer.render()
  }

  const api = {
    resize,
    start() {
      active = true
      resize()
      timer.reset()
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    },
    stop() {
      active = false
      cancelAnimationFrame(raf)
    },
    reset: () => setView('overview'),
    focusGrill: () => setView('grill'),
    focusDining: () => setView('dining'),
    lookAt(cameraPosition, targetPosition) {
      camera.position.set(...cameraPosition)
      controls.target.set(...targetPosition)
      controls.update()
    },
    toggleLamellas() {
      pergola.setOpen(!pergola.isOpen)
      return pergola.isOpen
    },
    dispose() {
      api.stop()
      composer.dispose()
      renderer.dispose()
      container.replaceChildren()
    },
  }

  setView('grill')
  resize()
  return api
}
