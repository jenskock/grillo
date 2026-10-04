import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { createRandom, fbm3, noise3, shaded } from './utils.js'

export const windTime = { value: 0 }

const UP = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _e = new THREE.Euler()
const _c = new THREE.Color()

// Sway vertices by local height; applied after the instance matrix, before the view transform.
function addWind(material, { amplitude, height, key }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace(
        'mvPosition = modelViewMatrix * mvPosition;',
        `{
          float hN = clamp(position.y / ${height.toFixed(4)}, 0.0, 1.0);
          float ph = mvPosition.x * 0.55 + mvPosition.z * 0.35;
          float sway = sin(uWindTime * 1.3 + ph) * 0.7 + sin(uWindTime * 2.9 + ph * 2.1) * 0.3;
          float bend = hN * hN * ${amplitude.toFixed(4)};
          mvPosition.x += sway * bend;
          mvPosition.z += sway * bend * 0.6;
        }
        mvPosition = modelViewMatrix * mvPosition;`
      )
  }
  material.customProgramCacheKey = () => `wind-${key}`
}

function foliageMaterial(options = {}) {
  return new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.72,
    metalness: 0,
    ...options,
  })
}

// Tapered, slightly bent blade. Grey vertex gradient (dark base → light tip) is tinted per instance.
function bladeGeometry({ segments, baseWidth, height, bend }) {
  const positions = []
  const colors = []
  const normals = []
  const indices = []
  const n = new THREE.Vector3(0, 0.75, -0.66).normalize()
  for (let i = 0; i < segments; i++) {
    const t = i / segments
    const w = baseWidth * 0.5 * Math.pow(1 - t, 0.7)
    const y = t * height
    const z = bend * t * t
    positions.push(-w, y, z, w, y, z)
    const c = 0.32 + 0.68 * t
    colors.push(c, c, c, c, c, c)
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z)
  }
  positions.push(0, height, bend)
  colors.push(1, 1, 1)
  normals.push(n.x, n.y, n.z)
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  const last = (segments - 1) * 2
  indices.push(last, last + 1, segments * 2)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  return geo
}

