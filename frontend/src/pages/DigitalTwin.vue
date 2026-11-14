<template>
  <div class="twin-page">
    <SimulationClockBar />

    <div class="twin-layout">
      <!-- 3D Canvas Viewport -->
      <div class="canvas-container glass-card" ref="viewportRef">
        <canvas ref="canvasRef" class="webgl-canvas"></canvas>

        <!-- Floating 3D HUD Overlay -->
        <div class="viewport-hud">
          <!-- Top Left: Building Site & Real-time Live Badge -->
          <div class="hud-top-left">
            <div class="hud-pill">
              <span class="live-dot"></span>
              <strong>3D SMART BUILDING TWIN</strong>
              <span class="hud-sub">Chennai 13.08°N — Two-Floor Cutaway</span>
            </div>
            <div class="telemetry-pill">
              <span>Solar: <strong class="text-solar">{{ currentStep.solar_kw }} kW</strong></span>
              <span>Load: <strong class="text-load">{{ currentStep.load_kw }} kW</strong></span>
              <span>BESS: <strong class="text-battery">{{ currentStep.battery_kw }} kW ({{ currentStep.soc }}%)</strong></span>
              <span>Grid: <strong class="text-grid">{{ netGridText }}</strong></span>
            </div>
          </div>

          <!-- Top Right: View Presets & Roof Toggle -->
          <div class="hud-top-right">
            <button class="hud-btn" :class="{ active: roofOpen }" @click="toggleRoof">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>{{ roofOpen ? 'Roof Open (Cutaway)' : 'Roof Closed (Full)' }}</span>
            </button>
            <div class="preset-group">
              <button class="preset-btn" :class="{ active: activeView === 'iso' }" @click="setCameraView('iso')">Isometric</button>
              <button class="preset-btn" :class="{ active: activeView === 'top' }" @click="setCameraView('top')">Top</button>
              <button class="preset-btn" :class="{ active: activeView === 'front' }" @click="setCameraView('front')">Front</button>
              <button class="preset-btn" :class="{ active: activeView === 'utility' }" @click="setCameraView('utility')">Utility</button>
            </div>
          </div>

          <!-- Bottom Floating Instructions & 3D Legend -->
          <div class="hud-bottom-row">
            <div class="hud-legend">
              <span class="legend-item"><span class="legend-chip chip-solar"></span>Solar PV Array</span>
              <span class="legend-item"><span class="legend-chip chip-inv"></span>Inverter Substation</span>
              <span class="legend-item"><span class="legend-chip chip-battery"></span>BESS Container</span>
              <span class="legend-item"><span class="legend-chip chip-grid"></span>11kV Feeder Pole</span>
            </div>
            <div class="hud-instructions">
              <span>Left Drag: <strong>Orbit</strong> | Right Drag: <strong>Pan</strong> | Scroll: <strong>Zoom</strong> | Click Room: <strong>Inspect</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sub-Zone & Equipment Inspector Panel -->
      <div class="inspector-panel glass-card card-accent-grid">
        <!-- Room Inspector -->
        <div class="inspector-section">
          <div class="section-header">
            <div class="header-left">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              <h3 class="section-title">{{ selectedRoom ? selectedRoom.label : 'Facility Sub-Zones' }}</h3>
            </div>
            <span v-if="selectedRoom" class="room-kw-badge text-load">{{ selectedRoom.kw }} kW</span>
          </div>

          <div v-if="selectedRoom" class="room-detail">
            <span class="detail-label">Active Zone Appliances</span>
            <div class="appliance-list">
              <div v-for="(app, idx) in selectedRoom.appliances" :key="idx" class="appliance-chip">
                <span class="app-dot"></span>
                <span>{{ app }}</span>
              </div>
            </div>
            <button class="btn btn-outline btn-xs" @click="selectedRoomId = null">← View All Zones</button>
          </div>

          <!-- Room Selection Grid -->
          <div v-else class="rooms-grid">
            <div 
              v-for="r in currentStep.rooms || []" 
              :key="r.id" 
              class="room-card"
              :class="{ active: selectedRoomId === r.id }"
              @click="selectedRoomId = r.id"
            >
              <div class="rc-top">
                <span class="rc-name">{{ r.label }}</span>
                <span class="rc-kw text-load">{{ r.kw }} kW</span>
              </div>
              <div class="rc-bar-bg">
                <div class="rc-bar-fill" :style="{ width: Math.min(100, (r.kw / 25) * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Utility Equipment Telemetry -->
        <div class="inspector-section">
          <div class="section-header">
            <div class="header-left">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <h3 class="section-title">Utility Substation Telemetry</h3>
            </div>
            <span class="badge badge-eco">Live Simulation</span>
          </div>

          <div class="equipment-list">
            <!-- Inverter -->
            <div class="equip-card">
              <div class="eq-icon text-solar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line></svg>
              </div>
              <div class="eq-info">
                <span class="eq-title">Solar Inverter (120 kWp)</span>
                <span class="eq-sub">Active AC: <strong class="text-solar">{{ currentStep.solar_kw }} kW</strong> | NOCT: {{ currentStep.cell_temp }}°C</span>
              </div>
            </div>

            <!-- BESS -->
            <div class="equip-card">
              <div class="eq-icon text-battery">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2"></rect><line x1="23" y1="10" x2="23" y2="14"></line></svg>
              </div>
              <div class="eq-info">
                <span class="eq-title">Lithium BESS Container (250 kWh)</span>
                <span class="eq-sub">SoC: <strong class="text-battery">{{ currentStep.soc }}%</strong> | Temp: {{ currentStep.battery_temp }}°C | {{ currentStep.c_rate }}C</span>
              </div>
            </div>

            <!-- Smart Meter -->
            <div class="equip-card">
              <div class="eq-icon text-grid">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div class="eq-info">
                <span class="eq-title">Schneider EM6400 Smart Meter</span>
                <span class="eq-sub">240V / 415V 3-Phase | 50.0 Hz | PF 0.98</span>
              </div>
            </div>

            <!-- 11kV Feeder Pole -->
            <div class="equip-card">
              <div class="eq-icon text-load">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              </div>
              <div class="eq-info">
                <span class="eq-title">TNPDCL 11kV External Feeder</span>
                <span class="eq-sub">{{ netGridText }} @ ₹{{ currentStep.tariff_rate }}/kWh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import SimulationClockBar from '../components/SimulationClockBar.vue'
