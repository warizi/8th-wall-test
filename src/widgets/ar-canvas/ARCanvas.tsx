import {Canvas} from '@react-three/fiber'
import {Suspense} from 'react'
import {Character} from '@/entities/character/Character'
import {MODELS, useModelStore} from '@/entities/character/modelConfig'
import {GroundPlacement} from '@/features/place-character/GroundPlacement'
import {usePlacementStore} from '@/features/place-character/placementStore'
import {getAREngine} from '@/shared/ar-engine/engineConfig'
import {MindARAnchor, MindARSystem} from '@/shared/mindar/MindARBridge'
import {XR8Bridge} from '@/shared/xr8/XR8Bridge'

/**
 * AR 캔버스 조립 위젯 — 엔진 토글 지점.
 *
 * xr8   : XR8이 rAF 루프 소유 (frameloop="never"), 카메라 피드를 GL로 그림,
 *         바닥 탭 배치 (World Tracking)
 * mindar: R3F가 루프 소유 (frameloop 기본), 카메라 피드는 DOM <video>,
 *         이미지 타겟 위에 캐릭터 고정 (완전 오픈소스 경로)
 */
export function ARCanvas() {
  const engine = getAREngine()
  const placed = usePlacementStore((s) => s.position)
  const rotationY = usePlacementStore((s) => s.rotationY)
  const modelKey = useModelStore((s) => s.key)
  const model = MODELS[modelKey]

  return (
    <Canvas
      frameloop={engine === 'xr8' ? 'never' : 'always'}
      gl={{alpha: true, preserveDrawingBuffer: true}}
      camera={{manual: true, position: engine === 'xr8' ? [0, 1.5, 0] : [0, 0, 0]}}
      style={{position: 'fixed', inset: 0}}
    >
      {engine === 'xr8' ? (
        <>
          <XR8Bridge />
          <GroundPlacement />
          <Suspense fallback={null}>
            {placed && <Character key={modelKey} position={placed} rotationY={rotationY} />}
          </Suspense>
        </>
      ) : (
        <>
          <MindARSystem />
          <MindARAnchor>
            <Suspense fallback={null}>
              {/* 마커 단위(1 = 마커 폭)에 맞춰 모델별 스케일/오프셋 적용 */}
              <group scale={model.mindarScale} position={[0, model.mindarOffsetY, 0]}>
                <Character key={modelKey} position={[0, 0, 0]} />
              </group>
            </Suspense>
          </MindARAnchor>
        </>
      )}
      <ambientLight intensity={1.2} />
      <directionalLight position={[1, 3, 2]} intensity={1.5} />
    </Canvas>
  )
}
