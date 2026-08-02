import {useMemo} from 'react'
import * as THREE from 'three'

/**
 * 블롭 섀도우 — 실시간 그림자 대신 원형 그라데이션 평면.
 * AR에서는 실제 그림자보다 자연스럽고 성능 부담이 없다.
 */
export function BlobShadow({radius = 0.5}: {radius?: number}) {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(0,0,0,0.4)')
    grad.addColorStop(0.6, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}
