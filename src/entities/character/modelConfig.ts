import {create} from 'zustand'
import {asset} from '@/shared/lib/asset'

/**
 * 캐릭터 모델 토글 — 런타임 전환 (새로고침 없음).
 * 초기값: URL 쿼리 ?model=ghost > 환경변수 VITE_AR_MODEL > 'character'.
 * 모든 모델은 동일한 클립 세트(Talk/Walk/Wave)를 가져야 애니메이션 시스템과 호환된다.
 */
export type ModelKey = 'character' | 'ghost'

export const MODELS: Record<
  ModelKey,
  {
    url: string
    label: string
    /** 이미지 타겟 모드에서 앵커(타겟 크기) 대비 배율 */
    markerScale: number
    /** 이미지 타겟 모드에서 타겟 중앙 기준 y 오프셋 */
    markerOffsetY: number
    /** 블롭 섀도우 반경 (m) */
    shadowRadius: number
  }
> = {
  character: {
    url: asset('models/character.glb'),
    label: '기본',
    markerScale: 0.55,
    markerOffsetY: -0.4,
    shadowRadius: 0.45,
  },
  ghost: {
    url: asset('models/ghost.glb'),
    label: '고스트',
    markerScale: 0.9,
    markerOffsetY: -0.45,
    shadowRadius: 0.5,
  },
}

function initialModelKey(): ModelKey {
  const q = new URLSearchParams(window.location.search).get('model')
  if (q && q in MODELS) return q as ModelKey
  const env = import.meta.env.VITE_AR_MODEL
  return env && env in MODELS ? (env as ModelKey) : 'character'
}

export const useModelStore = create<{
  key: ModelKey
  set: (key: ModelKey) => void
  toggle: () => void
}>((set) => ({
  key: initialModelKey(),
  set: (key) => set({key}),
  toggle: () => set((s) => ({key: s.key === 'character' ? 'ghost' : 'character'})),
}))
