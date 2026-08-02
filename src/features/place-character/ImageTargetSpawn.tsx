import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import * as THREE from 'three'
import {getImageTargetPosition, useXR8ImageStore} from '@/shared/xr8/imageTargetBridge'
import {isTrackingBlocked, useTrackingStore} from '@/shared/xr8/trackingStore'
import {usePlacementStore} from './placementStore'

// 카메라에서 카드 방향으로 나아간 거리(m) — 유령이 서는 지점
const FROM_CAMERA = 0.5
// 시선(카메라→카드)에서 옆으로 비키는 거리(m) — 카드를 가리지 않게
const SIDE_OFFSET = 0.35
// 시선 높이 기준 수직 오프셋(m) — 양수면 시선 위로, 공중에 뜬 느낌을 주는 값
const ABOVE_SIGHT = 0.1

/**
 * 타겟 인식 → 카메라와 카드 사이, 카메라에서 0.5m 지점의 옆에 유령 배치 트리거.
 * 카메라→카드 시선 벡터 위 0.5m 지점을 잡고, 시야 기준 오른쪽으로 비켜서
 * 카드를 가리지 않게 한다. (Canvas 내부 — 카메라 접근용)
 * 이미 배치돼 있으면 무시 — 먼저 일어난 쪽 유지, 리셋 후에만 전환.
 */
export function ImageTargetSpawn() {
  const camera = useThree((s) => s.camera)
  const targetFound = useXR8ImageStore((s) => s.targetFound)
  const placed = usePlacementStore((s) => s.position)
  const trackingStatus = useTrackingStore((s) => s.status)

  useEffect(() => {
    // SLAM이 자리 잡기 전(LIMITED 등)엔 포즈가 불안정 — NORMAL 진입 후 배치
    if (!targetFound || placed || isTrackingBlocked(trackingStatus)) return
    const cam = camera.position
    const dir = getImageTargetPosition().sub(cam)
    const dist = dir.length() || 1
    dir.normalize()

    // 카메라가 카드에 0.5m보다 가까우면 비율로 클램프 (카드 뒤로 넘어가지 않게)
    const forward = Math.min(FROM_CAMERA, dist * 0.6)
    const p = dir.clone().multiplyScalar(forward).add(cam)

    // 시야 기준 오른쪽 = 시선 × 위 (수직으로 내려다보는 경우 대비 폴백)
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
    p.add(side.normalize().multiplyScalar(SIDE_OFFSET))
    p.y += ABOVE_SIGHT

    const rotationY = Math.atan2(cam.x - p.x, cam.z - p.z)
    usePlacementStore.getState().place([p.x, p.y, p.z], rotationY, 'image')
  }, [targetFound, placed, camera, trackingStatus])

  return null
}
