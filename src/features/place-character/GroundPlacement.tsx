import {useThree} from '@react-three/fiber'
import type {ThreeEvent} from '@react-three/fiber'
import {usePlacementStore} from './placementStore'

/**
 * 바닥(y=0) 탭 → 캐릭터 배치.
 * 투명한 대형 평면이 R3F 레이캐스트 대상이 되어 탭 지점의
 * 월드 좌표를 돌려준다. (8th Wall 월드는 시작 시점 바닥이 y=0)
 */
export function GroundPlacement() {
  const place = usePlacementStore((s) => s.place)
  const placed = usePlacementStore((s) => s.position)
  const camera = useThree((s) => s.camera)

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    if (placed) return // 재배치는 상단 버튼으로만
    const p = e.point
    // 캐릭터가 탭 순간의 카메라를 바라보도록
    const rotationY = Math.atan2(camera.position.x - p.x, camera.position.z - p.z)
    place([p.x, 0, p.z], rotationY)
  }

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} onPointerDown={onTap}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  )
}
