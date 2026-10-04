import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function createRandom(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (min, max) => min + (max - min) * next()
  next.pick = (list) => list[Math.floor(next() * list.length)]
  return next
}

function hash3(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}

const smooth = (t) => t * t * (3 - 2 * t)

export function noise3(x, y, z) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const w = smooth(z - zi)
  const lerp = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  )
}

export function fbm3(x, y, z, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq)
    freq *= 2.03
    amp *= 0.5
  }
  return sum
}

export function shaded(mesh, cast = true, receive = true) {
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  return mesh
}

export function rbox(w, h, d, material, radius = 0.01, segments = 2) {
  const r = Math.max(0.0005, Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4))
  return shaded(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segments, r), material))
}

export function cylinder(radiusTop, radiusBottom, height, material, segments = 20) {
  return shaded(new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material))
}

export function at(object, x, y, z) {
  object.position.set(x, y, z)
  return object
}

// Thin tube between two points (rope, wire, rib).
export function rod(from, to, radius, material, segments = 8) {
  const dir = new THREE.Vector3().subVectors(to, from)
  const mesh = shaded(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), segments), material))
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return mesh
}
