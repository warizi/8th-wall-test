import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import * as THREE from 'three'
import {getImageTargetPosition, useXR8ImageStore} from '@/shared/xr8/imageTargetBridge'
import {isTrackingBlocked, useTrackingStore} from '@/shared/xr8/trackingStore'
import {usePlacementStore} from './placementStore'

// 카드 중심에서 옆으로 비키는 거리(m) — 시야 기준 오른쪽
const SIDE_OFFSET = 0.25
// 카드 면에서 카메라 쪽으로 튀어나오는 거리(m)
const POP_OUT = 0.15

/**
 * 타겟 인식 → 카드 바로 옆, 카드 면에서 살짝 튀어나온 지점에 유령 배치 트리거.
 * 카드 월드 좌표에서 시야 기준 오른쪽으로 비키고 카메라 방향으로 조금 당긴다.
 * (Canvas 내부 — 카메라 접근용)
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
    const card = getImageTargetPosition()
    // 카드→카메라 방향 (카드 면에서 튀어나올 방향)
    const toCam = new THREE.Vector3().subVectors(cam, card)
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1)
    toCam.normalize()

    // 시야 기준 오른쪽 = 위 × (카드→카메라) (수직으로 내려다볼 때 대비 폴백)
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toCam)
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)

    const p = card
      .clone()
      .add(side.normalize().multiplyScalar(SIDE_OFFSET))
      .add(toCam.multiplyScalar(POP_OUT))

    const rotationY = Math.atan2(cam.x - p.x, cam.z - p.z)
    usePlacementStore.getState().place([p.x, p.y, p.z], rotationY, 'image')
  }, [targetFound, placed, camera, trackingStatus])

  return null
}
