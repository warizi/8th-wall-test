import {useFrame, useThree} from '@react-three/fiber'
import {useRef} from 'react'
import * as THREE from 'three'
import {Character} from './Character'

/**
 * 공중에 둥둥 떠서 요리조리 떠다니는 고스트 — 이미지 모드의 대화 상대.
 * 부양 중심점(origin) 주위에서, 주기가 어긋난 사인파 합성으로
 * 유기적인 드리프트를 만들고 항상 카메라(사용자)를 바라본다.
 * 대화 애니메이션(Talk/Wave)은 내부 Character가 animationStore로 처리.
 * XR8 모드는 R3F clock이 꺼져 있으므로 delta 누적으로 시간을 만든다.
 */
export function WanderingGhost({
  origin,
  hover = 0,
  sway = 0,
  bob = 0.1,
  speed = 1,
  scale = 0.2,
}: {
  /** 부양 중심점 (ImageTargetSpawn이 계산한 공중 좌표) */
  origin: [number, number, number]
  /** 중심점 위로 더하는 높이 (m) */
  hover?: number
  /** 수평 드리프트 반경 (m) — 크게 잡으면 카드 앞을 다시 가릴 수 있음 */
  sway?: number
  /** 수직 보빙 진폭 (m) */
  bob?: number
  /** 전체 속도 배율 */
  speed?: number
  /** 모델 크기 배율 */
  scale?: number
}) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const t = useRef(Math.random() * 100)

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    t.current += delta * speed
    const a = t.current
    // 서로 배수가 아닌 주파수 조합 → 같은 궤적을 반복하지 않는 느낌
    const x = origin[0] + Math.sin(a * 0.5 + 1.3) * sway
    const z = origin[2] + Math.sin(a * 0.37 + 4.1) * sway
    const y = origin[1] + hover + Math.sin(a * 0.9) * bob
    g.position.set(x, y, z)
    g.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z)
  })

  return (
    <group ref={group} scale={scale}>
      <Character modelKey="ghost" position={[0, 0, 0]} />
    </group>
  )
}
