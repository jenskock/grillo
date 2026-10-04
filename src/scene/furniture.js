import * as THREE from 'three'
import { DINING, KITCHEN, LOUNGE, PAVING_TOP, UMBRELLA } from './layout.js'
import { at, cylinder, rbox, rod, shaded } from './utils.js'

const Y0 = PAVING_TOP

// ---------- Outdoor kitchen (freestanding, front faces north / −z) ----------

function grillHoodGeometry(length, depth, height) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0, height * 0.35)
  s.quadraticCurveTo(depth * 0.08, height, depth * 0.5, height)
  s.quadraticCurveTo(depth, height, depth, height * 0.35)
  s.lineTo(depth, 0)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 16,
  })
  geo.rotateY(-Math.PI / 2)
  geo.translate(length / 2, 0, 0)
  return geo
}

function knob(mats) {
  const g = new THREE.Group()
  const body = cylinder(0.022, 0.024, 0.03, mats.darkMetal, 24)
  body.rotation.x = Math.PI / 2
  const cap = cylinder(0.018, 0.018, 0.004, mats.stainless, 24)
  cap.rotation.x = Math.PI / 2
  cap.position.z = -0.017
  g.add(body, cap)
  return g
}

function barHandle(length, mats, vertical = false) {
  const g = new THREE.Group()
  const bar = cylinder(0.008, 0.008, length, mats.stainless, 12)
  if (!vertical) bar.rotation.z = Math.PI / 2
  bar.position.z = -0.035
  g.add(bar)
  for (const t of [-0.4, 0.4]) {
    const stand = cylinder(0.005, 0.005, 0.035, mats.stainless, 8)
    stand.rotation.x = Math.PI / 2
    stand.position.set(vertical ? 0 : t * length, vertical ? t * length : 0, -0.017)
    g.add(stand)
  }
  return g
}