// Broad leaf in the XY plane (length along +Y, normal +Z) with a raised midrib.
function leafGeometry(length, width) {
  const w = width / 2
  const L = length
  const fold = width * 0.14
  const positions = [
    0, 0, 0,
    -w * 0.75, L * 0.28, 0,
    0, L * 0.28, fold,
    w * 0.75, L * 0.28, 0,
    -w, L * 0.6, 0,
    0, L * 0.6, fold,
    w, L * 0.6, 0,
    0, L, 0,
  ]
  const indices = [0, 3, 2, 0, 2, 1, 1, 2, 5, 1, 5, 4, 2, 3, 6, 2, 6, 5, 4, 5, 7, 5, 6, 7]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function randomUnit(rand, target) {
  const u = rand() * 2 - 1
  const a = rand() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return target.set(r * Math.cos(a), u, r * Math.sin(a))
}

// Leaf facing `normal`, random spin around it.
function composeLeaf(target, position, normal, size, rand) {
  _q.setFromUnitVectors(Z_AXIS, normal)
  _q2.setFromAxisAngle(Z_AXIS, rand() * Math.PI * 2)
  _q.multiply(_q2)
  _s.setScalar(size)
  return target.compose(position, _q, _s)
}

function finishInstances(mesh) {
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.computeBoundingBox()
  return mesh
}

export function createLawn(isLawn, { bounds, count = 160000, seed = 3 } = {}) {
  const rand = createRandom(seed)
  const geo = bladeGeometry({ segments: 4, baseWidth: 0.011, height: 1, bend: 0.025 })
  const mat = foliageMaterial({ vertexColors: true, roughness: 0.85 })
  addWind(mat, { amplitude: 0.022, height: 1, key: 'lawn' })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.receiveShadow = true
  mesh.castShadow = false

  let placed = 0
  let guard = 0
  while (placed < count && guard < count * 4) {
    guard++
    const x = rand.range(bounds.x0, bounds.x1)
    const z = rand.range(bounds.z0, bounds.z1)
    if (!isLawn(x, z)) continue
    const h = rand.range(0.06, 0.12) * (0.85 + noise3(x * 0.6, 0, z * 0.6) * 0.35)
    _e.set(rand.range(-0.3, 0.3), rand() * Math.PI * 2, rand.range(-0.25, 0.25), 'YXZ')
    _q.setFromEuler(_e)
    _s.set(rand.range(0.8, 1.35), h, 1)
    _p.set(x, 0, z)
    mesh.setMatrixAt(placed, _m.compose(_p, _q, _s))
    // Mowing stripes + patchy variation
    const stripe = Math.sin((x - 1) * Math.PI) > 0 ? 0.035 : -0.02
    const patch = (noise3(x * 0.35, 1.7, z * 0.35) - 0.5) * 0.08
    _c.setHSL(rand.range(0.22, 0.27), rand.range(0.42, 0.58), 0.36 + stripe + patch + rand.range(-0.05, 0.05))
    mesh.setColorAt(placed, _c)
    placed++
  }
  mesh.count = placed
  return finishInstances(mesh)
}

// Clipped hedge: rounded, noise-displaced core plus thousands of small leaves on its surface.
export function createHedge({ x0, x1, z0, z1, height }, seed) {
  const rand = createRandom(seed)
  const w = x1 - x0
  const d = z1 - z0
  const half = new THREE.Vector3(w / 2, height / 2, d / 2)
  const radius = 0.26
  const inner = half.clone().subScalar(radius)

  const surface = (p, outNormal) => {
    const q = new THREE.Vector3(
      THREE.MathUtils.clamp(p.x, -inner.x, inner.x),
      THREE.MathUtils.clamp(p.y, -inner.y, inner.y),
      THREE.MathUtils.clamp(p.z, -inner.z, inner.z)
    )
    const n = p.clone().sub(q)
    if (n.lengthSq() < 1e-8) n.set(0, 1, 0)
    n.normalize()
    const s = q.addScaledVector(n, radius)
    const wx = x0 + half.x + s.x
    const wz = z0 + half.z + s.z
    const disp = (fbm3(wx * 2.1, s.y * 2.1, wz * 2.1) - 0.5) * 0.17 + (noise3(wx * 7, s.y * 7, wz * 7) - 0.5) * 0.05
    outNormal.copy(n)
    return { point: s.addScaledVector(n, disp), disp }
  }

  let core = new THREE.BoxGeometry(w, height, d, Math.ceil(w / 0.12), Math.ceil(height / 0.12), Math.ceil(d / 0.12))
  core.deleteAttribute('normal')
  core.deleteAttribute('uv')
  core = mergeVertices(core)
  const pos = core.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const dark = new THREE.Color('#17301a')
  const mid = new THREE.Color('#2c5226')
  const tmp = new THREE.Vector3()
  const nrm = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    const { point, disp } = surface(tmp, nrm)
    pos.setXYZ(i, point.x, point.y, point.z)
    _c.copy(dark).lerp(mid, THREE.MathUtils.clamp(0.5 + disp * 4 + (point.y / height) * 0.4, 0, 1))
    colors.set([_c.r, _c.g, _c.b], i * 3)
  }
  core.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  core.computeVertexNormals()
  const coreMesh = shaded(
    new THREE.Mesh(core, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
  )

  const faces = [
    { area: w * d, sample: () => tmp.set(rand.range(-half.x, half.x), half.y, rand.range(-half.z, half.z)), top: true },
    { area: height * d, sample: () => tmp.set(half.x, rand.range(-half.y, half.y), rand.range(-half.z, half.z)) },
    { area: height * d, sample: () => tmp.set(-half.x, rand.range(-half.y, half.y), rand.range(-half.z, half.z)) },
    { area: w * height, sample: () => tmp.set(rand.range(-half.x, half.x), rand.range(-half.y, half.y), half.z) },
    { area: w * height, sample: () => tmp.set(rand.range(-half.x, half.x), rand.range(-half.y, half.y), -half.z) },
  ]
  const totalArea = faces.reduce((sum, f) => sum + f.area, 0)
  const count = Math.round(totalArea * 520)
  const leafMat = foliageMaterial()
  const leaves = new THREE.InstancedMesh(leafGeometry(0.085, 0.045), leafMat, count)
  leaves.receiveShadow = true
  const jitter = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    let r = rand() * totalArea
    let face = faces[0]
    for (const f of faces) {
      if (r < f.area) {
        face = f
        break
      }
      r -= f.area
    }
    face.sample()
    const { point } = surface(tmp, nrm)
    point.addScaledVector(nrm, rand.range(-0.03, 0.045))
    const leafNormal = nrm.clone().add(randomUnit(rand, jitter).multiplyScalar(0.7)).normalize()
    leaves.setMatrixAt(i, composeLeaf(_m, point, leafNormal, rand.range(0.75, 1.25), rand))
    const lift = face.top ? 0.05 : 0
    _c.setHSL(rand.range(0.24, 0.31), rand.range(0.4, 0.6), rand.range(0.17, 0.3) + lift)
    leaves.setColorAt(i, _c)
  }
  finishInstances(leaves)

  const group = new THREE.Group()
  group.add(coreMesh, leaves)
  group.position.set(x0 + half.x, half.y, z0 + half.z)
  return group
}

