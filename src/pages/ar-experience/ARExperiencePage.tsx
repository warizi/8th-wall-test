import {useEffect} from 'react'
import {MODELS, useModelStore} from '@/entities/character/modelConfig'
import {loadDialogue} from '@/entities/dialogue/types'
import {usePlacementStore} from '@/features/place-character/placementStore'
import {useDialogueStore} from '@/features/play-dialogue/dialogueStore'
import {isTrackingBlocked, useTrackingStore} from '@/shared/xr8/trackingStore'
import {ARCanvas} from '@/widgets/ar-canvas/ARCanvas'
import {DialoguePanel} from '@/widgets/dialogue-panel/DialoguePanel'
import {LoadingGate} from '@/widgets/permission-gate/LoadingGate'

const pillButton: React.CSSProperties = {
  pointerEvents: 'auto',
  minHeight: 44,
  padding: '8px 14px',
  borderRadius: 22,
  border: 'none',
  background: 'rgba(0,0,0,.55)',
  color: '#fff',
  fontSize: 14,
}

/** 모델 즉시 전환 (새로고침 없음) */
function ModelToggleButton() {
  const modelKey = useModelStore((s) => s.key)
  const toggle = useModelStore((s) => s.toggle)
  return (
    <button onClick={toggle} style={{...pillButton, fontSize: 12, opacity: 0.85}}>
      모델: {MODELS[modelKey].label} ⇄
    </button>
  )
}

/**
 * 메인 AR 페이지 — 단일 세션에서 두 배치 방식 동시 대기.
 * 바닥 탭 배치(월드 트래킹) 또는 타겟 이미지 인식 중 먼저 일어난 쪽 → 대화 시작.
 */
export function ARExperiencePage() {
  const placed = usePlacementStore((s) => s.position)
  const source = usePlacementStore((s) => s.source)
  const resetPlacement = usePlacementStore((s) => s.reset)
  const trackingStatus = useTrackingStore((s) => s.status)
  const trackingReason = useTrackingStore((s) => s.reason)

  // 트래킹 품질에 따른 안내 문구 — NORMAL 전엔 스캔 유도
  const hint = !isTrackingBlocked(trackingStatus)
    ? '바닥을 탭해 캐릭터를 불러내거나, 타겟 이미지를 비춰보세요'
    : trackingReason === 'RELOCALIZING'
      ? '트래킹을 다시 잡는 중이에요 — 조금 전 보던 곳을 천천히 비춰주세요'
      : '주변을 천천히 둘러보며 비춰주세요'

  // 대화 스크립트 로드 (배치 전에 미리)
  useEffect(() => {
    loadDialogue()
      .then((graph) => useDialogueStore.getState().setGraph(graph))
      .catch((e) => console.error('[dialogue]', e))
  }, [])

  // 이미지 인식 → 배치 트리거는 ImageTargetSpawn(Canvas 내부)이 담당.
  // 배치되면 대화 시작, 재배치하면 리셋
  useEffect(() => {
    const dialogue = useDialogueStore.getState()
    if (!placed) {
      dialogue.reset()
      return
    }
    if (dialogue.graph) {
      dialogue.start()
      return
    }
    // 그래프 로드가 배치보다 늦은 경우 대비
    return useDialogueStore.subscribe((s, prev) => {
      if (s.graph && !prev.graph) s.start()
    })
  }, [placed])

  return (
    <>
      <ARCanvas />
      <LoadingGate />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        }}
      >
        {!placed && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 15,
              opacity: 0.9,
              textShadow: '0 1px 3px rgba(0,0,0,.7)',
            }}
          >
            {hint}
          </p>
        )}
        {placed && (
          <>
            <button
              onClick={resetPlacement}
              style={{
                ...pillButton,
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top) + 10px)',
                left: 12,
              }}
            >
              ↺ {source === 'floor' ? '다시 배치' : '다시 대화'}
            </button>
            <DialoguePanel />
          </>
        )}
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 10px)',
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'flex-end',
          }}
        >
          <ModelToggleButton />
        </div>
      </div>
    </>
  )
}
