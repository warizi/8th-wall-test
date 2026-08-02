import {create} from 'zustand'

/** 배치 방식 — floor: 바닥 탭, image: 타겟 이미지 인식 */
export type PlacementSource = 'floor' | 'image'

type PlacementState = {
  /** 캐릭터가 배치된 월드 좌표 (null이면 미배치; image 배치는 앵커가 위치를 소유) */
  position: [number, number, number] | null
  /** 배치 시 카메라를 바라보는 y축 회전 (rad) */
  rotationY: number
  /** 어떤 방식으로 배치됐는지 — 먼저 일어난 쪽 유지, 리셋 후에만 변경 가능 */
  source: PlacementSource | null
  place: (position: [number, number, number], rotationY: number, source: PlacementSource) => void
  reset: () => void
}

export const usePlacementStore = create<PlacementState>((set) => ({
  position: null,
  rotationY: 0,
  source: null,
  place: (position, rotationY, source) => set({position, rotationY, source}),
  reset: () => set({position: null, rotationY: 0, source: null}),
}))
