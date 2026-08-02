import {create} from 'zustand'

/** 모델에 실재하는 클립 (기획서 7종 중 현재 3종만 존재) */
export type ClipName = 'Talk' | 'Walk' | 'Wave'

type AnimationState = {
  /** 재생 요청: clip + 1회성 여부. seq로 같은 클립 재요청도 구분 */
  clip: ClipName | null
  once: boolean
  seq: number
  /** 1회성 클립이 끝났을 때 갱신됨 (대화 시스템이 구독) */
  finishedSeq: number
  play: (clip: ClipName, opts?: {once?: boolean}) => void
  /** 현재 클립을 페이드아웃하고 마지막 포즈 홀드 (Idle 클립이 없는 것에 대한 대체) */
  hold: () => void
  notifyFinished: (seq: number) => void
}

export const useAnimationStore = create<AnimationState>((set) => ({
  clip: null,
  once: false,
  seq: 0,
  finishedSeq: 0,
  play: (clip, opts) =>
    set((s) => ({clip, once: opts?.once ?? false, seq: s.seq + 1})),
  hold: () => set((s) => ({clip: null, seq: s.seq + 1})),
  notifyFinished: (seq) => set({finishedSeq: seq}),
}))
