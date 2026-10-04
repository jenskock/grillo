import * as THREE from 'three'
import {
  EXISTING_PATH,
  EXISTING_TERRACE,
  FENCE_Z,
  GARAGE,
  GARDEN,
  GARDEN_BED_OUTLINE,
  GATE,
  HEDGE,
  HOUSE,
  PAVING_OUTLINE,
  PAVING_TOP,
  isInsidePolygon,
} from './layout.js'
import { at, rbox, shaded } from './utils.js'

// Flat slab from an (x, z) outline; UVs are in metres so tiling textures keep real scale.
export function slabFromOutline(outline, thickness, material, y = 0) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  const mesh = shaded(new THREE.Mesh(geo, material), false, true)
  mesh.position.y = y
  return mesh
}

function edgeStrip(a, b, outline, { width, height, material, y = 0, outward = true }) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  let nx = -dz / len
  let nz = dx / len
  const mx = (a[0] + b[0]) / 2
  const mz = (a[1] + b[1]) / 2
  if (isInsidePolygon(mx + nx * 0.05, mz + nz * 0.05, outline) === outward) {
    nx = -nx
    nz = -nz
  }
  const strip = rbox(len + width, height, width, material, Math.min(0.012, width / 3))
  strip.position.set(mx + (nx * width) / 2, y + height / 2, mz + (nz * width) / 2)
  strip.rotation.y = -Math.atan2(dz, dx)
  return strip
}

export function createGround(mats) {
  const group = new THREE.Group()
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: '#76845f', roughness: 1 })
  )
  outside.rotation.x = -Math.PI / 2
  outside.position.set(GARDEN.width / 2, -0.012, GARDEN.depth / 2)
  outside.receiveShadow = true

  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(GARDEN.width, GARDEN.depth), mats.lawnGround)
  lawn.rotation.x = -Math.PI / 2
  lawn.position.set(GARDEN.width / 2, 0, GARDEN.depth / 2)
  lawn.receiveShadow = true

  // Gravel strip under the construction gate
  const gravel = slabFromOutline(
    [[GATE.x, GARDEN.depth - HEDGE.thickness], [GATE.x + GATE.width, GARDEN.depth - HEDGE.thickness], [GATE.x + GATE.width, GARDEN.depth], [GATE.x, GARDEN.depth]],
    0.012,
    mats.mulch
  )
  group.add(outside, lawn, gravel)
  return group
}

export function createHouse(mats) {
  const group = new THREE.Group()
  const body = rbox(GARDEN.width, HOUSE.height, HOUSE.depth, mats.plaster, 0.02)
  body.position.set(GARDEN.width / 2, HOUSE.height / 2, -HOUSE.depth / 2)
  const roof = rbox(GARDEN.width + 0.3, 0.32, HOUSE.depth + 0.3, mats.anthracite, 0.02)
  roof.position.set(GARDEN.width / 2, HOUSE.height + 0.16, -HOUSE.depth / 2)
  group.add(body, roof)

  const openings = [
    { x: 4.8, w: 3.6, y0: 0.12, h: 2.3, mullions: 2 },
    { x: 8.7, w: 1.4, y0: 0.9, h: 1.4, mullions: 1 },
    { x: 12.7, w: 1.0, y0: 0.12, h: 2.2, mullions: 0 },
    { x: 15.2, w: 1.5, y0: 0.9, h: 1.4, mullions: 1 },
  ]
  for (const o of openings) {
    const frame = rbox(o.w, o.h, 0.08, mats.anthracite, 0.008)
    frame.position.set(o.x, o.y0 + o.h / 2, 0.01)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(o.w - 0.1, o.h - 0.1), mats.windowGlass)
    glass.position.set(o.x, o.y0 + o.h / 2, 0.055)
    group.add(frame, glass)
    for (let i = 1; i <= o.mullions; i++) {
      const bar = rbox(0.05, o.h - 0.06, 0.03, mats.anthracite, 0.006)
      bar.position.set(o.x - o.w / 2 + (o.w * i) / (o.mullions + 1), o.y0 + o.h / 2, 0.07)
      group.add(bar)
    }
    const sill = rbox(o.w + 0.08, 0.03, 0.12, mats.anthracite, 0.006)
    sill.position.set(o.x, o.y0 - 0.015, 0.06)
    group.add(sill)
  }
  return group
}

