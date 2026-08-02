import {Canvas} from '@react-three/fiber'
import {Suspense} from 'react'
import {CardCharacter} from '@/entities/character/CardCharacter'
import {Character} from '@/entities/character/Character'
import {MODELS, useModelStore} from '@/entities/character/modelConfig'
import {WanderingGhost} from '@/entities/character/WanderingGhost'
import {GroundPlacement} from '@/features/place-character/GroundPlacement'
import {ImageTargetSpawn} from '@/features/place-character/ImageTargetSpawn'
import {usePlacementStore} from '@/features/place-character/placementStore'
import {XR8ImageAnchor} from '@/shared/xr8/imageTargetBridge'
import {WorldPointsDebug} from '@/shared/xr8/WorldPointsDebug'
import {XR8Bridge} from '@/shared/xr8/XR8Bridge'
import {SpeechBubble3D} from '@/widgets/dialogue-panel/SpeechBubble3D'

/**
 * AR 캔버스 조립 위젯.
 * XR8이 rAF 루프 소유 (frameloop="never"), 카메라 피드를 GL로 그림.
 * 월드 트래킹(바닥 탭 배치)과 이미지 타겟이 한 세션에서 동시에 동작 —
 * 먼저 일어난 배치(source)가 유지되고, 리셋 후에만 다른 방식으로 전환된다.
 *
 * floor: 탭 지점에 토글된 모델 배치 → 그 캐릭터와 대화
 * image: 카드 위에 character(인사 후 정지) + 카드 주변 바닥에 고스트 → 고스트와 대화
 */
export function ARCanvas() {
  const placed = usePlacementStore((s) => s.position)
  const rotationY = usePlacementStore((s) => s.rotationY)
  const source = usePlacementStore((s) => s.source)
  const modelKey = useModelStore((s) => s.key)

  return (
    <Canvas
      frameloop="never"
      gl={{alpha: true, preserveDrawingBuffer: true}}
      camera={{manual: true, position: [0, 1.5, 0]}}
      style={{position: 'fixed', inset: 0}}
    >
      <XR8Bridge />
      <GroundPlacement />
      <ImageTargetSpawn />
      {import.meta.env.DEV && <WorldPointsDebug />}
      <Suspense fallback={null}>
        {/* 대화 상대 — floor: 토글된 모델, image: 카드 옆 공중을 떠다니는 고스트 */}
        {placed &&
          (source === 'floor' ? (
            <Character key={modelKey} position={placed} rotationY={rotationY} />
          ) : (
            <WanderingGhost origin={placed}>
              <SpeechBubble3D />
            </WanderingGhost>
          ))}
      </Suspense>
      <XR8ImageAnchor>
        {source === 'image' && (
          <Suspense fallback={null}>
            {/* 앵커 스케일(detail.scale)이 타겟 크기를 반영 — 모델별 배율/오프셋만 추가 */}
            <group
              scale={MODELS.character.markerScale}
              position={[0, MODELS.character.markerOffsetY, 0]}
            >
              <CardCharacter />
            </group>
          </Suspense>
        )}
      </XR8ImageAnchor>
      <ambientLight intensity={1.2} />
      <directionalLight position={[1, 3, 2]} intensity={1.5} />
    </Canvas>
  )
}
