import {Html} from '@react-three/drei'
import {useRef} from 'react'
import * as THREE from 'three'
import {useDialogueStore} from '@/features/play-dialogue/dialogueStore'

// 화면 좌표 스무딩 시정수(s) — 손떨림(고주파)은 거르고 큰 이동만 따라간다.
// 키울수록 더 안정적이지만 유령 이동에 말풍선이 늦게 따라붙는다.
const SCREEN_SMOOTH_TAU = 0.15

const worldPos = new THREE.Vector3()

/**
 * 유령 머리 위 말풍선 — 화자 이름 + 대사 텍스트(탭하면 타이핑 스킵)만 담당.
 * 선택지/사용자 말풍선/다시하기는 하단 DialoguePanel이 담당한다.
 * WanderingGhost의 children으로 넣으면 유령을 따라다닌다.
 * 유령이 화면 우상단에 있어도 잘리지 않게 말풍선을 왼쪽으로 치우쳐 앵커한다.
 */
export function SpeechBubble3D({
  position = [0, 1.05, 0],
}: {
  /** 부모(유령) 그룹 기준 로컬 위치 — 머리 위 */
  position?: [number, number, number]
}) {
  const graph = useDialogueStore((s) => s.graph)
  const currentId = useDialogueStore((s) => s.currentId)
  const displayedText = useDialogueStore((s) => s.displayedText)
  const isTyping = useDialogueStore((s) => s.isTyping)
  const skipTyping = useDialogueStore((s) => s.skipTyping)
  const smooth = useRef<{x: number; y: number; t: number} | null>(null)

  // 기본 투영 좌표를 화면 공간에서 지수 스무딩 — 3D 지터가 텍스트에 전달되지 않게
  const calculatePosition = (
    el: THREE.Object3D,
    camera: THREE.Camera,
    size: {width: number; height: number},
  ): [number, number] => {
    worldPos.setFromMatrixPosition(el.matrixWorld)
    worldPos.project(camera)
    const x = worldPos.x * (size.width / 2) + size.width / 2
    const y = -(worldPos.y * (size.height / 2)) + size.height / 2
    const now = performance.now()
    const s = smooth.current
    if (!s) {
      smooth.current = {x, y, t: now}
      return [x, y]
    }
    const dt = Math.min((now - s.t) / 1000, 0.1)
    s.t = now
    const a = 1 - Math.exp(-dt / SCREEN_SMOOTH_TAU)
    s.x += (x - s.x) * a
    s.y += (y - s.y) * a
    // 정수 픽셀 스냅 — 서브픽셀 미세 진동 제거, 텍스트 선명도 유지
    return [Math.round(s.x), Math.round(s.y)]
  }

  if (!graph || !currentId) return null

  return (
    <Html
      position={position}
      calculatePosition={calculatePosition}
      zIndexRange={[20, 10]}
      style={{pointerEvents: 'none'}}
    >
      <div
        onClick={skipTyping}
        style={{
          pointerEvents: 'auto',
          transform: 'translate(-75%, -100%)',
          width: 'max-content',
          maxWidth: '62vw',
          padding: '10px 14px',
          borderRadius: '14px 14px 14px 4px',
          background: 'rgba(0,0,0,.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,.5)',
        }}
      >
        <div style={{fontSize: 11, opacity: 0.7, marginBottom: 3}}>
          {graph.meta.speakerName}
        </div>
        <div style={{fontSize: 14, lineHeight: 1.5}}>
          {displayedText}
          {isTyping && <span style={{opacity: 0.6}}>▏</span>}
        </div>
      </div>
    </Html>
  )
}
