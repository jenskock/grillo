// World axes: x = west → east (0..17), z = north → south (0..21), y = up. House sits at z < 0.

export const GARDEN = { width: 17, depth: 21 }
export const HOUSE = { depth: 3.2, height: 3.4 }
export const EXISTING_TERRACE = { x0: 1, x1: 11, z0: 0, z1: 3.4 }
export const EXISTING_PATH = { x0: 11, x1: 17, z0: 0, z1: 3.4 }
export const HEDGE = { thickness: 1, height: 1.7 }
export const GATE = { x: 1, width: 3.5 }
export const FENCE_Z = 20.95
export const TREE = { x: 12.2, z: 11.5 }
export const SHRUB = { x: 11.0, z: 5.6 }

// Grill corner (6 × 8 m, south-east). South boundary = neighbour garage (not ours).
export const TERRACE = { x: 11, z: 13, width: 6, depth: 8 }
export const GARAGE = { x0: 10.9, x1: 17.1, z0: 21.05, z1: 24.0, height: 2.8 }

export const PAVING_TOP = 0.06
// Straight along both boundaries, stepped toward the garden.
export const PAVING_OUTLINE = [
  [11.3, 21.0],
  [17.0, 21.0],
  [17.0, 13.2],
  [12.4, 13.2],
  [12.4, 15.4],
  [11.3, 15.4],
]

// Freestanding louvred roof (≥ 0.4 m clear of the garage).
export const PERGOLA = { x0: 11.6, x1: 16.4, z0: 16.2, z1: 20.6, clearHeight: 2.5 }
export const KITCHEN = { x0: 12.6, x1: 16.2, z0: 19.9, z1: 20.55, height: 0.92 }
export const DINING = { x: 14.0, z: 17.7, length: 2.2, width: 1.0 }
export const LOUNGE = { sofaX: 15.9, z: 14.7, tableX: 14.65, chairX: 14.4 }
export const UMBRELLA = { mastX: 16.3, mastZ: 13.35, hubX: 14.9, hubZ: 14.7 }

// Evergreen privacy planting on the boundary without the garage (east).
export const PRIVACY_PLANTERS = [
  { x0: 16.5, x1: 17.0, z0: 13.2, z1: 15.7 },
  { x0: 16.5, x1: 17.0, z0: 15.75, z1: 18.25 },
  { x0: 16.5, x1: 17.0, z0: 18.3, z1: 20.8 },
]
export const WEST_PLANTER = { x0: 11.35, x1: 11.85, z0: 18.9, z1: 20.3 }
// Planting bed in the paving notch, rounded toward the lawn.
export const GARDEN_BED_OUTLINE = (() => {
  const points = [[12.4, 12.9], [12.4, 15.4], [11.0, 15.4], [11.0, 14.1]]
  const cx = 12.2
  const cz = 14.1
  const r = 1.2
  for (let i = 1; i < 14; i++) {
    const a = Math.PI + (i / 14) * (Math.PI / 2)
    points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)])
  }
  points.push([12.2, 12.9])
  return points
})()

export function isInsidePolygon(x, z, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

// Where lawn blades may grow.
export function isLawn(x, z) {
  if (x < HEDGE.thickness + 0.05 || x > GARDEN.width - 0.05) return false
  if (z < EXISTING_TERRACE.z1 + 0.05 || z > GARDEN.depth - 0.05) return false
  if (z > GARDEN.depth - HEDGE.thickness - 0.05 && x < TERRACE.x) return false
  const m = 0.06
  for (const [dx, dz] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) {
    if (isInsidePolygon(x + dx, z + dz, PAVING_OUTLINE)) return false
  }
  for (const [dx, dz] of [[0, 0], [m, 0], [0, m], [m, m]]) {
    if (isInsidePolygon(x + dx, z + dz, GARDEN_BED_OUTLINE)) return false
  }
  if (Math.hypot(x - SHRUB.x, z - SHRUB.z) < 0.75) return false
  if (Math.hypot(x - TREE.x, z - TREE.z) < 0.18) return false
  return true
}