import { useSimulationStore } from '../store/simulationStore.js'

const store = useSimulationStore()
const currentStep = computed(() => store.currentStepData)

const viewportRef = ref(null)
const canvasRef = ref(null)

const selectedRoomId = ref(null)
const roofOpen = ref(true)
const activeView = ref('iso')

const selectedRoom = computed(() => {
  if (!selectedRoomId.value) return null
  return (currentStep.value.rooms || []).find(r => r.id === selectedRoomId.value)
})

const netGridText = computed(() => {
  const imp = currentStep.value.grid_import_kw || 0
  const exp = currentStep.value.grid_export_kw || 0
  if (imp > 0) return `Importing ${imp} kW`
  if (exp > 0) return `Exporting ${exp} kW`
  return 'Balanced (0 kW)'
})

// Three.js State
let scene, camera, renderer, controls, animationFrameId
let solarPanelsMesh, roofMesh, batteryMesh, inverterMesh, gridPoleGroup
let cableParticles = []

function initThree() {
  if (!canvasRef.value || !viewportRef.value) return

  let width = viewportRef.value.clientWidth || 800
  let height = viewportRef.value.clientHeight || 550
  if (width <= 0) width = 800
  if (height <= 0) height = 550

  // 1. Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a0f1d')
  scene.fog = new THREE.FogExp2('#0a0f1d', 0.012)

  // 2. Camera
  camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 500)
  camera.position.set(-28, 22, 28)

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // 4. OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 2, 0)
  controls.maxPolarAngle = Math.PI / 2 - 0.05 // Don't go below ground

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight('#94a3b8', 0.8)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight('#ffffff', 1.8)
  dirLight.position.set(25, 40, 20)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  // Blue ground reflection light
  const hemiLight = new THREE.HemisphereLight('#38bdf8', '#0f172a', 0.4)
  scene.add(hemiLight)

  // 6. Build 3D World
  buildEnvironment()
  buildBuilding()
  buildCables()

  // 7. Render Loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)
    controls.update()
    updateDynamicVisuals()
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', onWindowResize)
}

