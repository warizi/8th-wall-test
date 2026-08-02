import {useAnimations, useGLTF} from '@react-three/drei'
import {useEffect, useRef} from 'react'
import * as THREE from 'three'
import {useAnimationStore} from './animationStore'
import {BlobShadow} from './BlobShadow'
import {MODELS, type ModelKey, useModelStore} from './modelConfig'

const FADE = 0.28 // crossfade 시간(s) — 하드 스위치는 뚝 끊기는 느낌을 줌

/**
 * 캐릭터 엔티티.
 * 모델 클립: Talk(루프) / Walk(루프) / Wave(인사 1회).
 * Idle 클립이 없으므로 1회성 클립 종료 포즈 홀드(clampWhenFinished)가
 * 대기 상태 역할을 한다. 재생 요청은 animationStore를 통해 받는다.
 */
export function Character({
  position,
  rotationY = 0,
  modelKey,
}: {
  position: [number, number, number]
  /** 배치 시 카메라를 바라보도록 하는 y축 회전 (rad) */
  rotationY?: number
  /** 지정 시 토글 스토어를 무시하고 이 모델로 고정 */
  modelKey?: ModelKey
}) {
  const storeKey = useModelStore((s) => s.key)
  const MODEL = MODELS[modelKey ?? storeKey]
  const group = useRef<THREE.Group>(null)
  const {scene, animations} = useGLTF(MODEL.url)
  const {actions, mixer} = useAnimations(animations, group)
  const currentRef = useRef<string | null>(null)

  // 스토어 → 애니메이션 crossfade 전환
  useEffect(() => {
    const apply = (clip: string | null, once: boolean, seq: number) => {
      const prev = currentRef.current ? actions[currentRef.current] : null

      if (!clip) {
        // hold: 현재 클립을 멈추고 마지막 포즈 유지 (페이드아웃하면 T포즈로 돌아가므로
        // 재생만 정지한다)
        if (prev) prev.paused = true
        currentRef.current = null
        return
      }

      const next = actions[clip]
      if (!next) return

      next.reset()
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity)
      next.clampWhenFinished = once
      next.fadeIn(FADE).play()
      // 홀드(paused) 상태로 남은 액션 포함, 다른 모든 액션을 페이드아웃
      for (const name of Object.keys(actions)) {
        const a = actions[name]
        if (a && a !== next && a.getEffectiveWeight() > 0) a.fadeOut(FADE)
      }
      currentRef.current = clip

      if (once) {
        const onFinished = (e: {action: THREE.AnimationAction}) => {
          if (e.action !== next) return
          mixer.removeEventListener('finished', onFinished)
          useAnimationStore.getState().notifyFinished(seq)
        }
        mixer.addEventListener('finished', onFinished)
      }
    }

    // 현재 상태 즉시 반영 + 이후 변경 구독
    const s = useAnimationStore.getState()
    if (s.clip || s.seq > 0) apply(s.clip, s.once, s.seq)
    return useAnimationStore.subscribe((state, prevState) => {
      if (state.seq !== prevState.seq) apply(state.clip, state.once, state.seq)
    })
  }, [actions, mixer])

  return (
    <group ref={group} position={position} rotation-y={rotationY}>
      <primitive object={scene} />
      <BlobShadow radius={MODEL.shadowRadius} />
    </group>
  )
}

// 두 모델 모두 프리로드 — 토글 시 즉시 전환
for (const m of Object.values(MODELS)) useGLTF.preload(m.url)