export function createExistingTerrace(mats) {
  const group = new THREE.Group()
  const t = EXISTING_TERRACE
  const width = t.x1 - t.x0
  const depth = t.z1 - t.z0
  const base = rbox(width, 0.08, depth, mats.darkMetal, 0.005)
  base.position.set(t.x0 + width / 2, 0.04, t.z0 + depth / 2)
  group.add(base)

  const plankWidth = 0.135
  const gap = 0.008
  const variants = [0, 0.27, 0.53, 0.81].map((offset) => {
    const m = mats.teak.clone()
    m.color = new THREE.Color('#a68a6c')
    for (const key of ['map', 'normalMap', 'roughnessMap', 'aoMap']) {
      m[key] = mats.teak[key].clone()
      m[key].repeat.set(width / 1.2, plankWidth)
      m[key].offset.set(offset, offset * 3.1)
    }
    return m
  })
  const count = Math.floor(depth / (plankWidth + gap))
  for (let i = 0; i < count; i++) {
    const plank = rbox(width, 0.028, plankWidth, variants[i % variants.length], 0.006)
    plank.position.set(t.x0 + width / 2, 0.094, t.z0 + plankWidth / 2 + i * (plankWidth + gap) + 0.01)
    group.add(plank)
  }

  const p = EXISTING_PATH
  group.add(slabFromOutline([[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1]], 0.05, mats.pathPaving))
  return group
}

// Neighbour property — shown for context only.
export function createGarage(mats) {
  const g = GARAGE
  const group = new THREE.Group()
  const w = g.x1 - g.x0
  const d = g.z1 - g.z0
  const body = rbox(w, g.height, d, mats.garagePlaster, 0.015)
  body.position.set(g.x0 + w / 2, g.height / 2, g.z0 + d / 2)
  const coping = rbox(w + 0.06, 0.07, d + 0.06, mats.anthracite, 0.008)
  coping.position.set(g.x0 + w / 2, g.height + 0.035, g.z0 + d / 2)
  const plinth = rbox(w + 0.01, 0.25, d + 0.01, mats.darkMetal, 0.004)
  plinth.position.set(g.x0 + w / 2, 0.125, g.z0 + d / 2)
  group.add(body, coping, plinth)
  return group
}

// Double-rod mesh fence (Doppelstabmatte) along the south boundary with a two-leaf construction gate.
export function createFence(mats) {
  const group = new THREE.Group()
  const height = 1.2
  const fenceRuns = [
    [0.05, GATE.x],
    [GATE.x + GATE.width, 11.0],
  ]
  const gateLeaves = [
    [GATE.x + 0.06, GATE.x + GATE.width / 2 - 0.01],
    [GATE.x + GATE.width / 2 + 0.01, GATE.x + GATE.width - 0.06],
  ]

  const vertical = []
  const horizontal = []
  const addMesh = (x0, x1, y0, h, z) => {
    for (let x = x0 + 0.025; x < x1 - 0.01; x += 0.05) vertical.push([x, y0, h, z])
    for (let y = y0 + 0.05; y < y0 + h; y += 0.2) {
      horizontal.push([x0, x1, y, z - 0.006])
      horizontal.push([x0, x1, y, z + 0.006])
    }
  }
  for (const [x0, x1] of fenceRuns) {
    addMesh(x0, x1, 0.04, height, FENCE_Z)
    for (let x = x0; x <= x1 + 0.01; x += 2.5) {
      group.add(at(rbox(0.06, height + 0.1, 0.04, mats.anthracite, 0.004), Math.min(x, x1), (height + 0.1) / 2, FENCE_Z + 0.03))
    }
  }
  for (const [x0, x1] of gateLeaves) {
    addMesh(x0 + 0.04, x1 - 0.04, 0.1, height - 0.12, FENCE_Z)
    const w = x1 - x0
    const cx = (x0 + x1) / 2
    for (const y of [0.08, height]) group.add(at(rbox(w, 0.04, 0.04, mats.anthracite, 0.004), cx, y, FENCE_Z))
    for (const x of [x0 + 0.02, x1 - 0.02]) group.add(at(rbox(0.04, height - 0.04, 0.04, mats.anthracite, 0.004), x, (height + 0.08) / 2, FENCE_Z))
  }
  for (const x of [GATE.x, GATE.x + GATE.width]) {
    group.add(at(rbox(0.1, height + 0.25, 0.1, mats.anthracite, 0.006), x, (height + 0.25) / 2, FENCE_Z))
  }
  const lock = rbox(0.08, 0.16, 0.07, mats.darkMetal, 0.008)
  lock.position.set(GATE.x + GATE.width / 2 - 0.06, 0.95, FENCE_Z - 0.04)
  const handle = rbox(0.14, 0.02, 0.02, mats.stainless, 0.006)
  handle.position.set(GATE.x + GATE.width / 2 - 0.11, 0.95, FENCE_Z - 0.09)
  group.add(lock, handle)

  const rodGeo = new THREE.CylinderGeometry(0.0028, 0.0028, 1, 5)
  const rods = new THREE.InstancedMesh(rodGeo, mats.anthracite, vertical.length + horizontal.length)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  let i = 0
  for (const [x, y0, h, z] of vertical) {
    rods.setMatrixAt(i++, m.compose(p.set(x, y0 + h / 2, z), q.identity(), s.set(1, h, 1)))
  }
  const sideways = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
  for (const [x0, x1, y, z] of horizontal) {
    rods.setMatrixAt(i++, m.compose(p.set((x0 + x1) / 2, y, z), sideways, s.set(1.4, x1 - x0, 1.4)))
  }
  rods.castShadow = true
  rods.instanceMatrix.needsUpdate = true
  rods.computeBoundingSphere()
  group.add(rods)
  return group
}

