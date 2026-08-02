import {useFrame, useThree} from '@react-three/fiber'
import {useRef} from 'react'
import * as THREE from 'three'
import {getImageTargetPosition, useXR8ImageStore} from '@/shared/xr8/imageTargetBridge'
import {Character} from './Character'

// 카드가 보일 때: 카드 중심에서 시야 기준 오른쪽으로 비키는 거리(m)
const CARD_SIDE = 0.3
// 카드가 보일 때: 카드 면에서 카메라 쪽으로 튀어나오는 거리(m)
const CARD_POP = 0.15

const UP = new THREE.Vector3(0, 1, 0)

/**
 * 카메라를 따라다니며 대화하는 유령 — 이미지 모드의 대화 상대.
 * - 카드(이미지 타겟)가 보이는 동안: 카드 위 캐릭터 옆(월드 고정)에 머무름
 * - 카드가 안 보이면: 화면 우상단으로 복귀해 카메라를 따라다님
 * 두 모드는 blend 가중치로 부드럽게 전환(날아가듯 이동)된다.
 *
 * 추적 모드의 지연은 카메라 회전만 delay 시정수로 뒤따르는 지연 쿼터니언 —
 * 위치는 카메라에 강체 고정이라 SLAM 이동 지터가 화면에 안 보인다.
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
  children,
}: {
  /** 시작 위치 (카드 옆 스폰 지점 — 여기서 화면 우상단으로 떠오름) */
  origin: [number, number, number]
  /** 추적 모드: 카메라 기준 오른쪽 오프셋 (m) */
  right?: number
  /** 추적 모드: 카메라 기준 위쪽 오프셋 (m) */
  up?: number
  /** 추적 모드: 카메라 앞 거리 (m) */
  distance?: number
  /** 지연/전환 시정수 (s) — 클수록 굼뜨게 움직임 */
  delay?: number
  /** 수직 보빙 진폭 (m) */
  bob?: number
  /** 보빙 속도 배율 */
  speed?: number
  /** 모델 크기 배율 */
  scale?: number
  /** 유령을 따라다니는 부가 요소 (말풍선 등) — 그룹 내부에 렌더 */
  children?: React.ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const t = useRef(Math.random() * 100)
  const initialized = useRef(false)
  const laggedQuat = useRef(new THREE.Quaternion())
  const offset = useRef(new THREE.Vector3())
  const blend = useRef(0) // 0: 화면 우상단 추적, 1: 카드 옆
  const cardPos = useRef(new THREE.Vector3())
  const cardInit = useRef(false)
  const tmp = useRef(new THREE.Vector3())
  const side = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    t.current += delta * speed
    camera.updateMatrixWorld()
    const k = 1 - Math.exp(-delta / delay)

    offset.current.set(right, up, -distance) // 카메라는 -Z를 바라봄

    // 첫 프레임: 우상단 오프셋이 스폰 지점(카드) 방향을 가리키는 회전에서 시작
    if (!initialized.current) {
      initialized.current = true
      const toOrigin = new THREE.Vector3(origin[0], origin[1], origin[2])
        .sub(camera.position)
        .normalize()
      laggedQuat.current.setFromUnitVectors(offset.current.clone().normalize(), toOrigin)
    }

    // 추적 모드 위치: 카메라에 강체 고정 + 회전만 지연
    laggedQuat.current.slerp(camera.quaternion, k)
    g.position.copy(offset.current).applyQuaternion(laggedQuat.current).add(camera.position)

    // 카드가 보이면 "카드 옆" 목표를 향해 블렌드, 안 보이면 추적 모드로 복귀
    const found = useXR8ImageStore.getState().targetFound
    blend.current += ((found ? 1 : 0) - blend.current) * k
    if (found) {
      const card = getImageTargetPosition()
      tmp.current.subVectors(camera.position, card) // 카드→카메라
      if (tmp.current.lengthSq() < 1e-6) tmp.current.set(0, 0, 1)
      tmp.current.normalize()
      side.current.crossVectors(UP, tmp.current)
      if (side.current.lengthSq() < 1e-6) side.current.set(1, 0, 0)
      card
        .add(side.current.normalize().multiplyScalar(CARD_SIDE))
        .add(tmp.current.multiplyScalar(CARD_POP))
      if (!cardInit.current) {
        cardInit.current = true
        cardPos.current.copy(card)
      }
      cardPos.current.lerp(card, k) // 카드 옆 목표도 부드럽게 (트래킹 노이즈 감쇠)
    } else {
      cardInit.current = false
    }
    if (blend.current > 0.001) g.position.lerp(cardPos.current, blend.current)

    g.position.y += Math.sin(t.current * 0.9) * bob
    g.rotation.y = Math.atan2(
      camera.position.x - g.position.x,
      camera.position.z - g.position.z,
    )
    // 자식(말풍선 Html)이 이번 프레임의 최신 위치로 투영하도록 즉시 커밋
    g.updateMatrixWorld(true)
    // 이 useFrame은 priority -1로 등록되어 Html(기본 0)보다 먼저 실행된다 —
    // 순서가 뒤집히면 말풍선이 한 프레임 묵은 좌표로 투영되어 덜덜 떨린다.
  }, -1)

  return (
    <group ref={group} scale={scale}>
      <Character modelKey="ghost" position={[0, 0, 0]} />
      {children}
    </group>
  )
}