// Evergreen shrub / clipped ball (Ilex crenata, Kirschlorbeer-style).
export function createLeafyBlob({ x, y, z, rx, ry, rz }, { seed, density = 700, leafSize = 0.07, hue = 0.28, light = 0.24 }) {
  const rand = createRandom(seed)
  const radii = new THREE.Vector3(rx, ry, rz)
  const shape = (dir) => {
    const k = 1 + (fbm3(dir.x * 2.5 + seed, dir.y * 2.5, dir.z * 2.5) - 0.5) * 0.35
    return dir.clone().multiply(radii).multiplyScalar(k)
  }
  const core = new THREE.IcosahedronGeometry(1, 4)
  const pos = core.attributes.position
  const dir = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize()
    const p = shape(dir).multiplyScalar(0.92)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  core.computeVertexNormals()
  const coreMesh = shaded(
    new THREE.Mesh(core, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.45, 0.1), roughness: 1 }))
  )

  const avgR = (rx + ry + rz) / 3
  const count = Math.round(4 * Math.PI * avgR * avgR * density)
  const leaves = new THREE.InstancedMesh(leafGeometry(leafSize, leafSize * 0.55), foliageMaterial(), count)
  leaves.castShadow = true
  leaves.receiveShadow = true
  const jitter = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    randomUnit(rand, dir)
    if (dir.y < -0.55) dir.y = -dir.y * 0.4
    dir.normalize()
    const p = shape(dir).multiplyScalar(rand.range(0.93, 1.04))
    const n = dir.clone().add(randomUnit(rand, jitter).multiplyScalar(0.6)).normalize()
    leaves.setMatrixAt(i, composeLeaf(_m, p, n, rand.range(0.8, 1.2), rand))
    _c.setHSL(hue + rand.range(-0.025, 0.025), rand.range(0.4, 0.58), light + rand.range(-0.06, 0.07) + dir.y * 0.05)
    leaves.setColorAt(i, _c)
  }
  finishInstances(leaves)
  const group = new THREE.Group()
  group.add(coreMesh, leaves)
  group.position.set(x, y, z)
  return group
}

