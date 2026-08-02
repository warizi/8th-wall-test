import {create} from 'zustand'

/**
 * SLAM 트래킹 품질 상태 (매 프레임 reality에서 갱신, 변할 때만 set).
 * status: UNSPECIFIED | NOT_AVAILABLE | LIMITED | NORMAL
 * reason: UNSPECIFIED | INITIALIZING | RELOCALIZING (LIMITED일 때의 이유)
 */
export const useTrackingStore = create<{status: string; reason: string}>(() => ({
  status: 'UNSPECIFIED',
  reason: 'UNSPECIFIED',
}))

/** 포즈 품질이 낮아 배치를 미뤄야 하는 상태인지 */
export function isTrackingBlocked(status: string): boolean {
  return status === 'LIMITED' || status === 'NOT_AVAILABLE'
}