export function createPaving(mats) {
  const group = new THREE.Group()
  const bed = slabFromOutline(PAVING_OUTLINE, PAVING_TOP, mats.paving)
  group.add(bed)

  // Light natural-stone kerb on every edge facing the garden (the boundary edges stay flush).
  const n = PAVING_OUTLINE.length
  for (let i = 0; i < n; i++) {
    const a = PAVING_OUTLINE[i]
    const b = PAVING_OUTLINE[(i + 1) % n]
    const onBoundary = (a[0] === 17 && b[0] === 17) || (a[1] === 21 && b[1] === 21)
    if (onBoundary) continue
    group.add(edgeStrip(a, b, PAVING_OUTLINE, { width: 0.1, height: PAVING_TOP + 0.015, material: mats.edgingStone }))
  }
  return group
}

export function createGardenBed(mats) {
  const group = new THREE.Group()
  group.add(slabFromOutline(GARDEN_BED_OUTLINE, 0.035, mats.mulch))
  const n = GARDEN_BED_OUTLINE.length
  for (let i = 0; i < n; i++) {
    const a = GARDEN_BED_OUTLINE[i]
    const b = GARDEN_BED_OUTLINE[(i + 1) % n]
    const touchesPaving = (a[0] === 12.4 && b[0] === 12.4) || (a[1] === 15.4 && b[1] === 15.4)
    if (touchesPaving) continue
    group.add(edgeStrip(a, b, GARDEN_BED_OUTLINE, { width: 0.008, height: 0.07, material: mats.anthracite, y: -0.02 }))
  }
  return group
}

// Powder-coated steel planter; returns soil height for planting.
export function createPlanter({ x0, x1, z0, z1, height }, mats) {
  const group = new THREE.Group()
  const w = x1 - x0
  const d = z1 - z0
  const t = 0.018
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  group.add(
    at(rbox(w, height, t, mats.anthracite, 0.004), cx, height / 2, z0 + t / 2),
    at(rbox(w, height, t, mats.anthracite, 0.004), cx, height / 2, z1 - t / 2),
    at(rbox(t, height, d - 2 * t, mats.anthracite, 0.004), x0 + t / 2, height / 2, cz),
    at(rbox(t, height, d - 2 * t, mats.anthracite, 0.004), x1 - t / 2, height / 2, cz)
  )
  const soilY = height - 0.05
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, d - 2 * t), mats.mulch)
  soil.rotation.x = -Math.PI / 2
  soil.position.set(cx, soilY, cz)
  soil.receiveShadow = true
  group.add(soil)
  return { group, soilY }
}
