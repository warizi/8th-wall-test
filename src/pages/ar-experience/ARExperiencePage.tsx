import {useEffect} from 'react'
import {MODELS, useModelStore} from '@/entities/character/modelConfig'
import {loadDialogue} from '@/entities/dialogue/types'
import {usePlacementStore} from '@/features/place-character/placementStore'
import {useDialogueStore} from '@/features/play-dialogue/dialogueStore'
import {getAREngine, switchAREngine} from '@/shared/ar-engine/engineConfig'
import {useMindARStore} from '@/shared/mindar/MindARBridge'
import {ARCanvas} from '@/widgets/ar-canvas/ARCanvas'
import {DialoguePanel} from '@/widgets/dialogue-panel/DialoguePanel'
import {LoadingGate} from '@/widgets/permission-gate/LoadingGate'

const engine = getAREngine()

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
 * 메인 AR 페이지.
 * xr8   : 바닥 탭 배치 → 대화 시작
 * mindar: 타겟 이미지 인식 → 대화 시작
 */
export function ARExperiencePage() {
  const placed = usePlacementStore((s) => s.position)
  const resetPlacement = usePlacementStore((s) => s.reset)
  const targetFound = useMindARStore((s) => s.targetFound)

  // 대화 스크립트 로드 (배치 전에 미리)
  useEffect(() => {
    loadDialogue()
      .then((graph) => useDialogueStore.getState().setGraph(graph))
      .catch((e) => console.error('[dialogue]', e))
  }, [])

  // mindar: 타겟이 인식되어 있고 미배치 상태면 "배치됨" 처리 → 대화 트리거
  // ("다시 대화" 후에도 타겟이 보이는 동안 즉시 재시작되도록 placed도 의존)
  useEffect(() => {
    if (engine === 'mindar' && targetFound && !placed) {
      usePlacementStore.getState().place([0, 0, 0], 0)
    }
  }, [targetFound, placed])

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
            {engine === 'xr8'
              ? '바닥을 천천히 비춘 뒤, 화면을 탭해서 캐릭터를 불러내세요'
              : '타겟 이미지를 화면에 비춰보세요'}
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
              ↺ {engine === 'xr8' ? '다시 배치' : '다시 대화'}
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
          <button
            onClick={() => switchAREngine(engine === 'xr8' ? 'mindar' : 'xr8')}
            style={{...pillButton, fontSize: 12, opacity: 0.85}}
          >
            엔진: {engine === 'xr8' ? '8th Wall' : 'MindAR'} ⇄
          </button>
          <ModelToggleButton />
        </div>
      </div>
    </>
  )
}