export function createKitchen(mats) {
  const k = KITCHEN
  const group = new THREE.Group()
  const len = k.x1 - k.x0
  const depth = k.z1 - k.z0
  const cz = (k.z0 + k.z1) / 2
  const front = k.z0
  const carcassH = k.height - 0.04 - 0.08
  const carcassY = Y0 + 0.08 + carcassH / 2
  const fridgeX0 = k.x1 - 0.6

  // Plinth (recessed), carcass, light natural-stone worktop with waterfall end
  group.add(at(rbox(len - 0.06, 0.08, depth - 0.1, mats.darkMetal, 0.004), (k.x0 + k.x1) / 2, Y0 + 0.04, cz + 0.03))
  const mainLen = fridgeX0 - k.x0
  group.add(at(rbox(mainLen, carcassH, depth - 0.02, mats.anthracite, 0.006), k.x0 + mainLen / 2, carcassY, cz + 0.01))
  group.add(at(rbox(0.6, carcassH, 0.18, mats.anthracite, 0.006), fridgeX0 + 0.3, carcassY, k.z1 - 0.09))
  for (const x of [fridgeX0 + 0.01, k.x1 - 0.01]) group.add(at(rbox(0.02, carcassH, depth - 0.02, mats.anthracite, 0.004), x, carcassY, cz + 0.01))
  const worktop = rbox(len + 0.04, 0.04, depth + 0.03, mats.lightStone, 0.008)
  group.add(at(worktop, (k.x0 + k.x1) / 2 + 0.02, Y0 + k.height - 0.02, cz - 0.015))
  group.add(at(rbox(0.04, k.height, depth + 0.03, mats.lightStone, 0.006), k.x0 - 0.0, Y0 + k.height / 2, cz - 0.015))

  // Storage (cushions / accessories) — doors with teak slats
  const storeX0 = k.x0 + 0.04
  const storeX1 = 13.8
  const doorW = (storeX1 - storeX0) / 2
  for (let d = 0; d < 2; d++) {
    const dx = storeX0 + doorW * d + doorW / 2
    group.add(at(rbox(doorW - 0.008, carcassH - 0.02, 0.02, mats.anthracite, 0.004), dx, carcassY, front - 0.005))
    const slats = 8
    const slatW = (doorW - 0.06) / slats
    for (let i = 0; i < slats; i++) {
      const sx = dx - doorW / 2 + 0.03 + slatW * (i + 0.5)
      group.add(at(rbox(slatW - 0.012, carcassH - 0.08, 0.018, mats.teak, 0.004), sx, carcassY, front - 0.022))
    }
  }

  // Drawers
  const drawerX = (13.8 + 14.7) / 2
  let y = Y0 + 0.08
  for (const h of [0.3, 0.26, carcassH - 0.56]) {
    group.add(at(rbox(0.88, h - 0.008, 0.02, mats.anthracite, 0.004), drawerX, y + h / 2, front - 0.008))
    const handle = barHandle(0.42, mats)
    handle.position.set(drawerX, y + h - 0.045, front - 0.012)
    group.add(handle)
    y += h
  }

  // Built-in gas grill: firebox, stainless hood, control panel, gas-bottle doors below
  const grillX = (14.7 + 15.6) / 2
  const grillW = 0.86
  const panelH = 0.13
  group.add(at(rbox(grillW, panelH, 0.03, mats.stainless, 0.006), grillX, Y0 + k.height - 0.04 - panelH / 2, front - 0.01))
  for (let i = 0; i < 4; i++) {
    const kn = knob(mats)
    kn.position.set(grillX - 0.27 + i * 0.18, Y0 + k.height - 0.04 - panelH / 2, front - 0.03)
    group.add(kn)
  }
  const doorH = carcassH - panelH - 0.02
  for (const side of [-1, 1]) {
    const dx = grillX + side * (grillW / 4)
    group.add(at(rbox(grillW / 2 - 0.008, doorH, 0.02, mats.stainless, 0.004), dx, Y0 + 0.08 + doorH / 2, front - 0.01))
    const h = barHandle(0.3, mats, true)
    h.position.set(grillX + side * 0.05, Y0 + 0.08 + doorH * 0.6, front - 0.012)
    group.add(h)
  }
  const grillBase = rbox(grillW, 0.05, 0.56, mats.stainless, 0.006)
  group.add(at(grillBase, grillX, Y0 + k.height + 0.025, cz - 0.01))
  const hood = shaded(new THREE.Mesh(grillHoodGeometry(grillW - 0.01, 0.54, 0.24), mats.stainless))
  hood.position.set(grillX, Y0 + k.height + 0.05, front + 0.04)
  group.add(hood)
  const hoodHandle = barHandle(0.6, mats)
  hoodHandle.position.set(grillX, Y0 + k.height + 0.13, front + 0.035)
  group.add(hoodHandle)

  // Drinks fridge: open-front niche with glass door, shelves and bottles
  const fx = fridgeX0 + 0.3
  const fy0 = Y0 + 0.1
  const fh = carcassH - 0.04
  group.add(at(rbox(0.56, fh, 0.02, mats.fridgeLight, 0.004), fx, fy0 + fh / 2, k.z1 - 0.19))
  group.add(at(rbox(0.56, 0.02, 0.44, mats.anthracite, 0.004), fx, fy0, front + 0.24))
  group.add(at(rbox(0.56, 0.02, 0.44, mats.anthracite, 0.004), fx, fy0 + fh, front + 0.24))
  const bottleMats = [mats.bottleGreen, mats.bottleAmber]
  for (const [s, shelfY] of [0.02, 0.34].entries()) {
    group.add(at(rbox(0.54, 0.008, 0.4, mats.glass, 0.002), fx, fy0 + shelfY + 0.01, front + 0.25))
    for (let i = 0; i < 5; i++) {
      const b = cylinder(0.032, 0.032, 0.22, bottleMats[(i + s) % 2], 14)
      b.position.set(fx - 0.2 + i * 0.1, fy0 + shelfY + 0.125, front + 0.3)
      const neck = cylinder(0.012, 0.03, 0.08, bottleMats[(i + s) % 2], 12)
      neck.position.set(fx - 0.2 + i * 0.1, fy0 + shelfY + 0.275, front + 0.3)
      group.add(b, neck)
    }
  }
  const fridgeFrame = new THREE.Group()
  fridgeFrame.add(at(rbox(0.58, 0.04, 0.03, mats.stainless, 0.004), 0, fh / 2 - 0.02, 0))
  fridgeFrame.add(at(rbox(0.58, 0.04, 0.03, mats.stainless, 0.004), 0, -fh / 2 + 0.02, 0))
  fridgeFrame.add(at(rbox(0.04, fh, 0.03, mats.stainless, 0.004), -0.27, 0, 0))
  fridgeFrame.add(at(rbox(0.04, fh, 0.03, mats.stainless, 0.004), 0.27, 0, 0))
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, fh - 0.08), mats.glass)
  pane.rotation.y = Math.PI
  fridgeFrame.add(pane)
  const fh2 = barHandle(0.45, mats, true)
  fh2.position.set(-0.22, 0, -0.01)
  fridgeFrame.add(fh2)
  fridgeFrame.position.set(fx, fy0 + fh / 2, front - 0.005)
  group.add(fridgeFrame)

  // Worktop accessories
  const board = rbox(0.42, 0.025, 0.3, mats.teak, 0.01)
  group.add(at(board, 14.25, Y0 + k.height + 0.0125, cz - 0.05))
  const mill = cylinder(0.022, 0.026, 0.2, mats.darkMetal, 16)
  group.add(at(mill, 13.85, Y0 + k.height + 0.1, cz + 0.15))
  const oil = cylinder(0.03, 0.03, 0.24, mats.bottleGreen, 16)
  group.add(at(oil, 13.95, Y0 + k.height + 0.12, cz + 0.17))
  const pot = cylinder(0.09, 0.07, 0.16, mats.ceramic, 24)
  group.add(at(pot, 13.1, Y0 + k.height + 0.08, cz + 0.08))
  return group
}

