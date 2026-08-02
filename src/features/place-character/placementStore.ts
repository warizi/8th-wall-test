import {create} from 'zustand'

type PlacementState = {
  /** 캐릭터가 배치된 월드 좌표 (null이면 미배치) */
  position: [number, number, number] | null
  /** 배치 시 카메라를 바라보는 y축 회전 (rad) */
  rotationY: number
  place: (position: [number, number, number], rotationY: number) => void
  reset: () => void
}

export const usePlacementStore = create<PlacementState>((set) => ({
  position: null,
  rotationY: 0,
  place: (position, rotationY) => set({position, rotationY}),
  reset: () => set({position: null, rotationY: 0}),
}))
