/**
 * 8th Wall 엔진 전역 타입.
 * 엔진은 index.html의 <script> 태그로 로드되어 window에 붙는다.
 * 정확한 스키마는 https://8thwall.org/docs/api 기준으로 Phase 0에서 검증한다.
 */

/** XR8 카메라 파이프라인 모듈 (커스텀 모듈 작성 시 구현하는 형태) */
export type CameraPipelineModule = {
  name: string
  onStart?: (args: unknown) => void
  onUpdate?: (args: {processCpuResult?: XR8Reality}) => void
  onRender?: () => void
  onDetach?: () => void
  [key: string]: unknown
}

export type XR8Reality = {
  reality?: {
    rotation: {x: number; y: number; z: number; w: number}
    position: {x: number; y: number; z: number}
    intrinsics?: number[]
    trackingStatus?: string
  }
}

export type XR8Api = {
  run: (config: {canvas: HTMLCanvasElement; allowedDevices?: unknown}) => void
  stop: () => void
  /** 스탠드얼론 빌드: 'slam'(xr-slam.js) / 'face'(xr-face.js) 청크를 명시적으로 로드 */
  loadChunk: (mode: 'slam' | 'face') => Promise<void>
  addCameraPipelineModules: (modules: CameraPipelineModule[]) => void
  GlTextureRenderer: {pipelineModule: () => CameraPipelineModule}
  XrController: {
    pipelineModule: () => CameraPipelineModule
    recenter: () => void
    updateCameraProjectionMatrix?: (opts: {origin: unknown; facing: unknown}) => void
  }
  XrConfig: {device: () => {ANY: unknown; MOBILE: unknown}}
  [key: string]: unknown
}

declare global {
  interface Window {
    XR8?: XR8Api
    XRExtras?: {
      FullWindowCanvas: {pipelineModule: () => CameraPipelineModule}
      Loading: {pipelineModule: () => CameraPipelineModule}
      RuntimeError: {pipelineModule: () => CameraPipelineModule}
      [key: string]: unknown
    }
    LandingPage?: {
      pipelineModule: () => CameraPipelineModule
      [key: string]: unknown
    }
  }
}