// ---------- Dining for six ----------

function diningChair(mats) {
  const g = new THREE.Group()
  const hw = 0.265
  for (const x of [-hw, hw]) {
    g.add(at(rbox(0.03, 0.65, 0.03, mats.anthracite, 0.008), x, 0.325, 0.23))
    const rear = rbox(0.03, 0.82, 0.03, mats.anthracite, 0.008)
    rear.position.set(x, 0.41, -0.25)
    rear.rotation.x = -0.06
    g.add(rear)
    g.add(at(rbox(0.05, 0.025, 0.54, mats.teak, 0.01), x, 0.66, -0.01))
    g.add(at(rbox(0.025, 0.03, 0.5, mats.anthracite, 0.006), x, 0.4, -0.01))
  }
  g.add(at(rbox(0.53, 0.03, 0.025, mats.anthracite, 0.006), 0, 0.4, 0.23))
  g.add(at(rbox(0.53, 0.03, 0.025, mats.anthracite, 0.006), 0, 0.4, -0.24))
  g.add(at(rbox(0.5, 0.075, 0.5, mats.cushion, 0.03, 3), 0, 0.45, -0.005))
  for (let i = 0; i < 8; i++) {
    const yy = 0.5 + i * 0.038
    const zz = -0.255 - (yy - 0.41) * 0.06
    g.add(rod(new THREE.Vector3(-hw, yy, zz), new THREE.Vector3(hw, yy, zz), 0.0065, mats.rope, 6))
  }
  const rail = rbox(0.58, 0.05, 0.035, mats.teak, 0.012)
  rail.position.set(0, 0.81, -0.275)
  g.add(rail)
  return g
}

export function createDining(mats) {
  const d = DINING
  const group = new THREE.Group()
  const top = Y0 + 0.75
  const tabletop = rbox(d.length, 0.04, d.width, mats.teakLong, 0.012, 3)
  group.add(at(tabletop, d.x, top - 0.02, d.z))
  group.add(at(rbox(d.length - 0.3, 0.06, d.width - 0.2, mats.anthracite, 0.006), d.x, top - 0.07, d.z))
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      group.add(at(rbox(0.07, 0.71, 0.07, mats.anthracite, 0.01), d.x + sx * (d.length / 2 - 0.16), Y0 + 0.355, d.z + sz * (d.width / 2 - 0.12)))
    }
  }

  const chair = diningChair(mats)
  const spots = [-0.7, 0, 0.7]
  spots.forEach((dx, i) => {
    const north = chair.clone()
    north.position.set(d.x + dx, Y0, d.z - d.width / 2 - 0.3 - (i === 2 ? 0.08 : 0))
    north.rotation.y = i === 2 ? 0.08 : 0
    const south = chair.clone()
    south.position.set(d.x + dx, Y0, d.z + d.width / 2 + 0.3 + (i === 0 ? 0.06 : 0))
    south.rotation.y = Math.PI + (i === 0 ? -0.06 : 0)
    group.add(north, south)
  })

  // Table setting: runner, carafe, glasses, bowl
  const runner = rbox(1.6, 0.004, 0.32, mats.cushionSand, 0.002)
  group.add(at(runner, d.x, top + 0.002, d.z))
  const bowlProfile = [
    [0.0, 0.0],
    [0.06, 0.0],
    [0.07, 0.01],
    [0.15, 0.05],
    [0.19, 0.085],
    [0.18, 0.09],
    [0.14, 0.06],
    [0.06, 0.02],
    [0.0, 0.018],
  ].map(([r, h]) => new THREE.Vector2(r, h))
  const bowl = shaded(new THREE.Mesh(new THREE.LatheGeometry(bowlProfile, 48), mats.ceramic))
  bowl.position.set(d.x, top + 0.004, d.z)
  group.add(bowl)
  const glassProfile = [
    [0.0, 0.0],
    [0.032, 0.0],
    [0.034, 0.004],
    [0.038, 0.11],
    [0.035, 0.11],
    [0.03, 0.008],
    [0.0, 0.008],
  ].map(([r, h]) => new THREE.Vector2(r, h))
  const glassGeo = new THREE.LatheGeometry(glassProfile, 24)
  const carafeProfile = [
    [0, 0],
    [0.065, 0],
    [0.07, 0.01],
    [0.07, 0.15],
    [0.04, 0.22],
    [0.035, 0.27],
    [0.03, 0.27],
    [0.0, 0.27],
  ].map(([r, h]) => new THREE.Vector2(r, h))
  group.add(at(new THREE.Mesh(new THREE.LatheGeometry(carafeProfile, 32), mats.glass), d.x + 0.45, top, d.z + 0.05))
  for (const dx of spots) {
    for (const sz of [-1, 1]) {
      group.add(at(new THREE.Mesh(glassGeo, mats.glass), d.x + dx + 0.18, top, d.z + sz * 0.3))
    }
  }
  return group
}

