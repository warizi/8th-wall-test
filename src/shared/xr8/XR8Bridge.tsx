import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import {debugStatus} from './debugStatus'
import {r3fPipelineModule} from './r3fPipelineModule'
import type {CameraPipelineModule} from './types'
import {useXRStatusStore} from './xrStatusStore'

// 엔진은 페이지 생명주기당 1회만 시작한다.
// (재마운트 시 run/stop 반복은 엔진을 죽은 상태로 만들 수 있음 — 검은 화면)
let engineStarted = false

/** 카메라 권한/에러 상태 진단 + 로딩 게이트 에러 연동 */
const diagnosticsModule: CameraPipelineModule = {
  name: 'xr-diagnostics',
  onCameraStatusChange: ({status}: {status: string}) => {
    debugStatus('camera', status)
    if (status === 'failed') {
      useXRStatusStore.getState().setError('카메라를 열 수 없어요. 권한을 확인해 주세요.')
    }
  },
  onException: (error: unknown) => {
    debugStatus('exception', String(error))
    console.error('[xr8] exception', error)
    useXRStatusStore.getState().setError(String(error))
  },
}

/**
 * <Canvas> 내부에 두는 XR8 구동 컴포넌트.
 * R3F가 만든 캔버스를 XR8에 넘기고, 파이프라인 모듈을 등록해 엔진을 시작한다.
 */
export function XR8Bridge() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)
  const clock = useThree((s) => s.clock)

  // frameloop="never" 모드에서 R3F는 advance()에 넘긴 타임스탬프 차이로 delta를
  // 계산한다. 그런데 그 직전에 clock.getDelta()도 호출되므로, clock이 살아 있으면
  // elapsedTime이 실시간으로 오염되어 delta가 음수/난수가 된다.
  // clock을 완전히 꺼서 타임스탬프 기반 계산만 쓰게 한다.
  useEffect(() => {
    clock.autoStart = false
    clock.stop()
  }, [clock])

  useEffect(() => {
    let cancelled = false

    const start = () => {
      const XR8 = window.XR8!
      if (cancelled || engineStarted) return
      engineStarted = true
      debugStatus('engine', 'starting')

      // XRExtras(Loading/FullWindowCanvas)·LandingPage는 사용하지 않는다 —
      // Loading의 검은 커버가 해제되지 않는 문제 확인, 로딩/폴백 UI는 자체 구현.
      XR8.addCameraPipelineModules([
        XR8.GlTextureRenderer.pipelineModule(), // 카메라 피드 렌더
        XR8.XrController.pipelineModule(), // SLAM (World Tracking)
        diagnosticsModule,
        r3fPipelineModule({gl, camera, advance}),
      ])

      XR8.run({
        canvas: gl.domElement,
        allowedDevices: XR8.XrConfig.device().ANY,
      })
      debugStatus('engine', 'run() 호출됨')
    }

    // 엔진 스크립트들은 로드 후에도 비동기로 초기화된다:
    // - XR8.XrController는 xr-slam.js 동적 청크 로드 후에야 채워짐
    // - window.LandingPage도 한동안 null
    // 필요한 pipelineModule 함수가 전부 준비될 때까지 폴링한다.
    const missingParts = () => {
      const XR8 = window.XR8
      const missing: string[] = []
      if (!XR8?.GlTextureRenderer?.pipelineModule) missing.push('GlTextureRenderer')
      if (!XR8?.XrController?.pipelineModule) missing.push('XrController')
      return missing
    }

    // 스탠드얼론 빌드는 SLAM 청크를 자동 로드하지 않는다 — loadChunk('slam') 필수
    let slamRequested = false
    const requestSlam = () => {
      const XR8 = window.XR8
      if (slamRequested || !XR8?.loadChunk || XR8.XrController) return
      slamRequested = true
      debugStatus('slam', "loadChunk('slam') 요청")
      XR8.loadChunk('slam')
        .then(() => debugStatus('slam', '로드 완료'))
        .catch((e) => debugStatus('slam', `로드 실패: ${e}`))
    }

    const t0 = performance.now()
    debugStatus('engine', '전역 대기 중')
    const timer = setInterval(() => {
      if (cancelled) return clearInterval(timer)
      requestSlam()
      const waited = performance.now() - t0
      const missing = missingParts()
      if (missing.length === 0) {
        clearInterval(timer)
        start()
      } else if (waited > 20000) {
        clearInterval(timer)
        debugStatus('engine', `초기화 실패 — 미준비: ${missing.join(',')}`)
      } else if (Math.floor(waited / 1000) !== Math.floor((waited - 50) / 1000)) {
        debugStatus('engine', `대기 ${Math.floor(waited / 1000)}s — 미준비: ${missing.join(',')}`)
      }
    }, 50)

    // 진단: 캔버스 크기/개수 + 실제 프레임버퍼 중앙 픽셀 색 (개발 모드 전용)
    const diag = setInterval(() => {
      if (cancelled || !import.meta.env.DEV) return
      const canvases = Array.from(document.querySelectorAll('canvas'))
      debugStatus(
        'canvas',
        canvases
          .map(
            (c) =>
              `${c === gl.domElement ? '*' : ''}${c.width}x${c.height}/css${c.clientWidth}x${c.clientHeight}`,
          )
          .join(' | '),
      )
      try {
        const ctx = gl.getContext()
        const px = new Uint8Array(4)
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
        ctx.readPixels(
          Math.floor(ctx.drawingBufferWidth / 2),
          Math.floor(ctx.drawingBufferHeight / 2),
          1,
          1,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          px,
        )
        debugStatus('pixel', `rgba(${px[0]},${px[1]},${px[2]},${px[3]})`)
      } catch (e) {
        debugStatus('pixel', `읽기 실패: ${e}`)
      }
      // 화면 중앙의 요소 스택 (canvas가 스택에 있는지 확인)
      const stack = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      debugStatus('stack', stack.map((e) => e.tagName.toLowerCase()).join('>'))
      // 캔버스 표시 상태
      const cs = getComputedStyle(gl.domElement)
      const r = gl.domElement.getBoundingClientRect()
      debugStatus(
        'cvstyle',
        `op=${cs.opacity} vis=${cs.visibility} pe=${cs.pointerEvents} tf=${cs.transform.slice(0, 24)} rect=${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}`,
      )
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(timer)
      clearInterval(diag)
    }
  }, [gl, camera, advance])

  return null
}
