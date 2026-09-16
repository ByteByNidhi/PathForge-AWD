import { useEffect, useRef, useState } from 'react'

function HeroWorld() {
  const hostRef = useRef(null)
  const [mode, setMode] = useState('css')

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return undefined
    }

    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') || probe.getContext('webgl')
    if (!gl) {
      setMode('css')
      return undefined
    }

    let disposed = false
    let renderer
    let frame = 0
    let resizeObserver
    const pointer = { x: 0, y: 0 }

    const onPointer = (event) => {
      const rect = host.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }
    host.addEventListener('pointermove', onPointer)

    import('three')
      .then((THREE) => {
        if (disposed || !hostRef.current) {
          return
        }

        setMode('webgl')
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
        camera.position.set(0, 0, 8.6)

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.setClearColor(0x000000, 0)
        host.appendChild(renderer.domElement)

        const count = 720
        const positions = new Float32Array(count * 3)
        const speeds = new Float32Array(count)
        for (let i = 0; i < count; i += 1) {
          const radius = Math.pow(Math.random(), 0.62) * 7.8
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72
          positions[i * 3 + 2] = radius * Math.cos(phi) * 0.85
          speeds[i] = 0.08 + Math.random() * 0.18
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const material = new THREE.PointsMaterial({
          color: 0xd9cfc0,
          size: 0.028,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          sizeAttenuation: true,
        })
        const particles = new THREE.Points(geometry, material)
        scene.add(particles)

        const core = new THREE.Points(
          new THREE.BufferGeometry().setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)
          ),
          new THREE.PointsMaterial({
            color: 0xe8d7b0,
            size: 0.085,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
          })
        )
        scene.add(core)

        const resize = () => {
          const width = host.clientWidth
          const height = host.clientHeight
          camera.aspect = width / Math.max(height, 1)
          camera.updateProjectionMatrix()
          renderer.setSize(width, height, false)
        }
        resize()
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const clock = new THREE.Clock()
        const tick = () => {
          if (disposed) {
            return
          }
          const time = clock.getElapsedTime()
          if (!reduceMotion) {
            const attr = geometry.getAttribute('position')
            for (let i = 0; i < count; i += 1) {
              const ix = i * 3
              const x = attr.getX(i)
              const y = attr.getY(i)
              const z = attr.getZ(i)
              const len = Math.hypot(x, y, z) || 1
              const grow = Math.sin(time * speeds[i] + i) * 0.0018
              attr.setXYZ(i, x + (x / len) * grow, y + (y / len) * grow, z + (z / len) * grow)
            }
            attr.needsUpdate = true
            particles.rotation.y = time * 0.012
            particles.rotation.x = Math.sin(time * 0.07) * 0.04
            camera.position.x = pointer.x * 0.35
            camera.position.y = -pointer.y * 0.22
          }
          camera.lookAt(0, 0, 0)
          renderer.render(scene, camera)
          frame = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => {
        if (!disposed) {
          setMode('css')
        }
      })

    return () => {
      disposed = true
      host.removeEventListener('pointermove', onPointer)
      cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  return (
    <div className={`landing-hero__world landing-hero__world--${mode}`} aria-hidden="true">
      <div ref={hostRef} className="landing-hero__canvas" />
      <div className="landing-hero__fallback" />
    </div>
  )
}

export default HeroWorld