// ---------- Lounge (open, in front of the louvred roof) ----------

function loungeModule(length, mats, { arms = true, pillows = 0 } = {}) {
  const g = new THREE.Group()
  const D = 0.92
  const baseTop = 0.22
  for (const x of [-length / 2 + 0.08, length / 2 - 0.08]) {
    for (const z of [-D / 2 + 0.08, D / 2 - 0.08]) g.add(at(rbox(0.05, 0.05, 0.05, mats.darkMetal, 0.01), x, 0.025, z))
  }
  g.add(at(rbox(length, baseTop - 0.05, D, mats.anthracite, 0.012), 0, 0.05 + (baseTop - 0.05) / 2, 0))
  g.add(at(rbox(length - 0.04, 0.03, 0.02, mats.teak, 0.006), 0, baseTop - 0.05, D / 2 + 0.002))

  const armW = arms ? 0.12 : 0
  const seatLen = length - 2 * armW
  const seats = Math.max(1, Math.round(seatLen / 0.8))
  const seatW = seatLen / seats
  for (let i = 0; i < seats; i++) {
    const x = -seatLen / 2 + seatW * (i + 0.5)
    g.add(at(rbox(seatW - 0.012, 0.17, D - 0.2, mats.cushion, 0.055, 4), x, baseTop + 0.085, 0.09))
    const back = rbox(seatW - 0.03, 0.46, 0.18, mats.cushion, 0.06, 4)
    back.position.set(x, baseTop + 0.17 + 0.2, -D / 2 + 0.17)
    back.rotation.x = -0.2
    g.add(back)
  }
  g.add(at(rbox(length, 0.36, 0.06, mats.anthracite, 0.01), 0, baseTop + 0.18, -D / 2 + 0.03))
  if (arms) {
    for (const x of [-length / 2 + armW / 2, length / 2 - armW / 2]) {
      g.add(at(rbox(armW, 0.36, D, mats.anthracite, 0.012), x, baseTop + 0.18, 0))
      g.add(at(rbox(armW + 0.02, 0.03, D + 0.02, mats.teak, 0.008), x, baseTop + 0.375, 0))
    }
  }
  const pillowMats = [mats.cushionAccent, mats.cushionSand]
  for (let i = 0; i < pillows; i++) {
    const p = rbox(0.44, 0.42, 0.13, pillowMats[i % 2], 0.06, 4)
    const side = i % 2 === 0 ? -1 : 1
    p.position.set(side * (seatLen / 2 - 0.3), baseTop + 0.38, -D / 2 + 0.33)
    p.rotation.set(-0.25, side * 0.25, side * 0.08)
    g.add(p)
  }
  return g
}

