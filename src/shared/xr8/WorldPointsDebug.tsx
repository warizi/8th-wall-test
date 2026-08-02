import {useFrame} from '@react-three/fiber'
import {useMemo, useRef} from 'react'
import * as THREE from 'three'
import {debugStatus} from './debugStatus'

/** r3fPipelineModule이 매 프레임 채워 넣는 최신 worldPoints (리렌더 없이 공유) */
export const worldPointsRef: {
  points: Array<{
    id?: number
    confidence?: number
    position: {x: number; y: number; z: number}
  }>
} = {points: []}

const MAX_POINTS = 2000

/**
 * SLAM 특징점(worldPoints) 시각화 — 개발용.
 * XrController.configure({enableWorldPoints: true})가 켜져 있어야 데이터가 온다.
 * 세션 동안 계속 누적 — 스캔 커버리지 맵 역할.
 */
export function WorldPointsDebug() {
  const geom = useRef<THREE.BufferGeometry>(null)
  const frame = useRef(0)
  const positions = useMemo(() => new Float32Array(MAX_POINTS * 3), [])
  const acc = useRef(new Map<string, {x: number; y: number; z: number}>())

  useFrame(() => {
    const g = geom.current
    if (!g) return

    // id가 있으면 id로, 없으면 1cm 격자 좌표로 중복 제거하며 누적
    for (const p of worldPointsRef.points) {
      if (acc.current.size >= MAX_POINTS) break
      const key =
        p.id !== undefined
          ? `i${p.id}`
          : `${p.position.x.toFixed(2)},${p.position.y.toFixed(2)},${p.position.z.toFixed(2)}`
      acc.current.set(key, p.position)
    }

    let i = 0
    for (const p of acc.current.values()) {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      i++
    }
    g.setDrawRange(0, i)
    ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    if (frame.current++ % 60 === 0) {
      debugStatus('points', `현재 ${worldPointsRef.points.length} / 누적 ${i}`)
    }
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geom}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#00ff88"
        size={0.015}
        sizeAttenuation
        depthTest={false}
        transparent
        opacity={0.9}
      />
    </points>
  )
}