// Deciduous small tree (e.g. Felsenbirne / Zierapfel), procedurally branched. Can fade out when it blocks the view.
export function createTree({ x, z }, seed) {
  const rand = createRandom(seed)
  const branchGeos = []
  const leafMatrices = []
  const leafColors = []
  const canopyCenter = new THREE.Vector3(0, 3.0, 0)
  const tmpDir = new THREE.Vector3()

  const grow = (start, dir, length, radius, depth) => {
    const end = start.clone().addScaledVector(dir, length)
    const geo = new THREE.CylinderGeometry(radius * 0.7, radius, length, Math.max(5, 12 - depth * 2), 2)
    geo.translate(0, length / 2, 0)
    _q.setFromUnitVectors(UP, dir)
    geo.applyMatrix4(new THREE.Matrix4().compose(start, _q, new THREE.Vector3(1, 1, 1)))
    branchGeos.push(geo)

    if (depth >= 4) {
      for (let k = 0; k < 280; k++) {
        const p = start.clone().lerp(end, rand.range(0.2, 1.15)).add(randomUnit(rand, tmpDir).multiplyScalar(rand.range(0.05, 0.5)))
        const n = p.clone().sub(canopyCenter).normalize().add(randomUnit(rand, tmpDir).multiplyScalar(0.9)).normalize()
        leafMatrices.push(composeLeaf(new THREE.Matrix4(), p, n, rand.range(0.8, 1.25), rand))
        leafColors.push(new THREE.Color().setHSL(rand.range(0.22, 0.29), rand.range(0.45, 0.62), rand.range(0.22, 0.38)))
      }
      return
    }
    const children = depth === 0 ? 4 : rand() < 0.55 ? 3 : 2
    const yaw0 = rand() * Math.PI * 2
    for (let i = 0; i < children; i++) {
      const yaw = yaw0 + (i / children) * Math.PI * 2 + rand.range(-0.35, 0.35)
      const pitch = depth === 0 ? rand.range(0.45, 0.75) : rand.range(0.35, 0.65)
      const perp = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw))
      const nd = dir.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(perp, Math.sin(pitch))
      nd.y += 0.12
      nd.normalize()
      const childStart = depth === 0 ? end : start.clone().lerp(end, rand.range(0.55, 1))
      grow(childStart, nd, length * rand.range(0.64, 0.78), radius * 0.62, depth + 1)
    }
  }
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, 1, 0.02).normalize(), 1.7, 0.12, 0)

  const barkMat = new THREE.MeshStandardMaterial({ color: '#5a4d43', roughness: 0.95 })
  const bark = shaded(new THREE.Mesh(mergeGeometries(branchGeos), barkMat))
  const leafMat = foliageMaterial()
  addWind(leafMat, { amplitude: 0.02, height: 0.001, key: 'tree-leaf' })
  const leaves = new THREE.InstancedMesh(leafGeometry(0.11, 0.06), leafMat, leafMatrices.length)
  leaves.castShadow = true
  leaves.receiveShadow = true
  leafMatrices.forEach((m, i) => {
    leaves.setMatrixAt(i, m)
    leaves.setColorAt(i, leafColors[i])
  })
  finishInstances(leaves)

  const group = new THREE.Group()
  group.add(bark, leaves)
  group.position.set(x, 0, z)

  const materials = [barkMat, leafMat]
  return {
    group,
    center: new THREE.Vector3(x, canopyCenter.y, z),
    radius: 2.1,
    setOpacity(opacity) {
      const transparent = opacity < 0.98
      for (const m of materials) {
        m.opacity = opacity
        if (m.transparent !== transparent) {
          m.transparent = transparent
          m.depthWrite = !transparent
          m.needsUpdate = true
        }
      }
      bark.castShadow = !transparent
      leaves.castShadow = !transparent
    },
  }
}

