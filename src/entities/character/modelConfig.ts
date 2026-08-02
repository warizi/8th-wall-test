import {create} from 'zustand'

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
    /** mindar 모드에서 마커 단위(1 = 마커 폭) 대비 스케일 */
    mindarScale: number
    /** mindar 모드에서 마커 중앙 기준 y 오프셋 */
    mindarOffsetY: number
    /** 블롭 섀도우 반경 (m) */
    shadowRadius: number
  }
> = {
  character: {
    url: '/models/character.glb',
    label: '기본',
    mindarScale: 0.55,
    mindarOffsetY: -0.4,
    shadowRadius: 0.45,
  },
  ghost: {
    url: '/models/ghost.glb',
    label: '고스트',
    mindarScale: 0.9,
    mindarOffsetY: -0.45,
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
