import * as THREE from 'three'
import { createRandom } from './utils.js'

const ANTHRACITE = '#383e42' // RAL 7016
const GARDEN_REPEAT = { x: 17 / 2, z: 21 / 2 }

function createTextureLoader(renderer) {
  const loader = new THREE.TextureLoader()
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return (url, { color = false, repeat = [1, 1] } = {}) => {
    const tex = loader.load(url)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
    tex.anisotropy = anisotropy
    tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    return tex
  }
}

function pbrSet(load, folder, repeat) {
  const root = import.meta.env.BASE_URL
  return {
    map: load(`${root}textures/${folder}/diff.jpg`, { color: true, repeat }),
    normalMap: load(`${root}textures/${folder}/nor.jpg`, { repeat }),
    roughnessMap: load(`${root}textures/${folder}/rough.jpg`, { repeat }),
    aoMap: load(`${root}textures/${folder}/ao.jpg`, { repeat }),
  }
}

function canvasTexture(size, draw, { color = true, repeat = [1, 1] } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  draw(canvas.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}

// Light natural stone (limestone / light granite) with fine speckles.
function speckleTexture(base, specks, seed) {
  const rand = createRandom(seed)
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = specks[Math.floor(rand() * specks.length)]
      ctx.globalAlpha = 0.15 + rand() * 0.5
      const r = 0.4 + rand() * 1.6
      ctx.beginPath()
      ctx.arc(rand() * s, rand() * s, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

// Directional streaks for brushed steel / aluminium.
function brushedTexture(seed) {
  const rand = createRandom(seed)
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, s, s)
      for (let i = 0; i < 1400; i++) {
        const g = Math.floor(100 + rand() * 70)
        ctx.strokeStyle = `rgb(${g},${g},${g})`
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        const y = rand() * s
        ctx.moveTo(0, y)
        ctx.lineTo(s, y + (rand() - 0.5) * 2)
        ctx.stroke()
      }
    },
    { color: false }
  )
}

// Fine perforation for speaker grilles.
function perforatedTexture() {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, s, s)
      ctx.fillStyle = '#000000'
      const step = s / 16
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.beginPath()
          ctx.arc(x * step + step / 2 + (y % 2 ? step / 2 : 0), y * step + step / 2, step * 0.28, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
    { color: false, repeat: [3, 3] }
  )
}

export function createMaterials(renderer) {
  const load = createTextureLoader(renderer)

  const pavingRepeat = [1 / 1.81, 1 / 1.81]
  const paving = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'paving', pavingRepeat),
    color: '#d6d6d4',
    roughness: 1,
    metalness: 0,
  })

  const pathPaving = paving.clone()
  pathPaving.color = new THREE.Color('#efe9df')

  const lawnGround = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'grass', [GARDEN_REPEAT.x, GARDEN_REPEAT.z]),
    color: '#8fae5a',
    roughness: 1,
  })

  const teakSet = pbrSet(load, 'teak', [1, 1])
  const teak = new THREE.MeshStandardMaterial({ ...teakSet, color: '#c99a6b', roughness: 0.8 })
  const teakLong = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'teak', [2.2, 1]),
    color: '#c99a6b',
    roughness: 0.75,
  })

  const fabricSet = pbrSet(load, 'fabric', [3, 3])
  const cushion = new THREE.MeshPhysicalMaterial({
    ...fabricSet,
    color: '#c9c4ba',
    roughness: 1,
    sheen: 0.6,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#ffffff'),
  })
  const cushionAccent = cushion.clone()
  cushionAccent.color = new THREE.Color('#6f7457')
  const cushionSand = cushion.clone()
  cushionSand.color = new THREE.Color('#b59a76')
  const rug = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'fabric', [6, 6]),
    color: '#7d7a73',
    roughness: 1,
  })

  const plaster = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'plaster', [8.5, 1.7]),
    color: '#e9e6df',
    roughness: 1,
  })
  const garagePlaster = new THREE.MeshStandardMaterial({
    ...pbrSet(load, 'plaster', [3, 1.4]),
    color: '#c7c3bb',
    roughness: 1,
  })

  const brushed = brushedTexture(7)

  const mats = {
    paving,
    pathPaving,
    lawnGround,
    teak,
    teakLong,
    cushion,
    cushionAccent,
    cushionSand,
    rug,
    plaster,
    garagePlaster,
    anthracite: new THREE.MeshStandardMaterial({ color: ANTHRACITE, roughness: 0.55, metalness: 0.35 }),
    anthraciteFine: new THREE.MeshStandardMaterial({
      color: ANTHRACITE,
      roughness: 0.45,
      metalness: 0.5,
      roughnessMap: brushed,
    }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#1d2023', roughness: 0.5, metalness: 0.6 }),
    stainless: new THREE.MeshStandardMaterial({
      color: '#d4d6d8',
      roughness: 0.32,
      metalness: 1,
      roughnessMap: brushed,
    }),
    lightStone: new THREE.MeshStandardMaterial({
      map: speckleTexture('#d9d4c8', ['#b9b2a3', '#efeae0', '#a39b8c', '#cfc8b8'], 11),
      roughness: 0.42,
      metalness: 0,
    }),
    edgingStone: new THREE.MeshStandardMaterial({
      map: speckleTexture('#cfcac0', ['#aaa498', '#e2ddd3', '#9a9488'], 19),
      roughness: 0.85,
    }),
    soil: new THREE.MeshStandardMaterial({ color: '#3a2e25', roughness: 1 }),
    mulch: new THREE.MeshStandardMaterial({
      map: speckleTexture('#5b5650', ['#3e3a35', '#7b766e', '#8c867c', '#2f2b27'], 23),
      roughness: 1,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#a9b4b8',
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
    windowGlass: new THREE.MeshStandardMaterial({ color: '#2a3238', roughness: 0.08, metalness: 0.9 }),
    blackGlass: new THREE.MeshStandardMaterial({ color: '#101214', roughness: 0.1, metalness: 0.4 }),
    speakerGrille: new THREE.MeshStandardMaterial({
      color: '#2b2f33',
      roughness: 0.6,
      metalness: 0.5,
      bumpMap: perforatedTexture(),
      bumpScale: 2,
    }),
    led: new THREE.MeshStandardMaterial({ color: '#fff3df', emissive: '#ffd9a6', emissiveIntensity: 1.2 }),
    heaterGlow: new THREE.MeshStandardMaterial({ color: '#2a1a14', emissive: '#ff6a2a', emissiveIntensity: 0.0 }),
    fridgeLight: new THREE.MeshStandardMaterial({ color: '#f4f6f8', emissive: '#dfeaff', emissiveIntensity: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.9 }),
    rope: new THREE.MeshStandardMaterial({ color: '#4a4c4c', roughness: 0.95 }),
    canopy: new THREE.MeshStandardMaterial({ color: '#cfc5b3', roughness: 0.95, side: THREE.DoubleSide }),
    bottleGreen: new THREE.MeshStandardMaterial({ color: '#2f5a3a', roughness: 0.1, metalness: 0.1 }),
    bottleAmber: new THREE.MeshStandardMaterial({ color: '#7a4a18', roughness: 0.1, metalness: 0.1 }),
    ceramic: new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.35 }),
  }
  return mats
}
