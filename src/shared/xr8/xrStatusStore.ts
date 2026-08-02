import {create} from 'zustand'

type XRStatus = {
  /** loading: 엔진/카메라 준비 중, ready: 첫 SLAM 프레임 수신, error: 실패 */
  phase: 'loading' | 'ready' | 'error'
  errorMessage: string | null
  setReady: () => void
  setError: (message: string) => void
}

export const useXRStatusStore = create<XRStatus>((set) => ({
  phase: 'loading',
  errorMessage: null,
  setReady: () => set((s) => (s.phase === 'loading' ? {phase: 'ready'} : s)),
  setError: (message) => set({phase: 'error', errorMessage: message}),
}))
