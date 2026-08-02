import {create} from 'zustand'
import {useAnimationStore} from '@/entities/character/animationStore'
import type {DialogueGraph, DialogueNode} from '@/entities/dialogue/types'

const TYPING_MS = 45 // 한글 기준 40~50ms/글자 — 스킵 반드시 제공
const USER_BUBBLE_MS = 700 // 선택지가 사용자 말풍선으로 잠깐 떠 있는 시간

type DialogueState = {
  graph: DialogueGraph | null
  currentId: string | null
  displayedText: string
  isTyping: boolean
  /** 선택 직후 잠깐 보여주는 사용자 말풍선 */
  userBubble: string | null
  visited: string[]
  history: {nodeId: string; choice?: string}[]
  ended: boolean

  setGraph: (graph: DialogueGraph) => void
  start: () => void
  select: (label: string, next: string) => void
  skipTyping: () => void
  reset: () => void
}

let typingTimer: ReturnType<typeof setInterval> | null = null
let bubbleTimer: ReturnType<typeof setTimeout> | null = null
let unsubFinished: (() => void) | null = null

function clearTimers() {
  if (typingTimer) clearInterval(typingTimer)
  if (bubbleTimer) clearTimeout(bubbleTimer)
  typingTimer = bubbleTimer = null
  unsubFinished?.()
  unsubFinished = null
}

export const useDialogueStore = create<DialogueState>((set, get) => {
  const node = (): DialogueNode | null => {
    const {graph, currentId} = get()
    return graph && currentId ? (graph.nodes[currentId] ?? null) : null
  }

  const enterNode = (id: string) => {
    clearTimers()
    const {graph} = get()
    const n = graph?.nodes[id]
    if (!graph || !n) return

    set((s) => ({
      currentId: id,
      displayedText: '',
      isTyping: true,
      userBubble: null,
      ended: false,
      visited: s.visited.includes(id) ? s.visited : [...s.visited, id],
      history: [...s.history, {nodeId: id}],
    }))

    // 애니메이션: Wave는 1회성 → 끝나면(아직 타이핑 중이면) Talk로,
    // Talk/Walk는 타이핑 동안 루프
    const anim = useAnimationStore.getState()
    if (n.animation === 'Wave') {
      anim.play('Wave', {once: true})
      const seqAtPlay = useAnimationStore.getState().seq
      unsubFinished = useAnimationStore.subscribe((s2, prev) => {
        if (s2.finishedSeq === seqAtPlay && s2.finishedSeq !== prev.finishedSeq) {
          // 인사가 끝나면 항상 Talk 루프로 — 정지 포즈로 얼어붙지 않게
          useAnimationStore.getState().play('Talk')
        }
      })
    } else {
      anim.play(n.animation ?? 'Talk')
    }

    // 타이핑
    let i = 0
    typingTimer = setInterval(() => {
      i += 1
      if (i >= n.text.length) {
        clearInterval(typingTimer!)
        typingTimer = null
        finishTyping()
      } else {
        set({displayedText: n.text.slice(0, i)})
      }
    }, TYPING_MS)
  }

  const finishTyping = () => {
    const n = node()
    if (!n) return
    set({displayedText: n.text, isTyping: false, ended: !!n.end})
    // 애니메이션은 멈추지 않는다 — Idle 클립이 없어서 중간 포즈로 얼리면
    // 끊겨 보인다. 현재 루프(Talk/Walk)를 다음 노드 전환 때까지 유지.
  }

  return {
    graph: null,
    currentId: null,
    displayedText: '',
    isTyping: false,
    userBubble: null,
    visited: [],
    history: [],
    ended: false,

    setGraph: (graph) => set({graph}),

    start: () => {
      const {graph} = get()
      if (!graph) return
      set({visited: [], history: [], ended: false})
      enterNode(graph.meta.start)
    },

    select: (label, next) => {
      if (get().isTyping) return
      clearTimers()
      set((s) => ({
        userBubble: label,
        history: [...s.history, {nodeId: get().currentId ?? '', choice: label}],
      }))
      // 사용자 말풍선을 잠깐 보여준 뒤 다음 노드로 — "대화" 느낌의 핵심
      bubbleTimer = setTimeout(() => enterNode(next), USER_BUBBLE_MS)
    },

    skipTyping: () => {
      if (!get().isTyping) return
      if (typingTimer) clearInterval(typingTimer)
      typingTimer = null
      finishTyping()
    },

    reset: () => {
      clearTimers()
      set({
        currentId: null,
        displayedText: '',
        isTyping: false,
        userBubble: null,
        visited: [],
        history: [],
        ended: false,
      })
    },
  }
})