function buildEnvironment() {
  // Ground plane (70m x 50m)
  const groundGeo = new THREE.PlaneGeometry(80, 60)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.9, metalness: 0.1 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  scene.add(ground)

  // Grid line accents
  const gridHelper = new THREE.GridHelper(80, 40, '#1e293b', '#0f172a')
  gridHelper.position.y = 0.01
  scene.add(gridHelper)

  // External 11kV Grid Feeder Pole at [-19, 0, -4.5]
  gridPoleGroup = new THREE.Group()
  gridPoleGroup.position.set(-19, 0, -4.5)

  // Main Pole
  const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 8, 12)
  const poleMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = 4
  pole.castShadow = true
  gridPoleGroup.add(pole)

  // Crossarms
  const armGeo = new THREE.BoxGeometry(2.5, 0.15, 0.2)
  const armMat = new THREE.MeshStandardMaterial({ color: '#64748b' })
  const arm1 = new THREE.Mesh(armGeo, armMat)
  arm1.position.set(0, 7.2, 0)
  gridPoleGroup.add(arm1)

  // Transformer Canister on pole
  const transGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12)
  const transMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.5 })
  const trans = new THREE.Mesh(transGeo, transMat)
  trans.position.set(0.6, 5.5, 0)
  gridPoleGroup.add(trans)

  scene.add(gridPoleGroup)
}

function buildBuilding() {
  const buildingGroup = new THREE.Group()

  // 1. Foundation Slab (31m x 17m x 0.2m)
  const slabGeo = new THREE.BoxGeometry(31, 0.2, 17)
  const slabMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 })
  const slab = new THREE.Mesh(slabGeo, slabMat)
  slab.position.y = 0.1
  slab.receiveShadow = true
  buildingGroup.add(slab)

  // 2. Room Floor Tiles (Row 1 & Row 2)
  const roomLayouts = [
    { id: 'utility', pos: [-10, 0.21, -4.5], size: [7, 7], color: '#132e47' },
    { id: 'room1',   pos: [-1,  0.21, -4.5], size: [9, 7], color: '#172554' },
    { id: 'room2',   pos: [8.5, 0.21, -4.5], size: [9, 7], color: '#1e1b4b' },
    { id: 'kitchen', pos: [-10, 0.21, 4.5],  size: [7, 7], color: '#2d1b4e' },
    { id: 'mainhall',pos: [0.5, 0.21, 4.5],  size: [13, 7],color: '#1e293b' },
    { id: 'office',  pos: [9.5, 0.21, 4.5],  size: [9, 7], color: '#172554' },
  ]

  roomLayouts.forEach(r => {
    const rGeo = new THREE.PlaneGeometry(r.size[0] - 0.2, r.size[1] - 0.2)
    const rMat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.5 })
    const rMesh = new THREE.Mesh(rGeo, rMat)
    rMesh.rotation.x = -Math.PI / 2
    rMesh.position.set(...r.pos)
    rMesh.userData = { roomId: r.id }
    buildingGroup.add(rMesh)

    // Low Cutaway Wall Outline (height 0.8m)
    const wallGeo = new THREE.BoxGeometry(r.size[0], 0.8, 0.15)
    const wallMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 })
    const wallN = new THREE.Mesh(wallGeo, wallMat)
    wallN.position.set(r.pos[0], 0.6, r.pos[2] - r.size[1] / 2)
    buildingGroup.add(wallN)
  })

  // 3. Central Corridor Strip (z = 0)
  const corrGeo = new THREE.PlaneGeometry(28, 1.8)
  const corrMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 })
  const corr = new THREE.Mesh(corrGeo, corrMat)
  corr.rotation.x = -Math.PI / 2
  corr.position.set(0, 0.215, 0)
  buildingGroup.add(corr)

  // 4. Utility Room Equipment in Utility [-10, 0.2, -4.5]
  // Inverter Box
  const invGeo = new THREE.BoxGeometry(1.2, 2.0, 0.6)
  const invMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.4, roughness: 0.3 })
  inverterMesh = new THREE.Mesh(invGeo, invMat)
  inverterMesh.position.set(-11.5, 1.2, -4.5)
  inverterMesh.castShadow = true
  buildingGroup.add(inverterMesh)

  // Battery Storage Rack (250 kWh Container)
  const batGeo = new THREE.BoxGeometry(2.5, 1.8, 1.0)
  const batMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.6, roughness: 0.2 })
  batteryMesh = new THREE.Mesh(batGeo, batMat)
  batteryMesh.position.set(-9.5, 1.1, -4.5)
  batteryMesh.castShadow = true
  buildingGroup.add(batteryMesh)

  // Smart Meter & Distribution Panel
  const meterGeo = new THREE.BoxGeometry(0.8, 1.6, 0.3)
  const meterMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.5 })
  const meter = new THREE.Mesh(meterGeo, meterMat)
  meter.position.set(-7.5, 1.0, -4.5)
  buildingGroup.add(meter)

  // 5. Rooftop Structure & 120 kWp Solar PV Array (y = 3.6m)
  const roofGeo = new THREE.BoxGeometry(30, 0.15, 16)
  const roofMat = new THREE.MeshStandardMaterial({ color: '#334155', transparent: true, opacity: 0.35 })
  roofMesh = new THREE.Mesh(roofGeo, roofMat)
  roofMesh.position.set(0, 3.6, 0)
  buildingGroup.add(roofMesh)

  // Solar Panel Arrays on Roof (tilted at 13° towards South)
  const solarGroup = new THREE.Group()
  solarGroup.position.set(0, 3.8, 0)

  // 3 Rows of 8 Solar Modules
  const panelGeo = new THREE.BoxGeometry(3.0, 0.08, 1.8)
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.8,
    roughness: 0.2,
    emissive: new THREE.Color('#0284c7'),
    emissiveIntensity: 0.2
  })
  solarPanelsMesh = panelMat

  for (let row = -1; row <= 1; row++) {
    for (let col = -3; col <= 3; col++) {
      const p = new THREE.Mesh(panelGeo, panelMat)
      p.rotation.x = THREE.MathUtils.degToRad(13) // 13° tilt
      p.position.set(col * 3.6, 0.2, row * 4.2)
      p.castShadow = true
      solarGroup.add(p)
    }
  }
  buildingGroup.add(solarGroup)

  scene.add(buildingGroup)
}

