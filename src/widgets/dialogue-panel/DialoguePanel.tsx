import {useDialogueStore} from '@/features/play-dialogue/dialogueStore'

/**
 * 대화 오버레이 — DOM 고정 오버레이 (drei <Html> 아님).
 * 하단 대화박스 + 선택지, 선택 직후 사용자 말풍선.
 * 대화박스 탭 → 타이핑 스킵.
 * speechInWorld: 대사 텍스트를 3D 말풍선(SpeechBubble3D)이 담당할 때 —
 * 하단에는 선택지/사용자 말풍선/다시하기만 남긴다.
 */
export function DialoguePanel({speechInWorld = false}: {speechInWorld?: boolean}) {
  const graph = useDialogueStore((s) => s.graph)
  const currentId = useDialogueStore((s) => s.currentId)
  const displayedText = useDialogueStore((s) => s.displayedText)
  const isTyping = useDialogueStore((s) => s.isTyping)
  const userBubble = useDialogueStore((s) => s.userBubble)
  const ended = useDialogueStore((s) => s.ended)
  const select = useDialogueStore((s) => s.select)
  const skipTyping = useDialogueStore((s) => s.skipTyping)
  const start = useDialogueStore((s) => s.start)

  if (!graph || !currentId) return null
  const node = graph.nodes[currentId]
  if (!node) return null
  const showChoices = !isTyping && !userBubble

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '0 12px calc(env(safe-area-inset-bottom) + 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {userBubble && (
        <div
          style={{
            alignSelf: 'flex-end',
            maxWidth: '75%',
            padding: '10px 14px',
            borderRadius: '16px 16px 4px 16px',
            background: 'rgba(84,116,255,.9)',
            fontSize: 15,
            animation: 'fadeInUp .18s ease-out',
          }}
        >
          {userBubble}
        </div>
      )}

      {!speechInWorld && (
        <div
          onClick={skipTyping}
          style={{
            pointerEvents: 'auto',
            padding: '12px 16px',
            borderRadius: 14,
            background: 'rgba(0,0,0,.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            textShadow: '0 1px 2px rgba(0,0,0,.5)',
            minHeight: 64,
          }}
        >
          <div style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
            {graph.meta.speakerName}
          </div>
          <div style={{fontSize: 16, lineHeight: 1.5}}>
            {displayedText}
            {isTyping && <span style={{opacity: 0.6}}>▏</span>}
          </div>
        </div>
      )}

      {showChoices && !ended && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          {node.choices.map((c, i) => (
            <button
              key={c.label + c.next}
              onClick={() => select(c.label, c.next)}
              style={{
                pointerEvents: 'auto',
                minHeight: 48,
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,.25)',
                background: 'rgba(30,30,40,.75)',
                color: '#fff',
                fontSize: 15,
                textAlign: 'left',
                animation: `fadeInUp .25s ease-out ${i * 60}ms both`,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {showChoices && ended && (
        <button
          onClick={start}
          style={{
            pointerEvents: 'auto',
            minHeight: 48,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,.25)',
            background: 'rgba(30,30,40,.75)',
            color: '#fff',
            fontSize: 15,
            animation: 'fadeInUp .25s ease-out both',
          }}
        >
          ↻ 다시 대화하기
        </button>
      )}
    </div>
  )
}