export function createLounge(mats) {
  const group = new THREE.Group()
  const L = LOUNGE

  const rug = rbox(2.8, 0.012, 3.0, mats.rug, 0.004)
  group.add(at(rug, 14.9, Y0 + 0.006, L.z))

  const sofa = loungeModule(2.4, mats, { pillows: 2 })
  sofa.position.set(L.sofaX, Y0 + 0.012, L.z)
  sofa.rotation.y = -Math.PI / 2
  group.add(sofa)

  for (const [dz, rot] of [[-0.98, 0], [0.98, Math.PI]]) {
    const chair = loungeModule(0.95, mats, { pillows: 1 })
    chair.position.set(L.chairX, Y0 + 0.012, L.z + dz)
    chair.rotation.y = rot + (dz < 0 ? 0.12 : -0.12)
    group.add(chair)
  }

  // Coffee table: light stone top on an anthracite sled frame
  const tx = L.tableX
  group.add(at(rbox(0.9, 0.04, 0.55, mats.lightStone, 0.01), tx, Y0 + 0.36, L.z))
  for (const sx of [-1, 1]) {
    group.add(at(rbox(0.025, 0.32, 0.025, mats.anthracite, 0.006), tx + sx * 0.38, Y0 + 0.18, L.z - 0.22))
    group.add(at(rbox(0.025, 0.32, 0.025, mats.anthracite, 0.006), tx + sx * 0.38, Y0 + 0.18, L.z + 0.22))
    group.add(at(rbox(0.025, 0.025, 0.47, mats.anthracite, 0.006), tx + sx * 0.38, Y0 + 0.02, L.z))
  }
  const tray = rbox(0.38, 0.02, 0.26, mats.teak, 0.008)
  group.add(at(tray, tx - 0.12, Y0 + 0.39, L.z + 0.05))
  const lantern = new THREE.Group()
  lantern.add(at(cylinder(0.06, 0.06, 0.2, mats.glass, 20), 0, 0.1, 0))
  lantern.add(at(cylinder(0.065, 0.065, 0.015, mats.darkMetal, 20), 0, 0.007, 0))
  lantern.add(at(cylinder(0.065, 0.065, 0.015, mats.darkMetal, 20), 0, 0.2, 0))
  lantern.add(at(cylinder(0.025, 0.025, 0.06, mats.ceramic, 16), 0, 0.045, 0))
  lantern.position.set(tx - 0.12, Y0 + 0.4, L.z + 0.05)
  group.add(lantern)
  const vase = cylinder(0.05, 0.07, 0.18, mats.ceramic, 24)
  group.add(at(vase, tx + 0.25, Y0 + 0.47, L.z - 0.1))
  return group
}

// ---------- Cantilever parasol for the lounge (daytime shade) ----------

export function createUmbrella(mats) {
  const u = UMBRELLA
  const group = new THREE.Group()
  const mastTop = Y0 + 2.85
  group.add(at(rbox(0.32, 0.012, 0.32, mats.darkMetal, 0.004), u.mastX, Y0 + 0.006, u.mastZ))
  group.add(at(cylinder(0.04, 0.045, mastTop - Y0, mats.anthracite, 20), u.mastX, (Y0 + mastTop) / 2, u.mastZ))
  group.add(at(rbox(0.08, 0.12, 0.08, mats.darkMetal, 0.01), u.mastX, Y0 + 1.15, u.mastZ))
  const hubTop = new THREE.Vector3(u.hubX, mastTop - 0.05, u.hubZ)
  group.add(rod(new THREE.Vector3(u.mastX, mastTop - 0.05, u.mastZ), hubTop, 0.028, mats.anthracite, 14))
  group.add(at(cylinder(0.035, 0.035, 0.12, mats.darkMetal, 16), u.hubX, mastTop - 0.12, u.hubZ))

  const half = 1.5
  const apex = new THREE.Vector3(u.hubX, mastTop - 0.15, u.hubZ)
  const edgeY = mastTop - 0.45
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ].map(([dx, dz]) => new THREE.Vector3(u.hubX + dx, edgeY, u.hubZ + dz))
  const positions = []
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    positions.push(apex.x, apex.y, apex.z, b.x, b.y, b.z, a.x, a.y, a.z)
  }
  const canopyGeo = new THREE.BufferGeometry()
  canopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  canopyGeo.computeVertexNormals()
  group.add(shaded(new THREE.Mesh(canopyGeo, mats.canopy)))
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const len = a.distanceTo(b)
    const valance = rbox(len, 0.07, 0.004, mats.canopy, 0.001)
    valance.position.set(mid.x, edgeY - 0.035, mid.z)
    valance.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x)
    group.add(valance)
    const below = new THREE.Vector3(0, -0.012, 0)
    group.add(rod(apex.clone().add(below), a.clone().add(below), 0.007, mats.anthracite, 6))
    group.add(rod(apex.clone().add(below), mid.clone().add(below), 0.006, mats.anthracite, 6))
  }
  return group
}