// Clump-forming, non-invasive bamboo (Fargesia) as evergreen screen in planters.
export function createBamboo(areas, { baseY, seed }) {
  const rand = createRandom(seed)
  const culmGeo = new THREE.CylinderGeometry(0.008, 0.012, 1, 6, 1)
  culmGeo.translate(0, 0.5, 0)
  const culmMatrices = []
  const culmColors = []
  const leafMatrices = []
  const leafColors = []
  const dir = new THREE.Vector3()

  for (const a of areas) {
    const len = Math.max(a.x1 - a.x0, a.z1 - a.z0)
    const culms = Math.round(len * 24)
    for (let i = 0; i < culms; i++) {
      const base = new THREE.Vector3(rand.range(a.x0 + 0.06, a.x1 - 0.06), baseY, rand.range(a.z0 + 0.06, a.z1 - 0.06))
      const h = rand.range(1.7, 2.45)
      const lean = rand.range(0.02, 0.14)
      const yaw = rand() * Math.PI * 2
      dir.set(Math.sin(lean) * Math.cos(yaw), Math.cos(lean), Math.sin(lean) * Math.sin(yaw)).normalize()
      _q.setFromUnitVectors(UP, dir)
      culmMatrices.push(new THREE.Matrix4().compose(base, _q, new THREE.Vector3(1, h, 1)))
      culmColors.push(new THREE.Color().setHSL(rand.range(0.17, 0.24), 0.45, rand.range(0.3, 0.42)))

      for (let k = 0; k < 120; k++) {
        const t = Math.pow(rand.range(0.3, 1), 0.7)
        const twigYaw = rand() * Math.PI * 2
        const twig = rand.range(0.03, 0.26) * (1.1 - t * 0.4)
        const p = base.clone().addScaledVector(dir, h * t)
        p.x += Math.cos(twigYaw) * twig
        p.z += Math.sin(twigYaw) * twig
        _e.set(-Math.PI / 2 - rand.range(0.25, 0.95), twigYaw + Math.PI / 2 + rand.range(-0.5, 0.5), rand.range(-0.3, 0.3), 'YXZ')
        _q.setFromEuler(_e)
        leafMatrices.push(new THREE.Matrix4().compose(p, _q, new THREE.Vector3().setScalar(rand.range(0.85, 1.3))))
        leafColors.push(new THREE.Color().setHSL(rand.range(0.21, 0.27), rand.range(0.45, 0.6), rand.range(0.24, 0.38)))
      }
    }
  }

  const culms = new THREE.InstancedMesh(culmGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), culmMatrices.length)
  culms.castShadow = true
  culms.receiveShadow = true
  culmMatrices.forEach((m, i) => {
    culms.setMatrixAt(i, m)
    culms.setColorAt(i, culmColors[i])
  })
  finishInstances(culms)

  const leafMat = foliageMaterial({ roughness: 0.6 })
  addWind(leafMat, { amplitude: 0.025, height: 0.001, key: 'bamboo-leaf' })
  const leaves = new THREE.InstancedMesh(leafGeometry(0.14, 0.021), leafMat, leafMatrices.length)
  leaves.castShadow = true
  leaves.receiveShadow = true
  leafMatrices.forEach((m, i) => {
    leaves.setMatrixAt(i, m)
    leaves.setColorAt(i, leafColors[i])
  })
  finishInstances(leaves)

  const group = new THREE.Group()
  group.add(culms, leaves)
  return group
}

// Ornamental grasses (Pennisetum, Miscanthus, Carex) — arching blades, optional plumes.
export function createGrassClumps(clumps, seed) {
  const rand = createRandom(seed)
  const total = clumps.reduce((sum, c) => sum + c.count, 0)
  const bladeMat = foliageMaterial({ vertexColors: true, roughness: 0.75 })
  addWind(bladeMat, { amplitude: 0.07, height: 1, key: 'grass-clump' })
  const blades = new THREE.InstancedMesh(bladeGeometry({ segments: 6, baseWidth: 0.016, height: 1, bend: 0.3 }), bladeMat, total)
  blades.castShadow = true
  blades.receiveShadow = true
  const plumeMatrices = []
  const plumeColors = []
  const tipLocal = new THREE.Vector3(0, 1, 0.3)
  const tangentLocal = new THREE.Vector3(0, 1, 0.6).normalize()

  let i = 0
  for (const clump of clumps) {
    const base = new THREE.Color(clump.color)
    for (let k = 0; k < clump.count; k++) {
      const yaw = rand() * Math.PI * 2
      const tilt = rand.range(0.05, clump.spread ?? 0.55) * (0.4 + 0.6 * rand())
      const h = clump.height * rand.range(0.65, 1.05)
      const r = rand() * (clump.radius ?? 0.18) * 0.4
      _p.set(clump.x + Math.sin(yaw) * r, clump.y ?? 0, clump.z + Math.cos(yaw) * r)
      _e.set(tilt, yaw, 0, 'YXZ')
      _q.setFromEuler(_e)
      _s.setScalar(h)
      _m.compose(_p, _q, _s)
      blades.setMatrixAt(i, _m)
      _c.copy(base).offsetHSL(rand.range(-0.02, 0.02), rand.range(-0.06, 0.06), rand.range(-0.06, 0.06))
      blades.setColorAt(i, _c)
      i++

      if (clump.plume && rand() < 0.3) {
        const tip = tipLocal.clone().applyMatrix4(_m)
        const tangent = tangentLocal.clone().applyQuaternion(_q)
        const q = new THREE.Quaternion().setFromUnitVectors(UP, tangent)
        plumeMatrices.push(new THREE.Matrix4().compose(tip, q, new THREE.Vector3().setScalar(h * 0.9)))
        plumeColors.push(new THREE.Color(clump.plume).offsetHSL(0, 0, rand.range(-0.05, 0.05)))
      }
    }
  }
  finishInstances(blades)

  const group = new THREE.Group()
  group.add(blades)
  if (plumeMatrices.length) {
    const plumeGeo = new THREE.CapsuleGeometry(0.022, 0.11, 3, 6)
    plumeGeo.translate(0, 0.06, 0)
    const plumes = new THREE.InstancedMesh(plumeGeo, foliageMaterial({ roughness: 1 }), plumeMatrices.length)
    plumes.castShadow = true
    plumeMatrices.forEach((m, k) => {
      plumes.setMatrixAt(k, m)
      plumes.setColorAt(k, plumeColors[k])
    })
    group.add(finishInstances(plumes))
  }
  return group
}

