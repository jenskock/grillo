import './style.css'
import { createScene3D } from './scene3d.js'

const view3dContainer = document.getElementById('view-3d-container')
const scene3d = createScene3D(view3dContainer)

document.getElementById('reset-3d')?.addEventListener('click', () => scene3d.reset())
document.getElementById('focus-grill')?.addEventListener('click', () => scene3d.focusGrill())
document.getElementById('focus-dining')?.addEventListener('click', () => scene3d.focusDining())

const lamellaButton = document.getElementById('toggle-lamellas')
lamellaButton?.addEventListener('click', () => {
  const open = scene3d.toggleLamellas()
  lamellaButton.textContent = open ? 'Lamellen schließen' : 'Lamellen öffnen'
})

if (import.meta.env.DEV) window.scene3d = scene3d

window.addEventListener('resize', () => scene3d.resize())
scene3d.start()
