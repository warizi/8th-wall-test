import * as THREE from 'three'
import {debugStatus} from './debugStatus'
import type {CameraPipelineModule, XR8Reality} from './types'
import {useXRStatusStore} from './xrStatusStore'

type Deps = {
  gl: THREE.WebGLRenderer
  camera: THREE.Camera
  /** R3F의 advance() — frameloop="never"일 때 프레임을 1회 진행 */
  advance: (timestamp: number) => void
}

const quat = new THREE.Quaternion()

/**
 * XR8 rAF 루프 안에서 R3F를 구동하는 커스텀 파이프라인 모듈.
 * - onUpdate: SLAM 결과(포즈/내부파라미터)를 R3F 카메라에 이식
 * - onRender: R3F 프레임을 1회 진행 (카메라 피드 위에 덮어그림)
 */
export const r3fPipelineModule = ({gl, camera, advance}: Deps): CameraPipelineModule => {
  let updateCount = 0
  let renderCount = 0
  let fpsFrames = 0
  let fpsWindowStart = performance.now()

  return {
    name: 'r3f-bridge',

    onStart: () => {
      // 카메라 피드(GlTextureRenderer가 그린 배경)를 지우지 않는다.
      // 대신 depth는 onRender에서 매 프레임 명시적으로 지운다 —
      // autoClear=false면 three가 depth도 안 지워서 이전 프레임 depth에
      // 큐브가 가려지는 깜빡임이 생긴다.
      gl.autoClear = false

      // SLAM 시작 포즈를 R3F 카메라 현재 포즈와 동기화
      window.XR8?.XrController.updateCameraProjectionMatrix?.({
        origin: camera.position,
        facing: camera.quaternion,
      })
      debugStatus('bridge', 'onStart')
    },

    onUpdate: ({processCpuResult}: {processCpuResult?: XR8Reality}) => {
      const reality = processCpuResult?.reality
      updateCount += 1
      if (updateCount === 1) {
        debugStatus('update', reality ? 'reality 수신' : 'reality 없음')
      }
      if (updateCount % 60 === 0) {
        debugStatus('update', `#${updateCount} tracking=${reality?.trackingStatus ?? '?'}`)
      }
      if (!reality) return
      // 첫 SLAM 프레임 → 로딩 게이트 해제
      if (updateCount >= 1) useXRStatusStore.getState().setReady()

      const {rotation, position, intrinsics} = reality

      if (intrinsics) {
        camera.projectionMatrix.fromArray(intrinsics)
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      }
      if (rotation) {
        quat.set(rotation.x, rotation.y, rotation.z, rotation.w)
        camera.setRotationFromQuaternion(quat)
      }
      if (position) {
        camera.position.set(position.x, position.y, position.z)
      }
    },

    onRender: () => {
      renderCount += 1
      if (renderCount === 1) debugStatus('render', 'advance() 첫 호출')
      // FPS 측정 (개발 모드 전용 표시)
      const now = performance.now()
      fpsFrames += 1
      if (now - fpsWindowStart >= 2000) {
        debugStatus('fps', ((fpsFrames * 1000) / (now - fpsWindowStart)).toFixed(1))
        fpsFrames = 0
        fpsWindowStart = now
      }
      gl.clearDepth() // 카메라 피드는 남기고 depth만 리셋
      // R3F advance는 초 단위 타임스탬프 기대 — ms를 넘기면 delta가 1000배가 되어
      // 애니메이션이 순간 종료된다 (실측: d=16.96, mixT=8979)
      advance(performance.now() / 1000)
    },
  }
}