// Low-maintenance perennials (Salvia, Gaura, Geranium) with basal leaves and flower spikes.
export function createPerennials(patches, seed) {
  const rand = createRandom(seed)
  const spikeTotal = patches.reduce((s, p) => s + p.count, 0)
  const leafTotal = patches.reduce((s, p) => s + p.count * 3, 0)

  const stemGeo = new THREE.CylinderGeometry(0.0025, 0.0035, 1, 4)
  stemGeo.translate(0, 0.5, 0)
  const headGeo = new THREE.CylinderGeometry(0.004, 0.013, 1, 6)
  headGeo.translate(0, 0.5, 0)
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#3f5a2e', roughness: 0.8 }), spikeTotal)
  const heads = new THREE.InstancedMesh(headGeo, foliageMaterial({ roughness: 0.9 }), spikeTotal)
  const leafMat = foliageMaterial({ vertexColors: true })
  const leaves = new THREE.InstancedMesh(bladeGeometry({ segments: 3, baseWidth: 0.05, height: 1, bend: 0.12 }), leafMat, leafTotal)
  for (const m of [stems, heads, leaves]) {
    m.castShadow = true
    m.receiveShadow = true
  }

  let si = 0
  let li = 0
  for (const patch of patches) {
    const flower = new THREE.Color(patch.color)
    for (let k = 0; k < patch.count; k++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * patch.radius
      const x = patch.x + Math.cos(a) * r
      const z = patch.z + Math.sin(a) * r
      const y = patch.y ?? 0
      const h = patch.height * rand.range(0.7, 1.05)
      _e.set(rand.range(-0.18, 0.18), rand() * Math.PI * 2, rand.range(-0.18, 0.18), 'YXZ')
      _q.setFromEuler(_e)
      _p.set(x, y, z)
      _s.set(1, h * 0.72, 1)
      stems.setMatrixAt(si, _m.compose(_p, _q, _s))
      const headStart = new THREE.Vector3(0, h * 0.68, 0).applyQuaternion(_q).add(_p)
      _s.set(1, h * 0.34, 1)
      heads.setMatrixAt(si, _m.compose(headStart, _q, _s))
      heads.setColorAt(si, _c.copy(flower).offsetHSL(rand.range(-0.02, 0.02), 0, rand.range(-0.07, 0.07)))
      si++
      for (let j = 0; j < 3; j++) {
        _e.set(rand.range(0.7, 1.2), rand() * Math.PI * 2, 0, 'YXZ')
        _q.setFromEuler(_e)
        _p.set(x + rand.range(-0.04, 0.04), y, z + rand.range(-0.04, 0.04))
        _s.setScalar(rand.range(0.12, 0.22))
        leaves.setMatrixAt(li, _m.compose(_p, _q, _s))
        leaves.setColorAt(li, _c.setHSL(rand.range(0.24, 0.3), 0.4, rand.range(0.22, 0.32)))
        li++
      }
    }
  }
  const group = new THREE.Group()
  group.add(finishInstances(stems), finishInstances(heads), finishInstances(leaves))
  return group
}
