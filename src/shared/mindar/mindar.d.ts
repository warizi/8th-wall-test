declare module 'mind-ar/dist/mindar-image.prod.js' {
  /** MindAR 이미지 트래킹 컨트롤러 (렌더러 비종속) */
  export class Controller {
    inputWidth: number
    inputHeight: number
    constructor(options: {
      inputWidth: number
      inputHeight: number
      maxTrack?: number
      filterMinCF?: number | null
      filterBeta?: number | null
      warmupTolerance?: number | null
      missTolerance?: number | null
      onUpdate?: (data: {
        type: string
        targetIndex?: number
        worldMatrix?: number[] | null
      }) => void
    })
    addImageTargets(fileURL: string): Promise<{
      dimensions: [number, number][]
      matchingDataList: unknown[]
      trackingDataList: unknown[]
    }>
    getProjectionMatrix(): number[]
    dummyRun(input: HTMLVideoElement): Promise<void>
    processVideo(input: HTMLVideoElement): void
    stopProcessVideo(): void
    dispose(): void
  }
  export class Compiler {}
  export class UI {}
}
