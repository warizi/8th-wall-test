import {useFrame, useThree} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import * as THREE from 'three'
import {create} from 'zustand'
import {asset} from '@/shared/lib/asset'
import {debugStatus} from '@/shared/xr8/debugStatus'
import {useXRStatusStore} from '@/shared/xr8/xrStatusStore'

const TARGET_URL = asset('targets/card.mind') // 지점별 사이니지 타겟으로 교체 예정

/** 타겟 인식 상태 (UI/대화 트리거용 — 행렬은 성능상 mutable ref로 전달) */
export const useMindARStore = create<{targetFound: boolean}>(() => ({
  targetFound: false,
}))

/** 매 프레임 갱신되는 앵커 행렬 (zustand에 넣으면 리렌더 폭발 — 모듈 공유 ref) */
const anchorState: {visible: boolean; matrix: THREE.Matrix4; post: THREE.Matrix4} = {
  visible: false,
  matrix: new THREE.Matrix4(),
  post: new THREE.Matrix4(),
}

/**
 * MindAR 이미지 트래킹 브리지 (8th Wall 대체 경로 — 완전 오픈소스).
 * - 카메라 피드: DOM <video>가 캔버스 뒤에 깔림 (GL로 그리지 않음)
 * - Controller가 타겟의 worldMatrix를 주면 MindARAnchor가 R3F 그룹에 적용
 * - 행렬 수식은 mind-ar/src/image-target/three.js(MindARThree)를 그대로 이식
 */
export function MindARSystem() {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    let disposed = false
    let video: HTMLVideoElement | null = null
    let controller: import('mind-ar/dist/mindar-image.prod.js').Controller | null = null
    let stream: MediaStream | null = null
    let onResize: (() => void) | null = null

    // 카메라 <video>는 z-index:-2로 깔리므로, 위를 덮는 불투명 배경(html/body/#root
    // 의 #000)을 투명하게 바꿔야 보인다. (xr8 모드는 GL로 피드를 그려서 무관)
    const bgTargets = [
      document.documentElement,
      document.body,
      document.getElementById('root'),
    ].filter((el): el is HTMLElement => !!el)
    const prevBg = bgTargets.map((el) => el.style.background)
    bgTargets.forEach((el) => (el.style.background = 'transparent'))

    const start = async () => {
      debugStatus('mindar', '모듈 로드 중')
      // 엔진 선택 시에만 로드되도록 동적 import (기본 XR8 경로 번들에 미포함)
      const {Controller} = await import('mind-ar/dist/mindar-image.prod.js')
      if (disposed) return

      // 1. 카메라
      video = document.createElement('video')
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.style.cssText = 'position:fixed;z-index:-2;object-fit:none'
      document.body.appendChild(video)

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {facingMode: 'environment'},
        })
      } catch (e) {
        useXRStatusStore.getState().setError('카메라를 열 수 없어요. 권한을 확인해 주세요.')
        debugStatus('mindar', `camera 실패: ${e}`)
        return
      }
      if (disposed) return
      video.srcObject = stream
      await new Promise<void>((res) => {
        video!.addEventListener('loadedmetadata', () => res(), {once: true})
      })
      video.play()
      debugStatus('mindar', `video ${video.videoWidth}x${video.videoHeight}`)

      // 2. 컨트롤러
      controller = new Controller({
        inputWidth: video.videoWidth,
        inputHeight: video.videoHeight,
        maxTrack: 1,
        onUpdate: (data) => {
          if (data.type !== 'updateMatrix') return
          const {worldMatrix} = data
          const nowVisible = worldMatrix !== null && worldMatrix !== undefined
          if (nowVisible) {
            anchorState.matrix.fromArray(worldMatrix!).multiply(anchorState.post)
          }
          if (anchorState.visible !== nowVisible) {
            anchorState.visible = nowVisible
            useMindARStore.setState({targetFound: nowVisible})
            debugStatus('mindar', nowVisible ? '타겟 인식됨' : '타겟 놓침')
          }
        },
      })

      // 3. 화면 크기 대응 — MindARThree.resize()의 수식 이식
      const cam = camera as THREE.PerspectiveCamera
      const resize = () => {
        if (!video || !controller) return
        const cw = window.innerWidth
        const ch = window.innerHeight
        const videoRatio = video.videoWidth / video.videoHeight
        const containerRatio = cw / ch
        let vw: number, vh: number
        if (videoRatio > containerRatio) {
          vh = ch
          vw = vh * videoRatio
        } else {
          vw = cw
          vh = vw / videoRatio
        }
        video.style.top = `${-(vh - ch) / 2}px`
        video.style.left = `${-(vw - cw) / 2}px`
        video.style.width = `${vw}px`
        video.style.height = `${vh}px`
        video.style.objectFit = 'fill'

        const proj = controller.getProjectionMatrix()
        const inputRatio = controller.inputWidth / controller.inputHeight
        let videoDisplayHeight: number
        if (inputRatio > containerRatio) {
          videoDisplayHeight = ch * (video.videoWidth / controller.inputWidth)
        } else {
          videoDisplayHeight =
            ((cw / controller.inputWidth) * controller.inputHeight) *
            (video.videoHeight / controller.inputHeight)
        }
        const fovAdjust = ch / videoDisplayHeight
        cam.fov = (2 * Math.atan((1 / proj[5]) * fovAdjust) * 180) / Math.PI
        cam.near = proj[14] / (proj[10] - 1.0)
        cam.far = proj[14] / (proj[10] + 1.0)
        cam.aspect = cw / ch
        cam.position.set(0, 0, 0)
        cam.updateProjectionMatrix()
      }

      // 4. 타겟 로드 + postMatrix (원점을 마커 중앙, 1단위 = 마커 폭으로 정규화)
      debugStatus('mindar', '타겟 로드 중')
      const {dimensions} = await controller.addImageTargets(TARGET_URL)
      if (disposed) return
      const [markerWidth, markerHeight] = dimensions[0]
      anchorState.post.compose(
        new THREE.Vector3(markerWidth / 2, markerWidth / 2 + (markerHeight - markerWidth) / 2, 0),
        new THREE.Quaternion(),
        new THREE.Vector3(markerWidth, markerWidth, markerWidth),
      )

      resize()
      onResize = resize
      window.addEventListener('resize', resize)

      await controller.dummyRun(video)
      if (disposed) return
      controller.processVideo(video)
      useXRStatusStore.getState().setReady()
      debugStatus('mindar', '트래킹 시작')
    }

    start().catch((e) => {
      console.error('[mindar]', e)
      useXRStatusStore.getState().setError(String(e))
    })

    return () => {
      disposed = true
      bgTargets.forEach((el, i) => (el.style.background = prevBg[i]))
      if (onResize) window.removeEventListener('resize', onResize)
      controller?.stopProcessVideo()
      controller?.dispose()
      stream?.getTracks().forEach((t) => t.stop())
      video?.remove()
      anchorState.visible = false
      useMindARStore.setState({targetFound: false})
    }
  }, [camera])

  return null
}

const INVISIBLE = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)

/** 타겟 위에 얹히는 앵커 그룹 — worldMatrix를 매 프레임 적용 */
export function MindARAnchor({children}: {children: React.ReactNode}) {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = anchorState.visible
    g.matrix.copy(anchorState.visible ? anchorState.matrix : INVISIBLE)
  })

  return (
    <group ref={group} matrixAutoUpdate={false}>
      {children}
    </group>
  )
}
