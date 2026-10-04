import * as THREE from 'three'
import { PAVING_TOP, PERGOLA } from './layout.js'
import { at, rbox, shaded } from './utils.js'

const POST = 0.15
const BEAM_W = 0.12
const BEAM_H = 0.24
const LAMELLA_OPEN = 1.35
const LAMELLA_PITCH = 0.19

// Aerofoil-like aluminium lamella with drip lip (profile in XY, extruded along Z).
function lamellaGeometry(length) {
  const hw = 0.1025
  const shape = new THREE.Shape()
  shape.moveTo(-hw, 0)
  shape.quadraticCurveTo(0, 0.042, hw, 0)
  shape.lineTo(hw, -0.014)
  shape.lineTo(hw - 0.008, -0.014)
  shape.lineTo(hw - 0.008, -0.004)
  shape.quadraticCurveTo(0, 0.01, -hw, -0.007)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
    curveSegments: 10,
  })
  geo.translate(0, 0, -length / 2)
  return geo
}

function heater(mats) {
  const g = new THREE.Group()
  g.add(rbox(0.95, 0.075, 0.09, mats.anthraciteFine, 0.012))
  const glow = rbox(0.86, 0.012, 0.055, mats.heaterGlow, 0.004)
  glow.position.y = -0.038
  g.add(glow)
  for (const x of [-0.4, 0.4]) g.add(at(rbox(0.03, 0.08, 0.03, mats.darkMetal, 0.004), x, 0.06, 0.02))
  return g
}

function speaker(mats) {
  const g = new THREE.Group()
  g.add(rbox(0.16, 0.25, 0.15, mats.anthraciteFine, 0.02, 3))
  const grille = rbox(0.14, 0.23, 0.012, mats.speakerGrille, 0.01, 3)
  grille.position.z = 0.072
  g.add(grille)
  const bracket = rbox(0.03, 0.12, 0.03, mats.darkMetal, 0.006)
  bracket.position.set(0, 0.16, -0.04)
  g.add(bracket)
  return g
}

export function createPergola(mats) {
  const p = PERGOLA
  const group = new THREE.Group()
  const y0 = PAVING_TOP
  const top = y0 + p.clearHeight + BEAM_H
  const width = p.x1 - p.x0
  const depth = p.z1 - p.z0
  const cx = (p.x0 + p.x1) / 2
  const cz = (p.z0 + p.z1) / 2

  // Posts with integrated downpipes (outlets at the base on the garage side)
  const postHeight = top - y0
  for (const x of [p.x0 + POST / 2, p.x1 - POST / 2]) {
    for (const z of [p.z0 + POST / 2, p.z1 - POST / 2]) {
      group.add(at(rbox(POST, postHeight, POST, mats.anthracite, 0.008), x, y0 + postHeight / 2, z))
      const foot = rbox(POST + 0.04, 0.012, POST + 0.04, mats.darkMetal, 0.004)
      group.add(at(foot, x, y0 + 0.006, z))
      if (z > cz) group.add(at(rbox(0.05, 0.03, 0.06, mats.anthracite, 0.006), x, y0 + 0.06, z + POST / 2 + 0.02))
    }
  }

  // Perimeter beams with integrated gutters
  const beamY = top - BEAM_H / 2
  for (const z of [p.z0 + BEAM_W / 2, p.z1 - BEAM_W / 2]) {
    group.add(at(rbox(width, BEAM_H, BEAM_W, mats.anthracite, 0.008), cx, beamY, z))
  }
  for (const x of [p.x0 + BEAM_W / 2, p.x1 - BEAM_W / 2]) {
    group.add(at(rbox(BEAM_W, BEAM_H, depth - 2 * BEAM_W, mats.anthracite, 0.008), x, beamY, cz))
  }
  for (const z of [p.z0 + BEAM_W + 0.02, p.z1 - BEAM_W - 0.02]) {
    group.add(at(rbox(width - 2 * BEAM_W, 0.05, 0.04, mats.darkMetal, 0.006), cx, top - BEAM_H + 0.09, z))
  }

  // Warm LED line along the inside of the frame
  const ledY = top - BEAM_H - 0.004
  for (const z of [p.z0 + BEAM_W - 0.01, p.z1 - BEAM_W + 0.01]) {
    group.add(at(new THREE.Mesh(new THREE.BoxGeometry(width - 2 * BEAM_W, 0.006, 0.012), mats.led), cx, ledY, z))
  }
  for (const x of [p.x0 + BEAM_W - 0.01, p.x1 - BEAM_W + 0.01]) {
    group.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, depth - 2 * BEAM_W), mats.led), x, ledY, cz))
  }

  // Rotating lamellas (closed = watertight, overlapping)
  const innerX0 = p.x0 + BEAM_W
  const innerX1 = p.x1 - BEAM_W
  const count = Math.floor((innerX1 - innerX0) / LAMELLA_PITCH)
  const startX = cx - ((count - 1) * LAMELLA_PITCH) / 2
  const lamellaGeo = lamellaGeometry(depth - 2 * BEAM_W - 0.02)
  const lamellas = []
  for (let i = 0; i < count; i++) {
    const lamella = shaded(new THREE.Mesh(lamellaGeo, mats.anthraciteFine))
    lamella.position.set(startX + i * LAMELLA_PITCH, top - 0.07, cz)
    lamellas.push(lamella)
    group.add(lamella)
  }

  // Infrared heaters on the side beams, aimed at the table
  const heaterY = top - BEAM_H - 0.08
  const heaterZ = 17.7
  const heaterWest = heater(mats)
  heaterWest.rotation.set(0, Math.PI / 2, 0)
  heaterWest.rotateX(-0.6)
  heaterWest.position.set(p.x0 + BEAM_W + 0.06, heaterY, heaterZ)
  const heaterEast = heater(mats)
  heaterEast.rotation.set(0, -Math.PI / 2, 0)
  heaterEast.rotateX(-0.6)
  heaterEast.position.set(p.x1 - BEAM_W - 0.06, heaterY, heaterZ)
  group.add(heaterWest, heaterEast)

  // Outdoor speakers in the north corners, angled to the centre
  for (const [x, yaw] of [[p.x0 + 0.4, 0.55], [p.x1 - 0.4, -0.55]]) {
    const s = speaker(mats)
    s.position.set(x, top - BEAM_H - 0.2, p.z0 + BEAM_W + 0.1)
    s.rotation.set(0.25, yaw, 0, 'YXZ')
    group.add(s)
  }

  // ZIP-screen cassette (west, afternoon sun) — rolled up
  group.add(at(rbox(0.11, 0.13, depth - 0.3, mats.anthracite, 0.01), p.x0 - 0.06, top - BEAM_H - 0.065, cz))

  let open = false
  let angle = 0
  return {
    group,
    get isOpen() {
      return open
    },
    setOpen(value) {
      open = value
    },
    update(dt) {
      const target = open ? LAMELLA_OPEN : 0.04
      const next = THREE.MathUtils.damp(angle, target, 2.6, dt)
      if (Math.abs(next - angle) < 1e-5) return
      angle = next
      for (const l of lamellas) l.rotation.z = angle
    },
  }
}