function buildCables() {
  // Animated Cable Flows
  // 1. Grid Pole [-19, 5.5, -4.5] -> Utility Meter [-7.5, 1.0, -4.5]
  createParticleCable(
    new THREE.Vector3(-19, 5.5, -4.5),
    new THREE.Vector3(-11.5, 1.2, -4.5),
    '#f59e0b',
    'grid'
  )

  // 2. Solar Roof [-10, 3.8, -4.5] -> Inverter [-11.5, 1.2, -4.5]
  createParticleCable(
    new THREE.Vector3(-10, 3.8, -4.5),
    new THREE.Vector3(-11.5, 2.2, -4.5),
    '#10b981',
    'solar'
  )

  // 3. Inverter [-11.5, 1.2, -4.5] <-> Battery [-9.5, 1.1, -4.5]
  createParticleCable(
    new THREE.Vector3(-11.5, 1.2, -4.5),
    new THREE.Vector3(-9.5, 1.1, -4.5),
    '#06b6d4',
    'battery'
  )
}

function createParticleCable(start, end, colorHex, type) {
  const points = []
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.y = Math.max(start.y, end.y) + 0.5 // Sag/arch
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

  // Static Conduit Line
  const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.04, 8, false)
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#1e293b' })
  const tube = new THREE.Mesh(tubeGeo, tubeMat)
  scene.add(tube)

  // Particles
  const particleCount = 12
  const particleGeo = new THREE.SphereGeometry(0.1, 8, 8)
  const particleMat = new THREE.MeshBasicMaterial({ color: colorHex })

  const particles = []
  for (let i = 0; i < particleCount; i++) {
    const mesh = new THREE.Mesh(particleGeo, particleMat)
    scene.add(mesh)
    particles.push({ mesh, offset: i / particleCount, curve, type })
  }
  cableParticles.push(...particles)
}

function updateDynamicVisuals() {
  const step = currentStep.value || {}
  const solarKw = step.solar_kw || 0
  const batKw = step.battery_kw || 0

  // 1. Solar panel glow intensity scales with solar kW
  if (solarPanelsMesh) {
    const intensity = Math.min(1.2, (solarKw / 120.0) * 1.0)
    solarPanelsMesh.emissiveIntensity = 0.15 + intensity * 0.8
    if (solarKw > 20) {
      solarPanelsMesh.emissive.set('#38bdf8')
    } else {
      solarPanelsMesh.emissive.set('#0f172a')
    }
  }

  // 2. Roof Opacity Toggle
  if (roofMesh) {
    const targetOpacity = roofOpen.value ? 0.08 : 0.85
    roofMesh.material.opacity += (targetOpacity - roofMesh.material.opacity) * 0.1
  }

  // 3. Battery Glow Indicator
  if (batteryMesh) {
    if (batKw > 0) {
      batteryMesh.material.color.set('#38bdf8') // Discharging
    } else if (batKw < 0) {
      batteryMesh.material.color.set('#10b981') // Charging
    } else {
      batteryMesh.material.color.set('#0284c7') // Idle
    }
  }

  // 4. Animate Cable Flow Particles
  const time = performance.now() * 0.001
  cableParticles.forEach(p => {
    let speed = 0.2
    if (p.type === 'solar') speed = Math.max(0.05, (solarKw / 120.0) * 0.6)
    if (p.type === 'battery') speed = Math.max(0.05, (Math.abs(batKw) / 60.0) * 0.5)

    const t = (p.offset + time * speed) % 1.0
    const pos = p.curve.getPoint(t)
    p.mesh.position.copy(pos)
  })
}

