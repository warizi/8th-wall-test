import type {ClipName} from '@/entities/character/animationStore'

export type DialogueChoice = {
  label: string
  next: string
}

export type DialogueNode = {
  speaker: 'character'
  text: string
  /** 노드 진입 시 재생할 클립. Wave는 1회성, Talk/Walk는 타이핑 동안 루프 */
  animation?: ClipName
  choices: DialogueChoice[]
  end?: boolean
}

export type DialogueGraph = {
  meta: {version: number; start: string; speakerName: string}
  nodes: Record<string, DialogueNode>
}

export async function loadDialogue(url = '/dialogue/script.json'): Promise<DialogueGraph> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`대화 스크립트 로드 실패: ${res.status}`)
  const graph = (await res.json()) as DialogueGraph
  if (!graph.meta?.start || !graph.nodes?.[graph.meta.start]) {
    throw new Error('대화 스크립트 형식 오류: meta.start 노드가 없음')
  }
  return graph
}
