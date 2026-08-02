import {useFrame} from '@react-three/fiber'
import {useRef} from 'react'
import * as THREE from 'three'
import {create} from 'zustand'
import {asset} from '@/shared/lib/asset'
import {debugStatus} from './debugStatus'
import type {CameraPipelineModule} from './types'

// image-target-cli 산출물 (public/targets/xr8/) — 지점별 사이니지 타겟으로 교체 예정
const TARGET_DIR = 'targets/xr8/'
const TARGET_JSON = 'card.json'
const TARGET_NAME = 'card'

/** 타겟 인식 상태 (UI/대화 트리거용 — 포즈는 성능상 mutable ref로 전달) */
export const useXR8ImageStore = create<{targetFound: boolean}>(() => ({
  targetFound: false,
}))

/** 매 프레임 갱신되는 앵커 포즈 (zustand에 넣으면 리렌더 폭발 — 모듈 공유 ref) */
const anchorState = {
  visible: false,
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  scale: 1,
}

type ImageTargetDetail = {
  name: string
  position: {x: number; y: number; z: number}
  rotation: {w: number; x: number; y: number; z: number}
  scale: number
}

function applyPose(detail: ImageTargetDetail) {
  anchorState.position.set(detail.position.x, detail.position.y, detail.position.z)
  anchorState.quaternion.set(
    detail.rotation.x,
    detail.rotation.y,
    detail.rotation.z,
    detail.rotation.w,
  )
  anchorState.scale = detail.scale
}

function setFound(found: boolean) {
  if (anchorState.visible === found) return
  anchorState.visible = found
  useXR8ImageStore.setState({targetFound: found})
  debugStatus('xr8img', found ? '타겟 인식됨' : '타겟 놓침')
}

// 손떨림으로 imagelost→imagefound가 짧게 반복되면 캐릭터가 깜빡인다 —
// 잃은 뒤에도 유예 시간 동안 마지막 포즈로 유지하고, 그 안에 재인식되면 이어간다.
const LOST_GRACE_MS = 5000
let lostTimer: ReturnType<typeof setTimeout> | null = null

function cancelPendingLost() {
  if (lostTimer !== null) {
    clearTimeout(lostTimer)
    lostTimer = null
  }
}

/** 이미지 타겟 이벤트를 앵커 상태로 옮기는 파이프라인 모듈 */
export function imageTargetPipelineModule(): CameraPipelineModule {
  return {
    name: 'image-target-bridge',
    listeners: [
      {
        event: 'reality.imagefound',
        process: ({detail}: {detail: ImageTargetDetail}) => {
          if (detail.name !== TARGET_NAME) return
          cancelPendingLost()
          applyPose(detail)
          setFound(true)
        },
      },
      {
        event: 'reality.imageupdated',
        process: ({detail}: {detail: ImageTargetDetail}) => {
          if (detail.name !== TARGET_NAME) return
          cancelPendingLost()
          applyPose(detail)
          setFound(true)
        },
      },
      {
        event: 'reality.imagelost',
        process: ({detail}: {detail: ImageTargetDetail}) => {
          if (detail.name !== TARGET_NAME) return
          cancelPendingLost()
          lostTimer = setTimeout(() => {
            lostTimer = null
            setFound(false)
          }, LOST_GRACE_MS)
        },
      },
    ],
  }
}

/**
 * 컴파일된 타겟 메타데이터를 엔진에 등록. XR8.run() 전에 호출.
 * imagePath는 CLI가 임의 URL로 기록하므로 실제 배포 경로로 바꿔서 넘긴다.
 */
export async function configureImageTargets() {
  const res = await fetch(asset(TARGET_DIR + TARGET_JSON))
  if (!res.ok) throw new Error(`이미지 타겟 로드 실패: HTTP ${res.status}`)
  const data = await res.json()
  data.imagePath = asset(TARGET_DIR + data.resources.luminanceImage)
  window.XR8!.XrController.configure({imageTargetData: [data]})
  debugStatus('xr8img', `타겟 등록: ${data.name}`)
}

/** 타겟(카드)의 현재 월드 좌표 — 주변 배치 계산용 */
export function getImageTargetPosition(): THREE.Vector3 {
  return anchorState.position.clone()
}

// 트래킹 포즈 노이즈 저역 필터 강도 — 카드는 물리적으로 고정이라 강하게 걸어도 안전
const SMOOTH_RATE = 6

/** 타겟 위에 얹히는 앵커 그룹 — 이벤트 포즈를 스무딩해서 매 프레임 적용 */
export function XR8ImageAnchor({children}: {children: React.ReactNode}) {
  const group = useRef<THREE.Group>(null)
  const wasVisible = useRef(false)
  const scaleTarget = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    g.visible = anchorState.visible
    if (!anchorState.visible) {
      wasVisible.current = false
      return
    }
    scaleTarget.current.setScalar(anchorState.scale)
    if (!wasVisible.current) {
      // 처음 나타날 땐 스냅 (멀리서 날아오는 연출 방지)
      wasVisible.current = true
      g.position.copy(anchorState.position)
      g.quaternion.copy(anchorState.quaternion)
      g.scale.copy(scaleTarget.current)
      return
    }
    const k = 1 - Math.exp(-SMOOTH_RATE * delta)
    g.position.lerp(anchorState.position, k)
    g.quaternion.slerp(anchorState.quaternion, k)
    g.scale.lerp(scaleTarget.current, k)
  })

  return <group ref={group}>{children}</group>
}