function setCameraView(preset) {
  activeView.value = preset
  if (!controls) return

  if (preset === 'iso') {
    camera.position.set(-28, 22, 28)
    controls.target.set(0, 2, 0)
  } else if (preset === 'top') {
    camera.position.set(0, 36, 0.1)
    controls.target.set(0, 0, 0)
  } else if (preset === 'front') {
    camera.position.set(0, 8, 30)
    controls.target.set(0, 2, 0)
  } else if (preset === 'utility') {
    camera.position.set(-16, 6, -2)
    controls.target.set(-10, 2, -4.5)
  }
}

function toggleRoof() {
  roofOpen.value = !roofOpen.value
}

let resizeObserver = null

function onWindowResize() {
  if (!camera || !renderer || !viewportRef.value) return
  const w = viewportRef.value.clientWidth
  const h = viewportRef.value.clientHeight
  if (w <= 0 || h <= 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

onMounted(async () => {
  await nextTick()
  initThree()
  setTimeout(() => {
    onWindowResize()
  }, 100)
  setTimeout(() => {
    onWindowResize()
  }, 300)

  if (viewportRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      onWindowResize()
    })
    resizeObserver.observe(viewportRef.value)
  }
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', onWindowResize)
  if (renderer) renderer.dispose()
})
</script>

<style scoped>
.twin-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - 120px);
}

.twin-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 18px;
  flex: 1;
  min-height: 0;
}

.canvas-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-xl);
  height: 100%;
  min-height: 520px;
  display: flex;
}

.webgl-canvas {
  width: 100% !important;
  height: 100% !important;
  outline: none;
}

.viewport-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
}

.hud-top-left, .hud-top-right {
  pointer-events: auto;
  display: flex;
  gap: 10px;
}

.hud-top-left {
  flex-direction: column;
}

.hud-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #f8fafc;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.hud-sub {
  font-size: 0.72rem;
  color: #94a3b8;
  margin-left: 4px;
}

.telemetry-pill {
  display: inline-flex;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  color: #cbd5e1;
}

.hud-top-right {
  align-items: flex-start;
}

.hud-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.hud-btn:hover {
  background: rgba(56, 189, 248, 0.2);
}

.preset-group {
  display: flex;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 2px;
}

.preset-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  color: #fff;
}

.preset-btn.active {
  background: #0284c7;
  color: #fff;
}

.hud-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  pointer-events: auto;
}

.hud-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.72rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
}

.legend-chip {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.chip-solar { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }
.chip-inv { background: #10b981; box-shadow: 0 0 6px #10b981; }
.chip-battery { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
.chip-grid { background: #a855f7; box-shadow: 0 0 6px #a855f7; }

.hud-instructions {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.7rem;
  color: #94a3b8;
}

.inspector-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  overflow-y: auto;
}

.inspector-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.room-kw-badge {
  font-size: 0.9rem;
  font-weight: 800;
  font-family: monospace;
}

.rooms-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.room-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
}

.room-card.active {
  border-color: #38bdf8;
  background: rgba(2, 132, 199, 0.15);
}

.rc-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-bottom: 4px;
}

.rc-name {
  color: #f1f5f9;
  font-weight: 600;
}

.rc-kw {
  font-family: monospace;
  font-weight: 700;
}

.rc-bar-bg {
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
  overflow: hidden;
}

.rc-bar-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 2px;
}

.room-detail {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.appliance-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.appliance-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #cbd5e1;
  background: rgba(30, 41, 59, 0.5);
  padding: 4px 8px;
  border-radius: 4px;
}

.app-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.equip-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
}

.eq-icon {
  flex-shrink: 0;
}

.eq-info {
  display: flex;
  flex-direction: column;
}

.eq-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f1f5f9;
}

.eq-sub {
  font-size: 0.7rem;
  color: #94a3b8;
}

@media (max-width: 1024px) {
  .twin-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
  .canvas-container {
    height: 500px;
  }
}
</style>
