import {useFrame, useThree} from '@react-three/fiber'
import {useRef} from 'react'
import * as THREE from 'three'
import {Character} from './Character'

/**
 * 카메라를 따라다니며 대화하는 유령 — 이미지 모드의 대화 상대.
 * 매 프레임 카메라 시야 우상단(카메라 공간 오프셋)을 목표점으로 잡고,
 * delay 시정수의 지수 추적으로 뒤따라와 "졸졸 따라다니는" 느낌을 만든다.
 * 항상 카메라(사용자)를 바라보고, 위아래로 살짝 보빙한다.
 * 대화 애니메이션(Talk/Wave)은 내부 Character가 animationStore로 처리.
 * XR8 모드는 R3F clock이 꺼져 있으므로 delta 누적으로 시간을 만든다.
 */
export function WanderingGhost({
  origin,
  right = 0.2,
  up = 0.12,
  distance = 1.1,
  delay = 0.5,
  bob = 0.05,
  speed = 1,
  scale = 0.3,
}: {
  /** 시작 위치 (카드 옆 스폰 지점 — 여기서 화면 우상단으로 떠오름) */
  origin: [number, number, number]
  /** 카메라 기준 오른쪽 오프셋 (m) */
  right?: number
  /** 카메라 기준 위쪽 오프셋 (m) */
  up?: number
  /** 카메라 앞 거리 (m) */
  distance?: number
  /** 따라오는 지연 시정수 (s) — 클수록 굼뜨게 뒤따라옴 */
  delay?: number
  /** 수직 보빙 진폭 (m) */
  bob?: number
  /** 보빙 속도 배율 */
  speed?: number
  /** 모델 크기 배율 */
  scale?: number
}) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const t = useRef(Math.random() * 100)
  const base = useRef(new THREE.Vector3(...origin))
  const target = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    t.current += delta * speed

    // 카메라 공간 우상단 지점 → 월드 좌표 (카메라는 -Z를 바라봄)
    camera.updateMatrixWorld()
    target.current.set(right, up, -distance)
    camera.localToWorld(target.current)

    // 0.5초 시정수 지수 추적 — 프레임레이트와 무관하게 같은 지연감
    const k = 1 - Math.exp(-delta / delay)
    base.current.lerp(target.current, k)

    g.position.copy(base.current)
    g.position.y += Math.sin(t.current * 0.9) * bob
    g.rotation.y = Math.atan2(
      camera.position.x - g.position.x,
      camera.position.z - g.position.z,
    )
  })

  return (
    <group ref={group} scale={scale}>
      <Character modelKey="ghost" position={[0, 0, 0]} />
    </group>
  )
}
